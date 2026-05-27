import type { GameState } from '@/types/gameState';
import type { Agency } from '@/types/agency';
import { cash, score, signed } from '@/types/scalars';
import { INITIAL_CHARACTERS } from './characterRoster';
import {
  CLEANLINESS_BUDGET_BASELINE,
  SECURITY_BUDGET_BASELINE,
} from './agencies';

/**
 * Backfill missing fields on a GameState loaded from older save versions.
 * Phase 10 polish — running campaigns shouldn't break when we add new
 * state fields. Each new field gets a default here so partial saves
 * still hydrate cleanly.
 *
 * If your save was created before a given field existed, this function
 * fills in a sensible default. Idempotent for fully-current saves.
 */
export function migrateLoadedState(loaded: unknown): GameState {
  const s = loaded as Partial<GameState>;
  if (!s || typeof s !== 'object') {
    throw new Error('Save bundle is not an object');
  }

  const next = { ...s } as GameState;

  // Agencies: backfill securityBudget + cleanlinessBudget (Phase 5.2)
  if (next.agencies) {
    next.agencies = {
      ttc: migrateAgency(next.agencies.ttc, 'ttc'),
      go: migrateAgency(next.agencies.go, 'go'),
      up: migrateAgency(next.agencies.up, 'up'),
    };
  }

  // Characters: backfill if empty or missing (Phase 6.2)
  if (!next.characters || Object.keys(next.characters).length === 0) {
    next.characters = { ...INITIAL_CHARACTERS };
  }

  // Standing orders: ensure array (Phase 8.1)
  if (!Array.isArray(next.standingOrders)) {
    next.standingOrders = [];
  }

  // engineVars: backfill orphan vars (Phase 6.3.2)
  if (next.engineVars) {
    const ev = { ...next.engineVars };
    if (ev.crosslinxLeverage === undefined) ev.crosslinxLeverage = score(55);
    if (ev.consultantAlignment === undefined) ev.consultantAlignment = signed(0);
    if (ev.nimbyOrganization === undefined) ev.nimbyOrganization = score(0);
    if (ev.templates === undefined) ev.templates = score(30);
    if (ev.engineers === undefined) ev.engineers = 180;
    if (ev.publicApproval === undefined) ev.publicApproval = score(50);
    next.engineVars = ev;
  }

  // operatingAllowance.controls: ensure array (Phase 6.3.1)
  if (next.operatingAllowance && !Array.isArray(next.operatingAllowance.controls)) {
    next.operatingAllowance = {
      ...next.operatingAllowance,
      controls: [],
    };
  }

  // activeObligations: ensure array
  if (!Array.isArray(next.activeObligations)) {
    next.activeObligations = [];
  }

  // inbox: ensure array
  if (!Array.isArray(next.inbox)) {
    next.inbox = [];
  }

  // delayedQueue: ensure array
  if (!Array.isArray(next.delayedQueue)) {
    next.delayedQueue = [];
  }

  return next;
}

function migrateAgency(agency: Agency | undefined, id: 'ttc' | 'go' | 'up'): Agency {
  if (!agency) {
    throw new Error(`Save missing agency ${id}`);
  }
  const op = agency.operatingParams ?? { frequencyPolicy: 'current', farePolicy: 'current' };
  return {
    ...agency,
    operatingParams: {
      frequencyPolicy: op.frequencyPolicy ?? 'current',
      farePolicy: op.farePolicy ?? 'current',
      securityBudget:
        op.securityBudget !== undefined ? op.securityBudget : cash(SECURITY_BUDGET_BASELINE[id]),
      cleanlinessBudget:
        op.cleanlinessBudget !== undefined
          ? op.cleanlinessBudget
          : cash(CLEANLINESS_BUDGET_BASELINE[id]),
    },
  };
}
