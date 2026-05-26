# Sessions

Working log of build sessions. Append newest at the top. Per the playbook,
each entry captures: what got done, what's left, surprises.

---

## 2026-05-26 — Phase 2.2: campaign lifecycle complete

**Done:**
- Asked 3 design questions (archetype depth, save model, failure rules).
  Repo owner picked deep divergent archetypes, 3 manual + 1 autosave,
  standard failure thresholds.
- Polish from Phase 2.1 self-review:
  - Q0 cash caption fix ("starting balance" instead of "growing")
  - "YoY pending" removed
  - Empty-state copy improved on Inbox + NewsRail
- New `src/engine/archetypes.ts` with 5 configs (4 pickable + Disruptor
  deferred). Each has cash, board, trust, public approval, engineers,
  templates, openBooks, subsystem adjust, plus displayName, blurb,
  strengths, weaknesses arrays for the picker.
- `createInitialGameState(seed, archetype, ceoName)` threads archetype
  overrides through the starting state.
- New `src/types/gameOver.ts` with `GameOver`, `GameOverCounters`,
  thresholds. `GameState` extended with `gameOver?` and
  `gameOverCounters`.
- `endTurn` updates consecutive-quarter counters and emits a `GameOver`
  when a threshold trips. Recovery (one good quarter) clears the
  counter to 0.
- `idb-keyval` installed; `src/state/saveSlots.ts` wraps it for the
  3 manual + 1 autosave slot model with metadata listing.
- Zustand store extended:
  - `endTurn` writes autosave in background and updates `autosaveStatus`
  - `newGame(seed, archetype, name)` resets state with archetype
  - `loadFromSlot(slotId)` parses + reconstructs initialState
    deterministically from the loaded seed/archetype
  - `forecast(quartersAhead)` pure dry-run for time-jump preview
- New UI components:
  - `NewGameModal` — archetype picker with strengths/weaknesses cards +
    seed/name inputs
  - `SaveLoadModal` — slot list with metadata, save/load/delete actions
  - `GameOverScreen` — full-page result with stats + start-new/load CTAs
  - `TimeJumpPreview` — hover/focus tooltip with 4-quarter forecast
    table (cash, riders, cumulative deltas, game-over warning)
- `AppLayout` rewritten: brand bar with Save/Load/New buttons, autosave
  status, time-jump preview, end-turn button. On boot, attempts
  silent autosave restore; falls back to new-game modal.
- New tests in `src/engine/gameOver.test.ts`:
  - Archetype divergence (4 archetypes have distinct starting stats)
  - Deterministic trajectories per seed+archetype
  - Fiscal failure trips at 4 consecutive quarters below threshold
  - Board firing trips at 2 consecutive quarters below threshold
  - Recovery clears counters
- 85 tests passing (was 75; +10 archetype + game-over tests).

**Phase 2.2 DoD:**
- ✓ New-game flow with archetype picker + seed selection
- ✓ Save/load with 3 manual slots + autosave
- ✓ Game-over screens for fiscal failure, board firing
- ✓ Campaign-won screen at Q60
- ✓ Time-jump prediction overlay (deterministic 4Q)
- (Step-down screen deferred to Phase 6 per playbook)

**Left for later phases:**
- Step-down (player-initiated resignation) → Phase 6
- Monte Carlo time-jump (ranges across stochastic outcomes) → Phase 3+
- Disruptor archetype + random gaffes → Phase 3.1
- Onboarding briefing for first-time players → Phase 10
- Mobile UI polish → out of scope (MVP is desktop-first)

**Surprises:**
- `idb-keyval` is delightfully tiny and the IndexedDB ergonomics are
  much better than the raw API. ~30 lines of save-slot code total.
- Resuming from autosave on boot works cleanly because the Zustand store
  reconstructs `initialState` from the loaded seed + archetype. No
  duplicated state stored.
- The archetype picker reveals how much the spec's §7 archetypes vary
  from each other once you go deep — Insider feels totally different
  to play from Technocrat from Q1, not Q20.
- Time-jump preview is satisfying. Hovering shows "you'll go negative in
  Q7" before you commit. Real planning surface.

---

## 2026-05-26 — Phase 2.1: Mission Control dashboard

**Done:**
- Asked 4 visual-design questions (style, density, humanize, end-turn).
  Repo owner picked Mercury/Linear light theme + max density + concrete
  comparisons + instant end-turn.
