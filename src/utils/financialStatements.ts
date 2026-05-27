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
  // Phase 10 fix: walk player_action entries to attribute bond proceeds + refi
  // fees per quarter (capex draws come straight from quarter_summary breakdown).
  // Bond issuance and refi were the only player_actions that move cash on the
  // financing side. Lobby actions (favor, ad-hoc) move cash too — treat those
  // as operating cash for simplicity.
  const financingByQuarter = new Map<number, { proceeds: number }>();
  for (const e of state.actionLog) {
    if (e.kind !== 'player_action') continue;
    const q = e.quarter as unknown as number;
    if (e.action.startsWith('issueOperatingBond:') || e.action.startsWith('autoIssueBond:')) {
      // Parse "+$XM cash" out of the summary
      const match = e.summary.match(/\+\$([\d,]+)M/);
      if (match) {
        const amount = Number(match[1]!.replace(/,/g, ''));
        const cur = financingByQuarter.get(q) ?? { proceeds: 0 };
        financingByQuarter.set(q, { proceeds: cur.proceeds + amount });
      }
    }
  }
  for (const entry of summaries) {
    if (entry.kind !== 'quarter_summary') continue;
    const b = entry.breakdown;
    const cf = b.cashFlow;
    const m = b.endOfQuarterMetrics;
    if (!m) continue;
    const q = entry.quarter as unknown as number;
    const totalRevenue = cf.operatingAllowance + cf.fareRevenue;
    const operatingIncome = totalRevenue - cf.operatingExpense - cf.maintenance;
    const netIncome = operatingIncome - cf.debtService - cf.refiFee;
    const capexDraws = b.projects.constructionDraws.reduce(
      (acc, d) => acc + (d.drawn ?? 0),
      0,
    );
    const financingProceeds = financingByQuarter.get(q)?.proceeds ?? 0;
    cols.push({
      quarter: q,
      label: quarterLabel(q),
      operatingAllowance: cf.operatingAllowance,
      fareRevenue: cf.fareRevenue,
      totalRevenue,
      opex: cf.operatingExpense,
      maintenance: cf.maintenance,
      operatingIncome,
      interestExpense: cf.debtService,
      netIncome,
      cashFromOperations: operatingIncome - cf.debtService,
      capexDraws,
      financingProceeds,
      refiFee: cf.refiFee,
      netCashFlow: cf.netDelta,
      endingCash: m.cashM,
      totalDebt: 0,
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
