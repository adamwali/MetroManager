import type { GameState } from '@/types/gameState';
import type {
  AcceptedFinancing,
  ConstructingProject,
  FinancingApproach,
  FinancingOffer,
  ProposedProject,
} from '@/types/projects';
import type { DebtTranche, CreditorType } from '@/types/finance';
import { bp, cash, pct, quarter, score } from '@/types/scalars';
import { applyEffects } from './events/effects';
import { generateFinancingOffers } from './financing';
import {
  PROJECT_CATALOG,
  realizedProjectCost,
  STATION_QUALITY_RIDERSHIP_MULTIPLIER,
  type StationQualityTier,
  catalogEntry,
} from './projectCatalog';

/**
 * Project initiation + financing flow. Phase 4.
 *
 * Flow:
 *   1. `proposeProject(state, projectId, alignmentId, stationQuality)` —
 *      adds a ProposedProject to state.projects. No cost yet; player can
 *      back out by not accepting financing.
 *   2. `getFinancingOffersForProject(state, projectId)` — returns the
 *      4 financing offers (Fed / Prov / City / Consortium) computed from
 *      current trust scores and project tier.
 *   3. `acceptFinancing(state, projectId, approach)` — creates a new
 *      DebtTranche from the accepted offer, transitions project to
 *      under_construction with `remainingFunding` set from the financing
 *      amount, applies any starting-political-support trust shifts.
 *   4. `rejectProject(state, projectId)` — removes a proposed project
 *      from state.
 *   5. `tickProposedProject` — auto-advances proposed projects to
 *      under_construction once the 2Q study buffer elapses AND financing
 *      is accepted. Without financing, the project stalls in proposed.
 */

export const PROPOSED_STUDY_BUFFER_QUARTERS = 2;

/**
 * Add a proposed project to state. Player can configure further or
 * back out by not accepting financing.
 */
export function proposeProject(
  state: GameState,
  catalogProjectId: string,
  alignmentId: string,
  stationQuality: StationQualityTier,
): GameState {
  const entry = catalogEntry(catalogProjectId);
  if (!entry) return state;
  const alignment = entry.alignments.find((a) => a.id === alignmentId) ?? entry.alignments[0]!;

  const proposed: ProposedProject = {
    state: 'proposed',
    templateId: catalogProjectId,
    initiatedAt: state.quarter,
    chosenAlignment: alignment.id,
    chosenStationCount: alignment.stations,
    stationQuality,
    lvc: { capexPerStation: cash(0), stationsCovered: 0 },
    completedStudies: [],
    studiesInFlight: [],
    costUncertaintyPct: pct(0.35),
    demandUncertaintyPct: pct(0.40),
    perProject: {
      sitePrep: score(20),
      megaContract: entry.tier === 'mega',
      settlementPremium: score(0),
    },
  };

  return { ...state, projects: [...state.projects, proposed] };
}

/** Estimated cost for a proposed project (derived from catalog + chosen options). */
function estimatedCostOf(proposed: ProposedProject): number {
  const entry = catalogEntry(proposed.templateId);
  if (!entry) return 0;
  const alignmentId = proposed.chosenAlignment ?? entry.alignments[0]!.id;
  return realizedProjectCost(entry, alignmentId, proposed.stationQuality);
}

/** Generate the 4 financing offers for a proposed project at current trust scores. */
export function getFinancingOffersForProject(
  state: GameState,
  catalogProjectId: string,
): FinancingOffer[] {
  const entry = catalogEntry(catalogProjectId);
  if (!entry) return [];
  return generateFinancingOffers(state.politics, entry.tier);
}

/**
 * Accept a financing offer for a proposed project. Creates a new debt
 * tranche, transitions project to under_construction with the financing
 * amount as `remainingFunding`. Applies starting political support deltas.
 */
