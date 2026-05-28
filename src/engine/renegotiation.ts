import type { GameState } from '@/types/gameState';
import type { OperatingAllowanceControl } from '@/types/operatingAllowance';
import { cash } from '@/types/scalars';

/**
 * Operating-allowance renegotiation outcome computation. Phase 6.3.
 *
 * Fires at Y4 / Y8 / Y12 (Q16 / Q32 / Q48) via scheduled event EV041.
 * Outcome derived from average gov trust + board confidence + recent
 * delivery (number of operating projects + Ontario Line status).
 *
 * Player can affect outcome via the event branches:
 *   - 'accept' → outcome applied as computed
 *   - 'aggressive' → one tier better, -5 public approval, -3 to each gov trust
 *   - 'data-driven' → requires openBooks; one tier better OR continuation floor
 */

export type RenegotiationOutcome =
  | 'increase'
  | 'continuation'
  | 'decrease'
  | 'drasticCut';

export type RenegotiationStrategy = 'accept' | 'aggressive' | 'data-driven';

export interface RenegotiationPreview {
  outcome: RenegotiationOutcome;
  avgTrust: number;
  boardScore: number;
  deliveryWins: number;
  /** Allowance multiplier applied if outcome accepted (e.g., 1.2 for +20%). */
  allowanceMultiplier: number;
  /** Controls applied with negative outcomes. */
  controls: OperatingAllowanceControl[];
  /** Human-readable summary for UI preview. */
  rationale: string;
}

/** Number of operating projects at game state (delivery proxy). */
function countDeliveryWins(state: GameState): number {
  return state.projects.filter((p) => p.state === 'operating').length;
}

/** Compute the outcome from current state without applying it. UI uses this for the preview. */
export function previewRenegotiation(
  state: GameState,
  strategy: RenegotiationStrategy = 'accept',
): RenegotiationPreview {
  const avgTrust =
    ((state.politics.ottawa.trust as unknown as number) +
      (state.politics.queensPark.trust as unknown as number) +
      (state.politics.cityHall.trust as unknown as number)) /
    3;
  const boardScore = state.boardConfidence.score as unknown as number;
  const deliveryWins = countDeliveryWins(state);

  // Base outcome from metrics
  let baseOutcome: RenegotiationOutcome;
  if (avgTrust < 25 || boardScore < 25) {
    baseOutcome = 'drasticCut';
  } else if (avgTrust < 40 || boardScore < 35) {
    baseOutcome = 'decrease';
  } else if (avgTrust >= 65 && boardScore >= 60 && deliveryWins >= 1) {
    baseOutcome = 'increase';
  } else {
    baseOutcome = 'continuation';
  }

  // Strategy modifiers
  let outcome = baseOutcome;
  if (strategy === 'aggressive' || strategy === 'data-driven') {
    outcome = shiftTierUp(outcome);
  }

  return {
    outcome,
    avgTrust,
    boardScore,
    deliveryWins,
    allowanceMultiplier: multiplierFor(outcome),
    controls: controlsFor(outcome, state),
    rationale: rationaleFor(baseOutcome, outcome, strategy, avgTrust, boardScore, deliveryWins),
  };
}

function shiftTierUp(o: RenegotiationOutcome): RenegotiationOutcome {
  if (o === 'drasticCut') return 'decrease';
  if (o === 'decrease') return 'continuation';
  if (o === 'continuation') return 'increase';
  return 'increase';
}

function multiplierFor(o: RenegotiationOutcome): number {
  // Phase 10.5: softer renegotiation outcomes. Previously drasticCut at 0.5
  // could cascade into fiscal failure; now -25% worst-case, -10% mild
  // disappointment. Increase is still meaningful at +20%.
  switch (o) {
    case 'increase':
      return 1.2;
    case 'continuation':
      return 1.0;
    case 'decrease':
      return 0.9;
    case 'drasticCut':
      return 0.75;
  }
}

function controlsFor(o: RenegotiationOutcome, state: GameState): OperatingAllowanceControl[] {
  if (o === 'increase' || o === 'continuation') return [];
  if (o === 'decrease') {
    // Find the most expensive under-construction project to deprioritize
    const target = state.projects.find((p) => p.state === 'under_construction');
    if (target) {
      return [{ kind: 'projectDeprioritization', projectIds: [target.templateId] }];
    }
    return [{ kind: 'costCap', capPerQuarter: cash(1_500) }];
  }
  // drasticCut
  return [
    { kind: 'costCap', capPerQuarter: cash(1_000) },
    { kind: 'hiringFreezeRoles', roles: ['engineers', 'managers'] },
  ];
}

function rationaleFor(
  base: RenegotiationOutcome,
  applied: RenegotiationOutcome,
  strategy: RenegotiationStrategy,
  avgTrust: number,
  boardScore: number,
  wins: number,
): string {
  const baseDesc = describeOutcome(base);
  if (strategy === 'accept' || base === applied) {
    return `Avg trust ${avgTrust.toFixed(0)}, board ${boardScore.toFixed(0)}, ${wins} delivery wins → ${baseDesc}.`;
  }
  return `Base ${baseDesc}; ${strategy === 'aggressive' ? 'aggressive lobby' : 'open-books pitch'} shifts up to ${describeOutcome(applied)}.`;
}

function describeOutcome(o: RenegotiationOutcome): string {
  switch (o) {
    case 'increase':
      return 'increase (+20%)';
    case 'continuation':
      return 'continuation (flat)';
    case 'decrease':
      return 'decrease (-20% + controls)';
    case 'drasticCut':
      return 'drastic cut (-50% + heavy controls)';
  }
}

/**
 * Apply the renegotiation outcome: modifies operatingAllowance.annualAmount,
 * adds controls, advances renegotiatesAt to next Y4 window.
 */
export function applyRenegotiation(
  state: GameState,
  strategy: RenegotiationStrategy,
): GameState {
  const preview = previewRenegotiation(state, strategy);
  const currentAmount = state.operatingAllowance.annualAmount as unknown as number;
  const newAmount = Math.round(currentAmount * preview.allowanceMultiplier);
  const nextRenegotiatesAtQ = (state.quarter as unknown as number) + 16;
  return {
    ...state,
    operatingAllowance: {
      ...state.operatingAllowance,
      annualAmount: newAmount as unknown as typeof state.operatingAllowance.annualAmount,
      signedAt: state.quarter,
      renegotiatesAt: nextRenegotiatesAtQ as unknown as typeof state.operatingAllowance.renegotiatesAt,
      controls: preview.controls,
    },
  };
}
