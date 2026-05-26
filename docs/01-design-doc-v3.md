# METRO — Design Document v3.0

**A browser-based executive simulator about running a major transit agency.**

This document is the source of truth for all subsequent development. Any change requires updating this document first.

---

## 0. Design principles

These are the rules every other section gets checked against. Not optional. The criteria for whether anything else in the spec is correct.

### P1. Decisions where the right answer isn't obvious

Every decision the engine surfaces to the player must have explicit tradeoffs with at least 2 viable answers depending on strategy.

**Engineering implication:** Engine tracks decision outcomes across simulation runs. If a balance test shows >70% of simulated players pick the same option on a recurring decision, that decision is broken and must be retuned. This is a real balancing tool, not a hope.

### P2. Consequences you can trace

Every state change must log its cause. The save file contains a complete event log.

**Engineering implication:** GameState has an `actionLog` array. Every state mutation goes through a logged action. UI has a "why did this happen?" affordance — clicking any negative outcome shows the chain of decisions and events that led to it. Implemented as a graph traversal back through the action log.

### P3. Characters who feel real

Every named character has:
- At least 5 unique dialogue patterns
- 2-3 recurring quirks documented in their bio
- A memory of past interactions with the player that surfaces in events

**Engineering implication:** Character objects have a `interactionHistory` array. Event templates reference past interactions when relevant ("As you may recall from our last conversation..."). No generic dialogue — always actor-specific voice.

### P4. Numbers that mean something

Every KPI display shows magnitude in human terms alongside the raw number.

**Engineering implication:** Engine has a `humanize()` function that translates numbers into comparison units. "+85k daily riders (equivalent to one busy bus route)". "$200M (roughly 8 new streetcars)". "Trust -15 (one major scandal worth)". This is part of the UI layer, fed by engine.

### P5. Surprises that aren't unfair

Every random event has visible precursor signals 2-4 quarters earlier.

**Engineering implication:** Events have a `telegraph` field — a precursor signal that fires earlier in the news feed or as a quiet KPI shift. Rate spikes have macroeconomic indicators building. Contractor bankruptcies have industry stress signals. Engine has a "telegraph queue" that surfaces these signals.

### P6. Earned wins

Major positive moments generate specific narrative tied to the player's choices.

**Engineering implication:** Line opening events have a narrative generator that pulls from the actual project history — when greenlit, what alignment chosen, what studies commissioned, what crises survived. Not "Line opened." Instead the full specific story.

### P7. Variability between runs

Every game is meaningfully different.

**Engineering implication:** Engine has explicit variability dimensions. CEO archetype shifts character names and personality variants (Hartwell could be replaced by Sarah Chen technocrat or David Olafson progressive). Initial cabinet rolled randomly. Event firing order randomized within constraints. Two campaigns with same archetype produce visibly different stories.

### P8. Decision density management

Most quarters should be light. Crisis quarters should be heavy. The game should not demand 15-30 decisions every quarter.

**Engineering implication:** Target distribution:
- 60% of quarters: 0-2 player decisions
- 30% of quarters: 3-5 decisions
- 10% of quarters: 8-15 decisions (crisis quarters)

Mechanisms:
- **Standing orders** for routine decisions ("approve all sub-$50M maintenance items")
- **Director delegation** handles day-to-day within tolerance
- **Inbox triage** — only items above an urgency threshold surface
- **Batch screens** for similar decisions
- **Skip turn must be shame-free** and accessible at all times

Engine has a `decisionsRequired` count per quarter. UI surfaces only items above urgency threshold. The "end turn" button is always available.

---

## 1. Vision

You play the CEO of the Greater Toronto Transit Authority (GTTA), a newly-created agency that absorbs TTC, GO Transit, and UP Express operations on Day 1 and is mandated to deliver a generation of new transit infrastructure across Toronto and the surrounding region. The game runs 15 in-game years through a quarterly decision cycle, played through interconnected dashboards in a browser.

