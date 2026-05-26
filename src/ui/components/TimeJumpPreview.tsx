import { useMemo, useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { formatMoney, formatPct, formatRiders, quarterLabel } from '@/utils/humanize';

interface TimeJumpPreviewProps {
  quartersAhead?: number;
  runs?: number;
}

/**
 * Hover/focus preview of the next N quarters. Phase 3.2: Monte Carlo
 * variant — runs N parallel forecasts with perturbed seeds so random
 * events vary across runs. Shows min/median/max ranges for cash + riders,
 * plus probability of campaign-over.
 */
export function TimeJumpPreview({ quartersAhead = 4, runs = 12 }: TimeJumpPreviewProps) {
  const forecastRange = useGameStore((s) => s.forecastRange);
  const [open, setOpen] = useState(false);

  const range = useMemo(() => {
    if (!open) return null;
    return forecastRange(quartersAhead, runs);
  }, [open, forecastRange, quartersAhead, runs]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
        aria-describedby="time-jump-preview"
      >
        Preview {quartersAhead}Q
      </button>
      {open && range && (
        <div
          id="time-jump-preview"
          role="tooltip"
          className="absolute right-0 top-full mt-2 z-30 w-96 rounded-md border border-neutral-200 bg-white p-3 shadow-lg"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            If you don't change policy…
          </h3>
          <p className="mt-1 text-[11px] text-neutral-500">
            {range.runs} parallel simulations, varying which random events fire.
          </p>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-neutral-500">
                <th className="text-left font-medium">When</th>
                <th className="text-right font-medium">Cash range</th>
                <th className="text-right font-medium">Riders range</th>
                <th className="text-right font-medium">Fired?</th>
              </tr>
            </thead>
            <tbody>
              {range.points.map((p, i) => {
                const span = p.cashMax - p.cashMin;
                const spanIsBig = span > 200;
                return (
                  <tr key={i} className="border-t border-neutral-100 align-top">
                    <td className="py-1">{quarterLabel(p.quarter)}</td>
                    <td className="num py-1 text-right">
                      <div className="font-semibold">{formatMoney(p.cashMedian)}</div>
                      <div
                        className={`text-[10px] ${spanIsBig ? 'text-amber-700' : 'text-neutral-500'}`}
                      >
                        {formatMoney(p.cashMin)} – {formatMoney(p.cashMax)}
                      </div>
                    </td>
                    <td className="num py-1 text-right">
                      <div className="font-semibold">{formatRiders(p.ridersMedian)}</div>
                      <div className="text-[10px] text-neutral-500">
                        {formatRiders(p.ridersMin)} – {formatRiders(p.ridersMax)}
                      </div>
                    </td>
                    <td className="num py-1 text-right">
                      {p.gameOverProbability > 0 ? (
                        <span className="text-red-700 font-semibold">
                          {formatPct(p.gameOverProbability, 0)}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-neutral-500">
            Wider cash band = more variance. Fired % = chance you get terminated within{' '}
            {quartersAhead}Q if you do nothing.
          </p>
        </div>
      )}
    </div>
  );
}
