import type { GameState } from '@/types/gameState';

/**
 * Interpolate placeholder tokens in event copy. Shared between Inbox preview
 * and EventModal so both show the same personalized text.
 *
 * Tokens:
 *  - {ceoName}: player CEO name from state.ceo.name
 *  - {actorName}: full name of the event's actorCharacterId, if set
 *  - {actorFirstName}: first word of actor name
 */
export function interpolateEventText(text: string, state: GameState, actorId?: string): string {
  let result = text.replace(/\{ceoName\}/g, state.ceo.name);
  if (actorId) {
    const actor = state.characters[actorId];
    if (actor) {
      result = result.replace(/\{actorName\}/g, actor.name);
      const first = actor.name.split(' ')[0] ?? actor.name;
      result = result.replace(/\{actorFirstName\}/g, first);
    }
  }
  return result;
}
