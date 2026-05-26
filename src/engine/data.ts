import type { ProjectId } from '@/types/projects';

/**
 * Static data the engine needs to do per-quarter math without loading the
 * full project catalogue. Phase 1.2 only needs Ontario Line for the
 * opening-ramp case the user wants exercised in the heartbeat.
 *
 * Phase 4 will move this into a proper project-catalogue module sourced
 * from `docs/02-project-catalogue-v3.md`.
 */

/** Full-ramp daily ridership per project, used when opening transitions land. */
export const PROJECT_FULL_RIDERSHIP: Record<ProjectId, number> = {
  P00: 380_000, // Ontario Line per catalogue
};

export function fullRidershipFor(templateId: ProjectId): number {
  return PROJECT_FULL_RIDERSHIP[templateId] ?? 0;
}
