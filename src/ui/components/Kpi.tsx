import type { ReactNode } from 'react';
import { useState } from 'react';

interface KpiProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  /** Tone for delta coloring. If unset, falls back to neutral. */
  deltaTone?: 'positive' | 'negative' | 'neutral';
  /** Plain-language descriptor below the number ("3.2 years runway"). */
  caption?: ReactNode;
  /** Color hint based on status. */
  tone?: 'neutral' | 'positive' | 'warning' | 'critical';
  /** Optional inline sparkline. */
  spark?: ReactNode;
  className?: string;
  /** Click handler — wires KPI to the trace drawer (Phase 8.6). */
  onClick?: () => void;
  /** Tooltip text explaining what this metric means + how it's computed. */
  helpText?: string;
}

const TONE_RING: Record<NonNullable<KpiProps['tone']>, string> = {
  // Phase 10 audit: light palette across the board so KPIs feel cohesive.
  // High confidence stays light green. Reds get darker as severity climbs.
  neutral: 'border-neutral-200 bg-white',
  positive: 'border-emerald-200 bg-emerald-50/40',
  warning: 'border-amber-300 bg-amber-50/50',
  critical: 'border-red-400 bg-red-50/80',
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
 *
 * Phase 10 polish: ⓘ icon with CSS hover card replaces native `title=`
 * (faster appearance, consistent styling, mobile-friendly with tap).
 */
export function Kpi({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  caption,
  tone = 'neutral',
  spark,
  className,
  onClick,
  helpText,
}: KpiProps) {
  const deltaClass =
    deltaTone === 'positive'
      ? 'text-emerald-700'
      : deltaTone === 'negative'
        ? 'text-red-700'
        : 'text-neutral-700';
  const interactive = onClick !== undefined;
  const Comp: 'button' | 'div' = interactive ? 'button' : 'div';
  const [showHelp, setShowHelp] = useState(false);
  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={`relative flex flex-col gap-0.5 rounded-md border px-2.5 py-1.5 text-left ${TONE_RING[tone]} ${
        interactive
          ? 'cursor-pointer hover:border-blue-400 hover:shadow-sm transition-shadow'
          : ''
      } ${className ?? ''}`}
      title={interactive ? `Click to trace ${label}` : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 inline-flex items-center gap-0.5">
          {label}
          {helpText && (
            <span
              role="button"
              tabIndex={0}
              className="text-neutral-400 hover:text-blue-600 cursor-help"
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
              onFocus={() => setShowHelp(true)}
              onBlur={() => setShowHelp(false)}
              onClick={(e) => {
                e.stopPropagation();
                setShowHelp((v) => !v);
              }}
              aria-label={`Help: ${helpText}`}
            >
              ⓘ
            </span>
          )}
        </span>
        {spark}
      </div>
      <div className={`num text-lg font-bold leading-tight tracking-tight ${TONE_VALUE[tone]}`}>{value}</div>
      <div className="flex items-baseline gap-1.5 text-[10px] leading-tight">
        {delta !== undefined && <span className={`num font-semibold ${deltaClass}`}>{delta}</span>}
        {caption !== undefined && <span className="text-neutral-400 truncate">{caption}</span>}
      </div>
      {helpText && showHelp && (
        <div
          className="absolute left-1/2 top-full z-30 mt-1 w-64 max-w-[16rem] -translate-x-1/2 rounded-md border border-neutral-200 bg-neutral-900 text-white px-3 py-2 text-[11px] leading-snug shadow-lg pointer-events-none"
          role="tooltip"
        >
          {helpText}
        </div>
      )}
    </Comp>
  );
}

interface StatBarProps {
  label: string;
  /** 0-100 value. */
  value: number;
  /** Change since last quarter (signed). Undefined = no history yet. */
  delta?: number;
  /** Per-quarter series (0-100) for a sleek inline QoQ trend line. */
  trend?: number[];
  tone?: 'neutral' | 'positive' | 'warning' | 'critical';
  onClick?: () => void;
  helpText?: string;
}

/** Tiny 0-100 trend line, fixed domain so the slope reads as real change. */
function MiniTrend({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 40;
  const h = 12;
  const stepX = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(h - (Math.max(0, Math.min(100, v)) / 100) * h).toFixed(1)}`)
    .join(' ');
  const down = values[values.length - 1]! < values[0]!;
  return (
    <svg width={w} height={h} aria-hidden="true" className="shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={down ? '#dc2626' : '#16a34a'}
        strokeOpacity={0.7}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BAR_FILL: Record<NonNullable<StatBarProps['tone']>, string> = {
  neutral: 'bg-blue-400',
  positive: 'bg-emerald-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-400',
};

/**
 * Compact horizontal fill-bar for a 0-100 sentiment metric. Shows the value
 * as a filled bar (so you can glance the level), plus the quarter-over-quarter
 * delta as a colored arrow (so you can SEE your decisions move it). Phase 10.9
 * — replaces the dense "67/100" number cells per player feedback that it was
 * hard to feel cause→effect.
 */
export function StatBar({ label, value, delta, trend, tone = 'neutral', onClick, helpText }: StatBarProps) {
  const interactive = onClick !== undefined;
  const Comp: 'button' | 'div' = interactive ? 'button' : 'div';
  const [showHelp, setShowHelp] = useState(false);
  const pct = Math.max(0, Math.min(100, value));
  const hasDelta = delta !== undefined && Math.abs(delta) >= 0.5;
  const deltaUp = (delta ?? 0) > 0;
  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      className={`relative flex flex-col gap-1 rounded-md px-2 py-1.5 text-left w-full ${
        interactive ? 'cursor-pointer hover:bg-neutral-50' : ''
      }`}
      title={interactive ? `Click to trace ${label}` : undefined}
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500 inline-flex items-center gap-0.5">
          {label}
          {helpText && (
            <span
              role="button"
              tabIndex={0}
              className="text-neutral-400 hover:text-blue-600 cursor-help"
              onMouseEnter={() => setShowHelp(true)}
              onMouseLeave={() => setShowHelp(false)}
              onFocus={() => setShowHelp(true)}
              onBlur={() => setShowHelp(false)}
              onClick={(e) => {
                e.stopPropagation();
                setShowHelp((v) => !v);
              }}
              aria-label={`Help: ${helpText}`}
            >
              ⓘ
            </span>
          )}
        </span>
        <span className="num inline-flex items-center gap-1.5 text-[11px] font-bold text-neutral-800">
          {trend && trend.length >= 2 && <MiniTrend values={trend} />}
          <span className="inline-flex items-baseline gap-1">
            {value.toFixed(0)}
            {hasDelta && (
              <span className={deltaUp ? 'text-emerald-600' : 'text-red-600'}>
                {deltaUp ? '▲' : '▼'}
                {Math.abs(delta!).toFixed(0)}
              </span>
            )}
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${BAR_FILL[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {helpText && showHelp && (
        <div
          className="absolute left-1/2 top-full z-30 mt-1 w-64 max-w-[16rem] -translate-x-1/2 rounded-md border border-neutral-200 bg-neutral-900 text-white px-3 py-2 text-[11px] leading-snug shadow-lg pointer-events-none"
          role="tooltip"
        >
          {helpText}
        </div>
      )}
    </Comp>
  );
}
