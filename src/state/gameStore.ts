import { create } from 'zustand';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { resolveEventChoice } from '@engine/events/firing';
import {
  setAccessibilityBudget,
  setCleanlinessBudget,
  setFarePolicy,
  setFrequencyPolicy,
  setMaintenanceBudget,
  setSecurityBudget,
} from '@engine/agencyActions';
import {
  acceptFinancing,
  acceptFinancingPackage,
  accelerateProject,
  proposeProject,
  reduceProjectScope,
  rejectProject,
  setLvcCapex,
  toggleProjectPause,
  type FinancingSelection,
} from '@engine/projectActions';
import { executePoliticalAction } from '@engine/politicalActions';
import {
  issueOperatingBond,
  refinanceTranche,
  commissionVoluntaryAudit,
  runCommunityConsultation,
  engageConsultants,
  terminateConsultants,
} from '@engine/treasuryActions';
import {
  addStandingOrder,
  removeStandingOrder,
  toggleStandingOrder,
  updateStandingOrder,
  type StandingOrderWithoutId,
} from '@engine/standingOrderActions';
import type { StandingOrder } from '@/types/standingOrders';
import type { StationQualityTier } from '@engine/projectCatalog';
import type { FrequencyPolicy } from '@engine/policies';
import type { FinancingApproach } from '@/types/projects';
import type { CreditorType } from '@/types/finance';
import type { GovernmentId, PoliticalActionKind } from '@/types/politics';
import type { GameState } from '@/types/gameState';
import type { AgencyId, FarePolicyTier, SubsystemId } from '@/types/agency';
import type { CeoArchetype } from '@/types/ceo';
import type { HistoryPoint } from '@/utils/kpis';
import { buildHistory } from '@/utils/kpis';
import { AUTOSAVE_SLOT, writeSlot, readSlot, type SlotId } from './saveSlots';

/**
 * Global game store. Holds the current GameState. Quarter advances and
 * game-loading replace state. Selectors pull what they need.
 *
 * Autosave: after every endTurn the new state is written to the autosave
 * IndexedDB slot in the background. UI surfaces "saving…" / "saved" in
 * the brand bar.
 */

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ForecastRangePoint {
  quarter: number;
  cashMin: number;
  cashMax: number;
  cashMedian: number;
  ridersMin: number;
  ridersMax: number;
  ridersMedian: number;
  gameOverProbability: number;
}

export interface ForecastRange {
  runs: number;
  points: ForecastRangePoint[];
}

export interface GameStore {
  state: GameState;
  /** Initial state captured at game start. Used to derive history. */
  initialState: GameState;
  autosaveStatus: AutosaveStatus;
  /** Set false until the player explicitly starts a game. UI shows new-game modal otherwise. */
  campaignStarted: boolean;

  endTurn: () => void;
  newGame: (seed: number, archetype: CeoArchetype, ceoName: string) => void;
  loadFromSlot: (slotId: SlotId) => Promise<void>;
  /** Forecast next N quarters without committing to state. */
  forecast: (quartersAhead: number) => GameState[];
  /**
   * Monte Carlo forecast: run N parallel forecasts with perturbed seeds.
   * Returns per-quarter ranges (min/max/median) for cash and ridership.
   */
  forecastRange: (quartersAhead: number, runs?: number) => ForecastRange;
  /** Resolve an inbox event by selecting one of its branches. */
  applyEventChoice: (templateId: string, choiceId: string) => void;
  /** Operations levers (Phase 5.1 + 5.2). */
  setMaintenanceBudget: (agencyId: AgencyId, subsystemId: SubsystemId, amountM: number) => void;
  setFarePolicy: (agencyId: AgencyId, policy: FarePolicyTier) => void;
  setFrequencyPolicy: (agencyId: AgencyId, policy: FrequencyPolicy) => void;
  setSecurityBudget: (agencyId: AgencyId, amountM: number) => void;
  setCleanlinessBudget: (agencyId: AgencyId, amountM: number) => void;
  setAccessibilityBudget: (agencyId: AgencyId, amountM: number) => void;
  /** Project initiation flow (Phase 4). */
  proposeProject: (
    catalogProjectId: string,
    alignmentId: string,
    stationQuality: StationQualityTier,
  ) => void;
  acceptFinancing: (catalogProjectId: string, approach: FinancingApproach) => void;
  acceptFinancingPackage: (
    catalogProjectId: string,
    selections: FinancingSelection[],
  ) => void;
  rejectProject: (catalogProjectId: string) => void;
  accelerateProject: (catalogProjectId: string, quartersFaster: number) => void;
  reduceProjectScope: (catalogProjectId: string) => void;
  toggleProjectPause: (catalogProjectId: string) => void;
  setLvcCapex: (catalogProjectId: string, capexPerStationM: number) => void;
  /** Political actions (Phase 6.1). */
  executePoliticalAction: (gov: GovernmentId, kind: PoliticalActionKind) => void;
  /** Treasury actions (Phase 7). */
  issueOperatingBond: (creditor: CreditorType, amountM: number) => void;
  refinanceTranche: (trancheId: string) => void;
  commissionVoluntaryAudit: () => void;
  runCommunityConsultation: () => void;
  engageConsultants: () => void;
  terminateConsultants: () => void;
  /** Standing orders (Phase 8.1). */
  addStandingOrder: (order: StandingOrderWithoutId) => void;
  removeStandingOrder: (orderId: string) => void;
  toggleStandingOrder: (orderId: string) => void;
  updateStandingOrder: (orderId: string, patch: Partial<StandingOrder>) => void;
}

