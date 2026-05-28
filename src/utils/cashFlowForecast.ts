import type { GameState } from '@/types/gameState';
import {
  quarterlyFareRevenue,
  quarterlyLvcRevenue,
  quarterlyMaintenanceExpense,
  quarterlyOperatingAllowance,
  quarterlyOperatingExpense,
} from '@engine/cashflow';
import { quarterlyDebtService } from '@engine/finance';

/**
 * Live quarterly cash-flow forecast. Phase 10.9.
 *
 * Pure derivation from current state — so when the player moves a slider
 * (maintenance, fares, staffing) or toggles consultants, this recomputes
 * immediately and the UI updates. This is the "driver's seat" widget:
 * you see your run-rate now and where next quarter lands BEFORE ending it.
 *
 * Excludes one-off / random items: events, refi fees, project draws (those
 * come from the project funding pool, not operating cash). It's the
 * structural run-rate, which is exactly what the player's settings control.
 */
export interface CashFlowForecast {
  // Inflows
  allowance: number;
  fareRevenue: number;
  lvcRevenue: number;
  totalInflow: number;
  // Outflows
  opex: number;
  maintenance: number;
  debtService: number;
  consultantFee: number;
  engineerSalary: number;
  totalOutflow: number;
  // Bottom line
  net: number;
  currentCash: number;
  projectedCashNextQuarter: number;
}

const ENGINEER_BASELINE = 180;
const ENGINEER_SALARY_PER_Q_M = 0.1;
const CONSULTANT_FEE_PER_Q_M = 30;

export function projectQuarterlyCashFlow(state: GameState): CashFlowForecast {
  const allowance = quarterlyOperatingAllowance(state.operatingAllowance) as unknown as number;
  const fareRevenue = quarterlyFareRevenue(state.agencies) as unknown as number;
  const lvcRevenue = quarterlyLvcRevenue(state.projects) as unknown as number;
  const opex = quarterlyOperatingExpense(
    state.agencies,
    state.engineVars.consultantAlignment as unknown as number,
  ) as unknown as number;
  const maintenance = quarterlyMaintenanceExpense(state.agencies) as unknown as number;
  const debtService = quarterlyDebtService(
    state.debt,
    state.engineVars.openBooks,
  ) as unknown as number;
  const consultantFee = state.engineVars.consultantsEngaged ? CONSULTANT_FEE_PER_Q_M : 0;
  const engineerSalary =
    (state.engineVars.engineers - ENGINEER_BASELINE) * ENGINEER_SALARY_PER_Q_M;

  const totalInflow = allowance + fareRevenue + lvcRevenue;
  const totalOutflow = opex + maintenance + debtService + consultantFee + engineerSalary;
  const net = totalInflow - totalOutflow;
  const currentCash = state.cash.balance as unknown as number;

  return {
    allowance,
    fareRevenue,
    lvcRevenue,
    totalInflow,
    opex,
    maintenance,
    debtService,
    consultantFee,
    engineerSalary,
    totalOutflow,
    net,
    currentCash,
    projectedCashNextQuarter: currentCash + net,
  };
}
