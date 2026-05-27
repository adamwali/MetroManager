import type { Character } from '@/types/characters';

interface CharacterCardProps {
  character: Character;
  /** Compact mode: smaller card for sidebars. */
  compact?: boolean;
}

const ROLE_LABEL: Record<Character['role'], string> = {
  politician_premier: 'Premier',
  politician_mayor: 'Mayor',
  politician_minister: 'Minister',
  politician_cabinet: 'Cabinet member',
  politician_critic: 'Opposition critic',
  staff_coo: 'COO',
  staff_cfo: 'CFO',
  staff_engineering: 'Chief Engineer',
  staff_deputy: 'Deputy CEO',
  director_operating: 'Director',
  external_contractor: 'Contractor exec',
  external_journalist: 'Journalist',
  external_nimby: 'Community organizer',
  external_consultant: 'Consultant',
};

function relationshipDescriptor(score: number): { label: string; tone: string } {
  if (score >= 80) return { label: 'aligned', tone: 'text-emerald-700 bg-emerald-50' };
  if (score >= 60) return { label: 'cordial', tone: 'text-blue-700 bg-blue-50' };
  if (score >= 40) return { label: 'neutral', tone: 'text-neutral-700 bg-neutral-100' };
  if (score >= 25) return { label: 'frosty', tone: 'text-amber-700 bg-amber-50' };
  return { label: 'hostile', tone: 'text-red-700 bg-red-50' };
}

export function CharacterCard({ character: c, compact = false }: CharacterCardProps) {
  const rel = c.relationship as unknown as number;
  const desc = relationshipDescriptor(rel);
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{c.name}</h3>
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">
            {ROLE_LABEL[c.role]}
          </p>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${desc.tone}`}>
          {desc.label} · {rel.toFixed(0)}
        </span>
      </header>
      {!compact && (
        <div className="mt-2 space-y-1.5 text-xs text-neutral-700">
          {c.bio.map((p, i) => (
            <p key={i} className="leading-snug">
              {p}
            </p>
          ))}
        </div>
      )}
      {!compact && c.openAsks.length > 0 && (
        <div className="mt-2 border-t border-neutral-100 pt-2">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500">Wants from you</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-neutral-700">
            {c.openAsks.map((a, i) => (
              <li key={i}>· {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
