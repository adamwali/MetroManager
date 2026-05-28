import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, useHistory } from '@state/gameStore';
import { TraceDrawer } from './TraceDrawer';
import type { TraceMetric } from '@/utils/trace';
import {
  describeBoardConfidence,
  describeCashRunway,
  describeRidersDelta,
  describeTrust,
  formatMoney,
  formatMoneyDelta,
  formatPctDelta,
  formatRiders,
  formatRidersDelta,
  quartersUntilLabel,
} from '@/utils/humanize';
import { deriveKpis } from '@/utils/kpis';
import { Kpi } from './Kpi';
import { Sparkline } from './Sparkline';

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
  const currentQ = state.quarter as unknown as number;

  const cashBalance = state.cash.balance as unknown as number;
  const cashDelta = state.cash.lastQuarterDelta as unknown as number;
  const cashTone =
    cashBalance < 0 ? 'critical' : cashBalance < 500 ? 'warning' : 'neutral';

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

      {/* GROUP 3: Confidence + trust + approval */}
      <Section label="Confidence" cols={5}>
        <Kpi
          label="Board"
          value={`${(state.boardConfidence.score as unknown as number).toFixed(0)}`}
          caption={describeBoardConfidence(state.boardConfidence.score as unknown as number)}
          tone={
            (state.boardConfidence.score as unknown as number) < 25
              ? 'critical'
              : (state.boardConfidence.score as unknown as number) < 40
                ? 'warning'
                : 'neutral'
          }
          onClick={() => setTraceMetric('boardConfidence')}
          helpText="Board confidence 0-100. Below 20 for 4Q gets you fired. Driven by delivery wins, financial discipline, reliability, scandals."
        />
        <Kpi
          label="Approval"
          value={`${(state.engineVars.publicApproval as unknown as number).toFixed(0)}`}
          caption={
            (state.engineVars.publicApproval as unknown as number) < 35
              ? 'hostile'
              : (state.engineVars.publicApproval as unknown as number) < 50
                ? 'cool'
                : (state.engineVars.publicApproval as unknown as number) < 65
                  ? 'mixed'
                  : 'supportive'
          }
          tone={
            (state.engineVars.publicApproval as unknown as number) < 30
              ? 'critical'
              : (state.engineVars.publicApproval as unknown as number) < 45
                ? 'warning'
                : 'neutral'
          }
          onClick={() => setTraceMetric('publicApproval')}
          helpText="Public approval 0-100. Voter sentiment about the agency. Separate from Satisfaction (which is rider-experience derived). Drops on fare hikes, scandals, hostile op-eds. Affects ridership drift over time."
        />
        <Kpi
          label="Ottawa"
          value={`${(state.politics.ottawa.trust as unknown as number).toFixed(0)}`}
          caption={`${describeTrust(state.politics.ottawa.trust as unknown as number)} · ${quartersUntilLabel((state.politics.ottawa.nextElectionAt as unknown as number) - currentQ)} to election`}
          tone={
            (state.politics.ottawa.trust as unknown as number) < 25
              ? 'critical'
              : (state.politics.ottawa.trust as unknown as number) < 40
                ? 'warning'
                : 'neutral'
          }
          onClick={() => setTraceMetric('trust:ottawa')}
          helpText="Federal trust 0-100. Affects financing offer rates + ad-hoc funding eligibility. Built by quiet pitch (+3) or public lobby (+6, -5 approval)."
        />
        <Kpi
          label="Queen's Park"
          value={`${(state.politics.queensPark.trust as unknown as number).toFixed(0)}`}
          caption={`${describeTrust(state.politics.queensPark.trust as unknown as number)} · ${quartersUntilLabel((state.politics.queensPark.nextElectionAt as unknown as number) - currentQ)} to election`}
          tone={
            (state.politics.queensPark.trust as unknown as number) < 25
              ? 'critical'
              : (state.politics.queensPark.trust as unknown as number) < 40
                ? 'warning'
                : 'neutral'
          }
          onClick={() => setTraceMetric('trust:queensPark')}
          helpText="Provincial trust 0-100. Sets your operating allowance at Y4/Y8/Y12. Insider can call-in-favor for +$400M if ≥60."
        />
        <Kpi
          label="City Hall"
          value={`${(state.politics.cityHall.trust as unknown as number).toFixed(0)}`}
          caption={`${describeTrust(state.politics.cityHall.trust as unknown as number)} · ${quartersUntilLabel((state.politics.cityHall.nextElectionAt as unknown as number) - currentQ)} to election`}
          tone={
            (state.politics.cityHall.trust as unknown as number) < 25
              ? 'critical'
              : (state.politics.cityHall.trust as unknown as number) < 40
                ? 'warning'
                : 'neutral'
          }
          onClick={() => setTraceMetric('trust:cityHall')}
          helpText="City Hall trust 0-100. Sensitive to fare hikes + accessibility issues from Mayor Liang."
        />
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
