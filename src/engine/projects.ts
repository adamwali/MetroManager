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

/** Advance one constructing project by a quarter. May transition to operating. */
export function tickConstructingProject(
  p: ConstructingProject,
  currentQuarter: QuarterIndex,
): { project: ConstructingProject | OperatingProject; spentThisQuarter: CashMillions } {
  const currentQ = currentQuarter as unknown as number;
  const brokeGroundQ = p.brokeGroundAt as unknown as number;
  const forecastOpenQ = p.forecastOpenAt as unknown as number;
  const buildLength = Math.max(1, forecastOpenQ - brokeGroundQ);
  const burnPerQuarter = (p.totalBudget as unknown as number) / buildLength;
  const spentSoFar = (p.spent as unknown as number) + burnPerQuarter;

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
    };
    return { project: opening, spentThisQuarter: cash(burnPerQuarter) };
  }

  return {
    project: { ...p, spent: cash(spentSoFar) },
    spentThisQuarter: cash(burnPerQuarter),
  };
}

/**
 * Ramp ridership for an operating project from 0 → fullRidership over 8 quarters.
 * Quadratic-ish: 12.5% per quarter linearly for simplicity.
 */
export function tickOperatingProject(
  p: OperatingProject,
  currentQuarter: QuarterIndex,
  fullRidership: number,
): OperatingProject {
  const openedQ = p.openedAt as unknown as number;
  const elapsedSinceOpen = (currentQuarter as unknown as number) - openedQ;
  const rampPct = Math.min(1, Math.max(0, elapsedSinceOpen / 8));
  return { ...p, currentDailyRiders: riders(Math.floor(fullRidership * rampPct)) };
}

/**
 * Tick a single project. Returns updated project + any cash impact + any
 * delta to daily ridership that should flow into the operating network.
 */
export function tickProject(
  p: Project,
  currentQuarter: QuarterIndex,
  ridershipForTemplate: (templateId: string) => number,
): { project: Project; spentThisQuarter: CashMillions; ridershipDelta: number } {
  if (p.state === 'proposed') {
    // Phase 1.2: proposed projects don't auto-advance; player decisions land Phase 4
    return { project: p, spentThisQuarter: cash(0), ridershipDelta: 0 };
  }
  if (p.state === 'under_construction') {
    const result = tickConstructingProject(p, currentQuarter);
    return { project: result.project, spentThisQuarter: result.spentThisQuarter, ridershipDelta: 0 };
  }
  // operating
  const full = ridershipForTemplate(p.templateId);
  const before = p.currentDailyRiders as unknown as number;
  const next = tickOperatingProject(p, currentQuarter, full);
  const after = next.currentDailyRiders as unknown as number;
  return { project: next, spentThisQuarter: cash(0), ridershipDelta: after - before };
}
