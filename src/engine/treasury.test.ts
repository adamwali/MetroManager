import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import {
  driftRating,
  nextRatingFor,
  ratingFromMetrics,
  RATING_OPERATING_BOND_CAPS,
} from './rating';
import {
  issueOperatingBond,
  quoteOperatingBond,
  quoteRefi,
  refinanceTranche,
} from './treasuryActions';
import { cash, score } from '@/types/scalars';

describe('rating computation', () => {
  it('AA at game start (positive cash, modest debt, board 60)', () => {
    const s = createInitialGameState(0);
    expect(s.debt.rating).toBe('AA');
  });

  it('ratingFromMetrics matches thresholds', () => {
    expect(
      ratingFromMetrics({ cashM: 6_000, debtServiceRatio: 0.04, boardScore: 75 }),
    ).toBe('AAA');
    expect(
      ratingFromMetrics({ cashM: 0, debtServiceRatio: 0.08, boardScore: 55 }),
    ).toBe('AA');
    expect(
      ratingFromMetrics({ cashM: -1_500, debtServiceRatio: 0.12, boardScore: 40 }),
    ).toBe('A');
    expect(
      ratingFromMetrics({ cashM: -3_500, debtServiceRatio: 0.18, boardScore: 30 }),
    ).toBe('BBB');
    expect(
      ratingFromMetrics({ cashM: -7_000, debtServiceRatio: 0.40, boardScore: 5 }),
    ).toBe('B');
  });

  it('driftRating moves one notch toward target', () => {
    expect(driftRating('AA', 'A')).toBe('A');
    expect(driftRating('AA', 'BBB')).toBe('A'); // one notch only
    expect(driftRating('A', 'AAA')).toBe('AA'); // one notch
    expect(driftRating('AA', 'AA')).toBe('AA'); // no change
  });

  it('endTurn drifts rating based on metrics', () => {
    // Force cash deep negative + crash board → should drift AA → A over time
    let s = createInitialGameState(0);
    s = {
      ...s,
      cash: { ...s.cash, balance: cash(-3_000) },
      boardConfidence: { ...s.boardConfidence, score: score(30) },
    };
    s = endTurn(s);
    expect(s.debt.rating).toBe('A'); // one notch down from AA
    s = endTurn(s);
    // depending on cash trajectory it may stay A or drop further
    expect(['A', 'BBB']).toContain(s.debt.rating);
  });
});

describe('operating bond issuance', () => {
  it('quote includes effective rate + remaining caps', () => {
    const s = createInitialGameState(0); // AA rating
    const quote = quoteOperatingBond(s, 'pension');
    expect(quote.rateBp).toBeGreaterThan(0);
    expect(quote.maxIssuableM).toBeGreaterThan(0);
    expect(quote.blockedReason).toBeUndefined();
  });

  it('issuing adds cash and creates new tranche', () => {
    const s = createInitialGameState(0);
    const cashBefore = s.cash.balance as unknown as number;
    const tranchesBefore = s.debt.tranches.length;
    const r = issueOperatingBond(s, 'pension', 500);
    expect(r.state.cash.balance as unknown as number).toBe(cashBefore + 500);
    expect(r.state.debt.tranches.length).toBe(tranchesBefore + 1);
  });

  it('blocked at BBB rating', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      debt: { ...s.debt, rating: 'BBB' },
    };
    const quote = quoteOperatingBond(s, 'pension');
    expect(quote.blockedReason).toBeDefined();
    expect(quote.maxIssuableM).toBe(0);
  });

  it('per-quarter cap enforced at AA', () => {
    let s = createInitialGameState(0); // AA → $2B/Q cap
    const r1 = issueOperatingBond(s, 'pension', 2_000);
    expect(r1.state.cash.balance as unknown as number).toBe(
      (s.cash.balance as unknown as number) + 2_000,
    );
    s = r1.state;
    const r2 = issueOperatingBond(s, 'institutional', 500);
    // Should be blocked or capped to 0
    expect(r2.state.cash.balance).toEqual(s.cash.balance);
  });

  it('rating-gated caps match table', () => {
    expect(RATING_OPERATING_BOND_CAPS.AA.perQuarterM).toBe(2_000);
    expect(RATING_OPERATING_BOND_CAPS.A.perQuarterM).toBe(1_000);
    expect(RATING_OPERATING_BOND_CAPS.BBB.perQuarterM).toBe(0);
  });

  it('foreign creditor offers cheapest rate (+optics in real flow)', () => {
    const s = createInitialGameState(0);
    const pension = quoteOperatingBond(s, 'pension').rateBp;
    const inst = quoteOperatingBond(s, 'institutional').rateBp;
    const retail = quoteOperatingBond(s, 'retail').rateBp;
    const foreign = quoteOperatingBond(s, 'foreign').rateBp;
    expect(foreign).toBeLessThanOrEqual(pension);
    expect(retail).toBeGreaterThan(inst);
  });

  it('openBooks=true reduces rate by 20bp', () => {
    const closed = createInitialGameState(0, 'steadyOperator'); // openBooks=false
    const open = createInitialGameState(0, 'internationalTechnocrat'); // openBooks=true
    const closedRate = quoteOperatingBond(closed, 'pension').rateBp;
    const openRate = quoteOperatingBond(open, 'pension').rateBp;
    expect(closedRate - openRate).toBe(20);
  });
});

