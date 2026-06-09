import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { resolveEventChoice, visibleChoices } from '@engine/events/firing';
import { eventTemplateById } from '@engine/events/templates';
import { evaluatePredicate } from '@engine/events/predicates';
import { issueOperatingBond } from '@engine/treasuryActions';
import {
  acceptFinancingPackage,
  availableProjectCatalog,
  proposeProject,
} from '@engine/projectActions';
import { generateFinancingOffers } from '@engine/financing';
import type { GameState } from '@/types/gameState';
import type { SizeTier } from '@/types/projects';
import type { EventChoice, EventTemplate } from '@/types/events';

/**
 * Experience trace. Phase 11 diagnostic.
 *
 * Plays ONE campaign with a competent-but-human-like player model and logs,
 * for every quarter, what the player would actually experience:
 *   - decision events presented (and whether they're repeats)
 *   - informational events (noise)
 *   - whether the quarter required ANY meaningful input beyond End Turn
 *
 * The point is to measure the felt shape of a campaign: dead quarters,
 * repetition, slack, and where the drama actually is. Run:
 *
 *   npx tsx --tsconfig ./tsconfig.app.json src/playtest/experienceTrace.ts [seed]
 */

interface QuarterExperience {
  q: number;
  decisions: string[];        // event templates needing a choice
  repeats: string[];          // subset of decisions already seen this campaign
  infoEvents: number;         // informational-only events (toast noise)
  playerActions: string[];    // non-event actions the player model took
  cash: number;
  dead: boolean;              // nothing to decide, no action taken
}