- New utility modules:
  - `src/utils/humanize.ts` — formatters with concrete comparisons
    (cash runway, rider delta in bus-routes/streetcars/subway-lines,
    trust descriptors, board-confidence descriptors, quarter labels)
  - `src/utils/kpis.ts` — derived KPIs (history reconstruction, YoY
    deltas, TTC reliability composite, on-time / satisfaction
    derivations)
- Zustand store at `src/state/gameStore.ts` wired to engine:
  state + initialState + endTurn + newGame + history derivation
- New UI components:
  - `Kpi.tsx` — single KPI cell with label, value, delta, caption, tone,
    optional sparkline
  - `Sparkline.tsx` — minimal hand-rolled inline SVG (red/green by
    trend), no chart library dependency
  - `TopStrip.tsx` — 8-KPI bar always visible across dashboards
  - `EndTurnButton.tsx` — instant, no confirmation
  - `Inbox.tsx`, `NewsRail.tsx`, `WhatsComing.tsx` — Mission Control
    page sections (currently with empty/scaffolded content)
- `AppLayout.tsx` rewritten for light theme; brand bar + tab nav + top
  strip + main outlet. End-turn button in brand bar (top-right).
- `MissionControl.tsx` page composes Inbox + WhatsComing + NewsRail in
  a responsive grid (2/3 main + 1/3 side on desktop)
- `index.css` and `index.html` updated for light theme
- Test additions:
  - `humanize.test.ts` — 15 cases for formatters, descriptors, labels
  - `kpis.test.ts` — 6 cases for history reconstruction, YoY,
    on-time derivation
- 75 tests passing total (was 54).
- Build clean: 309KB JS / 99KB gzip.

**Phase 2.1 DoD met:**
- ✓ Mission Control renders with starting state
- ✓ End turn button works (Zustand → engine → re-render)
- ✓ Could click 60 times in a row without error (engine determinism +
  pure functions guarantee this; UI is presentation only)
- ✓ Sparklines for cash and ridership populated (TopStrip)
- ✓ Number humanization implemented (every KPI has a caption)

**Left for later phases:**
- New-game flow (CEO archetype picker, seed selection, save-slot UI)
  → Phase 2.2
- Save/load UI (IndexedDB multi-slot) → Phase 2.2
- Game-over screens (fiscal failure, board firing) → Phase 2.2
- Inbox populated with real events → Phase 3.1
- News rail with outlet voices → Phase 8.5

**Surprises:**
- Tailwind v4's `@theme` in CSS is slick — no JS theme file, defines
  custom font tokens inline. Switching from dark to light only touched
  3 files (index.css, index.html, AppLayout.tsx).
- Sparkline as hand-rolled SVG (40 lines) is much simpler than wiring
  Recharts for inline use. Recharts will earn its place in Phase 9's
  full-page charts.
- The action log breakdown payload (built Phase 1.4) made the news
  rail and YoY computation trivial. Right design choice.

---

## 2026-05-26 — Phase 1.4: action log + save/load + harness polish

**Done:**
- Extended `ActionLogEntry` `quarter_summary` kind with `breakdown`
  payload (cash flow components, per-agency ridership attribution,
  project transitions, construction draws, refi events).
- Added `nextLogId: number` field to `GameState`. Each log entry gets
  an ID `q<quarter>-<id>` for human-readable references.
- Rewrote `endTurn` to track per-mechanic contributions (growth, drag,
  project primary, cannibalization) and emit a `quarter_summary` entry
  on each call.
- New `src/engine/saveLoad.ts` with `saveGameToJson` / `loadGameFromJson`
  / `SaveLoadError`. Schema-version checked. Branded types erased at
  runtime so round-trip is clean JSON.
- Harness extended:
  - `--log <quarter>` or `--log all` prints log entries with full
    breakdown ("ttc: 4,454,776 → 4,600,229 (+145,453) [growth +8882,
    drag -6126, project +301250, cannibal -158553]")
  - `--load <path>` resumes a saved campaign
  - `--save <path>` writes to specific path (default
    `dist-harness/state.json`)
  - After each run, prints the most recent quarter's log entry by
    default so it's always visible.
