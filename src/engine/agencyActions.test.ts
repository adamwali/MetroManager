import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import {
  setFarePolicy,
  setFrequencyPolicy,
  setMaintenanceBudget,
  forecastFarePolicy,
  forecastFrequencyPolicy,
} from './agencyActions';
import { maintenanceTier } from './agencies';

describe('archetype opex divergence', () => {
  it('Steady Operator runs baseline opex', () => {
    const s = createInitialGameState(0, 'steadyOperator');
    // Baseline values from createInitialGameState: TTC 340, GO 225, UP 20
    expect(s.agencies.ttc.lastQuarterOpex as unknown as number).toBe(340);
    expect(s.agencies.go.lastQuarterOpex as unknown as number).toBe(225);
    expect(s.agencies.up.lastQuarterOpex as unknown as number).toBe(20);
  });

  it('Insider runs +5% opex', () => {
    const s = createInitialGameState(0, 'insider');
    expect(s.agencies.ttc.lastQuarterOpex as unknown as number).toBe(357); // round(340 × 1.05)
    expect(s.agencies.go.lastQuarterOpex as unknown as number).toBe(236);  // round(225 × 1.05)
  });

  it('International Technocrat runs -5% opex', () => {
    const s = createInitialGameState(0, 'internationalTechnocrat');
    expect(s.agencies.ttc.lastQuarterOpex as unknown as number).toBe(323); // round(340 × 0.95)
    expect(s.agencies.go.lastQuarterOpex as unknown as number).toBe(214);
  });

  it('Coalition Builder runs +3% opex', () => {
    const s = createInitialGameState(0, 'coalitionBuilder');
    expect(s.agencies.ttc.lastQuarterOpex as unknown as number).toBe(350); // round(340 × 1.03)
  });
});

describe('archetype maintenance efficiency', () => {
  it('Technocrat reaches required tier at lower spend (1.10× efficiency)', () => {
    // TTC required = $100M/Q. With 1.10× efficiency, $91M effective $100M.
    expect(maintenanceTier(91, 'ttc', 'internationalTechnocrat')).toBe('required');
    expect(maintenanceTier(91, 'ttc', 'steadyOperator')).toBe('underspend');
  });

  it('Insider needs more spend to reach required tier (0.90× efficiency)', () => {
    // With 0.90× efficiency, $111M ≈ $100M effective.
    expect(maintenanceTier(110, 'ttc', 'insider')).toBe('underspend');
    expect(maintenanceTier(112, 'ttc', 'insider')).toBe('required');
  });

  it('decay over 8 quarters: Technocrat preserves condition better than Insider at same budget', () => {
    let tech = createInitialGameState(0, 'internationalTechnocrat');
    let ins = createInitialGameState(0, 'insider');
    // Force both to identical baseline budget on TTC ($90M — slightly under required for steady)
    for (const id of ['rollingStock', 'track', 'signals', 'stations'] as const) {
      tech = setMaintenanceBudget(tech, 'ttc', id, 90);
      ins = setMaintenanceBudget(ins, 'ttc', id, 90);
    }
    for (let i = 0; i < 8; i++) {
      tech = endTurn(tech);
      ins = endTurn(ins);
    }
    const techAvg =
      tech.agencies.ttc.subsystems.reduce(
        (acc, s) => acc + (s.condition as unknown as number),
        0,
      ) / tech.agencies.ttc.subsystems.length;
    const insAvg =
      ins.agencies.ttc.subsystems.reduce(
        (acc, s) => acc + (s.condition as unknown as number),
        0,
      ) / ins.agencies.ttc.subsystems.length;
    expect(techAvg).toBeGreaterThan(insAvg);
  });
});

describe('setMaintenanceBudget', () => {
  it('updates the subsystem budget', () => {
    const s = createInitialGameState(0);
    const next = setMaintenanceBudget(s, 'ttc', 'signals', 150);
    const signal = next.agencies.ttc.subsystems.find((x) => x.id === 'signals')!;
    expect(signal.maintenanceBudget as unknown as number).toBe(150);
  });

  it('clamps to non-negative', () => {
    const s = createInitialGameState(0);
    const next = setMaintenanceBudget(s, 'ttc', 'signals', -50);
    const signal = next.agencies.ttc.subsystems.find((x) => x.id === 'signals')!;
    expect(signal.maintenanceBudget as unknown as number).toBe(0);
  });

  it('does not change other subsystems', () => {
    const s = createInitialGameState(0);
    const next = setMaintenanceBudget(s, 'ttc', 'signals', 150);
    const track = next.agencies.ttc.subsystems.find((x) => x.id === 'track')!;
    const original = s.agencies.ttc.subsystems.find((x) => x.id === 'track')!;
    expect(track.maintenanceBudget).toEqual(original.maintenanceBudget);
  });
});

