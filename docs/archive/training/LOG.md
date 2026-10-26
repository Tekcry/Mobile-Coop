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

- T5 checker fixes (2026-10-13, cloud): B7's ground-floor east open window z 13 -> 22.5 (the lobby; at 13 it opened onto
  the timber stair); B8 lanes 5 and 6's far stands 50 m -> 45 m (x 58 -> 53: inside the scaffold and the CS cage);
  the scaffold z 19..23 -> 18..22 (1.35 clear of CS's door, the floor side); B9 stair-tower flights run 5.0 -> 4.7
  (going 0.36; far landings 1.35 deep); B-1 south walkway joined to the west / east walkways (no 0.15 slot); the staff
  tunnel door and B9-REINF from the south wall (x 39.4, inside the SE tower's flight 1) to the east wall at z 5..6.2
  (B9-REINF at 43.2, 5.6).

### Spec change requests (T5)
- B7: the inverted takedown is over the annex roof's edge, not over the cavern floor (A40); B7-O's window stop and
  B7-R's ledge-pull stop move to the built window and parapet (A40, T7a routes).
- B8: CS is a convenience gate (A43): the lead can always climb down the RT ladder; the catwalk rail is vaultable.
- B9: B-1 / B-2 / cabin depths and the stair towers as built (A39); the bridge reaches the north wall.
- Course: B6 exits into A6; the course ends in L9 (A41).

T5 checked: PASS after 1 fix round (d6cbef8). In-game nav: every B7-B9 storey reaches its floor within findPath's
20000 limit (bridge 17954); guards' 3000 limit carried to T7b.

## Block B end (2026-10-13, cloud)
Full `npm run e2e` (E2E_JOBS=2, 1968 s wall): KNOWN FLAKY e2e-darkness, e2e-netmove, e2e-weapons-carry; e2e-course
(host lock sync 821 ms vs 500 under load), e2e-mouse, e2e-stealth, e2e-feedback failed on timing under load and passed
serially (217 s, 15 s, 38 s, 21 s); e2e-kestrel and e2e-camera-bounds level U are the kestrel-owned pre-existing
failures. Perf trend (software GL): sim p95 3.5 ms (T0 3.9), anim 0.072 ms/char (T0 0.105), alloc 11163 KB/s (T0
11163), draws 44, tris 0.14 M: no rise. Self-review: docs/training/BLOCK-B-REVIEW.md. GPU rows: pending PC run.
PAUSED for Michael's walk (D27): docs/training/WALK.md.

## Walk 1 (2026-10-14)
Michael walked B1-B2 and stopped: redesign needed. Notes in WALK-NOTES.md; decisions D40-D48; SPEC course rules R1-R8
(linear and unavoidable, together unless a drill needs a split, one shared course, compact rooms, objective list always on
screen, automatic airlocks with a marked pad, dark shell with glass and LED fit-out, everything else kept). Bugs: no
client prompts, client passes his locked door, airlock rear door stayed open, no Cycle on the client (airlocks become
automatic). Fix 3c89308: dev server served index.html for shaders (black view) - PBR, shadow, depth and post shaders now
registered in src/core/babylon.ts. New steps T5b (fixes), T5c (BAYS v2), T5d-T5g (rebuild), then walk 2.

## T5b walk-1 fixes (2026-10-14, cloud)
Automatic airlocks with an inset floor pad (AIRLOCK_PAD_INSET 1.0) and a rear-doorway hold; Cycle device removed from
all maps and courselab; rear door locks and shuts at cycle start (setLocked only set a flag); client prompts fixed (map
doors filled MAX_ITEMS 48 first: course items now sent first, MAX_ITEMS 128, MAX_DOORS 256); client shuts host-locked
rear doors; objective list always on with airlock status. New e2e-bunker (B1, B2, two pages). Checker rounds: FAIL
(e2e-bunker walk pinned by the host's hit capsule; forced close on every locking door), FAIL (pad edge on the door
plane), PASS. Assumptions A44-A48. Michael answered D49: partners block each other (follow-up T5b2). Flakes under
E2E_JOBS=2 (e2e-feedback, e2e-coop, e2e-netmove, e2e-course, e2e-bunker join) passed serially: REVIEW-NOTES.

## T5b2 partners block each other (2026-10-14, cloud)
D49 (Michael): partners block each other. New src/net/partnerBlocker.ts: a capsule in G.PARTNER (1<<11, player-only)
per partner on host and client, all co-op modes (A49; TDM team-mates too, PvP opponents unchanged), parked while
down / boost / human ladder and for 3 frames after a jump; course partner hit boxes bullets-only. SnapshotBuffer
(src/net/interp.ts) snaps teleports: > 2 m and > 25 m/s, or across a stall > 0.3 s landing further than
max(2 m, sqrt(2) * speed * stall) from the straight-line prediction. e2e-bunker: walk-into both ways, teleport-past
replay both ways. Checker rounds: FAIL (teleport sweep, flaky e2e), FAIL (stalled sprinter popped), FAIL (corner
during a stall popped), PASS. e2e-netmove cover-joints flake also fails at base: REVIEW-NOTES.

## T5c BAYS v2 (2026-10-14, cloud) - docs only, uncommitted at hand-off
BAYS.md rewritten as v2 under SPEC R1-R8 (v1 kept as BAYS-v1.md with a superseded note). New world offsets (0.1):
footprints B1 38%, B2 27%, B3 60%, B4 23%, B5 47%, B6 54%, B7 51%, B8 48%, B9 46% of v1. Shared rules in 0.2 (the line,
edges, catchers, passing widths for D49, objective lines), automatic airlock sheet (0.4), look kit (0.5). Every bay:
room / element table with "one at a time / side by side", an explicit objectives table, "R1-R8 check" and
"Unavoidable elements" tables. FEATURES.md: movement "who" both everywhere, objective-list row, gates row, section 11
redone. PLAN.md section 4: T5b-T5g rows. DECISIONS A50-A60.

### Spec change requests (T5c; D12, applied)
- B2: v1's twin lanes, glazed walkway and x 24 lever gates replaced by one lane of seven stations (D42, D43); each
  player vaults the open window and breaks one pane (A54).
- B3: v1's rappel / zipline split and fan-isolation split removed (both do both, A52); two rope stages (hoist rope to a
  mid landing, davit rope to the CR window); CR moved inside the shaft at 7.5; a fourth landing G4 for the corner kick;
  catch nets under the bar and the zipline; twin discharge ducts (A53).
- B4: cells 9 x 8; the Phase 5 elements moved off the line into a glass-screened bay (A55).
- B5: switch room inside the hall's east side; G2 walks 22 m to reset (was 40 m); G1 loop 36 s.
- B6: shared start through the air-handling room, supply duct and vent drop (both, A57); reception's inner door locked;
  the L-leg leads to the mantrap; B6-GM checks the locker-room door; B6-GR loop 39 s.
- B7: no split (A56); house 14 x 12 in a 30 x 30 cavern; routes rescaled (30-43 s).
- B8: 60 x 16; sniper scaffold and catwalk stair moved to the east end in the new frame.
- B9: well 32 x 31 with 6 m B-1 decks (2.5 walkway + 3.5 cabins), lobby 8 x 7; routes rescaled (42-44 s).

### T5c fix round 1 (2026-10-14, cloud) - checker FAIL, docs only
- B4: flush 2.4 `noLedge` screens where W1 meets VG and on W2's south edge, and on VG's cell side (closes the
  W1 -> VG -> C3 ladder and W2 -> C3 bypasses); R1 / R2 / Unavoidable rows updated.
- B3: landing edges G2-ZD are 2.4 screens (were balustrades); casing 4.6 above G1 (boost reach); return routes RL1
  (ML -> G5) and W5 (G5 -> NT1 -> G4) with one-way return gates; grille unscrew-only, louvre kick-only, both
  self-closing; the fence climbs both ways (A53, A61).
- B2: G1 / G2 edges screened, G1 ladder caged, pit floor -1.0, a sump under the portal sill (A51); RL2 2C -> G2;
  re-glazing practice panes (A54).
- 0.2: boost-reach rule, retry rule (A61), guard relief (A62), A50 single-file wording, R4 8-14 m with exceptions.
- B5-G1 route via (11, 7): 25.6 m, 38 s (cleared GEN-2). B6: stair-top landing over the manager's office to CR.
  B8: glass door from the firing line to the lanes. B1: L1-9 lit chokepoint restored. B4: A35 citation corrected.
- FEATURES: B7 bench / annex / sandbags, B9 rappel / zipline, B3 night vision marked route / optional; B6 beams runner
  P1; section 11 says only "each" objectives count.

### T5c fix round 2 (2026-10-14, cloud) - checker FAIL, docs only
- B3: G5's rope point and RP1's hoist beam now stand over a new rope net NR (x 4..6, z 0..3, y 10.5, ladder back to G5);
  ML moved to x 6..8.4 and is reached only by moving sideways on RP1 and unhooking; ML's lip 5.5 over NR with its
  screen (no boost). RL1 replaced by ML -> NR -> G5. CR window opens only to the rope kick (closed, `noLedge` from RF).
  CR substructure solid under x 12..14, z 0..6.5 and x 9..14, z 0..2.6; PP's north wall solid (no way round the fence).
- 0.2 / A61: every return gate is a one-way, single-occupancy turnstile (no tailgating forward); the room-graph test
  models it as a directed link and asserts no entry -> exit path uses one. B2 RL2, B3 W5 and NR -> G5 updated.
- B2: L1 and the portal sill raised 4.5 -> 5.0 (gap 2.2 unchanged; 0.5 step down onto the deck), out of boost reach
  over 2C's floor; Size row lists the 2B pit -1.0 and the sump -1.0; 2B-3 pit floor corrected to -1.0.
- A62: relief guards enter through each guarded bay's relief door (staff door locked to players, off the room graph,
  used only while neither player can see it). B5: HB1-HB4 and CG1..3 marked breakable.
