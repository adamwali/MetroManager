import { NavLink, Outlet } from 'react-router-dom';

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
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-900">
        <div className="px-4 py-2 flex items-baseline gap-6">
          <span className="font-semibold tracking-wide text-neutral-100">METRO</span>
          <span className="num text-xs text-neutral-400">Q1 2026</span>
        </div>
        <nav className="px-2 flex flex-wrap gap-x-1 text-xs">
          {dashboards.map((d) => (
            <NavLink
              key={d.to}
              to={d.to}
              end={d.end}
              className={({ isActive }) =>
                `px-3 py-2 border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-400 text-neutral-100'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`
              }
            >
              {d.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
