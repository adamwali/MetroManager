import type { SizeTier } from '@/types/projects';

/**
 * Project catalog. Phase 4.
 *
 * Subset of `docs/02-project-catalogue-v3.md` brought into engine code.
 * Initial drop: 6 representative projects across tiers (small/medium/large/mega)
 * and modes (subway, LRT, BRT). Phase 4.2 will expand to the full ~30-project
 * catalog if needed.
 */

export interface AlignmentOption {
  id: string;
  label: string;
  kilometers: number;
  stations: number;
  /** Daily ridership at full ramp for this alignment. */
  fullRidership: number;
  /** Opening-day ridership (usually ~75% of full per spec). */
  openingRidership: number;
  /** Multiplier vs base cost (1.0 = baseline; cheaper alts may be 0.7×, premium 1.3×). */
  costMultiplier: number;
  /** Per-agency cannibalization at full ramp (negative integers). */
  cannibalization?: Partial<Record<'ttc' | 'go' | 'up', number>>;
  /** How NIMBY-prone this alignment is. Affects post-accept event likelihood. */
  nimbyImpact: 'low' | 'medium' | 'high';
  /** LVC potential — affects max revenue if LVC is invested in. */
  lvcPotential: 'low' | 'medium' | 'high';
  blurb: string;
}

export interface ProjectCatalogEntry {
  id: string; // 'P01', 'P02', etc.
  name: string;
  description: string;
  tier: SizeTier;
  mode: 'subway' | 'elevated' | 'lrt' | 'brt' | 'rer';
  /** Which agency primarily benefits (gets the ridership). */
  primaryAgency: 'ttc' | 'go' | 'up';
  /** Base build cost in $M before alignment multipliers. */
  baseCostM: number;
  /** Build duration in quarters (at baseline engineers). */
  buildDurationQuarters: number;
  /** Starting trust deltas applied if project enters under_construction. */
  startingPoliticalSupport: {
    ottawa: number;
    queensPark: number;
    cityHall: number;
  };
  alignments: AlignmentOption[];
  blurb: string;
}

export type StationQualityTier = 'basic' | 'standard' | 'premium';

export const STATION_QUALITY_MULTIPLIER: Record<StationQualityTier, number> = {
  basic: 0.85, // -15% cost, slightly lower ridership uplift
  standard: 1.0,
  premium: 1.25, // +25% cost, +5% ridership, +reliability bonus
};

export const STATION_QUALITY_RIDERSHIP_MULTIPLIER: Record<StationQualityTier, number> = {
  basic: 0.95,
  standard: 1.0,
  premium: 1.05,
};

