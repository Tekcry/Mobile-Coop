status: open

# J14 Marlow re-plan, slice G-A4: A4 the Goods Shed on the re-plan (PR 7)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 900 lines.
Queue copy: cloud-queue `briefs/j14-g-a4.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at <sha the lead fills> (S0 + R1 merged, both checker-passed).
- new branch: `feature/marlow-replan-g-a4` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a4`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a4`. Commit and push each
  finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137) and "Set slices" (:413-432, the G-A4 row); `BRIEF.md`.
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A4 block), 4 (order 9, 8, 10), 5 (`a4-main-aisle`, `a4-dock`), 6
  (stations 9, 8, 10), 7, 8 (`a4-grille`, `a4-wicket`), 9 (C1-C3, the three guards), 10 (SA7, SA11, SA12).
- `graph.json` spaces `a4-*` (their `area` boxes are the one floor route) and links; `replan-plan.svg` (1 m = 7 px;
  x = (px - 34) / 7, z = (642 - py) / 7): the grille at x 101-104 on z 24.
- Code: `src/game/course/stationDef.ts`, `replan/index.ts` and `replan/a4GoodsShed.ts` (S0 stub), `ctcourse.ts`
  (`CtcourseOpts`), `types.ts`, `marlowCircuits.ts` (`MARLOW_CIRCUITS_REPLAN` groups 49 and 44), R1's station code,
  `tests/ctcourse/replan/variant.test.ts`, the built `tests/ctcourse/a4GoodsShed.test.ts` (the pattern to copy).

## Only these files
- `src/world/maps/ctcourseSets/a4GoodsShed.ts`: only a third parameter `opts: { replan?: boolean } = {}` on
  `buildA4GoodsShed` and `if (!opts.replan)` guards round the pieces the re-plan removes.
- `src/world/maps/ctcourseSets/replan/a4GoodsShed.ts`: everything new, by building into `b` / `kit` and amending `part`.
- `tests/ctcourse/replan/a4GoodsShed.test.ts` (new), `tests/ctcourse/replan/a4GoodsShed.light.json`,
  `scripts/e2e-ctcourse/replan/a4GoodsShed.mjs` (replaces S0's stub), `changes/feature-marlow-replan-g-a4.md`.
- Nothing else (not PLAN / BRIEF / STATIONS / graph / svg, `replan/index.ts`, `ctcourse.ts`, `types.ts`, `facility.ts`,
  `src/game/**`, any built test, light file or e2e module). Need more: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: `tests/ctcourse/a4GoodsShed.test.ts` (`GREY`) and every built light file
unchanged and green; the built A4 keeps its kettle loop and every aisle.

## Build (A4, stations 9, 8, 10 in that order; guards 3, cameras 3)
1. **One floor route (Q24, M4).** The route is the graph's `a4-passage` -> `a4-cross` (back aisle x 95-108, z 24.25-27.3,
   and the cross aisle x 95-98.5 up to z 35.6) -> `a4-main-aisle` (x 86-108, z 35.6-44) -> `a4-dock`. Close everything
   else with pallet-rack end frames (5.4 m, the racks' height, solid, `noLedge`): the back aisle west of x 95, the back
   aisle's east end at x 108 and the east lane's north mouth at x 108 (z 35.6-44), aisle 2's two mouths on the cross aisle
   (x 95 and x 98.5, z 29.7-33.2), and both mezzanine stairs (west foot 80.3, east foot 111.7; `a4GoodsShed.ts:244-283`)
   with a locked hoarding at each foot. The dispatch office (x 76-82.6, z 38-44) is closed: its door locked for good.
2. **Lift grille (station 9, `deadweight`, stand-in).** A counterweighted lift grille across the passage mouth (x 101-104,
   just inside z 24.25; graph link `shutter` w 3, lifts 0.9 m, 6 s): door `A4-grille`, gate `g-a4-grille` (the deadweight
   gate KS1 hooks to Player's `counterweightGrate.ts` later; today it opens only through the stand-in), a chain on its
   counterweight side. Stand-in: the grille's own motor button `g-a4-grille-motor` beside the mouth, a press gate the
   host opens while `kitMoves` `deadweight` is off (use the base's stand-in opener; if the base has none, build it open at
   bay start and say so). Station 9 is done before the console press, so it never runs inside the loop.
3. **Camera loop (station 8, 60 s).** As built: console `g-a4-console`, loop flag `a4-loop`, C1-C3, the officer needed down.
4. **Kettle loop out (PLAN :59, :118-126, :308-310, :382, :409).** `a4-dock2` stands at the desk: overwrite
   `part.squads['a4-dock2']` with a static slot at (80.0, 31.6), yaw 0, no route / loop; guard the kettle counter
   (A4-10, :308-310); replace the officer's info line that mentions the kettle (`A4_OFFICER_INFO` line 2) with a line
   about the pair at the dock, and drop the kettle wording from the A4 lines (replan file).
5. **Synced takedown (station 10, 1.5 s).** As built: the loaders at the desk, `SYNC_WINDOW`; marks are the crouch spots
   behind the two pallet stacks (SA12): check both sit outside C3's sweep with the loop off; if not, narrow C3's sweep
   to the wicket line (replan file) and report it.
6. **Stations.** `part.bay.stations` = STATIONS section 3's A4 block, verbatim, in the order 9, 8, 10.
7. **Done flags (section 8).** Pass zones `a4-grille` [98.5, 24.3, 104.5, 27.2] both and `a4-wicket` [76.3, 33, 78, 36]
   both, floorY 0. `a4-west` exists.
8. **LANTERN's lines (section 6).** `bay.radio` rows `retry:a4-deadweight`, `retry:a4-camloop`,
   `retry:a4-camloop:timer`, `retry:a4-takedown`, `retry:a4-takedown:timer`, verbatim.
9. **Objective lines.** Replace `part.objectives` for A4 in the replan file: one line per station in play order plus the
   holding-room line, each naming what and where (#441's rule; at most `COURSE_TEXT_MAX`), no "fail".
10. **Lamps (Q2).** Group 49, the back aisle: 3 strips over the back aisle, switch `a4-sw-bulk` at (76.3, 25.8); group 44,
    the dispatch office: 1 ceiling panel, switch `a4-sw-dispatch` (79.4, 38.4) inside it (`MARLOW_CIRCUITS_REPLAN`; the
    lamp counts are the budget). Light spots for both.
11. **Drill hook (lead decided ~23:10):** no timer starts from a gate opening. Write station 8's loop window and station 10's pair window as runtime code in your
   own stub `src/game/course/replan/a4Ticks.ts` (R1 created it and registered it in `REPLAN_TICKS` in
   `src/game/course/replan/ticks.ts`): a `StationTick(h, dt)` that reads `h.live()`, `h.flag(id)`, `h.playersIn(zone)`,
   `h.now()` and calls `h.retry(n, 'timer' | 'seen')`; allocation-free (no closures or arrays per frame). Edit no other
   tick file and not `ticks.ts`. Add `a4Ticks.ts` to this brief's file list and unit-test the tick with fake hooks.

## Lead decisions that touch A4 (j14-wave2-notes)
- Play order 9, 8, 10 (the base's `checkSetPart` allows n 1-21, not rising).
- Retry: set code calls R1's host `stationRetry(n, cause)` (windows = `'timer'`); retry resets the listed guards plus any
  guard alerted in the bay (R1's job).

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run node at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); light bake timeout 15 min.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a4GoodsShed.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a4GoodsShed npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
`tests/ctcourse/replan/a4GoodsShed.test.ts` pins: the replan set's `GREY`; `checkSetPart` clean; squad = officer, dock1,
dock2 with dock2 static; stations equal STATIONS' A4 block in order 9, 8, 10; marks have standing room; on the nav, from
the security room with the grille shut nothing past z 24.25 is reachable; with it open the only path to the dock runs
through `a4-cross` and `a4-main-aisle` (no reachable cell in aisle 2, the east lane, the west back aisle, the mezzanine or
the dispatch office); station 9's ground (back aisle) is out of C2's range; station 10's marks outside C3's sweep; groups
49 and 44 live with their lamp counts; the retry lines exist and fit.

## e2e (write, do not run: "pending PC run")
`scripts/e2e-ctcourse/replan/a4GoodsShed.mjs`: both players on host and client: grille (stand-in), console loop, cross to
the dock inside 60 s, the synced takedown, the wicket; one loop-timer retry lands both at station 8's marks with station 9
still done; one takedown retry (one loader taken alone).

## Done looks like (PLAN set slices)
A4 on `ctcourseReplan`: one floor route, the grille (9) before the console loop (8) and the synced takedown (10), dock2
static, the back aisle and dispatch office lit; new `GREY` and light file; the built yard unchanged; the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master; PR body: flag `marlowReplan`,
owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a4 <sha>`)
Built, numbers used (frame positions, grille and button), files, commits, tests with counts, e2e "pending PC run",
deviations (C3 sweep), what Michael should try.
