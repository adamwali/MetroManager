# Phase Progress

Live status of every phase. Updated each commit. The full per-phase
detail lives in `DECISIONS.md`; this file is the at-a-glance.

## ✅ Complete

- **Phase 0** — Skeleton (Vite/React/TS), router, ESLint engine boundary,
  spec patches v3.0 → v3.3
- **Phase 1.1** — Type system (14 modules, branded scalars, discriminated
  unions, example GameState)
- **Phase 1.2** — Cash flow engine, debt + auto-refi at maturity,
  v3.3 financing pivot (per-project capital + 4-yr operating pact)
- **Phase 1.3** — Seeded RNG (sequenced + keyed patterns, 12 subsystems,
  mulberry32 + FNV-1a)
- **Phase 1.4** — Action log with rich quarter_summary breakdown,
  save/load via idb-keyval (3 slots + autosave)
- **Phase 2.1** — Mission Control dashboard (KPI strip, sparklines,
  inbox, news rail, what's coming)
- **Phase 2.2** — Campaign lifecycle: new-game flow w/ 4 archetypes,
  IndexedDB save slots, game-over screens, time-jump prediction
- **Phase 3.1** — Event system foundation (10 templates, predicates,
  effects, archetype-flavored branches, "decide later" pattern)
- **Phase 3.2** — Event catalog expansion to 40, telegraphs (authored,
  ~10% of templates), informational events, Monte Carlo time-jump.
  Polish round 1: telegraph trim + active obligations (fare-freeze
  pledge). Polish round 2: 6 empty-calorie fixes (public approval →
  ridership, engineers → project burn, openBooks → -20bp,
  nimbyOrganization → EV022 gate + dynamic, BOC drift, election trust
  shifts).
- **Phase 4** — Project initiation + financing flow. 6-project catalog,
  alignment + station quality picker, 7 financing offers (4 gov + 3
  private — pension / bond market / sovereign), full /capital
  dashboard. Polish: private cap tightening + insufficient guard.
- **Phase 5.1** — Operations dashboards (TTC/GO/UP). 17 sliders/policies:
  per-subsystem maintenance, fare policy w/ elasticity, frequency
  policy. Archetype opex divergence + maintenance efficiency.
- **Phase 6.1** — Political layer (lobby actions + ad-hoc funding +
  Insider-only call-in-favor). Per-government cooldowns. /political
  dashboard.
- **Phase 7** — Treasury: dynamic credit rating (recomputed each quarter
  from cash/debt-service/board, drifts one notch/quarter), operating
  bond issuance with rating-gated caps (AA $2B/Q, A $1B/Q, BBB blocked),
  per-tranche refinancing with 1.5% fee, /treasury dashboard.
- **Phase 4 follow-up** — Stacked financing: assemble project package
  from multiple offers; each layer becomes own debt tranche at own rate;
  sovereign optics applied once; political support applied once.
- **Phase 8.1** — Standing orders (5 rule types: auto-approve
  maintenance, auto-triage low-urgency events, auto-lobby on trust drop,
  auto-issue operating bonds on cash crunch, auto-resolve specific event)
  + quarter recap inline panel on Mission Control. Auto-actions logged
  with cause=standingOrder for the trace UI.

## 🟡 Partial (more sub-phases to come)

- **Phase 3.x** — 40 events shipped (of ~75 in `docs/03-event-catalogue.md`).
  Phase 3.3 will add character actors on events. Other 35 events also
  deferred to 3.3.
- **Phase 4.x** — 6 projects shipped (of ~30 in
  `docs/02-project-catalogue-v3.md`). Studies during proposed (uncertainty
  narrowing), LVC slider, project-specific events, cost-overrun
  mechanics → Phase 4.2.
- **Phase 5.x** — Maintenance + fare + frequency shipped. Security /
  cleanliness / accessibility per-agency sliders → Phase 5.2.
- **Phase 6.x** — Lobby + ad-hoc + favor shipped. Character relationships
  per gov (cabinet IDs exist as data, no engine logic) → Phase 6.2.
  Election campaign mechanics, lobby outcome variance → Phase 6.2.
  Allowance renegotiation events (Y4/Y8/Y12) → Phase 6.3.

## ⏳ Not started

- **Phase 8.6** — Trace UI ("why did this happen?" drawer on KPI click)
- **Phase 9** — Full charts (Recharts), analytics polish
- **Phase 10** — Onboarding briefing, polish, accessibility audit

## Deferred / known orphan features

These are defined in state/types but don't drive gameplay yet. Each has
an explicit phase pointer.

- `Characters: {}` — empty, Phase 6.2
- `StandingOrders: []` — empty, Phase 8
- Board `recentComponents`, `warningActive` — Phase 8.6 trace UI
- `OperatingAllowance.controls` — Phase 6.3 renegotiation
- CEO `portraitId` — Phase 6
- PerProjectVars (sitePrep, megaContract, settlementPremium) — Phase 4.2
- Templates → project cost reduction → Phase 4.2
- ~~Stacked financing~~ ✅ shipped (acceptFinancingPackage; package builder UI)
