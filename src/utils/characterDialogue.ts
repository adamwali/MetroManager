import type { GameState } from '@/types/gameState';
import type { Character } from '@/types/characters';
import type { CharacterMood } from './characterMood';
import { projectQuarterlyCashFlow } from './cashFlowForecast';

/**
 * Per-character 1-on-1 meeting dialogue. Phase 10.12. Pure derivation —
 * picks a topic from state and renders a 100-200 word scene with 3
 * response options. Outcomes plug into requestPrivateMeeting.
 *
 * Topics deterministic from state, no RNG. Mood drives opening tone.
 */

export type ResponseId = 'warm' | 'transactional' | 'cold';

export interface DialogueResponse {
  id: ResponseId;
  label: string;
  effect: string;
}

export interface DialogueScene {
  setting: string;
  opening: string;
  responses: DialogueResponse[];
}

function detectTopic(state: GameState): string {
  const f = projectQuarterlyCashFlow(state);
  const cash = state.cash.balance as unknown as number;
  if (cash < 200 || f.net < -150) return 'cashCrisis';
  const opening = state.projects.find(
    (p) => p.state === 'operating' && p.templateId !== 'P00',
  );
  if (opening && opening.state === 'operating') {
    const since = (state.quarter as unknown as number) - (opening.openedAt as unknown as number);
    if (since <= 2) return 'lineOpening';
  }
  const board = state.boardConfidence.score as unknown as number;
  if (board < 35) return 'boardPressure';
  const approval = state.engineVars.publicApproval as unknown as number;
  if (approval < 35) return 'publicHostility';
  return 'general';
}

export function dialogueFor(
  state: GameState,
  character: Character,
  mood: CharacterMood,
): DialogueScene {
  const topic = detectTopic(state);
  const last = character.name.split(' ').slice(-1)[0] ?? character.name;
  const ceo = state.ceo.name.split(' ').slice(-1)[0] ?? state.ceo.name;
  const agency = state.ceo.agencyName ?? 'the authority';

  const setting = pickSetting(character, mood);
  const opening = pickOpening(character, mood, topic, { last, ceo, agency });
  const responses = pickResponses(character, mood, topic);

  return { setting, opening, responses };
}

function pickSetting(character: Character, mood: CharacterMood): string {
  void character; // intentionally unused — could refine per role later
  if (mood === 'aligned') {
    if (character.role === 'politician_minister' || character.role === 'politician_cabinet') {
      return "Private dining room, Albany Club. Coffee, no agenda papers.";
    }
    return 'Quiet boardroom. Coffee. Door closed.';
  }
  if (mood === 'hostile') {
    return character.role.startsWith('politician_')
      ? 'Their constituency office. 20 minutes blocked. Their staff is in the corner taking notes.'
      : "Their office. They didn't stand when you came in.";
  }
  if (mood === 'wary') {
    return 'Conference room. Three of their staffers, none of yours.';
  }
  return 'A neutral hotel meeting room. Pleasant enough.';
}

function pickOpening(
  character: Character,
  mood: CharacterMood,
  topic: string,
  v: { last: string; ceo: string; agency: string },
): string {
  void character; // intentionally unused — could refine per role later
  // Mood + topic matrix. Falls back to a neutral line if no specific entry.
  if (mood === 'aligned' && topic === 'cashCrisis') {
    return `"${v.ceo}, I heard about the run-rate." ${v.last} taps the rim of their cup. "I can't conjure money out of nothing, but tell me what you actually need from me and I'll see what we can move."`;
  }
  if (mood === 'aligned' && topic === 'lineOpening') {
    return `${v.last} is already smiling when you walk in. "I saw the photo from the ribbon-cutting. That's the kind of win that gives me cover to defend ${v.agency}'s next ask. Talk to me."`;
  }
  if (mood === 'hostile' && topic === 'cashCrisis') {
    return `${v.last} doesn't offer a chair. "Let me guess. You're here to ask. And I'm here to remind you that the last three times we talked, I asked for things too, and you said no." Long pause. "What's the pitch this time."`;
  }
  if (mood === 'hostile') {
    return `${v.last} folds their arms. "I'll give you fifteen minutes. Make them count, because the political room for ${v.agency} on my side of the table is thin."`;
  }
  if (mood === 'wary') {
    return `"${v.ceo}." ${v.last} doesn't smile. "I'm trying to figure out if we're on the same team. The last quarter or two have given me reasons to wonder. Convince me."`;
  }
  // General / neutral
  if (topic === 'lineOpening') {
    return `${v.last} congratulates you on the line opening. "It looked good. It also reminds me what ${v.agency} can be when it focuses. So — what's next?"`;
  }
  if (topic === 'boardPressure') {
    return `"How's the board treating you?" ${v.last} asks, refilling your coffee. "I'm asking because I hear things, and I'd rather hear them from you first."`;
  }
  if (topic === 'publicHostility') {
    return `${v.last} slides over a printout. "Public approval at the level you're at is a leading indicator of bigger problems. I want to know what your plan is — and whether I should be helping or distancing."`;
  }
  return `${v.last} pours you a coffee. "${v.ceo}, what's actually on your mind. We have an hour. Let's use it."`;
}

function pickResponses(
  character: Character,
  mood: CharacterMood,
  _topic: string,
): DialogueResponse[] {
  void character; // intentionally unused — could refine per role later
  // Three responses every time — warm / transactional / cold. Effects vary
  // with mood. The cold path is sometimes the only one that extracts value
  // from a hostile contact, but it costs.
  if (mood === 'hostile') {
    return [
      {
        id: 'warm',
        label: `"You're right, I should have listened sooner. What would help?"`,
        effect: `+6 relationship — slow rebuild`,
      },
      {
        id: 'transactional',
        label: `"Here's a specific ask. What's your price?"`,
        effect: `+2 relationship`,
      },
      {
        id: 'cold',
        label: `"I'm not here to grovel. What do you want me to know?"`,
        effect: `-4 relationship · +$25M (a private leak you can use)`,
      },
    ];
  }
  if (mood === 'aligned') {
    return [
      {
        id: 'warm',
        label: `"I appreciate you. Let me tell you what's coming and what I need."`,
        effect: `+6 relationship — deepens an ally`,
      },
      {
        id: 'transactional',
        label: `"Specifically: here's the file. Can you move it?"`,
        effect: `+2 relationship — uses goodwill without rebuilding it`,
      },
      {
        id: 'cold',
        label: `"You owe me more than you're delivering. Push harder."`,
        effect: `-4 relationship — burns warmth, gains nothing extra`,
      },
    ];
  }
  // neutral / wary
  return [
    {
      id: 'warm',
      label: `"Let's just talk. Where do you actually stand?"`,
      effect: `+6 relationship`,
    },
    {
      id: 'transactional',
      label: `"I'll be quick. Here's the trade I'm proposing."`,
      effect: `+2 relationship`,
    },
    {
      id: 'cold',
      label: `"I don't need you to like me, I need you not to get in my way."`,
      effect: `-4 relationship`,
    },
  ];
}
