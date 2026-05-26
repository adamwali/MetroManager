import { useGameStore } from '@state/gameStore';
import { eventTemplateById } from '@engine/events/templates';
import { visibleChoices } from '@engine/events/firing';
import { formatMoneyDelta } from '@/utils/humanize';

interface EventModalProps {
  templateId: string;
  onClose: () => void;
}

const EFFECT_AXIS_LABEL: Record<string, string> = {
  cash: 'Cash',
  governmentTrust: 'Trust',
  boardConfidence: 'Board',
  publicApproval: 'Approval',
  engineers: 'Engineers',
  templates: 'Templates',
  opex: 'Opex',
  fareRevenue: 'Fare',
  reliability: 'Reliability',
  ridership: 'Riders',
  queueDelayedEffect: 'Delayed',
  queueDelayedEvent: 'Delayed event',
};

export function EventModal({ templateId, onClose }: EventModalProps) {
  const state = useGameStore((s) => s.state);
  const applyEventChoice = useGameStore((s) => s.applyEventChoice);
  const template = eventTemplateById(templateId);
  if (!template) return null;

  const choices = visibleChoices(state, template);

  const handleChoice = (choiceId: string) => {
    applyEventChoice(templateId, choiceId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-baseline gap-3">
            {template.outlet && (
              <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {template.outlet}
              </span>
            )}
            <h1 className="text-lg font-semibold leading-tight">{template.headline}</h1>
          </div>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{template.body}</p>
        </header>
        <div className="px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Choose your response
          </p>
          <div className="space-y-2">
            {choices.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleChoice(c.id)}
                className="block w-full text-left rounded-md border border-neutral-200 p-3 hover:border-blue-500 hover:bg-blue-50/50 transition-colors"
              >
                <div className="text-sm font-medium text-neutral-900">{c.label}</div>
                <div className="mt-1 text-xs text-neutral-600">{c.tradeoff}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.effects.map((e, i) => {
                    let chipText = EFFECT_AXIS_LABEL[e.kind] ?? e.kind;
                    let tone = 'bg-neutral-100 text-neutral-700';
                    if (e.kind === 'cash') {
                      chipText = `Cash ${formatMoneyDelta(e.deltaM)}`;
                      tone = e.deltaM < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
                    } else if (e.kind === 'governmentTrust') {
                      chipText = `${e.gov} ${e.delta > 0 ? '+' : ''}${e.delta}`;
                      tone = e.delta < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
                    } else if (e.kind === 'boardConfidence') {
                      chipText = `Board ${e.delta > 0 ? '+' : ''}${e.delta}`;
                      tone = e.delta < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
                    } else if (e.kind === 'publicApproval') {
                      chipText = `Approval ${e.delta > 0 ? '+' : ''}${e.delta}`;
                      tone = e.delta < 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
                    } else if (e.kind === 'opex') {
                      chipText = `${e.agency} opex ${formatMoneyDelta(e.deltaM)}/Q`;
                      tone = e.deltaM > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700';
                    } else if (e.kind === 'fareRevenue') {
                      chipText = `${e.agency} fare ${formatMoneyDelta(e.deltaM)}/Q`;
                      tone = e.deltaM > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
                    } else if (e.kind === 'reliability') {
                      chipText = `${e.agency} reliability ${e.delta > 0 ? '+' : ''}${e.delta}`;
                      tone = e.delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
                    } else if (e.kind === 'engineers' || e.kind === 'templates') {
                      chipText = `${EFFECT_AXIS_LABEL[e.kind]} ${e.delta > 0 ? '+' : ''}${e.delta}`;
                      tone = e.delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
                    } else if (e.kind === 'queueDelayedEffect') {
                      chipText = `+${e.quartersOut}Q follow-up`;
                      tone = 'bg-blue-50 text-blue-700';
                    }
                    return (
                      <span
                        key={i}
                        className={`num inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
                      >
                        {chipText}
                      </span>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>
        </div>
        <footer className="border-t border-neutral-200 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            Decide later
          </button>
        </footer>
      </div>
    </div>
  );
}
