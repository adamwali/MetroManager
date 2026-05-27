# Sessions

Working log of build sessions. Append newest at the top. Per the playbook,
each entry captures: what got done, what's left, surprises.

---

## 2026-05-26 — Phase 7: Treasury (bonds + refi + dynamic rating) + PROGRESS.md

**Pre-execute:** Repo owner requested:
1. Stacked financing (queued for next commit) — bonds top up, not replace
2. Progress tracking file
3. Phase 7 next

Locked 4 design questions: package builder UX, rating-gated caps, simple
refi (pick + 1.5% fee), dynamic rating in Phase 7.

**Done:**
- Created `PROGRESS.md` flat status tracker at repo root
- `src/engine/rating.ts`: computeMetrics, ratingFromMetrics, driftRating
  (one notch/quarter), nextRatingFor (called by endTurn)
- `src/engine/treasuryActions.ts`: quoteOperatingBond, issueOperatingBond,
  quoteRefi, refinanceTranche
- `endTurn` integrates rating recomputation after BOC drift
- Zustand store: `issueOperatingBond` + `refinanceTranche` actions
- `/treasury` dashboard: portfolio summary cards, operating bond issuance
  form, debt portfolio table with per-tranche refi button + tooltip
- 18 new tests for rating + bonds + refi
- 218 tests total passing

**Heartbeat:**
- Technocrat at default AA rating + openBooks gets foreign operating
  bond at 5.35% vs Steady at 5.55%. Compounds.
- Insider campaign reaching cash -$3B + board 30 → next quarter rating
  drifts AA → A → A (one notch only via hysteresis), then can drop
  further. At BBB → operating bonds blocked entirely.
- /treasury portfolio table shows ~4 starting tranches with rates,
  maturities, refi buttons. Inherited tranches are mostly fixed at
  4.10-4.25% — refi-N/A button shown since current market is higher.

**Phase 7 DoD met:**
- ✓ Operating bond issuance with rating caps
- ✓ Per-tranche refinancing with 1.5% fee
- ✓ Dynamic credit rating (recomputes each quarter)
- ✓ /treasury dashboard with portfolio + issuance + refi

**Left for later (clearly tracked in PROGRESS.md):**
- Stacked financing for projects → next commit
- Bond market sentiment events → Phase 7.2
- Restructuring negotiation → Phase 7.2

**Surprises:**
- The rating hysteresis (one notch/quarter) makes the rating feel
  responsive but not punishing. A bad quarter is recoverable; a sustained
  decline still eventually downgrades.
- Operating bonds are genuinely useful for closing deficits without
  trashing the agency. The cap structure forces discipline: you can't
  fund a year of $500M deficits with bonds alone at AA — you'll hit the
  $6B total outstanding cap by year 3.

---

## 2026-05-26 — Phase 6.1: political layer + private cap tightening

**Pre-execute:** Repo owner flagged: (1) private financing caps too
generous → sovereign always wins; (2) ready for next phase. Decided
Phase 6.1 next (gives Insider archetype an active political toolset).

**Done:**
- Tightened all 3 private financing caps across all 4 tiers. Sovereign
  $20B mega → $15B. Pension $15B mega → $10B. Bond market $8B mega →
  $5B. Now only government consortium can fully fund mega projects.
- Added "Insufficient — project needs $XB" warning on offer cards when
  offer.maxAmount < projectCost. Accept button disabled in that case.
- Updated FinancingModal description to show project cost prominently.
- New `Government.actionCooldowns: PoliticalActionCooldowns` field on
  Politics type. Initialized to `{}` in createInitialGameState +
  example.
- New `src/engine/politicalActions.ts` with publicLobby, quietPitch,
  adHocFunding, callInFavor pure functions + executePoliticalAction
  dispatcher + isActionEligible + cooldownQuartersLeft helpers
- Zustand store: `executePoliticalAction(gov, kind)` action with
  autosave
- /political dashboard fully implemented:
  - 3 gov cards (Ottawa red, QP blue, City Hall emerald)
  - Per-action buttons with effect summary + cooldown badge + greyed-out
    state when ineligible
  - Help section explaining each action type
- 18 new tests cover all four actions, cooldowns, eligibility,
  archetype gating, scaling

