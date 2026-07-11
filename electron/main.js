// Electron main process.
// Responsible for creating the application window and wiring a couple of
// lightweight IPC handlers (app metadata / folder picker) used by the renderer.
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const store = require('./store');

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

// Return basic app/runtime versions for the Settings page.
ipcMain.handle('app:getVersions', () => ({
  app: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
}));

// Native folder picker used by the Settings "profile directory" control.
ipcMain.handle('dialog:selectDirectory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// --- Task status persistence ------------------------------------------------

const STATUS_DIR_KEY = 'taskStatusDir';
const DEFAULT_STATUS_DIR_NAME = 'task-status';

/** Return the configured status directory, defaulting to userData/task-status. */
function getStatusDir() {
  const configured = store.get(STATUS_DIR_KEY);
  if (configured) return configured;
  return path.join(app.getPath('userData'), DEFAULT_STATUS_DIR_NAME);
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

// Load task completion status for a timeline. Returns a map of taskId -> boolean.
ipcMain.handle('status:load', async (_event, file) => {
  const filePath = getStatusFilePath(file);
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return data.tasks ?? {};
  } catch (err) {
    console.error(`[status:load] failed for ${file}:`, err);
    return {};
  }
});

// Save task completion status for a timeline.
ipcMain.handle('status:save', async (_event, file, tasksMap) => {
  const filePath = getStatusFilePath(file);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ tasks: tasksMap }, null, 2));
  } catch (err) {
    console.error(`[status:save] failed for ${file}:`, err);
    throw err;
  }
});

// Run the automation script for a given task in a separate Node.js process.
// The task ID maps to a handler inside electron/automation/tasks.js which can
// call APIs via fetch() and/or perform browser UI automation via playwright.
// The runner always writes a single JSON object to stdout, so we parse it and
// return it. Using a child process keeps the main app responsive and isolated
// from automation crashes.
ipcMain.handle('task:runScript', async (_event, taskId) => {
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
      resolve({
        success: false,
        error: `Task '${taskId}' timed out after 60 seconds.`,
      });
    }, 60000);

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (stderr) {
        console.error(`[python ${taskId}]`, stderr);
      }
      if (code !== 0) {
        resolve({
          success: false,
          error: `Automation script exited with code ${code}.${stderr ? ` ${stderr.trim()}` : ''}`,
        });
        return;
      }
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch {
        resolve({
          success: false,
          error: `Could not parse script output: ${stdout}`,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: `Failed to start Python script: ${err.message}`,
      });
    });
  });
});

// --- App lifecycle ----------------------------------------------------------

app.whenReady().then(() => {
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
