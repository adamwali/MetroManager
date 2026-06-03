import type { GameState } from '@/types/gameState';
import type { GovernmentId, PoliticalActionKind } from '@/types/politics';
import type { ActionLogEntry } from '@/types/actionLog';
import type { CeoArchetype } from '@/types/ceo';
import type { Character } from '@/types/characters';
import { cash, quarter, score } from '@/types/scalars';

/**
 * Political actions. Phase 6.1.
 *
 * Player-initiated, between-event lobbying + ad-hoc funding requests.
 * Each action has a per-government cooldown so the player can't spam them.
 *
 * Action costs and effects:
 *
 * - `publicLobby`: high-visibility ask in media. +6 trust with target gov.
 *   -5 public approval (perceived as political). 4Q cooldown per gov.
 *   Always available.
 *
 * - `quietPitch`: back-channel. +3 trust. No public optics. 3Q cooldown.
 *   Available if trust >= 40 OR archetype is 'insider'.
 *
 * - `adHocFunding`: ask for $150M extra between renegotiations.
 *   -8 trust. 8Q cooldown. Requires trust >= 45.
 *
 * - `callInFavor`: Insider-only. +$400M cash AND +5 trust. 16Q cooldown.
 *   Requires archetype='insider' AND trust >= 60.
 */

export interface PoliticalActionResult {
  state: GameState;
  logEntry: ActionLogEntry | null;
  /** Plain-language summary of what happened — surfaced in the UI. */
  outcomeSummary: string;
}

const COOLDOWN_QUARTERS: Record<PoliticalActionKind, number> = {
  publicLobby: 4,
  quietPitch: 3,
  adHocFunding: 8,
  callInFavor: 16,
};

const clampScore = (n: number): number => Math.max(0, Math.min(100, n));

/** Returns true if the action is currently on cooldown for that gov. */
export function isOnCooldown(
  state: GameState,
  gov: GovernmentId,
  kind: PoliticalActionKind,
): boolean {
  const expiresAt = state.politics[gov].actionCooldowns[kind];
  if (expiresAt === undefined) return false;
  return (expiresAt as unknown as number) > (state.quarter as unknown as number);
}

/** Quarters remaining on cooldown, or 0 if available. */
export function cooldownQuartersLeft(
  state: GameState,
  gov: GovernmentId,
  kind: PoliticalActionKind,
): number {
  const expiresAt = state.politics[gov].actionCooldowns[kind];
  if (expiresAt === undefined) return 0;
  const remaining = (expiresAt as unknown as number) - (state.quarter as unknown as number);
  return Math.max(0, remaining);
}

/** Returns true if the player meets the eligibility predicate for this action. */
export function isActionEligible(
  state: GameState,
  gov: GovernmentId,
  kind: PoliticalActionKind,
): boolean {
  if (isOnCooldown(state, gov, kind)) return false;
  const trust = state.politics[gov].trust as unknown as number;
  const archetype: CeoArchetype = state.ceo.archetype;
  switch (kind) {
    case 'publicLobby':
      return true; // always available
    case 'quietPitch':
      return trust >= 40 || archetype === 'insider';
    case 'adHocFunding':
      return trust >= 45;
    case 'callInFavor':
      return archetype === 'insider' && trust >= 60;
  }
}

function setCooldown(
  state: GameState,
  gov: GovernmentId,
  kind: PoliticalActionKind,
): GameState {
  const q = (state.quarter as unknown as number) + COOLDOWN_QUARTERS[kind];
  return {
    ...state,
    politics: {
      ...state.politics,
      [gov]: {
        ...state.politics[gov],
        actionCooldowns: {
          ...state.politics[gov].actionCooldowns,
          [kind]: quarter(q),
        },
      },
    },
  };
}

function shiftTrust(state: GameState, gov: GovernmentId, delta: number): GameState {
  const current = state.politics[gov].trust as unknown as number;
  return {
    ...state,
    politics: {
      ...state.politics,
      [gov]: { ...state.politics[gov], trust: score(clampScore(current + delta)) },
    },
  };
}

function shiftPublicApproval(state: GameState, delta: number): GameState {
  const current = state.engineVars.publicApproval as unknown as number;
  return {
    ...state,
    engineVars: { ...state.engineVars, publicApproval: score(clampScore(current + delta)) },
  };
}

function appendLog(
  state: GameState,
  kind: PoliticalActionKind,
  gov: GovernmentId,
  summary: string,
): { state: GameState; entry: ActionLogEntry } {
  const id = `q${state.quarter as unknown as number}-${state.nextLogId}`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: `${kind}:${gov}`,
    summary,
  };
  return {
    state: {
      ...state,
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    entry,
  };
}