**Heartbeat:**
- Insider opens campaign with QP trust 65 → callInFavor available from
  Q1 → +$400M cash injection
- Steady Operator at default trust 50 → publicLobby & quietPitch all
  available, adHocFunding requires trust ≥45 (so available with all 3
  govs at start), callInFavor not available
- Lobbying Ottawa puts JUST Ottawa.publicLobby on 4Q cooldown — QP and
  City Hall remain available. Per-gov isolation works.

**Phase 6.1 DoD met:**
- ✓ Lobby actions with per-gov cooldowns
- ✓ Ad-hoc funding requests
- ✓ Insider-only favor mechanic
- ✓ Public approval cost on visible actions
- ✓ /political dashboard rendering all three govs

**Surprises:**
- Cooldown decay required ZERO endTurn changes. Storing absolute
  `expiresAt: QuarterIndex` means the natural quarter advance shifts
  the comparison. Clean.
- The "Insufficient" guard on private financing immediately made the
  Don Mills mega project unbuildable without consortium support.
  Player who can't earn political trust can't build mega. Real strategic
  consequence.
- The Insider archetype's strategic identity finally clicks: massive
  $400M favor at Q1 + ad-hoc funding cycles + private fallback when
  needed. Higher opex/lower engineers feels survivable because of
  the political ATM.

**Left for later phases:**
- Character relationships per gov (cabinet character IDs exist as
  data, no engine logic) → Phase 6.2
- Election campaigns + trust deltas during campaign window → Phase 6.2
- Allowance renegotiation events (Y4/Y8/Y12) → Phase 6.3
- Lobby outcome variance (deterministic +6, +3, etc. now; should roll
  in a range) → Phase 6.2

---

## 2026-05-26 — Phase 4: project initiation + financing flow

**Pre-execute:** Repo owner picked Phase 4 over 3.3 / 6.1 / 7. The
proactive/reactive gameplay loop becomes complete when projects can be
initiated — until now, the OL was the only project and players couldn't
build anything new.

**Done:**
- `src/engine/projectCatalog.ts` with 6 representative projects (P01
  Yonge North, P02 Bloor-Danforth West, P06 Don Mills, P11 Eglinton
  East LRT, P13 Waterfront LRT, P21 Steeles BRT). Each with multiple
  alignments, station options, NIMBY/LVC ratings, flavor blurbs.
- Station quality tiers (basic/standard/premium) with cost + ridership
  multipliers
- `src/engine/projectActions.ts` with proposeProject, acceptFinancing,
  rejectProject, availableProjectCatalog
- Zustand store wired with the 3 new actions; all autosave
- `pct()` constructor added to scalars (existed in type, no constructor)
- `src/ui/dashboards/CapitalProjects.tsx` full implementation:
  - Project cards color-coded by state
  - Per-state stats (proposed/under construction/operating)
  - 2-step initiate modal (catalog list → configure with alignment +
    quality)
  - Financing modal with 4 offer cards (Fed/Prov/City/Consortium)
- 15 new tests covering catalog, propose, accept, reject, financing
  math, consortium-vs-single-gov amounts
- 175 tests total passing

**Phase 4 DoD met:**
- ✓ Project catalog with multiple projects
- ✓ Initiation flow with alignment + quality config
- ✓ Financing approach picker (4 options) with rate/amount/conditions
  per offer
- ✓ Accept → transition to under_construction with debt tranche +
  funding pool
- ✓ Engineer count affects burn (already wired in Phase 3.2 polish)
- ✓ /capital dashboard fully implemented

**Heartbeat:** Pick Technocrat → /capital → "Propose new project" → pick
P11 Eglinton East LRT → pick "partial grade-separation" alignment +
premium quality → estimated $3.15B → "Propose & go to financing" →
4 offers appear (e.g., Federal $5B at 5% with no conditions because
Ottawa trust 55, Consortium $11.5B at 4.5% blended) → accept federal
→ project enters under_construction → debt tranche $3.15B at 5%
created → Ottawa trust +6 → /capital shows project burning at 1.22×
speed (220 engineers / 180 baseline).

