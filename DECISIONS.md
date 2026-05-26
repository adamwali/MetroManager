# Decisions

Architectural decisions, one entry per item, newest at the top. Add an entry
whenever a non-obvious choice is made.

---

## 2026-05-26 — Phase 1.4: action log + save/load + harness polish

**Action log architecture:** one `quarter_summary` entry per `endTurn`,
with a rich `breakdown` payload that attributes each delta to its cause.
Specifically:

- `cashFlow`: each line item separately (operatingAllowance, fareRevenue,
  operatingExpense, maintenance, debtService, refiFee, netDelta). UI can
  show "you went -$134M this quarter because opex was $585M against
  $1.1B of inflows."
- `ridership.perAgency`: for each agency, `{ before, after, fromGrowth,
  fromReliabilityDrag, fromProjectPrimary, fromCannibalization }`. UI can
  click GO's ridership drop in Q21 and see "−30k from Ontario Line
  cannibalization" without needing a separate log entry per mechanic.
- `projects.transitions`: state changes (e.g. P00 under_construction →
  operating). Used for "this happened this quarter" filters.
- `projects.constructionDraws`: per-project funding pool draws (amount
  and remaining balance). For tracking when projects will run out.
- `debt`: refi events that quarter.

This was the granularity decision flagged in the original Phase 1.4
prompt ("too coarse = can't trace causes, too fine = log explodes").
Rich-payload-per-summary keeps the log small (60 entries for a campaign
without events; <300 with full event firings later) while still
supporting the full trace-back.

**ID format:** `q<quarter>-<nextLogId>`. Sequential within state, prefixed
by quarter for human readability. State carries a monotonic `nextLogId`
counter that bumps with each append.

**Save/load via JSON:** pure functions in `src/engine/saveLoad.ts`.
`saveGameToJson(state, now)` returns a `SaveBundle` JSON string with
`{ schemaVersion, savedAt, state }`. `loadGameFromJson(json)` parses,
validates schema version, returns GameState. Branded scalar types are
erased at runtime, so no reconstruction needed. Round-trip is byte-
identical (verified by test). Resuming from a save and continuing
matches in-memory play to JSON-equality.

**No migration logic yet.** Schema version is literal `1`. When we bump
it, a `migrate(bundle): SaveBundle` function lands here.

**Phase 1.4 is engine-level only.** IndexedDB + multi-slot UI is Phase
2.2's scope. For now the harness writes a single `dist-harness/state.json`
and can resume from it with `--load <path>`.

**CLI harness new flags:**
- `--seed N` (default 1)
- `--quarters N` (default 60)
- `--log N` (or `--log all`) — print action log entries
- `--load <path>` — resume from saved state
- `--save <path>` — write final state to specific path (defaults to
  `dist-harness/state.json`)

Default behavior: after each run, print the most recent quarter's log
entry inline so the user can eyeball that the breakdown is sane.

**Phase 1 kill criterion (per playbook):** "Run the CLI harness. Does
the simulation produce sensible numbers?" Yes — the per-quarter
breakdown for Q21 (Ontario Line opening) cleanly shows TTC +145k from
growth + project − cannibalization, and GO -29k mostly from
cannibalization. Both match the design model.

---

## 2026-05-26 — Phase 1.3: seeded RNG depth + starting cash to $1B

**Starting cash dropped from $5B to $1B** (per repo owner). The $5B figure
came from the spec's design doc §5 starting position but was unrealistic
for opex cushion — real transit agencies operate with working capital in
the hundreds of millions, not billions. At -$134M/Q baseline deficit,
$1B lasts ~7 quarters before going negative. Cash crosses zero at Q8
(Q1 2028 — less than 2 years in). Player has to act before the first
allowance renegotiation at Q16; cannot wait for the political cycle.

Game-design implication: from Quarter 1 the player faces a real choice —
fare hike, maintenance cut, ad-hoc funding request, or operating bond
issuance. The agency's $5B residual was masking that pressure.

**Seeded RNG architecture finalized** (Phase 1.3 DoD). Two patterns
implemented side by side:

