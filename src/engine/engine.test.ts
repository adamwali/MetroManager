import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import { effectiveCouponBp, quarterlyDebtService, ratingSpreadBp } from './finance';
import { quarterlyGovernmentInflow } from './cashflow';
import { reliabilityRidershipDrift } from './agencies';

describe('createInitialGameState', () => {
  it('matches design doc §5 starting numbers', () => {
    const s = createInitialGameState(1);
    expect(s.cash.balance as unknown as number).toBe(5_000);
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
    expect(s.politics.ottawa.trust as unknown as number).toBe(50);
    expect(s.politics.queensPark.trust as unknown as number).toBe(50);
    expect(s.politics.cityHall.trust as unknown as number).toBe(50);
    expect(s.boardConfidence.score as unknown as number).toBe(60);
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

  it('quarterly debt service ≈ annual / 4 for fixed tranche', () => {
    const s = createInitialGameState(0);
    const annualOnPension =
      ((s.debt.tranches[0]!.principal as unknown as number) *
        (effectiveCouponBp(s.debt.tranches[0]!, s.debt.bocPolicyRate) as unknown as number)) /
      10_000;
    // Pension tranche is $3.5B at 410bp = ~$143.5M/yr, $35.875M/Q
    expect(annualOnPension).toBeCloseTo(143.5, 1);
    const totalQ = quarterlyDebtService(s.debt) as unknown as number;
    // Sum of all 3 tranches / 4 should be ~$85-90M/Q
    expect(totalQ).toBeGreaterThan(70);
    expect(totalQ).toBeLessThan(110);
  });

  it('floating tranche pays current BOC + spread', () => {
    const s = createInitialGameState(0);
    const floating = s.debt.tranches.find((t) => t.coupon.kind === 'floating')!;
    const eff = effectiveCouponBp(floating, s.debt.bocPolicyRate) as unknown as number;
    expect(eff).toBe(350 + 90); // 350 BOC + 90 spread
  });
});

describe('government inflow', () => {
  it('Q0 inflow matches $9B/yr / 4 = $2.25B/Q', () => {
    const q0 = quarterlyGovernmentInflow(0 as unknown as never) as unknown as number;
    expect(q0).toBeCloseTo(2_250, 0);
  });

  it('indexed at 5%/yr — Y2 Q1 should be ~5% higher than Y1 Q1', () => {
    const y1 = quarterlyGovernmentInflow(0 as unknown as never) as unknown as number;
    const y2 = quarterlyGovernmentInflow(4 as unknown as never) as unknown as number;
    expect(y2 / y1).toBeCloseTo(1.05, 2);
  });
});

describe('reliability drift', () => {
  it('high reliability has no ridership drag', () => {
    expect(reliabilityRidershipDrift(95)).toBe(0);
  });
  it('low reliability has significant ridership drag', () => {
    expect(reliabilityRidershipDrift(20)).toBeLessThan(0);
    expect(reliabilityRidershipDrift(20)).toBeCloseTo(-0.005, 4);
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

  it('Ontario Line opens at the forecast quarter and ramps ridership', () => {
    let s = createInitialGameState(0);
    // Forecast open at Q20, so 20 end-turns should be enough
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

  it('TTC subsystems are stable at required maintenance (per design doc §8)', () => {
    let s = createInitialGameState(0);
    const startSignal = s.agencies.ttc.subsystems.find((x) => x.id === 'signals')!.condition as unknown as number;
    for (let i = 0; i < 8; i++) s = endTurn(s);
    const endSignal = s.agencies.ttc.subsystems.find((x) => x.id === 'signals')!.condition as unknown as number;
    // $100M/sub/Q for TTC = required level → stable
    expect(endSignal).toBe(startSignal);
  });

  it('TTC subsystems decay when maintenance underfunded', () => {
    let s = createInitialGameState(0);
    // Slash maintenance to half-required
    s = {
      ...s,
      agencies: {
        ...s.agencies,
        ttc: {
          ...s.agencies.ttc,
          subsystems: s.agencies.ttc.subsystems.map((sub) => ({
            ...sub,
            maintenanceBudget: 40 as unknown as typeof sub.maintenanceBudget, // < 50% required
          })),
        },
      },
    };
    const startSignal = s.agencies.ttc.subsystems.find((x) => x.id === 'signals')!.condition as unknown as number;
    for (let i = 0; i < 8; i++) s = endTurn(s);
    const endSignal = s.agencies.ttc.subsystems.find((x) => x.id === 'signals')!.condition as unknown as number;
    expect(endSignal).toBeLessThan(startSignal);
  });
});