export const PROJECT_CATALOG: ProjectCatalogEntry[] = [
  // Large subway
  {
    id: 'P01',
    name: 'Yonge North extension',
    description: 'Extend Line 1 from Finch to Richmond Hill Centre.',
    tier: 'large',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 7_000,
    buildDurationQuarters: 30,
    startingPoliticalSupport: { ottawa: 5, queensPark: 12, cityHall: 3 },
    alignments: [
      {
        id: 'A',
        label: 'Yonge corridor (direct)',
        kilometers: 8.0,
        stations: 6,
        fullRidership: 140_000,
        openingRidership: 105_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -45_000, go: -8_000 },
        nimbyImpact: 'high',
        lvcPotential: 'high',
        blurb: 'Direct route along Yonge — high ridership, high NIMBY risk in Willowdale/Thornhill.',
      },
      {
        id: 'B',
        label: 'Bayview corridor (alternate)',
        kilometers: 9.5,
        stations: 7,
        fullRidership: 90_000,
        openingRidership: 70_000,
        costMultiplier: 1.1,
        cannibalization: { ttc: -25_000 },
        nimbyImpact: 'low',
        lvcPotential: 'medium',
        blurb: 'Alternate Bayview routing — lower ridership but avoids political flashpoints.',
      },
    ],
    blurb: 'Provincial favorite. Vaughan/Markham caucus has been asking for this since 2010.',
  },

  // Medium subway
  {
    id: 'P02',
    name: 'Bloor-Danforth West extension',
    description: 'Extend Line 2 from Kipling to Sherway Gardens / Mississauga border.',
    tier: 'medium',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 3_200,
    buildDurationQuarters: 20,
    startingPoliticalSupport: { ottawa: 5, queensPark: 8, cityHall: 5 },
    alignments: [
      {
        id: 'A',
        label: 'Fully subway',
        kilometers: 5.5,
        stations: 4,
        fullRidership: 80_000,
        openingRidership: 60_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -15_000 },
        nimbyImpact: 'low',
        lvcPotential: 'medium',
        blurb: 'Full underground build — clean operations, higher cost.',
      },
      {
        id: 'B',
        label: 'Subway + elevated west',
        kilometers: 5.5,
        stations: 4,
        fullRidership: 75_000,
        openingRidership: 56_000,
        costMultiplier: 0.7,
        cannibalization: { ttc: -14_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'medium',
        blurb: 'Elevated west of Six Points — saves 30% cost; some neighborhood pushback.',
      },
    ],
    blurb: 'Etobicoke caucus has been patient. Now\'s the time.',
  },

  // Mega subway (Don Mills)
  {
    id: 'P06',
    name: 'Don Mills subway',
    description: 'New north-south subway line through Don Mills corridor.',
    tier: 'mega',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 14_000,
    buildDurationQuarters: 40,
    startingPoliticalSupport: { ottawa: 8, queensPark: 6, cityHall: 10 },
    alignments: [
      {
        id: 'A',
        label: 'Don Mills full corridor',
        kilometers: 18.0,
        stations: 14,
        fullRidership: 280_000,
        openingRidership: 210_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -60_000, go: -15_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'high',
        blurb: 'Full corridor — major capacity addition, mega-project pricing applies.',
      },
    ],
    blurb: 'The decade-defining build. Consortium financing recommended.',
  },

  // Medium LRT
  {
    id: 'P11',
    name: 'Eglinton East LRT',
    description: 'Surface LRT from Kennedy Station along Eglinton East to UTSC.',
    tier: 'medium',
    mode: 'lrt',
    primaryAgency: 'ttc',
    baseCostM: 1_800,
    buildDurationQuarters: 14,
    startingPoliticalSupport: { ottawa: 6, queensPark: 4, cityHall: 12 },
    alignments: [
      {
        id: 'A',
        label: 'Surface alignment, mixed traffic',
        kilometers: 11.0,
        stations: 18,
        fullRidership: 55_000,
        openingRidership: 42_000,
        costMultiplier: 1.0,
        nimbyImpact: 'medium',
        lvcPotential: 'medium',
        blurb: 'Standard surface LRT — Scarborough community has been waiting.',
      },
      {
        id: 'B',
        label: 'Partial grade-separation',
        kilometers: 11.0,
        stations: 16,
        fullRidership: 65_000,
        openingRidership: 49_000,
        costMultiplier: 1.4,
        nimbyImpact: 'low',
        lvcPotential: 'medium',
        blurb: 'Grade-separated where right-of-way allows — faster, costlier.',
      },
    ],
    blurb: 'Long-promised Scarborough transit. Mayor will be vocal.',
  },

  // Small LRT
  {
    id: 'P13',
    name: 'Waterfront LRT',
    description: 'Surface LRT connecting Union to Cherry Street + Port Lands.',
    tier: 'small',
    mode: 'lrt',
    primaryAgency: 'ttc',
    baseCostM: 850,
    buildDurationQuarters: 10,
    startingPoliticalSupport: { ottawa: 3, queensPark: 2, cityHall: 8 },
    alignments: [
      {
        id: 'A',
        label: 'Port Lands corridor',
        kilometers: 4.5,
        stations: 7,
        fullRidership: 28_000,
        openingRidership: 22_000,
        costMultiplier: 1.0,
        nimbyImpact: 'low',
        lvcPotential: 'high',
        blurb: 'Waterfront development driver — strong LVC potential.',
      },
    ],
    blurb: 'Small project, high LVC upside as Port Lands develops.',
  },

  // Small BRT
  {
    id: 'P21',
    name: 'Steeles cross-city BRT',
    description: 'Bus rapid transit along Steeles Avenue from Pearson to Pickering.',
    tier: 'small',
    mode: 'brt',
    primaryAgency: 'ttc',
    baseCostM: 600,
    buildDurationQuarters: 8,
    startingPoliticalSupport: { ottawa: 4, queensPark: 5, cityHall: 4 },
    alignments: [
      {
        id: 'A',
        label: 'Dedicated bus lanes, full corridor',
        kilometers: 26.0,
        stations: 24,
        fullRidership: 35_000,
        openingRidership: 28_000,
        costMultiplier: 1.0,
        nimbyImpact: 'medium',
        lvcPotential: 'low',
        blurb: 'Cheap, fast, low-impact — but lane removal will draw complaints.',
      },
    ],
    blurb: 'Workhorse BRT. Low cost, fast delivery, no glory.',
  },
];

export function catalogEntry(projectId: string): ProjectCatalogEntry | undefined {
  return PROJECT_CATALOG.find((p) => p.id === projectId);
}

/**
 * Compute the realized total cost for a project given the player's alignment
 * + station quality choices. Phase 4: simple multiplication; Phase 4.2 may
 * add cost-factor adjustments (templates, megacontract premium, etc.).
 */
export function realizedProjectCost(
  entry: ProjectCatalogEntry,
  alignmentId: string,
  stationQuality: StationQualityTier,
): number {
  const alignment = entry.alignments.find((a) => a.id === alignmentId) ?? entry.alignments[0]!;
  return Math.round(
    entry.baseCostM * alignment.costMultiplier * STATION_QUALITY_MULTIPLIER[stationQuality],
  );
}
