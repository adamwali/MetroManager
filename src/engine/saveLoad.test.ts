import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import { SaveLoadError, loadGameFromJson, saveGameToJson } from './saveLoad';

describe('save/load', () => {
  it('round-trips byte-identical state at game start', () => {
    const original = createInitialGameState(42);
    const json = saveGameToJson(original, new Date('2026-05-26T00:00:00Z'));
    const loaded = loadGameFromJson(json);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(original));
  });

  it('round-trips byte-identical state mid-campaign', () => {
    let s = createInitialGameState(7);
    for (let i = 0; i < 25; i++) s = endTurn(s);
    const json = saveGameToJson(s);
    const loaded = loadGameFromJson(json);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(s));
  });

  it('continuing from a loaded save matches continuing from in-memory', () => {
    let s1 = createInitialGameState(13);
    for (let i = 0; i < 10; i++) s1 = endTurn(s1);
    const json = saveGameToJson(s1);

    let inMemory = s1;
    for (let i = 0; i < 10; i++) inMemory = endTurn(inMemory);

    let resumed = loadGameFromJson(json);
    for (let i = 0; i < 10; i++) resumed = endTurn(resumed);

    expect(JSON.stringify(resumed)).toBe(JSON.stringify(inMemory));
  });

  it('rejects malformed JSON', () => {
    expect(() => loadGameFromJson('{not json')).toThrow(SaveLoadError);
  });

  it('rejects wrong schema version', () => {
    const bundle = { schemaVersion: 99, savedAt: '2030-01-01', state: {} };
    expect(() => loadGameFromJson(JSON.stringify(bundle))).toThrow(SaveLoadError);
  });

  it('saved bundle includes savedAt timestamp', () => {
    const s = createInitialGameState(1);
    const json = saveGameToJson(s, new Date('2026-06-01T12:00:00Z'));
    const parsed = JSON.parse(json);
    expect(parsed.savedAt).toBe('2026-06-01T12:00:00.000Z');
    expect(parsed.schemaVersion).toBe(1);
  });
});

describe('action log', () => {
  it('endTurn appends one quarter_summary entry per call', () => {
    let s = createInitialGameState(0);
    expect(s.actionLog).toHaveLength(0);
    s = endTurn(s);
    expect(s.actionLog).toHaveLength(1);
    expect(s.actionLog[0]!.kind).toBe('quarter_summary');
    s = endTurn(s);
    expect(s.actionLog).toHaveLength(2);
  });

  it('quarter_summary breakdown sums to recorded netDelta', () => {
    let s = createInitialGameState(0);
    s = endTurn(s);
    const entry = s.actionLog[0]!;
    if (entry.kind !== 'quarter_summary') throw new Error('expected quarter_summary');
    const b = entry.breakdown.cashFlow;
    const computed =
      b.operatingAllowance - b.operatingExpense - b.maintenance - b.debtService - b.refiFee +
      b.fareRevenue;
    expect(computed).toBeCloseTo(b.netDelta, 2);
    expect(entry.cashDelta).toBeCloseTo(b.netDelta, 2);
  });

  it('ridership breakdown matches actual deltas (TTC after Ontario Line opens)', () => {
    let s = createInitialGameState(0);
    // Run to OL opening (Q20 forecast)
    for (let i = 0; i < 21; i++) s = endTurn(s);

    // Find the quarter_summary for the OL opening quarter
    const olOpenEntry = s.actionLog.find(
      (e) =>
        e.kind === 'quarter_summary' &&
        e.breakdown.projects.transitions.some(
          (t) => t.templateId === 'P00' && t.to === 'operating',
        ),
    );
    expect(olOpenEntry).toBeDefined();
    if (!olOpenEntry || olOpenEntry.kind !== 'quarter_summary') return;

    // The TTC perAgency block should show a positive fromProjectPrimary
    // and a negative fromCannibalization on the quarter OL ramps further.
    // (Opening quarter itself: OL has 0 riders ramping to 290k next quarter.)
    const ttc = olOpenEntry.breakdown.ridership.perAgency.ttc;
    expect(ttc.before).toBeGreaterThan(0);
    expect(ttc.after).toBeGreaterThan(0);

    // Total system after should equal sum of perAgency.after
    const sysAfter = olOpenEntry.breakdown.ridership.systemAfter;
    const summedAfter =
      olOpenEntry.breakdown.ridership.perAgency.ttc.after +
      olOpenEntry.breakdown.ridership.perAgency.go.after +
      olOpenEntry.breakdown.ridership.perAgency.up.after;
    expect(summedAfter).toBe(sysAfter);
  });

  it('log entry IDs are unique', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 30; i++) s = endTurn(s);
    const ids = new Set(s.actionLog.map((e) => e.id));
    expect(ids.size).toBe(s.actionLog.length);
  });

  it('nextLogId increments with each appended entry', () => {
    let s = createInitialGameState(0);
    expect(s.nextLogId).toBe(1);
    s = endTurn(s);
    expect(s.nextLogId).toBe(2);
    s = endTurn(s);
    expect(s.nextLogId).toBe(3);
  });
});
