import { useGameStore } from '@state/gameStore';

/**
 * Instant end-turn button per design doc §0 P8 ("end turn must be
 * shame-free and accessible at all times"). No confirmation, no
 * animation, no delay.
 */
export function EndTurnButton() {
  const endTurn = useGameStore((s) => s.endTurn);
  return (
    <button
      type="button"
      onClick={endTurn}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      End turn
    </button>
  );
}
