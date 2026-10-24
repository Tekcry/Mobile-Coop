# visual-gate - VG3 build: viewpoints data + shape test

Builder: Night Shift | Cloud Builder 1 (Opus 5.5, cloud), 2026-10-24, from `briefs/VG3.md` (cloud copy on
`cloud-queue`, CLOUD RULES). Branch `feature/visual-gate-vg3` cut from `feature/visual-gate` @ 0b7f46f4. Every coordinate
is copied from origin/master @ 1dc3ecfa (merge of train/69) and cited `<file>:<line>` there. Unit tests only; no e2e,
build, GPU or full vitest run.

## Built
- `scripts/visual-gate/viewpoints.mjs`: the contract typedefs verbatim, `MAPS` (4), `PRESETS`, `VIEWS` (26: 9 / 10 / 5 / 2),
  `RIGS` (3). No imports, nothing frozen, every rule bound null except the rig leak rules. Each view has `upper` (26/26),
  `floor` where floor is in frame (20/26) and `wall` on m-a1-lounge, m-a3-lobby, m-a6-kerb, so-s1-workshop. Each quad has
  a comment citing the map-builder box it lies on (`file:line`, the helper's `b.box` line in brackets).
- `tests/visualGateViewpoints.test.ts`: 13 tests, every assert the brief lists, plus metrics extras per region and
  each rig guard facing its door and >= 1.1 m from it.

## How the regions were read
The four maps were built at origin/master with the pure `LevelBuilder` in a throwaway vitest (scratch checkout, not
committed), each box tagged with the builder call stack (source-mapped `file:line`). Shut door leaves (each door's
hinge, yaw, width, height) were added as boxes, clear glass ignored, frosted kept. For each view a small ray caster
(camera: `CAMERA.fov` 86 deg horizontal, 16:9) cast through the frame to find the faces in view:
- `floor`: a 2 - 3 m patch on the walkable floor at the feet level, every sample on the same floor top, in front.
- `upper`: a band on a wall face from 2.0 m above the feet to the ceiling or as high as stays in frame, preferring the
  farthest face (haze builds with depth); where the facing surface is under 6 m away and a ceiling or roof underside is
  farther, that underside instead (m-a2, cp-s2-b, cp-s3-a, cp-s4-a, cp-s5-d).
- `wall`: on the face the centre ray hits within 8 m (m-a1, m-a6); m-a3 as the BRIEF F7 row; so-s1-workshop as below.
- Each quad: all corners within 48 deg of cam -> target (the test allows 50), >= 76% of a 7 x 7 sample grid inside the
  frame (most 100%), in-frame samples unoccluded (<= 2%, thin posts) and on the quad's plane.
- F4 wall (so-s1-workshop): the compartment wall z -8.8, face -8.95 (`warehouseS1.ts:245`), x 14.2 - 18.2, y 0.3 - 4.8.
  The wall spots at (8.6 / 15.6 / 22.6, 5.5, -9.25) sit 0.25 m off that face and their 55 deg cones graze it (a cone-edge
  count over the visible faces gave it about twice the east wall's edges): the hard arcs land there.

## Source table (origin/master)
Marlow vantages (short ids): m-a1-lounge = `a1-lounge-door`, m-a4-aisle = `a4-main-aisle-east`, m-f-gallery =
`f-gallery-from-a1`; the other six use the same name as their id (`a2-vantage`, `a3-lobby`, `a5-kiosk`, `a6-kerb`,
`a7-corridor`, `a8-vestibule`). Named constants: `A3_POST_WEST` (78.5, 10.75) `a3OfficeRange.ts:74`; `A6_VANTAGE`
(51.0, 56.6) `a6PumpHouse.ts:119`.

| id | source | feet | cam | target | regions |
| --- | --- | --- | --- | --- | --- |
| m-a1-lounge | ctcourseSets/a1Gate.ts:265 | 5, 0, 11 | 3.2, 1.8, 10.2 | 11.7, 1.6, 8 | upper, wall |
| m-a2-vantage | ctcourseSets/a2CarriageShed.ts:371 | 33.5, 0, 12.5 | 31.4, 1.7, 12.9 | 52, 1.4, 12.3 | floor, upper |
| m-a3-lobby | ctcourseSets/a3OfficeRange.ts:370 (:74) | 78.5, 0, 10.75 | 77.0, 1.7, 10.9 | 96, 1.4, 10.75 | floor, upper, wall |
| m-a4-aisle | ctcourseSets/a4GoodsShed.ts:488 | 110, 0, 40 | 110.8, 1.8, 40.6 | 78, 1.5, 35.0 | floor, upper |
| m-a5-kiosk | ctcourseSets/a5Substation.ts:416 | 48.5, 0, 33.2 | 47.3, 1.8, 31.6 | 58, 1.2, 36 | floor, upper (+3 parity) |
| m-a6-kerb | ctcourseSets/a6PumpHouse.ts:388 (:119) | 51.0, 0, 56.6 | 50.2, 1.3, 55.6 | 51.5, 3.2, 66 | upper, wall |
| m-a7-corridor | ctcourseSets/a7DataHall.ts:445 | 73.5, 0, 53.9 | 72.2, 1.7, 53.6 | 92, 1.2, 54.0 | floor, upper |
| m-a8-vestibule | ctcourseSets/a8Strongroom.ts:662 | 107.4, 0, 64.5 | 106.8, 1.7, 64.0 | 126, 1.4, 66 | floor, upper |
| m-f-gallery | ctcourseSets/facility.ts:747 | 14.5, 0, 14 | 14, 1.8, 12 | 14, 6, 21 | upper |
| cp-s1-b | campus-art-shots.mjs:39 | 15, 0, -74 | 15, 1.7, -74 | 19, 0.9, -77 | floor, upper |
| cp-s1-f | campus-art-shots.mjs:43 | -2, 0, -44 | -2, 1.7, -44 | -20, 2, -36 | floor, upper (+3 parity) |
| cp-s2-b | campus-art-shots.mjs:47 | -12, 0, -22 | -12, 1.7, -22 | -18, 6, -5 | floor, upper |
| cp-s2-d | campus-art-shots.mjs:49 | -42, 4.4, -28 | -42, 6.1, -28 | -32, 5, -10 | upper |
| cp-s3-a | campus-art-shots.mjs:54 | 23, 0, -19 | 23, 1.7, -19 | 40, 2, -19 | upper |
| cp-s3-c | campus-art-shots.mjs:56 | 46, 0, -24 | 46, 1.7, -24 | 51, 1.2, -15 | floor, upper |
| cp-s4-a | campus-art-shots.mjs:62 | 10.5, 0, 22.5 | 10.5, 1.7, 22.5 | 10, 2, 32 | upper |
| cp-s4-e | campus-art-shots.mjs:66 | -3, 3.6, 43 | -3, 5.3, 43 | 4, 4.5, 47 | floor, upper |
| cp-s5-a | campus-art-shots.mjs:70 | -48, 0, 20 | -48, 1.7, 20 | -44, 3, 26 | floor, upper |
| cp-s5-d | campus-art-shots.mjs:73 | -39, 4.2, 43 | -39, 5.9, 43 | -44, 5.2, 35 | floor, upper |
| so-s1-goods-in | sector-lights-shots.mjs:46 | -20, 0, -16.5 | -20.5, 1.7, -17 | -13, 4.2, -12 | floor, upper |
| so-s1-girder | sector-lights-shots.mjs:61 | 22.5, 0, -13.6 | 22.5, 1.5, -13.6 | 16, 3.0, -13.6 | floor, upper |
| so-s1-workshop | sector-lights-shots.mjs:48 | 10.5, 0, -16 | 10.5, 1.7, -16 | 18, 3.6, -12.5 | floor, upper, wall (+1 parity) |
| so-s2-aisle | sector-lights-shots.mjs:50 | -12.5, 0, -5.4 | -12.5, 1.7, -5.4 | -12.4, 3.4, 8 | floor, upper (+2 parity) |
| so-s3-hall | sector-lights-shots.mjs:54 | 1.5, 0, 4 | 1.5, 1.7, 4 | 6, 3.9, 9 | floor, upper |
| wh-floods-dock | sector-lights-shots.mjs:68 | -23, 0, -25.2 | -22, 2.2, -25 | -13, 2.5, -19 | floor, upper (+3 parity) |
| wh-flood-workshop | sector-lights-shots.mjs:69 | 19, 0, -24.8 | 17, 2.4, -25 | 11.5, 2.2, -19.5 | floor, upper |
| so-door (rig) | warehouseS1.ts:311 | 0.5, 0, -11.6 | 0.5, 1.6, -11.6 | 0.5, 1.2, -13.8 | leak |
| cp-door (rig) | campusS1.ts:205 | 17, 0, -70.8 | 17, 1.6, -70.8 | 17, 1.2, -73 | leak |
| so-corner (rig) | warehouseS2.ts:77 | -6.5, 0, 4.6 | -6.5, 1.6, 4.6 | -9.45, 1.2, 7 | leak |

Marlow `src` paths are under `src/world/maps/`, the rest under `scripts/` (views) or `src/world/maps/` (rigs). MAPS:
shots-ctcourse.mjs:50, campus-art-shots.mjs:31 (sectorGuards 0 -> 1), sector-lights-shots.mjs:33, e2e-darkness.mjs:10.
The per-quad box citations are in the comments of viewpoints.mjs.

## Parity cards (3 per map, floor + 1.0, >= 1.2 m from any collision box between 0.1 and 2.0 m, in frame, visible)
Lamp levels estimated from the map's light list (in-radius, in-cone, unoccluded, (1 - d / r)^2 x intensity; no bounce):
VG5 measures the real level at run time.
- Marlow (m-a5-kiosk): pool (56.5, 1, 29.2) est 0.83; between (51.8, 1, 34.3) 0.43; darkest (56.6, 1, 39.1) 0.02.
- Saltmarsh (cp-s1-f): canopy pool (-24.5, 1, -47.9) 1.27; between (-5.8, 1, -43.2) 0.64; darkest (-5.2, 1, -38.3) 0.
- Sector Ops: pool (19.9, 1, -13.1) 0.64 on so-s1-workshop; between (-10.9, 1, 5.4) 0.29 and darkest (-11.8, 1, -0.6)
  0.10 on so-s2-aisle.
- Warehouse (wh-floods-dock): dock-flood pool (-18.4, 1, -18.6) 0.67; between (-17.4, 1, -22.4) 0.34; darkest yard spot
  (-14.9, 1, -24.6) 0.

## Rigs per tag (map dumps at v4.82.0, v4.88.0 and origin/master; door anchor and every collision box within 4 m equal)
- so-door: the transport office's corridor door, hinge (-0.1, 0, -13.8), width 1.2, yaw PI / 2, hinged, unlocked:
  `warehouseS1.ts:297` at v4.82.0, `:311` at v4.88.0 and master (`for (const x of [-5.1, -0.1, 3.9]) b.door(...)`).
  s = 1: guard (0.5, 0, -15.0) yaw 0 in the office, camera in the corridor; leak on the corridor face z -13.65.
- cp-door: the gatehouse door, hinge (16.4, 0, -73), width 1.2, yaw PI / 2, hinged, unlocked: `campusS1.ts:205` at all
  three tags. s = 1: guard (17, 0, -74.2) yaw 0 inside, camera on the verge; leak on the outer face z -72.85.
- so-corner: the storage-hall aisle x -13.5 to -10.5 (side corridor) between R2N (`warehouseS2.ts:227` v4.82.0, `:234`
  v4.88.0 / master) and the high bay R3N (S2_COOP row `:77` at all three, built `:229` / `:236` / `:236`), meeting the
  cross aisle z 4 - 7 (main corridor). Every box in x -16 to -4, z 3 - 16 under 4.5 m hashes equal at the three tags.
  Guard (-12, 0, 12) yaw PI, 5 m up the aisle facing the junction; camera (-6.5, 1.6, 4.6) on the cross aisle 4 m east of
  the junction; leak = R3N's south face z 7, x -10.45 to -8.45, 0 - 2.5 (the corner wall on the camera side of the
  beam's wall, R3N's west face).
- Rig guards stand 1.2 m from the door centre (>= 1.1, `DOOR.enemyReach` 1.0). Both door rigs are on section 1 of their
  map; campusOps boots with sectorGuards=1, warehouseOps with 4.

## Deviations
- D1 `floor` omitted on 6 views where no floor is in frame at origin/master (the brief says every view): m-a1-lounge (the
  lounge's sliding door is shut and the east wall 2.7 m ahead fills the frame), m-a6-kerb (the 1.2 m sump kerb hides the
  floor from the 1.3 m eye), m-f-gallery (the camera looks 25 deg up; the frame's foot is 3 deg under level), cp-s2-d (see
  O1), cp-s3-a (the 3.0 m board screen 3.5 m ahead, `campusS3.ts:397`), cp-s4-a (the rack row ends at 1.5 m leave a strip
  under 1.5 m wide). A quad there would mask walls or nothing. The test requires `upper` on every view, `floor` where present.
- D2 m-a3-lobby `wall` sits on the plaster skin face z 12.47 (skin `a3OfficeRange.ts:396`), 3 cm in front of the greybox face
  12.5, so it is the drawn surface; x 81 - 96, y 1.8 - 2.9 as the BRIEF F7 row.
- D3 so-corner reads "facing the junction's far corner wall (camera side of the beam's wall)" as: camera on the cross aisle
  facing the corner block whose side wall the beam runs along, leak on that block's face towards the camera. A camera
  facing the corner across the junction would look through the beam's real haze in the junction mouth and leak on a fixed
  build too.
- D4 Rig `src` cites the door line (door rigs) or the corner block's data row (so-corner); `door.src` cites the door line
  per tag.

## Test results
- `npx vitest run tests/visualGateViewpoints.test.ts --maxWorkers=2`: 1 file, 13 passed.
- `npm run typecheck:fast`: clean.
- `npx eslint tests/visualGateViewpoints.test.ts`: clean (scripts/ is outside the lint set).
- `node --check scripts/visual-gate/viewpoints.mjs`: ok.

## Files touched
- `scripts/visual-gate/viewpoints.mjs` (new)
- `tests/visualGateViewpoints.test.ts` (new)
- `docs/visual-gate/checks/vg3-build.md` (new, this file)

## Open items
- O1 cp-s2-d frames the inside of the SW stair core at origin/master: the eye (-42, 6.1, -28) is on the core's inner walls'
  corner (x -42.0 `campusS2.ts:321`, z -28.0 `:323`), 0.1 m under its landing slab (`:341`). The frame is the core's flight
  within 1.5 m; the only band above head height is a strip of the west corridor seen past the wall the eye stands on.
  F8 on this view does not measure the L1 open plan. The source row (campus-art-shots.mjs:49) needs a new eye; VG3 copies it
  (A4). Lead's call: re-point the row, or drop F8 from cp-s2-d and keep cp-s2-b / cp-s3-a.
- O2 cp-s3-c's eye (46, 1.7, -24) stands on the south face of the closed EMC room box (x 42 - 48, z -24 to -16,
  `campusS3.ts:389`): the view looks through that box (its faces seen from inside are culled). Coverage only (no target).
