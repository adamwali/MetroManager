import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { archetypeOptions } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import { formatMoney } from '@/utils/humanize';

interface NewGameModalProps {
  onClose: () => void;
  /** If true, modal is dismissible (player already has a campaign). */
  dismissible?: boolean;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

export function NewGameModal({ onClose, dismissible = false }: NewGameModalProps) {
  const newGame = useGameStore((s) => s.newGame);
  const [archetype, setArchetype] = useState<CeoArchetype>('steadyOperator');
  const [seed, setSeed] = useState<number>(randomSeed());
  const [name, setName] = useState<string>('A. Castillo');

  const options = archetypeOptions();
  const selected = options.find((o) => o.id === archetype)!;

  const begin = () => {
    newGame(seed, archetype, name.trim() || 'CEO');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">New campaign</h1>
            <p className="text-sm text-neutral-500">
              Choose your CEO archetype. Each starts the agency in meaningfully different shape.
            </p>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
            >
              Cancel
            </button>
          )}
        </header>

        <div className="grid gap-4 px-6 py-4 sm:grid-cols-2">
          {options.map((opt) => {
            const isSelected = opt.id === archetype;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setArchetype(opt.id)}
                className={`text-left rounded-md border-2 p-4 transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/50'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-semibold">{opt.config.displayName}</h3>
                  <span className="num text-xs text-neutral-500">
                    Cash {formatMoney(opt.config.startingCashM)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-600">{opt.config.blurb}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="font-semibold uppercase tracking-wider text-emerald-700">
                      Strengths
                    </div>
                    <ul className="mt-1 list-disc pl-4 text-neutral-700">
                      {opt.config.strengths.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold uppercase tracking-wider text-amber-700">
                      Weaknesses
                    </div>
                    <ul className="mt-1 list-disc pl-4 text-neutral-700">
                      {opt.config.weaknesses.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              CEO name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Random seed
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value) || 1)}
                className="num flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => setSeed(randomSeed())}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                Random
              </button>
            </div>
          </label>
          <button
            type="button"
            onClick={begin}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Begin: {selected.config.displayName}
          </button>
        </div>
      </div>
    </div>
  );
}
