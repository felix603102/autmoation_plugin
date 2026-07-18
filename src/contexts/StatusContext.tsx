import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

interface StatusContextValue {
  /** Current footer status message. */
  status: string;
  /** Set a persistent status message shown in the footer. */
  setStatus: (message: string) => void;
  /**
   * Show a transient status message that automatically reverts to "Ready"
   * after `ms` milliseconds (default 3000).
   */
  flashStatus: (message: string, ms?: number) => void;
}

const StatusContext = createContext<StatusContextValue | null>(null);

const DEFAULT_STATUS = 'Ready';

/** Provider holding the footer status message globally. */
export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<string>(DEFAULT_STATUS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const setStatus = useCallback((message: string) => {
    clearTimer();
    setStatusState(message || DEFAULT_STATUS);
  }, []);

  const flashStatus = useCallback((message: string, ms = 3000) => {
    clearTimer();
    setStatusState(message);
    timerRef.current = setTimeout(() => {
      setStatusState(DEFAULT_STATUS);
      timerRef.current = null;
    }, ms);
  }, []);

  const value = useMemo(
    () => ({ status, setStatus, flashStatus }),
    [status, setStatus, flashStatus],
  );

  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

/** Hook for reading and updating the footer status message. */
export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) {
    throw new Error('useStatus must be used within a StatusProvider');
  }
  return ctx;
}
