import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { buildFinancialStatements, type QuarterCol } from '@/utils/financialStatements';
import { formatMoney, formatMoneyDelta } from '@/utils/humanize';

/**
 * Financial statements view for Treasury. Phase 10.
 *
 * Three statements (P&L, Cash flow, Balance sheet), quarters as columns,
 * line items as rows. Switch between statements with a tab. Up to the
 * last 8 quarters shown side-by-side.
 */

type StatementKind = 'pnl' | 'cashflow' | 'balance';

const LABELS: Record<StatementKind, string> = {
  pnl: 'P&L',
  cashflow: 'Cash flow',
  balance: 'Balance sheet',
};

export function FinancialStatements() {
  const state = useGameStore((s) => s.state);
  const cols = buildFinancialStatements(state, 8);
  const [kind, setKind] = useState<StatementKind>('pnl');

  if (cols.length === 0) {
    return (
      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Financial statements
        </h3>
        <p className="mt-2 text-sm text-neutral-500">
          End a quarter to start building the statements.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Financial statements
        </h3>
        <div className="flex gap-1.5 text-xs">
          {(Object.keys(LABELS) as StatementKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-md px-2 py-1 font-medium ${
                kind === k
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {LABELS[k]}
            </button>
          ))}
        </div>
      </header>
      <div className="overflow-x-auto">
        {kind === 'pnl' && <PnlTable cols={cols} />}
        {kind === 'cashflow' && <CashFlowTable cols={cols} />}
        {kind === 'balance' && <BalanceTable cols={cols} />}
      </div>
      <p className="mt-2 text-[10px] text-neutral-400">
        Last {cols.length} quarter{cols.length === 1 ? '' : 's'}. All numbers $M.
      </p>
    </section>
  );
}

function PnlTable({ cols }: { cols: QuarterCol[] }) {
  return (
    <table className="w-full text-xs num">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
          <th className="text-left py-1 pr-4 font-semibold">Line item</th>
          {cols.map((c) => (
            <th key={c.quarter} className="text-right py-1 px-2 font-semibold">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <Row label="Operating allowance" cols={cols} pick={(c) => c.operatingAllowance} positive />
        <Row label="Fare revenue" cols={cols} pick={(c) => c.fareRevenue} positive />
        <SubtotalRow label="Total revenue" cols={cols} pick={(c) => c.totalRevenue} />
        <Row label="Operating expenses" cols={cols} pick={(c) => -c.opex} />
        <Row label="Maintenance" cols={cols} pick={(c) => -c.maintenance} />
        <SubtotalRow label="Operating income" cols={cols} pick={(c) => c.operatingIncome} />
        <Row label="Interest expense" cols={cols} pick={(c) => -c.interestExpense} />
        <TotalRow label="Net income" cols={cols} pick={(c) => c.netIncome} />
      </tbody>
    </table>
  );
}

function CashFlowTable({ cols }: { cols: QuarterCol[] }) {
  return (
    <table className="w-full text-xs num">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
          <th className="text-left py-1 pr-4 font-semibold">Line item</th>
          {cols.map((c) => (
            <th key={c.quarter} className="text-right py-1 px-2 font-semibold">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <SubtotalRow label="OPERATING" cols={cols} pick={() => NaN} hideValue />
        <Row label="Cash from operations" cols={cols} pick={(c) => c.cashFromOperations} />
        <SubtotalRow label="INVESTING" cols={cols} pick={() => NaN} hideValue />
        <Row label="Capital project draws" cols={cols} pick={(c) => -c.capexDraws} />
        <SubtotalRow label="FINANCING" cols={cols} pick={() => NaN} hideValue />
        <Row label="Bond proceeds" cols={cols} pick={(c) => c.financingProceeds} />
        <Row label="Refi fees paid" cols={cols} pick={(c) => -c.refiFee} />
        <SubtotalRow label="Net cash flow / Q" cols={cols} pick={(c) => c.netCashFlow} />
        <TotalRow label="Ending cash" cols={cols} pick={(c) => c.endingCash} />
      </tbody>
    </table>
  );
}

function BalanceTable({ cols }: { cols: QuarterCol[] }) {
  return (
    <table className="w-full text-xs num">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-neutral-500">
          <th className="text-left py-1 pr-4 font-semibold">Line item</th>
          {cols.map((c) => (
            <th key={c.quarter} className="text-right py-1 px-2 font-semibold">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <SubtotalRow label="ASSETS" cols={cols} pick={() => NaN} hideValue />
        <Row label="Cash" cols={cols} pick={(c) => c.endingCash} />
        <Row label="Projects-in-flight (book)" cols={cols} pick={(c) => c.projectsInFlightBookValue || 0} />
        <SubtotalRow label="LIABILITIES" cols={cols} pick={() => NaN} hideValue />
        <Row label="Total debt outstanding" cols={cols} pick={(c) => c.totalDebt || 0} />
      </tbody>
    </table>
  );
}

function Row({
  label,
  cols,
  pick,
  positive,
}: {
  label: string;
  cols: QuarterCol[];
  pick: (c: QuarterCol) => number;
  positive?: boolean;
}) {
  return (
    <tr className="border-t border-neutral-100">
      <td className="text-left py-1.5 pr-4 text-neutral-700">{label}</td>
      {cols.map((c) => {
        const v = pick(c);
        return (
          <td
            key={c.quarter}
            className={`text-right py-1.5 px-2 ${positive ? 'text-emerald-700' : v < 0 ? 'text-red-700' : 'text-neutral-700'}`}
          >
            {formatMoneyDelta(v).replace('+', '')}
          </td>
        );
      })}
    </tr>
  );
}

function SubtotalRow({
  label,
  cols,
  pick,
  hideValue,
}: {
  label: string;
  cols: QuarterCol[];
  pick: (c: QuarterCol) => number;
  hideValue?: boolean;
}) {
  return (
    <tr className="border-t-2 border-neutral-200 bg-neutral-50/50">
      <td className="text-left py-1.5 pr-4 font-semibold text-neutral-800">{label}</td>
      {cols.map((c) => {
        const v = pick(c);
        return (
          <td key={c.quarter} className="text-right py-1.5 px-2 font-semibold text-neutral-800">
            {hideValue || Number.isNaN(v) ? '' : formatMoney(Math.abs(v))}
          </td>
        );
      })}
    </tr>
  );
}

function TotalRow({
  label,
  cols,
  pick,
}: {
  label: string;
  cols: QuarterCol[];
  pick: (c: QuarterCol) => number;
}) {
  return (
    <tr className="border-t-2 border-neutral-300 bg-neutral-100">
      <td className="text-left py-2 pr-4 font-bold text-neutral-900 uppercase tracking-wide text-[11px]">
        {label}
      </td>
      {cols.map((c) => {
        const v = pick(c);
        return (
          <td
            key={c.quarter}
            className={`text-right py-2 px-2 font-bold ${v < 0 ? 'text-red-700' : 'text-neutral-900'}`}
          >
            {formatMoney(v)}
          </td>
        );
      })}
    </tr>
  );
}
