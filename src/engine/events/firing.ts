import type { GameState } from '@/types/gameState';
import type { ActionLogEntry } from '@/types/actionLog';
import type {
  ActiveEvent,
  DelayedConsequence,
  EventChoice,
  EventTemplate,
} from '@/types/events';
import { keyedFloat } from '@/engine/rng';
import { applyEffects } from './effects';
import { evaluatePredicate } from './predicates';
import { EVENT_TEMPLATES, eventTemplateById } from './templates';

/**
 * Event firing engine. Phase 3.1.
 *
 * Called from endTurn AFTER quarter has advanced and the quarter_summary
 * has been computed. It does three things:
 *
 *   1. Drain the delayed-consequences queue for anything due this quarter.
 *      Each drained entry either applies effects directly or queues a
 *      new event into the inbox.
 *
 *   2. For each template, check trigger eligibility (scheduled / conditional
 *      / random with keyed RNG) and cooldown (derived from action log
 *      `event_fired` entries). Eligible templates become ActiveEvents in
 *      the inbox.
 *
 *   3. Cap fires per quarter at MAX_FIRES_PER_QUARTER to keep decision
 *      density manageable (~1/Q steady pressure target).
 *
 * Returns the updated state with new inbox entries + drained queue +
 * appended action log entries for each fire/drain.
 */

const MAX_FIRES_PER_QUARTER = 2;

/** Quarters since the template last fired, or Infinity if never. */
function quartersSinceLastFire(
  state: GameState,
  templateId: string,
): number {
  const currentQ = state.quarter as unknown as number;
  let latest = -Infinity;
  for (const entry of state.actionLog) {
    if (entry.kind === 'event_fired' && entry.eventTemplateId === templateId) {
      const q = entry.quarter as unknown as number;
      if (q > latest) latest = q;
    }
  }
  return latest === -Infinity ? Infinity : currentQ - latest;
}

function withinCooldown(state: GameState, template: EventTemplate): boolean {
  const cooldown =
    template.trigger.kind === 'scheduled'
      ? 0
      : template.trigger.cooldownQuarters ?? 0;
  if (cooldown === 0) return false;
  return quartersSinceLastFire(state, template.id) < cooldown;
}

function templateEligible(state: GameState, template: EventTemplate): boolean {
  // Skip if already in inbox (don't double-fire)
  if (state.inbox.some((e) => e.templateId === template.id)) return false;
  if (withinCooldown(state, template)) return false;

  const t = template.trigger;
  switch (t.kind) {
    case 'scheduled':
      return t.quarters.includes(state.quarter as unknown as number);
    case 'conditional':
      return evaluatePredicate(state, t.predicate);
    case 'random': {
      if (t.predicate && !evaluatePredicate(state, t.predicate)) return false;
      // Keyed RNG: same masterSeed + same key = same roll, so adding new
      // templates does not shift existing ones (per Phase 1.3 design).
      const roll = keyedFloat(
        state.rng.masterSeed,
        `event:${template.id}:q${state.quarter as unknown as number}`,
      );
      return roll < t.baseWeight;
    }
  }
}

/**
 * Step 1: drain delayed consequences whose firesAt == current quarter.
 * Returns updated state + log entries for each drain.
 */
function drainDelayedQueue(state: GameState): {
  state: GameState;
  newLogEntries: ActionLogEntry[];
} {
  const currentQ = state.quarter as unknown as number;
  const drained: DelayedConsequence[] = [];
  const remaining: DelayedConsequence[] = [];
  for (const dc of state.delayedQueue) {
    if ((dc.firesAt as unknown as number) <= currentQ) drained.push(dc);
    else remaining.push(dc);
  }
  if (drained.length === 0) return { state, newLogEntries: [] };

  let s: GameState = { ...state, delayedQueue: remaining };
  const newLogEntries: ActionLogEntry[] = [];
  let nextLogId = s.nextLogId;

  for (const dc of drained) {
    if (dc.payload.kind === 'effects') {
      s = applyEffects(s, dc.payload.effects);
      const logId = `q${currentQ}-${nextLogId}`;
      newLogEntries.push({
        kind: 'player_action',
        id: logId,
        quarter: s.quarter,
        cause: { kind: 'system', system: 'macro' },
        action: 'delayedConsequence',
        summary: `Delayed: ${dc.cause}`,
      });
      nextLogId++;
    } else {
      // payload kind 'event' — push the queued template into the inbox
      const tmpl = eventTemplateById(dc.payload.templateId);
      if (tmpl) {
        const active: ActiveEvent = {
          templateId: tmpl.id,
          firedAt: s.quarter,
          urgency: tmpl.urgency,
        };
        const logId = `q${currentQ}-${nextLogId}`;
        s = { ...s, inbox: [...s.inbox, active] };
        newLogEntries.push({
          kind: 'event_fired',
          id: logId,
          quarter: s.quarter,
          cause: { kind: 'system', system: 'macro' },
          eventTemplateId: tmpl.id,
          summary: `${tmpl.outlet ? `${tmpl.outlet}: ` : ''}${tmpl.headline}`,
        });
        nextLogId++;
      }
    }
  }

  s = { ...s, nextLogId };
  return { state: s, newLogEntries };
}

