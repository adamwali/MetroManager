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
    title: 'Welcome — you run the GTHA transit authority',
    body: "You're the new CEO. Three agencies (TTC subway/bus, GO regional rail, UP airport express), one Ontario Line under construction, three governments funding you. You've got 60 quarters (15 years) to leave a legacy.",
  },
  {
    title: 'The world you inherit',
    body: "Toronto in 2026 has a transit crisis. The previous CEO oversaw the Ontario Line groundbreaking but resigned over fare-evasion scandals. The board hired you to deliver. Failure conditions: cash below $0 for 3 quarters (fiscal failure), or board confidence below 20 for 4 quarters (you're fired).",
  },
  {
    title: 'Meet the three governments',
    body: "OTTAWA (federal): Minister Marie-Claude Tremblay — technocratic, climate-focused, controls $4B infrastructure top-ups. QUEEN'S PARK (provincial): Minister David Hartwell — deals guy, suburban-aligned, sets your operating allowance. CITY HALL (Toronto): Mayor Kenneth Liang — responsive to local pressure, accessibility-focused. You'll see them in events and on the /political dashboard.",
  },
  {
    title: 'Meet your operating directors',
    body: "TTC: Priya Ramanathan (reliability-engineer doctrine — will quit if you let reliability crash). GO: James Okafor (ridership-maximizer — pushes electrification + frequency). UP: Sarah Chen (cost-discipline — wants stable funding, low expansion). Each has a tolerance score; if you ignore their doctrine, they resign.",
  },
  {
    title: 'Top strip = your scoreboard',
    body: "Every KPI on the bar at top is clickable — opens a trace drawer showing what moved it. Hover the ⓘ icon next to any label for what the metric means.",
    cta: 'Hover any ⓘ icon now to see how it works.',
  },
  {
    title: 'Mission Control = your inbox',
    body: 'Events land here. Each has 2-4 branches with tradeoffs. The "What just changed" panel summarizes each quarter. Standing orders on the right automate repetitive decisions — try a preset like "+ Safety net".',
  },
  {
    title: 'Three big workstreams',
    body: "/capital — propose projects, stack financing across federal/provincial/private/bonds. /treasury — issue bonds when cash dips, refi when rates drop. /political — lobby ministers, run ad-hoc funding requests. TTC/GO/UP dashboards — maintenance + fare + frequency + security/cleanliness sliders.",
  },
  {
    title: "The Y4 moment",
    body: "At Q16 (Year 4), your operating allowance renegotiates. Outcome depends on trust scores + board confidence + delivery wins. Crash trust → -50% allowance with controls. Build trust + ship projects → +20%. This is the structural inflection that defines your campaign.",
  },
  {
    title: 'Time to play',
    body: "End Turn (bottom-right) advances one quarter. The first 4-6 quarters are quiet on purpose — set maintenance, plan your first project, feel the system. Then it ramps. Good luck, CEO.",
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