- O3 Framing was checked geometrically, not rendered. Suggested GPU look before VG5's first laptop run (lead decides),
  on an origin/master build, laptop slot 4189:
  `E2E_GPU=1 E2E_PORT=4189 ONLY=s2-d,s3-c,s3-a,s4-a timeout 1200 node scripts/campus-art-shots.mjs C:/NightShift/scratch/visual-gate/vg3-look look`
  and `E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs C:/NightShift/scratch/visual-gate/vg3-look look a1-lounge`.
- O4 Parity levels are estimates (no bounce, no sky): if VG5 finds two cards of one map in the same A15 band, move one card
  along its view (the candidates lists are in the scratch notes, not kept; rerun the same rule).

## Polish (vg3p)

Builder: Night Shift | Cloud Builder 1 (Opus 5.5, cloud), 2026-10-24, from `briefs/visual-gate-vg3-polish.md` (cloud-queue).
Branch `feature/visual-gate-vg3p` from `feature/visual-gate` @ d9d347e8. Maps read at origin/master 46a7cf85 (no map file
changed since 1dc3ecfa). Polish list: `vg3-check.md` "Polish" and `vg1-check.md` polish 3.

### Method
- Projection: the harness's own `projectQuads` (`harness.mjs`) at 960 x 540, the photo camera as Babylon LookAtLH x
  PerspectiveFovLH with `CAMERA.fov` 86 deg horizontal at 16:9 (vertical 55.3 deg, FOVMODE_VERTICAL_FIXED). It reproduces the
  checker's pixel sizes exactly (m-a2 floor 127 x 30, m-a6 wall 301 x 83).
