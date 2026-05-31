import type { GameState } from '@/types/gameState';

/**
 * Legacy Score. Phase 10.11. A single 0-1000ish number summarizing the
 * player's tenure, plus a component breakdown for the end screen and a
 * compact always-visible readout. Pure derivation from state.
 *
 * Components (each contributes points):
 *   Ridership growth   — riders added vs the ~1.95M starting baseline
 *   Solvency           — cash on hand, debt discipline
 *   Network delivered  — projects opened (excl. inherited Ontario Line)
 *   Board + approval    — institutional + public standing
 *   Government trust    — averaged across the three
 *   Tenure / survival  — quarters served (full term is a bonus)
 */

const STARTING_RIDERS = 1_947_000; // TTC+GO+UP at Q0 baseline

export interface ScoreBreakdown {
  total: number;
  grade: string;
  ridership: number;
  solvency: number;
  network: number;
  standing: number;
  trust: number;
  tenure: number;
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

  // Ridership: +1pt per 5k riders added, capped 300. Negative if you lost riders.
  const ridership = clamp(Math.round(ridersDelta / 5_000), -100, 300);
  // Solvency: cash/$20M capped 200; penalty if negative.
  const solvency = clamp(Math.round(cash / 20), -150, 200);
  // Network: 60pts per line opened (these are huge multi-year efforts).
  const network = projectsOpened * 60;
  // Standing: board + approval scaled to 0-200.
  const standing = Math.round((board + approval));
  // Trust: 0-100 → 0-100.
  const trust = Math.round(avgTrust);
  // Tenure: 2pts/quarter, +100 bonus for completing the full 60Q term.
  const tenure = quartersServed * 2 + (quartersServed >= 60 ? 100 : 0);

  const total = Math.max(0, ridership + solvency + network + standing + trust + tenure);

  return {
    total,
    grade: gradeFor(total, state),
    ridership,
    solvency,
    network,
    standing,
    trust,
    tenure,
    stats: {
      ridersNow,
      ridersDelta,
      cash,
      projectsOpened,
      board,
      approval,
      avgTrust,
      quartersServed,
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
