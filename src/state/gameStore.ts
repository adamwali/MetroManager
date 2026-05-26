import { create } from 'zustand';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { resolveEventChoice } from '@engine/events/firing';
import {
  setFarePolicy,
  setFrequencyPolicy,
  setMaintenanceBudget,
} from '@engine/agencyActions';
import type { FrequencyPolicy } from '@engine/policies';
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
  /** Resolve an inbox event by selecting one of its branches. */
  applyEventChoice: (templateId: string, choiceId: string) => void;
  /** Operations levers (Phase 5.1). */
  setMaintenanceBudget: (agencyId: AgencyId, subsystemId: SubsystemId, amountM: number) => void;
  setFarePolicy: (agencyId: AgencyId, policy: FarePolicyTier) => void;
  setFrequencyPolicy: (agencyId: AgencyId, policy: FrequencyPolicy) => void;
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
