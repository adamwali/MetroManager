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
    actorCharacterId: 'c_ttc_director',
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
    actorCharacterId: 'c_tremblay',
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
    actorCharacterId: 'c_liang',
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
    actorCharacterId: 'c_go_director',
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
    actorCharacterId: 'c_hartwell',
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
  // ════════════════════════════════════════════════════════════════════════
  // Phase 3.2 expansion: 30 new templates (~5 ops crises, 5 political, 4
  // construction, 4 media, 3 climate, 3 elections, 3 character, 3 financial,
  // 3 informational, 5 no-good-options scattered throughout).
  // Telegraphs added to ~10 templates.
  // ════════════════════════════════════════════════════════════════════════

  // ── Operations crises ───────────────────────────────────────────────────
  {
    id: 'EV011_streetcarDerailment',
    category: 'operations_crisis',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'reliability', agency: 'ttc', lte: 55 },
      cooldownQuarters: 8,
    },
    outlet: 'CityNews',
    actorCharacterId: 'c_ttc_director',
    headline: 'Streetcar derailment on Spadina; 12 injured, no fatalities',
    body: 'Wheel-bearing failure on a 510 streetcar at Spadina + Bremner. Service halted 6 hours. Riders union calls for "full audit of TTC rolling stock."',
    urgency: 88,
    choices: [
      {
        id: 'full_audit',
        label: 'Order full rolling-stock audit, public report',
        tradeoff: '-$150M cash, +8 public approval, +4 reliability',
        effects: [
          { kind: 'cash', deltaM: -150 },
          { kind: 'publicApproval', delta: 8 },
          { kind: 'reliability', agency: 'ttc', delta: 4 },
        ],
      },
      {
        id: 'targeted_inspection',
        label: 'Targeted inspection of older fleet only',
        tradeoff: '-$40M cash, +2 reliability, -3 public approval',
        effects: [
          { kind: 'cash', deltaM: -40 },
          { kind: 'reliability', agency: 'ttc', delta: 2 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'deflect_to_age',
        label: '"Aging fleet, province needs to fund replacement"',
        tradeoff: '-10 Queen\'s Park trust, -5 public approval, -3 board confidence',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -10 },
          { kind: 'publicApproval', delta: -5 },
          { kind: 'boardConfidence', delta: -3, reason: 'Visible deflection' },
        ],
      },
    ],
  },

  {
    id: 'EV012_goSignalFailure',
    category: 'operations_crisis',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'reliability', agency: 'go', lte: 60 },
      cooldownQuarters: 8,
    },
    outlet: 'Star',
    actorCharacterId: 'c_go_director',
    headline: 'GO Lakeshore signals fail at peak; 28k commuters delayed 2 hours',
    body: 'Aging signal interlocking on Lakeshore West causes cascading delays. Suburban riders flood social media. MPPs from affected ridings demand answers.',
    urgency: 75,
    choices: [
      {
        id: 'signal_modernization',
        label: 'Fast-track signal modernization on GO Lakeshore',
        tradeoff: '-$400M cash, +6 GO reliability, +5 Queen\'s Park trust',
        effects: [
          { kind: 'cash', deltaM: -400 },
          { kind: 'reliability', agency: 'go', delta: 6 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 5 },
        ],
      },
      {
        id: 'manual_dispatch',
        label: 'Manual dispatch as stopgap, defer capital',
        tradeoff: '+$25M/Q opex, no reliability gain',
        effects: [
          { kind: 'opex', agency: 'go', deltaM: 25 },
        ],
      },
      {
        id: 'apologize_and_invest_later',
        label: 'Public apology + commit to study (no action this Q)',
        tradeoff: '-5 public approval, -3 QP trust',
        effects: [
          { kind: 'publicApproval', delta: -5 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: -3 },
        ],
      },
    ],
  },

  {
    id: 'EV013_busShortageHoliday',
    category: 'operations_crisis',
    trigger: {
      kind: 'random',
      baseWeight: 0.10,
      predicate: { kind: 'reliability', agency: 'ttc', lte: 70 },
      cooldownQuarters: 8,
    },
    outlet: 'CityNews',
    actorCharacterId: 'c_ttc_director',
    headline: 'Holiday bus shortage: 30% of scheduled buses missing from routes',
    body: 'Mechanical issues + driver shortage during peak holiday season. Riders waiting 40+ minutes in -15°C.',
    urgency: 65,
    choices: [
      {
        id: 'emergency_contractor',
        label: 'Emergency contractor buses, premium rate',
        tradeoff: '-$80M cash, +5 public approval',
        effects: [
          { kind: 'cash', deltaM: -80 },
          { kind: 'publicApproval', delta: 5 },
        ],
      },
      {
        id: 'overtime_drivers',
        label: 'Mandatory overtime for current drivers',
        tradeoff: '+$15M/Q opex for 2Q, +2 public approval',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 15 },
          { kind: 'publicApproval', delta: 2 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 2,
            cause: 'Holiday overtime ends',
            effects: [{ kind: 'opex', agency: 'ttc', deltaM: -15 }],
          },
        ],
      },
      {
        id: 'ride_it_out',
        label: 'Ride it out, public statement asks for patience',
        tradeoff: '-12 public approval, -5 City Hall trust',
        effects: [
          { kind: 'publicApproval', delta: -12 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -5 },
        ],
      },
    ],
  },

  {
    id: 'EV014_stationFire',
    category: 'operations_crisis',
    trigger: {
      kind: 'random',
      baseWeight: 0.04,
      predicate: { kind: 'reliability', agency: 'ttc', lte: 50 },
      cooldownQuarters: 24,
    },
    outlet: 'CBC',
    headline: 'Electrical fire at Dupont station; service halted 8 hours, no injuries',
    body: 'Aging electrical infrastructure caught fire during morning rush. Station closed for week of remediation.',
    urgency: 85,
    noGoodOptions: true,
    choices: [
      {
        id: 'rebuild_station',
        label: 'Full station rebuild',
        tradeoff: '-$800M cash, +10 reliability, +5 public approval',
        effects: [
          { kind: 'cash', deltaM: -800 },
          { kind: 'reliability', agency: 'ttc', delta: 10 },
          { kind: 'publicApproval', delta: 5 },
        ],
      },
      {
        id: 'spot_repair',
        label: 'Spot repair + electrical inspection sweep',
        tradeoff: '-$200M cash, +2 reliability, -3 public approval',
        effects: [
          { kind: 'cash', deltaM: -200 },
          { kind: 'reliability', agency: 'ttc', delta: 2 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'reopen_quickly',
        label: 'Reopen with provisional cabling, defer rebuild',
        tradeoff: '-$50M cash, -8 reliability, -10 public approval, +3 board (cost-conscious)',
        effects: [
          { kind: 'cash', deltaM: -50 },
          { kind: 'reliability', agency: 'ttc', delta: -8 },
          { kind: 'publicApproval', delta: -10 },
          { kind: 'boardConfidence', delta: 3, reason: 'Held the line on capex' },
        ],
      },
    ],
  },

  {
    id: 'EV015_snowstormShutdown',
    category: 'climate_environmental',
    trigger: {
      kind: 'random',
      baseWeight: 0.12,
      predicate: { kind: 'quarter', gte: 1 },
      cooldownQuarters: 4,
    },
    outlet: 'CBC',
    actorCharacterId: 'c_ttc_director',
    headline: 'Snowstorm closes Line 1, GO Lakeshore for 36 hours',
    body: 'Worst storm in 5 years. Switches frozen, signals offline. City effectively shut down. Mayor on television demanding "resilience plan."',
    urgency: 60,
    choices: [
      {
        id: 'snow_resilience',
        label: 'Invest in cold-weather signal upgrades',
        tradeoff: '-$200M cash, +4 reliability TTC and GO',
        effects: [
          { kind: 'cash', deltaM: -200 },
          { kind: 'reliability', agency: 'ttc', delta: 4 },
          { kind: 'reliability', agency: 'go', delta: 4 },
        ],
      },
      {
        id: 'route_back_open',
        label: 'Get service back online ASAP, defer hardening',
        tradeoff: '-$30M cash, no reliability change',
        effects: [{ kind: 'cash', deltaM: -30 }],
      },
      {
        id: 'blame_climate',
        label: 'Public statement: "Climate change events outpacing infrastructure"',
        tradeoff: '+5 public approval (sympathy), +5 Ottawa trust (climate framing)',
        effects: [
          { kind: 'publicApproval', delta: 5 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
        ],
      },
    ],
  },

  // ── Political crises ────────────────────────────────────────────────────
  {
    id: 'EV016_premierPetProject',
    category: 'premier_pressure',
    trigger: {
      kind: 'random',
      baseWeight: 0.10,
      predicate: { kind: 'trust', gov: 'queensPark', gte: 55 },
      cooldownQuarters: 12,
    },
    outlet: 'Globe',
    actorCharacterId: 'c_hartwell',
    headline: 'Premier announces "priority connection" to suburban riding',
    body: "Premier's office quietly requests you prioritize a feasibility study for a low-ridership line connecting their riding. Province has political reasons; you have operational ones.",
    urgency: 55,
    choices: [
      {
        id: 'commit_full',
        label: 'Commit to full feasibility study and tentative design',
        tradeoff: '-$60M cash, +12 QP trust, -3 board (perceived as captured)',
        effects: [
          { kind: 'cash', deltaM: -60 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 12 },
          { kind: 'boardConfidence', delta: -3, reason: 'Bowing to political ask' },
        ],
      },
      {
        id: 'limited_study',
        label: 'Quiet limited study, no public commitment',
        tradeoff: '-$15M cash, +3 QP trust',
        effects: [
          { kind: 'cash', deltaM: -15 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 3 },
        ],
      },
      {
        id: 'refuse_with_data',
        label: 'Present ridership data: line cannot meet threshold',
        tradeoff: '-10 QP trust, +5 board, +3 templates',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -10 },
          { kind: 'boardConfidence', delta: 5, reason: 'Stood by analysis' },
          { kind: 'templates', delta: 3 },
        ],
      },
    ],
  },

  {
    id: 'EV017_mayorFareFreezePreElection',
    category: 'mayor_city',
    trigger: { kind: 'scheduled', quarters: [6, 22, 38] }, // 2Q before each city election (Q8, Q24, Q40)
    outlet: 'CityNews',
    actorCharacterId: 'c_liang',
    headline: 'Mayor demands fare freeze pledge before fall election',
    body: 'Mayor Liang requests public commitment to no fare increases through next term. Polls say this is a winning issue.',
    urgency: 70,
    telegraph: {
      headline: 'Mayor likely to campaign on transit-fare stability',
      body: 'Polling firms report fare-affordability is the #2 issue heading into the city campaign.',
      quartersBefore: 2,
      outlet: 'CityNews',
    },
    choices: [
      {
        id: 'public_pledge',
        label: 'Public no-fare-hike pledge for next 4 quarters',
        tradeoff:
          '+15 City Hall trust, +5 public approval, fare-hike pledge active 4Q (TTC dashboard will warn if you break it)',
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: 15 },
          { kind: 'publicApproval', delta: 5 },
          {
            kind: 'addObligation',
            obligationId: 'ttc-fare-freeze-pledge',
            obligationKind: 'fareFreezePledge',
            agencyId: 'ttc',
            durationQuarters: 4,
            costOfBreaking: [
              { kind: 'governmentTrust', gov: 'cityHall', delta: -20 },
              { kind: 'publicApproval', delta: -12 },
              { kind: 'boardConfidence', delta: -3, reason: 'Broke fare-freeze pledge' },
            ],
            breakingDescription:
              '-20 City Hall trust, -12 public approval, -3 board confidence (broken pledge)',
          },
        ],
      },
      {
        id: 'private_assurance',
        label: 'Private assurance, no public pledge',
        tradeoff: '+5 City Hall trust, no public approval lift',
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: 5 },
        ],
      },
      {
        id: 'refuse_publicly',
        label: 'Refuse: "fare strategy is operational, not political"',
        tradeoff: '-15 City Hall trust, +5 board confidence, -3 public approval',
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: -15 },
          { kind: 'boardConfidence', delta: 5, reason: 'Held the operational line' },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
    ],
  },

  {
    id: 'EV018_federalMinisterVisit',
    category: 'federal_pressure',
    trigger: { kind: 'scheduled', quarters: [8, 24, 40] },
    outlet: 'Globe',
    actorCharacterId: 'c_tremblay',
    headline: 'Federal Transport Minister visiting GTHA, expects deliverables',
    body: 'Minister scheduling a 3-day visit. Photo ops, ribbon cuttings, expectations of "concrete federal-transit success stories" they can announce.',
    urgency: 50,
    telegraph: {
      headline: 'Minister staff scoping GTHA visit for next quarter',
      body: 'Sources at the federal Transport ministry plan a high-profile visit.',
      quartersBefore: 2,
      outlet: 'Globe',
    },
    choices: [
      {
        id: 'host_in_style',
        label: 'Roll out red carpet, host showcase tour',
        tradeoff: '-$20M cash, +15 Ottawa trust, +5 public approval',
        effects: [
          { kind: 'cash', deltaM: -20 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 15 },
          { kind: 'publicApproval', delta: 5 },
        ],
      },
      {
        id: 'standard_briefing',
        label: 'Standard briefing + boardroom meeting',
        tradeoff: '+5 Ottawa trust, no other changes',
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
        ],
      },
      {
        id: 'cite_scheduling',
        label: 'Cite scheduling conflicts; offer phone briefing',
        tradeoff: '-10 Ottawa trust, +3 board (no kowtowing)',
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: -10 },
          { kind: 'boardConfidence', delta: 3, reason: 'Refused performative theatrics' },
        ],
      },
    ],
  },

  {
    id: 'EV019_oppositionAttack',
    category: 'premier_pressure',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'trust', gov: 'queensPark', lte: 40 },
      cooldownQuarters: 10,
    },
    outlet: 'Globe',
    headline: 'Opposition leader: "GTTA leadership has failed Ontario taxpayers"',
    body: "Provincial opposition attacks agency in question period. Public-relations cycle expected to last 2-3 weeks.",
    urgency: 60,
    choices: [
      {
        id: 'counter_facts',
        label: 'Counter with operational facts + open-books briefing',
        tradeoff: '+5 QP trust, +5 Ottawa trust, +3 templates',
        requires: { kind: 'openBooks', equals: true },
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: 5 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
          { kind: 'templates', delta: 3 },
        ],
      },
      {
        id: 'ignore_them',
        label: 'Stay above the fray, no public response',
        tradeoff: '-5 public approval, +3 board (statesmanship)',
        effects: [
          { kind: 'publicApproval', delta: -5 },
          { kind: 'boardConfidence', delta: 3, reason: 'Stayed above politics' },
        ],
      },
      {
        id: 'private_negotiate',
        label: '[Insider] Private back-channel to opposition leader',
        tradeoff: '-5 board (perceived as political), +8 QP trust',
        requires: { kind: 'ceoArchetype', archetype: 'insider' },
        effects: [
          { kind: 'boardConfidence', delta: -5, reason: 'Engaged in back-channel politics' },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 8 },
        ],
      },
    ],
  },

  {
    id: 'EV020_councillorWardExtension',
    category: 'mayor_city',
    trigger: {
      kind: 'random',
      baseWeight: 0.08,
      predicate: { kind: 'trust', gov: 'cityHall', lte: 50 },
      cooldownQuarters: 10,
    },
    outlet: 'CityNews',
    headline: 'Councillor demands subway extension into her ward, threatens budget fight',
    body: 'Outspoken downtown councillor wants formal study commitment. Will tie up next city operating-funding vote unless satisfied.',
    urgency: 65,
    choices: [
      {
        id: 'commit_study',
        label: 'Commit to $30M feasibility study',
        tradeoff: '-$30M cash, +8 City Hall trust',
        effects: [
          { kind: 'cash', deltaM: -30 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 8 },
        ],
      },
      {
        id: 'queue_in_pipeline',
        label: 'Add to long-term pipeline, no commitment',
        tradeoff: '-3 City Hall trust, no cash impact',
        effects: [{ kind: 'governmentTrust', gov: 'cityHall', delta: -3 }],
      },
      {
        id: 'flat_refusal',
        label: 'Refuse: "ridership analysis does not support extension"',
        tradeoff: '-12 City Hall trust, +5 board, +3 templates',
        effects: [
          { kind: 'governmentTrust', gov: 'cityHall', delta: -12 },
          { kind: 'boardConfidence', delta: 5, reason: 'Refused political project' },
          { kind: 'templates', delta: 3 },
        ],
      },
    ],
  },

  // ── Construction crises ─────────────────────────────────────────────────
  {
    id: 'EV021_olDesignFlaw',
    category: 'construction_crisis',
    trigger: {
      kind: 'random',
      baseWeight: 0.08,
      cooldownQuarters: 20,
    },
    outlet: 'Star',
    headline: 'Crosslinx engineers flag tunnel-grade design flaw on Ontario Line',
    body: "Independent peer review identifies an 800m tunnel section where the original design exceeds maximum gradient. Options: redesign + delay, exception waiver, or eat the construction risk.",
    urgency: 80,
    choices: [
      {
        id: 'redesign',
        label: 'Authorize redesign + 2Q schedule delay',
        tradeoff: '-$300M cash, +3 templates, no schedule impact on opening (absorbed in buffer)',
        effects: [
          { kind: 'cash', deltaM: -300 },
          { kind: 'templates', delta: 3 },
        ],
      },
      {
        id: 'exception_waiver',
        label: 'Apply for regulatory exception, proceed as designed',
        tradeoff: '-$30M cash (legal), -3 templates, gamble on regulator',
        effects: [
          { kind: 'cash', deltaM: -30 },
          { kind: 'templates', delta: -3 },
        ],
      },
      {
        id: 'absorb_risk',
        label: 'Proceed; absorb future remediation if needed',
        tradeoff: 'No immediate cost; queued $400M remediation in 8Q (50% probability)',
        effects: [
          {
            kind: 'queueDelayedEffect',
            quartersOut: 8,
            cause: 'OL tunnel remediation likely needed',
            effects: [
              { kind: 'cash', deltaM: -400 },
              { kind: 'publicApproval', delta: -8 },
            ],
          },
        ],
      },
    ],
  },

  {
    id: 'EV022_nimbyLawsuit',
    category: 'construction_crisis',
    trigger: {
      kind: 'random',
      baseWeight: 0.10,
      // Wired to nimbyOrganization: an organized opposition is required for
      // a lawsuit. Phase 3.2 polish — previously this engineVar was orphan.
      predicate: { kind: 'nimbyOrganization', gte: 30 },
      cooldownQuarters: 12,
    },
    outlet: 'Star',
    headline: 'Bloor West residents file injunction against future Line 2 extension',
    body: 'Neighborhood association argues environmental review was deficient. Could delay any future western extension by 2-4Q.',
    urgency: 55,
    choices: [
      {
        id: 'fight_in_court',
        label: 'Fight in court with expanded environmental review',
        tradeoff: '-$50M legal cash, +3 templates, no schedule risk',
        effects: [
          { kind: 'cash', deltaM: -50 },
          { kind: 'templates', delta: 3 },
        ],
      },
      {
        id: 'settle_with_concessions',
        label: 'Settle: noise mitigation + community fund',
        tradeoff: '-$120M cash, +10 public approval, +5 City Hall trust, -10 NIMBY organization',
        effects: [
          { kind: 'cash', deltaM: -120 },
          { kind: 'publicApproval', delta: 10 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 5 },
          { kind: 'nimbyOrganization', delta: -10 }, // settlement dissolves the opposition
        ],
      },
      {
        id: 'public_attack',
        label: '"Vocal minority blocking transit for the region"',
        tradeoff: '+5 board, -15 public approval (NIMBY backlash), -10 City Hall trust, +15 NIMBY organization',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Pushed back on NIMBY framing' },
          { kind: 'publicApproval', delta: -15 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -10 },
          { kind: 'nimbyOrganization', delta: 15 }, // backlash organizes the opposition further
        ],
      },
    ],
  },

  {
    id: 'EV023_contractorStrikeThreat',
    category: 'crosslinx_contractor',
    trigger: { kind: 'random', baseWeight: 0.06, cooldownQuarters: 16 },
    outlet: 'Star',
    headline: 'Construction union: "Strike vote scheduled if wage talks fail"',
    body: 'Crosslinx workforce demanding 12% raise + cost-of-living escalator. Strike would delay Ontario Line 1-3Q. Negotiations on a knife edge.',
    urgency: 80,
    noGoodOptions: true,
    choices: [
      {
        id: 'accept_demands',
        label: 'Accept full demands; preserve schedule',
        tradeoff: '-$600M cash (passed to OL project), +5 templates, +5 public approval',
        effects: [
          { kind: 'cash', deltaM: -600 },
          { kind: 'templates', delta: 5 },
          { kind: 'publicApproval', delta: 5 },
        ],
      },
      {
        id: 'partial_offer',
        label: 'Counter with 6%, hope they accept',
        tradeoff: '-$250M cash; 60% chance strike still happens (queued schedule risk)',
        effects: [
          { kind: 'cash', deltaM: -250 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 2,
            cause: 'Potential construction slowdown',
            effects: [{ kind: 'publicApproval', delta: -8 }],
          },
        ],
      },
      {
        id: 'hardball',
        label: 'Hardball: "We negotiated in good faith. We are done."',
        tradeoff: '-15 public approval, +5 board, OL delayed 2Q (modeled as +2Q project delay queued)',
        effects: [
          { kind: 'publicApproval', delta: -15 },
          { kind: 'boardConfidence', delta: 5, reason: 'Refused contractor pressure' },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 1,
            cause: 'Strike disrupts construction',
            effects: [{ kind: 'cash', deltaM: -100 }],
          },
        ],
      },
    ],
  },

  {
    id: 'EV024_heritageBuilding',
    category: 'construction_crisis',
    trigger: { kind: 'random', baseWeight: 0.04, cooldownQuarters: 16 },
    outlet: 'Star',
    headline: 'Heritage Toronto designates Bloor structure on planned alignment',
    body: 'A turn-of-the-century commercial block on the planned Line 5 western extension was just protected. Workaround alignment adds $400M; demolition fight could last 2Q.',
    urgency: 50,
    choices: [
      {
        id: 'realign',
        label: 'Realign route around the structure',
        tradeoff: '-$400M cash (future project), +10 public approval, +5 City Hall trust',
        effects: [
          { kind: 'cash', deltaM: -400 },
          { kind: 'publicApproval', delta: 10 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 5 },
        ],
      },
      {
        id: 'fight_designation',
        label: 'Fight heritage designation in court',
        tradeoff: '-$80M legal, -10 public approval, -5 City Hall trust, +10 NIMBY organization',
        effects: [
          { kind: 'cash', deltaM: -80 },
          { kind: 'publicApproval', delta: -10 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -5 },
          { kind: 'nimbyOrganization', delta: 10 }, // court fight mobilizes opposition
        ],
      },
    ],
  },

  // ── Media / scandal ─────────────────────────────────────────────────────
  {
    id: 'EV025_wastefulOpEd',
    category: 'media',
    trigger: {
      kind: 'random',
      baseWeight: 0.08,
      predicate: { kind: 'or', predicates: [{ kind: 'cash', gte: 2000 }, { kind: 'publicApproval', lte: 45 }] },
      cooldownQuarters: 12,
    },
    outlet: 'Globe',
    headline: 'Op-ed: "GTTA cash hoard while service degrades"',
    body: 'Globe editorial board questions agency cash position vs visible service issues. Calls for transparency.',
    urgency: 40,
    choices: [
      {
        id: 'op_ed_response',
        label: 'Write counter op-ed with cash-management explanation',
        tradeoff: '+3 public approval, +3 templates',
        effects: [
          { kind: 'publicApproval', delta: 3 },
          { kind: 'templates', delta: 3 },
        ],
      },
      {
        id: 'open_the_books',
        label: 'Open the books — publish quarterly financials',
        tradeoff: 'Set openBooks=true. +10 Ottawa trust, +5 board confidence',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Adopted transparency posture' },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 10 },
        ],
      },
      {
        id: 'ignore',
        label: 'No public response',
        tradeoff: '-5 public approval',
        effects: [{ kind: 'publicApproval', delta: -5 }],
      },
    ],
  },

  {
    id: 'EV026_whistleblowerLeak',
    category: 'auditor_oversight',
    trigger: {
      kind: 'random',
      baseWeight: 0.04,
      predicate: { kind: 'openBooks', equals: false },
      cooldownQuarters: 24,
    },
    outlet: 'Star',
    headline: 'Whistleblower releases internal memos: deferred maintenance is worse than disclosed',
    body: 'Anonymous source provides Star with confidential capital planning documents showing $5B in known but unreported backlog.',
    urgency: 85,
    noGoodOptions: true,
    choices: [
      {
        id: 'come_clean',
        label: 'Hold press conference; commit to addressing backlog',
        tradeoff: '-15 public approval (admission), -8 board (looks weak), +10 Ottawa trust',
        effects: [
          { kind: 'publicApproval', delta: -15 },
          { kind: 'boardConfidence', delta: -8, reason: 'Forced disclosure' },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 10 },
        ],
      },
      {
        id: 'discredit',
        label: 'Discredit the documents as cherry-picked',
        tradeoff: '-20 public approval (eventually loses), -5 Ottawa trust',
        effects: [
          { kind: 'publicApproval', delta: -20 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: -5 },
        ],
      },
      {
        id: 'change_topic',
        label: 'Announce new ribbon-cutting; bury the story',
        tradeoff: '-10 public approval, -10 board confidence',
        effects: [
          { kind: 'publicApproval', delta: -10 },
          { kind: 'boardConfidence', delta: -10, reason: 'Refused to face the music' },
        ],
      },
    ],
  },

  {
    id: 'EV027_documentaryExposesBacklog',
    category: 'media',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'reliability', agency: 'ttc', lte: 55 },
      cooldownQuarters: 16,
    },
    outlet: 'CBC',
    headline: 'CBC documentary: "Last Stop" exposes Toronto transit maintenance crisis',
    body: 'Hour-long primetime documentary on TTC infrastructure. Includes interviews with frontline workers. National attention.',
    urgency: 75,
    choices: [
      {
        id: 'public_commitment',
        label: 'Public commitment: $1B over next year on backlog',
        tradeoff: '-$1000M cash, +15 public approval, +10 Ottawa trust, +5 reliability',
        effects: [
          { kind: 'cash', deltaM: -1000 },
          { kind: 'publicApproval', delta: 15 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 10 },
          { kind: 'reliability', agency: 'ttc', delta: 5 },
        ],
      },
      {
        id: 'modest_commitment',
        label: 'Modest commitment, defer to multi-year capital plan',
        tradeoff: '-$200M cash, +5 public approval, +3 reliability',
        effects: [
          { kind: 'cash', deltaM: -200 },
          { kind: 'publicApproval', delta: 5 },
          { kind: 'reliability', agency: 'ttc', delta: 3 },
        ],
      },
      {
        id: 'defend',
        label: '"Documentary cherry-picked older footage"',
        tradeoff: '-20 public approval, -10 board',
        effects: [
          { kind: 'publicApproval', delta: -20 },
          { kind: 'boardConfidence', delta: -10, reason: 'Defensive PR posture' },
        ],
      },
    ],
  },

  {
    id: 'EV028_transitAwardWin',
    category: 'media',
    trigger: {
      kind: 'random',
      baseWeight: 0.06,
      predicate: {
        kind: 'and',
        predicates: [
          { kind: 'reliability', agency: 'ttc', gte: 75 },
          { kind: 'publicApproval', gte: 55 },
        ],
      },
      cooldownQuarters: 16,
    },
    outlet: 'Star',
    headline: 'GTHA named "North America\'s Best Transit Network" by APTA',
    body: 'American Public Transit Association award. Conference invites, press tour opportunities, recruitment boon.',
    urgency: 25,
    displayKind: 'informational',
    choices: [],
  },

  // ── Climate ─────────────────────────────────────────────────────────────
  {
    id: 'EV029_climateAdaptationFunding',
    category: 'climate_environmental',
    trigger: { kind: 'scheduled', quarters: [9, 25, 45] },
    outlet: 'Globe',
    headline: 'Ottawa announces $2B climate adaptation envelope for transit agencies',
    body: 'Federal Climate Bank releases competitive funding for transit climate resilience. Submissions in 90 days.',
    urgency: 55,
    telegraph: {
      headline: 'Climate Bank signals transit-resilience funding for next budget',
      body: 'Federal departments forecasting climate adaptation grants for transit infrastructure.',
      quartersBefore: 3,
      outlet: 'Globe',
    },
    choices: [
      {
        id: 'ambitious_bid',
        label: 'Submit ambitious climate hardening pitch',
        tradeoff: '6Q delay: +$800M if Ottawa trust ≥55, else +$200M',
        effects: [
          {
            kind: 'queueDelayedEffect',
            quartersOut: 6,
            cause: 'Climate Bank funding result',
            effects: [{ kind: 'cash', deltaM: 800 }],
          },
          { kind: 'reliability', agency: 'go', delta: 2 },
        ],
      },
      {
        id: 'modest_resilience',
        label: 'Modest resilience pitch — fast turnaround',
        tradeoff: '2Q delay: +$300M reliable',
        effects: [
          {
            kind: 'queueDelayedEffect',
            quartersOut: 2,
            cause: 'Climate Bank modest grant',
            effects: [{ kind: 'cash', deltaM: 300 }],
          },
        ],
      },
      {
        id: 'no_bid',
        label: 'Skip; focus on existing capital plan',
        tradeoff: '+3 board (focus), no cash, no political cost',
        effects: [{ kind: 'boardConfidence', delta: 3, reason: 'Prioritized core capital plan' }],
      },
    ],
  },

  {
    id: 'EV030_floodingTunnel',
    category: 'climate_environmental',
    trigger: { kind: 'random', baseWeight: 0.03, cooldownQuarters: 20 },
    outlet: 'CBC',
    headline: 'Flash flood closes Bloor-Yonge subway tunnel for 5 days',
    body: 'Atmospheric river dumps 6 months of rain in 24 hours. Tunnel pumping infrastructure overwhelmed.',
    urgency: 85,
    choices: [
      {
        id: 'capital_upgrade',
        label: 'Major drainage capital project',
        tradeoff: '-$400M cash, +6 reliability, +8 public approval',
        effects: [
          { kind: 'cash', deltaM: -400 },
          { kind: 'reliability', agency: 'ttc', delta: 6 },
          { kind: 'publicApproval', delta: 8 },
        ],
      },
      {
        id: 'patch_pumps',
        label: 'Replace pumps, defer larger drainage work',
        tradeoff: '-$100M cash, +2 reliability',
        effects: [
          { kind: 'cash', deltaM: -100 },
          { kind: 'reliability', agency: 'ttc', delta: 2 },
        ],
      },
    ],
  },

  // ── Elections (informational) ───────────────────────────────────────────
  {
    id: 'EV032_federalElection',
    category: 'election',
    trigger: { kind: 'scheduled', quarters: [12, 28, 44] },
    outlet: 'CBC',
    headline: 'Federal election concludes — new government takes office',
    body: 'Power has shifted in Ottawa. Outgoing minister out; new portfolio holder still being briefed. Transit envelope priorities unclear for at least 2 quarters.',
    urgency: 30,
    displayKind: 'informational',
    choices: [],
    telegraph: {
      headline: 'Federal election campaign begins; transit barely mentioned',
      body: 'National campaign focused on housing and affordability. Transit appears in platforms but at low salience.',
      quartersBefore: 2,
      outlet: 'CBC',
    },
  },

  {
    id: 'EV033_provincialElection',
    category: 'election',
    trigger: { kind: 'scheduled', quarters: [10, 26, 42] },
    outlet: 'Globe',
    headline: "Queen's Park election concludes; transit a campaign issue",
    body: 'Province has voted. Premier transition or continuity? Transit policy continuity uncertain.',
    urgency: 30,
    displayKind: 'informational',
    choices: [],
  },

  {
    id: 'EV034_cityElection',
    category: 'election',
    trigger: { kind: 'scheduled', quarters: [8, 24, 40] },
    outlet: 'CityNews',
    headline: 'City Hall election concludes; mayor races set the agenda',
    body: 'Toronto has voted. Mayor and council are seated. Operating-grant decisions in the next quarter.',
    urgency: 30,
    displayKind: 'informational',
    choices: [],
  },

  // ── Character / Internal ────────────────────────────────────────────────
  {
    id: 'EV036_engineerPoached',
    category: 'internal_politics',
    trigger: {
      kind: 'random',
      baseWeight: 0.06,
      predicate: { kind: 'engineers', gte: 200 },
      cooldownQuarters: 12,
    },
    outlet: 'Internal memo',
    headline: 'Lead signals engineer recruited by private rail consultancy',
    body: 'Your top signals engineer received a 60% raise offer. Counter or let them go?',
    urgency: 45,
    choices: [
      {
        id: 'counter_offer',
        label: 'Counter the offer; retain talent',
        tradeoff: '+$8M/Q opex permanent, +5 engineers, +3 templates',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 8 },
          { kind: 'engineers', delta: 5 },
          { kind: 'templates', delta: 3 },
        ],
      },
      {
        id: 'let_them_go',
        label: 'Wish them well, promote from within',
        tradeoff: '-10 engineers, -2 templates',
        effects: [
          { kind: 'engineers', delta: -10 },
          { kind: 'templates', delta: -2 },
        ],
      },
    ],
  },

  {
    id: 'EV037_boardMemberRetires',
    category: 'internal_politics',
    trigger: { kind: 'scheduled', quarters: [11, 31, 51] },
    outlet: 'Internal memo',
    headline: 'Board member announces retirement effective end of quarter',
    body: 'Senior board member stepping down. Mayor + premier will nominate replacement candidates.',
    urgency: 25,
    displayKind: 'informational',
    choices: [],
  },

  // ── Financial / bond market ─────────────────────────────────────────────
  {
    id: 'EV038_creditRatingReview',
    category: 'bond_market',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'or', predicates: [{ kind: 'cash', lte: -1000 }, { kind: 'board', lte: 35 }] },
      cooldownQuarters: 8,
    },
    outlet: 'Globe',
    headline: 'Moody\'s puts GTTA on credit watch',
    body: 'Rating agency flags concerns about cash trajectory + governance. Downgrade decision in 60 days.',
    urgency: 80,
    noGoodOptions: true,
    choices: [
      {
        id: 'open_books_briefing',
        label: 'Open the books; full investor briefing',
        tradeoff: '+5 board, +10 Ottawa trust, -3 public approval (austerity optics)',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Took rating threat seriously' },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 10 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'fight_perception',
        label: 'Push back: "These are temporary deficit conditions"',
        tradeoff: '-3 board, -5 Ottawa trust',
        effects: [
          { kind: 'boardConfidence', delta: -3, reason: 'Argued with rating agency' },
          { kind: 'governmentTrust', gov: 'ottawa', delta: -5 },
        ],
      },
      {
        id: 'request_provincial_backstop',
        label: 'Request provincial guarantee on debt',
        tradeoff: '-10 QP trust (favor used), prevents downgrade, +3 board',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -10 },
          { kind: 'boardConfidence', delta: 3, reason: 'Secured backstop' },
        ],
      },
    ],
  },

  {
    id: 'EV039_bocRateDecision',
    category: 'bond_market',
    trigger: { kind: 'scheduled', quarters: [4, 8, 16, 24, 32, 40, 48, 56] },
    outlet: 'Globe',
    headline: 'Bank of Canada rate decision — floating-rate debt service shifts',
    body: 'Bank of Canada meeting. Your floating-rate tranches will see service cost shift next quarter.',
    urgency: 20,
    displayKind: 'informational',
    choices: [],
  },

  // ── More no-good-options ────────────────────────────────────────────────
  {
    id: 'EV040_accessibilityLawsuit',
    category: 'auditor_oversight',
    trigger: { kind: 'random', baseWeight: 0.04, cooldownQuarters: 20 },
    outlet: 'CityNews',
    headline: 'Accessibility class-action: GTTA fails AODA compliance at 18 stations',
    body: 'Disability advocacy groups file suit over inaccessible legacy stations. Discovery process will be public.',
    urgency: 70,
    noGoodOptions: true,
    choices: [
      {
        id: 'settle',
        label: 'Settle + accelerated accessibility retrofit',
        tradeoff: '-$800M cash, +15 public approval, +10 City Hall trust',
        effects: [
          { kind: 'cash', deltaM: -800 },
          { kind: 'publicApproval', delta: 15 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 10 },
        ],
      },
      {
        id: 'fight_in_court',
        label: 'Fight; argue legacy stations grandfathered',
        tradeoff: '-$100M legal cash, -20 public approval, -10 City Hall trust (eventually lose anyway in 8Q)',
        effects: [
          { kind: 'cash', deltaM: -100 },
          { kind: 'publicApproval', delta: -20 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -10 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 8,
            cause: 'Lawsuit lost, mandated retrofit',
            effects: [{ kind: 'cash', deltaM: -600 }],
          },
        ],
      },
      {
        id: 'partial_settlement',
        label: 'Partial: 8 stations now, rest in 3 years',
        tradeoff: '-$400M cash, +5 public approval, +3 board',
        effects: [
          { kind: 'cash', deltaM: -400 },
          { kind: 'publicApproval', delta: 5 },
          { kind: 'boardConfidence', delta: 3, reason: 'Balanced response' },
        ],
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════════════
  // Phase 6.3 + 5.3 polish: allowance renegotiation + critical subsystem
  // ════════════════════════════════════════════════════════════════════════

  // ── EV041 — Allowance renegotiation (Y4/Y8/Y12 decision event) ──────────
  {
    id: 'EV041_allowanceRenegotiation',
    category: 'funding_renegotiation',
    trigger: { kind: 'scheduled', quarters: [16, 32, 48] },
    outlet: 'Internal memo',
    headline: 'Tri-government allowance renegotiation: outcome depends on your scorecard',
    body:
      "The four-year operating-allowance pact is up. Combined trust, board confidence, and delivery wins set the baseline outcome. You can accept what they offer, lobby aggressively to push for better terms (at political cost), or open the books and let the data speak (if you've maintained transparency).",
    urgency: 95,
    choices: [
      {
        id: 'accept',
        label: 'Accept the offered outcome',
        tradeoff: 'Outcome computed from current trust + board + delivery. See preview before clicking.',
        effects: [{ kind: 'renegotiateAllowance', strategy: 'accept' }],
      },
      {
        id: 'aggressive',
        label: 'Lobby all three governments aggressively',
        tradeoff: '-5 public approval, -3 trust each gov, but pushes outcome up one tier',
        effects: [
          { kind: 'renegotiateAllowance', strategy: 'aggressive' },
          { kind: 'publicApproval', delta: -5 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: -3 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: -3 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -3 },
        ],
      },
      {
        id: 'data-driven',
        label: 'Open books, present data to all three governments',
        tradeoff: '[OpenBooks] Pushes outcome up one tier; +5 Ottawa trust, -3 public approval',
        requires: { kind: 'openBooks', equals: true },
        effects: [
          { kind: 'renegotiateAllowance', strategy: 'data-driven' },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
    ],
  },

  // ── EV042 — Critical subsystem failure (auto-fires when avg reliability ≤ 30) ──
  {
    id: 'EV042_subsystemReplacement',
    category: 'operations_crisis',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'reliability', agency: 'ttc', lte: 30 },
      cooldownQuarters: 16,
    },
    outlet: 'CBC',
    headline: 'TTC infrastructure at critical condition — replacement urgent',
    body: 'Deferred maintenance has caught up. Engineering review classifies multiple subsystems as "high failure risk." Options: emergency capital replacement, defer (with worsening), or lobby for federal capital relief.',
    urgency: 90,
    noGoodOptions: true,
    choices: [
      {
        id: 'emergency_capex',
        label: 'Emergency capital replacement program',
        tradeoff: '-$2B cash, +25 reliability all TTC subsystems, -3% TTC ridership for 2Q (service disruption)',
        effects: [
          { kind: 'cash', deltaM: -2_000 },
          { kind: 'reliability', agency: 'ttc', delta: 25 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 1,
            cause: 'Service disruption from replacement',
            effects: [{ kind: 'ridership', agency: 'ttc', delta: -120_000 }],
          },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 3,
            cause: 'Service restored after replacement',
            effects: [{ kind: 'ridership', agency: 'ttc', delta: 120_000 }],
          },
        ],
      },
      {
        id: 'defer',
        label: 'Defer; continue degraded operations',
        tradeoff: '-10 TTC reliability further, -8 public approval, -3 board, queued bigger event in 6Q',
        effects: [
          { kind: 'reliability', agency: 'ttc', delta: -10 },
          { kind: 'publicApproval', delta: -8 },
          { kind: 'boardConfidence', delta: -3, reason: 'Deferred critical maintenance' },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 6,
            cause: 'Cascading subsystem failures from deferred maintenance',
            effects: [
              { kind: 'reliability', agency: 'ttc', delta: -15 },
              { kind: 'cash', deltaM: -1_500 },
              { kind: 'publicApproval', delta: -10 },
            ],
          },
        ],
      },
      {
        id: 'federal_relief',
        label: 'Request federal capital-relief grant',
        tradeoff: '[Ottawa trust ≥55] +$1B cash, -5 Ottawa trust, +18 TTC reliability',
        requires: { kind: 'trust', gov: 'ottawa', gte: 55 },
        effects: [
          { kind: 'cash', deltaM: 1_000 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: -5 },
          { kind: 'reliability', agency: 'ttc', delta: 18 },
        ],
      },
    ],
  },

  // ── EV043 — Project funding shortfall (conditional, fires when any under-construction project has <4Q funding) ──
  {
    id: 'EV043_projectFundingShortfall',
    category: 'construction_crisis',
    trigger: {
      kind: 'conditional',
      predicate: { kind: 'projectFundingShortfall' },
      cooldownQuarters: 8,
    },
    outlet: 'Internal memo',
    headline: 'Capital project running out of funds',
    body: 'At least one project will exhaust its financing within 4 quarters at current burn rate. You need to act before construction stalls.',
    urgency: 85,
    noGoodOptions: true,
    choices: [
      {
        id: 'emergency_bond',
        label: 'Issue emergency operating bond ($2B at penalty rate)',
        tradeoff: '+$2B cash · +debt service forever · -3 board (emergency optics)',
        effects: [
          { kind: 'cash', deltaM: 2_000 },
          { kind: 'boardConfidence', delta: -3, reason: 'Emergency bond issued at penalty rate' },
        ],
      },
      {
        id: 'cut_scope',
        label: 'Cut project scope to fit existing financing',
        tradeoff: '+$1B savings · -5 each gov trust (broken promises) · -10 public approval',
        effects: [
          { kind: 'cash', deltaM: 1_000 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: -5 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: -5 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -5 },
          { kind: 'publicApproval', delta: -10 },
        ],
      },
      {
        id: 'defer',
        label: "Defer the decision; pray for better terms",
        tradeoff: '-10 board · -8 approval · cascading reliability event queued 6Q out',
        effects: [
          { kind: 'boardConfidence', delta: -10, reason: 'Deferred project funding crisis' },
          { kind: 'publicApproval', delta: -8 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 6,
            cause: 'Project funding crisis spiral',
            effects: [
              { kind: 'reliability', agency: 'ttc', delta: -8 },
              { kind: 'cash', deltaM: -800 },
            ],
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 3.3 content expansion — 6 more events to thicken the campaign
  // ══════════════════════════════════════════════════════════════════════════

  // EV044 — Climate disclosure pressure
  {
    id: 'EV044_climateDisclosurePressure',
    category: 'federal_pressure',
    trigger: {
      kind: 'random',
      baseWeight: 6,
      cooldownQuarters: 14,
    },
    outlet: 'Globe',
    actorCharacterId: 'c_tremblay',
    headline: 'Federal Transport Minister demands net-zero commitment for funding',
    body: "Tremblay won't sign next year's transit fund disbursement without a public net-zero pledge tied to GO + UP electrification. She wants {ceoName} on stage with her in Ottawa next month. The pension funds want it too before increasing positions.",
    urgency: 65,
    choices: [
      {
        id: 'sign_pledge',
        label: 'Sign the pledge publicly',
        tradeoff: '+8 Ottawa trust, +5 board, -$200M opex committed/Q to climate retrofit',
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: 8 },
          { kind: 'boardConfidence', delta: 5, reason: 'Signed federal climate pledge' },
          { kind: 'opex', agency: 'go', deltaM: 200 },
        ],
      },
      {
        id: 'negotiate_terms',
        label: 'Negotiate watered-down terms',
        tradeoff: '+3 Ottawa trust, neutral on cash, -3 approval (looks weak)',
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: 3 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'refuse',
        label: 'Refuse — won\'t commit without funding certainty',
        tradeoff: '-10 Ottawa trust, federal disbursement deferred (-$300M cash next Q)',
        effects: [
          { kind: 'governmentTrust', gov: 'ottawa', delta: -10 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 1,
            cause: 'Federal funding withheld over pledge dispute',
            effects: [{ kind: 'cash', deltaM: -300 }],
          },
        ],
      },
    ],
  },

  // EV045 — Crosslinx leverage shift (contractor relationship)
  {
    id: 'EV045_crosslinxRenegotiation',
    category: 'crosslinx_contractor',
    trigger: {
      kind: 'random',
      baseWeight: 5,
      cooldownQuarters: 16,
    },
    outlet: 'Star',
    headline: 'Crosslinx demands contract renegotiation on cost escalators',
    body: 'The prime contractor for Ontario Line + future megaprojects is seeking a 12% cost escalator citing inflation + labor. Refusing risks contractor walk-out mid-project.',
    urgency: 75,
    choices: [
      {
        id: 'accept_escalator',
        label: 'Accept the 12% escalator',
        tradeoff: '+15 Crosslinx leverage (you kept the relationship), -5 board, projects get more expensive',
        effects: [
          { kind: 'crosslinxLeverage', delta: 15 },
          { kind: 'boardConfidence', delta: -5, reason: 'Accepted contractor cost escalator' },
        ],
      },
      {
        id: 'hardball',
        label: 'Hardball — call their bluff',
        tradeoff: '-20 Crosslinx leverage, +4 board (looking tough), risk: future project delays',
        effects: [
          { kind: 'crosslinxLeverage', delta: -20 },
          { kind: 'boardConfidence', delta: 4, reason: 'Stood firm against contractor' },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 4,
            cause: 'Crosslinx slow-walks deliverables after hardball',
            effects: [{ kind: 'engineers', delta: -20 }],
          },
        ],
      },
      {
        id: 'split_difference',
        label: 'Negotiate 6% escalator',
        tradeoff: 'Neutral leverage, -2 board',
        effects: [{ kind: 'boardConfidence', delta: -2, reason: 'Split-the-difference on contractor escalator' }],
      },
    ],
  },

  // EV046 — Consultant rent-seek
  {
    id: 'EV046_consultantAlignment',
    category: 'consulting_pressure',
    trigger: {
      kind: 'random',
      baseWeight: 5,
      cooldownQuarters: 12,
    },
    outlet: 'Internal memo',
    headline: 'Strategic consultants pitch $30M follow-on engagement',
    body: 'The consulting firm advising on operations modernization is pitching a follow-on engagement: $30M for "implementation support." They\'re extracting rents, but firing them costs you institutional knowledge.',
    urgency: 50,
    choices: [
      {
        id: 'sign_extension',
        label: 'Sign the extension',
        tradeoff: '-$30M cash, -15 consultant alignment (they keep extracting)',
        effects: [
          { kind: 'cash', deltaM: -30 },
          { kind: 'consultantAlignment', delta: -15 },
        ],
      },
      {
        id: 'demand_value',
        label: 'Demand defined scope + outcomes',
        tradeoff: '-$15M cash, +10 consultant alignment (they\'re now accountable)',
        effects: [
          { kind: 'cash', deltaM: -15 },
          { kind: 'consultantAlignment', delta: 10 },
        ],
      },
      {
        id: 'fire_them',
        label: 'End the engagement',
        tradeoff: '+15 consultant alignment, -10 templates (lost institutional knowledge), -5 board',
        effects: [
          { kind: 'consultantAlignment', delta: 15 },
          { kind: 'templates', delta: -10 },
          { kind: 'boardConfidence', delta: -5, reason: 'Fired strategic consultants mid-engagement' },
        ],
      },
    ],
  },

  // EV047 — TTC driver labor action
  {
    id: 'EV047_ttcLaborAction',
    category: 'operations_crisis',
    trigger: {
      kind: 'random',
      baseWeight: 5,
      cooldownQuarters: 20,
    },
    outlet: 'CityNews',
    actorCharacterId: 'c_ttc_director',
    headline: 'TTC operators threaten strike over pay + safety',
    body: "Director Ramanathan says the union won't budge: 8% raise + reformed safety protocol or walkout. \"{ceoName}, I've been clear with them: I can't get them what they want without your sign-off.\" A strike would hit ridership for weeks. Concessions cost opex forever.",
    urgency: 88,
    noGoodOptions: true,
    choices: [
      {
        id: 'meet_demands',
        label: 'Meet demands — 8% raise',
        tradeoff: 'TTC opex +$80M/Q forever, +5 City Hall trust, +5 approval',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 80 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 5 },
          { kind: 'publicApproval', delta: 5 },
        ],
      },
      {
        id: 'split_4pct',
        label: 'Negotiate 4% + safety reforms',
        tradeoff: 'TTC opex +$40M/Q, neutral elsewhere, residual risk',
        effects: [
          { kind: 'opex', agency: 'ttc', deltaM: 40 },
          { kind: 'publicApproval', delta: 2 },
        ],
      },
      {
        id: 'force_strike',
        label: "Hold the line — accept strike risk",
        tradeoff: 'TTC ridership -250k for 2Q (strike), -10 approval, -8 City Hall trust',
        effects: [
          { kind: 'ridership', agency: 'ttc', delta: -250_000 },
          { kind: 'publicApproval', delta: -10 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -8 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 2,
            cause: 'Strike resolved, ridership returns',
            effects: [{ kind: 'ridership', agency: 'ttc', delta: 250_000 }],
          },
        ],
      },
    ],
  },

  // EV048 — Pension fund relationship building
  {
    id: 'EV048_pensionRelationshipBuild',
    category: 'bond_market',
    trigger: {
      kind: 'random',
      baseWeight: 5,
      cooldownQuarters: 14,
    },
    outlet: 'Globe',
    headline: 'Pension fund consortium offers preferential financing terms',
    body: 'A consortium of Canadian pension funds (CPPIB, OTPP, OMERS) offers to underwrite future project bonds at -25bp to market — IF you commit to a five-year preferred-partner agreement.',
    urgency: 60,
    choices: [
      {
        id: 'sign_partnership',
        label: 'Sign the partnership',
        tradeoff: '+5 board (financial discipline signal), future project bonds priced 25bp lower',
        effects: [
          { kind: 'boardConfidence', delta: 5, reason: 'Signed pension consortium partnership' },
          { kind: 'templates', delta: 8 },
        ],
      },
      {
        id: 'decline',
        label: "Decline — preserve flexibility",
        tradeoff: 'Neutral. Foreign + retail markets still available for variety.',
        effects: [],
      },
      {
        id: 'counter_terms',
        label: 'Counter — demand -40bp + no exclusivity',
        tradeoff: '-3 templates (consortium walks if you push too hard), but if they accept (50% chance based on alignment)...',
        requires: { kind: 'templates', gte: 50 },
        effects: [{ kind: 'templates', delta: -3 }],
      },
    ],
  },

  // EV050 — TTC director quits (fires when c_ttc_director.tolerance reaches 0)
  // Deferred to Phase 6.2.3 — currently tolerance just bottoms out.

  // EV051 — Whistleblower disclosure on internal practices
  {
    id: 'EV051_whistleblower',
    category: 'auditor_oversight',
    trigger: {
      kind: 'random',
      baseWeight: 3,
      cooldownQuarters: 24,
    },
    outlet: 'Globe',
    headline: 'Anonymous staff complaint claims "{ceoName} hides budget overruns"',
    body: 'A senior staffer has filed a complaint with the Auditor General citing budget reporting irregularities. The Globe wants comment by 6PM. Public denial protects reputation but invites scrutiny. Admission is honest but costly.',
    urgency: 92,
    noGoodOptions: true,
    choices: [
      {
        id: 'deny',
        label: 'Deny categorically; demand retraction',
        tradeoff: '+3 board (firmness), -8 templates (auditor scrutiny), -5 approval',
        effects: [
          { kind: 'boardConfidence', delta: 3, reason: 'Strong denial of whistleblower' },
          { kind: 'templates', delta: -8 },
          { kind: 'publicApproval', delta: -5 },
        ],
      },
      {
        id: 'commission_audit',
        label: 'Commission third-party audit; commit to disclosure',
        tradeoff: '-$15M cash, -3 board short-term, +8 approval, +5 each gov trust',
        effects: [
          { kind: 'cash', deltaM: -15 },
          { kind: 'boardConfidence', delta: -3, reason: 'Self-initiated audit signals weakness' },
          { kind: 'publicApproval', delta: 8 },
          { kind: 'governmentTrust', gov: 'ottawa', delta: 5 },
          { kind: 'governmentTrust', gov: 'queensPark', delta: 5 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 5 },
        ],
      },
      {
        id: 'admit_partial',
        label: 'Admit some issues; promise reforms',
        tradeoff: '-5 board, +3 approval, neutral else',
        effects: [
          { kind: 'boardConfidence', delta: -5, reason: 'Admitted partial mismanagement' },
          { kind: 'publicApproval', delta: 3 },
        ],
      },
    ],
  },

  // EV052 — Climate disaster (heat dome triggers infra issues)
  {
    id: 'EV052_extremeWeatherTrack',
    category: 'climate_environmental',
    trigger: {
      kind: 'random',
      baseWeight: 4,
      cooldownQuarters: 12,
    },
    outlet: 'CBC',
    headline: 'Atmospheric river damages subway tunnel ventilation',
    body: '24-hour deluge overwhelms drainage at three downtown stations. Tunnels are flooded; ventilation electrical damaged. Service restored after 5 days but ridership trust hits.',
    urgency: 80,
    choices: [
      {
        id: 'emergency_climate_capex',
        label: 'Commit $300M to climate-resilience capex',
        tradeoff: '-$300M cash, +6 board (foresight), +6 approval, +5 reliability',
        effects: [
          { kind: 'cash', deltaM: -300 },
          { kind: 'boardConfidence', delta: 6, reason: 'Committed to climate resilience' },
          { kind: 'publicApproval', delta: 6 },
          { kind: 'reliability', agency: 'ttc', delta: 5 },
        ],
      },
      {
        id: 'patch_critical',
        label: 'Patch the critical systems only',
        tradeoff: '-$50M cash, neutral elsewhere, recurrence risk queued',
        effects: [
          { kind: 'cash', deltaM: -50 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 6,
            cause: 'Patched climate damage breaks down again',
            effects: [{ kind: 'reliability', agency: 'ttc', delta: -8 }],
          },
        ],
      },
    ],
  },

  // EV053 — Disruptor archetype gaffe
  {
    id: 'EV053_disruptorGaffe',
    category: 'internal_politics',
    trigger: {
      kind: 'random',
      baseWeight: 5,
      predicate: { kind: 'ceoArchetype', archetype: 'disruptor' },
      cooldownQuarters: 16,
    },
    outlet: 'CityNews',
    headline: '"{ceoName}" caught on hot mic mocking provincial caucus',
    body: 'Audio leaks of you in a closed-door meeting calling Queen\'s Park "performative theater." Hartwell\'s office wants an apology. Disruptor instincts say lean in.',
    urgency: 78,
    choices: [
      {
        id: 'apologize',
        label: 'Apologize publicly',
        tradeoff: '+5 QP trust, -3 approval (looks weak)',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: 5 },
          { kind: 'publicApproval', delta: -3 },
        ],
      },
      {
        id: 'double_down',
        label: 'Double down — "I stand by every word"',
        tradeoff: '-10 QP trust, +8 approval (authenticity), +3 board',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -10 },
          { kind: 'publicApproval', delta: 8 },
          { kind: 'boardConfidence', delta: 3, reason: 'Disruptor authentic moment' },
        ],
      },
      {
        id: 'pivot_to_substance',
        label: 'Pivot to substantive critique',
        tradeoff: '-2 QP trust, +4 approval, neutral else',
        effects: [
          { kind: 'governmentTrust', gov: 'queensPark', delta: -2 },
          { kind: 'publicApproval', delta: 4 },
        ],
      },
    ],
  },

  // EV054 — Award win (positive narrative)
  {
    id: 'EV054_internationalAward',
    category: 'internal_politics',
    trigger: {
      kind: 'conditional',
      predicate: {
        kind: 'and',
        predicates: [
          { kind: 'reliability', agency: 'ttc', gte: 75 },
          { kind: 'board', gte: 65 },
        ],
      },
      cooldownQuarters: 20,
    },
    outlet: 'Globe',
    headline: 'GTTA named "Most Improved Transit Authority" at international conference',
    body: 'UITP recognized your reliability gains. The board\'s thrilled. The talent pipeline notices. The pension funds notice.',
    urgency: 30,
    choices: [
      {
        id: 'accept_graciously',
        label: 'Accept; speak about team',
        tradeoff: '+8 board, +5 approval, +5 templates (talent flows in)',
        effects: [
          { kind: 'boardConfidence', delta: 8, reason: 'International award won' },
          { kind: 'publicApproval', delta: 5 },
          { kind: 'templates', delta: 5 },
        ],
      },
    ],
  },

  // EV055 — Equity pressure for Scarborough/equity-deserving areas
  {
    id: 'EV055_equityPressure',
    category: 'demographics_community',
    trigger: {
      kind: 'random',
      baseWeight: 4,
      cooldownQuarters: 18,
    },
    outlet: 'CBC',
    headline: 'Equity advocates: "GTTA prioritizes wealthy ridings"',
    body: 'A coalition of equity-deserving community groups has produced a study showing 73% of capital spend goes to median-income-above-average wards. They want a public commitment to balance.',
    urgency: 60,
    choices: [
      {
        id: 'commit_equity',
        label: 'Public equity commitment + dedicated funding',
        tradeoff: '+10 approval, +5 board, -$50M/yr to equity-deserving services',
        effects: [
          { kind: 'publicApproval', delta: 10 },
          { kind: 'boardConfidence', delta: 5, reason: 'Equity commitment well received' },
          { kind: 'opex', agency: 'ttc', deltaM: 12 },
        ],
      },
      {
        id: 'data_response',
        label: 'Counter with own data; offer dialogue',
        tradeoff: '+2 approval, -3 templates (no real change)',
        effects: [
          { kind: 'publicApproval', delta: 2 },
          { kind: 'templates', delta: -3 },
        ],
      },
      {
        id: 'dismiss',
        label: 'Dismiss as misunderstanding priorities',
        tradeoff: '-10 approval, -5 City Hall trust, queued advocacy backlash',
        effects: [
          { kind: 'publicApproval', delta: -10 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: -5 },
          {
            kind: 'queueDelayedEffect',
            quartersOut: 3,
            cause: 'Equity advocacy mobilizes',
            effects: [{ kind: 'publicApproval', delta: -5 }],
          },
        ],
      },
    ],
  },

  // EV049 — Mayor pre-election photo op
  {
    id: 'EV049_mayorPhotoOp',
    category: 'mayor_city',
    trigger: {
      kind: 'random',
      baseWeight: 5,
      cooldownQuarters: 8,
    },
    outlet: 'Star',
    actorCharacterId: 'c_liang',
    headline: 'Mayor Liang requests joint ribbon-cutting at busiest station',
    body: 'Liang wants a photo op announcing accessibility upgrades + free transit week. Costs $20M, but the optics help both of you. "{ceoName}, I\'m not demanding — but you\'d be doing me a real solid." Mayor\'s asking, not demanding.',
    urgency: 35,
    choices: [
      {
        id: 'partner',
        label: 'Partner on the announcement',
        tradeoff: '-$20M cash, +6 City Hall trust, +4 approval, +6 Liang relationship',
        effects: [
          { kind: 'cash', deltaM: -20 },
          { kind: 'governmentTrust', gov: 'cityHall', delta: 6 },
          { kind: 'publicApproval', delta: 4 },
        ],
      },
      {
        id: 'decline_politely',
        label: 'Decline — focus on delivery',
        tradeoff: '-3 City Hall trust, neutral else',
        effects: [{ kind: 'governmentTrust', gov: 'cityHall', delta: -3 }],
      },
    ],
  },
];

/** Lookup by id. */
export function eventTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find((t) => t.id === id);
}
