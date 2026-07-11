import { useEffect, useMemo, useState } from 'react';
import { Check, Calendar, Flag, ChevronDown, ChevronRight, Play } from 'lucide-react';
import { useTimeline } from '../../hooks/useTimelines';
import { TIMELINE_SECTIONS, type PageId } from '@shared/config';
import type { Task, TaskScriptResult } from '../../types';

interface TimelinePageProps {
  file: string; // active timeline section id, e.g. "day-1"
  onNavigate: (page: PageId) => void; // driven by the in-page day tabs
}

/**
 * Timeline page: a centered header, in-page day tabs, and the selected day's
 * task list. The `file` prop is the source of truth for the active day — the
 * tabs simply navigate, which keeps the sidebar selection in sync.
 *
 * Completion + expand state is held locally (mock data) and keyed by the day
 * file so edits persist while the user switches between day tabs.
 */
export function TimelinePage({ file, onNavigate }: TimelinePageProps) {
  const timeline = useTimeline(file);

  // Keys are file-prefixed: `${file}:${taskId}` and
  // `${file}:${taskId}:${subtaskId}` — so state survives tab switches.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Tracks the execution state of each task's Python automation script.
  const [scriptResults, setScriptResults] = useState<Record<string, TaskScriptResult>>({});

  // Seed state for a day the first time it is viewed, without clobbering any
  // edits the user already made on previously-opened days.
  useEffect(() => {
    if (!timeline) return;
    setChecked((prev) => {
      const next = { ...prev };
      for (const task of timeline.tasks) {
        const tKey = `${file}:${task.id}`;
        if (next[tKey] === undefined) next[tKey] = task.completed;
        for (const sub of task.subtasks) {
          const sKey = `${file}:${task.id}:${sub.id}`;
          if (next[sKey] === undefined) next[sKey] = sub.completed;
        }
      }
      return next;
    });
    setExpanded((prev) => {
      const next = { ...prev };
      for (const task of timeline.tasks) {
        const tKey = `${file}:${task.id}`;
        // Completed tasks start expanded to mirror the reference layout.
        if (next[tKey] === undefined) next[tKey] = task.completed;
      }
      return next;
    });
  }, [timeline, file]);

  // Load persisted task completion status for the active day. This runs after
  // seeding so saved values override the timeline defaults when present.
  useEffect(() => {
    if (!timeline) return;
    window.electronAPI?.loadTaskStatus(file).then((saved) => {
      setChecked((prev) => {
        const next = { ...prev };
        for (const task of timeline.tasks) {
          if (saved[task.id] !== undefined) {
            next[`${file}:${task.id}`] = saved[task.id];
          }
        }
        return next;
      });
    }).catch(() => {});
  }, [timeline, file]);

  // Persist task completion status whenever the user toggles a task.
  // Subtask completion is intentionally not persisted (plan scope: tasks only).
  const persistTaskStatus = (nextChecked: Record<string, boolean>) => {
    if (!timeline) return;
    const tasksMap: Record<string, boolean> = {};
    for (const task of timeline.tasks) {
      tasksMap[task.id] = !!nextChecked[`${file}:${task.id}`];
    }
    window.electronAPI?.saveTaskStatus(file, tasksMap).catch(() => {});
  };

  const progress = useMemo(() => {
    if (!timeline) return { done: 0, total: 0, percent: 0 };
    const done = timeline.tasks.filter((t) => checked[`${file}:${t.id}`]).length;
    const total = timeline.tasks.length;
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }, [timeline, checked, file]);

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persistTaskStatus(next);
      return next;
    });
  };

  const toggleExpand = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Run the Python automation script for a given task and update the result.
  const runScript = async (taskId: string) => {
    const key = `${file}:${taskId}`;
    setScriptResults((prev) => ({
      ...prev,
      [key]: { taskId, status: 'running' },
    }));
    try {
      const result = await window.electronAPI?.runTaskScript(taskId);
      setScriptResults((prev) => ({
        ...prev,
        [key]: {
          taskId,
          status: result?.success ? 'success' : 'error',
          data: result?.data,
          error: result?.error,
        },
      }));
    } catch (err) {
      setScriptResults((prev) => ({
        ...prev,
        [key]: {
          taskId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      }));
    }
  };

  return (
    <div className="h-full overflow-auto px-6 py-10">
      {/* Centered page header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-ink">Timeline</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Follow every task across the timeline — beautifully organized,
          effortlessly clear.
        </p>
      </header>

      {/* Segmented day tabs (pill switcher). Clicking navigates, so the
          sidebar highlight and this control stay consistent. */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex gap-1 rounded-full bg-black/5 p-1">
          {TIMELINE_SECTIONS.map((section) => {
            const active = section.file === file;
            return (
              <button
                key={section.routeKey}
                type="button"
                onClick={() =>
                  onNavigate(`timeline:${section.routeKey}` as PageId)
                }
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-white font-medium text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </div>

      {!timeline ? (
        <div className="text-center text-sm text-muted">
          No timeline data for “{file}”.
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          {/* Date + big day title */}
          <div className="text-xs text-muted">{formatDate(timeline.date)}</div>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-ink">
            {timeline.day}
          </h2>

          {/* Progress: count on the left, percentage on the right */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted">
              {progress.done} of {progress.total} tasks complete
            </span>
            <span className="font-medium text-ink">{progress.percent}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-ink transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>

          {/* Task list */}
          <div className="mt-6 space-y-4">
            {timeline.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isDone={!!checked[`${file}:${task.id}`]}
                isExpanded={!!expanded[`${file}:${task.id}`]}
                isSubDone={(subId) => !!checked[`${file}:${task.id}:${subId}`]}
                scriptResult={scriptResults[`${file}:${task.id}`]}
                onToggle={() => toggle(`${file}:${task.id}`)}
                onToggleExpand={() => toggleExpand(`${file}:${task.id}`)}
                onToggleSub={(subId) =>
                  toggle(`${file}:${task.id}:${subId}`)
                }
                onRunScript={() => runScript(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A task card: a checkbox in the left gutter, the title + meta, a button to
 * run the linked Python automation, and an expandable description + subtasks.
 */
function TaskCard({
  task,
  isDone,
  isExpanded,
  isSubDone,
  scriptResult,
  onToggle,
  onToggleExpand,
  onToggleSub,
  onRunScript,
}: {
  task: Task;
  isDone: boolean;
  isExpanded: boolean;
  isSubDone: (subId: string) => boolean;
  scriptResult?: TaskScriptResult;
  onToggle: () => void;
  onToggleExpand: () => void;
  onToggleSub: (subId: string) => void;
  onRunScript: () => void;
}) {
  // Only show the expand control when there is something to reveal.
  const hasDetail = task.subtasks.length > 0 || !!task.description;

  return (
    <div className="flex items-start gap-3">
      {/* Left-gutter checkbox (round, fills black when done) */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDone ? 'Mark task incomplete' : 'Mark task complete'}
        className={`mt-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          isDone
            ? 'border-ink bg-ink text-white'
            : 'border-black/20 bg-white hover:border-black/40'
        }`}
      >
        {isDone && <Check size={14} strokeWidth={3} />}
      </button>

      {/* Task card */}
      <div className="flex-1 rounded-xl border border-hairline bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`font-medium ${
                isDone ? 'text-muted line-through' : 'text-ink'
              }`}
            >
              {task.title}
            </div>

            {/* Meta: due date + priority flag */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-muted">
                <Calendar size={12} />
                {task.dueDate}
              </span>
              <span
                className={`inline-flex items-center gap-1 ${priorityColor(
                  task.priority,
                )}`}
              >
                <Flag size={12} />
                {task.priority}
              </span>
            </div>
          </div>

          {/* Run automation + expand controls */}
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onRunScript}
              disabled={scriptResult?.status === 'running'}
              aria-label="Run automation"
              className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                scriptResult?.status === 'running'
                  ? 'border-hairline bg-black/5 text-muted'
                  : scriptResult?.status === 'success'
                    ? 'border-green-200 bg-green-50 text-green-600 hover:bg-green-100'
                    : scriptResult?.status === 'error'
                      ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                      : 'border-hairline text-muted hover:bg-black/5'
              }`}
            >
              {scriptResult?.status === 'running' ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-transparent" />
              ) : (
                <Play size={14} />
              )}
            </button>

            {hasDetail && (
              <button
                type="button"
                onClick={onToggleExpand}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:bg-black/5"
              >
                {isExpanded ? (
                  <ChevronDown size={15} />
                ) : (
                  <ChevronRight size={15} />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Automation result — shown whenever a result exists */}
        {(scriptResult?.status === 'success' || scriptResult?.status === 'error') && (
          <div
            className={`mt-3 rounded-lg px-3 py-2 text-xs ${
              scriptResult.status === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {scriptResult.status === 'success' ? (
              <div>
                <div className="font-semibold">Automation complete</div>
                <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-green-800">
                  {JSON.stringify(scriptResult.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <div className="font-semibold">Automation failed</div>
                <div className="mt-1">{scriptResult.error}</div>
              </div>
            )}
          </div>
        )}

        {/* Expanded detail: description + subtasks */}
        {isExpanded && hasDetail && (
          <div className="mt-3">
            {task.description && (
              <p className="text-sm leading-relaxed text-muted">
                {task.description}
              </p>
            )}

            {task.subtasks.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
                  Subtasks
                </div>
                <div className="space-y-2">
                  {task.subtasks.map((sub) => {
                    const done = isSubDone(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => onToggleSub(sub.id)}
                        className="flex w-full items-center gap-2.5 text-left"
                      >
                        <span
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                            done
                              ? 'bg-ink text-white'
                              : 'border-2 border-black/20'
                          }`}
                        >
                          {done && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span
                          className={`text-sm ${
                            done ? 'text-muted line-through' : 'text-ink/80'
                          }`}
                        >
                          {sub.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tailwind text color for a task priority (red = high, amber = medium). */
function priorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-amber-500';
    default:
      return 'text-muted';
  }
}

/**
 * Format an ISO date (YYYY-MM-DD) as "Weekday, YYYY/MM/DD".
 * Uses local date parts to avoid UTC off-by-one shifts.
 */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${weekday}, ${y}/${pad(m)}/${pad(d)}`;
}
