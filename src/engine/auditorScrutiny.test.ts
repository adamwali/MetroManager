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

  it('decays -1/Q with no incidents', () => {
    let s = createInitialGameState(0);
    s = { ...s, engineVars: { ...s.engineVars, auditorScrutiny: score(30) } };
    s = endTurn(s);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(29);
    s = endTurn(s);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(28);
  });

  it('clamps at 0', () => {
    let s = createInitialGameState(0);
    s = { ...s, engineVars: { ...s.engineVars, auditorScrutiny: score(0) } };
    s = endTurn(s);
    expect(s.engineVars.auditorScrutiny as unknown as number).toBe(0);
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
