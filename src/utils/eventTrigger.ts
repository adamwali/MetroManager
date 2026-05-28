import type { GameState } from '@/types/gameState';
import type { EventPredicate, EventTemplate } from '@/types/events';
import { reliabilityScore } from '@engine/agencies';

/**
 * Human-readable "why is this happening" hint for conditional events.
 * Phase 10.9 — many crisis events are gated on a controllable lever
 * (reliability, NIMBY, scrutiny, ...) but the causal link was invisible,
 * so the player felt buffeted by randomness rather than seeing that their
 * own neglect triggered it. Surfacing the trigger teaches the lever:
 * "this keeps happening because TTC reliability is 58 — fund maintenance."
 *
 * Returns null when the event isn't gated on a legible, controllable lever.
 */
export function describeEventTrigger(
  template: EventTemplate,
  state: GameState,
): string | null {
  if (template.trigger.kind !== 'conditional' && template.trigger.kind !== 'random') {
    return null;
  }
  const pred = 'predicate' in template.trigger ? template.trigger.predicate : undefined;
  if (!pred) return null;
  return describePredicate(pred, state);
}

function describePredicate(pred: EventPredicate, state: GameState): string | null {
  switch (pred.kind) {
    case 'reliability': {
      const now = reliabilityScore(state.agencies[pred.agency]);
      const agency = pred.agency.toUpperCase();
      if (pred.lte !== undefined) {
        return `Recurring while ${agency} reliability ≤ ${pred.lte} (now ${now.toFixed(0)}). Fund maintenance to stop it.`;
      }
      return null;
    }
    case 'nimbyOrganization': {
      const now = state.engineVars.nimbyOrganization as unknown as number;
      if (pred.gte !== undefined) {
        return `Triggered by organized opposition (NIMBY ${now.toFixed(0)} ≥ ${pred.gte}). Run community consultation to lower it.`;
      }
      return null;
    }
    case 'auditorScrutiny': {
      const now = state.engineVars.auditorScrutiny as unknown as number;
      if (pred.gte !== undefined) {
        return `Triggered by auditor scrutiny (${now.toFixed(0)} ≥ ${pred.gte}). Commission a voluntary audit to lower it.`;
      }
      return null;
    }
    case 'consultantAlignment': {
      const now = state.engineVars.consultantAlignment as unknown as number;
      if (pred.lte !== undefined) {
        return `Triggered by hostile consultants (alignment ${now.toFixed(0)} ≤ ${pred.lte}). Re-engage them to recover.`;
      }
      return null;
    }
    case 'crosslinxLeverage': {
      const now = state.engineVars.crosslinxLeverage as unknown as number;
      if (pred.gte !== undefined) {
        return `Triggered by consortium leverage (${now.toFixed(0)} ≥ ${pred.gte}). Negotiate it down via events.`;
      }
      return null;
    }
    case 'trust': {
      const now = state.politics[pred.gov].trust as unknown as number;
      const govLabel =
        pred.gov === 'ottawa' ? 'Ottawa' : pred.gov === 'queensPark' ? "Queen's Park" : 'City Hall';
      if (pred.lte !== undefined) {
        return `Triggered by low ${govLabel} trust (${now.toFixed(0)} ≤ ${pred.lte}). Lobby to rebuild it.`;
      }
      return null;
    }
    case 'board': {
      const now = state.boardConfidence.score as unknown as number;
      if (pred.lte !== undefined) {
        return `Triggered by low board confidence (${now.toFixed(0)} ≤ ${pred.lte}). Deliver wins to recover.`;
      }
      return null;
    }
    case 'and':
      // Surface the first legible sub-predicate.
      for (const sub of pred.predicates) {
        const d = describePredicate(sub, state);
        if (d) return d;
      }
      return null;
    default:
      return null;
  }
}
