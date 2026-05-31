import { useGameStore } from '@state/gameStore';
import { ARCHETYPE_CONFIGS } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import {
  formatMoney,
  formatRiders,
  formatRidersDelta,
  quarterLabel,
} from '@/utils/humanize';
import { computeScore } from '@/utils/score';

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
  const arch = ARCHETYPE_CONFIGS[state.ceo.archetype as CeoArchetype];
  const agencyName = state.ceo.agencyName ?? 'GTTA';
  const score = computeScore(state);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <div className={`w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-lg border-2 bg-white p-6 shadow-2xl ${style.accent}`}>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {agencyName} · Campaign ended · {quarterLabel(go.endedAt as unknown as number)}
          </p>
          <h1 className={`mt-1 text-2xl font-bold ${style.color}`}>{go.headline}</h1>
          <p className="mt-2 text-sm text-neutral-700">{go.detail}</p>
        </div>

        {/* Score headline */}
        <div className="mb-4 flex items-center justify-between rounded-md bg-neutral-900 px-4 py-3 text-white">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Legacy score</div>
            <div className="num text-3xl font-bold">{score.total}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">Grade</div>
            <div className="text-xl font-bold text-blue-300">{score.grade}</div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="mb-4 rounded-md border border-neutral-200 bg-white p-3 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">Score breakdown</div>
          <ScoreRow label="Ridership growth" value={score.ridership} detail={formatRidersDelta(score.stats.ridersDelta)} />
          <ScoreRow label="Solvency" value={score.solvency} detail={formatMoney(score.stats.cash)} />
          <ScoreRow label="Network delivered" value={score.network} detail={`${score.stats.projectsOpened} line${score.stats.projectsOpened === 1 ? '' : 's'} opened`} />
          <ScoreRow label="Board + approval" value={score.standing} detail={`${score.stats.board.toFixed(0)} / ${score.stats.approval.toFixed(0)}`} />
          <ScoreRow label="Government trust" value={score.trust} detail={`${score.stats.avgTrust.toFixed(0)} avg`} />
          <ScoreRow label="Tenure" value={score.tenure} detail={`${score.stats.quartersServed} quarters`} />
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-white p-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Final daily riders</dt>
            <dd className="num text-base font-semibold">{formatRiders(score.stats.ridersNow)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-neutral-500">Lines opened</dt>
            <dd className="num text-base font-semibold">{score.stats.projectsOpened}</dd>
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

function ScoreRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="flex items-center justify-between border-t border-neutral-100 py-1 first:border-0">
      <span className="text-neutral-600">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-[10px] text-neutral-400">{detail}</span>
        <span className={`num font-semibold ${value < 0 ? 'text-red-700' : 'text-neutral-800'}`}>
          {value >= 0 ? '+' : ''}
          {value}
        </span>
      </span>
    </div>
  );
}
