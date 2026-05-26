import { useEffect, useState } from 'react';
import { useGameStore } from '@state/gameStore';
import {
  AUTOSAVE_SLOT,
  MANUAL_SLOTS,
  type SlotId,
  type SlotMetadata,
  deleteSlot,
  listSlots,
  writeSlot,
} from '@state/saveSlots';
import { ARCHETYPE_CONFIGS } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import { formatMoney, formatRiders, quarterLabel } from '@/utils/humanize';

interface SaveLoadModalProps {
  onClose: () => void;
  /** 'save' shows manual save buttons; 'load' shows load buttons. */
  mode: 'save' | 'load';
}

function archetypeName(arch: string): string {
  return ARCHETYPE_CONFIGS[arch as CeoArchetype]?.displayName ?? arch;
}

export function SaveLoadModal({ onClose, mode }: SaveLoadModalProps) {
  const state = useGameStore((s) => s.state);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);
  const [slots, setSlots] = useState<SlotMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await listSlots();
      setSlots(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleSave = async (slotId: SlotId) => {
    try {
      await writeSlot(slotId, state);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleLoad = async (slotId: SlotId) => {
    try {
      await loadFromSlot(slotId);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async (slotId: SlotId) => {
    try {
      await deleteSlot(slotId);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const allSlotIds: SlotId[] = [...MANUAL_SLOTS, AUTOSAVE_SLOT];
  const byId = new Map(slots.map((s) => [s.slotId, s]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {mode === 'save' ? 'Save campaign' : 'Load campaign'}
            </h1>
            <p className="text-sm text-neutral-500">
              {mode === 'save'
                ? 'Choose a slot to write to. Autosave updates after every turn.'
                : 'Choose a slot to resume from.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Close
          </button>
        </header>

        {error && (
          <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="px-6 py-4 space-y-2">
          {loading && <p className="text-sm text-neutral-500">Loading slots…</p>}
          {!loading &&
            allSlotIds.map((id) => {
              const meta = byId.get(id);
              const isAutosave = id === AUTOSAVE_SLOT;
              return (
                <div
                  key={id}
                  className="rounded-md border border-neutral-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">
                        {isAutosave ? 'Autosave' : id.replace('slot-', 'Slot ')}
                      </span>
                      {isAutosave && (
                        <span className="text-[10px] uppercase tracking-wider text-blue-700">
                          Auto
                        </span>
                      )}
                    </div>
                    {meta ? (
                      <div className="mt-1 text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-1">
                        <span>{quarterLabel(meta.quarter)}</span>
                        <span className="num">{formatMoney(meta.cashM)}</span>
                        <span className="num">{formatRiders(meta.totalRiders)} riders</span>
                        <span>{archetypeName(meta.ceoArchetype)} · {meta.ceoName}</span>
                        {meta.gameOver && <span className="text-red-700">Campaign ended</span>}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-neutral-400">Empty</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {mode === 'save' && !isAutosave && (
                      <button
                        type="button"
                        onClick={() => handleSave(id)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Save here
                      </button>
                    )}
                    {mode === 'load' && meta && (
                      <button
                        type="button"
                        onClick={() => handleLoad(id)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        Load
                      </button>
                    )}
                    {meta && !isAutosave && (
                      <button
                        type="button"
                        onClick={() => handleDelete(id)}
                        className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
