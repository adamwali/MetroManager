import type { GameState } from '@/types/gameState';
import type { Agency, Agencies, AgencyId } from '@/types/agency';
import type { ActionLogEntry, QuarterSummaryBreakdown } from '@/types/actionLog';
import { cash, quarter, riders } from '@/types/scalars';
import { applyMaturities, quarterlyDebtService } from './finance';
import {
  quarterlyFareRevenue,
  quarterlyMaintenanceExpense,
  quarterlyOperatingAllowance,
  quarterlyOperatingExpense,
} from './cashflow';
import {
  catchmentGrowthPerQuarter,
  decaySubsystems,
  reliabilityRidershipDrift,
  reliabilityScore,
} from './agencies';
import { tickProject } from './projects';
import { ridershipModelFor } from './data';

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
  const { debt: debtAfterMaturity, refiFee } = applyMaturities(
    state.debt,
    nextQuarter as unknown as number,
  );
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
  const debtServiceN = quarterlyDebtService(debtAfterMaturity) as unknown as number;
  const netCashDelta = allowanceN + fareN - opexN - maintN - debtServiceN - refiFeeN;

  // 4. Decay subsystems
  const agenciesDecayed = applyToAgencies(state.agencies, decaySubsystems);

  // 5. Per-agency ridership: growth + reliability drag, separately tracked
  type AgencyTracking = {
    before: number;
    fromGrowth: number;
    fromReliabilityDrag: number;
    afterOrganic: number;
  };
  const organicTracking = {} as Record<AgencyId, AgencyTracking>;
  const agenciesWithOrganicRidership = applyToAgencies(agenciesDecayed, (a) => {
    const before = a.dailyRiders as unknown as number;
    const reliability = reliabilityScore(a);
    const dragPct = reliabilityRidershipDrift(reliability);
    const growthPct = catchmentGrowthPerQuarter(a.catchmentGrowthRate);
    const fromGrowth = Math.floor(before * growthPct);
    const fromReliabilityDrag = Math.floor(before * dragPct);
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
    const r = tickProject(p, nextQuarter, ridershipModelFor);
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

  return {
    ...state,
    quarter: nextQuarter,
    debt: debtAfterMaturity,
    agencies: agenciesFinal,
    projects: tickedProjects,
    cash: { balance: cash(nextBalance), lastQuarterDelta: cash(netCashDelta) },
    actionLog: [...state.actionLog, summaryEntry],
    nextLogId: state.nextLogId + 1,
  };
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
