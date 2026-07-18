import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { RefreshCw, Check, AlertTriangle, Clock, ChevronDown } from 'lucide-react';
import { useOddsData, getOddsData } from '../../hooks/useOddsData';
import { CONTROLLERS } from '@shared/config';
import { useStatus } from '../../contexts/StatusContext';
import type { MarketStatus } from '../../types';

/**
 * Match Odds Verification page.
 * Left: a "MATCHES" list (FB3001–FB3022) with a status dot per controller.
 * Right: header + progress, then a match card with summary pills, category
 * tabs (Core / Corner), and the odds table.
 */
export function MatchOddsPage() {
  const [selected, setSelected] = useState(CONTROLLERS[0]);
  // Bumping this key forces the odds memo to recompute (a manual "refresh").
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { data, error } = useOddsData(selected, refreshKey);
  const { flashStatus } = useStatus();

  // Re-read the bundled odds data for the selected match and briefly show a
  // spinning indicator so the action is visible to the user.
  const refresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    flashStatus(`Refreshed odds: ${selected}`);
    setTimeout(() => setRefreshing(false), 400);
  };

  // Active category tab (Core / Corner). Reset when the match changes.
  const [activeCategory, setActiveCategory] = useState<string>('');

  // Distinct categories with counts, preserving first-seen order.
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of data?.markets ?? []) {
      map.set(m.category, (map.get(m.category) ?? 0) + 1);
    }
    return Array.from(map, ([name, count]) => ({ name, count }));
  }, [data]);

  // Default the active tab to the first category whenever the match changes.
  useEffect(() => {
    if (categories.length > 0) setActiveCategory(categories[0].name);
    // Only depend on `data` — categories is derived from it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Status tallies across ALL markets (progress bar + summary pills use these).
  const summary = useMemo(() => {
    const s = { verified: 0, mismatch: 0, pending: 0, missing: 0, total: data?.markets.length ?? 0 };
    for (const m of data?.markets ?? []) {
      if (m.status === 'verified') s.verified++;
      else if (m.status === 'mismatch') s.mismatch++;
      else if (m.status === 'pending') s.pending++;
      else if (m.status === 'missing') s.missing++;
    }
    return s;
  }, [data]);
  const percent = summary.total ? Math.round((summary.verified / summary.total) * 100) : 0;

  // Table rows for the active category tab.
  const rows = useMemo(
    () => (data?.markets ?? []).filter((m) => m.category === activeCategory),
    [data, activeCategory],
  );

  return (
    <div className="flex h-full">
      {/* MATCHES panel */}
      <aside className="flex w-[210px] flex-shrink-0 flex-col border-r border-hairline bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
            Matches
          </span>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh odds"
            className="rounded p-1 text-muted transition-colors hover:bg-black/5 hover:text-ink"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-auto px-2 pb-3">
          {CONTROLLERS.map((id) => {
            const isSelected = selected === id;
            const complete = isControllerComplete(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isSelected ? 'bg-ink text-white' : 'text-ink/80 hover:bg-black/5'
                }`}
              >
                {/* Status dot: green when fully verified, otherwise red */}
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                    complete ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="flex-1 text-left">{id}</span>
                <RefreshCw
                  size={12}
                  className={isSelected ? 'text-white/70' : 'text-muted/60'}
                />
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detail panel */}
      <section className="h-full flex-1 overflow-auto px-10 py-8">
        {error || !data ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No odds data for {selected}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
              Football
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
              Odds Verification{' '}
              <span className="text-primary/70">({data.id})</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Compare bookmaker odds against the correct fair odds for each bet type.
            </p>

            {/* Progress */}
            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="text-muted">
                {summary.verified} of {summary.total} markets verified
              </span>
              <span className="font-medium text-ink">{percent}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-ink transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            {/* Match card */}
            <div className="mt-6 rounded-xl border border-hairline bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-muted">
                    {data.league} · {data.kickoff}
                  </div>
                  <div className="mt-1 text-lg font-bold text-ink">
                    {data.homeTeam}{' '}
                    <span className="font-normal text-muted">vs</span>{' '}
                    {data.awayTeam}
                  </div>
                </div>
                {/* Summary pills: verified / mismatch / pending */}
                <div className="flex items-center gap-2">
                  <SummaryPill tone="green" icon={<Check size={12} />} value={summary.verified} />
                  <SummaryPill tone="amber" icon={<AlertTriangle size={12} />} value={summary.mismatch} />
                  <SummaryPill tone="gray" icon={<Clock size={12} />} value={summary.pending + summary.missing} />
                  <ChevronDown size={16} className="text-muted" />
                </div>
              </div>

              {/* Category tabs */}
              <div className="mt-4 flex gap-2">
                {categories.map((cat) => {
                  const active = cat.name === activeCategory;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setActiveCategory(cat.name)}
                      className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                        active
                          ? 'bg-ink font-medium text-white'
                          : 'text-muted hover:bg-black/5'
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  );
                })}
              </div>

              {/* Odds table */}
              <table className="mt-4 w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                    <th className="py-2 font-medium">Bet Type</th>
                    <th className="py-2 font-medium">Selection</th>
                    <th className="py-2 font-medium">Bookmaker</th>
                    <th className="py-2 font-medium">Correct</th>
                    <th className="py-2 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((market) => (
                    <tr key={market.id} className="border-t border-hairline">
                      <td className="py-3 font-medium text-ink">{market.betType}</td>
                      <td className="py-3 text-ink/80">{market.selection}</td>
                      {/* Bookmaker odds turn orange when the market is a mismatch */}
                      <td
                        className={`py-3 ${
                          market.status === 'mismatch'
                            ? 'font-semibold text-orange-500'
                            : 'text-ink/80'
                        }`}
                      >
                        {market.bookmaker.toFixed(2)}
                      </td>
                      <td className="py-3 text-ink/80">{market.correct.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <StatusBadge status={market.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

// --- helpers ---------------------------------------------------------------

/** True when every market for a controller is verified (drives the green dot). */
function isControllerComplete(id: string): boolean {
  const d = getOddsData(id);
  return !!d && d.markets.length > 0 && d.markets.every((m) => m.status === 'verified');
}

/** Rounded count pill used in the match-card header. */
function SummaryPill({
  tone,
  icon,
  value,
}: {
  tone: 'green' | 'amber' | 'gray';
  icon: ReactNode;
  value: number;
}) {
  const tones: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {value}
      {icon}
    </span>
  );
}

/** Status badge with icon + color, matching the reference states. */
function StatusBadge({ status }: { status: MarketStatus }) {
  const config: Record<
    MarketStatus,
    { label: string; className: string; icon: ReactNode }
  > = {
    verified: {
      label: 'Verified',
      className: 'bg-green-50 text-green-700',
      icon: <Check size={12} />,
    },
    mismatch: {
      label: 'Mismatch',
      className: 'bg-amber-50 text-amber-700',
      icon: <AlertTriangle size={12} />,
    },
    pending: {
      label: 'Pending',
      className: 'bg-gray-100 text-gray-500',
      icon: <Clock size={12} />,
    },
    missing: {
      label: 'Missing',
      className: 'bg-orange-50 text-orange-700',
      icon: <AlertTriangle size={12} />,
    },
  };
  const c = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
