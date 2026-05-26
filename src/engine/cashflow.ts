import type { Agencies } from '@/types/agency';
import type { CashMillions, QuarterIndex } from '@/types/scalars';
import { cash } from '@/types/scalars';

/**
 * Cash-flow components. Per design doc §5.
 *
 * Engine math is in $M to keep numbers human-scale in the simulator.
 * Per-quarter values; annual numbers are quartered.
 */

/** Starting annual government inflow at Q1 2026, $M. Per design doc §5. */
const INFLOW_Q0_ANNUAL: Record<string, number> = {
  ottawa: 4_000,
  queensPark: 3_500,
  cityHall: 1_500,
};

/** Construction-inflation indexing rate applied each game-year (4 quarters). */
const INFLATION_PER_YEAR = 0.05;

/**
 * Government inflow for a given quarter, $M.
 * Splits the annual amount evenly into 4 quarters, then applies cumulative
 * yearly indexing per the user's Phase 1.2 decision (5%/yr).
 */
export function quarterlyGovernmentInflow(quarterIndex: QuarterIndex): CashMillions {
  const q = quarterIndex as unknown as number;
  const yearsElapsed = Math.floor(q / 4);
  const indexFactor = Math.pow(1 + INFLATION_PER_YEAR, yearsElapsed);
  const annualBase =
    INFLOW_Q0_ANNUAL.ottawa! + INFLOW_Q0_ANNUAL.queensPark! + INFLOW_Q0_ANNUAL.cityHall!;
  return cash((annualBase * indexFactor) / 4);
}

/** Annualized opex × 1/4. Sum per agency, this quarter. */
export function quarterlyOperatingExpense(agencies: Agencies): CashMillions {
  const total =
    (agencies.ttc.lastQuarterOpex as unknown as number) +
    (agencies.go.lastQuarterOpex as unknown as number) +
    (agencies.up.lastQuarterOpex as unknown as number);
  return cash(total);
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
