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

  // Phase 4.2 expansion — 4 more catalog entries:

  // Mega subway (alternative to P06 Don Mills)
  {
    id: 'P02',
    name: 'Sheppard West subway extension',
    description: 'Extends Line 4 Sheppard from Yonge to the Allen, adding 5 stations.',
    tier: 'mega',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 9_500,
    buildDurationQuarters: 28,
    startingPoliticalSupport: { ottawa: 8, queensPark: 12, cityHall: 10 },
    alignments: [
      {
        id: 'A',
        label: 'Standard 5-station alignment',
        kilometers: 7.8,
        stations: 5,
        fullRidership: 165_000,
        openingRidership: 130_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -45_000 },
        nimbyImpact: 'low',
        lvcPotential: 'medium',
        blurb: 'Cabinet-favored alignment, connects job centres.',
      },
      {
        id: 'B',
        label: 'Premium 7-station with TOD',
        kilometers: 9.5,
        stations: 7,
        fullRidership: 220_000,
        openingRidership: 170_000,
        costMultiplier: 1.35,
        cannibalization: { ttc: -55_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'high',
        blurb: 'Adds 2 stations for transit-oriented development. LVC upside.',
      },
    ],
    blurb: 'High-profile subway extension. Provincial caucus loves it.',
  },

  // Large LRT (regional connection)
  {
    id: 'P09',
    name: 'Hurontario LRT (Brampton-Mississauga)',
    description: 'Surface light rail along Hurontario Street, Port Credit to downtown Brampton.',
    tier: 'large',
    mode: 'lrt',
    primaryAgency: 'go',
    baseCostM: 4_800,
    buildDurationQuarters: 20,
    startingPoliticalSupport: { ottawa: 6, queensPark: 10, cityHall: -2 },
    alignments: [
      {
        id: 'A',
        label: 'Port Credit to Brampton (24km)',
        kilometers: 24.0,
        stations: 22,
        fullRidership: 95_000,
        openingRidership: 72_000,
        costMultiplier: 1.0,
        cannibalization: { go: -18_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'medium',
        blurb: 'Politically straightforward — outside Toronto, no City Hall friction.',
      },
    ],
    blurb: 'Regional LRT, suburban-friendly. Queen\'s Park priority.',
  },

  // Medium LRT (waterfront)
  {
    id: 'P14',
    name: 'Waterfront West LRT extension',
    description: 'Extends the Queens Quay streetcar west to Park Lawn.',
    tier: 'medium',
    mode: 'lrt',
    primaryAgency: 'ttc',
    baseCostM: 1_400,
    buildDurationQuarters: 14,
    startingPoliticalSupport: { ottawa: 2, queensPark: 4, cityHall: 12 },
    alignments: [
      {
        id: 'A',
        label: 'Surface alignment along the lake',
        kilometers: 7.0,
        stations: 10,
        fullRidership: 45_000,
        openingRidership: 35_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -8_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'high',
        blurb: 'Waterfront condo growth driver. Mayor loves it; tower lobby loves it more.',
      },
    ],
    blurb: 'City Hall priority. High LVC potential from waterfront condo boom.',
  },

  // Mega — full Yonge North subway extension
  {
    id: 'P03',
    name: 'Yonge North subway to Richmond Hill',
    description: 'Extends Line 1 from Finch to Highway 7, finally connecting York Region to Toronto subway.',
    tier: 'mega',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 12_500,
    buildDurationQuarters: 32,
    startingPoliticalSupport: { ottawa: 10, queensPark: 18, cityHall: 4 },
    alignments: [
      {
        id: 'A',
        label: '6 stations to Richmond Hill (caucus preferred)',
        kilometers: 8.0,
        stations: 6,
        fullRidership: 210_000,
        openingRidership: 165_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -55_000, go: -22_000 },
        nimbyImpact: 'low',
        lvcPotential: 'medium',
        blurb: 'Hartwell\'s priority. Full caucus support, suburban media wins.',
      },
    ],
    blurb: 'Provincial caucus headline project. Hartwell wants ground-broken in his term.',
  },

  // Large — Eglinton West LRT to Pearson
  {
    id: 'P05',
    name: 'Eglinton West LRT extension to Pearson',
    description: 'Extends Line 5 from Mount Dennis to Pearson Airport.',
    tier: 'large',
    mode: 'lrt',
    primaryAgency: 'ttc',
    baseCostM: 5_400,
    buildDurationQuarters: 24,
    startingPoliticalSupport: { ottawa: 12, queensPark: 6, cityHall: 8 },
    alignments: [
      {
        id: 'A',
        label: 'Surface alignment via Highway 27',
        kilometers: 14.0,
        stations: 11,
        fullRidership: 145_000,
        openingRidership: 110_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -22_000, up: -12_000 },
        nimbyImpact: 'low',
        lvcPotential: 'medium',
        blurb: 'Cheaper option. Mixes with traffic in some sections.',
      },
      {
        id: 'B',
        label: 'Tunneled premium alignment',
        kilometers: 14.0,
        stations: 13,
        fullRidership: 195_000,
        openingRidership: 145_000,
        costMultiplier: 1.45,
        cannibalization: { ttc: -25_000, up: -25_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'high',
        blurb: 'Tunneled, faster, cannibalizes UP harder.',
      },
    ],
    blurb: 'Federal aviation priority + tourism upside. Multi-modal connection.',
  },

  // Medium — Sheppard East LRT
  {
    id: 'P12',
    name: 'Sheppard East LRT (Don Mills to Morningside)',
    description: 'Surface LRT replacing the long-cancelled Transit City line.',
    tier: 'medium',
    mode: 'lrt',
    primaryAgency: 'ttc',
    baseCostM: 2_200,
    buildDurationQuarters: 16,
    startingPoliticalSupport: { ottawa: 4, queensPark: 6, cityHall: 8 },
    alignments: [
      {
        id: 'A',
        label: 'Surface from Don Mills to Morningside (13km)',
        kilometers: 13.0,
        stations: 13,
        fullRidership: 78_000,
        openingRidership: 62_000,
        costMultiplier: 1.0,
        cannibalization: { ttc: -10_000 },
        nimbyImpact: 'medium',
        lvcPotential: 'low',
        blurb: 'Equity-focused alignment through Scarborough.',
      },
    ],
    blurb: 'Long-delayed equity priority. Underbuilt residents have waited 20 years.',
  },

  // Small — Smart-card system upgrade (not a transit line, but a project!)
  {
    id: 'P19',
    name: 'Presto+Tap payments modernization',
    description: 'Replace Presto with modern open-loop payment + integrated regional fare.',
    tier: 'small',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 480,
    buildDurationQuarters: 6,
    startingPoliticalSupport: { ottawa: 2, queensPark: 6, cityHall: 6 },
    alignments: [
      {
        id: 'A',
        label: 'Open-loop tap-to-pay across all agencies',
        kilometers: 0.0,
        stations: 0,
        fullRidership: 35_000,
        openingRidership: 35_000,
        costMultiplier: 1.0,
        nimbyImpact: 'low',
        lvcPotential: 'low',
        blurb: 'Fare modernization. Convenience boost, modest ridership gain.',
      },
    ],
    blurb: 'Quick win. No tunneling, fast delivery, real but small upside.',
  },

  // Small subway (single station infill)
  {
    id: 'P17',
    name: 'Liberty Village infill station',
    description: 'New TTC station on existing Line 2 at the Liberty Village rail corridor.',
    tier: 'small',
    mode: 'subway',
    primaryAgency: 'ttc',
    baseCostM: 750,
    buildDurationQuarters: 10,
    startingPoliticalSupport: { ottawa: 0, queensPark: 2, cityHall: 8 },
    alignments: [
      {
        id: 'A',
        label: 'Infill station + pedestrian connections',
        kilometers: 0.0,
        stations: 1,
        fullRidership: 28_000,
        openingRidership: 22_000,
        costMultiplier: 1.0,
        nimbyImpact: 'low',
        lvcPotential: 'high',
        blurb: 'One station, dense catchment. Cheap, fast, locally popular.',
      },
    ],
    blurb: 'High return on investment. The kind of project no one fights you on.',
  },
];

export function catalogEntry(projectId: string): ProjectCatalogEntry | undefined {
  return PROJECT_CATALOG.find((p) => p.id === projectId);
}

/**
 * Compute the realized total cost for a project given the player's alignment
 * + station quality choices.
 *
 * Phase 6.3 polish: `templates` engineVar (0-100) now provides a project-cost
 * discount. Each templates point above 30 reduces cost by 0.2%, capped at
 * -14% (at templates=100). At templates=50, the discount is -4%.
 *
 * Technocrat (starts at 55) gets -5% baseline; pushing to 80 yields -10%.
 */
export function realizedProjectCost(
  entry: ProjectCatalogEntry,
  alignmentId: string,
  stationQuality: StationQualityTier,
  templates = 30,
): number {
  const alignment = entry.alignments.find((a) => a.id === alignmentId) ?? entry.alignments[0]!;
  const templatesAboveBaseline = Math.max(0, templates - 30);
  const templatesDiscount = Math.min(0.14, templatesAboveBaseline * 0.002); // 0.2% per pt
  return Math.round(
    entry.baseCostM *
      alignment.costMultiplier *
      STATION_QUALITY_MULTIPLIER[stationQuality] *
      (1 - templatesDiscount),
  );
}
