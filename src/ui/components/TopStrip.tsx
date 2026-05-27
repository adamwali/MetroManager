import { useState } from 'react';
import { useGameStore, useHistory } from '@state/gameStore';
import { TraceDrawer } from './TraceDrawer';
import type { TraceMetric } from '@/utils/trace';
import {
  describeBoardConfidence,
  describeCashRunway,
  describeReliability,
  describeRidersDelta,
  describeTrust,
  formatMoney,
  formatMoneyDelta,
  formatPct,
  formatPctDelta,
  formatRiders,
  formatRidersDelta,
  quartersUntilLabel,
} from '@/utils/humanize';
import { deriveKpis } from '@/utils/kpis';
import { Kpi } from './Kpi';
import { Sparkline } from './Sparkline';

/**
 * Always-visible KPI strip per design doc §4. Shows the headline metrics
 * the player should be glancing at every quarter.
 */
export function TopStrip() {
  const state = useGameStore((s) => s.state);
  const history = useHistory();
  const k = deriveKpis(state, history);
  const [traceMetric, setTraceMetric] = useState<TraceMetric | null>(null);

  const cashBalance = state.cash.balance as unknown as number;
  const cashDelta = state.cash.lastQuarterDelta as unknown as number;
  const cashSpark = history.map((h) => h.cash);
  const ridersSpark = history.map((h) => h.totalRiders);
  const currentQ = state.quarter as unknown as number;

  const cashTone =
    cashBalance < 0 ? 'critical' : cashBalance < 500 ? 'warning' : 'neutral';

  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4 lg:grid-cols-8">
      <Kpi
        label="Cash"
        value={formatMoney(cashBalance)}
        delta={`${formatMoneyDelta(cashDelta)}/Q`}
        caption={describeCashRunway(cashBalance, cashDelta)}
        tone={cashTone}
        spark={<Sparkline values={cashSpark} />}
        onClick={() => setTraceMetric('cash')}
      />
      <Kpi
        label="Daily riders"
        value={formatRiders(k.totalRiders)}
        delta={
          k.ridersYoyPct !== null
            ? `${formatPctDelta(k.ridersYoyPct)} YoY`
            : undefined
        }
        caption={
          k.ridersYoyDelta !== null
            ? `${formatRidersDelta(k.ridersYoyDelta)} · ${describeRidersDelta(k.ridersYoyDelta)}`
            : undefined
        }
        spark={<Sparkline values={ridersSpark} />}
        onClick={() => setTraceMetric('totalRiders')}
      />
      <Kpi
        label="Board confidence"
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
      />
      <Kpi
        label="TTC on-time"
        value={formatPct(k.ttcOnTime)}
        caption={describeReliability(k.ttcReliability)}
        tone={
          k.ttcOnTime < 0.8 ? 'critical' : k.ttcOnTime < 0.9 ? 'warning' : 'neutral'
        }
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
      />
      <TraceDrawer metric={traceMetric} onClose={() => setTraceMetric(null)} />
    </div>
  );
}
