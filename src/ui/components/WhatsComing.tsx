import { useGameStore } from '@state/gameStore';
import { quarterLabel, quartersUntilLabel } from '@/utils/humanize';

/**
 * "What's coming" preview per design doc §4. Shows the next political
 * milestones the player should be planning for.
 */
export function WhatsComing() {
  const state = useGameStore((s) => s.state);
  const currentQ = state.quarter as unknown as number;
  const events: { label: string; q: number; tone?: 'soon' | 'normal' }[] = [
    {
      label: 'Operating allowance renegotiates',
      q: state.operatingAllowance.renegotiatesAt as unknown as number,
    },
    {
      label: 'Federal (Ottawa) election',
      q: state.politics.ottawa.nextElectionAt as unknown as number,
    },
    {
      label: "Queen's Park election",
      q: state.politics.queensPark.nextElectionAt as unknown as number,
    },
    {
      label: 'City Hall election',
      q: state.politics.cityHall.nextElectionAt as unknown as number,
    },
  ];
  for (const p of state.projects) {
    if (p.state === 'under_construction') {
      events.push({
        label: `${p.templateId} opens`,
        q: p.forecastOpenAt as unknown as number,
      });
    }
  }
  events.sort((a, b) => a.q - b.q);
  const upcoming = events.filter((e) => e.q > currentQ).slice(0, 5);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        What's coming
      </h2>
      {upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">Nothing scheduled.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {upcoming.map((e) => {
            const quartersOff = e.q - currentQ;
            const soon = quartersOff <= 2;
            return (
              <li
                key={`${e.label}-${e.q}`}
                className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-neutral-800">{e.label}</span>
                <span
                  className={`num text-xs ${soon ? 'font-semibold text-amber-700' : 'text-neutral-500'}`}
                >
                  {quarterLabel(e.q)} · {quartersUntilLabel(quartersOff)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
