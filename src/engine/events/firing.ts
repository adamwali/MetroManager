import type { GameState } from '@/types/gameState';
import type { ActionLogEntry } from '@/types/actionLog';
import type {
  ActiveEvent,
  DelayedConsequence,
  EventChoice,
  EventTemplate,
} from '@/types/events';
import { keyedFloat } from '@/engine/rng';
import { score } from '@/types/scalars';
import { applyEffects } from './effects';
import { evaluatePredicate } from './predicates';
import { EVENT_TEMPLATES, eventTemplateById } from './templates';

/**
 * Map election event ids to the government whose election just concluded.
 * Phase 3.2 polish: previously elections fired as pure informationals with
 * no mechanical consequence (empty calorie). Now they shift trust by a
 * deterministic random delta (-12 to +8) and have a 35% chance to flip
 * the party in power. Phase 6.1 will deepen this with campaign events.
 */
const ELECTION_TEMPLATE_TO_GOV: Record<
  string,
  'ottawa' | 'queensPark' | 'cityHall'
> = {
  EV032_federalElection: 'ottawa',
  EV033_provincialElection: 'queensPark',
  EV034_cityElection: 'cityHall',
};

function applyElectionOutcome(state: GameState, templateId: string): GameState {
  const gov = ELECTION_TEMPLATE_TO_GOV[templateId];
  if (!gov) return state;
  const q = state.quarter as unknown as number;
  // Trust shift: roll in [0,1) → delta in [-12, +8], slight negative bias
  // because elections often shake trust regardless of outcome.
  const trustRoll = keyedFloat(state.rng.masterSeed, `election:${gov}:trust:q${q}`);
  const trustDelta = Math.round(trustRoll * 20 - 12);
  const currentTrust = state.politics[gov].trust as unknown as number;
  let newTrust = Math.max(0, Math.min(100, currentTrust + trustDelta));

  // Party flip: 35% chance. Lower-trust incumbents flip more often.
  const flipRoll = keyedFloat(state.rng.masterSeed, `election:${gov}:flip:q${q}`);
  const flipProbability = currentTrust < 35 ? 0.55 : currentTrust < 50 ? 0.4 : 0.25;
  const partyChanged = flipRoll < flipProbability;
  const PARTY_ORDER: ('liberal' | 'conservative' | 'other')[] = [
    'liberal',
    'conservative',
    'other',
  ];
  const currentParty = state.politics[gov].partyInPower;
  let newParty = currentParty;
  let nextCharacters = state.characters;
  if (partyChanged) {
    const alternates = PARTY_ORDER.filter((p) => p !== currentParty);
    const partyPickRoll = keyedFloat(state.rng.masterSeed, `election:${gov}:party:q${q}`);
    newParty = alternates[Math.floor(partyPickRoll * alternates.length)]!;

    // Phase 10.7 audit fix: cabinet reshuffle on party flip. New ministers
    // = relationships reset. Previously party could flip with no downstream
    // effect on character relationships (which were already orphan-but-now-
    // -consumed by callInFavor / adHocFunding).
    nextCharacters = { ...state.characters };
    for (const charId of state.politics[gov].cabinetCharacterIds) {
      const char = nextCharacters[charId];
      if (!char) continue;
      nextCharacters[charId] = {
        ...char,
        relationship: 0 as unknown as typeof char.relationship,
      };
    }
    // Trust also takes an extra -8 hit on a flip: new minister needs briefing.
    newTrust = Math.max(0, newTrust - 8);
  }

  return {
    ...state,
    characters: nextCharacters,
    politics: {
      ...state.politics,
      [gov]: {
        ...state.politics[gov],
        trust: score(newTrust),
        partyInPower: newParty,
        // Re-arm the election clock: 8 quarters out
        nextElectionAt: ((q + 8) as unknown) as typeof state.politics[typeof gov]['nextElectionAt'],
      },
    },
  };
}

