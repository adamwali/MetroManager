import type { GameState } from '@/types/gameState';
import type { ActionLogEntry } from '@/types/actionLog';
import { ENGINEER_MAX, ENGINEER_MIN } from './projects';

/**
 * Staffing actions. Phase 10.8.
 *
 * The player can scale the in-house engineering department. More engineers
 * deliver capital projects faster (burn-rate multiplier in projects.ts,
 * up to 1.5× at ~270 staff), but cost ongoing salary (charged in endTurn
 * as the delta from the 180 baseline). Fewer engineers save salary but
 * slow every project.
 *
 * Tradeoff is only worth paying when you have active projects — idle
 * engineers are pure cost.
 *
 * Respects the `hiringFreezeRoles` operating-allowance control: when a
 * renegotiation imposed a hiring freeze, headcount cannot be increased
 * (only held or cut).
 */

export interface StaffingQuote {
  current: number;
  target: number;
  /** Net quarterly salary change vs current ($M). Positive = more cost. */
  deltaSalaryPerQM: number;
  blockedReason?: string;
}

const SALARY_PER_ENGINEER_PER_Q_M = 0.1;

function hiringFrozen(state: GameState): boolean {
  return state.operatingAllowance.controls.some(
    (c) => c.kind === 'hiringFreezeRoles' && c.roles.includes('engineers'),
  );
}

export function quoteEngineerHeadcount(state: GameState, target: number): StaffingQuote {
  const current = state.engineVars.engineers;
  const clampedTarget = Math.max(ENGINEER_MIN, Math.min(ENGINEER_MAX, Math.round(target)));
  const deltaSalaryPerQM = (clampedTarget - current) * SALARY_PER_ENGINEER_PER_Q_M;
  if (clampedTarget > current && hiringFrozen(state)) {
    return {
      current,
      target: current,
      deltaSalaryPerQM: 0,
      blockedReason: 'Hiring freeze in effect (imposed by allowance renegotiation).',
    };
  }
  return { current, target: clampedTarget, deltaSalaryPerQM };
}

export function setEngineerHeadcount(
  state: GameState,
  target: number,
): { state: GameState; logEntry: ActionLogEntry | null; outcomeSummary: string } {
  const quote = quoteEngineerHeadcount(state, target);
  if (quote.blockedReason) {
    return { state, logEntry: null, outcomeSummary: quote.blockedReason };
  }
  if (quote.target === quote.current) {
    return { state, logEntry: null, outcomeSummary: 'No change.' };
  }
  const currentQ = state.quarter as unknown as number;
  const hiring = quote.target > quote.current;
  const delta = quote.target - quote.current;
  const salaryWord =
    quote.deltaSalaryPerQM >= 0
      ? `+$${quote.deltaSalaryPerQM.toFixed(1)}M/Q salary`
      : `-$${Math.abs(quote.deltaSalaryPerQM).toFixed(1)}M/Q saved`;
  const summary = `${hiring ? 'Hired' : 'Released'} ${Math.abs(delta)} engineers → ${quote.target} total (${salaryWord})`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id: `q${currentQ}-${state.nextLogId}`,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: 'setEngineerHeadcount',
    summary,
  };
  return {
    state: {
      ...state,
      engineVars: { ...state.engineVars, engineers: quote.target },
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    logEntry: entry,
    outcomeSummary: summary,
  };
}
