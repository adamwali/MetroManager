import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@state/gameStore';
import { projectQuarterlyCashFlow } from '@/utils/cashFlowForecast';
import { reliabilityScore, requiredMaintenanceFor } from '@engine/agencies';
import type { AgencyId, FarePolicyTier } from '@/types/agency';
import type { FrequencyPolicy } from '@engine/policies';
import { formatMoney } from '@/utils/humanize';

/**
 * Tune Operations — Phase 10.10. Per audit: agency sliders (maintenance,
 * fare, frequency, hiring) were buried 2 clicks deep on agency dashboards.
 * A new player might never touch them. This card surfaces the highest-
 * impact controls right on Mission Control with the live run-rate impact
 * next to each, so the lever→outcome connection is visible at decision time.
 *
 * One compact row per agency × policy: fare, frequency, maintenance (as
 * a global preventive/baseline/cut toggle), with the cash impact shown.
 */

const FARE_LABELS: Record<FarePolicyTier, string> = {
  reduced: 'Reduce',
  current: 'Current',
  modestIncrease: '+5%',
  aggressiveIncrease: '+15%',
};

const FREQ_LABELS: Record<FrequencyPolicy, string> = {
  reduced: 'Cut',
  current: 'Current',
  enhanced: 'Enhance',
};

const AGENCIES: Array<{ id: AgencyId; label: string }> = [
  { id: 'ttc', label: 'TTC' },
  { id: 'go', label: 'GO' },
  { id: 'up', label: 'UP' },
];

type MaintenanceTier = 'cut' | 'baseline' | 'preventive';

