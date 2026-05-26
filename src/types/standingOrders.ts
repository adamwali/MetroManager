import type { CashMillions } from './scalars';

/**
 * Standing orders. Per design doc §0 (P8 — decision density management).
 *
 * Each standing order is a discriminated union by `kind`. The engine
 * iterates active orders at the start of each quarter and applies the
 * matching auto-actions before the inbox is surfaced to the player.
 *
 * New rule = new kind + new handler in the engine. No predicate DSL.
 */

export type StandingOrderId = string;

export type StandingOrder =
  | {
      id: StandingOrderId;
      kind: 'autoApproveMaintenanceBelow';
      thresholdMillions: CashMillions;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoDeclineLowDemandStudies';
      /** Skip ridership studies on projects with median forecast below this many daily riders. */
      threshold: number;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'capQuarterlyCapexGrowthPct';
      /** Cap how much capex outflow grows quarter-over-quarter. 0.05 = 5%. */
      maxPct: number;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoTriageInboxBelowUrgency';
      /** Events with urgency below this number bypass the inbox. */
      minUrgency: number;
      enabled: boolean;
    }
  | {
      id: StandingOrderId;
      kind: 'autoRefiFloatingAboveSpread';
      /** Refi floating-rate debt when spread over BOC exceeds this many bp. */
      spreadBpThreshold: number;
      enabled: boolean;
    };

export type StandingOrders = StandingOrder[];
