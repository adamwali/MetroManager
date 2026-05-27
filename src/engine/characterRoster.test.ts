import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { INITIAL_CHARACTERS } from './characterRoster';
import { eventTemplateById } from './events/templates';

describe('character roster', () => {
  it('has 6 starting characters', () => {
    expect(Object.keys(INITIAL_CHARACTERS).length).toBe(6);
  });

  it('includes 3 ministers and 3 directors', () => {
    const chars = Object.values(INITIAL_CHARACTERS);
    const ministers = chars.filter(
      (c) => c.role === 'politician_minister' || c.role === 'politician_mayor',
    );
    const directors = chars.filter((c) => c.role === 'director_operating');
    expect(ministers.length).toBe(3);
    expect(directors.length).toBe(3);
  });

  it('all characters have bios', () => {
    for (const c of Object.values(INITIAL_CHARACTERS)) {
      expect(c.bio.length).toBeGreaterThan(0);
      expect(c.bio[0]!.length).toBeGreaterThan(20);
    }
  });

  it('Tremblay is on ottawa, Hartwell on queensPark, Liang on cityHall', () => {
    const t = INITIAL_CHARACTERS.c_tremblay!;
    const h = INITIAL_CHARACTERS.c_hartwell!;
    const l = INITIAL_CHARACTERS.c_liang!;
    if (t.role === 'politician_minister') expect(t.governmentId).toBe('ottawa');
    if (h.role === 'politician_minister') expect(h.governmentId).toBe('queensPark');
    if (l.role === 'politician_mayor') expect(l.governmentId).toBe('cityHall');
  });

  it('directors have doctrines', () => {
    const dirs = Object.values(INITIAL_CHARACTERS).filter(
      (c) => c.role === 'director_operating',
    );
    for (const d of dirs) {
      if (d.role === 'director_operating') {
        expect(d.doctrine).toBeDefined();
      }
    }
  });
});

describe('character integration with state', () => {
  it('createInitialGameState populates characters', () => {
    const s = createInitialGameState(0);
    expect(Object.keys(s.characters).length).toBe(6);
    expect(s.characters.c_hartwell).toBeDefined();
  });

  it('characters object survives endTurn', async () => {
    const { endTurn } = await import('./endTurn');
    let s = createInitialGameState(0);
    for (let i = 0; i < 5; i++) s = endTurn(s);
    expect(Object.keys(s.characters).length).toBe(6);
  });

  it('characters survive save/load round-trip', async () => {
    const { saveGameToJson, loadGameFromJson } = await import('./saveLoad');
    const original = createInitialGameState(42);
    const json = saveGameToJson(original);
    const loaded = loadGameFromJson(json);
    expect(loaded.characters).toEqual(original.characters);
  });
});

describe('event actor binding', () => {
  it('EV017 (mayor fare freeze) is bound to Liang', () => {
    const t = eventTemplateById('EV017_mayorFareFreezePreElection');
    expect(t?.actorCharacterId).toBe('c_liang');
  });

  it('EV016 (premier pet project) is bound to Hartwell', () => {
    const t = eventTemplateById('EV016_premierPetProject');
    expect(t?.actorCharacterId).toBe('c_hartwell');
  });

  it('EV018 (federal minister visit) is bound to Tremblay', () => {
    const t = eventTemplateById('EV018_federalMinisterVisit');
    expect(t?.actorCharacterId).toBe('c_tremblay');
  });

  it('EV001 (signal failure) is bound to TTC director', () => {
    const t = eventTemplateById('EV001_signalFailure');
    expect(t?.actorCharacterId).toBe('c_ttc_director');
  });
});
