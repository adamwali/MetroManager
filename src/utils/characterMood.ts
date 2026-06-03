import type { Character } from '@/types/characters';

export type CharacterMood = 'aligned' | 'wary' | 'hostile' | 'neutral';

/**
 * Compute a character's mood toward the player. Phase 10.12.
 * Pure derivation from relationship + recent interaction valence.
 *
 * Rules:
 *  - relationship ≥ 65 → aligned (warm, helpful in conversation)
 *  - relationship ≤ 25 → hostile (cold, makes demands)
 *  - recent net interaction Δ ≤ -10 over last 8Q → wary
 *  - else neutral
 */
export function moodFor(character: Character, currentQuarter: number): CharacterMood {
  const rel = character.relationship as unknown as number;
  if (rel >= 65) return 'aligned';
  if (rel <= 25) return 'hostile';
  // Recent valence — last 8 quarters of interactions
  const recent = character.interactions.filter(
    (i) => currentQuarter - (i.quarter as unknown as number) <= 8,
  );
  const recentNet = recent.reduce((a, b) => a + b.delta, 0);
  if (recentNet <= -8) return 'wary';
  return 'neutral';
}

/** One-line callback for {actorMemory} token. Empty string if no strong memory. */
export function memoryCallbackFor(character: Character, currentQuarter: number): string {
  // Look for a notable recent interaction (within 12Q) with strong negative delta.
  const recent = character.interactions
    .filter((i) => currentQuarter - (i.quarter as unknown as number) <= 12)
    .filter((i) => Math.abs(i.delta) >= 5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  if (recent.length === 0) return '';
  const top = recent[0]!;
  const last = character.name.split(' ').slice(-1)[0] ?? character.name;
  if (top.delta < 0) {
    if (top.kind === 'event_choice' && top.choiceLabel) {
      return `${last} hasn't forgotten the call to "${top.choiceLabel}" a few quarters back.`;
    }
    return `${last} is still cool over the last round of dealings.`;
  }
  // Positive memory
  if (top.kind === 'event_choice' && top.choiceLabel) {
    return `${last} remembers you backing them on "${top.choiceLabel}".`;
  }
  return `${last} considers you a known quantity now.`;
}
