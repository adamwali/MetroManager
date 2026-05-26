# METRO — Claude Code Build Phases

**Disciplined sequence of build phases. Each phase has one outcome. You do not move to the next phase until current is working and committed to git.**

---

## How to use this document

This document is the actual playbook. Each phase is a sequence of 1-6 Claude Code sessions. Each session has:
- One specific objective
- Specific deliverables
- A starting prompt you paste into Claude Code
- A definition of done

Between sessions: review output, commit to git, update DECISIONS.md and SESSIONS.md.

At end of each phase: check the "kill criterion" before continuing. If you hit a no, stop and rethink. The point of phasing is to fail fast.

---

## Working method (every session)

**Before session:**
1. Read what you did last session in SESSIONS.md
2. Open the design doc to the relevant section
3. Have the prompt ready to paste

**During session:**
1. Paste the session prompt
2. Force the question phase — Claude Code must ask 5-7 questions before any code
3. Answer questions
4. Approve the proposed architecture
5. Let Claude Code implement
6. Read the diff before merging
7. Test the deliverable

**After session:**
1. Commit to git with meaningful message
2. Update SESSIONS.md with what got done, what's left, surprises
3. Update DECISIONS.md with any architectural decisions made
4. If something feels wrong, revert rather than patch

---

## Phase 0: Setup

**One session, ~2 hours.**

### Session 0.1: Project skeleton

**Objective:** Clean foundation. Deployed URL showing "METRO" placeholder.

**Prompt:**

> I'm building METRO, a browser-based transit agency simulator. This is the foundational session.
>
> Read the file METRO-design-doc-v3.md (in docs/) for context, then propose:
> 1. A Vite + React + TypeScript + Tailwind project structure
> 2. Folder organization that separates engine (pure TypeScript) from UI (React)
> 3. State management approach with Zustand
> 4. Initial dependencies (recharts, framer-motion, dexie, zustand, react-router-dom)
> 5. Vercel deployment config
>
> Before writing any code, ask me 5-7 clarifying questions about the architecture, my development workflow, and any constraints I have.
>
> Once we agree on architecture, set up the project. The deliverable is: a deployable Vite project that builds, deploys to Vercel, and shows "METRO — Quarter 1, 2026" on the home page. No game logic. Just the skeleton.

**Definition of done:**
- `npm run dev` works locally
- `npm run build` produces no errors
- Vercel deploys the page
- Folder structure: `/src/engine/`, `/src/ui/`, `/src/state/`, `/src/types/`, `/src/utils/`
- DECISIONS.md and SESSIONS.md exist in repo root

**Commit message:** `phase 0: project skeleton`

---

## Phase 1: Engine foundation

**3-4 sessions, ~10-15 hours total.**

**Goal:** Engine simulates 60 quarters with nothing in it. CLI test harness runs without UI.

### Session 1.1: GameState type definition

**Objective:** Full type schema for GameState. No logic yet, just types.

**Prompt:**

> Phase 1, Session 1. We're defining the GameState type and all sub-types.
>
> Read METRO-design-doc-v3.md sections 3-9 carefully. Then define TypeScript types for:
>
> 1. GameState (the root object)
> 2. Cash, Debt, DebtTranche (with fixed/floating)
> 3. Trust scores per government
> 4. BoardConfidence with components
> 5. Project (with all phases, traits, LVC config)
> 6. Agency (TTC, GO, UP) with subsystem conditions
> 7. Character (with relationship state, interaction history)
> 8. Event (template + active event instance)
> 9. StandingOrder
> 10. ActionLog entry
> 11. RngSeeds (per-system)
>
> Place these in `/src/types/`. Use discriminated unions where appropriate. No enums — use string literal unions.
>
> Before writing types, ask me 5-7 questions about edges cases and ambiguities you see in the spec. Especially around the project lifecycle state machine and character relationship state.

**Definition of done:**
- All types compile
- Comments documenting non-obvious fields
- Example GameState object that satisfies all types
- No `any` types anywhere

