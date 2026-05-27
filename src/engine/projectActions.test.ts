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

describe('private financing offers', () => {
  it('generates 3 private offers (pension / bond market / sovereign)', async () => {
    const { generateFinancingOffers } = await import('@engine/financing');
    const s = createInitialGameState(0);
    const offers = generateFinancingOffers(s.politics, 'large');
    expect(offers.find((o) => o.approach === 'pensionConsortium')).toBeDefined();
    expect(offers.find((o) => o.approach === 'bondMarket')).toBeDefined();
    expect(offers.find((o) => o.approach === 'sovereignWealth')).toBeDefined();
  });

  it('private offers have market-driven rates independent of trust', async () => {
    const { generateFinancingOffers } = await import('@engine/financing');
    const high = createInitialGameState(0, 'insider'); // QP trust 65
    const low = createInitialGameState(0, 'internationalTechnocrat'); // QP trust 45

    const highOffers = generateFinancingOffers(high.politics, 'large');
    const lowOffers = generateFinancingOffers(low.politics, 'large');

    // Private rates should be identical across archetypes
    const highPension = highOffers.find((o) => o.approach === 'pensionConsortium')!;
    const lowPension = lowOffers.find((o) => o.approach === 'pensionConsortium')!;
    expect(highPension.rateBp).toBe(lowPension.rateBp);
  });

  it('sovereign wealth has onAcceptEffects + opticsLabel', async () => {
    const { generateFinancingOffers } = await import('@engine/financing');
    const s = createInitialGameState(0);
    const offers = generateFinancingOffers(s.politics, 'mega');
    const sov = offers.find((o) => o.approach === 'sovereignWealth')!;
    expect(sov.onAcceptEffects).toBeDefined();
    expect(sov.onAcceptEffects!.length).toBeGreaterThan(0);
    expect(sov.opticsLabel).toBeDefined();
  });

  it('accepting sovereign wealth applies political optics cost', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P06', 'A', 'standard');
    const cityHallBefore = s.politics.cityHall.trust as unknown as number;
    const approvalBefore = s.engineVars.publicApproval as unknown as number;
    s = acceptFinancing(s, 'P06', 'sovereignWealth');
    // Sovereign wealth: -8 City Hall trust, -5 public approval
    // P06 starting political support: City Hall +10
    // Net City Hall: +10 - 8 = +2
    expect(s.politics.cityHall.trust as unknown as number).toBe(cityHallBefore + 10 - 8);
    expect(s.engineVars.publicApproval as unknown as number).toBe(approvalBefore - 5);
  });

  it('accepting pension financing does NOT apply optics cost', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    const approvalBefore = s.engineVars.publicApproval as unknown as number;
    s = acceptFinancing(s, 'P11', 'pensionConsortium');
    expect(s.engineVars.publicApproval as unknown as number).toBe(approvalBefore);
  });

  it('debt tranche creditor reflects financing approach', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    const beforeTranches = s.debt.tranches.length;
    s = acceptFinancing(s, 'P11', 'pensionConsortium');
    const newTranche = s.debt.tranches[beforeTranches];
    expect(newTranche?.creditor).toBe('pension');
  });

  it('sovereign wealth creditor is "foreign"', () => {
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P06', 'A', 'standard');
    const beforeTranches = s.debt.tranches.length;
    s = acceptFinancing(s, 'P06', 'sovereignWealth');
    const newTranche = s.debt.tranches[beforeTranches];
    expect(newTranche?.creditor).toBe('foreign');
  });
});

