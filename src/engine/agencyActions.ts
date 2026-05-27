import type { GameState } from '@/types/gameState';
import type { AgencyId, FarePolicyTier, SubsystemId } from '@/types/agency';
import { cash, riders } from '@/types/scalars';
import {
  AGENCY_FARE_ELASTICITY,
  FARE_PRICE_MULTIPLIER,
  FREQUENCY_OPEX_MULTIPLIER,
  FREQUENCY_RIDERSHIP_MULTIPLIER,
  type FrequencyPolicy,
} from './policies';
import { applyEffects } from './events/effects';

/**
 * Pure functions for the proactive operations levers introduced in
 * Phase 5.1. Each returns a new GameState; UI dispatches via the Zustand
 * store, which autosaves on apply.
 */

/** Maintenance budget per subsystem. UI slider drives this. */
export function setMaintenanceBudget(
  state: GameState,
  agencyId: AgencyId,
  subsystemId: SubsystemId,
  amountM: number,
): GameState {
  const safe = Math.max(0, Math.round(amountM));
  const agency = state.agencies[agencyId];
  const subsystems = agency.subsystems.map((s) =>
    s.id === subsystemId ? { ...s, maintenanceBudget: cash(safe) } : s,
  );
  return {
    ...state,
    agencies: { ...state.agencies, [agencyId]: { ...agency, subsystems } },
  };
}

/**
 * Returns the obligation that would break if the player changed fare
 * policy for this agency in this direction, or undefined if none.
 *
 * Only fare HIKES break the freeze pledge — reducing fares doesn't.
 */
export function fareFreezeObligationBroken(
  state: GameState,
  agencyId: AgencyId,
  newPolicy: FarePolicyTier,
):
  | (NonNullable<GameState['activeObligations'][number]> & { kind: 'fareFreezePledge' })
  | undefined {
  const agency = state.agencies[agencyId];
  const oldPolicy = agency.operatingParams.farePolicy;
  const oldMul = FARE_PRICE_MULTIPLIER[oldPolicy];
  const newMul = FARE_PRICE_MULTIPLIER[newPolicy];
  if (newMul <= oldMul) return undefined; // No hike — pledge not broken
  const currentQ = state.quarter as unknown as number;
  for (const obl of state.activeObligations) {
    if (obl.kind !== 'fareFreezePledge') continue;
    if (obl.agencyId !== agencyId) continue;
    if ((obl.expiresAt as unknown as number) <= currentQ) continue;
    return obl as typeof obl & { kind: 'fareFreezePledge' };
  }
  return undefined;
}

/**
 * Change fare policy. Triggers an immediate ridership shift via elasticity
 * and revenue recompute. If a fare-freeze pledge is active for this agency
 * and the new policy is a HIKE, the obligation's `costOfBreaking` effects
 * apply immediately (-City Hall trust, -public approval, etc.) and the
 * pledge is consumed (removed from activeObligations).
 *
 * Player isn't blocked — they're informed via the UI before they click.
 */
export function setFarePolicy(
  state: GameState,
  agencyId: AgencyId,
  newPolicy: FarePolicyTier,
): GameState {
  const agency = state.agencies[agencyId];
  const oldPolicy = agency.operatingParams.farePolicy;
  if (oldPolicy === newPolicy) return state;

  const oldMul = FARE_PRICE_MULTIPLIER[oldPolicy];
  const newMul = FARE_PRICE_MULTIPLIER[newPolicy];
  const priceChangePct = (newMul - oldMul) / oldMul;
  const elasticity = AGENCY_FARE_ELASTICITY[agencyId];
  const ridershipFactor = 1 + elasticity * priceChangePct;

  const oldRiders = agency.dailyRiders as unknown as number;
  const newRiders = Math.max(0, Math.round(oldRiders * ridershipFactor));

  const oldFareRev = agency.lastQuarterFareRevenue as unknown as number;
  const newFareRev = Math.max(0, Math.round(oldFareRev * (newMul / oldMul) * ridershipFactor));

  let next: GameState = {
    ...state,
    agencies: {
      ...state.agencies,
      [agencyId]: {
        ...agency,
        dailyRiders: riders(newRiders),
        lastQuarterFareRevenue: cash(newFareRev),
        operatingParams: { ...agency.operatingParams, farePolicy: newPolicy },
      },
    },
  };

  // Check + apply pledge-breaking cost
  const brokenObligation = fareFreezeObligationBroken(state, agencyId, newPolicy);
  if (brokenObligation) {
    next = applyEffects(next, brokenObligation.costOfBreaking);
    // Consume the pledge once broken
    next = {
      ...next,
      activeObligations: next.activeObligations.filter((o) => o.id !== brokenObligation.id),
    };
  }
  return next;
}

/**
 * Change frequency policy. Triggers immediate ridership shift (more service
 * → more riders) and opex shift (more service → more cost).
 */
