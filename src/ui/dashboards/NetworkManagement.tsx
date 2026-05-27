import { useState } from 'react';
import { AgencyDashboard } from './AgencyDashboard';
import type { AgencyId } from '@/types/agency';

const AGENCY_META: Record<AgencyId, { label: string; blurb: string; color: string }> = {
  ttc: {
    label: 'TTC',
    blurb: 'Subway + bus + streetcar across Toronto. ~3.2M daily riders; the workhorse.',
    color: 'border-cyan-500',
  },
  go: {
    label: 'GO',
    blurb: 'Regional commuter rail + bus. ~335k daily riders; suburban + intercity.',
    color: 'border-violet-500',
  },
  up: {
    label: 'UP Express',
    blurb: 'Airport-Union express rail. ~12k daily riders; premium product, thin margins.',
    color: 'border-amber-500',
  },
};

/**
 * Network Management dashboard. Phase 10 nav restructure.
 *
 * Combines TTC / GO / UP into one tab with inline switcher. Reduces top
 * nav from 8 → 5 items. Each sub-tab renders the existing AgencyDashboard
 * with its agency-specific data.
 */
export function NetworkManagement() {
  const [agencyId, setAgencyId] = useState<AgencyId>('ttc');
  const meta = AGENCY_META[agencyId];
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Network Management</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Operating levers across the three agencies. Maintenance, fare, frequency, security,
          cleanliness — and each director's tolerance.
        </p>
        <div className="mt-3 flex gap-1.5 border-b border-neutral-200">
          {(['ttc', 'go', 'up'] as AgencyId[]).map((id) => {
            const m = AGENCY_META[id];
            const active = id === agencyId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAgencyId(id)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                  active
                    ? `${m.color} text-neutral-900`
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </header>
      <AgencyDashboard
        key={agencyId}
        agencyId={agencyId}
        title={`${meta.label} Operations`}
        blurb={meta.blurb}
      />
    </div>
  );
}
