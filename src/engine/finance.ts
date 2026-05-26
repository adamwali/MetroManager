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

/** Effective annualized coupon (bp) for a tranche given current BOC policy rate. */
export function effectiveCouponBp(tranche: DebtTranche, bocPolicyRate: BasisPoints): BasisPoints {
  return tranche.coupon.kind === 'fixed'
    ? tranche.coupon.rate
    : bp((bocPolicyRate as unknown as number) + (tranche.coupon.spreadOverBOC as unknown as number));
}

/**
 * Quarterly debt service across the whole portfolio.
 * Annualized coupon × principal ÷ 4 = quarterly payment.
 * Result is positive (cash outflow).
 */
export function quarterlyDebtService(debt: Debt): CashMillions {
  let total = 0;
  for (const t of debt.tranches) {
    const couponBp = effectiveCouponBp(t, debt.bocPolicyRate) as unknown as number;
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
