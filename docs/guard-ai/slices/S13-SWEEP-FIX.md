# S13 sweep fix (train 45: "S13: the team moves between sweep points", looked at 0)

Branch `feature/guard-ai-sweep` = master cacd0c7e + `feature/guard-ai-s28` (0d97f94c). Builder: Opus.

## Cause
- Bisect (the orchestrator): master PASS, S28 alone PASS, master + S28 FAIL, deterministic.
- S28's only grid change in warehouse section 1 is front door 2 (-5, -18), authored locked. Team 1's first sweep point p2
  (-6.5, -19.6) lies just outside it. Before S28 that team stalled at door 2's leaf. Now it goes round (30 m) by door
  15, the corridor and doors 11 / 5, which are team 0's ways. With S24-S27 the teams' search positions differ, and team 0
  ends up in the yard. (A static check of every sweep point and both reinforce points: all reachable within goTo's
  budget. No point is unreachable.)
- The diag (desktop 4192): team 0 = [leader (8.8, -18.5), follower (10.9, -20)] on point 0 (3.6, -12.3), visited 0,
  dwell 0. On the runtime grid (`tests/helpers/runtimeNav.ts`) the leader's cell at (8.8, -18.5) and its east and west
  neighbours are not walkable (the facade's wall margin; the cell south is). His route to point 0 starts east along
  the facade to door 5 (11, -18).
- Why he never moves: `Enemy.tryMove` (`src/ai/enemy.ts`) takes a step only into a walkable cell. A guard whose own cell
  is blocked could not take any step inside it, so unless one step crossed into a walkable cell he froze there for good.
  Nothing in the sweep gives a point up while its leader is held: `SweepTeam.lead` only waited, and
  `Enemy.goTo` never replans a held route to the same goal. So the team stood until the run ended.

## Built
1. `src/ai/sweepTeam.ts` `lead`: a leader held short of his point (moved under `SWEEP.stallMove` 1 m in `SWEEP.stall`
   5 s) gets one replan (`replan`: `Enemy.sweepStep` drops his route, so `goTo` plans again from where he stands). A
   second stall gives the point up (`next()`, counted in `visited` as an unreachable point already was; `skipped` for
   debug). A walking leader on a long detour never stalls; dwelling at the point is not a stall. Allocation-free.
2. `src/ai/enemy.ts` `tryMove` + `outward`: a guard standing in a blocked cell may take steps inside it that head
   towards the nearest walkable cell (`nearestWalkable`, ring 2, only while he is in a blocked cell), so he walks out.
   He never steps into another blocked cell. `src/ai/navGrid.ts` `centerInto` (allocation-free `center`).
3. `src/ai/gear.ts` `SWEEP`: `stall: 5`, `stallMove: 1`.
4. `scripts/e2e-sectorops.mjs` S13 diag (printed on failure only): each member's cell walkability and route length,
   the leader's index, `stallN`, `skipped`.

Kept: S13's intent (teams sweep the section's points, the leader moves between them, the stack follows). Teams still
share the point list with their `sweepStart` offsets. Point claiming between teams is not built: the stall rule
covers a point another team stands on.

## Tests
- `tests/responseWiring.test.ts` (S13): the stall: replan after 5 s held, point given up after the second stall
  (visited 1, skipped 1), a walking leader on a detour never stalls, dwelling is not a stall; `sweepStep` drops the
  route on a replan.
- `tests/lockedDoorPath.test.ts`: a guard in the wall margin's blocked cell walks out (fails without the fix:
  mutation checked).
- Every test importing `ai/enemy`, `ai/enemyManager`, `ai/sweepTeam`, `ai/navGrid` or `world/doors`, plus
  `tests/ctcourse/a7LockedCage.test.ts`: 58 files, 1017 tests pass. `tsc --noEmit` and eslint clean.

## Laptop
Set `sweep-fix`: e2e-sectorops:1 (S13: visited >= 1) and e2e-stealth-ai. If S13 still fails, the diag line now shows
whether the leader's cell is walkable and whether his point was skipped.

