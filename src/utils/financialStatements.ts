import type { GameState } from '@/types/gameState';
import { effectiveCouponBp } from '@engine/finance';

/**
 * Financial statements derived from action log + state. Phase 10.
 *
 * For each quarter with a quarter_summary entry, computes:
 *   - P&L: revenue (allowance + fare) − opex − maintenance − interest = net income
 *   - Cash flow: operating + capex (construction draws) + financing (bond proceeds)
 *   - Balance sheet (point-in-time, end of quarter): cash + project book value vs debt
 *
 * Quarters are columns; statements are rows.
 */

export interface QuarterCol {
  quarter: number;
  label: string;
  // P&L (all $M)
  operatingAllowance: number;
  fareRevenue: number;
  totalRevenue: number;
  opex: number;
  maintenance: number;
  operatingIncome: number;
  interestExpense: number;
  netIncome: number;
  // Cash flow ($M)
  cashFromOperations: number;
  capexDraws: number;
  financingProceeds: number;
  refiFee: number;
  netCashFlow: number;
  endingCash: number;
  // Balance sheet end-of-quarter ($M)
  totalDebt: number;
  projectsInFlightBookValue: number;
}

function quarterLabel(q: number): string {
  const year = 2026 + Math.floor(q / 4);
  const qq = (q % 4) + 1;
  return `Q${qq} ${year}`;
}

export function buildFinancialStatements(state: GameState, lastNQuarters = 8): QuarterCol[] {
  const cols: QuarterCol[] = [];
  const summaries = state.actionLog.filter((e) => e.kind === 'quarter_summary');
  for (const entry of summaries) {
    if (entry.kind !== 'quarter_summary') continue;
    const b = entry.breakdown;
    const cf = b.cashFlow;
    const m = b.endOfQuarterMetrics;
    if (!m) continue;
    const totalRevenue = cf.operatingAllowance + cf.fareRevenue;
    const operatingIncome = totalRevenue - cf.operatingExpense - cf.maintenance;
    const netIncome = operatingIncome - cf.debtService - cf.refiFee;
    cols.push({
      quarter: entry.quarter as unknown as number,
      label: quarterLabel(entry.quarter as unknown as number),
      operatingAllowance: cf.operatingAllowance,
      fareRevenue: cf.fareRevenue,
      totalRevenue,
      opex: cf.operatingExpense,
      maintenance: cf.maintenance,
      operatingIncome,
      interestExpense: cf.debtService,
      netIncome,
      cashFromOperations: operatingIncome - cf.debtService,
      capexDraws: 0, // approximated — construction draws hit cash but per-Q breakdown isn't separately stored
      financingProceeds: 0,
      refiFee: cf.refiFee,
      netCashFlow: cf.netDelta,
      endingCash: m.cashM,
      totalDebt: 0, // computed live below
      projectsInFlightBookValue: 0,
    });
  }
  // Backfill point-in-time balance sheet items from current state for the
  // most recent quarter only (we don't store per-Q debt snapshots).
  if (cols.length > 0) {
    const currentDebt = state.debt.tranches.reduce(
      (acc, t) => acc + (t.principal as unknown as number),
      0,
    );
    const projectsBookValue = state.projects.reduce((acc, p) => {
      if (p.state === 'under_construction') return acc + (p.spent as unknown as number);
      if (p.state === 'operating') return acc + (p.finalCost as unknown as number);
      return acc;
    }, 0);
    cols[cols.length - 1]!.totalDebt = currentDebt;
    cols[cols.length - 1]!.projectsInFlightBookValue = projectsBookValue;
  }
  return cols.slice(-lastNQuarters);
}

/** Weighted-average effective interest rate across the debt portfolio. */
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
