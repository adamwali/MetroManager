import type { GameState } from '@/types/gameState';
import type { Agencies, AgencyId } from '@/types/agency';
import type { DelayedConsequence, EventEffect } from '@/types/events';
import type { ActiveObligation } from '@/types/obligations';
import { cash, quarter, riders, score } from '@/types/scalars';
import { applyRenegotiation } from '../renegotiation';

/**
 * Effect application. Pure function from (state, effects[]) → new state.
 * Each effect type maps to a specific state mutation.
 */

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function adjustAgencyAt(
  agencies: Agencies,
  agencyId: AgencyId,
  fn: (a: Agencies[AgencyId]) => Agencies[AgencyId],
): Agencies {
  return { ...agencies, [agencyId]: fn(agencies[agencyId]) };
}

export function applyEffects(state: GameState, effects: EventEffect[]): GameState {
  let s = state;
  for (const e of effects) {
    s = applyOne(s, e);
  }
  return s;
}

function applyOne(state: GameState, e: EventEffect): GameState {
  switch (e.kind) {
    case 'cash': {
      const balance = (state.cash.balance as unknown as number) + e.deltaM;
      return { ...state, cash: { ...state.cash, balance: cash(balance) } };
    }
    case 'governmentTrust': {
      const gov = state.politics[e.gov];
      const trust = clampScore((gov.trust as unknown as number) + e.delta);
      return {
        ...state,
        politics: { ...state.politics, [e.gov]: { ...gov, trust: score(trust) } },
      };
    }
    case 'boardConfidence': {
      const next = clampScore(
        (state.boardConfidence.score as unknown as number) + e.delta,
      );
      return {
        ...state,
        boardConfidence: { ...state.boardConfidence, score: score(next) },
      };
    }
    case 'publicApproval': {
      const next = clampScore(
        (state.engineVars.publicApproval as unknown as number) + e.delta,
      );
      return { ...state, engineVars: { ...state.engineVars, publicApproval: score(next) } };
    }
    case 'engineers': {
      // Phase 6.3.1: hiring freeze control blocks engineer increases.
      // Decreases still apply (freeze doesn't shield from layoffs).
      const freezeApplies =
        e.delta > 0 &&
        state.operatingAllowance.controls.some(
          (c) => c.kind === 'hiringFreezeRoles' && c.roles.includes('engineers'),
        );
      if (freezeApplies) return state;
      return {
        ...state,
        engineVars: {
          ...state.engineVars,
          engineers: Math.max(0, state.engineVars.engineers + e.delta),
        },
      };
    }
    case 'templates': {
      const next = clampScore(
        (state.engineVars.templates as unknown as number) + e.delta,
      );
      return { ...state, engineVars: { ...state.engineVars, templates: score(next) } };
    }
    case 'nimbyOrganization': {
      const next = clampScore(
        (state.engineVars.nimbyOrganization as unknown as number) + e.delta,
      );
      return { ...state, engineVars: { ...state.engineVars, nimbyOrganization: score(next) } };
    }
    case 'crosslinxLeverage': {
      const next = clampScore(
        (state.engineVars.crosslinxLeverage as unknown as number) + e.delta,
      );
      return { ...state, engineVars: { ...state.engineVars, crosslinxLeverage: score(next) } };
    }
    case 'consultantAlignment': {
      // SignedScore: -100 to +100
      const cur = state.engineVars.consultantAlignment as unknown as number;
      const next = Math.max(-100, Math.min(100, cur + e.delta));
      return {
        ...state,
        engineVars: { ...state.engineVars, consultantAlignment: next as unknown as typeof state.engineVars.consultantAlignment },
      };
    }
    case 'auditorScrutiny': {
      const next = clampScore(
        (state.engineVars.auditorScrutiny as unknown as number) + e.delta,
      );
      return { ...state, engineVars: { ...state.engineVars, auditorScrutiny: score(next) } };
    }
    case 'reEngageConsultants': {
      return { ...state, engineVars: { ...state.engineVars, consultantsEngaged: true } };
    }
    case 'opex':
      return {
        ...state,
        agencies: adjustAgencyAt(state.agencies, e.agency, (a) => ({
          ...a,
          lastQuarterOpex: cash(
            Math.max(0, (a.lastQuarterOpex as unknown as number) + e.deltaM),
          ),
        })),
      };
    case 'fareRevenue':
      return {
        ...state,
        agencies: adjustAgencyAt(state.agencies, e.agency, (a) => ({
          ...a,
          lastQuarterFareRevenue: cash(
            Math.max(0, (a.lastQuarterFareRevenue as unknown as number) + e.deltaM),
          ),
        })),
      };
    case 'reliability':
      return {
        ...state,
        agencies: adjustAgencyAt(state.agencies, e.agency, (a) => ({
          ...a,
          subsystems: a.subsystems.map((s) => ({
            ...s,
            condition: score(clampScore((s.condition as unknown as number) + e.delta)),
          })),
        })),
      };
    case 'ridership':
      return {
        ...state,
        agencies: adjustAgencyAt(state.agencies, e.agency, (a) => ({
          ...a,
          dailyRiders: riders(
            Math.max(0, (a.dailyRiders as unknown as number) + e.delta),
          ),
        })),
      };
    case 'queueDelayedEffect': {
      const dc: DelayedConsequence = {
        firesAt: quarter((state.quarter as unknown as number) + e.quartersOut),
        cause: e.cause,
        payload: { kind: 'effects', effects: e.effects },
      };
      return { ...state, delayedQueue: [...state.delayedQueue, dc] };
    }
    case 'queueDelayedEvent': {
      const dc: DelayedConsequence = {
        firesAt: quarter((state.quarter as unknown as number) + e.quartersOut),
        cause: e.cause,
        payload: { kind: 'event', templateId: e.eventId },
      };
      return { ...state, delayedQueue: [...state.delayedQueue, dc] };
    }
    case 'addObligation': {
      const obligation: ActiveObligation = {
        id: e.obligationId,
        sourceEventTemplateId: '', // filled in by event flow if needed
        expiresAt: quarter((state.quarter as unknown as number) + e.durationQuarters),
        kind: e.obligationKind,
        agencyId: e.agencyId,
        costOfBreaking: e.costOfBreaking,
        breakingDescription: e.breakingDescription,
      };
      return { ...state, activeObligations: [...state.activeObligations, obligation] };
    }
    case 'renegotiateAllowance': {
      return applyRenegotiation(state, e.strategy);
    }
  }
}
