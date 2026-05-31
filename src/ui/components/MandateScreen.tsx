import { useGameStore } from '@state/gameStore';
import { ARCHETYPE_CONFIGS } from '@engine/archetypes';
import type { CeoArchetype } from '@/types/ceo';
import { formatMoney } from '@/utils/humanize';

/**
 * Mandate / backstory screen. Phase 10.11. Shown once at the start of a new
 * campaign to set the fiction and the player's objective. Per feedback that
 * the game dropped you in with no context or goal.
 */
export function MandateScreen({ onBegin }: { onBegin: () => void }) {
  const state = useGameStore((s) => s.state);
  const agencyName = state.ceo.agencyName ?? 'GTTA';
  const ceoName = state.ceo.name;
  const arch = ARCHETYPE_CONFIGS[state.ceo.archetype as CeoArchetype];
  const cash = state.cash.balance as unknown as number;
  const totalDebt = state.debt.tranches.reduce(
    (a, t) => a + (t.principal as unknown as number),
    0,
  );

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
            byword for dysfunction. Megaprojects ran years late and billions over. Three transit
            agencies — the subway and streetcar network, the regional rail operator, and the
            airport express — pointed fingers while riders waited on cold platforms. The Auditor
            General's report used the word "mismanagement" forty-one times.
          </p>
          <p>
            So the province did what provinces do: it dissolved the old order and created a new
            one. <span className="font-semibold text-neutral-900">{agencyName}</span> — with you,{' '}
            <span className="font-semibold text-neutral-900">{ceoName}</span>, as its founding CEO.
            You inherit all three agencies, a half-built subway line, and the public's exhausted
            patience.
          </p>

          <div className="rounded-md border border-blue-200 bg-blue-50/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Your mandate — 60 quarters (15 years)
            </p>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              <li>
                <span className="font-semibold">Stay solvent.</span> Don't let the authority go
                bankrupt. You start with {formatMoney(cash)} cash and {formatMoney(totalDebt)} of
                inherited debt.
              </li>
              <li>
                <span className="font-semibold">Keep the board's confidence.</span> Lose it and
                you're out.
              </li>
              <li>
                <span className="font-semibold">Grow the network and ridership.</span> Build lines,
                win back riders, leave a legacy.
              </li>
              <li>
                <span className="font-semibold">Manage three governments.</span> Ottawa, Queen's
                Park, and City Hall all hold purse strings and grudges.
              </li>
            </ul>
          </div>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-[11px] text-neutral-500">
              <span className="font-semibold text-neutral-700">Starting as {arch.displayName}:</span>{' '}
              {arch.blurb}
            </p>
          </div>

          <p className="text-[12px] text-neutral-500 italic">
            The first few quarters will be quiet. Use them to learn your levers — open the
            Mission Control priority card, watch the live cash-flow forecast move as you tune
            operations. Then the real decisions begin.
          </p>
        </div>

        <div className="border-t border-neutral-200 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onBegin}
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Take office →
          </button>
        </div>
      </div>
    </div>
  );
}
