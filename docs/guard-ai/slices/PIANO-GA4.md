# Piano GA4 - GuardActor (intro actors)
Owner: Night Shift | Guard AI Build. Status: current.

Branch `feature/guard-ai-piano-actor` (worktree `C:/NightShift/Mobile-Coop-guard-ai-piano-actor`), cut from
origin/master 1396ebd4c. Builder: Opus. Size S (~300-500 lines with tests). One PR to master.

## Why
Campaign's piano scene (ROADMAP Now row 20; `docs/piano-escape/PLAN.md` on origin/feature/piano-escape, section 2
"Intro" and "Guard AI Build asks" GA4) has a render-only intro: input off, no guard AI, the section's guards not
spawned yet. At 30-38 s of the intro four guards (G1-G4) close in on the players in slow motion (playback 0.3x), rifles
up and firing, then stop on their stop spots 4-6 m from the players and idle until the EMP press (no timer). The guard
freeze (`src/game/sectorGuardFreeze.ts`) is a render-only cull, so it cannot slow a real guard. Campaign's S2
(`src/game/pianoIntroView.ts`) uses static posed stand-ins until this lands, then swaps in GuardActor.

## What to build
A guard rig with no brain: `src/ai/guardActor.ts` (Babylon through `src/core/babylon.ts` only) plus a pure,
Babylon-free path module `src/ai/guardActorPath.ts` with vitest tests.

1. **Pure path (`guardActorPath.ts`).** A polyline of (x, z) points (flat number array, as the map data uses), a walk
   speed (m/s) and a clock. `sample(path, dist, out)` writes x, z and the travel heading at a distance along the path
   into a caller-owned object; total length; stop at the last point (heading holds the last leg's). No allocation per
   call. Tests: start, mid-leg, a corner, past the end, a one-point path (stands still), length.
2. **GuardActor (`guardActor.ts`).** Built from an `EnemyDef` the same way an `Enemy` builds its look: `buildEnemyRig`
   (`src/ai/enemyRig.ts:21`; see `enemy.ts:713-727`) and a `MotionDriver` (`src/anim/motion.ts:217`) driven as
   `enemy.ts:3960-3972` drives it (aimed motion: `mi.aiming = true`, `ENEMY_MOTION`), so the walk, the aimed upper
   body and the feet look exactly like a real guard's aimed advance. Height from `world` nav / ground as the Enemy does
   (`nav.heightAt`), or a fixed y from the caller if simpler for a render-only actor - your call, say which.
   - API (Campaign codes against this; keep the names):
     - `new GuardActor(scene, world, def, path, opts)`; `opts`: `speed` (m/s, default the def's walk speed), `rate`
       (playback rate, default 1), `yaw` (start facing).
     - `setRate(r)`: playback rate (0.3 in the intro; 1 after).
     - `aimAt(x, y, z)`: where the rifle points (the players); held while walking and standing.
     - `step(dt)`: `dt` is real seconds; the actor advances `dt * rate` of its own time (walk, gait clock, poses). At the
       path's end he stops (the driver's weighted stop) and idles aimed.
     - `fire()`: one shot: the same fire pose / recoil and muzzle flash a real guard shows (`enemy.ts:3883` and its
       recoil path), playing at the actor's rate; returns false if not ready (re-arm time as the def's fire rate
       scaled by rate). `muzzle(out)`: writes the muzzle world position (tracer origin for Campaign).
     - `done` (reached the end and stopped), `pos` (read-only), `dispose()` (rig, gun, shadow casters, everything it
       registered; nothing left in the scene).
   - Not a guard: never in `EnemyManager` lists, no perception, hearing, occupancy, hitboxes, nav cells, wire
     snapshots, score, barks or alarms. A render-only object, single player and co-op alike (each machine builds its
     own; nothing on the wire).
   - Shadows: casts like a guard (the same shadow caster registration an Enemy's rig gets) so the lit intro reads
     right; removed on `dispose()`.
   - Hot path: `step` and `fire` allocate nothing (reused scratch vectors, indexed loops, `hyp2` / `hyp3`, never
     `Math.hypot`; `docs/systems/conventions.md`).
3. **Tests.** `tests/guardActorPath.test.ts` (the pure module, as 1). `tests/guardActor.test.ts`: whatever can run in
   node without a GPU (Babylon NullEngine is used elsewhere in tests: grep `NullEngine` for the pattern) - at least:
   constructs from a grunt def, `step` at rate 0.3 covers 0.3x the distance of rate 1 over the same real time,
   stops at the end with `done`, `fire` re-arm respects rate, `dispose` leaves no meshes behind, and a source-level
   check that `guardActor.ts` never imports `src/net` or references `EnemyManager`.

## Rules
- Read `docs/systems/agent-preamble.md` from origin/master first; branch guard before every write.
- Commit and push each sub-step on `feature/guard-ai-piano-actor`, path-limited (never `git add -A`).
- Checks per sub-step: `npm run typecheck:fast` and `npx vitest run tests/guardActor*.test.ts` (plus any test file you
  touch). Never a full `npm run check`, never e2e, never `npm run dev`. Every shell command has a timeout.
- No flag needed: nothing on master calls GuardActor (Campaign's scene, behind `pianoEscape`, will).
- Changelog fragment `changes/feature-guard-ai-piano-actor.md`, `kind: patch` (a library piece, not yet used), one line.
- Add one line for `src/ai/guardActor.ts` to the module map in `docs/INDEX.md` if `src/ai` files are listed there.
- Do not edit `src/ai/enemy.ts` beyond exporting a constant or helper you need to share (say which); no behaviour change
  to real guards.

## Report (the last thing you write)
Write `docs/guard-ai/slices/PIANO-GA4-REPORT.md` (commit + push): the head sha, files and line counts, the final API as
code signatures, the tests and their counts, anything assumed (A entries with how to undo), and open items. Then reply
with the head sha and the report path only.
