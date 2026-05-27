import { useGameStore } from '@state/gameStore';
import { quarterLabel } from '@/utils/humanize';

/**
 * Quarter advance button. Phase 10: on Q0 (campaign start) the label is
 * "Start campaign" so it doesn't suggest "ending" before anything's
 * happened. On all later quarters it shows "Next: Qn YYYY".
 */
export function EndTurnButton() {
  const endTurn = useGameStore((s) => s.endTurn);
  const currentQ = useGameStore((s) => s.state.quarter as unknown as number);
  const label =
    currentQ === 0 ? `Start: ${quarterLabel(1)}` : `Next quarter → ${quarterLabel(currentQ + 1)}`;
  return (
    <button
      type="button"
      onClick={endTurn}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      {label}
    </button>
  );
}
