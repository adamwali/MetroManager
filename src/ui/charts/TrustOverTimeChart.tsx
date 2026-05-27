import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { QuarterPoint } from '@/utils/historyCharts';

interface Props {
  points: QuarterPoint[];
  height?: number;
}

export function TrustOverTimeChart({ points, height = 240 }: Props) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-8 text-center">
        Trust history populates after your first turn.
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 5, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#737373' }} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#737373' }} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6 }}
          labelStyle={{ fontSize: 11, fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="trustOttawa"
          name="Ottawa"
          stroke="#dc2626"
          strokeWidth={1.75}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="trustQueensPark"
          name="Queen's Park"
          stroke="#2563eb"
          strokeWidth={1.75}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="trustCityHall"
          name="City Hall"
          stroke="#059669"
          strokeWidth={1.75}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