- Surfaces: the four maps built at origin/master with the pure `LevelBuilder` in a throwaway vitest (scratch, not committed),
  each box tagged with its source-mapped call stack, plus cylinders, shut door leaves and (warehouse maps) the Epic detail
  pass. For each region a search over its own plane (0.1 - 0.2 m grid) kept the points whose first ray hit from `cam` lies on
  that plane (within 3.5 cm) and inside the frame, then picked the axis-aligned rectangle nearest the old one (or the largest)
  with >= 60 px in both axes and >= 60 px true width where possible. Thin trim (skins, rails, posts under 12 cm) may cover <= 6%.
  Upper bands stay above feet + 2.0.

### Changes (old -> new px at 960 x 540)
| region | old | new | how |
| --- | --- | --- | --- |
| m-a1-lounge.upper | 606 x 248, top off (y -41) | 522 x 160 | clipped to 2.3 - 2.9 (frame top) |
| m-a2-vantage.floor | 127 x 30 | 148 x 76 | 5 x 1.6 m, 5.5 - 10.5 m out |
| m-a2-vantage.upper | 58 x 15 | 132 x 74 | same roof underside, 18 - 25 m out (was 31) |
| m-a3-lobby.upper | 9 x 29 | 126 x 114 | same south wall, x 81.4 - 87.4 (was edge-on at x 94 - 97) |
| m-a4-aisle.upper | 36 x 107 | 74 x 125 | same rack face, x 98.8 - 102.2, 2.0 - 4.2 |
| m-a5-kiosk.upper | 110 x 54 | dropped | wall x 69.75 solid to 4.5 only, 22 - 25 m out: max ~51 px tall |
| m-a6-kerb.upper | 75 x 220 (true width 54) | 83 x 196 (65) | 2.4 m wide, 2.4 - 9.4 |
| m-a7-corridor.upper | 13 x 51 | 77 x 133 | same south wall, x 77.6 - 85.6, 2.0 - 3.2 |
| m-f-gallery.wall | none | 519 x 198 | new: the 'gal' wall z 20 (facility.ts:159), band 0 - 4.5 (:293 [:268, :261]), 1.6 - 4.4, 7.75 m ahead |
| m-f-gallery.upper | 435 x 172 (2.0 - 4.5) | 435 x 93 | moved up the same wall: band over the glazing 7.5 - 10 (:313 [:261]), 7.6 - 9.9 |
| cp-s1-b.floor | 586 x 356, foot off (y 694) | 372 x 179 | clipped |
| cp-s1-b.upper | 46 x 25 | dropped | wall z -84 through the gatehouse window: max ~33 px tall |
| cp-s1-f.upper | 35 x 33 | dropped | wall x -70, 68 m out: max ~32 px tall |
| cp-s2-b.floor | 247 x 54 | 426 x 72 | 6 x 4.8 m band at the frame's foot (true width 55) |
| cp-s2-b.upper (F8) | 143 x 51 | 253 x 121 | same roof underside, z -12.2 to -4.2 |
| cp-s3-a.upper (F8) | 294 x 92, top off (y -12) | 252 x 67 | clipped (x from 37, z to -8.8) |
| cp-s4-a.upper | 161 x 42 | 211 x 75 | same roof underside, z 33.7 - 39.1 |
| cp-s5-a.floor | 273 x 60, left off (x -10) | 136 x 76 | 1 x 5 m strip inside the frame |
| cp-s5-d.floor | 534 x 303, foot off (y 706) | 267 x 122 | clipped |
| cp-s5-d.upper | 343 x 123, top off (y -28) | 281 x 92 | clipped |
| so-s1-goods-in.floor (F2) | 236 x 50, foot off (y 546) | 220 x 43 | clipped; kept under 60 (see D5) |
| so-s1-girder.floor | 136 x 20 | dropped | strip at the frame's foot (a 60 px patch is a 0.4 m sliver) |
| so-s1-girder.upper (F1) | 146 x 47 | 95 x 85 | same west wall x 8.15, z -13.6 to -11, 2.2 - 4.6 |
| so-s1-workshop.floor | 285 x 69, foot off (y 570) | dropped | clipped it is 39 px tall |
| so-s2-aisle.upper | 44 x 35 | dropped | wall z 18, 23 m out between racks: max ~48 px tall |
| so-s3-hall.floor | 165 x 20 | dropped | 17 m out at the frame's foot |
| so-s3-hall.upper | 307 x 101 (4% off its surface) | 250 x 90 | x 2.5 - 5.9, 2.2 - 3.2, all on the wall / lintel / slab edge |
| wh-floods-dock.upper | 48 x 114 | 71 x 110 | same facade, 8.8 m wide, 2.2 - 6.0 |
| wh-flood-workshop.floor | 225 x 70 (pole 10%) | 176 x 79 | moved clear of the fence end post (warehouse.ts:481) |
| wh-flood-workshop.upper | 241 x 291, top off (y -7) | 241 x 249 | clipped to 2.2 - 5.8 |

