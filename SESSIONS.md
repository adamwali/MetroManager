# Sessions

Working log of build sessions. Append newest at the top. Per the playbook,
each entry captures: what got done, what's left, surprises.

---

## 2026-05-26 — Phase 0.1: project skeleton

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
