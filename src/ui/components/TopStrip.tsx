import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, useHistory } from '@state/gameStore';
import { TraceDrawer } from './TraceDrawer';
import type { TraceMetric } from '@/utils/trace';
import {
  describeCashRunway,
  describeRidersDelta,
  formatMoney,
  formatMoneyDelta,
  formatPctDelta,
  formatRiders,
  formatRidersDelta,
} from '@/utils/humanize';
import { deriveKpis } from '@/utils/kpis';
import { Kpi, StatBar } from './Kpi';
import { Sparkline } from './Sparkline';
import { metricSeries } from '@/utils/metricHistory';

/**
 * Always-visible KPI strip per design doc §4. Phase 10 redesign — KPIs
 * grouped into 3 visual sections: Financial / Operating / Confidence.
 * Each section has a small label above. Reduces "all numbers blur together"
 * critique.
 *
 * Cash KPI navigates to /treasury (financial statements). All others open
 * the trace drawer.
 */
export function TopStrip() {
  const state = useGameStore((s) => s.state);
  const history = useHistory();
  const k = deriveKpis(state, history);
  const navigate = useNavigate();
  const [traceMetric, setTraceMetric] = useState<TraceMetric | null>(null);

  const cashSpark = history.map((h) => h.cash);
  const ridersSpark = history.map((h) => h.totalRiders);

  const cashBalance = state.cash.balance as unknown as number;
  const cashDelta = state.cash.lastQuarterDelta as unknown as number;
  const cashTone =
    cashBalance < 0 ? 'critical' : cashBalance < 500 ? 'warning' : 'neutral';

  // Phase 10.9: confidence/support metrics as compact bars showing the
  // change since last quarter close. Prev values come from the most recent
  // quarter_summary's endOfQuarterMetrics; current values from live state
  // (so mid-quarter events/actions visibly move the delta).
  const board = state.boardConfidence.score as unknown as number;
  const approval = state.engineVars.publicApproval as unknown as number;
  const trustOttawa = state.politics.ottawa.trust as unknown as number;
  const trustQp = state.politics.queensPark.trust as unknown as number;
  const trustCity = state.politics.cityHall.trust as unknown as number;
  const lastSummary = [...state.actionLog]
    .reverse()
    .find((e) => e.kind === 'quarter_summary');
  const m = lastSummary?.kind === 'quarter_summary' ? lastSummary.breakdown.endOfQuarterMetrics : undefined;
  const prev = {
    board: m?.boardConfidence ?? board,
    approval: m?.publicApproval ?? approval,
    ottawa: m?.trustOttawa ?? trustOttawa,
    queensPark: m?.trustQueensPark ?? trustQp,
    cityHall: m?.trustCityHall ?? trustCity,
  };

  return (
    <div className="flex flex-wrap items-stretch gap-2 px-3 py-2">
      {/* GROUP 1: Financial */}
      <Section label="Financial">
        <Kpi
          label="Cash"
          value={formatMoney(cashBalance)}
          delta={`${formatMoneyDelta(cashDelta)}/Q`}
          deltaTone={cashDelta > 0 ? 'positive' : cashDelta < 0 ? 'negative' : 'neutral'}
          caption={describeCashRunway(cashBalance, cashDelta)}
          tone={cashTone}
          spark={<Sparkline values={cashSpark} />}
          onClick={() => navigate('/treasury')}
          helpText="Cash on hand + quarterly net change. Click to open Treasury (P&L breakdown, cash flow, debt). Below 0 for 3 quarters triggers fiscal-failure game over."
        />
      </Section>

      {/* GROUP 2: Operating */}
      <Section label="Operating" cols={2}>
        <Kpi
          label="Daily riders"
          value={formatRiders(k.totalRiders)}
          delta={
            k.ridersYoyPct !== null ? `${formatPctDelta(k.ridersYoyPct)} YoY` : undefined
          }
          caption={
            k.ridersYoyDelta !== null
              ? `${formatRidersDelta(k.ridersYoyDelta)} · ${describeRidersDelta(k.ridersYoyDelta)}`
              : undefined
          }
          spark={<Sparkline values={ridersSpark} />}
          onClick={() => setTraceMetric('totalRiders')}
          helpText="System daily riders (TTC + GO + UP). Grows with catchment + project openings. Falls with reliability drag + cannibalization."
        />
        <Kpi
          label="Satisfaction"
          value={`${k.customerSatisfaction.toFixed(0)}/100`}
          caption={
            k.customerSatisfaction < 50 ? 'unhappy' : k.customerSatisfaction < 70 ? 'mixed' : 'positive'
          }
          tone={
            k.customerSatisfaction < 40
              ? 'critical'
              : k.customerSatisfaction < 60
                ? 'warning'
                : 'neutral'
          }
          onClick={() => setTraceMetric('publicApproval')}
          helpText="Rider satisfaction 0-100. Affects ridership drift (≥70 boosts +0.1%/Q, <30 drags -0.3%/Q). Drops on fare hikes, service cuts, scandals."
        />
      </Section>

      {/* GROUP 3: Confidence + trust + approval — compact fill-bars that
          show quarter-over-quarter movement so decisions feel visible. */}
      <Section label="Confidence + support" cols={1}>
        <div className="grid gap-x-3 gap-y-0.5 sm:grid-cols-2 min-w-[280px]">
          <StatBar
            label="Board"
            value={board}
            delta={board - prev.board}
            trend={metricSeries(state, 'board')}
            tone={board < 25 ? 'critical' : board < 40 ? 'warning' : 'neutral'}
            onClick={() => setTraceMetric('boardConfidence')}
            helpText="Board confidence 0-100. Below 25 for 2Q gets you fired. Drifts +1/Q toward 60. Driven by delivery wins, financial discipline, reliability, scandals."
          />
          <StatBar
            label="Public approval"
            value={approval}
            delta={approval - prev.approval}
            trend={metricSeries(state, 'approval')}
            tone={approval < 30 ? 'critical' : approval < 45 ? 'warning' : 'neutral'}
            onClick={() => setTraceMetric('publicApproval')}
            helpText="Voter sentiment 0-100. Drops on fare hikes, scandals, hostile op-eds. Raised by cleanliness budgets, wins. Drifts ridership over time."
          />
          <StatBar
            label="Ottawa"
            value={trustOttawa}
            delta={trustOttawa - prev.ottawa}
            trend={metricSeries(state, 'trustOttawa')}
            tone={trustOttawa < 25 ? 'critical' : trustOttawa < 40 ? 'warning' : 'neutral'}
            onClick={() => setTraceMetric('trust:ottawa')}
            helpText="Federal trust. Lowers project financing rates. Built by quiet pitch (+3) or public lobby (+6, -5 approval)."
          />
          <StatBar
            label="Queen's Park"
            value={trustQp}
            delta={trustQp - prev.queensPark}
            trend={metricSeries(state, 'trustQueensPark')}
            tone={trustQp < 25 ? 'critical' : trustQp < 40 ? 'warning' : 'neutral'}
            onClick={() => setTraceMetric('trust:queensPark')}
            helpText="Provincial trust. Sets your operating allowance at renegotiation. Insider can call-in-favor for cash if relationship is high."
          />
          <StatBar
            label="City Hall"
            value={trustCity}
            delta={trustCity - prev.cityHall}
            trend={metricSeries(state, 'trustCityHall')}
            tone={trustCity < 25 ? 'critical' : trustCity < 40 ? 'warning' : 'neutral'}
            onClick={() => setTraceMetric('trust:cityHall')}
            helpText="City Hall trust. Sensitive to fare hikes + accessibility underfunding."
          />
        </div>
      </Section>

      <TraceDrawer metric={traceMetric} onClose={() => setTraceMetric(null)} />
    </div>
  );
}

function Section({
  label,
  cols = 1,
  children,
}: {
  label: string;
  cols?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-full sm:min-w-fit">
      <div className="text-[10px] uppercase tracking-wider text-neutral-600 font-bold mb-1 px-0.5">
        {label}
      </div>
      <div
        className={`grid gap-1.5 ${
          cols === 1 ? '' : cols === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
