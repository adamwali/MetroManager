import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { buildMaturityLadder, buildProjectGantt, buildQuarterPoints } from './historyCharts';

describe('buildQuarterPoints', () => {
  it('empty at game start', () => {
    const s = createInitialGameState(0);
    expect(buildQuarterPoints(s)).toEqual([]);
  });

  it('one point per endTurn', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 5; i++) s = endTurn(s);
    const points = buildQuarterPoints(s);
    expect(points).toHaveLength(5);
  });

  it('each point has full snapshot data', () => {
    let s = createInitialGameState(0);
    s = endTurn(s);
    const p = buildQuarterPoints(s)[0]!;
    expect(p.cashM).toBeDefined();
    expect(p.ttcRiders).toBeGreaterThan(0);
    expect(p.trustOttawa).toBeGreaterThanOrEqual(0);
    expect(p.trustOttawa).toBeLessThanOrEqual(100);
    expect(p.boardConfidence).toBeGreaterThanOrEqual(0);
    expect(p.cashFlow.netDelta).toBeDefined();
  });

  it('quarter labels formatted "Qn YYYY"', () => {
    let s = createInitialGameState(0);
    s = endTurn(s);
    const p = buildQuarterPoints(s)[0]!;
    expect(p.label).toMatch(/Q\d 20\d\d/);
  });
});

describe('buildMaturityLadder', () => {
  it('groups debt principal by maturity year', () => {
    const s = createInitialGameState(0);
    const buckets = buildMaturityLadder(s);
    expect(buckets.length).toBeGreaterThan(0);
    // All buckets have year + positive principal
    for (const b of buckets) {
      expect(b.year).toMatch(/^\d{4}$/);
      expect(b.principalM).toBeGreaterThan(0);
    }
  });

  it('sorted by year ascending', () => {
    const s = createInitialGameState(0);
    const buckets = buildMaturityLadder(s);
    for (let i = 1; i < buckets.length; i++) {
      expect(Number(buckets[i]!.year)).toBeGreaterThanOrEqual(Number(buckets[i - 1]!.year));
    }
  });
});

describe('buildProjectGantt', () => {
  it('one bar per project in state', () => {
    const s = createInitialGameState(0);
    const bars = buildProjectGantt(s);
    expect(bars).toHaveLength(s.projects.length);
  });

  it('Ontario Line bar reflects under_construction state', () => {
    const s = createInitialGameState(0);
    const bars = buildProjectGantt(s);
    const olBar = bars.find((b) => b.templateId === 'P00');
    expect(olBar?.state).toBe('under_construction');
  });
});
