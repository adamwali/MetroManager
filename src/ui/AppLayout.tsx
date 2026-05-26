import { NavLink, Outlet } from 'react-router-dom';
import { useGameStore } from '@state/gameStore';
import { quarterLabel } from '@/utils/humanize';
import { TopStrip } from './components/TopStrip';
import { EndTurnButton } from './components/EndTurnButton';

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
  { to: '/allocation', label: 'Allocation', end: false },
  { to: '/treasury', label: 'Treasury', end: false },
  { to: '/political', label: 'Political', end: false },
];

export function AppLayout() {
  const quarter = useGameStore((s) => s.state.quarter as unknown as number);
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="px-4 py-2 flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-4">
            <span className="text-sm font-semibold tracking-tight text-neutral-900">METRO</span>
            <span className="num text-xs text-neutral-500">{quarterLabel(quarter)}</span>
          </div>
          <EndTurnButton />
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
    </div>
  );
}