/**
 * Step 2-3: select eligible templates and fire up to MAX_FIRES_PER_QUARTER.
 * Scheduled + conditional fire first (they're mandatory); random rolls
 * compete for any remaining slots, sorted by weight descending.
 */
function selectAndFire(state: GameState): {
  state: GameState;
  newLogEntries: ActionLogEntry[];
} {
  const eligible: EventTemplate[] = [];
  for (const t of EVENT_TEMPLATES) {
    if (templateEligible(state, t)) eligible.push(t);
  }

  // Sort: mandatory (scheduled/conditional) first, then random by weight desc
  eligible.sort((a, b) => {
    const aMandatory = a.trigger.kind !== 'random';
    const bMandatory = b.trigger.kind !== 'random';
    if (aMandatory !== bMandatory) return aMandatory ? -1 : 1;
    return b.urgency - a.urgency;
  });

  const toFire = eligible.slice(0, MAX_FIRES_PER_QUARTER);
  const currentQ = state.quarter as unknown as number;
  let s = state;
  const newLogEntries: ActionLogEntry[] = [];
  let nextLogId = s.nextLogId;

  for (const tmpl of toFire) {
    const active: ActiveEvent = {
      templateId: tmpl.id,
      firedAt: s.quarter,
      urgency: tmpl.urgency,
    };
    const logId = `q${currentQ}-${nextLogId}`;
    s = { ...s, inbox: [...s.inbox, active] };
    newLogEntries.push({
      kind: 'event_fired',
      id: logId,
      quarter: s.quarter,
      cause: { kind: 'system', system: 'endTurn' },
      eventTemplateId: tmpl.id,
      summary: `${tmpl.outlet ? `${tmpl.outlet}: ` : ''}${tmpl.headline}`,
    });
    nextLogId++;
  }

  s = { ...s, nextLogId };
  return { state: s, newLogEntries };
}

/** Main entry: process queue, then fire new events. */
export function processEventsForQuarter(state: GameState): {
  state: GameState;
  newLogEntries: ActionLogEntry[];
} {
  const a = drainDelayedQueue(state);
  const b = selectAndFire(a.state);
  return {
    state: b.state,
    newLogEntries: [...a.newLogEntries, ...b.newLogEntries],
  };
}

/**
 * Resolve a player's choice on an inbox event. Removes the event from
 * inbox, applies branch effects, returns updated state + a player_decision
 * log entry.
 */
export function resolveEventChoice(
  state: GameState,
  templateId: string,
  choiceId: string,
): { state: GameState; logEntry: ActionLogEntry | null } {
  const template = eventTemplateById(templateId);
  if (!template) return { state, logEntry: null };
  const choice = template.choices.find((c) => c.id === choiceId);
  if (!choice) return { state, logEntry: null };
  // Verify the choice is actually available given current state
  if (choice.requires && !evaluatePredicate(state, choice.requires)) {
    return { state, logEntry: null };
  }

  // Remove from inbox first
  const newInbox = state.inbox.filter((e) => e.templateId !== templateId);
  let s: GameState = { ...state, inbox: newInbox };

  // Apply effects
  s = applyEffects(s, choice.effects);

  // Log the decision
  const logId = `q${s.quarter as unknown as number}-${s.nextLogId}`;
  const logEntry: ActionLogEntry = {
    kind: 'player_decision',
    id: logId,
    quarter: s.quarter,
    cause: { kind: 'event', eventTemplateId: templateId, eventActiveId: logId },
    eventTemplateId: templateId,
    choiceId: choice.id,
    summary: `${template.headline} → ${choice.label}`,
  };
  s = {
    ...s,
    actionLog: [...s.actionLog, logEntry],
    nextLogId: s.nextLogId + 1,
  };
  return { state: s, logEntry };
}

/** Choices visible to the player given current state (filters `requires`). */
export function visibleChoices(
  state: GameState,
  template: EventTemplate,
): EventChoice[] {
  return template.choices.filter(
    (c) => !c.requires || evaluatePredicate(state, c.requires),
  );
}

// Re-exports for convenience
export { applyEffects, evaluatePredicate };
