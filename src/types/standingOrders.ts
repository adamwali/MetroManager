import type { CashMillions } from './scalars';
import type { GovernmentId, PoliticalActionKind } from './politics';
import type { CreditorType } from './finance';

/**
 * Standing orders. Per design doc §0 (P8 — decision density management).
 *
 * Each standing order is a discriminated union by `kind`. The engine
 * iterates enabled orders at endTurn and applies the matching auto-actions
 * BEFORE the inbox is surfaced to the player. Auto-actions log
 * `player_action` entries with cause=`standingOrder` so the trace UI can
 * surface them.
 *
 * Phase 8.1 ships 5 rule types per repo-owner decision:
 *   1. autoApproveMaintenanceBelow — bumps any subsystem at <required
 *      tier up to required if maintenance budget below threshold
 *   2. autoTriageInboxBelowUrgency — events with urgency below the
 *      threshold get auto-resolved with their FIRST visible branch
 *   3. autoLobbyOnTrustDrop — when a gov's trust falls below threshold,
 *      run the chosen lobby action on the cooldown
 *   4. autoIssueOperatingBondsBelowCash — if cash falls below threshold,
 *      issue up to N $M of operating bonds from chosen creditor
 *   5. autoResolveEvent — for any inbox event matching templateId, pick
 *      the chosen branch automatically (skips inbox entirely)
 */

export type StandingOrderId = string;

export type StandingOrder =
  | {
      id: StandingOrderId;
      kind: 'autoApproveMaintenanceBelow';
      /** Subsystems with budget below this $M get bumped to required tier. */
      thresholdMillions: CashMillions;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoTriageInboxBelowUrgency';
      /** Events with urgency below this number auto-resolve with first branch. */
      minUrgency: number;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoLobbyOnTrustDrop';
      governmentId: GovernmentId;
      /** Trigger when trust falls below this. */
      trustThreshold: number;
      /** Which lobby action to run. */
      actionKind: PoliticalActionKind;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoIssueOperatingBondsBelowCash';
      /** Trigger when cash falls below this ($M). */
      cashThresholdM: CashMillions;
      /** How much to issue when triggered ($M). */
      amountM: CashMillions;
      creditor: CreditorType;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoResolveEvent';
      /** Event template id (e.g. 'EV017_mayorFareFreezePreElection'). */
      eventTemplateId: string;
      /** Branch id to auto-pick. */
      choiceId: string;
      enabled: boolean;
    };

export type StandingOrders = StandingOrder[];