**Left for later phases:**
- Studies during proposed (uncertainty narrowing) → Phase 4.2
- LVC slider (revenue after opening) → Phase 4.2
- Cost-overrun events tied to specific projects → Phase 4.2 + 3.3
- Cancellation penalty (currently free) → Phase 4.2
- Full ~30 project catalog → Phase 4.2
- Templates → project cost reduction → Phase 4.2

**Surprises:**
- The financing modal feels great. Seeing all 4 offers side-by-side
  with explicit rate/amount/conditions makes the strategic choice
  immediate. The footer showing trust scores + formula keeps the
  player aware of WHY rates differ.
- Tier sizing actually matters now. P06 Don Mills (mega) at $14B base
  basically requires consortium financing — Federal-only caps at $12B
  for mega tier. Player can't always get all four options.
- The Insider archetype gets the best provincial offers (QP trust 65)
  but Technocrat's engineer count compensates via faster build → real
  archetype divergence on project-building strategy.

**Next steps:** With Phase 4 done, the playable loop is complete (events
+ ops + projects). Remaining: Phase 3.3 (character actors), Phase 6
(political layer + characters), Phase 7 (bond/treasury), Phase 8
(standing orders + polish), Phase 9 (charts), Phase 10 (onboarding).

---

## 2026-05-26 — Phase 3.2 polish (round 2): empty-calorie audit + 6 fixes

**Pre-execute:** Repo owner asked for an empty-calorie audit. Walked
through every defined feature and identified 6 high-priority items where
state/UI exists but no mechanical consequence flows from it.

**Done — 6 empty-calorie fixes:**

1. Public approval now drags ridership when < 30, boosts when ≥ 70.
   `approvalRidershipDrift(approval)` helper; folded into the existing
   reliability-drag line.
2. Engineers count now scales project construction burn rate by
   `engineers/180` clamped [0.5×, 1.5×]. Technocrat builds 1.22×
   faster; Insider 0.78×.
3. OpenBooks=true gets -20bp on floating-rate spreads via the new
   `openBooks` parameter on `effectiveCouponBp` + `quarterlyDebtService`.
4. NIMBY organization predicate added to EventPredicate; EV022 lawsuit
   now requires `nimbyOrganization >= 30`. New `nimbyOrganization`
   effect kind; confrontational event choices grow it, settlement
   reduces it.
5. `driftBocRate(currentBp, roll)` random walk with mean-reversion;
   endTurn applies it via keyed RNG; floating-rate debt service moves
   accordingly.
6. Elections (EV032/33/34) now call `applyElectionOutcome` inside
   firing.ts: trust shifts -12 to +8, 35% party flip chance,
   `nextElectionAt` re-armed.

**Deferred items documented with phase pointers** (Characters → Phase 6,
StandingOrders → Phase 8, projects/FinancingOffer/templates effect →
Phase 4, board components → Phase 8.6, board retirement replacement →
Phase 6.2, allowance controls + renegotiation → Phase 6.3, CEO portrait
→ Phase 6).

**15 new tests in `src/engine/emptyCalories.test.ts`** cover all 6
fixes. 160 tests total.

**Heartbeat sample (seed 1, 30Q):**
- BOC rate drifts: 350 → 348 → 339 → 328 → 326 → 330 → 319bp over 6Q.
  Floating-rate debt service moves quarter-to-quarter.
- Election at Q8 (city) shifts cityHall trust + may flip mayor party.
- NIMBY lawsuit (EV022) doesn't fire because default nimbyOrganization
  is 25 (gated at 30). Would fire after a confrontational event grew
  it above 30.

**Surprises:**
- The approval-drift fix made low approval feel real for the first
  time. Watching ridership bleed after a scandal hits differently than
  just seeing a number tick down.
- Engineers count finally matters. Insider archetype now has TWO
  operational disadvantages (higher opex AND slower projects) which
  the political-cash advantage has to overcome.
- Election-outcome randomness adds genuine campaign-cycle texture even
  before Phase 6.1's full political layer lands.

**Next per playbook order: Phase 3.3** (character actors deliver event
text in their own voice) or **Phase 4** (project initiation flow). 3.3
is narrative polish; 4 is the biggest remaining strategic unlock.

---

## 2026-05-26 — Phase 3.2 polish: telegraph trim + active obligations