export function setFrequencyPolicy(
  state: GameState,
  agencyId: AgencyId,
  newPolicy: FrequencyPolicy,
): GameState {
  const agency = state.agencies[agencyId];
  const oldPolicy = agency.operatingParams.frequencyPolicy;
  if (oldPolicy === newPolicy) return state;

  const oldOpexMul = FREQUENCY_OPEX_MULTIPLIER[oldPolicy];
  const newOpexMul = FREQUENCY_OPEX_MULTIPLIER[newPolicy];
  const oldRidershipMul = FREQUENCY_RIDERSHIP_MULTIPLIER[oldPolicy];
  const newRidershipMul = FREQUENCY_RIDERSHIP_MULTIPLIER[newPolicy];

  const oldOpex = agency.lastQuarterOpex as unknown as number;
  const newOpex = Math.max(0, Math.round((oldOpex * newOpexMul) / oldOpexMul));

  // Phase 6.3.1: enforce costCap control from renegotiation outcome.
  // Block opex-increasing frequency changes that would push total opex
  // above the cap. Player must wait for control to expire.
  const costCap = state.operatingAllowance.controls.find((c) => c.kind === 'costCap');
  if (costCap && costCap.kind === 'costCap' && newOpex > oldOpex) {
    const totalNewOpexAcrossAgencies =
      newOpex +
      Object.entries(state.agencies)
        .filter(([id]) => id !== agencyId)
        .reduce((acc, [, a]) => acc + (a.lastQuarterOpex as unknown as number), 0);
    const cap = costCap.capPerQuarter as unknown as number;
    if (totalNewOpexAcrossAgencies > cap) return state;
  }

  const oldFareRev = agency.lastQuarterFareRevenue as unknown as number;
  const ridershipRatio = newRidershipMul / oldRidershipMul;
  const oldRiders = agency.dailyRiders as unknown as number;
  const newRiders = Math.max(0, Math.round(oldRiders * ridershipRatio));
  const newFareRev = Math.max(0, Math.round(oldFareRev * ridershipRatio));

  return {
    ...state,
    agencies: {
      ...state.agencies,
      [agencyId]: {
        ...agency,
        dailyRiders: riders(newRiders),
        lastQuarterOpex: cash(newOpex),
        lastQuarterFareRevenue: cash(newFareRev),
        operatingParams: { ...agency.operatingParams, frequencyPolicy: newPolicy },
      },
    },
  };
}

/** Forecast: how would fareRevenue and ridership shift if player picked this policy? */
export function forecastFarePolicy(
  state: GameState,
  agencyId: AgencyId,
  newPolicy: FarePolicyTier,
): { newRiders: number; newFareRev: number; ridershipChangePct: number; revenueChangePct: number } {
  const agency = state.agencies[agencyId];
  const oldPolicy = agency.operatingParams.farePolicy;
  const oldMul = FARE_PRICE_MULTIPLIER[oldPolicy];
  const newMul = FARE_PRICE_MULTIPLIER[newPolicy];
  const priceChangePct = (newMul - oldMul) / oldMul;
  const elasticity = AGENCY_FARE_ELASTICITY[agencyId];
  const ridershipFactor = 1 + elasticity * priceChangePct;
  const oldRiders = agency.dailyRiders as unknown as number;
  const oldFareRev = agency.lastQuarterFareRevenue as unknown as number;
  const newRiders = Math.round(oldRiders * ridershipFactor);
  const newFareRev = Math.round(oldFareRev * (newMul / oldMul) * ridershipFactor);
  return {
    newRiders,
    newFareRev,
    ridershipChangePct: ridershipFactor - 1,
    revenueChangePct: (newMul / oldMul) * ridershipFactor - 1,
  };
}

/** Forecast: opex + ridership impact of frequency change. */
export function forecastFrequencyPolicy(
  state: GameState,
  agencyId: AgencyId,
  newPolicy: FrequencyPolicy,
): { newOpex: number; newRiders: number; opexChangePct: number; ridershipChangePct: number } {
  const agency = state.agencies[agencyId];
  const oldPolicy = agency.operatingParams.frequencyPolicy;
  const oldOpexMul = FREQUENCY_OPEX_MULTIPLIER[oldPolicy];
  const newOpexMul = FREQUENCY_OPEX_MULTIPLIER[newPolicy];
  const oldRidershipMul = FREQUENCY_RIDERSHIP_MULTIPLIER[oldPolicy];
  const newRidershipMul = FREQUENCY_RIDERSHIP_MULTIPLIER[newPolicy];
  const opexRatio = newOpexMul / oldOpexMul;
  const ridershipRatio = newRidershipMul / oldRidershipMul;
  const oldOpex = agency.lastQuarterOpex as unknown as number;
  const oldRiders = agency.dailyRiders as unknown as number;
  return {
    newOpex: Math.round(oldOpex * opexRatio),
    newRiders: Math.round(oldRiders * ridershipRatio),
    opexChangePct: opexRatio - 1,
    ridershipChangePct: ridershipRatio - 1,
  };
}


/**
 * Phase 5.2: set security or cleanliness budget on an agency. These
 * directly hit opex (added to lastQuarterOpex calculation) and drive
 * approval/ridership drift each quarter.
 */
export function setSecurityBudget(
  state: GameState,
  agencyId: AgencyId,
  amountM: number,
): GameState {
  const safe = Math.max(0, Math.round(amountM));
  return {
    ...state,
    agencies: {
      ...state.agencies,
      [agencyId]: {
        ...state.agencies[agencyId],
        operatingParams: {
          ...state.agencies[agencyId].operatingParams,
          securityBudget: cash(safe),
        },
      },
    },
  };
}

export function setCleanlinessBudget(
  state: GameState,
  agencyId: AgencyId,
  amountM: number,
): GameState {
  const safe = Math.max(0, Math.round(amountM));
  return {
    ...state,
    agencies: {
      ...state.agencies,
      [agencyId]: {
        ...state.agencies[agencyId],
        operatingParams: {
          ...state.agencies[agencyId].operatingParams,
          cleanlinessBudget: cash(safe),
        },
      },
    },
  };
}

export function setAccessibilityBudget(
  state: GameState,
  agencyId: AgencyId,
  amountM: number,
): GameState {
  const safe = Math.max(0, Math.round(amountM));
  return {
    ...state,
    agencies: {
      ...state.agencies,
      [agencyId]: {
        ...state.agencies[agencyId],
        operatingParams: {
          ...state.agencies[agencyId].operatingParams,
          accessibilityBudget: cash(safe),
        },
      },
    },
  };
}
