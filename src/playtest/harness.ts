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
import { adHocFunding, callInFavor, isActionEligible, publicLobby, quietPitch } from '@engine/politicalActions';
import {
  acceptFinancingPackage,
  availableProjectCatalog,
  proposeProject,
} from '@engine/projectActions';
import { setMaintenanceBudget } from '@engine/agencyActions';
import { refinanceTranche, quoteRefi } from '@engine/treasuryActions';
import { requiredMaintenanceFor } from '@engine/agencies';
import { generateFinancingOffers } from '@engine/financing';
import type { SubsystemId } from '@/types/agency';
import type { GovernmentId } from '@/types/politics';
import type { SizeTier } from '@/types/projects';

/**
 * Playtest harness. Phase 10.5.
 *
 * Drives the pure engine through N quarters with an "agent" picking
 * choices on its behalf. Used to find balance/mechanical issues across
 * many seeds without manual play.
 *
 * Pure: no I/O, no DOM. CLI entrypoint serializes results to JSON.
 */

export type Strategy = 'conservative' | 'aggressive' | 'random' | 'reactive' | 'balanced';

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

function pickChoiceBalanced(state: GameState, template: EventTemplate): EventChoice | null {
  // Phase 10.5: score each choice on net expected impact.
  // - cash: $1M = 1 point (most direct)
  // - board: 1 pt = $5M equivalent (board <20 for 4Q = game over)
  // - approval: 1 pt = $3M (drives ridership/fare drift)
  // - gov trust: 1 pt = $4M each (drives allowance renegotiation)
  // - reliability: 1 pt = $2M (drives ridership directly)
  // - opex hit: same as cash (one quarter cost)
  const choices = visibleChoices(state, template);
  if (choices.length === 0) return null;
  const cashWeight = (state.cash.balance as unknown as number) < 400 ? 2 : 1; // amplify cash if low
  const scored = choices.map((c) => ({
    c,
    score: c.effects.reduce((acc, e) => {
      switch (e.kind) {
        case 'cash':
          return acc + e.deltaM * cashWeight;
        case 'boardConfidence':
          return acc + e.delta * 5;
        case 'publicApproval':
          return acc + e.delta * 3;
        case 'governmentTrust':
          return acc + e.delta * 4;
        case 'reliability':
          return acc + e.delta * 2;
        case 'opex':
          return acc - e.deltaM * 1;
        case 'auditorScrutiny':
          return acc - e.delta * 2; // scrutiny rising is bad
        case 'nimbyOrganization':
          return acc - e.delta * 1;
        case 'crosslinxLeverage':
          return acc - e.delta * 1;
        case 'consultantAlignment':
          return acc + e.delta * 0.5; // mild positive
        default:
          return acc;
      }
    }, 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
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
    case 'balanced':
      return pickChoiceBalanced(state, template);
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

function maybeIssueBondIfLow(state: GameState, strategy: Strategy): GameState {
  // Phase 10.5: smarter bot — issue bonds proactively, not at death's-door.
  // Conservative waits longer, aggressive bonds earlier.
  const cash = state.cash.balance as unknown as number;
  const threshold = strategy === 'aggressive' ? 800 : strategy === 'conservative' ? 400 : 600;
  if (cash < threshold) {
    const r = issueOperatingBond(state, 'pension', 500);
    return r.state;
  }
  return state;
}

function maybeAskForFunding(state: GameState): GameState {
  const cash = state.cash.balance as unknown as number;
  if (cash > 700) return state;
  // Ad-hoc funding from gov with highest trust (cooldown enforced inside)
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

function maybeBoostLowestTrust(state: GameState): GameState {
  // Phase 10.5: bots maintain political trust so renegotiations don't crash.
  // Quiet pitch on lowest-trust gov when trust dips below 40.
  const govs = ['ottawa', 'queensPark', 'cityHall'] as const;
  const sorted = [...govs].sort(
    (a, b) =>
      (state.politics[a].trust as unknown as number) -
      (state.politics[b].trust as unknown as number),
  );
  const lowest = sorted[0]!;
  if ((state.politics[lowest].trust as unknown as number) >= 45) return state;
  const r = quietPitch(state, lowest);
  return r.state;
}

// ─────────────────────────────────────────────────────────────────────────
// Phase 10.6: bots can do EVERYTHING a player can do

function maybeProposeProject(state: GameState, strategy: Strategy): GameState {
  // Strategy gating
  const cash = state.cash.balance as unknown as number;
  const activeProjects = state.projects.filter(
    (p) => p.state === 'proposed' || p.state === 'under_construction',
  ).length;
  // Only propose if we have room
  const maxConcurrent = strategy === 'aggressive' ? 4 : strategy === 'conservative' ? 2 : 3;
  if (activeProjects >= maxConcurrent) return state;
  // Need some cash buffer to cover construction draws
  const cashBuffer = strategy === 'aggressive' ? 500 : strategy === 'conservative' ? 1200 : 800;
  if (cash < cashBuffer) return state;
  // Once every 4Q at most (don't spam)
  const q = state.quarter as unknown as number;
  const lastProposed = state.projects
    .filter((p) => p.state === 'proposed' || p.state === 'under_construction')
    .map((p) => p.state === 'proposed' ? p.initiatedAt : p.state === 'under_construction' ? p.brokeGroundAt : null)
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .map((v) => v as unknown as number);
  if (lastProposed.length > 0 && q - Math.max(...lastProposed) < 4) return state;

  const catalog = availableProjectCatalog(state);
  // Skip P00 (Ontario Line — already in flight)
  const eligible = catalog.filter((c) => c.id !== 'P00');
  // Pick by tier preference based on strategy
  const targetTiers =
    strategy === 'aggressive'
      ? ['mega', 'major', 'minor', 'micro']
      : strategy === 'conservative'
        ? ['micro', 'minor']
        : ['minor', 'major', 'micro'];
  const candidate = eligible.find((c) => targetTiers.includes(c.tier as string));
  if (!candidate) return state;
  // Propose with first (usually cheapest) alignment and 'standard' station quality
  const alignment = candidate.alignments[0]!;
  return proposeProject(state, candidate.id, alignment.id, 'standard');
}

function maybeAcceptProjectFinancing(state: GameState): GameState {
  // Find proposed projects past the study buffer and accept financing
  const q = state.quarter as unknown as number;
  let s = state;
  for (const p of s.projects) {
    if (p.state !== 'proposed') continue;
    const initiated = p.initiatedAt as unknown as number;
    // Wait through 2Q study buffer
    if (q - initiated < 2) continue;
    // Pull tier from catalog; default to 'medium'
    const catalog = availableProjectCatalog(s);
    const entry = catalog.find((c) => c.id === p.templateId);
    const tier: SizeTier = (entry?.tier as SizeTier) ?? 'medium';
    const offers = generateFinancingOffers(s.politics, tier);
    if (offers.length === 0) continue;
    // Pick the offer with best (lowest) rate, weighted by size
    const sorted = [...offers].sort((a, b) => a.rateBp - b.rateBp);
    const cheapest = sorted[0]!;
    // Accept up to the project cost (cap, applied internally)
    const next = acceptFinancingPackage(s, p.templateId, [
      { approach: cheapest.approach, amountM: cheapest.maxAmount as unknown as number },
    ]);
    if (next !== s) {
      s = next;
      // Only accept one project per quarter to avoid debt spike
      break;
    }
  }
  return s;
}

function maybeRebalanceMaintenance(state: GameState, strategy: Strategy): GameState {
  // Phase 10.6: tune maintenance by strategy
  // - aggressive: 110% of required (faster recovery, +cost)
  // - conservative: 85% of required (save cash, accept decay)
  // - balanced/reactive: 100% of required (default)
  const cash = state.cash.balance as unknown as number;
  const multiplier =
    strategy === 'aggressive'
      ? 1.1
      : strategy === 'conservative' || (strategy === 'reactive' && cash < 400)
        ? 0.85
        : 1.0;
  let s = state;
  for (const agencyId of ['ttc', 'go', 'up'] as const) {
    const required = requiredMaintenanceFor(agencyId);
    const target = Math.round(required * multiplier);
    for (const sub of s.agencies[agencyId].subsystems) {
      const current = sub.maintenanceBudget as unknown as number;
      if (Math.abs(current - target) < 5) continue; // hysteresis
      s = setMaintenanceBudget(s, agencyId, sub.id as SubsystemId, target);
    }
  }
  return s;
}

function maybeRefinanceTranches(state: GameState): GameState {
  // Phase 10.6: refinance when BOC rate dropped meaningfully vs tranche rate.
  // Only refinance fixed-rate operating tranches (don't touch OL project debt).
  let s = state;
  const bocBp = s.debt.bocPolicyRate as unknown as number;
  for (const tranche of s.debt.tranches) {
    if (tranche.purpose !== 'operating') continue;
    if (tranche.coupon.kind !== 'fixed') continue;
    const couponBp = tranche.coupon.rate as unknown as number;
    // Only refi if new market rate would be 75bp+ cheaper
    if (couponBp - bocBp < 75) continue;
    const quote = quoteRefi(s, tranche.id);
    if (!quote) continue;
    if (quote.newRateBp >= couponBp - 50) continue; // not worth it
    if (quote.breakEvenQuarters > 16) continue; // payback too slow
    const r = refinanceTranche(s, tranche.id);
    if (r.state !== s) {
      s = r.state;
      // One refi per quarter
      break;
    }
  }
  return s;
}

function maybePublicLobby(state: GameState): GameState {
  // Phase 10.6: aggressive trust gain. Use when trust < 30 and approval > 50
  // (can afford the -5 approval hit).
  const approval = state.engineVars.publicApproval as unknown as number;
  if (approval < 50) return state;
  for (const gov of ['ottawa', 'queensPark', 'cityHall'] as const) {
    if ((state.politics[gov].trust as unknown as number) < 30) {
      if (!isActionEligible(state, gov, 'publicLobby')) continue;
      const r = publicLobby(state, gov);
      return r.state;
    }
  }
  return state;
}

function maybeCallInFavor(state: GameState): GameState {
  // Phase 10.6: emergency cash via favor. Only when truly desperate
  // (cash < $100M, since this burns the relationship).
  const cash = state.cash.balance as unknown as number;
  if (cash > 100) return state;
  // Pick highest-trust gov that allows it
  const govs: GovernmentId[] = ['ottawa', 'queensPark', 'cityHall'];
  const sorted = [...govs].sort(
    (a, b) =>
      (state.politics[b].trust as unknown as number) -
      (state.politics[a].trust as unknown as number),
  );
  for (const gov of sorted) {
    if (isActionEligible(state, gov, 'callInFavor')) {
      const r = callInFavor(state, gov);
      return r.state;
    }
  }
  return state;
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

    // 1a. Count informational events fired this quarter (no decision needed)
    for (const entry of state.actionLog) {
      if (entry.kind !== 'event_informational') continue;
      if ((entry.quarter as unknown as number) !== (state.quarter as unknown as number)) continue;
      eventsFired[entry.eventTemplateId] = (eventsFired[entry.eventTemplateId] ?? 0) + 1;
    }
    // 1b. Resolve all decision events in the inbox
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

    // 2. Player actions based on state. Phase 10.6: bots can do EVERYTHING
    // a player can do — project initiation/financing, maintenance tuning,
    // refinancing, full political action suite, etc.
    state = maybeBoostLowestTrust(state);
    state = maybePublicLobby(state);
    state = maybeAskForFunding(state);
    state = maybeCallInFavor(state); // last resort
    state = maybeIssueBondIfLow(state, opts.strategy);
    state = maybeRefinanceTranches(state);
    state = maybeProposeProject(state, opts.strategy);
    state = maybeAcceptProjectFinancing(state);
    state = maybeRebalanceMaintenance(state, opts.strategy);
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
