import type { GameState } from '@/types/gameState';
import type { ActionLogEntry } from '@/types/actionLog';
import { eventTemplateById } from '@engine/events/templates';

/**
 * Trace ("why did this happen?") query. Phase 8.6.
 *
 * Given a current state and a metric the player clicked, returns a list of
 * recent action-log entries that plausibly contributed to that metric,
 * with magnitude when computable. Entries returned newest-first.
 *
 * Magnitude computation is best-effort:
 *   - quarter_summary: pulls direct numbers from breakdown
 *   - player_decision: re-reads template + branch effects to derive impact
 *   - player_action: parses the action label (e.g., 'publicLobby:ottawa') +
 *     known action effects (politicalActions.ts)
 *   - event_informational: surfaced for elections (no precise delta;
 *     marker only)
 *
 * Entries with no computable magnitude are still shown — the summary text
 * gives context even when we can't put a number on the contribution.
 */

export type TraceMetric =
  | 'cash'
  | 'trust:ottawa'
  | 'trust:queensPark'
  | 'trust:cityHall'
  | 'boardConfidence'
  | 'publicApproval'
  | 'totalRiders';

export interface TraceEntry {
  id: string;
  quarter: number;
  /** Source kind for UI styling. */
  source: 'quarter' | 'decision' | 'action' | 'event' | 'telegraph' | 'standingOrder' | 'system';
  /** Headline / summary text. */
  summary: string;
  /** Signed impact on the metric, if computable. Undefined when unknown. */
  magnitude?: number;
}

const TRUST_GOV_FOR: Record<string, 'ottawa' | 'queensPark' | 'cityHall'> = {
  'trust:ottawa': 'ottawa',
  'trust:queensPark': 'queensPark',
  'trust:cityHall': 'cityHall',
};

/** Static action-cost table for the few political-action kinds. */
const POLITICAL_ACTION_TRUST_EFFECTS: Record<string, number> = {
  publicLobby: 6,
  quietPitch: 3,
  adHocFunding: -8,
  callInFavor: 5,
};

const POLITICAL_ACTION_APPROVAL_EFFECTS: Record<string, number> = {
  publicLobby: -5,
};

