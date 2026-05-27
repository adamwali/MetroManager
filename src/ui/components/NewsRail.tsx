import { useGameStore } from '@state/gameStore';
import type { ActionLogEntry } from '@/types/actionLog';
import { quarterLabel } from '@/utils/humanize';

/**
 * News rail per design doc §4. Shows recent action-log entries as a
 * narrative ticker. Surfaces:
 *   - event_telegraph (early warnings, no inbox)
 *   - event_informational (election results, milestones, no inbox)
 *   - event_fired (showed up in inbox; reminder here)
 *   - player_decision (what you chose)
 *   - quarter_summary (the engine's recap)
 *
 * Phase 8.5 will add character-voice rendering. For now newsroom-style.
 */
export function NewsRail() {
  const log = useGameStore((s) => s.state.actionLog);
  const quarter = useGameStore((s) => s.state.quarter as unknown as number);
  const recent = log.slice(-10).reverse();

  return (
    <aside className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Recent activity
      </h2>
      {recent.length === 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-neutral-500">
            Campaign just started. After your first turn, this rail tracks each quarter's recap.
          </p>
          <p className="text-[11px] text-neutral-400 italic">
            ⓘ Most events fire from Q3 onward. The first 2-3 quarters are quiet on purpose
            — you've got time to set maintenance, plan, and feel out the system.
          </p>
        </div>
      ) : recent.length < 4 && quarter < 4 ? (
        <>
          <p className="mt-3 text-[11px] text-neutral-400 italic">
            ⓘ Event cadence picks up from Q3-4 onward.
          </p>
          <ul className="mt-3 space-y-2">{renderRail(recent)}</ul>
        </>
      ) : (
        <ul className="mt-3 space-y-2">
          {renderRail(recent)}
        </ul>
      )}
    </aside>
  );
}

function renderRail(recent: ActionLogEntry[]) {
  return (
    <>
      {recent.map((e) => {
            const isTelegraph = e.kind === 'event_telegraph';
            const isInfo = e.kind === 'event_informational';
            const isFired = e.kind === 'event_fired';
            const isDecision = e.kind === 'player_decision';
            const outlet =
              isTelegraph || isInfo ? (e as { outlet?: string }).outlet : undefined;
            const accentColor =
              isTelegraph
                ? 'border-amber-400'
                : isInfo
                  ? 'border-blue-400'
                  : isFired
                    ? 'border-red-400'
                    : isDecision
                      ? 'border-emerald-400'
                      : 'border-neutral-200';
            const labelText = isTelegraph
              ? 'Telegraph'
              : isInfo
                ? 'News'
                : isFired
                  ? 'Event'
                  : isDecision
                    ? 'Decision'
                    : '';
            const labelColor = isTelegraph
              ? 'text-amber-700'
              : isInfo
                ? 'text-blue-700'
                : isFired
                  ? 'text-red-700'
                  : isDecision
                    ? 'text-emerald-700'
                    : 'text-neutral-500';
            return (
              <li key={e.id} className={`border-l-2 ${accentColor} pl-3 text-xs`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-neutral-700">
                    {quarterLabel(e.quarter as unknown as number)}
                  </span>
                  {labelText && (
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider ${labelColor}`}
                    >
                      {labelText}
                    </span>
                  )}
                </div>
                {outlet && (
                  <div className="mt-0.5 text-[9px] uppercase tracking-wider text-neutral-400">
                    {outlet}
                  </div>
                )}
                <div className="text-neutral-700">
                  {isTelegraph || isInfo
                    ? (e as { headline: string }).headline
                    : e.summary}
                </div>
                {(isTelegraph || isInfo) && (
                  <div className="mt-0.5 text-[10px] text-neutral-500 line-clamp-2">
                    {(e as { body: string }).body}
                  </div>
                )}
              </li>
            );
          })}
    </>
  );
}
