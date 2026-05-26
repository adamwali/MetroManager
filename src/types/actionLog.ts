import type { QuarterIndex } from './scalars';

/**
 * Action log. Per design doc §0 (P2 — traceable consequences) and
 * DECISIONS.md (granularity decision: log player decisions + actions +
 * event firings + quarter summaries; not per-tick decay).
 *
 * The UI's "why did this happen?" affordance walks back through this log
 * via `causedById` to render the chain of causes.
 */

export type ActionLogId = string;

export type ActionCause =
  | { kind: 'player' }
  | { kind: 'event'; eventTemplateId: string; eventActiveId: ActionLogId }
  | { kind: 'system'; system: 'endTurn' | 'standingOrder' | 'macro' | 'demographic' | 'climate' };

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
      kind: 'quarter_summary';
      id: ActionLogId;
      quarter: QuarterIndex;
      cause: ActionCause;
      causedById?: ActionLogId;
      /** Net cash delta this quarter, $M. */
      cashDelta: number;
      /** Daily-rider delta this quarter. */
      ridersDelta: number;
      summary: string;
    };

export type ActionLog = ActionLogEntry[];
