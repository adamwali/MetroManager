import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { ARCHETYPE_CONFIGS } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import { MANDATES, type MandateId } from '@/types/mandate';
import { formatMoney } from '@/utils/humanize';

/**
 * Mandate / backstory + Mandate Bet screen. Phase 11 rework.
 *
 * Now requires the player to pick ONE of three mandates before taking
 * office — gives the 60-quarter campaign a thesis instead of a checklist.
 * Final grade at Q60 is mandate-weighted, so picking a mandate is a real
 * commitment, not flavour.
 */
export function MandateScreen({ onBegin }: { onBegin: () => void }) {
  const state = useGameStore((s) => s.state);
  const setMandate = useGameStore((s) => s.setMandate);
  const [picked, setPicked] = useState<MandateId | null>(state.mandate ?? null);
  const agencyName = state.ceo.agencyName ?? 'GTTA';
  const ceoName = state.ceo.name;
  const arch = ARCHETYPE_CONFIGS[state.ceo.archetype as CeoArchetype];
  const cash = state.cash.balance as unknown as number;
  const totalDebt = state.debt.tranches.reduce(
    (a, t) => a + (t.principal as unknown as number),
    0,
  );

  const handleBegin = () => {
    if (!picked) return;
    setMandate(picked);
    onBegin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="bg-neutral-900 px-6 py-5 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">
            Order in Council · Province of Ontario
          </p>
          <h1 className="mt-1 text-2xl font-bold">The {agencyName} Mandate</h1>
          <p className="mt-1 text-sm text-neutral-300">CEO {ceoName} · {arch.displayName}</p>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm text-neutral-700 leading-relaxed">
          <p>
            For a decade, regional transit across the Greater Toronto and Hamilton Area was a
            byword for dysfunction. The province dissolved the old order and created a new one —{' '}
            <span className="font-semibold text-neutral-900">{agencyName}</span>, with you,{' '}
            <span className="font-semibold text-neutral-900">{ceoName}</span>, as its founding CEO.
            You inherit three agencies, a half-built subway line, {formatMoney(cash)} cash, and{' '}
            {formatMoney(totalDebt)} of debt.
          </p>

          <div className="rounded-md border-2 border-blue-300 bg-blue-50/60 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Declare your mandate
            </p>
            <p className="mt-1 text-[13px] text-neutral-700">
              Pick one. You'll be measured against it at Q60. Pick the wrong one and even a
              "successful" tenure ends a footnote.
            </p>
            <div className="mt-3 space-y-2">
              {(['ridership', 'reliability', 'affordability'] as const).map((id) => {
                const m = MANDATES[id];
                const selected = picked === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPicked(id)}
                    className={`w-full text-left rounded-md border-2 p-3 transition ${
                      selected
                        ? 'border-blue-600 bg-white shadow-md'
                        : 'border-neutral-200 bg-white hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-[11px] font-semibold uppercase tracking-wider ${selected ? 'text-blue-700' : 'text-neutral-500'}`}>
                        {m.shortLabel}
                      </span>
                      {selected && (
                        <span className="text-[10px] font-semibold text-blue-700">✓ Selected</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-neutral-900">
                      {m.headline}
                    </div>
                    <p className="mt-1 text-[12px] text-neutral-600">{m.pitch}</p>
                    <p className="mt-1 text-[11px] font-medium text-neutral-700">
                      Q60 target: {m.target}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">
              <span className="font-semibold text-neutral-700">Starting as {arch.displayName}:</span>{' '}
              {arch.blurb}
            </p>
          </div>
        </div>

        <div className="border-t border-neutral-200 px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-neutral-500">
            {picked
              ? `Mandate: ${MANDATES[picked].shortLabel}. Change at any time before Q4 via the briefing.`
              : 'Pick a mandate to take office.'}
          </p>
          <button
            type="button"
            onClick={handleBegin}
            disabled={!picked}
            className={`rounded-md px-6 py-2.5 text-sm font-semibold text-white ${
              picked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-neutral-300 cursor-not-allowed'
            }`}
          >
            Take office →
          </button>
        </div>
      </div>
    </div>
  );
}