You do not drive trains. You do not draw routes pixel-by-pixel on a map. You operate the agency: you allocate capital across competing demands, manage three operating subsidiaries through delegated directors, negotiate with politicians, hire and fire senior staff, manage debt and credit ratings, respond to crises, and make hundreds of small decisions per campaign whose consequences emerge across years.

**The pitch in one line:** *The game about boring infrastructure that's actually about coalitions.*

### Audience priority

- **Primary:** strategy gamers (Crusader Kings, Football Manager audience). Emergent narrative, persistent characters, replayability.
- **Secondary:** policy-curious urbanists (Strong Towns, r/transit). Realism rewarded.
- **Tertiary:** tycoon-sim players (AirwaySim, OpenTTD). Dense dashboards, optimization puzzles.

All three play the same game. Primary takes precedence in design conflicts.

### The fun kernel

You feel like you're inside the CEO chair making real decisions with consequences you can trace, in a world that has its own life independent of you. Competence fantasy delivered through traceable causality, real characters, and meaningful numbers.

---

## 2. The core loop

**Per quarter (variable real time, often 1-3 minutes; crisis quarters 10+):**

1. Land on Mission Control. See top-line KPIs, priority inbox (filtered to urgent items only — often 0-2), recent news, board confidence.
2. If anything urgent, triage it. Otherwise, hit end turn.
3. Time advances. World simulates. Standing orders execute. New news. New state.

A typical campaign has maybe 200-400 active decisions across 60 quarters, not 900-1800. Many quarters are nearly automatic.

### The economic engine

Cash flows in a loop. Inherited network → ridership × fare = operating revenue. Operating revenue − opex = operating margin (usually negative). Government inflow + operating margin + bond proceeds + LVC revenue = total available cash. Cash funds upgrades, new project construction, and overhead. Upgrades improve future operating revenue. New projects eventually join the operating network.

A player focused only on new build sees existing network decay, ridership drop, political support evaporate, capital grants reduce. A player only optimizing existing operations delivers no new capacity and loses to political pressure for visible expansion. The tension is the game.

---

## 3. Win and lose conditions

### Three scoring dimensions

**The Builder** — capital delivery
- Lines delivered (count)
- Average cost-per-km vs international benchmark
- Schedule reliability
- Integration index of resulting network

**The Operator** — running what exists
- Network ridership
- Farebox recovery ratio
- Reliability composite
- Safety record

**Ridership Growth** — universal win metric
- Total daily riders Y15 vs Y1 (% change)

### Multi-path winning

**Builder path:** Build aggressively, accept overruns. Ridership grows 30-50% from new capacity. Win — unless hostile government scrutinizes budget, unless rate spike hits leveraged debt, unless board confidence collapses.

**Operator path:** Barely build, radically improve inherited network. Ridership grows 15-25% through reliability, fares, service expansion. Win — unless political pressure for visible construction breaks you.

**Mixed path:** Deliver one major project well, run inherited network competently. Median outcome. Safest path.

End screen tells the story in narrative form.

### Hard lose conditions

1. **Trust collapse** — any single government's trust below 20 for 6 consecutive quarters
2. **Board firing** — board CEO confidence drops below 25
3. **Fiscal failure** — cash deeply negative AND debt service unmanageable, triggering forced asset sale + potential firing
4. **Time-out** — Y15 daily ridership < Y1 daily ridership × 1.05 (i.e. less than 5% cumulative growth across 15 years). Either decline or stagnation triggers this.

### Board CEO confidence score

Score 0-100. Starts at 60. Drives board-firing condition. Moves based on:

