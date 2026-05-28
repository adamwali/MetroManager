import type { GameState } from '@/types/gameState';
import type { CreditorType, DebtTranche } from '@/types/finance';
import type { ActionLogEntry } from '@/types/actionLog';
import { bp, cash, quarter, score } from '@/types/scalars';
import { RATING_OPERATING_BOND_CAPS, RATING_SPREAD_BP } from './rating';

/**
 * Treasury actions. Phase 7.
 *
 * - `issueOperatingBond(state, creditor, amountM)`: issue a new debt
 *   tranche backed by future operations. Rating-gated cap per quarter
 *   AND total outstanding. Provides immediate cash; adds quarterly debt
 *   service.
 *
 * - `refinanceTranche(state, trancheId)`: replace a tranche with a new
 *   one at current market rate. Costs 1.5% of principal upfront from
 *   cash. Same creditor, same maturity, new coupon.
 *
 * Operating bond risk premium: +75bp over equivalent project bonds
 * (operating bonds are backed by future operations, riskier than
 * asset-backed project debt). Spec §5.
 */

const OPERATING_BOND_RISK_PREMIUM_BP = 75;
const REFI_FEE_PCT = 0.015; // 1.5% of principal

/** Issuance rate per creditor (operating bonds), in bp. Builds on rating spread. */
function operatingBondRateBp(state: GameState, creditor: CreditorType): number {
  const boc = state.debt.bocPolicyRate as unknown as number;
  const ratingSpread = RATING_SPREAD_BP[state.debt.rating];
  // OpenBooks discount applies to floating-style bonds (i.e., new issuance)
  const openBooksDiscount = state.engineVars.openBooks ? 20 : 0;
  const creditorPremium: Record<CreditorType, number> = {
    pension: 60, // patient capital
    institutional: 80,
    retail: 130, // higher friction
    foreign: 40, // cheapest but optics
  };
  return Math.max(
    100,
    boc + ratingSpread + creditorPremium[creditor] + OPERATING_BOND_RISK_PREMIUM_BP - openBooksDiscount,
  );
}

/**
 * Total outstanding from operating-bond issuance. Used for cap check.
 * Operating bonds are identified by a `t_op_` id prefix.
 */
function totalOperatingBondsOutstandingM(state: GameState): number {
  return state.debt.tranches
    .filter((t) => t.id.startsWith('t_op_'))
    .reduce((acc, t) => acc + (t.principal as unknown as number), 0);
}

/**
 * Total operating bonds issued this quarter. Used for per-quarter cap.
 */
function quarterlyOperatingBondsIssuedM(state: GameState): number {
  const q = state.quarter as unknown as number;
  return state.debt.tranches
    .filter(
      (t) =>
        t.id.startsWith('t_op_') &&
        (t.issuedAt as unknown as number) === q,
    )
    .reduce((acc, t) => acc + (t.principal as unknown as number), 0);
}

export interface OperatingBondQuote {
  rateBp: number;
  ratePct: number;
  capPerQuarterRemaining: number;
  capTotalRemaining: number;
  maxIssuableM: number;
  blockedReason?: string;
}

/** Compute what the player can issue right now. UI uses this for the issuance form. */
export function quoteOperatingBond(
  state: GameState,
  creditor: CreditorType,
): OperatingBondQuote {
  const rateBp = operatingBondRateBp(state, creditor);
  const caps = RATING_OPERATING_BOND_CAPS[state.debt.rating];
  const alreadyThisQ = quarterlyOperatingBondsIssuedM(state);
  const alreadyTotal = totalOperatingBondsOutstandingM(state);
  const capPerQuarterRemaining = Math.max(0, caps.perQuarterM - alreadyThisQ);
  const capTotalRemaining = Math.max(0, caps.totalOutstandingM - alreadyTotal);
  const maxIssuableM = Math.min(capPerQuarterRemaining, capTotalRemaining);
  let blockedReason: string | undefined;
  if (caps.perQuarterM === 0) {
    blockedReason = `Rating ${state.debt.rating} blocks operating bond issuance. Improve cash position or board confidence.`;
  } else if (maxIssuableM === 0) {
    blockedReason = 'Quarterly or total cap reached. Wait until next quarter or refinance.';
  }
  return {
    rateBp,
    ratePct: rateBp / 100,
    capPerQuarterRemaining,
    capTotalRemaining,
    maxIssuableM,
    ...(blockedReason ? { blockedReason } : {}),
  };
}

