import type { Agencies } from '@/types/agency';
import type { OperatingAllowance } from '@/types/operatingAllowance';
import type { CashMillions } from '@/types/scalars';
import { cash } from '@/types/scalars';

/**
 * Cash-flow components. v3.3 economic model.
 *
 * Operating-side cash flow only — capital comes per-project via financing
 * approaches at break-ground (see finance.ts and projects.ts).
 *
 * Operating allowance is a flat 4-year pact (no annual indexing). Each
 * quarter the engine credits annualAmount / 4 to cash.
 */

/** Quarterly slice of the negotiated operating allowance, $M. */
export function quarterlyOperatingAllowance(allowance: OperatingAllowance): CashMillions {
  return cash((allowance.annualAmount as unknown as number) / 4);
}

/**
 * Annualized opex × 1/4. Sum per agency, this quarter (excludes maintenance).
 *
 * Phase 6.3.2: consultant alignment modifies opex. Range -100 to +100.
 * Aligned consultants (positive) = efficient = lower opex. Misaligned
 * (negative) = extractive = higher opex. Maximum swing ±5% at the extremes.
 * Wires the previously-orphan engineVar.
 */
export function quarterlyOperatingExpense(
  agencies: Agencies,
  consultantAlignment = 0,
): CashMillions {
  // Phase 5.2: security + cleanliness budgets now add to per-agency opex
  const securityCleanliness =
    (agencies.ttc.operatingParams.securityBudget as unknown as number) +
    (agencies.ttc.operatingParams.cleanlinessBudget as unknown as number) +
    (agencies.go.operatingParams.securityBudget as unknown as number) +
    (agencies.go.operatingParams.cleanlinessBudget as unknown as number) +
    (agencies.up.operatingParams.securityBudget as unknown as number) +
    (agencies.up.operatingParams.cleanlinessBudget as unknown as number);
  const total =
    (agencies.ttc.lastQuarterOpex as unknown as number) +
    (agencies.go.lastQuarterOpex as unknown as number) +
    (agencies.up.lastQuarterOpex as unknown as number) +
    securityCleanliness;
  const alignmentMul = 1 - (consultantAlignment / 100) * 0.05;
  return cash(Math.round(total * alignmentMul));
}

/** Sum of fare revenue this quarter across agencies. */
export function quarterlyFareRevenue(agencies: Agencies): CashMillions {
  const total =
    (agencies.ttc.lastQuarterFareRevenue as unknown as number) +
    (agencies.go.lastQuarterFareRevenue as unknown as number) +
    (agencies.up.lastQuarterFareRevenue as unknown as number);
  return cash(total);
}

/**
 * Quarterly maintenance expense across all agencies and subsystems.
 * Maintenance is a $M-per-quarter budget set per subsystem on each agency.
 * Comes out of cash separately from `lastQuarterOpex` (which is now
 * operations-only excluding maintenance).
 */
export function quarterlyMaintenanceExpense(agencies: Agencies): CashMillions {
  let total = 0;
  for (const a of Object.values(agencies)) {
    for (const sub of a.subsystems) {
      total += sub.maintenanceBudget as unknown as number;
    }
  }
  return cash(total);
}
