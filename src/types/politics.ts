import type { QuarterIndex, Score100 } from './scalars';

/**
 * Three-government political model. Per design doc §6.
 *
 * Each government is an independent simulation: trust, election cycle,
 * cabinet composition, policy agenda. Per-politician relationships live
 * on the Character type (see characters.ts), referenced here only by id.
 */

export type GovernmentId = 'ottawa' | 'queensPark' | 'cityHall';

export type CanadianParty = 'liberal' | 'conservative' | 'ndp' | 'green' | 'other';

/**
 * Per-action cooldowns. Each action has a quarter at which it becomes
 * available again. If absent, the action is currently available.
 *
 * - `publicLobby`: 4Q cooldown, +5 to +10 trust, -5 public approval
 * - `quietPitch`: 3Q cooldown, +3 to +5 trust, no public optics cost
 * - `adHocFunding`: 8Q cooldown, cash injection $50M-$300M, -5 to -10 trust
 * - `callInFavor`: 16Q cooldown, Insider-only, big payoff
 */
export type PoliticalActionKind =
  | 'publicLobby'
  | 'quietPitch'
  | 'adHocFunding'
  | 'callInFavor';

export type PoliticalActionCooldowns = Partial<Record<PoliticalActionKind, QuarterIndex>>;

export interface Government {
  id: GovernmentId;
  partyInPower: CanadianParty;
  /** 0-100. Drift bidirectionally toward 40 each quarter. Starts at 50 (adjusted by CEO archetype). */
  trust: Score100;
  /** Quarter at which the next election fires. */
  nextElectionAt: QuarterIndex;
  /** Quarter at which the next 3-year funding renegotiation fires. Independent of elections. */
  nextRenegotiationAt: QuarterIndex;
  /** Polling support for the party in power (0-100). Feeds election flip math (Phase 6.1). */
  approval: Score100;
  /** Named cabinet member / minister IDs. Populated from Character entries. */
  cabinetCharacterIds: string[];
  /** Named opposition critic IDs. */
  oppositionCharacterIds: string[];
  /** Per-action cooldowns. Empty if all actions available. */
  actionCooldowns: PoliticalActionCooldowns;
}

export type Politics = Record<GovernmentId, Government>;
