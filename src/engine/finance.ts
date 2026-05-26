import type { BasisPoints, CashMillions } from '@/types/scalars';
import type { CreditRating, Debt, DebtTranche } from '@/types/finance';
import { bp, cash } from '@/types/scalars';

/**
 * Debt service and refi. Per design doc §5.
 *
 * Each quarter, every tranche owes a coupon payment. Fixed tranches pay
 * their stored rate; floating tranches pay (BOC + spread) at the current
 * BOC policy rate.
 *
 * When a tranche matures within the campaign, it auto-refis at the current
 * market rate per the user's Phase 1.2 decision (see DECISIONS.md).
 */

/** Rating → spread over BOC in basis points (§5 table). */
const RATING_SPREAD: Record<CreditRating, number> = {
  AAA: 50,
  AA: 90,
  A: 150,
  BBB: 280,
  BB: 450,
  B: 700,
  CCC: 1100,
};

export function ratingSpreadBp(rating: CreditRating): BasisPoints {
  return bp(RATING_SPREAD[rating]);
}

/** OpenBooks discount: -20bp on floating-rate spread when transparency is on. */
const OPEN_BOOKS_SPREAD_DISCOUNT_BP = 20;

/** BOC policy rate bounds (basis points). */
export const BOC_RATE_MIN_BP = 100;
export const BOC_RATE_MAX_BP = 700;

/**
 * Per-quarter BOC policy rate drift. Phase 3.2 polish — previously the
 * rate was stuck forever; now it walks by ±10bp deterministically per
 * quarter via keyed RNG. EV039 informational events surface the drift.
 *
 * Drift is small + bounded so floating-rate debt service shifts modestly
 * without dominating cash flow.
 */
export function driftBocRate(currentBp: number, roll: number): number {
  // roll in [0,1) → drift in [-15, +15] bp, biased slightly toward mean reversion
  const meanReversionPull = (350 - currentBp) * 0.02; // ±10bp pull toward 350bp
  const stochastic = (roll - 0.5) * 30; // ±15bp
  const next = currentBp + stochastic + meanReversionPull;
  return Math.max(BOC_RATE_MIN_BP, Math.min(BOC_RATE_MAX_BP, Math.round(next)));
}

/**
 * Effective annualized coupon (bp) for a tranche given current BOC policy rate.
 *
 * Phase 3.2 polish: when the agency has openBooks=true, floating-rate
 * spreads get a -20bp discount (bond market rewards transparency). Wires
 * the previously-orphan `engineVars.openBooks` into real debt-service savings.
 */
export function effectiveCouponBp(
  tranche: DebtTranche,
  bocPolicyRate: BasisPoints,
  openBooks: boolean = false,
): BasisPoints {
  if (tranche.coupon.kind === 'fixed') return tranche.coupon.rate;
  const baseSpread = tranche.coupon.spreadOverBOC as unknown as number;
  const discount = openBooks ? OPEN_BOOKS_SPREAD_DISCOUNT_BP : 0;
  return bp((bocPolicyRate as unknown as number) + Math.max(0, baseSpread - discount));
}

/**
 * Quarterly debt service across the whole portfolio.
 * Annualized coupon × principal ÷ 4 = quarterly payment.
 * Result is positive (cash outflow).
 */
export function quarterlyDebtService(debt: Debt, openBooks: boolean = false): CashMillions {
  let total = 0;
  for (const t of debt.tranches) {
    const couponBp = effectiveCouponBp(t, debt.bocPolicyRate, openBooks) as unknown as number;
    const principal = t.principal as unknown as number;
    total += (principal * couponBp) / 10_000 / 4;
  }
  return cash(total);
}

/**
 * Apply maturity → auto-refi at current market rate.
 * Replaces matured tranches with new fixed-rate tranches at the
 * weighted-market rate for the agency's rating.
 *
 * Returns updated debt and any cash impact (refi fee, 1-2% of refi'd principal).
 */
export function applyMaturities(
  debt: Debt,
  currentQuarter: number,
): { debt: Debt; refiFee: CashMillions } {
  const maturedNow: DebtTranche[] = [];
  const stillActive: DebtTranche[] = [];
  for (const t of debt.tranches) {
    if ((t.maturity as unknown as number) <= currentQuarter) {
      maturedNow.push(t);
    } else {
      stillActive.push(t);
    }
  }
  if (maturedNow.length === 0) {
    return { debt, refiFee: cash(0) };
  }
  const marketRate = bp(
    (debt.bocPolicyRate as unknown as number) + RATING_SPREAD[debt.rating],
  );
  let refiFee = 0;
  const refinanced: DebtTranche[] = maturedNow.map((t, idx) => {
    const principalN = t.principal as unknown as number;
    refiFee += principalN * 0.015; // 1.5% midpoint refi fee
    return {
      id: `${t.id}_refi_${currentQuarter}_${idx}`,
      creditor: t.creditor,
      principal: t.principal,
      coupon: { kind: 'fixed', rate: marketRate },
      // New tranche has same approximate duration as the original — 8.4yr ≈ 34Q
      maturity: cashQuarter(currentQuarter + 34),
      issuedAt: cashQuarter(currentQuarter),
    };
  });
  return {
    debt: { ...debt, tranches: [...stillActive, ...refinanced] },
    refiFee: cash(refiFee),
  };
}

// Quarter brand helper — inline so this file doesn't import scalars helpers it doesn't need.
function cashQuarter(n: number) {
  return n as unknown as DebtTranche['maturity'];
}
