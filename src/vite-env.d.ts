/// <reference types="vite/client" />

// Type definition for the API exposed by electron/preload.js on window.
export interface ScriptResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type TaskStatusMap = Record<string, boolean>;

export interface TaskStatusFile {
  date?: string;
  tasks: TaskStatusMap;
}

export interface ElectronAPI {
  getVersions: () => Promise<{
    app: string;
    chrome: string;
    platform: string;
    arch: string;
    release: string;
    hostname: string;
  }>;
  selectDirectory: () => Promise<string | null>;
  runTaskScript: (taskId: string) => Promise<ScriptResult>;
  getStatusBasePath: () => Promise<string>;
  setStatusBasePath: (basePath: string) => Promise<void>;
  loadTaskStatus: (file: string) => Promise<TaskStatusFile>;
  saveTaskStatus: (
    file: string,
    tasksMap: TaskStatusMap,
    date?: string | null,
  ) => Promise<void>;
  getLogsDir: () => Promise<string>;
  listLogs: () => Promise<string[]>;
  readLog: (dateStr: string) => Promise<string | null>;
  writeLog: (level: string, message: string, data?: unknown) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
