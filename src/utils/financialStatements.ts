import type { GameState } from '@/types/gameState';
import type { AgencyId } from '@/types/agency';
import { effectiveCouponBp, quarterlyDebtService } from '@engine/finance';
import { quarterlyOperatingAllowance } from '@engine/cashflow';

/**
 * Financial statements derived from action log + state. Phase 10 overhaul.
 *
 * Supports drill-down by scope (consolidated / per-agency / capital).
 * Forecast columns project N quarters forward using current run-rates.
 */

export type FinancialScope = 'consolidated' | 'ttc' | 'go' | 'up' | 'capital';

export interface PnlCol {
  quarter: number;
  label: string;
  isForecast: boolean;
  // Revenue
  allowanceOttawa: number;
  allowanceQp: number;
  allowanceCityHall: number;
  fareRevenue: number;
  lvcRevenue: number;
  totalRevenue: number;
  // Operating expenses
  opex: number;
  maintenance: number;
  operatingIncome: number;
  // Below operating income
  interestExpense: number;
  netIncome: number;
}

export interface CapitalCol {
  quarter: number;
  label: string;
  isForecast: boolean;
  /** OL draws shown as their own row (P00 inherited mega project). */
  ontarioLineDraws: number;
  otherCapexDraws: number;
  totalCapexDraws: number;
  /** OL inherited debt service ($M/Q) — pre-existing commitment. */
  ontarioLineDebtService: number;
  otherDebtService: number;
  financingProceeds: number;
  refiFee: number;
  netCapitalFlow: number;
  endingCash: number;
  /** Forecast cash band from Monte Carlo (forecast cols only). */
  cashMin?: number;
  cashMax?: number;
}

function quarterLabel(quarterIndex: number): string {
  const year = 2026 + Math.floor(quarterIndex / 4);
  const q = (quarterIndex % 4) + 1;
  return `Q${q} ${year}`;
}

/**
 * Build operating P&L columns for the given scope.
 * Includes historical quarters from action log + forecast quarters
 * projected from latest run-rate.
 */
