import { describe, expect, it } from 'vitest';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import {
  addStandingOrder,
  applyStandingOrders,
  removeStandingOrder,
  toggleStandingOrder,
} from './standingOrderActions';
import { cash, score } from '@/types/scalars';

describe('autoApproveMaintenanceBelow', () => {
  it('bumps under-funded subsystems to required tier', () => {
    let s = createInitialGameState(0);
    // Crash TTC rolling stock budget to under threshold
    s = {
      ...s,
      agencies: {
        ...s.agencies,
        ttc: {
          ...s.agencies.ttc,
          subsystems: s.agencies.ttc.subsystems.map((sub) =>
            sub.id === 'rollingStock' ? { ...sub, maintenanceBudget: cash(30) } : sub,
          ),
        },
      },
    };
    s = addStandingOrder(s, {
      kind: 'autoApproveMaintenanceBelow',
      thresholdMillions: cash(60),
      enabled: true,
    });
    const result = applyStandingOrders(s);
    const sub = result.state.agencies.ttc.subsystems.find((x) => x.id === 'rollingStock')!;
    expect(sub.maintenanceBudget as unknown as number).toBe(100); // TTC required = $100M
  });

  it('disabled rule is skipped', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      agencies: {
        ...s.agencies,
        ttc: {
          ...s.agencies.ttc,
          subsystems: s.agencies.ttc.subsystems.map((sub) =>
            sub.id === 'rollingStock' ? { ...sub, maintenanceBudget: cash(30) } : sub,
          ),
        },
      },
    };
    s = addStandingOrder(s, {
      kind: 'autoApproveMaintenanceBelow',
      thresholdMillions: cash(60),
      enabled: false,
    });
    const result = applyStandingOrders(s);
    const sub = result.state.agencies.ttc.subsystems.find((x) => x.id === 'rollingStock')!;
    expect(sub.maintenanceBudget as unknown as number).toBe(30); // unchanged
  });
});

describe('autoIssueOperatingBondsBelowCash', () => {
  it('issues a bond when cash falls below threshold', () => {
    let s = createInitialGameState(0);
    // Make cash low
    s = { ...s, cash: { ...s.cash, balance: cash(200) } };
    s = addStandingOrder(s, {
      kind: 'autoIssueOperatingBondsBelowCash',
      cashThresholdM: cash(500),
      amountM: cash(500),
      creditor: 'pension',
      enabled: true,
    });
    const result = applyStandingOrders(s);
    // Cash should have gone UP from the bond proceeds
    expect(result.state.cash.balance as unknown as number).toBe(700);
    // New tranche created
    expect(result.state.debt.tranches.some((t) => t.id.startsWith('t_op_'))).toBe(true);
  });

  it('does nothing when cash above threshold', () => {
    let s = createInitialGameState(0);
    s = addStandingOrder(s, {
      kind: 'autoIssueOperatingBondsBelowCash',
      cashThresholdM: cash(500),
      amountM: cash(500),
      creditor: 'pension',
      enabled: true,
    });
    const cashBefore = s.cash.balance as unknown as number;
    const result = applyStandingOrders(s);
    expect(result.state.cash.balance as unknown as number).toBe(cashBefore);
  });
});

describe('autoLobbyOnTrustDrop', () => {
  it('triggers lobby when trust below threshold', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      politics: {
        ...s.politics,
        ottawa: { ...s.politics.ottawa, trust: score(35) },
      },
    };
    const ottawaBefore = s.politics.ottawa.trust as unknown as number;
    s = addStandingOrder(s, {
      kind: 'autoLobbyOnTrustDrop',
      governmentId: 'ottawa',
      trustThreshold: 40,
      actionKind: 'publicLobby',
      enabled: true,
    });
    const result = applyStandingOrders(s);
    // Public lobby gives +6 trust
    expect(result.state.politics.ottawa.trust as unknown as number).toBe(ottawaBefore + 6);
  });

  it('does nothing if trust above threshold', () => {
    let s = createInitialGameState(0);
    s = addStandingOrder(s, {
      kind: 'autoLobbyOnTrustDrop',
      governmentId: 'ottawa',
      trustThreshold: 40,
      actionKind: 'publicLobby',
      enabled: true,
    });
    const ottawaBefore = s.politics.ottawa.trust as unknown as number;
    const result = applyStandingOrders(s);
    expect(result.state.politics.ottawa.trust as unknown as number).toBe(ottawaBefore);
  });
});

