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
  // Phase 6.3.2: Crosslinx leverage affects construction cost. 50 = neutral;
  // 100 = -10% cost (contractor delivers efficiently); 0 = +10% cost
  // (contractor extracts rents). Wires the previously-orphan engineVar.
  const leverageMul = 1 + ((50 - crosslinxLeverage) * 0.002);
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
  const target = openingRidership + (fullRidership - openingRidership) * rampPct;
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
    return {
      project: p,
      drawFromFunding: cash(0),
      primaryAgencyDelta: 0,
      cannibalizationDeltas: {},
    };
  }
  if (p.state === 'under_construction') {
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
