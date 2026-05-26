import type { AgencyId } from '@/types/agency';
import type { ProjectId } from '@/types/projects';

/**
 * Static project ridership data. Phase 1.2 minimum — just enough to model
 * Ontario Line opening realistically. Phase 4 will move this into a proper
 * project-catalogue module sourced from `docs/02-project-catalogue-v3.md`.
 *
 * `openingRidership` is the line's own day-1 ridership; `fullRidership` is
 * its steady-state after the 8Q ramp. `cannibalization` is per-agency
 * negative impact — riders the new line pulls from existing services.
 * Net system gain = fullRidership + sum(cannibalization values).
 */
export interface ProjectRidershipModel {
  openingRidership: number;
  fullRidership: number;
  /** Per-agency ridership LOSS (negative numbers). Scales with project's current ramp. */
  cannibalization: Partial<Record<AgencyId, number>>;
  /** Which agency receives the project's positive ridership when it opens. */
  primaryAgency: AgencyId;
}

export const PROJECT_RIDERSHIP: Record<ProjectId, ProjectRidershipModel> = {
  // Ontario Line: downtown north-south subway, Exhibition → Science Centre.
  // Cannibalization (Toronto-realistic, not in spec — see DECISIONS.md):
  //   -150k from TTC Line 1 (Yonge relief, the entire point of the project)
  //   -50k from TTC streetcars (Queen/King/Dundas parallel routes)
  //   -38k from GO Lakeshore West (Exhibition overlap)
  //   Net new (induced demand): 380 - 200 - 38 = 142k system-wide
  P00: {
    openingRidership: 290_000,
    fullRidership: 380_000,
    cannibalization: {
      ttc: -200_000,
      go: -38_000,
    },
    primaryAgency: 'ttc',
  },
};

export function ridershipModelFor(templateId: ProjectId): ProjectRidershipModel | undefined {
  return PROJECT_RIDERSHIP[templateId];
}
