# Training run - log

One short entry per step: what changed, numbers, commit. Spec change requests go here too, under the step that made them.

## Design (2026-10-13) - 6300300
SPEC, FEATURES, BAYS, PLAN, DECISIONS written in a cloud design session from Michael's answers D1-D12.

## Run files (2026-10-13)
BRIEF, RULES, STATE, LOG, PC-PASS, REVIEW-NOTES and steps/T0-T9 written for the local run.

## Scope answers (2026-10-13)
Michael's answers D14-D30 applied: art layer now (T9a, T9b), beauty pass later (SW-6B); Blocks A-B now, C-D after
locomotion step 20 is merged (TM); pause after Block B for his walk (T5b); full tutorial with markers (E11), mandatory
drills ticked per player with no skip path (D30); bay select once reached; dev solo flag; co-op lobby only; desktop
only; drills may force takedowns and combat (E4, E12); lethal rated down. New steps T1c, T5b, TM, T8a / T8b, T9a / T9b,
T10.

## Scope answers round 2 (2026-10-13)
D31-D38: no penalty for kills or forced takedowns in the drill bays; B9 ghost tiers (Ghost / Silent / Loud) with
overlapping coverage and two sync moments (BAYS B9 "Ghost plan"); first run 45-60 min; the bot playable as P2 from the
debug menu (T8c); drills kept after a restart; LANTERN voices the steps; friendly fire on.

## T0 facts and baseline (2026-10-13, cloud)
Baseline: check ok (0 lint errors / 38 warnings, 1085 tests, build ok); smoke ok; perf trend sim p95 3.9 ms, anim
0.105 ms/char, alloc 11163 KB/s, draws 41, tris 0.15 M (software GL). Facts: docs/training/T0-facts.md.
Number-only BAYS fixes: B3 RC casing top 4.0 -> 4.3 above G1 (split jump-up window 3.95-4.75; "8 m tall" was a
contradiction, now 4.3) and the bridge steps down 0.3 to G2; B3 rope 15.4 to y 2.0 -> 17.4 to the floor (the rope
bottom is the exit floor); B3 zipline end y 2.6 -> cable end y 4.5 over WP floor 2.6 (body hangs 1.9); LANDING ref
movement.ts:203 -> 204. Step files: T1b, T3, T4, T6, T7b line refs and numbers updated.

### Spec change requests (T0)
- B6 supply duct entry: the grate at 3.4 is out of reach from A5's floor (entry needs the grate within 1.4 of the
  feet). Fix: a plant platform with feet at 2.2 in A5's service passage (T4). Applied in T4's step file.
- B3 discharge duct is one-way: only the entry grate is kicked or unscrewed, the exit opens itself. The unscrew / kick
  drill sits at the pit-end entry; the corridor grille is the exit. T3 builds it so.
- Course framework (T1b): the host does not pass which player used an interactable; bolt and pair gates need the
  RemotePlayer passed to onUse (small coopHost change). S1 cameras need the course mode to hook `security.onEvent`.
  Radio needs its own HUD channel (named speaker, shown with subtitles off). Lights and door locks need sync (new).

## T1a course framework logic (2026-10-13, cloud) - 5e3cb1c, f2cbcff, 5e81e9f
src/config/course.ts, src/game/course/courseDef.ts (types, 10 gate kinds, validateCourse), courseState.ts (airlock
phases, gates, drills gate the airlock, startAt, restart keeps drills, pack / apply), tests/course.test.ts (1114 tests
total). Check: 2 fix rounds (solo flag reduced to doubling ticks; allocation-free queries; external flags; cached
airlock refusal). Assumptions A1-A10. Note for T1b: hasFlag / hasFlagFor build strings: do not call per frame.

## T1b course mode, co-op sync, courselab (2026-10-13, cloud) - d4c00ac, fd9d25a, c81124a
CourseMode (host state, gate devices, run-time door / anchor locks, squads per bay, restart at the checkpoint, LANTERN
radio held while alerted, verb log, `window.__course`); net mode 'course' (2 players), `course` and `ctick` messages,
PROTOCOL_VERSION 2 -> 3; light state synced to clients; friendly fire with co-op rules (D38); courselab debug map;
e2e-course (REQUIRED). Dev solo flag per A6 (D21). Assumptions A11-A18 (A15 resolved). Check: 1 fix round (switch
sync on restart, cached remote list, e2e waits). e2e-netmove failed as KNOWN FLAKY in 2-job runs, passed serially.