describe('stacked financing (acceptFinancingPackage)', () => {
  it('combines multiple offers into one project', async () => {
    const { acceptFinancingPackage } = await import('@engine/projectActions');
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P06', 'A', 'standard'); // mega ~$14B
    const beforeTranches = s.debt.tranches.length;
    s = acceptFinancingPackage(s, 'P06', [
      { approach: 'consortium', amountM: 10_000 },
      { approach: 'bondMarket', amountM: 4_000 },
    ]);
    const project = s.projects.find((p) => p.templateId === 'P06');
    expect(project?.state).toBe('under_construction');
    // Two new tranches (one per layer)
    expect(s.debt.tranches.length).toBe(beforeTranches + 2);
  });

  it('totalBudget is sum of layers when within project cost', async () => {
    const { acceptFinancingPackage } = await import('@engine/projectActions');
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P06', 'A', 'standard'); // mega ~$14B
    s = acceptFinancingPackage(s, 'P06', [
      { approach: 'federalOnly', amountM: 5_000 },
      { approach: 'bondMarket', amountM: 3_000 },
    ]);
    const project = s.projects.find((p) => p.templateId === 'P06');
    if (project?.state === 'under_construction') {
      // Both layers capped at their offer max + total < cost = sum
      // Fed mega cap is $12B, bond market mega cap is $5B
      // Layers: $5B + $3B = $8B (no clamping)
      expect(project.totalBudget as unknown as number).toBe(8_000);
    } else {
      throw new Error('expected under_construction');
    }
  });

  it('caps individual layer amount at offer max', async () => {
    const { acceptFinancingPackage } = await import('@engine/projectActions');
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    // Bond market max for medium tier is 1000; request 5000 → clamped to 1000
    s = acceptFinancingPackage(s, 'P11', [{ approach: 'bondMarket', amountM: 5_000 }]);
    const project = s.projects.find((p) => p.templateId === 'P11');
    if (project?.state === 'under_construction') {
      // Bond market medium cap is $1B; project cost ~$1.8B; clamped to $1B
      expect(project.totalBudget as unknown as number).toBeLessThanOrEqual(1_000);
    }
  });

  it('caps total at project cost (no over-financing)', async () => {
    const { acceptFinancingPackage } = await import('@engine/projectActions');
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P13', 'A', 'standard'); // small ~$850M
    s = acceptFinancingPackage(s, 'P13', [
      { approach: 'consortium', amountM: 2_000 }, // way more than cost
    ]);
    const project = s.projects.find((p) => p.templateId === 'P13');
    if (project?.state === 'under_construction') {
      // Project cost is ~$850M; even if offer caps at $1.8B and we asked $2B,
      // funding clamps to projectCost
      expect(project.totalBudget as unknown as number).toBeLessThanOrEqual(900);
    }
  });

  it('applies sovereign optics only ONCE per package even if 1 layer is sovereign', async () => {
    const { acceptFinancingPackage } = await import('@engine/projectActions');
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P06', 'A', 'standard');
    const cityBefore = s.politics.cityHall.trust as unknown as number;
    const approvalBefore = s.engineVars.publicApproval as unknown as number;
    // P06 mega: pension $10B + sovereign $5B partial = $15B with sovereign optics applied
    s = acceptFinancingPackage(s, 'P06', [
      { approach: 'pensionConsortium', amountM: 10_000 },
      { approach: 'sovereignWealth', amountM: 5_000 },
    ]);
    // Sovereign optics: -8 City Hall (plus +10 from P06 starting support = +2 net)
    expect(s.politics.cityHall.trust as unknown as number).toBe(cityBefore + 10 - 8);
    // -5 public approval from sovereign
    expect(s.engineVars.publicApproval as unknown as number).toBe(approvalBefore - 5);
  });

  it('multiple gov layers do not double-apply political support', async () => {
    const { acceptFinancingPackage } = await import('@engine/projectActions');
    let s = createInitialGameState(0);
    s = proposeProject(s, 'P11', 'A', 'standard');
    const ottawaBefore = s.politics.ottawa.trust as unknown as number;
    s = acceptFinancingPackage(s, 'P11', [
      { approach: 'federalOnly', amountM: 1_500 },
      { approach: 'provincialOnly', amountM: 500 },
    ]);
    // P11 gives +6 Ottawa starting support — should only apply once
    expect(s.politics.ottawa.trust as unknown as number).toBe(ottawaBefore + 6);
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