export function acceptFinancing(
  state: GameState,
  catalogProjectId: string,
  approach: FinancingApproach,
): GameState {
  const proposedIdx = state.projects.findIndex(
    (p) => p.state === 'proposed' && p.templateId === catalogProjectId,
  );
  if (proposedIdx === -1) return state;
  const proposed = state.projects[proposedIdx]! as ProposedProject;
  const entry = catalogEntry(catalogProjectId);
  if (!entry) return state;

  const offers = generateFinancingOffers(state.politics, entry.tier);
  const offer = offers.find((o) => o.approach === approach);
  if (!offer) return state;

  // Honor the smaller of project cost or financing offer
  const projectCost = estimatedCostOf(proposed);
  const amount = Math.min(projectCost, offer.maxAmount as unknown as number);
  if (amount <= 0) return state;

  // Create new debt tranche from the accepted offer.
  // Creditor class derived from financing approach so the debt portfolio
  // reflects who funded each project.
  const creditorFor: Record<FinancingApproach, CreditorType> = {
    federalOnly: 'institutional', // gov debt counts as institutional in our model
    provincialOnly: 'institutional',
    municipalOnly: 'institutional',
    consortium: 'institutional',
    pensionConsortium: 'pension',
    bondMarket: 'institutional',
    sovereignWealth: 'foreign',
  };
  const trancheId = `t_${catalogProjectId.toLowerCase()}_${approach}_q${state.quarter as unknown as number}`;
  const newTranche: DebtTranche = {
    id: trancheId,
    creditor: creditorFor[approach],
    principal: cash(amount),
    coupon: { kind: 'fixed', rate: bp(offer.rateBp) },
    maturity: quarter(
      (state.quarter as unknown as number) + entry.buildDurationQuarters + 40,
    ), // construction + 10yr term
    issuedAt: state.quarter,
  };

  const accepted: AcceptedFinancing = {
    approach,
    amount: cash(amount),
    rateBp: offer.rateBp,
    conditions: offer.conditions,
    signedAt: state.quarter,
    trancheId,
  };

  // Compute forecast open quarter = current Q + buildDuration
  const constructing: ConstructingProject = {
    state: 'under_construction',
    templateId: catalogProjectId,
    chosenAlignment: proposed.chosenAlignment ?? entry.alignments[0]!.id,
    chosenStationCount: proposed.chosenStationCount ?? entry.alignments[0]!.stations,
    stationQuality: proposed.stationQuality,
    lvc: proposed.lvc,
    brokeGroundAt: state.quarter,
    totalBudget: cash(amount),
    spent: cash(0),
    remainingFunding: cash(amount),
    forecastOpenAt: quarter(
      (state.quarter as unknown as number) + entry.buildDurationQuarters,
    ),
    financing: [accepted],
    perProject: proposed.perProject,
  };

  // Apply starting political support
  const sup = entry.startingPoliticalSupport;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  let next: GameState = {
    ...state,
    projects: state.projects.map((p, i) => (i === proposedIdx ? constructing : p)),
    debt: { ...state.debt, tranches: [...state.debt.tranches, newTranche] },
    politics: {
      ottawa: {
        ...state.politics.ottawa,
        trust: score(clamp((state.politics.ottawa.trust as unknown as number) + sup.ottawa)),
      },
      queensPark: {
        ...state.politics.queensPark,
        trust: score(clamp((state.politics.queensPark.trust as unknown as number) + sup.queensPark)),
      },
      cityHall: {
        ...state.politics.cityHall,
        trust: score(clamp((state.politics.cityHall.trust as unknown as number) + sup.cityHall)),
      },
    },
  };

  // Apply per-offer onAcceptEffects (e.g., sovereign wealth political optics)
  if (offer.onAcceptEffects && offer.onAcceptEffects.length > 0) {
    next = applyEffects(next, offer.onAcceptEffects);
  }
  return next;
}

/** Cancel a proposed project. Player backs out before financing. */
export function rejectProject(state: GameState, catalogProjectId: string): GameState {
  return {
    ...state,
    projects: state.projects.filter(
      (p) => !(p.state === 'proposed' && p.templateId === catalogProjectId),
    ),
  };
}

/** Available projects for player to propose (catalog minus already-active). */
export function availableProjectCatalog(state: GameState): typeof PROJECT_CATALOG {
  const activeIds = new Set(state.projects.map((p) => p.templateId));
  return PROJECT_CATALOG.filter((entry) => !activeIds.has(entry.id));
}

export { STATION_QUALITY_RIDERSHIP_MULTIPLIER };