## Risks
- The unstick lets a guard already inside a blocked cell move inside that one cell (at most 0.5 m) towards walkable
  ground. A cell straddling a thin wall could let him cross its plane there. That only happens once he is already in a
  blocked cell (rare: pushed in), and freezing for good there was the worse failure.
- A team gives up a point it is jammed short of for about 10 s. In play that is a skipped look, not a stall.

## Fix round (check: `S13-SWEEP-CHECK.md`, PASS with two follow-ups)

### 1. The e2e no longer passes for the wrong reason; the stall is no progress along the route
- The checker is right that the cause is not shown. z -18.5 is exactly a cell edge, and `tryMove` never lets a guard
  from a walkable cell into a blocked one. So the leader was most likely in the walkable row, pressed against the facade
  margin or held head-on by team 1 walking the facade row to p2. If so, the round-1 unstick did nothing there, and the
  stall rule (under 1 m of displacement) missed a leader who shuffles more than 1 m at a jam.
- `scripts/e2e-sectorops.mjs` S13: the assert is now `looked >= 1` (looked = `visited - skipped`, its best over the run),
  so a skipped point never passes it. Every run logs `S13 sweep: looked at, visited, skipped, stalls, leader at [x, z,
  cell walkable]`, pass or fail, and the failure diag keeps its per-member lines.
- `SweepTeam.lead(dt, x, z, togo)`: a stall is now no progress along his way. `togo` is his way still to go along his
  route (`Enemy.routeToGo`: the legs of `routePath`, then on to the point; the straight distance when absent). It counts
  while `togo` is not cut `SWEEP.stallGain` 0.5 m under its best. A shuffle at a jam is no progress, whatever its size. A
  detour that walks away from the point is progress (its way to go falls). A new route `SWEEP.stallJump` 2 m longer than
  the best (the replan's detour, a version replan) starts the count again. As before, the first stall (5 s) drops his
  route and replans from where he stands, and the second gives the point up (last resort, counted in `skipped`).
- Not built: a replan that routes clear of the other team (no per-guard cost on the grid). If the next run logs
  `skipped > 0` with `looked` 0, that is the next step.

### 2. Thin-wall hole closed
- `Enemy.outward(cur, x, z)` no longer takes `nearestWalkable`'s ring order (always -z, then -x, on a tie). It takes the
  walkable 8-neighbour (same storey: `cellNear` from his cell) whose centre is nearest his feet in metres. In a cell a
  thin wall splits, that is the side he stands on, so his steps never cross the wall's line. No allocation.
- `tests/lockedDoorPath.test.ts`: on the warehouseOps runtime grid, the 0.1 m panel at (-13.5, -21.2). A guard in its
  blocked cell, north of the panel or south of it, sent either way: he never crosses the panel's faces, and sent his own
  way he is out on walkable ground. It fails with the round-1 `outward` (mutation checked).

### Also
- `tests/gear.test.ts` pinned `SWEEP` without the new keys (round 1 missed it: that file was not in its test set). It now
  reads `stall: 5, stallGain: 0.5, stallJump: 2`.
- `S13-SWEEP-CHECK.md` committed.

### Fix-round results
- `tests/responseWiring.test.ts` (S13): the progress stall (a 1.5 m shuffle stalls; a replan's longer detour restarts the
  count; the second stall skips; a detour walking away with its way to go falling never stalls; dwelling is not a stall)
  and `routeToGo`. 20/20.
- `tests/lockedDoorPath.test.ts` 11/11. All test files importing `ai/enemy`, `ai/enemyManager`, `ai/sweepTeam`,
  `ai/navGrid`, `world/doors` or `ai/gear`, plus `tests/ctcourse/a7LockedCage.test.ts`: 62 files pass. `tsc` and eslint
  clean.
- Laptop set `sweep-fix2`: e2e-sectorops:1, e2e-stealth-ai.