| Factor | Δ |
|---|---|
| Any government trust below 30 (per quarter sustained) | -3 |
| Fiscal default | -15 |
| Credit rating downgrade | -8 |
| Fiscal near-miss (covenant breach with cure) | -4 |
| Major public scandal | -8 to -12 |
| Major operational failure (multi-day outage, fatality) | -6 to -10 |
| Senior staff resignation (COO/CFO/Head of Engineering) | -5 |
| Other senior departure | -2 |
| Sustained negative media (>2 quarters streak) | -2 per extra quarter |
| Visible win — new line opening | +8 |
| Visible win — favorable AG report | +10 |
| Visible win — major ribbon-cutting | +5 |
| Quarter with no negative factors | +1 drift toward 60 |

Below 40: formal warning. Below 25: fired.

---

## 4. The dashboards

### Mission Control (home)

Top strip always visible: Q/year, cash with quarterly delta and YoY %, three trust scores with election countdowns, board CEO confidence, total daily riders with YoY %, on-time %, customer satisfaction.

Priority inbox center — filtered by urgency, most quarters shows 0-2 items.

News feed right.

"What's coming" preview — next election, next funding renegotiation, next major decision.

**Always-available actions:** end turn button (prominent), drill to any dashboard.

### Performance / Board View

The "how am I doing" dashboard. Three win dimensions with scores and YoY trends. Board CEO confidence with components broken down. "If election were held today" projection per government. Fiscal health: credit rating, debt/revenue ratio, runway in quarters. Composite trajectory traffic-light.

### Operations: TTC (subway + bus + streetcar unified)

Top KPIs: daily ridership YoY%, on-time %, customer satisfaction, safety incidents YTD, cleanliness rating, fare evasion estimate, SOGR backlog.

Controls: subway frequency per line, bus frequency policy, fare structure, maintenance investment slider, director delegation panel, strategic capital interventions.

Standing orders panel: set defaults that run automatically.

### Operations: GO Transit

Per-corridor visibility, frequency controls, electrification status, fare integration toggle, demographic catchment data, director delegation.

### Operations: UP Express

Smallest. Strategic question each quarter: premium shuttle / regional / divest. Highly elastic to demographic mix.

### Capital Projects

Portfolio view: all active projects by phase (Concept → Studies → Greenlight → Planning → Design → Tender → Construction → Operations).

Per-project drill-down: P&L with budget range and confidence interval, phase-specific actions, risk register with buy-down options, stakeholder map, LVC slider, studies commissionable.

Pipeline strategy: sequential vs parallel.

### Capital Allocation

Quarterly cash flow display: operating margin, government inflow, bond proceeds, LVC revenue, asset sales, total resources.

Allocation controls: per-project spend rate, hiring queues, operating subsidies, maintenance budgets, contingency reserve, initiative spending.

Real-time projection: end-of-Q cash, 4-Q forward, credit rating implication.

### Money / Treasury

Current debt portfolio by creditor type, maturity, coupon, fixed/floating split. Weighted average rate.

Credit rating with trend.

Rates available today from each creditor class. Refi controls. New issuance.

### Political Affairs

Three government dashboards. Per government: trust score with trend, election countdown, composition, polling, agenda items.

Per named politician: name, portrait, traits, career arc, relationship score, history of interactions, current asks, what they offer, lobbying actions.

**Lobbying cooldown:** any specific lobbying action on a politician has a 3-quarter cooldown before you can do it again. Prevents lobbying spam.

Funding renegotiation interface (every 3 years).
Ad-hoc funding request interface.

---

## 5. The economic model

### Starting position (Q1 2026)

**Cash:** $5B opening balance. ~$9B/yr from three governments (federal $4B, provincial $3.5B, municipal $1.5B), indexed to construction inflation, renegotiated every 3 years.

**Operating:** ~$2.1B annual fare revenue. ~$4.5B annual opex. ~$2.4B annual operating subsidy required.

**Network state:** TTC subway 4 lines + Line 5, TTC bus 150 routes, GO 7 corridors mostly diesel, UP Pearson-Union. ~2.5M daily TTC subway, ~1.5M TTC bus, ~250k GO, ~12k UP.

