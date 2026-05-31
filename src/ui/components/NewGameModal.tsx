import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { archetypeOptions } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import { formatMoney } from '@/utils/humanize';

/**
 * Plain-language description of how each archetype actually plays.
 * Helps the picker feel like "pick your strategy" not "pick your stats."
 */
const ARCHETYPE_PLAYSTYLE: Record<CeoArchetype, string> = {
  steadyOperator:
    'Lean on the financial cushion ($1.4B cash) and disciplined opex. Best for first-time players — you have margin for error and time to learn.',
  internationalTechnocrat:
    'Bond-market favored (open books = -20bp on every new bond). Templates >50 unlocks data-driven branches and -5% project cost. Pays off late.',
  insider:
    'Use your political relationships ($400M favor available Q1, premium quiet-pitch access). Build trust fast, but watch Hartwell will eventually want something back.',
  coalitionBuilder:
    'Tri-government trust at 55+ from Q1 — financing offers come in at preferential rates. Vulnerable to events that crash one government\'s trust below the threshold.',
  disruptor:
    'High variance. Lower starting cash + trust, but every event leans more disruptive. Gaffe events trigger; you can also pivot moves that other archetypes can\'t. Veteran mode.',
};

interface NewGameModalProps {
  onClose: () => void;
  /** If true, modal is dismissible (player already has a campaign). */
  dismissible?: boolean;
  /** Called when a new campaign is actually started (not on cancel). */
  onStarted?: () => void;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

const AGENCY_NAME_SUGGESTIONS = ['TNTA', 'Metrolinx 2.0', 'GTHA Transit', 'OneTransit', 'RegionRail'];

export function NewGameModal({ onClose, dismissible = false, onStarted }: NewGameModalProps) {
  const newGame = useGameStore((s) => s.newGame);
  const [archetype, setArchetype] = useState<CeoArchetype>('steadyOperator');
  const [seed, setSeed] = useState<number>(randomSeed());
  const [name, setName] = useState<string>('');
  const [agencyName, setAgencyName] = useState<string>('TNTA');

  const options = archetypeOptions();
  const selected = options.find((o) => o.id === archetype)!;
  const canBegin = name.trim().length > 0 && agencyName.trim().length > 0;

  const begin = () => {
    if (!canBegin) return;
    newGame(seed, archetype, name.trim(), agencyName.trim());
    onStarted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">New campaign</h1>
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

        {/* Step 1: Names */}
        <div className="border-b border-neutral-200 bg-blue-50/30 px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Step 1 · Name yourself & your authority
          </span>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium text-neutral-600">Your name (CEO)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoFocus
                placeholder="e.g., Adam Walli"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-neutral-600">Authority name</span>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                maxLength={28}
                placeholder="e.g., TNTA"
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {AGENCY_NAME_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAgencyName(s)}
                    className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <span className="mt-2 block text-[11px] text-neutral-500">
            You're the founding CEO of a new authority replacing the old, mismanaged regime.
            60 quarters to leave a legacy.
          </span>
        </div>

        {/* Step 2: Archetype */}
        <div className="px-6 py-4">
          <div className="mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Step 2 · Pick your archetype
            </span>
            <span className="ml-2 text-[11px] text-neutral-500">
              Each starts the agency in meaningfully different shape.
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((opt) => {
              const isSelected = opt.id === archetype;
              const playstyle = ARCHETYPE_PLAYSTYLE[opt.id] ?? 'Balanced general approach.';
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setArchetype(opt.id)}
                  className={`text-left rounded-md border-2 p-3 transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold">{opt.config.displayName}</h3>
                    <span className="num text-[11px] text-neutral-500">
                      {formatMoney(opt.config.startingCashM)} cash
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-neutral-600 leading-snug">
                    {opt.config.blurb}
                  </p>
                  <p className="mt-1.5 text-[11px] italic text-neutral-500 leading-snug">
                    <span className="font-semibold not-italic text-blue-700">Style: </span>
                    {playstyle}
                  </p>
                  <div className="mt-2 flex gap-2 text-[10px]">
                    <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold">
                      + {opt.config.strengths[0]}
                    </span>
                    <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">
                      − {opt.config.weaknesses[0]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Seed + Begin */}
        <div className="border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-[11px] text-neutral-500">Random seed (optional)</span>
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
                ↻
              </button>
            </div>
          </label>
          <button
            type="button"
            onClick={begin}
            disabled={!canBegin}
            className={`rounded-md px-5 py-2.5 text-sm font-semibold text-white shadow-sm ${
              canBegin
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-neutral-300 cursor-not-allowed'
            }`}
          >
            Begin campaign as {selected.config.displayName}
          </button>
        </div>
      </div>
    </div>
  );
}