describe('autoTriageInboxBelowUrgency', () => {
  it('auto-resolves low-urgency events with first available branch', () => {
    let s = createInitialGameState(0);
    // Force an event into the inbox manually (low urgency)
    s = {
      ...s,
      inbox: [
        { templateId: 'EV006_provincialWindfall', firedAt: s.quarter, urgency: 30 },
      ],
    };
    s = addStandingOrder(s, {
      kind: 'autoTriageInboxBelowUrgency',
      minUrgency: 50,
      enabled: true,
    });
    const result = applyStandingOrders(s);
    expect(result.state.inbox.length).toBe(0); // auto-resolved
  });

  it('leaves high-urgency events alone', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      inbox: [
        { templateId: 'EV001_signalFailure', firedAt: s.quarter, urgency: 80 },
      ],
    };
    s = addStandingOrder(s, {
      kind: 'autoTriageInboxBelowUrgency',
      minUrgency: 50,
      enabled: true,
    });
    const result = applyStandingOrders(s);
    expect(result.state.inbox.length).toBe(1);
  });
});

describe('autoResolveEvent', () => {
  it('picks the chosen branch on matching event', () => {
    let s = createInitialGameState(0);
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
    s = addStandingOrder(s, {
      kind: 'autoResolveEvent',
      eventTemplateId: 'EV017_mayorFareFreezePreElection',
      choiceId: 'public_pledge',
      enabled: true,
    });
    const result = applyStandingOrders(s);
    expect(result.state.inbox.length).toBe(0);
    // pledge effects applied: +15 City Hall trust, +5 public approval
    expect(result.state.engineVars.publicApproval as unknown as number).toBeGreaterThan(
      s.engineVars.publicApproval as unknown as number,
    );
  });
});

describe('endTurn integration', () => {
  it('applies standing orders after events fire', () => {
    let s = createInitialGameState(0);
    // Force cash low so the safety-net order fires after one endTurn.
    s = { ...s, cash: { ...s.cash, balance: 400 as unknown as typeof s.cash.balance } };
    s = addStandingOrder(s, {
      kind: 'autoIssueOperatingBondsBelowCash',
      cashThresholdM: cash(500),
      amountM: cash(500),
      creditor: 'pension',
      enabled: true,
    });
    s = endTurn(s);
    const hasOpBond = s.debt.tranches.some((t) => t.id.startsWith('t_op_'));
    expect(hasOpBond).toBe(true);
  });

  it('logs auto-actions with cause=standingOrder', () => {
    let s = createInitialGameState(0);
    s = {
      ...s,
      agencies: {
        ...s.agencies,
        ttc: {
          ...s.agencies.ttc,
          subsystems: s.agencies.ttc.subsystems.map((sub) =>
            sub.id === 'rollingStock' ? { ...sub, maintenanceBudget: cash(20) } : sub,
          ),
        },
      },
    };
    s = addStandingOrder(s, {
      kind: 'autoApproveMaintenanceBelow',
      thresholdMillions: cash(50),
      enabled: true,
    });
    s = endTurn(s);
    const standingOrderEntries = s.actionLog.filter(
      (e) =>
        e.kind === 'player_action' &&
        e.cause.kind === 'system' &&
        e.cause.system === 'standingOrder',
    );
    expect(standingOrderEntries.length).toBeGreaterThan(0);
  });
});

describe('CRUD', () => {
  it('addStandingOrder appends', () => {
    const s = createInitialGameState(0);
    const next = addStandingOrder(s, {
      kind: 'autoApproveMaintenanceBelow',
      thresholdMillions: cash(50),
      enabled: true,
    });
    expect(next.standingOrders.length).toBe(s.standingOrders.length + 1);
  });

  it('removeStandingOrder filters by id', () => {
    let s = createInitialGameState(0);
    s = addStandingOrder(s, {
      kind: 'autoApproveMaintenanceBelow',
      thresholdMillions: cash(50),
      enabled: true,
    });
    const orderId = s.standingOrders[0]!.id;
    const next = removeStandingOrder(s, orderId);
    expect(next.standingOrders.find((o) => o.id === orderId)).toBeUndefined();
  });

  it('toggleStandingOrder flips enabled', () => {
    let s = createInitialGameState(0);
    s = addStandingOrder(s, {
      kind: 'autoApproveMaintenanceBelow',
      thresholdMillions: cash(50),
      enabled: true,
    });
    const orderId = s.standingOrders[0]!.id;
    const toggled = toggleStandingOrder(s, orderId);
    expect(toggled.standingOrders[0]!.enabled).toBe(false);
  });
});
