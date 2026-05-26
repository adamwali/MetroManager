import type { FinancingApproach, FinancingOffer } from '@/types/projects';
import type { GovernmentId, Politics } from '@/types/politics';
import type { SizeTier } from '@/types/projects';
import { cash } from '@/types/scalars';

/**
 * Project-financing offer generation. v3.3 economic model.
 *
 * When a player initiates a project and chooses a financing approach, this
 * module computes the offer terms (amount, rate, conditions) based on:
 *   - The funding government's trust score → rate
 *   - The project tier → maxAmount each gov is willing to underwrite
 *   - Trust + tier interaction → number of conditions attached
 *
 * Phase 1.2 establishes the math. Phase 4 wires it into a UI flow.
 */

/** Base rate (bp) before trust adjustment. 500bp = 5%. */
const BASE_RATE_BP = 500;

/** Trust-adjustment slope: 6bp per trust point away from 50. */
const TRUST_RATE_SLOPE = 6;

/** Max funding appetite per government per tier ($M). Tunable. */
const FUNDING_APPETITE: Record<GovernmentId, Record<SizeTier, number>> = {
  ottawa: { small: 800, medium: 2_500, large: 6_000, mega: 12_000 },
  queensPark: { small: 600, medium: 2_000, large: 5_000, mega: 10_000 },
  cityHall: { small: 400, medium: 1_500, large: 3_500, mega: 7_000 },
};

/**
 * Compute rate for a given government's trust score.
 * Trust 50 → 500bp (5%). Trust 100 → ~200bp (2%). Trust 0 → ~800bp (8%).
 * Floor 100bp, ceiling 1200bp.
 */
export function rateForTrust(trust: number): number {
  const raw = BASE_RATE_BP + (50 - trust) * TRUST_RATE_SLOPE;
  return Math.max(100, Math.min(1200, raw));
}

/** Generate an offer from a single government. */
function singleGovOffer(
  approach: Exclude<FinancingApproach, 'consortium'>,
  governmentId: GovernmentId,
  trust: number,
  tier: SizeTier,
): FinancingOffer {
  const maxAmount = cash(FUNDING_APPETITE[governmentId][tier]);
  const rateBp = rateForTrust(trust);
  // Higher tier + lower trust → more conditions attached
  const conditions: FinancingOffer['conditions'] = [];
  if (trust < 60 && (tier === 'large' || tier === 'mega')) {
    conditions.push({
      label: `Must include stations in ${governmentId === 'ottawa' ? 'federal' : governmentId === 'queensPark' ? 'provincial' : 'municipal'} priority ridings`,
      kind: 'stationsInFunderRiding',
      param: tier === 'mega' ? 3 : 2,
    });
  }
  if (trust < 40) {
    conditions.push({
      label: 'Cost cap at 105% of contracted budget',
      kind: 'costCap',
      param: 1.05,
    });
  }
  return { approach, maxAmount, rateBp, conditions };
}

/**
 * Generate all four financing offers for a project at the player's
 * current trust scores. The player picks one (or rejects all and goes
 * to private bonds).
 */
export function generateFinancingOffers(politics: Politics, tier: SizeTier): FinancingOffer[] {
  const fed = singleGovOffer(
    'federalOnly',
    'ottawa',
    politics.ottawa.trust as unknown as number,
    tier,
  );
  const prov = singleGovOffer(
    'provincialOnly',
    'queensPark',
    politics.queensPark.trust as unknown as number,
    tier,
  );
  const muni = singleGovOffer(
    'municipalOnly',
    'cityHall',
    politics.cityHall.trust as unknown as number,
    tier,
  );

  // Consortium: amounts sum, rate is weighted average by amount
  const totalAmount =
    (fed.maxAmount as unknown as number) +
    (prov.maxAmount as unknown as number) +
    (muni.maxAmount as unknown as number);
  const weightedRate =
    ((fed.maxAmount as unknown as number) * fed.rateBp +
      (prov.maxAmount as unknown as number) * prov.rateBp +
      (muni.maxAmount as unknown as number) * muni.rateBp) /
    Math.max(1, totalAmount);
  // Consortium combines conditions (deduplicated by kind for now)
  const seen = new Set<string>();
  const conditions: FinancingOffer['conditions'] = [];
  for (const c of [...fed.conditions, ...prov.conditions, ...muni.conditions]) {
    if (!seen.has(c.kind)) {
      conditions.push(c);
      seen.add(c.kind);
    }
  }
  const consortium: FinancingOffer = {
    approach: 'consortium',
    maxAmount: cash(totalAmount),
    rateBp: Math.round(weightedRate),
    conditions,
  };

  return [fed, prov, muni, consortium];
}
