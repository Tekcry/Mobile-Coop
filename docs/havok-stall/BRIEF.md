# havok-stall - brief

Job lead: Night Shift | CT Core Build. Branch `feature/havok-stall` in `C:/NightShift/Mobile-Coop-havok-stall`, from
master 4.42.0 (1414517c). Started by the orchestrator (2026-10-21 ~21:45): "A main-thread spin inside Havok after a
tuner pause could freeze the game for a player, which is worse than a test failure."

## The ask
1. The desktop `e2e-menus` stall (evidence `docs/anim-joints/J2-STALL.md` on `feature/anim-joints`; backlog "Flaky
   e2e suites"): the full suite stalls 5 of 5 on the desktop at its "(tuner-camera)" step, right after the tuner closes
   and the game runs; master 4.39.0 without J2 stalls the same; the laptop passes. No JS error: the main thread spins
   inside Havok WASM (`HP_World_CastRayWithCollector` / `HP_World_ShapeProximityWithCollector` from the player
   controller's `floorUnder` / `settleGap` / `integrate`, via `Player.fixedUpdate` and `GameLoop.frame`) on finite
   inputs (player still, grounded, game time 5.2-5.4 s). It does not reproduce in isolation.
   Try first (orchestrator): releasing timeScale 0 after a long pause hands the fixed-step loop a huge accumulator; or a
   stale or degenerate shape cast (zero-length direction, a huge sweep). Reproduce it with a unit or e2e that pauses for
   a long real time and then resumes. Fix the cause in the loop or the controller, minimal. Then e2e-menus on the
   desktop in a full run.
2. e2e-levels "a runner climbs the rack ladder" takes 9-30 s on master against its 30 s budget (guard think ticks and
   real-time frames; Menu Notes' #88 analysis, `docs/anim-skeleton/s2/REPORT.md` "#88 fix round"): seed Math.random
   and use `loop.manual` around that chase (or widen the budget); list it in backlog's flaky suites until then.
3. Log only, for later review (no change): gameplay reads the rig pose in `enemy.ts:1779-1781` (the perception eye
   from `rig.headNode`), `game/playerTarget.ts:101-119` (hit volumes) and `ai/body.ts:96-124`: not graphics state,
   but gameplay tied to animation.

Goal (CLAUDE.md "Current goal"): fix, not polish. One checker, one fix round.

## File area
`src/core/loop.ts`, `src/physics/*`, `src/player/*` (the controller), `scripts/e2e-levels.mjs`, `scripts/e2e-menus.mjs`
(only if the test is the cause), tests, `docs/backlog.md`, `docs/havok-stall/`, CHANGELOG / TESTING. Anything else goes
through the orchestrator.

## Assumed decisions (undo by telling the orchestrator)
- B1: A fix in the loop (cap the steps or the accumulator after a long pause) is preferred over a controller change if
  both cure it, as it guards every system, not only the player.

## Limits
Hard rules in CLAUDE.md (no allocation on hot paths; gameplay never reads graphics state). Tests: the full e2e goes to
the laptop first ("Night Shift | Character Build", `E2E_JOBS=2`); on the desktop a full e2e only at `E2E_JOBS=1` when
the laptop is busy, but item 1's proof is e2e-menus in a full run ON THE DESKTOP (where it stalls). Usage: check
`get_usage` before each agent; stop at a 5-hour meter of 98%.
