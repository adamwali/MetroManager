import type { GameState } from '@/types/gameState';
import type { Agency, Agencies, AgencyId } from '@/types/agency';
import type { ActionLogEntry, QuarterSummaryBreakdown } from '@/types/actionLog';
import type { GameOver, GameOverCounters } from '@/types/gameOver';
import {
  BOARD_FIRING_CONFIDENCE_THRESHOLD,
  BOARD_FIRING_CONSECUTIVE_QUARTERS,
  CAMPAIGN_END_QUARTER,
  FISCAL_FAILURE_CASH_THRESHOLD_M,
  FISCAL_FAILURE_CONSECUTIVE_QUARTERS,
} from '@/types/gameOver';
import { cash, quarter, riders, score } from '@/types/scalars';
import { applyMaturities, driftBocRate, quarterlyDebtService } from './finance';
import { nextRatingFor } from './rating';
import { keyedFloat } from './rng';
import { bp as bpScalar } from '@/types/scalars';
import {
  quarterlyFareRevenue,
  quarterlyMaintenanceExpense,
  quarterlyOperatingAllowance,
  quarterlyOperatingExpense,
} from './cashflow';
import {
  approvalRidershipDrift,
  catchmentGrowthPerQuarter,
  decaySubsystems,
  reliabilityRidershipDrift,
  reliabilityScore,
} from './agencies';
import { tickProject } from './projects';
import { ridershipModelFor } from './data';
import { processEventsForQuarter } from './events/firing';
import { applyStandingOrders } from './standingOrderActions';

/**
 * Advance one quarter. Pure function — does not mutate input.
 *
 * Per-mechanic contributions are tracked so the appended quarter_summary
 * log entry has a faithful breakdown for the "why did this happen?" UI.
 *
 * Order of operations:
 *   1. Increment quarter
 *   2. Apply debt maturities (auto-refi at market rate)
 *   3. Compute cash flow components (allowance + fare in; opex + maint +
 *      debt service + refi fee out — project burn is NOT operating cash)
 *   4. Decay subsystems
 *   5. Compute per-agency ridership deltas: growth + reliability drag
 *   6. Tick projects (construction draws, transitions, ramp)
 *   7. Apply project-driven ridership deltas (primary + cannibalization)
 *   8. Compose updated state and append quarter_summary log entry
 */
