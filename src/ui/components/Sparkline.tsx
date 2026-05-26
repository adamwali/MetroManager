interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Minimal sparkline rendered as inline SVG. Hand-rolled to avoid pulling
 * Recharts for tiny inline charts — Recharts is reserved for full
 * dashboards in Phase 9.
 */
export function Sparkline({ values, width = 80, height = 24, className }: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
      </svg>
    );
  }
  let mn = Infinity;
  let mx = -Infinity;
  for (const v of values) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  if (mn === mx) {
    mn -= 1;
    mx += 1;
  }
  const stepX = width / (values.length - 1);
  const pts = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - mn) / (mx - mn)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const trendingDown = values[values.length - 1]! < values[0]!;
  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={trendingDown ? '#dc2626' : '#16a34a'}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