## T1c tutorial HUD, drills, results, bay select (2026-10-13, cloud) - 8355897, 2b18c22 + marker fix
drillDetect (single verb source, edge-triggered), courseFeed, courseHud (P1 / P2 ticks, step text, toasts, LANTERN),
markers (setting `gameplay.courseMarkers`), courseRating (B9 tiers), course record `kv` `course:fallow` (no
SAVE_VERSION bump: existing store), bay select in the lobby, Finish device, host-resolved client verbs, radio on the
client. Fixed a T1b bug (ctick not routed by session.ts). 1143 tests. Assumptions A19-A24. Check: 1 fix (marker point
scratch). CHANGELOG 3.7.0, TESTING 3.7.0 (desktop). PC-PASS rows 7-8 added.

## Block A end (2026-10-13, cloud)
Full `npm run e2e` (E2E_JOBS=2, 2249 s wall): KNOWN FLAKY e2e-netmove, e2e-coop, e2e-darkness; e2e-stealth and
e2e-feedback failed on look / free-camera input timing under load and passed serially (40 s, 22 s); e2e-kestrel and
e2e-camera-bounds level U are the kestrel-owned pre-existing failures (RULES). Perf trend (software GL): sim p95 3.75
ms (T0 3.9), anim 0.088 ms/char (T0 0.105), alloc 11882 KB/s (T0 11163, +6%, over the 11520 budget on this VM: trend
only, recheck on the PC), draws 43, tris 0.14 M. No sim / anim rise. GPU items: pending PC run.

## T2 Upper level geometry (2026-10-13, cloud)
`src/world/maps/bunker.ts` (MapDef `bunker` "Fallow": course + sandbox, navLayers 5, lightLevel 0.05, no sun; course
stub), `bunkerUpper.ts` (B1, A1, B2 both lanes, A2 at y 16; `BUNKER_LIPS`, `B2_METRICS`), registered in index.ts (not
listed). `scripts/plan-svg.mjs` (headless via Vite SSR) writes `test-results/training/plan-<y>.svg`.
`tests/bunkerMap.test.ts` (8 tests: registration, spawns, course validates, no Upper split gaps, lips only from
BUNKER_LIPS, step / vault / mantle, pipe reach, hang-drop, L1 / L2, gap 2.2, pad bands). Assumptions A25-A28. BAYS
numbers moved within their windows (logged in A27): L1 column x 35 (-1), P x 38.85-42, cross wall x 44.2. Headless boot
`?autostart=bunker&mode=course`: player at (2, 16, 84), no console errors.
Check fix round 1: L2 / P moved 0.4 west (L2 x 37.85-38.45, P 38.45-42) so the 2.2 gap is hand to hand (lip ends 1.8
apart; the engine's jump from the stub reaches L2 within 2.5); glass walls are invisible full-height collision boxes
with a visual frame, no fence anchor (A26 corrected); Lane S ladder tops out on a ladder-head landing (x 30.2-31.0, z
35-36, y 4.5) whose hang-only lip (`LHS`) chains into L1 (Lane N's downpipe steps sideways onto L1: no change);
e2e-course boots `?autostart=bunker&mode=course` (spawn on y 16, no errors; `mode=course` is not an autostart flag, so it
boots sandbox: the course itself starts from the co-op lobby). Tests 8 -> 11.

### Spec change requests (T2)
- B2 gate: the walkway's east-end doors into each lane (x 45.4-46.6 on z 15 / z 21) are locked at start and open with
  that lane's x 24 gate lever (a second lever gate on the same switch). Unlocked, a player could enter a lane's east end
  from the walkway and reach its second half through the open window at x 44.2, bypassing the gate. Route unchanged
  for a player who plays the lane; the walkway to A2 stays open.
