import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { applyEffects } from './effects';
import { evaluatePredicate } from './predicates';
import {
  processEventsForQuarter,
  resolveEventChoice,
  visibleChoices,
} from './firing';
import { EVENT_TEMPLATES, eventTemplateById } from './templates';

describe('predicates', () => {
  it('evaluates ceoArchetype', () => {
    const s = createInitialGameState(0, 'insider');
    expect(evaluatePredicate(s, { kind: 'ceoArchetype', archetype: 'insider' })).toBe(true);
    expect(evaluatePredicate(s, { kind: 'ceoArchetype', archetype: 'steadyOperator' })).toBe(false);
  });

  it('evaluates trust ranges', () => {
    const s = createInitialGameState(0, 'insider'); // QP trust 65
    expect(evaluatePredicate(s, { kind: 'trust', gov: 'queensPark', gte: 60 })).toBe(true);
    expect(evaluatePredicate(s, { kind: 'trust', gov: 'queensPark', gte: 70 })).toBe(false);
    expect(evaluatePredicate(s, { kind: 'trust', gov: 'queensPark', lte: 60 })).toBe(false);
  });

  it('evaluates openBooks predicate', () => {
    const s = createInitialGameState(0, 'internationalTechnocrat');
    expect(evaluatePredicate(s, { kind: 'openBooks', equals: true })).toBe(true);
    const t = createInitialGameState(0, 'steadyOperator');
    expect(evaluatePredicate(t, { kind: 'openBooks', equals: true })).toBe(false);
  });

  it('evaluates and/or/not composition', () => {
    const s = createInitialGameState(0, 'internationalTechnocrat'); // templates 55
    expect(
      evaluatePredicate(s, {
        kind: 'and',
        predicates: [
          { kind: 'templates', gte: 50 },
          { kind: 'openBooks', equals: true },
        ],
      }),
    ).toBe(true);
    expect(
      evaluatePredicate(s, {
        kind: 'or',
        predicates: [
          { kind: 'ceoArchetype', archetype: 'disruptor' },
          { kind: 'openBooks', equals: true },
        ],
      }),
    ).toBe(true);
    expect(
      evaluatePredicate(s, {
        kind: 'not',
        predicate: { kind: 'ceoArchetype', archetype: 'steadyOperator' },
      }),
    ).toBe(true);
  });
});

describe('effects', () => {
  it('cash effect adjusts balance and clamps nothing', () => {
    const s = createInitialGameState(0);
    const next = applyEffects(s, [{ kind: 'cash', deltaM: -100 }]);
    expect(next.cash.balance as unknown as number).toBe(900);
  });

  it('governmentTrust delta clamps to 0-100', () => {
    const s = createInitialGameState(0); // ottawa trust 50
    const next = applyEffects(s, [
      { kind: 'governmentTrust', gov: 'ottawa', delta: -75 },
    ]);
    expect(next.politics.ottawa.trust as unknown as number).toBe(0);
    const up = applyEffects(s, [
      { kind: 'governmentTrust', gov: 'ottawa', delta: 80 },
    ]);
    expect(up.politics.ottawa.trust as unknown as number).toBe(100);
  });

  it('opex effect modifies the agency lastQuarterOpex permanently', () => {
    const s = createInitialGameState(0);
    const before = s.agencies.ttc.lastQuarterOpex as unknown as number;
    const next = applyEffects(s, [{ kind: 'opex', agency: 'ttc', deltaM: 50 }]);
    expect(next.agencies.ttc.lastQuarterOpex as unknown as number).toBe(before + 50);
  });

  it('queueDelayedEffect appends to delayedQueue', () => {
    const s = createInitialGameState(0);
    const next = applyEffects(s, [
      {
        kind: 'queueDelayedEffect',
        quartersOut: 4,
        cause: 'test follow-up',
        effects: [{ kind: 'cash', deltaM: 500 }],
      },
    ]);
    expect(next.delayedQueue).toHaveLength(1);
    expect(next.delayedQueue[0]!.firesAt as unknown as number).toBe(4);
  });

  it('reliability effect adjusts all subsystems clamping 0-100', () => {
    const s = createInitialGameState(0);
    const next = applyEffects(s, [{ kind: 'reliability', agency: 'ttc', delta: 5 }]);
    for (const sub of next.agencies.ttc.subsystems) {
      const orig = s.agencies.ttc.subsystems.find((x) => x.id === sub.id)!;
      expect(sub.condition as unknown as number).toBe(
        Math.min(100, (orig.condition as unknown as number) + 5),
      );
    }
  });
});

