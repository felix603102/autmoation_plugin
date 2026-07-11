import { Calendar, Pencil, Circle, Gauge } from 'lucide-react';
import { TIMELINE_SECTIONS, type PageId } from '@shared/config';
import { useTimeline, getTimelineProgress } from '../../hooks/useTimelines';
import type { TimelineData } from '../../types';

interface ChecklistDashboardProps {
  onOpenSection: (page: PageId) => void;
}

/**
 * Dashboard overview. Centered header + a single stacked panel listing every
 * timeline day with its progress and the next in-progress task. Matches the
 * reference design; clicking a day opens that section's timeline.
 */
export function ChecklistDashboard({ onOpenSection }: ChecklistDashboardProps) {
  return (
    <div className="h-full overflow-auto px-6 py-10">
      {/* Centered page header */}
      <header className="mb-10 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          Overview
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-ink">
          Dashboard
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted">
          Track task completion progress across each day of the timeline.
        </p>
      </header>

      {/* Stacked panel of day cards, centered and width-constrained */}
      <div className="mx-auto max-w-3xl divide-y divide-hairline rounded-2xl border border-hairline bg-white">
        {TIMELINE_SECTIONS.map((section) => (
          <DayRow
            key={section.routeKey}
            file={section.file}
            title={section.title}
            onClick={() =>
              onOpenSection(`timeline:${section.routeKey}` as PageId)
            }
          />
        ))}
      </div>
    </div>
  );
}

/** A single day row inside the dashboard panel. */
function DayRow({
  file,
  title,
  onClick,
}: {
  file: string;
  title: string;
  onClick: () => void;
}) {
  const timeline: TimelineData | null = useTimeline(file);
  const { done, total } = getTimelineProgress(timeline);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  // The next actionable task is the first one not yet completed.
  const nextTask = timeline?.tasks.find((t) => !t.completed);

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-6 py-5 text-left transition-colors hover:bg-black/[0.015]"
    >
      {/* Title row: day name + edit affordance on the left, % badge on right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-ink">{title}</span>
          <Pencil size={12} className="text-muted/60" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-muted">
          <Gauge size={12} />
          {percent}%
        </span>
      </div>

      {/* Date row with calendar icon and formatted weekday/date */}
      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        <Calendar size={12} />
        {formatDate(timeline?.date)}
      </div>

      {/* Thin progress bar (black fill on a light track) */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full bg-ink transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Task count */}
      <div className="mt-2 text-xs text-muted">
        {done} of {total} tasks complete
      </div>

      {/* Next in-progress task, shown in a soft rounded box */}
      {nextTask && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/[0.03] px-3 py-2.5 text-xs text-ink/80">
          <Circle size={13} className="flex-shrink-0 text-muted" />
          <span>
            <span className="font-semibold">In progress:</span> {nextTask.title}
          </span>
        </div>
      )}
    </button>
  );
}

/**
 * Format an ISO date (YYYY-MM-DD) as "Weekday, YYYY/MM/DD".
 * Parsed via local Date parts to avoid UTC off-by-one shifts.
 */
function formatDate(iso?: string): string {
  if (!iso) return 'No date';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${weekday}, ${y}/${pad(m)}/${pad(d)}`;
}