**Pre-execute:** Repo owner flagged that:
1. Telegraphs were too frequent — felt like getting a heads-up on
   everything
2. Fare-freeze pledge was empty calories — player could break it freely
   with no cost

Both fair. Engineered both fixes.

**Done:**
- Trimmed telegraphs from 7 → 4 templates (~10% of catalog). Kept only
  on genuinely-predictable scheduled events (elections, minister
  visits, mayor election-cycle pressure, federal budget cycle).
- New `ActiveObligation` type system with `fareFreezePledge` kind
- `GameState.activeObligations: ActiveObligation[]`
- `addObligation` EventEffect variant
- `setFarePolicy` checks obligations + applies costs + consumes pledge
  if broken
- `endTurn` prunes expired obligations
- EV017 pledge choice now creates a real 4Q obligation with costs:
  -20 City Hall trust, -12 public approval, -3 board confidence
- AgencyDashboard:
  - Yellow active-pledge banner showing remaining quarters + cost
  - Fare-policy buttons that would break get amber border + inline red
    "Breaks pledge: ..." text
  - Confirm dialog when clicking a pledge-breaker, showing both
    operating uplift AND political cost side-by-side
- 4 new tests for the pledge mechanic
- 1 new test for telegraph invariant (all telegraphs on scheduled events)
- 145 tests total passing

**Heartbeat:**
- 12 telegraphs over 60Q (was ~20) — about 1 every 5 quarters
- 51 decision events over 60Q ≈ 0.85/Q
- The mayor's fare-freeze pledge now reads as a real commitment in
  the UI. Player who accepts then raises fares sees the full tradeoff
  rendered before the click.

**Surprises:**
- The confirm dialog naturally surfaces the trade-off the user wanted:
  "operating upside vs political cost" rendered together. Player can
  make the informed call.
- The "inform, don't block" principle (P8) feels right. Insider archetype
  players will probably break pledges often; Steady Operator will
  honor them. Both are valid strategy.
- The telegraph trim made the news rail feel less like a constant
  weather forecast and more like meaningful signal.

---

## 2026-05-26 — Phase 3.2: event expansion + telegraphs + informational + Monte Carlo

**Pre-execute:** Confirmed user understands base-case trajectories are
floor numbers; player intervention can deviate dramatically. Answered 3
design questions (telegraphs authored per-event, 4-6 no-good-options
events, balanced catalog mix). User asked what telegraphs were — wrote
a clear explanation, re-asked, and locked authored-per-event approach.

**Done:**
- New `EventDisplayKind` ('decision' | 'informational') + `noGoodOptions`
  flag on EventTemplate
- New ActionLogEntry kinds: `event_telegraph` and `event_informational`
- Firing engine extended:
  - `drainDelayedQueue`: now respects displayKind (informational events
    skip inbox)
  - `emitScheduledTelegraphs`: emits telegraph for scheduled events
    with `currentQ + lead == targetQ`
  - `selectAndFire`: random events with telegraphs now schedule the
    actual fire via delayedQueue instead of firing immediately
  - `telegraphAlreadyEmitted` dedupe check on action log
  - Informational events don't count against MAX_FIRES_PER_QUARTER
- 30 new event templates (39 total):
  - 5 ops crises, 5 political, 4 construction, 4 media,
  - 3 climate, 3 elections (informational), 2 character/internal,
  - 2 financial, 1 accessibility (no-good-options)
- 6 events with `noGoodOptions: true` flag
- 6+ events with `telegraph` field
- 4 informational events (3 elections + BOC rate decision)
- News rail updated: color-coded by kind, outlet badge, body excerpt
  for telegraphs and informationals
- Monte Carlo time-jump:
  - `forecastRange(quartersAhead, runs=12)` returns per-quarter ranges
  - Perturbed masterSeed per run (prime offset)
  - `TimeJumpPreview` shows median + min-max bands + game-over
    probability % per quarter
- 7 new event tests + adjustments to existing tests
- 141 tests total passing

**Phase 3.2 DoD met:**
- ✓ 30 new templates → 40 total in catalog
- ✓ Telegraph system implemented + authored on ~10 templates
- ✓ Hard tradeoffs across multiple axes (every choice has multi-axis effects)
- ✓ 6 no-good-options events
- ✓ Informational event kind
- ✓ Monte Carlo time-jump preview

