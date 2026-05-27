import type { GameState } from '@/types/gameState';
import type { ActionLogEntry } from '@/types/actionLog';
import type { StandingOrder } from '@/types/standingOrders';
import { cash } from '@/types/scalars';
import { requiredMaintenanceFor } from './agencies';
import { setMaintenanceBudget } from './agencyActions';
import { executePoliticalAction } from './politicalActions';
import { issueOperatingBond } from './treasuryActions';
import { resolveEventChoice, visibleChoices } from './events/firing';
import { eventTemplateById } from './events/templates';

/**
 * Standing orders engine. Phase 8.1.
 *
 * `applyStandingOrders(state)` is called from endTurn AFTER event firing
 * but BEFORE the quarter_summary is composed — so auto-actions show up in
 * the action log of that quarter.
 *
 * Each rule type has its own handler. Handlers are pure; they return
 * { state, logEntries } and the runner concatenates them.
 */

export interface StandingOrderResult {
  state: GameState;
  newLogEntries: ActionLogEntry[];
}

/** Build a player_action log entry attributed to a standing order. */
function logStandingOrderAction(
  state: GameState,
  orderId: string,
  action: string,
  summary: string,
): ActionLogEntry {
  const id = `q${state.quarter as unknown as number}-${state.nextLogId}`;
  return {
    kind: 'player_action',
    id,
    quarter: state.quarter,
    cause: { kind: 'system', system: 'standingOrder' },
    causedById: orderId,
    action,
    summary: `[Standing order] ${summary}`,
  };
}

function appendLog(state: GameState, entry: ActionLogEntry): GameState {
  return {
    ...state,
    actionLog: [...state.actionLog, entry],
    nextLogId: state.nextLogId + 1,
  };
}

