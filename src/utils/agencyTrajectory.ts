import type { GameState } from '@/types/gameState';
import type { AgencyId } from '@/types/agency';
import { reliabilityScore, requiredMaintenanceFor } from '@engine/agencies';

/**
 * Phase 11: per-agency trajectory. Collapses 9 maintenance sliders + 3
 * fare/freq policies + 3 reliability gauges into a single arrow per
 * agency. UI shows one summary; player feels their decisions in days
 * not quarters.
 *
 * trajectory ∈ {'improving' | 'stable' | 'declining'}
 *   improving: reliability ≥ 75 AND maintenance funded ≥ 100% AND ridership flat-or-up
 *   declining: reliability < 60 OR maintenance < 90% AND ridership flat-or-down
 *   else stable
 *
 * Pure derivation from current state — no RNG.
 */

export type Trajectory = 'improving' | 'stable' | 'declining';

export interface AgencyTrajectory {
  agency: AgencyId;
  trajectory: Trajectory;
  reliability: number;
  maintenanceFundedPct: number; // 1.0 = 100% of required
  ridersPerDay: number;
}

export function trajectoryFor(state: GameState, agencyId: AgencyId): AgencyTrajectory {
  const agency = state.agencies[agencyId];
  const reliability = reliabilityScore(agency);
  const required = requiredMaintenanceFor(agencyId);
  const totalMaint = agency.subsystems.reduce(
    (sum, sub) => sum + (sub.maintenanceBudget as unknown as number),
    0,
  );
  const avgPerSub = totalMaint / Math.max(1, agency.subsystems.length);
  const maintenanceFundedPct = required > 0 ? avgPerSub / required : 1;
  const ridersPerDay = agency.dailyRiders as unknown as number;

  let trajectory: Trajectory;
  if (reliability >= 75 && maintenanceFundedPct >= 0.98) trajectory = 'improving';
  else if (reliability < 60 || maintenanceFundedPct < 0.90) trajectory = 'declining';
  else trajectory = 'stable';

  return { agency: agencyId, trajectory, reliability, maintenanceFundedPct, ridersPerDay };
}

export function networkTrajectory(state: GameState): {
  improving: number;
  stable: number;
  declining: number;
  net: number; // improving - declining; -3..+3
} {
  const trs = (['ttc', 'go', 'up'] as const).map((a) => trajectoryFor(state, a).trajectory);
  const improving = trs.filter((t) => t === 'improving').length;
  const stable = trs.filter((t) => t === 'stable').length;
  const declining = trs.filter((t) => t === 'declining').length;
  return { improving, stable, declining, net: improving - declining };
}
