import type { CashMillions, DailyRiders, Percent, QuarterIndex, Score100 } from './scalars';
import type { GovernmentId } from './politics';

/**
 * Projects. Per design doc §9 (v3.2 lifecycle) and project catalogue.
 *
 * Three states: `proposed` → `under_construction` → `operating`. The
 * `proposed` state has a 2-quarter minimum buffer during which studies
 * can be commissioned. Player commits (break ground) or abandons. After
 * break-ground, cancellation is severe.
 */

export type ProjectId = string;

export type SizeTier = 'small' | 'medium' | 'large' | 'mega';

export type TransitMode = 'subway' | 'elevated' | 'lrt' | 'brt' | 'rer';

export type StationQuality = 'basic' | 'standard' | 'premium';

export type NimbyLevel = 'low' | 'medium' | 'high';

export type LvcPotential = 'low' | 'medium' | 'high' | 'veryHigh';

export type GeotechRisk = 'low' | 'medium' | 'high' | 'veryHigh';

/**
 * An alignment is one of the 2-4 geographic options a project offers. Each
 * alignment specifies its own mode, length, station count, ridership ceiling,
 * NIMBY exposure, and cost band.
 */
export interface Alignment {
  id: string;
  label: string;
  mode: TransitMode;
  lengthKm: number;
  stationCountMin: number;
  stationCountMax: number;
  /** Max daily ridership at full ramp, with the design-doc demand model. */
  maxDailyRiders: DailyRiders;
  /** Initial wide cost band (±35% before studies). */
  initialCostMin: CashMillions;
  initialCostMax: CashMillions;
  nimbyExposure: NimbyLevel;
}

/** A study the player can commission while a project is `proposed`. */
export type StudyKind =
  | 'environmentalSurvey'
  | 'geotechnical'
  | 'ridershipStudy'
  | 'engineeringTo30Percent'
  | 'fullDesign'
  | 'communityConsultation';

export interface CompletedStudy {
  kind: StudyKind;
  completedAt: QuarterIndex;
  costPaid: CashMillions;
}

/** LVC investment configuration set during `proposed`. Locked at break-ground. */
export interface LvcConfig {
  /** $M of LVC capex per major station eligible for LVC. 0 - 400. */
  capexPerStation: CashMillions;
  /** Number of major stations the player elects to opt into LVC for. */
  stationsCovered: number;
}

/**
 * Per-project capital financing. v3.3 economic model.
 *
 * When a project enters `proposed`, the player pitches one of four
 * financing approaches and receives an offer of `{ amount, rate,
 * conditions }`. The accepted offer creates a new DebtTranche at the
 * negotiated rate (see finance.ts) and adds principal as cash inflow
 * at break-ground.
 */
export type FinancingApproach =
  | 'federalOnly'
  | 'provincialOnly'
  | 'municipalOnly'
  | 'consortium'
  | 'pensionConsortium'
  | 'bondMarket'
  | 'sovereignWealth';

/** Government vs. private. Used by UI to section the offers list. */
export type FinancingSource = 'government' | 'private';

export const FINANCING_APPROACH_SOURCE: Record<FinancingApproach, FinancingSource> = {
  federalOnly: 'government',
  provincialOnly: 'government',
  municipalOnly: 'government',
  consortium: 'government',
  pensionConsortium: 'private',
  bondMarket: 'private',
  sovereignWealth: 'private',
};

export interface FinancingCondition {
  /** Short human-readable text describing the condition. UI surfaces this. */
  label: string;
  /** Engine-readable kind so the constraint can be enforced over time. */
  kind:
    | 'stationsInFunderRiding' // must include N stations in funder's territory
    | 'costCap' // capex cannot exceed a stated number
    | 'hiringFreezeRoles' // certain roles frozen during build
    | 'environmentalCommitment' // net-zero / electrification ties
    | 'localContractPreference'; // procurement preference for funder's region
  /** Optional numeric parameter for the constraint. */
  param?: number;
}

export interface FinancingOffer {
  approach: FinancingApproach;
  /** Max amount the funder is willing to put in, $M. */
  maxAmount: CashMillions;
  /** Annualized interest rate in basis points (e.g. 500 = 5%). */
  rateBp: number;
  conditions: FinancingCondition[];
  /**
   * Side-effects applied at acceptance time. Used for political optics
   * costs (e.g., sovereign wealth → -8 City Hall trust). Empty for
   * government offers and pension/bond-market private offers.
   */
  onAcceptEffects?: FinancingOfferEffect[];
  /** Plain-language label for any optics warning shown on the offer card. */
  opticsLabel?: string;
}

/**
 * Narrow alias so projects.ts doesn't need to import the full EventEffect
 * union here (would create a circular-ish dependency with events.ts).
 * Import the canonical EventEffect type wherever you actually apply effects.
 */
