import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import {
  STATION_QUALITY_MULTIPLIER,
  catalogEntry,
  realizedProjectCost,
  type ProjectCatalogEntry,
  type StationQualityTier,
} from '@engine/projectCatalog';
import {
  PROPOSED_STUDY_BUFFER_QUARTERS,
  availableProjectCatalog,
} from '@engine/projectActions';
import { generateFinancingOffers } from '@engine/financing';
import { lvcRevenuePerStation } from '@engine/cashflow';
import { NetworkMap } from '@ui/components/NetworkMap';
import {
  FINANCING_APPROACH_SOURCE,
  type FinancingApproach,
  type FinancingOffer,
  type ConstructingProject,
  type OperatingProject,
  type Project,
  type ProposedProject,
} from '@/types/projects';
import {
  formatMoney,
  formatPct,
  formatRiders,
  quarterLabel,
  quartersUntilLabel,
} from '@/utils/humanize';
import { useDebouncedCommit } from '@/utils/useDebouncedValue';

export function CapitalProjects() {
  const state = useGameStore((s) => s.state);
  const [showInitiate, setShowInitiate] = useState(false);
  const [openFinancingFor, setOpenFinancingFor] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold">Capital Projects</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Active builds + the pipeline. Initiate new projects to grow the network.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInitiate(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Propose new project
        </button>
      </header>

      <CapacityBar
        templates={state.engineVars.templates as unknown as number}
        engineers={state.engineVars.engineers}
        crosslinx={state.engineVars.crosslinxLeverage as unknown as number}
      />

      <NetworkMap />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Active projects
        </h2>
        {state.projects.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No active projects. Propose one to begin building the network.
          </p>
        ) : (
          state.projects.map((p) => (
            <ProjectRow
              key={p.templateId}
              project={p}
              onOpenFinancing={() => setOpenFinancingFor(p.templateId)}
            />
          ))
        )}
      </section>

      {showInitiate && <InitiateProjectModal onClose={() => setShowInitiate(false)} />}
      {openFinancingFor && (
        <FinancingModal
          projectId={openFinancingFor}
          onClose={() => setOpenFinancingFor(null)}
        />
      )}
    </div>
  );
}

