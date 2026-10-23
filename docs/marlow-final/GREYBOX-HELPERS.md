# marlow-final - greybox helpers

By Night Shift | Course Ready Build, 2026-10-23, on `scratch/marlow-final-greybox` (cut from `feature/marlow-final`, HEAD
45848cf2, which contains 8d056858). Handed to Menu Notes; committed on `feature/marlow-final` as 282186bd. Tested and
fixed by the Menu Notes greybox-helper tester, 2026-10-23 (section "Tests" and "Changes from the tests").

Module: `src/world/maps/ctcourseGreybox.ts`. It is pure and Babylon-free: it imports only the config tables, `JAMMER`,
`LASER`, `SCANNER` and types. The live `ctcourse*.ts` builders are untouched.

## State
- Done: the module with 6 helpers and `applyGreybox`; `tests/ctcourseGreybox.test.ts` (77 tests, every item of the old
  "Tests to write" list, all passing). `npx tsc --noEmit` and eslint on both files are clean.
- The tests found 7 problems; each is fixed in the helper with the API kept (section "Changes from the tests").
- Not done: wiring into the ctcourse map (the set builders' job), and `tests/voxelFit.test.ts`, which is not needed
  because no map was touched.
- Not built: an overwatch ledge helper, the split route with a one-way drop, and the back-to-back or stack climb. SPEC
  section 12 says neither the overwatch ledge nor a one-way drop is on this route (built by hand if one appears). Stack
  is not built in the game and back-to-back is not in CT. The A8 split uses `coopDeck` with its stair as the way back.

## Shared
- Frame: `at` (x, z) is the origin and `facing` (`'+x' | '-x' | '+z' | '-z'`) is the route's direction across the
  obstacle. Local u runs along `facing`. Local v runs along the obstacle: +z for an x facing, +x for a z facing.
- Every helper returns a `Greybox`:
  - level data: `boxes` (BoxPiece plus a register `tag`), `stairs`, `doors`, `ledges` (manual);
  - course data: `devices`, `gates`, `lasers`, `scanners`, `cameras`;
  - planning data: `lips` (the planned co-op grips, ready for `COOP_LIPS` and `soloJumpThreats`), `spots` (where each
    move is done from; striped 1 x 1 m marks are drawn) and `wayBack` (the register line for the way back).
- `applyGreybox(b, g)` writes the boxes, `noLedge` / `overhead` marks, stairs, manual ledges and doors into a
  `LevelBuilder` and returns the door anchor ids by course id. You copy the devices, gates, lasers, scanners and cameras
  into the map's `CourseLayout`, `BayDef.gates` and `MapLayout` by hand.
- A helper throws when its numbers break the property it exists for, as `validateCourse` does.
- Constants (each pinned by a test to the game's own numbers):
  - `COOP_LIP` 4.4; `COOP_BAND` = `WALL_JUMP.maxUp` + 0.5 to `TEAM.boostMax` (4.3-4.5);
  - `LEGUP_STANDOFF` 0.5 (the current `LEGUP_SPOT`; `coopDeck`'s mark);
  - `WALL_STANDOFF` 0.9 (new: `boostWall`'s mark, see change 1);
  - `GREY_KEEP_CLEAR` 4.7 m (was 3.0, see change 2): no solo-standable top within it of a co-op lip, approach side;
  - `BEAM_KEEP_CLEAR` 4.0 m (new, see change 3): no solo-standable top within it of a throw gateway's beam line;
  - `INTERACT_REACH` 1.8 / `INTERACT_DY` 1.5 (`Interactables.nearest`; the test reads the source so a change shows);
  - `JAM_WINDOW` = useMax 5 + reboot 1.5 (the test runs `stepJam` + `stepDevJam` and measures 6.5 s);
  - `SILENT_CROUCH` = `GEARS.crouch[2]` 1.7; `SOLO_RUN` = top standing gear 4.0;
  - stair rise 0.165, run 0.285.

## Helpers
| Helper | Parameters | Numbers it relies on | Serves |
| --- | --- | --- | --- |
| `boostWall` | id, at, facing, span, lip 4.4, thick 0.6, wicket (v or null), wicketW 1.2, spot | `COOP_BAND`; `LEDGE.climbDepth` 0.38 < thick (the wall top can be walked, so the relay works); the mark `WALL_STANDOFF` 0.9 off the face (the boost takes the near lip at any thickness); bolt gate `side` = the far side | SPEC A1 E1 (C1); SCENARIOS S1 / S2 |
| `coopDeck` | id, at, facing, span, depth, lip 4.4, open [v0, v1], screen 1.2, stair start/end/false, stairW 1.2, rope (v), spot | `COOP_BAND`; `TEAM.ropeMin` / `ropeMax` 2.2-6.0; one solid block marked `noLedge`, with one manual ledge on the open span only (LD 11.5) | SPEC A2 staging (C3), A6 gallery + rope (C7), A8 gallery split (C10); SCENARIOS S2, S7 |
| `throwGateway` | id, at, facing, gap 6, span, wallH 6, header 4.8, thick 0.3, beams [0.35, 0.9, 1.45], stand 1.2, release (u, v) | `TEAM.throwDist` 3.2; `throwApex` 1.7; every beam gap under `LASER.crouchHeight` 1.1; `LEAP_APEX` 0.87 under the top beam; the release out of reach from the near side (throws); `BEAM_KEEP_CLEAR` for the map | SPEC A5 E6 (C6), A8 beam curtain; SCENARIOS S3 |
| `hangPlate` | id, at, facing, deck 4.4, slab 0.4, cage [4.2, 4.2], overhang 0.6, hole 0.55, hold 3 | hole < 2 x `MOVEMENT.radius` (throws); the game's hang probe from the holder's mark finds the plate (hang point 0.65 m off the cage centre); `hangReaches` the panel at depth 2.5 (`hangDepthMax` with the cage floor at 0), not at the start depth 1.5; both cage devices out of reach from outside (throws: the cage must be at least 3.74 m along u and 3.1 m along v) and from the deck (dy 3.2 > 1.5) | SPEC A6 E9 (C8); SCENARIOS S10 |
| `syncStation` | id, kind scan/pair, a / b {x, z, yaw}, y 1.2, walk, doorId | `syncMinGap`: scan 2 x `SCANNER.reach` + 2 x radius = 4.6 m; pair 2 x 1.8 + `SOLO_RUN` x `PAIR_WINDOW` = 7.6 m; throws at or under it | SPEC A7 E11 (C9), A8 time locks; SCENARIOS S20 / S34 |
| `jamRelay` | id, at, facing, length (19 m at most), width 3.5, height 3.0, side, recessDepth 1.0, recessW 1.4, camY 2.8 | recess spacing `JAM_HOP` = 0.8 x 6.5 x 1.7 = 8.84 m or less, and every real walk (along the corridor a body off the recess wall, then into the hide spot) inside `JAM_WINDOW` at 1.7 m/s; the hide spot against the camera-side cheek; `JAMMER.range` 20 to the posts; `CAMERA.mountMin` / `mountMax`; a lone jammer must stand still (`stillSpeed` 0.45) | SPEC A3 E2 (C4), COOP-INVENTORY E5; SCENARIOS S13 |

## Tests (`tests/ctcourseGreybox.test.ts`)
Each piece is written into a real `LevelBuilder`, `generateLedges` runs over it beside the manual ledges, and the game's
own functions check it. `boostWall` and `coopDeck` run in all four facings, the others in two.
- Constants: the band, `GREY_KEEP_CLEAR` over the largest `soloJumpReach(t, 4.4)` (t 0.3 m up to the lip), the
  interact reach read from `interactables.ts`, `JAM_WINDOW` from `stepJam` + `stepDevJam`.
- `boostWall`: `soloJumpThreats` is `[]` on both lips; every generated lip in the band (3.8-4.5) lies on a planned lip
  (LD 11.5; the test adds the room's side walls, as the helper's "wall to wall" rule asks); the real boost search
  (`findJumpTarget`, apex `TEAM.boostMax - 1.15`) from the mark takes the near lip at thickness 0.4-1.2; a 1.8 m crate
  inside a running jump threatens the lip, one at `GREY_KEEP_CLEAR` does not; the bolt (`CourseState`) refuses a
  near-side press and opens from the far side; the throws.
- `coopDeck`: the open-span manual lip is the only lip in the band (the ends and the screened edge have none);
  `soloJumpThreats` `[]`; the boost finds it; `ropeRoom` is ok and the climber starts within `TEAM.ropeReach`; the
  stair's top step meets the deck's end against its back, rises under `MOVEMENT.maxStep`; the throws.
- `throwGateway`: `laserTouch` holds for a crouched body at every height up to the top beam and for a jump's apex;
  `throwArc` from a runner 0.3-1.6 m behind the thrower never touches a beam, keeps the head under the header and the
  body inside the gap; `throwLanding` is the landing mark, `throwLandingOk`, and `throwRoom` is 'ok' there; the release
  (`CourseState`) sets the laser's `offFlag`; `BEAM_KEEP_CLEAR` over the farthest beam-clearing jump; the throws.
- `hangPlate`: the cage is closed from the floor to the slab but for the locked door, which fills the gap; the slab is
  solid over the cage but for the plate; the hang probe (the test mirrors `TeamController.hangPoint`'s 0.4 / 0.7 / 1.0 m
  probe and 0.15 m step-in with sampled rays against the boxes, since the real probe needs Havok) finds the plate,
  `hangPointOk`, the hanging body clears the cabinet, `hangReaches` the panel at some depth up to `hangDepthMax`; both
  devices out of reach from a ring of bodies round the cage and from the deck, in reach from the cage floor; the panel
  sets the done flag and the exit release (egress) frees the door; the throws (3 m bridge case).
- `syncStation`: the spacing formulas; it throws at and under `syncMinGap`; one player cannot work both scanners
  (`scanStart`) or both halves of a pair gate (`CourseState`), two players set the flag.
- `jamRelay`: spacing and every real walk against the window, and each walk longer than a still jammer creeps in one
  jam; a moving jam breaks (`stepJam`); the camera passes `validateSecurity`, sees the middle of every walk all through
  its sweep (`inFrame`, `sweepYaw`, `camPitch`) with a clear plan line; each hide spot hides a whole body (plan line of
  sight from the camera to 16 points round it, the walls over the mount); 17.5 m keeps one recess; the throws.
- `applyGreybox`: boxes, marks, the manual ledge and the door anchors.

## Changes from the tests
1. `boostWall` mark 0.5 -> 0.9 m off the face (`WALL_STANDOFF`). From 0.5 m the game's boost search took the FAR face's
   lip of the 0.6 m wall (`findJumpTarget` scores a lip under 0.8 m away in plan by the climb's steepness and a farther
   one by direction; the far lip wins on a wall under 0.76 m thick). The boosted player hung on the yard side and the
   near-side ledge relay was lost. From 0.9 m the near lip wins at any thickness (tested 0.4-1.2).
2. `GREY_KEEP_CLEAR` 3.0 -> 4.7 m. The top-gear running jump off a top just under a 4.4 m lip carries 4.62 m
   (`soloJumpReach`); off a 1.8 m crate 3.30 m. 3.0 was short for any top over about 1.5 m.
3. New `BEAM_KEEP_CLEAR` 4.0 m. A running jump off a top carries the feet over the 1.45 m top beam across its touch
   band: off a 1.8 m top from 2.72 m, off a top just under the 4.8 m header from 3.97 m. From the floor it cannot (apex
   0.87 m).
4. `throwGateway` throws when the release is in reach (1.8 m) from a body just off the beams on the near side.
5. `hangPlate`: the exit push bar sat 0.15 m inside the door wall. Course devices have no `side` and
   `Interactables.nearest` has no line-of-sight test, so a player outside pressed it through the mesh, walked in and
   pressed the panel from the floor: a solo way past the hang-down. The exit release is now on the cabinet's back (door
   side, 2.08 m from any body outside a 4.2 m cage). The helper throws when either device comes within reach from
   outside. The panel carries `hold` 3 s (N4, new `hold` option). The door wall's two pieces now run to the corners
   (they stopped 0.1 m short).
6. `syncStation` throws at exactly `syncMinGap` too (a pair run at the minimum fits the window to the frame:
   `pressPair` takes <=).
7. `jamRelay`: the hide spot moves from the recess's middle to against the camera-side cheek (+0.35 m along the
   corridor). From the middle, a 19 m corridor's second recess showed a body's edge to the camera past that cheek. The
   recess count now also keeps every real walk (corridor lane 0.3 m off the recess wall, then 0.8 m in to the spot)
   inside the 6.5 s window at 1.7 m/s; for 17.5 m the longest walk is 10.0 m, 5.9 s, one recess as before.

## Assumptions (checked)
- File `src/world/maps/ctcourseGreybox.ts`, beside the `ctcourse*` files (SPEC section 2 scope), not a new folder.
- The plate opening is 0.55 m, as the live S5 hatch, not 0.6, which equals a body's width (tested: under 2 x radius).
- The A6 cage: the helper needs the cage at least 3.74 m along u and 3.1 m along v so the panel (0.32 m off the centre)
  and the exit release stay over 1.8 m from any body outside. A 3 m bridge holds at most about a 2.6 m cage, so it
  cannot work (the helper throws; tested). SPEC section 12 already took the 4.2 m cage under a 5 m bridge: build it
  with `overhang: 0.4` (the default 0.6 makes a 5.4 m slab).
- The deck is a solid block to the floor (no space under it). The stair is one 27-riser flight (0.163 m) with no landing.
- The camera sweep is +-8 deg (tested: the corridor stays in frame through the sweep); jam posts are 1 m outside each
  end (in `JAMMER.range`); the release is at y 1.2.

## Open items (for the set builders and the SPEC owner)
- A1: SPEC's striped mark at x 11.2 is 0.5 m off the 0.6 m wall (face x 11.7): the boost takes the yard-side lip there.
  Use the helper's mark (x 10.8).
- A5: SPEC's drum stack (1.8 m, x 60-63, z 29-33) is 2 m from the beam line at x 58: a lone player jumps the beams off
  it (2.72 m reach). Keep solo-standable tops `BEAM_KEEP_CLEAR` (4.0 m, or 2.8 m for a 1.8 m top) off the line on the
  apron side, or make the stack over the mantle (1.9 m or more) and `noLedge`.
- A6: the cage door is not a push-bar door any more; its exit release is on the drive cabinet's back. The register and
  SPEC's "push-bar door" wording should follow.
- A3: B's first hop is a 10.0 m walk (not 8.75 m): the hide spot is at x 88.6, against the reveal's east cheek.
- Wiring: the set builders copy each greybox's `lips` into `COOP_LIPS`, keep `GREY_KEEP_CLEAR` round them, and run
  `soloJumpThreats` over the whole map (the helper only proves its own pieces).
