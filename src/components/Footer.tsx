import { useEffect, useState } from 'react';

interface FooterProps {
  status: string;
}

/**
 * Bottom status bar: left shows the current app status message, right shows a
 * live system clock (ports the QTimer-driven clock from the PySide6 window).
 */
export function Footer({ status }: FooterProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Tick every second; clean up the interval on unmount.
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}  ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <footer className="flex items-center justify-between border-t border-hairline bg-sidebar px-6 py-2.5 text-xs text-muted">
      <span>{status}</span>
      <span>system time:&nbsp;&nbsp;{formatted}</span>
    </footer>
  );
}

/** Zero-pad a number to two digits. */
function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
