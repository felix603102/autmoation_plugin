import { useEffect, useState } from 'react';
import { Folder } from 'lucide-react';
import { useTaskStatus } from '../../contexts/TaskStatusContext';
import { useStatus } from '../../contexts/StatusContext';
import { TIMELINES_BY_FILE } from '../../hooks/useTimelines';
import { TIMELINE_SECTIONS } from '@shared/config';
import type { TimelineData } from '../../types';

/**
 * Settings page. Lets the user configure task status storage, reset timeline
 * statuses, edit timeline dates, and view runtime version info.
 */
export function SettingsPage() {
  const { saveAll, resetAll, saveDate } = useTaskStatus();
  const { flashStatus } = useStatus();
  const [statusDir, setStatusDir] = useState<string>('Loading…');
  const [dates, setDates] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<{
    app: string;
    chrome: string;
    platform: string;
    arch: string;
    release: string;
    hostname: string;
  } | null>(null);

  // Fetch runtime versions, status path, and custom timeline dates on mount.
  useEffect(() => {
    // Guard for running the renderer outside Electron (e.g. `vite preview`).
    window.electronAPI?.getVersions().then(setVersions).catch(() => {});
    window.electronAPI?.getStatusBasePath().then(setStatusDir).catch(() => {});

    const initialDates: Record<string, string> = {};
    const loads = Object.keys(TIMELINES_BY_FILE).map(async (file) => {
      const saved = await window.electronAPI?.loadTaskStatus(file);
      // Backwards-compatible with old plain tasks map format.
      const date = saved && 'date' in saved ? saved.date : undefined;
      if (date) initialDates[file] = date;
    });
    Promise.all(loads).then(() => setDates(initialDates)).catch(() => {});
  }, []);

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
    const confirmed = window.confirm(
      'Reset all timeline task statuses to incomplete? This cannot be undone.',
    );
    if (!confirmed) return;

    await resetAll();
    // Reload so the Timeline page reflects the reset state.
    window.location.reload();
  };

  const updateDate = async (file: string, value: string) => {
    const next = { ...dates, [file]: value };
    setDates(next);
    await saveDate(file, value || null);
    flashStatus('Timeline date saved');
  };

  return (
    <div className="flex h-full flex-col p-7">
      <h1 className="page-title mb-6">setting</h1>

      {/* Task status storage path */}
      <div className="card max-w-2xl p-6">
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

      {/* Timeline dates */}
      <div className="card mt-4 max-w-2xl p-6">
        <div className="mb-4 text-sm font-semibold text-ink">Timeline Dates</div>
        <div className="space-y-3">
          {TIMELINE_SECTIONS.map((section) => {
            const timeline = TIMELINES_BY_FILE[section.file];
            if (!timeline) return null;
            return (
              <TimelineDateRow
                key={section.file}
                file={section.file}
                timeline={timeline}
                date={dates[section.file] ?? timeline.date}
                onChange={(value) => updateDate(section.file, value)}
              />
            );
          })}
        </div>
      </div>

      {/* Runtime versions */}
      {versions && (
        <div className="card mt-4 max-w-2xl p-6">
          <div className="mb-4 text-sm font-semibold text-ink">About</div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Row label="App" value={versions.app} />
            <Row label="Chromium" value={versions.chrome} />
            <Row label="Platform" value={versions.platform} />
            <Row label="Arch" value={versions.arch} />
            <Row label="OS Release" value={versions.release} />
            <Row label="Hostname" value={versions.hostname} />
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

/** A single timeline row with a date input. */
function TimelineDateRow({
  file,
  timeline,
  date,
  onChange,
}: {
  file: string;
  timeline: TimelineData;
  date: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{timeline.day}</div>
        <div className="text-xs text-muted">{file}</div>
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-hairline px-2 py-1 text-sm text-ink focus:border-ink focus:outline-none"
      />
    </div>
  );
}
