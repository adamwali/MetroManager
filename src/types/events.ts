import type { AgencyId } from './agency';
import type { CeoArchetype } from './ceo';
import type { GovernmentId } from './politics';
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

/**
 * State predicate. Used for two things:
 *   1. Conditional event firing (when is this event eligible to fire?)
 *   2. Branch gating (which choice options are visible to this player?)
 *
 * Discriminated union over kinds, with `and`/`or` for composition.
 */
export type EventPredicate =
  | { kind: 'ceoArchetype'; archetype: CeoArchetype }
  | { kind: 'trust'; gov: GovernmentId; gte?: number; lte?: number }
  | { kind: 'cash'; gte?: number; lte?: number }
  | { kind: 'board'; gte?: number; lte?: number }
  | { kind: 'publicApproval'; gte?: number; lte?: number }
  | { kind: 'engineers'; gte?: number; lte?: number }
  | { kind: 'templates'; gte?: number; lte?: number }
  | { kind: 'nimbyOrganization'; gte?: number; lte?: number }
  | { kind: 'openBooks'; equals: boolean }
  | { kind: 'reliability'; agency: AgencyId; gte?: number; lte?: number }
  | { kind: 'riders'; agency: AgencyId; gte?: number; lte?: number }
  | { kind: 'quarter'; gte?: number; lte?: number }
  | { kind: 'projectFundingShortfall' }
  | { kind: 'directorTolerance'; gte?: number; lte?: number }
  | { kind: 'and'; predicates: EventPredicate[] }
  | { kind: 'or'; predicates: EventPredicate[] }
  | { kind: 'not'; predicate: EventPredicate };

/** A side-effect spec attached to a choice. Engine interprets these into state mutations. */
export type EventEffect =
  | { kind: 'cash'; deltaM: number }
  | { kind: 'governmentTrust'; gov: GovernmentId; delta: number }
  | { kind: 'boardConfidence'; delta: number; reason: string }
  | { kind: 'publicApproval'; delta: number }
  | { kind: 'engineers'; delta: number }
  | { kind: 'templates'; delta: number }
  | { kind: 'nimbyOrganization'; delta: number }
  | { kind: 'crosslinxLeverage'; delta: number }
  | { kind: 'consultantAlignment'; delta: number }
  | { kind: 'opex'; agency: AgencyId; deltaM: number }
  | { kind: 'fareRevenue'; agency: AgencyId; deltaM: number }
  | { kind: 'reliability'; agency: AgencyId; delta: number }
  | { kind: 'ridership'; agency: AgencyId; delta: number }
  | { kind: 'queueDelayedEffect'; quartersOut: number; effects: EventEffect[]; cause: string }
  | { kind: 'queueDelayedEvent'; eventId: EventId; quartersOut: number; cause: string }
  | { kind: 'renegotiateAllowance'; strategy: 'accept' | 'aggressive' | 'data-driven' }
  | {
      kind: 'addObligation';
      obligationId: string;
      obligationKind: 'fareFreezePledge';
      agencyId: 'ttc' | 'go' | 'up';
      durationQuarters: number;
      costOfBreaking: EventEffect[];
      breakingDescription: string;
    };

export interface EventChoice {
  id: string;
  /** Player-facing label. */
  label: string;
  /** One-line tradeoff summary in plain English. UI displays under the label. */
  tradeoff: string;
  /** If set, choice is only shown when predicate matches state (archetype-flavored options). */
  requires?: EventPredicate;
  effects: EventEffect[];
}

/** How does this event get into the inbox? */
export type EventTrigger =
  | { kind: 'scheduled'; quarters: number[] }
  | { kind: 'conditional'; predicate: EventPredicate; cooldownQuarters?: number }
  | { kind: 'random'; baseWeight: number; predicate?: EventPredicate; cooldownQuarters?: number };

/**
 * Event display kind. Phase 3.2.
 *
 * - `decision`: classic event with branches; lands in inbox; player picks a choice
 * - `informational`: news-rail-only entry, no choices. Used for election results,
 *   milestones, telegraphs ("oncoming event") flavor, etc. Never blocks End Turn.
 */
export type EventDisplayKind = 'decision' | 'informational';

/** Static template — lives in the event catalogue, not in GameState. */
export interface EventTemplate {
  id: EventId;
  category: EventCategory;
  trigger: EventTrigger;
  /** Decision (inbox) vs informational (news rail only). Defaults to 'decision'. */
  displayKind?: EventDisplayKind;
  /** Headline outlet/voice prefix for newsroom-style display ("Star:", "CBC:", "Internal memo:"). */
  outlet?: string;
  /** Character id of the actor delivering this event (optional). */
  actorCharacterId?: string;
  headline: string;
  body: string;
  /** For informational kind: empty array. */
  choices: EventChoice[];
  /** Urgency 0-100 when fired — controls inbox sort order. */
  urgency: number;
  /** Optional flag: if true, all branches have a meaningful downside ("no good options" event per §0 P5). */
  noGoodOptions?: boolean;
  /** Telegraph signal — surfaces as news 2-4 quarters before the event fires. */
  telegraph?: {
    headline: string;
    body: string;
    /** How many quarters early to surface the telegraph. */
    quartersBefore: number;
    /** Outlet attribution (defaults to template outlet). */
    outlet?: string;
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
  /** Quarter the consequence resolves at. */
  firesAt: QuarterIndex;
  /** Why this is queued — for action-log trace-back. */
  cause: string;
  /** Either fire a follow-up event template, or apply raw effects. */
  payload:
    | { kind: 'event'; templateId: EventId }
    | { kind: 'effects'; effects: EventEffect[] };
}
