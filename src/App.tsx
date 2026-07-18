import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { ChecklistDashboard } from './components/pages/ChecklistDashboard';
import { TimelinePage } from './components/pages/TimelinePage';
import { MatchOddsPage } from './components/pages/MatchOddsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { LogsPage } from './components/pages/LogsPage';
import { type PageId } from '@shared/config';
import { TaskStatusProvider } from './contexts/TaskStatusContext';
import { StatusProvider, useStatus } from './contexts/StatusContext';

/**
 * Application shell. Holds the active-page state and renders the sidebar,
 * the current page, and the footer status bar — mirroring the PySide6
 * FluentWindow layout (nav + stacked content + footer).
 */
export default function App() {
  return (
    <TaskStatusProvider>
      <StatusProvider>
        <AppShell />
      </StatusProvider>
    </TaskStatusProvider>
  );
}

/** Inner shell so it can consume the status context for the footer. */
function AppShell() {
  const [activePage, setActivePage] = useState<PageId>('checklist');
  const { status } = useStatus();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-hidden">
          {renderPage(activePage, setActivePage)}
        </main>
        <Footer status={status} />
      </div>
    </div>
  );
}

/** Route the active page id to its component. */
function renderPage(page: PageId, navigate: (p: PageId) => void) {
  if (page === 'checklist') {
    return <ChecklistDashboard onOpenSection={navigate} />;
  }
  if (page.startsWith('timeline:')) {
    // Map the routeKey back to the timeline JSON file id (they're identical).
    const routeKey = page.slice('timeline:'.length);
    return <TimelinePage file={routeKey} onNavigate={navigate} />;
  }
  if (page === 'match-odds') {
    return <MatchOddsPage />;
  }
  if (page === 'settings') {
    return <SettingsPage />;
  }
  if (page === 'logs') {
    return <LogsPage />;
  }
  return null;
}
