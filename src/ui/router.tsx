import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@ui/AppLayout';
import { MissionControl } from '@ui/dashboards/MissionControl';
import { TtcOperations } from '@ui/dashboards/TtcOperations';
import { GoOperations } from '@ui/dashboards/GoOperations';
import { UpOperations } from '@ui/dashboards/UpOperations';
import { CapitalProjects } from '@ui/dashboards/CapitalProjects';
import { Treasury } from '@ui/dashboards/Treasury';
import { PoliticalAffairs } from '@ui/dashboards/PoliticalAffairs';

// PerformanceBoard pulls in Recharts (~400KB). Lazy-load so it only
// downloads when player visits /performance — keeps initial bundle lean.
const PerformanceBoard = lazy(() =>
  import('@ui/dashboards/PerformanceBoard').then((m) => ({ default: m.PerformanceBoard })),
);

function PerformanceRoute() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-8 text-sm text-neutral-500">
          Loading charts…
        </div>
      }
    >
      <PerformanceBoard />
    </Suspense>
  );
}

// Vite injects BASE_URL at build time. Locally it's '/'; on GitHub Pages
// it's '/MetroManager/'. createBrowserRouter needs basename without trailing
// slash for proper routing under a subpath.
const BASENAME =
  import.meta.env.BASE_URL.length > 1
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined;

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: AppLayout,
      children: [
        { index: true, Component: MissionControl },
        { path: 'performance', Component: PerformanceRoute },
        { path: 'ttc', Component: TtcOperations },
        { path: 'go', Component: GoOperations },
        { path: 'up', Component: UpOperations },
        { path: 'capital', Component: CapitalProjects },
        { path: 'treasury', Component: Treasury },
        { path: 'political', Component: PoliticalAffairs },
      ],
    },
  ],
  BASENAME ? { basename: BASENAME } : undefined,
);
