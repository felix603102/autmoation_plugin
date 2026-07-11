import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { TaskStatusMap } from '../vite-env.d.ts';

interface TaskStatusContextValue {
  /** Global checkbox state keyed by `${file}:${taskId}` (and `${file}:${taskId}:${subtaskId}`). */
  checked: Record<string, boolean>;
  /** Direct state setter; consumers can use this to seed or update state. */
  setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Save all currently known task statuses to the configured status base path. */
  saveAll: () => Promise<void>;
}

const TaskStatusContext = createContext<TaskStatusContextValue | null>(null);

/** Provider that holds the task completion state globally across page switches. */
export function TaskStatusProvider({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const saveAll = useCallback(async () => {
    if (!window.electronAPI) return;

    // Group the flat checked keys back into per-file maps.
    const byFile = new Map<string, TaskStatusMap>();
    for (const key of Object.keys(checked)) {
      const parts = key.split(':');
      // Keys are `${file}:${taskId}` for tasks or `${file}:${taskId}:${subtaskId}` for subtasks.
      // Only task-level status is persisted.
      if (parts.length < 2) continue;
      const file = parts[0];
      const taskId = parts[1];
      if (!byFile.has(file)) byFile.set(file, {});
      byFile.get(file)![taskId] = !!checked[key];
    }

    const saves: Promise<void>[] = [];
    for (const [file, tasksMap] of byFile.entries()) {
      saves.push(window.electronAPI.saveTaskStatus(file, tasksMap));
    }
    await Promise.all(saves);
  }, [checked]);

  const value = useMemo(
    () => ({ checked, setChecked, saveAll }),
    [checked, saveAll],
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
