import type { Agency, SubsystemId } from '@/types/agency';
import type { CeoArchetype } from '@/types/ceo';
import type { CashMillions } from '@/types/scalars';
import { score } from '@/types/scalars';
import { ARCHETYPE_MAINTENANCE_EFFICIENCY } from './policies';

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
 *
 * Archetype maintenance efficiency multiplier (Phase 5.1): Technocrat 1.10×,
 * Insider 0.90×, etc. Each $1M of maintenance buys more or less effective
 * condition than baseline. Applied by scaling the ratio before tier lookup.
 */
function deltaForSubsystem(
  subsystemId: SubsystemId,
  budget: CashMillions,
  agencyId: 'ttc' | 'go' | 'up',
  archetype: CeoArchetype = 'steadyOperator',
): number {
  const required = requiredFor(agencyId);
  const budgetN = budget as unknown as number;
  const efficiency = ARCHETYPE_MAINTENANCE_EFFICIENCY[archetype];
  const ratio = required > 0 ? (budgetN * efficiency) / required : 0;
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

/**
 * Forecast subsystem condition `quartersOut` quarters into the future given a
 * proposed maintenance budget. Used by AgencyDashboard sliders to preview
 * "if I leave this at $X, condition will be Y in 4Q".
 *
 * Returns:
 *   - quarterlyDelta: condition change per quarter at this budget
 *   - conditionInNQuarters: projected condition (clamped 0-100)
 *   - tier: spending tier label
 *   - cashDeltaPerQM: budget delta vs current ($M/Q, signed)
 */
export interface MaintenanceForecast {
  quarterlyDelta: number;
  conditionInNQuarters: number;
  tier: 'underspend' | 'required' | 'preventive' | 'catchUp';
  cashDeltaPerQM: number;
}

export function forecastMaintenance(
  subsystemId: SubsystemId,
  currentCondition: number,
  currentBudgetM: number,
  proposedBudgetM: number,
  agencyId: 'ttc' | 'go' | 'up',
  archetype: CeoArchetype = 'steadyOperator',
  quartersOut = 4,
): MaintenanceForecast {
  const delta = deltaForSubsystem(
    subsystemId,
    proposedBudgetM as unknown as CashMillions,
    agencyId,
    archetype,
  );
  const projected = Math.max(0, Math.min(100, currentCondition + delta * quartersOut));
  return {
    quarterlyDelta: delta,
    conditionInNQuarters: projected,
    tier: maintenanceTier(proposedBudgetM, agencyId, archetype),
    cashDeltaPerQM: proposedBudgetM - currentBudgetM,
  };
}

export function decaySubsystems(
  agency: Agency,
  archetype: CeoArchetype = 'steadyOperator',
): Agency {
  const updated = agency.subsystems.map((sub) => {
    const delta = deltaForSubsystem(sub.id, sub.maintenanceBudget, agency.id, archetype);
    const next = Math.max(0, Math.min(100, (sub.condition as unknown as number) + delta));
    return { ...sub, condition: score(next) };
  });
  return { ...agency, subsystems: updated };
}

/** Compute the spending tier label for UI display. */
export function maintenanceTier(
  budgetM: number,
  agencyId: 'ttc' | 'go' | 'up',
  archetype: CeoArchetype = 'steadyOperator',
): 'underspend' | 'required' | 'preventive' | 'catchUp' {
  const required = requiredFor(agencyId);
  const efficiency = ARCHETYPE_MAINTENANCE_EFFICIENCY[archetype];
  const ratio = required > 0 ? (budgetM * efficiency) / required : 0;
  if (ratio < 1.0) return 'underspend';
  if (ratio < 1.5) return 'required';
  if (ratio < 2.0) return 'preventive';
  return 'catchUp';
}

export function requiredMaintenanceFor(agencyId: 'ttc' | 'go' | 'up'): number {
  return requiredFor(agencyId);
}

/**
 * Reliability composite, 0-100. Phase 10 polish: weighted by subsystem
 * criticality instead of plain average. Signals and rolling stock are
 * weighted heaviest — a network with failing signals can't run safely
 * regardless of how nice the stations are. Track + catenary mid-weight.
 * Stations lowest weight (cosmetic + ridership effect, not safety).
 *
 * Previous bug: unweighted avg let players ignore signals (condition 10)
 * and offset with stations (condition 100) for reliability avg of 55.
 *
 * Weights chosen so a single subsystem at 0 with others at 100:
 *   - signals at 0 → composite ~70 (35% weight × -100 from 100)
 *   - rolling stock at 0 → composite ~75
 *   - track at 0 → composite ~85
 *   - catenary at 0 → composite ~87
 *   - stations at 0 → composite ~92
 */
const SUBSYSTEM_RELIABILITY_WEIGHT: Record<string, number> = {
  signals: 3.0,
  rollingStock: 2.5,
  track: 1.5,
  catenary: 1.3,
  stations: 0.7,
};

export function reliabilityScore(agency: Agency): number {
  if (agency.subsystems.length === 0) return 100;
  let weightedSum = 0;
  let weightTotal = 0;
  for (const s of agency.subsystems) {
    const weight = SUBSYSTEM_RELIABILITY_WEIGHT[s.id] ?? 1;
    weightedSum += (s.condition as unknown as number) * weight;
    weightTotal += weight;
  }
  return weightTotal > 0 ? weightedSum / weightTotal : 0;
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

/**
 * Per-quarter ridership drift from public approval. Phase 3.2 polish — wires
 * public approval (previously an empty-calorie KPI moved by many events but
 * with no mechanical consequence) into ridership.
 *
 * - Approval ≥ 70: +0.10%/Q growth assist (modest boost to organic growth)
 * - Approval 30-70: 0 (no effect)
 * - Approval < 30: -0.30%/Q drag (low public sentiment hurts ridership)
 *
 * Applied alongside reliability drag and catchment growth.
 */
/**
 * Phase 5.2: Security + cleanliness budgets affect approval and ridership.
 *
 * Each agency has a baseline budget (TTC: $50M sec / $40M clean;
 * GO: $15M / $10M; UP: $3M / $2M). Sliders go 0× to 2× baseline.
 *
 * Effect per quarter, additive across all 3 agencies:
 * - Cleanliness at 0× baseline: -2 public approval/Q
 * - Cleanliness at 2× baseline: +1 public approval/Q
 * - Security at 0× baseline: -0.3%/Q ridership drag (perceived safety)
 * - Security at 2× baseline: +0.1%/Q ridership lift
 */
export const SECURITY_BUDGET_BASELINE: Record<'ttc' | 'go' | 'up', number> = {
  ttc: 50,
  go: 15,
  up: 3,
};

export const CLEANLINESS_BUDGET_BASELINE: Record<'ttc' | 'go' | 'up', number> = {
  ttc: 40,
  go: 10,
  up: 2,
};

export function cleanlinessApprovalDrift(agency: Agency): number {
  const baseline = CLEANLINESS_BUDGET_BASELINE[agency.id];
  const budget = agency.operatingParams.cleanlinessBudget as unknown as number;
  if (baseline === 0) return 0;
  const ratio = budget / baseline;
  if (ratio <= 0.1) return -2;
  if (ratio < 0.5) return -1;
  if (ratio < 0.9) return -0.3;
  if (ratio < 1.3) return 0;
  if (ratio < 1.8) return 0.5;
  return 1;
}

export function securityRidershipDrift(agency: Agency): number {
  const baseline = SECURITY_BUDGET_BASELINE[agency.id];
  const budget = agency.operatingParams.securityBudget as unknown as number;
  if (baseline === 0) return 0;
  const ratio = budget / baseline;
  if (ratio <= 0.1) return -0.003;
  if (ratio < 0.5) return -0.0015;
  if (ratio < 0.9) return -0.0005;
  if (ratio < 1.3) return 0;
  if (ratio < 1.8) return 0.0005;
  return 0.001;
}

export function approvalRidershipDrift(approval: number): number {
  if (approval >= 70) return 0.001;
  if (approval < 30) return -0.003;
  return 0;
}