Every other region was already >= 60 px and in frame and is unchanged.

### Refs
- `campusS3.ts:397` -> `:396` (the board screen's `bx(...)`, viewpoints.mjs cp-s3-a; D1 above still says :397, read :396).
- Checked every quad's cited box against the tagged stacks: also corrected so-s1-girder (`:267` no longer on the quad; now
  `:268 [:213], :269 [:192], :275`) and added the hit skins / helper lines on m-a3, m-a4, m-a6, m-a7, wh-floods-dock (door
  head `warehouse.ts:222`). No other ref was off.

### Deviations
- D5 so-s1-goods-in.floor stays at 220 x 43 px (under 60): F2's `floor.nearBlack` rule needs it and this frame shows no more
  bay floor (the frame's foot, the pallet stacks `warehouseS1.ts:370` / `:377`). Floor regions carry stats only (no blotch
  erosion). The test lists it in `SMALL` (>= 40 px).
- D6 7 regions dropped (4 upper, 3 floor; table). The test now requires `upper` on every view except `NO_UPPER` (exact list);
  none of the 4 carries a rule (m-a5 F6 is whole-frame only).
- D7 m-f-gallery's upper moved from the band under the gallery (now its `wall`) to the band over the glazing on the same wall,
  so the two regions do not overlap.
