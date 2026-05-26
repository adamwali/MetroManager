import { useMemo, useState } from 'react';
import { useGameStore } from '@state/gameStore';
import {
  formatMoney,
  formatMoneyDelta,
  formatRiders,
  formatRidersDelta,
  quarterLabel,
} from '@/utils/humanize';

interface TimeJumpPreviewProps {
  quartersAhead?: number;
}

/**
 * Hover/focus preview of the next N quarters per design doc §0 P1
 * (telegraph future outcomes so the player can plan). Deterministic
 * for Phase 2.2 — Monte Carlo ranges wait for Phase 3 when events
 * introduce stochastic variance.
 */
export function TimeJumpPreview({ quartersAhead = 4 }: TimeJumpPreviewProps) {
  const forecast = useGameStore((s) => s.forecast);
  const state = useGameStore((s) => s.state);
  const [open, setOpen] = useState(false);

  const trajectory = useMemo(() => {
    if (!open) return null;
    return forecast(quartersAhead);
  }, [open, forecast, quartersAhead]);

  const currentCash = state.cash.balance as unknown as number;
  const currentRiders =
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number);

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
        Preview next 4Q
      </button>
      {open && trajectory && (
        <div
          id="time-jump-preview"
          role="tooltip"
          className="absolute right-0 top-full mt-2 z-30 w-80 rounded-md border border-neutral-200 bg-white p-3 shadow-lg"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            If you don't change anything…
          </h3>
          <p className="mt-1 text-[11px] text-neutral-500">
            Forecast assumes default-policy advance for {quartersAhead} quarters.
          </p>
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-neutral-500">
                <th className="text-left font-medium">When</th>
                <th className="text-right font-medium">Cash</th>
                <th className="text-right font-medium">Riders</th>
              </tr>
            </thead>
            <tbody>
              {trajectory.map((s, i) => {
                const q = s.quarter as unknown as number;
                const cashN = s.cash.balance as unknown as number;
                const ridersN =
                  (s.agencies.ttc.dailyRiders as unknown as number) +
                  (s.agencies.go.dailyRiders as unknown as number) +
                  (s.agencies.up.dailyRiders as unknown as number);
                const cumulativeCashDelta = cashN - currentCash;
                const cumulativeRidersDelta = ridersN - currentRiders;
                const fired = s.gameOver !== undefined;
                return (
                  <tr key={i} className="border-t border-neutral-100">
                    <td className="py-1">{quarterLabel(q)}</td>
                    <td className="num py-1 text-right">
                      {formatMoney(cashN)}
                      <div className="text-[10px] text-neutral-500">
                        {formatMoneyDelta(cumulativeCashDelta)}
                      </div>
                    </td>
                    <td className="num py-1 text-right">
                      {formatRiders(ridersN)}
                      <div className="text-[10px] text-neutral-500">
                        {formatRidersDelta(cumulativeRidersDelta)}
                      </div>
                    </td>
                    {fired && (
                      <td className="text-[10px] text-red-700" colSpan={3}>
                        Campaign ends here
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
