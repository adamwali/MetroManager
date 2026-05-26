import { useGameStore } from '@state/gameStore';

/**
 * Priority inbox per design doc §4. Filtered to urgent items only.
 * Phase 3.1 wires real events; Phase 2.1 shows the empty state.
 */
export function Inbox() {
  const inbox = useGameStore((s) => s.state.inbox);
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Priority inbox
      </h2>
      {inbox.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No urgent items. Click <span className="font-medium text-neutral-700">End turn</span>{' '}
          when you're ready to advance the quarter.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {inbox.map((e) => (
            <li key={e.templateId} className="rounded border border-neutral-200 p-2 text-sm">
              {e.templateId}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
