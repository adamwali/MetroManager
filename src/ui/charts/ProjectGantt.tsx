import type { ProjectGanttBar } from '@/utils/historyCharts';
import { catalogEntry } from '@engine/projectCatalog';
import { quarterLabel } from '@/utils/humanize';

interface Props {
  bars: ProjectGanttBar[];
  currentQuarter: number;
}

const STATE_STYLE = {
  proposed: { color: '#f59e0b', label: 'Proposed' },
  under_construction: { color: '#3b82f6', label: 'Construction' },
  operating: { color: '#10b981', label: 'Operating' },
};

/**
 * Hand-rolled Gantt — Recharts has no first-class Gantt and rolling our
 * own is simpler than fighting their API for this case. Renders bars
 * positioned by quarter on a horizontal timeline.
 */
export function ProjectGantt({ bars, currentQuarter }: Props) {
  if (bars.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        No projects yet. Propose one from Capital Projects.
      </p>
    );
  }
  // Window: show from earliest start to current+windowQuarters
  const earliestStart = Math.min(...bars.map((b) => b.startQ), currentQuarter);
  const latestEnd = Math.max(...bars.map((b) => b.endQ), currentQuarter + 4);
  const totalQ = Math.max(1, latestEnd - earliestStart);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-neutral-500">
        <span>{quarterLabel(earliestStart)}</span>
        <span className="font-semibold text-neutral-700">↓ Now: {quarterLabel(currentQuarter)}</span>
        <span>{quarterLabel(latestEnd)}</span>
      </div>
      {bars.map((b) => {
        const entry = catalogEntry(b.templateId);
        const startPct = ((b.startQ - earliestStart) / totalQ) * 100;
        const widthPct = Math.max(2, ((b.endQ - b.startQ) / totalQ) * 100);
        const style = STATE_STYLE[b.state];
        return (
          <div key={b.templateId} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">
                {b.templateId} {entry ? `· ${entry.name}` : ''}
              </span>
              <span className="text-[10px] text-neutral-500">{style.label}</span>
            </div>
            <div className="relative h-4 rounded-sm bg-neutral-100">
              <div
                className="absolute top-0 h-4 rounded-sm"
                style={{
                  left: `${startPct}%`,
                  width: `${widthPct}%`,
                  backgroundColor: style.color,
                }}
                title={`${b.templateId}: ${quarterLabel(b.startQ)} → ${quarterLabel(b.endQ)}`}
              />
              {/* Current-quarter marker */}
              <div
                className="absolute top-0 h-4 w-px bg-neutral-700"
                style={{ left: `${((currentQuarter - earliestStart) / totalQ) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
