status: open

# J14 Marlow re-plan, slice G-A1A7: A1 the Gate and A7 the Data Hall on the re-plan (PR 4)
Lead: Night Shift | Marlow Build. Brief: Opus (J14 wave 2). Builder: Sonnet 5.5 (cloud or desktop). Est. 600 lines.
Queue copy: cloud-queue `briefs/j14-g-a1a7.md` (the lead copies this file there).

## Base and branch
- base: feature/marlow-replan-base at <sha the lead fills> (S0 + R1 merged, both checker-passed).
- new branch: `feature/marlow-replan-g-a1a7` (desktop worktree `C:/NightShift/Mobile-Coop-marlow-replan-g-a1a7`).
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-replan-g-a1a7`. Commit and push
  each finished step (`git add <files>`, never `-A`). No stash, reset, rebase, merge or force-push.

## Read first (on the base)
- `git show origin/master:CLAUDE.md`, `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" if cloud).
- `docs/marlow-replan/PLAN.md` section 2 (:52-137, incl. "Guards per lesson": A7 +1), "Set slices" (:413-432, the
  G-A1A7 row); `BRIEF.md` A5, A11.
- `docs/marlow-replan/STATIONS.md`: sections 1-3 (A1 and A7 blocks), 5 (`a7-pod`: no `drillS`, SA6), 6 (stations 1, 2,
  17), 7, 8 (`a1-top1`, `a1-top`), 9 (`a7-cam1`, `a7-cam2`, `a7-tech`, `a7-tech2`, the A1 checker), 10 (SA6, SA11, SA13).
- `graph.json` spaces `a1-*`, `a7-*` and links; `replan-plan.svg` (1 m = 7 px; x = (px - 34) / 7, z = (642 - py) / 7):
  the A7 screen on x 76, z 56-66.
- Code: `src/game/course/stationDef.ts`, `replan/index.ts`, `replan/a1Gate.ts` and `replan/a7DataHall.ts` (S0 stubs),
  `ctcourse.ts` (`CtcourseOpts`), `types.ts`, R1's station code, `tests/ctcourse/replan/variant.test.ts`, the built
  `tests/ctcourse/a1Gate.test.ts` and `tests/ctcourse/a7DataHall.test.ts` (the patterns to copy).

## Only these files
- `src/world/maps/ctcourseSets/a7DataHall.ts`: only a third parameter `opts: { replan?: boolean } = {}` on
  `buildA7DataHall` and `if (!opts.replan)` guards round the lobby east wall pieces the screen replaces (A7-5,
  `:275-291`).
- `src/world/maps/ctcourseSets/a1Gate.ts`: no change expected (A1 needs only `part` amendments); if one is needed, only
  the `opts` parameter and a guard.
- `src/world/maps/ctcourseSets/replan/a1Gate.ts`, `replan/a7DataHall.ts`: everything new, by building into `b` / `kit`
  and amending `part`.
- `tests/ctcourse/replan/a1Gate.test.ts`, `tests/ctcourse/replan/a7DataHall.test.ts` (new),
  `tests/ctcourse/replan/a1Gate.light.json`, `tests/ctcourse/replan/a7DataHall.light.json`,
  `scripts/e2e-ctcourse/replan/a1Gate.mjs`, `scripts/e2e-ctcourse/replan/a7DataHall.mjs` (replace S0's stubs),
  `changes/feature-marlow-replan-g-a1a7.md`.
- Nothing else (not PLAN / BRIEF / STATIONS / graph / svg, `replan/index.ts`, `ctcourse.ts`, `types.ts`, `facility.ts`,
  `src/game/**`, any built test, light file or e2e module). Need more: `status: blocked <what and why>`.

## Flag off = nothing changes
The built `ctcourse` stays byte-identical: the built A1 and A7 tests (`GREY`) and every built light file unchanged and
green; `e2e-coop.mjs`'s Marlow guard block keeps the A1 checker.

## Build A1 (stations 1, 2; guards 0; nothing can fail)
1. **The checker stays** `a1-checker`, seated, passive, blind and deaf, in `part.bay.squad` (BRIEF A11; `e2e-coop`), on no
   station's list. No guard.
2. **Wall top flags (section 8).** Pass zones `a1-top1` [11.7, 2.3, 12.3, 19.7] any and `a1-top` (same box) both, floorY
   4.4. Station 1 (boost) ends when one player is on the wall top, station 2 (human ladder) when both are.
3. **The wicket is a way back only (graph).** Today B drops into the yard and unbolts `g-a1-wicket` for A, which skips the
   ladder. On the re-plan the wicket cannot open until `a1-top` is set (both have been on the wall top): amend its gate in
   `part.bay.gates` with the base's gate kinds (a flag condition on `a1-top` plus the yard-side bolt); after that its push
   bar is the way back. Keep the role claim (the striped mark takes A).
4. **Stations.** `part.bay.stations` = STATIONS section 3's A1 block, verbatim (`retry: 'none'`).
5. **Objective and radio lines.** Replace A1's objectives in the replan file: the boost at the striped mark (one on the wall
   top), the human ladder (the one on top hangs, the partner climbs), both into holding room one; each names what and
   where, at most `COURSE_TEXT_MAX`. Replace the radio line that says "open the gate for your partner". No retry lines
   (nothing can fail).

