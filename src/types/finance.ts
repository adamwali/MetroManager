import type { BasisPoints, CashMillions, QuarterIndex } from './scalars';

/**
 * Debt model. Per design doc §5.
 *
 * The agency's debt portfolio is a list of tranches. Each tranche has a
 * fixed or floating coupon, a maturity, and an outstanding principal.
 * Weighted-average rate, debt service, and credit-rating math are derived
 * from this list each quarter — we do not store derived numbers in state.
 */

export type CreditorType = 'pension' | 'institutional' | 'retail' | 'foreign';

export type CouponMode =
  | { kind: 'fixed'; rate: BasisPoints }
  | { kind: 'floating'; spreadOverBOC: BasisPoints };

export interface DebtTranche {
  id: string;
  creditor: CreditorType;
  principal: CashMillions;
  coupon: CouponMode;
  /** Quarter index at which the tranche matures and principal must be repaid or refinanced. */
  maturity: QuarterIndex;
  /** Quarter the tranche was issued (or inherited at Q0 for starting debt). */
  issuedAt: QuarterIndex;
  /**
   * Phase 10.4: 'operating' = funded operating cash (issueOperatingBond),
   * 'project' = funded a capital project's remainingFunding pool (project
   * financing via acceptFinancingPackage / inherited OL). Lets the Capital
   * Activity view separate project-related cash flows from operating ones.
   * Optional with backfill via id prefix for old saves (t_op_* → operating,
   * else project).
   */
  purpose?: 'operating' | 'project';
}

export type CreditRating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';

export interface Debt {
  tranches: DebtTranche[];
  /** Latest rating from S&P-equivalent. Mirrors the table in §5. */
  rating: CreditRating;
  /** BOC policy rate in bp at end of last quarter. Engine ticks this per quarter. */
  bocPolicyRate: BasisPoints;
}

export interface Cash {
  /** Current operating cash, $M. Negative values trigger fiscal-failure logic. */
  balance: CashMillions;
  /** Last quarter's net cash delta (in - out). Stored for UI YoY/QoQ display. */
  lastQuarterDelta: CashMillions;
}
