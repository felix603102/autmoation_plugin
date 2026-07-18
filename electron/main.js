// Electron main process.
// Responsible for creating the application window and wiring a couple of
// lightweight IPC handlers (app metadata / folder picker) used by the renderer.
const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const store = require('./store');
const Logger = require('./logger');

// In dev we load Vite's dev server; in production we load the built index.html.
const isDev = process.env.NODE_ENV === 'development';
const DEV_SERVER_URL = 'http://localhost:5173';

/** Create the main application window. */
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'FO Plugin',
    backgroundColor: '#ffffff',
    // Start hidden and reveal only once the renderer is ready to paint. This
    // avoids a blank flash and lets us show the window already focused.
    show: false,
    webPreferences: {
      // Security best practices: isolate the renderer and expose only a
      // curated API via the preload script.
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Show + explicitly focus the window (and bring the app to the foreground on
  // macOS). Without this the freshly-opened window can be unfocused, so the
  // first click merely focuses it and gets swallowed — the "double-click on
  // startup" symptom.
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (process.platform === 'darwin') app.focus({ steal: true });
  });

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
    // DevTools is opt-in (OPEN_DEVTOOLS=1) because opening it on launch can
    // steal focus. When enabled we dock it so it shares the window's focus.
    if (process.env.OPEN_DEVTOOLS === '1') {
      win.webContents.openDevTools({ mode: 'bottom' });
    }
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// --- IPC handlers -----------------------------------------------------------

// Return basic app/runtime versions plus local system info for the Settings page.
ipcMain.handle('app:getVersions', () => ({
  app: app.getVersion(),
  chrome: process.versions.chrome,
  platform: os.platform(),
  arch: os.arch(),
  release: os.release(),
  hostname: os.hostname(),
}));

// Native folder picker used by the Settings "profile directory" control.
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Native save dialog — writes the given content to a user-chosen file path.
ipcMain.handle('dialog:saveFile', async (_event, defaultName, content) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    if (logger) logger.info('File saved', { path: result.filePath });
    return { canceled: false, path: result.filePath };
  } catch (err) {
    console.error('[dialog:saveFile] failed:', err);
    return { canceled: false, error: err.message };
  }
});

// --- Logging ----------------------------------------------------------------

const DEFAULT_LOGS_DIR_NAME = 'logs';
const LOG_RETENTION_KEY = 'logRetentionDays';
const DEFAULT_LOG_RETENTION_DAYS = 30;
let logger;

function getLogsDir() {
  return path.join(getAppDir(), DEFAULT_LOGS_DIR_NAME);
}

/** Configured log retention in days (0 = keep forever). */
function getLogRetentionDays() {
  const value = store.get(LOG_RETENTION_KEY);
  return typeof value === 'number' ? value : DEFAULT_LOG_RETENTION_DAYS;
}

function initLogger() {
  const logsDir = getLogsDir();
  logger = new Logger(logsDir);
  // Prune old logs on startup according to the retention policy.
  logger.cleanupOldLogs(getLogRetentionDays());
  logger.info('App started');
}

// Get/set the log retention policy (in days; 0 disables cleanup).
ipcMain.handle('logs:getRetentionDays', () => getLogRetentionDays());
ipcMain.handle('logs:setRetentionDays', (_event, days) => {
  const n = Number(days);
  store.set(LOG_RETENTION_KEY, Number.isFinite(n) && n >= 0 ? n : DEFAULT_LOG_RETENTION_DAYS);
  // Apply immediately so the change takes effect without a restart.
  if (logger) logger.cleanupOldLogs(getLogRetentionDays());
});

// Get logs directory path.
ipcMain.handle('logs:getDir', () => getLogsDir());

