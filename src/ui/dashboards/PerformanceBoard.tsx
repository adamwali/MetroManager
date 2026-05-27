import { useMemo } from 'react';
import { useGameStore } from '@state/gameStore';
import {
  buildMaturityLadder,
  buildProjectGantt,
  buildQuarterPoints,
} from '@/utils/historyCharts';
import { CashFlowWaterfall } from '@ui/charts/CashFlowWaterfall';
import { DebtMaturityLadder } from '@ui/charts/DebtMaturityLadder';
import { ProjectGantt } from '@ui/charts/ProjectGantt';
import { RidershipStackedChart } from '@ui/charts/RidershipStackedChart';
import { TrustOverTimeChart } from '@ui/charts/TrustOverTimeChart';

/**
 * Performance dashboard. Phase 9. The "what do my numbers look like over
 * time" view — counterpart to Mission Control which is "what needs my
 * attention now". Five chart types:
 *
 *  1. Cash-flow waterfall (last 12Q)
 *  2. Three-gov trust over time
 *  3. Per-agency ridership stacked
 *  4. Debt portfolio maturity ladder
 *  5. Project Gantt
 */
export function PerformanceBoard() {
  const state = useGameStore((s) => s.state);
  const currentQ = state.quarter as unknown as number;
  const points = useMemo(() => buildQuarterPoints(state), [state]);
  const ladder = useMemo(() => buildMaturityLadder(state), [state]);
  const gantt = useMemo(() => buildProjectGantt(state), [state]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Performance</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Historical trends across cash flow, trust, ridership, debt, and projects. Click any
          KPI on the top strip for an entry-level trace; this page is the longitudinal view.
        </p>
      </header>

      {/* Cash flow waterfall */}
      <section className="rounded-md border border-neutral-200 bg-white p-4">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Cash flow per quarter
          </h2>
          <p className="text-[11px] text-neutral-500">Last 12 quarters · hover for breakdown</p>
        </header>
        <CashFlowWaterfall points={points} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Trust over time */}
        <section className="rounded-md border border-neutral-200 bg-white p-4">
          <header className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Government trust
            </h2>
            <p className="text-[11px] text-neutral-500">
              Ottawa · Queen's Park · City Hall
            </p>
          </header>
          <TrustOverTimeChart points={points} />
        </section>

        {/* Ridership stacked */}
        <section className="rounded-md border border-neutral-200 bg-white p-4">
          <header className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Daily ridership by agency
            </h2>
            <p className="text-[11px] text-neutral-500">Stacked area · TTC dominates</p>
          </header>
          <RidershipStackedChart points={points} />
        </section>
      </div>

      {/* Debt maturity ladder */}
      <section className="rounded-md border border-neutral-200 bg-white p-4">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Debt portfolio · maturity ladder
          </h2>
          <p className="text-[11px] text-neutral-500">
            Principal maturing by year · clustering = refi pressure ahead
          </p>
        </header>
        <DebtMaturityLadder buckets={ladder} />
      </section>

      {/* Project Gantt */}
      <section className="rounded-md border border-neutral-200 bg-white p-4">
        <header className="mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Project pipeline
          </h2>
          <p className="text-[11px] text-neutral-500">
            Vertical marker = current quarter · color by state
          </p>
        </header>
        <ProjectGantt bars={gantt} currentQuarter={currentQ} />
      </section>
    </div>
  );
}
