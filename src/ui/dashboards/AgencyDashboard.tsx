import { useMemo, useState } from 'react';
import { useGameStore } from '@state/gameStore';
import {
  forecastMaintenance,
  maintenanceTier,
  reliabilityScore,
  requiredMaintenanceFor,
} from '@engine/agencies';
import {
  fareFreezeObligationBroken,
  forecastFarePolicy,
  forecastFrequencyPolicy,
} from '@engine/agencyActions';
import { ARCHETYPE_MAINTENANCE_EFFICIENCY } from '@engine/policies';
import type { AgencyId, FarePolicyTier, SubsystemCondition, SubsystemId } from '@/types/agency';
import type { CeoArchetype } from '@/types/ceo';
import type { FrequencyPolicy } from '@engine/policies';
import {
  describeReliability,
  formatMoney,
  formatMoneyDelta,
  formatPctDelta,
  formatRiders,
  quartersUntilLabel,
} from '@/utils/humanize';
import { useDebouncedCommit } from '@/utils/useDebouncedValue';

const SUBSYSTEM_LABELS: Record<SubsystemId, string> = {
  rollingStock: 'Rolling stock',
  track: 'Track + infrastructure',
  signals: 'Signal systems',
  stations: 'Station infrastructure',
  catenary: 'Catenary + power',
};