1. **Sequenced RNG per subsystem.** State = `{ seed, callCount }`. Each
   draw advances callCount. `nextFloat`, `nextInt`, `pickWeighted`,
   `gaussian` (Box-Muller), `shuffle` (Fisher-Yates). All pure. State
   round-trips through JSON for save/load. Use for batched draws
   (shuffle, pick N items) within a single decision.

2. **Keyed RNG (stateless).** Functions of `(masterSeed, stringKey)` →
   value. `keyedFloat`, `keyedInt`, `keyedPickWeighted`. Use for per-
   decision independence: e.g., "did EV031 fire in Q12?" uses key
   `"event:EV031:q12"`. Adding new event templates does not shift the
   sequence for existing events.

The hybrid resolves the Phase 1.3 prompt's question ("what if I add a
new event type later — does that shift the sequence for existing
events?"). For events specifically, use keyed. For shuffles or
"pick 3 of N" within a subsystem, use sequenced.

**Algorithm:** mulberry32. Fast, deterministic, JSON-safe, not crypto.
Seed derivation uses FNV-1a hash of subsystem name + master seed (for
sequenced) or key + master seed (for keyed).

**Gaussian via Box-Muller**, discarding the second value (advances by 2
calls per draw). Tested: 500 samples have mean within ±4% and stddev
within ±20% of target. Good enough for game-sim noise (cost overruns,
ridership variance, etc.).

**RNG tests:** 17 tests covering determinism, subsystem isolation,
distribution properties (mean/stddev for gaussian, ratio for pickWeighted),
and the keyed approach's resistance to catalog expansion. All passing
alongside the 26 engine tests = 43 total.

---

## 2026-05-26 — Baseline tuned to deficit + cannibalization model

Repo owner reviewed v3.3 output and flagged two issues:

**Baseline should not run an easy surplus.** Real-world Toronto transit
agencies lose money and need political padding. The prior v3.3 numbers
showed +$232M/yr surplus at defaults, which created no pressure for the
player. Re-tuned starting numbers:
- TTC fare: $350M/Q → $295M/Q ($1.18B/yr, matches spec's $2.1B/yr split
  across 3 agencies)
- GO fare: $230M/Q → $200M/Q ($800M/yr)
- UP fare: $14M/Q → $12M/Q ($48M/yr)
- TTC opex (excl maint): $275M/Q → $340M/Q (bumped to capture unmodeled
  cost categories the player mentioned: security, cleanliness,
  accessibility, customer experience — these become per-agency sliders
  in Phase 5.1)
- GO opex (excl maint): $190M/Q → $225M/Q
- UP opex (excl maint): $15M/Q → $20M/Q

New baseline: **-$134M/Q operating deficit (-$536M/yr).** Agency runs
in the red at default settings. Player must close the gap via tradeoffs:
raise fares (with elasticity-driven ridership drop), cut maintenance
(with decay risk → eventual replacement events), reduce frequency (with
satisfaction drop), lobby for higher allowance at renegotiation (with
political capital cost), or issue operating bonds (with rating/board
confidence drag).

At -$134M/Q the $5B starting cash lasts ~37 quarters (9-10 years) before
going negative. Player has to act before then. This is the strategic
pressure the design called for.

**Ontario Line cannibalization modeled.** A new downtown subway in
Toronto realistically pulls riders from parallel services. v3.3 was
crediting +380k system-wide ridership from OL opening, which is the
line's own ridership, not net new. Modeled per-agency cannibalization:
- -150k from TTC Line 1 (Yonge relief is the entire point of OL)
- -50k from TTC streetcars (Queen/King/Dundas parallel surface routes)
- -38k from GO Lakeshore West (Exhibition station overlap)
- Net induced demand (truly new riders): ~142k system-wide

Cannibalization scales with the project's current ramp (0% at opening,
100% at full ramp). Opening ridership corrected from 0 to 290k per spec
catalogue ("290k → 380k by Q+8 ramp").