/**
 * Event firing engine. Phase 3.1 + 3.2.
 *
 * Pipeline each quarter:
 *   1. Drain the delayed-consequences queue for anything due this quarter.
 *      Each drained entry either applies effects directly or queues a new
 *      event into the inbox / news rail (depending on displayKind).
 *   2. Emit telegraphs for events that will fire `quartersBefore` from now
 *      (scheduled events: known target; random events: when their roll
 *      passes, schedule the actual fire via delayedQueue and emit the
 *      telegraph now).
 *   3. For each template, check trigger eligibility (scheduled / conditional
 *      / random with keyed RNG) and cooldown. Eligible templates either:
 *      - fire immediately into inbox (decision events, no telegraph), OR
 *      - emit a telegraph + schedule actual fire (events with telegraph),
 *      - append to actionLog only (informational events, no inbox entry)
 *   4. Cap *inbox fires* per quarter at MAX_FIRES_PER_QUARTER. Telegraphs
 *      and informational entries are not capped (they don't demand action).
 *
 * Returns the updated state + appended action log entries.
 */

const MAX_FIRES_PER_QUARTER = 2;

/** Quarters since the template last fired into the inbox, or Infinity if never. */
function quartersSinceLastFire(state: GameState, templateId: string): number {
  const currentQ = state.quarter as unknown as number;
  let latest = -Infinity;
  for (const entry of state.actionLog) {
    if (
      (entry.kind === 'event_fired' || entry.kind === 'event_informational') &&
      ('eventTemplateId' in entry ? entry.eventTemplateId : '') === templateId
    ) {
      const q = entry.quarter as unknown as number;
      if (q > latest) latest = q;
    }
  }
  return latest === -Infinity ? Infinity : currentQ - latest;
}

/** Has a telegraph for this template + expected fire quarter already been emitted? */
function telegraphAlreadyEmitted(
  state: GameState,
  templateId: string,
  expectedFireQuarter: number,
): boolean {
  for (const entry of state.actionLog) {
    if (
      entry.kind === 'event_telegraph' &&
      entry.sourceEventTemplateId === templateId &&
      (entry.expectedFireQuarter as unknown as number) === expectedFireQuarter
    ) {
      return true;
    }
  }
  return false;
}

function withinCooldown(state: GameState, template: EventTemplate): boolean {
  const cooldown =
    template.trigger.kind === 'scheduled'
      ? 0
      : template.trigger.cooldownQuarters ?? 0;
  if (cooldown === 0) return false;
  return quartersSinceLastFire(state, template.id) < cooldown;
}

function timesFiredThisCampaign(state: GameState, templateId: string): number {
  // Phase 11: count how many times a template has fired this campaign so we
  // can cap repetition.
  let n = 0;
  for (const e of state.actionLog) {
    if (
      (e.kind === 'player_decision' && e.eventTemplateId === templateId) ||
      (e.kind === 'event_informational' && e.eventTemplateId === templateId)
    ) {
      n++;
    }
  }
  return n;
}

function templateEligible(state: GameState, template: EventTemplate): boolean {
  // Skip if already in inbox
  if (state.inbox.some((e) => e.templateId === template.id)) return false;
  // Skip if a delayed fire is already queued for this template
  if (
    state.delayedQueue.some(
      (dc) => dc.payload.kind === 'event' && dc.payload.templateId === template.id,
    )
  ) {
    return false;
  }
  if (withinCooldown(state, template)) return false;
  // Phase 11: per-campaign cap
  if (
    template.maxFiresPerCampaign !== undefined &&
    timesFiredThisCampaign(state, template.id) >= template.maxFiresPerCampaign
  ) {
    return false;
  }

  const t = template.trigger;
  switch (t.kind) {
    case 'scheduled':
      return t.quarters.includes(state.quarter as unknown as number);
    case 'conditional':
      return evaluatePredicate(state, t.predicate);
    case 'random': {
      if (t.predicate && !evaluatePredicate(state, t.predicate)) return false;
      const roll = keyedFloat(
        state.rng.masterSeed,
        `event:${template.id}:q${state.quarter as unknown as number}`,
      );
      return roll < t.baseWeight;
    }
  }
}

/** Step 1: drain delayed consequences whose firesAt == current quarter. */
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
      const tmpl = eventTemplateById(dc.payload.templateId);
      if (tmpl) {
        const result = fireOrInform(s, tmpl, nextLogId, 'macro');
        s = result.state;
        newLogEntries.push(...result.entries);
        nextLogId = result.nextLogId;
      }
    }
  }

  s = { ...s, nextLogId };
  return { state: s, newLogEntries };
}

