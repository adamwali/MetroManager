import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { eventTemplateById } from '@engine/events/templates';
import { EventModal } from './EventModal';

/**
 * Priority inbox per design doc §4. Shows active events sorted by urgency.
 * Each item opens the EventModal on click for response.
 */
export function Inbox() {
  const inbox = useGameStore((s) => s.state.inbox);
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  const sorted = [...inbox].sort((a, b) => b.urgency - a.urgency);

  return (
    <>
      <section className="rounded-md border border-neutral-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Priority inbox
          </h2>
          {sorted.length > 0 && (
            <span className="num text-xs font-semibold text-blue-700">
              {sorted.length} pending
            </span>
          )}
        </div>
        {sorted.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No urgent items. Click <span className="font-medium text-neutral-700">End turn</span>{' '}
            when you're ready to advance the quarter.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sorted.map((e) => {
              const tmpl = eventTemplateById(e.templateId);
              if (!tmpl) return null;
              const urgent = e.urgency >= 70;
              return (
                <li key={e.templateId}>
                  <button
                    type="button"
                    onClick={() => setOpenTemplateId(e.templateId)}
                    className={`block w-full text-left rounded-md border p-3 transition-colors ${
                      urgent
                        ? 'border-red-200 bg-red-50/40 hover:bg-red-50'
                        : 'border-neutral-200 hover:border-blue-400 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      {tmpl.outlet && (
                        <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                          {tmpl.outlet}
                        </span>
                      )}
                      {urgent && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-red-700">
                          Urgent
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-500">
                        urgency {e.urgency}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-neutral-900">
                      {tmpl.headline}
                    </div>
                    <div className="mt-1 text-xs text-neutral-600 line-clamp-2">
                      {tmpl.body}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {openTemplateId && (
        <EventModal
          templateId={openTemplateId}
          onClose={() => setOpenTemplateId(null)}
        />
      )}
    </>
  );
}