- 11 new tests in `src/engine/saveLoad.test.ts`:
  - Round-trip identity at game start and mid-campaign
  - Resume-from-save matches in-memory continuation
  - Malformed JSON rejected
  - Wrong schema version rejected
  - Log entry IDs unique, nextLogId increments
  - Breakdown sums match recorded netDelta
- 54 tests passing total (1 smoke + 25 engine + 17 rng + 11 saveLoad).

**Phase 1 complete.** Per the playbook's kill criterion: the harness
runs, the numbers make sense, the trace-back is faithful (Q21 OL
opening cleanly shows TTC +145k breakdown across mechanics, GO -29k
attributed to OL cannibalization). Foundation ready for Phase 2 (UI
+ end-turn button in browser).

**Left for later phases:**
- Player decision / action log entries (currently only system
  `quarter_summary` is emitted) — Phase 3.1+ as events and player
  actions land.
- Trace-back graph traversal via `causedById` — Phase 8.6 builds the
  "why did this happen?" UI on top of the action log.
- IndexedDB multi-slot saves — Phase 2.2.
- Schema migration logic — when we bump the literal version.

**Surprises:**
- The rich `breakdown` payload was the right granularity. Once it
  landed, the harness output became actually useful for sanity-
  checking — every per-quarter mutation has a clear cause and you can
  read the trade attribution at a glance.
- Resume-from-save matching in-memory continuation byte-for-byte
  validated the purity discipline. If endTurn had hidden side effects
  or non-deterministic ordering, this test would have caught it.

---

## 2026-05-26 — Phase 1.3: seeded RNG depth + $1B starting cash

**Done:**
- Dropped starting cash from $5B to $1B per repo-owner call. Cash now
  goes negative at Q8 (less than 2 years in) — player can't coast.
- Built out `src/engine/rng.ts` with full helper suite:
  - Sequenced (stateful): `nextFloat`, `nextInt`, `pickWeighted`,
    `gaussian` (Box-Muller), `shuffle` (Fisher-Yates).
  - Keyed (stateless): `keyedFloat`, `keyedInt`, `keyedPickWeighted`.
- 17 RNG tests in `src/engine/rng.test.ts`:
  - Determinism (same seed → same values)
  - Subsystem isolation (12 subsystems mutually independent)
  - Distribution properties (gaussian mean/stddev, pickWeighted ratio)
  - Keyed pattern's resistance to catalog expansion (adding EV004 doesn't
    shift EV001/EV002/EV003 outcomes for the same campaign)
- Total tests: 43 passing (1 smoke + 25 engine + 17 RNG).
- Exports added to `src/engine/index.ts` for engine consumers.

**Phase 1.3 DoD met:**
- ✓ Same seed produces identical 60-quarter campaign
- ✓ Sub-RNGs isolated from each other
- ✓ Save/load round-trip preserves RNG state (pure functions + JSON-safe
  state objects)
- ✓ Unit tests pass

**Left for later phases:**
- Action log entries from endTurn — Phase 1.4.
- Event firing using keyed RNG — Phase 3.1.
- Project cost realization using gaussian — Phase 4.
- Election flip probability draws — Phase 6.1.

**Surprises:**
- Box-Muller gaussian advances callCount by 2 per draw (consumes 2
  uniforms, discards the 2nd value). Worth noting if downstream code
  ever counts on tight callCount packing.
- The "keyed RNG" pattern is a really clean answer to the catalog-
  expansion problem. Worth highlighting to anyone designing event
  systems: don't tie randomness to draw order if you'll ever add
  content; tie it to a stable key per decision.

---

## 2026-05-26 — Baseline tuning + cannibalization

**Done:**
- Repo-owner review of v3.3 numbers identified surplus-too-easy + missing
  cannibalization on Ontario Line opening.
- Re-tuned per-agency opex (bumped) and fare (lowered to spec) so baseline
  is now -$134M/Q ($536M/yr) operating deficit. Cash $5B → -$3.23B over
  60Q at default settings. Goes negative around Q37 — player has to act.
- Added `ProjectRidershipModel` with `openingRidership`, `fullRidership`,
  per-agency `cannibalization` map, `primaryAgency`. Ontario Line model:
  -150k TTC Line 1, -50k TTC streetcars, -38k GO Lakeshore West. Net new
  ~142k system-wide (not 380k).
- `tickProject` now returns per-agency ridership deltas (primary +
  cannibalization). `endTurn` distributes to TTC and GO separately.