function ProjectRow({
  project,
  onOpenFinancing,
}: {
  project: Project;
  onOpenFinancing: () => void;
}) {
  const state = useGameStore((s) => s.state);
  const rejectProject = useGameStore((s) => s.rejectProject);
  const entry = catalogEntry(project.templateId);
  const currentQ = state.quarter as unknown as number;

  const stateStyle: Record<Project['state'], { color: string; label: string }> = {
    proposed: { color: 'border-amber-300 bg-amber-50/30', label: 'Proposed' },
    under_construction: { color: 'border-blue-300 bg-blue-50/30', label: 'Under construction' },
    operating: { color: 'border-emerald-300 bg-emerald-50/30', label: 'Operating' },
  };
  const style = stateStyle[project.state];

  return (
    <div className={`rounded-md border-2 p-4 ${style.color}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              {project.templateId}
            </span>
            <h3 className="text-sm font-semibold">{entry?.name ?? project.templateId}</h3>
          </div>
          {entry && <p className="mt-1 text-xs text-neutral-600">{entry.description}</p>}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
          {style.label}
          {project.state !== 'proposed' && project.scopeReduced && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-800">
              SCOPE CUT
            </span>
          )}
        </span>
      </div>

      {project.state === 'proposed' && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-neutral-700">
            Initiated {quarterLabel(project.initiatedAt as unknown as number)} · Alignment{' '}
            {project.chosenAlignment ?? '—'} · Quality {project.stationQuality} · Earliest
            break-ground:{' '}
            {quarterLabel(
              (project.initiatedAt as unknown as number) + PROPOSED_STUDY_BUFFER_QUARTERS,
            )}
          </div>
          {/* Phase 10: LVC slider — land value capture investment */}
          <LvcSlider project={project} />
          {/* Phase 10: studies in progress — uncertainty narrows each quarter */}
          <div className="rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
              Studies in progress
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-amber-900">
              <div>
                Cost uncertainty: ±{((project.costUncertaintyPct as unknown as number) * 100).toFixed(0)}%
              </div>
              <div>
                Demand uncertainty: ±{((project.demandUncertaintyPct as unknown as number) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="mt-1 text-[10px] text-amber-700">
              Each quarter in proposed state narrows both by ~12%. Better certainty = more
              accurate financing offers.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenFinancing}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Choose financing
            </button>
            <button
              type="button"
              onClick={() => rejectProject(project.templateId)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Cancel project
            </button>
          </div>
        </div>
      )}

      {project.state === 'under_construction' && (
        <UnderConstructionDetail project={project} currentQ={currentQ} />
      )}

      {project.state === 'operating' && (
        <OperatingDetail project={project} currentQ={currentQ} />
      )}
    </div>
  );
}

function UnderConstructionDetail({
  project,
  currentQ,
}: {
  project: ConstructingProject;
  currentQ: number;
}) {
  const accelerate = useGameStore((s) => s.accelerateProject);
  const reduceScope = useGameStore((s) => s.reduceProjectScope);
  const togglePause = useGameStore((s) => s.toggleProjectPause);
  const cashOnHand = useGameStore((s) => s.state.cash.balance as unknown as number);
  const spent = project.spent as unknown as number;
  const budget = project.totalBudget as unknown as number;
  const progressPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const remaining = project.remainingFunding as unknown as number;
  const brokeGround = project.brokeGroundAt as unknown as number;
  const forecastOpen = project.forecastOpenAt as unknown as number;
  const totalQ = Math.max(1, forecastOpen - brokeGround);
  const elapsedQ = Math.max(0, currentQ - brokeGround);
  const schedulePct = Math.min(100, (elapsedQ / totalQ) * 100);
  // Schedule vs spend variance
  const scheduleVsSpend = progressPct - schedulePct;
  const onTrack = Math.abs(scheduleVsSpend) < 10;
  const trackTone = onTrack
    ? 'text-emerald-700'
    : scheduleVsSpend > 0
      ? 'text-red-700' // burning faster than scheduled
      : 'text-blue-700'; // ahead on schedule, under-spending
  const trackLabel = onTrack
    ? '✓ On track'
    : scheduleVsSpend > 0
      ? '⚠ Over budget'
      : '↑ Under budget';

  // Acceleration cost preview (2Q faster as default)
  const remainingQuarters = Math.max(1, forecastOpen - currentQ);
  const accelerationCost = Math.round(remaining * Math.min(0.6, (2 / remainingQuarters) * 0.6) * 0.25);
  const canAccelerate = cashOnHand >= accelerationCost && remainingQuarters > 1;
  const scopeRefund = Math.round(remaining * 0.2);

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat label="Total budget" value={formatMoney(budget)} />
        <Stat label="Spent" value={formatMoney(spent)} />
        <Stat label="Remaining funding" value={formatMoney(remaining)} />
        <Stat
          label="Opens"
          value={`${quarterLabel(forecastOpen)} · ${quartersUntilLabel(forecastOpen - currentQ)}`}
        />
      </div>

      {/* Progress bar: budget spent vs schedule elapsed */}
      <div>
        <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
          <span>Progress: {progressPct.toFixed(0)}% spent</span>
          <span className={trackTone}>{trackLabel}</span>
          <span>Schedule: {schedulePct.toFixed(0)}% elapsed</span>
        </div>
        <div className="relative h-3 rounded bg-neutral-100 overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-500/70"
            style={{ width: `${progressPct}%` }}
            title={`Spent ${formatMoney(spent)} of ${formatMoney(budget)}`}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-neutral-700"
            style={{ left: `${schedulePct}%` }}
            title={`Schedule marker — should be at ${schedulePct.toFixed(0)}% spend`}
          />
        </div>
      </div>

      {/* Levers */}
      {project.paused && (
        <div className="rounded border-2 border-neutral-400 bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-700">
          ⏸ Paused — no cash burn, no progress. Opening date slips each quarter. Resume below.
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={() => togglePause(project.templateId)}
          className={`rounded-md border px-3 py-1.5 font-medium ${
            project.paused
              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              : 'border-neutral-400 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
          }`}
          title={
            project.paused
              ? 'Resume the project. Funding draws restart next quarter.'
              : 'Pause the project. No cash burn this quarter, but opening date slips.'
          }
        >
          {project.paused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button
          type="button"
          onClick={() => accelerate(project.templateId, 2)}
          disabled={!canAccelerate || project.paused === true}
          className={`rounded-md border px-3 py-1.5 font-medium ${
            canAccelerate && !project.paused
              ? 'border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100'
              : 'border-neutral-300 bg-neutral-50 text-neutral-400 cursor-not-allowed'
          }`}
          title={`Bring opening forward 2Q. Costs ${formatMoney(accelerationCost)} immediately.`}
        >
          ⚡ Accelerate 2Q (cost {formatMoney(accelerationCost)})
        </button>
        <button
          type="button"
          onClick={() => reduceScope(project.templateId)}
          disabled={project.paused === true}
          className={`rounded-md border px-3 py-1.5 font-medium ${
            project.paused
              ? 'border-neutral-300 bg-neutral-50 text-neutral-400 cursor-not-allowed'
              : 'border-amber-600 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
          title={`Cut scope: refund ${formatMoney(scopeRefund)} cash, opening 2Q earlier, ridership impact -30%`}
        >
          ✂ Cut scope (refund {formatMoney(scopeRefund)}, -30% riders)
        </button>
      </div>
    </div>
  );
}

function LvcSlider({ project }: { project: ProposedProject }) {
  const setLvc = useGameStore((s) => s.setLvcCapex);
  const capex = project.lvc.capexPerStation as unknown as number;
  const stations = project.lvc.stationsCovered || project.chosenStationCount || 0;
  const [display, setDisplay] = useDebouncedCommit<number>(
    capex,
    (v) => setLvc(project.templateId, v),
    250,
  );
  const totalCapex = display * stations;
  // Phase 10.8: diminishing returns. Match the engine's lvcRevenuePerStation.
  const revPerStation = lvcRevenuePerStation(display);
  const quarterlyRevenue = revPerStation * stations;
  // Blended annual yield on the LVC capex, and the marginal yield of the
  // NEXT $20M tier — so the player can see when it stops paying for debt.
  const blendedAnnualYield = display > 0 ? (revPerStation / display) * 4 * 100 : 0;
  const marginalRate =
    (lvcRevenuePerStation(display + 20) - lvcRevenuePerStation(display)) / 20;
  const marginalAnnualYield = marginalRate * 4 * 100;
  // Project debt costs ~5%/yr at neutral trust. If the marginal LVC yield
  // is below that, the next dollar loses money.
  const DEBT_COST_PCT = 5;
  const marginalBelowDebt = display < 400 && marginalAnnualYield < DEBT_COST_PCT;
  // Downside framing: build duration + debt service on the LVC capex.
  const buildQuarters = catalogEntry(project.templateId)?.buildDurationQuarters ?? 0;
  const debtServicePerQ = (totalCapex * (DEBT_COST_PCT / 100)) / 4;
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800 mb-1">
        Land Value Capture (LVC)
      </div>
      <div className="flex items-baseline gap-2 text-xs text-emerald-900 flex-wrap">
        <span className="num font-semibold">
          ${display}M/station × {stations} = ${totalCapex}M
        </span>
        <span className="text-emerald-700">
          → +${quarterlyRevenue.toFixed(0)}M/Q ({blendedAnnualYield.toFixed(1)}%/yr blended)
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={400}
        step={20}
        value={display}
        onChange={(e) => setDisplay(Number(e.target.value))}
        className="w-full mt-1"
        aria-label="LVC capex per station"
      />
      <div className="flex justify-between text-[10px] text-emerald-700 num">
        <span>$0 (skip)</span>
        <span>~$200M (sweet spot)</span>
        <span>$400M (max)</span>
      </div>
      {display > 0 && (
        <div className="mt-1 text-[10px] num">
          <span className={marginalBelowDebt ? 'text-red-700 font-semibold' : 'text-emerald-700'}>
            Next $20M tier yields {marginalAnnualYield.toFixed(1)}%/yr
            {marginalBelowDebt ? ' — below ~5%/yr debt cost, you lose money here' : ' — still beats debt'}
          </span>
        </div>
      )}
      {/* Phase 10.11: make the DOWNSIDE explicit — you pay debt service on the
          LVC capex throughout construction, before any revenue arrives. */}
      {display > 0 && buildQuarters > 0 && (
        <div className="mt-1.5 rounded bg-amber-100/70 px-2 py-1 text-[10px] text-amber-900 num">
          ⚠ Downside: adds ${totalCapex}M to debt → ~${debtServicePerQ.toFixed(0)}M/Q interest{' '}
          <span className="font-semibold">starting now</span>. Revenue only after the line opens in
          ~{buildQuarters}Q. You pay ≈${(debtServicePerQ * buildQuarters).toFixed(0)}M interest
          before the first LVC dollar.
        </div>
      )}
      <p className="mt-1 text-[10px] text-emerald-700">
        Transit-oriented development around stations. Financed with the project (adds to debt).
        Yields diminish per tier — prime parcels first, marginal land last.
      </p>
    </div>
  );
}

function OperatingDetail({
  project,
  currentQ,
}: {
  project: OperatingProject;
  currentQ: number;
}) {
  const entry = catalogEntry(project.templateId);
  const alignment = entry?.alignments.find((a) => a.id === project.chosenAlignment);
  const openedAt = project.openedAt as unknown as number;
  const quartersOpen = currentQ - openedAt;
  const fullRamp = alignment?.fullRidership ?? 0;
  const currentRiders = project.currentDailyRiders as unknown as number;
  const rampPct = fullRamp > 0 ? Math.min(100, (currentRiders / fullRamp) * 100) : 0;
  const finalCost = project.finalCost as unknown as number;
  const baseCost = entry?.baseCostM ?? finalCost;
  const costVariancePct = baseCost > 0 ? ((finalCost - baseCost) / baseCost) * 100 : 0;
  const costTone = costVariancePct > 10 ? 'text-red-700' : costVariancePct < -5 ? 'text-emerald-700' : 'text-neutral-700';
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat
          label="Opened"
          value={`${quarterLabel(openedAt)} · ${quartersOpen}Q ago`}
        />
        <Stat
          label="Daily riders"
          value={formatRiders(currentRiders)}
          {...(fullRamp > 0 ? { caption: `of ${formatRiders(fullRamp)} full ramp` } : {})}
        />
        <Stat label="Final cost" value={formatMoney(finalCost)} />
        <Stat
          label="vs forecast"
          value={`${costVariancePct > 0 ? '+' : ''}${costVariancePct.toFixed(0)}%`}
          tone={costTone}
        />
      </div>
      {fullRamp > 0 && (
        <div>
          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
            <span>Ramp progress</span>
            <span>{rampPct.toFixed(0)}% of full ramp</span>
          </div>
          <div className="h-2 rounded bg-neutral-100 overflow-hidden">
            <div className="h-full bg-emerald-500/70" style={{ width: `${rampPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className={`num mt-0.5 text-sm font-semibold ${tone ?? 'text-neutral-900'}`}>{value}</div>
      {caption && <div className="text-[10px] text-neutral-400 mt-0.5">{caption}</div>}
    </div>
  );
}

// ============================================================================
// Initiation modal — 2-step (pick from catalog → configure)
// ============================================================================

function InitiateProjectModal({ onClose }: { onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const proposeProject = useGameStore((s) => s.proposeProject);
  const available = availableProjectCatalog(state);
  const [selected, setSelected] = useState<ProjectCatalogEntry | null>(null);
  const [alignmentId, setAlignmentId] = useState<string>('');
  const [stationQuality, setStationQuality] = useState<StationQualityTier>('standard');

  if (selected === null) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
          <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Propose a project</h1>
              <p className="text-sm text-neutral-500">
                Pick from the catalog. You'll configure alignment + quality next, then see
                financing offers from the three governments.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
            >
              Cancel
            </button>
          </header>
          <div className="grid gap-3 px-6 py-4 sm:grid-cols-2">
            {available.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setSelected(entry);
                  setAlignmentId(entry.alignments[0]!.id);
                }}
                className="text-left rounded-md border border-neutral-200 p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-semibold">{entry.name}</h3>
                  <span className="text-xs uppercase tracking-wider text-neutral-500">
                    {entry.tier} · {entry.mode}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-600">{entry.description}</p>
                <div className="mt-2 flex gap-4 text-[11px] text-neutral-500">
                  <span className="num">~{formatMoney(entry.baseCostM)} base</span>
                  <span>{entry.buildDurationQuarters}Q build</span>
                  <span>
                    {entry.alignments.length} alignment
                    {entry.alignments.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="mt-2 text-xs italic text-neutral-700">{entry.blurb}</p>
              </button>
            ))}
            {available.length === 0 && (
              <p className="col-span-2 text-sm text-neutral-500">
                All catalog projects are already active or operating.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const templates = state.engineVars.templates as unknown as number;
  const crosslinx = state.engineVars.crosslinxLeverage as unknown as number;
  const alignment =
    selected.alignments.find((a) => a.id === alignmentId) ?? selected.alignments[0]!;
  const cost = realizedProjectCost(selected, alignment.id, stationQuality, templates, crosslinx);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4">
          <h1 className="text-lg font-semibold">Configure: {selected.name}</h1>
          <p className="text-sm text-neutral-500">{selected.description}</p>
        </header>
        <div className="px-6 py-4 space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Alignment
            </h2>
            <div className="mt-2 space-y-2">
              {selected.alignments.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAlignmentId(a.id)}
                  className={`block w-full text-left rounded-md border p-3 transition-colors ${
                    a.id === alignment.id
                      ? 'border-blue-500 bg-blue-50/40'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="text-sm font-medium">{a.label}</div>
                  <div className="mt-1 text-xs text-neutral-600">{a.blurb}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-neutral-500">
                    <span>
                      {a.kilometers} km · {a.stations} stations
                    </span>
                    <span className="num">{formatRiders(a.fullRidership)} riders at full</span>
                    <span>NIMBY: {a.nimbyImpact}</span>
                    <span>LVC: {a.lvcPotential}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Station quality
            </h2>
            <div className="mt-2 flex gap-2">
              {(['basic', 'standard', 'premium'] as StationQualityTier[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setStationQuality(q)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    q === stationQuality
                      ? 'border-blue-500 bg-blue-50/40 font-semibold'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="capitalize">{q}</div>
                  <div className="text-[10px] text-neutral-500">
                    ×{STATION_QUALITY_MULTIPLIER[q].toFixed(2)} cost
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-500">
              Estimated cost
            </div>
            <div className="num mt-0.5 text-xl font-semibold">{formatMoney(cost)}</div>
            <p className="mt-1 text-xs text-neutral-600">
              {selected.buildDurationQuarters}Q build at baseline engineers. 2Q study buffer
              before break-ground after financing accepted.
            </p>
          </div>
        </div>
        <footer className="border-t border-neutral-200 px-6 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
          >
            ← Back to catalog
          </button>
          <button
            type="button"
            onClick={() => {
              proposeProject(selected.id, alignment.id, stationQuality);
              onClose();
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Propose & go to financing →
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============================================================================
// Financing modal
// ============================================================================

const APPROACH_LABEL: Record<FinancingApproach, string> = {
  federalOnly: 'Federal only',
  provincialOnly: "Queen's Park only",
  municipalOnly: 'City Hall only',
  consortium: 'Tri-government consortium',
  pensionConsortium: 'Pension fund consortium',
  bondMarket: 'Bond market issuance',
  sovereignWealth: 'Sovereign wealth (foreign)',
};

const APPROACH_SUBTITLE: Record<FinancingApproach, string> = {
  federalOnly: 'Ottawa',
  provincialOnly: "Queen's Park",
  municipalOnly: 'City Hall',
  consortium: 'All three governments, blended rate',
  pensionConsortium: 'OMERS / OTPP / CDPQ-style patient capital',
  bondMarket: 'Institutional + retail bond issuance',
  sovereignWealth: 'Foreign SWF — political optics apply',
};

function OfferCard({
  offer,
  remainingNeed,
  alreadyTaken,
  onAdd,
}: {
  offer: FinancingOffer;
  remainingNeed: number;
  alreadyTaken: number;
  onAdd: (amountM: number) => void;
}) {
  const ratePct = offer.rateBp / 100;
  const isSovereign = offer.approach === 'sovereignWealth';
  const offerMax = offer.maxAmount as unknown as number;
  const stillAvailable = Math.max(0, offerMax - alreadyTaken);
  const suggested = Math.min(remainingNeed, stillAvailable);
  const fullyTaken = alreadyTaken >= offerMax;

  return (
    <div
      className={`rounded-md border p-4 flex flex-col ${
        fullyTaken
          ? 'border-neutral-200 bg-neutral-50/50 opacity-60'
          : isSovereign
            ? 'border-amber-300'
            : 'border-neutral-200'
      }`}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{APPROACH_LABEL[offer.approach]}</h3>
        <span className="num text-xs text-neutral-500">{ratePct.toFixed(2)}% rate</span>
      </div>
      <p className="mt-0.5 text-[10px] text-neutral-500">{APPROACH_SUBTITLE[offer.approach]}</p>
      <div className="mt-2 num text-xl font-semibold">
        up to {formatMoney(offerMax)}
      </div>
      {alreadyTaken > 0 && (
        <div className="mt-1 text-[10px] text-blue-700 num">
          {formatMoney(alreadyTaken)} added · {formatMoney(stillAvailable)} still available
        </div>
      )}
      {offer.opticsLabel && (
        <div className="mt-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-800">
          ⚠ {offer.opticsLabel}
        </div>
      )}
      {offer.conditions.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-neutral-700">
          {offer.conditions.map((c, i) => (
            <li key={i} className="border-l-2 border-amber-300 pl-2">
              <span className="font-medium">Condition:</span> {c.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onAdd(suggested)}
          disabled={fullyTaken || suggested <= 0}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold text-white transition-colors ${
            fullyTaken || suggested <= 0
              ? 'bg-neutral-300 cursor-not-allowed'
              : isSovereign
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {fullyTaken
            ? 'Maxed out'
            : suggested === remainingNeed
              ? `Add ${formatMoney(suggested)} (covers gap)`
              : `Add ${formatMoney(suggested)}`}
        </button>
      </div>
    </div>
  );
}

function FinancingModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const acceptPackage = useGameStore((s) => s.acceptFinancingPackage);
  const entry = catalogEntry(projectId);
  const [pkg, setPkg] = useState<Array<{ approach: FinancingApproach; amountM: number }>>([]);

  if (!entry) return null;
  const proposed = state.projects.find(
    (p) => p.state === 'proposed' && p.templateId === projectId,
  );
  const projectCost =
    proposed && proposed.state === 'proposed' && proposed.chosenAlignment
      ? realizedProjectCost(
          entry,
          proposed.chosenAlignment,
          proposed.stationQuality,
          state.engineVars.templates as unknown as number,
          state.engineVars.crosslinxLeverage as unknown as number,
        )
      : entry.baseCostM;
  const offers = generateFinancingOffers(state.politics, entry.tier);
  const govOffers = offers.filter((o) => FINANCING_APPROACH_SOURCE[o.approach] === 'government');
  const privateOffers = offers.filter((o) => FINANCING_APPROACH_SOURCE[o.approach] === 'private');

  const totalCommitted = pkg.reduce((acc, l) => acc + l.amountM, 0);
  const remainingNeed = Math.max(0, projectCost - totalCommitted);
  const blended =
    totalCommitted > 0
      ? pkg.reduce((acc, l) => {
          const o = offers.find((x) => x.approach === l.approach)!;
          return acc + l.amountM * o.rateBp;
        }, 0) / totalCommitted
      : 0;

  const addLayer = (approach: FinancingApproach, amountM: number) => {
    if (amountM <= 0) return;
    setPkg((prev) => {
      const existing = prev.find((l) => l.approach === approach);
      if (existing) {
        return prev.map((l) =>
          l.approach === approach ? { ...l, amountM: l.amountM + amountM } : l,
        );
      }
      return [...prev, { approach, amountM }];
    });
  };
  const removeLayer = (approach: FinancingApproach) => {
    setPkg((prev) => prev.filter((l) => l.approach !== approach));
  };
  const confirm = () => {
    if (totalCommitted < projectCost) return;
    acceptPackage(projectId, pkg);
    onClose();
  };

  const alreadyTakenFor = (approach: FinancingApproach): number =>
    pkg.find((l) => l.approach === approach)?.amountM ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Assemble financing package — {entry.name}</h1>
            <p className="text-sm text-neutral-500">
              Project needs{' '}
              <span className="num font-semibold">{formatMoney(projectCost)}</span>. Stack
              multiple offers to cover the cost. Each layer becomes its own debt tranche at
              its own rate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Close
          </button>
        </header>

        {/* Package sidebar */}
        <section className="border-b border-neutral-200 bg-neutral-50 px-6 py-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                Package being assembled
              </div>
              {pkg.length === 0 ? (
                <p className="mt-1 text-sm text-neutral-500">
                  No layers yet. Click "Add" on offers below to build your funding stack.
                </p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm">
                  {pkg.map((l) => {
                    const offer = offers.find((o) => o.approach === l.approach)!;
                    return (
                      <li key={l.approach} className="flex items-baseline justify-between">
                        <span>
                          <span className="font-medium">{APPROACH_LABEL[l.approach]}</span>{' '}
                          <span className="num text-neutral-500">
                            ({(offer.rateBp / 100).toFixed(2)}%)
                          </span>
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="num font-semibold">{formatMoney(l.amountM)}</span>
                          <button
                            type="button"
                            onClick={() => removeLayer(l.approach)}
                            className="rounded px-2 py-0.5 text-[10px] text-red-700 hover:bg-red-50"
                          >
                            remove
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Total</div>
              <div className="num text-2xl font-semibold">
                {formatMoney(totalCommitted)} / {formatMoney(projectCost)}
              </div>
              {blended > 0 && (
                <div className="num text-[10px] text-neutral-500">
                  blended rate {(blended / 100).toFixed(2)}%
                </div>
              )}
              {remainingNeed > 0 ? (
                <div className="text-[11px] text-amber-700 font-medium">
                  Gap: {formatMoney(remainingNeed)}
                </div>
              ) : (
                <div className="text-[11px] text-emerald-700 font-medium">Fully funded ✓</div>
              )}
              <button
                type="button"
                onClick={confirm}
                disabled={remainingNeed > 0 || pkg.length === 0}
                className={`mt-2 rounded-md px-4 py-2 text-sm font-semibold text-white ${
                  remainingNeed > 0 || pkg.length === 0
                    ? 'bg-neutral-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm package
              </button>
            </div>
          </div>
        </section>

        <section className="px-6 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Government financing
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {govOffers.map((o) => (
              <OfferCard
                key={o.approach}
                offer={o}
                remainingNeed={remainingNeed}
                alreadyTaken={alreadyTakenFor(o.approach)}
                onAdd={(amt) => addLayer(o.approach, amt)}
              />
            ))}
          </div>
        </section>

        <section className="border-t border-neutral-200 px-6 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-700">
            Private financing
          </h2>
          <p className="mb-3 text-[11px] text-neutral-500">
            No political conditions; market-priced. Caps are lower than gov consortium — useful
            as a layer to top up your package.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {privateOffers.map((o) => (
              <OfferCard
                key={o.approach}
                offer={o}
                remainingNeed={remainingNeed}
                alreadyTaken={alreadyTakenFor(o.approach)}
                onAdd={(amt) => addLayer(o.approach, amt)}
              />
            ))}
          </div>
        </section>

        <p className="px-6 pb-4 text-[11px] text-neutral-500 border-t border-neutral-200 pt-3">
          Trust scores: Ottawa {(state.politics.ottawa.trust as unknown as number).toFixed(0)} ·
          QP {(state.politics.queensPark.trust as unknown as number).toFixed(0)} · City Hall{' '}
          {(state.politics.cityHall.trust as unknown as number).toFixed(0)}. Government rate
          = 5% + (50 − trust) × 0.06%, clamped {formatPct(0.01)} – {formatPct(0.12)}. Private
          rates are market-driven. Layering bonds + consortium often beats single-source.
        </p>
      </div>
    </div>
  );
}

// Phase 10.3: surface the three engine vars that affect project cost +
// burn rate, so the player knows what's behind their estimates.
function CapacityBar({
  templates,
  engineers,
  crosslinx,
}: {
  templates: number;
  engineers: number;
  crosslinx: number;
}) {
  const templateDiscountPct = Math.min(14, Math.max(0, (templates - 30) * 0.2)).toFixed(1);
  const leveragePremiumPct = Math.min(9, Math.max(0, (crosslinx - 55) * 0.2)).toFixed(1);
  const burnHint =
    engineers >= 200 ? 'fast burn' : engineers >= 150 ? 'normal burn' : 'slow burn';
  return (
    <section className="rounded-md border border-neutral-200 bg-neutral-50/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold mb-2">
        Delivery capacity (affects every new project)
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-neutral-700">Data Systems</span>
            <span className="num text-sm font-semibold">{templates.toFixed(0)}/100</span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            {Number(templateDiscountPct) > 0
              ? `−${templateDiscountPct}% project cost`
              : 'No procurement discount yet'}
          </div>
        </div>
        <EngineerHiringCell engineers={engineers} burnHint={burnHint} />
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-neutral-700">Crosslinx leverage</span>
            <span
              className={`num text-sm font-semibold ${
                Number(leveragePremiumPct) > 5 ? 'text-red-700' : Number(leveragePremiumPct) > 2 ? 'text-amber-700' : 'text-neutral-800'
              }`}
            >
              {crosslinx.toFixed(0)}/100
            </span>
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            {Number(leveragePremiumPct) > 0
              ? `+${leveragePremiumPct}% project cost premium`
              : 'No consortium premium yet'}
          </div>
        </div>
      </div>
    </section>
  );
}

// Phase 10.8: interactive engineer hiring. More staff = faster project
// delivery (up to 1.5× burn at ~270) but ongoing salary ($0.1M/Q each above
// the 180 baseline). Idle staff are pure cost — only worth it with projects.
function EngineerHiringCell({ engineers, burnHint }: { engineers: number; burnHint: string }) {
  const setHeadcount = useGameStore((s) => s.setEngineerHeadcount);
  const frozen = useGameStore((s) =>
    s.state.operatingAllowance.controls.some(
      (c) => c.kind === 'hiringFreezeRoles' && c.roles.includes('engineers'),
    ),
  );
  const deltaFromBaseline = engineers - 180;
  const salaryNote =
    deltaFromBaseline === 0
      ? 'baseline (no extra salary)'
      : deltaFromBaseline > 0
        ? `+$${(deltaFromBaseline * 0.1).toFixed(1)}M/Q salary`
        : `−$${(Math.abs(deltaFromBaseline) * 0.1).toFixed(1)}M/Q saved`;
  const step = (delta: number) => setHeadcount(engineers + delta);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-neutral-700">In-house engineers</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => step(-30)}
            disabled={engineers <= 90}
            className="rounded bg-neutral-200 px-1.5 text-xs font-bold text-neutral-700 disabled:opacity-40 hover:bg-neutral-300"
            aria-label="Release 30 engineers"
          >
            −
          </button>
          <span className="num text-sm font-semibold w-9 text-center">{engineers}</span>
          <button
            type="button"
            onClick={() => step(30)}
            disabled={engineers >= 360 || frozen}
            className="rounded bg-blue-100 px-1.5 text-xs font-bold text-blue-700 disabled:opacity-40 hover:bg-blue-200"
            aria-label="Hire 30 engineers"
            title={frozen ? 'Hiring freeze in effect' : 'Hire 30 engineers'}
          >
            +
          </button>
        </div>
      </div>
      <div className="text-[10px] text-neutral-500 mt-0.5">
        Project {burnHint} · {frozen ? 'hiring frozen · ' : ''}{salaryNote}
      </div>
    </div>
  );
}
