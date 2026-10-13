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
T2 checked: PASS after 1 fix round (dd966fd: gap grip to grip, exit doors gated, glass not climbable, ladder-head
landing) and the walk URLs (ba09b54: `mode=course` autostart, solo and two tabs over net=local, A29).

## T3 Shaft and Cistern geometry (2026-10-13, cloud)
`src/world/maps/bunkerShaft.ts` (B3 The Intake, A3, B4 The Cistern, A4 on the Plant level; `PLANT_LIPS`,
`BUNKER_COOP_LIPS`, `B3_METRICS`, `B4_METRICS`, `plantAt`), called from bunker.ts; A2's east wall is now B3's west wall;
the course stub runs B1-B4 (B2 exits A2; B3: isolator pickup, fence x4 and duct anchorLocks, CR bolt; B4: inspection
bolt, sluice timedHold, outlet ladder pickup + anchorLock; Finish in A4). Tests 11 -> 23 in bunkerMap (engine-function
proofs: split jump-up via `findJumpTarget` from the split pose, WJ straight and corner via `wallJumpReach`, rope bottom
on the floor and the window-kick check along the rope, zipline entry / end / body clearance, duct entry and exit,
every ladder's top step-off on a floor, co-op lips). Shared tests: voxelFit height bound for the bunker 40 (A34).
Number changes within windows: G1 north arm 2.8 deep, duct 4.15 m, A4 floor 10.4 (A30-A33). Assumptions A30-A34.
T3 fix round 1 (checker FAIL): W2 lowered to 4.25 over C2 / C3 (A35; `B4_METRICS.w2`, sluice lintel; the gallery step
up is 0.15); the overflow channel block now ends at local z 8.5 (was 11) so its split's jump-up (window 3.95-4.75)
finds no W2 lip; the 'B3-RC' debug point moved to local x 8.5. Tests 23 -> 26: the human-ladder grip reaches W2
(teamController runTop rule), no split pose jumps up onto a co-op lip, B3-RC offers the split facing its yaw.

### Spec change requests (T3)
- B4 human ladder vs W2 (applied in fix round 1 as A35: W2 at 4.25; was NOT applied): the human ladder reaches a lip at most 4.3 over the floor
  (`TEAM.ladderGrab` 4.1 + 0.2), W2 is 4.4. Options: W2 at 4.25-4.3 (breaks level-design 11.3's 4.3 floor / the +0.5
  solo margin) or the engine's human-ladder reach (a tuning table: Michael).
- B3 fan pit: a mesh hood over the fan guard (the zipline crosses the pit; a drop-in would be a softlock while the
  fence is locked); the duct and every fence side are locked until the isolator; CR's door is bolted from inside.
- A4's floor at the outlet platform (y 10.4): T4 builds B5's entry landing to meet A4's far door.

T3 checked: PASS after 1 fix round (408f27d).

## T4 Plant geometry (2026-10-13, cloud)
`src/world/maps/bunkerPlant.ts` (B5 Standby Plant, A5 and its service passage, B6 Mock Site, S6 Stair 6, A6;
`B5_LIPS`, `BUNKER_DEVICES`, `B5_METRICS`, `B6_METRICS`, `S6_METRICS`, `S6_RECT`, `B5_GROUPS`, `plantAt2`), called
from bunker.ts; the floor-dressed pieces (B4 sump, B5 trench floor, S6 / A6 floors, A6 roof) are built last
(`buildShaftFloors`, `buildPlantFloors`, A38). Course stub B1-B6: B4 exits into A4; B5 mains gate (group `B5-mains`
51, MB a `switches` entry in SR, the B5 work lamp on it) on A5-near; B6 card pickups -> flag gates RD1-RD4, keypad
keys 1-3 (2 sets `exit-code` for B6-exit), mantrap egress and records exit button (pickups), S6-top bolt from the B6
side; Finish in A6; airlocks A5, A6 (A37). Hide spots (8), BUNKER_DEVICES mount points (cameras with visual fixtures,
SD, PN, FLT, PC, WB, RD1-4, IR1, beams, PIR, KP, A6 medkit). Tests 26 -> 38 in bunkerMap (genset wall-jump via
`wallJumpReach`, no stray lip or split in the T4 bays, gallery hang-drop, trench section and panel openings, ladder
step-offs, landing at A4's door and its screen, duct entry from the platform and the ceiling exit roll over the desk,
mezzanine 3.6 and its stair, no windows or fences, S6 stairLayout and an analytic layered NavGrid path foot -> top).
Shared tests: voxelFit area bound for the bunker 164 x 160 (A36). Number changes within windows: S6 offset z -10 ->
-8, S6 mid landing 1.8 -> 3.0, B6 ceilings 3.5, SV x 6..16 / z 0..15 (A36). Assumptions A36-A38.

### Spec change requests (T4)
- A32 follow-up: B5's entry landing at local 4.4 (x 27..33, z 30..32) meets A4's far door (x 99.4-100.6, z 24,
  y 10.4); its own stair (24 risers) runs south to the floor. The cable gallery cannot pass the landing, so it ends at
  x 24 with its ladder at x 23.3 (was x 37 by SR): the breaker player's "leave SR by the gallery ladder" is now a
  13 m dash west along the north wall. A full-height mesh screen on the landing's west end: no free high route onto
  the gallery or the gensets (A36).
- B6: the corridor L leg dead-ends at z 2 (an open leg to the S6 exit would bypass the mantrap and the keypad); the
  exit keypad door is SV's nook west wall into an S6 lobby; RD3 sits in the mantrap's north wall off a vestibule open
  to CO (A36).
- B6 supply duct: A5's service passage is between B6 and B5 north of A5, entered from B6's reception, so the duct
  cannot skip A5's cycle; it reaches only records (the planned alternate route past RD1); records has an exit button
  (no softlock for a solo runner).
- S6: offset z -8 (top door in B6's west wall), mid landing 3.0 (stairs.ts rule).

### T4 fix round (2026-10-13, cloud)
- Nav seeds: `NavGrid` input `extraSeeds` and `MapLayout.navSeeds` (optional): the flood that drops unreachable cells
  also starts from each extra seed. Fallow seeds its debug points, hide spots and the B4 cells / gallery / outlet, B5
  floor / gallery / SR / fuel bay / stair pocket and the B6 rooms; other maps pass none (unchanged). Nav does not model
  doors (closed or locked): only static level pieces block it. e2e-course asserts A5 -> S6 and SR -> A5 paths.
- Mains gate: B5's work lamp (the only lamp on group 51) is `destructible: false, electric: false`: shooting it or an
  EMP no longer reads as mains off (the A5-near bypass).
- SR: a second plain door at the north end of the glazed west wall (local x 38, z 28.6..29.8) into the dark pocket
  behind the landing stair (x 33..38). Both SR doors open onto the same hall floor: no gate bypass (A36).
T4 checked: PASS after 1 fix round (1094b71: nav seeds per bay, mains lamp not destructible, second SR door). Note: two B6 nav seeds sit on desk tops (tiny unreachable islands, harmless).

### T5 House, Range and Plot geometry (2026-10-13, cloud; not committed by the implementer)
- `src/world/maps/bunkerDeep.ts`: B7 (cavern 44 x 40 x 10, the kill house with first floor 3.2, roof 6.4, parapet,
  hatch ladder, annex roof 3.2, doors front / back / side, 2 glazed + 2 open ground windows, the manager's window sill
  4.1, the water main, the bench and its ladder, sandbags, skip, three recesses, the store door = A7's near door), A7,
  B8 (benches, kit lockers, lane stands, penetration wall, barrels, lamp gantry, barricades 1.0 / 2.0, catwalk 4.0, RT,
  LD at x 9, CS caged and bolted, scaffold 3.0, cease-fire switch), A8 (medkit), B9 (plot floor, map table, stands,
  B-1 4.5 and B-2 9.0 with cabins, the bridge, SW / SE stair towers, the north-west co-op gap over a pier, the rope
  point, the zipline to the lobby, the message-tube duct, the lift lobby, L9 with the Finish), one work lamp a bay.
  Course stub B7-B9 with A7 / A8; `B4_COOP_LIPS` (bunkerShaft) and `BUNKER_COOP_LIPS` / `DEEP_LIPS` (bunkerDeep).
  Nav seeds on every Deep floor and storey; the two B6 seeds on the office partition and the records desk moved onto
  open floor. e2e-anchors covers `bunker` (sandbox).
- Number changes (within their windows): WM 4.6 -> 4.9 (a standing grab from the bench 1.9 and the annex roof 1.7;
  the drop onto B7-W 3.0, inverted over the annex roof 1.06); parapet 1.1 -> 0.9 (the ledge pull's victim 1.0 over the
  hanging feet, band 0.8-2.6); the B8 plywood 0.05 -> 0.1 (the 5 cm voxel grid); the scaffold z 20..24 -> 19..23; CS
  z 26..32 -> 24..30 with its landing z 30..32; WM runs wall to wall (x 0.5..43.5, BAYS 4..40) so the bench reaches it.

### Spec change requests (T5)
- B7: the inverted takedown is over the annex roof's edge, not over the cavern floor (A40); B7-O's window stop and
  B7-R's ledge-pull stop move to the built window and parapet (A40, T7a routes).
- B8: CS is a convenience gate (A43): the lead can always climb down the RT ladder; the catwalk rail is vaultable.
- B9: B-1 / B-2 / cabin depths and the stair towers as built (A39); the bridge reaches the north wall.
- Course: B6 exits into A6; the course ends in L9 (A41).