- Opening ridership corrected from 0 to 290k per spec catalogue.
- Tests: added 2 cannibalization tests + updated baseline test to assert
  deficit (was asserting break-even). 26 tests total, all passing.
- Harness updated: per-agency rider columns in the table, 3-panel SVG
  (cash / operating gap / TTC+GO riders with dual axis).

**Heartbeat trajectory now:**
- Cash $5B → -$3.23B over 60Q. Negative around Q37 (about 9 years in).
- Operating gap -$134M/Q steady. Clearly visible in the gap panel.
- TTC riders: 4.40M → 4.75M (Ontario Line opening Q20 bump from 4.45M to
  4.60M is the OL primary contribution minus its cannibalization).
- GO riders: 0.34M → 0.35M (catchment growth +37k offsets -38k OL
  cannibalization, roughly flat).
- System total: 4.75M → 5.11M. Net +360k over 15 years, of which ~142k
  is OL induced demand and ~218k is organic catchment growth.

**Left for later phases:**
- Player-controllable security / cleanliness / accessibility sliders →
  Phase 5.1 (currently absorbed into baseline opex).
- New-line operating cost increase (opening a subway adds to opex) →
  Phase 4 when project opening is fully wired.
- Operating bonds as deficit-closing lever → Phase 7.

**Surprises:**
- Once cannibalization landed, the trajectory looked like a real Toronto
  transit agency: bleeding money slowly, dependent on government
  padding, modest organic ridership growth offset by aging
  infrastructure. The Ontario Line opening is meaningful but not a
  silver bullet, which matches reality.
- The cannibalization math (-150/-50/-38) is my call — Toronto-realistic
  but not in the spec. Worth revisiting with real ridership modeling if
  we get serious about that.

---

## 2026-05-26 — Economic model pivot (v3.3)

**Done:**
- Reviewed Phase 1.2 heartbeat output with repo owner. Identified that the
  prior model produced unrealistic cash accumulation ($119B over 15 years)
  because capital project burn was sharing cash with operating flows.
- Locked design pivot: per-project financing + 4-year operating pact +
  city growth offset + no inflation.
- Spec updated to v3.3: replaced economic-model §5 entirely; added §5
  subsections on capital financing, operating allowance, private bonds,
  ridership dynamics with growth.
- Type system extended:
  - `FinancingApproach`, `FinancingCondition`, `FinancingOffer`,
    `AcceptedFinancing` in projects.ts
  - `OperatingAllowance` and `OperatingAllowanceControl` in new
    operatingAllowance.ts
  - `catchmentGrowthRate` on Agency
  - `remainingFunding` on ConstructingProject (capital lives here, not in
    agency operating cash)
- Engine modules updated:
  - `cashflow.ts`: `quarterlyGovernmentInflow` removed; replaced with
    `quarterlyOperatingAllowance`. Inflation gone. opex/maint/fare helpers
    unchanged.
  - `agencies.ts`: added `catchmentGrowthPerQuarter` helper
  - `projects.ts`: `tickConstructingProject` now draws from
    `remainingFunding`, returns `drawFromFunding` (not `spentThisQuarter`)
  - `endTurn.ts`: project burn no longer subtracted from cash; operating
    cash flow is purely operating-side
  - `financing.ts`: NEW — `rateForTrust`, `generateFinancingOffers`
    producing four offers per project per current trust scores
  - `createInitialGameState.ts`: opex split out from maintenance, OL has
    `remainingFunding: $18B` reflecting historical pre-game financing
- Tests: dropped inflation test, added 8 new tests (operating allowance,
  financing offers, catchment growth, agency near-break-even check).
  24 tests total, all passing.
- Harness updated with OpGap column showing operating-side gap per quarter.

**New heartbeat trajectory:**
- Cash $5B → $8.29B over 60Q. Operating surplus ~$232M/yr at defaults.
- Operating gap +$55-58M/Q (slight surplus — allowance + fare covers
  opex + maint + debt service with headroom).
- Ridership 4.75M → 5.36M (Ontario Line ramp + city growth > reliability
  drag at default maintenance).
- Ontario Line opens Q20 as before, draws from its $18B remaining funding
  pool over the 16 quarters of remaining construction.

**Left for later phases:**
- Project financing UI (player picks offer at proposed-state initiation) →
  Phase 4.