**Heartbeat (seed 1, 60Q auto-resolve):**
- Q4 telegraph "Mayor likely to campaign on transit-fare stability" → Q6 inbox event
- Q6 telegraph "Climate Bank signals transit-resilience funding" → Q9 inbox event
- Q9 telegraph "Star reporters asking around about backlog" → later EV026
- Q10 telegraph "Federal election campaign begins" → Q12 informational
- Q11 informational "Board member retires"
- 83 event-related log entries over 60Q (vs 31 in Phase 3.1)

**Left for later phases:**
- Conditional events don't get telegraphs (by design; revisit if
  playtests show otherwise)
- Election informationals fire but don't actually flip parties → 6.1
- BOC rate informationals don't shift floating-rate debt → 7
- Board retirements informational but no replacement flow → 6.2

**Surprises:**
- Authored telegraphs feel right. Mayor's election-cycle pressure
  appearing 2Q early gives the player time to either capitulate or
  build a counter-narrative. Real strategic surface.
- The Monte Carlo time-jump quietly answers "should I worry about random
  events" — wide cash bands tell you yes. Single number was always
  misleading.
- Some random events firing only via telegraph + delayed-fire (instead
  of immediate fire) reduced inbox spam significantly. Good emergent
  pacing.

---

## 2026-05-26 — Phase 5.1 (detour): operations dashboards + proactive levers

**Pre-execute:** Reviewed Phase 3.1 honestly — player still 100% reactive.
Recommended detouring from playbook order (3.2 next) to Phase 5.1 so
events feel like responses to operational decisions rather than
background noise. Repo owner agreed. Full ops scope picked + opex
divergence + informational events for 3.2 later.

**Done:**
- New `src/engine/policies.ts` with constants: fare price multipliers,
  per-agency elasticity, frequency multipliers (opex + ridership),
  archetype opex multipliers, archetype maintenance efficiency.
- New `src/engine/agencyActions.ts` with pure functions:
  `setMaintenanceBudget`, `setFarePolicy`, `setFrequencyPolicy` plus
  `forecastFarePolicy` / `forecastFrequencyPolicy` for UI previews.
- `createInitialGameState` applies archetype opex multiplier to
  per-agency starting opex.
- `decaySubsystems` takes archetype, applies maintenance efficiency
  via scaled ratio in tier lookup. `maintenanceTier` helper exported.
- `endTurn` passes archetype through to decay call.
- Zustand store: 3 new actions (setMaintenanceBudget, setFarePolicy,
  setFrequencyPolicy), each autosaves on apply.
- New `AgencyDashboard` component — used by TTC / GO / UP routes
  (replacing the stubs). Shows summary + subsystem table with sliders
  + fare + frequency policy cards with inline forecasts.
- 20 new tests in `src/engine/agencyActions.test.ts`.
- 131 tests total passing.

**Heartbeat — archetype divergence over 12 quarters:**
- Steady: $1000M → $-605M, reliability 68 (flat)
- Technocrat: $1100M → $-157M (best), reliability 72 (rising)
- Insider: $1200M → $-753M (worst despite +$200M start), reliability 58
- Coalition: $1000M → $-821M, reliability 60.6

Insider's apparent +$200M starting advantage is wiped out by Q12 due to
higher opex + lower maintenance efficiency. The archetype is now
operationally fragile in a real, measurable way.

**Phase 5.1 DoD met:**
- ✓ Per-subsystem maintenance sliders (11 across 3 agencies)
- ✓ Fare policy per agency with elasticity-driven ridership response
- ✓ Frequency policy per agency with opex + ridership effects
- ✓ Archetype opex divergence wired
- ✓ Archetype maintenance efficiency wired
- ✓ Inline forecasts on policy cards

