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
  // Phase 6.3.1: enforce projectDeprioritization control from renegotiation
  // outcome — blocked projects cannot be proposed until the control expires.
  const deprioritized = state.operatingAllowance.controls.some(
    (c) => c.kind === 'projectDeprioritization' && c.projectIds.includes(catalogProjectId),
  );
  if (deprioritized) return state;
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
function estimatedCostOf(proposed: ProposedProject, templates: number): number {
  const entry = catalogEntry(proposed.templateId);
  if (!entry) return 0;
  const alignmentId = proposed.chosenAlignment ?? entry.alignments[0]!.id;
  return realizedProjectCost(entry, alignmentId, proposed.stationQuality, templates);
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
 * Stacked financing selection — one player-picked layer of a package.
 * Multiple selections can be assembled per project.
 */
export interface FinancingSelection {
  approach: FinancingApproach;
  amountM: number;
}

/**
 * Accept a single-offer financing for a proposed project. Wrapper around
 * acceptFinancingPackage with a single selection. Kept for backward
 * compatibility and simple flows.
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

  const projectCost = estimatedCostOf(proposed, state.engineVars.templates as unknown as number);
  const amount = Math.min(projectCost, offer.maxAmount as unknown as number);
  if (amount <= 0) return state;
  // Delegate to package logic with a single selection
  return acceptFinancingPackage(state, catalogProjectId, [{ approach, amountM: amount }]);
}

/**
 * Accept a STACKED financing package — multiple offers assembled together.
 * Phase 4 stacking polish. Each selection becomes its own DebtTranche.
 * Sovereign onAcceptEffects applies if sovereign is in the package.
 * Starting political support deltas apply once (from project template).
 *
 * Selections are validated against each offer's max amount; over-amounts
 * are clamped. Total funding becomes sum of selections, capped at project
 * cost (no over-financing).
 */
export function acceptFinancingPackage(
  state: GameState,
  catalogProjectId: string,
  selections: FinancingSelection[],
): GameState {
  const proposedIdx = state.projects.findIndex(
    (p) => p.state === 'proposed' && p.templateId === catalogProjectId,
  );
  if (proposedIdx === -1) return state;
  const proposed = state.projects[proposedIdx]! as ProposedProject;
  const entry = catalogEntry(catalogProjectId);
  if (!entry) return state;
  if (selections.length === 0) return state;

  const offers = generateFinancingOffers(state.politics, entry.tier);
  const projectCost = estimatedCostOf(proposed, state.engineVars.templates as unknown as number);

  // Validate + clamp each selection
  let remainingCost = projectCost;
  const acceptedLayers: Array<{ offer: FinancingOffer; amount: number }> = [];
  for (const sel of selections) {
    const offer = offers.find((o) => o.approach === sel.approach);
    if (!offer) continue;
    const maxFromOffer = offer.maxAmount as unknown as number;
    const amount = Math.min(
      Math.max(0, Math.round(sel.amountM)),
      maxFromOffer,
      remainingCost,
    );
    if (amount <= 0) continue;
    acceptedLayers.push({ offer, amount });
    remainingCost -= amount;
  }
  if (acceptedLayers.length === 0) return state;

  const totalAmount = acceptedLayers.reduce((acc, l) => acc + l.amount, 0);
  if (totalAmount <= 0) return state;

  // Creditor class derived from financing approach
  const creditorFor: Record<FinancingApproach, CreditorType> = {
    federalOnly: 'institutional',
    provincialOnly: 'institutional',
    municipalOnly: 'institutional',
    consortium: 'institutional',
    pensionConsortium: 'pension',
    bondMarket: 'institutional',
    sovereignWealth: 'foreign',
  };

  // Build one tranche per layer + AcceptedFinancing record per layer
  const newTranches: DebtTranche[] = [];
  const acceptedRecords: AcceptedFinancing[] = [];
  let onAcceptEffectsAcc: NonNullable<FinancingOffer['onAcceptEffects']> = [];

  acceptedLayers.forEach(({ offer, amount }, idx) => {
    const trancheId = `t_${catalogProjectId.toLowerCase()}_${offer.approach}_q${state.quarter as unknown as number}_${idx}`;
    const tranche: DebtTranche = {
      id: trancheId,
      creditor: creditorFor[offer.approach],
      principal: cash(amount),
      coupon: { kind: 'fixed', rate: bp(offer.rateBp) },
      maturity: quarter(
        (state.quarter as unknown as number) + entry.buildDurationQuarters + 40,
      ),
      issuedAt: state.quarter,
    };
    newTranches.push(tranche);
    acceptedRecords.push({
      approach: offer.approach,
      amount: cash(amount),
      rateBp: offer.rateBp,
      conditions: offer.conditions,
      signedAt: state.quarter,
      trancheId,
    });
    if (offer.onAcceptEffects) {
      onAcceptEffectsAcc = [...onAcceptEffectsAcc, ...offer.onAcceptEffects];
    }
  });

  const constructing: ConstructingProject = {
    state: 'under_construction',
    templateId: catalogProjectId,
    chosenAlignment: proposed.chosenAlignment ?? entry.alignments[0]!.id,
    chosenStationCount: proposed.chosenStationCount ?? entry.alignments[0]!.stations,
    stationQuality: proposed.stationQuality,
    lvc: proposed.lvc,
    brokeGroundAt: state.quarter,
    totalBudget: cash(totalAmount),
    spent: cash(0),
    remainingFunding: cash(totalAmount),
    forecastOpenAt: quarter(
      (state.quarter as unknown as number) + entry.buildDurationQuarters,
    ),
    financing: acceptedRecords,
    perProject: proposed.perProject,
  };

  // Apply starting political support (applied ONCE, not per layer)
  const sup = entry.startingPoliticalSupport;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  let next: GameState = {
    ...state,
    projects: state.projects.map((p, i) => (i === proposedIdx ? constructing : p)),
    debt: { ...state.debt, tranches: [...state.debt.tranches, ...newTranches] },
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

  // Apply onAcceptEffects from all layers (sovereign optics, etc.)
  // FinancingOfferEffect is structurally compatible with EventEffect for
  // the kinds we use here; cast at the boundary.
  if (onAcceptEffectsAcc.length > 0) {
    next = applyEffects(next, onAcceptEffectsAcc as unknown as Parameters<typeof applyEffects>[1]);
  }
  return next;
}

/** Cancel a proposed project. Player backs out before financing. */
/**
 * Phase 10: Accelerate an under-construction project.
 * Brings forecastOpenAt forward by N quarters at the cost of extra spend
 * (proportional to remaining work compressed). Player gets earlier riders
 * + earlier completion bonus, but burns cash faster.
 */
export function accelerateProject(
  state: GameState,
  catalogProjectId: string,
  quartersFaster: number,
): GameState {
  const idx = state.projects.findIndex(
    (p) => p.state === 'under_construction' && p.templateId === catalogProjectId,
  );
  if (idx === -1) return state;
  const project = state.projects[idx]!;
  if (project.state !== 'under_construction') return state;
  const currentQ = state.quarter as unknown as number;
  const oldOpen = project.forecastOpenAt as unknown as number;
  const remainingQuarters = Math.max(1, oldOpen - currentQ);
  const accelerated = Math.max(currentQ + 1, oldOpen - quartersFaster);
  // Cost overhead: 15% per quarter compressed (paid as immediate cash burn)
  const remaining = project.remainingFunding as unknown as number;
  const compressionRatio = Math.min(0.6, (quartersFaster / remainingQuarters) * 0.6);
  const accelerationCostM = Math.round(remaining * compressionRatio * 0.25);
  const cashOnHand = state.cash.balance as unknown as number;
  if (cashOnHand < accelerationCostM) return state;

  return {
    ...state,
    cash: { ...state.cash, balance: cash(cashOnHand - accelerationCostM) },
    projects: state.projects.map((p, i) =>
      i === idx
        ? {
            ...project,
            forecastOpenAt: quarter(accelerated),
          }
        : p,
    ),
  };
}

/**
 * Phase 10: Reduce project scope mid-construction.
 * Cuts forecastOpenAt by 2Q (smaller build) AND returns 20% of remaining
 * funding to cash. Trades long-term ridership impact for short-term cash
 * relief. Reduces project's final ridership 30% at opening.
 *
 * The ridership cut is tracked via a `scopeCut: true` flag on the project
 * (added to ConstructingProject for this purpose).
 */
export function reduceProjectScope(
  state: GameState,
  catalogProjectId: string,
): GameState {
  const idx = state.projects.findIndex(
    (p) => p.state === 'under_construction' && p.templateId === catalogProjectId,
  );
  if (idx === -1) return state;
  const project = state.projects[idx]!;
  if (project.state !== 'under_construction') return state;
  const remaining = project.remainingFunding as unknown as number;
  const refund = Math.round(remaining * 0.2);
  const cashOnHand = state.cash.balance as unknown as number;
  const oldOpen = project.forecastOpenAt as unknown as number;
  return {
    ...state,
    cash: { ...state.cash, balance: cash(cashOnHand + refund) },
    projects: state.projects.map((p, i) =>
      i === idx
        ? {
            ...project,
            forecastOpenAt: quarter(Math.max((state.quarter as unknown as number) + 1, oldOpen - 2)),
            remainingFunding: cash(remaining - refund),
            scopeReduced: true,
          }
        : p,
    ),
  };
}

/**
 * Phase 10: pause / resume a project mid-construction.
 * Paused projects don't burn cash or advance, but forecastOpenAt slips +1Q
 * per paused quarter. Use for cash-crunch breathing room without cancelling.
 */
/**
 * Phase 10: set LVC capex per station for a proposed project.
 * Locked at break-ground (when financing is accepted). LVC capex is added
 * to project total cost; in return, project pays LVC revenue per quarter
 * once operating (revenue = capex × stations × 0.015/Q ≈ 6%/yr ROI).
 */
export function setLvcCapex(
  state: GameState,
  catalogProjectId: string,
  capexPerStationM: number,
): GameState {
  const idx = state.projects.findIndex(
    (p) => p.state === 'proposed' && p.templateId === catalogProjectId,
  );
  if (idx === -1) return state;
  const project = state.projects[idx]!;
  if (project.state !== 'proposed') return state;
  const safe = Math.max(0, Math.min(400, Math.round(capexPerStationM)));
  const stationsCovered = project.chosenStationCount ?? 0;
  return {
    ...state,
    projects: state.projects.map((p, i) =>
      i === idx
        ? {
            ...project,
            lvc: { capexPerStation: cash(safe), stationsCovered },
          }
        : p,
    ),
  };
}

export function toggleProjectPause(state: GameState, catalogProjectId: string): GameState {
  const idx = state.projects.findIndex(
    (p) => p.state === 'under_construction' && p.templateId === catalogProjectId,
  );
  if (idx === -1) return state;
  const project = state.projects[idx]!;
  if (project.state !== 'under_construction') return state;
  return {
    ...state,
    projects: state.projects.map((p, i) =>
      i === idx ? { ...project, paused: !project.paused } : p,
    ),
  };
}

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