const DEFAULT_SEED = 1;

function initialFor(seed: number, archetype: CeoArchetype, ceoName: string): GameState {
  return createInitialGameState(seed, archetype, ceoName);
}

export const useGameStore = create<GameStore>((set, get) => {
  const initial = initialFor(DEFAULT_SEED, 'steadyOperator', 'CEO');
  return {
    state: initial,
    initialState: initial,
    autosaveStatus: 'idle',
    campaignStarted: false,

    endTurn: () => {
      const next = endTurn(get().state);
      set({ state: next, autosaveStatus: 'saving' });
      // Autosave fire-and-forget. UI flips status when settled.
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    newGame: (seed, archetype, ceoName) => {
      const next = initialFor(seed, archetype, ceoName);
      set({
        state: next,
        initialState: next,
        autosaveStatus: 'idle',
        campaignStarted: true,
      });
    },

    loadFromSlot: async (slotId) => {
      const loaded = await readSlot(slotId);
      if (!loaded) throw new Error(`Slot ${slotId} is empty`);
      // Re-derive initialState from the loaded game's seed + archetype.
      // We don't store the original initialState in the save (it would be
      // redundant), so reconstruct it deterministically.
      const initialReconstructed = createInitialGameState(
        loaded.rng.masterSeed,
        loaded.ceo.archetype,
        loaded.ceo.name,
      );
      set({
        state: loaded,
        initialState: initialReconstructed,
        autosaveStatus: 'idle',
        campaignStarted: true,
      });
    },

    forecast: (quartersAhead) => {
      // Pure dry-run: advances a temporary state forward N times. Never
      // touches store or autosave. Used by time-jump prediction overlay.
      let cursor = get().state;
      const trajectory: GameState[] = [];
      for (let i = 0; i < quartersAhead; i++) {
        cursor = endTurn(cursor);
        trajectory.push(cursor);
        if (cursor.gameOver) break; // Stop at end
      }
      return trajectory;
    },

    forecastRange: (quartersAhead, runs = 12) => {
      const base = get().state;
      // Each run perturbs the masterSeed so random events fire differently.
      // Sequenced RNG state also nudged via callCount offset per run.
      const runs2D: GameState[][] = [];
      for (let r = 0; r < runs; r++) {
        const perturbed: GameState = {
          ...base,
          rng: {
            ...base.rng,
            masterSeed: base.rng.masterSeed + r * 9973, // prime offset
          },
        };
        let cursor = perturbed;
        const trajectory: GameState[] = [];
        for (let i = 0; i < quartersAhead; i++) {
          cursor = endTurn(cursor);
          trajectory.push(cursor);
          if (cursor.gameOver) break;
        }
        runs2D.push(trajectory);
      }
      // Aggregate per quarter
      const points: ForecastRangePoint[] = [];
      for (let q = 0; q < quartersAhead; q++) {
        const cashAt: number[] = [];
        const ridersAt: number[] = [];
        let gameOvers = 0;
        for (const traj of runs2D) {
          const tip = traj[q] ?? traj[traj.length - 1]!;
          cashAt.push(tip.cash.balance as unknown as number);
          ridersAt.push(
            (tip.agencies.ttc.dailyRiders as unknown as number) +
              (tip.agencies.go.dailyRiders as unknown as number) +
              (tip.agencies.up.dailyRiders as unknown as number),
          );
          if (tip.gameOver) gameOvers++;
        }
        cashAt.sort((a, b) => a - b);
        ridersAt.sort((a, b) => a - b);
        const median = (arr: number[]) => arr[Math.floor(arr.length / 2)]!;
        points.push({
          quarter: (base.quarter as unknown as number) + q + 1,
          cashMin: cashAt[0]!,
          cashMax: cashAt[cashAt.length - 1]!,
          cashMedian: median(cashAt),
          ridersMin: ridersAt[0]!,
          ridersMax: ridersAt[ridersAt.length - 1]!,
          ridersMedian: median(ridersAt),
          gameOverProbability: gameOvers / runs,
        });
      }
      return { runs, points };
    },

    applyEventChoice: (templateId, choiceId) => {
      const result = resolveEventChoice(get().state, templateId, choiceId);
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    setMaintenanceBudget: (agencyId, subsystemId, amountM) => {
      const next = setMaintenanceBudget(get().state, agencyId, subsystemId, amountM);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    setFarePolicy: (agencyId, policy) => {
      const next = setFarePolicy(get().state, agencyId, policy);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    setFrequencyPolicy: (agencyId, policy) => {
      const next = setFrequencyPolicy(get().state, agencyId, policy);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    setSecurityBudget: (agencyId, amountM) => {
      const next = setSecurityBudget(get().state, agencyId, amountM);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    setCleanlinessBudget: (agencyId, amountM) => {
      const next = setCleanlinessBudget(get().state, agencyId, amountM);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    setAccessibilityBudget: (agencyId, amountM) => {
      const next = setAccessibilityBudget(get().state, agencyId, amountM);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },

    proposeProject: (catalogProjectId, alignmentId, stationQuality) => {
      const next = proposeProject(get().state, catalogProjectId, alignmentId, stationQuality);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    acceptFinancing: (catalogProjectId, approach) => {
      const next = acceptFinancing(get().state, catalogProjectId, approach);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    acceptFinancingPackage: (catalogProjectId, selections) => {
      const next = acceptFinancingPackage(get().state, catalogProjectId, selections);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    rejectProject: (catalogProjectId) => {
      const next = rejectProject(get().state, catalogProjectId);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    accelerateProject: (catalogProjectId, quartersFaster) => {
      const next = accelerateProject(get().state, catalogProjectId, quartersFaster);
      if (next === get().state) return;
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    reduceProjectScope: (catalogProjectId) => {
      const next = reduceProjectScope(get().state, catalogProjectId);
      if (next === get().state) return;
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    toggleProjectPause: (catalogProjectId) => {
      const next = toggleProjectPause(get().state, catalogProjectId);
      if (next === get().state) return;
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    setLvcCapex: (catalogProjectId, capexPerStationM) => {
      const next = setLvcCapex(get().state, catalogProjectId, capexPerStationM);
      if (next === get().state) return;
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    executePoliticalAction: (gov, kind) => {
      const result = executePoliticalAction(get().state, gov, kind);
      if (result.state === get().state) return; // No-op (ineligible)
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    issueOperatingBond: (creditor, amountM) => {
      const result = issueOperatingBond(get().state, creditor, amountM);
      if (result.state === get().state) return;
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    refinanceTranche: (trancheId) => {
      const result = refinanceTranche(get().state, trancheId);
      if (result.state === get().state) return;
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    commissionVoluntaryAudit: () => {
      const result = commissionVoluntaryAudit(get().state);
      if (result.state === get().state) return;
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    runCommunityConsultation: () => {
      const result = runCommunityConsultation(get().state);
      if (result.state === get().state) return;
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    engageConsultants: () => {
      const result = engageConsultants(get().state);
      if (result.state === get().state) return;
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    terminateConsultants: () => {
      const result = terminateConsultants(get().state);
      if (result.state === get().state) return;
      set({ state: result.state, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, result.state)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    addStandingOrder: (order) => {
      const next = addStandingOrder(get().state, order);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    removeStandingOrder: (orderId) => {
      const next = removeStandingOrder(get().state, orderId);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    toggleStandingOrder: (orderId) => {
      const next = toggleStandingOrder(get().state, orderId);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
    updateStandingOrder: (orderId, patch) => {
      const next = updateStandingOrder(get().state, orderId, patch);
      set({ state: next, autosaveStatus: 'saving' });
      void writeSlot(AUTOSAVE_SLOT, next)
        .then(() => set({ autosaveStatus: 'saved' }))
        .catch(() => set({ autosaveStatus: 'error' }));
    },
  };
});

/** Convenience selector hook for history. */
export function useHistory(): HistoryPoint[] {
  const state = useGameStore((s) => s.state);
  const initialState = useGameStore((s) => s.initialState);
  const initialCash = initialState.cash.balance as unknown as number;
  const initialRiders =
    (initialState.agencies.ttc.dailyRiders as unknown as number) +
    (initialState.agencies.go.dailyRiders as unknown as number) +
    (initialState.agencies.up.dailyRiders as unknown as number);
  return buildHistory(state, initialCash, initialRiders);
}