- D8 Steps 1-5 went in one commit (the test had to change with the data to stay green).

### Test results
- `npx vitest run tests/visualGateViewpoints.test.ts tests/visualGateHarness.test.ts --maxWorkers=2`: 2 files, 36 passed
  (viewpoints 16, 3 new: drops / walls, view region size and frame, rig leak size).
- Mutation: the old viewpoints.mjs (HEAD before vg3p) fails 2 (no drops / gallery wall; m-a1-lounge.upper y -41).
- `npx tsc --noEmit -p .`: clean. `npx eslint tests/visualGateViewpoints.test.ts`: clean. `node --check`: ok.

### Open items
- O5 The rig leak quads (so-door, cp-door) run off the frame's top (y -47: door top + 0.3 at 2.2 m, as the brief's rig rule
  sets) and sit on the wall face 0.15 m in front of the recessed leaf; the test checks only their size. VG5 clips by raster.
- O6 Thin occluders on unchanged regions (sample share): so-s1-workshop.wall (F4) 14% under the catwalk deck
  (`warehouseS1.ts:344`, y 2.8 - 3.0, 1.2 m deep) crossing the region; m-a6-kerb.wall 37% of samples on the cage's 0.1 m posts
  and rails 3 cm proud of its face (`a6PumpHouse.ts:696` / `:686`, part of the cage's look); m-a3-lobby.wall 6% notice boards
  1 cm proud (`:401` / `:402`); wh-flood-workshop.upper 4% the fence's top rail (`warehouse.ts:481`). Lead's call whether F4's
  wall should stop under the catwalk (0.3 - 2.7).
- O7 Pixel sizes assume the photo camera keeps `CAMERA.fov` 86 at 16:9; a different photo FOV changes them (the test reads
  `CAMERA.fov`).
