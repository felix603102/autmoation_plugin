// Shared domain types for the odds and timeline data.

// --- Odds -------------------------------------------------------------------

export type MarketStatus = 'verified' | 'mismatch' | 'pending' | 'missing';

export interface Market {
  id: string;
  betType: string;
  category: string; // e.g. "Core" | "Corner"
  selection: string; // e.g. "Home" | "Over 2.5"
  bookmaker: number;
  correct: number;
  status: MarketStatus;
}

export interface OddsData {
  id: string;
  league: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  markets: Market[];
}

// --- Timelines / checklist --------------------------------------------------

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  tag: string;
  description: string;
  subtasks: Subtask[];
}

export interface TimelineData {
  day: string;
  date: string;
  tasks: Task[];
}

// --- Task automation --------------------------------------------------------

export type TaskScriptStatus = 'idle' | 'running' | 'success' | 'error';

export interface TaskScriptResult {
  taskId: string;
  status: TaskScriptStatus;
  data?: unknown;
  error?: string;
  /** Epoch ms when the run finished (success or error). Used for run history. */
  finishedAt?: number;
}