const GOV_LABEL: Record<GovernmentId, string> = {
  ottawa: 'Ottawa',
  queensPark: "Queen's Park",
  cityHall: 'City Hall',
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Phase 6.2.1: shift the relationship score on the first cabinet character
 * for a government. Mirrors the gov-level trust shift so lobby actions feel
 * personal — "you helped Hartwell" not "Queen's Park warmed up."
 */
function shiftCabinetRelationship(state: GameState, gov: GovernmentId, delta: number): GameState {
  const cabinetIds = state.politics[gov].cabinetCharacterIds;
  if (cabinetIds.length === 0) return state;
  const targetId = cabinetIds[0]!;
  const character = state.characters[targetId];
  if (!character) return state;
  const newRel = Math.max(
    0,
    Math.min(100, (character.relationship as unknown as number) + delta),
  );
  return {
    ...state,
    characters: {
      ...state.characters,
      [targetId]: {
        ...character,
        relationship: score(newRel),
        interactions: [
          ...character.interactions,
          {
            quarter: state.quarter,
            kind: 'lobby_privateMeeting',
            delta,
            note: `lobby action shifted relationship by ${delta}`,
          },
        ],
      },
    },
  };
}

export function publicLobby(state: GameState, gov: GovernmentId): PoliticalActionResult {
  if (!isActionEligible(state, gov, 'publicLobby')) {
    return { state, logEntry: null, outcomeSummary: 'Action unavailable' };
  }
  let s = shiftTrust(state, gov, 6);
  s = shiftPublicApproval(s, -5);
  s = shiftCabinetRelationship(s, gov, 4); // public lobbying is showier
  s = setCooldown(s, gov, 'publicLobby');
  const summary = `Public lobby ${GOV_LABEL[gov]} → +6 trust, -5 public approval`;
  const r = appendLog(s, 'publicLobby', gov, summary);
  return { state: r.state, logEntry: r.entry, outcomeSummary: summary };
}

export function quietPitch(state: GameState, gov: GovernmentId): PoliticalActionResult {
  if (!isActionEligible(state, gov, 'quietPitch')) {
    return { state, logEntry: null, outcomeSummary: 'Action unavailable' };
  }
  let s = shiftTrust(state, gov, 3);
  s = shiftCabinetRelationship(s, gov, 6); // private = builds personal relationship more
  s = setCooldown(s, gov, 'quietPitch');
  const summary = `Quiet pitch ${GOV_LABEL[gov]} → +3 trust (no public optics)`;
  const r = appendLog(s, 'quietPitch', gov, summary);
  return { state: r.state, logEntry: r.entry, outcomeSummary: summary };
}

export function adHocFunding(state: GameState, gov: GovernmentId): PoliticalActionResult {
  if (!isActionEligible(state, gov, 'adHocFunding')) {
    return { state, logEntry: null, outcomeSummary: 'Action unavailable' };
  }
  // Cash injection: $150M base, scaled by trust (high trust = more)
  const trust = state.politics[gov].trust as unknown as number;
  // Phase 10.7 audit fix: cabinet minister relationship adds a smaller bonus
  // (up to +$50M). Acknowledges that personal ties speed up an ad-hoc ask.
  const cabinetIds = state.politics[gov].cabinetCharacterIds;
  const ministerId = cabinetIds[0];
  const minister = ministerId ? state.characters[ministerId] : undefined;
  const relationship = (minister?.relationship as unknown as number) ?? 0;
  const baseCash = 100 + (trust / 100) * 150;
  const relationshipBonus = Math.max(0, relationship) * 0.5; // up to +$50M at rel 100
  const cashM = Math.round(baseCash + relationshipBonus);
  let s: GameState = {
    ...state,
    cash: {
      ...state.cash,
      balance: cash((state.cash.balance as unknown as number) + cashM),
    },
  };
  s = shiftTrust(s, gov, -8);
  s = shiftCabinetRelationship(s, gov, -6); // burning the contact for cash
  s = setCooldown(s, gov, 'adHocFunding');
  const summary = `Ad-hoc funding ${GOV_LABEL[gov]} → +$${cashM}M cash, -8 trust`;
  const r = appendLog(s, 'adHocFunding', gov, summary);
  return { state: r.state, logEntry: r.entry, outcomeSummary: summary };
}

export function callInFavor(state: GameState, gov: GovernmentId): PoliticalActionResult {
  if (!isActionEligible(state, gov, 'callInFavor')) {
    return { state, logEntry: null, outcomeSummary: 'Action unavailable' };
  }
  // Phase 10.7 audit fix: Character.relationship was previously written but
  // never consumed. Now it gates and modulates callInFavor — the deepest /
  // most personal political action. Below 0 relationship = locked
  // (minister won't take the call). Above that, favor size scales linearly.
  const cabinetIds = state.politics[gov].cabinetCharacterIds;
  const ministerId = cabinetIds[0];
  const minister = ministerId ? state.characters[ministerId] : undefined;
  const relationship = (minister?.relationship as unknown as number) ?? 0;
  if (relationship < 0) {
    return {
      state,
      logEntry: null,
      outcomeSummary: `Minister won't take the call — relationship is too poor (${relationship}).`,
    };
  }
  // Base $250M + $3M per relationship point. Default (rel 50) = $400M
  // (matches pre-Phase-10.7 favor size). rel 0 = $250M. rel 100 = $550M.
  const favorM = Math.round(250 + Math.max(0, relationship) * 3);
  let s: GameState = {
    ...state,
    cash: {
      ...state.cash,
      balance: cash((state.cash.balance as unknown as number) + favorM),
    },
  };
  s = shiftTrust(s, gov, 5);
  s = shiftCabinetRelationship(s, gov, 8); // favor is intimate — big relationship boost
  s = setCooldown(s, gov, 'callInFavor');
  const summary = `Called in favor with ${GOV_LABEL[gov]} (rel ${relationship}) → +$${favorM}M cash, +5 trust`;
  const r = appendLog(s, 'callInFavor', gov, summary);
  return { state: r.state, logEntry: r.entry, outcomeSummary: summary };
}

/**
 * Phase 10.12: 1-on-1 private meeting with a named character. Builds
 * relationship slowly (no political-action cooldown — has its own 8Q
 * cooldown per character via lobbyingCooldownUntil) and adds an
 * interaction record so future events have memory.
 *
 * Cost + relationship outcome shift by character mood; the dialogue UI
 * (MeetingModal) drives the choice between 3 response options.
 */
export function requestPrivateMeeting(
  state: GameState,
  characterId: string,
  responseId: 'warm' | 'transactional' | 'cold',
): { state: GameState; logEntry: ActionLogEntry | null; outcomeSummary: string } {
  const character = state.characters[characterId];
  if (!character) {
    return { state, logEntry: null, outcomeSummary: 'No such contact.' };
  }
  const q = state.quarter as unknown as number;
  const cooldownUntil = character.lobbyingCooldownUntil as unknown as number | undefined;
  if (cooldownUntil !== undefined && cooldownUntil > q) {
    const wait = cooldownUntil - q;
    return {
      state,
      logEntry: null,
      outcomeSummary: `${character.name} won't take another meeting for ${wait}Q.`,
    };
  }

  // Response → relationship delta. Warm builds; transactional is neutral
  // unless they're aligned; cold burns a little for a downstream lever.
  let relDelta = 0;
  let cashDelta = 0;
  if (responseId === 'warm') relDelta = 6;
  if (responseId === 'transactional') relDelta = 2;
  if (responseId === 'cold') {
    relDelta = -4;
    // Cold meeting can extract a small concession from a hostile contact:
    // if relationship is low they confide something useful (small cash).
    if ((character.relationship as unknown as number) <= 30) cashDelta = 25;
  }

  const newRel = Math.max(
    0,
    Math.min(100, (character.relationship as unknown as number) + relDelta),
  );
  const newCash = (state.cash.balance as unknown as number) + cashDelta;

  const cooldownTarget = quarter(q + 8);
  const updatedCharacter = {
    ...character,
    relationship: score(newRel),
    lobbyingCooldownUntil: cooldownTarget,
    interactions: [
      ...character.interactions,
      {
        quarter: state.quarter,
        kind: 'lobby_privateMeeting' as const,
        delta: relDelta,
        note: responseId,
      },
    ],
  } as Character;

  const summary = `Private meeting with ${character.name} (${responseId}) → ${
    relDelta >= 0 ? '+' : ''
  }${relDelta} relationship${cashDelta > 0 ? `, +$${cashDelta}M cash` : ''}`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id: `q${q}-${state.nextLogId}`,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: `privateMeeting:${characterId}:${responseId}`,
    summary,
  };

  return {
    state: {
      ...state,
      cash: { ...state.cash, balance: cash(newCash) },
      characters: { ...state.characters, [characterId]: updatedCharacter },
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    logEntry: entry,
    outcomeSummary: summary,
  };
}

/**
 * Dispatch helper for UI — picks the right action function by kind.
 */
export function executePoliticalAction(
  state: GameState,
  gov: GovernmentId,
  kind: PoliticalActionKind,
): PoliticalActionResult {
  switch (kind) {
    case 'publicLobby':
      return publicLobby(state, gov);
    case 'quietPitch':
      return quietPitch(state, gov);
    case 'adHocFunding':
      return adHocFunding(state, gov);
    case 'callInFavor':
      return callInFavor(state, gov);
  }
}

/** UI metadata for action cards. */
export const POLITICAL_ACTION_META: Record<
  PoliticalActionKind,
  { label: string; description: string; effectSummary: string; cooldownLabel: string }
> = {
  publicLobby: {
    label: 'Public lobby',
    description: 'High-visibility press push for transit support.',
    effectSummary: '+6 trust · -5 public approval',
    cooldownLabel: '4Q cooldown',
  },
  quietPitch: {
    label: 'Quiet pitch',
    description: 'Back-channel conversation. No press involvement.',
    effectSummary: '+3 trust · no optics',
    cooldownLabel: '3Q cooldown · trust ≥40 or Insider',
  },
  adHocFunding: {
    label: 'Ad-hoc funding request',
    description: "Direct ask between renegotiations. Burns goodwill.",
    effectSummary: '+$100-250M cash · -8 trust',
    cooldownLabel: '8Q cooldown · trust ≥45',
  },
  callInFavor: {
    label: 'Call in favor',
    description: 'Cash in a relationship you built. Insiders only.',
    effectSummary: '+$400M cash · +5 trust',
    cooldownLabel: '16Q cooldown · Insider + trust ≥60',
  },
};
