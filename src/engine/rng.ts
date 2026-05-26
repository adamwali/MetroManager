import type { RngState, RngSeeds, RngSubsystem } from '@/types/rng';

/**
 * Seeded RNG. Phase 1.3.
 *
 * Two patterns coexist:
 *
 * 1. **Sequenced RNG per subsystem.** Each draw advances `callCount`.
 *    Same seed + same callCount = same value. Save/load round-trips
 *    preserve exact state. Use this for batched draws within a system
 *    (e.g., shuffle order, pick from N items in one operation).
 *
 * 2. **Keyed RNG (no state).** `keyedFloat(masterSeed, "event:EV031:q12")`
 *    returns a deterministic float from a master seed + string key. Same
 *    inputs → same value, no callCount tracking. Use for per-event
 *    independent decisions ("did EV031 fire this quarter?") so adding
 *    new event types doesn't shift the sequence for existing ones.
 *
 * Algorithm: mulberry32. Fast, deterministic, JSON-safe. Not crypto.
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

/** FNV-1a 32-bit hash of a string into a seed. */
function hashString(s: string, basis: number): number {
  let h = basis | 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  }
  return (h >>> 0) || 1;
}

function deriveSubSeed(masterSeed: number, subsystem: RngSubsystem): number {
  return hashString(subsystem, masterSeed);
}

export function createRngSeeds(masterSeed: number): RngSeeds {
  const subsystems = {} as Record<RngSubsystem, RngState>;
  for (const sub of ALL_SUBSYSTEMS) {
    subsystems[sub] = { seed: deriveSubSeed(masterSeed, sub), callCount: 0 };
  }
  return { masterSeed, subsystems };
}

/** Convert one mulberry32 step at (seed, n) into a uniform float in [0, 1). */
function mulberry32At(seed: number, n: number): number {
  let t = (seed + 0x6d2b79f5 * (n + 1)) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ============================================================================
// Sequenced helpers — advance state by N calls per draw, pure
// ============================================================================

/** Draw a uniform float in [0, 1). Returns next state + value. */
export function nextFloat(state: RngState): { state: RngState; value: number } {
  const value = mulberry32At(state.seed, state.callCount);
  return {
    state: { seed: state.seed, callCount: state.callCount + 1 },
    value,
  };
}

/** Draw an integer in [min, max). Half-open like Math.random-derived ints. */
export function nextInt(
  state: RngState,
  min: number,
  max: number,
): { state: RngState; value: number } {
  if (max <= min) {
    return { state, value: min };
  }
  const r = nextFloat(state);
  return { state: r.state, value: Math.floor(min + r.value * (max - min)) };
}

/**
 * Pick a single option from a weighted list. Each option has a numeric
 * weight; higher weight = more likely. Weights need not sum to 1.
 */
export function pickWeighted<T>(
  state: RngState,
  options: ReadonlyArray<{ value: T; weight: number }>,
): { state: RngState; value: T } {
  if (options.length === 0) {
    throw new Error('pickWeighted: empty options array');
  }
  let total = 0;
  for (const o of options) total += Math.max(0, o.weight);
  if (total <= 0) {
    // Fall back to uniform pick if all weights are zero
    const r = nextInt(state, 0, options.length);
    return { state: r.state, value: options[r.value]!.value };
  }
  const r = nextFloat(state);
  const target = r.value * total;
  let acc = 0;
  for (const o of options) {
    acc += Math.max(0, o.weight);
    if (target < acc) {
      return { state: r.state, value: o.value };
    }
  }
  // Numerical floor: hand back the last option
  return { state: r.state, value: options[options.length - 1]!.value };
}

/**
 * Draw a standard-normal value via Box-Muller, scaled to (mean, stdDev).
 * Advances state by 2 calls (consumes 2 uniforms; discards the second
 * Box-Muller value for purity). Use when distribution matters more than
 * tightness of state advancement.
 */
export function gaussian(
  state: RngState,
  mean: number,
  stdDev: number,
): { state: RngState; value: number } {
  // Two uniforms; avoid u1 = 0 to prevent log(0).
  let r1 = nextFloat(state);
  if (r1.value === 0) r1 = nextFloat(r1.state);
  const r2 = nextFloat(r1.state);
  const u1 = r1.value || 1e-12;
  const u2 = r2.value;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return { state: r2.state, value: mean + stdDev * z };
}

/**
 * Shuffle an array in-place-but-pure: returns a new array + advanced state.
 * Fisher-Yates with the sequenced RNG.
 */
export function shuffle<T>(
  state: RngState,
  arr: ReadonlyArray<T>,
): { state: RngState; value: T[] } {
  const out = [...arr];
  let cur = state;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextInt(cur, 0, i + 1);
    cur = r.state;
    const tmp = out[i]!;
    out[i] = out[r.value]!;
    out[r.value] = tmp;
  }
  return { state: cur, value: out };
}

// ============================================================================
// Keyed helpers — pure, stateless, no callCount tracking
//
// Use for per-decision determinism that should NOT shift when new
// content is added to the game (e.g., new event templates).
// ============================================================================

/** Stateless uniform float from (masterSeed, key). Same inputs → same value. */
export function keyedFloat(masterSeed: number, key: string): number {
  const seed = hashString(key, masterSeed);
  return mulberry32At(seed, 0);
}

/** Stateless integer in [min, max) from (masterSeed, key). */
export function keyedInt(masterSeed: number, key: string, min: number, max: number): number {
  if (max <= min) return min;
  const v = keyedFloat(masterSeed, key);
  return Math.floor(min + v * (max - min));
}

/** Stateless weighted pick from a keyed seed. */
export function keyedPickWeighted<T>(
  masterSeed: number,
  key: string,
  options: ReadonlyArray<{ value: T; weight: number }>,
): T {
  if (options.length === 0) {
    throw new Error('keyedPickWeighted: empty options array');
  }
  let total = 0;
  for (const o of options) total += Math.max(0, o.weight);
  if (total <= 0) {
    return options[keyedInt(masterSeed, key, 0, options.length)]!.value;
  }
  const target = keyedFloat(masterSeed, key) * total;
  let acc = 0;
  for (const o of options) {
    acc += Math.max(0, o.weight);
    if (target < acc) return o.value;
  }
  return options[options.length - 1]!.value;
}