## Build A7 (station 17; guards 2, cameras 2)
1. **Glazed lobby screen (PLAN section 2).** The lobby's east wall (x 76, z 55.95-65.85) becomes a full-height glazed
   screen to the slab (`kit.glass`: glass stops guard and camera sight) with the hall door `A7-hall` kept; guard the
   built solid slabs of A7-5 it replaces. The plant door and corridor unchanged; the split is kept (one route).
2. **Guards: two, both spawned in the hall (`a7-hall`).** `a7-tech` as built (rows 1-2). New `a7-tech2`, a `grunt` whose
   round runs from the hall's east side across the pod approach and back, in view of the hall leg through the cage mesh
   (PLAN section 2, STATIONS section 9), never entering `a7-pod`'s box [96.15, 55.95, 99.75, 67.85] (the pod stays a quiet
   connector). You draw the route inside the hall's G0 boxes ([76.15, 55.95, 86, 71.75], [86, 55.95, 96, 58.8],
   [86, 66.05, 99.75, 71.75]) so that: (a) for part of his round he can see the pod-leg player's approach (the pod's doors
   or the corridor's east end) and (b) the hall-leg player can see him through the mesh; with (a) and (b) each partner
   covers the other. Report the route, waits and faces.
3. **Station 17 (`synced_hack`).** As built: terminals `a7-t1` / `a7-t2`, scanner pair `sc-a7`, cage doors, `a7-sync`; a
   hack miss resets the terminals in place (no retry, no `drillS`: SA6, REPLAN A7); seen = station retry.
4. **Stations.** `part.bay.stations` = STATIONS section 3's A7 block, verbatim (guards `a7-tech`, `a7-tech2`).
5. **LANTERN's line.** `bay.radio` row `retry:a7-split`, verbatim.
6. **Objective lines.** A7 lines may stay as built; any line you change goes in the replan file, naming what and where.
7. **Lamps.** No circuit change in A1 or A7.

## Lead decisions that touch A1 / A7 (j14-wave2-notes)
- Retry: R1's host `stationRetry(n, cause)` (seen); a retry resets the listed guards plus any guard alerted in the bay.
- Marks by role (A1: A the booster at the mark; A7: A the hall leg, B the pod leg).

## Tests (unit only; no e2e, no GPU, no `npm run check`)
Desktop builders run node at BelowNormal
(`powershell -NoProfile -Command "(Get-Process -Id \$PID).PriorityClass='BelowNormal'; <cmd>"`); light bake timeout 15 min.
```
npm run typecheck:fast
npx vitest run tests/ctcourse/replan/a1Gate.test.ts tests/ctcourse/replan/a7DataHall.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourse/a1Gate.test.ts tests/ctcourse/a7DataHall.test.ts tests/ctcourse/facility.test.ts tests/marlowLightingCircuits.test.ts tests/courseStation.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a1Gate npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan CTLIGHT_WRITE=a7DataHall npx vitest run tests/ctcourseLight.test.ts
CTLIGHT_VARIANT=replan npx vitest run tests/ctcourseLight.test.ts
npx vitest run tests/ctcourseLight.test.ts
```
Pins: each replan set's `GREY`; `checkSetPart` clean; A1 squad = the passive checker only and no station lists him; A1's
wicket shut until `a1-top` (a unit course run: B alone on the wall top cannot open it); A7 squad = the two technicians,
both spawned inside the hall boxes, `a7-tech2`'s route never in the pod box and the two sightlines (a) and (b) of step 2;
the screen glazed full height with the hall door; stations equal STATIONS' A1 and A7 blocks; marks have standing room
(A1 B at 4.4 on the wall top); the retry line for 17 exists and fits.

## e2e (write, do not run: "pending PC run")
`replan/a1Gate.mjs`: both players on host and client: boost, ladder, drop into the yard, the wicket opens only after.
`replan/a7DataHall.mjs`: the split, both technicians, the synced hack; one seen retry lands both at station 17's marks.

## Done looks like (PLAN set slices)
A1 on `ctcourseReplan`: the checker kept passive, stations 1-2, no fail, the wicket a way back only. A7: the full-height
glazed screen, the split kept, 2 guards both spawned in the hall with two-way cover, station 17 (`retry: 'station'`, hack
miss resets the terminals). New `GREY`s and light files; the built yard unchanged; the tests above green.

## PR
No PR from the builder. The lead opens it to master only after S0 and R1 are on master; PR body: flag `marlowReplan`,
owner Night Shift | Marlow Build, switch-on 2026-10-29.

## Report (append below, then `status: done feature/marlow-replan-g-a1a7 <sha>`)
Built, numbers used (the wicket's gate, `a7-tech2`'s route), files, commits, tests with counts, e2e "pending PC run",
deviations, what Michael should try.
