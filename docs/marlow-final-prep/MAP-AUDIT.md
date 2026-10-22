# Marlow Yard (`ctcourse`) - map audit for marlow-final

Read-only audit of master af56ab43 (`C:/NightShift/Mobile-Coop-mf-read`), 2026-10-23. Sources: `src/world/maps/ctcourse.ts`
(643 lines), `ctcourseBunker.ts`, `ctcourseVariety.ts`, `src/game/course/*`, `src/game/modes/courseMode.ts`,
`docs/ct-prototype/CTCOURSE-SPEC.md`, `docs/marlow-{bays,bunker,jammer,variety}/`, `docs/level-design.md` 11-12,
`docs/reviews/marlow-yard-audit.md`, `docs/course-ready/WALKTHROUGH.md`, the tests and e2e scripts named in section 4.

Coordinates: x east, z north, floor y 0. Bay i (0-7) spans x 22i .. 22i+16, its airlock A(i+1) x 22i+16 .. 22i+22,
z 4-10. Gallery 14 m wide (z 0-14), 170 m long. Perimeter / airlock walls 7.5 m (`FENCE`, ctcourse.ts:33).

## 1. Map overview (run order)

Every bay is the same 16 x 14 m box with the same beat: spawn / airlock at the west end, panel on the north wall at
bay x+3.5 (ctcourse.ts:523-528), one obstacle at bay x+9 (`CT_OBST`, ctcourse.ts:31), walk the back 7 m to the next
6 x 6 airlock (pad 4 x 4, 4 s cycle, `AIRLOCK_CYCLE` config/course.ts:7). Ceilings `CT_CEIL` [4.5, 7.5, 4.5, 5.5, 7.5,
4.5, 7.5, 4.5] (ctcourse.ts:58). Both players start at (2, 6) / (2, 8) facing +x (ctcourse.ts:612-615).

Time = casual pair, first time, including its exit airlock (walk + pad wait + 4 s cycle, about 10-15 s). Spec target:
3-4 min practised, 9-16 casual (CTCOURSE-SPEC.md:281). Michael now wants 15-20 min of co-op play, not walking.

