import type { Agencies } from './agency';
import type { ActionLog } from './actionLog';
import type { BoardConfidence } from './confidence';
import type { Ceo } from './ceo';
import type { Characters } from './characters';
import type { Cash, Debt } from './finance';
import type { ActiveEvent, DelayedConsequence } from './events';
import type { EngineVars } from './engineVars';
import type { GameOver, GameOverCounters } from './gameOver';
import type { ActiveObligation } from './obligations';
import type { OperatingAllowance } from './operatingAllowance';
import type { Politics } from './politics';
import type { Project } from './projects';
import type { RngSeeds } from './rng';
import type { QuarterIndex } from './scalars';
import type { StandingOrders } from './standingOrders';

/**
 * GameState. The root object. Fully serializable to JSON for save/load.
 *
 * The engine's `endTurn(state) → state` advances this by one quarter. UI
 * reads it; UI never mutates it. All mutations go through engine actions
 * that also append to `actionLog`.
 */
export interface GameState {
  /** Schema version. Bump on breaking changes; save loader migrates. */
  schemaVersion: 1;

  ceo: Ceo;
  /** Current quarter index. Q1 2026 = 0; Q4 2040 = 59 = end of campaign. */
  quarter: QuarterIndex;

  cash: Cash;
  debt: Debt;
  operatingAllowance: OperatingAllowance;
  politics: Politics;
  boardConfidence: BoardConfidence;

  agencies: Agencies;
  projects: Project[];
  characters: Characters;

  inbox: ActiveEvent[];
  delayedQueue: DelayedConsequence[];
  /** Active obligations (pledges) constraining future actions. */
  activeObligations: ActiveObligation[];

  standingOrders: StandingOrders;
  engineVars: EngineVars;
  rng: RngSeeds;

  actionLog: ActionLog;
  /** Monotonic counter for action log IDs. Bumped on every log append. */
  nextLogId: number;

  /** End-of-campaign result. Undefined while campaign is in progress. */
  gameOver?: GameOver;
  /** Running counters for game-over detection (consecutive-quarter rules). */
  gameOverCounters: GameOverCounters;
}
