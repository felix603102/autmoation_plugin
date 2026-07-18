import { useMemo } from 'react';
import type { OddsData, MarketStatus } from '../types';

// Eagerly import every odds JSON file at build time. The keys look like
// "../data/odds/FB3001.json"; we index them by the bare controller id.
const oddsModules = import.meta.glob<OddsData>('../data/odds/*.json', {
  eager: true,
  import: 'default',
});

// Build a lookup: { "FB3001": OddsData, ... }
const ODDS_BY_ID: Record<string, OddsData> = Object.fromEntries(
  Object.entries(oddsModules).map(([filePath, data]) => {
    const id = filePath.split('/').pop()!.replace('.json', '');
    return [id, data as OddsData];
  }),
);

/**
 * Non-hook accessor for a controller's bundled odds data. Handy for computing
 * derived info (e.g. list status dots) outside of React's render cycle.
 */
export function getOddsData(controllerId: string): OddsData | null {
  return ODDS_BY_ID[controllerId] ?? null;
}

export interface VerificationSummary {
  correct: number;
  mismatch: number;
  pending: number;
  missing: number;
  total: number;
}

/**
 * Load the odds data for a controller (synchronous — data is bundled).
 * Returns the same shape the previous async hook did, so callers can keep
 * their loading/error handling.
 */
export function useOddsData(
  controllerId: string,
  refreshKey = 0,
): {
  data: OddsData | null;
  loading: boolean;
  error: Error | null;
} {
  return useMemo(() => {
    const data = ODDS_BY_ID[controllerId] ?? null;
    return {
      data,
      loading: false,
      error: data ? null : new Error(`No odds data for ${controllerId}`),
    };
    // refreshKey is intentionally part of the dependency list so a manual
    // refresh recomputes the result even for the same controller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllerId, refreshKey]);
}

/**
 * Compute verification counts for a match. A "verified" market counts as
 * correct only when bookmaker and correct odds match, otherwise mismatch.
 */
export function getVerificationSummary(
  data: OddsData | null,
): VerificationSummary {
  if (!data) {
    return { correct: 0, mismatch: 0, pending: 0, missing: 0, total: 0 };
  }

  const summary: VerificationSummary = {
    correct: 0,
    mismatch: 0,
    pending: 0,
    missing: 0,
    total: data.markets.length,
  };

  for (const market of data.markets) {
    const isCorrect = market.bookmaker === market.correct;
    const status: MarketStatus = market.status;
    switch (status) {
      case 'verified':
        isCorrect ? summary.correct++ : summary.mismatch++;
        break;
      case 'mismatch':
        summary.mismatch++;
        break;
      case 'pending':
        summary.pending++;
        break;
      case 'missing':
        summary.missing++;
        break;
    }
  }

  return summary;
}