Type addition: `ProjectRidershipModel` in engine/data.ts with
`openingRidership`, `fullRidership`, `cannibalization` map, and
`primaryAgency`. `tickProject` returns per-agency deltas, `endTurn`
distributes to the right agencies.

Specific cannibalization numbers (-150k/-50k/-38k) are my call based on
Toronto transit-network analysis — not in the spec. Tunable. Other
projects' cannibalization defined in Phase 4 when the full catalogue
lands in engine code.

**Unmodeled opex categories noted for Phase 5.1.** Security, cleanliness,
fare gates / accessibility, customer service — currently absorbed into
the bumped opex number, but should become explicit per-agency sliders in
Phase 5.1 so the player sees the tradeoff: invest in security → lower
incidents, higher cost vs cut security → save money, scandal risk.

**Verified the spec's $2.4B subsidy figure was conceptually right.**
The original §5 numbers assumed break-even at baseline. We're now
operating at slight deficit because (a) debt service wasn't in the
spec's accounting and (b) the bumped opex accounts for cost categories
the spec didn't itemize.

---

## 2026-05-26 — Economic model pivot (spec v3.3)

Repo owner reviewed the Phase 1.2 heartbeat output and identified that the
prior model (annual indexed $9B government inflow → all cash, capital
spending → all cash) didn't match the intended game feel. Pivot:

**Capital and operating are now separate money flows.** Capital comes
per-project via a financing approach (Federal / Provincial / Municipal /
Consortium), each offering `{ amount, rate, conditions }` where rate is
tied to that government's trust score. Operating is funded by a 4-year
tri-government pact ($2.4B/yr starting) renegotiated at Y4 / Y8 / Y12.
Annual indexing dropped entirely.

**Project burn comes out of a per-project funding pool, NOT operating cash.**
Each `ConstructingProject` has `remainingFunding: CashMillions` (funded by
accepted financing at break-ground). Quarterly construction burn draws this
pool down. Operating cash only sees opex / maintenance / debt service / refi
fees. This matches how real agencies structure project capital vs operating
budgets and is much clearer for the player ("your bank account" = operating
liquid, "project budget" = per-project funded pool).

