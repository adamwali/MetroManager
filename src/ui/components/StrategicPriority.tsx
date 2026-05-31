import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@state/gameStore';
import { computeStrategicPriority, type Lever } from '@/utils/strategicPriority';

/**
 * Strategic Priority — answers "what's the most important thing for me right now."
 * Phase 10.10 — the missing mental-model layer flagged by player feedback +
 * audit. Always tells you the single top constraint and the 2-3 fastest
 * levers to address it, with concrete numbers.
 *
 * Pinned at top of Mission Control. Updates live as state changes.
 */

const SEVERITY_STYLES = {
  critical: {
    border: 'border-red-300',
    bg: 'bg-red-50',
    tag: 'bg-red-200 text-red-900',
    tagLabel: 'PRIORITY',
  },
  warning: {
    border: 'border-amber-300',
    bg: 'bg-amber-50/60',
    tag: 'bg-amber-200 text-amber-900',
    tagLabel: 'PRIORITY',
  },
  watch: {
    border: 'border-blue-200',
    bg: 'bg-blue-50/50',
    tag: 'bg-blue-200 text-blue-900',
    tagLabel: 'WATCH',
  },
  allClear: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/40',
    tag: 'bg-emerald-200 text-emerald-900',
    tagLabel: 'CLEAR',
  },
} as const;

export function StrategicPriority() {
  const state = useGameStore((s) => s.state);
  const navigate = useNavigate();
  const commissionAudit = useGameStore((s) => s.commissionVoluntaryAudit);
  const runConsultation = useGameStore((s) => s.runCommunityConsultation);

  const priority = computeStrategicPriority(state);
  const style = SEVERITY_STYLES[priority.severity];

  const handleLever = (lever: Lever) => {
    const a = lever.action;
    switch (a.kind) {
      case 'navigate':
        navigate(a.to);
        return;
      case 'voluntaryAudit':
        commissionAudit();
        return;
      case 'communityConsultation':
        runConsultation();
        return;
      case 'issueBond':
        navigate('/treasury');
        return;
      case 'callFavor':
      case 'adHocFunding':
        navigate('/political');
        return;
      case 'terminateConsultants':
        navigate('/treasury');
        return;
    }
  };

  return (
    <section className={`rounded-md border-2 ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.tag}`}>
            {style.tagLabel}
          </span>
          <h2 className="text-sm font-bold text-neutral-900">{priority.title}</h2>
        </div>
      </div>
      <p className="text-xs text-neutral-700 leading-snug">
        <span className="font-medium">Why:</span> {priority.why}
      </p>
      <p className="text-xs text-neutral-600 leading-snug mt-1">
        <span className="font-medium">If ignored:</span> {priority.ifIgnored}
      </p>
      {priority.levers.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1.5">
            Fastest levers
          </div>
          <ul className="space-y-1.5">
            {priority.levers.map((lever, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleLever(lever)}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50/50"
                >
                  <div className="text-xs font-semibold text-neutral-900">{lever.label} →</div>
                  <div className="text-[11px] text-neutral-600 mt-0.5">{lever.effect}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
