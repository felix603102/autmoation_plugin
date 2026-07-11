/// <reference types="vite/client" />

// Type definition for the API exposed by electron/preload.js on window.
export interface ScriptResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ElectronAPI {
  getVersions: () => Promise<{
    app: string;
    electron: string;
    chrome: string;
    node: string;
  }>;
  selectDirectory: () => Promise<string | null>;
  runTaskScript: (taskId: string) => Promise<ScriptResult>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