/**
 * Either push the template into the inbox (decision) OR emit an
 * informational news-rail entry (informational). Returns updated state
 * + log entries.
 */
function fireOrInform(
  state: GameState,
  template: EventTemplate,
  startLogId: number,
  system: 'endTurn' | 'macro',
): { state: GameState; entries: ActionLogEntry[]; nextLogId: number } {
  const currentQ = state.quarter as unknown as number;
  const isInformational = template.displayKind === 'informational';
  const logId = `q${currentQ}-${startLogId}`;
  const outletPrefix = template.outlet ? `${template.outlet}: ` : '';

  if (isInformational) {
    // Apply election outcome side-effects (Phase 3.2 polish — elections
    // now actually shift trust + may flip party in power)
    const afterOutcome = applyElectionOutcome(state, template.id);
    return {
      state: afterOutcome,
      entries: [
        {
          kind: 'event_informational',
          id: logId,
          quarter: afterOutcome.quarter,
          cause: { kind: 'system', system },
          eventTemplateId: template.id,
          ...(template.outlet ? { outlet: template.outlet } : {}),
          headline: template.headline,
          body: template.body,
          summary: `${outletPrefix}${template.headline}`,
        },
      ],
      nextLogId: startLogId + 1,
    };
  }

  // decision event — inbox
  const active: ActiveEvent = {
    templateId: template.id,
    firedAt: state.quarter,
    urgency: template.urgency,
  };
  return {
    state: { ...state, inbox: [...state.inbox, active] },
    entries: [
      {
        kind: 'event_fired',
        id: logId,
        quarter: state.quarter,
        cause: { kind: 'system', system },
        eventTemplateId: template.id,
        summary: `${outletPrefix}${template.headline}`,
      },
    ],
    nextLogId: startLogId + 1,
  };
}

/** Step 2: emit telegraphs for scheduled events whose target lies `quartersBefore` out. */
function emitScheduledTelegraphs(state: GameState): {
  state: GameState;
  newLogEntries: ActionLogEntry[];
} {
  const currentQ = state.quarter as unknown as number;
  let s = state;
  const newLogEntries: ActionLogEntry[] = [];
  let nextLogId = s.nextLogId;

  for (const template of EVENT_TEMPLATES) {
    if (!template.telegraph) continue;
    if (template.trigger.kind !== 'scheduled') continue;
    const lead = template.telegraph.quartersBefore;
    const targetQ = currentQ + lead;
    if (!template.trigger.quarters.includes(targetQ)) continue;
    if (telegraphAlreadyEmitted(s, template.id, targetQ)) continue;
    const logId = `q${currentQ}-${nextLogId}`;
    const outlet = template.telegraph.outlet ?? template.outlet;
    newLogEntries.push({
      kind: 'event_telegraph',
      id: logId,
      quarter: s.quarter,
      cause: { kind: 'system', system: 'endTurn' },
      sourceEventTemplateId: template.id,
      expectedFireQuarter: (targetQ as unknown) as typeof s.quarter,
      ...(outlet ? { outlet } : {}),
      headline: template.telegraph.headline,
      body: template.telegraph.body,
      summary: `${outlet ? `${outlet}: ` : ''}${template.telegraph.headline}`,
    });
    nextLogId++;
  }

  s = { ...s, nextLogId };
  return { state: s, newLogEntries };
}

