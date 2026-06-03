import { useGameStore } from '@state/gameStore';
import { catalogEntry } from '@engine/projectCatalog';
import { briefingFor } from '@/utils/narrativeRecap';
import {
  formatMoneyDelta,
  formatRidersDelta,
  quarterLabel,
} from '@/utils/humanize';

/**
 * Quarter-recap inline panel. Phase 8.1.
 *
 * Reads the most recent `quarter_summary` log entry and surfaces the top
 * 5 changes by absolute impact across: cash flow components, per-agency
 * ridership shifts, debt/refi events, project transitions. Decision events
 * and standing-order auto-actions from that quarter are summarized below.
 */

interface RecapItem {
  label: string;
  /** Sign-aware delta string. */
  delta: string;
  /** Magnitude for ranking (always positive). */
  magnitude: number;
  /** Tone for color. */
  tone: 'positive' | 'negative' | 'neutral';
}

export function QuarterRecap() {
  const state = useGameStore((s) => s.state);
  const log = state.actionLog;
  // Most recent quarter_summary entry
  const lastSummary = [...log].reverse().find((e) => e.kind === 'quarter_summary');
  if (!lastSummary || lastSummary.kind !== 'quarter_summary') {
    return (
      <section className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          What just changed
        </h2>
        <p className="mt-3 text-sm text-neutral-500">
          End your first turn to see a quarterly recap here.
        </p>
      </section>
    );
  }

  const q = lastSummary.quarter as unknown as number;
  const b = lastSummary.breakdown;

  const items: RecapItem[] = [];

  // Cash components — each as its own line
  if (b.cashFlow.refiFee > 0) {
    items.push({
      label: 'Refi fee paid',
      delta: formatMoneyDelta(-b.cashFlow.refiFee),
      magnitude: b.cashFlow.refiFee,
      tone: 'negative',
    });
  }
  items.push({
    label: 'Net cash flow',
    delta: formatMoneyDelta(b.cashFlow.netDelta),
    magnitude: Math.abs(b.cashFlow.netDelta),
    tone: b.cashFlow.netDelta < 0 ? 'negative' : b.cashFlow.netDelta > 0 ? 'positive' : 'neutral',
  });

  // Per-agency ridership net change (only if meaningful)
  for (const aid of ['ttc', 'go', 'up'] as const) {
    const a = b.ridership.perAgency[aid];
    const net = a.after - a.before;
    if (Math.abs(net) >= 3_000) {
      items.push({
        label: `${aid.toUpperCase()} ridership`,
        delta: formatRidersDelta(net),
        magnitude: Math.abs(net) / 100, // scale so it compares to $M
        tone: net > 0 ? 'positive' : 'negative',
      });
    }
  }

  // Project transitions
  for (const t of b.projects.transitions) {
    items.push({
      label: `${catalogEntry(t.templateId)?.name ?? t.templateId} transition`,
      delta: `${t.from} → ${t.to}`,
      magnitude: 1_000_000, // always surface
      tone: 'positive',
    });
  }

  // Debt refi events
  if (b.debt.tranchesRefinanced > 0) {
    items.push({
      label: 'Tranches refinanced',
      delta: `${b.debt.tranchesRefinanced}`,
      magnitude: 500_000,
      tone: 'neutral',
    });
  }

  items.sort((x, y) => y.magnitude - x.magnitude);
  const top5 = items.slice(0, 5);

  // Player decisions + standing-order auto-actions from this quarter
  const decisionsAndActions = log.filter(
    (e) =>
      (e.kind === 'player_decision' || e.kind === 'player_action') &&
      (e.quarter as unknown as number) === q,
  );

  const briefing = briefingFor(state);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          State of the agency — {quarterLabel(q)}
        </h2>
        {decisionsAndActions.length > 0 && (
          <span className="text-[10px] text-blue-700 num">
            {decisionsAndActions.length} action{decisionsAndActions.length === 1 ? '' : 's'}
          </span>
        )}
      </header>
      <p className="mt-2 rounded-md border-l-2 border-blue-300 bg-blue-50/40 px-3 py-2 text-[13px] leading-relaxed text-neutral-700 italic">
        {briefing}
      </p>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-neutral-500">
        Top changes
      </div>
      {b.projects.transitions
        .filter((t) => t.to === 'operating' && t.openingImpact)
        .map((t) => {
          const oi = t.openingImpact!;
          const name = catalogEntry(t.templateId)?.name ?? t.templateId;
          return (
            <div
              key={t.templateId}
              className="mt-3 rounded-md border-2 border-emerald-300 bg-emerald-50 p-3"
            >
              <div className="text-sm font-bold text-emerald-900">🎉 {name} is now open!</div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-700">Ramps to</div>
                  <div className="num font-semibold text-emerald-900">
                    +{(oi.fullRidership / 1000).toFixed(0)}k riders
                  </div>
                  <div className="text-[10px] text-emerald-600">{oi.primaryAgency.toUpperCase()}, over 8Q</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-700">LVC revenue</div>
                  <div className="num font-semibold text-emerald-900">
                    {oi.lvcRevenuePerQ > 0 ? `+$${oi.lvcRevenuePerQ}M/Q` : 'none'}
                  </div>
                  <div className="text-[10px] text-emerald-600">land value capture</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-emerald-700">Fare impact</div>
                  <div className="num font-semibold text-emerald-900">grows w/ ridership</div>
                  <div className="text-[10px] text-emerald-600">scales as riders ramp</div>
                </div>
              </div>
            </div>
          );
        })}
      {top5.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No significant changes.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {top5.map((item, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between border-b border-neutral-100 pb-1.5 last:border-0 last:pb-0"
            >
              <span className="text-xs text-neutral-700">{item.label}</span>
              <span
                className={`num text-xs font-semibold ${
                  item.tone === 'positive'
                    ? 'text-emerald-700'
                    : item.tone === 'negative'
                      ? 'text-red-700'
                      : 'text-neutral-700'
                }`}
              >
                {item.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
      {decisionsAndActions.length > 0 && (
        <div className="mt-3 border-t border-neutral-100 pt-2">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">
            Decisions + automations this quarter
          </div>
          <ul className="mt-1 space-y-1">
            {decisionsAndActions.map((e) => (
              <li key={e.id} className="text-[11px] text-neutral-600">
                · {e.summary}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
