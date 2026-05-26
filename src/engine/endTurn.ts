import type { GameState } from '@/types/gameState';
import type { Agency, Agencies } from '@/types/agency';
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
import { fullRidershipFor } from './data';

/**
 * Advance one quarter. Pure function — does not mutate input.
 *
 * Order of operations (v3.3 economic model):
 *   1. Quarter increments
 *   2. Debt: apply any maturities (auto-refi at market rate)
 *   3. Cash in: operating allowance (4-yr pact slice) + fare revenue
 *   4. Cash out: opex (excl. maintenance) + maintenance + debt service +
 *      refi fee + project construction burn
 *   5. Subsystems decay (offset by maintenance spend)
 *   6. Ridership: catchment growth + reliability drag
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
  const allowanceQ = quarterlyOperatingAllowance(state.operatingAllowance);
  const fareQ = quarterlyFareRevenue(state.agencies);

  // 4. Cash out
  const opexQ = quarterlyOperatingExpense(state.agencies);
  const maintQ = quarterlyMaintenanceExpense(state.agencies);
  const debtServiceQ = quarterlyDebtService(debtAfterMaturity);

  // 5. Subsystems decay
  const agenciesDecayed = applyToAgencies(state.agencies, decaySubsystems);

  // 6. Ridership: growth offsets reliability drag
  const agenciesWithRidership = applyToAgencies(agenciesDecayed, (a) => {
    const reliability = reliabilityScore(a);
    const dragPct = reliabilityRidershipDrift(reliability);
    const growthPct = catchmentGrowthPerQuarter(a.catchmentGrowthRate);
    const netPct = growthPct + dragPct;
    const before = a.dailyRiders as unknown as number;
    const next = Math.max(0, Math.floor(before * (1 + netPct)));
    return { ...a, dailyRiders: riders(next) };
  });

  // 7. Project ticks — project burn draws from each project's funding pool
  // (set at break-ground from accepted financing), NOT from operating cash.
  // Operating cash only sees opex / maint / debt service / refi fees.
  let openingRidershipDelta = 0;
  const tickedProjects = state.projects.map((p) => {
    const r = tickProject(p, nextQuarter, fullRidershipFor);
    openingRidershipDelta += r.ridershipDelta;
    return r.project;
  });

  // Distribute opening ridership to TTC (Ontario Line is a TTC-integrated asset)
  const agenciesAfterOpening =
    openingRidershipDelta > 0
      ? {
          ...agenciesWithRidership,
          ttc: {
            ...agenciesWithRidership.ttc,
            dailyRiders: riders(
              (agenciesWithRidership.ttc.dailyRiders as unknown as number) +
                openingRidershipDelta,
            ),
          },
        }
      : agenciesWithRidership;

  // 8. Net cash flow (operating side only — project burn is funding-pool draw)
  const cashIn = (allowanceQ as unknown as number) + (fareQ as unknown as number);
  const cashOut =
    (opexQ as unknown as number) +
    (maintQ as unknown as number) +
    (debtServiceQ as unknown as number) +
    (refiFee as unknown as number);
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
