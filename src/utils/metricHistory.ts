import type { GameState } from '@/types/gameState';

export type TrackedMetric =
  | 'board'
  | 'approval'
  | 'trustOttawa'
  | 'trustQueensPark'
  | 'trustCityHall';

/**
 * Extract a per-quarter time series for a 0-100 sentiment metric from the
 * action log's quarter_summary snapshots, with the current live value
 * appended. Phase 10.11 — feeds the sleek QoQ trend on StatBars.
 */
export function metricSeries(state: GameState, metric: TrackedMetric, maxPoints = 10): number[] {
  const series: number[] = [];
  for (const e of state.actionLog) {
    if (e.kind !== 'quarter_summary') continue;
    const m = e.breakdown.endOfQuarterMetrics;
    if (!m) continue;
    series.push(pick(m, metric));
  }
  series.push(liveValue(state, metric));
  return series.slice(-maxPoints);
}

type Snapshot = {
  boardConfidence: number;
  publicApproval: number;
  trustOttawa: number;
  trustQueensPark: number;
  trustCityHall: number;
};

function pick(m: Snapshot, metric: TrackedMetric): number {
  switch (metric) {
    case 'board':
      return m.boardConfidence ?? 0;
    case 'approval':
      return m.publicApproval ?? 0;
    case 'trustOttawa':
      return m.trustOttawa ?? 0;
    case 'trustQueensPark':
      return m.trustQueensPark ?? 0;
    case 'trustCityHall':
      return m.trustCityHall ?? 0;
  }
}

function liveValue(state: GameState, metric: TrackedMetric): number {
  switch (metric) {
    case 'board':
      return state.boardConfidence.score as unknown as number;
    case 'approval':
      return state.engineVars.publicApproval as unknown as number;
    case 'trustOttawa':
      return state.politics.ottawa.trust as unknown as number;
    case 'trustQueensPark':
      return state.politics.queensPark.trust as unknown as number;
    case 'trustCityHall':
      return state.politics.cityHall.trust as unknown as number;
  }
}
