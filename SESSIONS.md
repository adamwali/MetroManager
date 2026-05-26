# Sessions

Working log of build sessions. Append newest at the top. Per the playbook,
each entry captures: what got done, what's left, surprises.

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