describe('setFarePolicy with elasticity', () => {
  it('+10% fare drops TTC riders by ~3.5% (elasticity -0.35)', () => {
    const s = createInitialGameState(0);
    const before = s.agencies.ttc.dailyRiders as unknown as number;
    const next = setFarePolicy(s, 'ttc', 'modestIncrease');
    const after = next.agencies.ttc.dailyRiders as unknown as number;
    const changePct = (after - before) / before;
    expect(changePct).toBeCloseTo(-0.035, 3);
  });

  it('+10% fare on TTC raises revenue by ~6.15%', () => {
    const s = createInitialGameState(0);
    const before = s.agencies.ttc.lastQuarterFareRevenue as unknown as number;
    const next = setFarePolicy(s, 'ttc', 'modestIncrease');
    const after = next.agencies.ttc.lastQuarterFareRevenue as unknown as number;
    expect((after - before) / before).toBeCloseTo(0.0615, 2);
  });

  it('fare cut increases ridership AND drops revenue', () => {
    const s = createInitialGameState(0);
    const beforeR = s.agencies.ttc.dailyRiders as unknown as number;
    const beforeRev = s.agencies.ttc.lastQuarterFareRevenue as unknown as number;
    const next = setFarePolicy(s, 'ttc', 'reduced');
    expect(next.agencies.ttc.dailyRiders as unknown as number).toBeGreaterThan(beforeR);
    expect(next.agencies.ttc.lastQuarterFareRevenue as unknown as number).toBeLessThan(beforeRev);
  });

  it('UP riders are less sensitive (elasticity -0.15)', () => {
    const s = createInitialGameState(0);
    const before = s.agencies.up.dailyRiders as unknown as number;
    const next = setFarePolicy(s, 'up', 'aggressiveIncrease');
    const after = next.agencies.up.dailyRiders as unknown as number;
    // 25% fare hike × 0.15 elasticity = -3.75% ridership
    expect((after - before) / before).toBeCloseTo(-0.0375, 3);
  });

  it('no-op when same policy', () => {
    const s = createInitialGameState(0);
    const next = setFarePolicy(s, 'ttc', 'current');
    expect(next).toBe(s);
  });
});

describe('setFrequencyPolicy', () => {
  it('enhanced frequency raises opex AND ridership', () => {
    const s = createInitialGameState(0);
    const beforeOpex = s.agencies.ttc.lastQuarterOpex as unknown as number;
    const beforeR = s.agencies.ttc.dailyRiders as unknown as number;
    const next = setFrequencyPolicy(s, 'ttc', 'enhanced');
    expect(next.agencies.ttc.lastQuarterOpex as unknown as number).toBeGreaterThan(beforeOpex);
    expect(next.agencies.ttc.dailyRiders as unknown as number).toBeGreaterThan(beforeR);
  });

  it('reduced frequency cuts opex AND ridership', () => {
    const s = createInitialGameState(0);
    const beforeOpex = s.agencies.ttc.lastQuarterOpex as unknown as number;
    const beforeR = s.agencies.ttc.dailyRiders as unknown as number;
    const next = setFrequencyPolicy(s, 'ttc', 'reduced');
    expect(next.agencies.ttc.lastQuarterOpex as unknown as number).toBeLessThan(beforeOpex);
    expect(next.agencies.ttc.dailyRiders as unknown as number).toBeLessThan(beforeR);
  });
});

describe('forecasting', () => {
  it('forecastFarePolicy matches setFarePolicy for the same policy', () => {
    const s = createInitialGameState(0);
    const forecast = forecastFarePolicy(s, 'ttc', 'modestIncrease');
    const actual = setFarePolicy(s, 'ttc', 'modestIncrease');
    expect(forecast.newRiders).toBe(actual.agencies.ttc.dailyRiders as unknown as number);
    expect(forecast.newFareRev).toBe(
      actual.agencies.ttc.lastQuarterFareRevenue as unknown as number,
    );
  });

  it('forecastFrequencyPolicy matches setFrequencyPolicy for the same policy', () => {
    const s = createInitialGameState(0);
    const forecast = forecastFrequencyPolicy(s, 'ttc', 'enhanced');
    const actual = setFrequencyPolicy(s, 'ttc', 'enhanced');
    expect(forecast.newOpex).toBe(actual.agencies.ttc.lastQuarterOpex as unknown as number);
    expect(forecast.newRiders).toBe(actual.agencies.ttc.dailyRiders as unknown as number);
  });
});

describe('end-to-end: player tunes ops to close deficit', () => {
  it('raising fares + cutting frequency closes deficit (compared to baseline)', () => {
    let baseline = createInitialGameState(0);
    let optimized = createInitialGameState(0);
    optimized = setFarePolicy(optimized, 'ttc', 'aggressiveIncrease');
    optimized = setFarePolicy(optimized, 'go', 'modestIncrease');
    optimized = setFrequencyPolicy(optimized, 'go', 'reduced');

    for (let i = 0; i < 4; i++) {
      baseline = endTurn(baseline);
      optimized = endTurn(optimized);
    }
    expect(optimized.cash.balance as unknown as number).toBeGreaterThan(
      baseline.cash.balance as unknown as number,
    );
  });
});
