status: open

# J14 Marlow re-plan, slice G-A5: A5 the Substation on the re-plan (PR 8)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 1,300 lines.
Queue copy: cloud-queue `briefs/j14-g-a5.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at <sha the lead fills> (S0 + R1 merged, both checker-passed).
- new branch: `feature/marlow-replan-g-a5` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a5`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a5`. Commit and push each
  finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137, incl. "Guards per lesson" and its A6 fallback), "Set slices"
  (:413-432, the G-A5 row), A19; `BRIEF.md` (Michael picked 1.4 m and "12, add two").
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A5 block), 5 (`a5-inner`), 6 (stations 11-13), 7, 8 (`a5-apron-e`,
  `a5-apron-w`), 9 (`laser-a5`, `a5-patrol`, `a5-watcher`, the station 16 fallback), 10 (SA5, SA10, SA11, SA13).
- `graph.json` spaces `a5-*` and links (swing at z 44.6, plates at z 40.5: drawn for the old trench); `replan-plan.svg`
  (1 m = 7 px; x = (px - 34) / 7, z = (642 - py) / 7; it still draws the old trench x 63.5-67 and the wall at x 69).
- Code: `src/game/course/stationDef.ts`, `replan/index.ts` and `replan/a5Substation.ts` (S0 stub), `ctcourse.ts`
  (`CtcourseOpts`), `types.ts`, `ctcourseGreybox.ts` (`FloorHole`), R1's station code, `tests/ctcourse/replan/variant.test.ts`,
  the built `tests/ctcourse/a5Substation.test.ts` (the pattern to copy, incl. its throw, flood and sight helpers).

## Only these files
- `src/world/maps/ctcourseSets/a5Substation.ts`: only a third parameter `opts: { replan?: boolean } = {}` on
  `buildA5Substation` and `if (!opts.replan)` guards round the pieces the re-plan removes or moves.
- `src/world/maps/ctcourseSets/replan/a5Substation.ts`: everything new, by building into `b` / `kit` and amending `part`.
- `tests/ctcourse/replan/a5Substation.test.ts` (new), `tests/ctcourse/replan/a5Substation.light.json`,
  `scripts/e2e-ctcourse/replan/a5Substation.mjs` (replaces S0's stub), `changes/feature-marlow-replan-g-a5.md`.
- Nothing else (not PLAN / BRIEF / STATIONS / graph / svg, `replan/index.ts`, `ctcourse.ts`, `types.ts`, `facility.ts`,
  `src/game/**`, any built test, light file or e2e module). The graph's new boxes and link `at` points go in your report
  for G1, not into `graph.json`. Need more: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: `tests/ctcourse/a5Substation.test.ts` (`GREY`) and every built light file
unchanged and green.

## Build (A5, stations 11, 12, 13; guards 2)
1. **Perimeter wall and gap (station 11, `chimney_pair`, stand-in; A19 1.4 m).** A 6 m wall x 67.85-68.35 from z 24.25 to
   47.75 (`noLedge` on its faces), the gap x 68.35-69.75 between it and L4's outer face, closed by cross walls at z 30.0
   and 36.0 (6 m tall) so the gap is z 30.25-35.75 (L4's far door at (70, 33) opens into it). The strips x 68.35-69.75
   north and south of the gap are sealed dead space. Wall top `a5-walltop` (x 67.85-68.35, z 30.25-35.75, y 6) and the
   fixed access ladder on the wall's inside face down to the apron (SVG: z 30-36). Stand-in: a wicket in the perimeter
   wall at the gap, door `A5-wicket`, gate `g-a5-wicket`, which the host opens while `kitMoves` `chimneyPair` is off (use
   the base's stand-in opener; if the base has none, build it open at bay start and say so). The chimney itself (KS3) is
   only geometry now: the 1.4 m gap.
2. **Cable trench (station 12, `swing_pass`, stand-in; lead decision).** The open trench moves 1.15 m west: 3.5 m wide,
   x 62.35-65.85, z 24.25-47.75 (`FLOOR_HOLES = [[62.35, 24.25, 65.85, 47.75]]`), floor y -1.6, so the apron's east strip
   is 2.0 m (x 65.85-67.85) and its west strip x 58.15-62.35. Step irons on the east face only, at both ends (a fall is a
   walk back to the start, SA13); the west face and edge `noLedge` with no co-op lip. The cable-tray gantry over the
   trench at z 44.6 (the swing's anchor for KS4; a steel frame and its pipe, the pipe's height a named constant KS4 sets
   to K4's band). The trench plates `g-a5-plates` (3 m, z 39.0-42.0) are laid from the west side by the swung player,
   then a way both ways. Stand-in: a hoarded footbridge across the trench, 1.2 m wide at z 36.4-37.6, door
   `A5-footbridge`, gate `g-a5-footbridge`, opened while `swingPass` is off (as above).
3. **Moved pieces (PLAN :107, :172-183, :332-344).** The cable drums (`A5_DRUMS`, now in the trench) move to the west
   strip, clear of the path from the plates to the throw mark (59.2, 36) and of `A5_HIDE` (59.0, 25.4); the cable dressing
   follows. The apron bulkheads at x 69.55 (z 29.5, 38.5) and the apron switch `a5-sw-apron` (69.7, 36.0) are now in the
   gap / dead space: move them to the new wall's inside face (x about 67.65) at the same z. Report every new spot.
4. **Closed routes (Q24).** The switchroom back door `A5-back` (A5-12, :308-313) locked for good; the north trench path
   (the lids x 46.15-57.85, z 46.6-47.75, A5-8, :319-321) closed at both ends with fencing to the wall top; the beam
   panel `panel-a5` (:86) moved out of jam reach from the apron (no line from `A5_PANEL_JAM` or any apron spot reaches
   it; inside the switchroom or on its west face), so the beams are beaten only by the throw and switched off by the
   release.
5. **Guards: two.** `a5-patrol` as built. New `a5-watcher`: a static `grunt` at about (46.5, 32.0) beside the release
   kiosk, facing east down the floodlit strip (yaw PI/2); set the exact post so that with the flood on he sees a player
   crossing the strip in front of the kiosk, and with the flood jammed he does not; the landing (56, 36) in pen 2's lee
   stays dark to him. Both in `part.bay.squad`. **Fallback (BRIEF A6):** if the lead's answer below says G-A6's noise
   test came out silent, do not add `a5-watcher` (he moves to A6) and drop him from station 13's `guards`.
6. **Throw (station 13, `throw`, 9 s).** As built: `laser-a5`, the flood jam (group 52, 5 s held + 4 s off), the release
   `sw-a5-release` / `g-a5-release`. A beam broken on station 13 is a `seen` retry (lead: the set calls R1's
   `stationRetry(13, 'seen')`).
7. **Stations.** `part.bay.stations` = STATIONS section 3's A5 block, verbatim (station 12's marks at x 67.0).
8. **Done flags (section 8).** Pass zones `a5-apron-e` [65.85, 24.3, 67.85, 47.7] both and `a5-apron-w`
   [58.2, 24.3, 62.35, 47.7] both, floorY 0. `a5-release` exists.
9. **LANTERN's lines (section 6).** `bay.radio` rows `retry:a5-throw` and `retry:a5-throw:timer`, verbatim (11 and 12
   cannot fail).
10. **Objective lines.** Replace `part.objectives` for A5 in the replan file: one line per station plus the holding-room
    line, each naming what and where (at most `COURSE_TEXT_MAX`), no "fail".
11. **Drill hook (lead decided ~23:10):** no timer starts from a gate opening. Write station 13's jam window and the beam trip (a broken beam on station 13 = retry 'seen') as runtime code in your
   own stub `src/game/course/replan/a5Ticks.ts` (R1 created it and registered it in `REPLAN_TICKS` in
   `src/game/course/replan/ticks.ts`): a `StationTick(h, dt)` that reads `h.live()`, `h.flag(id)`, `h.playersIn(zone)`,
   `h.now()` and calls `h.retry(n, 'timer' | 'seen')`; allocation-free (no closures or arrays per frame). Edit no other
   tick file and not `ticks.ts`. Add `a5Ticks.ts` to this brief's file list and unit-test the tick with fake hooks.
12. **Fallback answer (lead fills after G-A6's noise test):** <watcher in A5 (default) / moves to A6>.

## Lead decisions that touch A5 (j14-wave2-notes)
- Trench ~1.1 m west so `a5-apron-east` is 2 m (built here as 1.15 m: x 62.35-65.85); the graph's area after the build (G1).
- `a5-gap` `size` still 1 m in graph.json, area 1.4 (G1 fixes); the `a5-lee` box was G0's guess
  [54.35, 34.5, 57.85, 40.5]: report the lee's free floor box from the built set.
- Station 13's thrown player's mark is in the lee, past the beams (SA5).

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run node at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); light bake timeout 15 min.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a5Substation.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a5Substation.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a5Substation npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
`tests/ctcourse/replan/a5Substation.test.ts` pins: the replan set's `GREY`; `checkSetPart` clean; squad = patrol + watcher;
stations equal STATIONS' A5 block; marks have standing room (station 12's 0.85 m off the wall face); the gap 1.4 m clear;
on the nav, from the gap with every gate shut nothing west of the wall is reachable; with the wicket open the only way
west of the trench is the footbridge (open) or the plates, and nothing on the trench's west face is a ledge or lip
reachable from its floor; the panel out of jam reach from every apron spot; the watcher sees the lit strip with the flood
on and not with it jammed, and not the landing; the moved bulkheads and switch on the wall's inside face; the retry lines
exist and fit.

## e2e (write, do not run: "pending PC run")
`scripts/e2e-ctcourse/replan/a5Substation.mjs`: both players on host and client: wicket stand-in, ladder down, footbridge
stand-in, the throw with the flood jammed, the release; one flood-timer retry and one beam-trip retry each land both at
station 13's marks (B in the lee) with 11 and 12 still done.

## Done looks like (PLAN set slices)
A5 on `ctcourseReplan`: the 6 m wall with its 1.4 m gap and wicket (11), the 3.5 m trench at x 62.35-65.85 with footbridge,
plates and gantry (12), the throw with two guards (13), the closed routes, moved pieces; new `GREY` and light file; the
built yard unchanged; the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master; PR body: flag `marlowReplan`,
owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a5 <sha>`)
Built, numbers used (wall, gap, trench, footbridge, plates, gantry, drums, bulkheads, switch, panel, watcher post, the
lee's free box: the G1 numbers), files, commits, tests with counts, e2e "pending PC run", deviations, what Michael
should try.
