# State

Zustand store(s). Holds the current `GameState` and exposes actions that delegate to the
engine. UI components read from here.

Convention: the store calls into `src/engine/` for any state transition. The store itself
contains no game logic — only `set(engine.endTurn(get().state))`-shaped wiring.
