# LR16 lighting batch check - LR16g + LR16-L part A + LR16-W (T, S1, S2, S3, INT)

Checker: fresh Opus 5.5, 2026-10-24, read only. Head `origin/feature/sector-redesign-lr16int` `7a3b5815` (= `82f9e1bb` + lr16w
`7f81c2db` + lr16pol-a `36547c1e`, the last already checked PASS and skipped). Scope: `git diff 82f9e1bb 7a3b5815 -- . ':!docs'`
less the pol-a files: `src/voxel/lampBake.ts`, `lampJobs.ts`, maps `campusS2`, `campusS4`, `ctcourse`, `warehouseS1-S3`,
`warehouseSectors`, tests `campusS2`, `ctcourseLight.tuned.json`, `lampBake`, `lampBoxAlign` (new), `torchOcclusion`,
`warehouseLamps`, `warehouseS3Light`. Briefs: `briefs/LR16g.md`, `LR16-L.md` part A, `LR16-W.md` (polish branch); reports
`checks/lr16g-build.md`, `lr16l-a-build.md`, `lr16w-{t,s1,s2,s3}-build.md`, `lr16w-int.md`.

## Verdict: FIX (one must-fix, one line of map data)

Everything else is sound: the bake alignment is correct and read by every box reader, `LAMP_VERSION` is bumped, no shader /
field / constant / band changed, the map moves are realistic fittings, lamp ids hold, route moves are short and on nav. The one
defect is a ledge broken by the new S3 stores occluder.

## Must-fix

