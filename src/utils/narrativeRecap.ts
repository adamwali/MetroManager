import type { GameState } from '@/types/gameState';
import { projectQuarterlyCashFlow } from './cashFlowForecast';
import { reliabilityScore } from '@engine/agencies';
import { MANDATES } from '@/types/mandate';

/**
 * "State of the Agency" narrative briefing. Phase 10.12. Pure derivation —
 * no RNG, no LLM. Composes 3-5 short sentences in the voice of a trusted
 * chief of staff, weaving the current quarter's state into a paragraph
 * the player can read in 10 seconds.
 *
 * Each section picks the SINGLE most-relevant line for the current state,
 * so the briefing is short and the right things bubble up.
 */
export function briefingFor(state: GameState): string {
  const sentences: string[] = [];
  const agency = state.ceo.agencyName ?? 'GTTA';
  const f = projectQuarterlyCashFlow(state);

  // 1. Cash direction — always lead with money.
  const cash = state.cash.balance as unknown as number;
  if (cash < 0) {
    sentences.push(`Cash is ${cashShort(cash)} — we're underwater. Every quarter we stay there counts toward fiscal failure.`);
  } else if (cash < 300 && f.net < 0) {
    sentences.push(`Cash is thin (${cashShort(cash)}) and we're still burning ${cashShort(Math.abs(f.net))}/Q. The hole is structural, not noise.`);
  } else if (f.net < -100) {
    sentences.push(`The run-rate is ${cashShort(f.net)}/Q. We can sustain that for a while at ${cashShort(cash)} but not forever.`);
  } else if (f.net > 100) {
    sentences.push(`We're posting an operating surplus of ${cashShort(f.net)}/Q — rare in this seat. Worth investing while we can.`);
  } else {
    sentences.push(`Cash sits at ${cashShort(cash)}, run-rate roughly flat. Stable for now.`);
  }

  // 2. Board / approval color
  const board = state.boardConfidence.score as unknown as number;
  const approval = state.engineVars.publicApproval as unknown as number;
  if (board < 25) {
    sentences.push(`The board is openly questioning your leadership. Two more bad quarters and they'll move.`);
  } else if (board < 40) {
    sentences.push(`The board's patience is thin. They want a delivery win soon.`);
  } else if (approval < 30) {
    sentences.push(`Public sentiment is hostile (${approval.toFixed(0)}/100). The Star is sharpening pencils.`);
  } else if (approval > 65 && board > 60) {
    sentences.push(`You have political room right now — the board likes you and so does the public. Spend it on something hard.`);
  }

  // 3. Government relationships — pick the one most at risk.
  const govs = [
    { id: 'ottawa' as const, label: 'Ottawa', trust: state.politics.ottawa.trust as unknown as number },
    { id: 'queensPark' as const, label: "Queen's Park", trust: state.politics.queensPark.trust as unknown as number },
    { id: 'cityHall' as const, label: 'City Hall', trust: state.politics.cityHall.trust as unknown as number },
  ];
  const lowestGov = govs.reduce((a, b) => (a.trust < b.trust ? a : b));
  if (lowestGov.trust < 30) {
    const minister = ministerLast(state, lowestGov.id);
    sentences.push(`${minister ?? lowestGov.label} is cold toward us (${lowestGov.trust.toFixed(0)}/100). Expect the next ask from that direction to be steep.`);
  } else if (lowestGov.trust >= 60) {
    sentences.push(`All three governments are warm — Ottawa, Queen's Park, and City Hall trust all above 60. Unusual.`);
  }

  // 4. Operational signal — reliability or a project milestone.
  const ttcRel = reliabilityScore(state.agencies.ttc);
  const goRel = reliabilityScore(state.agencies.go);
  const building = state.projects.filter((p) => p.state === 'under_construction').length;
  const operating = state.projects.filter((p) => p.state === 'operating' && p.templateId !== 'P00').length;
  if (ttcRel < 55) {
    sentences.push(`TTC reliability is at ${ttcRel.toFixed(0)} — signal failures will keep coming until we fund maintenance.`);
  } else if (goRel < 55) {
    sentences.push(`GO reliability is slipping (${goRel.toFixed(0)}). Catenary's been neglected.`);
  } else if (operating > 0) {
    sentences.push(`${operating} ${operating === 1 ? 'line is' : 'lines are'} now revenue-generating; ${building} more under construction.`);
  } else if (building > 0) {
    sentences.push(`${building} ${building === 1 ? 'project is' : 'projects are'} mid-build. We're spending now; the payoff is years out.`);
  }

  // 5. Mandate tracker — surface progress against the player's Q0 bet.
  if (state.mandate) {
    const m = MANDATES[state.mandate];
    const ridersNow =
      (state.agencies.ttc.dailyRiders as unknown as number) +
      (state.agencies.go.dailyRiders as unknown as number) +
      (state.agencies.up.dailyRiders as unknown as number);
    if (state.mandate === 'ridership') {
      const pct = (ridersNow / 2_450_000) * 100;
      sentences.push(
        `On your ${m.shortLabel} mandate: ${(ridersNow / 1_000_000).toFixed(2)}M daily riders — ${pct.toFixed(0)}% of target.`,
      );
    } else if (state.mandate === 'reliability') {
      const avg = (ttcRel + goRel) / 2;
      sentences.push(
        `On your ${m.shortLabel} mandate: TTC+GO reliability avg ${avg.toFixed(0)}/80 needed.`,
      );
    } else if (state.mandate === 'affordability') {
      sentences.push(
        `On your ${m.shortLabel} mandate: approval ${approval.toFixed(0)}/65 target, watch the fare-hike events.`,
      );
    }
  }

  // 6. Closer — quarters left in the campaign frames urgency.
  const q = state.quarter as unknown as number;
  const left = Math.max(0, 60 - q);
  if (q === 0) {
    sentences.push(`First quarter as CEO of ${agency}. Sixty to go.`);
  } else if (left <= 8) {
    sentences.push(`${left} quarters left in this campaign. Whatever the legacy is, it's mostly written.`);
  } else if (left <= 20) {
    sentences.push(`${left} quarters left — enough to finish what's underway but not to start much new.`);
  }

  return sentences.join(' ');
}

function cashShort(m: number): string {
  if (Math.abs(m) >= 1000) return `${m < 0 ? '-' : ''}$${Math.abs(m / 1000).toFixed(1)}B`;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(0)}M`;
}

function ministerLast(state: GameState, gov: 'ottawa' | 'queensPark' | 'cityHall'): string | null {
  const ids = state.politics[gov].cabinetCharacterIds;
  if (ids.length === 0) return null;
  const char = state.characters[ids[0]!];
  if (!char) return null;
  const parts = char.name.trim().split(' ');
  return parts[parts.length - 1] ?? char.name;
}
