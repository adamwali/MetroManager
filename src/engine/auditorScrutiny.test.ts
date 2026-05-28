import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import { applyEffects } from './events/effects';
import { score } from '@/types/scalars';

describe('auditorScrutiny mechanic (Phase 10)', () => {
  it('starts at 15 (low background level)', () => {
    const s = createInitialGameState(0);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(15);
  });

  it('decays toward 0 in calm quarters (no draws, healthy cash)', () => {
    // Phase 10.2: pure -1/Q decay only happens without structural signals.
    // Strip projects (zero out OL draws) and boost cash to avoid the
    // big-draw and fiscal-stress raises.
    let s = createInitialGameState(0);
    s = {
      ...s,
      engineVars: { ...s.engineVars, auditorScrutiny: score(40) },
      cash: { ...s.cash, balance: 5000 as unknown as typeof s.cash.balance },
      projects: [],
    };
    s = endTurn(s);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(39);
    s = endTurn(s);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(38);
  });

  it('clamps at 0 (cannot go negative)', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      engineVars: { ...s.engineVars, auditorScrutiny: score(0) },
      cash: { ...s.cash, balance: 5000 as unknown as typeof s.cash.balance },
    };
    s = endTurn(s);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBeGreaterThanOrEqual(0);
  });

  it('rises when cash goes negative (fiscal stress signal)', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      engineVars: { ...s.engineVars, auditorScrutiny: score(20) },
      cash: { ...s.cash, balance: -1000 as unknown as typeof s.cash.balance },
    };
    s = endTurn(s);
    // -1 decay +5 fiscal stress = +4 net; start 20 → expect higher than 20
    expect(s.engineVars.auditorScrutiny as unknown as number).toBeGreaterThan(20);
  });

  it('auditorScrutiny effect kind raises the score', () => {
    let s = createInitialGameState(0);
    s = applyEffects(s, [{ kind: 'auditorScrutiny', delta: 20 }]);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(35);
  });

  it('triggers EV056 when scrutiny >= 50', async () => {
    const { eventTemplateById } = await import('./events/templates');
    const { evaluatePredicate } = await import('./events/predicates');
    let s = createInitialGameState(0);
    s = { ...s, engineVars: { ...s.engineVars, auditorScrutiny: score(55) } };
    const tmpl = eventTemplateById('EV056_auditorInvestigation');
    expect(tmpl).toBeDefined();
    if (tmpl?.trigger.kind === 'conditional') {
      expect(evaluatePredicate(s, tmpl.trigger.predicate)).toBe(true);
    }
  });
});
