# Sessions

Working log of build sessions. Append newest at the top. Per the playbook,
each entry captures: what got done, what's left, surprises.

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
