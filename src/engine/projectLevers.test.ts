import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import {
  accelerateProject,
  acceptFinancingPackage,
  proposeProject,
  reduceProjectScope,
  toggleProjectPause,
} from './projectActions';
import { tickOperatingProject } from './projects';
import { quarter } from '@/types/scalars';

describe('Cut Scope lever (Phase 10 audit fix)', () => {
  it('sets scopeReduced=true on the constructing project', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    s = acceptFinancingPackage(s, 'P11', [{ approach: 'federalOnly', amountM: 1_500 }]);
    s = reduceProjectScope(s, 'P11');
    const p = s.projects.find((x) => x.templateId === 'P11')!;
    if (p.state === 'under_construction') {
      expect(p.scopeReduced).toBe(true);
    } else {
      throw new Error('Expected under_construction state');
    }
  });

  it('refunds 20% of remaining funding', () => {
    let s = createInitialGameState(0);
    const cashBefore = s.cash.balance as unknown as number;
    s = proposeProject(s, 'P11', 'A', 'standard');
    s = acceptFinancingPackage(s, 'P11', [{ approach: 'federalOnly', amountM: 1_500 }]);
    const cashAfterAccept = s.cash.balance as unknown as number;
    s = reduceProjectScope(s, 'P11');
    const cashAfterCut = s.cash.balance as unknown as number;
    // Cash should go up by ~20% of the remaining funding
    expect(cashAfterCut).toBeGreaterThan(cashAfterAccept);
    // Roughly 20% of ~$1.5B → +$300M (allow ±$50M slack)
    expect(cashAfterCut - cashAfterAccept).toBeGreaterThan(250);
    expect(cashAfterCut - cashAfterAccept).toBeLessThan(400);
    // Sanity: never refunded more than original cost
    expect(cashAfterCut).toBeLessThan(cashBefore + 500);
  });
});

describe('Scope cut applies 30% ridership reduction at opening', () => {
  it('tickOperatingProject applies x0.7 multiplier when scopeReduced=true', () => {
    const project = {
      state: 'operating' as const,
      templateId: 'P11',
      chosenAlignment: 'A',
      chosenStationCount: 10,
      stationQuality: 'standard' as const,
      lvc: { capexPerStation: 0, stationsCovered: 0 } as unknown as never,
      openedAt: quarter(20),
      finalCost: 0 as unknown as never,
      currentDailyRiders: 0 as unknown as never,
      financing: [],
      scopeReduced: true,
    };
    // 8Q after opening = full ramp
    const ticked = tickOperatingProject(project, quarter(28), 100_000, 200_000);
    // Without scope cut: target = 200,000; with scope cut: 140,000
    expect(ticked.currentDailyRiders as unknown as number).toBe(140_000);
  });

  it('no reduction when scopeReduced is undefined', () => {
    const project = {
      state: 'operating' as const,
      templateId: 'P11',
      chosenAlignment: 'A',
      chosenStationCount: 10,
      stationQuality: 'standard' as const,
      lvc: { capexPerStation: 0, stationsCovered: 0 } as unknown as never,
      openedAt: quarter(20),
      finalCost: 0 as unknown as never,
      currentDailyRiders: 0 as unknown as never,
      financing: [],
    };
    const ticked = tickOperatingProject(project, quarter(28), 100_000, 200_000);
    expect(ticked.currentDailyRiders as unknown as number).toBe(200_000);
  });
});

describe('Pause lever', () => {
  it('toggleProjectPause flips paused flag', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    s = acceptFinancingPackage(s, 'P11', [{ approach: 'federalOnly', amountM: 1_500 }]);
    s = toggleProjectPause(s, 'P11');
    const p = s.projects.find((x) => x.templateId === 'P11')!;
    if (p.state === 'under_construction') {
      expect(p.paused).toBe(true);
    }
    s = toggleProjectPause(s, 'P11');
    const p2 = s.projects.find((x) => x.templateId === 'P11')!;
    if (p2.state === 'under_construction') {
      expect(p2.paused).toBe(false);
    }
  });
});

describe('Accelerate lever', () => {
  it('brings forecastOpenAt forward and bills cash', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P06', 'A', 'standard');
    // Use a stacked package so we have enough remaining funding
    s = acceptFinancingPackage(s, 'P06', [
      { approach: 'consortium', amountM: 8_000 },
      { approach: 'bondMarket', amountM: 3_000 },
    ]);
    const project = s.projects.find((p) => p.templateId === 'P06')!;
    if (project.state !== 'under_construction') throw new Error('expected construction');
    const openBefore = project.forecastOpenAt as unknown as number;
    const cashBefore = s.cash.balance as unknown as number;
    s = accelerateProject(s, 'P06', 2);
    const project2 = s.projects.find((p) => p.templateId === 'P06')!;
    if (project2.state !== 'under_construction') throw new Error('still construction');
    expect(project2.forecastOpenAt as unknown as number).toBe(openBefore - 2);
    expect(s.cash.balance as unknown as number).toBeLessThan(cashBefore);
  });
});