const TIER_STYLES = {
  underspend: { color: 'text-red-700', bg: 'bg-red-50', label: 'Underspend' },
  required: { color: 'text-neutral-700', bg: 'bg-neutral-100', label: 'Required' },
  preventive: { color: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Preventive' },
  catchUp: { color: 'text-blue-700', bg: 'bg-blue-50', label: 'Catch-up' },
};

interface AgencyDashboardProps {
  agencyId: AgencyId;
  title: string;
  blurb: string;
}

export function AgencyDashboard({ agencyId, title, blurb }: AgencyDashboardProps) {
  const state = useGameStore((s) => s.state);
  const setMaintenance = useGameStore((s) => s.setMaintenanceBudget);
  const setFare = useGameStore((s) => s.setFarePolicy);
  const setFrequency = useGameStore((s) => s.setFrequencyPolicy);
  const agency = state.agencies[agencyId];
  const archetype = state.ceo.archetype;
  const reliability = reliabilityScore(agency);
  const required = requiredMaintenanceFor(agencyId);
  const efficiency = ARCHETYPE_MAINTENANCE_EFFICIENCY[archetype];
  const currentQ = state.quarter as unknown as number;

  // Active fare-freeze obligation for this agency, if any
  const activePledge = state.activeObligations.find(
    (o) =>
      o.kind === 'fareFreezePledge' &&
      o.agencyId === agencyId &&
      (o.expiresAt as unknown as number) > currentQ,
  );
  const quartersLeftInPledge = activePledge
    ? (activePledge.expiresAt as unknown as number) - currentQ
    : 0;

  const [pendingFareChange, setPendingFareChange] = useState<FarePolicyTier | null>(null);
  const handleFareClick = (p: FarePolicyTier) => {
    const broken = fareFreezeObligationBroken(state, agencyId, p);
    if (broken) {
      setPendingFareChange(p);
    } else {
      setFare(agencyId, p);
    }
  };
  const confirmBreak = () => {
    if (pendingFareChange) setFare(agencyId, pendingFareChange);
    setPendingFareChange(null);
  };

  const farePolicyForecasts = useMemo(
    () => ({
      reduced: forecastFarePolicy(state, agencyId, 'reduced'),
      current: forecastFarePolicy(state, agencyId, 'current'),
      modestIncrease: forecastFarePolicy(state, agencyId, 'modestIncrease'),
      aggressiveIncrease: forecastFarePolicy(state, agencyId, 'aggressiveIncrease'),
    }),
    [state, agencyId],
  );

  const frequencyPolicyForecasts = useMemo(
    () => ({
      reduced: forecastFrequencyPolicy(state, agencyId, 'reduced'),
      current: forecastFrequencyPolicy(state, agencyId, 'current'),
      enhanced: forecastFrequencyPolicy(state, agencyId, 'enhanced'),
    }),
    [state, agencyId],
  );

  const totalMaintenance = agency.subsystems.reduce(
    (acc, s) => acc + (s.maintenanceBudget as unknown as number),
    0,
  );

  // Phase 6.2.2: surface director with tolerance score
  const directorId = agencyId === 'ttc' ? 'c_ttc_director' : agencyId === 'go' ? 'c_go_director' : 'c_up_director';
  const director = state.characters[directorId];
  const toleranceN =
    director && director.role === 'director_operating'
      ? (director.tolerance as unknown as number)
      : 60;
  const tolTone =
    toleranceN < 20 ? 'text-red-700 bg-red-50' : toleranceN < 40 ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-neutral-600">{blurb}</p>
        {director && (
          <div className="mt-3 flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                Director
              </div>
              <div className="text-sm font-semibold">{director.name}</div>
              <div className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                {director.bio[0]?.split('. ')[0]}
              </div>
            </div>
            <div className={`rounded px-2 py-1 text-[10px] font-semibold ${tolTone}`}>
              Tolerance {toleranceN.toFixed(0)}/100
              {toleranceN < 20 && (
                <div className="text-[9px] mt-0.5 font-normal">considering quitting</div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Summary panel */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCell label="Daily riders" value={formatRiders(agency.dailyRiders as unknown as number)} />
        <SummaryCell
          label="Reliability"
          value={`${reliability.toFixed(0)}/100`}
          caption={describeReliability(reliability)}
        />
        <SummaryCell
          label="Opex / quarter"
          value={formatMoney(agency.lastQuarterOpex as unknown as number)}
        />
        <SummaryCell
          label="Fare revenue / quarter"
          value={formatMoney(agency.lastQuarterFareRevenue as unknown as number)}
        />
      </section>

      {/* Subsystems */}
      <section className="rounded-md border border-neutral-200 bg-white">
        <header className="border-b border-neutral-200 px-4 py-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Subsystem maintenance
            </h2>
            <p className="mt-1 text-[11px] text-neutral-500">
              Required per subsystem: {formatMoney(required)}/Q. Your archetype's maintenance
              efficiency is{' '}
              <span className="font-semibold">
                {efficiency.toFixed(2)}×
              </span>
              .
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Total / Q
            </div>
            <div className="num text-sm font-semibold">{formatMoney(totalMaintenance)}</div>
            <div className="num text-[10px] text-neutral-500">
              {formatMoney(totalMaintenance * 4)}/yr · {formatMoney(required * agency.subsystems.length)} required
            </div>
          </div>
        </header>
        <ul className="divide-y divide-neutral-200">
          {agency.subsystems.map((sub) => (
            <SubsystemRow
              key={sub.id}
              sub={sub}
              agencyId={agencyId}
              archetype={archetype}
              required={required}
              setMaintenance={setMaintenance}
            />
          ))}
        </ul>
      </section>

      {/* Active obligations banner */}
      {activePledge && (
        <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-3 flex items-center gap-3">
          <span className="rounded bg-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Active pledge
          </span>
          <div className="flex-1 text-sm text-amber-900">
            No fare hike pledge — expires in {quartersUntilLabel(quartersLeftInPledge)}.
            Breaking costs <span className="font-semibold">{activePledge.breakingDescription}</span>.
          </div>
        </div>
      )}

      {/* Policies */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PolicyCard
          title="Fare policy"
          caption="Higher price = more revenue per rider, fewer riders (elasticity)"
          current={agency.operatingParams.farePolicy}
          options={[
            { id: 'reduced', label: 'Reduced (-15%)' },
            { id: 'current', label: 'Current' },
            { id: 'modestIncrease', label: 'Modest (+10%)' },
            { id: 'aggressiveIncrease', label: 'Aggressive (+25%)' },
          ] satisfies Array<{ id: FarePolicyTier; label: string }>}
          onChange={handleFareClick}
          isBlocked={(p) => fareFreezeObligationBroken(state, agencyId, p) !== undefined}
          renderForecast={(p) => {
            const f = farePolicyForecasts[p];
            const broken = fareFreezeObligationBroken(state, agencyId, p);
            return (
              <div className="mt-1 text-[10px] text-neutral-500">
                {formatPctDelta(f.ridershipChangePct)} riders ·{' '}
                {formatPctDelta(f.revenueChangePct)} revenue
                {broken && (
                  <span className="mt-0.5 block font-semibold text-red-700">
                    Breaks pledge: {broken.breakingDescription}
                  </span>
                )}
              </div>
            );
          }}
        />
        <PolicyCard
          title="Frequency policy"
          caption="More service = more opex AND more riders"
          current={agency.operatingParams.frequencyPolicy}
          options={[
            { id: 'reduced', label: 'Reduced (-15% service)' },
            { id: 'current', label: 'Current' },
            { id: 'enhanced', label: 'Enhanced (+20% service)' },
          ] satisfies Array<{ id: FrequencyPolicy; label: string }>}
          onChange={(p) => setFrequency(agencyId, p)}
          renderForecast={(p) => {
            const f = frequencyPolicyForecasts[p];
            return (
              <div className="mt-1 text-[10px] text-neutral-500">
                {formatPctDelta(f.ridershipChangePct)} riders ·{' '}
                {formatMoneyDelta((f.newOpex - (agency.lastQuarterOpex as unknown as number)))}/Q opex
              </div>
            );
          }}
        />
      </div>

      {/* Confirm-break dialog for fare-freeze pledge */}
      {pendingFareChange && activePledge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-amber-900">Break the fare-freeze pledge?</h2>
            <p className="mt-2 text-sm text-neutral-700">
              You pledged no fare hikes for {quartersUntilLabel(quartersLeftInPledge)} more. Raising
              fares now will cost:
            </p>
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {activePledge.breakingDescription}
            </p>
            <p className="mt-2 text-xs text-neutral-600">
              Operating upside: the fare change still applies — you'll see the revenue + ridership
              shift on the next tick.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingFareChange(null)}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                Keep the pledge
              </button>
              <button
                type="button"
                onClick={confirmBreak}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
              >
                Break pledge & raise fare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SubsystemRowProps {
  sub: SubsystemCondition;
  agencyId: AgencyId;
  archetype: CeoArchetype;
  required: number;
  setMaintenance: (agencyId: AgencyId, sub: SubsystemId, amount: number) => void;
}

function SubsystemRow({ sub, agencyId, archetype, required, setMaintenance }: SubsystemRowProps) {
  const conditionN = sub.condition as unknown as number;
  const budgetN = sub.maintenanceBudget as unknown as number;
  const [displayBudget, setDisplayBudget] = useDebouncedCommit<number>(
    budgetN,
    (next) => setMaintenance(agencyId, sub.id, next),
    250,
  );
  const tier = maintenanceTier(displayBudget, agencyId, archetype);
  const tierStyle = TIER_STYLES[tier];
  const forecast = forecastMaintenance(
    sub.id,
    conditionN,
    budgetN,
    displayBudget,
    agencyId,
    archetype,
    4,
  );
  const projectedDelta = forecast.conditionInNQuarters - conditionN;
  const projectedSign = projectedDelta > 0 ? '+' : '';
  const projectedTone =
    projectedDelta > 0
      ? 'text-emerald-700'
      : projectedDelta < 0
        ? 'text-red-700'
        : 'text-neutral-500';
  return (
    <li className="px-4 py-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
        <div>
          <div className="text-sm font-medium">{SUBSYSTEM_LABELS[sub.id] ?? sub.id}</div>
          <div className="mt-1 flex items-baseline gap-2 text-xs text-neutral-600">
            <span className="num">Condition {conditionN.toFixed(0)}/100</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tierStyle.bg} ${tierStyle.color}`}
            >
              {tierStyle.label}
            </span>
          </div>
        </div>
        <div>
          <input
            type="range"
            min={0}
            max={required * 3}
            step={Math.max(1, Math.round(required / 10))}
            value={displayBudget}
            onChange={(e) => setDisplayBudget(Number(e.target.value))}
            className="w-full"
            aria-label={`${SUBSYSTEM_LABELS[sub.id]} maintenance budget`}
          />
          <div className="mt-1 flex justify-between text-[10px] text-neutral-400 num">
            <span>$0</span>
            <span>{formatMoney(required)} (req)</span>
            <span>{formatMoney(required * 3)}</span>
          </div>
          <div className={`mt-1 text-[11px] font-medium num ${projectedTone}`}>
            → {projectedSign}
            {projectedDelta.toFixed(1)} condition in 4Q
            <span className="ml-1 text-neutral-500 font-normal">
              ({forecast.quarterlyDelta >= 0 ? '+' : ''}
              {forecast.quarterlyDelta.toFixed(2)}/Q)
            </span>
          </div>
        </div>
        <div className="text-right num text-sm font-semibold">
          {formatMoney(displayBudget)}/Q
        </div>
      </div>
    </li>
  );
}

function SummaryCell({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="num mt-1 text-xl font-semibold">{value}</div>
      {caption && <div className="mt-0.5 text-[11px] text-neutral-500">{caption}</div>}
    </div>
  );
}

interface PolicyCardProps<T extends string> {
  title: string;
  caption: string;
  current: T;
  options: Array<{ id: T; label: string }>;
  onChange: (p: T) => void;
  renderForecast: (p: T) => React.ReactNode;
  /** Optional: returns true if this option would break an active obligation. */
  isBlocked?: (p: T) => boolean;
}

function PolicyCard<T extends string>({
  title,
  caption,
  current,
  options,
  onChange,
  renderForecast,
  isBlocked,
}: PolicyCardProps<T>) {
  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
      <p className="mt-1 text-xs text-neutral-500">{caption}</p>
      <div className="mt-3 space-y-1.5">
        {options.map((opt) => {
          const isCurrent = opt.id === current;
          const blocked = isBlocked ? isBlocked(opt.id) : false;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`block w-full text-left rounded-md border px-3 py-2 transition-colors ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50/60'
                  : blocked
                    ? 'border-amber-300 bg-amber-50/40 hover:border-amber-500'
                    : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
            >
              <div className="text-sm font-medium">{opt.label}</div>
              {isCurrent ? (
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                  Current
                </div>
              ) : (
                renderForecast(opt.id)
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
