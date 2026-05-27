import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MaturityBucket } from '@/utils/historyCharts';

interface Props {
  buckets: MaturityBucket[];
  height?: number;
}

const fmt = (n: number): string => (n >= 1_000 ? `$${(n / 1_000).toFixed(1)}B` : `$${n.toFixed(0)}M`);

export function DebtMaturityLadder({ buckets, height = 240 }: Props) {
  if (buckets.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        No debt tranches yet.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={buckets} margin={{ top: 5, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#737373' }} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#737373' }} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6 }}
          formatter={(value: number) => fmt(value)}
          labelStyle={{ fontSize: 11, fontWeight: 600 }}
        />
        <Bar dataKey="principalM" name="Principal maturing" fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}
