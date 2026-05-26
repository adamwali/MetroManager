# METRO

A browser-based simulator about running the Greater Toronto Transit Authority.

You play CEO of a newly-created Toronto transit agency over 15 in-game years (60
quarterly turns), making capital, operations, financing, and political decisions
with traceable consequences.

The design source of truth lives in [`docs/`](./docs).

## Status

**Phase 0 — Project skeleton.** Engine, UI dashboards, and the rest of the
simulation arrive in subsequent phases per
[`docs/05-claude-code-phases.md`](./docs/05-claude-code-phases.md).

## Stack

- Vite + React 19 + TypeScript (strict)
- Tailwind CSS v4
- Zustand (state — wiring lands later)
- React Router v7 (one route per dashboard)
- Recharts (charts — used Phase 2+)
- Framer Motion (animation — used Phase 2+)
- Dexie / IndexedDB (saves — wiring lands Phase 2.2)
- Vitest (tests)
- ESLint + Prettier + `eslint-plugin-boundaries` (architectural enforcement)

The `eslint-plugin-boundaries` config in `eslint.config.js` enforces a hard rule:
code under `src/engine/` cannot import React, Zustand, Recharts, Framer, or
anything from `src/ui/` or `src/state/`. The engine is portable to Node and
testable in isolation.

## Folder layout

```
src/
  engine/   pure TypeScript simulation (no UI deps)
  ui/       React components and route layout
  state/    Zustand stores (UI ⇄ engine wiring)
  types/    shared TypeScript type definitions
  utils/    generic helpers
  test/     Vitest setup
docs/       design spec (source of truth)
```

## Scripts

```bash
npm install          # one-time
npm run dev          # local dev server
npm run build        # production build
npm run preview      # serve production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write
npm run test         # vitest run
```

## Working with the build playbook

Each phase in `docs/05-claude-code-phases.md` lists a session prompt and a
definition-of-done. The playbook expects:

1. Read the prior session's `SESSIONS.md` entry.
2. Force a question phase (5-7 clarifying questions) before writing code.
3. Commit on green; revert on doubt.
4. Record architectural decisions in `DECISIONS.md`.

`SESSIONS.md` and `DECISIONS.md` are at the repo root.
