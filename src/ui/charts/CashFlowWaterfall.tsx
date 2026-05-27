import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { QuarterPoint } from '@/utils/historyCharts';

interface Props {
  points: QuarterPoint[];
  /** Show only the last N quarters for legibility. */
  windowQuarters?: number;
  height?: number;
}

/**
 * Per-quarter net cash flow as a bar chart. Each bar is signed: positive
 * (above zero, green) means cash grew that quarter; negative (below zero,
 * red) means cash bled.
 *
 * Tooltip on hover shows the full breakdown — allowance + fare in, opex +
 * maint + debt out — so the player can attribute the bar.
 */
export function CashFlowWaterfall({ points, windowQuarters = 12, height = 260 }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        Cash flow history populates after your first turn.
      </p>
    );
  }
  const windowed = points.slice(-windowQuarters);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={windowed} margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#737373' }} interval={0} />
        <YAxis
          tickFormatter={(n: number) => (Math.abs(n) >= 1_000 ? `${(n / 1_000).toFixed(1)}B` : `${n}M`)}
          tick={{ fontSize: 10, fill: '#737373' }}
        />
        <ReferenceLine y={0} stroke="#a3a3a3" />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6 }}
          formatter={(value: number) => `$${value.toFixed(0)}M`}
          labelStyle={{ fontSize: 11, fontWeight: 600 }}
          labelFormatter={(label, payload) => {
            const p = payload?.[0]?.payload as QuarterPoint | undefined;
            if (!p) return label;
            const cf = p.cashFlow;
            return `${label} — alw +$${cf.operatingAllowance.toFixed(0)}M, fare +$${cf.fareRevenue.toFixed(0)}M, opex -$${cf.operatingExpense.toFixed(0)}M, maint -$${cf.maintenance.toFixed(0)}M, debt -$${cf.debtService.toFixed(0)}M`;
          }}
        />
        <Bar dataKey="cashDelta" name="Net cash flow">
          {windowed.map((p, i) => (
            <Cell key={i} fill={p.cashDelta >= 0 ? '#10b981' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
