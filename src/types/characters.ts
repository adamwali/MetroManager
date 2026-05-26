import type { QuarterIndex, Score100 } from './scalars';
import type { GovernmentId } from './politics';

/**
 * Named characters with persistent memory. Per design doc §0 (P3), §6, §7,
 * and 04-toronto-data-and-characters.md.
 *
 * Each character has a relationship score (0-100, separate from any
 * government-level trust), an interaction history (structured records),
 * and role-specific data. Aggregates over the interaction history are
 * computed on demand by helper functions in the engine.
 */

export type CharacterRole =
  | 'politician_premier'
  | 'politician_mayor'
  | 'politician_minister'
  | 'politician_cabinet'
  | 'politician_critic'
  | 'staff_coo'
  | 'staff_cfo'
  | 'staff_engineering'
  | 'staff_deputy'
  | 'director_operating'
  | 'external_contractor'
  | 'external_journalist'
  | 'external_nimby'
  | 'external_consultant';

/**
 * Doctrines for operating directors (per §7).
 * Senior staff doctrines (engineeringExcellence, speedToDelivery) live separately,
 * not in this pool — they're descriptive, not a selection mechanic for directors.
 */
export type DirectorDoctrine =
  | 'ridershipMaximizer'
  | 'costDiscipline'
  | 'reliabilityEngineer'
  | 'equityFocus'
  | 'modernization';

export type SeniorStaffDoctrine =
  | 'engineeringExcellence'
  | 'speedToDelivery'
  | 'reliabilityEngineer'
  | 'costDiscipline';

/** One entry in a character's interaction history. */
export type InteractionKind =
  | 'event_choice'
  | 'lobby_privateMeeting'
  | 'lobby_publicEndorsement'
  | 'lobby_specificFavor'
  | 'lobby_threat'
  | 'favor_granted'
  | 'favor_refused'
  | 'public_action'
  | 'time_elapsed';

export interface InteractionRecord {
  quarter: QuarterIndex;
  kind: InteractionKind;
  /** Event id if the interaction came from an event response. */
  eventId?: string;
  /** Human-readable choice label, for "as you may recall..." flavor in future events. */
  choiceLabel?: string;
  /** Δ applied to relationship score by this interaction. */
  delta: number;
  note?: string;
}

interface CharacterBase {
  id: string;
  name: string;
  age: number;
  role: CharacterRole;
  /** Bio paragraphs for the character profile view. */
  bio: string[];
  /** 0-100 score with the player CEO, independent of any government trust. */
  relationship: Score100;
  interactions: InteractionRecord[];
  /** Open asks visible to player on the political/staff dashboard. */
  openAsks: string[];
  /** Quarter at which the per-politician global lobbying cooldown lifts. */
  lobbyingCooldownUntil?: QuarterIndex;
}

export interface PoliticalCharacter extends CharacterBase {
  role: Extract<
    CharacterRole,
    | 'politician_premier'
    | 'politician_mayor'
    | 'politician_minister'
    | 'politician_cabinet'
    | 'politician_critic'
  >;
  governmentId: GovernmentId;
}

export interface StaffCharacter extends CharacterBase {
  role: Extract<CharacterRole, 'staff_coo' | 'staff_cfo' | 'staff_engineering' | 'staff_deputy'>;
  doctrine: SeniorStaffDoctrine;
  /** 0-100 tolerance score (formerly 0-12; normalized in v3.1). 0 = quits. Starts at 60. */
  tolerance: Score100;
  /** Quarterly compensation, $M. Engine debits from opex. */
  compPerQuarter: number;
}

export interface DirectorCharacter extends CharacterBase {
  role: 'director_operating';
  doctrine: DirectorDoctrine;
  tolerance: Score100;
  compPerQuarter: number;
}

export interface ExternalCharacter extends CharacterBase {
  role: Extract<
    CharacterRole,
    'external_contractor' | 'external_journalist' | 'external_nimby' | 'external_consultant'
  >;
}

export type Character =
  | PoliticalCharacter
  | StaffCharacter
  | DirectorCharacter
  | ExternalCharacter;

export type Characters = Record<string, Character>;
