/**
 * Seeded RNG architecture. Per design doc tech stack, Phase 1.3 prompt.
 *
 * The engine has a master seed plus one isolated sub-seed per system.
 * Each sub-seed advances independently so adding a new event type
 * doesn't shift the random sequence of existing systems. State is fully
 * serializable for save/load.
 */

export type RngSubsystem =
  | 'events'
  | 'characterMoods'
  | 'contractorBehavior'
  | 'economic'
  | 'elections'
  | 'demographicDrift'
  | 'projectCostRealization'
  | 'climate'
  | 'technology'
  | 'media'
  | 'nimbyOrganizing'
  | 'gaffe';

/** Serialized RNG state — opaque to consumers, but JSON-safe. */
export interface RngState {
  seed: number;
  /** Internal counter — advanced on each draw. Reproducibility depends on this. */
  callCount: number;
}

export interface RngSeeds {
  masterSeed: number;
  subsystems: Record<RngSubsystem, RngState>;
}
