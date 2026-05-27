import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import {
  applyRenegotiation,
  previewRenegotiation,
} from './renegotiation';
import { score } from '@/types/scalars';

describe('renegotiation preview', () => {
  it('default state at game start → continuation (trust avg 50, board 60, 0 wins)', () => {
    const s = createInitialGameState(0);
    const p = previewRenegotiation(s, 'accept');
    expect(p.outcome).toBe('continuation');
    expect(p.allowanceMultiplier).toBe(1.0);
    expect(p.controls).toEqual([]);
  });

  it('high trust + board + delivery → increase', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      politics: {
        ottawa: { ...s.politics.ottawa, trust: score(75) },
        queensPark: { ...s.politics.queensPark, trust: score(70) },
        cityHall: { ...s.politics.cityHall, trust: score(68) },
      },
      boardConfidence: { ...s.boardConfidence, score: score(75) },
    };
    // Simulate one operating project (Ontario Line)
    const ol = s.projects[0]!;
    s = {
      ...s,
      projects: [
        {
          ...ol,
          state: 'operating',
          openedAt: s.quarter,
        } as unknown as typeof ol,
      ],
    };
    const p = previewRenegotiation(s, 'accept');
    expect(p.outcome).toBe('increase');
    expect(p.allowanceMultiplier).toBe(1.2);
  });

  it('low avg trust → decrease with controls', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      politics: {
        ottawa: { ...s.politics.ottawa, trust: score(35) },
        queensPark: { ...s.politics.queensPark, trust: score(30) },
        cityHall: { ...s.politics.cityHall, trust: score(35) },
      },
    };
    const p = previewRenegotiation(s, 'accept');
    expect(p.outcome).toBe('decrease');
    expect(p.allowanceMultiplier).toBe(0.8);
    expect(p.controls.length).toBeGreaterThan(0);
  });

  it('crashed board → drastic cut', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      boardConfidence: { ...s.boardConfidence, score: score(20) },
    };
    const p = previewRenegotiation(s, 'accept');
    expect(p.outcome).toBe('drasticCut');
    expect(p.allowanceMultiplier).toBe(0.5);
    expect(p.controls.length).toBeGreaterThanOrEqual(2);
  });

  it('aggressive strategy shifts outcome up one tier', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      politics: {
        ottawa: { ...s.politics.ottawa, trust: score(35) },
        queensPark: { ...s.politics.queensPark, trust: score(35) },
        cityHall: { ...s.politics.cityHall, trust: score(35) },
      },
    };
    const base = previewRenegotiation(s, 'accept');
    const aggressive = previewRenegotiation(s, 'aggressive');
    expect(base.outcome).toBe('decrease');
    expect(aggressive.outcome).toBe('continuation');
    expect(aggressive.allowanceMultiplier).toBe(1.0);
  });
});

describe('applyRenegotiation', () => {
  it('changes annualAmount per outcome', () => {
    const s = createInitialGameState(0);
    const startAmount = s.operatingAllowance.annualAmount as unknown as number;
    const next = applyRenegotiation(s, 'accept');
    expect(next.operatingAllowance.annualAmount as unknown as number).toBe(startAmount);

    // Drastic cut case
    let crashed = createInitialGameState(0);
    crashed = { ...crashed, boardConfidence: { ...crashed.boardConfidence, score: score(15) } };
    const cut = applyRenegotiation(crashed, 'accept');
    expect(cut.operatingAllowance.annualAmount as unknown as number).toBe(
      Math.round(startAmount * 0.5),
    );
  });

  it('advances renegotiatesAt 16Q forward', () => {
    let s = createInitialGameState(0);
    s = { ...s, quarter: 16 as unknown as typeof s.quarter };
    const next = applyRenegotiation(s, 'accept');
    expect(next.operatingAllowance.renegotiatesAt as unknown as number).toBe(32);
  });

  it('drasticCut populates controls', () => {
    let s = createInitialGameState(0);
    s = { ...s, boardConfidence: { ...s.boardConfidence, score: score(15) } };
    const next = applyRenegotiation(s, 'accept');
    expect(next.operatingAllowance.controls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('EV041 fires at Q16/Q32/Q48', () => {
  it('event lands in inbox at Q16', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 16; i++) s = endTurn(s);
    expect(s.inbox.some((e) => e.templateId === 'EV041_allowanceRenegotiation')).toBe(true);
  });
});

describe('EV042 critical subsystem fires', () => {
  it('fires when TTC reliability drops to <=30', () => {
    let s = createInitialGameState(0);
    // Crash all TTC subsystems to ~20
    s = {
      ...s,
      agencies: {
        ...s.agencies,
        ttc: {
          ...s.agencies.ttc,
          subsystems: s.agencies.ttc.subsystems.map((sub) => ({
            ...sub,
            condition: score(20),
          })),
        },
      },
    };
    s = endTurn(s);
    expect(s.inbox.some((e) => e.templateId === 'EV042_subsystemReplacement')).toBe(true);
  });
});

describe('templates project cost discount', () => {
  it('templates >=50 reduces cost', async () => {
    const { realizedProjectCost, catalogEntry } = await import('./projectCatalog');
    const entry = catalogEntry('P11')!;
    const baseline = realizedProjectCost(entry, 'A', 'standard', 30); // baseline
    const discounted = realizedProjectCost(entry, 'A', 'standard', 80); // 50pts × 0.2% = 10%
    expect(discounted).toBeLessThan(baseline);
    expect(discounted).toBeCloseTo(baseline * 0.9, -1);
  });

  it('templates 30 (baseline) has no discount', async () => {
    const { realizedProjectCost, catalogEntry } = await import('./projectCatalog');
    const entry = catalogEntry('P11')!;
    const baseline = realizedProjectCost(entry, 'A', 'standard');
    const t30 = realizedProjectCost(entry, 'A', 'standard', 30);
    expect(t30).toBe(baseline);
  });
});

describe('NIMBY decay', () => {
  it('decays by 2/Q without confrontation', () => {
    let s = createInitialGameState(0);
    // Bump to 50
    s = { ...s, engineVars: { ...s.engineVars, nimbyOrganization: score(50) } };
    s = endTurn(s);
    expect(s.engineVars.nimbyOrganization as unknown as number).toBe(48);
    s = endTurn(s);
    expect(s.engineVars.nimbyOrganization as unknown as number).toBe(46);
  });

  it('clamps at 0', () => {
    let s = createInitialGameState(0);
    s = { ...s, engineVars: { ...s.engineVars, nimbyOrganization: score(1) } };
    s = endTurn(s);
    expect(s.engineVars.nimbyOrganization as unknown as number).toBe(0);
    s = endTurn(s);
    expect(s.engineVars.nimbyOrganization as unknown as number).toBe(0);
  });
});