1. **The S3 stores top sits inside the hang of the crane walkway's north lip.** `src/world/maps/warehouseS3.ts:340`
   `b.box(1.5, 2.43, -7.325, 3.0, 0.06, 2.65, STEEL)` spans z -8.65..-6.0. The walkway box (`:300`, top 3.0, north face
   z -7.45) keeps one uncut hangable lip x -3.6..15.8 (measured: `generateLedges`, `canHang` true; the cut test at
   `anchors.ts` `cutLip` probes `top - 0.3` = 2.7, above the plate). A body lowered into a hang there has its feet at
   3.0 - `HANG.drop` 1.9 = 1.1 and its centre `HANG.out` 0.22 off the face (z -7.23, capsule r 0.3: z -7.53..-6.93), so over
   x 0..3 the 6 cm plate at y 2.43 runs through the hanging body (the lower-into-hang room check samples y ~1.4, under the
   plate, so it allows it); a drop from there leaves the capsule inside the plate. `suppressLedgesNear` cannot help (it
   kills the whole 19.4 m lip).
   **Fix:** trim the top to the strip the lamp rays cross, north of the hang column:
   `b.box(1.5, 2.43, -6.425, 3.0, 0.06, 0.85, STEEL);` (z -6.85..-6.0). #77's rays to the officer's chest / head cross
   y 2.4 at z -6.14 / -6.65, so the plate still cuts them. Verified here with a probe copy of `warehouseS3Light` that
   patches only that box: 11 / 11 green and the print identical to the head's to 2 decimals (stores officer 0.14, +0.016;
   cage counter 0.60). Update the comment at `:337-338` ("a top over the back racks" -> "a top over the front of the back
   racks, clear of the walkway's hang"). Re-run `warehouseS1Light`, `warehouseS2Light`, `warehouseS3Light`, `sectors`,
   `warehouseCoopS3`, `lampBoxAlign`.

## Checks

### 1. LR16-L A (`src/voxel/lampBake.ts:71-110`)
- Math: `alignedFrom(l, from, c) = l - c * floor((l - from) / c + 1e-9)` gives `from <= origin < from + c` (for a light
  below `lo` too: `l - from < 0`, the floor rounds the other way, origin still in `[from, from + c)`); the 1e-9 can put the
  origin ~1e-10 under `from`, harmless (lookups clamp). Counts `ceil((x1 - origin) / c - 1e-6)`: covers `x1`, no spare row
  on an aligned end (the downward lamp's `y + c`). The seeded test asserts all of this on 400 lamps.
- Readers: `lampBox` has one caller (`bakeLamps:180`), which stores `bx` in `r.boxes` and passes the same `bx` to the march
  (`bakeOne`), the penumbra pass and `bounceLamp`. `bakeVisSampler` / `LightField` (`lightField.ts:40-52, 140`), the shader
  data (`bakedLamps.ts:255-257`, origin and counts from `r.boxes`), `fitLampAtlas` / `fillLampAtlas` and the editor's
  `lampVolume` all read `r.boxes`; nothing recomputes a box from `lo`. Worker bakes merge per-part `boxes`
  (`lampJobs.ts:86`). Parity by construction: one box, one byte set.
- `LAMP_VERSION` 5 -> 6 (`lampJobs.ts:21`) with its reason. No shader, field, `lampMath`, `darkCurve`, `BOUNCE` change.
- Tests are meaningful: the A3 corridor forces `lo` y -2 and reproduces the bug (base 0.01 / 0.02 per the report), the
  0.02-0.19 m sweep, a real beam still shadows (<= 0.2), the wall guard (step 0.367 -> 0.265 vs limit 0.32; I 0.4 lateral
  3.63 -> 2.92 vs 3.0, the lead's decision 3). `lampBake` penumbra lamps moved 3.0 -> 3.1 / 2.3 so the read rows stay
  cell-centre rows as on the old grid (a sampling-phase fix, not a tuned limit); the one 5 mm slack is on the
  `w[1] >= w[0]` order check whose real assert (`w[2] > w[1] + 0.2`) is unchanged.
- Allow-lists: `ON_ITS_POST` (campus floods on their poles, bollards 0.05 m inside their post tops, warehouse exit signs
  #34 / #53 0.09 m off the wall: lead decision 1) and `KNOWN_EMBEDDED` (`campusOps:16`, radius 0, off) are justified;
  `campusOps:81` was removed by the real fix (T).

### 2. Map data (LR16g, LR16-W)
- Lamp counts: `S1_LAMPS` 54 -> 54, `S2_LAMPS` 22 -> 22 (same rooms, same order); `S3_LAMPS` gains one entry at its end
  (#133, the C3 door light), #76-#132 unchanged; the warehouse bakes 134 lamps, #133 is the last, so no id after it shifts.
  `warehouseOps:34` / `:53` unmoved.
- Realistic levers: night levels (lit fittings >= 0.03: lowest S3 #112 / #133 0.03, S1 #38 0.037), beams 0.45-1.0 rad
  (S2 #54 0.85, #56 0.62, #58 1.0, #59 0.45, #64 0.75, #72 0.65; S3 #86 / #91 0.6), rows / columns moved on their grid at one
  height per room (`warehouseLamps` grid / mount / roof / climb-clearance tests green), dead / lit swaps (S1 #32, #36, void;
  S2 #67; S3 #113, #130), no fitting at y >= 5.9.
- No test band, constant or light-model file changed. Test edits: the S3 crane operator's POCKETS entry (L6, same name),
  the `lampBake` re-baseline (above), the stale S2 cage `LR16D_MOVED` key, the type import in `torchOcclusion`, the new
  `campusS2` atrium test and the new `lampBoxAlign`. `ctcourseLight.tuned.json` re-taken (A) with its `_note`.
- Route points (probe on the built `warehouseOps`): all 20 moved points move <= 1.00 m (S2 R2[17] / R2[18] exactly 1.00,
  crane operator 0.99), each stands on the same surface as before (floor / rack top 4.0 / deck 3.3 / plant roof 3.8 / the
  5.8 header and 5.0 main grips), no solid in the body column of any floor point. Analytic runtime nav (`runtimeNav`, the
  e2e-sectorops rule: path and detour <= 2.5x + 6 m, budget 40000) over every walked leg of every warehouse route: 136 legs,
  0 fails; every guard route leg has a path (the crane operator's (7.3, -7.5) -> (14, -6.8) included).
- S3 crane operator post (7.3, -7.5): open floor 1.3 m east of the cage fence, 0.05 m inside the walkway's footprint
  (underside 2.8: headroom), clear of the die rack (x 10.2-11.8); `sectors` M8 green.
- S3 stores occluder: collision and nav unaffected (the top is `overhead`, 2.46 is not a nav layer under the 2.8 walkway,
  `noLedge` gives it no lips; the side panel stands on the cage fence line, which already blocks nav). Ledge: must-fix 1.
- Campus S4 basket post (17.55, 38.5): `collide = false` (no body, nav blocker or cover), 1.51 m from the rear gate's hinge
  (17.4, 40) against a 1.2 m leaf, off the lamp's cell column; the old spot (18, 37) stood 0.3 m from route point
  (18.0, 37.3), the new one is clear of every route point. `campusS4`, `campusRuntimeNav` green.

### 3. Gameplay vs render
No new read of graphics state. The only code change is the bake box; the meter (`LightField`), the guards (`fieldLight`)
and the lamp shader read the same `r.boxes` / `vis` bytes, and every map change is registry / bake data.

### 4. Wire, protocol, save
No file under `src/net` or `src/save`, no `PROTOCOL_VERSION` or `SAVE_VERSION` change in scope.

### 5. Runs (this head, slot lock each, `--maxWorkers=2`)
- `npx tsc --noEmit`: clean.
- `warehouseS1Light`, `warehouseS2Light`, `warehouseS3Light`, `lampBake`, `lightField`, `bounceGrid`, `lampFalloff`,
  `darkCurve`, `warehouseLamps`, `lampAudit`, `sectors`, `warehouseCoopS1-S3`: 14 files, 207 passed, 3 skipped.
- `lampBoxAlign`, `ctcourseLight`, `campusS4`, `campusRuntimeNav`: 61 passed, 1 skipped, 1 failed: `ctcourseLight`
  "every must-see spot reads lit enough" with exactly one point, "S7 stair step 1 (top): 0.31 < 0.33" (expected: C2 not
  merged, master replaced the map).
- Extra bake readers: `campusS2` (the LR16g atrium test), `lampAtlasFit`, `lampLevel`, `torchOcclusion`: 54 / 54.
- Probes (untracked, deleted): moved-point floor / clearance / nav, the walkway lips, the trimmed stores top.

## Polish (not blocking)
1. `warehouseS3.ts:341` the stores side panel is marked `overhead` (meant for pieces above head height); harmless only
   because the fence at x 0 already blocks nav there. Mark only the top `overhead`.
2. The side panel adds a 2.65 m high cover wall (both faces) and a sight blocker on the stores' west fence (z -8.65..-6.0):
   realistic sheet steel, but a new hide spot west of the cage; look at it on the GPU sheet / Guard AI walk.
3. `tests/warehouseLamps.test.ts:119` `LR16D_MOVED` still holds four `S1 plantDeck ceiling *,-15.15` keys that match no
   fitting since S1 moved that row to z -16.9 (INT risk 3).
4. Many points pass by the test's TOL, not their nominal band (INT table): C3 near door 0.448, C3 checkpoint 0.552, S1
   security office door 0.436, S2 cross aisle east 0.562, R2N ladder foot 0.439, north gangway 0.387, the C2 KEY spot 0.444.
   Any later light change in those rooms can tip them.
5. The LR16g Marlow Yard re-level (`ctcourse.ts:79-84, 422, 428`) and `ctcourseLight.tuned.json` target the map master
   replaced (marlow-final): expect a conflict or a re-level at the master merge; the S7 stair red clears only then.
6. Brief deviations accepted as realistic: S1 fire lobby #32 moved 2.1 m (L3 says <= 1.5 m; it stays inside the lobby as a
   1 x 2 column), the facade door bulkhead row raised 3.0 -> 3.3 (L3 "same height"), S3 exit sign #131 radius 1.5 (brief
   0.6), the S4 post at z 38.5 (brief 37).
7. `lampBoxAlign`: the "inside a solid cell" check can no longer fire (the light is always on a cell corner); the live
   check is only the cell straight under the light, so a lamp embedded sideways (the S2 #61 thin-rail case the L-A report
   found) is not guarded. A 6-neighbour check would cover it.
8. Campus S4: the cage centre now reads 1.00 (x 16.5-19.5, z 35.5-38.5; route points (18.0, 37.3) and (19.3, 36.6) in the
   pool) where the post's shadow held it at 0.29. Lead decision 2 says the cage stays lit; confirm the stealth intent there
   on the GPU sheet.
9. The 0.2 m conservative bake is grid-phase sensitive (L-A lead call 5): the box phase now follows the lamp height, so a
   floor row can sit half in the floor's grown solid row (the reason the `lampBake` edge tests moved their lamps).
10. The S4 basket supports are non-colliding posts standing in the walkable cage / hall (walk-through), as before.

## Laptop (unchanged from INT)
`e2e-sectorops` (moved legs, the crane operator's post, the S4 cage), `e2e-lightbake`, `e2e-darkness`, the GPU sheet; after
the must-fix, add a hang from the walkway's north lip over the stores (x 0-3) to the walk.
