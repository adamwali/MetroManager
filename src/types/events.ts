import type { QuarterIndex } from './scalars';

/**
 * Event system. Per design doc §0 (P5, telegraph), §4 (priority inbox),
 * and 03-event-catalogue.md.
 *
 * Templates are static data (the catalogue). ActiveEvents are state — the
 * inbox of events surfaced to the player but not yet responded to. Choices
 * carry both immediate effects and queued delayed consequences.
 */

export type EventId = string;

export type EventCategory =
  | 'premier_pressure'
  | 'federal_pressure'
  | 'mayor_city'
  | 'crosslinx_contractor'
  | 'operations_crisis'
  | 'construction_crisis'
  | 'auditor_oversight'
  | 'consulting_pressure'
  | 'internal_politics'
  | 'funding_renegotiation'
  | 'election'
  | 'bond_market'
  | 'demographics_community'
  | 'climate_environmental'
  | 'technology'
  | 'media'
  | 'major_capital_decision'
  | 'endgame'
  | 'disruptor_gaffe';

/** A side-effect spec attached to a choice. Engine interprets these into state mutations. */
export type EventEffect =
  | { kind: 'cash'; delta: number }
  | { kind: 'governmentTrust'; governmentId: 'ottawa' | 'queensPark' | 'cityHall'; delta: number }
  | { kind: 'characterRelationship'; characterId: string; delta: number }
  | { kind: 'characterTolerance'; characterId: string; delta: number }
  | { kind: 'engineVar'; name: string; delta: number }
  | { kind: 'boardConfidence'; delta: number; reason: string }
  | { kind: 'publicApproval'; delta: number }
  | { kind: 'projectAdvance'; projectId: string; quartersDelta: number }
  | { kind: 'projectCostDelta'; projectId: string; cashDelta: number }
  | { kind: 'queueDelayedEvent'; eventId: EventId; firesAt: QuarterIndex };

export interface EventChoice {
  id: string;
  /** Player-facing label. */
  label: string;
  /** One-line tradeoff summary in plain English. UI displays under the label. */
  tradeoff: string;
  effects: EventEffect[];
}

/** Static template — lives in the event catalogue, not in GameState. */
export interface EventTemplate {
  id: EventId;
  category: EventCategory;
  /** Character id of the actor delivering this event. */
  actorCharacterId?: string;
  headline: string;
  body: string;
  choices: EventChoice[];
  /** Telegraph signal — surfaces as news 2-4 quarters before the event fires. */
  telegraph?: {
    headline: string;
    body: string;
    quartersBefore: number;
  };
}

/** Live event sitting in the player's inbox awaiting response. */
export interface ActiveEvent {
  templateId: EventId;
  firedAt: QuarterIndex;
  /** Resolved actor character id at fire time (templates can have variant actors). */
  actorCharacterId?: string;
  /** Urgency 0-100. Mission Control inbox filters by this. */
  urgency: number;
}

export interface DelayedConsequence {
  /** Template id of the event to fire. */
  templateId: EventId;
  firesAt: QuarterIndex;
  /** Why this is queued — for action-log trace-back. */
  cause: string;
}
