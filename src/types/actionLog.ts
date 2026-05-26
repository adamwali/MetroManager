import type { AgencyId } from './agency';
import type { QuarterIndex } from './scalars';

/**
 * Action log. Per design doc §0 (P2 — traceable consequences) and
 * DECISIONS.md (granularity: log player decisions, player actions, event
 * firings, and one quarter_summary per endTurn; rich breakdown lives on
 * the quarter_summary).
 *
 * The "why did this happen?" UI (Phase 8.6) walks back through this log
 * via `causedById` to render the chain of causes.
 */

export type ActionLogId = string;

export type ActionCause =
  | { kind: 'player' }
  | { kind: 'event'; eventTemplateId: string; eventActiveId: ActionLogId }
  | { kind: 'system'; system: 'endTurn' | 'standingOrder' | 'macro' | 'demographic' | 'climate' };

/**
 * Rich breakdown attached to a quarter_summary entry. Captures the
 * per-mechanic contribution to that quarter's deltas so the UI can
 * explain *why* a number moved (e.g., "GO ridership dropped because
 * Ontario Line opened with -38k cannibalization").
 */
export interface QuarterSummaryBreakdown {
  cashFlow: {
    operatingAllowance: number;
    fareRevenue: number;
    operatingExpense: number;
    maintenance: number;
    debtService: number;
    refiFee: number;
    netDelta: number;
  };
  ridership: {
    perAgency: Record<
      AgencyId,
      {
        before: number;
        after: number;
        fromGrowth: number;
        fromReliabilityDrag: number;
        fromProjectPrimary: number; // e.g. OL ramping into TTC
        fromCannibalization: number; // riders the new line pulled away
      }
    >;
    systemBefore: number;
    systemAfter: number;
  };
  projects: {
    transitions: Array<{
      templateId: string;
      from: 'proposed' | 'under_construction';
      to: 'under_construction' | 'operating';
    }>;
    constructionDraws: Array<{
      templateId: string;
      drawn: number;
      remainingFunding: number;
    }>;
  };
  debt: {
    tranchesRefinanced: number;
    refiFee: number;
  };
}

export type ActionLogEntry =
  | {
      kind: 'player_decision';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      eventTemplateId: string;
      choiceId: string;
      summary: string;
    }
  | {
      kind: 'player_action';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      /** e.g. 'lobby_private', 'hire_engineer', 'refi_tranche', 'initiate_project'. */
      action: string;
      summary: string;
    }
  | {
      kind: 'event_fired';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      eventTemplateId: string;
      summary: string;
    }
  | {
      kind: 'event_telegraph';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      /** The event this telegraph is foretelling. */
      sourceEventTemplateId: string;
      /** Quarter the actual event is expected to fire. */
      expectedFireQuarter: QuarterIndex;
      outlet?: string;
      headline: string;
      body: string;
      summary: string;
    }
  | {
      kind: 'event_informational';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      eventTemplateId: string;
      outlet?: string;
      headline: string;
      body: string;
      summary: string;
    }
  | {
      kind: 'quarter_summary';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      cashDelta: number;
      ridersDelta: number;
      summary: string;
      breakdown: QuarterSummaryBreakdown;
    };

export type ActionLog = ActionLogEntry[];
