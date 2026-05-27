import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { QuarterPoint } from '@/utils/historyCharts';

interface Props {
  points: QuarterPoint[];
  height?: number;
}

const tickFormat = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
};

export function RidershipStackedChart({ points, height = 240 }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        Ridership history populates after your first turn.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#737373' }} interval="preserveStartEnd" />
        <YAxis tickFormatter={tickFormat} tick={{ fontSize: 10, fill: '#737373' }} />
        <Tooltip
          formatter={(value: number) => tickFormat(value) + ' riders'}
          contentStyle={{ fontSize: 11, borderRadius: 6 }}
          labelStyle={{ fontSize: 11, fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          type="monotone"
          dataKey="ttcRiders"
          stackId="1"
          name="TTC"
          stroke="#22d3ee"
          fill="#22d3ee"
          fillOpacity={0.55}
        />
        <Area
          type="monotone"
          dataKey="goRiders"
          stackId="1"
          name="GO"
          stroke="#a78bfa"
          fill="#a78bfa"
          fillOpacity={0.55}
        />
        <Area
          type="monotone"
          dataKey="upRiders"
          stackId="1"
          name="UP"
          stroke="#fbbf24"
          fill="#fbbf24"
          fillOpacity={0.55}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
