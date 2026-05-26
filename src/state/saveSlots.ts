import { clear, createStore, del, get, keys, set } from 'idb-keyval';
import type { GameState } from '@/types/gameState';
import { saveGameToJson, loadGameFromJson } from '@engine/saveLoad';

/**
 * IndexedDB-backed save slot manager. Phase 2.2.
 *
 * Layout: 3 manual slots (slot-1, slot-2, slot-3) + 1 autosave that
 * updates after every endTurn. Each value is the JSON string returned
 * by `saveGameToJson` (so schema-version checks still apply at load).
 */

const STORE = createStore('metro-saves', 'slots');

export type SlotId = 'slot-1' | 'slot-2' | 'slot-3' | 'autosave';

export const MANUAL_SLOTS: SlotId[] = ['slot-1', 'slot-2', 'slot-3'];
export const AUTOSAVE_SLOT: SlotId = 'autosave';

export interface SlotMetadata {
  slotId: SlotId;
  savedAt: string;
  quarter: number;
  cashM: number;
  totalRiders: number;
  ceoArchetype: string;
  ceoName: string;
  gameOver: boolean;
}

export async function writeSlot(slotId: SlotId, state: GameState): Promise<void> {
  const json = saveGameToJson(state);
  await set(slotId, json, STORE);
}

export async function readSlot(slotId: SlotId): Promise<GameState | null> {
  const json = await get<string>(slotId, STORE);
  if (!json) return null;
  return loadGameFromJson(json);
}

export async function deleteSlot(slotId: SlotId): Promise<void> {
  await del(slotId, STORE);
}

export async function listSlots(): Promise<SlotMetadata[]> {
  const ids = (await keys(STORE)) as SlotId[];
  const metas: SlotMetadata[] = [];
  for (const id of ids) {
    const json = await get<string>(id, STORE);
    if (!json) continue;
    try {
      const parsed = JSON.parse(json);
      const state: GameState = parsed.state;
      const totalRiders =
        (state.agencies.ttc.dailyRiders as unknown as number) +
        (state.agencies.go.dailyRiders as unknown as number) +
        (state.agencies.up.dailyRiders as unknown as number);
      metas.push({
        slotId: id,
        savedAt: parsed.savedAt,
        quarter: state.quarter as unknown as number,
        cashM: state.cash.balance as unknown as number,
        totalRiders,
        ceoArchetype: state.ceo.archetype,
        ceoName: state.ceo.name,
        gameOver: state.gameOver !== undefined,
      });
    } catch {
      // Skip corrupted slots
    }
  }
  return metas;
}

export async function clearAllSlots(): Promise<void> {
  await clear(STORE);
}