// Read a specific log file by date (YYYY-MM-DD format).
ipcMain.handle('logs:read', (_event, dateStr) => {
  try {
    const filePath = path.join(getLogsDir(), `${dateStr}.log`);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[logs:read] failed for ${dateStr}:`, err);
    return null;
  }
});

// List all available log files.
ipcMain.handle('logs:list', () => {
  try {
    const logsDir = getLogsDir();
    if (!fs.existsSync(logsDir)) return [];
    const files = fs.readdirSync(logsDir);
    return files
      .filter((f) => f.endsWith('.log'))
      .map((f) => f.replace('.log', ''))
      .sort()
      .reverse();
  } catch (err) {
    console.error('[logs:list] failed:', err);
    return [];
  }
});

// Log an event from the renderer process.
ipcMain.handle('logs:write', (_event, level, message, data) => {
  if (logger) {
    logger.write(level, message, data);
  }
});

// --- Task status persistence ------------------------------------------------

const STATUS_DIR_KEY = 'taskStatusDir';
const DEFAULT_STATUS_DIR_NAME = 'task-status';

/** Return the configured status directory, defaulting to the application location. */
function getStatusDir() {
  const configured = store.get(STATUS_DIR_KEY);
  if (configured) return configured;
  return path.join(getAppDir(), DEFAULT_STATUS_DIR_NAME);
}

/** Return the directory containing the application (next to the executable). */
function getAppDir() {
  const exe = app.getPath('exe');
  if (process.platform === 'darwin') {
    // On macOS the executable is inside MyApp.app/Contents/MacOS/MyApp.
    // We go up three levels so the status folder sits next to the .app bundle.
    return path.resolve(exe, '..', '..', '..');
  }
  return path.dirname(exe);
}

/** Return the status file path for a given timeline file id. */
function getStatusFilePath(file) {
  return path.join(getStatusDir(), `${file}.json`);
}

// Get/set the base directory where task status JSON files are stored.
ipcMain.handle('status:getBasePath', () => getStatusDir());
ipcMain.handle('status:setBasePath', (_event, basePath) => {
  store.set(STATUS_DIR_KEY, basePath);
});

// Load task completion status for a timeline. Returns { date?: string, tasks: Record<string,boolean> }.
ipcMain.handle('status:load', async (_event, file) => {
  const filePath = getStatusFilePath(file);
  try {
    if (!fs.existsSync(filePath)) return { date: undefined, tasks: {} };
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return {
      date: typeof data.date === 'string' ? data.date : undefined,
      tasks: data.tasks ?? {},
    };
  } catch (err) {
    console.error(`[status:load] failed for ${file}:`, err);
    return { date: undefined, tasks: {} };
  }
});

// Save task completion status for a timeline, preserving any existing date.
ipcMain.handle('status:save', async (_event, file, tasksMap, date) => {
  const filePath = getStatusFilePath(file);
  try {
    let payload = { tasks: tasksMap };
    if (date === undefined) {
      // Preserve an existing date if caller did not provide one.
      try {
        if (fs.existsSync(filePath)) {
          const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (typeof existing.date === 'string') {
            payload = { ...payload, date: existing.date };
          }
        }
      } catch {
        // ignore corrupt existing file
      }
    } else if (date !== null) {
      payload = { ...payload, date };
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error(`[status:save] failed for ${file}:`, err);
    throw err;
  }
});

// --- Backup / export --------------------------------------------------------

/** Recursively copy a directory's contents into `dest`. Returns file count. */
function copyDirInto(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirInto(from, to);
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

// Export all task status files and logs into a user-chosen folder. Creates a
// timestamped subfolder so repeated exports don't overwrite each other.
ipcMain.handle('data:export', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Choose a folder to export data into',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate(),
    )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const destRoot = path.join(result.filePaths[0], `fo-plugin-export-${stamp}`);

    const statusFiles = copyDirInto(getStatusDir(), path.join(destRoot, 'task-status'));
    const logFiles = copyDirInto(getLogsDir(), path.join(destRoot, 'logs'));

    if (logger) logger.info('Data export complete', { destRoot, statusFiles, logFiles });
    return { canceled: false, destination: destRoot, statusFiles, logFiles };
  } catch (err) {
    console.error('[data:export] failed:', err);
    return { canceled: false, error: err.message };
  }
});

// Show a native desktop notification (best-effort; silently ignored when the
// platform does not support notifications).
function notify(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  } catch {
    // Ignore notification failures — they must never break automation.
  }
}

// Run the automation script for a given task in a separate Node.js process.
// The task ID maps to a handler inside electron/automation/tasks.js which can
// call APIs via fetch() and/or perform browser UI automation via playwright.
// The runner always writes a single JSON object to stdout, so we parse it and
// return it. Using a child process keeps the main app responsive and isolated
// from automation crashes.
ipcMain.handle('task:runScript', async (_event, taskId) => {
  if (logger) logger.task(taskId, 'START', {});

  // In dev the project root is one level above the electron/ directory. In
  // production the automation scripts are bundled alongside the app resources.
  const appRoot = isDev ? path.join(__dirname, '..') : app.getAppPath();
  const scriptPath = path.join(appRoot, 'electron', 'automation', 'run.js');
  const cwd = path.dirname(scriptPath);

  // Electron ships with Node.js. By setting ELECTRON_RUN_AS_NODE=1 we can use
  // the Electron executable itself to run a plain JS script without spawning a
  // browser window. This makes the packaged app portable: no separate Node.js
  // or Python runtime is needed on the target machine.
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const startTime = Date.now();

    const child = spawn(process.execPath, [scriptPath, '--task-id', taskId], {
      cwd,
      env,
      shell: false,
    });

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    // Cap long-running automations (UI tasks) at 60 seconds.
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      const duration = Date.now() - startTime;
      if (logger) logger.task(taskId, 'TIMEOUT', { duration });
      notify('Automation timed out', `${taskId} exceeded 60 seconds.`);
      resolve({
        success: false,
        error: `Task '${taskId}' timed out after 60 seconds.`,
      });
    }, 60000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      if (stderr) {
        console.error(`[python ${taskId}]`, stderr);
      }
      if (code !== 0) {
        if (logger) logger.task(taskId, 'FAIL', { code, duration, error: stderr });
        notify('Automation failed', `${taskId} exited with code ${code}.`);
        resolve({
          success: false,
          error: `Automation script exited with code ${code}.${stderr ? ` ${stderr.trim()}` : ''}`,
        });
        return;
      }
      try {
        const result = JSON.parse(stdout);
        if (logger) logger.task(taskId, 'SUCCESS', { duration });
        notify('Automation complete', `${taskId} finished in ${(duration / 1000).toFixed(1)}s.`);
        resolve(result);
      } catch {
        if (logger) logger.task(taskId, 'PARSE_ERROR', { duration, stdout });
        notify('Automation failed', `${taskId} produced invalid output.`);
        resolve({
          success: false,
          error: `Could not parse script output: ${stdout}`,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      if (logger) logger.task(taskId, 'ERROR', { duration, error: err.message });
      notify('Automation failed', `${taskId} could not start: ${err.message}`);
      resolve({
        success: false,
        error: `Failed to start Python script: ${err.message}`,
      });
    });
  });
});

// --- App lifecycle ----------------------------------------------------------

app.whenReady().then(() => {
  initLogger();
  createWindow();

  // macOS: re-create a window when the dock icon is clicked and none are open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS where apps stay active.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
