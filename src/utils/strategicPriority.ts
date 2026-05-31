import type { GameState } from '@/types/gameState';
import { projectQuarterlyCashFlow } from './cashFlowForecast';
import { reliabilityScore } from '@engine/agencies';

/**
 * Strategic Priority — answers "what's the most important thing for me right now."
 *
 * Phase 10.10. The audit found Mission Control had six "here's stuff"
 * panels and zero "here's what to DO." This computes the top constraint
 * facing the player from live state and surfaces it with concrete levers.
 *
 * Pure function: state in → priority out. UI just renders it.
 */

export type PriorityKind =
  | 'fiscalCrisis'
  | 'cashLow'
  | 'boardCrisis'
  | 'approvalCrisis'
  | 'lowestTrust'
  | 'reliabilityCrisis'
  | 'auditorScrutiny'
  | 'nimbyPressure'
  | 'allClear';

export type LeverKind =
  | { kind: 'navigate'; to: string; label: string; rationale: string }
  | { kind: 'voluntaryAudit' }
  | { kind: 'communityConsultation' }
  | { kind: 'issueBond' }
  | { kind: 'callFavor'; gov: 'ottawa' | 'queensPark' | 'cityHall' }
  | { kind: 'adHocFunding'; gov: 'ottawa' | 'queensPark' | 'cityHall' }
  | { kind: 'terminateConsultants' };

export interface Lever {
  action: LeverKind;
  label: string;
  /** One-line description of the trade. */
  effect: string;
}

export interface StrategicPriority {
  kind: PriorityKind;
  severity: 'critical' | 'warning' | 'watch' | 'allClear';
  title: string;
  why: string;
  ifIgnored: string;
  /** Up to 3 highest-impact levers. */
  levers: Lever[];
}