/** Issue an operating bond. Returns updated state + log entry. */
export function issueOperatingBond(
  state: GameState,
  creditor: CreditorType,
  amountM: number,
): { state: GameState; logEntry: ActionLogEntry | null; outcomeSummary: string } {
  const quote = quoteOperatingBond(state, creditor);
  if (quote.blockedReason) {
    return { state, logEntry: null, outcomeSummary: quote.blockedReason };
  }
  const safe = Math.min(Math.max(0, Math.round(amountM)), quote.maxIssuableM);
  if (safe <= 0) {
    return { state, logEntry: null, outcomeSummary: 'Amount must be positive.' };
  }
  const q = state.quarter as unknown as number;
  const trancheId = `t_op_${creditor}_q${q}_${state.nextLogId}`;
  const newTranche: DebtTranche = {
    id: trancheId,
    creditor,
    principal: cash(safe),
    coupon: { kind: 'fixed', rate: bp(quote.rateBp) },
    maturity: quarter(q + 32), // 8-year operating term
    issuedAt: state.quarter,
  };
  const logId = `q${q}-${state.nextLogId}`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id: logId,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: `issueOperatingBond:${creditor}`,
    summary: `Issued $${safe}M operating bond to ${creditor} at ${quote.ratePct.toFixed(2)}%`,
  };
  return {
    state: {
      ...state,
      cash: {
        ...state.cash,
        balance: cash((state.cash.balance as unknown as number) + safe),
      },
      debt: { ...state.debt, tranches: [...state.debt.tranches, newTranche] },
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    logEntry: entry,
    outcomeSummary: `+$${safe}M cash at ${quote.ratePct.toFixed(2)}% — ${creditor}`,
  };
}

export interface RefiQuote {
  trancheId: string;
  oldRateBp: number;
  newRateBp: number;
  feeM: number;
  savingsPerQuarterM: number;
  annualSavingsM: number;
  breakEvenQuarters: number;
}

/** Compute the refi terms for a given tranche. UI uses this for inline preview. */
export function quoteRefi(state: GameState, trancheId: string): RefiQuote | null {
  const tranche = state.debt.tranches.find((t) => t.id === trancheId);
  if (!tranche) return null;
  const oldRateBp =
    tranche.coupon.kind === 'fixed'
      ? (tranche.coupon.rate as unknown as number)
      : (state.debt.bocPolicyRate as unknown as number) +
        (tranche.coupon.spreadOverBOC as unknown as number);
  const newRateBp = operatingBondRateBp(state, tranche.creditor);
  const principal = tranche.principal as unknown as number;
  const feeM = Math.round(principal * REFI_FEE_PCT);
  const savingsPerQuarterM = ((oldRateBp - newRateBp) / 10_000 / 4) * principal;
  const annualSavingsM = savingsPerQuarterM * 4;
  const breakEvenQuarters = savingsPerQuarterM > 0 ? feeM / savingsPerQuarterM : Infinity;
  return {
    trancheId,
    oldRateBp,
    newRateBp,
    feeM,
    savingsPerQuarterM,
    annualSavingsM,
    breakEvenQuarters,
  };
}

