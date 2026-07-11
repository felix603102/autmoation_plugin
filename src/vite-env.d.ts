/// <reference types="vite/client" />

// Type definition for the API exposed by electron/preload.js on window.
export interface ScriptResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type TaskStatusMap = Record<string, boolean>;

export interface ElectronAPI {
  getVersions: () => Promise<{
    app: string;
    electron: string;
    chrome: string;
    node: string;
  }>;
  selectDirectory: () => Promise<string | null>;
  runTaskScript: (taskId: string) => Promise<ScriptResult>;
  getStatusBasePath: () => Promise<string>;
  setStatusBasePath: (basePath: string) => Promise<void>;
  loadTaskStatus: (file: string) => Promise<TaskStatusMap>;
  saveTaskStatus: (file: string, tasksMap: TaskStatusMap) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