**Commit message:** `phase 1.1: gamestate type definitions`

---

### Session 1.2: Engine interfaces and cash flow

**Objective:** Engine module that simulates cash flow across quarters. No events yet.

**Prompt:**

> Phase 1, Session 2. Engine cash flow simulation.
>
> Read the type definitions from session 1.1. Then implement:
>
> 1. `createInitialGameState(seed: number): GameState` — produces Q1 2026 starting state matching the design doc numbers
> 2. `endTurn(state: GameState): GameState` — advances one quarter, returning new state
> 3. Cash flow calculation: operating revenue (ridership × fare × elasticity), opex, government inflow, debt service (with fixed/floating split), net cash delta
> 4. Quarter advance (Q1 2026 → Q2 2026 → ...)
> 5. Year-over-year tracking for KPIs
>
> No events, no projects, no character interactions yet. Just the financial heartbeat.
>
> Engine must be pure functions. No mutation. No side effects. Same input + same RNG = same output.
>
> Before coding, ask me 5-7 questions about edge cases. Especially around how debt service is calculated each quarter for both fixed and floating tranches.

**Definition of done:**
- Pure function `endTurn` exists
- CLI test: `npx ts-node src/engine/test-harness.ts` simulates 60 quarters and prints quarterly cash
- Starting state matches design doc
- Unit tests for cash math pass

**Commit message:** `phase 1.2: cash flow engine`

---

### Session 1.3: Seeded RNG architecture

**Objective:** Deterministic randomness, isolated per system.

**Prompt:**

> Phase 1, Session 3. Seeded RNG.
>
> Implement a seeded RNG system with the following requirements:
>
> 1. Master seed at game start
> 2. Separate sub-seeds for: events, character moods, contractor behavior, economic indicators, election outcomes, demographic drift, project cost realizations
> 3. Each sub-RNG is reproducible: same seed + same call count = same number
> 4. Save/load preserves the exact RNG state for resumption
> 5. Helper functions: `randomFloat(rng)`, `randomInt(rng, min, max)`, `pickWeighted(rng, options)`, `gaussian(rng, mean, stdDev)`
>
> The point: I should be able to share a seed with a friend and we get the exact same campaign.
>
> Before coding, ask me 5-7 questions about how RNG isolation should work in edge cases (e.g., what if I add a new event type later — does it shift the sequence for existing events?).

**Definition of done:**
- RNG produces same sequence for same seed
- Sub-RNGs isolated from each other
- Save/load round-trip preserves RNG state
- Unit tests pass

**Commit message:** `phase 1.3: seeded rng architecture`

---

### Session 1.4: Action log + CLI harness

**Objective:** Every state change logged. CLI harness shows full simulation transparently.

**Prompt:**

> Phase 1, Session 4. Action log and improved CLI harness.
>
> Implement:
>
> 1. ActionLog system — every state mutation goes through a logged action with: timestamp, action type, payload, cause (event/player/system), affected fields
> 2. CLI test harness that:
>    - Runs 60 quarters
>    - Prints quarterly summary (cash, daily riders, board confidence, three trust scores)
>    - On request prints action log for a specific quarter
>    - Can export full game to JSON
> 3. JSON save/load functions
>
> Before coding, ask me 5-7 questions about action log granularity. Too coarse = can't trace causes. Too fine = log explodes in size.

**Definition of done:**
- ActionLog captures all mutations
- CLI prints readable quarterly summary
- Save → close → reload produces identical state
- 60-quarter simulation runs in <2 seconds

**Commit message:** `phase 1.4: action log and cli harness`

**Kill criterion for Phase 1:**

