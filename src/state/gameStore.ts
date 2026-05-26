import { create } from 'zustand';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import type { GameState } from '@/types/gameState';
import type { HistoryPoint } from '@/utils/kpis';
import { buildHistory } from '@/utils/kpis';

/**
 * Global game store. Holds the current GameState. `endTurn` dispatches the
 * engine's pure function and replaces state. UI components subscribe via
 * selectors so they only re-render when relevant fields change.
 */

export interface GameStore {
  state: GameState;
  /** Initial state captured at game start. Used to derive history. */
  initialState: GameState;
  endTurn: () => void;
  newGame: (seed: number) => void;
  history: () => HistoryPoint[];
}

const DEFAULT_SEED = 1;

function initialFor(seed: number): GameState {
  return createInitialGameState(seed);
}

export const useGameStore = create<GameStore>((set, get) => {
  const initial = initialFor(DEFAULT_SEED);
  return {
    state: initial,
    initialState: initial,
    endTurn: () => set({ state: endTurn(get().state) }),
    newGame: (seed: number) => {
      const next = initialFor(seed);
      set({ state: next, initialState: next });
    },
    history: () => {
      const { state, initialState } = get();
      const initialCash = initialState.cash.balance as unknown as number;
      const initialRiders =
        (initialState.agencies.ttc.dailyRiders as unknown as number) +
        (initialState.agencies.go.dailyRiders as unknown as number) +
        (initialState.agencies.up.dailyRiders as unknown as number);
      return buildHistory(state, initialCash, initialRiders);
    },
  };
});
