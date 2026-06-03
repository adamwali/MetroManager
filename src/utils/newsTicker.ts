import type { GameState } from '@/types/gameState';
import { reliabilityScore } from '@engine/agencies';
import { projectQuarterlyCashFlow } from './cashFlowForecast';
import { catalogEntry } from '@engine/projectCatalog';

/**
 * Reactive news ticker. Phase 10.11. Generates outlet-styled headlines from
 * live game state so the world feels like it's reacting to the player —
 * "CBC: TNTA plunges into the red" etc. Pure derivation; no RNG so the
 * ticker is stable within a quarter.
 */

export interface TickerHeadline {
  outlet: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

const OUTLETS = ['CBC', 'CP24', 'The Star', 'Globe', 'CityNews', '680 News'];

function pickOutlet(seed: number): string {
  return OUTLETS[seed % OUTLETS.length]!;
}

export function buildNewsTicker(state: GameState): TickerHeadline[] {
  const agency = state.ceo.agencyName ?? 'GTTA';
  const out: TickerHeadline[] = [];
  const cash = state.cash.balance as unknown as number;
  const board = state.boardConfidence.score as unknown as number;
  const approval = state.engineVars.publicApproval as unknown as number;
  const forecast = projectQuarterlyCashFlow(state);
  const ttcRel = reliabilityScore(state.agencies.ttc);
  const totalRiders =
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number);

  // Cash / solvency
  if (cash < 0) {
    out.push({ outlet: 'CBC', text: `${agency} plunges into the red — bankruptcy fears mount`, tone: 'bad' });
  } else if (cash < 300) {
    out.push({ outlet: 'CP24', text: `${agency} cash reserves running dangerously thin`, tone: 'bad' });
  } else if (cash > 3000) {
    out.push({ outlet: 'The Star', text: `${agency} sitting on a war chest — critics demand more service`, tone: 'neutral' });
  }
  if (forecast.net < -200) {
    out.push({ outlet: 'Globe', text: `Analysts warn ${agency} is burning ${fmt(Math.abs(forecast.net))}/quarter`, tone: 'bad' });
  } else if (forecast.net > 100) {
    out.push({ outlet: 'Globe', text: `${agency} posts a quarterly operating surplus`, tone: 'good' });
  }

  // Board
  if (board < 25) {
    out.push({ outlet: 'The Star', text: `Board reportedly weighing leadership change at ${agency}`, tone: 'bad' });
  } else if (board > 75) {
    out.push({ outlet: 'CityNews', text: `Board hails ${agency} leadership as "best in a generation"`, tone: 'good' });
  }

  // Approval
  if (approval < 30) {
    out.push({ outlet: '680 News', text: `Riders fed up: ${agency} approval craters to ${approval.toFixed(0)}%`, tone: 'bad' });
  } else if (approval > 68) {
    out.push({ outlet: 'CityNews', text: `${agency} riding a wave of public goodwill`, tone: 'good' });
  }

  // Reliability
  if (ttcRel < 50) {
    out.push({ outlet: 'CP24', text: `Subway breakdowns spike as TTC reliability hits ${ttcRel.toFixed(0)}`, tone: 'bad' });
  } else if (ttcRel > 85) {
    out.push({ outlet: 'CBC', text: `On-time performance soars across the TTC network`, tone: 'good' });
  }

  // Projects
  const building = state.projects.filter((p) => p.state === 'under_construction');
  const operating = state.projects.filter((p) => p.state === 'operating' && p.templateId !== 'P00');
  if (building.length > 0) {
    const p = building[0]!;
    const name = catalogEntry(p.templateId)?.name ?? 'a new line';
    out.push({ outlet: 'The Star', text: `Tunnels advancing: ${name} under construction`, tone: 'neutral' });
  }
  if (operating.length > 0) {
    const p = operating[operating.length - 1]!;
    const name = catalogEntry(p.templateId)?.name ?? 'the new line';
    out.push({ outlet: 'CityNews', text: `${name} now carrying riders — ${agency} delivers`, tone: 'good' });
  }

  // Trust extremes
  for (const [gov, label] of [
    ['ottawa', 'Ottawa'],
    ['queensPark', "Queen's Park"],
    ['cityHall', 'City Hall'],
  ] as const) {
    const t = state.politics[gov].trust as unknown as number;
    if (t < 25) {
      out.push({ outlet: 'Globe', text: `${label} relationship with ${agency} at a low ebb`, tone: 'bad' });
    }
  }

  // Ridership milestone
  if (totalRiders > 5_200_000) {
    out.push({ outlet: 'CBC', text: `Record ridership: ${(totalRiders / 1_000_000).toFixed(1)}M daily trips on the network`, tone: 'good' });
  }

  // Phase 10.12: archetype-flavored chatter so the player's choice of
  // archetype shapes the world's tone, not just their stats. One line per
  // archetype, drawn at most once per ticker render.
  const q = state.quarter as unknown as number;
  if (q >= 1 && q % 3 === 0) {
    const ceoName = ceoLast(state);
    switch (state.ceo.archetype) {
      case 'insider':
        out.push({
          outlet: 'Globe',
          text: `Sources: ${ceoName} spotted at private donor reception in Yorkville`,
          tone: 'neutral',
        });
        break;
      case 'disruptor':
        out.push({
          outlet: 'CP24',
          text: `Critics: ${agency} CEO "moves fast, breaks things — and now breaks our subway"`,
          tone: 'bad',
        });
        break;
      case 'internationalTechnocrat':
        out.push({
          outlet: 'Globe',
          text: `Bond markets cite ${agency}'s open-books posture as a stabilizing signal`,
          tone: 'good',
        });
        break;
      case 'coalitionBuilder':
        out.push({
          outlet: 'The Star',
          text: `${agency} convenes another tri-government roundtable — substance or theater?`,
          tone: 'neutral',
        });
        break;
      case 'steadyOperator':
        out.push({
          outlet: 'CBC',
          text: `${ceoName}'s ${agency} runs on quiet competence — boring is the new bold`,
          tone: 'neutral',
        });
        break;
    }
  }

  // Always have something — fall back to a neutral status line.
  if (out.length === 0) {
    out.push({
      outlet: pickOutlet(state.quarter as unknown as number),
      text: `${agency} holds steady as ${ceoLast(state)} marks another quarter in office`,
      tone: 'neutral',
    });
  }

  return out;
}

function ceoLast(state: GameState): string {
  const parts = state.ceo.name.trim().split(' ');
  return parts[parts.length - 1] || state.ceo.name;
}

function fmt(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
}
