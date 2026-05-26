import { useGameStore } from '@state/gameStore';
import { quarterLabel } from '@/utils/humanize';

/**
 * News rail per design doc §4. Shows recent action-log entries as a
 * running narrative. Phase 8.5 will add real-outlet voices; for now we
 * surface the engine's quarter_summary entries.
 */
export function NewsRail() {
  const log = useGameStore((s) => s.state.actionLog);
  const recent = log.slice(-8).reverse();
  return (
    <aside className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Recent activity
      </h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Campaign just started.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map((e) => (
            <li key={e.id} className="border-l-2 border-neutral-200 pl-3 text-xs">
              <div className="font-semibold text-neutral-700">
                {quarterLabel(e.quarter as unknown as number)}
              </div>
              <div className="text-neutral-600">{e.summary}</div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