**Left for later phases:**
- Catchment growth reactive to maintenance/security investment → 5.2+
- Per-agency security / cleanliness / accessibility sliders → 5.2
- Events that respond to operational decisions ("Star: frequency cut
  triggers commuter backlash") → 3.2
- Permanent opex changes triggered by events compound on top of
  archetype baseline (current behavior, but Phase 3.2 needs to verify
  cleanly)
- Time-jump preview should account for current policy (it does via
  pure `endTurn`, so this works)

**Surprises:**
- The Insider trajectory is a stark cautionary tale once divergence
  is wired. Starting at $1.2B feels like a luxury but the operational
  drag eats it in 12 quarters. Real strategy emerges.
- Tier system works cleanly even with the efficiency multiplier — the
  player can SEE that they're underspending without needing the engine
  to alert them.
- Inline forecasts on the policy cards make the tradeoff vivid. "+10%
  fare = -3.5% riders, +6.15% revenue" lets the player make the call
  with full information.

---

## 2026-05-26 — Phase 3.1: event system foundation

**Pre-execute audit:** Reviewed Phase 2.2 archetypes honestly. Found that
8 modifiers diverge per archetype but only 3 (cash, board, subsystem)
mechanically affect gameplay yet — trust scores, public approval,
engineers, templates, openBooks are dead until events consume them.
Phase 3.1 deliberately wires events to gate on these "dead" variables so
the archetype choice matters mid-campaign, not just at Q1.

**Done:**
- Asked 4 questions (frequency, branch depth, voice, archetype branches).
  Repo owner picked ~1/Q steady, hard tradeoffs, newsroom voice,
  archetype-flavored options.
- Extended `src/types/events.ts` with EventPredicate (14 kinds incl.
  and/or/not composition), 12-variant EventEffect, EventTrigger union,
  EventChoice.requires gating, DelayedConsequence payload union.
- New `src/engine/events/`:
  - `predicates.ts` — pure evaluator for all 14 predicate kinds
  - `effects.ts` — pure applier with clamping + delayed-queue handling
  - `templates.ts` — 10-event registry (newsroom voice, multi-axis
    tradeoffs, archetype-flavored branches on EV001/EV002/EV003/EV009)
  - `firing.ts` — engine: drain queue, eligible-by-trigger, cap at 2/Q,
    sort scheduled-first, keyed RNG for random rolls
- Wired into `endTurn`: events process AFTER quarter summary, before
  game-over check (skipped if campaign ended)
- New UI:
  - `EventModal` — outlet badge, headline, body, choices with effect
    chips colored by sign/axis, "Decide later" allowed
  - Updated `Inbox` — sorted by urgency, red tint on ≥70, click → modal
- `applyEventChoice` action added to Zustand store; autosaves on apply
- Harness `autoResolveInbox` added so density measurement is meaningful
- 26 new tests in `src/engine/events/events.test.ts`
- 111 tests passing total

**Phase 3.1 DoD met:**
- ✓ Event template registry (10 templates, lookup by id)
- ✓ Firing engine handles scheduled / conditional / random
- ✓ Event inbox UI with response handler modal
- ✓ Delayed consequences queue with drain + queueDelayedEffect/Event
- ✓ First 10 events implemented as working test cases

**Heartbeat observation:** with seed 1, 60-quarter auto-resolve harness
runs produce ~31 events. Emergent storytelling works — Ontario Line
opening at Q20 causes TTC ridership to cross 4.6M which triggers
EV003 (mayor crowding) at Q21. Cash bleed triggers EV004 (fare evasion
crackdown) around Q5 when cash drops below $500M. The engine reads
state and the world reacts.

**Left for later phases:**
- 30 more event templates → Phase 3.2 (telegraph signals + delayed
  consequences narrative)
- Real character voices on events (currently events have outlets, not
  actors) → Phase 6 (characters + relationships)
- Standing orders auto-handle routine events → Phase 8 (decision
  density management)
- Onboarding briefing showing player which archetype affects what →
  Phase 10 polish

**Surprises:**
- The keyed-RNG pattern paid off immediately. Adding new event
  templates doesn't shift the random rolls of existing ones, so the
  catalog can grow without breaking save/load determinism.
- "Decide later" is the right default. Forcing a choice would have been
  hostile; letting events accumulate creates natural pressure to clear
  the inbox without the engine policing the player.
- Mayor crowding event tripping right after Ontario Line opens was an
  unplanned cause-effect. The system is starting to author its own
  stories.

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
