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
  quarterlyLvcRevenue,
  quarterlyMaintenanceExpense,
  quarterlyOperatingAllowance,
  quarterlyOperatingExpense,
} from './cashflow';
import {
  approvalRidershipDrift,
  accessibilityCityHallDrift,
  cleanlinessApprovalDrift,
  securityRidershipDrift,
  catchmentGrowthPerQuarter,
  decaySubsystems,
  reliabilityRidershipDrift,
  reliabilityScore,
} from './agencies';
import { tickProject } from './projects';
import { ridershipModelFor } from './data';
import { processEventsForQuarter } from './events/firing';
import { applyStandingOrders } from './standingOrderActions';
import {
  snapshotAgenciesForTolerance,
  tickDirectorTolerance,
} from './directorTolerance';

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
  const fareBase = quarterlyFareRevenue(state.agencies) as unknown as number;
  const lvcN = quarterlyLvcRevenue(state.projects) as unknown as number;
  const fareN = fareBase + lvcN; // fold LVC into fareRevenue bucket for simplicity
  const opexN = quarterlyOperatingExpense(
    state.agencies,
    state.engineVars.consultantAlignment as unknown as number,
  ) as unknown as number;
  const maintN = quarterlyMaintenanceExpense(state.agencies) as unknown as number;
  const debtServiceN = quarterlyDebtService(
    debtWithRating,
    state.engineVars.openBooks,
  ) as unknown as number;
  // Phase 10.2: consultant engagement fee — flat $30M/Q while engaged.
  // Shown as a separate cash outflow so the cost is visible in the breakdown.
  const consultantFeeN = state.engineVars.consultantsEngaged ? 30 : 0;
  const netCashDelta =
    allowanceN + fareN - opexN - maintN - debtServiceN - refiFeeN - consultantFeeN;

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
    const securityDrift = securityRidershipDrift(a); // Phase 5.2
    // approval drift folded into reliability drag tracking for the breakdown
    const fromGrowth = Math.floor(before * growthPct);
    const fromReliabilityDrag = Math.floor(before * (dragPct + approvalDriftPct + securityDrift));
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
    const r = tickProject(
      p,
      nextQuarter,
      ridershipModelFor,
      state.engineVars.engineers,
      state.engineVars.crosslinxLeverage as unknown as number,
    );
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

  // Financing proceeds = tranches issued during this quarter (issuedAt
  // matches the quarter we're closing). Replaces fragile regex parsing.
  // Phase 10.4: split by purpose so the Capital Activity view doesn't
  // misleadingly show operating-bond inflows as if they funded projects.
  const currentQ = state.quarter as unknown as number;
  const tranchesIssuedThisQ = debtWithRating.tranches.filter(
    (t) => (t.issuedAt as unknown as number) === currentQ,
  );
  const operatingFinancingProceedsThisQuarter = tranchesIssuedThisQ
    .filter((t) => t.purpose === 'operating')
    .reduce((a, t) => a + (t.principal as unknown as number), 0);
  const projectFinancingProceedsThisQuarter = tranchesIssuedThisQ
    .filter((t) => t.purpose !== 'operating')
    .reduce((a, t) => a + (t.principal as unknown as number), 0);
  const financingProceedsThisQuarter =
    operatingFinancingProceedsThisQuarter + projectFinancingProceedsThisQuarter;

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

  // Compute nextBalance first so endOfQuarterMetrics can reference it
  const nextBalance = (state.cash.balance as unknown as number) + netCashDelta;

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
    endOfQuarterMetrics: {
      cashM: nextBalance,
      totalRiders: systemAfter,
      perAgencyRiders: {
        ttc: agenciesFinal.ttc.dailyRiders as unknown as number,
        go: agenciesFinal.go.dailyRiders as unknown as number,
        up: agenciesFinal.up.dailyRiders as unknown as number,
      },
      // Phase 10 financial overhaul: per-agency breakdown for drill-down.
      // NOTE: lastQuarterOpex already includes service-quality budgets via
      // cashflow.ts:quarterlyOperatingExpense, so DON'T add them again.
      perAgencyFareRevenue: {
        ttc: agenciesFinal.ttc.lastQuarterFareRevenue as unknown as number,
        go: agenciesFinal.go.lastQuarterFareRevenue as unknown as number,
        up: agenciesFinal.up.lastQuarterFareRevenue as unknown as number,
      },
      perAgencyOpex: {
        ttc: agenciesFinal.ttc.lastQuarterOpex as unknown as number,
        go: agenciesFinal.go.lastQuarterOpex as unknown as number,
        up: agenciesFinal.up.lastQuarterOpex as unknown as number,
      },
      perAgencyMaintenance: {
        ttc: agenciesFinal.ttc.subsystems.reduce((a, s) => a + (s.maintenanceBudget as unknown as number), 0),
        go: agenciesFinal.go.subsystems.reduce((a, s) => a + (s.maintenanceBudget as unknown as number), 0),
        up: agenciesFinal.up.subsystems.reduce((a, s) => a + (s.maintenanceBudget as unknown as number), 0),
      },
      allowanceByGov: {
        ottawa: allowanceN * 0.40,
        queensPark: allowanceN * 0.35,
        cityHall: allowanceN * 0.25,
      },
      projectCapexDraws: constructionDraws.reduce((a, d) => a + (d.drawn ?? 0), 0),
      projectLvcRevenue: lvcN,
      capexDrawsByTemplate: constructionDraws.reduce<Record<string, number>>(
        (acc, d) => {
          acc[d.templateId] = (acc[d.templateId] ?? 0) + (d.drawn ?? 0);
          return acc;
        },
        {},
      ),
      debtByPurpose: {
        ontarioLine: debtWithRating.tranches
          .filter((t) => t.id.startsWith('t_ol_'))
          .reduce((a, t) => a + (t.principal as unknown as number), 0),
        general: debtWithRating.tranches
          .filter((t) => !t.id.startsWith('t_ol_'))
          .reduce((a, t) => a + (t.principal as unknown as number), 0),
      },
      debtServiceByPurpose: {
        ontarioLine: quarterlyDebtService(
          { ...debtWithRating, tranches: debtWithRating.tranches.filter((t) => t.id.startsWith('t_ol_')) },
          state.engineVars.openBooks,
        ) as unknown as number,
        general: quarterlyDebtService(
          { ...debtWithRating, tranches: debtWithRating.tranches.filter((t) => !t.id.startsWith('t_ol_')) },
          state.engineVars.openBooks,
        ) as unknown as number,
      },
      financingProceeds: financingProceedsThisQuarter,
      operatingFinancingProceeds: operatingFinancingProceedsThisQuarter,
      projectFinancingProceeds: projectFinancingProceedsThisQuarter,
      trustOttawa: state.politics.ottawa.trust as unknown as number,
      trustQueensPark: state.politics.queensPark.trust as unknown as number,
      trustCityHall: state.politics.cityHall.trust as unknown as number,
      boardConfidence: state.boardConfidence.score as unknown as number,
      publicApproval: state.engineVars.publicApproval as unknown as number,
      creditRating: debtWithRating.rating,
      operatingAllowanceAnnualM: state.operatingAllowance.annualAmount as unknown as number,
    },
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

  // Phase 10: auditor scrutiny — decays -1/Q, raised by structural signals
  // that real auditors would notice: heavy refi activity, fiscal stress.
  // (Big capex draws were previously included but OL is pre-funded so the
  // player shouldn't be penalized for inherited drawdowns.)
  let scrutinyAdj = -1; // baseline decay
  if (actualTranchesRefinanced >= 3) scrutinyAdj += 3; // unusual refi volume
  if (nextBalance < 0) scrutinyAdj += 5; // fiscal stress visible
  else if (nextBalance < 200) scrutinyAdj += 2; // cash thin
  const auditorDecayed = Math.max(
    0,
    Math.min(100, (state.engineVars.auditorScrutiny as unknown as number) + scrutinyAdj),
  );

  // Phase 5.2: cleanliness budgets drift public approval each quarter.
  // Sum across agencies; clamped 0-100.
  const cleanlinessApprovalDelta =
    cleanlinessApprovalDrift(agenciesFinal.ttc) +
    cleanlinessApprovalDrift(agenciesFinal.go) +
    cleanlinessApprovalDrift(agenciesFinal.up);

  // Phase 10.2: consultant relationship dynamics.
  // - Engaged: alignment drifts +5/Q toward +50 cap
  // - Terminated: alignment drifts +3/Q back toward 0 (slow recovery from
  //   hostile state); hostile state (≤ -40) holds until recovery
  // Aligned state (≥ +30): -3 approval/Q, +1 QP trust/Q (they lobby for you)
  // Hostile state (≤ -40): -2 approval/Q, -1 QP trust/Q (lobby against you)
  const curAlignment = state.engineVars.consultantAlignment as unknown as number;
  let nextAlignment = curAlignment;
  if (state.engineVars.consultantsEngaged) {
    nextAlignment = Math.min(50, curAlignment + 5);
  } else if (curAlignment < 0) {
    nextAlignment = Math.min(0, curAlignment + 3);
  } else if (curAlignment > 0) {
    nextAlignment = Math.max(0, curAlignment - 1);
  }
  let consultantApprovalDelta = 0;
  let consultantQpDelta = 0;
  if (nextAlignment >= 30) {
    consultantApprovalDelta = -3;
    consultantQpDelta = 1;
  } else if (nextAlignment <= -40) {
    consultantApprovalDelta = -2;
    consultantQpDelta = -1;
  }

  // Phase 5.4: accessibility budget → City Hall trust drift
  const accessibilityCityHallDelta =
    accessibilityCityHallDrift(agenciesFinal.ttc) +
    accessibilityCityHallDrift(agenciesFinal.go) +
    accessibilityCityHallDrift(agenciesFinal.up);
  const newCityHallTrust = Math.max(
    0,
    Math.min(
      100,
      (state.politics.cityHall.trust as unknown as number) + accessibilityCityHallDelta,
    ),
  );
  const newQpTrust = Math.max(
    0,
    Math.min(
      100,
      (state.politics.queensPark.trust as unknown as number) + consultantQpDelta,
    ),
  );
  const politicsWithAccessibility = {
    ...state.politics,
    queensPark: {
      ...state.politics.queensPark,
      trust: score(newQpTrust),
    },
    cityHall: {
      ...state.politics.cityHall,
      trust: score(newCityHallTrust),
    },
  };
  const newPublicApproval = Math.max(
    0,
    Math.min(
      100,
      (state.engineVars.publicApproval as unknown as number) +
        cleanlinessApprovalDelta +
        consultantApprovalDelta,
    ),
  );

  const engineVarsDecayed = {
    ...state.engineVars,
    nimbyOrganization: score(nimbyDecayed),
    auditorScrutiny: score(auditorDecayed),
    publicApproval: score(newPublicApproval),
    consultantAlignment: nextAlignment as unknown as typeof state.engineVars.consultantAlignment,
  };

  // Compose the post-tick state before event processing
  const postTick: GameState = {
    ...state,
    quarter: nextQuarter,
    debt: debtWithRating,
    agencies: agenciesFinal,
    projects: tickedProjects,
    politics: politicsWithAccessibility,
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

  // Phase 6.2.2: director tolerance tick. Compares this quarter's agency
  // state against the previous quarter's snapshot to detect doctrine
  // alignment / violation.
  const prevSnapshot = snapshotAgenciesForTolerance(state);
  const afterTolerance = tickDirectorTolerance(afterEvents, prevSnapshot);

  // Apply standing orders AFTER events fire — auto-actions can react to
  // newly-fired events (e.g., autoTriageInboxBelowUrgency drains low-urgency
  // events) and to current state metrics (cash/trust).
  const ordersResult = applyStandingOrders(afterTolerance);
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
