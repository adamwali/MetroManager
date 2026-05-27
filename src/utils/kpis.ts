import type { GameState } from '@/types/gameState';
import type { AgencyId } from '@/types/agency';

/**
 * Derived KPIs computed from GameState. The engine stores only the
 * primitives; the UI consumes humanized derivations here. This keeps
 * the engine pure and lets us evolve presentation without touching
 * simulation code.
 */

export interface HistoryPoint {
  quarter: number;
  cash: number;
  totalRiders: number;
}

export interface DerivedKpis {
  totalRiders: number;
  perAgencyRiders: Record<AgencyId, number>;
  ttcReliability: number;
  /** On-time percentage as a fraction 0-1, derived from TTC reliability. */
  ttcOnTime: number;
  /** Customer satisfaction 0-100, derived from reliability (Phase 5 will add quality inputs). */
  customerSatisfaction: number;
  /** Cash YoY % change vs 4 quarters ago. Null if <4 quarters of history. */
  cashYoyPct: number | null;
  /** Riders YoY % change vs 4 quarters ago. Null if <4 quarters of history. */
  ridersYoyPct: number | null;
  cashYoyDelta: number | null;
  ridersYoyDelta: number | null;
}

function totalRiders(state: GameState): number {
  return (
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number)
  );
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Build a per-quarter history from the action log + current state.
 * Returns ordered array starting at Q0 (initial state) through current quarter.
 */
export function buildHistory(state: GameState, initialCash: number, initialRiders: number): HistoryPoint[] {
  const history: HistoryPoint[] = [{ quarter: 0, cash: initialCash, totalRiders: initialRiders }];
  let runningCash = initialCash;
  for (const entry of state.actionLog) {
    if (entry.kind === 'quarter_summary') {
      runningCash += entry.cashDelta;
      history.push({
        quarter: entry.quarter as unknown as number,
        cash: runningCash,
        totalRiders: entry.breakdown.ridership.systemAfter,
      });
    }
  }
  // Phase 10 polish: if mid-turn actions have shifted cash since the last
  // quarter_summary (e.g., favor called, bond issued, refi fee paid), append
  // a live point so the sparkline reflects the in-progress quarter.
  const currentCash = state.cash.balance as unknown as number;
  if (history.length > 0 && currentCash !== history[history.length - 1]!.cash) {
    const currentRiders =
      (state.agencies.ttc.dailyRiders as unknown as number) +
      (state.agencies.go.dailyRiders as unknown as number) +
      (state.agencies.up.dailyRiders as unknown as number);
    history.push({
      quarter: (state.quarter as unknown as number) + 0.5, // fractional = "in progress"
      cash: currentCash,
      totalRiders: currentRiders,
    });
  }
  return history;
}

/** YoY % change vs 4 quarters ago. Null if not enough history. */
function yoyPct(history: HistoryPoint[], field: 'cash' | 'totalRiders'): number | null {
  if (history.length < 5) return null;
  const now = history[history.length - 1]![field];
  const yearAgo = history[history.length - 5]![field];
  if (yearAgo === 0) return null;
  return (now - yearAgo) / Math.abs(yearAgo);
}

function yoyDelta(history: HistoryPoint[], field: 'cash' | 'totalRiders'): number | null {
  if (history.length < 5) return null;
  const now = history[history.length - 1]![field];
  const yearAgo = history[history.length - 5]![field];
  return now - yearAgo;
}

export function deriveKpis(state: GameState, history: HistoryPoint[]): DerivedKpis {
  const ttcConditions = state.agencies.ttc.subsystems.map(
    (s) => s.condition as unknown as number,
  );
  const reliability = avg(ttcConditions);
  // On-time mapping: reliability 100 → 99%, 50 → 85%, 0 → 60%.
  const onTime = 0.60 + (reliability / 100) * 0.39;
  // Satisfaction is reliability-driven for Phase 2.1; Phase 5 adds quality inputs.
  const satisfaction = reliability;
  return {
    totalRiders: totalRiders(state),
    perAgencyRiders: {
      ttc: state.agencies.ttc.dailyRiders as unknown as number,
      go: state.agencies.go.dailyRiders as unknown as number,
      up: state.agencies.up.dailyRiders as unknown as number,
    },
    ttcReliability: reliability,
    ttcOnTime: onTime,
    customerSatisfaction: satisfaction,
    cashYoyPct: yoyPct(history, 'cash'),
    ridersYoyPct: yoyPct(history, 'totalRiders'),
    cashYoyDelta: yoyDelta(history, 'cash'),
    ridersYoyDelta: yoyDelta(history, 'totalRiders'),
  };
}

/** Quarters until a future quarter index. Negative if already past. */
export function quartersUntil(currentQ: number, targetQ: number): number {
  return targetQ - currentQ;
}
