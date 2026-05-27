import type { Character, Characters } from '@/types/characters';
import { score } from '@/types/scalars';

/**
 * Initial character roster. Phase 6.2.
 *
 * Pulls from `docs/04-toronto-data-and-characters.md`. Initial 6 characters
 * span the three governments + three agency directors. Each has bio,
 * doctrine/personality, starting relationship score (0-100, separate from
 * gov-level trust), and openAsks placeholder.
 *
 * Reading order intended: ministers (the political voices the player hears
 * from most often), then directors (the operational voices on agency
 * dashboards).
 *
 * Future expansion (Phase 6.2.1+):
 *   - Critics / opposition characters
 *   - Senior staff (COO, CFO, engineering)
 *   - External voices (contractor execs, journalists, NIMBY leaders)
 */

export const INITIAL_CHARACTERS: Characters = {
  // ── Federal: Tremblay (Ottawa transport minister) ─────────────────────
  c_tremblay: {
    id: 'c_tremblay',
    name: 'Marie-Claude Tremblay',
    age: 54,
    role: 'politician_minister',
    governmentId: 'ottawa',
    bio: [
      "Federal Transport Minister. Three terms in cabinet, started as a parliamentary secretary under the previous Liberal government. Known for technocratic style — she'll grill you on cost-per-rider before she'll commit to a photo op.",
      'Tremblay genuinely likes well-run agencies. She also has an ear for the climate file and will push hard on net-zero commitments tied to any federal money.',
    ],
    relationship: score(50),
    interactions: [],
    openAsks: ['Quarterly briefings (open books welcome)', 'Climate commitments in major projects'],
  } as Character,

  // ── Provincial: Hartwell (Queen's Park, transit / infrastructure) ─────
  c_hartwell: {
    id: 'c_hartwell',
    name: 'David Hartwell',
    age: 61,
    role: 'politician_minister',
    governmentId: 'queensPark',
    bio: [
      "Provincial Transportation Minister. Long-serving Conservative MPP from a Vaughan riding, climbed via municipal politics. The kind of guy who calls everyone 'pal' and remembers names.",
      "Hartwell is a deals guy. He'll move money fast if you're willing to commit to suburban stations in his caucus colleagues' ridings. He resents data-first agencies that won't play the territorial game.",
    ],
    relationship: score(50),
    interactions: [],
    openAsks: ['Subway to Richmond Hill (his caucus priority)', 'Reciprocity on procurement'],
  } as Character,

  // ── Municipal: Liang (Toronto Mayor) ──────────────────────────────────
  c_liang: {
    id: 'c_liang',
    name: 'Kenneth Liang',
    age: 47,
    role: 'politician_mayor',
    governmentId: 'cityHall',
    bio: [
      "Mayor of Toronto. Two-term — won decisively after the previous mayor's transit-funding fiasco. Background in urban planning, runs the city like a project he's accountable for.",
      'Liang is highly responsive to local pressure — overflowing streetcars, accessibility gaps, fare hikes. He pushes hard on every issue but is also the easiest mayor to negotiate with if you bring concrete relief plans.',
    ],
    relationship: score(50),
    interactions: [],
    openAsks: ['Eglinton crowding relief', 'AODA accessibility timeline'],
  } as Character,

  // ── Agency directors ─────────────────────────────────────────────────
  c_ttc_director: {
    id: 'c_ttc_director',
    name: 'Priya Ramanathan',
    age: 49,
    role: 'director_operating',
    doctrine: 'reliabilityEngineer',
    tolerance: score(60),
    compPerQuarter: 0.6,
    bio: [
      'TTC Chief Operating Officer. 22 years operations experience, came up through bus operations into rail. Reliability-obsessed; her dashboards are tiled with subsystem condition scores.',
      "She'll quit before letting you push reliability below 50. Believes the network's job is to be there when riders need it; growth is a side effect of trust.",
    ],
    relationship: score(60),
    interactions: [],
    openAsks: ['Signal modernization funding', 'Maintenance discipline'],
  } as Character,

  c_go_director: {
    id: 'c_go_director',
    name: 'James Okafor',
    age: 52,
    role: 'director_operating',
    doctrine: 'ridershipMaximizer',
    tolerance: score(60),
    compPerQuarter: 0.5,
    bio: [
      "GO Transit Director. Background in regional rail planning; came over from Metrolinx's strategy team. Sees GO as the under-recognized growth engine of the GTHA.",
      "Pushes hard for frequency increases and electrification. Frustrated by underinvestment relative to TTC's profile.",
    ],
    relationship: score(60),
    interactions: [],
    openAsks: ['Lakeshore electrification', 'All-day two-way service expansion'],
  } as Character,

  c_up_director: {
    id: 'c_up_director',
    name: 'Sarah Chen',
    age: 44,
    role: 'director_operating',
    doctrine: 'costDiscipline',
    tolerance: score(60),
    compPerQuarter: 0.3,
    bio: [
      'UP Express Director. Newer to the role, hired from a Madrid airport-rail operator. Treats UP as a high-margin premium product first.',
      "Wants stable funding more than expansion. Doesn't push for new infrastructure — manages what she has.",
    ],
    relationship: score(60),
    interactions: [],
    openAsks: ['Fleet refurbishment budget'],
  } as Character,
};
