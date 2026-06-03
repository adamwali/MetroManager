import type { GameState } from '@/types/gameState';

/**
 * 3-act ending sequence for the game-over screen. Phase 10.12 — gives
 * failure (and success) a story-like close, not a dry stat dump.
 *
 * Each act is a card. Card 1 sets the scene; card 2 names what went
 * wrong; card 3 closes on a character beat reflecting the player's
 * relationships. Pure derivation from state.
 */

export interface VignetteAct {
  speaker: string;
  speakerRole: string;
  text: string;
}

export function vignetteFor(state: GameState): VignetteAct[] {
  if (!state.gameOver) return [];
  const ceo = state.ceo.name;
  const agency = state.ceo.agencyName ?? 'GTTA';
  const kind = state.gameOver.kind;

  const lastName = (id: string): string | undefined => {
    const c = state.characters[id];
    if (!c) return undefined;
    const parts = c.name.trim().split(' ');
    return parts[parts.length - 1];
  };

  // The director-general / cabinet contact most relevant per government.
  const ottawa = lastName(state.politics.ottawa.cabinetCharacterIds[0] ?? '') ?? 'Ottawa';
  const queensPark = lastName(state.politics.queensPark.cabinetCharacterIds[0] ?? '') ?? "Queen's Park";
  const cityHall = lastName(state.politics.cityHall.cabinetCharacterIds[0] ?? '') ?? 'City Hall';

  // Highest-trust friendly relationship for the final-card farewell.
  const friend = (
    [
      { name: queensPark, trust: state.politics.queensPark.trust as unknown as number },
      { name: ottawa, trust: state.politics.ottawa.trust as unknown as number },
      { name: cityHall, trust: state.politics.cityHall.trust as unknown as number },
    ] as const
  ).reduce((a, b) => (a.trust > b.trust ? a : b));

  // Worst-quarter cash hit — for the auditor act in fiscal-failure.
  let worstQ: { quarter: number; cashDelta: number; summary: string } | undefined;
  for (const e of state.actionLog) {
    if (e.kind !== 'quarter_summary') continue;
    if (worstQ === undefined || e.cashDelta < worstQ.cashDelta) {
      worstQ = {
        quarter: e.quarter as unknown as number,
        cashDelta: e.cashDelta,
        summary: e.summary,
      };
    }
  }

  const projectsOpened = state.projects.filter(
    (p) => p.state === 'operating' && p.templateId !== 'P00',
  ).length;

  if (kind === 'fiscalFailure') {
    return [
      {
        speaker: 'The Board Chair',
        speakerRole: 'After the emergency meeting',
        text: `${ceo}, the province froze our line of credit at midnight. The receiver's office wants the keys by Friday. ${agency} doesn't have the money to make payroll, and we don't have a story that justifies asking for more.`,
      },
      {
        speaker: 'The Auditor General',
        speakerRole: 'Press conference, downtown',
        text: worstQ && worstQ.cashDelta < -300
          ? `When we trace the path, one quarter stands out. Q${worstQ.quarter}: ${cashShort(worstQ.cashDelta)}. ${worstQ.summary}. Every dollar lost there is a dollar we don't have today.`
          : `When we trace the path, the picture is simpler than the public realizes. ${agency}'s revenue never grew fast enough to match its commitments. The math caught up.`,
      },
      {
        speaker: friend.name,
        speakerRole: friend.trust > 50 ? 'Private call, off the record' : 'Brief public statement',
        text:
          friend.trust > 50
            ? `${ceo}, I wanted you to hear this from me. I tried to protect the file, but there wasn't enough political capital left. You did some real work here. It just ran out of runway.`
            : `${agency}'s leadership has resigned effective immediately. A successor will be named in due course. We thank ${ceo} for their service.`,
      },
    ];
  }

  if (kind === 'boardFiring') {
    return [
      {
        speaker: 'The Board Chair',
        speakerRole: 'Private vote, 7-2',
        text: `${ceo}, the board has lost confidence. Four quarters of below-25 reading. We don't doubt your effort, but we don't see the path you see.`,
      },
      {
        speaker: friend.trust > 50 ? friend.name : 'The opposition critic',
        speakerRole: friend.trust > 50 ? 'Hallway, after the vote' : 'Press scrum',
        text:
          friend.trust > 50
            ? `For what it's worth — I argued you'd earned another quarter. The chair disagreed. I'm sorry it ended like this.`
            : `${agency} needed leadership and got a manager. We'll be calling for a top-to-bottom review of every contract signed under ${ceo}.`,
      },
      {
        speaker: 'A reporter',
        speakerRole: 'CBC, evening newscast',
        text: `${ceo} leaves with ${projectsOpened} ${projectsOpened === 1 ? 'line' : 'lines'} opened and a mixed reputation. Whether that's a record of progress or a record of compromise will be argued for years.`,
      },
    ];
  }

  // campaignWon
  const cash = state.cash.balance as unknown as number;
  return [
    {
      speaker: 'The Board Chair',
      speakerRole: 'Final board meeting',
      text: `Fifteen years, ${ceo}. We had our doubts at the start. ${agency} ends your tenure ${cash > 0 ? `solvent with ${cashShort(cash)} in the bank` : 'in a tighter spot than we hoped'} and ${projectsOpened} ${projectsOpened === 1 ? 'new line' : 'new lines'} on the map.`,
    },
    {
      speaker: 'A Globe columnist',
      speakerRole: 'Retrospective piece',
      text: `${ceo}'s ${agency} won't be remembered for any single decision. It will be remembered for the slow accumulation of them — the small fights picked, the bigger ones declined, the network that's measurably more useful than the one inherited.`,
    },
    {
      speaker: friend.name,
      speakerRole: 'Retirement reception',
      text: friend.trust > 60
        ? `You built something real, ${ceo}. There's no statue, no ribbon-cutting. There's a network that works a little better than the one you walked into. That's the job.`
        : `${ceo} did the work. Not everyone agreed with the calls, but the calls were made.`,
    },
  ];
}

function cashShort(m: number): string {
  if (Math.abs(m) >= 1000) return `${m < 0 ? '-' : ''}$${Math.abs(m / 1000).toFixed(1)}B`;
  return `${m < 0 ? '-' : ''}$${Math.abs(m).toFixed(0)}M`;
}
