import { useGameStore } from '@state/gameStore';
import { eventTemplateById } from '@engine/events/templates';
import { visibleChoices } from '@engine/events/firing';
import { previewRenegotiation } from '@engine/renegotiation';
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

function RenegotiationPreviewPanel() {
  const state = useGameStore((s) => s.state);
  const acceptPreview = previewRenegotiation(state, 'accept');
  const aggressivePreview = previewRenegotiation(state, 'aggressive');
  const currentAllowance = state.operatingAllowance.annualAmount as unknown as number;
  const tone = (m: number) =>
    m >= 1.0 ? 'text-emerald-700' : m >= 0.9 ? 'text-amber-700' : 'text-red-700';
  const fmt = (m: number) =>
    `${m >= 1 ? '+' : ''}${((m - 1) * 100).toFixed(0)}% → $${Math.round(currentAllowance * m).toLocaleString()}M/yr`;
  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 text-xs">
      <div className="font-semibold text-blue-900 mb-1.5">
        Your scorecard: avg trust {acceptPreview.avgTrust.toFixed(0)} · board{' '}
        {acceptPreview.boardScore.toFixed(0)} · {acceptPreview.deliveryWins} delivery
        win{acceptPreview.deliveryWins === 1 ? '' : 's'}
      </div>
      <div className="space-y-1 text-neutral-700">
        <div>
          <span className="font-semibold">If you Accept:</span>{' '}
          <span className={`num font-semibold ${tone(acceptPreview.allowanceMultiplier)}`}>
            {fmt(acceptPreview.allowanceMultiplier)}
          </span>
          {acceptPreview.controls.length > 0 && (
            <span className="ml-1 text-red-700">
              + {acceptPreview.controls.length} control{acceptPreview.controls.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div>
          <span className="font-semibold">If you Lobby aggressively:</span>{' '}
          <span className={`num font-semibold ${tone(aggressivePreview.allowanceMultiplier)}`}>
            {fmt(aggressivePreview.allowanceMultiplier)}
          </span>
          <span className="ml-1 text-neutral-500">(at -5 approval, -3 each gov)</span>
        </div>
      </div>
    </div>
  );
}

export function EventModal({ templateId, onClose }: EventModalProps) {
  const state = useGameStore((s) => s.state);
  const applyEventChoice = useGameStore((s) => s.applyEventChoice);
  const template = eventTemplateById(templateId);
  if (!template) return null;

  const choices = visibleChoices(state, template);
  const actor =
    template.actorCharacterId !== undefined
      ? state.characters[template.actorCharacterId]
      : undefined;
  // CEO name interpolation: replace {ceoName} with the player's chosen name
  const interpolate = (text: string): string =>
    text.replace(/\{ceoName\}/g, state.ceo.name);
  const headline = interpolate(template.headline);
  const body = interpolate(template.body);

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
            <h1 className="text-lg font-semibold leading-tight">{headline}</h1>
          </div>
          {actor && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50/40 px-2.5 py-1.5">
              <span className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">
                Via
              </span>
              <span className="text-xs font-semibold text-neutral-800">{actor.name}</span>
              <span className="text-[10px] text-neutral-500">
                relationship {(actor.relationship as unknown as number).toFixed(0)}/100
              </span>
            </div>
          )}
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{body}</p>
          {/* Renegotiation outcome preview (EV041 only) */}
          {templateId === 'EV041_allowanceRenegotiation' && (
            <RenegotiationPreviewPanel />
          )}
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
