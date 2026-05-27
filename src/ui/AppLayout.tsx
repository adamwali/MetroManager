import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useGameStore } from '@state/gameStore';
import { ARCHETYPE_CONFIGS } from '@engine/archetypes';
import { AUTOSAVE_SLOT, readSlot } from '@state/saveSlots';
import type { CeoArchetype } from '@/types/ceo';
import { quarterLabel } from '@/utils/humanize';
import { TopStrip } from './components/TopStrip';
import { EndTurnButton } from './components/EndTurnButton';
import { TimeJumpPreview } from './components/TimeJumpPreview';
import { NewGameModal } from './components/NewGameModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { GameOverScreen } from './components/GameOverScreen';
import { SavedToast } from './components/SavedToast';
import { WelcomeTour, shouldShowWelcomeTour } from './components/WelcomeTour';

interface DashboardLink {
  to: string;
  label: string;
  end: boolean;
}

const dashboards: DashboardLink[] = [
  { to: '/', label: 'Mission Control', end: true },
  { to: '/performance', label: 'Performance', end: false },
  { to: '/ttc', label: 'TTC', end: false },
  { to: '/go', label: 'GO', end: false },
  { to: '/up', label: 'UP', end: false },
  { to: '/capital', label: 'Capital Projects', end: false },
  { to: '/treasury', label: 'Treasury', end: false },
  { to: '/political', label: 'Political', end: false },
];

const AUTOSAVE_STATUS_LABEL = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

export function AppLayout() {
  const quarter = useGameStore((s) => s.state.quarter as unknown as number);
  const ceo = useGameStore((s) => s.state.ceo);
  const autosaveStatus = useGameStore((s) => s.autosaveStatus);
  const campaignStarted = useGameStore((s) => s.campaignStarted);
  const gameOver = useGameStore((s) => s.state.gameOver);
  const newGame = useGameStore((s) => s.newGame);
  const loadFromSlot = useGameStore((s) => s.loadFromSlot);

  const [showNewGame, setShowNewGame] = useState(false);
  const [saveLoad, setSaveLoad] = useState<'save' | 'load' | null>(null);
  const [bootChecked, setBootChecked] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Show welcome tour on first campaign start (LS-gated, never re-shows)
  useEffect(() => {
    if (campaignStarted && shouldShowWelcomeTour()) {
      setShowTour(true);
    }
  }, [campaignStarted]);

  // On boot: try to load the autosave silently. If present, resume from it
  // (campaign was in progress). If not, show the new-game modal.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const autosaved = await readSlot(AUTOSAVE_SLOT);
        if (cancelled) return;
        if (autosaved) {
          await loadFromSlot(AUTOSAVE_SLOT);
        } else {
          setShowNewGame(true);
        }
      } catch {
        setShowNewGame(true);
      } finally {
        if (!cancelled) setBootChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadFromSlot]);

  const archetypeName = ARCHETYPE_CONFIGS[ceo.archetype as CeoArchetype]?.displayName ?? ceo.archetype;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="px-4 py-2 flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-semibold tracking-tight text-neutral-900">METRO</span>
            <span className="num text-xs text-neutral-500">{quarterLabel(quarter)}</span>
            {campaignStarted && (
              <span className="text-xs text-neutral-500">
                {ceo.name} · {archetypeName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {autosaveStatus !== 'idle' && (
              <span
                className={`text-[11px] ${
                  autosaveStatus === 'error' ? 'text-red-600' : 'text-neutral-500'
                }`}
              >
                {AUTOSAVE_STATUS_LABEL[autosaveStatus]}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSaveLoad('save')}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setSaveLoad('load')}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Load
            </button>
            <button
              type="button"
              onClick={() => setShowNewGame(true)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              New
            </button>
            {!gameOver && <TimeJumpPreview />}
            {!gameOver && <EndTurnButton />}
          </div>
        </div>
        <nav className="border-t border-neutral-100 px-2 flex flex-wrap gap-x-1 text-xs">
          {dashboards.map((d) => (
            <NavLink
              key={d.to}
              to={d.to}
              end={d.end}
              className={({ isActive }) =>
                `px-3 py-2 border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-neutral-900 font-medium'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`
              }
            >
              {d.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-neutral-100">
          <TopStrip />
        </div>
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      {showNewGame && (
        <NewGameModal
          dismissible={campaignStarted && bootChecked}
          onClose={() => setShowNewGame(false)}
        />
      )}
      {saveLoad !== null && (
        <SaveLoadModal mode={saveLoad} onClose={() => setSaveLoad(null)} />
      )}
      {gameOver && (
        <GameOverScreen
          onStartNew={() => {
            // Reset to baseline then open the new-game modal.
            newGame(1, 'steadyOperator', 'CEO');
            setShowNewGame(true);
          }}
          onLoad={() => setSaveLoad('load')}
        />
      )}
      <SavedToast />
      {showTour && <WelcomeTour onClose={() => setShowTour(false)} />}
    </div>
  );
}
