import { useGameStore } from '@state/gameStore';
import { METRIC_LABEL, buildTrace, type TraceMetric } from '@/utils/trace';
import {
  formatMoneyDelta,
  formatRidersDelta,
  quarterLabel,
} from '@/utils/humanize';

interface TraceDrawerProps {
  metric: TraceMetric | null;
  onClose: () => void;
}

const SOURCE_STYLE = {
  quarter: { color: 'border-neutral-400 text-neutral-700', label: 'Quarter recap' },
  decision: { color: 'border-emerald-400 text-emerald-700', label: 'Decision' },
  action: { color: 'border-blue-400 text-blue-700', label: 'Action' },
  standingOrder: { color: 'border-indigo-400 text-indigo-700', label: 'Standing order' },
  event: { color: 'border-amber-400 text-amber-700', label: 'Event' },
  telegraph: { color: 'border-amber-300 text-amber-600', label: 'Telegraph' },
  system: { color: 'border-neutral-300 text-neutral-600', label: 'System' },
};

function formatMagnitude(metric: TraceMetric, mag: number | undefined): string {
  if (mag === undefined) return '';
  if (metric === 'cash') return formatMoneyDelta(mag);
  if (metric === 'totalRiders') return formatRidersDelta(mag);
  // Signed integer for trust / board / approval
  return `${mag > 0 ? '+' : ''}${mag}`;
}

export function TraceDrawer({ metric, onClose }: TraceDrawerProps) {
  const state = useGameStore((s) => s.state);
  if (!metric) return null;
  const trace = buildTrace(state, metric, 25);

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40 bg-neutral-900/30"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto bg-white shadow-xl"
        role="dialog"
        aria-label={`Why is ${METRIC_LABEL[metric]} at this value?`}
      >
        <header className="sticky top-0 border-b border-neutral-200 bg-white px-5 py-4 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">
              Trace
            </p>
            <h2 className="text-base font-semibold">
              Why is {METRIC_LABEL[metric]} at this value?
            </h2>
            <p className="mt-1 text-[11px] text-neutral-500">
              Recent log entries that moved this metric, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
            aria-label="Close trace"
          >
            ×
          </button>
        </header>

        <ol className="divide-y divide-neutral-100">
          {trace.length === 0 ? (
            <li className="px-5 py-6 text-sm text-neutral-500">
              No log entries yet for this metric. Try ending a few turns or taking
              actions and come back.
            </li>
          ) : (
            trace.map((entry) => {
              const style = SOURCE_STYLE[entry.source];
              const magStr = formatMagnitude(metric, entry.magnitude);
              return (
                <li key={entry.id} className={`px-5 py-3 border-l-4 ${style.color}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider">
                        {style.label}
                      </div>
                      <div className="num text-[10px] text-neutral-500">
                        {quarterLabel(entry.quarter)}
                      </div>
                    </div>
                    {magStr && (
                      <span
                        className={`num text-sm font-semibold ${
                          entry.magnitude !== undefined && entry.magnitude < 0
                            ? 'text-red-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {magStr}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-700 leading-snug">
                    {entry.summary}
                  </p>
                </li>
              );
            })
          )}
        </ol>

        <p className="px-5 py-3 text-[10px] text-neutral-500 border-t border-neutral-100">
          Some entries lack precise magnitudes (e.g., events triggering randomly).
          Read summaries for context.
        </p>
      </aside>
    </>
  );
}