| # | Name / fiction | Plan (x, z) / ceiling | Teaches | Devices / ids | Co-op moves used | Est. time |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | Induction hall, sentry post | x 0-16, z 0-14, ceil 4.5; A1 x 16-22 | Panel read; grab from behind + INTERROGATE (optional) | panel `sw-p1` (3.5, 13.6); passive guard `s1-guard` (10.5, 3.2) facing +x (ctcourse.ts:211), info: medkit locations; sentry desk x 10.3-12.1, z 0.9-1.7 (collide=false) | none (solo grab; airlock pad needs both) | 0.5-1.5 min |
| S2 | Climbing hall 1 | x 22-38, ceil 7.5; wall x 30.5-31.5, 4.4 m, door `S2-door` z 6.4-7.6; A2 x 38-44 | Leg-up over a wall; far-side bolt | leg-up square (30, 3.5); bolt gate `g-s2` at (31, 7), side +x (ctcourse.ts:293); wall-top lamp (31.9, 7.35, 5) | brace + boost, pull-up; unbolt for partner | 1-1.5 min |
| S3 | Security cell: camera hallway + security room | x 44-60, ceil 4.5. Entry lobby x 44-47; hallway x 47-57.6, z 0.15-3.05 (`S3_HALL` :116); far lobby x 57.6-60 (pass zone x 57.8-59.7, z 0.4-13.6, :128-135); security room x 51.6-57.6, z 8-14, door z 9.2-10.4 in x 57.6 (:181); rest sealed void; A3 x 60-66 | Pistol jam handoff (5 s use, 5 s cooldown, 1.5 s reboot); hard rule: seen = sent back to (45.5, 1.6) (:125); takedown the duty guard, console kills the camera | `cam-s3` (59.6, 1.6, y 2.4) facing W, sweep 262-278, aim 6.5 m (:117-119, :192); `s3-sec-guard` (53.25, 10.75) (:184); console `sw-s3-console` (52.55, 11.6, y 0.9) (:542); 4 hallway/lobby lamps + room panel, all jammable (:87-92, :432-436); gates `g-s3` flag `s3-clear` -> `A3-near`, `g-s3-cams` pickup -> `cams-off-s3` (:300-301); panel `sw-p3` at x 45.6 | Jam handoff (A jams, B runs, B jams from far end, A runs); optional: runner takes out the room guard, console turns camera off for the partner | 2.5-4 min |
| S4 | Perimeter laser gate | x 66-82, ceil 5.5; wall x 75 to ceiling, gap z 4-10, header from 4.6 m (`S4_HEADER` :97); A4 x 82-88 | Partner throw over a laser; far-side release; alt: jam the hidden power panel | `laser-s4` beams y 0.35/0.9/1.45 across z 4-10 at x 75 (:149); release `sw-s4-release` (78, 13.6) (:546); `panel-s4` (78, y 4.0, z 0.15) (:157), jam spot (71.5, 10.5) (:159); gate `g-s4` pickup -> `s4-release` | Throw; partner presses release for the thrower; or jam panel while partner walks | 1-2 min |
| S5 | Kill-house mock-up in a high hall | x 88-104, ceil 7.5; annex x 96.85-104, walls 4.0, roof top 4.4; front wall x 97 with `S5-door`; grid wall x 100.5 with `S5-grid`; hatch x 102.125-102.675, z 1.0-1.55 (:164); A5 x 104-110 | Leg-up + ledge relay (human ladder) onto a roof; paired plates; hang-down head-first through a hatch to hack | leg-up (96, 3.5); roof plates `sw-s5-a` (99, 3.6) / `sw-s5-b` (99, 10.4) at y 4.4 (:571-572), pair gate `g-s5` -> `S5-door`, 1 s window; hack `sw-s5-hack` (102.4, y 1.2, 0.4) (:577), lever `g-s5-grid` -> `S5-grid`; medkit wall (103, 13.6) (:622); 3 annex panels + roof strip | Boost, relay, pair press, hang-down hold + pull-up | 2.5-4 min |
| S6 | Vault vestibule (two-person rule) | x 110-126, ceil 4.5; bulkhead x 119 to ceiling with `S6-door`; A6 x 126-132 | Synced hack: both start within 1.5 s, stay put; late = 10 HP | `sw-s6-a` (115, 0.4), `sw-s6-b` (115, 13.6) (:582-583), `sc-s6` -> flag `s6-sync` (:140), gate `g-s6` -> `S6-door`; pair line on the floor; 4 solid racks x 110.15-111.05, z 8.3-10.8 | Sync hack | 1-1.5 min |
| S7 | Climbing hall 2 | x 132-148, ceil 7.5; solid wall x 140.5-141.5, 4.4 m, full width, no door; return stair x 141.5-144.5, z 0.4-1.6, rises 3.3/2.2/1.1 (:598-601); A7 x 148-154 | Leg-up one, the one on top drops a two-person rope | leg-up (140, 3.5); holder strip + anchor plate on top (141, 4.4, 7); wall-top lamp (141, 7.35, 7); no gate | Boost, rope offer / climb / top-out | 1.5-2.5 min |
| S8 | Extraction lobby | x 154-170, ceil 4.5; bulkhead x 163 with open doorway z 6.4-7.6 | Walk to exit; both in the zone | medkit (156, 13.6); exit zone x 165.5-169.5, z 3-11 (:216), coffer over it | none (e2e also tests a revive here) | 0.5 min |

Total casual: about 10-17 min, of which roughly 2-3 min is airlock cycling and empty back-half walking (7 airlocks x
~15 s, 8 back halves of 7 m). Practised: 4-6 min.

## 2. Flow assessment

**Sameness.** Eight identical 16 x 14 boxes, one obstacle line each at x+9, the same panel spot, same west-to-east
walk. Only S3 (hallway + room) and S5 (annex box) break the box; everything else reads "room with a wall across it".
Heights differ (4.5 / 5.5 / 7.5) but the plan does not.

