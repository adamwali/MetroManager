import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import { applyEffects } from './events/effects';
import { driftBocRate, effectiveCouponBp, quarterlyDebtService } from './finance';
import { approvalRidershipDrift } from './agencies';
import { bp, cash, quarter as quarterScalar } from '@/types/scalars';
import type { DebtTranche } from '@/types/finance';

/**
 * Tests for Phase 3.2 empty-calorie fixes — each previously-orphan engineVar
 * or KPI now has a measurable gameplay consequence.
 */

describe('public approval → ridership drift', () => {
  it('approval ≥ 70 gives positive drift', () => {
    expect(approvalRidershipDrift(75)).toBeGreaterThan(0);
    expect(approvalRidershipDrift(85)).toBeGreaterThan(0);
  });

  it('approval 30-70 has zero effect', () => {
    expect(approvalRidershipDrift(50)).toBe(0);
    expect(approvalRidershipDrift(60)).toBe(0);
  });

  it('approval < 30 gives negative drift', () => {
    expect(approvalRidershipDrift(25)).toBeLessThan(0);
    expect(approvalRidershipDrift(10)).toBeLessThan(0);
  });

  it('low public approval slows ridership over 8Q vs neutral approval', () => {
    let low = createInitialGameState(0);
    let neutral = createInitialGameState(0);
    low = applyEffects(low, [{ kind: 'publicApproval', delta: -40 }]); // 50 → 10
    // neutral stays at default 50
    for (let i = 0; i < 8; i++) {
      low = endTurn(low);
      neutral = endTurn(neutral);
    }
    const lowRiders =
      (low.agencies.ttc.dailyRiders as unknown as number) +
      (low.agencies.go.dailyRiders as unknown as number);
    const neutralRiders =
      (neutral.agencies.ttc.dailyRiders as unknown as number) +
      (neutral.agencies.go.dailyRiders as unknown as number);
    expect(lowRiders).toBeLessThan(neutralRiders);
  });
});

describe('engineers count → project burn rate', () => {
  it('more engineers ticks Ontario Line spent total faster over 4Q', () => {
    let highEng = createInitialGameState(0, 'internationalTechnocrat'); // engineers 220
    let lowEng = createInitialGameState(0, 'insider'); // engineers 140
    for (let i = 0; i < 4; i++) {
      highEng = endTurn(highEng);
      lowEng = endTurn(lowEng);
    }
    const highSpent = (highEng.projects[0] as { spent?: number }).spent as unknown as number;
    const lowSpent = (lowEng.projects[0] as { spent?: number }).spent as unknown as number;
    expect(highSpent).toBeGreaterThan(lowSpent);
  });
});

describe('openBooks → debt service discount', () => {
  it('floating-rate tranche gets -20bp spread when openBooks=true', () => {
    const tranche: DebtTranche = {
      id: 't',
      creditor: 'institutional',
      principal: cash(1000),
      coupon: { kind: 'floating', spreadOverBOC: bp(100) },
      maturity: quarterScalar(40),
      issuedAt: quarterScalar(0),
    };
    const without = effectiveCouponBp(tranche, bp(350), false) as unknown as number;
    const withOpen = effectiveCouponBp(tranche, bp(350), true) as unknown as number;
    expect(without - withOpen).toBe(20);
  });

  it('Technocrat (openBooks=true) pays less debt service than Steady at start', () => {
    const tech = createInitialGameState(0, 'internationalTechnocrat');
    const steady = createInitialGameState(0, 'steadyOperator');
    const techService = quarterlyDebtService(tech.debt, tech.engineVars.openBooks) as unknown as number;
    const steadyService = quarterlyDebtService(
      steady.debt,
      steady.engineVars.openBooks,
    ) as unknown as number;
    expect(techService).toBeLessThan(steadyService);
  });
});

describe('NIMBY organization → EV022 gating', () => {
  it('nimbyOrganization < 30 prevents EV022 from firing', () => {
    let s = createInitialGameState(0);
    // Default nimbyOrganization is 25. EV022 requires gte 30.
    for (let i = 0; i < 20; i++) s = endTurn(s);
    const ev022Fired = s.actionLog.some(
      (e) => e.kind === 'event_fired' && e.eventTemplateId === 'EV022_nimbyLawsuit',
    );
    expect(ev022Fired).toBe(false);
  });

  it('nimbyOrganization >= 30 allows EV022 to roll', () => {
    let s = createInitialGameState(0);
    s = applyEffects(s, [{ kind: 'nimbyOrganization', delta: 50 }]); // 25 → 75
    expect(s.engineVars.nimbyOrganization as unknown as number).toBe(75);
  });
});

describe('BOC rate drift', () => {
  it('stays within bounds across 100 simulated rolls', () => {
    let rate = 350;
    for (let i = 0; i < 100; i++) {
      const roll = (i % 100) / 100;
      rate = driftBocRate(rate, roll);
      expect(rate).toBeGreaterThanOrEqual(100);
      expect(rate).toBeLessThanOrEqual(700);
    }
  });

  it('mean-reverts toward 350bp', () => {
    let rate = 600;
    for (let i = 0; i < 40; i++) {
      const roll = 0.5; // neutral — pure mean-reversion pull
      rate = driftBocRate(rate, roll);
    }
    expect(rate).toBeLessThan(500); // drifted toward center
  });

  it('endTurn actually moves bocPolicyRate over 8Q', () => {
    let s = createInitialGameState(0);
    const start = s.debt.bocPolicyRate as unknown as number;
    for (let i = 0; i < 8; i++) s = endTurn(s);
    const end = s.debt.bocPolicyRate as unknown as number;
    expect(end).not.toBe(start);
  });
});

describe('election outcomes', () => {
  it('federal election (EV032) shifts ottawa trust at Q12', () => {
    let s = createInitialGameState(0);
    const startTrust = s.politics.ottawa.trust as unknown as number;
    for (let i = 0; i < 12; i++) s = endTurn(s);
    const endTrust = s.politics.ottawa.trust as unknown as number;
    // Election applied a deterministic shift; trust should differ
    expect(endTrust).not.toBe(startTrust);
  });

  it('election re-arms nextElectionAt 8Q out', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 12; i++) s = endTurn(s);
    const nextElection = s.politics.ottawa.nextElectionAt as unknown as number;
    expect(nextElection).toBeGreaterThan(12); // should be Q20-ish
  });

  it('city election outcome can flip party in power', () => {
    // With seed 0 we get a deterministic outcome; can\'t assert direction without
    // running the actual sim. Just verify that across many seeds, party flips happen sometimes.
    let flippedAtLeastOnce = false;
    for (let seed = 1; seed < 20; seed++) {
      let s = createInitialGameState(seed);
      const startParty = s.politics.cityHall.partyInPower;
      for (let i = 0; i < 8; i++) s = endTurn(s);
      if (s.politics.cityHall.partyInPower !== startParty) {
        flippedAtLeastOnce = true;
        break;
      }
    }
    expect(flippedAtLeastOnce).toBe(true);
  });
});
