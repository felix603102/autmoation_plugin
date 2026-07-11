import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TIMELINES_BY_FILE } from '../hooks/useTimelines';
import type { TaskStatusMap } from '../vite-env.d.ts';

interface TaskStatusContextValue {
  /** Global checkbox state keyed by `${file}:${taskId}` (and `${file}:${taskId}:${subtaskId}`). */
  checked: Record<string, boolean>;
  /** Direct state setter; consumers can use this to seed or update state. */
  setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Save all timeline task statuses to the configured status base path. */
  saveAll: () => Promise<void>;
  /** Reset every timeline task status to false and persist it. */
  resetAll: () => Promise<void>;
}

const TaskStatusContext = createContext<TaskStatusContextValue | null>(null);

/** Provider that holds the task completion state globally across page switches. */
export function TaskStatusProvider({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const saveAll = useCallback(async () => {
    if (!window.electronAPI) return;

    // Build a status map for every bundled timeline, falling back to the
    // timeline JSON defaults when the user has not yet toggled that task.
    const saves: Promise<void>[] = [];
    for (const [file, timeline] of Object.entries(TIMELINES_BY_FILE)) {
      const tasksMap: TaskStatusMap = {};
      for (const task of timeline.tasks) {
        const key = `${file}:${task.id}`;
        tasksMap[task.id] =
          checked[key] !== undefined ? checked[key] : task.completed;
      }
      saves.push(window.electronAPI.saveTaskStatus(file, tasksMap));
    }

    await Promise.all(saves);
  }, [checked]);

  const resetAll = useCallback(async () => {
    if (!window.electronAPI) return;

    // Build an all-false map for every bundled timeline and persist it.
    const nextChecked: Record<string, boolean> = {};
    const saves: Promise<void>[] = [];
    for (const [file, timeline] of Object.entries(TIMELINES_BY_FILE)) {
      const tasksMap: TaskStatusMap = {};
      for (const task of timeline.tasks) {
        tasksMap[task.id] = false;
        nextChecked[`${file}:${task.id}`] = false;
      }
      saves.push(window.electronAPI.saveTaskStatus(file, tasksMap));
    }

    await Promise.all(saves);
    setChecked(nextChecked);
  }, []);

  const value = useMemo(
    () => ({ checked, setChecked, saveAll, resetAll }),
    [checked, saveAll, resetAll],
  );

  return (
    <TaskStatusContext.Provider value={value}>
      {children}
    </TaskStatusContext.Provider>
  );
}

/** Hook for accessing the global task status state. */
export function useTaskStatus() {
  const ctx = useContext(TaskStatusContext);
  if (!ctx) {
    throw new Error('useTaskStatus must be used within a TaskStatusProvider');
  }
  return ctx;
}
