import { useGameStore } from '@state/gameStore';
import { projectQuarterlyCashFlow } from '@/utils/cashFlowForecast';
import { formatMoney } from '@/utils/humanize';

/**
 * Live cash-flow forecast. Phase 10.9 — the "driver's seat" widget.
 *
 * Shows the quarterly run-rate broken into inflows/outflows and where cash
 * lands next quarter. Because it derives purely from current state, moving
 * any slider (maintenance, fares, staffing) or toggling consultants updates
 * it instantly — so the player SEES the consequence of a decision before
 * committing it.
 */
export function CashFlowForecast({ compact = false }: { compact?: boolean }) {
  const state = useGameStore((s) => s.state);
  const f = projectQuarterlyCashFlow(state);

  const netPositive = f.net >= 0;
  const projNegative = f.projectedCashNextQuarter < 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs">
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
          Run-rate (live)
        </span>
        <div className="flex items-center gap-4 num">
          <span>
            <span className="text-neutral-500">Net </span>
            <span className={`font-bold ${netPositive ? 'text-emerald-700' : 'text-red-700'}`}>
              {netPositive ? '+' : ''}
              {formatMoney(f.net)}/Q
            </span>
          </span>
          <span>
            <span className="text-neutral-500">Next Q cash </span>
            <span className={`font-bold ${projNegative ? 'text-red-700' : 'text-neutral-800'}`}>
              {formatMoney(f.projectedCashNextQuarter)}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Cash-flow forecast
        </h2>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          Your run-rate at current settings. Move any slider and watch this update — no events or
          one-offs included.
        </p>
      </header>

      <div className="space-y-1 text-xs num">
        <Line label="Government allowance" value={f.allowance} positive />
        <Line label="Fare revenue" value={f.fareRevenue} positive />
        {f.lvcRevenue > 0 && <Line label="LVC revenue" value={f.lvcRevenue} positive />}
        <div className="flex justify-between border-t border-neutral-100 pt-1 font-semibold">
          <span className="text-neutral-600">Total in</span>
          <span className="text-emerald-700">{formatMoney(f.totalInflow)}/Q</span>
        </div>

        <Line label="Operating expense" value={-f.opex} />
        <Line label="Maintenance" value={-f.maintenance} />
        <Line label="Debt service" value={-f.debtService} />
        {f.consultantFee > 0 && <Line label="Consultant retainer" value={-f.consultantFee} />}
        {Math.abs(f.engineerSalary) >= 0.05 && (
          <Line
            label={f.engineerSalary >= 0 ? 'Extra engineer salary' : 'Engineer savings'}
            value={-f.engineerSalary}
          />
        )}
        <div className="flex justify-between border-t border-neutral-100 pt-1 font-semibold">
          <span className="text-neutral-600">Total out</span>
          <span className="text-red-700">{formatMoney(f.totalOutflow)}/Q</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className={`rounded-md p-2 ${netPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Net per quarter</div>
          <div className={`num text-lg font-bold ${netPositive ? 'text-emerald-700' : 'text-red-700'}`}>
            {netPositive ? '+' : ''}
            {formatMoney(f.net)}
          </div>
        </div>
        <div className={`rounded-md p-2 ${projNegative ? 'bg-red-50' : 'bg-neutral-50'}`}>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Cash next quarter</div>
          <div className={`num text-lg font-bold ${projNegative ? 'text-red-700' : 'text-neutral-800'}`}>
            {formatMoney(f.projectedCashNextQuarter)}
          </div>
        </div>
      </div>
      {projNegative && (
        <p className="mt-2 text-[11px] text-red-700">
          ⚠ At this run-rate you go cash-negative next quarter. Raise fares, cut maintenance, issue a
          bond, or ask a government for funding.
        </p>
      )}
    </section>
  );
}

function Line({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const cls = positive ? 'text-emerald-700' : value < 0 ? 'text-red-700' : 'text-neutral-700';
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className={cls}>
        {value >= 0 ? (positive ? '' : '+') : ''}
        {formatMoney(value)}
      </span>
    </div>
  );
}
