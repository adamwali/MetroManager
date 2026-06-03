import { useGameStore } from '@state/gameStore';
import { dialogueFor } from '@/utils/characterDialogue';
import { moodFor } from '@/utils/characterMood';

interface MeetingModalProps {
  characterId: string;
  onClose: () => void;
}

const MOOD_COLOR: Record<string, string> = {
  aligned: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  neutral: 'bg-neutral-50 border-neutral-200 text-neutral-800',
  wary: 'bg-amber-50 border-amber-200 text-amber-900',
  hostile: 'bg-red-50 border-red-200 text-red-900',
};

const MOOD_LABEL: Record<string, string> = {
  aligned: 'Warm',
  neutral: 'Neutral',
  wary: 'Wary',
  hostile: 'Cold',
};

export function MeetingModal({ characterId, onClose }: MeetingModalProps) {
  const state = useGameStore((s) => s.state);
  const requestMeeting = useGameStore((s) => s.requestPrivateMeeting);
  const character = state.characters[characterId];
  if (!character) return null;

  const q = state.quarter as unknown as number;
  const mood = moodFor(character, q);
  const scene = dialogueFor(state, character, mood);
  const rel = character.relationship as unknown as number;
  const cooldown = character.lobbyingCooldownUntil as unknown as number | undefined;
  const onCooldown = cooldown !== undefined && cooldown > q;

  const pick = (response: 'warm' | 'transactional' | 'cold') => {
    requestMeeting(characterId, response);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
        <header className="border-b border-neutral-200 px-6 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Private meeting · {character.name}
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Relationship {rel.toFixed(0)}/100 ·{' '}
                <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold border ${MOOD_COLOR[mood]}`}>
                  {MOOD_LABEL[mood]}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
            >
              Close
            </button>
          </div>
        </header>

        {onCooldown ? (
          <div className="px-6 py-6 text-sm text-neutral-600">
            {character.name} just met with you. They won't take another meeting for{' '}
            {(cooldown as number) - q} quarters.
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-neutral-500">
                {scene.setting}
              </p>
              <p className="text-sm leading-relaxed text-neutral-800 italic">{scene.opening}</p>
            </div>

            <div className="border-t border-neutral-200 px-6 py-4 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Your response
              </div>
              {scene.responses.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pick(r.id)}
                  className="w-full text-left rounded-md border border-neutral-200 bg-white p-3 hover:border-blue-400 hover:bg-blue-50/40"
                >
                  <div className="text-sm font-medium text-neutral-900">{r.label}</div>
                  <div className="mt-1 text-[11px] text-neutral-500">{r.effect}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
