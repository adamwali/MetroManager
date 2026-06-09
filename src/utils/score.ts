import type { GameState } from '@/types/gameState';
import type { MandateId } from '@/types/mandate';
import { reliabilityScore } from '@engine/agencies';

/**
 * Legacy Score. Phase 10.11; Phase 11 added mandate weighting.
 *
 * A single 0-1000ish number summarizing the player's tenure, plus a
 * component breakdown for the end screen and a compact always-visible
 * readout. Pure derivation from state.
 *
 * Components (each contributes points):
 *   Ridership growth   — riders added vs the ~1.95M starting baseline
 *   Solvency           — cash on hand, debt discipline
 *   Network delivered  — projects opened (excl. inherited Ontario Line)
 *   Board + approval    — institutional + public standing
 *   Government trust    — averaged across the three
 *   Tenure / survival  — quarters served (full term is a bonus)
 *
 * Phase 11: when state.mandate is set, the matching pillar's score is
 * 2x weighted AND a mandateAchieved bonus (+200) lands if the Q60 target
 * was hit. This makes the player's Q0 bet matter to the final grade.
 */

const STARTING_RIDERS = 1_947_000; // TTC+GO+UP at Q0 baseline
const MANDATE_TARGET_RIDERS = 2_450_000;
const MANDATE_RELIABILITY_TARGET = 80;
const MANDATE_APPROVAL_TARGET = 65;

export interface ScoreBreakdown {
  total: number;
  grade: string;
  ridership: number;
  solvency: number;
  network: number;
  standing: number;
  trust: number;
  tenure: number;
  mandateBonus: number;
  mandate?: MandateId;
  mandateAchieved?: boolean;
  // Raw stats for display
  stats: {
    ridersNow: number;
    ridersDelta: number;
    cash: number;
    projectsOpened: number;
    board: number;
    approval: number;
    avgTrust: number;
    quartersServed: number;
    avgReliability: number;
  };
}

export function computeScore(state: GameState): ScoreBreakdown {
  const ridersNow =
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number);
  const ridersDelta = ridersNow - STARTING_RIDERS;
  const cash = state.cash.balance as unknown as number;
  const board = state.boardConfidence.score as unknown as number;
  const approval = state.engineVars.publicApproval as unknown as number;
  const avgTrust =
    ((state.politics.ottawa.trust as unknown as number) +
      (state.politics.queensPark.trust as unknown as number) +
      (state.politics.cityHall.trust as unknown as number)) /
    3;
  const projectsOpened = state.projects.filter(
    (p) => p.state === 'operating' && p.templateId !== 'P00',
  ).length;
  const quartersServed = (state.quarter as unknown as number) + 1;
  const avgReliability =
    (reliabilityScore(state.agencies.ttc) + reliabilityScore(state.agencies.go)) / 2;

  // Ridership: +1pt per 5k riders added, capped 300. Negative if you lost riders.
  const baseRidership = clamp(Math.round(ridersDelta / 5_000), -100, 300);
  // Solvency: cash/$20M capped 200; penalty if negative.
  const solvency = clamp(Math.round(cash / 20), -150, 200);
  // Network: 60pts per line opened (these are huge multi-year efforts).
  const network = projectsOpened * 60;
  // Standing: board + approval scaled to 0-200.
  const baseStanding = Math.round((board + approval));
  // Trust: 0-100 → 0-100.
  const trust = Math.round(avgTrust);
  // Tenure: 2pts/quarter, +100 bonus for completing the full 60Q term.
  const tenure = quartersServed * 2 + (quartersServed >= 60 ? 100 : 0);

  // Phase 11: mandate weighting. The mandate's primary pillar is 2x.
  let ridership = baseRidership;
  let standing = baseStanding;
  let mandateBonus = 0;
  let mandateAchieved = false;
  let reliabilityPillar = 0; // separate visible pillar when mandate is reliability

  if (state.mandate === 'ridership') {
    ridership = baseRidership * 2;
    mandateAchieved = ridersNow >= MANDATE_TARGET_RIDERS;
  } else if (state.mandate === 'reliability') {
    // reliability is normally rolled into network/ops opaquely; surface as a
    // dedicated pillar when it's the mandate so the player sees the bet land
    reliabilityPillar = Math.round(avgReliability * 4); // 0..400
    mandateAchieved = avgReliability >= MANDATE_RELIABILITY_TARGET;
  } else if (state.mandate === 'affordability') {
    standing = baseStanding * 2;
    mandateAchieved = approval >= MANDATE_APPROVAL_TARGET;
  }

  if (mandateAchieved && quartersServed >= 60) mandateBonus = 200;

  const total = Math.max(
    0,
    ridership + solvency + network + standing + trust + tenure + reliabilityPillar + mandateBonus,
  );

  return {
    total,
    grade: gradeFor(total, state),
    ridership,
    solvency,
    network,
    standing,
    trust,
    tenure,
    mandateBonus,
    ...(state.mandate ? { mandate: state.mandate, mandateAchieved } : {}),
    stats: {
      ridersNow,
      ridersDelta,
      cash,
      projectsOpened,
      board,
      approval,
      avgTrust,
      quartersServed,
      avgReliability,
    },
  };
}

function gradeFor(total: number, state: GameState): string {
  // Game-over kind overrides the top grades.
  if (state.gameOver?.kind === 'fiscalFailure') return 'F — Bankrupt';
  if (state.gameOver?.kind === 'boardFiring') return 'D — Dismissed';
  if (total >= 900) return 'S — Legendary';
  if (total >= 750) return 'A — Visionary';
  if (total >= 600) return 'B — Effective';
  if (total >= 450) return 'C — Adequate';
  if (total >= 300) return 'D — Struggling';
  return 'E — Floundering';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
