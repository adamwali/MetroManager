import type { RngState, RngSeeds, RngSubsystem } from '@/types/rng';

/**
 * Seeded RNG. Phase 1.2 minimum: deterministic, isolated per subsystem,
 * serializable. Phase 1.3 will add full helpers (weighted picks, gaussian,
 * etc.) — this just gives us the foundation so Phase 1.2's determinism
 * property holds.
 *
 * Algorithm: mulberry32. Fast, JSON-safe, good enough for game-sim
 * randomness. Not cryptographic — that's fine.
 */

const ALL_SUBSYSTEMS: readonly RngSubsystem[] = [
  'events',
  'characterMoods',
  'contractorBehavior',
  'economic',
  'elections',
  'demographicDrift',
  'projectCostRealization',
  'climate',
  'technology',
  'media',
  'nimbyOrganizing',
  'gaffe',
];

/** Derive an isolated sub-seed from a master seed and a subsystem name. */
function deriveSubSeed(masterSeed: number, subsystem: RngSubsystem): number {
  // FNV-1a-ish: hash the subsystem name into the seed
  let h = masterSeed | 0;
  for (let i = 0; i < subsystem.length; i++) {
    h = Math.imul(h ^ subsystem.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0) || 1;
}

export function createRngSeeds(masterSeed: number): RngSeeds {
  const subsystems = {} as Record<RngSubsystem, RngState>;
  for (const sub of ALL_SUBSYSTEMS) {
    subsystems[sub] = { seed: deriveSubSeed(masterSeed, sub), callCount: 0 };
  }
  return { masterSeed, subsystems };
}

/**
 * Draw a uniform float in [0, 1). Returns next state and the value.
 * Pure: same input → same output.
 */
export function nextFloat(state: RngState): { state: RngState; value: number } {
  // mulberry32 advanced by callCount
  let t = (state.seed + 0x6d2b79f5 * (state.callCount + 1)) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return {
    state: { seed: state.seed, callCount: state.callCount + 1 },
    value,
  };
}
