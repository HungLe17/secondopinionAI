export const STALE_ANALYSIS_MS = 20 * 60 * 1000;

export function isAnalysisLockStale(updatedAt: Date | null | undefined, now = new Date()) {
  return !updatedAt || now.getTime() - updatedAt.getTime() > STALE_ANALYSIS_MS;
}

