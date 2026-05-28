import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { buildHistory, deriveKpis } from './kpis';

function totalRidersAt(state: ReturnType<typeof createInitialGameState>): number {
  return (
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number)
  );
}

describe('buildHistory', () => {
  it('returns starting point only when no quarters played', () => {
    const s = createInitialGameState(0);
    const history = buildHistory(s, 1_400, totalRidersAt(s));
    expect(history).toHaveLength(1);
    expect(history[0]!.cash).toBe(1_400);
  });

  it('appends one point per endTurn', () => {
    let s = createInitialGameState(0);
    const initialRiders = totalRidersAt(s);
    for (let i = 0; i < 5; i++) s = endTurn(s);
    const history = buildHistory(s, 1_400, initialRiders);
    expect(history).toHaveLength(6); // start + 5 quarters
    expect(history[5]!.quarter).toBe(5);
  });

  it('cash trajectory accumulates correctly', () => {
    let s = createInitialGameState(0);
    const initialRiders = totalRidersAt(s);
    for (let i = 0; i < 3; i++) s = endTurn(s);
    const history = buildHistory(s, 1_400, initialRiders);
    expect(history[history.length - 1]!.cash).toBeCloseTo(
      s.cash.balance as unknown as number,
      0,
    );
  });
});

describe('deriveKpis', () => {
  it('YoY is null before 4 quarters of history', () => {
    const s = createInitialGameState(0);
    const history = buildHistory(s, 1_400, totalRidersAt(s));
    const k = deriveKpis(s, history);
    expect(k.cashYoyPct).toBeNull();
    expect(k.ridersYoyPct).toBeNull();
  });

  it('YoY computes after 4 quarters', () => {
    let s = createInitialGameState(0);
    const initialRiders = totalRidersAt(s);
    for (let i = 0; i < 5; i++) s = endTurn(s);
    const history = buildHistory(s, 1_400, initialRiders);
    const k = deriveKpis(s, history);
    expect(k.cashYoyPct).not.toBeNull();
    expect(k.ridersYoyPct).not.toBeNull();
  });

  it('on-time scales with reliability', () => {
    const s = createInitialGameState(0);
    const history = buildHistory(s, 1_400, totalRidersAt(s));
    const k = deriveKpis(s, history);
    // TTC starts at avg ~68 reliability → on-time ~86%
    expect(k.ttcOnTime).toBeGreaterThan(0.8);
    expect(k.ttcOnTime).toBeLessThan(0.95);
  });
});
