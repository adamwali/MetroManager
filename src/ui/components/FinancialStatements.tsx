import { useMemo, useState } from 'react';
import { useGameStore } from '@state/gameStore';
import {
  buildCapitalActivity,
  buildOperatingPnl,
  type CapitalCol,
  type FinancialScope,
  type PnlCol,
} from '@/utils/financialStatements';
import { formatMoney, formatMoneyDelta } from '@/utils/humanize';

/**
 * Financial statements view for Treasury. Phase 10 redesign.
 *
 * - Operating P&L (consolidated or per-agency drill-down)
 * - Capital Activity (separate view; capex draws + financing)
 * - Forecast columns (next 4 quarters, gray-shaded)
 * - Allowance broken out by government (Ottawa / QP / City)
 * - Ontario Line + project debt service identifiable on Capital tab
 */

const SCOPE_LABELS: Record<FinancialScope, string> = {
  consolidated: 'Consolidated',
  ttc: 'TTC',
  go: 'GO',
  up: 'UP',
  capital: 'Capital activity',
};

export function FinancialStatements() {
  const state = useGameStore((s) => s.state);
  const forecastRange = useGameStore((s) => s.forecastRange);
  const [scope, setScope] = useState<FinancialScope>('consolidated');

  const isCapital = scope === 'capital';
  // Monte Carlo cash forecast for Capital Activity (12 runs, next 4Q).
  // Computed lazily on scope change since it's a sim.
  const cashForecast = useMemo(() => {
    if (!isCapital) return undefined;
    return forecastRange(4, 12).points.map((p) => ({
      quarter: p.quarter,
      cashMedian: p.cashMedian,
      cashMin: p.cashMin,
      cashMax: p.cashMax,
    }));
  }, [isCapital, forecastRange]);

  const pnlCols = isCapital ? [] : buildOperatingPnl(state, scope, 6, 4);
  const capCols = isCapital ? buildCapitalActivity(state, 6, 4, cashForecast) : [];

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Financial statements
          </h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {scope === 'consolidated'
              ? 'Consolidated operating P&L. Gov allowance broken out by source. Forecast columns shaded.'
              : isCapital
                ? 'Capital project draws + financing proceeds + refi fees.'
                : `${SCOPE_LABELS[scope]} agency-only P&L. Allowance is system-pool — shown on Consolidated view.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {(['consolidated', 'ttc', 'go', 'up', 'capital'] as FinancialScope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-md px-2.5 py-1 font-medium ${
                scope === s
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {SCOPE_LABELS[s]}
            </button>
          ))}
        </div>
      </header>

      <div className="overflow-x-auto">
        {isCapital ? <CapitalTable cols={capCols} /> : <PnlTable cols={pnlCols} scope={scope} />}
      </div>
      <p className="mt-2 text-[10px] text-neutral-400">
        All numbers $M. Forecast quarters (gray) projected from current run-rate
        (no events factored in).
      </p>
    </section>
  );
}

function PnlTable({ cols, scope }: { cols: PnlCol[]; scope: FinancialScope }) {
  if (cols.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-4">
        End a quarter to populate the {SCOPE_LABELS[scope]} P&L.
      </p>
    );
  }
  const isConsolidated = scope === 'consolidated';
  return (
    <table className="w-full text-xs num">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
          <th className="text-left py-1 pr-4 font-semibold">Line item</th>
          {cols.map((c) => (
            <th
              key={c.quarter}
              className={`text-right py-1 px-2 font-semibold ${c.isForecast ? 'bg-neutral-50 text-neutral-400' : ''}`}
            >
              {c.label}
              {c.isForecast && <div className="text-[8px] font-normal">forecast</div>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isConsolidated && (
          <>
            <Subheader label="REVENUE — Government allowance" cols={cols} />
            <Row label="  Ottawa (federal, 40%)" cols={cols} pick={(c) => c.allowanceOttawa} positive />
            <Row label="  Queen's Park (provincial, 35%)" cols={cols} pick={(c) => c.allowanceQp} positive />
            <Row label="  City Hall (municipal, 25%)" cols={cols} pick={(c) => c.allowanceCityHall} positive />
          </>
        )}
        <Subheader label="REVENUE — Operations" cols={cols} />
        <Row label={`  Fare revenue${isConsolidated ? ' (system)' : ''}`} cols={cols} pick={(c) => c.fareRevenue} positive />
        {isConsolidated && (
          <Row label="  LVC revenue (operating projects)" cols={cols} pick={(c) => c.lvcRevenue} positive />
        )}
        <SubtotalRow label="Total revenue" cols={cols} pick={(c) => c.totalRevenue} />
        <Subheader label="EXPENSES" cols={cols} />
        <Row label="  Operating expense" cols={cols} pick={(c) => -c.opex} />
        <Row label="  Maintenance" cols={cols} pick={(c) => -c.maintenance} />
        <SubtotalRow label="Operating income" cols={cols} pick={(c) => c.operatingIncome} />
        {isConsolidated && (
          <>
            <Row label="  Interest expense (debt service)" cols={cols} pick={(c) => -c.interestExpense} />
          </>
        )}
        <SubtotalRow label="Net income (operations)" cols={cols} pick={(c) => c.netIncome} />
        {isConsolidated && (
          <>
            <Subheader label="FINANCING (non-operating)" cols={cols} />
            <Row
              label="  Operating bond proceeds (issued this Q)"
              cols={cols}
              pick={(c) => c.operatingFinancingProceeds}
              positive
            />
          </>
        )}
        <TotalRow
          label={isConsolidated ? 'Net change in cash' : 'Agency net income'}
          cols={cols}
          pick={(c) => (isConsolidated ? c.netCashChange : c.netIncome)}
        />
      </tbody>
    </table>
  );
}

function CapitalTable({ cols }: { cols: CapitalCol[] }) {
  if (cols.length === 0) {
    return (
      <p className="text-sm text-neutral-500 py-4">
        End a quarter to start tracking capital activity.
      </p>
    );
  }
  return (
    <table className="w-full text-xs num">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
          <th className="text-left py-1 pr-4 font-semibold">Line item</th>
          {cols.map((c) => (
            <th
              key={c.quarter}
              className={`text-right py-1 px-2 font-semibold ${c.isForecast ? 'bg-neutral-50 text-neutral-400' : ''}`}
            >
              {c.label}
              {c.isForecast && <div className="text-[8px] font-normal">forecast</div>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <Subheader label="OUTFLOWS — Capital project draws" cols={cols} />
        <Row label="  Ontario Line (inherited mega)" cols={cols} pick={(c) => -c.ontarioLineDraws} />
        <Row label="  Other projects" cols={cols} pick={(c) => -c.otherCapexDraws} />
        <Subheader label="OUTFLOWS — Existing debt commitments" cols={cols} />
        <Row label="  Ontario Line debt service (inherited)" cols={cols} pick={(c) => -c.ontarioLineDebtService} />
        <Row label="  Other debt service" cols={cols} pick={(c) => -c.otherDebtService} />
        <Row label="  Refi fees paid" cols={cols} pick={(c) => -c.refiFee} />
        <Subheader label="INFLOWS — Financing" cols={cols} />
        <Row label="  Bond proceeds" cols={cols} pick={(c) => c.financingProceeds} positive />
        <SubtotalRow label="Net capital flow" cols={cols} pick={(c) => c.netCapitalFlow} />
        <TotalRow label="Ending cash" cols={cols} pick={(c) => c.endingCash} />
        {cols.some((c) => c.isForecast && c.cashMin !== undefined) && (
          <tr className="border-t border-neutral-100 text-[10px] text-neutral-500">
            <td className="text-left py-1 pr-4 italic">  Forecast cash band (Monte Carlo)</td>
            {cols.map((c) => (
              <td key={`band-${c.quarter}`} className="text-right py-1 px-2">
                {c.isForecast && c.cashMin !== undefined && c.cashMax !== undefined
                  ? `${formatMoney(c.cashMin)}…${formatMoney(c.cashMax)}`
                  : '—'}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

function Subheader<T extends { quarter: number; isForecast?: boolean }>({
  label,
  cols,
}: {
  label: string;
  cols: T[];
}) {
  return (
    <tr className="bg-neutral-50/60">
      <td colSpan={cols.length + 1} className="text-left py-1 pr-4 text-[10px] font-bold uppercase tracking-wide text-blue-800">
        {label}
      </td>
    </tr>
  );
}

function Row<T extends { quarter: number; isForecast?: boolean }>({
  label,
  cols,
  pick,
  positive,
}: {
  label: string;
  cols: T[];
  pick: (c: T) => number;
  positive?: boolean;
}) {
  return (
    <tr className="border-t border-neutral-100">
      <td className="text-left py-1 pr-4 text-neutral-700">{label}</td>
      {cols.map((c) => {
        const v = pick(c);
        const forecastClass = c.isForecast ? 'bg-neutral-50/60 text-neutral-400' : '';
        return (
          <td
            key={c.quarter}
            className={`text-right py-1 px-2 ${forecastClass || (positive ? 'text-emerald-700' : v < 0 ? 'text-red-700' : 'text-neutral-700')}`}
          >
            {v === 0 ? '—' : formatMoneyDelta(v).replace('+', '')}
          </td>
        );
      })}
    </tr>
  );
}

function SubtotalRow<T extends { quarter: number; isForecast?: boolean }>({
  label,
  cols,
  pick,
}: {
  label: string;
  cols: T[];
  pick: (c: T) => number;
}) {
  return (
    <tr className="border-t-2 border-neutral-200 bg-neutral-50/30">
      <td className="text-left py-1 pr-4 font-semibold text-neutral-800">{label}</td>
      {cols.map((c) => {
        const v = pick(c);
        const forecastClass = c.isForecast ? 'text-neutral-400' : '';
        return (
          <td
            key={c.quarter}
            className={`text-right py-1 px-2 font-semibold ${forecastClass || (v < 0 ? 'text-red-700' : 'text-neutral-800')}`}
          >
            {formatMoney(Math.abs(v))}
          </td>
        );
      })}
    </tr>
  );
}

function TotalRow<T extends { quarter: number; isForecast?: boolean }>({
  label,
  cols,
  pick,
}: {
  label: string;
  cols: T[];
  pick: (c: T) => number;
}) {
  return (
    <tr className="border-t-2 border-neutral-300 bg-neutral-100">
      <td className="text-left py-1.5 pr-4 font-bold text-neutral-900 uppercase tracking-wide text-[11px]">
        {label}
      </td>
      {cols.map((c) => {
        const v = pick(c);
        const forecastClass = c.isForecast ? 'text-neutral-500' : '';
        return (
          <td
            key={c.quarter}
            className={`text-right py-1.5 px-2 font-bold ${forecastClass || (v < 0 ? 'text-red-700' : 'text-neutral-900')}`}
          >
            {formatMoney(v)}
          </td>
        );
      })}
    </tr>
  );
}