**Rate formula for financing offers:** `rate_bp = 500 + (50 - trust) × 6`,
clamped to [100, 1200]. Trust 50 → 5%. Trust 100 → 2%. Trust 0 → 8%.
Linear, easy to telegraph in UI ("your federal trust at 65 gets you 4.1%
on this project").

**Consortium = sum of three gov appetites, weighted-average rate, dedup'd
conditions.** No special discount for cooperating; just mechanics of the
combined offer.

**Funding appetite per gov per tier:** Federal larger, provincial mid,
municipal smaller (matches real-world Canadian transit funding stack).
Tunable per project tier (small / medium / large / mega).

**Per-agency catchment growth rates added to ridership math.** TTC 0.8%/yr,
GO 1.5%/yr (suburban Toronto growth is real), UP 0.3%/yr. Compounds per
quarter, added to reliability drag for net ridership delta. Captures the
real-world dynamic that population growth offsets aging-infrastructure
ridership drag.

**Operating allowance flat for its 4-year term.** No annual indexing within
the pact. Renegotiation event at end of term adjusts the next 4 years based
on trust + delivery + performance per the §6 outcome ladder.

**Private financing fallback:** if operating side runs persistently
negative, player can issue operating bonds against future inflow. Worse
rates than capital bonds, board confidence drag, downgrade pressure.
Implementation lands when needed (Phase 7).

**Reconciled opex split:** `lastQuarterOpex` is now operations-only
(labor, fuel, station ops) — excludes maintenance. Maintenance is its own
budget per subsystem, player-controllable. TTC opex dropped from $675M/Q
(double-counted) to $275M/Q. With $400M/Q maintenance at required level,
total TTC operating burden is $675M/Q matching the spec.

**Sanity check on the new model:** at default settings the operating gap
is +$55-58M/Q (slight surplus). The $2.4B/yr allowance covers the
opex - fare - debt-service shortfall with about $232M/yr headroom. The
spec's $2.4B subsidy estimate from §5 was correctly sized.

**Inflation indexing removed everywhere.** The 5%/yr indexing on gov
inflow is gone. All amounts in the simulation are nominal $M with no
implicit inflation. Construction inflation as a cost-factor pressure on
projects (§5) remains a separate mechanic.

Spec docs updated to v3.3.

---

## 2026-05-26 — Phase 1.2: cash flow engine

**Debt maturity = auto-refi at current market rate** (per repo owner). When
a tranche matures, replace it with a new fixed-rate tranche at
`bocPolicyRate + ratingSpread`, with the same approximate duration (8.4yr ≈
34Q). Charges a 1.5% midpoint refi fee from cash. Avoids surprise balloon
shocks during heartbeat testing; Phase 7's refi mechanic will let players
proactively roll debt before maturity.

**Government inflow indexed at 5%/yr** (per repo owner). Annual step
function — Q0-Q3 at 1x base, Q4-Q7 at 1.05x, Q8-Q11 at 1.10x, etc. Step
rather than continuous because real budgets renegotiate annually, not
quarterly. Matches the "indexed to construction inflation" spec wording at
the median of the 3-7%/yr range.

**Ontario Line opens and ramps within the 60Q run** (per repo owner).
Construction projects transition to operating at `forecastOpenAt`.
Ridership ramps linearly from 0 to full over 8 quarters per design doc §5
("new lines ramp over 8Q"). Player budget-pacing controls (advance / delay)
land in Phase 4.

**Subsystem decay on for Phase 1.2; no replacement events** (per repo
owner). Per-subsystem decay rates per §8 (rolling stock -1.5%/Q, signals
-1.2%/Q, track -0.8%/Q, stations -1.0%/Q, catenary -0.9%/Q for GO).
Maintenance offsets via spending tiers: <50% required → accelerated decay,
50-100% → partial decay, at-required → stable, 1.5x → preventive +0.5%/Q,
2x+ → catch-up +1.0%/Q. Replacement events (condition < 25) defer to
Phase 5.3.

**BOC policy rate held static for Phase 1.2.** Set to 350bp at start. The
cyclic 3-7% rate path lands in Phase 7.1 alongside the rate-spike event
(EV079 moved there from Phase 3.2). Floating-rate tranches reset quarterly
at (current BOC + tranche spread).

**Engine order of operations in `endTurn`:** advance quarter → apply
maturities → cash in (inflow + fare) → cash out (opex + maintenance + debt
service + refi fee + project burn) → subsystems decay → ridership drift
from reliability → project ticks → update cash. Single pass, no mutation.

**RNG architecture set up but unused in Phase 1.2.** `createRngSeeds(seed)`
derives 12 isolated subsystem seeds via FNV-1a hash of subsystem name +
master seed. Subsystem sequences won't shift when new event types land
later (Phase 1.3 DoD). Algorithm: mulberry32, JSON-safe state, opaque to
consumers via `nextFloat(state) → { state, value }`.

**Determinism property holds.** Same seed → identical 60-quarter trajectory.
Verified by test (`is pure: same input produces same output`).

**Engine never imports React, Zustand, or any UI dependency.** The ESLint
`boundaries/external` rule blocks this at lint time. Engine is Node-runnable
via `npm run engine:harness`.

**Test harness writes both human-readable table and machine-readable
artifacts.** Terminal table for eyeball review, `dist-harness/run.csv` for
spreadsheet analysis, `dist-harness/run.svg` for two-panel visualization
(cash + ridership). Zero chart-library dependencies — SVG is hand-rolled
in the harness. `dist-harness/` is gitignored (regenerable from seed).

---

## 2026-05-26 — Phase 1.1: GameState type definitions

**Project lifecycle simplified to 3 states** (per repo owner): `proposed` →
`under_construction` → `operating`. The `proposed` state has a 2-quarter
minimum buffer during which studies narrow uncertainty. The spec's prior
Concept → Studies → Lobbying → Greenlight → Planning → Design → Tender →
Construction → Operations chain is collapsed. Reflected in `docs/01-design-doc-v3.md`
§9 and `docs/02-project-catalogue-v3.md` intro. Spec footer bumped to v3.2.

**Canonical engine variables locked** (per repo owner, deferred issue #5).
Added to `docs/01-design-doc-v3.md` §5. Seven agency-level scalars
(`templates`, `crosslinxLeverage`, `consultantAlignment`,
`nimbyOrganization`, `openBooks`, `engineers`, `publicApproval`) plus three
per-project (`sitePrep`, `megaContract`, `settlementPremium`). Each
variable's range, starting value, and source events documented. The
`EngineVars` interface in `src/types/engineVars.ts` mirrors this exactly.

**Branded scalar types.** `src/types/scalars.ts` introduces `Brand<T, B>`
wrappers — `QuarterIndex`, `CashMillions`, `DailyRiders`, `Score100`,
`SignedScore`, `Percent`, `BasisPoints`, `DateISO`. They're erased at
runtime (zero overhead) but enforce nominal typing at the boundary. Lets us
catch e.g. accidentally passing a `RelationshipScore` where a
`QuarterIndex` is expected. Compromise: callers use helper functions
(`cash(5000)`, `score(60)`) to construct values. Doesn't replace runtime
validation at save/load boundary.

**Discriminated unions for state-machined types.** `Project` is a discriminated
union by `state` ('proposed' | 'under_construction' | 'operating') so each
state has its own fields. `ProposedProject` has `completedStudies`,
`chosenAlignment?`, `studiesInFlight`; `ConstructingProject` has
`totalBudget`, `spent`, `forecastOpenAt`; `OperatingProject` has `openedAt`,
`finalCost`, `currentDailyRiders`. Same pattern for `Character` (by role),
`ActionLogEntry` (by kind), `StandingOrder` (by kind), `EventEffect` (by
kind), `CouponMode` (fixed/floating).

**Character interaction history = structured records.** `InteractionRecord[]`
on each character with `{ quarter, kind, eventId?, choiceLabel?, delta,
note? }`. Aggregates (favorsGranted count, last contact quarter, longest
silence) computed on demand by engine helpers — not denormalized in state.
Keeps save size bounded; recomputation is cheap (max 60 quarters × ~10
characters × few interactions each).

**Standing orders = discriminated union per rule kind.** Five kinds for MVP:
`autoApproveMaintenanceBelow`, `autoDeclineLowDemandStudies`,
`capQuarterlyCapexGrowthPct`, `autoTriageInboxBelowUrgency`,
`autoRefiFloatingAboveSpread`. Each has typed parameters. Adding a new rule
means adding a kind + handler. Rejected: free-form predicate DSL (too much
rope, harder to save/load).

**Action log = discriminated union by entry kind** (`player_decision`,
`player_action`, `event_fired`, `quarter_summary`). Each entry has
`causedById?` for backward-pointer traversal (the "why did this happen?"
UI affordance in Phase 8.6). Granularity confirmed: every player decision,
every player action, every event firing, one quarter-summary roll-up per
endTurn. Per-quarter subsystem decay ticks fold into the quarter_summary.

**RNG sub-seeds enumerated.** 12 subsystems: `events`, `characterMoods`,
`contractorBehavior`, `economic`, `elections`, `demographicDrift`,
`projectCostRealization`, `climate`, `technology`, `media`,
`nimbyOrganizing`, `gaffe`. Each has its own `RngState` (`{ seed,
callCount }`). New event types don't shift the random sequence of other
systems — Phase 1.3 requirement holds. Adding a subsystem later means
adding a key (state schemaVersion bump if needed).

**Schema version field on `GameState`.** Numeric, currently `1`. Save loader
will migrate older saves forward when this bumps. Type is literal `1` so
the compiler enforces it at construction sites.

**Example GameState committed in `src/types/example.ts`.** Serves three
purposes: (1) Phase 1.1 DoD requirement, (2) compile-time check that types
are mutually consistent, (3) seed for `createInitialGameState` in Phase 1.2.

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
