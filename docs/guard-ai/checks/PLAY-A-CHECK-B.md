# PLAY-PASS Slice A - checker B (cost, code, tests)
PR #588, feature/guard-ai-home, head 5c795a73e. Fresh Opus checker B, read-only.

FIX

1. `homeLongPlan` (20000-expansion A*) has no per-frame cap, and one call alone is over the ~4 ms bar. Measured on the
   laptop (Alienware x16) with a scratch vitest (deleted; JIT warmed, best of 3 per case), `nav.findPath(.., 20000, ..)`
   over 400 seeded random calm starts whose 3000-budget partial plan is partial (the exact `homeLongPlan` trigger):
   - S1 campus (campusV2, 431k cells, 99k walkable): 85% of random starts trigger it; p50 4.45 ms, p90 5.49, p99 7.01,
     max 7.70 ms per call; 37% of them still fail (full 20000 expansions, then the partial fallback). 32 of the worst
     back to back: 180 ms in one frame.
   - ctcourse (Marlow Yard): p50 2.59, p90 4.72, max 6.71 ms; 32 worst back to back: 167 ms.
   - Baseline: `goTo`'s existing 3000 partial plan is 0.74-0.90 ms mean.
   Every calm transition (`onLevel` to unaware / cooldown) clears `homeG`, so each guard that calms off his route runs
   one long plan on his first calm frame (the `routePart && !homeLong` branch), with nothing staggering them: a squad
   standing down together, or 20-32 guards after an alarm, is a 100-180 ms hitch; a guard flicking suspicious ->
   unaware repeats it every calm spell. Fix: a manager-owned budget, e.g. one long plan per frame (a flag the manager
   resets at the top of `update`, read through `ctx`); a guard denied it keeps the partial `wp`, leaves `homeLong`
   false and tries next frame. The stuck-check call (`if (!this.homeLong) return this.homeLongPlan(g)`) takes the same
   token. Worth also checking whether a lower `homeExpand` (e.g. 10000-12000) still passes the four S1 cases: cost
   scales roughly with expansions. Add a test that two guards calming in the same frame run one long plan between them.

## Checked, fine
- Path buffers: `homeLongPlan` itself allocates nothing (reuses `meP`, writes `routeGoal`); `findPath` allocates its
  `cells` / `via` / `out` / smoothing arrays per call exactly as `goTo` already does. Once per point, not per frame:
  after the long plan `routeGoal` is the point, so `goTo` does not replan it unless the path empties or the grid
  changes. No closures, iterators or `Math.hypot` in the new code (`hyp2` throughout).
- Resets: every spawn, revive (`EnemyManager.revive` builds a new `Enemy`; `inherit` copies `homeY`, the shared walker
  gets `rejoin`, which now restores `postPt`) and section restart (`despawnAll` -> new guards) start with fresh
  `homeT` / `homeG` / `homeLong` / `alarmRunT` / `alarmQuit` / `reviveT` / `routePart`. `alarmQuit` clears when he
  leaves alert, `alarmRunT` on `runAlarm`, `reviveT` when `reviving` is set, `homeG` on each calm entry.
- Co-op: `src/net` imports `Enemy` as a type only; the client runs `enemyPuppet`, never `decide` / `calmDecide`;
  `alarmBarred` is read only by the host's `assignAlarm`.
- `npm run typecheck:fast`: clean. eslint on the five files: clean.
- `npx vitest run tests/guardHome.test.ts tests/guardAiAlloc.test.ts tests/guardAiAllocManager.test.ts`: 3 files,
  19 tests pass. `guardHome.test.ts` alone 4.7 s (S1 case 3.9 s, A8 0.3 s). Deterministic: fixed 30 Hz steps,
  no `Math.random`, no wall clock; the S1 cases assert the start defeats the 3000 budget (so the new path is exercised).
  Logged: gate officer home in 45.6 s / 43.5 s (limit 60, the brief's case), the two formerly stuck starts 78.5 s and
  94.6 s (limits 90 / 120), A8 officer 11.8 s.
- `changes/feature-guard-ai-home.md`: name, title line, `kind: patch`, bullet all match `changes/README.md`.

## Polish
- The guard allocation tests (`guardAiAlloc`, `guardAiAllocManager`) cover none of the calm walk (not before this PR
  either); `homeStep` / `alarmStep` add no allocation of their own, so no gap introduced, but no test pins it.
- `homeStep` reads `routePart` right after `goTo`; when `goTo` did not replan this frame (a new goal within `routeT`),
  it is the previous plan's flag. At worst one early long plan; harmless once the per-frame cap exists.
- A revive given up after `runMax` sets `reviving = null`; if the body is reported to him again he walks it another
  15 s. Not seen in play; note only.
- Two S1 test limits (90 s, 120 s) sit about 12-25 s above the logged times; fine for now, a tighter bound would catch a
  regression sooner.