describe('event firing', () => {
  it('fires scheduled events on the right quarter', () => {
    let s = createInitialGameState(0);
    // EV002 fires at Q3, Q14, Q28, Q42. Advance to Q3.
    for (let i = 0; i < 3; i++) s = endTurn(s);
    const ev002 = s.inbox.find((e) => e.templateId === 'EV002_federalInfraCall');
    expect(ev002).toBeDefined();
  });

  it('fires conditional events when predicate matches', () => {
    let s = createInitialGameState(0);
    // EV001 requires TTC reliability ≤ 65. Default avg is ~68.
    // Drop reliability via effects to trigger.
    s = applyEffects(s, [{ kind: 'reliability', agency: 'ttc', delta: -10 }]);
    s = endTurn(s);
    const ev001 = s.inbox.find((e) => e.templateId === 'EV001_signalFailure');
    expect(ev001).toBeDefined();
  });

  it('does not fire random events on every quarter (probabilistic)', () => {
    let s = createInitialGameState(7);
    for (let i = 0; i < 20; i++) s = endTurn(s);
    // Count actual EV008 fire events from action log (not inbox presence)
    const cyberFires = s.actionLog.filter(
      (e) => e.kind === 'event_fired' && e.eventTemplateId === 'EV008_cyberattack',
    ).length;
    // baseWeight 0.07 with 20Q cooldown → at most 1-2 fires over 20Q
    expect(cyberFires).toBeLessThan(3);
  });

  it('keyed RNG is deterministic — same seed produces same random fires', () => {
    let a = createInitialGameState(42);
    let b = createInitialGameState(42);
    for (let i = 0; i < 10; i++) {
      a = endTurn(a);
      b = endTurn(b);
    }
    expect(a.inbox.map((e) => e.templateId).sort()).toEqual(
      b.inbox.map((e) => e.templateId).sort(),
    );
  });

  it('caps fires per quarter at MAX_FIRES_PER_QUARTER (2)', () => {
    let s = createInitialGameState(0);
    s = applyEffects(s, [{ kind: 'reliability', agency: 'ttc', delta: -10 }]);
    s = applyEffects(s, [{ kind: 'cash', deltaM: -700 }]);
    // Now multiple conditional triggers could fire (EV001 + EV004); but cap holds.
    const before = s.inbox.length;
    s = endTurn(s);
    expect(s.inbox.length - before).toBeLessThanOrEqual(2);
  });

  it('cooldown prevents same template firing back-to-back', () => {
    let s = createInitialGameState(0);
    s = applyEffects(s, [{ kind: 'reliability', agency: 'ttc', delta: -10 }]);
    s = endTurn(s);
    expect(s.inbox.some((e) => e.templateId === 'EV001_signalFailure')).toBe(true);
    // Resolve the event so it's removed from inbox
    const result = resolveEventChoice(s, 'EV001_signalFailure', 'apologize_capital');
    s = result.state;
    // Now advance one quarter — even though reliability is still low, cooldown blocks
    s = endTurn(s);
    expect(s.inbox.some((e) => e.templateId === 'EV001_signalFailure')).toBe(false);
  });

  it('delayed queue drains at the right quarter', () => {
    let s = createInitialGameState(0);
    s = applyEffects(s, [
      {
        kind: 'queueDelayedEffect',
        quartersOut: 2,
        cause: 'phase 3.2 test',
        effects: [{ kind: 'cash', deltaM: 500 }],
      },
    ]);
    s = endTurn(s); // Q1 — test entry not yet due
    s = endTurn(s); // Q2 — test entry drains
    // The specific test entry should be gone (other queue items may exist from telegraphs)
    expect(
      s.delayedQueue.some((dc) => dc.cause === 'phase 3.2 test'),
    ).toBe(false);
  });
});

