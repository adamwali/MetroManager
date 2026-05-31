import { useGameStore } from '@state/gameStore';
import { catalogEntry } from '@engine/projectCatalog';
import type { Project } from '@/types/projects';

/**
 * Schematic network map. Phase 10.11. A stylized transit diagram (not
 * geographic) showing the three agency trunks and the player's projects as
 * stations along them, colored by state — operating (solid), under
 * construction (pulsing amber), proposed (hollow). Gives a visual sense of
 * the network growing as you build.
 */

const AGENCY_ROWS: Array<{ id: 'ttc' | 'go' | 'up'; label: string; color: string; y: number }> = [
  { id: 'ttc', label: 'TTC (subway / streetcar / LRT)', color: '#0ea5e9', y: 60 },
  { id: 'go', label: 'GO (regional rail)', color: '#10b981', y: 130 },
  { id: 'up', label: 'UP (airport express)', color: '#a855f7', y: 200 },
];

const MODE_GLYPH: Record<string, string> = {
  subway: '🚇',
  elevated: '🚝',
  lrt: '🚊',
  brt: '🚌',
  rer: '🚆',
};

interface StationDot {
  templateId: string;
  name: string;
  state: Project['state'];
  mode: string;
}

export function NetworkMap() {
  const projects = useGameStore((s) => s.state.projects);

  // Group projects by primary agency.
  const byAgency: Record<'ttc' | 'go' | 'up', StationDot[]> = { ttc: [], go: [], up: [] };
  for (const p of projects) {
    const entry = catalogEntry(p.templateId);
    if (!entry) continue;
    byAgency[entry.primaryAgency].push({
      templateId: p.templateId,
      name: entry.name,
      state: p.state,
      mode: entry.mode,
    });
  }

  const width = 720;
  const trunkStartX = 220;
  const trunkEndX = width - 30;

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-4">
      <header className="mb-2 flex items-baseline justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            System map
          </h2>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Schematic — your three networks and every line you've touched, by status.
          </p>
        </div>
        <Legend />
      </header>

      <div className="overflow-x-auto">
        <svg width={width} height={250} className="min-w-[680px]">
          {AGENCY_ROWS.map((row) => {
            const dots = byAgency[row.id];
            const n = dots.length;
            return (
              <g key={row.id}>
                {/* Trunk line */}
                <line
                  x1={trunkStartX}
                  y1={row.y}
                  x2={trunkEndX}
                  y2={row.y}
                  stroke={row.color}
                  strokeWidth={5}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                {/* Agency label + origin node */}
                <circle cx={trunkStartX} cy={row.y} r={7} fill={row.color} />
                <text x={20} y={row.y - 8} className="fill-neutral-700 text-[11px] font-semibold">
                  {row.label}
                </text>
                <text x={20} y={row.y + 8} className="fill-neutral-400 text-[10px]">
                  {n} project{n === 1 ? '' : 's'}
                </text>

                {/* Project stations along the trunk */}
                {dots.map((d, i) => {
                  const x = n === 1
                    ? (trunkStartX + trunkEndX) / 2
                    : trunkStartX + 60 + ((trunkEndX - trunkStartX - 80) * i) / Math.max(1, n - 1);
                  return <Station key={d.templateId + i} x={x} y={row.y} dot={d} color={row.color} />;
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function Station({ x, y, dot, color }: { x: number; y: number; dot: StationDot; color: string }) {
  const operating = dot.state === 'operating';
  const building = dot.state === 'under_construction';
  return (
    <g>
      {building && (
        <circle cx={x} cy={y} r={11} fill="none" stroke="#f59e0b" strokeWidth={2}>
          <animate attributeName="r" values="9;14;9" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={x}
        cy={y}
        r={8}
        fill={operating ? color : building ? '#fbbf24' : 'white'}
        stroke={operating ? 'white' : building ? '#d97706' : '#9ca3af'}
        strokeWidth={2}
        strokeDasharray={dot.state === 'proposed' ? '2 2' : undefined}
      />
      <text x={x} y={y - 14} textAnchor="middle" className="text-[14px]">
        {MODE_GLYPH[dot.mode] ?? '🚉'}
      </text>
      <text
        x={x}
        y={y + 24}
        textAnchor="middle"
        className={`text-[9px] ${operating ? 'fill-neutral-800 font-semibold' : 'fill-neutral-500'}`}
      >
        {dot.name.length > 18 ? dot.name.slice(0, 17) + '…' : dot.name}
      </text>
    </g>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-neutral-600">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-sky-500" /> operating
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full bg-amber-400" /> building
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-neutral-400 bg-white" />{' '}
        proposed
      </span>
    </div>
  );
}
