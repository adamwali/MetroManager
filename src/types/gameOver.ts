import type { QuarterIndex } from './scalars';

/**
 * Campaign end states. Per design doc §3, §5 and Phase 2.2 (standard rules
 * picked by repo owner):
 *
 * - **Fiscal failure**: cash < -$2B for 3 consecutive quarters → fired.
 *   Bond market closes, asset sale forced; engine marks campaign over.
 *   (Phase 11 tightening: was -$5B for 4Q — terminal was so far away the
 *   middle of the game had no stakes.)
 * - **Board firing**: board confidence < 25 for 2 consecutive quarters → fired.
 * - **Campaign won**: reaches Q60 with positive board confidence and cash > 0.
 * - **Stepdown**: player resigns. Not in Phase 2.2 scope; lands in Phase 6.
 */

export type GameOverKind = 'fiscalFailure' | 'boardFiring' | 'campaignWon';

export interface GameOver {
  kind: GameOverKind;
  endedAt: QuarterIndex;
  /** Headline reason rendered on the end screen. */
  headline: string;
  /** Longer detail with current numbers. */
  detail: string;
}

/** Running counters used to detect "N consecutive quarters" failure modes. */
export interface GameOverCounters {
  /** Consecutive quarters with cash < FISCAL_FAILURE_CASH_THRESHOLD_M. */
  quartersInDeepDeficit: number;
  /** Consecutive quarters with board confidence < 25. */
  quartersWithFiringBoard: number;
  /**
   * Phase 11: consecutive quarters with cash < 0. Drives the credit-watch
   * stakes band — rating pressure + board signal BEFORE terminal failure.
   */
  quartersNegativeCash: number;
}

export const INITIAL_GAME_OVER_COUNTERS: GameOverCounters = {
  quartersInDeepDeficit: 0,
  quartersWithFiringBoard: 0,
  quartersNegativeCash: 0,
};

// Phase 11: terminal cliff much closer + the path there now has signposts.
export const FISCAL_FAILURE_CASH_THRESHOLD_M = -2_000;
export const FISCAL_FAILURE_CONSECUTIVE_QUARTERS = 3;
export const BOARD_FIRING_CONFIDENCE_THRESHOLD = 25;
export const BOARD_FIRING_CONSECUTIVE_QUARTERS = 2;
export const CAMPAIGN_END_QUARTER = 60;

/** Phase 11: stakes-band thresholds. Drive EV080 credit watch + rating pressure. */
export const CREDIT_WATCH_NEGATIVE_QUARTERS = 3;
