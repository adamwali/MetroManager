import { useEffect, useState } from 'react';
import { useGameStore } from '@state/gameStore';

/**
 * Floating "Saved" badge that flashes when autosave fires. Phase 10 polish.
 *
 * The header has a subtle text label for autosave status, but player
 * feedback was "I don't know if my changes are locked in." This badge
 * appears in the bottom-right and flashes green when saving completes,
 * then fades after 1.5s. Cleaner signal than tiny header text.
 */
export function SavedToast() {
  const status = useGameStore((s) => s.autosaveStatus);
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<'saving' | 'saved' | 'error' | null>(null);

  useEffect(() => {
    if (status === 'saving') {
      setContent('saving');
      setVisible(true);
    } else if (status === 'saved') {
      setContent('saved');
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1_400);
      return () => clearTimeout(timer);
    } else if (status === 'error') {
      setContent('error');
      setVisible(true);
    }
  }, [status]);

  if (!content) return null;

  const style =
    content === 'error'
      ? 'bg-red-600 text-white'
      : content === 'saving'
        ? 'bg-neutral-700 text-white'
        : 'bg-emerald-600 text-white';
  const label =
    content === 'saving' ? 'Saving…' : content === 'saved' ? '✓ Saved' : '⚠ Save failed';

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-md px-3 py-1.5 text-xs font-semibold shadow-lg transition-all duration-300 ${style} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}
