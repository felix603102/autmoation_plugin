import { useState } from 'react';
import {
  FileText,
  Calendar,
  SlidersHorizontal,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { TIMELINE_SECTIONS, type PageId } from '@shared/config';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

/**
 * Fixed left navigation with an Apple-style aesthetic: dark pill selection,
 * uppercase section labels, compact width, and subtle hover states.
 * Consistent with the MatchOddsPage sidebar and TimelinePage tab controls.
 */
export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const [checklistOpen, setChecklistOpen] = useState(true);

  const isActive = (page: PageId) => activePage === page;

  // True when any timeline child is active (keeps the checklist parent
  // highlighted even when a child day is selected).
  const isTimelineActive =
    isActive('checklist') || activePage.startsWith('timeline:');

  return (
    <nav className="flex h-full w-[220px] flex-shrink-0 flex-col border-r border-hairline bg-white">
      {/* App brand — compact, clean */}
      <div className="px-4 py-4">
        <div className="text-base font-bold tracking-tight text-ink">
          FO Plugin
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          Controller Automation
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-hairline" />

      {/* Navigation section */}
      <div className="flex-1 overflow-auto px-2 py-3">
        {/* Section label */}
        <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
          Navigation
        </div>

        {/* Checklist parent — expandable */}
        <button
          type="button"
          onClick={() => {
            setChecklistOpen((v) => !v);
            onNavigate('checklist');
          }}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            isTimelineActive
              ? 'bg-black/[0.06] font-medium text-ink ring-1 ring-black/5'
              : 'text-ink/80 hover:bg-black/5'
          }`}
        >
          <FileText size={16} />
          <span className="flex-1 text-left">Checklist</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${
              checklistOpen ? '' : '-rotate-90'
            } ${isTimelineActive ? 'text-muted/60' : 'text-muted/40'}`}
          />
        </button>

        {/* Timeline children — indented, same dark-pill style */}
        {checklistOpen && (
          <div className="mt-0.5 space-y-0.5 pl-2">
            {TIMELINE_SECTIONS.map((section) => {
              const page = `timeline:${section.routeKey}` as PageId;
              const active = isActive(page);
              return (
                <button
                  key={section.routeKey}
                  type="button"
                  onClick={() => onNavigate(page)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-black/[0.06] font-medium text-ink ring-1 ring-black/5'
                      : 'text-ink/70 hover:bg-black/5'
                  }`}
                >
                  <Calendar size={14} />
                  <span className="flex-1 text-left">{section.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Spacer */}
        <div className="mt-3" />

        {/* Match odds verification */}
        <button
          type="button"
          onClick={() => onNavigate('match-odds')}
          className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive('match-odds')
              ? 'bg-black/[0.06] font-medium text-ink ring-1 ring-black/5'
              : 'text-ink/80 hover:bg-black/5'
          }`}
        >
          <SlidersHorizontal size={16} />
          <span className="flex-1 text-left">Odds Verification</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
            isActive('settings')
              ? 'bg-black/[0.06] font-medium text-ink ring-1 ring-black/5'
              : 'text-ink/80 hover:bg-black/5'
          }`}
        >
          <Settings size={16} />
          <span className="flex-1 text-left">Settings</span>
        </button>
      </div>
    </nav>
  );
}
