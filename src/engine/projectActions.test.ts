import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import {
  acceptFinancing,
  availableProjectCatalog,
  proposeProject,
  rejectProject,
} from './projectActions';
import { PROJECT_CATALOG, catalogEntry } from './projectCatalog';

describe('project catalog', () => {
  it('has at least 6 projects', () => {
    expect(PROJECT_CATALOG.length).toBeGreaterThanOrEqual(6);
  });

  it('every project has at least one alignment', () => {
    for (const p of PROJECT_CATALOG) {
      expect(p.alignments.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('availableProjectCatalog excludes Ontario Line at game start', () => {
    const s = createInitialGameState(0);
    const available = availableProjectCatalog(s);
    expect(available.find((p) => p.id === 'P00')).toBeUndefined();
  });
});

describe('proposeProject', () => {
  it('adds a proposed project to state', () => {
    let s = createInitialGameState(0);
    const before = s.projects.length;
    s = proposeProject(s, 'P11', 'A', 'standard');
    expect(s.projects.length).toBe(before + 1);
    const proposed = s.projects.find((p) => p.templateId === 'P11');
    expect(proposed?.state).toBe('proposed');
  });

  it('proposed project has correct configuration', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P01', 'B', 'premium');
    const p = s.projects.find((p) => p.templateId === 'P01');
    if (p?.state === 'proposed') {
      expect(p.chosenAlignment).toBe('B');
      expect(p.stationQuality).toBe('premium');
    } else {
      throw new Error('expected proposed project');
    }
  });

  it('unknown project id is a no-op', () => {
    const s = createInitialGameState(0);
    const result = proposeProject(s, 'P999', 'A', 'standard');
    expect(result.projects.length).toBe(s.projects.length);
  });
});

describe('acceptFinancing', () => {
  it('transitions proposed → under_construction', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    s = acceptFinancing(s, 'P11', 'federalOnly');
    const p = s.projects.find((p) => p.templateId === 'P11');
    expect(p?.state).toBe('under_construction');
  });

  it('creates a new debt tranche', () => {
    let s = createInitialGameState(0);
    const beforeTranches = s.debt.tranches.length;
    s = proposeProject(s, 'P11', 'A', 'standard');
    s = acceptFinancing(s, 'P11', 'federalOnly');
    expect(s.debt.tranches.length).toBe(beforeTranches + 1);
  });

  it('sets remainingFunding to the financed amount', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    s = acceptFinancing(s, 'P11', 'consortium');
    const p = s.projects.find((p) => p.templateId === 'P11');
    if (p?.state === 'under_construction') {
      expect(p.remainingFunding as unknown as number).toBeGreaterThan(0);
      expect(p.remainingFunding).toEqual(p.totalBudget);
    } else {
      throw new Error('expected under_construction');
    }
  });

  it('applies starting political support deltas to trust', () => {
    let s = createInitialGameState(0);
    const ottawaBefore = s.politics.ottawa.trust as unknown as number;
    s = proposeProject(s, 'P11', 'A', 'standard'); // P11 ottawa support +6
    s = acceptFinancing(s, 'P11', 'federalOnly');
    expect(s.politics.ottawa.trust as unknown as number).toBe(ottawaBefore + 6);
  });

  it('consortium gives largest funding amount', () => {
    let federal = createInitialGameState(0);
    federal = proposeProject(federal, 'P06', 'A', 'standard'); // mega
    federal = acceptFinancing(federal, 'P06', 'federalOnly');
    const fedAmount = (federal.projects.find((p) => p.templateId === 'P06') as { totalBudget?: unknown })
      ?.totalBudget as unknown as number;

    let consortium = createInitialGameState(0);
    consortium = proposeProject(consortium, 'P06', 'A', 'standard');
    consortium = acceptFinancing(consortium, 'P06', 'consortium');
    const consAmount = (consortium.projects.find((p) => p.templateId === 'P06') as { totalBudget?: unknown })
      ?.totalBudget as unknown as number;

    expect(consAmount).toBeGreaterThan(fedAmount);
  });
});

describe('rejectProject', () => {
  it('removes a proposed project from state', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P13', 'A', 'standard');
    expect(s.projects.find((p) => p.templateId === 'P13')).toBeDefined();
    s = rejectProject(s, 'P13');
    expect(s.projects.find((p) => p.templateId === 'P13')).toBeUndefined();
  });

  it('does not remove under_construction projects', () => {
    let s = createInitialGameState(0);
    // Ontario Line is under_construction at start
    const before = s.projects.length;
    s = rejectProject(s, 'P00');
    expect(s.projects.length).toBe(before);
  });
});

describe('catalog entry lookup', () => {
  it('returns entry for valid id', () => {
    expect(catalogEntry('P01')?.name).toBe('Yonge North extension');
  });

  it('returns undefined for unknown id', () => {
    expect(catalogEntry('P999')).toBeUndefined();
  });
});
