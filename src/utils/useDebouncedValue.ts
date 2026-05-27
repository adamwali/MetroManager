import { useEffect, useRef, useState } from 'react';

/**
 * Debounced setter for fast-firing UI controls (sliders, range inputs).
 *
 * Returns `[displayValue, setValue]`. `displayValue` updates immediately for
 * UI responsiveness, but the parent's `commit` callback fires only `delayMs`
 * after the user stops changing the value.
 *
 * Phase 10 polish: maintenance sliders previously called setMaintenance on
 * every pixel of drag, triggering autosave + Saved toast 40+ times per drag.
 */
export function useDebouncedCommit<T>(
  initial: T,
  commit: (value: T) => void,
  delayMs = 200,
): [T, (next: T) => void] {
  const [display, setDisplay] = useState<T>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedRef = useRef<T>(initial);

  // If parent updates the source value (e.g., after end-turn rebalances), sync display
  useEffect(() => {
    if (initial !== committedRef.current) {
      setDisplay(initial);
      committedRef.current = initial;
    }
  }, [initial]);

  const setValue = (next: T) => {
    setDisplay(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      commit(next);
      committedRef.current = next;
      timerRef.current = null;
    }, delayMs);
  };

  return [display, setValue];
}