function pickBalanced(state: GameState, template: EventTemplate): EventChoice | null {
  const choices = visibleChoices(state, template);
  if (choices.length === 0) return null;
  const cashWeight = (state.cash.balance as unknown as number) < 400 ? 2 : 1;
  const scored = choices.map((c) => ({
    c,
    score: c.effects.reduce((acc, e) => {
      switch (e.kind) {
        case 'cash': return acc + e.deltaM * cashWeight;
        case 'boardConfidence': return acc + e.delta * 5;
        case 'publicApproval': return acc + e.delta * 3;
        case 'governmentTrust': return acc + e.delta * 4;
        case 'reliability': return acc + e.delta * 2;
        case 'opex': return acc - e.deltaM;
        case 'auditorScrutiny': return acc - e.delta * 2;
        default: return acc;
      }
    }, 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.c ?? null;
}

function trace(seed: number): QuarterExperience[] {
  let state = createInitialGameState(seed, 'steadyOperator', 'TRACE');
  const seen = new Set<string>();
  const out: QuarterExperience[] = [];

  for (let q = 0; q < 60; q++) {
    if (state.gameOver) break;
    const currentQ = state.quarter as unknown as number;
    const exp: QuarterExperience = {
      q: currentQ,
      decisions: [],
      repeats: [],
      infoEvents: 0,
      playerActions: [],
      cash: Math.round(state.cash.balance as unknown as number),
      dead: false,
    };

    // Informational events that landed this quarter (toast noise)
    for (const entry of state.actionLog) {
      if (entry.kind !== 'event_informational') continue;
      if ((entry.quarter as unknown as number) !== currentQ) continue;
      exp.infoEvents++;
    }

    // Decision events in inbox
    for (const inboxItem of [...state.inbox]) {
      const template = eventTemplateById(inboxItem.templateId);
      if (!template || template.choices.length === 0) continue;
      exp.decisions.push(template.id);
      if (seen.has(template.id)) exp.repeats.push(template.id);
      seen.add(template.id);
      const choice = pickBalanced(state, template);
      if (!choice) continue;
      if (choice.requires && !evaluatePredicate(state, choice.requires)) continue;
      state = resolveEventChoice(state, template.id, choice.id).state;
    }

    // Human-like action model: only act when something demands it.
    const cash = state.cash.balance as unknown as number;
    if (cash < 500) {
      const r = issueOperatingBond(state, 'pension', 500);
      if (r.state !== state) {
        state = r.state;
        exp.playerActions.push('issueBond');
      } else {
        exp.playerActions.push('bondBLOCKED');
      }
    }
    // Start a project roughly when flush and not too busy (a human's pace)
    const active = state.projects.filter(
      (p) => p.state === 'proposed' || p.state === 'under_construction',
    ).length;
    if (cash > 900 && active < 3 && currentQ % 6 === 2) {
      const catalog = availableProjectCatalog(state).filter((c) => c.id !== 'P00');
      const candidate = catalog.find((c) => ['minor', 'major'].includes(c.tier as string));
      if (candidate) {
        state = proposeProject(state, candidate.id, candidate.alignments[0]!.id, 'standard');
        exp.playerActions.push(`propose:${candidate.id}`);
      }
    }
    // Accept financing for studied proposals
    for (const p of state.projects) {
      if (p.state !== 'proposed') continue;
      if (currentQ - (p.initiatedAt as unknown as number) < 2) continue;
      const entry = availableProjectCatalog(state).find((c) => c.id === p.templateId);
      const tier: SizeTier = (entry?.tier as SizeTier) ?? 'medium';
      const offers = generateFinancingOffers(state.politics, tier);
      if (offers.length === 0) continue;
      const cheapest = [...offers].sort((a, b) => a.rateBp - b.rateBp)[0]!;
      const next = acceptFinancingPackage(state, p.templateId, [
        { approach: cheapest.approach, amountM: cheapest.maxAmount as unknown as number },
      ]);
      if (next !== state) {
        state = next;
        exp.playerActions.push(`finance:${p.templateId}`);
        break;
      }
    }

    exp.dead = exp.decisions.length === 0 && exp.playerActions.length === 0;
    out.push(exp);
    state = endTurn(state);
  }
  return out;
}

// ── Report ────────────────────────────────────────────────────────────────
const seeds = process.argv[2] ? [Number(process.argv[2])] : [11, 42, 99, 123, 777];
let totalQ = 0;
let deadQ = 0;
let repeatDecisions = 0;
let totalDecisions = 0;
const distinctPerRun: number[] = [];
let maxDeadStreakAll = 0;
const minCashAfterQ12: number[] = [];

for (const seed of seeds) {
  const t = trace(seed);
  totalQ += t.length;
  deadQ += t.filter((e) => e.dead).length;
  totalDecisions += t.reduce((a, e) => a + e.decisions.length, 0);
  repeatDecisions += t.reduce((a, e) => a + e.repeats.length, 0);
  const distinct = new Set(t.flatMap((e) => e.decisions));
  distinctPerRun.push(distinct.size);
  let streak = 0;
  let maxStreak = 0;
  for (const e of t) {
    streak = e.dead ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  }
  maxDeadStreakAll = Math.max(maxDeadStreakAll, maxStreak);
  const after12 = t.filter((e) => e.q >= 12);
  if (after12.length > 0) minCashAfterQ12.push(Math.min(...after12.map((e) => e.cash)));

  if (seeds.length === 1) {
    // Detailed per-quarter dump for single-seed mode
    console.log(`\nSEED ${seed} — quarter-by-quarter experience:`);
    for (const e of t) {
      const flags = [
        e.decisions.length > 0 ? `decide:[${e.decisions.map((d) => d.slice(0, 12) + (e.repeats.includes(d) ? '*' : '')).join(',')}]` : '',
        e.infoEvents > 0 ? `info:${e.infoEvents}` : '',
        e.playerActions.length > 0 ? `act:[${e.playerActions.join(',')}]` : '',
        e.dead ? 'DEAD' : '',
      ].filter(Boolean).join(' ');
      console.log(`  Q${String(e.q).padStart(2)} $${String(e.cash).padStart(5)}M  ${flags}`);
    }
  }
}

console.log(`\n══ EXPERIENCE SUMMARY (${seeds.length} campaign${seeds.length > 1 ? 's' : ''}) ══`);
console.log(`Quarters played:        ${totalQ}`);
console.log(`Dead quarters:          ${deadQ} (${((deadQ / totalQ) * 100).toFixed(0)}%) — nothing to decide, no action worth taking`);
console.log(`Longest dead streak:    ${maxDeadStreakAll} consecutive quarters`);
console.log(`Decision events:        ${totalDecisions} total, ${repeatDecisions} repeats (${((repeatDecisions / Math.max(1, totalDecisions)) * 100).toFixed(0)}% repetition)`);
console.log(`Distinct templates/run: ${distinctPerRun.join(', ')} (catalog has ~75)`);
console.log(`Min cash after Q12:     ${minCashAfterQ12.map((c) => `$${c}M`).join(', ')} — slack measure (never near 0 = no stakes)`);
