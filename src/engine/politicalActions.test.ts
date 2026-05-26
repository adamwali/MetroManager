import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import {
  adHocFunding,
  callInFavor,
  cooldownQuartersLeft,
  executePoliticalAction,
  isActionEligible,
  isOnCooldown,
  publicLobby,
  quietPitch,
} from './politicalActions';

describe('public lobby', () => {
  it('adds +6 trust to target gov and -5 public approval', () => {
    const s = createInitialGameState(0);
    const trustBefore = s.politics.ottawa.trust as unknown as number;
    const approvalBefore = s.engineVars.publicApproval as unknown as number;
    const r = publicLobby(s, 'ottawa');
    expect(r.state.politics.ottawa.trust as unknown as number).toBe(trustBefore + 6);
    expect(r.state.engineVars.publicApproval as unknown as number).toBe(approvalBefore - 5);
  });

  it('puts publicLobby on 4Q cooldown', () => {
    const s = createInitialGameState(0);
    const r = publicLobby(s, 'ottawa');
    expect(isOnCooldown(r.state, 'ottawa', 'publicLobby')).toBe(true);
    expect(cooldownQuartersLeft(r.state, 'ottawa', 'publicLobby')).toBe(4);
  });

  it('cooldown only applies to the target gov, others stay available', () => {
    const s = createInitialGameState(0);
    const r = publicLobby(s, 'ottawa');
    expect(isOnCooldown(r.state, 'queensPark', 'publicLobby')).toBe(false);
    expect(isOnCooldown(r.state, 'cityHall', 'publicLobby')).toBe(false);
  });

  it('cannot lobby same gov on cooldown', () => {
    let s = createInitialGameState(0);
    const r1 = publicLobby(s, 'ottawa');
    s = r1.state;
    const r2 = publicLobby(s, 'ottawa');
    expect(r2.state).toBe(s); // unchanged
    expect(r2.logEntry).toBeNull();
  });
});

describe('quiet pitch', () => {
  it('+3 trust, no public approval cost', () => {
    const s = createInitialGameState(0);
    const approvalBefore = s.engineVars.publicApproval as unknown as number;
    const r = quietPitch(s, 'ottawa');
    expect(r.state.politics.ottawa.trust as unknown as number).toBe(
      (s.politics.ottawa.trust as unknown as number) + 3,
    );
    expect(r.state.engineVars.publicApproval as unknown as number).toBe(approvalBefore);
  });

  it('requires trust ≥ 40 OR Insider archetype', () => {
    // Steady Operator with default trust 50 — eligible
    const steady = createInitialGameState(0, 'steadyOperator');
    expect(isActionEligible(steady, 'ottawa', 'quietPitch')).toBe(true);

    // Insider — always eligible regardless of trust
    const insider = createInitialGameState(0, 'insider');
    expect(isActionEligible(insider, 'cityHall', 'quietPitch')).toBe(true);
  });

  it('blocks when trust < 40 and not Insider', () => {
    let s = createInitialGameState(0, 'internationalTechnocrat');
    // Technocrat's cityHall trust is 40 by default. Drop it below.
    s = { ...s, politics: { ...s.politics, cityHall: { ...s.politics.cityHall, trust: 35 as unknown as typeof s.politics.cityHall.trust } } };
    expect(isActionEligible(s, 'cityHall', 'quietPitch')).toBe(false);
  });
});

