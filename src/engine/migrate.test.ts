import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { migrateLoadedState } from './migrate';

describe('migrateLoadedState', () => {
  it('passes through a fully-current state unchanged in shape', () => {
    const s = createInitialGameState(0);
    const m = migrateLoadedState(s);
    expect(m.agencies.ttc.operatingParams.securityBudget).toBeDefined();
    expect(m.agencies.go.operatingParams.cleanlinessBudget).toBeDefined();
    expect(Object.keys(m.characters).length).toBeGreaterThan(0);
  });

  it('backfills missing securityBudget/cleanlinessBudget per agency', () => {
    const s = createInitialGameState(0);
    // Simulate a Phase 5.1-era save: strip the new operating params
    const stripped = {
      ...s,
      agencies: {
        ...s.agencies,
        ttc: {
          ...s.agencies.ttc,
          operatingParams: {
            frequencyPolicy: 'current' as const,
            farePolicy: 'current' as const,
            // securityBudget + cleanlinessBudget missing
          },
        },
      },
    };
    const migrated = migrateLoadedState(stripped);
    expect(migrated.agencies.ttc.operatingParams.securityBudget).toBeDefined();
    expect(migrated.agencies.ttc.operatingParams.cleanlinessBudget).toBeDefined();
    // Should use baselines (TTC: 50, 40)
    expect(migrated.agencies.ttc.operatingParams.securityBudget as unknown as number).toBe(50);
    expect(migrated.agencies.ttc.operatingParams.cleanlinessBudget as unknown as number).toBe(40);
  });

  it('backfills missing characters with INITIAL_CHARACTERS', () => {
    const s = createInitialGameState(0);
    const stripped = { ...s, characters: {} };
    const migrated = migrateLoadedState(stripped);
    expect(Object.keys(migrated.characters).length).toBeGreaterThanOrEqual(6);
  });

  it('backfills missing engineVars defaults', () => {
    const s = createInitialGameState(0);
    const stripped = {
      ...s,
      engineVars: {
        ...s.engineVars,
        crosslinxLeverage: undefined as unknown as typeof s.engineVars.crosslinxLeverage,
        consultantAlignment: undefined as unknown as typeof s.engineVars.consultantAlignment,
      },
    };
    const migrated = migrateLoadedState(stripped);
    expect(migrated.engineVars.crosslinxLeverage).toBeDefined();
    expect(migrated.engineVars.consultantAlignment).toBeDefined();
  });

  it('backfills empty arrays (inbox, standingOrders, controls)', () => {
    const s = createInitialGameState(0);
    const stripped = {
      ...s,
      inbox: undefined as unknown as typeof s.inbox,
      standingOrders: undefined as unknown as typeof s.standingOrders,
    };
    const migrated = migrateLoadedState(stripped);
    expect(Array.isArray(migrated.inbox)).toBe(true);
    expect(Array.isArray(migrated.standingOrders)).toBe(true);
  });

  it('idempotent — migrating twice == migrating once', () => {
    const s = createInitialGameState(0);
    const once = migrateLoadedState(s);
    const twice = migrateLoadedState(once);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });
});
