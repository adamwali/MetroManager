import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';

describe('archetype divergence', () => {
  it('Steady Operator default matches baseline', () => {
    const s = createInitialGameState(1, 'steadyOperator');
    expect(s.cash.balance as unknown as number).toBe(1_000);
    expect(s.boardConfidence.score as unknown as number).toBe(60);
    expect(s.politics.ottawa.trust as unknown as number).toBe(50);
    expect(s.politics.queensPark.trust as unknown as number).toBe(50);
    expect(s.politics.cityHall.trust as unknown as number).toBe(50);
  });

  it('International Technocrat starts with higher cash + lower city hall trust', () => {
    const s = createInitialGameState(1, 'internationalTechnocrat');
    expect(s.cash.balance as unknown as number).toBe(1_100);
    expect(s.politics.cityHall.trust as unknown as number).toBe(40);
    expect(s.engineVars.openBooks).toBe(true);
    expect(s.engineVars.engineers).toBe(220);
  });

  it('Insider starts with high provincial/federal trust + low engineers', () => {
    const s = createInitialGameState(1, 'insider');
    expect(s.politics.queensPark.trust as unknown as number).toBe(65);
    expect(s.politics.ottawa.trust as unknown as number).toBe(60);
    expect(s.politics.cityHall.trust as unknown as number).toBe(40);
    expect(s.engineVars.engineers).toBe(140);
    expect(s.boardConfidence.score as unknown as number).toBe(50);
  });

  it('Coalition Builder has all three governments at 55 trust', () => {
    const s = createInitialGameState(1, 'coalitionBuilder');
    expect(s.politics.ottawa.trust as unknown as number).toBe(55);
    expect(s.politics.queensPark.trust as unknown as number).toBe(55);
    expect(s.politics.cityHall.trust as unknown as number).toBe(55);
    expect(s.engineVars.publicApproval as unknown as number).toBe(60);
  });

  it('archetypes produce deterministic but distinct trajectories', () => {
    let steady = createInitialGameState(0, 'steadyOperator');
    let insider = createInitialGameState(0, 'insider');
    for (let i = 0; i < 5; i++) {
      steady = endTurn(steady);
      insider = endTurn(insider);
    }
    // Cash trajectories diverge because of different starting cash
    expect(steady.cash.balance).not.toEqual(insider.cash.balance);
    // But same archetype + same seed = identical
    let steady2 = createInitialGameState(0, 'steadyOperator');
    for (let i = 0; i < 5; i++) steady2 = endTurn(steady2);
    expect(JSON.stringify(steady)).toBe(JSON.stringify(steady2));
  });
});

describe('game over detection', () => {
  it('campaign starts with no gameOver and zero counters', () => {
    const s = createInitialGameState(0);
    expect(s.gameOver).toBeUndefined();
    expect(s.gameOverCounters.quartersInDeepDeficit).toBe(0);
    expect(s.gameOverCounters.quartersWithFiringBoard).toBe(0);
  });

  it('triggers campaignWon at Q60 with positive numbers', () => {
    let s = createInitialGameState(0);
    // Manually buff cash and board to ensure we end up positive at Q60
    s = {
      ...s,
      cash: { ...s.cash, balance: 1_000_000 as unknown as typeof s.cash.balance },
    };
    for (let i = 0; i < 60; i++) {
      s = endTurn(s);
      if (s.gameOver) break;
    }
    expect(s.gameOver?.kind).toBe('campaignWon');
  });

  it('triggers fiscalFailure after 4 consecutive quarters below -$5B', () => {
    let s = createInitialGameState(0);
    // Force cash into deep deficit; endTurn will continue to bleed
    s = {
      ...s,
      cash: { ...s.cash, balance: -5_500 as unknown as typeof s.cash.balance },
    };
    let firedAt: number | null = null;
    for (let i = 0; i < 10; i++) {
      s = endTurn(s);
      if (s.gameOver?.kind === 'fiscalFailure') {
        firedAt = s.quarter as unknown as number;
        break;
      }
    }
    expect(firedAt).not.toBeNull();
  });

  it('triggers boardFiring after 2 consecutive quarters below 25', () => {
    let s = createInitialGameState(0);
    // Crash board confidence
    s = {
      ...s,
      boardConfidence: { ...s.boardConfidence, score: 20 as unknown as typeof s.boardConfidence.score },
    };
    let firedAt: number | null = null;
    for (let i = 0; i < 5; i++) {
      s = endTurn(s);
      if (s.gameOver?.kind === 'boardFiring') {
        firedAt = s.quarter as unknown as number;
        break;
      }
    }
    expect(firedAt).not.toBeNull();
  });

  it('does not fire if board confidence recovers before threshold', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      boardConfidence: { ...s.boardConfidence, score: 20 as unknown as typeof s.boardConfidence.score },
    };
    s = endTurn(s); // 1 quarter below threshold
    // Bump back up
    s = {
      ...s,
      boardConfidence: { ...s.boardConfidence, score: 50 as unknown as typeof s.boardConfidence.score },
    };
    s = endTurn(s);
    expect(s.gameOver).toBeUndefined();
    expect(s.gameOverCounters.quartersWithFiringBoard).toBe(0);
  });
});