- Operating allowance renegotiation event flow → Phase 6.3.
- Operating bonds for persistent shortfall → Phase 7.
- BOC rate cycling → Phase 7.

**Surprises:**
- The original spec's $2.4B subsidy figure was correctly sized — it took
  separating opex from maintenance to see it. The earlier model was
  double-counting maintenance inside opex.
- Once project burn was moved off cash, the trajectory became almost
  realistic-feeling on first try. Good signal that the per-project
  financing model is the right abstraction.

---

## 2026-05-26 — Phase 1.2: cash flow engine

**Done:**
- Asked 4 Phase 1.2 questions (debt maturity, inflation, OL opening,
  subsystem decay). All locked in DECISIONS.md.
- 8 engine modules in `src/engine/`:
  - `rng.ts` — mulberry32 + 12-subsystem seed derivation
  - `finance.ts` — debt service per tranche, rating→spread table,
    auto-refi at maturity
  - `cashflow.ts` — government inflow (5%/yr indexed), opex, fare revenue,
    maintenance expense
  - `agencies.ts` — subsystem decay with spending-tier offsets,
    reliability composite, ridership drift from reliability
  - `projects.ts` — construction tick (spend + transition at
    forecastOpenAt), ridership ramp over 8Q after open
  - `data.ts` — full-ramp ridership lookup (Ontario Line for now)
  - `createInitialGameState.ts` — Q1 2026 starting state matching §5
  - `endTurn.ts` — pure single-quarter advance
  - `index.ts` — barrel exports
  - `test-harness.ts` — CLI runner; emits table + CSV + SVG
- 15 engine tests in `src/engine/engine.test.ts`. All passing.
- Harness runs 60 quarters in 2.8ms (vs 2000ms DoD ceiling).

**Heartbeat trajectory observations (sanity check):**
- Cash $5B → $119B over 60Q. Realistic-ish given that the simulation
  currently has only one capital project in flight (Ontario Line).
  Phase 4 adds 6+ more buildable projects which will absorb most of the
  cash. Without them, the agency just accumulates inflow.
- Ontario Line opens at Q20 as designed, ramps 380k riders over Q20-Q28.
- TTC reliability stays flat at 68 (default maintenance = required level).
  Underfunding triggers decay (verified by test).
- Total daily riders 4.75M → 4.74M: Ontario Line ramp (+380k) roughly
  offset by 15-year reliability drag at moderate condition (68).
- BOC rate held static at 350bp; cycling lands Phase 7.

**Left for later phases:**
- Player controls over project pacing (advance/delay budget) — Phase 4.
- Real capital allocation across multiple projects — Phase 4.
- Events firing → Phase 3.
- Standing orders execution — Phase 5.1.
- Action log entries from endTurn → Phase 1.4.
- BOC rate cycling + rate spike event → Phase 7.1.
- Replacement events when subsystem < 25 → Phase 5.3.

**Surprises:**
- tsx required explicit `--tsconfig ./tsconfig.app.json` to pick up the
  path aliases. Without it, `@/types` import fails to resolve. Fixed in
  the `engine:harness` npm script.
- The branded scalar types create heavy `as unknown as number` noise in
  engine math. Phase 1.3 may introduce a small helper or two to keep this
  ergonomic; for now the casts are isolated to engine internals and
  callers see clean branded types at the boundary.

---

## 2026-05-26 — Phase 1.1: GameState type definitions

**Done:**
- Asked the 4 Phase 1.1 question-phase questions (lifecycle, engine vars,
  character history shape, standing-orders type approach). All locked.
- Patched spec to v3.2: simplified 3-state project lifecycle and added
  canonical engine-variables table to §5.
- Wrote 13 type modules in `src/types/`:
  - `scalars.ts` (branded primitives + constructors)
  - `finance.ts` (Cash, Debt, DebtTranche, CouponMode)
  - `politics.ts` (Government, Politics)
  - `confidence.ts` (BoardConfidence with weighted factors)
  - `projects.ts` (Project as 3-state discriminated union, Alignment,
    LvcConfig, CompletedStudy, ProjectTemplate)
  - `agency.ts` (Agency, SubsystemCondition, AgencyOperatingParams)
  - `characters.ts` (Character as role-discriminated union, InteractionRecord,
    DirectorDoctrine, SeniorStaffDoctrine)
  - `events.ts` (EventTemplate, ActiveEvent, EventChoice, EventEffect,
    DelayedConsequence)
  - `standingOrders.ts` (StandingOrder as kind-discriminated union)
  - `actionLog.ts` (ActionLogEntry as kind-discriminated union, ActionCause)
  - `rng.ts` (RngSeeds with 12 subsystems)
  - `engineVars.ts` (the 7 canonical agency-level vars)
  - `ceo.ts` (CeoArchetype + Ceo)
  - `gameState.ts` (the root)
  - `index.ts` (barrel exports)