**Random walls (Michael's "random walls / pipes / ladders").**
- S2 and S7: a free-standing 14 m wall across the middle of a hall, 4.4 m high, nothing else in the room. The move is
  right; the wall has no reason to be there (no gantry, no blast wall into a space beyond).
- S6 bulkhead x 119 and S8 bulkhead x 163: walls whose only job is to hold a door. S8's has an open doorway and no gate:
  pure filler.
- S4 wall + header: justified by the laser gate fiction, fine.
- There are no pipes or ladders in ctcourse; the "random" clutter is the dressing: 14 sealed side pockets beside the
  airlocks dressed as plant-room faces and instructor-booth glass (ctcourseVariety.ts:202-216), S6 racks (the only
  solid dressing), S1 desk. All visual, none playable.

**Dead walks.**
- Back half of every bay (x+9 .. x+16, 7 m) is an empty walk to the airlock pad in S2, S4, S6, S7, S8. S1 front half
  (spawn to x 10) too.
- 7 airlocks x 6 m + pad wait + 4 s cycle: about 40 m of the 170 m, 1.5-2 min of pure waiting. They are the course
  framework's checkpoint and the "both together" gate (D46), so they matter, but seven identical ones are monotone.
- S3 void: x 47-57.6, z 3.2-8 and x 47-51.6, z 8-14 sealed and unused (about 70 m2 of the best bay).

**Backtracking.** S5 only: leg-up / relay onto the roof (west edge), plates, hatch at the east end, then drop off the
front lip (west) and walk back in through `S5-door` and the grid to A5. Reads as a loop, but the drop-and-re-enter is a
retread of the same 8 m. S7's return stair is a safety net, not the route. S3's send-back is a deliberate penalty.

**Boring connections.** Every bay-to-bay link is the same 6 x 6 lit box under a 3.2 m lid. No corridor, turn, level
change, vent or crawl anywhere between bays; no vertical connection between bays (all at y 0). The camera never has to
look round a corner except in S3.

**Repetition of lessons.** The leg-up on the same yellow square at the same 4.4 m wall happens three times (S2, S5, S7).
Pair-press appears twice (S5 plates, S6 scanners) with S5's plates being an arbitrary "press together". No bay has a
live guard: both guards are passive (`passive: true`, ctcourse.ts:211-212); there is no stealth, light or patrol beat
in the whole training course.

**Readability notes (from job STATE files, still open).** S3 camera end and far lobby very dark; S3's orange-red band
(#b54a2e) reads like a laser next to the camera grid (marlow-jammer STATE); camera IR not shown in NV; render parity
under the slabs pending a PC look (marlow-bunker STATE "Open").

## 3. Verdict per bay

| Bay | Verdict | Why |
| --- | --- | --- |
| S1 | REWORK | Empty induction box; keep the grab-from-behind + INTERROGATE intro, but it needs a real co-op beat (e.g. two guards for a dual takedown, a light to kill) and a shorter dead walk. |
| S2 | KEEP (re-shape) | Leg-up + far-side bolt is CT's canonical first lesson and works for host and client (marlow-bays item 2 fixed); give the wall a reason (a blast wall into a raised gantry / next space) instead of a wall mid-room. |
| S3 | KEEP | The best bay: jam handoff with hard send-back, 5 s cap / reboot, lamp flicker, security-room takedown alternative; brighten the camera end and use the sealed void. |
| S4 | KEEP (tighten) | Throw over the laser + far-side release + hidden jammable power panel is a real "two solutions" bay; cut the empty back half. |
| S5 | REWORK | Hang-down hack through the hatch is a wow move, keep it; the roof plates pair is arbitrary filler and the drop-off-and-re-enter is backtracking. Make the roof the route forward (hatch -> hack -> exit from the back room). |
| S6 | REWORK | Sync hack is wanted (Michael's "hacking devices in sync") but here it is two wall panels in an empty box plus a filler bulkhead; fold it into a vault / security space where the sync opens something meaningful, or time it against a guard / camera. |
| S7 | KEEP (re-shape) | Two-person rope is a distinct co-op verb; the full-width solid wall in a hall is the "random wall" pattern and the third identical leg-up. Put the rope where a shaft or ledge needs it (a high hatch, a pit). |
| S8 | CUT (as a station) | Open doorway in a bulkhead, no task: filler. Keep the exit zone (both-in rule, G138), the medkit and the e2e revive check, merged into the last real bay. |
| Airlocks A1-A7 | REWORK | Keep the two-person airlock as the checkpoint / regroup mechanic, but fewer or varied (a lift, a decon shower, a gantry lock); seven identical 6 x 6 boxes are the main dead time. Note `validateCourse` fixes 6 x 6 +-0.5 (config/course.ts:18-20). |
| Side pockets (V4 / V5 dressing) | CUT or USE | 14 sealed voids with painted faces; either make them playable (vents, booths you enter) or drop them in the rebuild. |

**Co-op "wow" moments that exist and work (e2e-pinned).**
1. S3 jam handoff: A jams (camera freezes, LED flashes, buzz, grid gone), B runs; B jams from the far end for A; the
   5 s cap and 1.5 s un-jammable reboot force a real swap; seen = sent back (scripts/e2e-ctcourse.mjs:210-358).
2. S3 security room: the runner who got through takes out the duty guard and the console switches the camera off for
   the partner (e2e-ctcourse.mjs:360-424).
3. S4 partner throw over the laser band, the thrown player lands crouched and drops the band at the far release
   (e2e-ctcourse.mjs:476-547); alternative: jam the hidden power panel diagonally through the gap (:425-475).
4. S5 hang-down: holder crouches at the hatch, partner lowered head-first to hack the panel and pulled back up
   (e2e-ctcourse.mjs:549-599); plus leg-up + ledge relay (human ladder) onto the roof.
5. S7 two-person rope: drop, climb, slide, top out (e2e-ctcourse.mjs:607-684).
6. S6 sync hack with a health cost for a late start (e2e-ctcourse.mjs:685-727).
7. Lamp jam: flicker off, 4 s off after release, flicker on, light parity (e2e-ctcourse.mjs:330-349): exists, but only
   as a side test in S3, not as a gameplay beat.

**Filler.** S8 doorway wall; S6 bulkhead; the S2 / S7 mid-hall walls as walls; S5 roof plates; the back halves of
bays; 7 identical airlocks; 14 dressed sealed pockets; S1's empty front.

**Gaps against Michael's brief (2026-10-23).**
- Timed isolation of lights: framework has `MainsGate` (unlocked while a light group is off, relocks unless both are in
  the exit airlock; courseDef.ts:58-59), used by Fallow and courselab only, not ctcourse. Lamp jamming exists (any
  `lamp` / `spot`). No bay uses a light circuit / breaker beat.
- Timed isolation of locks: `TimedHoldGate` (open while held + 6 s, `TIMED_HOLD_AFTER` config/course.ts:24) exists;
  ctcourse uses it only as the unreachable default branch (ctcourse.ts:322). `HoldGate`, `EgressGate`, `AnchorLockGate`
  are also unused here.
- Timed isolation of cameras: S3 only (jam + console). No multi-camera timing.
- Security room: S3 only, single camera.
- Timed jammer exercises: S3 hallway and S4 panel; no jam-a-lamp-to-cross-a-pool, no chained jams on several devices.
- Sync hacking: S6 only, two static panels.
- Dual takedown: detection exists (`DUAL_WINDOW`, src/net/coopHost.ts:57, :255-266) but no bay has two live guards.
- No live guard or patrol anywhere: no light / shadow lesson, which is the game's core (CLAUDE.md).
- Level-design 11 solo rules do not bind (ROADMAP.md:33, Michael 2026-10-22: "Co-op only"), so co-op-only routes are
  allowed.

## 4. What the tests pin (a rebuild must update these)

**Unit tests**
- `tests/ctcourse.test.ts` (562 lines, all describe blocks pin this layout):
  - :23-28 8 bays, 7 airlocks, 2 spawns, medkits > 0; :336 8 objectives; :110-122 one panel `sw-p${n}` per bay, bay 1
    no drills.
  - :65-73 S2 bolt `side [1,0]`, `at[0] === 22 + 9`; :77-85 leg-up apex x 30; :248 `DOOR_X = 22 + 9`; :256-300 F7 / F8
    bolt plane and Unbolt item.
  - :87-97 S5 roof lip at `22*4 + 8`, plates past x0 + 9; :138-166 hatch x within 22*4 + 12.65 .. 16, hack panel
    `S5_PANEL`, x - (22*4 + 12.35) > 1.8.
  - :99-105 walls < perimeter, `FENCE` 7.5; :173-206 S7 wall at x0 + 9 (22*6), solid 1-4.3, open 4.5, 1 m thick, stair
    rises at x0 + 9.5 + k - 0.5, z `S7_STAIR_Z`; :212-240 S8 wall x0 + 9 (22*7), doorway at z 7, no gate.
  - :301-317 F17 pair hint; :319-334 gate radio per gate id; :341-367 text limits (`PANEL_TEXT[4]` has two sentences,
    :365); :369 S3 pass colour; :376-388 leg-up squares at `22*(n-1) + LEGUP_SPOT[0]` for S2 / S5 / S7.
  - :400-405 `CT_CEIL` literal `[4.5, 7.5, 4.5, 5.5, 7.5, 4.5, 7.5, 4.5]`, every bay slab and A1-A7 lids at
    `bayX(i) + CT_BAY`, z 4-10; :408-420 the only lips: x in `[bayX(1)+8.5, bayX(1)+9.5, bayX(4)+8.85, bayX(6)+8.5,
    bayX(6)+9.5]` at 4.4, stair 3.3 / 2.2; :424-434 S4 header over the throw at `bayX(3) + 9`.
  - :448-460 exactly 4 solid dressing pieces (S6 racks) in `bayX(5) .. +1.2`; :463-467 S1 grab area x 2-10.5, z 2.5-5 clear.
  - :470-560 security room: consoles list, guard slot only in bay 3 (:503 literal 8-entry array), post, door gap,
    walls, no new ledge, radio list `[RADIO_ENTER[2], S3_ROOM_RADIO]` (:555).
- `tests/ctcourseLight.test.ts` + `tests/ctcourseLight.tuned.json` (190 tuned levels): spots per bay from `bayX(i)`
  (:86-101: route x0 + 0.6 / 4 / 7 / 8.4 / 9.8 / 12.5 / 15.4, panel reader, A centre / pad / corner / far door),
  absolute spots (:103-142: S2 x 30-33, S4 release 78, S5 96-103, S6 115, S7 140-144, S8 165.6-169.4), corners
  (:144-152), lamp positions (:70-74: airlocks `bayX(i)+CT_BAY+3`, S5 medkit (102.6, 11.5), S7 top, S2 top); S3 camera
  bay test :202, IR runner test :276, security room lamp :314; tuned-levels hold within 0.08 :259; no moon / 0.30 fill
  :247. Rebuild = re-tune and rewrite the json (`CTLIGHT_PRINT=1`).
- `tests/jammer.test.ts` :410-437 S4 laser covers `S4_GAP`, release gate; :439-560 S3 hallway: camera at `S3_CAMERA.x`,
  covers `S3_HALL` at every sweep angle (:477), no airlock point seen with doors open (:496), one jam covers one runner
  (:522), gate and pass zone (:543); plus the `hallStep` cases.
- `tests/camSpaces.test.ts` :21-27 tight at `bayX(2)+5, z 3`, airlocks `bayX(i)+CT_BAY+3`, annex `bayX(4)+CT_OBST+3`
  (tight on floor, open on roof y 4.4).
- `tests/laserPanels.test.ts` :152 hidden box `[66.5, 0.5, 74.5, 4.5, 0]`, :159, :411-418 `S4_PANEL` y > 3.5, yaw 0, x past
  the laser, `S4_PANEL_JAM` before it.
- `tests/scanners.test.ts` :132-142 `S6_SCANNERS`, flag gate on `S6-door`, external flag.
- `tests/guardInfo.test.ts` :47-86 squads exactly `[s1-guard, s3-sec-guard]`, bay 0 / bay 2 squads, 2 medkits (:86),
  guard lines name "annex" / "last wall".
- `tests/smoothWorldLight.test.ts` :121-126 spots S1 x0+4, S3 x0+9.8 (now inside the hallway wall void), S1 / S3
  corners, A1 centre, A3 corner.
- `tests/securityRoom.test.ts` (console rules, map-free), `tests/levelFillParity.test.ts` :20-45,
  `tests/lampGridLossless.test.ts` :132, `tests/voxelFit.test.ts` :20-21 (every map in `MAPS`), `tests/rooms.test.ts`
  :140 (map id list), `tests/rejoin.test.ts` :62, :215-226 (map `ctcourse`, bay 3), `tests/roomDirectory.test.ts` :38.

**e2e**
- `scripts/e2e-ctcourse.mjs` (938 lines): `PITCH = 22` (:12); part groups `{1: [1,3], 2: [4,5], 3: [6,8]}` (:19) and
  runner parts (`scripts/run-e2e.mjs:44`); station 3 `CAM [x0+15.6, 2.4, 1.6]`, host (x0+6, 1.6), client (x0+1.5, 8)
  (:211-214), `BACK [x0+1.5, 1.6]` (:224), ids `s3-clear`, `g-s3`, `cam-s3` (:226-316); security room guard / console
  ids, `SPOT [x0+9.3, 12.4]`, post (x0+9.25, 10.75), (x0+6, 1.6), (x0+14.6, 6) (:360-418); station 4 `stats[3]`,
  `panel-s4`, `laser-s4`, throw spots (x0+6.8, 7) / (x0+8, 7), landing x0+10 .. x0+12.5, `c-sw-s4-release`
  (:425-547); station 5 hatch x0+14.4, `hatchZ1 = 1.55`, `c-sw-s5-hack` (:549-599); station 7 leg-up (x0+8, 3),
  holder x0+8.8, client (x0+7.6, 3) (:607-684); station 6 (x0+5, 1.6) / (x0+5, 12.4), `c-sw-s6-a/b`, `g-s6`, 9-10 HP
  cost (:685-727); gate opener per station: door `A3-near` for 3 else `S${n}-door` (:733), S2 leg-up (x0+8, 3), bolt
  `c-g-s2` from (x0+10.2, 7) / near (x0+7.5, 7) (:735-746), S5 leg-up (x0+8, 3.6), plates at (x0+11, 3.6 / 10.4, y 4.5)
  (:748-768), placeholder `c-h-s${n}` (:787-790); station 8 no `c-h-s8`, revive at (x0+6, 7) (:801-825); airlock walk
  at `PITCH*i + 19` (:828); start panel (3.5, 12.4) `c-sw-p1` (:864-865); pause restart at (8, 7) (:884); exit zone at
  `PITCH*7 + 13.5`, client one-out at (PITCH*7 + 12, 1.5) (:910-916). Every bay index, offset and id is literal.
- `scripts/e2e-coop.mjs` :748-800: course restart at checkpoint while holding a guard: needs a live guard in bay 1 at the
  course start (`startMode('course', 'ctcourse')`, :753-754); :93 the browse list names "Marlow Yard|ctcourse".
- `scripts/e2e-menus.mjs:352` rejoin record `map: 'ctcourse', bay: 2`; `scripts/e2e-park.mjs:92` the campaign map is
  `ctcourse`; `scripts/e2e-anchors.mjs:9` ctcourse places no anchors (add it if the rebuild places any).
- GPU scripts with fixed coordinates: `scripts/shots-ctcourse.mjs` (:31-32 rows: A1 x 16-22, S1 desk, S3 monitor wall
  x 51.75, S8 coffer x 164.65-168.65), `camera-cue-shots.mjs`, `nv-shots.mjs`, `sector-fixes-c-shots.mjs`,
  `wheel-shots.mjs`.
- Code that names the map: `src/net/coopUi.ts:382` (`CAMPAIGN_MAP`), `src/net/session.ts:58` (default map),
  `src/world/maps/index.ts:19` (`MAPS`), `src/config/camera.ts:17` (comment, shot row).

## 5. Constraints to keep

- **Course framework** (`src/game/course/`): `CourseDef` bays chain start -> airlocks -> end; every gate / device / door
  id must exist (`validateCourse`, courseDef.ts:213); airlocks 6 x 6 +-0.5 (`AIRLOCK_SIZE`, config/course.ts:18-20),
  pad inset 1 m, both on the pad to cycle (4 s); gate kinds available: lever, bolt, hold, timedHold, pair, egress,
  mains, flag, anchorLock, pickup (courseDef.ts:46-77); flags read must be set by a pickup, a pair or
  `externalFlags`; radio / objectives <= 90 chars, panels <= 120 (`PANEL_TEXT_MAX` ctcourse.ts:236); one objective per
  bay; squads per bay respawn on a bay restart; consoles (`securityRoom.ts`); pass zones with the hall rule
  (`ctDevices`); host-authoritative, state crosses the wire in `PackedCourse` (courseState.ts) and `sec`
  (PROTOCOL_VERSION 27): a new device kind or field is a protocol bump.
- **Exit and restart rules**: course ends only with BOTH in the exit zone (G138); bay restart when both down / revives
  spent brings the partner back (`checkpointPos` = checkpoint airlock middle, courseMode.ts:627); pause "Restart at
  checkpoint" / "Return to lobby" (host only); rejoin `resumeBay` and the lobby "Start at bay N" index bays by number
  (coopUi.ts:583-598).
- **Save shape**: `course:fallow` record (save/courseRecord.ts:11-30) stores bay ids, finished ids and best time per
  bay id; no SAVE_VERSION change if ids change, but old best times orphan (sanitised on read, max 64 bays). Keep
  `S1..Sn` ids or accept the reset.
- **Light bake / parity**: underground theme, `lightLevel` 0.3 all fill, no moon (ctcourse.ts:370-382, Michael M1);
  lamps flush with ceilings, cool white; every new lamp in the bake; light parity for jammed lamps (registry `setOn`);
  cameras see by their own IR (`CAMERA.irLight`, Michael M3), guards and the meter by the bake; lamp count per 2 m
  column under the shader list (ctcourseLight :220); lamps under the bake box top (:243); dressing < 5 cm or
  collide=false stays out of the bake.
- **Nav**: `navSeeds` one per bay at (bay x+3, 7) (ctcourse.ts:610); default 3 nav layers (roof y 4.4 counts as one);
  nav cast to y -2 only; guards walk normal y > 0.65; guard posts on nav-cell centres (cell 0.5, origin -1; :182-184).
  Live guards need SQUAD_CAP 9 / MAX_ALIVE 12 in mind.
- **Reach / ledges** (level-design 12.1): co-op ledge band 4.3-4.5 (built 4.4), solo wall-jump 3.8, boost 4.5, ladder
  4.1; box tops >= 1.9 m become lips automatically: `noLedge` / `mark` everything else (the unit test at
  ctcourse.test.ts:408 lists every allowed lip); split gaps auto from faces >= 3.6 m tall, 1.2-1.95 apart; S4 throw
  apex needs header >= 4.6; hatch < body width 0.55.
- **M8-style checks** (Sector Ops M8, docs/sector-ops/BRIEF.md:49-53): room to manoeuvre, more than one route to each
  objective where it fits, takedown spots away from others. Not yet applied to ctcourse (linear by design, G117 /
  training D41: no station skippable); a rebuild that adds live guards should apply it per bay.
- **Anchors**: none placed now (e2e-anchors.mjs:9); any placed anchor (ladder, pipe, zip) must be added to e2e-anchors
  and engage from its planned approach (level-design 15).
- **voxelFit**: every map in `MAPS` runs `tests/voxelFit.test.ts` (cover faces, ledges, solids unchanged by voxelising,
  +-3 cm fit; flush visuals on a solid face fail the air probe: set them 5 mm proud).
- **Camera spaces**: `camSize: 'open'`, tight boxes for airlocks, the annex floor (y -1..3.9) and the security room
  (ctcourse.ts:634-640).
- **Rules from Michael already recorded**: walls to ceilings (no lip over a bulkhead), no painted camera floor lines,
  cameras with IR, laser = alarm not damage, lasers seen only in NV, power panels hidden and shown by electro, security
  room in every camera map except Sector Ops, yellow / green / blue-grey reserved for floor marks, "wall" not "fence",
  hard send-back in the jam hallway (J2), a second jammer may join a jam (J3).
