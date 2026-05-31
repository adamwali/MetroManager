import { useGameStore } from '@state/gameStore';
import { buildNewsTicker } from '@/utils/newsTicker';

/**
 * Scrolling news ticker. Phase 10.11. A thin marquee of state-reactive
 * headlines so the world feels alive and responds to the player's results.
 * Pinned under the top KPI strip.
 */
export function NewsTicker() {
  const state = useGameStore((s) => s.state);
  const headlines = buildNewsTicker(state);

  // Duplicate the list so the marquee loops seamlessly.
  const loop = [...headlines, ...headlines];

  return (
    <div className="relative flex items-center overflow-hidden border-y border-neutral-200 bg-neutral-900 py-1">
      <span className="z-10 shrink-0 bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
        Live
      </span>
      <div className="ticker-track flex whitespace-nowrap">
        {loop.map((h, i) => (
          <span key={i} className="mx-6 inline-flex items-center gap-1.5 text-[12px]">
            <span className="font-bold text-blue-300">{h.outlet}:</span>
            <span
              className={
                h.tone === 'bad'
                  ? 'text-red-300'
                  : h.tone === 'good'
                    ? 'text-emerald-300'
                    : 'text-neutral-200'
              }
            >
              {h.text}
            </span>
            <span className="text-neutral-600">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}
