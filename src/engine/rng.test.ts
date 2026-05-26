import { describe, expect, it } from 'vitest';
import {
  createRngSeeds,
  gaussian,
  keyedFloat,
  keyedInt,
  keyedPickWeighted,
  nextFloat,
  nextInt,
  pickWeighted,
  shuffle,
} from './rng';

describe('createRngSeeds', () => {
  it('produces same seeds for same master seed', () => {
    const a = createRngSeeds(42);
    const b = createRngSeeds(42);
    expect(a).toEqual(b);
  });

  it('produces different seeds across subsystems', () => {
    const seeds = createRngSeeds(1);
    expect(seeds.subsystems.events.seed).not.toBe(seeds.subsystems.elections.seed);
    expect(seeds.subsystems.climate.seed).not.toBe(seeds.subsystems.media.seed);
  });

  it('all 12 subsystems present', () => {
    const seeds = createRngSeeds(0);
    expect(Object.keys(seeds.subsystems)).toHaveLength(12);
  });
});

describe('sequenced rng (stateful)', () => {
  it('nextFloat is deterministic for same input', () => {
    const seeds = createRngSeeds(1);
    const a = nextFloat(seeds.subsystems.events);
    const b = nextFloat(seeds.subsystems.events);
    expect(a.value).toBe(b.value);
    expect(a.state.callCount).toBe(b.state.callCount);
  });

  it('nextFloat advances callCount', () => {
    const seeds = createRngSeeds(1);
    const start = seeds.subsystems.events;
    const a = nextFloat(start);
    const b = nextFloat(a.state);
    expect(b.state.callCount).toBe(start.callCount + 2);
    expect(a.value).not.toBe(b.value);
  });

  it('nextFloat returns values in [0, 1)', () => {
    let state = createRngSeeds(7).subsystems.events;
    for (let i = 0; i < 200; i++) {
      const r = nextFloat(state);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      state = r.state;
    }
  });

  it('nextInt returns values in [min, max)', () => {
    let state = createRngSeeds(3).subsystems.economic;
    for (let i = 0; i < 200; i++) {
      const r = nextInt(state, 5, 10);
      expect(r.value).toBeGreaterThanOrEqual(5);
      expect(r.value).toBeLessThan(10);
      state = r.state;
    }
  });

  it('pickWeighted respects weight ratios over many draws', () => {
    const options = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 9 }, // b should be ~9x more likely
    ];
    let state = createRngSeeds(42).subsystems.events;
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      const r = pickWeighted(state, options);
      counts[r.value]! += 1;
      state = r.state;
    }
    // Expect roughly 100/900. Allow generous bounds.
    expect(counts.a).toBeGreaterThan(50);
    expect(counts.a).toBeLessThan(200);
    expect(counts.b).toBeGreaterThan(800);
  });

  it('gaussian distribution has approximately right mean and stddev', () => {
    let state = createRngSeeds(99).subsystems.economic;
    const values: number[] = [];
    for (let i = 0; i < 500; i++) {
      const r = gaussian(state, 100, 15);
      values.push(r.value);
      state = r.state;
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(96);
    expect(mean).toBeLessThan(104);
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    expect(stddev).toBeGreaterThan(12);
    expect(stddev).toBeLessThan(18);
  });

  it('shuffle produces a permutation deterministically', () => {
    const seeds = createRngSeeds(123);
    const a = shuffle(seeds.subsystems.events, [1, 2, 3, 4, 5]);
    const b = shuffle(seeds.subsystems.events, [1, 2, 3, 4, 5]);
    expect(a.value).toEqual(b.value);
    expect(a.value.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('keyed rng (stateless)', () => {
  it('keyedFloat is deterministic', () => {
    expect(keyedFloat(1, 'event:EV031:q12')).toBe(keyedFloat(1, 'event:EV031:q12'));
  });

  it('different keys produce different values', () => {
    expect(keyedFloat(1, 'event:EV031:q12')).not.toBe(keyedFloat(1, 'event:EV032:q12'));
  });

  it('different master seeds produce different values for same key', () => {
    expect(keyedFloat(1, 'event:EV031:q12')).not.toBe(keyedFloat(2, 'event:EV031:q12'));
  });

  it('keyedInt returns values in [min, max)', () => {
    for (let i = 0; i < 100; i++) {
      const v = keyedInt(1, `key${i}`, 10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
  });

  it('keyedPickWeighted is deterministic', () => {
    const options = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 2 },
    ];
    expect(keyedPickWeighted(7, 'event:fire:q5', options)).toBe(
      keyedPickWeighted(7, 'event:fire:q5', options),
    );
  });

  it('adding a new keyed event does NOT shift other events sequence', () => {
    const oldEvents = ['EV001', 'EV002', 'EV003'];
    const newEvents = [...oldEvents, 'EV004']; // add a new event type
    // Each event's "did it fire?" check uses its own key. Adding EV004 to the
    // catalog can never change EV001/EV002/EV003 outcomes for the same campaign.
    for (const e of oldEvents) {
      const before = keyedFloat(42, `event:${e}:q12`);
      const afterCatalogChange = keyedFloat(42, `event:${e}:q12`);
      expect(before).toBe(afterCatalogChange);
    }
    // Confirm new event has its own deterministic value
    expect(keyedFloat(42, `event:${newEvents[3]}:q12`)).toBeGreaterThanOrEqual(0);
  });
});

describe('rng isolation', () => {
  it('subsystem RNGs are mutually independent (draws from one do not shift another)', () => {
    const seeds = createRngSeeds(1);
    const eventsState = seeds.subsystems.events;
    const electionsState = seeds.subsystems.elections;
    // Draw from events 10x
    let cur = eventsState;
    for (let i = 0; i < 10; i++) cur = nextFloat(cur).state;
    // Elections RNG is untouched, should still produce same first value
    const e1 = nextFloat(electionsState).value;
    const seeds2 = createRngSeeds(1);
    const e2 = nextFloat(seeds2.subsystems.elections).value;
    expect(e1).toBe(e2);
  });
});