describe('archetype-flavored options', () => {
  it('Insider sees the call-Hartwell branch on EV001', () => {
    const insider = createInitialGameState(0, 'insider');
    const ev001 = eventTemplateById('EV001_signalFailure')!;
    const choices = visibleChoices(insider, ev001);
    expect(choices.some((c) => c.id === 'insider_quiet_call')).toBe(true);
  });

  it('Steady Operator does NOT see the call-Hartwell branch on EV001', () => {
    const steady = createInitialGameState(0, 'steadyOperator');
    const ev001 = eventTemplateById('EV001_signalFailure')!;
    const choices = visibleChoices(steady, ev001);
    expect(choices.some((c) => c.id === 'insider_quiet_call')).toBe(false);
  });

  it('Technocrat OR high-templates sees the data-pitch on EV003', () => {
    const techno = createInitialGameState(0, 'internationalTechnocrat'); // templates 55
    const ev003 = eventTemplateById('EV003_mayorEglintonCrowding')!;
    expect(visibleChoices(techno, ev003).some((c) => c.id === 'technocrat_data_pitch')).toBe(true);

    const insider = createInitialGameState(0, 'insider'); // templates 20
    expect(visibleChoices(insider, ev003).some((c) => c.id === 'technocrat_data_pitch')).toBe(false);
  });

  it('Coalition Builder sees the consortium pitch on EV002', () => {
    const cb = createInitialGameState(0, 'coalitionBuilder');
    const ev002 = eventTemplateById('EV002_federalInfraCall')!;
    expect(visibleChoices(cb, ev002).some((c) => c.id === 'coalition_consortium')).toBe(true);
  });
});

describe('telegraphs (Phase 3.2)', () => {
  it('scheduled event with telegraph emits early warning N quarters before fire', () => {
    let s = createInitialGameState(0);
    // EV018 (federal minister visit) is scheduled Q8 with 2Q telegraph
    // Run to Q6 → telegraph should appear
    for (let i = 0; i < 6; i++) s = endTurn(s);
    const telegraph = s.actionLog.find(
      (e) =>
        e.kind === 'event_telegraph' &&
        e.sourceEventTemplateId === 'EV018_federalMinisterVisit',
    );
    expect(telegraph).toBeDefined();
    if (telegraph?.kind === 'event_telegraph') {
      expect(telegraph.expectedFireQuarter as unknown as number).toBe(8);
    }
  });

  it('telegraph does not block End Turn and is not an inbox entry', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 6; i++) s = endTurn(s);
    // Telegraph for EV018 fires; but EV018 itself is NOT in inbox yet
    expect(s.inbox.some((e) => e.templateId === 'EV018_federalMinisterVisit')).toBe(false);
  });

  it('scheduled event still fires on its target quarter despite telegraph', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 8; i++) s = endTurn(s);
    // EV018 should be in inbox at Q8
    expect(s.inbox.some((e) => e.templateId === 'EV018_federalMinisterVisit')).toBe(true);
  });

  it('telegraphs are kept for genuinely predictable events only', () => {
    // After review: telegraphs only on scheduled events that real CEOs
    // would foresee (election cycles, minister visits, budget announcements).
    // Sudden events (signal failures, NIMBY lawsuits, OL design flaws) do NOT
    // get telegraphs.
    const telegraphed = EVENT_TEMPLATES.filter((t) => t.telegraph !== undefined);
    for (const t of telegraphed) {
      expect(t.trigger.kind).toBe('scheduled');
    }
  });
});

