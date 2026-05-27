import type { GameState } from '@/types/gameState';
import type { Agency, AgencyId } from '@/types/agency';
import type {
  DirectorCharacter,
  DirectorDoctrine,
} from '@/types/characters';
import { score } from '@/types/scalars';

/**
 * Director tolerance mechanic. Phase 6.2.2.
 *
 * Each agency director has a doctrine (reliabilityEngineer / ridershipMaximizer
 * / costDiscipline / equityFocus / modernization) and a tolerance score 0-100
 * tracking how much your decisions align with their doctrine.
 *
 * Per quarter:
 *   - Decisions that ALIGN with their doctrine: +2 tolerance
 *   - Decisions that VIOLATE their doctrine: -8 tolerance
 *   - No relevant decisions: +1 tolerance (slow regen)
 *   - Tolerance < 15: "considering quitting" — informational warning
 *   - Tolerance reaches 0: director quits → EV050 fires, agency penalties apply
 *
 * Misalignment signals (per doctrine, evaluated each quarter):
 *
 * - reliabilityEngineer (TTC director Ramanathan):
 *     Reliability < 50 → -8 tolerance
 *     Avg maintenance below required → -4 tolerance
 *     Reliability ≥ 80 → +2 tolerance (her happy place)
 *
 * - ridershipMaximizer (GO director Okafor):
 *     Frequency policy 'reduced' on GO → -8 tolerance
 *     GO ridership growing > 2%/Q → +2 tolerance
 *
 * - costDiscipline (UP director Chen):
 *     UP opex grew this Q → -4 tolerance
 *     UP opex shrunk → +2 tolerance
 */

const DIRECTOR_BY_AGENCY: Record<AgencyId, string> = {
  ttc: 'c_ttc_director',
  go: 'c_go_director',
  up: 'c_up_director',
};

function evaluateAlignment(
  doctrine: DirectorDoctrine,
  agency: Agency,
  prevOpex: number,
  prevRiders: number,
): number {
  const reliability = agency.subsystems.length === 0
    ? 100
    : agency.subsystems.reduce((acc, s) => acc + (s.condition as unknown as number), 0) /
      agency.subsystems.length;
  const opex = agency.lastQuarterOpex as unknown as number;
  const riders = agency.dailyRiders as unknown as number;
  const ridersGrowthPct = prevRiders > 0 ? (riders - prevRiders) / prevRiders : 0;

  switch (doctrine) {
    case 'reliabilityEngineer': {
      if (reliability < 50) return -8;
      if (reliability >= 80) return 2;
      return 1;
    }
    case 'ridershipMaximizer': {
      if (agency.operatingParams.frequencyPolicy === 'reduced') return -8;
      if (ridersGrowthPct > 0.02) return 2;
      return 1;
    }
    case 'costDiscipline': {
      if (opex > prevOpex * 1.02) return -4;
      if (opex < prevOpex * 0.99) return 2;
      return 1;
    }
    case 'equityFocus':
    case 'modernization':
      return 1; // not yet observable in engine state
  }
}

/**
 * Tick director tolerance for one quarter. Pure. Returns updated state.
 * Should be called from endTurn after all agency mutations land.
 */
export function tickDirectorTolerance(
  state: GameState,
  prevAgencies: Record<AgencyId, { opex: number; riders: number }>,
): GameState {
  let next = state;
  for (const agencyId of ['ttc', 'go', 'up'] as const) {
    const characterId = DIRECTOR_BY_AGENCY[agencyId];
    const character = next.characters[characterId];
    if (!character || character.role !== 'director_operating') continue;
    const dir = character as DirectorCharacter;
    const prev = prevAgencies[agencyId];
    const delta = evaluateAlignment(
      dir.doctrine,
      next.agencies[agencyId],
      prev.opex,
      prev.riders,
    );
    const newTolerance = Math.max(0, Math.min(100, (dir.tolerance as unknown as number) + delta));
    if (newTolerance === (dir.tolerance as unknown as number)) continue;
    next = {
      ...next,
      characters: {
        ...next.characters,
        [characterId]: {
          ...dir,
          tolerance: score(newTolerance),
        },
      },
    };
  }
  return next;
}

/** Read snapshot of opex + riders per agency for next-quarter comparison. */
export function snapshotAgenciesForTolerance(
  state: GameState,
): Record<AgencyId, { opex: number; riders: number }> {
  return {
    ttc: {
      opex: state.agencies.ttc.lastQuarterOpex as unknown as number,
      riders: state.agencies.ttc.dailyRiders as unknown as number,
    },
    go: {
      opex: state.agencies.go.lastQuarterOpex as unknown as number,
      riders: state.agencies.go.dailyRiders as unknown as number,
    },
    up: {
      opex: state.agencies.up.lastQuarterOpex as unknown as number,
      riders: state.agencies.up.dailyRiders as unknown as number,
    },
  };
}