Run the CLI harness. Does the simulation produce sensible numbers? Government inflow comes in, opex goes out, cash trajectory is realistic (slowly bleeds without doing anything because operating subsidy isn't enough alone)? If the numbers are obviously wrong, stop and fix Phase 1 before building on it. Everything downstream depends on this being right.

---

## Phase 2: Mission Control + end turn

**2-3 sessions, ~6-10 hours.**

**Goal:** Playable loop in browser. One dashboard. You can hit end turn 60 times.

### Session 2.1: Mission Control dashboard

**Objective:** First real UI showing engine state.

**Prompt:**

> Phase 2, Session 1. Mission Control dashboard.
>
> Build the Mission Control dashboard per design doc Section 4. Required components:
>
> 1. Top strip: Quarter/year display, cash with quarterly delta and YoY %, three trust scores, board confidence, daily ridership with YoY %, on-time %, customer satisfaction
> 2. Center: priority inbox (empty for now — events come in Phase 3)
> 3. Right rail: news feed (empty for now)
> 4. "What's coming" preview
> 5. Prominent end-turn button
> 6. Navigation tabs to other dashboards (all stub pages for now)
>
> Style per design doc: Bloomberg Terminal aesthetic, dense, restrained color, monospace for numbers.
>
> Use Zustand for state. The store holds current GameState. End turn calls engine and replaces state.
>
> Implement number humanization: every KPI shows the number AND a human comparison ("daily riders: 4.2M, +85k YoY, equivalent to one busy bus route").
>
> Before coding, ask me 5-7 questions about UI specifics. Especially about how the humanization rules should work and what density level I want.

**Definition of done:**
- Mission Control renders with starting state
- End turn button works, advances quarter, updates display
- 60 end-turns in a row complete without error
- Sparklines for cash and ridership populated
- Number humanization implemented

**Commit message:** `phase 2.1: mission control dashboard`

---

### Session 2.2: Save/load + game over

**Objective:** Persistence and end states.

**Prompt:**

> Phase 2, Session 2. Save/load to IndexedDB. Game over screens.
>
> Implement:
>
> 1. Save to IndexedDB via Dexie. Multiple save slots. Each save includes full GameState + seed + action log
> 2. Load from IndexedDB. Resume mid-campaign.
> 3. New game flow: pick CEO archetype, name (or generated), confirm starting projects, start
> 4. Game over screen if cash goes catastrophically negative (placeholder for fiscal failure logic)
> 5. End of 60 quarters: end screen placeholder (full narrative comes in Phase 9)
>
> Before coding, ask me 5-7 questions about save data structure and how new game setup should flow.

**Definition of done:**
- Save creates entry in IndexedDB
- Reload restores exact state including action log
- New game flow works
- Game over screen fires on fiscal failure

**Commit message:** `phase 2.2: save load game over`

**Kill criterion for Phase 2:**

Can you hit end turn 60 times and watch a campaign play out? If yes, continue. If anything is broken, fix before Phase 3.

---

## Phase 3: First event flow

**2-3 sessions, ~6-10 hours.**

**Goal:** Events surface, you respond, state changes. The fun question gets its first real test.

### Session 3.1: Event system

**Objective:** Event firing, response, state mutation.

**Prompt:**

> Phase 3, Session 1. Event system.
>
> Read event catalogue document (03-event-catalogue.md) for examples of event structure. Then implement:
>
> 1. Event template type: id, category, trigger condition, actor, headline, body, choices (with tradeoffs and effects), telegraph signal
> 2. Event firing logic per quarter: evaluate all events against trigger conditions, select via weighted RNG, fire one or two per quarter
> 3. Event response: player picks a choice, effects apply immediately, delayed consequences queued
> 4. Delayed consequence queue: events that fire N quarters later based on prior choices
> 5. Telegraph system: precursor signals fire 2-4Q before major events
>
> Before coding, ask me 5-7 questions about event firing weights, how to handle multiple competing events, and what telegraph signals should look like in the UI.

**Definition of done:**
- Event type definition exists
- Engine fires events per quarter
- Player can respond via UI modal
- Effects apply to state
- Delayed consequences fire correctly

**Commit message:** `phase 3.1: event system`

---

### Session 3.2: First five events

**Objective:** Real events implemented end-to-end.

**Prompt:**

> Phase 3, Session 2. Implement five real events from the event catalogue.
>
> Pick one from each category to test breadth:
> - EV001 (Signature station demand) — political pressure
> - EV031 (Subway fatality) — operational crisis
> - EV043 (TBM utility strike) — construction crisis
> - EV063 (COO threatens resignation) — internal politics
> - EV037 (Cleanliness scandal) — media / public pressure
>
> Note: EV079 (Rate spike) moved to Phase 7.1 — it needs the bond/debt/floating-tranche infrastructure that doesn't ship until then.
>
> Each must be implemented with:
> - Full body text from the catalogue
> - All choices with explicit effects
> - Telegraph signal (where applicable)
> - Delayed consequences
>
> Then play 30 quarters yourself and observe whether things feel interesting.
>
> Before coding, ask me 5-7 questions about specific implementation details for each event.

**Definition of done:**
- All five events fire under correct conditions
- Player responses produce observable state changes
- Delayed consequences fire later
- Action log shows full chain of cause and effect

**Commit message:** `phase 3.2: first five events`

**Kill criterion for Phase 3 — this is the big one:**

Play 30 quarters. Honestly answer: is anything interesting happening? Did any event feel like a real decision? Did consequences feel meaningful? If the answer is "this is boring," stop and redesign. Don't add more content to a broken loop. If you hit week 6-8 and the loop isn't engaging, the project is in trouble and you should rethink before investing the next 50+ hours.

---

## Phase 4: Capital projects

**3-4 sessions, ~10-15 hours.**

**Goal:** Builder path is testable. Build a line, watch it open, observe ridership change.

### Session 4.1: Project lifecycle state machine

**Objective:** Projects move through phases.

**Prompt:**

> Phase 4, Session 1. Project lifecycle.
>
> Read 02-project-catalogue.md. Implement:
>
> 1. Project type with all phases (Concept → Studies → Greenlight → Planning → Design → Tender → Construction → Operations)
> 2. State machine for phase transitions with conditions and durations
> 3. Cost uncertainty bands that narrow with studies
> 4. Demand forecast bands that narrow with studies
> 5. Phase-specific available actions
> 6. Project events that fire based on phase
>
> Before coding, ask me 5-7 questions about edge cases — what happens if you cancel mid-construction, how scope changes flow through, how to handle parallel projects.

**Definition of done:**
- Project moves through phases on schedule
- Studies narrow uncertainty
- Cost realizations happen at appropriate times
- Cancellation handled

**Commit message:** `phase 4.1: project lifecycle`

---

### Session 4.2: Capital Projects dashboard

**Objective:** UI for managing project portfolio.

**Prompt:**

> Phase 4, Session 2. Capital Projects dashboard.
>
> Build the dashboard per design doc Section 4. Includes:
>
> 1. Portfolio view showing all active projects by phase
> 2. Per-project drill-down with P&L, phase actions, risk register, stakeholder map, LVC slider, studies
> 3. New project flow: pick from catalogue, set initial parameters
> 4. Project cancellation flow with explicit consequences
> 5. Sequential vs parallel build toggle
>
> Before coding, ask me 5-7 questions about UI layout, information hierarchy, and how the LVC slider should present tradeoffs.

**Definition of done:**
- Can view all projects
- Can drill into any project
- Can take phase-appropriate actions
- LVC slider works and shows projected revenue

**Commit message:** `phase 4.2: capital projects dashboard`

---

### Session 4.3: Five projects + Ontario Line

**Objective:** Real projects implemented with full traits.

**Prompt:**

> Phase 4, Session 3. Implement 6 projects.
>
> From 02-project-catalogue.md, implement:
> - P00 Ontario Line (inherited, in construction)
> - P01 Yonge North (Large subway, multiple alignments)
> - P11 Eglinton East LRT (Medium LRT)
> - P13 Waterfront LRT (Small)
> - P21 Steeles BRT (Small)
> - P25 Lakeshore RER (Large RER)
>
> Each with full trait specs from the catalogue. Variety covers all size tiers and modes.
>
> Before coding, ask me 5-7 questions about trait specifics that might be ambiguous.

**Definition of done:**
- All 6 projects appear in catalogue
- Player can greenlight any of them
- Each progresses through phases with appropriate events
- Opening adds ridership to network

**Commit message:** `phase 4.3: six projects implemented`

**Kill criterion for Phase 4:**

Build one project end-to-end. Does the experience of building feel meaningful? Are the decisions about studies, LVC, alignment, mode actually impactful? If projects feel rote, redesign before continuing.

---

## Phase 5: Operations

**3-4 sessions, ~10-15 hours.**

**Goal:** Operator path testable. Inherited network is alive.

### Session 5.1: TTC operations dashboard

**Objective:** Full operating control over inherited network.

**Prompt:**

> Phase 5, Session 1. TTC Operations dashboard.
>
> Implement per design doc Section 4 + Section 8 (maintenance):
>
> 1. KPI strip: ridership, on-time %, satisfaction, safety, cleanliness, fare evasion, SOGR backlog
> 2. Subway frequency controls per line
> 3. Bus frequency policy controls
> 4. Fare structure controls (with elasticity computation)
> 5. Maintenance investment slider per subsystem
> 6. Subsystem condition displays (rolling stock, track, signals, stations)
> 7. Director delegation panel with tolerance score visible
> 8. Standing orders panel
>
> Before coding, ask me 5-7 questions about UI layout and standing orders.

**Definition of done:**
- All controls work
- Changes propagate through engine
- Maintenance decisions visible in subsystem condition over time
- Standing orders execute automatically

**Commit message:** `phase 5.1: ttc operations`

---

### Session 5.2: GO and UP operations

**Objective:** GO and UP as variants of TTC pattern.

**Prompt:**

> Phase 5, Session 2. GO and UP operations dashboards.
>
> Build dashboards for GO and UP based on TTC pattern. Different subsystems where appropriate (catenary for electrified GO, etc.). UP has the "premium/regional/divest" strategic question.
>
> Before coding, ask me 5-7 questions about how GO and UP differ from TTC.

**Definition of done:**
- GO dashboard works
- UP dashboard works
- Each has appropriate director delegation

**Commit message:** `phase 5.2: go and up operations`

---

### Session 5.3: Maintenance dynamics + replacement events

**Objective:** Maintenance is a real strategic lever.

**Prompt:**

> Phase 5, Session 3. Maintenance dynamics and replacement events.
>
> Implement per design doc Section 8:
>
> 1. Subsystem condition decay rates
> 2. Spending levels (underspend, required, preventive, catch-up)
> 3. Condition impacts on ridership, satisfaction, safety
> 4. Replacement events trigger when condition very low
> 5. Replacement event handlers (fleet replacement, track renewal, signal modernization)
>
> Before coding, ask me 5-7 questions about replacement event triggers and how they should feel in the moment.

**Definition of done:**
- Maintenance underspend visibly degrades conditions
- Replacement events fire as designed
- Reactive replacement costs more than preventive

**Commit message:** `phase 5.3: maintenance and replacement`

**Kill criterion for Phase 5:**

Play 20 quarters as Operator path (build nothing, optimize TTC). Is anything interesting? Do maintenance decisions feel meaningful? If running operations is boring, the Operator path is broken.

---

## Phase 6: Political layer

**3-4 sessions, ~10-15 hours.**

**Goal:** Politics matters. Decisions have political costs. Elections matter.

### Session 6.1: Three government simulation

**Objective:** Trust scores, drift, government composition.

**Prompt:**

> Phase 6, Session 1. Three government simulation.
>
> Implement per design doc Section 6:
>
> 1. Three governments (Ottawa federal, Queen's Park provincial, City Hall municipal)
> 2. Trust scores per government with regression-to-40 drift
> 3. Election cycles with countdown
> 4. Election outcome calculation
> 5. Cabinet members and changes after elections
> 6. Policy agenda per government
>
> Before coding, ask me 5-7 questions about trust dynamics and election mechanics.

**Definition of done:**
- Three governments tracked
- Trust drift works
- Elections fire on schedule
- Government changes produce visible effects

**Commit message:** `phase 6.1: three governments`

---

### Session 6.2: Named politicians + lobbying

**Objective:** Real relationships with named characters.

**Prompt:**

> Phase 6, Session 2. Named politicians and lobbying.
>
> Read 04-toronto-data-and-characters.md for character bios. Implement:
>
> 1. 3 bio'd politicians (Hartwell, Liang, Tremblay). 3 cabinet/critic placeholder slots — names only, full bios deferred to Phase 8.1.
> 2. Relationship scores independent of government overall trust
> 3. Open asks per politician
> 4. Lobbying actions: per-politician global cooldown of 3 quarters (you lobby a politician → can't lobby them in any form for 3Q). Cooldowns are independent across politicians.
> 5. Lobbying types: private meeting, public endorsement, specific favor, threat
> 6. Interaction history tracking
>
> Before coding, ask me 5-7 questions about cooldown mechanics and how to handle expired asks.

**Definition of done:**
- Three bio'd politicians render with bios; three cabinet/critic slots show as placeholders
- Relationship scores move based on interactions
- Lobbying actions work with cooldowns
- Asks visible and grantable

**Commit message:** `phase 6.2: politicians and lobbying`

---

### Session 6.3: Funding renegotiation

**Objective:** Every 3 years, governments renegotiate.

**Prompt:**

> Phase 6, Session 3. Funding renegotiation per Section 5 of design doc.
>
> Implement:
>
> 1. Each government has independent 3-year cycle
> 2. Renegotiation event fires with outcome based on trust + delivery + performance
> 3. Four outcome types: continuation, increase, decrease with controls, drastic cut
> 4. Controls implementation: project deprioritization, mandatory pet project, cost cap, hiring freeze
> 5. Player negotiation interface
>
> Before coding, ask me 5-7 questions about negotiation mechanics and how controls should be enforced.

**Definition of done:**
- Renegotiation fires every 3 years per government
- Outcomes match design doc thresholds
- Controls actually constrain player

**Commit message:** `phase 6.3: funding renegotiation`

**Kill criterion for Phase 6:**

Play 40 quarters. Do you find yourself thinking about politicians as people? Are elections tense? If politics is just numbers moving, the layer is broken.

---

## Phase 7: Money / Treasury

**2-3 sessions, ~6-10 hours.**

**Goal:** Financing is a real lever. Rate spikes can punish leveraged Builders.

### Session 7.1: Debt portfolio + credit rating

**Prompt:**

> Phase 7, Session 1. Debt portfolio and credit rating.
>
> Implement per design doc Section 5:
>
> 1. Debt portfolio with tranches (creditor, amount, coupon, fixed/floating, maturity)
> 2. Credit rating calculation based on debt/revenue, operating margin, fiscal events
> 3. Rating changes trigger events (EV080 Credit rating downgrade)
> 4. BOC policy rate cycle with telegraph signals
> 5. Rate spike event possibility — implement EV079 (Rate spike event), originally scoped to Phase 3.2 but moved here because it needs this infrastructure
>
> Before coding, ask me 5-7 questions about rating thresholds and telegraph signal design.

**Definition of done:**
- Debt portfolio tracked
- Credit rating updates correctly
- Rate cycle simulates over campaign
- Rate spike telegraph fires before spike
- EV079 rate spike event fires correctly with full text and choices

**Commit message:** `phase 7.1: debt and credit rating`

---

### Session 7.2: Money/Treasury dashboard + refi

**Prompt:**

> Phase 7, Session 2. Money/Treasury dashboard.
>
> Implement:
>
> 1. Dashboard showing debt portfolio, credit rating, weighted average rate
> 2. Four creditor classes with their personalities
> 3. Rate quotes from each based on current rating
> 4. Refi mechanism with 1-2% fee
> 5. New issuance flow
> 6. Foreign emergency funding (once per campaign, severe political cost)
>
> Before coding, ask me 5-7 questions about UI flow and how creditor personalities should manifest.

**Definition of done:**
- All financing actions work
- Refi reduces ongoing debt service appropriately
- Foreign funding option appears at fiscal stress

**Commit message:** `phase 7.2: treasury dashboard and refi`

**Kill criterion for Phase 7:**

Take on heavy debt and trigger a rate spike. Does it feel like a real crisis with traceable cause? If rate spikes feel arbitrary, telegraph system needs work.

---

## Phase 8: Content depth

**4-6 sessions, ~15-25 hours.**

**Goal:** The world feels alive.

### Session 8.1-8.2: Full character implementation

**Two sessions.** Implement all 12 characters with full bios, recurring quirks, interaction history surfacing, voice consistency. Includes drafting bios for the 3 cabinet/critic politicians stubbed in Phase 6.2 (one per government — opposition critic or cabinet minister).

### Session 8.3-8.4: 25 more events

**Two sessions.** Implement 25 additional events spread across categories, including character-specific arcs (Maya Park investigations, Pellegrino succession, Thompson positioning). Includes 2-3 Disruptor-archetype gaffe event variants (CEO §7 archetype) — examples: offensive tweet, accidental cost reveal at media event, leaked internal memo about a contractor.

### Session 8.5: News feed system

**One session.** Real outlet voices (Star, Globe, Post, CBC, TVO). Generated headlines from world state. Maya Park byline frequency tied to her investigation arc.

### Session 8.6: Decision log UI

**One session.** "Why did this happen?" affordance on every state change. Click any negative outcome, see the chain of decisions and events.

**Kill criterion for Phase 8:**

Play a full 60-quarter campaign. Does the world feel alive? Are characters memorable? Can you trace consequences? If not, you've spent significant time and need to seriously consider whether the project is the right shape.

---

## Phase 9: Performance dashboard + end screen

**2-3 sessions, ~6-10 hours.**

### Session 9.1: Performance/Board dashboard

Implement per design doc.

### Session 9.2: Board CEO confidence + warning states

Calculation, components breakdown, formal warning UI at <40, firing at <25.

### Session 9.3: End screen narrative generator

Specific named outcomes tied to player's tenure. Templated narrative paragraph with variables. Specific moments, specific numbers, specific people.

---

## Phase 10: Polish

**3-5 sessions, ~10-20 hours.**

Visual polish, loading states, number animations, onboarding briefing, error states, performance optimization. Add 3 more projects, 5 more events to fill content gaps.

---

## Phase 11: Playtest + tuning

**4-6 sessions, ~15-25 hours.**

Play 10 full campaigns. Note unfun moments. Tune. Get 3 friends to play. Iterate.

---

## Total estimated effort

- Phases 0-3: foundation and first fun check (~20-30 hours)
- Phases 4-7: full mechanics (~32-50 hours)
- Phases 8-11: content, polish, tuning (~46-80 hours)

**Total: 98-160 hours of focused work.** At 6 hrs/week, 4-7 months. At 4 hrs/week, 6-10 months.

---

## Critical reminders

1. **Don't skip the question phase.** Force Claude Code to ask before coding. Always.
2. **Commit after every working state.** Don't accumulate broken code.
3. **Read diffs.** Even quickly. Catches drift.
4. **Hit kill criteria honestly.** If you reach the end of Phase 3 and the loop is boring, stopping saves you 80+ hours.
5. **One feature per session.** Don't let it sprawl.
6. **Update DECISIONS.md.** Every non-obvious choice gets recorded.
7. **Engine is testable in isolation.** UI is replaceable. Engine is the heart.
8. **Phase 0 is critical.** Bad foundation infects everything.

---

*This document is a playbook. Follow it sequentially. Each phase output is the input to the next. Failing fast at kill criteria is success, not failure.*