**Capital inherited:** Ontario Line $27B budget, $9B spent, 21% complete. SOGR backlog $33B.

**Initial debt:** ~$8B at weighted average 4.2%. **Split: 70% fixed-rate, 30% floating-rate.** Mixed maturities, average duration 8.4 years. Credit rating AA-.

### Operating revenue

Daily ridership × average fare × 250 (annualized days) × elasticity factors.

Ridership responds to fare, frequency (+0.2 short, +0.4 long elasticity), network coverage (new lines ramp over 8Q), reliability (-1-2%/yr if poor), demographic drift, economy (-5-10% in recession), TOD/density (+30% on upzoned lines).

### Per-line fare elasticities

| Line type | Elasticity |
|---|---|
| TTC subway core | -0.30 |
| TTC subway suburban | -0.40 |
| TTC bus core | -0.45 |
| TTC bus suburban | -0.55 |
| GO peak | -0.25 |
| GO off-peak | -0.55 |
| UP Express | -0.15 |

### Capital cost model

Per-line cost = base_km × mode_multiplier × cost_factors × (1 ± uncertainty_band)

Mode multipliers (vs $950M/km baseline):
- Subway: 1.0x
- Elevated: 0.55x
- LRT: 0.35x
- BRT: 0.15x
- RER: 0.40x

Cost factors:
- Standardization: -30%
- Site prep: -15%
- In-house engineering: -10%
- Mega-contract: +15%
- Settlement premium: +5%
- Construction inflation: +3-7%/yr compounding

Uncertainty band starts ±35% at concept, narrows with studies:
- Environmental survey: -10%
- Geotechnical: -8%
- Ridership study: -5%
- Engineering to 30%: -7%
- Full design: -5%

At Tender: ~±5%.

### Bond market and credit rating

Credit rating starts AA-. Moves with debt/revenue, operating margin, fiscal events, cost overruns.

Spreads over BOC policy rate:

| Rating | Spread |
|---|---|
| AAA | +50 bp |
| AA | +90 bp |
| A | +150 bp |
| BBB | +280 bp |
| BB | +450 bp |
| B | +700 bp |
| CCC | +1100 bp |

