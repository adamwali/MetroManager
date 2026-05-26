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
import type { FinancingApproach, Project } from '@/types/projects';
import {
  formatMoney,
  formatPct,
  formatRiders,
  quarterLabel,
  quartersUntilLabel,
} from '@/utils/humanize';

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
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <Stat label="Total budget" value={formatMoney(project.totalBudget as unknown as number)} />
          <Stat label="Spent" value={formatMoney(project.spent as unknown as number)} />
          <Stat
            label="Remaining funding"
            value={formatMoney(project.remainingFunding as unknown as number)}
          />
          <Stat
            label="Opens"
            value={`${quarterLabel(project.forecastOpenAt as unknown as number)} · ${quartersUntilLabel((project.forecastOpenAt as unknown as number) - currentQ)}`}
          />
        </div>
      )}

      {project.state === 'operating' && (
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          <Stat label="Opened" value={quarterLabel(project.openedAt as unknown as number)} />
          <Stat
            label="Daily riders (current)"
            value={formatRiders(project.currentDailyRiders as unknown as number)}
          />
          <Stat
            label="Final cost"
            value={formatMoney(project.finalCost as unknown as number)}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="num mt-0.5 text-sm font-semibold">{value}</div>
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

  const alignment =
    selected.alignments.find((a) => a.id === alignmentId) ?? selected.alignments[0]!;
  const cost = realizedProjectCost(selected, alignment.id, stationQuality);

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

function FinancingModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const state = useGameStore((s) => s.state);
  const accept = useGameStore((s) => s.acceptFinancing);
  const entry = catalogEntry(projectId);
  if (!entry) return null;
  const offers = generateFinancingOffers(state.politics, entry.tier);

  const approachLabel: Record<FinancingApproach, string> = {
    federalOnly: 'Federal only',
    provincialOnly: "Queen's Park only",
    municipalOnly: 'City Hall only',
    consortium: 'Tri-government consortium',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        <header className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Financing offers — {entry.name}</h1>
            <p className="text-sm text-neutral-500">
              Each option presents amount + rate + any conditions. Rates depend on your trust
              score with the funding government. Pick one.
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
        <div className="grid gap-3 px-6 py-4 sm:grid-cols-2">
          {offers.map((o) => {
            const ratePct = o.rateBp / 100;
            return (
              <div
                key={o.approach}
                className="rounded-md border border-neutral-200 p-4 flex flex-col"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{approachLabel[o.approach]}</h3>
                  <span className="num text-xs text-neutral-500">{ratePct.toFixed(2)}% rate</span>
                </div>
                <div className="mt-2 num text-xl font-semibold">
                  up to {formatMoney(o.maxAmount as unknown as number)}
                </div>
                {o.conditions.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-neutral-700">
                    {o.conditions.map((c, i) => (
                      <li key={i} className="border-l-2 border-amber-300 pl-2">
                        <span className="font-medium">Condition:</span> {c.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-neutral-500">No conditions attached.</p>
                )}
                <div className="mt-auto pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      accept(projectId, o.approach);
                      onClose();
                    }}
                    className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Accept this offer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="px-6 pb-4 text-[11px] text-neutral-500">
          Trust scores: Ottawa {(state.politics.ottawa.trust as unknown as number).toFixed(0)} ·
          QP {(state.politics.queensPark.trust as unknown as number).toFixed(0)} · City Hall{' '}
          {(state.politics.cityHall.trust as unknown as number).toFixed(0)}. Rate = 5% +
          (50 − trust) × 0.06%, clamped {formatPct(0.01)} – {formatPct(0.12)}.
        </p>
      </div>
    </div>
  );
}
