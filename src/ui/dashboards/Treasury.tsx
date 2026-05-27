import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import { effectiveCouponBp, quarterlyDebtService } from '@engine/finance';
import { quoteOperatingBond, quoteRefi } from '@engine/treasuryActions';
import { RATING_OPERATING_BOND_CAPS } from '@engine/rating';
import type { CreditRating, CreditorType, DebtTranche } from '@/types/finance';
import {
  formatMoney,
  formatMoneyDelta,
  formatPct,
  quarterLabel,
  quartersUntilLabel,
} from '@/utils/humanize';
import { FinancialStatements } from '@ui/components/FinancialStatements';

const RATING_TONE: Record<CreditRating, { bg: string; text: string }> = {
  AAA: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  AA: { bg: 'bg-blue-100', text: 'text-blue-800' },
  A: { bg: 'bg-sky-100', text: 'text-sky-800' },
  BBB: { bg: 'bg-amber-100', text: 'text-amber-800' },
  BB: { bg: 'bg-orange-100', text: 'text-orange-800' },
  B: { bg: 'bg-red-100', text: 'text-red-800' },
  CCC: { bg: 'bg-red-200', text: 'text-red-900' },
};

const CREDITOR_LABEL: Record<CreditorType, string> = {
  pension: 'Pension funds',
  institutional: 'Institutional',
  retail: 'Retail',
  foreign: 'Foreign / SWF',
};

