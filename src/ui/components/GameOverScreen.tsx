import { useGameStore } from '@state/gameStore';
import { ARCHETYPE_CONFIGS } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import {
  formatMoney,
  formatRiders,
  quarterLabel,
} from '@/utils/humanize';

interface GameOverScreenProps {
  onStartNew: () => void;
  onLoad: () => void;
}

const KIND_STYLES = {
  fiscalFailure: { color: 'text-red-700', accent: 'border-red-200 bg-red-50/60' },
  boardFiring: { color: 'text-amber-700', accent: 'border-amber-200 bg-amber-50/60' },
  campaignWon: { color: 'text-emerald-700', accent: 'border-emerald-200 bg-emerald-50/60' },
};

export function GameOverScreen({ onStartNew, onLoad }: GameOverScreenProps) {
  const state = useGameStore((s) => s.state);
  if (!state.gameOver) return null;
  const go = state.gameOver;
  const style = KIND_STYLES[go.kind];
  const totalRiders =
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number);
  const arch = ARCHETYPE_CONFIGS[state.ceo.archetype as CeoArchetype];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <div className={`w-full max-w-xl rounded-lg border-2 bg-white p-6 shadow-2xl ${style.accent}`}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Campaign ended · {quarterLabel(go.endedAt as unknown as number)}
          </p>
          <h1 className={`mt-1 text-2xl font-bold ${style.color}`}>{go.headline}</h1>
          <p className="mt-2 text-sm text-neutral-700">{go.detail}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-white p-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Final cash</dt>
            <dd className="num text-base font-semibold">
              {formatMoney(state.cash.balance as unknown as number)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Daily riders</dt>
            <dd className="num text-base font-semibold">{formatRiders(totalRiders)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Board confidence</dt>
            <dd className="num text-base font-semibold">
              {(state.boardConfidence.score as unknown as number).toFixed(0)}/100
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Tenure</dt>
            <dd className="num text-base font-semibold">
              {(state.quarter as unknown as number) + 1} quarters
            </dd>
          </div>
          <div className="col-span-2 border-t border-neutral-100 pt-3">
            <dt className="text-xs uppercase tracking-wider text-neutral-500">CEO</dt>
            <dd className="text-base font-semibold">
              {state.ceo.name} · {arch.displayName}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onLoad}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Load earlier save
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Start new campaign
          </button>
        </div>
      </div>
    </div>
  );
}
