import type { GameState } from '@/types/gameState';
import type { EventPredicate } from '@/types/events';

/**
 * Predicate evaluation. Pure function from (state, predicate) → boolean.
 * Used both for conditional event firing and for branch gating
 * (archetype-flavored options).
 */

function checkRange(
  value: number,
  pred: { gte?: number; lte?: number },
): boolean {
  if (pred.gte !== undefined && value < pred.gte) return false;
  if (pred.lte !== undefined && value > pred.lte) return false;
  return true;
}

function avgReliability(state: GameState, agencyId: 'ttc' | 'go' | 'up'): number {
  const subs = state.agencies[agencyId].subsystems;
  if (subs.length === 0) return 0;
  return (
    subs.reduce((acc, s) => acc + (s.condition as unknown as number), 0) / subs.length
  );
}

export function evaluatePredicate(state: GameState, pred: EventPredicate): boolean {
  switch (pred.kind) {
    case 'ceoArchetype':
      return state.ceo.archetype === pred.archetype;
    case 'trust': {
      const v = state.politics[pred.gov].trust as unknown as number;
      return checkRange(v, pred);
    }
    case 'cash':
      return checkRange(state.cash.balance as unknown as number, pred);
    case 'board':
      return checkRange(state.boardConfidence.score as unknown as number, pred);
    case 'publicApproval':
      return checkRange(state.engineVars.publicApproval as unknown as number, pred);
    case 'engineers':
      return checkRange(state.engineVars.engineers, pred);
    case 'templates':
      return checkRange(state.engineVars.templates as unknown as number, pred);
    case 'nimbyOrganization':
      return checkRange(state.engineVars.nimbyOrganization as unknown as number, pred);
    case 'auditorScrutiny':
      return checkRange(state.engineVars.auditorScrutiny as unknown as number, pred);
    case 'consultantAlignment':
      return checkRange(state.engineVars.consultantAlignment as unknown as number, pred);
    case 'openBooks':
      return state.engineVars.openBooks === pred.equals;
    case 'reliability':
      return checkRange(avgReliability(state, pred.agency), pred);
    case 'riders':
      return checkRange(
        state.agencies[pred.agency].dailyRiders as unknown as number,
        pred,
      );
    case 'quarter':
      return checkRange(state.quarter as unknown as number, pred);
    case 'directorTolerance': {
      // True if ANY of the three directors' tolerance falls in the range.
      // Used by EV050 to fire when any director's tolerance hits 0.
      const directors = ['c_ttc_director', 'c_go_director', 'c_up_director'];
      for (const id of directors) {
        const c = state.characters[id];
        if (!c || c.role !== 'director_operating') continue;
        const tol = c.tolerance as unknown as number;
        if (checkRange(tol, pred)) return true;
      }
      return false;
    }
    case 'projectFundingShortfall': {
      // True if any under-construction project has < 4Q of funding remaining
      // at current burn rate. Triggers EV043 funding-shortfall crisis event.
      for (const p of state.projects) {
        if (p.state !== 'under_construction') continue;
        const buildLength = Math.max(
          1,
          (p.forecastOpenAt as unknown as number) - (p.brokeGroundAt as unknown as number),
        );
        const burnPerQ = (p.totalBudget as unknown as number) / buildLength;
        const remaining = p.remainingFunding as unknown as number;
        if (burnPerQ > 0 && remaining < burnPerQ * 4 && remaining < (p.totalBudget as unknown as number)) {
          return true;
        }
      }
      return false;
    }
    case 'and':
      return pred.predicates.every((p) => evaluatePredicate(state, p));
    case 'or':
      return pred.predicates.some((p) => evaluatePredicate(state, p));
    case 'not':
      return !evaluatePredicate(state, pred.predicate);
  }
}