/** Step 3: select eligible templates and fire (or telegraph) up to the cap. */
function selectAndFire(state: GameState): {
  state: GameState;
  newLogEntries: ActionLogEntry[];
} {
  const eligible: EventTemplate[] = [];
  for (const t of EVENT_TEMPLATES) {
    if (templateEligible(state, t)) eligible.push(t);
  }

  eligible.sort((a, b) => {
    const aMandatory = a.trigger.kind !== 'random';
    const bMandatory = b.trigger.kind !== 'random';
    if (aMandatory !== bMandatory) return aMandatory ? -1 : 1;
    return b.urgency - a.urgency;
  });

  const currentQ = state.quarter as unknown as number;
  let s = state;
  const newLogEntries: ActionLogEntry[] = [];
  let nextLogId = s.nextLogId;
  let firesThisQuarter = 0;

  for (const tmpl of eligible) {
    const isInformational = tmpl.displayKind === 'informational';
    // Random events with a telegraph: emit telegraph now, schedule actual fire later
    if (tmpl.trigger.kind === 'random' && tmpl.telegraph) {
      const lead = tmpl.telegraph.quartersBefore;
      const targetQ = currentQ + lead;
      if (!telegraphAlreadyEmitted(s, tmpl.id, targetQ)) {
        const logId = `q${currentQ}-${nextLogId}`;
        const outlet = tmpl.telegraph.outlet ?? tmpl.outlet;
        newLogEntries.push({
          kind: 'event_telegraph',
          id: logId,
          quarter: s.quarter,
          cause: { kind: 'system', system: 'endTurn' },
          sourceEventTemplateId: tmpl.id,
          expectedFireQuarter: (targetQ as unknown) as typeof s.quarter,
          ...(outlet ? { outlet } : {}),
          headline: tmpl.telegraph.headline,
          body: tmpl.telegraph.body,
          summary: `${outlet ? `${outlet}: ` : ''}${tmpl.telegraph.headline}`,
        });
        nextLogId++;
        // Schedule actual event fire via delayedQueue
        const dc: DelayedConsequence = {
          firesAt: (targetQ as unknown) as typeof s.quarter,
          cause: `Telegraphed at Q${currentQ}`,
          payload: { kind: 'event', templateId: tmpl.id },
        };
        s = { ...s, delayedQueue: [...s.delayedQueue, dc] };
      }
      continue;
    }
    // Otherwise: fire (or inform) immediately. Count toward cap if it's a decision event.
    if (!isInformational && firesThisQuarter >= MAX_FIRES_PER_QUARTER) continue;
    const result = fireOrInform(s, tmpl, nextLogId, 'endTurn');
    s = result.state;
    newLogEntries.push(...result.entries);
    nextLogId = result.nextLogId;
    if (!isInformational) firesThisQuarter++;
  }

  s = { ...s, nextLogId };
  return { state: s, newLogEntries };
}

/** Main entry: drain queue, emit scheduled telegraphs, then fire new events. */
export function processEventsForQuarter(state: GameState): {
  state: GameState;
  newLogEntries: ActionLogEntry[];
} {
  const a = drainDelayedQueue(state);
  const b = emitScheduledTelegraphs(a.state);
  const c = selectAndFire(b.state);
  return {
    state: c.state,
    newLogEntries: [...a.newLogEntries, ...b.newLogEntries, ...c.newLogEntries],
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
  if (choice.requires && !evaluatePredicate(state, choice.requires)) {
    return { state, logEntry: null };
  }

  const newInbox = state.inbox.filter((e) => e.templateId !== templateId);
  let s: GameState = { ...state, inbox: newInbox };

  s = applyEffects(s, choice.effects);

  // Phase 10.12: if the event has an actorCharacterId, append an
  // interaction record so the character remembers the choice. Drives
  // {actorMemory} callback in future event copy + the mood derivation.
  if (template.actorCharacterId) {
    const actor = s.characters[template.actorCharacterId];
    if (actor) {
      // Derive a small relationship delta from cash + trust effects on the
      // actor's home government. Negative cash on the actor's gov = bad;
      // positive trust = good. Heuristic, not strict.
      let valenceDelta = 0;
      for (const e of choice.effects) {
        if (e.kind === 'governmentTrust' && actor.role.startsWith('politician_')) {
          valenceDelta += e.delta * 0.3;
        }
        if (e.kind === 'cash' && e.deltaM > 0 && actor.role.startsWith('politician_')) {
          valenceDelta += 1; // accepting their cash offer = warmer
        }
      }
      const newRel = Math.max(
        0,
        Math.min(100, (actor.relationship as unknown as number) + valenceDelta),
      );
      s = {
        ...s,
        characters: {
          ...s.characters,
          [template.actorCharacterId]: {
            ...actor,
            relationship: newRel as unknown as typeof actor.relationship,
            interactions: [
              ...actor.interactions,
              {
                quarter: s.quarter,
                kind: 'event_choice',
                eventId: template.id,
                choiceLabel: choice.label,
                delta: valenceDelta,
              },
            ],
          },
        },
      };
    }
  }

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

export { applyEffects, evaluatePredicate };
