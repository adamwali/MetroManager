import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '@engine/createInitialGameState';
import { endTurn } from '@engine/endTurn';
import { resolveEventChoice } from '@engine/events/firing';
import { publicLobby } from '@engine/politicalActions';
import { buildTrace, METRIC_LABEL } from './trace';

describe('trace: cash', () => {
  it('surfaces quarter_summary entries with cashDelta as magnitude', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 3; i++) s = endTurn(s);
    const trace = buildTrace(s, 'cash');
    expect(trace.length).toBeGreaterThan(0);
    const summaries = trace.filter((t) => t.source === 'quarter');
    expect(summaries.length).toBe(3);
    // Each should have a magnitude (the cash delta)
    for (const t of summaries) {
      expect(t.magnitude).toBeDefined();
    }
  });

  it('newest first', () => {
    let s = createInitialGameState(0);
    for (let i = 0; i < 5; i++) s = endTurn(s);
    const trace = buildTrace(s, 'cash');
    expect(trace[0]!.quarter).toBeGreaterThan(trace[trace.length - 1]!.quarter);
  });
});

describe('trace: trust', () => {
  it('publicLobby action surfaces with +6 magnitude', () => {
    let s = createInitialGameState(0);
    const r = publicLobby(s, 'ottawa');
    s = r.state;
    const trace = buildTrace(s, 'trust:ottawa');
    const lobbyEntry = trace.find((t) => t.source === 'action');
    expect(lobbyEntry).toBeDefined();
    expect(lobbyEntry?.magnitude).toBe(6);
  });

  it('lobbying ottawa does not surface for queensPark trust trace', () => {
    let s = createInitialGameState(0);
    s = publicLobby(s, 'ottawa').state;
    const traceQP = buildTrace(s, 'trust:queensPark');
    expect(traceQP.find((t) => t.source === 'action')).toBeUndefined();
  });

  it('player_decision extracts trust effect magnitude from chosen branch', () => {
    let s = createInitialGameState(0);
    // Manually plant an event in the inbox so we can resolve it
    s = {
      ...s,
      inbox: [
        {
          templateId: 'EV017_mayorFareFreezePreElection',
          firedAt: s.quarter,
          urgency: 70,
        },
      ],
    };
    const r = resolveEventChoice(s, 'EV017_mayorFareFreezePreElection', 'public_pledge');
    s = r.state;
    const trace = buildTrace(s, 'trust:cityHall');
    const decisionEntry = trace.find((t) => t.source === 'decision');
    expect(decisionEntry).toBeDefined();
    // public_pledge gives +15 City Hall trust
    expect(decisionEntry?.magnitude).toBe(15);
  });
});

describe('trace: standing order auto-actions', () => {
  it('standing-order lobby is tagged with source=standingOrder', async () => {
    const { addStandingOrder } = await import('@engine/standingOrderActions');
    const { score } = await import('@/types/scalars');
    let s = createInitialGameState(0);
    s = {
      ...s,
      politics: {
        ...s.politics,
        ottawa: { ...s.politics.ottawa, trust: score(30) },
      },
    };
    s = addStandingOrder(s, {
      kind: 'autoLobbyOnTrustDrop',
      governmentId: 'ottawa',
      trustThreshold: 40,
      actionKind: 'publicLobby',
      enabled: true,
    });
    s = endTurn(s);
    const trace = buildTrace(s, 'trust:ottawa');
    const standingEntry = trace.find((t) => t.source === 'standingOrder');
    expect(standingEntry).toBeDefined();
  });
});

describe('METRIC_LABEL', () => {
  it('has labels for all trace metrics', () => {
    expect(METRIC_LABEL.cash).toBeDefined();
    expect(METRIC_LABEL['trust:ottawa']).toBeDefined();
    expect(METRIC_LABEL.boardConfidence).toBeDefined();
  });
});
