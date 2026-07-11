// Shared configuration constants — the TypeScript counterpart of config.py.

// Match controllers shown in the side panel (FB3001–FB3022).
export const CONTROLLER_IDS: string[] = Array.from({ length: 22 }, (_, i) =>
  String(3001 + i),
);

// Fully-qualified controller keys, e.g. "FB3001".
export const CONTROLLERS: string[] = CONTROLLER_IDS.map((id) => `FB${id}`);
export const DEFAULT_CONTROLLER = CONTROLLERS[0];

// Checklist timeline sections, in display order. `file` maps to the JSON in
// src/data/timelines and `routeKey` is used for sidebar navigation.
export interface TimelineSection {
  routeKey: string;
  title: string;
  file: string;
}

export const TIMELINE_SECTIONS: TimelineSection[] = [
  { routeKey: 'pre-day-1', title: 'Pre-Day 1', file: 'pre-day-1' },
  { routeKey: 'day-1', title: 'Day 1', file: 'day-1' },
  { routeKey: 'day-2', title: 'Day 2', file: 'day-2' },
  { routeKey: 'day-3', title: 'Day 3', file: 'day-3' },
];

// Navigation page identifiers used by the App shell router.
export type PageId =
  | 'checklist'
  | `timeline:${string}`
  | 'match-odds'
  | 'settings';
