import type { Project, ConstructingProject, OperatingProject } from '@/types/projects';
import type { CashMillions, QuarterIndex } from '@/types/scalars';
import { cash, quarter, riders } from '@/types/scalars';

/**
 * Project lifecycle ticks. Phase 1.2 scope:
 *
 * - Constructing projects spend per quarter according to (totalBudget / build duration),
 *   transition to operating at forecastOpenAt.
 * - Operating projects ramp ridership from 0 → max over 8 quarters per design doc §5.
 *
 * Player control over budget pacing (advance / delay) lands in Phase 4.
 * Until then, projects tick at their forecast rate.
 */

const BASELINE_ENGINEERS = 180;

/**
 * Advance one constructing project by a quarter. May transition to operating.
 *
 * Phase 3.2 polish: engineers count now affects burn rate. More engineers =
 * faster construction. Multiplier = engineers / 180 (baseline), clamped 0.5×
 * to 1.5×. Wires the previously-orphan `engineVars.engineers` into a real
 * project-velocity lever.
 */
export function tickConstructingProject(
  p: ConstructingProject,
  currentQuarter: QuarterIndex,
  engineers: number = BASELINE_ENGINEERS,
  crosslinxLeverage = 50,
): { project: ConstructingProject | OperatingProject; drawFromFunding: CashMillions } {
  const currentQ = currentQuarter as unknown as number;
  const brokeGroundQ = p.brokeGroundAt as unknown as number;
  const forecastOpenQ = p.forecastOpenAt as unknown as number;
  const buildLength = Math.max(1, forecastOpenQ - brokeGroundQ);
  const baseBurn = (p.totalBudget as unknown as number) / buildLength;
  const engineerMul = Math.max(0.5, Math.min(1.5, engineers / BASELINE_ENGINEERS));
  // Phase 10.7 audit fix: Crosslinx leverage was INVERTED at the construction
  // burn site (high leverage = cheaper burn) while the cost estimate at the
  // catalog correctly penalized high leverage (+9% at 100). The player saw
  // a higher upfront cost AND a faster-burning project at high leverage,
  // a contradiction. Now matches the catalog formula: high leverage = +%
  // construction cost (consortium extracts change orders during build).
  // (contractor extracts rents). Wires the previously-orphan engineVar.
  // Baseline 55 (matches projectCatalog), max +9% premium at leverage=100.
  // No discount below baseline (player can't bully past the alignment min).
  const leveragePremium = Math.min(0.09, Math.max(0, (crosslinxLeverage - 55) * 0.002));
  const leverageMul = 1 + leveragePremium;
  const burnPerQuarter = baseBurn * engineerMul * leverageMul;
  const spentSoFar = (p.spent as unknown as number) + burnPerQuarter;
  const remainingAfter = Math.max(0, (p.remainingFunding as unknown as number) - burnPerQuarter);

  // Transition to operating once we hit the forecasted open date.
  // Ridership ramp happens via tickOperatingProject in subsequent quarters.
  if (currentQ >= forecastOpenQ) {
    const opening: OperatingProject = {
      state: 'operating',
      templateId: p.templateId,
      chosenAlignment: p.chosenAlignment,
      chosenStationCount: p.chosenStationCount,
      stationQuality: p.stationQuality,
      lvc: p.lvc,
      openedAt: quarter(currentQ),
      finalCost: cash(spentSoFar),
      currentDailyRiders: riders(0),
      financing: p.financing,
      // Phase 10: carry the scope-cut flag through to operating state.
      ...(p.scopeReduced ? { scopeReduced: true } : {}),
    };
    return { project: opening, drawFromFunding: cash(burnPerQuarter) };
  }

  return {
    project: { ...p, spent: cash(spentSoFar), remainingFunding: cash(remainingAfter) },
    drawFromFunding: cash(burnPerQuarter),
  };
}

/**
 * Ramp ridership for an operating project. Per spec catalogue P00 ramp:
 * starts at `openingRidership` on opening day, ramps linearly to
 * `fullRidership` over 8 quarters.
 */
export function tickOperatingProject(
  p: OperatingProject,
  currentQuarter: QuarterIndex,
  openingRidership: number,
  fullRidership: number,
): OperatingProject {
  const openedQ = p.openedAt as unknown as number;
  const elapsedSinceOpen = (currentQuarter as unknown as number) - openedQ;
  const rampPct = Math.min(1, Math.max(0, elapsedSinceOpen / 8));
  // Phase 10: scope-cut projects deliver 70% of forecasted ridership (per
  // the lever's promise in the UI). This applies on opening day AND through
  // the ramp.
  const scopeMul = p.scopeReduced ? 0.7 : 1;
  const target =
    (openingRidership + (fullRidership - openingRidership) * rampPct) * scopeMul;
  return { ...p, currentDailyRiders: riders(Math.floor(target)) };
}

