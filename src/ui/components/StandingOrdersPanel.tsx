import { useState } from 'react';
import { useGameStore } from '@state/gameStore';
import type { StandingOrder } from '@/types/standingOrders';
import type { GovernmentId, PoliticalActionKind } from '@/types/politics';
import type { CreditorType } from '@/types/finance';
import { eventTemplateById } from '@engine/events/templates';
import { cash } from '@/types/scalars';

/**
 * Standing orders panel for Mission Control. Phase 8.1.
 *
 * Player creates rules; engine applies them automatically each endTurn.
 * Each rule is on/off-toggleable + removable. Add-rule UI is collapsed
 * by default to keep the panel compact.
 */

const KIND_LABEL: Record<StandingOrder['kind'], string> = {
  autoApproveMaintenanceBelow: 'Auto-approve maintenance',
  autoTriageInboxBelowUrgency: 'Auto-triage low-urgency events',
  autoLobbyOnTrustDrop: 'Auto-lobby on trust drop',
  autoIssueOperatingBondsBelowCash: 'Auto-issue bonds on cash crunch',
  autoResolveEvent: 'Auto-resolve specific event',
};

export function StandingOrdersPanel() {
  const orders = useGameStore((s) => s.state.standingOrders);
  const log = useGameStore((s) => s.state.actionLog);
  const currentQ = useGameStore((s) => s.state.quarter as unknown as number);
  const add = useGameStore((s) => s.addStandingOrder);
  const remove = useGameStore((s) => s.removeStandingOrder);
  const toggle = useGameStore((s) => s.toggleStandingOrder);
  const [showAdd, setShowAdd] = useState(false);

  // Phase 10.3: surface firings per order so the player knows when their
  // automations actually triggered. Walk action log filtered to
  // cause.system === 'standingOrder' + causedById matches order id.
  const firingsByOrderId = new Map<string, ReadonlyArray<{ quarter: number; summary: string }>>();
  for (const order of orders) {
    const firings = log
      .filter(
        (e) =>
          e.kind === 'player_action' &&
          e.cause.kind === 'system' &&
          e.cause.system === 'standingOrder' &&
          e.causedById === order.id,
      )
      .map((e) => ({
        quarter: e.quarter as unknown as number,
        summary: e.summary.replace(/^\[Standing order\] /, ''),
      }));
    firingsByOrderId.set(order.id, firings);
  }

  const addPreset = (key: 'safetyNet' | 'autoMaintenance' | 'trustGuard') => {
    if (key === 'safetyNet') {
      add({
        kind: 'autoIssueOperatingBondsBelowCash',
        cashThresholdM: cash(0),
        amountM: cash(500),
        creditor: 'pension',
        enabled: true,
      });
    } else if (key === 'autoMaintenance') {
      add({
        kind: 'autoApproveMaintenanceBelow',
        thresholdMillions: cash(80),
        enabled: true,
      });
    } else if (key === 'trustGuard') {
      add({
        kind: 'autoLobbyOnTrustDrop',
        governmentId: 'ottawa',
        trustThreshold: 40,
        actionKind: 'quietPitch',
        enabled: true,
      });
    }
  };

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Standing orders {orders.length > 0 && `(${orders.length})`}
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md border border-neutral-300 px-2 py-0.5 text-[11px] text-neutral-700 hover:bg-neutral-50"
        >
          {showAdd ? 'Close' : '+ Custom rule'}
        </button>
      </header>
      <p className="mt-1 text-[11px] text-neutral-500">
        Auto-actions applied each end-turn. Toggle off to pause without deleting.
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => addPreset('safetyNet')}
          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-800 hover:bg-blue-100"
          title="Auto-issue $500M pension bond when cash drops below $0"
        >
          + Safety net
        </button>
        <button
          type="button"
          onClick={() => addPreset('autoMaintenance')}
          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
          title="Bump any subsystem below $80M to required tier"
        >
          + Auto-maintain
        </button>
        <button
          type="button"
          onClick={() => addPreset('trustGuard')}
          className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-800 hover:bg-purple-100"
          title="Quiet pitch Ottawa when trust drops below 40"
        >
          + Trust guard
        </button>
      </div>

      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">
          No standing orders. Add one to automate routine decisions.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {orders.map((o) => {
            const firings = firingsByOrderId.get(o.id) ?? [];
            const thisQuarterCount = firings.filter((f) => f.quarter === currentQ).length;
            const totalCount = firings.length;
            const recent = firings.slice(-3).reverse();
            return (
              <li
                key={o.id}
                className={`rounded-md border p-2.5 ${
                  o.enabled
                    ? 'border-blue-200 bg-blue-50/30'
                    : 'border-neutral-200 bg-neutral-50/40 opacity-60'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{KIND_LABEL[o.kind]}</span>
                  <div className="flex items-baseline gap-1">
                    {thisQuarterCount > 0 && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                        FIRED {thisQuarterCount}× THIS Q
                      </span>
                    )}
                    {thisQuarterCount === 0 && totalCount > 0 && (
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">
                        {totalCount}× total
                      </span>
                    )}
                    {totalCount === 0 && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500">
                        idle
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      className="rounded px-2 py-0.5 text-[10px] font-medium text-neutral-700 hover:bg-neutral-100"
                    >
                      {o.enabled ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(o.id)}
                      className="rounded px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-neutral-600">{describeOrder(o)}</div>
                {recent.length > 0 && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-neutral-500 hover:text-neutral-700">
                      Recent firings
                    </summary>
                    <ul className="mt-1 space-y-0.5 border-l-2 border-blue-200 pl-2">
                      {recent.map((f, i) => (
                        <li key={i} className="text-[10px] text-neutral-600">
                          <span className="font-medium text-neutral-500">Q{f.quarter}</span>
                          {' · '}
                          {f.summary}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showAdd && <AddRuleForm onClose={() => setShowAdd(false)} />}
    </section>
  );
}

function describeOrder(o: StandingOrder): string {
  switch (o.kind) {
    case 'autoApproveMaintenanceBelow':
      return `Bump subsystems below $${o.thresholdMillions as unknown as number}M up to required tier`;
    case 'autoTriageInboxBelowUrgency':
      return `Auto-resolve events with urgency < ${o.minUrgency} (first available branch)`;
    case 'autoLobbyOnTrustDrop':
      return `Run ${o.actionKind} on ${o.governmentId} when trust < ${o.trustThreshold}`;
    case 'autoIssueOperatingBondsBelowCash':
      return `Issue $${o.amountM as unknown as number}M ${o.creditor} operating bond when cash < $${o.cashThresholdM as unknown as number}M`;
    case 'autoResolveEvent': {
      const tmpl = eventTemplateById(o.eventTemplateId);
      return `Pick "${o.choiceId}" on ${tmpl?.headline ?? o.eventTemplateId}`;
    }
  }
}

// ============================================================================
// Add rule form (collapsed by default)
// ============================================================================

type RuleKind = StandingOrder['kind'];

function AddRuleForm({ onClose }: { onClose: () => void }) {
  const add = useGameStore((s) => s.addStandingOrder);
  const [kind, setKind] = useState<RuleKind>('autoApproveMaintenanceBelow');
  const [threshold, setThreshold] = useState(50);
  const [urgency, setUrgency] = useState(40);
  const [govId, setGovId] = useState<GovernmentId>('ottawa');
  const [trustDrop, setTrustDrop] = useState(40);
  const [lobbyAction, setLobbyAction] = useState<PoliticalActionKind>('quietPitch');
  const [cashThreshold, setCashThreshold] = useState(0);
  const [bondAmount, setBondAmount] = useState(500);
  const [creditor, setCreditor] = useState<CreditorType>('pension');
  const [eventTemplateId, setEventTemplateId] = useState('EV017_mayorFareFreezePreElection');
  const [choiceId, setChoiceId] = useState('public_pledge');

  const handleAdd = () => {
    switch (kind) {
      case 'autoApproveMaintenanceBelow':
        add({
          kind: 'autoApproveMaintenanceBelow',
          thresholdMillions: cash(threshold),
          enabled: true,
        });
        break;
      case 'autoTriageInboxBelowUrgency':
        add({ kind: 'autoTriageInboxBelowUrgency', minUrgency: urgency, enabled: true });
        break;
      case 'autoLobbyOnTrustDrop':
        add({
          kind: 'autoLobbyOnTrustDrop',
          governmentId: govId,
          trustThreshold: trustDrop,
          actionKind: lobbyAction,
          enabled: true,
        });
        break;
      case 'autoIssueOperatingBondsBelowCash':
        add({
          kind: 'autoIssueOperatingBondsBelowCash',
          cashThresholdM: cash(cashThreshold),
          amountM: cash(bondAmount),
          creditor,
          enabled: true,
        });
        break;
      case 'autoResolveEvent':
        add({
          kind: 'autoResolveEvent',
          eventTemplateId,
          choiceId,
          enabled: true,
        });
        break;
    }
    onClose();
  };

  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50/30 p-3 space-y-3">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-neutral-500">Rule type</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as RuleKind)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          {(Object.keys(KIND_LABEL) as RuleKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {kind === 'autoApproveMaintenanceBelow' && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">
            Threshold ($M/Q per subsystem)
          </label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            className="num mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
      )}

      {kind === 'autoTriageInboxBelowUrgency' && (
        <div>
          <label className="text-[10px] uppercase tracking-wider text-neutral-500">
            Min urgency (events below auto-resolve)
          </label>
          <input
            type="number"
            value={urgency}
            onChange={(e) => setUrgency(Number(e.target.value) || 0)}
            className="num mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
      )}

      {kind === 'autoLobbyOnTrustDrop' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">Gov</label>
            <select
              value={govId}
              onChange={(e) => setGovId(e.target.value as GovernmentId)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="ottawa">Ottawa</option>
              <option value="queensPark">Queen's Park</option>
              <option value="cityHall">City Hall</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              Trust below
            </label>
            <input
              type="number"
              value={trustDrop}
              onChange={(e) => setTrustDrop(Number(e.target.value) || 0)}
              className="num mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">Action</label>
            <select
              value={lobbyAction}
              onChange={(e) => setLobbyAction(e.target.value as PoliticalActionKind)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="publicLobby">Public lobby</option>
              <option value="quietPitch">Quiet pitch</option>
              <option value="adHocFunding">Ad-hoc funding</option>
            </select>
          </div>
        </div>
      )}

      {kind === 'autoIssueOperatingBondsBelowCash' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              Cash below ($M)
            </label>
            <input
              type="number"
              value={cashThreshold}
              onChange={(e) => setCashThreshold(Number(e.target.value) || 0)}
              className="num mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              Issue ($M)
            </label>
            <input
              type="number"
              value={bondAmount}
              onChange={(e) => setBondAmount(Number(e.target.value) || 0)}
              className="num mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">Creditor</label>
            <select
              value={creditor}
              onChange={(e) => setCreditor(e.target.value as CreditorType)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="pension">Pension</option>
              <option value="institutional">Institutional</option>
              <option value="retail">Retail</option>
              <option value="foreign">Foreign</option>
            </select>
          </div>
        </div>
      )}

      {kind === 'autoResolveEvent' && (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              Event template id
            </label>
            <input
              type="text"
              value={eventTemplateId}
              onChange={(e) => setEventTemplateId(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-neutral-500">
              Choice id
            </label>
            <input
              type="text"
              value={choiceId}
              onChange={(e) => setChoiceId(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs font-mono"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Add rule
        </button>
      </div>
    </div>
  );
}