- Example `GameState` in `src/types/example.ts` satisfies all types
  (Phase 1.1 DoD).
- All four checks green: typecheck, lint (incl. boundary rules), tests,
  build. No `any` types anywhere in `src/types/`.

**Left for later phases:**
- `createInitialGameState(seed)` and `endTurn(state)` → Phase 1.2.
- Seeded RNG implementation → Phase 1.3 (types ready, engine code TBD).
- Action log helpers (graph traversal for "why did this happen?") → Phase 8.6.
- Engine state mutations always go through logged actions → wiring in Phase 1.4.

**Surprises:**
- Vitest 2 bundled its own Vite 5 which conflicted with our Vite 6 plugins
  at typecheck time (last session). Upgrade to Vitest 3 fixed.
- The `exactOptionalPropertyTypes` flag tripped React Router's `NavLink.end`
  prop. Resolved by making the `end` boolean always-present in our dashboard
  link config.
- `Agency.subsystems` is a flat array rather than a `Record<SubsystemId,
  Subsystem>` because not all agencies have all subsystems (GO has
  `catenary` instead of `signals`; UP doesn't track signals separately).
  Iteration is easier than presence-checking.

**Done:**
- Reviewed all 5 spec docs and surfaced spec issues (see chat for prioritized list).
- Committed spec to `docs/`.
- Scaffolded Vite 6 + React 19 + TypeScript (strict) + Tailwind 4.
- Wired React Router v7 with one route per dashboard (9 routes, 8 stubbed).
- ESLint with `eslint-plugin-boundaries` enforcing engine isolation
  (no React/Zustand/UI imports under `src/engine/`).
- Prettier + Vitest configured. One smoke test passes.
- `vercel.json` with framework preset and SPA fallback.
- `DECISIONS.md` (this folder), `README.md`, `.nvmrc` (Node 20).

**Left for later phases:** Engine, state, characters, events, projects, finance.
See `docs/05-claude-code-phases.md` for the full sequence.

**Surprises:**
- Tailwind v4 dropped `tailwind.config.js` in favor of `@theme` in CSS.
  Adjusted accordingly; no JS theme file.
- React Router v7 changed to `Component:` syntax in route configs.
  Old `element: <X />` still works; new form is cleaner.

**Spec patches applied (v3.0 → v3.1):**
- Removed P03 (made redundant by Ontario Line being already-in-construction).
- Tier distribution table updated to 10/11/5/4.
- EV079 (rate spike) moved from Phase 3.2 → Phase 7.1 (needs bond infra).
  Phase 3.2 now uses EV037 (Cleanliness scandal) instead.
- Phase 6.2 scoped to 3 bio'd politicians + 3 placeholder slots; cabinet/
  critic bios drafted in Phase 8.1-8.2.
- Doctrines scoped: §7's 5 doctrines for operating directors only; senior
  staff have role-specific doctrines in their bios.
- Director tolerance normalized 0-100, starts at 60. Action costs scaled.
- Trust drift clarified bidirectional mean-reverting to 40.
- Lobbying cooldown clarified per-politician global / 3Q / independent.
- Board confidence weights table added in §3.
- Stagnated-ridership lose threshold defined (Y15 < Y1 × 1.05).
- Disruptor gaffe events scheduled for Phase 8.3-8.4.

**Repo owner deferred:**
- Engine variables (`templates`, `Crosslinx leverage`, etc.) — Phase 1.1.
- Election flip formula `approval` / `agreement_buffer` — Phase 6.1.
- Decision density vs event frequency reconciliation — Phase 3.1.

**My calls (recorded in DECISIONS.md):**
- Action log granularity (player decisions + actions + event firings +
  quarter summaries; not per-tick subsystem decay).
- 44-neighborhood voter patterns = informational only for MVP.
