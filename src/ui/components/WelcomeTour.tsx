import { useState } from 'react';
import { useGameStore } from '@state/gameStore';

const TOUR_STORAGE_KEY = 'metro-tour-completed-v1';

interface TourStep {
  title: string;
  body: string;
  /** Optional CTA the player should try after dismissing the step. */
  cta?: string;
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome — you run the integrated GTHA transit authority',
    body: "You've got 60 quarters (15 years) to leave a legacy. Three agencies (TTC, GO, UP), three governments to manage (Ottawa / Queen's Park / City Hall), one Ontario Line under construction. The board fires you below confidence 20 for 4 quarters. The cash dies below zero for 3 quarters.",
  },
  {
    title: 'Top strip is your dashboard',
    body: "Every KPI on the bar at top is clickable — opens a trace drawer showing what moved it. Hover the ⓘ icon next to any label for what the metric means and how to move it.",
    cta: 'Hover the cash KPI now.',
  },
  {
    title: 'Mission Control = your inbox',
    body: 'Events land here. Each event has 2-4 branches with tradeoffs spelled out. The "What just changed" panel below summarizes each quarter\'s shifts. Standing orders on the right automate repetitive decisions (try a preset).',
  },
  {
    title: '/capital is where you build',
    body: "Propose new projects. The financing modal lets you stack offers (federal + provincial + bonds = $14B Don Mills mega project). Each layer becomes a debt tranche at its own rate. Bigger projects need creative stacking.",
  },
  {
    title: '/treasury is where you manage debt',
    body: 'Issue operating bonds when cash runs low (gated by credit rating). Refi tranches when rates favor (1.5% fee, must clear break-even). Watch the maturity ladder on /performance for refi pressure.',
  },
  {
    title: '/political is where you lobby',
    body: 'Each government has Public Lobby (+6 trust, -5 approval), Quiet Pitch (+3 trust, 4Q cooldown), Ad-hoc Funding (-8 trust, +cash). Insider archetype gets Call-In-Favor: one-time +$400M from a high-trust gov.',
  },
  {
    title: "TTC / GO / UP dashboards: maintenance + policy",
    body: "Drag maintenance sliders to see condition forecasts in green/red. Pick fare + frequency policies — both have inline impact preview. Watch the pledge banner: breaking a fare-freeze pledge costs board confidence.",
  },
  {
    title: 'Time to play',
    body: 'End Turn (bottom-right) advances one quarter. The first 4-6 quarters are usually quiet; events ramp up. You\'ll feel a major political moment at Y4 (Q16) when the allowance renegotiates. Good luck.',
  },
];

interface WelcomeTourProps {
  onClose: () => void;
}

export function WelcomeTour({ onClose }: WelcomeTourProps) {
  const [step, setStep] = useState(0);
  const ceoName = useGameStore((s) => s.state.ceo.name);
  const cur = STEPS[step]!;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const finish = () => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-neutral-900/30 pointer-events-none">
      <div className="w-full max-w-md rounded-lg bg-white shadow-2xl pointer-events-auto">
        <header className="border-b border-neutral-200 px-5 py-3 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">
              Onboarding · Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-0.5 text-base font-semibold">{cur.title}</h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-md px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </header>
        <div className="px-5 py-4">
          {isFirst && ceoName && (
            <p className="text-sm text-blue-700 font-semibold mb-2">Hi, {ceoName}.</p>
          )}
          <p className="text-sm text-neutral-700 leading-relaxed">{cur.body}</p>
          {cur.cta && (
            <p className="mt-2 rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
              → {cur.cta}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={isFirst}
              className={`rounded px-2 py-1 ${
                isFirst ? 'text-neutral-300' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              ← Back
            </button>
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === step ? 'bg-blue-600' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </div>
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Start playing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowWelcomeTour(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}

export function resetWelcomeTour(): void {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // ignore
  }
}
