# Decisions

Architectural decisions, one entry per item, newest at the top. Add an entry
whenever a non-obvious choice is made.

---

## 2026-05-26 — Spec patches (v3.0 → v3.1)

Repo owner reviewed Tier 1 / Tier 2 spec issues from initial review. Decisions:

**Removed: P03 Downtown Relief south.** Made redundant by Ontario Line being
already-in-construction at game start (it would never be greenlit). Catalogue
now 29 selectable + 1 inherited = 30 total. Tier distribution table updated
to 10/11/5/4.

**Moved: EV079 (Rate spike event) from Phase 3.2 → Phase 7.1.** Rate spike
needs bond/debt/floating-tranche infrastructure that doesn't exist until
Phase 7. Phase 3.2 now uses EV037 (Cleanliness scandal) as its
media/public-pressure example.

**Phase 6.2 scope reduced.** Was "6 named politicians (Hartwell, Liang,
Tremblay + 3 cabinet/critics)". Only 3 are bio'd in the characters doc, so
Phase 6.2 implements the 3 bio'd politicians + 3 placeholder slots. Cabinet/
critic bios drafted in Phase 8.1-8.2.

**Doctrines scoped.** §7's five doctrines (Ridership Maximizer, Cost
Discipline, Reliability Engineer, Equity Focus, Modernization) apply to
operating directors only. Senior staff (COO, CFO, Head of Engineering,
Deputy CEO) have role-specific doctrines defined in their bios; not in the
pool. Subramanian = "Engineering Excellence", Thompson = "Speed-to-Delivery"
are now consistent with the spec.

**Trust drift = bidirectional mean reversion to 40.** Confirms §6 wording.
Above 40 drifts down ~1/Q; below 40 drifts up ~1/Q. No active maintenance
required to stay at 40, but no free goodwill either.

**Lobbying cooldown = per-politician global, 3Q, independent across
politicians.** Any lobbying action on a politician locks them out for 3
quarters across all action types. Politicians' cooldowns don't interact —
lobby Hartwell and Liang the same quarter, that's fine.

**Director tolerance normalized 0-100, starts at 60.** Was 0-12, starting
at 12. Indexed to 100 to match trust / board confidence / relationship
score conventions across the system. Action costs scaled accordingly
(override -15, budget cut -25, etc.). Regen +5 per 2Q idle; aligned-action
+5 stacks with idle regen.

**Board confidence weights spelled out.** Score 0-100, starts at 60. Each
contributing factor now has explicit Δ values (see §3). Drift +1/Q toward
60 when no negative factors fire.

**Stagnated-ridership lose condition has a threshold.** Y15 daily ridership
< Y1 daily ridership × 1.05 = lose. Decline (negative growth) and
stagnation (<5% cumulative growth over 15 years) both trigger lose
condition #4.

**Disruptor archetype gaffe events scheduled for Phase 8.3-8.4.** 2-3
variants. Sample fodder: offensive tweet, accidental cost reveal at media
event, leaked internal memo about a contractor.

**Action log granularity (my call).** Log: every player decision (event
choice), every state-changing player action (lobby, capital-allocation
change, hire/fire, refi, etc.), every event firing, every quarter advance
summary. Do not log: per-quarter cash-flow micro-steps (rolled into the
quarter summary), individual subsystem decay ticks (one entry per quarter).
Keeps log small enough for save round-trip while preserving every
trace-back the "why did this happen?" affordance needs. Revisit in Phase 1.4.

**44-neighborhood voter patterns — informational only for MVP.** Election
outcomes are computed from government-level trust + polling + approval per
§6, not aggregated from per-neighborhood voter breakdowns. Voter patterns
are texture for Mission Control and Political Affairs (showing the
political landscape behind a project's catchment) but don't drive election
math. Revisit if elections feel mechanical.

**Deferred — to be resolved as they bite:**
- Tier 1 #5 — engine variables referenced in events but never defined
  (`templates`, `Crosslinx leverage`, `consultant alignment`, `NIMBY
  organization`, `openBooks`). Will surface in Phase 1.1 GameState typing
  as a question phase.
- Tier 2 #7 — election flip formula's `approval` and `agreement_buffer`
  variables. Will surface in Phase 6.1.
- Tier 2 #11 — decision density vs event frequency reconciliation. Will
  surface in Phase 3.1 event firing logic.

Spec changes are tagged v3.1 in the design doc footer.

---

## 2026-05-26 — Phase 0 skeleton

**Engine isolation: single repo, `src/engine/` with ESLint boundary rule.**
Rejected the workspace-package approach to keep iteration fast. The
`eslint-plugin-boundaries` rule in `eslint.config.js` blocks the engine from
importing React, Zustand, Recharts, Framer, or any UI module. The constraint
holds at lint time, before commit.

**Routing: `react-router-dom` v7, one route per dashboard.**
`/`, `/performance`, `/ttc`, `/go`, `/up`, `/capital`, `/allocation`,
`/treasury`, `/political`. Deep-linkable, browser-history-aware. The dashboard
nav lives in `AppLayout` and renders all 9 routes.

**Package manager: npm.** No special features needed; npm 10 is fine and
universally available. Lockfile committed.

**TypeScript: strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.**
Caught early-stage shape bugs cost less than the alternative. The engine's
correctness depends on it.

**Tailwind v4.** First-party Vite plugin (`@tailwindcss/vite`), no
`tailwind.config.js` — theme overrides live in `src/index.css` via `@theme`.
Minimal Bloomberg-ish defaults (dark, monospace numerics) until Phase 2.1
implements Mission Control proper.

**Tests: Vitest, jsdom environment.** Vite-native, no separate config.
A single smoke test (`src/smoke.test.ts`) verifies the harness runs.

**Vercel: framework preset only.** `vercel.json` declares the Vite framework
and a SPA fallback rewrite. Repo owner connects to Vercel via the dashboard
when ready; no CLI/credentials needed from this skeleton.

**Node engines: `>=20`.** `.nvmrc` pins 20. Vite 6, React 19, and Tailwind 4
all want recent Node.

**No GitHub Actions CI.** Explicitly chosen at scaffold time. Add later if
warranted.

**File path aliases (`@`, `@engine`, `@ui`, `@state`, `@types`, `@utils`).**
Configured in `vite.config.ts` and `tsconfig.app.json`. Imports stay short
and movement-resistant.
