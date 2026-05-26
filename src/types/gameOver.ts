import type { QuarterIndex } from './scalars';

/**
 * Campaign end states. Per design doc §3, §5 and Phase 2.2 (standard rules
 * picked by repo owner):
 *
 * - **Fiscal failure**: cash < -$5B for 4 consecutive quarters → fired.
 *   Bond market closes, asset sale forced; engine marks campaign over.
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
  /** Consecutive quarters with cash < -$5B. */
  quartersInDeepDeficit: number;
  /** Consecutive quarters with board confidence < 25. */
  quartersWithFiringBoard: number;
}

export const INITIAL_GAME_OVER_COUNTERS: GameOverCounters = {
  quartersInDeepDeficit: 0,
  quartersWithFiringBoard: 0,
};

export const FISCAL_FAILURE_CASH_THRESHOLD_M = -5_000;
export const FISCAL_FAILURE_CONSECUTIVE_QUARTERS = 4;
export const BOARD_FIRING_CONFIDENCE_THRESHOLD = 25;
export const BOARD_FIRING_CONSECUTIVE_QUARTERS = 2;
export const CAMPAIGN_END_QUARTER = 60;
