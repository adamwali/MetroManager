# Decisions

Architectural decisions, one entry per item, newest at the top. Add an entry
whenever a non-obvious choice is made.

---

## 2026-05-26 — Phase 8.1: standing orders + quarter recap

Player can now create rules that auto-resolve routine decisions, freeing
attention for the events that actually need judgment. Mission Control
gets an inline "what just changed" recap panel.

**5 standing-order rule types per repo-owner decision:**

| Rule | Trigger | Action |
|---|---|---|
| `autoApproveMaintenanceBelow` | Subsystem budget < $X | Bump to required tier |
| `autoTriageInboxBelowUrgency` | Event urgency < N | Auto-resolve with first visible branch |
| `autoLobbyOnTrustDrop` | Gov trust < threshold | Run chosen lobby action (subject to cooldown) |
| `autoIssueOperatingBondsBelowCash` | Cash < $X | Issue $Y operating bond from chosen creditor |
| `autoResolveEvent` | Inbox contains template id | Pick chosen branch |

Each rule is on/off-toggleable + removable. Engine applies all enabled
rules in order at endTurn (after event firing, before quarter_summary
composes — so auto-actions are reflected in that quarter's recap).

**Engine (`src/engine/standingOrderActions.ts`):**
- `applyStandingOrders(state)` → iterates rules, returns updated state
- Each rule type has its own handler
- Auto-actions emit `player_action` log entries with
  `cause: { kind: 'system', system: 'standingOrder' }` so the trace UI
  (Phase 8.6) can identify them
- CRUD helpers: `addStandingOrder`, `removeStandingOrder`,
  `toggleStandingOrder`, `updateStandingOrder`

**Wired into endTurn**: standing orders apply AFTER events fire. So if
EV001 signal failure lands in inbox AND a `autoTriageInboxBelowUrgency`
rule exists with min 90 and the event has urgency 80 — the order
auto-resolves it before the player sees it.

**Order of operations per endTurn:**
1. Quarter advance
2. Debt service / BOC drift / rating recompute
3. Cash flow tick (allowance + fare in, opex/maint/debt service out)
4. Subsystem decay
5. Ridership shifts
6. Project ticks (construction draws, transitions, ramp)
7. Quarter summary log entry composed
8. Game-over check (early return if triggered)
9. Event firing + telegraph emit
10. **Standing orders apply** ← Phase 8.1

**Quarter recap component (`QuarterRecap.tsx`):**

Inline on Mission Control. Reads the most recent `quarter_summary` entry
and surfaces:
- Top 5 changes ranked by absolute impact (cash flow, ridership, project
  transitions, refi events)
- All player_decision + player_action entries from that quarter
- Tone-colored deltas (red negative, emerald positive, neutral gray)

Standing-order auto-actions appear in the "Decisions + automations"
section labeled `[Standing order]` so the player sees exactly what was
automated.

**UI (`StandingOrdersPanel.tsx`):**
- Lives on Mission Control's right rail above the news rail
- Toggle/remove buttons per rule
- "+ Add rule" expands a form with rule-kind-specific inputs:
  - Threshold sliders/inputs for maintenance + cash + trust + urgency
  - Gov + action selects for lobby rules
  - Creditor + amount selects for bond rules
  - Event template id + choice id text inputs for resolve rules

**Trace UI (Phase 8.6) deferred** — repo owner unsure on placement.
Options listed in next session's question set:
- Drawer-on-KPI-click (proposed, most contextual)
- Dedicated /trace timeline page
- Right-click "why?" context menu

**14 new tests** cover:
- Each rule type's trigger + action
- Disabled rules are skipped
- endTurn integration logs auto-actions with `cause.system='standingOrder'`
- CRUD helpers (add/remove/toggle)

**238 tests passing total.** Bundle 464KB JS / 139KB gzip (+13KB for
standing orders + recap).

**Strategic implications:**
- Player can set "auto-issue $500M pension bond when cash < $0" to
  ensure they never hit fiscal failure trigger
- Insider sets "auto-lobby Ottawa with quietPitch when trust < 50" to
  passively maintain the political ATM
- Coalition Builder sets the same on all three govs
- Auto-resolve-event lets player set "always lean-in on Crosslinx
  construction inflation" without seeing the event each time

**Risk of automation**: rules don't have variance, so the same rule
firing the same way every quarter can create monotonous outcomes. Phase
8.6 trace UI will help players debug "why did my agency die?" by walking
back through auto-actions.

---

## 2026-05-26 — Phase 7: Treasury (operating bonds + refi + dynamic rating)

Treasury dashboard shipped with three new mechanics: operating bond
issuance with rating-gated caps, per-tranche refinancing, and dynamic
credit rating that recomputes each quarter.

**Dynamic credit rating (`src/engine/rating.ts`):**

Computed each `endTurn` from three metrics:
- Cash position (in $M)
- Debt service ratio (quarterly service / quarterly fare+allowance revenue)
- Board confidence (0-100)

Tier thresholds (all three must be met to qualify):
| Rating | Min cash | Max DSR | Min board |
|---|---|---|---|
| AAA | $5,000M | 5% | 70 |
| AA | -$500M | 10% | 50 |
| A | -$2,000M | 15% | 35 |
| BBB | -$4,000M | 20% | 25 |
| BB | -$6,000M | 30% | 0 |
| B | (any) | (any) | (any) |

**Hysteresis**: rating drifts ONE notch per quarter toward target.
Prevents whiplash. A bad quarter can't tank AA → BB in one tick.

**Operating bond issuance (`src/engine/treasuryActions.ts`):**

Rate computation per creditor:
- BOC + rating spread + creditor premium + 75bp operating risk premium
- OpenBooks=true: -20bp discount (Phase 3.2 polish reused)

Creditor premiums (over BOC + rating spread):
- pension: +60bp · institutional: +80bp · retail: +130bp · foreign: +40bp

At AA + openBooks + BOC 350:
- pension operating bond: 350 + 90 + 60 + 75 - 20 = **5.55%**
- foreign operating bond: 350 + 90 + 40 + 75 - 20 = **5.35%** (cheapest)

Rating-gated caps:
- AAA: $3B/Q, $10B outstanding
- AA: $2B/Q, $6B outstanding
- A: $1B/Q, $3B outstanding
- BBB and below: **blocked**

Operating tranches prefixed `t_op_` for cap tracking.

**Refinancing (`refinanceTranche`):**

- 1.5% of principal upfront fee paid from cash
- Replaces tranche with new fixed-rate at current market
- UI shows quote inline: old rate vs new rate, fee, savings per year,
  break-even quarters
- "Refi N/A" button disabled if (a) new rate ≥ old rate, or (b) break-
  even quarters > remaining maturity

**Treasury dashboard (`/treasury`):**

- Summary cards: total debt, service per Q, weighted rate, credit rating
  (color-coded chip — emerald AAA, blue AA, sky A, amber BBB, orange BB,
  red B)
- Operating bond issuance form: creditor select + amount input + live
  quote (effective rate, cap remaining), "Issue bond" button
- Debt portfolio table: each tranche with id, creditor, principal, rate,
  service, maturity, refi button with tooltip showing the refi math

**Strategic implications:**
- Technocrat (openBooks=true) gets cheaper bonds — 20bp on every new
  issuance. Compounds over a campaign with multiple tranches.
- Insider can't be saved by bonds if board confidence crashes — rating
  drops to BBB blocks operating-bond access. The political ATM has limits.
- Steady Operator at AA can issue $2B/Q to cover crunches. Disciplined
  bond use lets you weather 4-6 deficit quarters without firing.
- Refi becomes interesting when BOC drops below issuance rate. At BOC
  350, a fixed tranche at 4.25% has no refi benefit. At BOC 200, that
  tranche refis to ~3.5% — meaningful savings.

**Engine wiring:**
- `endTurn` now calls `nextRatingFor` after debt-maturity + BOC drift.
  Rating is updated on `state.debt.rating` before debt service is
  computed for that quarter.
- Quarterly debt service automatically reflects current rating via the
  existing `effectiveCouponBp` (fixed tranches keep their coupon;
  floating tranches use current BOC + spread; openBooks discount applies).

**18 new tests:**
- ratingFromMetrics threshold table
- driftRating one-notch movement
- endTurn drift across multi-quarter deficit
- operating bond quote (rate, caps, blocking)
- issuance adds cash + creates tranche
- BBB blocks issuance, per-quarter cap enforced
- foreign cheapest, retail most expensive
- openBooks -20bp on new issuance
- refi quote (fee 1.5%, savings, break-even)
- refi execution + blocking on insufficient cash
- log entries created

**218 tests passing total.** Bundle 446KB JS / 135KB gzip (was 433/132;
+13KB for treasury layer).

**Deferred to future phases:**
- Stacked financing (assemble project package from multiple offers) —
  Phase 4 follow-up, next!
- Bond market sentiment shifts (event-driven rate changes) → Phase 7.2
- Restructuring negotiation (defer maturity for fee) → Phase 7.2
- Rating change events ("S&P upgrades to AAA" informational) → Phase 7.2

---

## 2026-05-26 — Phase 6.1: political layer (lobby + ad-hoc + favor) + private cap tightening

Repo owner flagged that private financing caps were too generous —
sovereign at $20B mega meant private alone could fund nearly anything,
removing the strategic pressure to build government consortium support.
Also: time to ship Phase 6.1 (political layer) so the Insider archetype's
trust advantage becomes an active lever rather than passive starting bonus.

**Private financing caps tightened:**
| Tier | Pension was→now | Bond market was→now | Sovereign was→now |
|---|---|---|---|
| Small | 1.0→0.7B | 0.5→0.4B | 1.5→1.0B |
| Medium | 3.0→2.0B | 1.5→1.0B | 4.0→3.0B |
| Large | 7.0→5.0B | 4.0→2.5B | 10.0→8.0B |
| Mega | 15.0→10.0B | 8.0→5.0B | 20.0→15.0B |

Government consortium (sum of three) still maxes ~$29B at mega, so big
projects genuinely require political support to fully fund. Sovereign
wealth's $15B mega cap is now below most mega-project costs — useful
fallback, not always-win.

**"Insufficient" UI guard** on offer cards: when offer.maxAmount <
projectCost, the card greys out, shows "Insufficient — project needs $XB.
Pick a larger source or consortium." Accept button disabled. Player
can't accidentally underfund a project.

**Phase 6.1: political actions** — four kinds, per-government cooldowns:

| Action | Effect | Cooldown | Eligibility |
|---|---|---|---|
| Public lobby | +6 trust · -5 public approval | 4Q | Always |
| Quiet pitch | +3 trust · no public optics | 3Q | trust ≥40 or Insider |
| Ad-hoc funding | +$100-250M cash (scales w/ trust) · -8 trust | 8Q | trust ≥45 |
| Call in favor | +$400M cash · +5 trust | 16Q | Insider + trust ≥60 |

**Type additions:**
- `PoliticalActionKind` discriminated union
- `PoliticalActionCooldowns: Partial<Record<PoliticalActionKind, QuarterIndex>>`
- `Government.actionCooldowns` field

**Engine (`src/engine/politicalActions.ts`):**
- Pure action functions: `publicLobby`, `quietPitch`, `adHocFunding`,
  `callInFavor`
- `executePoliticalAction(state, gov, kind)` dispatcher
- `isActionEligible(state, gov, kind)` — checks cooldown + predicate
- `cooldownQuartersLeft(state, gov, kind)` — returns 0 if available

**Cooldown decay**: automatic, no endTurn change needed. Stored as
absolute `expiresAt: QuarterIndex`; as `state.quarter` advances, the
comparison naturally shows shorter remaining cooldown.

**UI (`/political` route):**
- Three government cards (Ottawa / Queen's Park / City Hall), each
  showing trust + party + next election + 4 action buttons
- Per-action cards: label, description, effect summary, cooldown badge
  when on cooldown ("3Q cooldown"), grey + cursor-not-allowed when
  ineligible
- Help section at bottom explaining each action type
- Color-coded by gov (red Ottawa, blue QP, emerald City Hall)

**Strategic implications:**
- **Insider** plays this dashboard. Call-in-favor at QP (trust 65) is
  available from Q1. $400M cash injection lets Insider survive their
  higher opex.
- **Coalition Builder** cycles publicLobby across all three govs every
  ~12Q to keep all three at 60+.
- **Technocrat** has low City Hall trust (40) — quietPitch unavailable
  on cityHall (trust threshold 40 met) but adHocFunding blocked
  (needs 45). Has to publicLobby cityHall first to access better
  actions, eating public approval.
- **Steady Operator** runs balanced playbook, no signature move.

**Public approval as gating: low approval can't lobby aggressively
without further losses.** With approval < 30 already dragging
ridership (-0.3%/Q from Phase 3.2), back-to-back public lobbies could
push approval into spiral territory.

**18 new tests:**
- All four actions: effects, cooldowns, eligibility predicates
- Cooldown decay across turns (4 endTurns → publicLobby available again)
- Per-gov cooldown isolation (lobbying Ottawa doesn't affect QP)
- Archetype gating (Insider-only favor, Steady can't)
- adHocFunding cash scales with trust
- Dispatcher correctness

**200 tests passing total.** Bundle 433KB JS / 132KB gzip (was 424/130;
added ~9KB for political actions + dashboard).

**Still deferred to later phases:**
- Character relationships per Government (cabinet/opposition IDs exist,
  no engine logic) → Phase 6.2
- Election campaigns + party trust effects → Phase 6.2
- Operating-allowance renegotiation events → Phase 6.3
- Lobby outcome variance (not always +6, sometimes +3 or +9) → Phase 6.2

---

## 2026-05-26 — Phase 4 polish: private financing (pension / bond market / sovereign)

Repo owner flagged that the design doc §5 promises private financing as a
fallback when government offers aren't enough — pension funds, bond market,
sovereign wealth. Added per spec.

**3 new financing approaches** alongside the 4 government options:

| Approach | Rate | Appetite (mega) | Conditions / optics |
|---|---|---|---|
| Pension consortium | 5.50% (flat) | $15B | None — patient capital, no political strings |
| Bond market | 4.90% (flat) | $8B | None — market rate, requires AA rating implied |
| Sovereign wealth | 5.30% (flat) | $20B | -8 City Hall trust, -5 public approval, -2 board on accept |

Per-tier appetite scales: small/medium/large/mega.

**Rate independence:** Private rates are flat — they don't move with trust
scores. The whole point is that private capital doesn't care about your
political relationships. Insider (high QP trust) and Technocrat (low City
Hall trust) get identical private offers.

**Sovereign wealth political optics:** Accepting carries an `onAcceptEffects`
payload that fires when you confirm the offer. Cost: -8 City Hall trust, -5
public approval, -2 board confidence. Surfaced in the offer card as a red
warning banner BEFORE the player clicks. Insider can absorb the hit;
Coalition Builder typically can't afford it.

**Type additions:**
- `FinancingApproach` extended with 'pensionConsortium' | 'bondMarket' |
  'sovereignWealth'
- `FinancingSource` discriminator union ('government' | 'private') with
  `FINANCING_APPROACH_SOURCE` map for UI sectioning
- `FinancingOffer.onAcceptEffects?: FinancingOfferEffect[]` — narrow alias
  type so projects.ts doesn't have to import the full EventEffect union
- `FinancingOffer.opticsLabel?: string` for UI warning text
- `DebtTranche.creditor` now uses the right `CreditorType` value per
  approach: 'pension' for pension, 'foreign' for sovereign, 'institutional'
  for everything else

**Engine wiring:**
- `generateFinancingOffers` now returns 7 offers (4 gov + 3 private)
- `acceptFinancing` applies `onAcceptEffects` after creating the tranche
- Creditor type mapping per approach

**UI:**
- Financing modal split into two sections: "Government financing"
  (4 cards) and "Private financing" (3 cards)
- Each offer card now shows a subtitle (e.g., "OMERS / OTPP / CDPQ-style
  patient capital", "Foreign SWF — political optics apply")
- Sovereign wealth card gets amber border + red warning banner with
  optics cost laid out in plain language
- Accept button is red on sovereign wealth (vs blue elsewhere) to signal
  the political weight

**Strategic implications:**
- Mega projects (P06 Don Mills, future expansions): government offers
  may cap below project cost; player MUST use consortium or sovereign
  wealth or pension
- Low-trust archetypes: private financing is the way out when no gov
  will lend at decent rates
- Coalition Builder: government consortium is naturally strongest;
  private a fallback
- Insider: can game the politics for gov offers, but sovereign optics
  hurt less because Insider's City Hall is already low (40 → 32)
- Technocrat: openBooks 20bp discount applies to NEW debt tranches too
  (existing finance.ts logic). Bond market financing benefits.

**7 new tests:**
- 3 private offers exist (pension/bond/sovereign)
- Private rates independent of trust
- Sovereign wealth has onAcceptEffects + opticsLabel
- Accepting sovereign applies optics cost
- Accepting pension does NOT
- Creditor types correct (pension → 'pension', sovereign → 'foreign')

**182 tests total passing.** Bundle 424KB JS / 130KB gzip (+3KB for the
private financing layer).

---

## 2026-05-26 — Phase 4: project initiation + financing flow

The proactive/reactive loop is complete. Player can now propose new
projects from a catalog, configure alignment + station quality, get
4 financing offers tied to current trust scores, and accept one to
break ground.

**Project catalog** (`src/engine/projectCatalog.ts`) — 6 representative
projects spanning tiers and modes:
- P01 Yonge North extension (large subway, 2 alignments — direct vs
  Bayview, 8-9.5 km, ~$7B base)
- P02 Bloor-Danforth West (medium subway, full vs partially-elevated
  alignments, 5.5 km, ~$3.2B)
- P06 Don Mills subway (mega subway, 18 km, ~$14B, consortium-style
  build)
- P11 Eglinton East LRT (medium LRT, surface vs partial grade-separated,
  ~$1.8B)
- P13 Waterfront LRT (small LRT, 4.5 km, ~$0.85B, high LVC potential)
- P21 Steeles BRT (small BRT, 26 km cross-city, ~$0.6B, fast delivery)

Each catalog entry carries: tier, mode, base cost, build duration,
starting political support per gov, list of alignments (with km,
stations, ridership at full + opening, cost multiplier, NIMBY impact,
LVC potential), and a flavor blurb. Phase 4.2 can add more projects.

**Station quality tiers** modify cost + ridership:
- basic: ×0.85 cost, ×0.95 ridership
- standard: baseline
- premium: ×1.25 cost, ×1.05 ridership

**Player flow (3 steps):**
1. /capital → "Propose new project" button → catalog list
2. Pick a project → configure modal: alignment + station quality (with
   live cost estimate)
3. Confirm → project enters `proposed` state → financing modal opens
4. 4 offers shown: Federal / Provincial / Municipal / Consortium
   - Each has amount cap (varies by tier + funder), rate (computed from
     trust scores via existing `rateForTrust`), and any conditions
5. Accept one → project transitions to `under_construction`, new debt
   tranche created, starting political-support deltas applied to trust

**Engine actions** (`src/engine/projectActions.ts`):
- `proposeProject(state, catalogId, alignmentId, quality)` → proposed state
- `getFinancingOffersForProject(state, catalogId)` → 4 offers
- `acceptFinancing(state, catalogId, approach)` → creates tranche,
  transitions to under_construction
- `rejectProject(state, catalogId)` → removes proposed project (only;
  can't cancel under_construction)
- `availableProjectCatalog(state)` → catalog minus already-active projects

**Financing offer math reused from Phase 1.2:**
- Base rate 5%, ±0.06%/trust-point per gov (clamped 1-12%)
- Per-gov funding appetite scales by tier (small/medium/large/mega)
- Consortium = sum of three appetites, weighted-average rate

**Engine wiring:**
- Existing `tickConstructingProject` automatically applies engineer-count
  scaling to burn rate (Phase 3.2 polish) — Technocrat projects build
  1.22× faster
- Existing project burn drains from `remainingFunding` pool, not cash
  (Phase 1.2 design)
- 2Q minimum study buffer between proposed and break-ground (constant
  `PROPOSED_STUDY_BUFFER_QUARTERS`)
- Accepting financing immediately transitions to under_construction
  (skips the 2Q wait — Phase 4.2 can reintroduce the wait as actual
  study mechanic)

**UI (`src/ui/dashboards/CapitalProjects.tsx`):**
- Project cards color-coded by state (amber=proposed, blue=under
  construction, emerald=operating)
- Per-state stats panel:
  - Proposed: initiated quarter + alignment + quality + earliest
    break-ground; "Choose financing" + "Cancel" buttons
  - Under construction: total budget, spent, remaining funding,
    forecast open quarter
  - Operating: opened quarter, current daily riders, final cost
- Initiate modal: 2-step (catalog list → configure modal with alignment
  selector + station quality buttons + live cost estimate)
- Financing modal: 4 offer cards side-by-side, each showing amount cap,
  rate %, conditions, with "Accept this offer" CTA. Trust scores +
  formula shown in footer for transparency.

**Tests** (`src/engine/projectActions.test.ts`, 15 cases):
- Catalog ≥ 6 projects, all have ≥1 alignment
- availableProjectCatalog excludes Ontario Line at start
- proposeProject adds to state, locks config, ignores unknown ids
- acceptFinancing transitions state, creates tranche, sets funding pool
  to financed amount, applies political support
- consortium gives strictly larger funding than single-gov
- rejectProject removes proposed, can't remove under_construction
- catalogEntry lookup

**175 tests total passing.** Bundle 421KB JS / 129KB gzip (was 401/124).

**What's still deferred to later phases:**
- Studies during proposed state (narrow cost/demand uncertainty bands)
  → Phase 4.2
- LVC slider during proposed (revenue stream after opening) → Phase 4.2
- Project events that interact with active projects (cost overruns,
  schedule slips, NIMBY lawsuits with proper alignment-based triggers)
  → Phase 4.2 + 3.3
- Cancellation cost (currently zero) → Phase 4.2
- Larger catalog (full ~30 projects from docs/02-) → Phase 4.2
- `templates` engineVar → project cost reduction → Phase 4.2

---

## 2026-05-26 — Phase 3.2 polish (round 2): kill empty-calorie features

Repo-owner asked for an honest audit of empty-calorie features —
state/UI/types that exist but don't actually affect gameplay. Found 6
high-priority items and fixed all of them. The deferred items are
documented as such with explicit phase pointers.

**1. Public approval → ridership drift.**
- Was: moved by ~10 events, showed in KPI strip, did literally nothing else.
- Now: < 30 approval drags ridership -0.3%/Q across all agencies; ≥ 70
  boosts +0.1%/Q. Player who lets approval crash watches ridership
  bleed; player who builds approval gets organic growth assist.
- Folded into the `reliabilityRidershipDrag` line in quarter_summary
  breakdown so the trace shows the contribution.

**2. Engineers count → project burn rate.**
- Was: gated 1 event (EV036 engineer poached), did nothing else.
- Now: project construction speed scales by `engineers / 180`, clamped
  [0.5×, 1.5×]. Technocrat at 220 engineers burns 1.22× faster (~3Q
  earlier on a 16Q project). Insider at 140 burns 0.78× (3Q later).
- `tickConstructingProject(p, currentQ, engineers)` and `tickProject`
  both take engineers count; threaded through endTurn.
- Real archetype divergence on project velocity. Phase 4 (project
  initiation) will benefit immediately.

**3. OpenBooks flag → -20bp on floating-rate spreads.**
- Was: gated 2 event branches (EV005 climate, EV007 renegotiation),
  did nothing else.
- Now: `effectiveCouponBp(tranche, bocRate, openBooks)` reduces floating
  spreads by 20bp when openBooks=true. Technocrat (starts with openBooks
  = true) saves ~$5M/Q on debt service vs Steady. Real bond benefit.

**4. NIMBY organization → EV022 lawsuit gate + grows on confrontation.**
- Was: engineVar existed, never read by anything. Default 25; never moved.
- Now: EV022 NIMBY lawsuit only fires when nimbyOrganization ≥ 30.
  Confrontational event choices grow it (+15 on "vocal minority"
  framing of EV022, +10 on fighting heritage designation). Settlement
  branches reduce it (-10 on EV022 settle-with-concessions).
- New `nimbyOrganization` predicate kind in EventPredicate union.
- New `nimbyOrganization` effect kind in EventEffect union.

**5. BOC policy rate → drifts each quarter via keyed RNG.**
- Was: stuck at 350bp forever; floating-rate debt was effectively
  fixed. EV039 informational was vapor.
- Now: `driftBocRate(currentBp, roll)` applies a random walk per
  quarter: ±15bp stochastic + 2% mean-reversion pull toward 350bp.
  Bounded [100, 700] bp. Keyed RNG → deterministic per seed.
- 8Q drift visible in harness: 350 → 348 → 339 → 328 → 326 → 330 → 319.
  Floating-rate debt service moves with it.

**6. Elections → trust shifts + party flips.**
- Was: EV032/33/34 fired as pure informationals; party + trust never
  changed. Election day was theatre.
- Now: when an election informational fires, `applyElectionOutcome`:
  - Shifts the corresponding gov's trust by [-12, +8] via keyed RNG
    (slight negative bias — elections shake trust regardless of winner)
  - 35% chance to flip `partyInPower` (between liberal / conservative
    / other)
  - Re-arms `nextElectionAt` 8Q out (Phase 6.1 will deepen this)
- Same gov + same seed = same outcome (deterministic across replays).

**Tier 2 fixes — explicitly deferred to specific phases:**
- `Characters: {}` → Phase 6 (characters + dialogue + tolerance)
- `StandingOrders: []` → Phase 8 (auto-handlers + decision density)
- `proposed` state, `FinancingOffer`, `LvcConfig` → Phase 4 (project
  initiation)
- `templates` → project cost reduction → Phase 4
- Board `recentComponents`, `warningActive` → Phase 8.6 (why-did-this-
  happen trace UI)
- CEO `portraitId` → Phase 6
- `OperatingAllowance.controls` → Phase 6.3 (renegotiation)
- `nextRenegotiationAt` per gov → Phase 6.3
- EV037 board retires (no replacement flow) → Phase 6.2

**15 new tests** cover the 6 fixes:
- approval drift bands + 8Q ridership comparison
- engineers project burn comparison (Technocrat vs Insider)
- openBooks tranche discount + total debt service comparison
- NIMBY EV022 gating + effect application
- BOC rate bounds + mean-reversion + endTurn moves it
- Election trust shifts + nextElection re-arm + party flip across seeds

**160 tests total passing.** Bundle 401KB JS / 124KB gzip.

---

## 2026-05-26 — Phase 3.2 polish: telegraph trim + active obligations

Two issues from repo-owner review of the 3.2 ship:

**1. Too many telegraphs.** Trimmed from 7 templates → 4 (~10% of
catalog). Only events that real CEOs genuinely see coming get
telegraphs:
- EV017 mayor fare-freeze pressure (election cycle, predictable)
- EV018 federal minister visit (planned tour, scheduled in advance)
- EV029 climate adaptation funding (federal budget cycle)
- EV032 federal election (scheduled)

Removed telegraphs from:
- EV016 premier pet project (opportunistic, should surprise)
- EV021 OL design flaw (engineering crises blow up suddenly)
- EV026 whistleblower leak (kept it but trimmed for balance)

Heartbeat: 12 telegraphs over 60Q (down from ~20). One every ~5
quarters. Telegraphs now feel like signal, not noise.

New invariant test: every telegraphed template MUST be scheduled
(can't telegraph a conditional or random event going forward — they're
sudden by nature).

**2. Fare-freeze pledge was empty calories.** If you accepted "no fare
hike for 4Q" pledge, then went to /ttc and raised fares, nothing
happened. The pledge needed to be a real constraint with visible cost.

**Active obligations system:**
- New type `ActiveObligation` with discriminated union (currently just
  `fareFreezePledge` kind; more kinds in future phases)
- `GameState.activeObligations: ActiveObligation[]`
- New `EventEffect` variant: `addObligation` creates a pledge
- New helper `fareFreezeObligationBroken(state, agencyId, newPolicy)`
  returns the obligation that would break (or undefined)
- `setFarePolicy` checks for active pledge; if raising fares would
  break: applies `costOfBreaking` effects immediately + removes the
  pledge from `activeObligations`
- `endTurn` prunes expired obligations each quarter (expiresAt ≤ next)

**EV017 updated:**
- "Public no-fare-hike pledge" choice now adds a real `fareFreezePledge`
  obligation lasting 4Q
- Cost of breaking: -20 City Hall trust, -12 public approval, -3 board
  confidence
- Tradeoff text now reads: "fare-hike pledge active 4Q (TTC dashboard
  will warn if you break it)"

**UI:**
- AgencyDashboard surfaces a yellow banner: "Active pledge: no fare hike,
  expires in N quarters. Breaking costs ..."
- Fare-policy buttons that would break the pledge get amber border +
  red inline text under the forecast: "Breaks pledge: -20 City Hall
  trust, -12 public approval, -3 board confidence"
- Clicking a pledge-breaking option opens a confirm dialog showing
  both the operating uplift (revenue + ridership shift) and the
  political cost. Player can keep the pledge or break it explicitly.
- Reducing fares does NOT trigger pledge cost (the pledge is against
  hikes only)

The principle: **inform, don't block.** Player can always raise fares.
The dashboard makes the cost visible BEFORE they click.

**Test additions:**
- Accepting EV017 pledge creates active obligation
- setFarePolicy applies cost when raising fare with active pledge
- setFarePolicy does NOT apply cost when reducing fare
- endTurn prunes expired obligations
- Telegraph invariant: all telegraphed templates are scheduled

**145 tests passing total.** Bundle 399KB JS / 124KB gzip.

---

## 2026-05-26 — Phase 3.2: event catalog expansion + telegraphs + informational + Monte Carlo

Returned to Phase 3.2 after the Phase 5.1 detour. Catalog goes from
10 → 40 templates. Telegraphs warn players 2-3Q before events fire.
Informational events surface in news rail without inbox bloat. Time-jump
preview now shows ranges across parallel runs.

**30 new templates** spread across categories:
- 5 operations crises (streetcar derailment, GO signal failure, holiday
  bus shortage, station fire, snowstorm)
- 5 political (premier pet project, fare freeze pressure, federal
  minister visit, opposition attack, councillor ward extension)
- 4 construction (OL design flaw, NIMBY lawsuit, contractor strike,
  heritage building)
- 4 media/scandal (wasteful op-ed, whistleblower leak, documentary
  exposes backlog, transit award)
- 3 climate (climate funding, flooding, snowstorm shared)
- 3 elections — all informational (federal, provincial, city)
- 2 character/internal (engineer poached, board retirement)
- 2 financial/bond market (credit rating review, BOC rate decision)
- 1 accessibility lawsuit (no-good-options)

**6 no-good-options events** with all-bad branches:
- EV014 station fire (rebuild $800M / spot $200M / patch $50M w/ -8 reliability)
- EV023 contractor strike (accept $600M / partial $250M + risk / hardball + delay)
- EV026 whistleblower leak (come clean / discredit / change topic — all -PR)
- EV038 credit rating review (open books / fight / backstop-favor)
- EV040 accessibility lawsuit (settle $800M / fight + lose later / partial $400M)
- Implicit: EV017 fare freeze (cap revenue / weak optics / refuse politically)

These trigger the "every option costs you something" feeling per §0 P5.

**Telegraph system (authored per-event):**
New ActionLogEntry kinds: `event_telegraph` and `event_informational`.
Both surface in the news rail with distinct visual treatment (amber for
telegraph, blue for informational, red for fired decision events,
emerald for player decisions).

Mechanism:
- **Scheduled events**: at each quarter, check if `nextScheduledQ ==
  currentQ + telegraphQuartersBefore`. If yes, emit telegraph.
- **Random events**: when the random roll passes, instead of firing
  immediately, emit telegraph + schedule actual fire via
  `delayedQueue` for `quartersBefore` later. Cooldown applied to the
  telegraph too so the same event can't re-roll while pending.
- **Conditional events**: no telegraphs (the state crossing the
  threshold IS the warning).

Telegraphs don't enter inbox. Don't block End Turn. Pure informational.

Sample heartbeat (seed 1, 60Q):
- Q4: telegraph "Mayor likely to campaign on transit-fare stability" → EV017 fires Q6
- Q6: telegraph "Minister staff scoping GTHA visit" → EV018 fires Q8
- Q6: telegraph "Climate Bank signals transit-resilience funding" → EV029 fires Q9
- Q9: telegraph "Star reporters asking around about maintenance backlog" → EV026 fires later
- Q10: telegraph "Federal election campaign begins" → EV032 fires Q12

**Informational events (`displayKind: 'informational'`):**
- Empty `choices` array
- Never lands in inbox
- Appears in news rail only
- Used for: elections (Q8/10/12 results), BOC rate decisions, board
  member retirements, achievements (transit award)
- Doesn't count against MAX_FIRES_PER_QUARTER cap

**Monte Carlo time-jump preview:**
- New `forecastRange(quartersAhead, runs=12)` store action
- Each run perturbs masterSeed by a prime offset so random events fire
  differently across runs
- Aggregates: min / median / max for cash + riders + game-over
  probability per quarter
- `TimeJumpPreview` UI now shows ranges instead of single trajectory
- Wider cash band = more event variance, surfaced in amber text

**News rail enhancements:**
- Color-coded entries by kind (amber telegraph, blue info, red event-fired,
  emerald player-decision)
- Outlet badge shown for telegraph + informational entries
- Body excerpt shown for telegraphs and informationals (telegraphs are
  often the headline + body that explains the upcoming pressure)
- 10 most recent entries (was 8)

**Event density now:**
- 60Q campaign with auto-resolve: ~83 event-related log entries
  (vs Phase 3.1's 31). Includes telegraphs and informationals.
- Decision events alone: ~35-40 over 60Q (~0.6/Q). Below 1.0/Q target
  but content now has cadence + foreshadowing.
- Telegraphs add ~25 extra news-rail entries — strategic planning surface.

**Test additions:**
- 5 telegraph tests (scheduled event triggers warning N quarters early,
  not in inbox, still fires on target, random with telegraph schedules
  delayed fire)
- 2 informational tests (no inbox entry, multiple can fire per quarter)
- 1 no-good-options invariant test (all variants have ≥2 choices with
  effects)
- 7 catalog tests (38+ templates, unique IDs, informational has 0
  choices, decision has ≥2, ≥4 no-good-options flagged, ≥6 telegraphs)

**141 tests passing total.** Bundle 397KB JS / 123KB gzip (was 365/114
after Phase 5.1).

**What still doesn't fire:**
- Conditional events no telegraphs — by design (state is the warning).
  Could revisit if playtests show specific conditionals feel unfair.
- BOC rate decisions are informational; they should actually shift
  floating-rate debt service. Wire in Phase 7.
- Election informationals fire but party flips don't happen. Wire in
  Phase 6.1.
- Board member retirements are informational; replacement market and
  character flow lands in Phase 6.2.

---

## 2026-05-26 — Phase 5.1 (detour): operations dashboards + proactive levers

First proactive layer. Player now has ~17 sliders/policies across three
agency dashboards (TTC / GO / UP) — maintenance budget per subsystem
plus fare and frequency policy per agency.

**Why we detoured here before Phase 3.2:**
Phase 3.1 left the player 100% reactive (only End Turn + event responses).
The marginal gameplay return from "30 more events" was lower than the
return from "first proactive controls." Coming back to Phase 3.2 now
that ops sliders exist; events will feel like responses to *the player's
operational decisions* rather than just background noise.

**Per-subsystem maintenance:**
- Range slider 0 → 3× required per subsystem
- 4 tiers: underspend / required / preventive / catch-up
- TTC required = $100M/sub, GO = $40M/sub, UP = $3M/sub
- Total starting maintenance ≈ $543M/Q across all agencies
- Tier label colored chip (red / neutral / emerald / blue)

**Fare policy** per agency, with elasticity baked in:
| Tier | Price mul | TTC riders | TTC revenue (vs current) |
|---|---|---|---|
| Reduced | 0.85 | +5.25% | -10.5% |
| Current | 1.00 | baseline | baseline |
| Modest +10% | 1.10 | -3.5% | +6.15% |
| Aggressive +25% | 1.25 | -8.75% | +14.1% |

Per-agency elasticity: TTC -0.35, GO -0.30, UP -0.15. (UP riders are
much less price-sensitive — premium service.)

**Frequency policy** per agency:
| Tier | Opex mul | Ridership mul |
|---|---|---|
| Reduced | ×0.88 | ×0.955 |
| Current | ×1.00 | ×1.00 |
| Enhanced | ×1.15 | ×1.06 |

Frequency elasticity ~+0.3 (more service → more riders).

**Archetype OPEX divergence** (per repo owner):
- Steady Operator: 1.00× baseline
- International Technocrat: 0.95× (standardized)
- The Insider: 1.05× (less internal efficiency)
- Coalition Builder: 1.03× (consultation overhead)
- Disruptor: 1.10× (high-speed, high-cost)

Applied at `createInitialGameState` to per-agency starting opex.
Persists for the campaign; frequency policy stacks on top.

**Archetype maintenance efficiency**:
- Steady: 1.00× (each $1M = $1M of effective condition)
- Technocrat: 1.10× (standardized procurement)
- Insider: 0.90× (less rigorous oversight)
- Coalition: 0.95×
- Disruptor: 0.85×

Applied inside `decaySubsystems` via a scaled ratio. Tier boundary at
"required" is reached at lower spend for Technocrat ($91M ≈ required)
and higher for Insider ($112M).

**12-quarter divergence verified:**
- Steady: $-605M cash, reliability flat 68
- Technocrat: $-157M cash (best), reliability rises to 72
- Insider: $-753M cash (worst despite +$200M start), reliability falls to 58
- Coalition: $-821M cash, reliability 60.6

Each archetype now feels distinctly different over time, not just at Q1.
The "Technocrat is the safe play" framing is true; the "Insider has
political ceiling but operational fragility" framing now bites
mechanically.

**UI:**
- New `AgencyDashboard` component used by TTC / GO / UP routes
- Subsystem table with sliders, tier chips, and total maintenance summary
- Fare + frequency policy cards with per-option forecast (ridership %
  change, revenue % change, opex $ change displayed inline)
- Policy changes apply instantly; autosave fires in background
- Mercury/light theme consistent with rest of app

**End-turn flow now meaningful:** player tunes per-agency sliders → end
turn → engine reads policy and applies effects → quarter summary
breakdown reflects player decisions. The trace-back chain (Phase 1.4)
now has actual player-decision-driven mutations to trace.

**Forecast helpers added** (`forecastFarePolicy`, `forecastFrequencyPolicy`)
so the UI can show what WILL happen before the player commits. Used inline
on the policy cards.

**20 new tests:**
- Archetype starting-opex multiplier (4 archetypes)
- Maintenance efficiency tier shifts (Technocrat reaches required sooner,
  Insider later)
- 8Q divergence test: Technocrat preserves condition better than Insider
  at identical budget
- `setMaintenanceBudget` updates correctly, clamps to non-negative
- `setFarePolicy` elasticity math (TTC +10% fare = -3.5% riders, +6.15% rev)
- `setFrequencyPolicy` opex + ridership shifts
- `forecastFarePolicy` matches `setFarePolicy` deterministically
- End-to-end: player tuning ops closes deficit vs baseline (4Q comparison)

**131 tests total** passing. Bundle 365KB JS / 114KB gzip.

**What still doesn't fire:**
- Catchment growth still static (will become reactive when Phase 5.2 or
  6 adds the right inputs)
- Engineers count still consumed only by event predicates (Phase 4 will
  affect project burn)
- Frequency policy doesn't trigger any events yet (Phase 3.2 telegraph)
- No "what's broken right now" alert in Mission Control (Phase 8.6 trace)

---

## 2026-05-26 — Phase 3.1: event system foundation

The agency starts demanding things from the player. Quarter ticks produce
events from a 10-template registry; player resolves each via the inbox
modal; effects feed back into state.

**Settings locked by repo owner:**
- Frequency: ~1/quarter steady pressure (with MAX_FIRES_PER_QUARTER = 2 cap)
- Branch depth: hard tradeoffs across axes (cash vs trust vs board vs approval)
- Voice: newsroom briefs ("Star: Bloor-Yonge signal failure strands 40k…")
- Archetype-flavored options: ✓ (Insider gets call-Hartwell, Technocrat
  gets data-pitch, Coalition Builder gets consortium pitch, etc.)

**Type system:**
- `EventPredicate` discriminated union over 14 kinds (archetype, trust,
  cash, board, public approval, engineers, templates, openBooks,
  reliability, riders, quarter + and/or/not composition) — used for
  both conditional firing AND branch gating
- `EventEffect` extended to 12 variants (cash, trust, board, approval,
  engineers, templates, opex, fare, reliability, ridership, plus
  delayed-effects and delayed-events for follow-up chains)
- `EventTrigger` is a union: scheduled | conditional | random (with
  optional cooldown for the latter two)
- `DelayedConsequence` payload is now `event | effects` for both event
  queueing and raw-effect timing

**Firing engine (`src/engine/events/firing.ts`):**
1. Drain delayed queue (anything `firesAt <= currentQ`)
2. For each template: cooldown check (derived from action log) +
   not-already-in-inbox check + trigger eligibility
3. Sort eligible: scheduled/conditional first (mandatory), then random
   by urgency desc
4. Fire up to MAX_FIRES_PER_QUARTER (2) per quarter
5. Random fires use `keyedFloat(masterSeed, "event:<id>:q<n>")` so adding
   new event templates later does not shift outcomes for existing events
   (Phase 1.3 keyed RNG pattern)

**First 10 templates** (mix of scheduled / conditional / random):
| ID | Kind | Trigger |
|---|---|---|
| EV001 Signal failure | conditional | TTC reliability ≤65, cd 6 |
| EV002 Federal infra call | scheduled | Q3, Q14, Q28, Q42 |
| EV003 Mayor Eglinton crowding | conditional | TTC riders ≥4.6M, cd 8 |
| EV004 Fare evasion crackdown | conditional | cash ≤$500M, cd 12 |
| EV005 Heat dome | random | 0.14, after Q2, cd 8 |
| EV006 Provincial windfall | random | 0.10, cd 16 |
| EV007 Allowance renegotiation prompt | scheduled | Q14, Q30, Q46 |
| EV008 Cyberattack | random | 0.07, after Q6, cd 20 |
| EV009 Construction inflation | random | 0.12, cd 10 |
| EV010 Maintenance breakthrough | random | 0.10, reliability ≥75 + templates ≥40, cd 12 |

Three (EV001, EV002, EV003) have archetype-flavored options. EV005 and
EV007 have openBooks-gated branches. EV009 has a templates ≥50 branch.

**Emergent storytelling working:** Ontario Line opening at Q20 pushes
TTC ridership above 4.6M, which conditionally triggers EV003 (mayor's
crowding complaint) at Q21. Cash bleed pushes cash below $500M around
Q5, triggering EV004 (fare evasion crackdown). Engine + content produce
real cause-effect chains the player can read in the action log.

**Auto-resolve harness** added — every event is dispatched with the
first-available choice. Lets us measure density: 31 events over 60Q
(~0.52/Q). Below the 1/Q target but reasonable; Phase 3.2 will add more
templates which raises density naturally.

**UI:**
- `EventModal` — newsroom-header (outlet badge, headline, body), choice
  buttons with tradeoff line + effect chips (cash chips red/green, trust
  chips colored by sign, etc.), "Decide later" footer
- `Inbox` — sorted by urgency desc, urgent items (≥70) get red tint,
  outlet badge on each item, click opens modal
- Pending count badge in inbox header

**Decide-later allowed.** Per design doc §0 P8 ("end turn must be
shame-free"), the player can end the turn with events unresolved.
Unresolved events stay in inbox; same template can't re-fire while
present. Decision density management is by the player, not the engine.

**26 new tests** covering predicates (all kinds + composition), effects
(all 12 variants), firing engine (scheduled, conditional, random,
cooldowns, cap, queue drain), archetype-flavored visibility, resolution
applying effects + logging + rejecting gated choices that aren't visible.
**111 tests total**, all passing.

**Bundle:** 356KB JS / 112KB gzip (was 331/105 — added ~25KB for
template registry, predicates, effects, firing engine, EventModal, plus
the inbox rework).

---

## 2026-05-26 — Phase 2.2: campaign lifecycle (new game, save/load, game over, time-jump)

Completes Phase 2. The browser app now has a full campaign loop: pick an
archetype, play through, save, load, get fired or win, start over.

**CEO archetypes — deep divergent starts** per repo owner. Four archetypes
exposed in the picker (Disruptor deferred until Phase 3 random-gaffe events):

| Archetype | Cash | Board | Trust (O/QP/CH) | Engineers | Templates | OpenBooks | Subsystem |
|---|---|---|---|---|---|---|---|
| Steady Operator | $1.0B | 60 | 50/50/50 | 180 | 30 | no | baseline |
| International Technocrat | $1.1B | 65 | 55/45/40 | 220 | 55 | yes | +4 |
| The Insider | $1.2B | 50 | 60/65/40 | 140 | 20 | no | -2 |
| Coalition Builder | $1.0B | 60 | 55/55/55 | 160 | 25 | no | baseline (+pubApp 60) |

Each starts the player in a meaningfully different opening posture per
spec §7. Tests verify archetype-specific stat overrides and that same
seed + same archetype produces deterministic identical trajectories.

**Game-over rules — standard** per repo owner:
- **Fiscal failure**: cash < -$5B for 4 consecutive quarters → fired
- **Board firing**: board confidence < 25 for 2 consecutive quarters → fired
- **Campaign won**: reaches Q60 with positive cash and positive board confidence

GameState carries `gameOverCounters: { quartersInDeepDeficit,
quartersWithFiringBoard }` and an optional `gameOver: GameOver` once
triggered. `endTurn` updates counters each quarter; resets to 0 when
the condition is no longer met (single recovery quarter clears it).

Game-over screen surfaces final cash + riders + board + tenure + CEO
identity, with kind-specific tone color (red for fiscal, amber for board,
emerald for campaign won). Two CTAs: start new + load earlier save.

**Save/load — 3 manual + 1 autosave** in IndexedDB via `idb-keyval`
(~600B, MIT). Slot module at `src/state/saveSlots.ts`. Slots store the
full JSON SaveBundle (schema-version checked on load). Autosave fires
after every `endTurn` in the background; UI shows "Saving…" / "Saved" /
"Save failed" in the brand bar. Manual save/load modals show all 4
slots with metadata (quarter, cash, riders, archetype, CEO name,
game-over flag).

On first boot the AppLayout auto-loads the autosave silently (resumes
campaign). If no autosave exists, the new-game modal opens.

**Time-jump prediction overlay** per design doc §0 P1. Hover or focus
the "Preview next 4Q" button in the brand bar to see a deterministic
4-quarter forecast (cash, riders, cumulative deltas, game-over warning
if any). Forecast is pure — runs `endTurn` 4× on a temporary state, never
touches the store or autosave.

Phase 2.2 uses deterministic single-trajectory forecast (no events yet).
Monte Carlo ranges with min/max/mean per metric wait for Phase 3 when
stochastic event firing creates variance.

**Polish from Phase 2.1 self-review** rolled in:
- Q0 cash caption: "$0/Q growing" → "starting balance" when lastQuarterDelta = 0
- "YoY pending" removed in favor of empty caption for first 4 quarters
- Inbox empty state names the button: "Click End turn when you're ready"
- News rail empty state: "Campaign just started. After your first turn,
  this rail tracks each quarter's recap."

**Test coverage:** 10 new tests for archetypes + game-over (deep
divergence, deterministic trajectories, fiscal failure at 4 consecutive
quarters, board firing at 2 consecutive quarters, recovery clears
counters). 85 tests total all passing.

**Bundle:** 330KB JS / 105KB gzip. Up ~21KB from Phase 2.1.

---

## 2026-05-26 — Phase 2.1: Mission Control dashboard (browser UI)

First playable UI. You can open `npm run dev`, see Mission Control, and
click "End turn" to advance quarters. The engine drives the display via
Zustand; every endTurn produces a new GameState that propagates to
selectors.

**Visual style chosen (Mercury / Linear light theme)** per repo owner:
- Light background (`bg-neutral-50` / `bg-white` cards)
- Sans-serif (Inter) for chrome; monospace (JetBrains Mono) tabular-nums
  for numbers
- Restrained color: blue (#2563eb) for primary actions, neutral grays
  for hierarchy, status colors (emerald / amber / red) only when a
  metric crosses a threshold
- High information density per layout: top-strip with 8 always-visible
  KPIs spanning the page
- No shadows, subtle borders, rounded-md corners

**Information density: maximum per spec.** Top strip is always visible
across all dashboards (lives in AppLayout, not MissionControl) and shows
8 KPIs: Cash · Daily riders · Board confidence · TTC on-time ·
Satisfaction · Ottawa trust · Queen's Park trust · City Hall trust.
Each KPI has number + delta + plain-language caption + tone color +
sparkline where useful (cash, riders).

**Number humanization implemented (P4).** Every KPI shows a concrete
comparison alongside the number:
- Cash: "$1.00B" with caption "~7.5 quarters runway" or "2.5 years runway"
- Riders: "4.75M" with YoY delta "+360k (~a streetcar line worth)"
- Trust: "50" with descriptor "cooperative · 3 years to election"
- Board: "60" with "concerned" / "supportive" / "firing imminent"
- Reliability descriptor on TTC on-time line

Toronto-calibrated comparison thresholds in `describeRidersDelta`:
<5k minor · <25k 1 bus route · <100k busy bus route · <250k streetcar
line · <500k subway extension · 500k+ full subway line. The design
doc's own example ("85k = busy bus route") falls cleanly in this scale.

**End-turn button: instant, no confirmation** per spec P8. Lives in the
top-right of the AppLayout brand bar — accessible from every dashboard,
not just Mission Control. Single click, immediate state advance, no
animation.

**Zustand store at `src/state/gameStore.ts`** holds `state`,
`initialState` (for history reconstruction), `endTurn` action, and
`newGame(seed)` action. `history()` derives sparkline data from the
action log + initial state on demand. UI components subscribe via
fine-grained selectors so they only re-render when their slice changes.

**Sparklines hand-rolled SVG**, not Recharts. Recharts (in deps) is
reserved for full charts in Phase 9. Sparklines are <40 lines of SVG.

**Mission Control content (per §4):**
- Inbox (priority queue, empty for now — events ship Phase 3.1)
- "What's coming" (operating-allowance renegotiation, three elections,
  active project openings, sorted, ≤5 shown, "soon" flag if ≤2 quarters)
- News rail (recent action-log entries as narrative — real outlet
  voices land Phase 8.5)

Layout: two-column desktop (lg:grid-cols-3 with main 2/3 + side 1/3),
collapses to single column on smaller screens. No mobile UI optimization
beyond responsive grid — out of scope per design doc §12 MVP.

**Per-agency tone-coloring on KPIs:** any trust score below 25 = red
(critical), below 40 = amber (warning), else neutral. Cash below 0 =
red, below $500M = amber. On-time below 80% = red, below 90% = amber.
Visual at-a-glance prioritization.

**No mobile UI tests / RTL setup yet.** Phase 2.2 will add
@testing-library/react when save/load UI needs DOM-level testing.

**Bundle size:** 309KB JS / 99KB gzip after Phase 2.1 (was 289KB before
the UI work). Acceptable for a complex dashboard.

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