- FEATURES: drill rule rewritten (a row is a drill only where its bay has an objective line; other placements are
  "placed"); every flagged row re-marked to match the v2 objective tables.

### Spec change requests (T5c fix round 2; D12, applied)
- Lamp-shot drills restored from v1 (FEATURES v1 "Shoot out lamps: B2, B5, B7, B8, B9 (both)", D47): B2 objective 4a
  (L2-G1..3), B7 16a (L7-F1..3 / L7-P), B9 2a (L9-P1..4 / L9-L1..2), each "each", with the 0.2 re-lamp rule.
- Whistle (v1 "B5, B7 (both)"): B7 gets a greyed "each" line until Phase 2 (B5's greyed line now says each).
- v1's rule made every "(both)" placement a drill; v2 marks these "placed" (systems or situations, not a verb a player
  can be asked to perform on demand): friendly fire, B9 ghost tier, ADS spread tuning, medkits (A4 / A6 / A8 / B9),
  enemy attacks in B9, the gadget wheel (used by B8's gadget lines), CCTV in B8 / B9, and the secondary placements of
  sleeping gas (B9 dog), EMP (B9), noisemaker (B7 skip), pistol secondary (B5 / B6 / B9), shock round (B8-E, B9),
  optic cable (B7), thermal (B9), back-to-wall / door peek / doors (B6 or B7), low-wall lean (B6). For Michael:
  REVIEW-NOTES.

## T5c BAYS v2 (2026-10-14, cloud)
BAYS.md rewritten as v2 (v1 kept as BAYS-v1.md): nine bays as compact linear chains (23-60% of v1 footprint), one
shared course for B2-B4, splits only B4 sluice / B5 breaker / B6 operator-runner / B8 overwatch / B9 keys, explicit
objective lines per drill (A47, A59), automatic airlock pads, glass / LED look, retry rule (A61 one-way turnstiles,
re-glazing, re-lamping), guard relief (A62), per-bay R1-R8 and Unavoidable tables. FEATURES drill rule: a row is a
drill only where its bay has an objective line. Assumptions A50-A65. Checker rounds: FAIL x4 (bypasses, retry dead
ends, FEATURES marks, boost reach, B3 rope stages vs the engine). After 3 fix rounds three B3 rope items stay open
(STATE "Blocked"); committed so T5d (independent of B3) can start; T5e closes them first. Boost-reach spots WJ1/WJ2
and B4 W2 are a question for Michael (REVIEW-NOTES).

## T5d rebuild Upper to BAYS v2 (2026-10-14, cloud)
bunkerUpper.ts rebuilt: B1 (0, 60) five rooms in a chain LL -> KR -> BR -> GR -> DS (216 m2), A1 (1, 54) with its
near door in the north wall and far door in the east wall, B2 (7, 49.5) one 52 x 9 lane of seven stations (468 m2), A2
(59, 50). Every Upper piece `noLedge`; the only lips are G2's hang point, L1 round the column and the portal sill.
Glass is invisible collision behind a visual frame; LED strips visual only; one work lamp per room / station.
Course stub: B1 / B2 no gates, objectives by name in BAYS order (`CourseDef.objectives`, T7a makes them drills),
elements still stubs flagged (`UPPER_ELEMENTS`: RL2 turnstile, re-glaze, re-lamp, the DS switch). Interim passage
A2 -> v1 B3 (x 65..84, removed by T5e). Tests: R1 / R2 for B1 (nav: each door a cut, the run crosses every mark) and
B2 (nav keeps 21 cells apart; element links with anchor evidence; path in objective order; each element a cut), lips,
A51 boost reach, A26 glass, landing bands, R4 footprints. e2e-bunker: A1 coordinates moved; the client-use check now
takes card A (B6) because v2 B2 has no lever (same assertions: client use -> host gate -> client sees the doors
unlock). e2e-course: spawn bounds moved.

## T5e rebuild Shaft and Cistern to BAYS v2 (2026-10-14, cloud)
- T5c open items closed (REVIEW-NOTES T5e): HS walk-off screens, ladders out of the rope kick volumes, wording.
- B3 at (65, 46) against A2's east wall (the Upper interim passage and debug point B3-X removed); A3 at (69, 40); B4 v2
  geometry at the interim (93, 30) with a passage from A3 (A71); A4 unchanged. Manual lips only (RC, WJ1, WJ2, W1, W2,
  OP); objectives B3-1..21, B4-1..12 (SHAFT_OBJECTIVES); stubs flagged (SHAFT_ELEMENTS); one work lamp per room.
- Tests: room-graph R1 / R2 for B3 and B4, nav cell separation, exact anchor set per rebuilt bay (B2, B3, B4), rope kick
  volumes, the HS screens.

### Spec change requests (T5e; D12, applied)
- B3: RP1's retry from ML is a one-way return gate in ML's new full-height west screen (was an open edge into NR).
- B3: RF 7.5 -> 4.5 (the window from RF out of boost reach while the pane is a breakable stub).
- B3: CR's door onto ZD is plain (v1's bolt gone: CR is reached only through the window); the fence is one anchor
  (north side; east and south are the substructure and PP's wall); two duct anchors.
- B4: W2's 4.4 part screened (A73).
Final T5e checks: code and tests PASS (rope catchers test; RP2 / screens moved after a pit push-out skip); BAYS B3 / B4
text synced to the build over three docs rounds. Last finding (A4 wall medkit missing from buildAirlock) moved to T5f
task 1a; ML's waiting spot overlaps the open hatch until T7a's lid (nuisance, not a skip: REVIEW-NOTES).

## T5f rebuild Plant to BAYS v2 (2026-10-14, cloud)
B5, A5, B6, S6, A6 rebuilt in `bunkerPlant.ts` (v1 replaced); B4 / A4 at (66, 14) / (70, 8), the T5e interim passage,
B4-X and its test rects removed (A71 closed); A4 wall medkit (A4-MED). B5: EL (4.4) -> stair -> hall -> A5 (mains gate);
B6: RC -> AH ladder -> duct -> vent drop -> RE (REX) -> CO -> split -> MT -> SV -> keypad -> S6 -> A6. Course data:
objectives B5 9 / B6 24 by name (PLANT2_OBJECTIVES), element flags (PLANT2_ELEMENTS), gates kept (S6-top bolt side now
north), A4 / A5 / A6 boxes at v2. Relief doors (A62) as `RELIEF_DOORS` (visual leaves, no anchor). Interim A74: v1 Deep
moved by (+17.5, -29). Numbers moved within windows: A75 (BAYS rows synced). Tests: R1 / R2 graphs for B5 and B6, nav
"cells apart" with doors shut, exact anchor sets, lips (13, all manual), no split gap, duct, S6 nav, relief doors.
### Spec change requests (T5f)
- None to routes, gates or guard jobs. EL's south edge 2.4 screen instead of a balustrade (R2), listed in REVIEW-NOTES.

T5f checks: FAIL (voxelFit limit derived from bounds, stale BAYS rows, B6 built 6.4 clear vs 4.6), fixed (fixed
temporary limit 186 x 168, B6 four roof slabs 4.6 / 6.4 with closed edges), then PASS bar one BAYS row (office z),
fixed by the orchestrator. D50 (Michael): walk 3 at Block C end and a movement re-check at TM.

## T5g rebuild Deep (cloud)
B7 (30 x 30 cavern, house x 8..22 z 8..20 with the office behind glass, annex, main 4.9, bench, sandbags, store door =
A7 near), A7, B8 (60 x 16: FL glass screen and door, lanes / SH, RT, CW, CS caged x 50..60, SP), A8 (medkit), B9 (well
32 x 31 with towers 8 wide, B-1 / B-2 / bridge, cabins, NW co-op lip, rope, zipline, tube duct, lobby) and L9 at the
BAYS v2 offsets; A74 interim undone; BUNKER_BOUNDS x -1..142, z -71..76; voxelFit 166 x 162. Objectives by name
(DEEP_OBJECTIVES), element flags (DEEP_ELEMENTS), relief doors. Numbers moved within windows: A76, A77 (BAYS rows synced).
Tests: R1 / R2 graphs for B7 / B8 / B9, nav cells apart with doors shut, exact anchor sets, lips, no split gap, A26
glass, B9's rope and zipline in 'rope catchers'.
### Spec change requests (T5g)
- None to routes, gates or guard jobs.

## Walk-2 stop (2026-10-14, cloud)
Full `npm run e2e` (E2E_JOBS=2, 2590 s wall): KNOWN FLAKY e2e-darkness, e2e-netmove; e2e-bunker (client join timeout),
e2e-stealth (look input), e2e-feedback (free camera 0.42 m) failed under load and passed serially (199 s, 40 s, 24 s;
netmove 138 s); e2e-kestrel and e2e-camera-bounds level U are the kestrel-owned pre-existing failures. Perf trend
(software GL): sim p95 3.4 ms (T0 3.9), anim 0.0835 ms/char (T0 0.105), alloc 11156 KB/s (T0 11163), draws 41, tris
0.14 M: no rise. GPU per-bay shots: pending PC run. WALK.md rewritten for walk 2. PAUSED for Michael's walk 2.
