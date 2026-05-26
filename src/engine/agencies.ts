import type { Agency, SubsystemId } from '@/types/agency';
import type { CashMillions } from '@/types/scalars';
import { score } from '@/types/scalars';

/**
 * Subsystem decay per design doc §8.
 *
 * Each quarter, subsystem condition decays at a per-subsystem rate. The
 * decay is offset by maintenance spend per the spending-level mapping
 * (under / required / preventive / catch-up).
 *
 * Phase 1.2 implements decay + offset but does NOT fire replacement events
 * even if condition drops below 25 — those land in Phase 5.3.
 */

const DECAY_RATE: Record<SubsystemId, number> = {
  rollingStock: 1.5,
  signals: 1.2,
  track: 0.8,
  stations: 1.0,
  catenary: 0.9,
};

/** Maintenance spending tiers, indexed to budget in $M/Q (TTC scale; GO/UP scale below). */
const TTC_REQUIRED_PER_SUBSYSTEM = 100;
const GO_REQUIRED_PER_SUBSYSTEM = 40;
const UP_REQUIRED_PER_SUBSYSTEM = 3;

function requiredFor(agencyId: 'ttc' | 'go' | 'up'): number {
  switch (agencyId) {
    case 'ttc':
      return TTC_REQUIRED_PER_SUBSYSTEM;
    case 'go':
      return GO_REQUIRED_PER_SUBSYSTEM;
    case 'up':
      return UP_REQUIRED_PER_SUBSYSTEM;
  }
}

/**
 * Net condition change this quarter for one subsystem.
 * - Underspend (< required): decay continues, accelerates the lower it goes
 * - At required: stable (decay roughly fully offset)
 * - Preventive (1.5x required): +0.5%/Q improvement
 * - Catch-up (2x+): +1.0%/Q improvement, premium pricing (no direct $ penalty here)
 */
function deltaForSubsystem(
  subsystemId: SubsystemId,
  budget: CashMillions,
  agencyId: 'ttc' | 'go' | 'up',
): number {
  const required = requiredFor(agencyId);
  const budgetN = budget as unknown as number;
  const ratio = required > 0 ? budgetN / required : 0;
  const baseDecay = -(DECAY_RATE[subsystemId] ?? 1.0);
  if (ratio < 0.5) {
    return baseDecay * 1.5; // accelerated decay if severely underfunded
  }
  if (ratio < 1.0) {
    return baseDecay * (1 - ratio + 0.5); // partial decay
  }
  if (ratio < 1.5) {
    return 0; // stable at required
  }
  if (ratio < 2.0) {
    return 0.5; // preventive
  }
  return 1.0; // catch-up
}

export function decaySubsystems(agency: Agency): Agency {
  const updated = agency.subsystems.map((sub) => {
    const delta = deltaForSubsystem(sub.id, sub.maintenanceBudget, agency.id);
    const next = Math.max(0, Math.min(100, (sub.condition as unknown as number) + delta));
    return { ...sub, condition: score(next) };
  });
  return { ...agency, subsystems: updated };
}

/**
 * Reliability composite, 0-100. Average condition across all subsystems
 * for one agency. Used by ridership drift math below.
 */
export function reliabilityScore(agency: Agency): number {
  if (agency.subsystems.length === 0) return 100;
  const sum = agency.subsystems.reduce((acc, s) => acc + (s.condition as unknown as number), 0);
  return sum / agency.subsystems.length;
}

/**
 * Per-quarter ridership drift driven by reliability per design doc §5
 * ("reliability -1-2%/yr if poor"). Linear interpolation: at 100 reliability,
 * 0% drift; at 50, -0.25%/Q (-1%/yr); at 25 or below, -0.5%/Q (-2%/yr).
 */
export function reliabilityRidershipDrift(reliability: number): number {
  if (reliability >= 90) return 0;
  if (reliability >= 50) return -0.0025 * ((90 - reliability) / 40);
  if (reliability >= 25) return -0.0025;
  return -0.005;
}

/**
 * Per-quarter catchment population growth per design doc §5 (v3.3).
 * Converts annualized growth rate to per-quarter compound: (1 + annual)^(1/4) - 1.
 * Positive number; added to reliability drift each quarter.
 */
export function catchmentGrowthPerQuarter(annualRate: number): number {
  return Math.pow(1 + annualRate, 0.25) - 1;
}
