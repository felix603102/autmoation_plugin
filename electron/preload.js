// Preload script — the only bridge between the sandboxed renderer and Node.
// Exposes a minimal, explicitly-listed API on `window.electronAPI`.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Runtime version strings shown on the Settings page.
  getVersions: () => ipcRenderer.invoke('app:getVersions'),
  // Opens a native directory picker; resolves to the chosen path or null.
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  // Runs the automation script for a given task ID and returns the parsed JSON output.
  runTaskScript: (taskId) => ipcRenderer.invoke('task:runScript', taskId),
  // Task status persistence: base path, load, and save.
  getStatusBasePath: () => ipcRenderer.invoke('status:getBasePath'),
  setStatusBasePath: (basePath) => ipcRenderer.invoke('status:setBasePath', basePath),
  loadTaskStatus: (file) => ipcRenderer.invoke('status:load', file),
  saveTaskStatus: (file, tasksMap, date) =>
    ipcRenderer.invoke('status:save', file, tasksMap, date),
  // Logging: get logs directory, list logs, read a specific log, and write logs.
  getLogsDir: () => ipcRenderer.invoke('logs:getDir'),
  listLogs: () => ipcRenderer.invoke('logs:list'),
  readLog: (dateStr) => ipcRenderer.invoke('logs:read', dateStr),
  writeLog: (level, message, data) =>
    ipcRenderer.invoke('logs:write', level, message, data),
  // Log retention policy (in days; 0 keeps everything).
  getLogRetentionDays: () => ipcRenderer.invoke('logs:getRetentionDays'),
  setLogRetentionDays: (days) => ipcRenderer.invoke('logs:setRetentionDays', days),
  // Export all status files and logs into a user-chosen folder.
  exportData: () => ipcRenderer.invoke('data:export'),
});
