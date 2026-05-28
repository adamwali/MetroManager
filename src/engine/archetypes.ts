import type { CeoArchetype } from '@/types/ceo';

/**
 * CEO archetypes. Per design doc §7 — five archetypes defined; Phase 2.2
 * exposes four (Disruptor is deferred until random-gaffe events land in
 * Phase 3). Each archetype has DEEP divergent starting conditions per
 * repo-owner direction.
 *
 * Each config is a set of overrides applied to the default starting
 * state in createInitialGameState. The defaults represent Steady Operator.
 */

export interface ArchetypeStartingMods {
  /** Override starting cash, $M. */
  startingCashM: number;
  /** Override starting board confidence (0-100). */
  boardConfidence: number;
  /** Override starting public approval (engineVars). */
  publicApproval: number;
  /** Trust score overrides per government. */
  trust: {
    ottawa: number;
    queensPark: number;
    cityHall: number;
  };
  /** Override starting engineer count. */
  engineers: number;
  /** Override starting templates score. */
  templates: number;
  /** Override starting openBooks flag. */
  openBooks: boolean;
  /** Subsystem condition adjustment (added to each subsystem's starting condition, clamped 0-100). */
  subsystemConditionAdjust: number;
  /** Display label and blurb for the new-game picker. */
  displayName: string;
  blurb: string;
  /** Strengths and weaknesses, surfaced in the picker. */
  strengths: string[];
  weaknesses: string[];
}

export const ARCHETYPE_CONFIGS: Record<CeoArchetype, ArchetypeStartingMods> = {
  steadyOperator: {
    startingCashM: 1_400,
    boardConfidence: 60,
    publicApproval: 50,
    trust: { ottawa: 50, queensPark: 50, cityHall: 50 },
    engineers: 180,
    templates: 30,
    openBooks: false,
    subsystemConditionAdjust: 0,
    displayName: 'Steady Operator',
    blurb:
      'Career operator who keeps the trains running. Predecessor left things in average shape — neither feast nor famine.',
    strengths: ['Balanced starting position', 'No glaring weaknesses', 'Board trusts you to hold the line'],
    weaknesses: ['No initial edge anywhere', 'Have to earn every win'],
  },
  internationalTechnocrat: {
    startingCashM: 1_100,
    boardConfidence: 65,
    publicApproval: 40,
    trust: { ottawa: 55, queensPark: 45, cityHall: 40 },
    engineers: 220,
    templates: 55,
    openBooks: true,
    subsystemConditionAdjust: 4,
    displayName: 'International Technocrat',
    blurb:
      'Data-first reformer brought in from a London / Singapore / Madrid agency. Clean books, standardized procurement, well-maintained assets. The boardroom and bond markets love you; City Hall finds you cold.',
    strengths: [
      'Higher starting cash ($1.1B)',
      'Open books → favorable credit rating',
      'Standardized templates (55) lower future project cost',
      'Engineering bench at 220 (+15% efficiency per spec §7)',
      'Subsystems in better condition',
    ],
    weaknesses: [
      'Provincial trust low (45) — Queen\'s Park skeptical of imports',
      'City Hall trust low (40) — perceived as anti-political',
      'Lower public approval (40) — bloodless reputation',
    ],
  },
  insider: {
    startingCashM: 1_200,
    boardConfidence: 50,
    publicApproval: 55,
    trust: { ottawa: 60, queensPark: 65, cityHall: 40 },
    engineers: 140,
    templates: 20,
    openBooks: false,
    subsystemConditionAdjust: -2,
    displayName: 'The Insider',
    blurb:
      'Political operator who negotiated their way in. Provincial and federal halls already owe you favors; City Hall feels played. Less internal expertise — you run on relationships, not process.',
    strengths: [
      'Highest starting cash ($1.2B)',
      'Queen\'s Park trust at 65 (aligned)',
      'Ottawa trust at 60 (cooperative+)',
      'Already mid-conversation with two governments',
    ],
    weaknesses: [
      'City Hall trust low (40) — feels excluded from your circle',
      'Board confidence at 50 — concerned about overcommitments',
      'Engineers at 140 (-22% per spec §7) — fewer hands',
      'No template/process discipline (20)',
      'Subsystems slightly degraded — focused on deals, not ops',
    ],
  },
  coalitionBuilder: {
    startingCashM: 1_000,
    boardConfidence: 60,
    publicApproval: 60,
    trust: { ottawa: 55, queensPark: 55, cityHall: 55 },
    engineers: 160,
    templates: 25,
    openBooks: false,
    subsystemConditionAdjust: 0,
    displayName: 'Coalition Builder',
    blurb:
      'Diplomatic generalist. Spent the lead-up shaking every hand in every jurisdiction. Modest but real trust everywhere; slower-moving decisions because every move is a consultation.',
    strengths: [
      'All three governments at 55 trust (cooperative)',
      'Higher public approval (60)',
      'No enemies on Day 1',
      'Easier consortium financing offers',
    ],
    weaknesses: [
      'No standout strength anywhere',
      'Slower decisions (engineers at 160, templates 25) — every choice needs alignment',
      'Coalition can fray if you favor any single government',
    ],
  },
  disruptor: {
    // Phase 10.7: cash bumped $1,300 → $1,500. Disruptor's penalty stack
    // (low board/trust + opex/maint inefficiencies) was making balanced
    // strategy fail 57% with only 3% wins. Buffer extends runway so the
    // +60 engineers advantage (faster project delivery) can materialize.
    startingCashM: 1_500,
    boardConfidence: 40,
    publicApproval: 70,
    trust: { ottawa: 40, queensPark: 40, cityHall: 45 },
    engineers: 240,
    templates: 15,
    openBooks: false,
    subsystemConditionAdjust: -5,
    displayName: 'The Disruptor',
    blurb:
      '"Move fast" billionaire-energy outsider. Faster delivery, public swooning, but random gaffes you can\'t entirely control.',
    strengths: ['Highest cash ($1.3B)', 'Public approval (70)', '+20% delivery speed (engineers 240)'],
    weaknesses: ['Board confidence low (40)', 'All government trust below 50', 'Random gaffes 2-3x per campaign', 'Subsystems neglected'],
  },
};

/** Archetypes exposed in the new-game picker. Phase 6.3.2 polish: Disruptor
 * now selectable for veteran players (high risk, high variance). */
export const PICKABLE_ARCHETYPES: CeoArchetype[] = [
  'steadyOperator',
  'internationalTechnocrat',
  'insider',
  'coalitionBuilder',
  'disruptor',
];

export function archetypeOptions(): { id: CeoArchetype; config: ArchetypeStartingMods }[] {
  return PICKABLE_ARCHETYPES.map((id) => ({
    id,
    config: ARCHETYPE_CONFIGS[id],
  }));
}

export function archetypeConfig(archetype: CeoArchetype): ArchetypeStartingMods {
  return ARCHETYPE_CONFIGS[archetype];
}
