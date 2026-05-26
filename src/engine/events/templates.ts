import type { EventTemplate } from '@/types/events';

/**
 * First-10 event templates. Phase 3.1.
 *
 * Mix:
 * - 2 scheduled (allowance renegotiation prompt, federal infrastructure call)
 * - 3 conditional (signal failure when reliability dips, fare evasion when cash low,
 *   mayor crowding complaint when riders high)
 * - 5 random (windfall, climate event, cyberattack, gaffe, maintenance breakthrough)
 *
 * Each event uses newsroom voice ("Star:", "Globe:", "CBC:") and presents
 * branches with hard tradeoffs across multiple axes (cash, trust, board,
 * public approval, opex). Some branches are gated by archetype or stat
 * predicates so the CEO's identity shapes the choice surface in the moment.
 */

export const EVENT_TEMPLATES: EventTemplate[] = [
  // ────────────────────────────────────────────────────────────────────
  // EV001 — Signal failure (conditional on TTC reliability low)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV001_signalFailure',
    category: 'operations_crisis',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'reliability', agency: 'ttc', lte: 65 },
      cooldownQuarters: 6,
    },
    outlet: 'Star',
    headline: 'Bloor-Yonge signal failure strands 40k at morning rush',
    body: '3-hour service halt on Lines 1 and 2 after legacy interlocking system faults. Riders trapped between stations; mayor calls it "unacceptable." Reporters want to know your plan.',
    urgency: 80,
    choices: [
      {
        id: 'apologize_capital',
        label: 'Public apology, commit to capital fix',
        tradeoff: '-$250M cash, +5 board confidence, +5 public approval',
        effects: [
          { kind: 'cash', deltaM: -250 },
          { kind: 'boardConfidence', delta: 5, reason: 'Decisive response to signal failure' },
          { kind: 'publicApproval', delta: 5 },
          { kind: 'reliability', agency: 'ttc', delta: 4 },
        ],
      },
      {
        id: 'deflect_to_province',
        label: 'Deflect: "Province underfunds rolling stock"',
        tradeoff: '-12 Queen\'s Park trust, -3 public approval, no cash hit',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -12 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'emergency_capital',
        label: 'Emergency capital release for signal modernization',
        tradeoff: '-$500M cash, +8 reliability, +10 public approval',
        effects: [
          { kind: 'cash', deltaM: -500 },
          { kind: 'reliability', agency: 'ttc', delta: 8 },
          { kind: 'publicApproval', delta: 10 },
        ],
      },
      {
        id: 'insider_quiet_call',
        label: 'Quietly call Hartwell for a province assist; no public statement',
        tradeoff: '[Insider] -8 Queen\'s Park trust, +$150M cash from province, +3 public approval',
        requires: { kind: 'ceoArchetype', archetype: 'insider' },
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -8 },
          { kind: 'cash', deltaM: 150 },
          { kind: 'publicApproval', delta: 3 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV002 — Federal infrastructure call (scheduled Q3, Q14, Q28, Q42)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV002_federalInfraCall',
    category: 'federal_pressure',
    trigger: { kind: 'scheduled', quarters: [3, 14, 28, 42] },
    outlet: 'Globe',
    headline: 'Ottawa opens $4B infrastructure top-up; deadline 60 days',
    body: 'Federal Transport Minister announces a competitive top-up envelope. Agencies must submit project pitches with environmental commitments. Decision falls to you.',
    urgency: 55,
    choices: [
      {
        id: 'ambitious_bid',
        label: 'Submit ambitious Eglinton-extension pitch ($1.5B ask)',
        tradeoff: '4Q delay: if Ottawa trust ≥55 you get $1.5B, else -5 Ottawa trust (snub)',
        effects: [
          {
            kind: 'queueDelayedEffect',
            quartersOut: 4,
            cause: 'Federal Eglinton bid result',
            effects: [
              { kind: 'cash', deltaM: 1_500 }, // success branch — see test note
            ],
          },
        ],
      },
      {
        id: 'modest_sogr',
        label: 'Modest SOGR-bundling pitch ($500M ask)',
        tradeoff: '2Q delay: if Ottawa trust ≥40 you get $500M, else nothing',
        effects: [
          {
            kind: 'queueDelayedEffect',
            quartersOut: 2,
            cause: 'Federal SOGR top-up',
            effects: [{ kind: 'cash', deltaM: 500 }],
          },
        ],
      },
      {
        id: 'decline',
        label: 'Decline; focus on existing commitments',
        tradeoff: '+3 board confidence (prudence), no cash, no political cost',
        effects: [
          { kind: 'boardConfidence', delta: 3, reason: 'Declined to overextend' },
        ],
      },
      {
        id: 'coalition_consortium',
        label: 'Pitch tri-gov consortium with QP + CH',
        tradeoff: '[Coalition Builder] 6Q delay: +$2.5B if all three trust ≥50, +5 to all gov trust on bid',
        requires: { kind: 'ceoArchetype', archetype: 'coalitionBuilder' },
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 5 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 5 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 6,
            cause: 'Consortium bid result',
            effects: [{ kind: 'cash', deltaM: 2_500 }],
          },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV003 — Mayor demands Eglinton service expansion (conditional)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV003_mayorEglintonCrowding',
    category: 'mayor_city',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'riders', agency: 'ttc', gte: 4_600_000 },
      cooldownQuarters: 8,
    },
    outlet: 'CityNews',
    headline: 'Mayor Liang demands "immediate action" on Eglinton overcrowding',
    body: 'Photos of packed Line 5 platforms blanket the morning shows. Liang holds press conference outside Yonge-Eglinton; calls for "more cars, more often, now."',
    urgency: 65,
    choices: [
      {
        id: 'service_hours',
        label: 'Commit to expanded service hours on Line 5',
        tradeoff: '+$80M/Q permanent opex, +12 City Hall trust, -3 board confidence',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 80 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 12 },
          { kind: 'boardConfidence', delta: -3, reason: 'Permanent opex commitment' },
        ],
      },
      {
        id: 'defer_to_capital',
        label: 'Defer: "Capital plan addresses this in 3 years"',
        tradeoff: '-10 City Hall trust, +3 board confidence, no opex hit',
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: -10 },
          { kind: 'boardConfidence', delta: 3, reason: 'Held firm on capital plan' },
        ],
      },
      {
        id: 'reframe_good_problem',
        label: 'Public statement: "Crowding is a sign of success"',
        tradeoff: '-15 City Hall trust, +5 public approval, +5 board confidence',
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: -15 },
          { kind: 'publicApproval', delta: 5 },
          { kind: 'boardConfidence', delta: 5, reason: 'Confident public posture' },
        ],
      },
      {
        id: 'technocrat_data_pitch',
        label: 'Brief the mayor with peak-load data + phased capacity model',
        tradeoff: '[Technocrat / templates ≥50] +10 City Hall trust, -5 public approval (perceived bloodless), no cash',
        requires: {
          kind: 'or',
          predicates: [
            { kind: 'ceoArchetype', archetype: 'internationalTechnocrat' },
            { kind: 'templates', gte: 50 },
          ],
        },
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: 10 },
          { kind: 'publicApproval', delta: -5 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV004 — Fare evasion retrofit pressure (conditional on low cash)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV004_fareEvasionCrackdown',
    category: 'auditor_oversight',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'cash', lte: 500 },
      cooldownQuarters: 12,
    },
    outlet: 'Internal memo',
    headline: 'Board: fare evasion estimated $80M/yr — recommend gate retrofit',
    body: 'Audit committee circulates a memo on TTC fare-gate vulnerabilities. Multiple paths exist; each has different optics and revenue trajectories.',
    urgency: 50,
    choices: [
      {
        id: 'gate_retrofit',
        label: 'Approve $250M fare-gate retrofit, 2Q rollout',
        tradeoff: '-$250M cash now, +$25M/Q fare revenue after 4Q',
        effects: [
          { kind: 'cash', deltaM: -250 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 4,
            cause: 'Fare-gate retrofit revenue lift',
            effects: [{ kind: 'fareRevenue', agency: 'ttc', deltaM: 25 }],
          },
        ],
      },
      {
        id: 'more_inspectors',
        label: 'Hire 200 more fare inspectors',
        tradeoff: '+$30M/Q opex, +$10M/Q fare revenue, -5 public approval (enforcement optics)',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 30 },
          { kind: 'fareRevenue', agency: 'ttc', deltaM: 10 },
          { kind: 'publicApproval', delta: -5 },
        ],
      },
      {
        id: 'amnesty_campaign',
        label: 'Public "amnesty + education" campaign',
        tradeoff: '-3 board confidence, +10 public approval, +$5M/Q fare (small lift)',
        effects: [
          { kind: 'boardConfidence', delta: -3, reason: 'Soft response to fare leakage' },
          { kind: 'publicApproval', delta: 10 },
          { kind: 'fareRevenue', agency: 'ttc', deltaM: 5 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV005 — Climate event: heat dome (random, summer quarters)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV005_heatDome',
    category: 'climate_environmental',
    trigger: {
      kind: 'random',
      baseWeight: 0.14,
      predicate: { kind: 'quarter', gte: 2 },
      cooldownQuarters: 8,
    },
    outlet: 'CBC',
    headline: '42°C heat dome warps Lakeshore East track; GO halted 2 days',
    body: 'Heat-related rail buckling forces emergency speed restrictions and a full 48-hour shutdown on Lakeshore East. Climate adaptation pressure from environmental groups.',
    urgency: 70,
    choices: [
      {
        id: 'adapt_budget',
        label: 'Approve climate adaptation budget for rail-cooling + station shading',
        tradeoff: '-$350M cash, +5 board confidence, +4 GO reliability',
        effects: [
          { kind: 'cash', deltaM: -350 },
          { kind: 'boardConfidence', delta: 5, reason: 'Proactive climate response' },
          { kind: 'reliability', agency: 'go', delta: 4 },
        ],
      },
      {
        id: 'service_only',
        label: 'Restore service, defer adaptation to next budget cycle',
        tradeoff: '-$60M cash, -6 GO reliability over time, -5 public approval',
        effects: [
          { kind: 'cash', deltaM: -60 },
          { kind: 'reliability', agency: 'go', delta: -6 },
          { kind: 'publicApproval', delta: -5 },
        ],
      },
      {
        id: 'open_books_report',
        label: 'Publish full climate-risk exposure report',
        tradeoff: '[OpenBooks] -3 board (perceived weakness), +15 public approval, +5 Ottawa trust',
        requires: { kind: 'openBooks', equals: true },
        effects: [
          { kind: 'boardConfidence', delta: -3, reason: 'Public climate disclosure' },
          { kind: 'publicApproval', delta: 15 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV006 — Unexpected windfall (random, low prob)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV006_provincialWindfall',
    category: 'funding_renegotiation',
    trigger: { kind: 'random', baseWeight: 0.10, cooldownQuarters: 16 },
    outlet: 'Globe',
    headline: 'Provincial budget surplus leaves $300M unallocated for infrastructure',
    body: "Queen's Park's mid-year surplus exceeds expectations. A small infrastructure envelope is technically unspoken-for. Insiders say it will be 'allocated to whoever asks loudly enough.'",
    urgency: 45,
    choices: [
      {
        id: 'aggressive_lobby',
        label: 'Aggressive lobbying through media + Hartwell',
        tradeoff: '-3 QP trust (pressure tactic), +$250M cash',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -3 },
          { kind: 'cash', deltaM: 250 },
        ],
      },
      {
        id: 'quiet_inquiry',
        label: 'Quiet inquiry through normal channels',
        tradeoff: '+$120M cash (gated): visible only if QP trust ≥40',
        requires: { kind: 'trust', gov: 'queensPark', gte: 40 },
        effects: [{ kind: 'cash', deltaM: 120 }],
      },
      {
        id: 'decline',
        label: 'Decline; protect future negotiation leverage',
        tradeoff: '+5 board confidence, +3 QP trust (restraint)',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Held back on opportunistic ask' },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 3 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV007 — Allowance renegotiation prompt (scheduled, 2Q before pact expires)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV007_allowanceRenegotiationPrompt',
    category: 'funding_renegotiation',
    trigger: { kind: 'scheduled', quarters: [14, 30, 46] },
    outlet: 'Internal memo',
    headline: 'Heads up: operating allowance pact expires in 2 quarters',
    body: 'Your tri-government operating pact renegotiates next year. Trust scores, delivery record, and operational KPIs will all weigh into the new envelope. Time to shape narrative.',
    urgency: 60,
    choices: [
      {
        id: 'lead_with_delivery',
        label: 'Lead the pitch with delivery wins and ridership trajectory',
        tradeoff: '+5 board confidence, +3 to all three gov trust',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Strong narrative entering negotiation' },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 3 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 3 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 3 },
        ],
      },
      {
        id: 'lead_with_need',
        label: 'Lead with operating deficit + transit-affordability framing',
        tradeoff: '+5 public approval, -3 board confidence (looks weak), no trust shift',
        effects: [
          { kind: 'publicApproval', delta: 5 },
          { kind: 'boardConfidence', delta: -3, reason: 'Pitched from need rather than strength' },
        ],
      },
      {
        id: 'open_books_pitch',
        label: 'Open the books, let the numbers do the talking',
        tradeoff: '[OpenBooks] +8 Ottawa trust, +5 QP trust, -5 public approval',
        requires: { kind: 'openBooks', equals: true },
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: 8 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 5 },
          { kind: 'publicApproval', delta: -5 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV008 — Cyberattack (random, very low prob, after Y1)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV008_cyberattack',
    category: 'technology',
    trigger: {
      kind: 'random',
      baseWeight: 0.07,
      predicate: { kind: 'quarter', gte: 6 },
      cooldownQuarters: 20,
    },
    outlet: 'Globe',
    headline: 'GTTA payment system breach: 18,000 rider cards compromised',
    body: 'Ransomware actor demands $40M for decryption keys. RCMP cyber unit on the line. Customer payment data quietly leaking on dark-web forums.',
    urgency: 90,
    choices: [
      {
        id: 'pay_ransom',
        label: 'Pay the ransom; restore service quickly',
        tradeoff: '-$50M cash, +5 board (decisive), -12 public approval (capitulation optics)',
        effects: [
          { kind: 'cash', deltaM: -50 },
          { kind: 'boardConfidence', delta: 5, reason: 'Restored service rapidly' },
          { kind: 'publicApproval', delta: -12 },
        ],
      },
      {
        id: 'refuse_disclose',
        label: 'Refuse + public disclosure + RCMP joint statement',
        tradeoff: '-$60M opex (forensics 4Q), -15 public approval, +5 board confidence',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 15 },
          { kind: 'publicApproval', delta: -15 },
          { kind: 'boardConfidence', delta: 5, reason: 'Principled refusal of ransom' },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 4,
            cause: 'Forensics rollback',
            effects: [{ kind: 'opex', agency: 'ttc', deltaM: -15 }],
          },
        ],
      },
      {
        id: 'refuse_quiet',
        label: 'Refuse + quiet RCMP work, no disclosure',
        tradeoff: '-3 board confidence, -5 public approval (leak risk), no immediate cash',
        effects: [
          { kind: 'boardConfidence', delta: -3, reason: 'Avoided full disclosure' },
          { kind: 'publicApproval', delta: -5 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV009 — Construction inflation surprise (random)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV009_constructionInflation',
    category: 'construction_crisis',
    trigger: { kind: 'random', baseWeight: 0.12, cooldownQuarters: 10 },
    outlet: 'Star',
    headline: 'Crosslinx flags 14% cost overrun on Ontario Line tunneling',
    body: 'Major contractor cites concrete and rebar inflation; demands schedule + cost relief or threatens to slow build. Lawyers say claim is borderline.',
    urgency: 75,
    choices: [
      {
        id: 'fight_claim',
        label: 'Fight the claim in arbitration',
        tradeoff: '-$80M legal cash, -2 reliability hit if Crosslinx slows work',
        effects: [
          { kind: 'cash', deltaM: -80 },
          { kind: 'reliability', agency: 'ttc', delta: -2 },
        ],
      },
      {
        id: 'accept_partial',
        label: 'Accept partial — split the inflation cost',
        tradeoff: '-$400M cash absorbed into OL budget, no schedule slip',
        effects: [{ kind: 'cash', deltaM: -400 }],
      },
      {
        id: 'accept_full',
        label: 'Accept full claim; preserve relationship',
        tradeoff: '-$800M cash, +5 future-project pricing (templates +3)',
        effects: [
          { kind: 'cash', deltaM: -800 },
          { kind: 'templates', delta: 3 },
        ],
      },
      {
        id: 'technocrat_audit',
        label: 'Demand independent cost audit before any settlement',
        tradeoff: '[Technocrat / templates ≥50] -$30M audit cost, -10 Crosslinx relationship (modelled as +0 to engineers), 50% chance claim drops to $150M',
        requires: {
          kind: 'or',
          predicates: [
            { kind: 'ceoArchetype', archetype: 'internationalTechnocrat' },
            { kind: 'templates', gte: 50 },
          ],
        },
        effects: [
          { kind: 'cash', deltaM: -180 },
          { kind: 'templates', delta: 2 },
        ],
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────
  // EV010 — Maintenance breakthrough (random, conditional on good ops)
  // ────────────────────────────────────────────────────────────────────
  {
    id: 'EV010_maintenanceBreakthrough',
    category: 'media',
    trigger: {
      kind: 'random',
      baseWeight: 0.10,
      predicate: {
        kind: 'and',
        predicates: [
          { kind: 'reliability', agency: 'ttc', gte: 75 },
          { kind: 'templates', gte: 40 },
        ],
      },
      cooldownQuarters: 12,
    },
    outlet: 'Star',
    headline: '"Toronto model" standardized procurement saves $40M on signal upgrades',
    body: 'Trade press picks up your engineering team\'s standardization work as a transit-industry best practice. Provincial transport ministry asks for a briefing.',
    urgency: 30,
    choices: [
      {
        id: 'publicize',
        label: 'Lean into the press cycle; tour the workshop',
        tradeoff: '+8 public approval, +5 Ottawa trust, +3 engineers (recruitment boost)',
        effects: [
          { kind: 'publicApproval', delta: 8 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
          { kind: 'engineers', delta: 3 },
        ],
      },
      {
        id: 'submit_provincial',
        label: 'Submit to provincial best-practice fund',
        tradeoff: '+8 QP trust, +$60M one-time, -3 public approval (less press coverage)',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: 8 },
          { kind: 'cash', deltaM: 60 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'internal_only',
        label: 'Internal celebration only',
        tradeoff: '+5 board confidence, +5 engineers, +3 templates',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Disciplined wins compound' },
          { kind: 'engineers', delta: 5 },
          { kind: 'templates', delta: 3 },
        ],
      },
    ],
  },
];

/** Lookup by id. */
export function eventTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.id === id);
}
