import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import { effectiveCouponBp, quarterlyDebtService, ratingSpreadBp } from './finance';
import {
  quarterlyFareRevenue,
  quarterlyMaintenanceExpense,
  quarterlyOperatingAllowance,
  quarterlyOperatingExpense,
} from './cashflow';
import { catchmentGrowthPerQuarter, reliabilityRidershipDrift } from './agencies';
import { generateFinancingOffers, rateForTrust } from './financing';

describe('createInitialGameState', () => {
  it('matches design doc §5 starting numbers', () => {
    const s = createInitialGameState(1);
    expect(s.cash.balance as unknown as number).toBe(1_000);
    expect(s.operatingAllowance.annualAmount as unknown as number).toBe(2_400);
    expect(s.operatingAllowance.renegotiatesAt as unknown as number).toBe(16);

    const totalDebt = s.debt.tranches.reduce(
      (acc, t) => acc + (t.principal as unknown as number),
      0,
    );
    expect(totalDebt).toBe(8_200);

    const fixedDebt = s.debt.tranches
      .filter((t) => t.coupon.kind === 'fixed')
      .reduce((acc, t) => acc + (t.principal as unknown as number), 0);
    const floatingDebt = s.debt.tranches
      .filter((t) => t.coupon.kind === 'floating')
      .reduce((acc, t) => acc + (t.principal as unknown as number), 0);
    expect(fixedDebt / totalDebt).toBeCloseTo(0.7, 1);
    expect(floatingDebt / totalDebt).toBeCloseTo(0.3, 1);

    expect(s.debt.rating).toBe('AA');
    expect(s.boardConfidence.score as unknown as number).toBe(60);
  });

  it('agencies have catchment growth rates per spec', () => {
    const s = createInitialGameState(0);
    expect(s.agencies.ttc.catchmentGrowthRate).toBeCloseTo(0.008, 4);
    expect(s.agencies.go.catchmentGrowthRate).toBeCloseTo(0.015, 4);
    expect(s.agencies.up.catchmentGrowthRate).toBeCloseTo(0.003, 4);
  });

  it('Ontario Line inherited with synthetic consortium financing', () => {
    const s = createInitialGameState(0);
    const ol = s.projects[0]!;
    expect(ol.templateId).toBe('P00');
    expect(ol.state).toBe('under_construction');
    if (ol.state === 'under_construction') {
      expect(ol.financing.length).toBeGreaterThan(0);
      expect(ol.financing[0]!.approach).toBe('consortium');
    }
  });

  it('is deterministic — same seed produces identical state', () => {
    const a = createInitialGameState(42);
    const b = createInitialGameState(42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('finance', () => {
  it('rating → spread table matches §5', () => {
    expect(ratingSpreadBp('AAA') as unknown as number).toBe(50);
    expect(ratingSpreadBp('AA') as unknown as number).toBe(90);
    expect(ratingSpreadBp('A') as unknown as number).toBe(150);
    expect(ratingSpreadBp('BBB') as unknown as number).toBe(280);
  });

  it('quarterly debt service is reasonable size', () => {
    const s = createInitialGameState(0);
    const totalQ = quarterlyDebtService(s.debt) as unknown as number;
    expect(totalQ).toBeGreaterThan(70);
    expect(totalQ).toBeLessThan(110);
  });

  it('floating tranche pays current BOC + spread', () => {
    const s = createInitialGameState(0);
    const floating = s.debt.tranches.find((t) => t.coupon.kind === 'floating')!;
    const eff = effectiveCouponBp(floating, s.debt.bocPolicyRate) as unknown as number;
    expect(eff).toBe(350 + 90);
  });
});

describe('operating allowance', () => {
  it('quarterly slice = annual / 4', () => {
    const s = createInitialGameState(0);
    const q = quarterlyOperatingAllowance(s.operatingAllowance) as unknown as number;
    expect(q).toBe(600);
  });

  it('does NOT change over time (no inflation indexing in v3.3)', () => {
    let s = createInitialGameState(0);
    const startAllowance = s.operatingAllowance.annualAmount as unknown as number;
    for (let i = 0; i < 15; i++) s = endTurn(s);
    const endAllowance = s.operatingAllowance.annualAmount as unknown as number;
    expect(endAllowance).toBe(startAllowance);
  });
});

describe('financing offers (v3.3)', () => {
  it('rate at trust 50 = base ~500bp (5%)', () => {
    expect(rateForTrust(50)).toBe(500);
  });

  it('high trust → meaningfully lower rate', () => {
    expect(rateForTrust(100)).toBeLessThan(300);
  });

  it('low trust → meaningfully higher rate', () => {
    expect(rateForTrust(0)).toBeGreaterThan(700);
  });

  it('generates four offers (fed / prov / muni / consortium)', () => {
    const s = createInitialGameState(0);
    const offers = generateFinancingOffers(s.politics, 'large');
    expect(offers).toHaveLength(4);
    expect(offers.map((o) => o.approach).sort()).toEqual([
      'consortium',
      'federalOnly',
      'municipalOnly',
      'provincialOnly',
    ]);
  });

  it('consortium offer is the largest amount', () => {
    const s = createInitialGameState(0);
    const offers = generateFinancingOffers(s.politics, 'mega');
    const consortium = offers.find((o) => o.approach === 'consortium')!;
    const fed = offers.find((o) => o.approach === 'federalOnly')!;
    expect(consortium.maxAmount as unknown as number).toBeGreaterThan(
      fed.maxAmount as unknown as number,
    );
  });
});

describe('ridership dynamics', () => {
  it('high reliability has no drag', () => {
    expect(reliabilityRidershipDrift(95)).toBe(0);
  });

  it('low reliability has significant drag', () => {
    expect(reliabilityRidershipDrift(20)).toBeCloseTo(-0.005, 4);
  });

  it('catchment growth at 1.5%/yr ≈ 0.373%/Q', () => {
    expect(catchmentGrowthPerQuarter(0.015)).toBeCloseTo(0.00373, 4);
  });

  it('at default maintenance, growth + drag yields slight net growth for TTC', () => {
    let s = createInitialGameState(0);
    const startRiders = s.agencies.ttc.dailyRiders as unknown as number;
    for (let i = 0; i < 4; i++) s = endTurn(s);
    const endRiders = s.agencies.ttc.dailyRiders as unknown as number;
    // At reliability ~68 and growth 0.8%/yr, net should be roughly flat to slightly positive
    expect(endRiders).toBeGreaterThanOrEqual(Math.floor(startRiders * 0.997));
    expect(endRiders).toBeLessThanOrEqual(Math.floor(startRiders * 1.01));
  });
});

describe('endTurn', () => {
  it('is pure: same input produces same output', () => {
    const start = createInitialGameState(7);
    const a = endTurn(start);
    const b = endTurn(start);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('advances quarter by 1', () => {
    const s = createInitialGameState(0);
    const next = endTurn(s);
    expect(next.quarter as unknown as number).toBe(1);
  });

  it('Ontario Line opens at the forecast quarter', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 21; i++) s = endTurn(s);
    const ol = s.projects.find((p) => p.templateId === 'P00');
    expect(ol?.state).toBe('operating');
  });

  it('60-quarter run completes in under 2 seconds', () => {
    const start = performance.now();
    let s = createInitialGameState(0);
    for (let i = 0; i < 60; i++) s = endTurn(s);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
    expect(s.quarter as unknown as number).toBe(60);
  });

  it('baseline runs slight operating DEFICIT (~$300-500M/yr)', () => {
    const s = createInitialGameState(0);
    const allowanceQ = quarterlyOperatingAllowance(s.operatingAllowance) as unknown as number;
    const fareQ = quarterlyFareRevenue(s.agencies) as unknown as number;
    const opexQ = quarterlyOperatingExpense(s.agencies) as unknown as number;
    const maintQ = quarterlyMaintenanceExpense(s.agencies) as unknown as number;
    const debtServiceQ = quarterlyDebtService(s.debt) as unknown as number;

    const annualGap = (allowanceQ + fareQ - opexQ - maintQ - debtServiceQ) * 4;
    // Want modest deficit: agency loses money at default settings, player must
    // make tradeoffs to break even.
    expect(annualGap).toBeLessThan(0);
    expect(annualGap).toBeGreaterThan(-700);
  });
});

describe('Ontario Line cannibalization', () => {
  it('opens at 290k riders (not 0) per spec catalogue', () => {
    let s = createInitialGameState(0);
    // Run to quarter 20 (Ontario Line opens at Q20 per createInitialGameState)
    for (let i = 0; i < 21; i++) s = endTurn(s);
    const ol = s.projects.find((p) => p.templateId === 'P00');
    expect(ol?.state).toBe('operating');
    if (ol?.state === 'operating') {
      const r = ol.currentDailyRiders as unknown as number;
      expect(r).toBeGreaterThanOrEqual(280_000);
      expect(r).toBeLessThanOrEqual(320_000);
    }
  });

  it('cannibalizes ridership from TTC and GO when ramped', () => {
    let s = createInitialGameState(0);
    const ttcBeforeOpening = s.agencies.ttc.dailyRiders as unknown as number;
    const goBeforeOpening = s.agencies.go.dailyRiders as unknown as number;

    // Run to Q28 (8 quarters after opening — fully ramped)
    for (let i = 0; i < 29; i++) s = endTurn(s);

    const ttcAfter = s.agencies.ttc.dailyRiders as unknown as number;
    const goAfter = s.agencies.go.dailyRiders as unknown as number;

    // TTC: gained 380k from OL, lost 200k to cannibalization → net +180k roughly
    //      Plus 7 years of catchment growth (~0.8%/yr × 7 ≈ +5.7%) and some
    //      reliability drift at reliability ~68 (mild). Total TTC should be
    //      noticeably higher than start.
    expect(ttcAfter).toBeGreaterThan(ttcBeforeOpening);

    // GO: catchment growth (~+37k over 7yr at 1.5%/yr) nearly offsets the
    //     -38k OL cannibalization. Expected GO is roughly flat (±10%).
    const goChange = (goAfter - goBeforeOpening) / goBeforeOpening;
    expect(Math.abs(goChange)).toBeLessThan(0.1);

    // Net system gain from OL alone: ~142k (380 - 200 - 38), not 380k.
    // System total still up year-on-year from catchment growth + OL net.
    const totalBefore = ttcBeforeOpening + goBeforeOpening;
    const totalAfter = ttcAfter + goAfter;
    expect(totalAfter).toBeGreaterThan(totalBefore);
  });
});