/**
 * Tick a single project. Returns updated project + funding pool draw + any
 * delta to daily ridership flowing into the operating network.
 *
 * Ridership return shape:
 *   - `primaryAgencyDelta`: ridership change flowing into the project's
 *     primary agency (e.g. Ontario Line's positive ridership goes into TTC).
 *   - `cannibalizationDeltas`: per-agency NEGATIVE deltas reflecting riders
 *     the new line pulls from existing services. Scales with current ramp.
 *
 * `drawFromFunding` is NOT operating cash — it comes from the project's
 * `remainingFunding` pool fed by accepted financing at break-ground.
 */
import type { AgencyId } from '@/types/agency';
import type { ProjectRidershipModel } from './data';

export interface ProjectTickResult {
  project: Project;
  drawFromFunding: CashMillions;
  primaryAgency?: AgencyId;
  primaryAgencyDelta: number;
  cannibalizationDeltas: Partial<Record<AgencyId, number>>;
}

export function tickProject(
  p: Project,
  currentQuarter: QuarterIndex,
  ridershipModelFor: (templateId: string) => ProjectRidershipModel | undefined,
  engineers: number = BASELINE_ENGINEERS,
  crosslinxLeverage = 50,
): ProjectTickResult {
  if (p.state === 'proposed') {
    // Phase 10: studies narrow uncertainty over time. Each quarter in proposed
    // state reduces cost + demand uncertainty by ~12% (multiplicative). After
    // 4Q, uncertainty is ~60% of original. Floor at 5% so it never zeroes.
    const newCostU = Math.max(
      0.05,
      (p.costUncertaintyPct as unknown as number) * 0.88,
    );
    const newDemandU = Math.max(
      0.05,
      (p.demandUncertaintyPct as unknown as number) * 0.88,
    );
    return {
      project: {
        ...p,
        costUncertaintyPct: newCostU as unknown as typeof p.costUncertaintyPct,
        demandUncertaintyPct: newDemandU as unknown as typeof p.demandUncertaintyPct,
      },
      drawFromFunding: cash(0),
      primaryAgencyDelta: 0,
      cannibalizationDeltas: {},
    };
  }
  if (p.state === 'under_construction') {
    // Phase 10: paused projects don't tick. Forecast opening shifts +1Q each
    // paused quarter (you lose the time anyway). Funding stays committed.
    if (p.paused === true) {
      return {
        project: { ...p, forecastOpenAt: quarter((p.forecastOpenAt as unknown as number) + 1) },
        drawFromFunding: cash(0),
        primaryAgencyDelta: 0,
        cannibalizationDeltas: {},
      };
    }
    const result = tickConstructingProject(p, currentQuarter, engineers, crosslinxLeverage);
    return {
      project: result.project,
      drawFromFunding: result.drawFromFunding,
      primaryAgencyDelta: 0,
      cannibalizationDeltas: {},
    };
  }
  // operating: compute ramped ridership + cannibalization
  const model = ridershipModelFor(p.templateId);
  if (!model) {
    return {
      project: p,
      drawFromFunding: cash(0),
      primaryAgencyDelta: 0,
      cannibalizationDeltas: {},
    };
  }
  const before = p.currentDailyRiders as unknown as number;
  const next = tickOperatingProject(p, currentQuarter, model.openingRidership, model.fullRidership);
  const after = next.currentDailyRiders as unknown as number;
  const primaryDelta = after - before;

  // Cannibalization scales with the project's current ridership as a fraction of full.
  // If we just opened (76% of full), apply 76% of cannibalization; at full ramp, 100%.
  const rampFrac = after / Math.max(1, model.fullRidership);
  const targetCannibalization: Partial<Record<AgencyId, number>> = {};
  for (const [agencyId, fullAmount] of Object.entries(model.cannibalization) as [
    AgencyId,
    number,
  ][]) {
    targetCannibalization[agencyId] = Math.floor(fullAmount * rampFrac);
  }
  // The cannibalization delta this quarter is (this-quarter target - last-quarter target).
  // We approximate last-quarter by computing what rampFrac was last quarter.
  const lastRampFrac = before / Math.max(1, model.fullRidership);
  const cannibalizationDeltas: Partial<Record<AgencyId, number>> = {};
  for (const [agencyId, fullAmount] of Object.entries(model.cannibalization) as [
    AgencyId,
    number,
  ][]) {
    const thisQ = Math.floor(fullAmount * rampFrac);
    const lastQ = Math.floor(fullAmount * lastRampFrac);
    cannibalizationDeltas[agencyId] = thisQ - lastQ;
  }

  return {
    project: next,
    drawFromFunding: cash(0),
    primaryAgency: model.primaryAgency,
    primaryAgencyDelta: primaryDelta,
    cannibalizationDeltas,
  };
}