export function endTurn(state: GameState): GameState {
  const prevQuarter = state.quarter as unknown as number;
  const nextQuarter = quarter(prevQuarter + 1);

  // 2. Maturities
  const { debt: debtAfterStep, refiFee } = applyMaturities(
    state.debt,
    nextQuarter as unknown as number,
  );
  // BOC policy rate drift (Phase 3.2 polish — was orphan, now floats)
  const bocRoll = keyedFloat(state.rng.masterSeed, `boc:q${nextQuarter as unknown as number}`);
  const newBocBp = driftBocRate(debtAfterStep.bocPolicyRate as unknown as number, bocRoll);
  const debtAfterMaturity = { ...debtAfterStep, bocPolicyRate: bpScalar(newBocBp) };

  // Dynamic credit rating (Phase 7) — recomputed each quarter, drifts one
  // notch per quarter toward target rating.
  const { rating: nextRating } = nextRatingFor({ ...state, debt: debtAfterMaturity });
  const debtWithRating = { ...debtAfterMaturity, rating: nextRating };
  const refiFeeN = refiFee as unknown as number;
  const tranchesRefinanced = state.debt.tranches.length - debtAfterMaturity.tranches.length + 1;
  const actualTranchesRefinanced = Math.max(0, tranchesRefinanced - 1); // -1 hack avoided below
  void actualTranchesRefinanced;
  const refinancedCount =
    state.debt.tranches.filter(
      (t) => (t.maturity as unknown as number) <= (nextQuarter as unknown as number),
    ).length;

  // 3. Cash flow components
  const allowanceN = quarterlyOperatingAllowance(state.operatingAllowance) as unknown as number;
  const fareN = quarterlyFareRevenue(state.agencies) as unknown as number;
  const opexN = quarterlyOperatingExpense(state.agencies) as unknown as number;
  const maintN = quarterlyMaintenanceExpense(state.agencies) as unknown as number;
  const debtServiceN = quarterlyDebtService(
    debtWithRating,
    state.engineVars.openBooks,
  ) as unknown as number;
  const netCashDelta = allowanceN + fareN - opexN - maintN - debtServiceN - refiFeeN;

  // 4. Decay subsystems (archetype maintenance efficiency applied inside)
  const agenciesDecayed = applyToAgencies(state.agencies, (a) =>
    decaySubsystems(a, state.ceo.archetype),
  );

  // 5. Per-agency ridership: growth + reliability drag + approval effect,
  // separately tracked for action-log breakdown
  type AgencyTracking = {
    before: number;
    fromGrowth: number;
    fromReliabilityDrag: number;
    afterOrganic: number;
  };
  const organicTracking = {} as Record<AgencyId, AgencyTracking>;
  const publicApprovalN = state.engineVars.publicApproval as unknown as number;
  const approvalDriftPct = approvalRidershipDrift(publicApprovalN);
  const agenciesWithOrganicRidership = applyToAgencies(agenciesDecayed, (a) => {
    const before = a.dailyRiders as unknown as number;
    const reliability = reliabilityScore(a);
    const dragPct = reliabilityRidershipDrift(reliability);
    const growthPct = catchmentGrowthPerQuarter(a.catchmentGrowthRate);
    // approval drift folded into reliability drag tracking for the breakdown
    const fromGrowth = Math.floor(before * growthPct);
    const fromReliabilityDrag = Math.floor(before * (dragPct + approvalDriftPct));
    const afterOrganic = Math.max(0, before + fromGrowth + fromReliabilityDrag);
    organicTracking[a.id] = { before, fromGrowth, fromReliabilityDrag, afterOrganic };
    return { ...a, dailyRiders: riders(afterOrganic) };
  });

  // 6. Project ticks — accumulate per-agency primary deltas and cannibalization
  const primaryByAgency: Record<AgencyId, number> = { ttc: 0, go: 0, up: 0 };
  const cannibalizationByAgency: Record<AgencyId, number> = { ttc: 0, go: 0, up: 0 };
  const transitions: QuarterSummaryBreakdown['projects']['transitions'] = [];
  const constructionDraws: QuarterSummaryBreakdown['projects']['constructionDraws'] = [];

  const tickedProjects = state.projects.map((p, idx) => {
    const before = state.projects[idx]!;
    const r = tickProject(p, nextQuarter, ridershipModelFor, state.engineVars.engineers);
    if (r.primaryAgency && r.primaryAgencyDelta !== 0) {
      primaryByAgency[r.primaryAgency] += r.primaryAgencyDelta;
    }
    for (const [agencyId, delta] of Object.entries(r.cannibalizationDeltas) as [
      AgencyId,
      number,
    ][]) {
      cannibalizationByAgency[agencyId] += delta;
    }
    // Record any state transition
    if (before.state !== r.project.state) {
      transitions.push({
        templateId: before.templateId,
        from: before.state as 'proposed' | 'under_construction',
        to: r.project.state as 'under_construction' | 'operating',
      });
    }
    // Record construction draws (non-zero only)
    const drawn = r.drawFromFunding as unknown as number;
    if (drawn > 0) {
      const remaining =
        r.project.state === 'under_construction'
          ? (r.project.remainingFunding as unknown as number)
          : 0;
      constructionDraws.push({
        templateId: r.project.templateId,
        drawn,
        remainingFunding: remaining,
      });
    }
    return r.project;
  });

  // 7. Apply project-driven per-agency deltas
  const agenciesFinal = applyToAgencies(agenciesWithOrganicRidership, (a) => {
    const projectDelta = primaryByAgency[a.id] + cannibalizationByAgency[a.id];
    if (projectDelta === 0) return a;
    const before = a.dailyRiders as unknown as number;
    return { ...a, dailyRiders: riders(Math.max(0, before + projectDelta)) };
  });

  // 8. Compose updated state and append quarter_summary log entry
  const systemBefore =
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number);
  const systemAfter =
    (agenciesFinal.ttc.dailyRiders as unknown as number) +
    (agenciesFinal.go.dailyRiders as unknown as number) +
    (agenciesFinal.up.dailyRiders as unknown as number);
  const ridersDelta = systemAfter - systemBefore;

  const perAgency = {} as QuarterSummaryBreakdown['ridership']['perAgency'];
  for (const agencyId of ['ttc', 'go', 'up'] as const) {
    const track = organicTracking[agencyId]!;
    perAgency[agencyId] = {
      before: track.before,
      after: agenciesFinal[agencyId].dailyRiders as unknown as number,
      fromGrowth: track.fromGrowth,
      fromReliabilityDrag: track.fromReliabilityDrag,
      fromProjectPrimary: primaryByAgency[agencyId],
      fromCannibalization: cannibalizationByAgency[agencyId],
    };
  }

  const breakdown: QuarterSummaryBreakdown = {
    cashFlow: {
      operatingAllowance: allowanceN,
      fareRevenue: fareN,
      operatingExpense: opexN,
      maintenance: maintN,
      debtService: debtServiceN,
      refiFee: refiFeeN,
      netDelta: netCashDelta,
    },
    ridership: { perAgency, systemBefore, systemAfter },
    projects: { transitions, constructionDraws },
    debt: { tranchesRefinanced: refinancedCount, refiFee: refiFeeN },
  };

  const logId = `q${nextQuarter as unknown as number}-${state.nextLogId}`;
  const summaryEntry: ActionLogEntry = {
    kind: 'quarter_summary',
    id: logId,
    quarter: nextQuarter,
    cause: { kind: 'system', system: 'endTurn' },
    cashDelta: netCashDelta,
    ridersDelta,
    summary: buildSummaryText(netCashDelta, ridersDelta, transitions),
    breakdown,
  };

  const nextBalance = (state.cash.balance as unknown as number) + netCashDelta;
  const nextQuarterN = nextQuarter as unknown as number;
  const boardScore = state.boardConfidence.score as unknown as number;
  const { counters: nextCounters, gameOver } = detectGameOver(
    state.gameOverCounters,
    nextBalance,
    boardScore,
    nextQuarterN,
  );

  // Prune expired obligations (those whose expiresAt <= nextQuarter)
  const activeObligations = state.activeObligations.filter(
    (o) => (o.expiresAt as unknown as number) > nextQuarterN,
  );

  // NIMBY organization decays without new confrontation (-2 per quarter)
  // Phase 6.3 bug-bash: previously NIMBY only grew, never shrank.
  const nimbyDecayed = Math.max(
    0,
    (state.engineVars.nimbyOrganization as unknown as number) - 2,
  );
  const engineVarsDecayed = {
    ...state.engineVars,
    nimbyOrganization: score(nimbyDecayed),
  };

  // Compose the post-tick state before event processing
  const postTick: GameState = {
    ...state,
    quarter: nextQuarter,
    debt: debtWithRating,
    agencies: agenciesFinal,
    projects: tickedProjects,
    cash: { balance: cash(nextBalance), lastQuarterDelta: cash(netCashDelta) },
    actionLog: [...state.actionLog, summaryEntry],
    nextLogId: state.nextLogId + 1,
    gameOverCounters: nextCounters,
    activeObligations,
    engineVars: engineVarsDecayed,
    ...(gameOver ? { gameOver } : {}),
  };

  // Process events AFTER tick (so triggers see new state). Skip if game ended.
  if (gameOver) return postTick;
  const eventsResult = processEventsForQuarter(postTick);
  const afterEvents: GameState = {
    ...eventsResult.state,
    actionLog: [...eventsResult.state.actionLog, ...eventsResult.newLogEntries],
  };

  // Apply standing orders AFTER events fire — auto-actions can react to
  // newly-fired events (e.g., autoTriageInboxBelowUrgency drains low-urgency
  // events) and to current state metrics (cash/trust).
  const ordersResult = applyStandingOrders(afterEvents);
  return ordersResult.state;
}