export function buildOperatingPnl(
  state: GameState,
  scope: FinancialScope,
  pastQuarters = 6,
  forecastQuarters = 4,
): PnlCol[] {
  const cols: PnlCol[] = [];
  const summaries = state.actionLog.filter((e) => e.kind === 'quarter_summary');

  // Bond proceeds aren't on a P&L (financing activity), but we capture them
  // for the Capital view via cashFlowStatement below.
  for (const entry of summaries) {
    if (entry.kind !== 'quarter_summary') continue;
    const b = entry.breakdown;
    const m = b.endOfQuarterMetrics;
    if (!m) continue;

    const allowanceByGov = m.allowanceByGov ?? {
      ottawa: b.cashFlow.operatingAllowance * 0.4,
      queensPark: b.cashFlow.operatingAllowance * 0.35,
      cityHall: b.cashFlow.operatingAllowance * 0.25,
    };
    const perAgencyFare = m.perAgencyFareRevenue;
    const perAgencyOpex = m.perAgencyOpex;
    const perAgencyMaint = m.perAgencyMaintenance;
    const lvcRevenue = m.projectLvcRevenue ?? 0;

    let allowanceOttawa = allowanceByGov.ottawa;
    let allowanceQp = allowanceByGov.queensPark;
    let allowanceCityHall = allowanceByGov.cityHall;
    let fareRevenue: number;
    let opex: number;
    let maintenance: number;
    const interestExpense = b.cashFlow.debtService;

    if (scope === 'consolidated') {
      fareRevenue = b.cashFlow.fareRevenue;
      opex = b.cashFlow.operatingExpense;
      maintenance = b.cashFlow.maintenance;
    } else if (scope === 'capital') {
      // Capital scope has no operating P&L; skip
      continue;
    } else {
      const agencyId = scope as AgencyId;
      fareRevenue = perAgencyFare?.[agencyId] ?? 0;
      opex = perAgencyOpex?.[agencyId] ?? 0;
      maintenance = perAgencyMaint?.[agencyId] ?? 0;
      // Per-agency P&L shows allowance only as memo (system pool); zero out
      allowanceOttawa = 0;
      allowanceQp = 0;
      allowanceCityHall = 0;
    }

    const totalRevenue = allowanceOttawa + allowanceQp + allowanceCityHall + fareRevenue +
      (scope === 'consolidated' ? lvcRevenue : 0);
    const operatingIncome = totalRevenue - opex - maintenance;
    const netIncome = operatingIncome - (scope === 'consolidated' ? interestExpense : 0);

    cols.push({
      quarter: entry.quarter as unknown as number,
      label: quarterLabel(entry.quarter as unknown as number),
      isForecast: false,
      allowanceOttawa,
      allowanceQp,
      allowanceCityHall,
      fareRevenue,
      lvcRevenue: scope === 'consolidated' ? lvcRevenue : 0,
      totalRevenue,
      opex,
      maintenance,
      operatingIncome,
      interestExpense: scope === 'consolidated' ? interestExpense : 0,
      netIncome,
    });
  }

  const historical = cols.slice(-pastQuarters);

  // Forecast: linear projection from last historical column
  const forecast: PnlCol[] = [];
  if (historical.length > 0) {
    const last = historical[historical.length - 1]!;
    const currentQ = state.quarter as unknown as number;
    for (let i = 1; i <= forecastQuarters; i++) {
      const fq = currentQ + i;
      forecast.push({
        ...last,
        quarter: fq,
        label: quarterLabel(fq),
        isForecast: true,
      });
    }
  } else {
    // No history yet — produce one forecast column showing current rates
    const currentQ = state.quarter as unknown as number;
    const allowanceQ = quarterlyOperatingAllowance(state.operatingAllowance) as unknown as number;
    const debtQ = quarterlyDebtService(state.debt, state.engineVars.openBooks) as unknown as number;
    let fareRevenue = 0;
    let opex = 0;
    let maintenance = 0;
    if (scope === 'consolidated') {
      fareRevenue = (state.agencies.ttc.lastQuarterFareRevenue as unknown as number) +
        (state.agencies.go.lastQuarterFareRevenue as unknown as number) +
        (state.agencies.up.lastQuarterFareRevenue as unknown as number);
      opex = (state.agencies.ttc.lastQuarterOpex as unknown as number) +
        (state.agencies.go.lastQuarterOpex as unknown as number) +
        (state.agencies.up.lastQuarterOpex as unknown as number);
      maintenance = ['ttc', 'go', 'up'].reduce((acc, id) => {
        const a = state.agencies[id as AgencyId];
        return acc + a.subsystems.reduce((s, sub) => s + (sub.maintenanceBudget as unknown as number), 0);
      }, 0);
    } else if (scope !== 'capital') {
      const agency = state.agencies[scope as AgencyId];
      fareRevenue = agency.lastQuarterFareRevenue as unknown as number;
      opex = agency.lastQuarterOpex as unknown as number;
      maintenance = agency.subsystems.reduce((s, sub) => s + (sub.maintenanceBudget as unknown as number), 0);
    }
    for (let i = 1; i <= forecastQuarters; i++) {
      const fq = currentQ + i;
      const allowanceOttawa = scope === 'consolidated' ? allowanceQ * 0.4 : 0;
      const allowanceQp = scope === 'consolidated' ? allowanceQ * 0.35 : 0;
      const allowanceCityHall = scope === 'consolidated' ? allowanceQ * 0.25 : 0;
      const totalRevenue = allowanceOttawa + allowanceQp + allowanceCityHall + fareRevenue;
      const operatingIncome = totalRevenue - opex - maintenance;
      forecast.push({
        quarter: fq,
        label: quarterLabel(fq),
        isForecast: true,
        allowanceOttawa,
        allowanceQp,
        allowanceCityHall,
        fareRevenue,
        lvcRevenue: 0,
        totalRevenue,
        opex,
        maintenance,
        operatingIncome,
        interestExpense: scope === 'consolidated' ? debtQ : 0,
        netIncome: operatingIncome - (scope === 'consolidated' ? debtQ : 0),
      });
    }
  }

  return [...historical, ...forecast];
}

