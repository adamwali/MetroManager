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
}