export function computeStrategicPriority(state: GameState): StrategicPriority {
  const cash = state.cash.balance as unknown as number;
  const board = state.boardConfidence.score as unknown as number;
  const approval = state.engineVars.publicApproval as unknown as number;
  const scrutiny = state.engineVars.auditorScrutiny as unknown as number;
  const nimby = state.engineVars.nimbyOrganization as unknown as number;
  const trusts = {
    ottawa: state.politics.ottawa.trust as unknown as number,
    queensPark: state.politics.queensPark.trust as unknown as number,
    cityHall: state.politics.cityHall.trust as unknown as number,
  };
  const forecast = projectQuarterlyCashFlow(state);
  const ttcReliability = reliabilityScore(state.agencies.ttc);
  const goReliability = reliabilityScore(state.agencies.go);

  // PRIORITY 1 — fiscal failure imminent
  if (cash < 0) {
    return {
      kind: 'fiscalCrisis',
      severity: 'critical',
      title: `Cash is ${formatCash(cash)} — fiscal failure in ≤3Q`,
      why: `You go fiscally bankrupt if cash stays negative for 4 consecutive quarters. Current run-rate: ${signedM(forecast.net)}/Q.`,
      ifIgnored: `Game over — you're removed by the federal government.`,
      levers: [
        bondLever(),
        bestFavorLever(state, trusts),
        navigateLever('/treasury', 'Open Treasury', 'Issue an operating bond now'),
      ].slice(0, 3),
    };
  }
  if (cash < 500 && forecast.net < 0) {
    return {
      kind: 'cashLow',
      severity: 'critical',
      title: `Cash low (${formatCash(cash)}) and burning ${signedM(forecast.net)}/Q`,
      why: `At this run-rate you go below $0 in ${Math.max(1, Math.ceil(cash / Math.abs(forecast.net)))}Q. Bonds buy time; the structural fix is operating margin.`,
      ifIgnored: `Fiscal failure within a year.`,
      levers: [
        bondLever(),
        bestFundingLever(state, trusts),
        navigateLever('/network', 'Cut maintenance or raise fares', 'Tune agency-level spend on the agency dashboards'),
      ],
    };
  }

  // PRIORITY 2 — board firing imminent
  if (board < 25) {
    return {
      kind: 'boardCrisis',
      severity: 'critical',
      title: `Board confidence ${board.toFixed(0)} — firing risk`,
      why: `<25 for 2 consecutive quarters and the board fires you. Drifts +1/Q toward 60 with no bad news.`,
      ifIgnored: `You're fired by the board.`,
      levers: [
        navigateLever('/capital', 'Ship a delivery win', 'Project opening = +10 board. Check what\'s near completion.'),
        scrutiny > 30 ? voluntaryAuditLever() : null,
        navigateLever('/political', 'Avoid more scandals', 'Political missteps cost board points. Lobby calmly.'),
      ].filter((x): x is Lever => x !== null),
    };
  }
  if (board < 40) {
    return {
      kind: 'boardCrisis',
      severity: 'warning',
      title: `Board confidence ${board.toFixed(0)} — recovery needed`,
      why: `Below 40 you have little room to absorb a scandal. Drift toward 60 is slow (+1/Q).`,
      ifIgnored: `One bad event drops you to the firing threshold.`,
      levers: [
        navigateLever('/capital', 'Ship a delivery win', 'Project opening = +10 board.'),
        scrutiny > 30 ? voluntaryAuditLever() : null,
        navigateLever('/treasury', 'Demonstrate financial discipline', 'Refinance high-coupon debt to look responsible.'),
      ].filter((x): x is Lever => x !== null),
    };
  }

  // PRIORITY 3 — approval crisis (drives ridership long-term)
  if (approval < 30) {
    return {
      kind: 'approvalCrisis',
      severity: 'critical',
      title: `Public approval ${approval.toFixed(0)} — hostile`,
      why: `Below 30 approval drags ridership -0.3%/Q. Drift compounds; revenue shrinks.`,
      ifIgnored: `Ridership decline → fare decline → cash spiral.`,
      levers: [
        navigateLever('/network', 'Boost cleanliness budgets', 'Cleanliness budget directly raises approval.'),
        nimby > 30 ? communityConsultationLever() : null,
        navigateLever('/political', 'Rebuild trust', 'Public lobby trades approval down further but gov trust matters more long-term.'),
      ].filter((x): x is Lever => x !== null),
    };
  }

  // PRIORITY 4 — lowest trust gov
  const lowestGov = (Object.keys(trusts) as (keyof typeof trusts)[]).reduce((a, b) =>
    trusts[a] < trusts[b] ? a : b,
  );
  const lowestTrust = trusts[lowestGov];
  if (lowestTrust < 30) {
    const govLabel = govDisplayName(lowestGov);
    return {
      kind: 'lowestTrust',
      severity: 'warning',
      title: `${govLabel} trust ${lowestTrust.toFixed(0)} — relationship at risk`,
      why: `Low trust hikes project financing rates and threatens the next allowance renegotiation. ≤25 risks crisis events.`,
      ifIgnored: `Allowance gets cut at next renegotiation; financing rates spike.`,
      levers: [
        { action: { kind: 'navigate', to: '/political', label: 'Open Politics', rationale: '' }, label: `Quiet pitch ${govLabel}`, effect: `+3 trust, no approval cost` },
        { action: { kind: 'navigate', to: '/political', label: 'Open Politics', rationale: '' }, label: `Public lobby ${govLabel}`, effect: `+6 trust, -5 approval` },
      ],
    };
  }

  // PRIORITY 5 — auditor scrutiny climbing
  if (scrutiny >= 40) {
    return {
      kind: 'auditorScrutiny',
      severity: scrutiny >= 50 ? 'critical' : 'warning',
      title: `Auditor scrutiny ${scrutiny.toFixed(0)}/100`,
      why: `At ≥50 the Auditor General opens a formal investigation (EV056) — forced $30-120M hit + board damage.`,
      ifIgnored: `EV056 fires within a couple quarters.`,
      levers: [voluntaryAuditLever()],
    };
  }

  // PRIORITY 6 — reliability dragging ridership
  if (ttcReliability < 55 || goReliability < 55) {
    const worst = ttcReliability < goReliability ? 'TTC' : 'GO';
    const score = Math.min(ttcReliability, goReliability);
    return {
      kind: 'reliabilityCrisis',
      severity: 'warning',
      title: `${worst} reliability ${score.toFixed(0)}/100 — ridership bleeding`,
      why: `Below 55 you trigger recurring signal-failure events (EV001 etc.) AND lose ridership organically -0.25%/Q.`,
      ifIgnored: `Compounding fare-revenue decline.`,
      levers: [
        navigateLever(
          `/network/${worst.toLowerCase()}`,
          `Raise ${worst} maintenance`,
          'Subsystem maintenance ≥ required holds condition. Watch the live forecast for the cash impact.',
        ),
      ],
    };
  }

  // PRIORITY 7 — NIMBY building (less common)
  if (nimby >= 30) {
    return {
      kind: 'nimbyPressure',
      severity: 'watch',
      title: `NIMBY organization ${nimby.toFixed(0)}/100`,
      why: `Organized opposition triggers lawsuit risk + project delays.`,
      ifIgnored: `Charter-challenge or lawsuit events fire on future stations.`,
      levers: [communityConsultationLever()],
    };
  }

  // ALL CLEAR
  return {
    kind: 'allClear',
    severity: 'allClear',
    title: 'No urgent constraint — invest in growth',
    why: `Cash ${formatCash(cash)} · board ${board.toFixed(0)} · approval ${approval.toFixed(0)} · all trust ≥30 · reliability healthy.`,
    ifIgnored: `Free turn — push capital projects, build trust banks, or pay down debt.`,
    levers: [
      navigateLever('/capital', 'Propose a project', 'Long-term ridership growth + LVC revenue.'),
      navigateLever('/political', 'Stockpile political capital', 'Quiet pitches build trust for the next renegotiation.'),
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Lever helpers

function navigateLever(to: string, label: string, rationale: string): Lever {
  return { action: { kind: 'navigate', to, label, rationale }, label, effect: rationale };
}

function bondLever(): Lever {
  return {
    action: { kind: 'issueBond' },
    label: 'Issue an operating bond',
    effect: '+$500M cash now, ~$25M/Q new debt service. Buys time, not solvency.',
  };
}

function voluntaryAuditLever(): Lever {
  return {
    action: { kind: 'voluntaryAudit' },
    label: 'Commission voluntary VfM audit',
    effect: '-$40M, -20 scrutiny, +5 approval. 8Q cooldown.',
  };
}

function communityConsultationLever(): Lever {
  return {
    action: { kind: 'communityConsultation' },
    label: 'Run community consultation',
    effect: '-$15M, -15 NIMBY, +3 approval. Needs City Hall trust ≥40.',
  };
}

function bestFavorLever(
  state: GameState,
  trusts: Record<'ottawa' | 'queensPark' | 'cityHall', number>,
): Lever {
  const gov = (Object.keys(trusts) as (keyof typeof trusts)[]).reduce((a, b) =>
    trusts[a] > trusts[b] ? a : b,
  );
  const minister = state.politics[gov].cabinetCharacterIds[0];
  const rel = minister ? (state.characters[minister]?.relationship as unknown as number) ?? 0 : 0;
  return {
    action: { kind: 'callFavor', gov },
    label: `Call in favor with ${govDisplayName(gov)}`,
    effect: `+$${Math.round(250 + Math.max(0, rel) * 3)}M cash. Burns 16Q of relationship.`,
  };
}

function bestFundingLever(
  _state: GameState,
  trusts: Record<'ottawa' | 'queensPark' | 'cityHall', number>,
): Lever {
  const gov = (Object.keys(trusts) as (keyof typeof trusts)[]).reduce((a, b) =>
    trusts[a] > trusts[b] ? a : b,
  );
  const cashM = Math.round(100 + (trusts[gov] / 100) * 150);
  return {
    action: { kind: 'adHocFunding', gov },
    label: `Request ad-hoc funding from ${govDisplayName(gov)}`,
    effect: `+$${cashM}M cash, -8 trust. 8Q cooldown.`,
  };
}

function govDisplayName(g: 'ottawa' | 'queensPark' | 'cityHall'): string {
  if (g === 'ottawa') return 'Ottawa';
  if (g === 'queensPark') return "Queen's Park";
  return 'City Hall';
}

function formatCash(m: number): string {
  if (Math.abs(m) >= 1000) return `${m < 0 ? '-' : ''}$${Math.abs(m / 1000).toFixed(1)}B`;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(0)}M`;
}

function signedM(m: number): string {
  return m >= 0 ? `+${formatCash(m)}` : `-${formatCash(Math.abs(m))}`;
}
