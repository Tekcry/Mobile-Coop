# marlow-final - greybox helpers (draft, scratch branch)

By Night Shift | Course Ready Build, 2026-10-23, on `scratch/marlow-final-greybox` (cut from `feature/marlow-final`, HEAD
45848cf2, which contains 8d056858). Handed to Menu Notes as-is when the job lead stopped the work. Nothing here is merged.
Review it before you use it.

Module: `src/world/maps/ctcourseGreybox.ts`. It is pure and Babylon-free: it imports only the config tables, `JAMMER`,
`SCANNER` and types. The live `ctcourse*.ts` builders are untouched.

## State
- Done: the module with 6 helpers and `applyGreybox`. `npx tsc --noEmit` and eslint on the module are clean.
- **Not done: the Vitest tests.** They were stopped before they were written. Nothing proves the co-op-only property
  yet. See "Tests to write" below.
- Not done: wiring into the ctcourse map, and `tests/voxelFit.test.ts`, which is not needed because no map was touched.
- Not built: an overwatch ledge helper, the split route with a one-way drop, and the back-to-back or stack climb. Stack
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
- Constants:
  - `COOP_LIP` 4.4;
  - `COOP_BAND` = `WALL_JUMP.maxUp` + 0.5 to `TEAM.boostMax` (4.3-4.5);
  - `LEGUP_STANDOFF` 0.5 (the current `LEGUP_SPOT`);
  - `GREY_KEEP_CLEAR` 3.0 m (an assumption, not yet checked against `soloJumpReach`);
  - `INTERACT_REACH` 1.8 / `INTERACT_DY` 1.5 (`Interactables.nearest`);
  - `JAM_WINDOW` = useMax 5 + reboot 1.5;
  - `SILENT_CROUCH` = `GEARS.crouch[2]` 1.7;
  - `SOLO_RUN` = top standing gear 4.0;
  - stair rise 0.165, run 0.285.

## Helpers
| Helper | Parameters | Numbers it relies on | Serves |
| --- | --- | --- | --- |
| `boostWall` | id, at, facing, span, lip 4.4, thick 0.6, wicket (v or null), wicketW 1.2, spot | `COOP_BAND` (`WALL_JUMP.maxUp`, `TEAM.boostMax`); `LEDGE.climbDepth` 0.38 < thick (the wall top can be walked, so the relay works); bolt gate `side` = the far side | SPEC A1 E1 (C1); SCENARIOS S1 / S2 |
| `coopDeck` | id, at, facing, span, depth, lip 4.4, open [v0, v1], screen 1.2, stair start/end/false, stairW 1.2, rope (v), spot | `COOP_BAND`; `TEAM.ropeMin` / `ropeMax` 2.2-6.0; one solid block marked `noLedge`, with one manual ledge on the open span only (LD 11.5) | SPEC A2 staging (C3), A6 gallery + rope (C7), A8 gallery split (C10); SCENARIOS S2, S7 |
| `throwGateway` | id, at, facing, gap 6, span, wallH 6, header 4.8, thick 0.3, beams [0.35, 0.9, 1.45], stand 1.2, release (u, v) | `TEAM.throwDist` 3.2 (landing = 3.2 - stand past the line); `throwApex` 1.7. Hand check: a runner 0.3-1.6 m behind the thrower crosses the line with the feet at about 1.65 m, above the 1.45 m beam, and the head at about 3.4 m, under the 4.8 m header | SPEC A5 E6 (C6), A8 beam curtain; SCENARIOS S3 |
| `hangPlate` | id, at, facing, deck 4.4, slab 0.4, cage [4.2, 4.2], overhang 0.6, hole 0.55 | hole < 2 x `MOVEMENT.radius` (it throws otherwise); the holder mark 0.7 m behind the hole centre, under the `hangPoint` probe at 0.4 / 0.7 / 1.0 m; the panel at y 1.2, 0.48 m from the hang point, reached at depth 2.5 (`hangDepthMax`, `hangReaches`: root 2.52); outside the cage it is 2.4 m or more away, over the 1.8 m reach; from the deck dy 3.2, over 1.5 | SPEC A6 E9 (C8); SCENARIOS S10 |
| `syncStation` | id, kind scan/pair, a / b {x, z, yaw}, y 1.2, walk, doorId | `syncMinGap`: scan 2 x `SCANNER.reach` + 2 x radius = 4.6 m; pair 2 x 1.8 + `SOLO_RUN` x `PAIR_WINDOW` = 7.6 m | SPEC A7 E11 (C9), A8 time locks; SCENARIOS S20 / S34 |
| `jamRelay` | id, at, facing, length (19 m at most), width 3.5, height 3.0, side, recessDepth 1.0, recessW 1.4, camY 2.8 | `JAM_HOP` = 0.8 x 6.5 x 1.7 = 8.84 m, which sets the recess spacing; `JAMMER.range` 20 to the posts; `CAMERA.mountMin` / `mountMax`; a lone jammer must stand still (`stillSpeed` 0.45) | SPEC A3 E2 (C4), COOP-INVENTORY E5; SCENARIOS S13 |

## Tests to write (not done)
For each helper, run `generateLedges(boxes)` and add the manual `ledges` (`makeLedge`). Then:
- `boostWall` and `coopDeck`: `soloJumpThreats(solid, lip)` is `[]`; every lip is in `COOP_BAND`; the real
  `findJumpTarget` boost search from the leg-up spot (apex `TEAM.boostMax - 1.15`) finds the lip; the deck ends have no
  lip; `GREY_KEEP_CLEAR` is at least the largest `soloJumpReach(t, 4.4)`.
- `throwGateway`: `throwArc` / `throwLanding` feet stay over the top beam while the body crosses the line (runner 0.3-1.6
  m behind the thrower); `throwRoom` is 'ok' at the landing; `LEAP_APEX` is under the top beam; `crouchHeight` is over
  every beam gap.
- `hangPlate`: the cage is closed at body height except the locked door; the panel is out of reach from outside the
  cage and from the deck; `hangReaches` is true at some depth up to `hangDepthMax`; the egress gate frees the door.
- `syncStation`: it throws under `syncMinGap`.
- `jamRelay`: every hop is `JAM_HOP` or less; each recess hides a body from the camera (a 2D line of sight check);
  crossing at `stillSpeed` takes longer than `useMax`.

## Assumptions (unreviewed)
- File `src/world/maps/ctcourseGreybox.ts`, beside the `ctcourse*` files (SPEC section 2 scope), not a new folder.
- The plate opening is 0.55 m, as the live S5 hatch, not the SPEC's 0.6, which equals a body's width.
- The drive cage is 4.2 m square, so its panel is out of reach from outside. That is bigger than the SPEC A6 bridge
  (3 m wide): the bridge must widen or the panel layout change.
- The deck is a solid block to the floor (no space under it). The stair is one 27-riser flight with no landing.
- The camera sweep is +-8 deg; jam posts are 1 m outside each end; the release is at y 1.2.
