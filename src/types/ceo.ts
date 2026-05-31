/**
 * CEO archetype. Per design doc §7. Selected at game start; immutable
 * thereafter. Modifies starting trust scores, engineering efficiency, and
 * some per-quarter mechanics. Engine reads archetype at endTurn and at
 * starting-state construction.
 */

export type CeoArchetype =
  | 'steadyOperator'
  | 'internationalTechnocrat'
  | 'insider'
  | 'disruptor'
  | 'coalitionBuilder';

export interface Ceo {
  archetype: CeoArchetype;
  /** Display name. Generated or provided at new-game flow. */
  name: string;
  /** Optional portrait reference (asset id). */
  portraitId?: string;
  /**
   * Name of the transit authority the player leads. Chosen at new-game.
   * Defaults to "GTTA". Interpolated into event copy via {agencyName} and
   * shown in the news ticker. Phase 10.11.
   */
  agencyName?: string;
}
