import type { GameState } from '@/types/gameState';
import { migrateLoadedState } from './migrate';

/**
 * JSON save/load. Phase 1.4 — pure functions only, no IO.
 *
 * The full IndexedDB save-slot mechanic lands in Phase 2.2. For now we
 * just need serialization that round-trips byte-identical GameState so
 * the CLI harness can dump and re-load campaigns deterministically.
 *
 * Schema versioning: GameState.schemaVersion is a literal `1`. When we
 * change shape in a backwards-incompatible way, bump the literal and add
 * a migrator here.
 */

const CURRENT_SCHEMA_VERSION = 1 as const;

export interface SaveBundle {
  /** Schema version this save was written for. */
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  /** Timestamp the save was written (ISO 8601, for UI display only). */
  savedAt: string;
  /** Full GameState. */
  state: GameState;
}

export class SaveLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveLoadError';
  }
}

/** Serialize a GameState to a JSON string suitable for storage or transfer. */
export function saveGameToJson(state: GameState, now: Date = new Date()): string {
  if (state.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new SaveLoadError(
      `Refusing to save GameState with schemaVersion=${state.schemaVersion}; current is ${CURRENT_SCHEMA_VERSION}`,
    );
  }
  const bundle: SaveBundle = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: now.toISOString(),
    state,
  };
  return JSON.stringify(bundle);
}

/** Parse a save JSON string back into a GameState. Throws on shape mismatch. */
export function loadGameFromJson(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new SaveLoadError(`Could not parse save JSON: ${(err as Error).message}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new SaveLoadError('Save JSON did not parse to an object');
  }
  const bundle = parsed as Partial<SaveBundle>;
  if (bundle.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new SaveLoadError(
      `Save schema version ${bundle.schemaVersion} not supported (current is ${CURRENT_SCHEMA_VERSION})`,
    );
  }
  if (!bundle.state || typeof bundle.state !== 'object') {
    throw new SaveLoadError('Save bundle missing `state` field');
  }
  // Branded types are erased at runtime; nothing to reconstruct.
  // Migrate any missing fields with safe defaults (Phase 10 robustness).
  return migrateLoadedState(bundle.state);
}