/**
 * Update consecutive-quarter counters and emit a GameOver if any trigger fires.
 * Order of precedence: fiscal failure > board firing > campaign won (at Q60).
 */
function detectGameOver(
  prev: GameOverCounters,
  nextCashM: number,
  boardConfidence: number,
  nextQuarterN: number,
): { counters: GameOverCounters; gameOver: GameOver | undefined } {
  const quartersInDeepDeficit =
    nextCashM < FISCAL_FAILURE_CASH_THRESHOLD_M ? prev.quartersInDeepDeficit + 1 : 0;
  const quartersWithFiringBoard =
    boardConfidence < BOARD_FIRING_CONFIDENCE_THRESHOLD
      ? prev.quartersWithFiringBoard + 1
      : 0;
  const counters: GameOverCounters = { quartersInDeepDeficit, quartersWithFiringBoard };

  if (quartersInDeepDeficit >= FISCAL_FAILURE_CONSECUTIVE_QUARTERS) {
    return {
      counters,
      gameOver: {
        kind: 'fiscalFailure',
        endedAt: quarter(nextQuarterN),
        headline: 'Fiscal failure',
        detail: `Cash held below $${FISCAL_FAILURE_CASH_THRESHOLD_M / 1_000}B for ${FISCAL_FAILURE_CONSECUTIVE_QUARTERS} consecutive quarters. Bond market closes; the board terminates your contract and authorizes forced asset sale.`,
      },
    };
  }
  if (quartersWithFiringBoard >= BOARD_FIRING_CONSECUTIVE_QUARTERS) {
    return {
      counters,
      gameOver: {
        kind: 'boardFiring',
        endedAt: quarter(nextQuarterN),
        headline: 'Board termination',
        detail: `Board confidence held below ${BOARD_FIRING_CONFIDENCE_THRESHOLD} for ${BOARD_FIRING_CONSECUTIVE_QUARTERS} consecutive quarters. The board has voted to terminate your contract.`,
      },
    };
  }
  if (nextQuarterN >= CAMPAIGN_END_QUARTER && nextCashM > 0 && boardConfidence > 0) {
    return {
      counters,
      gameOver: {
        kind: 'campaignWon',
        endedAt: quarter(nextQuarterN),
        headline: '15 years complete',
        detail: 'You reached the end of the 15-year campaign with the agency still solvent and the board still backing you. Time to write the memoir.',
      },
    };
  }
  return { counters, gameOver: undefined };
}

function applyToAgencies(agencies: Agencies, fn: (a: Agency) => Agency): Agencies {
  return { ttc: fn(agencies.ttc), go: fn(agencies.go), up: fn(agencies.up) };
}

function buildSummaryText(
  cashDelta: number,
  ridersDelta: number,
  transitions: QuarterSummaryBreakdown['projects']['transitions'],
): string {
  const parts: string[] = [];
  const fmt = (n: number) =>
    Math.abs(n) >= 1_000 ? `$${(n / 1_000).toFixed(2)}B` : `$${n.toFixed(0)}M`;
  parts.push(`Cash ${cashDelta >= 0 ? '+' : ''}${fmt(cashDelta)}`);
  if (ridersDelta !== 0) {
    parts.push(`Riders ${ridersDelta >= 0 ? '+' : ''}${(ridersDelta / 1_000).toFixed(0)}k/day`);
  }
  for (const t of transitions) {
    parts.push(`${t.templateId}: ${t.from} → ${t.to}`);
  }
  return parts.join(' · ');
}