function applyOrder(state: GameState, order: StandingOrder): StandingOrderResult {
  if (!order.enabled) return { state, newLogEntries: [] };
  const newLogEntries: ActionLogEntry[] = [];
  let s = state;

  switch (order.kind) {
    case 'autoApproveMaintenanceBelow': {
      const threshold = order.thresholdMillions as unknown as number;
      for (const agencyId of ['ttc', 'go', 'up'] as const) {
        const required = requiredMaintenanceFor(agencyId);
        const agency = s.agencies[agencyId];
        for (const sub of agency.subsystems) {
          const budget = sub.maintenanceBudget as unknown as number;
          if (budget < threshold && budget < required) {
            const newBudget = required;
            s = setMaintenanceBudget(s, agencyId, sub.id, newBudget);
            const entry = logStandingOrderAction(
              s,
              order.id,
              `autoApproveMaintenance:${agencyId}:${sub.id}`,
              `Bumped ${agencyId} ${sub.id} maintenance from $${budget}M to $${newBudget}M`,
            );
            s = appendLog(s, entry);
            newLogEntries.push(entry);
          }
        }
      }
      return { state: s, newLogEntries };
    }

    case 'autoTriageInboxBelowUrgency': {
      // Auto-resolve inbox events with urgency below threshold
      const lowUrgencyEvents = s.inbox.filter((e) => e.urgency < order.minUrgency);
      for (const active of lowUrgencyEvents) {
        const tmpl = eventTemplateById(active.templateId);
        if (!tmpl) continue;
        const choices = visibleChoices(s, tmpl);
        if (choices.length === 0) continue;
        const firstChoice = choices[0]!;
        const result = resolveEventChoice(s, active.templateId, firstChoice.id);
        if (result.state !== s) {
          s = result.state;
          const entry = logStandingOrderAction(
            s,
            order.id,
            `autoTriageEvent:${active.templateId}`,
            `Auto-resolved low-urgency event "${tmpl.headline}" with "${firstChoice.label}"`,
          );
          s = appendLog(s, entry);
          newLogEntries.push(entry);
        }
      }
      return { state: s, newLogEntries };
    }

    case 'autoLobbyOnTrustDrop': {
      const trust = s.politics[order.governmentId].trust as unknown as number;
      if (trust >= order.trustThreshold) return { state: s, newLogEntries };
      const result = executePoliticalAction(s, order.governmentId, order.actionKind);
      if (result.state !== s) {
        s = result.state;
        const entry = logStandingOrderAction(
          s,
          order.id,
          `autoLobby:${order.governmentId}:${order.actionKind}`,
          `Auto-triggered ${order.actionKind} on ${order.governmentId} (trust ${trust} below ${order.trustThreshold})`,
        );
        s = appendLog(s, entry);
        newLogEntries.push(entry);
      }
      return { state: s, newLogEntries };
    }

    case 'autoIssueOperatingBondsBelowCash': {
      const cashOnHand = s.cash.balance as unknown as number;
      const threshold = order.cashThresholdM as unknown as number;
      if (cashOnHand >= threshold) return { state: s, newLogEntries };
      const result = issueOperatingBond(
        s,
        order.creditor,
        order.amountM as unknown as number,
      );
      if (result.state !== s) {
        s = result.state;
        const entry = logStandingOrderAction(
          s,
          order.id,
          `autoIssueBond:${order.creditor}`,
          `Auto-issued $${order.amountM as unknown as number}M operating bond (${order.creditor}); cash had fallen below $${threshold}M`,
        );
        s = appendLog(s, entry);
        newLogEntries.push(entry);
      }
      return { state: s, newLogEntries };
    }

    case 'autoResolveEvent': {
      const matching = s.inbox.filter((e) => e.templateId === order.eventTemplateId);
      for (const active of matching) {
        const tmpl = eventTemplateById(active.templateId);
        if (!tmpl) continue;
        const choice = tmpl.choices.find((c) => c.id === order.choiceId);
        if (!choice) continue;
        const result = resolveEventChoice(s, active.templateId, order.choiceId);
        if (result.state !== s) {
          s = result.state;
          const entry = logStandingOrderAction(
            s,
            order.id,
            `autoResolveEvent:${active.templateId}`,
            `Auto-resolved "${tmpl.headline}" with "${choice.label}"`,
          );
          s = appendLog(s, entry);
          newLogEntries.push(entry);
        }
      }
      return { state: s, newLogEntries };
    }
  }
}

/** Apply all enabled standing orders. Called from endTurn. */
export function applyStandingOrders(state: GameState): StandingOrderResult {
  let s = state;
  const allEntries: ActionLogEntry[] = [];
  for (const order of s.standingOrders) {
    const result = applyOrder(s, order);
    s = result.state;
    allEntries.push(...result.newLogEntries);
  }
  return { state: s, newLogEntries: allEntries };
}

// ============================================================================
// CRUD actions (for UI)
// ============================================================================

let nextOrderId = 1;
const newOrderId = (): string => `so_${Date.now()}_${nextOrderId++}`;

export function addStandingOrder(
  state: GameState,
  order: Omit<StandingOrder, 'id'>,
): GameState {
  const withId = { ...order, id: newOrderId() } as StandingOrder;
  return { ...state, standingOrders: [...state.standingOrders, withId] };
}

export function removeStandingOrder(state: GameState, orderId: string): GameState {
  return {
    ...state,
    standingOrders: state.standingOrders.filter((o) => o.id !== orderId),
  };
}

export function toggleStandingOrder(state: GameState, orderId: string): GameState {
  return {
    ...state,
    standingOrders: state.standingOrders.map((o) =>
      o.id === orderId ? { ...o, enabled: !o.enabled } : o,
    ),
  };
}

export function updateStandingOrder(
  state: GameState,
  orderId: string,
  patch: Partial<StandingOrder>,
): GameState {
  return {
    ...state,
    standingOrders: state.standingOrders.map((o) =>
      o.id === orderId ? ({ ...o, ...patch } as StandingOrder) : o,
    ),
  };
}

// Hint to suppress unused-import warnings on cash (used by type narrowing only)
export const _internal = { cash };
