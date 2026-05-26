import type { ReactNode } from 'react';

interface KpiProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  /** Plain-language descriptor below the number ("3.2 years runway"). */
  caption?: ReactNode;
  /** Color hint based on status. */
  tone?: 'neutral' | 'positive' | 'warning' | 'critical';
  /** Optional inline sparkline. */
  spark?: ReactNode;
  className?: string;
}

const TONE_RING: Record<NonNullable<KpiProps['tone']>, string> = {
  neutral: 'border-neutral-200',
  positive: 'border-emerald-200',
  warning: 'border-amber-200',
  critical: 'border-red-300',
};

const TONE_VALUE: Record<NonNullable<KpiProps['tone']>, string> = {
  neutral: 'text-neutral-900',
  positive: 'text-emerald-700',
  warning: 'text-amber-700',
  critical: 'text-red-700',
};

/**
 * One KPI cell. Layout: label on top (uppercase, small), big number,
 * optional delta + caption + sparkline. Mercury-light feel.
 */
export function Kpi({ label, value, delta, caption, tone = 'neutral', spark, className }: KpiProps) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-md border bg-white px-3 py-2 ${TONE_RING[tone]} ${className ?? ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        {spark}
      </div>
      <div className={`num text-xl font-semibold leading-tight ${TONE_VALUE[tone]}`}>{value}</div>
      <div className="flex items-baseline gap-2 text-[11px]">
        {delta !== undefined && <span className="num font-medium text-neutral-600">{delta}</span>}
        {caption !== undefined && <span className="text-neutral-500">{caption}</span>}
      </div>
    </div>
  );
}