function entryMatches(entry: ActionLogEntry, metric: TraceMetric): TraceEntry | null {
  const q = entry.quarter as unknown as number;
  switch (entry.kind) {
    case 'quarter_summary': {
      if (metric === 'cash') {
        return {
          id: entry.id,
          quarter: q,
          source: 'quarter',
          summary: entry.summary,
          magnitude: entry.cashDelta,
        };
      }
      if (metric === 'totalRiders') {
        return {
          id: entry.id,
          quarter: q,
          source: 'quarter',
          summary: entry.summary,
          magnitude: entry.ridersDelta,
        };
      }
      return null;
    }
    case 'player_decision': {
      // Re-evaluate the chosen branch effects to extract this metric
      const template = eventTemplateById(entry.eventTemplateId);
      if (!template) {
        return {
          id: entry.id,
          quarter: q,
          source: 'decision',
          summary: entry.summary,
        };
      }
      const choice = template.choices.find((c) => c.id === entry.choiceId);
      if (!choice) {
        return {
          id: entry.id,
          quarter: q,
          source: 'decision',
          summary: entry.summary,
        };
      }
      const magnitude = extractMagnitude(choice.effects, metric);
      if (magnitude === undefined) return null;
      return {
        id: entry.id,
        quarter: q,
        source: 'decision',
        summary: entry.summary,
        magnitude,
      };
    }
    case 'player_action': {
      const isStandingOrder =
        entry.cause.kind === 'system' && entry.cause.system === 'standingOrder';
      const source: TraceEntry['source'] = isStandingOrder ? 'standingOrder' : 'action';
      // Action strings come in two shapes:
      //   - direct: 'publicLobby:ottawa'
      //   - via standing order: 'autoLobby:ottawa:publicLobby'
      // Normalize so we extract [innerActionKind, gov].
      const parts = entry.action.split(':');
      let innerKind: string | undefined;
      let target: string | undefined;
      if (parts[0]?.startsWith('auto')) {
        // standing-order shape — gov is parts[1], inner action is parts[2]
        target = parts[1];
        innerKind = parts[2] ?? parts[0]; // fall back to outer if no inner
      } else {
        innerKind = parts[0];
        target = parts[1];
      }
      if (!innerKind) {
        return { id: entry.id, quarter: q, source, summary: entry.summary };
      }
      const targetGov = TRUST_GOV_FOR[metric];
      if (targetGov && target === targetGov) {
        const trustDelta = POLITICAL_ACTION_TRUST_EFFECTS[innerKind];
        if (trustDelta !== undefined) {
          return {
            id: entry.id,
            quarter: q,
            source,
            summary: entry.summary,
            magnitude: trustDelta,
          };
        }
      }
      if (metric === 'publicApproval') {
        const approvalDelta = POLITICAL_ACTION_APPROVAL_EFFECTS[innerKind];
        if (approvalDelta !== undefined) {
          return {
            id: entry.id,
            quarter: q,
            source,
            summary: entry.summary,
            magnitude: approvalDelta,
          };
        }
      }
      // Other actions (refi, issueOperatingBond, maintenance, etc.) —
      // surface without magnitude (cash impact tracked in quarter_summary)
      if (metric === 'cash') {
        return { id: entry.id, quarter: q, source, summary: entry.summary };
      }
      return null;
    }
    case 'event_fired': {
      // Event landed in inbox; no direct impact on metric until resolved
      // Show only for "recent context" filters — skip for metric-attributing trace
      return null;
    }
    case 'event_telegraph': {
      // Early warning; no impact
      return null;
    }
    case 'event_informational': {
      // Elections: shift trust deterministically (handled in firing)
      if (
        metric.startsWith('trust:') &&
        (entry.eventTemplateId === 'EV032_federalElection' ||
          entry.eventTemplateId === 'EV033_provincialElection' ||
          entry.eventTemplateId === 'EV034_cityElection')
      ) {
        const gov = TRUST_GOV_FOR[metric];
        const matches =
          (gov === 'ottawa' && entry.eventTemplateId === 'EV032_federalElection') ||
          (gov === 'queensPark' && entry.eventTemplateId === 'EV033_provincialElection') ||
          (gov === 'cityHall' && entry.eventTemplateId === 'EV034_cityElection');
        if (matches) {
          return {
            id: entry.id,
            quarter: q,
            source: 'event',
            summary: entry.summary,
            // Magnitude is randomized at fire-time; we can't recover it.
            // Surface entry without precise magnitude.
          };
        }
      }
      return null;
    }
  }
}

function extractMagnitude(
  effects: Array<{
    kind: string;
    gov?: string;
    deltaM?: number;
    delta?: number;
  }>,
  metric: TraceMetric,
): number | undefined {
  let total = 0;
  let found = false;
  for (const e of effects) {
    if (metric === 'cash' && e.kind === 'cash' && typeof e.deltaM === 'number') {
      total += e.deltaM;
      found = true;
    } else if (metric === 'boardConfidence' && e.kind === 'boardConfidence' && typeof e.delta === 'number') {
      total += e.delta;
      found = true;
    } else if (metric === 'publicApproval' && e.kind === 'publicApproval' && typeof e.delta === 'number') {
      total += e.delta;
      found = true;
    } else if (
      metric.startsWith('trust:') &&
      e.kind === 'governmentTrust' &&
      e.gov === TRUST_GOV_FOR[metric] &&
      typeof e.delta === 'number'
    ) {
      total += e.delta;
      found = true;
    }
  }
  return found ? total : undefined;
}

export function buildTrace(state: GameState, metric: TraceMetric, limit = 20): TraceEntry[] {
  const result: TraceEntry[] = [];
  // Walk reverse so newest first
  for (let i = state.actionLog.length - 1; i >= 0 && result.length < limit; i--) {
    const entry = state.actionLog[i]!;
    const traced = entryMatches(entry, metric);
    if (traced) result.push(traced);
  }
  return result;
}

export const METRIC_LABEL: Record<TraceMetric, string> = {
  cash: 'Cash',
  'trust:ottawa': 'Ottawa trust',
  'trust:queensPark': "Queen's Park trust",
  'trust:cityHall': 'City Hall trust',
  boardConfidence: 'Board confidence',
  publicApproval: 'Public approval',
  totalRiders: 'Daily riders',
};