export type FinancingOfferEffect =
  | { kind: 'governmentTrust'; gov: 'ottawa' | 'queensPark' | 'cityHall'; delta: number }
  | { kind: 'publicApproval'; delta: number }
  | { kind: 'boardConfidence'; delta: number; reason: string };

export interface AcceptedFinancing {
  approach: FinancingApproach;
  /** Actual amount accepted (may be less than maxAmount if player took partial). */
  amount: CashMillions;
  rateBp: number;
  conditions: FinancingCondition[];
  /** Quarter the financing was signed. */
  signedAt: QuarterIndex;
  /** Reference to the DebtTranche created from this financing. */
  trancheId: string;
}

/** Catalogue trait template, immutable per project id. */
export interface ProjectTemplate {
  id: ProjectId;
  name: string;
  description: string;
  tier: SizeTier;
  alignments: Alignment[];
  /** Major stations eligible for LVC opt-in. */
  majorStationCount: number;
  lvcPotential: LvcPotential;
  geotechRisk: GeotechRisk;
  /** Starting political support by government. Modifies trust on player's project actions. */
  politicalSupportStarting: Record<GovernmentId, number>;
  /** Build duration in quarters, range. Locked to a specific value when ground is broken. */
  buildDurationMinQ: number;
  buildDurationMaxQ: number;
  /** Connection notes for UI / event templates. */
  connectionPoints: string[];
  /** Project ids that cannot coexist (alternates). Engine enforces at selection. */
  alternates: ProjectId[];
}

export interface PerProjectVars {
  /** 0-100, project-specific site preparation maturity. Modifies cost factor. */
  sitePrep: Score100;
  /** Whether procurement uses single mega-contract (+15% cost, +leverage). */
  megaContract: boolean;
  /** 0-100, accumulator from past claim settlements. Modifies cost factor. */
  settlementPremium: Score100;
}

/** A project in `proposed` state. Buffer, studies, alignment lock-in happen here. */
export interface ProposedProject {
  state: 'proposed';
  templateId: ProjectId;
  /** Quarter the project was initiated. Break-ground earliest at initiatedAt + 2. */
  initiatedAt: QuarterIndex;
  /** Alignment id locked in by the player. Mandatory before break-ground. */
  chosenAlignment?: string;
  /** Station count chosen within the alignment's min/max. */
  chosenStationCount?: number;
  /** Station quality dial. */
  stationQuality: StationQuality;
  /** LVC slider config. Defaults to zeros until set. */
  lvc: LvcConfig;
  /** Studies completed so far. Each one narrows the uncertainty band. */
  completedStudies: CompletedStudy[];
  /** Studies currently in flight, completing at the given quarter. */
  studiesInFlight: { kind: StudyKind; completesAt: QuarterIndex }[];
  /** Current cost-uncertainty band, narrowed by studies. ±35% initially → ±5% at full study. */
  costUncertaintyPct: Percent;
  /** Current demand-uncertainty band. ±40% initially → ±10% with ridership study. */
  demandUncertaintyPct: Percent;
  perProject: PerProjectVars;
}

/** A project in `under_construction` state. Building toward opening. */
export interface ConstructingProject {
  state: 'under_construction';
  templateId: ProjectId;
  chosenAlignment: string;
  chosenStationCount: number;
  stationQuality: StationQuality;
  lvc: LvcConfig;
  /** Quarter at which break-ground happened. Used for spent-to-date math. */
  brokeGroundAt: QuarterIndex;
  /** Realized total cost at break-ground (after uncertainty resolution). $M. */
  totalBudget: CashMillions;
  /** Amount actually spent so far. $M. */
  spent: CashMillions;
  /**
   * Funding pool drawn down each quarter to pay for construction. Funded by
   * the accepted `financing` at break-ground. Project burn comes OUT OF this
   * pool, not out of agency operating cash. If pool runs empty, project
   * needs new financing or stalls.
   */
  remainingFunding: CashMillions;
  /** Forecast opening quarter at current pace. Shifts on construction events. */
  forecastOpenAt: QuarterIndex;
  /** Capital financing accepted at break-ground. Inherited projects get a synthetic record. */
  financing: AcceptedFinancing[];
  perProject: PerProjectVars;
}

/** A project that has opened. Contributes ridership and LVC revenue. */
export interface OperatingProject {
  state: 'operating';
  templateId: ProjectId;
  chosenAlignment: string;
  chosenStationCount: number;
  stationQuality: StationQuality;
  lvc: LvcConfig;
  /** Quarter the project opened. Ridership ramps 8Q from here. */
  openedAt: QuarterIndex;
  /** Final realized total cost. $M. */
  finalCost: CashMillions;
  /** Current daily ridership contribution (post-ramp at full ramp date). */
  currentDailyRiders: DailyRiders;
  /** Financing accepted to fund this project. Debt servicing happens via tranches. */
  financing: AcceptedFinancing[];
}

export type Project = ProposedProject | ConstructingProject | OperatingProject;
