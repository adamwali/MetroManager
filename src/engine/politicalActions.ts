import type { GameState } from '@/types/gameState';
import type { GovernmentId, PoliticalActionKind } from '@/types/politics';
import type { ActionLogEntry } from '@/types/actionLog';
import type { CeoArchetype } from '@/types/ceo';
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

export function publicLobby(state: GameState, gov: GovernmentId): PoliticalActionResult {
  if (!isActionEligible(state, gov, 'publicLobby')) {
    return { state, logEntry: null, outcomeSummary: 'Action unavailable' };
  }
  let s = shiftTrust(state, gov, 6);
  s = shiftPublicApproval(s, -5);
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
  const cashM = Math.round(100 + (trust / 100) * 150);
  let s: GameState = {
    ...state,
    cash: {
      ...state.cash,
      balance: cash((state.cash.balance as unknown as number) + cashM),
    },
  };
  s = shiftTrust(s, gov, -8);
  s = setCooldown(s, gov, 'adHocFunding');
  const summary = `Ad-hoc funding ${GOV_LABEL[gov]} → +$${cashM}M cash, -8 trust`;
  const r = appendLog(s, 'adHocFunding', gov, summary);
  return { state: r.state, logEntry: r.entry, outcomeSummary: summary };
}

export function callInFavor(state: GameState, gov: GovernmentId): PoliticalActionResult {
  if (!isActionEligible(state, gov, 'callInFavor')) {
    return { state, logEntry: null, outcomeSummary: 'Action unavailable' };
  }
  let s: GameState = {
    ...state,
    cash: {
      ...state.cash,
      balance: cash((state.cash.balance as unknown as number) + 400),
    },
  };
  s = shiftTrust(s, gov, 5);
  s = setCooldown(s, gov, 'callInFavor');
  const summary = `Called in favor with ${GOV_LABEL[gov]} → +$400M cash, +5 trust (limited use)`;
  const r = appendLog(s, 'callInFavor', gov, summary);
  return { state: r.state, logEntry: r.entry, outcomeSummary: summary };
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
