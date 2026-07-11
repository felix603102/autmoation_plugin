import { useMemo } from 'react';
import type { TimelineData } from '../types';

// Eagerly bundle every timeline JSON file (keyed by "pre-day-1", "day-1", ...).
const timelineModules = import.meta.glob<TimelineData>(
  '../data/timelines/*.json',
  { eager: true, import: 'default' },
);

const TIMELINES_BY_FILE: Record<string, TimelineData> = Object.fromEntries(
  Object.entries(timelineModules).map(([filePath, data]) => {
    const file = filePath.split('/').pop()!.replace('.json', '');
    return [file, data as TimelineData];
  }),
);

/** Return the timeline data for a given file id (e.g. "day-1"). */
export function useTimeline(file: string): TimelineData | null {
  return useMemo(() => TIMELINES_BY_FILE[file] ?? null, [file]);
}

/** Return progress {done, total} counting completed top-level tasks. */
export function getTimelineProgress(timeline: TimelineData | null): {
  done: number;
  total: number;
} {
  if (!timeline) return { done: 0, total: 0 };
  const done = timeline.tasks.filter((t) => t.completed).length;
  return { done, total: timeline.tasks.length };
}

export { TIMELINES_BY_FILE };
