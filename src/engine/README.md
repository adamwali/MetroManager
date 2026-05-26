# Engine

Pure TypeScript simulation. No React, Zustand, or any UI dependency.

The ESLint boundary rule in `eslint.config.js` enforces this — code under `src/engine/`
cannot import from `src/ui/`, `src/state/`, or from `react`, `zustand`, `framer-motion`,
`recharts`, etc.

Modules land here in Phase 1+:

- `state/` — `createInitialGameState`, `endTurn` (Phase 1.2)
- `rng/` — seeded RNG (Phase 1.3)
- `log/` — action log (Phase 1.4)
- `events/`, `projects/`, `operations/`, `politics/`, `finance/` — as their phases land
- `test-harness.ts` — Node-runnable simulation harness (Phase 1.4)