/** Capital activity columns (capex + financing flows). Phase 10.1. */
export function buildCapitalActivity(
  state: GameState,
  pastQuarters = 6,
  forecastQuarters = 4,
  forecastCashPoints?: { quarter: number; cashMedian: number; cashMin: number; cashMax: number }[],
): CapitalCol[] {
  const cols: CapitalCol[] = [];
  const summaries = state.actionLog.filter((e) => e.kind === 'quarter_summary');
  for (const entry of summaries) {
    if (entry.kind !== 'quarter_summary') continue;
    const b = entry.breakdown;
    const m = b.endOfQuarterMetrics;
    if (!m) continue;
    const q = entry.quarter as unknown as number;

    // New cleaner fields with backfill for pre-Phase-10.1 saves
    const drawsByTpl = m.capexDrawsByTemplate ?? {};
    const ontarioLineDraws = drawsByTpl['P00'] ?? 0;
    const totalCapexDraws =
      m.projectCapexDraws ??
      b.projects.constructionDraws.reduce((a, d) => a + (d.drawn ?? 0), 0);
    const otherCapexDraws = totalCapexDraws - ontarioLineDraws;
    const dsByPurpose = m.debtServiceByPurpose ?? {
      ontarioLine: 0,
      general: b.cashFlow.debtService,
    };
    const financingProceeds = m.financingProceeds ?? 0;

    cols.push({
      quarter: q,
      label: quarterLabel(q),
      isForecast: false,
      ontarioLineDraws,
      otherCapexDraws,
      totalCapexDraws,
      ontarioLineDebtService: dsByPurpose.ontarioLine,
      otherDebtService: dsByPurpose.general,
      financingProceeds,
      refiFee: b.cashFlow.refiFee,
      netCapitalFlow: financingProceeds - totalCapexDraws - b.cashFlow.refiFee,
      endingCash: m.cashM,
    });
  }
  const historical = cols.slice(-pastQuarters);

  if (forecastQuarters > 0 && historical.length > 0 && forecastCashPoints) {
    const last = historical[historical.length - 1]!;
    for (const pt of forecastCashPoints.slice(0, forecastQuarters)) {
      historical.push({
        quarter: pt.quarter,
        label: quarterLabel(pt.quarter),
        isForecast: true,
        ontarioLineDraws: last.ontarioLineDraws,
        otherCapexDraws: last.otherCapexDraws,
        totalCapexDraws: last.totalCapexDraws,
        ontarioLineDebtService: last.ontarioLineDebtService,
        otherDebtService: last.otherDebtService,
        financingProceeds: 0,
        refiFee: 0,
        netCapitalFlow: -last.totalCapexDraws - last.ontarioLineDebtService - last.otherDebtService,
        endingCash: pt.cashMedian,
        cashMin: pt.cashMin,
        cashMax: pt.cashMax,
      });
    }
  }
  return historical;
}

/** Weighted-average effective interest rate. */
export function weightedAverageRateBp(state: GameState): number {
  const total = state.debt.tranches.reduce(
    (acc, t) => acc + (t.principal as unknown as number),
    0,
  );
  if (total === 0) return 0;
  const weighted = state.debt.tranches.reduce((acc, t) => {
    const eff = effectiveCouponBp(t, state.debt.bocPolicyRate, state.engineVars.openBooks) as unknown as number;
    return acc + eff * (t.principal as unknown as number);
  }, 0);
  return weighted / total;
}
