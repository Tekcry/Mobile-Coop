# coop-kit STATE (K5b branch copy)
Owner: Night Shift | Player Build. Status: current (job doc). The job's full STATE lives on origin/feature/coop-kit;
this branch keeps only its slice line, so a swap loses nothing.

## K5b (Plank Bridge, lay and cross)
- Branch feature/coop-kit-k5b on K5a (PR #601, on K0 #599). Brief: `docs/coop-kit/K5b-BRIEF.md`. Built: the lay search
  and host lay rule, the laid board's collider, the crossing done call, the guards' notice, the kit reset hook,
  `plankBridge` in `KIT_BUILT`; tests in `tests/kit/plankBridge.test.ts` (plus `tests/previewFlags.test.ts`, which read
  the built list). Typecheck, vitest and eslint clean. No PR yet; gate: one Opus checker + lead-requested e2e-netmove
  (no `src/net` edit). Open: K5b-6 (client station-retry reset) and K5b-7 (3-4 players) follow-ups.
