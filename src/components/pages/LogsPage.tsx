import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * Logs page. Displays system and task execution logs with filtering and search.
 */
type LogCategory = 'all' | 'app' | 'task';

export function LogsPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [category, setCategory] = useState<LogCategory>('all');
  const [loading, setLoading] = useState(false);
  // Optional date-range bounds (YYYY-MM-DD) for filtering the date list.
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Load available log dates on mount.
  useEffect(() => {
    const loadDates = async () => {
      const available = await window.electronAPI?.listLogs();
      if (available && available.length > 0) {
        setDates(available);
        setSelectedDate(available[0]);
      }
    };
    loadDates().catch(() => {});
  }, []);

  // Load log content when selected date changes.
  useEffect(() => {
    if (!selectedDate) return;

    const loadLog = async () => {
      setLoading(true);
      const content = await window.electronAPI?.readLog(selectedDate);
      setLogContent(content || '');
      setLoading(false);
    };
    loadLog().catch(() => {});
  }, [selectedDate]);

  // Split raw log content into lines, dropping empty trailing lines.
  const allLines = logContent.split('\n').filter((l) => l.trim());

  // Category split: [TASK] entries are task execution logs; everything else
  // (INFO/WARN/ERROR/DEBUG) is a general app event.
  const categoryLines = allLines.filter((line) => {
    if (category === 'task') return line.includes('[TASK]');
    if (category === 'app') return !line.includes('[TASK]');
    return true;
  });

  // Search term is applied on top of the category filter.
  const filteredLines = categoryLines.filter(
    (line) =>
      searchTerm === '' || line.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Date file names are YYYY-MM-DD, so lexicographic comparison matches
  // chronological order — no Date parsing needed for the range filter.
  const visibleDates = dates.filter((d) => {
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });

  const downloadLog = async () => {
    if (!selectedDate) return;
    const content = await window.electronAPI?.readLog(selectedDate);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDate}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col p-7">
      <h1 className="page-title mb-6">logs</h1>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Left sidebar: date list */}
        <div className="flex w-48 flex-col rounded-lg border border-hairline bg-white">
          <div className="border-b border-hairline px-4 py-3 text-xs font-semibold text-muted">
            Available Dates
          </div>
          {/* Date-range filter */}
          <div className="space-y-2 border-b border-hairline px-3 py-3">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-muted">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-hairline px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
              />
            </label>
            <label className="block text-[10px] font-medium uppercase tracking-wide text-muted">
              To
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-hairline px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
              />
            </label>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="text-[11px] text-muted hover:text-ink"
              >
                Clear range
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            {visibleDates.length === 0 ? (
              <div className="p-4 text-xs text-muted">
                {dates.length === 0 ? 'No logs available' : 'No logs in range'}
              </div>
            ) : (
              visibleDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                    selectedDate === date
                      ? 'bg-black/5 font-medium text-ink'
                      : 'text-muted hover:bg-black/[0.02]'
                  }`}
                >
                  {date}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right main area: log content */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Category tabs */}
          <div className="inline-flex w-fit rounded-lg border border-hairline bg-black/[0.02] p-1">
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'app', label: 'App Events' },
                { key: 'task', label: 'Task Logs' },
              ] as { key: LogCategory; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategory(tab.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === tab.key
                    ? 'bg-white text-ink shadow-sm ring-1 ring-black/5'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and controls */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 rounded-md border border-hairline px-3 py-2 text-sm text-ink placeholder-muted focus:border-ink focus:outline-none"
            />
            <button
              onClick={downloadLog}
              disabled={!selectedDate}
              className="inline-flex items-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm text-ink transition-colors hover:bg-black/[0.02] disabled:opacity-50"
            >
              <Download size={16} />
              Download
            </button>
          </div>

          {/* Log content display */}
          <div className="flex-1 overflow-auto rounded-lg border border-hairline bg-black/[0.02] p-4 font-mono text-xs">
            {loading ? (
              <div className="text-muted">Loading...</div>
            ) : filteredLines.length === 0 ? (
              <div className="text-muted">
                {searchTerm
                  ? 'No matching log entries'
                  : category !== 'all'
                    ? 'No entries in this category'
                    : 'No log content'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`${
                      line.includes('[ERROR]')
                        ? 'text-red-600'
                        : line.includes('[WARN]')
                          ? 'text-yellow-600'
                          : line.includes('[TASK]')
                            ? 'text-blue-600'
                            : 'text-ink/80'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="text-xs text-muted">
            Showing {filteredLines.length} of {categoryLines.length} entries
          </div>
        </div>
      </div>
    </div>
  );
}