/** Execute a refi. Replaces tranche with new fixed-rate tranche. */
export function refinanceTranche(
  state: GameState,
  trancheId: string,
): { state: GameState; logEntry: ActionLogEntry | null; outcomeSummary: string } {
  const quote = quoteRefi(state, trancheId);
  if (!quote) return { state, logEntry: null, outcomeSummary: 'Tranche not found.' };
  const cashOnHand = state.cash.balance as unknown as number;
  if (cashOnHand < quote.feeM) {
    return {
      state,
      logEntry: null,
      outcomeSummary: `Refi fee $${quote.feeM}M exceeds cash on hand $${cashOnHand}M.`,
    };
  }
  const old = state.debt.tranches.find((t) => t.id === trancheId)!;
  const refidId = `${trancheId}_refi_q${state.quarter as unknown as number}`;
  const newTranche: DebtTranche = {
    id: refidId,
    creditor: old.creditor,
    principal: old.principal,
    coupon: { kind: 'fixed', rate: bp(quote.newRateBp) },
    maturity: old.maturity,
    issuedAt: state.quarter,
  };
  const logId = `q${state.quarter as unknown as number}-${state.nextLogId}`;
  const oldPct = quote.oldRateBp / 100;
  const newPct = quote.newRateBp / 100;
  const summary = `Refi ${trancheId}: ${oldPct.toFixed(2)}% → ${newPct.toFixed(2)}% (fee $${quote.feeM}M, save $${Math.round(quote.annualSavingsM)}M/yr)`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id: logId,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: `refinance:${trancheId}`,
    summary,
  };
  return {
    state: {
      ...state,
      cash: { ...state.cash, balance: cash(cashOnHand - quote.feeM) },
      debt: {
        ...state.debt,
        tranches: state.debt.tranches.map((t) => (t.id === trancheId ? newTranche : t)),
      },
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    logEntry: entry,
    outcomeSummary: summary,
  };
}

// ── Community consultation program (Phase 10.2) ─────────────────────────
// Player-initiated NIMBY mitigation. Costs $15M, drops NIMBY by 15.
// Gated by City Hall trust ≥ 40 (you need municipal buy-in to do meaningful
// outreach). 6Q cooldown via lastCommunityConsultationQuarter.

export interface CommunityConsultationQuote {
  feeM: number;
  nimbyDelta: number;
  blockedReason?: string;
}

export function quoteCommunityConsultation(state: GameState): CommunityConsultationQuote {
  const cashOnHand = state.cash.balance as unknown as number;
  const nimby = state.engineVars.nimbyOrganization as unknown as number;
  const cityHallTrust = state.politics.cityHall.trust as unknown as number;
  const last = state.engineVars.lastCommunityConsultationQuarter as number | undefined;
  const currentQ = state.quarter as unknown as number;
  const feeM = 15;
  if (nimby < 5) {
    return { feeM, nimbyDelta: 0, blockedReason: 'No meaningful opposition to consult (<5).' };
  }
  if (cityHallTrust < 40) {
    return { feeM, nimbyDelta: 0, blockedReason: 'Need City Hall trust ≥40 for outreach buy-in.' };
  }
  if (last !== undefined && currentQ - last < 6) {
    const wait = 6 - (currentQ - last);
    return { feeM, nimbyDelta: 0, blockedReason: `On cooldown — ${wait}Q remaining.` };
  }
  if (cashOnHand < feeM) {
    return { feeM, nimbyDelta: 0, blockedReason: `Need $${feeM}M cash on hand.` };
  }
  return { feeM, nimbyDelta: -15 };
}