describe('refinancing', () => {
  it('quote returns null for unknown tranche', () => {
    const s = createInitialGameState(0);
    expect(quoteRefi(s, 'unknown')).toBeNull();
  });

  it('quote shows correct fee (1.5% of principal)', () => {
    const s = createInitialGameState(0);
    const tranche = s.debt.tranches[0]!;
    const principal = tranche.principal as unknown as number;
    const quote = quoteRefi(s, tranche.id)!;
    expect(quote.feeM).toBe(Math.round(principal * 0.015));
  });

  it('refinance executes when fee is affordable', () => {
    let s = createInitialGameState(0);
    // Inflate cash so fee is affordable
    s = { ...s, cash: { ...s.cash, balance: cash(10_000) } };
    const tranche = s.debt.tranches[0]!;
    const r = refinanceTranche(s, tranche.id);
    // New tranche should replace old (different id)
    expect(r.state.debt.tranches.some((t) => t.id === tranche.id)).toBe(false);
    expect(r.state.debt.tranches.length).toBe(s.debt.tranches.length);
  });

  it('refinance blocked when fee exceeds cash on hand', () => {
    let s = createInitialGameState(0);
    s = { ...s, cash: { ...s.cash, balance: cash(10) } }; // way too little
    const tranche = s.debt.tranches[0]!;
    const r = refinanceTranche(s, tranche.id);
    expect(r.state).toBe(s); // unchanged
    expect(r.logEntry).toBeNull();
  });

  it('refinance creates log entry', () => {
    let s = createInitialGameState(0);
    s = { ...s, cash: { ...s.cash, balance: cash(10_000) } };
    const tranche = s.debt.tranches[0]!;
    const r = refinanceTranche(s, tranche.id);
    expect(r.logEntry?.kind).toBe('player_action');
  });
});

describe('rating + bond integration', () => {
  it('rating drift across multi-quarter campaign', () => {
    let s = createInitialGameState(0);
    // Simulate cash bleed by crashing board too
    for (let i = 0; i < 8; i++) {
      s = endTurn(s);
    }
    // Rating should still be AA-ish at default settings (baseline deficit)
    expect(['AAA', 'AA', 'A']).toContain(s.debt.rating);
  });

  it('nextRatingFor returns metrics + target', () => {
    const s = createInitialGameState(0);
    const r = nextRatingFor(s);
    expect(r.rating).toBe('AA');
    expect(r.metrics.cashM).toBe(1_000);
  });
});
