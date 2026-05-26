import type { QuarterIndex, Score100 } from './scalars';

/**
 * Board CEO confidence. Per design doc §3 (table of weights).
 *
 * Score 0-100, starts at 60. Below 40 = formal warning. Below 25 = fired.
 * The board recomputes confidence each quarter based on weighted contributing
 * factors. We store the running score plus a breakdown for the UI's
 * "what's pulling my confidence down?" affordance.
 */

export type BoardConfidenceFactor =
  | 'lowGovernmentTrust'
  | 'fiscalDefault'
  | 'creditDowngrade'
  | 'fiscalNearMiss'
  | 'publicScandal'
  | 'operationalFailure'
  | 'seniorStaffResignation'
  | 'otherSeniorDeparture'
  | 'sustainedNegativeMedia'
  | 'visibleWin_lineOpening'
  | 'visibleWin_agFavorableReport'
  | 'visibleWin_ribbonCutting'
  | 'driftTowardSixty';

export interface BoardConfidenceComponent {
  factor: BoardConfidenceFactor;
  delta: number;
  appliedAt: QuarterIndex;
  note?: string;
}

export interface BoardConfidence {
  score: Score100;
  /** Most recent contributions. Capped to N most-recent for state size. */
  recentComponents: BoardConfidenceComponent[];
  /** True once warning issued (score below 40). UI surfaces this prominently. */
  warningActive: boolean;
}
