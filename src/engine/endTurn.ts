import type { GameState } from '@/types/gameState';
import type { Agency, Agencies } from '@/types/agency';
import { cash, quarter, riders } from '@/types/scalars';
import { applyMaturities, quarterlyDebtService } from './finance';
import {
  quarterlyFareRevenue,
  quarterlyGovernmentInflow,
  quarterlyMaintenanceExpense,
  quarterlyOperatingExpense,
} from './cashflow';
import { decaySubsystems, reliabilityRidershipDrift, reliabilityScore } from './agencies';
import { tickProject } from './projects';
import { fullRidershipFor } from './data';

/**
 * Advance one quarter. Pure function — does not mutate input.
 *
 * Order of operations:
 *   1. Quarter increments
 *   2. Debt: apply any maturities (auto-refi at market rate)
 *   3. Cash in: government inflow, fare revenue
 *   4. Cash out: opex, maintenance, debt service, refi fees
 *   5. Subsystems decay (offset by maintenance spend)
 *   6. Ridership drift from reliability
 *   7. Project ticks (construction spend, transitions, ramp)
 *   8. Compute lastQuarterDelta and update cash balance
 */
export function endTurn(state: GameState): GameState {
  const nextQuarter = quarter((state.quarter as unknown as number) + 1);

  // 2. Maturities first so debt service uses the post-refi portfolio
  const { debt: debtAfterMaturity, refiFee } = applyMaturities(
    state.debt,
    nextQuarter as unknown as number,
  );

  // 3. Cash in
  const inflowQ = quarterlyGovernmentInflow(nextQuarter);
  const fareQ = quarterlyFareRevenue(state.agencies);

  // 4. Cash out (pre-tick of project burn — that's added below)
  const opexQ = quarterlyOperatingExpense(state.agencies);
  const maintQ = quarterlyMaintenanceExpense(state.agencies);
  const debtServiceQ = quarterlyDebtService(debtAfterMaturity);

  // 5. Subsystems decay
  const agenciesDecayed = applyToAgencies(state.agencies, decaySubsystems);

  // 6. Ridership drift from reliability
  const agenciesWithDrift = applyToAgencies(agenciesDecayed, (a) => {
    const reliability = reliabilityScore(a);
    const driftPct = reliabilityRidershipDrift(reliability);
    const before = a.dailyRiders as unknown as number;
    const next = Math.max(0, Math.floor(before * (1 + driftPct)));
    return { ...a, dailyRiders: riders(next) };
  });

  // 7. Project ticks
  let projectSpendThisQuarter = 0;
  let openingRidershipDelta = 0;
  const tickedProjects = state.projects.map((p) => {
    const r = tickProject(p, nextQuarter, fullRidershipFor);
    projectSpendThisQuarter += r.spentThisQuarter as unknown as number;
    openingRidershipDelta += r.ridershipDelta;
    return r.project;
  });

  // Distribute new opening ridership to TTC (Ontario Line is a TTC asset by integration)
  const agenciesAfterOpening = openingRidershipDelta > 0
    ? {
        ...agenciesWithDrift,
        ttc: {
          ...agenciesWithDrift.ttc,
          dailyRiders: riders(
            (agenciesWithDrift.ttc.dailyRiders as unknown as number) + openingRidershipDelta,
          ),
        },
      }
    : agenciesWithDrift;

  // 8. Net cash flow
  const cashIn = (inflowQ as unknown as number) + (fareQ as unknown as number);
  const cashOut =
    (opexQ as unknown as number) +
    (maintQ as unknown as number) +
    (debtServiceQ as unknown as number) +
    (refiFee as unknown as number) +
    projectSpendThisQuarter;
  const delta = cashIn - cashOut;
  const nextBalance = (state.cash.balance as unknown as number) + delta;

  return {
    ...state,
    quarter: nextQuarter,
    debt: debtAfterMaturity,
    agencies: agenciesAfterOpening,
    projects: tickedProjects,
    cash: { balance: cash(nextBalance), lastQuarterDelta: cash(delta) },
  };
}

function applyToAgencies(agencies: Agencies, fn: (a: Agency) => Agency): Agencies {
  return { ttc: fn(agencies.ttc), go: fn(agencies.go), up: fn(agencies.up) };
}
