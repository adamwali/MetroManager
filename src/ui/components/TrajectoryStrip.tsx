import { useGameStore } from '@state/gameStore';
import { trajectoryFor, networkTrajectory } from '@/utils/agencyTrajectory';
import type { AgencyId } from '@/types/agency';

/**
 * Phase 11: per-agency trajectory strip. Collapses 9 maintenance sliders
 * + 3 fare policies + 3 reliability gauges into one arrow per agency,
 * so the player has a single "is this getting better or worse" signal
 * at a glance. Click an arrow to jump to the agency's detailed page.
 */

const TRAJ_STYLE = {
  improving: { dot: 'bg-emerald-500', text: 'text-emerald-700', arrow: '↑', label: 'Improving' },
  stable:    { dot: 'bg-neutral-400', text: 'text-neutral-700', arrow: '→', label: 'Stable' },
  declining: { dot: 'bg-red-500',     text: 'text-red-700',     arrow: '↓', label: 'Declining' },
} as const;

const AGENCY_LABEL: Record<AgencyId, string> = { ttc: 'TTC', go: 'GO Transit', up: 'UP Express' };

export function TrajectoryStrip() {
  const state = useGameStore((s) => s.state);
  const net = networkTrajectory(state);

  // Single-line headline summary. Reads at a glance: "Network: 2 improving,
  // 1 declining" with a directional dot color tied to overall net.
  const headlineColor =
    net.net >= 2 ? 'bg-emerald-500'
    : net.net <= -2 ? 'bg-red-500'
    : net.net > 0 ? 'bg-emerald-400'
    : net.net < 0 ? 'bg-amber-400'
    : 'bg-neutral-400';

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${headlineColor}`} />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Network trajectory
          </h2>
          <span className="text-[10px] text-neutral-500">
            {net.improving > 0 && <span className="text-emerald-700">↑{net.improving} </span>}
            {net.stable > 0 && <span className="text-neutral-500">→{net.stable} </span>}
            {net.declining > 0 && <span className="text-red-700">↓{net.declining}</span>}
          </span>
        </div>
        <span className="text-[10px] text-neutral-400">
          {net.net > 0 ? 'Board likes what they see' : net.net < 0 ? 'Board is noticing' : 'Holding steady'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['ttc', 'go', 'up'] as const).map((id) => {
          const t = trajectoryFor(state, id);
          const style = TRAJ_STYLE[t.trajectory];
          return (
            <div key={id} className="rounded border border-neutral-100 bg-neutral-50/60 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-800">{AGENCY_LABEL[id]}</span>
                <span className={`text-sm font-bold ${style.text}`}>{style.arrow}</span>
              </div>
              <div className={`text-[10px] font-semibold ${style.text}`}>{style.label}</div>
              <div className="text-[10px] text-neutral-500 num">
                reliability {t.reliability.toFixed(0)} · maint{' '}
                {(t.maintenanceFundedPct * 100).toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