export function Treasury() {
  const state = useGameStore((s) => s.state);
  const currentQ = state.quarter as unknown as number;
  const totalDebt = state.debt.tranches.reduce(
    (acc, t) => acc + (t.principal as unknown as number),
    0,
  );
  const debtServiceQ = quarterlyDebtService(
    state.debt,
    state.engineVars.openBooks,
  ) as unknown as number;
  const weightedRateBp =
    state.debt.tranches.reduce((acc, t) => {
      const eff = effectiveCouponBp(t, state.debt.bocPolicyRate, state.engineVars.openBooks) as unknown as number;
      const principal = t.principal as unknown as number;
      return acc + eff * principal;
    }, 0) / Math.max(1, totalDebt);
  const bocBp = state.debt.bocPolicyRate as unknown as number;
  const rating = state.debt.rating;
  const tone = RATING_TONE[rating];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Treasury</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Debt portfolio, bond issuance, refinancing. Credit rating recomputed
          each quarter from cash, debt service ratio, and board confidence.
        </p>
      </header>

      {/* Portfolio summary */}
      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Total debt</div>
          <div className="num mt-0.5 text-xl font-semibold">{formatMoney(totalDebt)}</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Service / Q</div>
          <div className="num mt-0.5 text-xl font-semibold">{formatMoney(debtServiceQ)}</div>
          <div className="text-[10px] text-neutral-500">{formatMoney(debtServiceQ * 4)}/yr</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Weighted rate</div>
          <div className="num mt-0.5 text-xl font-semibold">{(weightedRateBp / 100).toFixed(2)}%</div>
          <div className="text-[10px] text-neutral-500">BOC at {(bocBp / 100).toFixed(2)}%</div>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white p-3">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">Credit rating</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className={`num rounded px-2 py-0.5 text-base font-semibold ${tone.bg} ${tone.text}`}>
              {rating}
            </span>
            <span className="text-[10px] text-neutral-500">
              {state.engineVars.openBooks ? '+open books = -20bp spread' : ''}
            </span>
          </div>
        </div>
      </section>

      {/* Financial statements — P&L / Cash flow / Balance sheet, quarters as columns */}
      <FinancialStatements />

      {/* Operating bond issuance */}
      <BondIssuanceCard />

      {/* Debt portfolio table */}
      <section className="rounded-md border border-neutral-200 bg-white">
        <header className="border-b border-neutral-200 px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Debt portfolio · {state.debt.tranches.length} tranche{state.debt.tranches.length === 1 ? '' : 's'}
          </h2>
          <p className="mt-1 text-[11px] text-neutral-500">
            Each tranche can be refinanced individually. Fee 1.5% of principal upfront,
            then locked at current market rate.
          </p>
        </header>
        <ul className="divide-y divide-neutral-200">
          {state.debt.tranches.map((t) => (
            <TrancheRow key={t.id} tranche={t} currentQ={currentQ} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function TrancheRow({ tranche, currentQ }: { tranche: DebtTranche; currentQ: number }) {
  const state = useGameStore((s) => s.state);
  const refinance = useGameStore((s) => s.refinanceTranche);
  const refiQuote = quoteRefi(state, tranche.id);
  const effBp = effectiveCouponBp(
    tranche,
    state.debt.bocPolicyRate,
    state.engineVars.openBooks,
  ) as unknown as number;
  const principal = tranche.principal as unknown as number;
  const serviceQ = (principal * effBp) / 10_000 / 4;
  const maturityIn = (tranche.maturity as unknown as number) - currentQ;

  const refiBeneficial =
    refiQuote !== null &&
    refiQuote.savingsPerQuarterM > 0 &&
    refiQuote.breakEvenQuarters < maturityIn;

  return (
    <li className="px-4 py-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center">
      <div>
        <div className="text-sm font-medium">{tranche.id}</div>
        <div className="text-[11px] text-neutral-500">
          {tranche.creditor} ·{' '}
          {tranche.coupon.kind === 'fixed' ? 'fixed' : 'floating'} ·{' '}
          issued {quarterLabel(tranche.issuedAt as unknown as number)}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Principal</div>
        <div className="num text-sm font-semibold">{formatMoney(principal)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Rate</div>
        <div className="num text-sm font-semibold">{(effBp / 100).toFixed(2)}%</div>
        <div className="text-[10px] text-neutral-500 num">{formatMoney(serviceQ)}/Q service</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-neutral-500">Matures</div>
        <div className="text-sm font-semibold">
          {quarterLabel(tranche.maturity as unknown as number)}
        </div>
        <div className="text-[10px] text-neutral-500">{quartersUntilLabel(maturityIn)}</div>
      </div>
      <div className="sm:text-right">
        {refiQuote && (
          <button
            type="button"
            onClick={() => refinance(tranche.id)}
            disabled={!refiBeneficial}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              refiBeneficial
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            }`}
            title={
              refiBeneficial
                ? `Refi at ${(refiQuote.newRateBp / 100).toFixed(2)}%, fee ${formatMoney(refiQuote.feeM)}, break-even ${refiQuote.breakEvenQuarters.toFixed(1)}Q, save ${formatMoneyDelta(refiQuote.annualSavingsM)}/yr`
                : refiQuote.savingsPerQuarterM <= 0
                  ? 'New rate is not lower than current rate'
                  : 'Maturity too close; refi fee exceeds savings before maturity'
            }
          >
            {refiBeneficial
              ? `Refi → ${(refiQuote.newRateBp / 100).toFixed(2)}%`
              : 'Refi N/A'}
          </button>
        )}
      </div>
    </li>
  );
}

function BondIssuanceCard() {
  const state = useGameStore((s) => s.state);
  const issue = useGameStore((s) => s.issueOperatingBond);
  const [creditor, setCreditor] = useState<CreditorType>('pension');
  const [amountM, setAmountM] = useState<number>(500);
  const quote = quoteOperatingBond(state, creditor);
  const caps = RATING_OPERATING_BOND_CAPS[state.debt.rating];

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Operating bond issuance
          </h2>
          <p className="mt-1 text-[11px] text-neutral-500">
            Issue debt against future operations to plug cash deficits.
            Risk premium +75bp over project debt. Capped by credit rating.
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">
            Caps at {state.debt.rating}
          </div>
          <div className="num text-sm">
            {formatMoney(caps.perQuarterM)}/Q · {formatMoney(caps.totalOutstandingM)} total
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">Creditor</span>
          <select
            value={creditor}
            onChange={(e) => setCreditor(e.target.value as CreditorType)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          >
            {(['pension', 'institutional', 'retail', 'foreign'] as CreditorType[]).map((c) => (
              <option key={c} value={c}>
                {CREDITOR_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            Amount ($M)
          </span>
          <input
            type="number"
            min={0}
            max={quote.maxIssuableM || 0}
            value={amountM}
            onChange={(e) => setAmountM(Math.max(0, Number(e.target.value) || 0))}
            className="num rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!!quote.blockedReason || amountM <= 0 || amountM > quote.maxIssuableM}
          onClick={() => issue(creditor, amountM)}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold text-white ${
            !!quote.blockedReason || amountM <= 0 || amountM > quote.maxIssuableM
              ? 'bg-neutral-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Issue bond
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs">
        <Stat label="Effective rate" value={`${quote.ratePct.toFixed(2)}%`} />
        <Stat
          label="Cap this quarter"
          value={`${formatMoney(quote.capPerQuarterRemaining)} remaining`}
        />
        <Stat
          label="Cap total"
          value={`${formatMoney(quote.capTotalRemaining)} remaining`}
        />
      </div>

      {quote.blockedReason && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          ⚠ {quote.blockedReason}
        </div>
      )}
      {!quote.blockedReason && amountM > 0 && amountM <= quote.maxIssuableM && (
        <p className="mt-3 text-[11px] text-neutral-500">
          Issuing ${amountM}M at {quote.ratePct.toFixed(2)}% adds{' '}
          {formatMoney((amountM * quote.rateBp) / 10_000 / 4)}/Q to debt service ·{' '}
          {formatPct(((amountM * quote.rateBp) / 10_000 / 4) / Math.max(1, (state.cash.balance as unknown as number) > 0 ? (state.cash.balance as unknown as number) : 1000), 2)} of current cash per Q.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="num mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
