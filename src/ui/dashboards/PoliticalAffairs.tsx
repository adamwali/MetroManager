import { useGameStore } from '@state/gameStore';
import {
  POLITICAL_ACTION_META,
  cooldownQuartersLeft,
  isActionEligible,
} from '@engine/politicalActions';
import type { GovernmentId, PoliticalActionKind } from '@/types/politics';
import type { PoliticalCharacter } from '@/types/characters';
import {
  describeTrust,
  formatPct,
  quarterLabel,
  quartersUntilLabel,
} from '@/utils/humanize';

const GOV_META: Record<
  GovernmentId,
  { label: string; subtitle: string; color: string }
> = {
  ottawa: {
    label: 'Ottawa',
    subtitle: 'Federal Transport ministry + Treasury Board',
    color: 'border-red-300',
  },
  queensPark: {
    label: "Queen's Park",
    subtitle: 'Provincial — Premier + Transportation minister',
    color: 'border-blue-300',
  },
  cityHall: {
    label: 'City Hall',
    subtitle: 'Mayor + Toronto Council',
    color: 'border-emerald-300',
  },
};

const ACTION_ORDER: PoliticalActionKind[] = [
  'publicLobby',
  'quietPitch',
  'adHocFunding',
  'callInFavor',
];

export function PoliticalAffairs() {
  const state = useGameStore((s) => s.state);
  const execute = useGameStore((s) => s.executePoliticalAction);
  const currentQ = state.quarter as unknown as number;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Political Affairs</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Lobby governments. Request ad-hoc funding. Insiders can call in favors. Each action
          has a per-government cooldown. Choose carefully — public actions cost approval, quiet
          actions cost less but yield less.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        {(['ottawa', 'queensPark', 'cityHall'] as GovernmentId[]).map((govId) => {
          const gov = state.politics[govId];
          const meta = GOV_META[govId];
          const trust = gov.trust as unknown as number;
          const electionIn = (gov.nextElectionAt as unknown as number) - currentQ;
          // Find the cabinet character for this gov (first cabinet id)
          const cabinetCharacter =
            gov.cabinetCharacterIds.length > 0
              ? (state.characters[gov.cabinetCharacterIds[0]!] as
                  | PoliticalCharacter
                  | undefined)
              : undefined;
          return (
            <article
              key={govId}
              className={`rounded-md border-2 bg-white p-4 ${meta.color}`}
            >
              <header className="border-b border-neutral-100 pb-3">
                <h2 className="text-base font-semibold">{meta.label}</h2>
                <p className="mt-0.5 text-xs text-neutral-500">{meta.subtitle}</p>
                {cabinetCharacter && (
                  <div className="mt-2 rounded-md border border-neutral-100 bg-neutral-50/60 p-2">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Your contact
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">{cabinetCharacter.name}</div>
                    <p className="mt-1 text-[11px] text-neutral-600 leading-snug">
                      {cabinetCharacter.bio[0]}
                    </p>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Trust
                    </div>
                    <div className="num text-lg font-semibold">{trust.toFixed(0)}/100</div>
                    <div className="text-[10px] text-neutral-500">
                      {describeTrust(trust)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Election
                    </div>
                    <div className="num text-sm font-semibold">
                      {quarterLabel(gov.nextElectionAt as unknown as number)}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {quartersUntilLabel(electionIn)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Party in power
                    </div>
                    <div className="text-sm font-medium capitalize">{gov.partyInPower}</div>
                  </div>
                </div>
              </header>

              <div className="mt-3 space-y-2">
                {ACTION_ORDER.map((kind) => {
                  const meta = POLITICAL_ACTION_META[kind];
                  const eligible = isActionEligible(state, govId, kind);
                  const cooldownLeft = cooldownQuartersLeft(state, govId, kind);
                  const onCooldown = cooldownLeft > 0;
                  return (
                    <button
                      key={kind}
                      type="button"
                      disabled={!eligible}
                      onClick={() => execute(govId, kind)}
                      className={`block w-full text-left rounded-md border p-2.5 transition-colors ${
                        eligible
                          ? 'border-neutral-200 hover:border-blue-400 hover:bg-blue-50/30'
                          : 'border-neutral-200 bg-neutral-50/70 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">{meta.label}</span>
                        {onCooldown && (
                          <span className="text-[10px] font-medium text-amber-700">
                            {cooldownLeft}Q cooldown
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-600">{meta.description}</div>
                      <div className="mt-1 num text-[10px] text-neutral-700">
                        {meta.effectSummary}
                      </div>
                      {!eligible && !onCooldown && (
                        <div className="mt-1 text-[10px] text-red-700">
                          Requires: {meta.cooldownLabel.split(' · ').slice(1).join(' · ') ||
                            'archetype/trust gate'}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          How political actions work
        </h2>
        <ul className="mt-2 space-y-1 text-xs text-neutral-700">
          <li>
            <span className="font-semibold">Public lobby</span> — always available. +6 trust
            but -5 public approval (you spent political capital in public).
          </li>
          <li>
            <span className="font-semibold">Quiet pitch</span> — needs trust ≥ 40 or Insider
            archetype. Smaller payoff but no public approval cost.
          </li>
          <li>
            <span className="font-semibold">Ad-hoc funding</span> — needs trust ≥ 45. You get
            $100-250M scaled by trust, but you burn 8 trust doing it.
          </li>
          <li>
            <span className="font-semibold">Call in favor</span> — Insider only, needs trust ≥
            60, 16-quarter cooldown. The Insider archetype's signature move.
          </li>
        </ul>
        <p className="mt-3 text-[11px] text-neutral-500">
          Political capital is finite. Cooldowns prevent spam. Each archetype plays this
          dashboard differently: Insider weaponizes relationships, Technocrat prefers data, the
          Coalition Builder cycles through all three governments steadily, Steady Operator
          rationally allocates between them. Public approval (currently{' '}
          {(state.engineVars.publicApproval as unknown as number).toFixed(0)}) caps how
          aggressive you can be — below 30, ridership drag kicks in (
          {formatPct(0.003, 1)}/Q).
        </p>
      </section>
    </div>
  );
}