export function runCommunityConsultation(state: GameState): {
  state: GameState;
  logEntry: ActionLogEntry | null;
  outcomeSummary: string;
} {
  const quote = quoteCommunityConsultation(state);
  if (quote.blockedReason) {
    return { state, logEntry: null, outcomeSummary: quote.blockedReason };
  }
  const currentQ = state.quarter as unknown as number;
  const cashOnHand = state.cash.balance as unknown as number;
  const nimby = state.engineVars.nimbyOrganization as unknown as number;
  const newNimby = Math.max(0, nimby + quote.nimbyDelta);
  const oldApproval = state.engineVars.publicApproval as unknown as number;
  const newApproval = Math.min(100, oldApproval + 3);

  const summary = `-$${quote.feeM}M cash · NIMBY ${nimby}→${newNimby} · approval +3 (community consultation)`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id: `q${currentQ}-${state.nextLogId}`,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: 'runCommunityConsultation',
    summary,
  };

  return {
    state: {
      ...state,
      cash: { ...state.cash, balance: cash(cashOnHand - quote.feeM) },
      engineVars: {
        ...state.engineVars,
        nimbyOrganization: score(newNimby),
        publicApproval: score(newApproval),
        lastCommunityConsultationQuarter: currentQ,
      },
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    logEntry: entry,
    outcomeSummary: summary,
  };
}

// ── Voluntary value-for-money audit (Phase 10.2) ─────────────────────────
// Player-initiated audit to lower auditor scrutiny before EV056 fires.
// Costs $40M, drops scrutiny by 20, +5 approval, +3 each gov trust.
// Cooldown 8Q tracked via lastVoluntaryAuditQuarter on engineVars.

export interface VoluntaryAuditQuote {
  feeM: number;
  scrutinyDelta: number;
  blockedReason?: string;
}

export function quoteVoluntaryAudit(state: GameState): VoluntaryAuditQuote {
  const cashOnHand = state.cash.balance as unknown as number;
  const scrutiny = state.engineVars.auditorScrutiny as unknown as number;
  const last = state.engineVars.lastVoluntaryAuditQuarter as number | undefined;
  const currentQ = state.quarter as unknown as number;
  const feeM = 40;
  if (scrutiny < 10) {
    return { feeM, scrutinyDelta: 0, blockedReason: 'Scrutiny too low to justify the spend (<10).' };
  }
  if (last !== undefined && currentQ - last < 8) {
    const wait = 8 - (currentQ - last);
    return { feeM, scrutinyDelta: 0, blockedReason: `On cooldown — ${wait}Q remaining.` };
  }
  if (cashOnHand < feeM) {
    return { feeM, scrutinyDelta: 0, blockedReason: `Need $${feeM}M cash on hand.` };
  }
  return { feeM, scrutinyDelta: -20 };
}

export function commissionVoluntaryAudit(state: GameState): {
  state: GameState;
  logEntry: ActionLogEntry | null;
  outcomeSummary: string;
} {
  const quote = quoteVoluntaryAudit(state);
  if (quote.blockedReason) {
    return { state, logEntry: null, outcomeSummary: quote.blockedReason };
  }
  const currentQ = state.quarter as unknown as number;
  const cashOnHand = state.cash.balance as unknown as number;
  const scrutiny = state.engineVars.auditorScrutiny as unknown as number;
  const newScrutiny = Math.max(0, scrutiny + quote.scrutinyDelta);
  const oldApproval = state.engineVars.publicApproval as unknown as number;
  const newApproval = Math.min(100, oldApproval + 5);

  const summary = `-$${quote.feeM}M cash · scrutiny ${scrutiny}→${newScrutiny} · approval +5 (voluntary VfM audit)`;
  const entry: ActionLogEntry = {
    kind: 'player_action',
    id: `q${currentQ}-${state.nextLogId}`,
    quarter: state.quarter,
    cause: { kind: 'player' },
    action: 'commissionVoluntaryAudit',
    summary,
  };

  return {
    state: {
      ...state,
      cash: { ...state.cash, balance: cash(cashOnHand - quote.feeM) },
      engineVars: {
        ...state.engineVars,
        auditorScrutiny: score(newScrutiny),
        publicApproval: score(newApproval),
        lastVoluntaryAuditQuarter: currentQ,
      },
      actionLog: [...state.actionLog, entry],
      nextLogId: state.nextLogId + 1,
    },
    logEntry: entry,
    outcomeSummary: summary,
  };
}
