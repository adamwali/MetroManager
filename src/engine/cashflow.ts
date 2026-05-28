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
  // Phase 5.2 + 5.4: security + cleanliness + accessibility budgets all
  // fold into per-agency opex.
  const serviceQualityTotal = (['ttc', 'go', 'up'] as const).reduce((acc, id) => {
    const op = agencies[id].operatingParams;
    return (
      acc +
      ((op.securityBudget as unknown as number) ?? 0) +
      ((op.cleanlinessBudget as unknown as number) ?? 0) +
      ((op.accessibilityBudget as unknown as number) ?? 0)
    );
  }, 0);
  const securityCleanliness = serviceQualityTotal;
  const total =
    (agencies.ttc.lastQuarterOpex as unknown as number) +
    (agencies.go.lastQuarterOpex as unknown as number) +
    (agencies.up.lastQuarterOpex as unknown as number) +
    securityCleanliness;
  const alignmentMul = 1 - (consultantAlignment / 100) * 0.05;
  return cash(Math.round(total * alignmentMul));
}

/**
 * Phase 10.8: LVC revenue per station per quarter, with DIMINISHING RETURNS.
 *
 * Previously a flat 1.5%/Q (6%/yr) which beat the ~5%/yr debt cost, making
 * the slider a no-brainer "always max." Now the marginal yield declines in
 * tiers so there's an optimal investment point, not "max":
 *   first $100M/station: 2.0%/Q  (prime parcels, easy density wins)
 *   $100-200M:           1.5%/Q  (good sites)
 *   $200-300M:           1.0%/Q  (marginal land)
 *   $300-400M:           0.5%/Q  (overpriced — below debt cost)
 *
 * Since project debt costs ~1.25%/Q (5%/yr at trust 50), the marginal LVC
 * dollar stops paying for itself around $200M/station. High-trust players
 * with cheap debt can push further; low-trust players should invest less.
 */
export function lvcRevenuePerStation(capexPerStationM: number): number {
  const c = Math.max(0, capexPerStationM);
  let rev = 0;
  rev += Math.min(c, 100) * 0.02;
  rev += Math.max(0, Math.min(c - 100, 100)) * 0.015;
  rev += Math.max(0, Math.min(c - 200, 100)) * 0.01;
  rev += Math.max(0, Math.min(c - 300, 100)) * 0.005;
  return rev;
}

/**
 * Phase 10: quarterly LVC revenue from operating projects.
 * Per spec, LVC capex × stations yields land-value-capture revenue
 * (ground leases, density bonuses, station-area development payments).
 * Phase 10.8: now uses diminishing per-station yield (see above).
 */
export function quarterlyLvcRevenue(
  projects: ReadonlyArray<{ state: string; lvc?: { capexPerStation: CashMillions; stationsCovered: number } }>,
): CashMillions {
  let total = 0;
  for (const p of projects) {
    if (p.state !== 'operating') continue;
    if (!p.lvc) continue;
    const capex = p.lvc.capexPerStation as unknown as number;
    const stations = p.lvc.stationsCovered;
    total += lvcRevenuePerStation(capex) * stations;
  }
  return cash(Math.round(total));
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