**Rate spike mechanics:**
- BOC policy rate baseline cycles 3-7% across 15 years
- Spike event: ~1-2% probability per quarter that BOC raises 200-400 bp over 2-3 quarters
- **Telegraph signals 2-4Q earlier:** inflation surprise news, BOC commentary in news feed, economic indicators visible on Mission Control
- Impact: floating-rate debt service immediately recalculates at new rate. New issuance also affected.
- Mitigation: refi floating to fixed before spike (but you can't predict timing precisely)

Refi available at any time. Fee: 1-2% of principal.

### Default and forced asset sale

If cash deeply negative + debt service unmanageable:
1. Bond market closes
2. Forced asset sale (lose GO, UP, or a specific capital project)
3. If board confidence > 40, keep job. If < 40, fired.

### Government inflow renegotiation (every 3 years)

Each government independently renegotiates inflow on its own 3-year cycle (not tied to elections).

Outcomes based on trust + delivery + operational performance + political mood:
- **Continuation:** trust ≥ 50 and adequate performance
- **Increase (+10-30%):** trust ≥ 70 and strong performance
- **Decrease (-10-30%) with controls:** trust < 40 or poor performance
- **Drastic cut (-40-60%):** trust < 25 or fiscal scandal

Controls: forced project deprioritization, mandatory pet project, cost cap, hiring freeze.

Player can negotiate within bounds.

### Land value capture (LVC) — simplified

Per project, when at Greenlight phase, player sets a **LVC investment slider** with two parameters:

**LVC capex:** how much to spend on station-area land acquisition and development setup. Range: $0 to $400M per major station.

**LVC revenue scaling:** revenue scales proportionally to capex with diminishing returns.

Formula: `lvc_revenue_per_quarter = sqrt(lvc_capex_M / 10) × $3M per major station`

Examples per major station:
- $0 capex: $0/Q revenue
- $50M capex: $6M/Q revenue (starts Y+2 after station opens, runs lifetime)
- $200M capex: $13M/Q revenue
- $400M capex: $19M/Q revenue

Political costs scale with capex:
- $0-50M: trivial, mostly TIF mechanism
- $50-200M: City Hall -3 to -8, modest NIMBY
- $200-400M: City Hall -8 to -15, NIMBY +10-20, requires legislative override (Queen's Park trust >55)

Revenue begins 4-8 quarters after station opens, accumulates over the rest of campaign. A player who spends $300M on LVC for 5 major stations could be generating $80M+/quarter by year 10. Real strategic lever, simple slider.

### Canonical engine variables (v3.2)

These are agency-level variables referenced by events but not previously defined in this document. All canonicalized here.

| Variable | Range | Starts | Meaning |
|---|---|---|---|
| `templates` | 0-100 | 30 | Standardization adoption. High = same station design 200x, lower per-km costs. Drives the "Standardization: -30%" cost factor in this section's cost model when above 50. Raised by sticking to templates on events (EV001 refuse); lowered by bespoke commitments. |
| `crosslinxLeverage` | 0-100 | 55 | Bargaining power of the Crosslinx consortium against you. Grows with awarded contracts, M&A consolidation, time. Decays with settled claims, alternative-contractor work. |
| `consultantAlignment` | -100 to +100 | 0 | Relationship with the major consulting firms (WSP, AECOM, Hatch). Positive = they cooperate. Negative = op-ed campaigns, poaching waves. Lowered by aggressive in-house engineering (`engineers` growth); raised by awarding specialty contracts. |
| `nimbyOrganization` | 0-100 | 25 | Aggregate organizing strength of NIMBY coalitions across all affected neighborhoods. Grows with unaddressed projects in high-NIMBY areas, lost tribunal appeals. Decays with community engagement, compromise decisions. |
| `openBooks` | boolean | false | Whether the player has formally adopted an open-data / transparent-procurement posture. Locks in once toggled (toggling back is a public reversal with political cost). Boosts AG and consulting-pushback event outcomes. |
| `engineers` | integer ≥0 | 180 | In-house engineering staff headcount. Grows via hiring (Capital Allocation dashboard); shrinks via poaching events / layoffs. Thresholds trigger events (EV009 at >250, EV061 at >300). |
| `publicApproval` | 0-100 | 50 | Voter sentiment about your agency, distinct from government trust. Driven by operational performance, news cycle, scandals. Feeds the election flip formula in §6 (`approval` parameter — Phase 6.1 will pin down exact formula). |

Per-project engine variables (live on the project record, not at agency level):

| Variable | Range | Meaning |
|---|---|---|
| `sitePrep` | 0-100 | Project-specific preparation maturity. Higher = lower cost factor (the "Site prep: -15%" line above). Raised by some event outcomes (EV043). |
| `megaContract` | boolean | Whether procurement uses single mega-contract. Adds +15% to cost; correlated with `crosslinxLeverage` growth. |
| `settlementPremium` | 0-100 | Per-project counter for past claim settlements. Drives the "Settlement premium: +5%" cost factor in this section's model. |

The cost-factor table earlier in this section refers to these as derived rates. Engine multiplies their values into the per-line cost formula at the appropriate phase.

---

## 6. The political model

### Three governments, three simulations

Each has: party in power, named premier/PM/mayor, cabinet (3-5 named), coalition polling, policy agenda, election cycle.

### Trust scores

Trust per government, 0-100.

Starting values: 50 each, modified by CEO archetype.

**Per-quarter drift:** trust is mean-reverting toward 40 (not 50). Drift magnitude ~1/Q, bidirectional — trust at 60 drifts down to 40, trust at 25 drifts up to 40. Governments tolerate you, don't love you, but don't sustain hatred without ongoing cause either.

**Per-event movement:** events specify ±3 to ±20 with size based on visibility.

**Major events:** elections (±5-30), funding renegotiations (±5-15), scandals (-10 to -25), major openings (+10-20).

### Named politicians and relationships

6 named politicians across three governments. Each has relationship score 0-100 independent of government's overall trust.

Each politician has:
- 1-3 visible "open asks" — things they want from you
- A career arc (where they came from, where they want to go)
- 2-3 personality quirks
- Memory of past interactions

### Lobbying actions

**Per-politician global cooldown of 3 quarters.** Once you take *any* lobbying action against a politician, you cannot lobby them in any form for 3 quarters. Cooldowns are independent across politicians — you can lobby Hartwell and Liang in the same quarter, just not the same person twice.

Lobbying types:
- **Private meeting:** low cost ($2M + 1 quarter of time), +2-4 relationship
- **Public endorsement event:** medium cost ($10M), +3-6 if accepted, -5 if rebuffed
- **Specific favor offering:** high cost (granting an ask), +8-15 relationship
- **Threat / public criticism:** -10-20 relationship but may force concession

### Cabinet members

Each government has 3-5 named ministers. Independent relationship scores. Some align with premier, some don't. Lobbying a friendly minister can sometimes mitigate hostile premier dynamics.

### Opposition

Each government has 1-2 named opposition critics. Attacks fire as events. If they win an election, you inherit their relationship.

### Elections

Quarterly countdown. Flip probability = clamp(0.55 − approval/280 − agreement_buffer, 0.05, 0.85).

If flips: trust resets (-25 to -40 from prior), new cabinet, possible new policy agenda.

---

## 7. The director / management system

You have an agency CEO doctrine (set at game start) and three operating directors (TTC, GO, UP).

### Director attributes

- Name, portrait, age, background
- Doctrine (their philosophy)
- Compensation cost ($/quarter)
- Political cost
- Tolerance score (0-100, starts at 60)
- Performance trajectory (improves with experience)

### Doctrines

For operating directors (TTC / GO / UP):
- **Ridership Maximizer**
- **Cost Discipline**
- **Reliability Engineer**
- **Equity Focus**
- **Modernization**

Senior staff (COO, CFO, Head of Engineering, Deputy CEO) have their own role-specific doctrines defined in their bios in `04-toronto-data-and-characters.md` — e.g. Reyes (COO) = Reliability Engineer, Park (CFO) = Cost Discipline, Subramanian (Head of Engineering) = Engineering Excellence, Thompson (Deputy) = Speed-to-Delivery. These do not appear in the operating-director doctrine pool above.

### CEO archetypes (set at start)

- **Steady operator:** baseline
- **International technocrat:** +15% engineering efficiency, -5 provincial trust
- **Insider:** +10 starting provincial trust, -10% engineering efficiency
- **Disruptor (Elon-esque):** +20% delivery speed, random gaffe events 2-3x per campaign, highest comp
- **Coalition builder:** +5 trust starting with all three governments, slower decisions (-10% advance)

### Director tolerance mechanic

**Scale: 0-100, starting at 60.** Floor 0 = quits, ceiling 100. Matches the 0-100 convention used by trust scores, board confidence, and relationship scores throughout the system.

Actions cost tolerance:
- Overriding decision: -15
- Cutting budget mid-year: -25
- Forcing strategy change: -25 to -40
- Veto on hiring: -15
- Public criticism: -30
- Aligned actions: +5

Regen: +5 per 2 quarters if left alone (no override / no cut / no veto / no public criticism for those 2 quarters). Capped at 100. Aligned-action +5 stacks with idle regen.

**At 0: director quits.** Replacement: 1-2 quarter gap with -20% performance, political capital cost -3 to -8 across governments. Pick from candidate market.

No puppet mode. Directors who hit 0 always quit.

### Replacement market

3-5 candidates appear with names, doctrines, comp asks, political costs, expected performance. Higher comp/political cost = higher expected performance.

---

## 8. Maintenance and replacement

Each operating agency (TTC, GO, UP) has quarterly maintenance budget you set. Each agency has four subsystems with 0-100 condition scores.

### TTC subsystems and dynamics

- **Rolling stock** (subway cars, buses, streetcars). Decays 1.5%/Q without maintenance. Affects: reliability, customer satisfaction.
- **Track and infrastructure.** Decays 0.8%/Q. Affects: safety, speed restrictions if poor.
- **Signal systems.** Decays 1.2%/Q. Affects: reliability, capacity.
- **Station infrastructure.** Decays 1.0%/Q. Affects: customer satisfaction, accessibility.

### Spending levels (TTC, scales for GO and UP)

- **Underspend** (below required): decay continues, accelerates if very low
- **Required** ($400M/Q for TTC): stable conditions
- **Preventive** ($600M/Q): conditions improve +0.5%/Q, future replacement events less likely
- **Catch-up** ($800M+/Q): faster improvement, premium pricing

### Condition thresholds

- Below 60: minor reliability events trigger more often
- Below 40: customer satisfaction drops noticeably, safety incidents increase
- Below 25: replacement event triggers — forced capex $1.5-4B over 2-4Q with service disruption

### Strategic tension

$200M/Q maintenance savings × 8Q = $1.6B saved. If it triggers replacement event, $3B emergency spend + service disruption + ridership drop + board confidence hit. Net loss vs maintaining.

Smart player invests preventive on systems matching their strategy. Builder might let bus rolling stock decay while protecting subway track. Operator invests heavily everywhere.

GO and UP work similarly with different numbers (catenary instead of signals for electrified GO).

---

## 9. Buildable project catalogue structure

30+ projects across Toronto. Each project has:

- ID, name, description
- Alignment options (2-4 where geography permits)
- Mode options per alignment
- Above vs below ground per segment
- Station count range (min/max with cost implications)
- Station quality dial (basic / standard / premium, +0/+25/+60%)
- Length range
- Cost range (wide initially, narrows with studies)
- Demand forecast range (wide initially, narrows with ridership study)
- NIMBY exposure by neighborhood
- LVC potential rating
- Geotechnical risk rating
- Political support starting position by government
- Connection points to existing network
- Build duration (range)
- Size tier (small / medium / large / mega)

Bigger projects = wider uncertainty bands, higher political capital, higher impact, higher failure risk.

### Project lifecycle (v3.2 — simplified)

Three states: **proposed → under_construction → operating.**

1. **proposed** — player has initiated the project from the catalogue. Picks alignment, mode, station count, LVC slider. Minimum 2 quarters before break-ground is permitted. During this buffer the player can commission studies (each one costs cash and 1-2Q, narrows cost / demand / risk uncertainty). At any point after the 2Q minimum, the player decides: **break ground** → `under_construction`, or **abandon** → project removed, study costs sunk, no political capital penalty (no public commitment yet).

2. **under_construction** — ticks down toward opening per build duration. Construction crises (EV043, EV044, EV045, EV047, EV048, etc.) fire. Cancellation here = severe political capital cost across governments + possible contractor litigation.

3. **operating** — joins the operating network. Adds ridership per the demand model, opens up further LVC revenue per the formula in §5.

Bigger projects = wider initial uncertainty bands, higher political capital required to break ground, higher impact and failure risk during construction. Studies are the strategic lever that converts time + money into clarity before commitment.

---

## 10. Background simulations

- Economy: GDP cycles (recession every 7-10 years), interest rates, construction inflation, commodity prices, FX
- Industry: contractor M&A, engineer movement, consulting consolidation
- Demographics: 44 Toronto neighborhoods with evolving attributes (used informationally for player decisions)
- Technology: AV adoption, e-bike substitution, remote work persistence
- Media: 24-hour news cycle, named reporters
- Climate: extreme weather, flooding affecting low-lying alignments
- Other cities: Madrid, Seoul, Crossrail benchmarks
- Labor market: poaching pressure

---

## 11. The 15-year arc

- **Years 1-3 (Honeymoon):** new mandate, optimism, foundational decisions, first crisis, first election
- **Years 4-7 (Prime):** track record, first new line opens, multiple projects in flight, internal politics
- **Years 8-11 (Squeeze):** accumulated decisions catch up, generational political shift, major economic test
- **Years 12-15 (Legacy):** end-game shape clear, final political cycle, story crystallizes

---

## 12. MVP scope

**In scope:**
- Toronto only
- Quarterly turns, 60 turns, 4-6 hour campaign (reduced from earlier estimate as decision fatigue mitigated)
- Seven dashboards
- 8-12 named characters with persistent memory
- 30+ events with full text (not 200)
- 30+ buildable projects
- 44-neighborhood demographic layer (informational)
- Full bond market with credit rating, refi, multi-creditor, fixed/floating split
- Multi-mode operating system
- Director delegation with tolerance
- Preventive vs reactive maintenance with replacement risk
- LVC simplified slider mechanism
- 3-year government renegotiation cycle
- Lobbying with 3-quarter cooldowns
- End-screen narrative generator with specific named outcomes
- Local saves
- Standing orders system for decision density management
- Action log for traceable consequences

**Out of scope:**
- Multiple cities
- Real-time mode
- Multiplayer
- Cloud saves
- Mobile UI
- Achievement system
- Sound design
- Tutorial beyond inline briefing
- Secondary bond market
- Player avatar
- Replay export
- Localization
- 200 event variants (deferred — 30 deep events in v1)

---

## 13. Visual style

Bloomberg Terminal × Mercury × FiveThirtyEight. Dense data, hierarchical typography, monospace for numbers, restrained color (status colors only), sparklines everywhere, real charts where data warrants. Portraits as simple SVG-style illustrations (New Yorker-ish). Minimal motion. Competence fantasy is the appeal.

---

## 14. Tech stack

- Vite + React + TypeScript
- Tailwind CSS
- Zustand (state)
- Recharts (charts)
- Framer Motion (animation)
- Dexie / IndexedDB (saves)
- Vercel (hosting, free tier)
- No backend for v1

Engine layer pure TypeScript, separable from React. Deterministic with seeded RNG. Headless-runnable in Node for playtesting. State serializable to JSON.

---

## 15. Success criteria

MVP successful if:

1. New player plays one full quarter without confusion
2. Skilled player plays 4 quarters and feels meaningful decisions
3. Two playthroughs produce visibly different outcomes
4. End screen narrative feels specific and personal
5. Author willingly plays it for fun
6. Three friends play 30+ minutes voluntarily

---

*v3.0 — incorporates design principles, lobbying cooldowns, simplified LVC, decision density management, telegraph signals for surprises, debt fixed/floating split, action log, action-traceable consequences.*

*v3.1 — director tolerance normalized to 0-100 (was 0-12), board confidence weights spelled out, stagnated-ridership threshold defined (Y15 < Y1 × 1.05), trust drift clarified as bidirectional mean-reversion to 40, lobbying cooldown clarified as per-politician global / 3Q / independent across politicians, doctrine scope clarified (5 operating-director doctrines vs role-specific senior-staff doctrines), P03 Downtown Relief south removed (made redundant by Ontario Line in construction), EV079 rate-spike scope moved from Phase 3.2 to Phase 7.1.*

*v3.2 — project lifecycle simplified to three states (proposed → under_construction → operating) with a 2-quarter minimum buffer during `proposed` for studies; canonical engine-variables table added to §5 (templates, crosslinxLeverage, consultantAlignment, nimbyOrganization, openBooks, engineers, publicApproval + per-project sitePrep / megaContract / settlementPremium).*