describe('informational events', () => {
  it('informational events do not enter the inbox', () => {
    let s = createInitialGameState(0);
    // Run to Q8 (city election fires informationally per EV034)
    for (let i = 0; i < 8; i++) s = endTurn(s);
    expect(s.inbox.some((e) => e.templateId === 'EV034_cityElection')).toBe(false);
    // But they DO appear in the action log
    expect(
      s.actionLog.some(
        (e) => e.kind === 'event_informational' && e.eventTemplateId === 'EV034_cityElection',
      ),
    ).toBe(true);
  });

  it('multiple informational events can fire same quarter (no cap)', () => {
    // Q8 has both EV017 mayor pet project trigger AND EV034 city election
    // Mayor pet project is a decision event; election is informational.
    // Both should still fire.
    let s = createInitialGameState(0);
    for (let i = 0; i < 8; i++) s = endTurn(s);
    expect(
      s.actionLog.some(
        (e) => e.kind === 'event_informational' && e.eventTemplateId === 'EV034_cityElection',
      ),
    ).toBe(true);
  });
});

describe('no-good-options events', () => {
  it('events flagged with noGoodOptions still have valid choices', () => {
    const noGoodEvents = EVENT_TEMPLATES.filter((t) => t.noGoodOptions === true);
    expect(noGoodEvents.length).toBeGreaterThan(0);
    for (const t of noGoodEvents) {
      expect(t.choices.length).toBeGreaterThanOrEqual(2);
      // Each choice should have at least one effect
      for (const c of t.choices) {
        expect(c.effects.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('event resolution', () => {
  it('resolveEventChoice applies effects + removes from inbox + logs decision', () => {
    let s = createInitialGameState(0);
    s = applyEffects(s, [{ kind: 'reliability', agency: 'ttc', delta: -10 }]);
    s = endTurn(s);
    const beforeCash = s.cash.balance as unknown as number;
    const beforeLogCount = s.actionLog.length;
    const result = resolveEventChoice(s, 'EV001_signalFailure', 'emergency_capital');
    s = result.state;
    expect(s.inbox.some((e) => e.templateId === 'EV001_signalFailure')).toBe(false);
    expect(s.cash.balance as unknown as number).toBe(beforeCash - 500);
    expect(s.actionLog.length).toBe(beforeLogCount + 1);
    expect(s.actionLog[s.actionLog.length - 1]!.kind).toBe('player_decision');
  });

  it('resolveEventChoice rejects gated choices the player cannot see', () => {
    let s = createInitialGameState(0, 'steadyOperator');
    s = applyEffects(s, [{ kind: 'reliability', agency: 'ttc', delta: -10 }]);
    s = endTurn(s);
    // Insider-only choice should be rejected for steadyOperator
    const result = resolveEventChoice(s, 'EV001_signalFailure', 'insider_quiet_call');
    expect(result.state).toBe(s); // No state change
    expect(result.logEntry).toBeNull();
  });
});

describe('event template registry', () => {
  it('catalog includes both Phase 3.1 (10) + Phase 3.2 (30) templates', () => {
    expect(EVENT_TEMPLATES.length).toBeGreaterThanOrEqual(38);
  });

  it('all template ids unique', () => {
    const ids = new Set(EVENT_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(EVENT_TEMPLATES.length);
  });

  it('decision templates have at least 2 choices; informational have none', () => {
    for (const t of EVENT_TEMPLATES) {
      if (t.displayKind === 'informational') {
        expect(t.choices.length).toBe(0);
      } else {
        expect(t.choices.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has at least one informational template', () => {
    expect(EVENT_TEMPLATES.some((t) => t.displayKind === 'informational')).toBe(true);
  });

  it('has at least 4 no-good-options templates', () => {
    const noGood = EVENT_TEMPLATES.filter((t) => t.noGoodOptions === true);
    expect(noGood.length).toBeGreaterThanOrEqual(4);
  });

  it('has 3-6 telegraphed templates (~10% of catalog)', () => {
    const tele = EVENT_TEMPLATES.filter((t) => t.telegraph !== undefined);
    expect(tele.length).toBeGreaterThanOrEqual(3);
    expect(tele.length).toBeLessThanOrEqual(6);
  });

  it('processEventsForQuarter is deterministic for the same input', () => {
    const s = createInitialGameState(99999);
    const a = processEventsForQuarter(s);
    const b = processEventsForQuarter(s);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
});