export function TuneOperationsCard() {
  const state = useGameStore((s) => s.state);
  const setFare = useGameStore((s) => s.setFarePolicy);
  const setFreq = useGameStore((s) => s.setFrequencyPolicy);
  const setMaint = useGameStore((s) => s.setMaintenanceBudget);
  const navigate = useNavigate();

  const current = projectQuarterlyCashFlow(state);

  // Compute what each candidate policy change would do to net cash flow.
  // We construct a hypothetical "after" state by mutating the relevant fields
  // and re-running projectQuarterlyCashFlow. Pure derivation — no side effects.
  const projectChange = (next: typeof state) =>
    projectQuarterlyCashFlow(next).net - current.net;

  // Compact stance summary derived from current settings.
  const stance = describeOperationsStance(state);

  return (
    <details className="rounded-md border border-neutral-200 bg-white p-4">
      <summary className="cursor-pointer list-none -m-1 p-1 hover:bg-neutral-50 rounded">
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Tune operations
            </h2>
            <span className="text-[10px] text-neutral-500">
              Stance: <span className="font-semibold text-neutral-700">{stance}</span>
            </span>
          </div>
          <span className="text-[10px] text-neutral-400">click to tune</span>
        </div>
      </summary>
      <header className="mt-3 mb-2 flex items-baseline justify-between">
        <p className="text-[11px] text-neutral-500">
          Highest-impact agency levers, with cash impact next to each.
        </p>
        <button
          type="button"
          onClick={() => navigate('/network')}
          className="text-[11px] font-medium text-blue-700 hover:underline"
        >
          Full controls →
        </button>
      </header>

      <div className="space-y-3">
        {AGENCIES.map(({ id, label }) => {
          const agency = state.agencies[id];
          const reliability = reliabilityScore(agency);
          const required = requiredMaintenanceFor(id);
          const currentMaint =
            agency.subsystems.reduce((s, sub) => s + (sub.maintenanceBudget as unknown as number), 0) /
            agency.subsystems.length;
          const maintTier: MaintenanceTier =
            currentMaint < required * 0.95
              ? 'cut'
              : currentMaint > required * 1.05
                ? 'preventive'
                : 'baseline';

          const hypFareModest = mutateAgency(state, id, { farePolicy: 'modestIncrease' });
          const hypFareCurrent = mutateAgency(state, id, { farePolicy: 'current' });
          const hypFreqCut = mutateAgency(state, id, { frequencyPolicy: 'reduced' });
          const hypFreqEnhanced = mutateAgency(state, id, { frequencyPolicy: 'enhanced' });
          const hypMaintCut = mutateAgencyMaintenance(state, id, Math.round(required * 0.85));
          const hypMaintBaseline = mutateAgencyMaintenance(state, id, required);
          const hypMaintPreventive = mutateAgencyMaintenance(state, id, Math.round(required * 1.15));

          const fareDeltaModest = projectChange(hypFareModest);
          const fareDeltaCurrent = projectChange(hypFareCurrent);
          const freqDeltaCut = projectChange(hypFreqCut);
          const freqDeltaEnhanced = projectChange(hypFreqEnhanced);
          const maintDeltaCut = projectChange(hypMaintCut);
          const maintDeltaBaseline = projectChange(hypMaintBaseline);
          const maintDeltaPreventive = projectChange(hypMaintPreventive);

          return (
            <div key={id} className="rounded border border-neutral-200 bg-neutral-50/30 p-2">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs font-semibold text-neutral-800">{label}</span>
                <span className="text-[10px] text-neutral-500 num">
                  reliability {reliability.toFixed(0)} · maint ${formatMaint(currentMaint)}/sub/Q
                </span>
              </div>

              <LeverRow
                label="Fare"
                current={agency.operatingParams.farePolicy}
                options={[
                  {
                    value: 'current',
                    label: FARE_LABELS.current,
                    delta: agency.operatingParams.farePolicy === 'current' ? 0 : fareDeltaCurrent,
                  },
                  {
                    value: 'modestIncrease',
                    label: FARE_LABELS.modestIncrease,
                    delta: agency.operatingParams.farePolicy === 'modestIncrease' ? 0 : fareDeltaModest,
                  },
                ]}
                onSelect={(v) => setFare(id, v as FarePolicyTier)}
              />
              <LeverRow
                label="Service"
                current={agency.operatingParams.frequencyPolicy}
                options={[
                  {
                    value: 'reduced',
                    label: FREQ_LABELS.reduced,
                    delta: agency.operatingParams.frequencyPolicy === 'reduced' ? 0 : freqDeltaCut,
                  },
                  {
                    value: 'current',
                    label: FREQ_LABELS.current,
                    delta: agency.operatingParams.frequencyPolicy === 'current' ? 0 : 0,
                  },
                  {
                    value: 'enhanced',
                    label: FREQ_LABELS.enhanced,
                    delta: agency.operatingParams.frequencyPolicy === 'enhanced' ? 0 : freqDeltaEnhanced,
                  },
                ]}
                onSelect={(v) => setFreq(id, v as FrequencyPolicy)}
              />
              <LeverRow
                label="Maintenance"
                current={maintTier}
                options={[
                  { value: 'cut', label: '-15%', delta: maintTier === 'cut' ? 0 : maintDeltaCut },
                  { value: 'baseline', label: 'Required', delta: maintTier === 'baseline' ? 0 : maintDeltaBaseline },
                  {
                    value: 'preventive',
                    label: '+15%',
                    delta: maintTier === 'preventive' ? 0 : maintDeltaPreventive,
                  },
                ]}
                onSelect={(v) => {
                  const target =
                    v === 'cut'
                      ? Math.round(required * 0.85)
                      : v === 'preventive'
                        ? Math.round(required * 1.15)
                        : required;
                  for (const sub of agency.subsystems) {
                    setMaint(id, sub.id, target);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </details>
  );
}

function describeOperationsStance(state: ReturnType<typeof useGameStore.getState>['state']): string {
  // Derive an at-a-glance stance from the policies actually in effect.
  let aggressive = 0;
  let cautious = 0;
  for (const id of ['ttc', 'go', 'up'] as const) {
    const a = state.agencies[id];
    const fare = a.operatingParams.farePolicy;
    const freq = a.operatingParams.frequencyPolicy;
    if (fare === 'modestIncrease' || fare === 'aggressiveIncrease') aggressive++;
    if (fare === 'reduced') cautious++;
    if (freq === 'enhanced') aggressive++;
    if (freq === 'reduced') cautious++;
    const required = requiredMaintenanceFor(id);
    const avg = a.subsystems.reduce((s, sub) => s + (sub.maintenanceBudget as unknown as number), 0) / a.subsystems.length;
    if (avg > required * 1.05) aggressive++;
    if (avg < required * 0.95) cautious++;
  }
  if (aggressive >= cautious + 2) return 'aggressive';
  if (cautious >= aggressive + 2) return 'cautious';
  return 'balanced';
}

function LeverRow({
  label,
  current,
  options,
  onSelect,
}: {
  label: string;
  current: string;
  options: { value: string; label: string; delta: number }[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-[10px] uppercase tracking-wider text-neutral-500 w-20">{label}</span>
      {options.map((opt) => {
        const active = opt.value === current;
        const deltaCls =
          opt.delta > 1 ? 'text-emerald-700' : opt.delta < -1 ? 'text-red-700' : 'text-neutral-500';
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`flex-1 rounded px-1.5 py-1 text-[11px] font-medium border transition-colors ${
              active
                ? 'border-blue-400 bg-blue-100 text-blue-900'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
            }`}
          >
            <div>{opt.label}</div>
            {!active && Math.abs(opt.delta) >= 1 && (
              <div className={`text-[9px] num ${deltaCls}`}>
                {opt.delta > 0 ? '+' : ''}
                {formatMoney(opt.delta)}/Q
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function formatMaint(n: number): string {
  return n >= 10 ? n.toFixed(0) : n.toFixed(1);
}

// Hypothetical state mutations — pure copies for forecast computation.
function mutateAgency(
  state: ReturnType<typeof useGameStore.getState>['state'],
  id: AgencyId,
  patch: Partial<{ farePolicy: FarePolicyTier; frequencyPolicy: FrequencyPolicy }>,
) {
  const agency = state.agencies[id];
  return {
    ...state,
    agencies: {
      ...state.agencies,
      [id]: { ...agency, operatingParams: { ...agency.operatingParams, ...patch } },
    },
  };
}

function mutateAgencyMaintenance(
  state: ReturnType<typeof useGameStore.getState>['state'],
  id: AgencyId,
  budgetPerSub: number,
) {
  const agency = state.agencies[id];
  return {
    ...state,
    agencies: {
      ...state.agencies,
      [id]: {
        ...agency,
        subsystems: agency.subsystems.map((sub) => ({
          ...sub,
          maintenanceBudget: budgetPerSub as unknown as typeof sub.maintenanceBudget,
        })),
      },
    },
  };
}
