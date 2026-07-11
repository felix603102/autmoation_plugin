import { useEffect, useState } from 'react';
import { Folder } from 'lucide-react';
import { useTaskStatus } from '../../contexts/TaskStatusContext';

/**
 * Settings page. Lets the user choose a profile directory (via a native dialog
 * exposed through the preload bridge) and shows runtime version info.
 */
export function SettingsPage() {
  const { saveAll, resetAll } = useTaskStatus();
  const [profileDir, setProfileDir] = useState<string>('Not set');
  const [statusDir, setStatusDir] = useState<string>('Loading…');
  const [versions, setVersions] = useState<{
    app: string;
    electron: string;
    chrome: string;
    node: string;
  } | null>(null);

  // Fetch runtime versions and current status directory from the main process.
  useEffect(() => {
    // Guard for running the renderer outside Electron (e.g. `vite preview`).
    window.electronAPI?.getVersions().then(setVersions).catch(() => {});
    window.electronAPI?.getStatusBasePath().then(setStatusDir).catch(() => {});
  }, []);

  const chooseDirectory = async () => {
    const dir = await window.electronAPI?.selectDirectory();
    if (dir) setProfileDir(dir);
  };

  const chooseStatusDirectory = async () => {
    const dir = await window.electronAPI?.selectDirectory();
    if (dir) {
      await window.electronAPI?.setStatusBasePath(dir);
      await saveAll();
      setStatusDir(dir);
      // Reload so the Timeline page starts fresh from the new path.
      window.location.reload();
    }
  };

  const resetStatusDirectory = async () => {
    await window.electronAPI?.setStatusBasePath('');
    await saveAll();
    const basePath = await window.electronAPI?.getStatusBasePath();
    if (basePath) setStatusDir(basePath);
    // Reload so the Timeline page starts fresh from the default path.
    window.location.reload();
  };

  const resetTimelineStatus = async () => {
    await resetAll();
    // Reload so the Timeline page reflects the reset state.
    window.location.reload();
  };

  return (
    <div className="flex h-full flex-col p-7">
      <h1 className="page-title mb-6">setting</h1>

      {/* Profile directory picker */}
      <div className="card max-w-2xl p-6">
        <div className="mb-4 text-sm font-semibold text-ink">Profile</div>
        <button type="button" onClick={chooseDirectory} className="btn-outlined inline-flex items-center gap-2">
          <Folder size={16} />
          Choose Profile Directory…
        </button>
        <p className="mt-3 break-all text-xs text-muted">Profile: {profileDir}</p>
      </div>

      {/* Task status storage path */}
      <div className="card mt-4 max-w-2xl p-6">
        <div className="mb-4 text-sm font-semibold text-ink">Task Status Storage</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={chooseStatusDirectory} className="btn-outlined inline-flex items-center gap-2">
            <Folder size={16} />
            Choose Status Folder…
          </button>
          <button type="button" onClick={resetStatusDirectory} className="btn-text text-xs text-muted hover:text-ink">
            Reset to default
          </button>
          <button type="button" onClick={resetTimelineStatus} className="btn-text text-xs text-red-600 hover:text-red-700">
            Reset all timeline status
          </button>
        </div>
        <p className="mt-3 break-all text-xs text-muted">Status path: {statusDir}</p>
      </div>

      {/* Runtime versions */}
      {versions && (
        <div className="card mt-4 max-w-2xl p-6">
          <div className="mb-4 text-sm font-semibold text-ink">About</div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Row label="App" value={versions.app} />
            <Row label="Electron" value={versions.electron} />
            <Row label="Chromium" value={versions.chrome} />
            <Row label="Node" value={versions.node} />
          </dl>
        </div>
      )}
    </div>
  );
}

/** One label/value row in the About list. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-ink">{value}</dd>
    </>
  );
}