describe('ad-hoc funding', () => {
  it('cash injection + trust cost', () => {
    const s = createInitialGameState(0);
    const cashBefore = s.cash.balance as unknown as number;
    const trustBefore = s.politics.ottawa.trust as unknown as number;
    const r = adHocFunding(s, 'ottawa');
    expect(r.state.cash.balance as unknown as number).toBeGreaterThan(cashBefore);
    expect(r.state.politics.ottawa.trust as unknown as number).toBe(trustBefore - 8);
  });

  it('cash amount scales with trust', () => {
    // High trust gov (Insider's queensPark = 65)
    const insider = createInitialGameState(0, 'insider');
    const r1 = adHocFunding(insider, 'queensPark');
    const gain1 =
      (r1.state.cash.balance as unknown as number) - (insider.cash.balance as unknown as number);

    // Lower trust gov (insider's cityHall = 40 → fails predicate; try at 45+)
    let s = createInitialGameState(0, 'insider');
    s = { ...s, politics: { ...s.politics, cityHall: { ...s.politics.cityHall, trust: 45 as unknown as typeof s.politics.cityHall.trust } } };
    const r2 = adHocFunding(s, 'cityHall');
    const gain2 = (r2.state.cash.balance as unknown as number) - (s.cash.balance as unknown as number);

    expect(gain1).toBeGreaterThan(gain2);
  });

  it('blocked at trust < 45', () => {
    let s = createInitialGameState(0);
    s = { ...s, politics: { ...s.politics, ottawa: { ...s.politics.ottawa, trust: 40 as unknown as typeof s.politics.ottawa.trust } } };
    expect(isActionEligible(s, 'ottawa', 'adHocFunding')).toBe(false);
  });

  it('8Q cooldown after use', () => {
    const s = createInitialGameState(0);
    const r = adHocFunding(s, 'ottawa');
    expect(cooldownQuartersLeft(r.state, 'ottawa', 'adHocFunding')).toBe(8);
  });
});

describe('call in favor (Insider-only)', () => {
  it('Insider with trust ≥ 60 can call favor on aligned gov', () => {
    const insider = createInitialGameState(0, 'insider'); // QP trust 65
    expect(isActionEligible(insider, 'queensPark', 'callInFavor')).toBe(true);
  });

  it('Steady Operator cannot call favor', () => {
    const steady = createInitialGameState(0, 'steadyOperator');
    expect(isActionEligible(steady, 'ottawa', 'callInFavor')).toBe(false);
  });

  it('Insider with trust < 60 cannot call favor', () => {
    const insider = createInitialGameState(0, 'insider');
    // cityHall trust is 40 for insider
    expect(isActionEligible(insider, 'cityHall', 'callInFavor')).toBe(false);
  });

  it('successful favor: +$400M cash + +5 trust + 16Q cooldown', () => {
    const insider = createInitialGameState(0, 'insider');
    const cashBefore = insider.cash.balance as unknown as number;
    const trustBefore = insider.politics.queensPark.trust as unknown as number;
    const r = callInFavor(insider, 'queensPark');
    expect(r.state.cash.balance as unknown as number).toBe(cashBefore + 400);
    expect(r.state.politics.queensPark.trust as unknown as number).toBe(trustBefore + 5);
    expect(cooldownQuartersLeft(r.state, 'queensPark', 'callInFavor')).toBe(16);
  });
});

describe('cooldown decay over turns', () => {
  it('cooldown counts down by 1 each turn', () => {
    let s = createInitialGameState(0);
    s = publicLobby(s, 'ottawa').state;
    expect(cooldownQuartersLeft(s, 'ottawa', 'publicLobby')).toBe(4);
    s = endTurn(s);
    expect(cooldownQuartersLeft(s, 'ottawa', 'publicLobby')).toBe(3);
    s = endTurn(s);
    s = endTurn(s);
    s = endTurn(s);
    expect(cooldownQuartersLeft(s, 'ottawa', 'publicLobby')).toBe(0);
    expect(isActionEligible(s, 'ottawa', 'publicLobby')).toBe(true);
  });
});

describe('logging', () => {
  it('successful action appends a player_action log entry', () => {
    const s = createInitialGameState(0);
    const beforeLen = s.actionLog.length;
    const r = publicLobby(s, 'ottawa');
    expect(r.state.actionLog.length).toBe(beforeLen + 1);
    const last = r.state.actionLog[r.state.actionLog.length - 1]!;
    expect(last.kind).toBe('player_action');
    if (last.kind === 'player_action') {
      expect(last.action).toBe('publicLobby:ottawa');
    }
  });
});

describe('executePoliticalAction dispatcher', () => {
  it('routes to the right action function', () => {
    const s = createInitialGameState(0);
    const r1 = executePoliticalAction(s, 'ottawa', 'publicLobby');
    const r2 = publicLobby(s, 'ottawa');
    expect(JSON.stringify(r1.state)).toBe(JSON.stringify(r2.state));
  });
});
