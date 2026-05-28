import type { GameState } from '@/types/gameState';
import type { CeoArchetype } from '@/types/ceo';
import type { EventChoice, EventTemplate } from '@/types/events';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { resolveEventChoice, visibleChoices } from '@engine/events/firing';
import { eventTemplateById } from '@engine/events/templates';
import { evaluatePredicate } from '@engine/events/predicates';
import {
  commissionVoluntaryAudit,
  engageConsultants,
  issueOperatingBond,
  runCommunityConsultation,
  terminateConsultants,
} from '@engine/treasuryActions';
import { adHocFunding } from '@engine/politicalActions';

/**
 * Playtest harness. Phase 10.5.
 *
 * Drives the pure engine through N quarters with an "agent" picking
 * choices on its behalf. Used to find balance/mechanical issues across
 * many seeds without manual play.
 *
 * Pure: no I/O, no DOM. CLI entrypoint serializes results to JSON.
 */

export type Strategy = 'conservative' | 'aggressive' | 'random' | 'reactive';

export interface PlaytestOptions {
  seed: number;
  archetype: CeoArchetype;
  strategy: Strategy;
  maxQuarters: number;
}

export interface PlaytestRun {
  opts: PlaytestOptions;
  outcome: 'won' | 'fiscalFailure' | 'boardFired' | 'inProgress';
  quartersPlayed: number;
  finalCash: number;
  finalApproval: number;
  finalBoard: number;
  finalRiders: number;
  // Event coverage
  eventsFired: Record<string, number>;
  choicesPicked: Record<string, Record<string, number>>;
  // Cash trajectory: quarter → cash
  cashTrajectory: number[];
  approvalTrajectory: number[];
  // Last few summaries to debug what happened
  lastSummaries: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// Strategies

function pickChoiceConservative(state: GameState, template: EventTemplate): EventChoice | null {
  // Status-quo bias: prefer "ignore / no action" / first choice that doesn't
  // spend cash. Falls back to first available.
  const choices = visibleChoices(state, template);
  if (choices.length === 0) return null;
  const cheapest = [...choices].sort((a, b) => costOf(a) - costOf(b));
  return cheapest[0] ?? null;
}

function pickChoiceAggressive(state: GameState, template: EventTemplate): EventChoice | null {
  // Pick choice with most board confidence + approval gain potential.
  const choices = visibleChoices(state, template);
  if (choices.length === 0) return null;
  const scored = choices.map((c) => ({
    c,
    score: c.effects.reduce((acc, e) => {
      if (e.kind === 'boardConfidence') return acc + e.delta * 2;
      if (e.kind === 'publicApproval') return acc + e.delta * 1.5;
      if (e.kind === 'cash') return acc + e.deltaM * 0.001; // de-weight cash
      return acc;
    }, 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
}

function pickChoiceRandom(state: GameState, template: EventTemplate, rng: () => number): EventChoice | null {
  const choices = visibleChoices(state, template);
  if (choices.length === 0) return null;
  return choices[Math.floor(rng() * choices.length)] ?? null;
}

function pickChoiceReactive(state: GameState, template: EventTemplate): EventChoice | null {
  // Like conservative when cash is low, aggressive when high.
  const cashOk = (state.cash.balance as unknown as number) > 800;
  return cashOk ? pickChoiceAggressive(state, template) : pickChoiceConservative(state, template);
}

function costOf(choice: EventChoice): number {
  return choice.effects.reduce(
    (acc, e) => (e.kind === 'cash' && e.deltaM < 0 ? acc + Math.abs(e.deltaM) : acc),
    0,
  );
}

function pickChoice(strategy: Strategy, state: GameState, template: EventTemplate, rng: () => number): EventChoice | null {
  switch (strategy) {
    case 'conservative':
      return pickChoiceConservative(state, template);
    case 'aggressive':
      return pickChoiceAggressive(state, template);
    case 'random':
      return pickChoiceRandom(state, template, rng);
    case 'reactive':
      return pickChoiceReactive(state, template);
  }
}

// Simple deterministic RNG for "random" strategy (separate from engine RNG)
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Periodic player actions (between quarters)

function maybeIssueBondIfLow(state: GameState): GameState {
  const cash = state.cash.balance as unknown as number;
  if (cash < 200) {
    const r = issueOperatingBond(state, 'pension', 500);
    return r.state;
  }
  return state;
}

function maybeAskForFunding(state: GameState): GameState {
  const cash = state.cash.balance as unknown as number;
  if (cash > 500) return state;
  // Ad-hoc funding from gov with highest trust
  const govs = ['ottawa', 'queensPark', 'cityHall'] as const;
  const best = [...govs].sort(
    (a, b) =>
      (state.politics[b].trust as unknown as number) -
      (state.politics[a].trust as unknown as number),
  )[0]!;
  const r = adHocFunding(state, best);
  return r.state;
}

function maybeCommissionAudit(state: GameState): GameState {
  const scrutiny = state.engineVars.auditorScrutiny as unknown as number;
  if (scrutiny < 35) return state;
  const r = commissionVoluntaryAudit(state);
  return r.state;
}

function maybeRunConsultation(state: GameState): GameState {
  const nimby = state.engineVars.nimbyOrganization as unknown as number;
  if (nimby < 40) return state;
  const r = runCommunityConsultation(state);
  return r.state;
}

function maybeManageConsultants(state: GameState, strategy: Strategy): GameState {
  const cash = state.cash.balance as unknown as number;
  const engaged = state.engineVars.consultantsEngaged;
  if (strategy === 'aggressive' && !engaged && cash > 1500) {
    return engageConsultants(state).state;
  }
  if (strategy === 'conservative' && engaged && cash < 600) {
    return terminateConsultants(state).state;
  }
  return state;
}

// ─────────────────────────────────────────────────────────────────────────
// Main run loop

export function runPlaytest(opts: PlaytestOptions): PlaytestRun {
  let state = createInitialGameState(opts.seed, opts.archetype, 'AGENT');
  const rng = makeRng(opts.seed);
  const eventsFired: Record<string, number> = {};
  const choicesPicked: Record<string, Record<string, number>> = {};
  const cashTrajectory: number[] = [state.cash.balance as unknown as number];
  const approvalTrajectory: number[] = [state.engineVars.publicApproval as unknown as number];
  const lastSummaries: string[] = [];

  for (let q = 0; q < opts.maxQuarters; q++) {
    if (state.gameOver) break;

    // 1. Resolve all events in the inbox
    for (const inboxItem of [...state.inbox]) {
      const template = eventTemplateById(inboxItem.templateId);
      if (!template) continue;
      // Skip events with `requires` predicate that no longer holds
      if (template.choices.length === 0) continue;
      eventsFired[template.id] = (eventsFired[template.id] ?? 0) + 1;
      const choice = pickChoice(opts.strategy, state, template, rng);
      if (!choice) continue;
      // Re-check requires gate
      if (choice.requires && !evaluatePredicate(state, choice.requires)) continue;
      choicesPicked[template.id] ??= {};
      choicesPicked[template.id]![choice.id] = (choicesPicked[template.id]![choice.id] ?? 0) + 1;
      const r = resolveEventChoice(state, template.id, choice.id);
      state = r.state;
    }

    // 2. Player actions based on state
    state = maybeAskForFunding(state);
    state = maybeIssueBondIfLow(state);
    state = maybeCommissionAudit(state);
    state = maybeRunConsultation(state);
    state = maybeManageConsultants(state, opts.strategy);

    // 3. End the quarter
    state = endTurn(state);
    cashTrajectory.push(state.cash.balance as unknown as number);
    approvalTrajectory.push(state.engineVars.publicApproval as unknown as number);

    // Capture last summary
    const lastSummary = [...state.actionLog]
      .reverse()
      .find((e) => e.kind === 'quarter_summary');
    if (lastSummary) lastSummaries.push(lastSummary.summary);
  }

  const quartersPlayed = state.quarter as unknown as number;
  let outcome: PlaytestRun['outcome'] = 'inProgress';
  if (state.gameOver) {
    if (state.gameOver.kind === 'fiscalFailure') outcome = 'fiscalFailure';
    else if (state.gameOver.kind === 'boardFiring') outcome = 'boardFired';
    else if (state.gameOver.kind === 'campaignWon') outcome = 'won';
  }

  return {
    opts,
    outcome,
    quartersPlayed,
    finalCash: state.cash.balance as unknown as number,
    finalApproval: state.engineVars.publicApproval as unknown as number,
    finalBoard: state.boardConfidence.score as unknown as number,
    finalRiders:
      (state.agencies.ttc.dailyRiders as unknown as number) +
      (state.agencies.go.dailyRiders as unknown as number) +
      (state.agencies.up.dailyRiders as unknown as number),
    eventsFired,
    choicesPicked,
    cashTrajectory,
    approvalTrajectory,
    lastSummaries: lastSummaries.slice(-5),
  };
}
