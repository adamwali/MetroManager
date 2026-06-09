import type { GameState } from '@/types/gameState';
import type { CreditRating } from '@/types/finance';
import { quarterlyDebtService } from './finance';
import {
  quarterlyFareRevenue,
  quarterlyOperatingAllowance,
} from './cashflow';

/**
 * Dynamic credit rating. Phase 7.
 *
 * Computed each quarter from cash position, debt service ratio, and
 * board confidence. Drives:
 *   - New bond issuance rate (lower rating = higher spread)
 *   - Operating bond issuance caps (BBB and below blocked)
 *   - EV038 credit rating review event firing
 *
 * Rating tiers ordered best → worst:
 *   AAA · AA · A · BBB · BB · B
 *
 * Hysteresis: ratings shift one notch at a time even when metrics cross
 * multiple thresholds in a single quarter. Prevents whiplash.
 */

const RATING_ORDER: CreditRating[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];

interface RatingMetrics {
  cashM: number;
  /** Debt service / quarterly revenue (allowance + fare). */
  debtServiceRatio: number;
  boardScore: number;
}

interface RatingThreshold {
  rating: CreditRating;
  /** Minimums to qualify at this rating. */
  minCashM: number;
  maxDebtServiceRatio: number;
  minBoardScore: number;
}

/**
 * Threshold table. Player must meet ALL three minimums to qualify at
 * the higher tier. Failing any threshold drops them one notch.
 */
const RATING_THRESHOLDS: RatingThreshold[] = [
  { rating: 'AAA', minCashM: 5_000, maxDebtServiceRatio: 0.05, minBoardScore: 70 },
  { rating: 'AA', minCashM: -500, maxDebtServiceRatio: 0.10, minBoardScore: 50 },
  { rating: 'A', minCashM: -2_000, maxDebtServiceRatio: 0.15, minBoardScore: 35 },
  { rating: 'BBB', minCashM: -4_000, maxDebtServiceRatio: 0.20, minBoardScore: 25 },
  { rating: 'BB', minCashM: -6_000, maxDebtServiceRatio: 0.30, minBoardScore: 0 },
];

function computeMetrics(state: GameState): RatingMetrics {
  const cashM = state.cash.balance as unknown as number;
  const debtServiceQ = quarterlyDebtService(
    state.debt,
    state.engineVars.openBooks,
  ) as unknown as number;
  const revenueQ =
    (quarterlyFareRevenue(state.agencies) as unknown as number) +
    (quarterlyOperatingAllowance(state.operatingAllowance) as unknown as number);
  const debtServiceRatio = revenueQ > 0 ? debtServiceQ / revenueQ : 1;
  const boardScore = state.boardConfidence.score as unknown as number;
  return { cashM, debtServiceRatio, boardScore };
}

/**
 * Find the highest rating tier whose ALL thresholds are met.
 * Returns 'B' as floor if no threshold qualifies.
 */
export function ratingFromMetrics(metrics: RatingMetrics): CreditRating {
  for (const t of RATING_THRESHOLDS) {
    if (
      metrics.cashM >= t.minCashM &&
      metrics.debtServiceRatio <= t.maxDebtServiceRatio &&
      metrics.boardScore >= t.minBoardScore
    ) {
      return t.rating;
    }
  }
  return 'B';
}

/**
 * Drift current rating toward the rating implied by current metrics,
 * one notch per quarter. Prevents single-quarter whiplash.
 */
export function driftRating(currentRating: CreditRating, target: CreditRating): CreditRating {
  const cur = RATING_ORDER.indexOf(currentRating);
  const tgt = RATING_ORDER.indexOf(target);
  if (cur === tgt) return currentRating;
  // Move one notch toward target
  return RATING_ORDER[cur + (tgt > cur ? 1 : -1)] ?? currentRating;
}

/** Compute the next-quarter rating for state. Pure. */
export function nextRatingFor(state: GameState): {
  rating: CreditRating;
  metrics: RatingMetrics;
  target: CreditRating;
} {
  const metrics = computeMetrics(state);
  const target = ratingFromMetrics(metrics);
  const rating = driftRating(state.debt.rating, target);
  return { rating, metrics, target };
}

/** New bond issuance spread (over BOC) by rating, basis points. */
export const RATING_SPREAD_BP: Record<CreditRating, number> = {
  AAA: 50,
  AA: 90,
  A: 150,
  BBB: 280,
  BB: 450,
  B: 700,
  CCC: 1_000,
};

/** Operating bond issuance caps by rating ($M per quarter, $M total outstanding).
 *
 * Phase 11: caps halved (AAA total $10B → $4B etc.). The previous caps were
 * so generous that "issue a bond" was the universal answer to any cash
 * problem, defusing pressure that should have forced engagement with
 * fares, opex, or political tradeoffs. With tighter caps, the player runs
 * out of borrowing headroom and has to actually decide.
 */
export const RATING_OPERATING_BOND_CAPS: Record<
  CreditRating,
  { perQuarterM: number; totalOutstandingM: number }
> = {
  AAA: { perQuarterM: 1_500, totalOutstandingM: 4_000 },
  AA: { perQuarterM: 1_000, totalOutstandingM: 2_500 },
  A: { perQuarterM: 500, totalOutstandingM: 1_500 },
  BBB: { perQuarterM: 0, totalOutstandingM: 0 }, // blocked
  BB: { perQuarterM: 0, totalOutstandingM: 0 },
  B: { perQuarterM: 0, totalOutstandingM: 0 },
  CCC: { perQuarterM: 0, totalOutstandingM: 0 },
};
