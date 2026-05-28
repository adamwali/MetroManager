import type { AgencyId } from '@/types/agency';
import type { CeoArchetype } from '@/types/ceo';
import type { FarePolicyTier } from '@/types/agency';

/**
 * Operating policy constants. Phase 5.1.
 *
 * Per design doc §5 elasticities and §8 maintenance spending tiers.
 * Phase 5.1 uses per-agency averages rather than per-line elasticities
 * (per-line model defers until line objects exist).
 */

// Fare price multipliers per tier (price-only; does NOT include ridership response).
export const FARE_PRICE_MULTIPLIER: Record<FarePolicyTier, number> = {
  reduced: 0.85,
  current: 1.0,
  modestIncrease: 1.1,
  aggressiveIncrease: 1.25,
};

// Per-agency fare elasticity (riders' response to price change). Negative.
// TTC mixes subway core (-0.30) + suburban (-0.40) + buses (-0.45/-0.55).
// GO mixes peak (-0.25) + off-peak (-0.55). UP is premium / low-elasticity.
export const AGENCY_FARE_ELASTICITY: Record<AgencyId, number> = {
  ttc: -0.35,
  go: -0.30,
  up: -0.15,
};

export type FrequencyPolicy = 'reduced' | 'current' | 'enhanced';

// Frequency policy → opex multiplier (more service = more cost).
export const FREQUENCY_OPEX_MULTIPLIER: Record<FrequencyPolicy, number> = {
  reduced: 0.88,
  current: 1.0,
  enhanced: 1.15,
};

// Frequency policy → ridership multiplier (more service = more riders).
// Frequency elasticity ~0.3 average per spec §5; we bake in the riders' response.
export const FREQUENCY_RIDERSHIP_MULTIPLIER: Record<FrequencyPolicy, number> = {
  reduced: 0.955, // -15% frequency × +0.3 elasticity = -4.5%
  current: 1.0,
  enhanced: 1.06, // +20% frequency × +0.3 elasticity = +6%
};

// Archetype operating-expense multiplier — applied at createInitialGameState
// to the baseline opex. Persists for the campaign.
export const ARCHETYPE_OPEX_MULTIPLIER: Record<CeoArchetype, number> = {
  steadyOperator: 1.0,
  internationalTechnocrat: 0.95, // standardized, efficient
  insider: 1.05, // less internal efficiency, deferred maintenance burdens
  coalitionBuilder: 1.03, // consultation overhead
  // Phase 10.7: disruptor opex 1.10 → 1.05 (was crushing — +$74M/Q over 60Q
  // compounded with -15% maintenance + low trust = 90% failure even with
  // balanced strategy. Now matches insider's penalty.)
  disruptor: 1.05,
};

// Archetype maintenance-efficiency multiplier — applied inside decaySubsystems.
// Each $1M of maintenance buys this many "effective" $M of condition impact.
export const ARCHETYPE_MAINTENANCE_EFFICIENCY: Record<CeoArchetype, number> = {
  steadyOperator: 1.0,
  internationalTechnocrat: 1.10,
  insider: 0.90,
  coalitionBuilder: 0.95,
  disruptor: 0.85,
};
