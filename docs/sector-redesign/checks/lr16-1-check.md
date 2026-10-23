# LR16-1 check - one-bounce fill

Checker: Opus 5.5 (fresh), 2026-10-23. Branch `feature/sector-redesign-lr16-1` @ 4007eafe, base c7a26ca7. Brief
`origin/cloud-queue:briefs/sector-redesign-LR16-1.md`, build report `lr16-1-build.md`.

## Verdict: FIX (1 blocking item)

The bake, the runtime sum and the picture wiring are sound: integer sync is exact, every registry path (switch,
group, shot, jam flicker, EMP, restart `resetTo`, co-op `lampSync` kill / resetTo, torch mirror) bumps `reg.version`,
the client sums the same baked ids from the same deterministic bake, the hot path is allocation-free, no sampler is
added, and the cache key / `cacheOk` cover the bounce. One defect breaks "no bleed through walls" and "dark rooms
stay dark" whenever a wall does not sit in the middle of a 1 m cell.

## Runs
- `npx tsc --noEmit`: clean.
- `npx vitest run tests/lampBounce.test.ts tests/bounceGrid.test.ts tests/lightField.test.ts tests/lampFalloff.test.ts
  tests/lampGridLossless.test.ts tests/levelFillParity.test.ts tests/perception.test.ts --maxWorkers=2`: 7 files,
  79 tests PASS (117 s). There is no `perception*` file other than `perception.test.ts`.
- Scratch measurements (temporary test files, deleted, not committed): the numbers below.

## Blocking

### 1. Bounce bleeds through walls by the 1 m trilinear read (fails the brief's own wall acceptance off-centre)
`src/voxel/lampBounce.ts:324-337` (3-point share per 1 m receiver cell), read by `src/world/lightField.ts:254-257` /
`:339-347` (`bounceInto`, trilinear between 1 m cell centres) and the shader's `nsGrid2` (`src/world/bakedLamps.ts:734`,
linear tap of the same bytes).

The acceptance fixture puts the 0.2 m wall at x 10.4-10.6, the middle of cell 10..11, which is the one placement where
the 3-point share hides the problem. Same room, same lamp (downward, 2.8 m, radius 2.5, intensity 1), wall moved
inside the cell, room B behind it has no lamp, direct light behind the wall 0.000 in every case:

| Wall (x) | Lamp to wall | Straddling cell (brief: <= 0.03) | Bounce 0.15 m behind | 0.3 m behind | 0.5 m behind |
| --- | --- | --- | --- | --- | --- |
| 10.4-10.6 (fixture) | 1 m | 0.004 | 0.009 | 0.007 | 0.005 |
| 10.65-10.85 | 1 m | **0.447** | **0.224** | **0.156** | 0.067 |
| 10.65-10.85 | 2 m | **0.235** | **0.118** | **0.082** | 0.035 |
| 10.9-11.1 (on a cell edge) | 1 m | 0 (cell 11..12) | **0.175** | **0.070** | 0.000 |
| 10.9-11.1 | 2 m | 0 | **0.091** | 0.036 | 0.000 |
| 10.15-10.35 | 1 or 2 m | 0 | 0.000 | 0.000 | 0.000 |

Failure scenario: a player in back-to-wall cover (~0.3 m off the wall) in a dark room whose other side has a lamp
1-2 m from the wall reads +0.07 to +0.16 on the meter and to every guard, and the picture shows a glow on the dark
face of the wall (it reads 0.25 m off the surface: +0.1 to +0.2), with nothing lit on that side. On a 0.12-0.2 ambient
that crosses the 0.28 / 0.30 dark line. Same mechanism vertically for a slab that is not centred in its cell (a lit
room's ceiling cell is read by the feet of the storey above).

The cause is the receiver resolution, not the march: a lit cell's value is interpolated up to 1 m into the cell past
the wall, and a straddling cell keeps 2/3 of its lit value when 2 of its 3 points are on the lit side.

Fix (builder's choice; the test is the contract):
- Recommended: visibility-aware interpolation. Bake per cell 3 bits "an occluder lies between this cell's centre and
  its +x / +y / +z neighbour's" (march on the bake's occupancy, as `clearPath`), pack them in the fill texture's
  third channel (RGB8, still one sampler), and read the bounce in the field and the shader as a manual trilinear over
  the 8 cells that drops neighbours across a blocked face and renormalises (8 `texelFetch`es in GLSL; the field the
  same arithmetic, so parity holds byte for byte). A straddling cell additionally takes the share of the side its
  centre is on, not of 3 points.
- Cheaper alternatives if that is too much for this round: a 0.5 m bounce grid in its own R8 texture (+1 sampler;
  check `e2e-lightbake` <= 16 with LR16t's torch atlas) with the same share, which halves the bleed distance but does
  not remove it; or min(trilinear, containing cell) on the read, which removes the cross-cell bleed but shows 1 m steps
  on lit walls (likely unacceptable for "showcase").
- Test to add (`tests/lampBounce.test.ts`): the wall at x offsets 0, 0.25, 0.5, 0.75 inside its cell and the lamp 1 m
  and 2 m from it: bounce <= 0.03 at 0.15 / 0.3 / 0.5 m behind the wall (body heights 0.25-1.5 m), and the lit face
  still reads at least half of today's lit-side value 0.25 m off it. The same for a slab under a lit room.

## Judged
- Light parity exception (picture's bounce re-upload <= every 250 ms): acceptable, keep. Meter and guards read the
  same grid at once; the direct pool goes in the same frame; the throttle is leading-edge (`bakedLamps.ts:388-401`:
  the first change after a quiet 250 ms uploads in that frame, a pending change is never lost because `bounceVer`
  only moves on upload and the dirty box accumulates). Only bursts (jam flicker, a breaker then a shot) see the faint
  secondary glow lag by <= 0.25 s. No gameplay reads the picture.
- Builder's deviations: 1 (`uplightBack` 1 m): accept; it lights receivers down to ~1 m under the lamp with a tiny
  cosine (<= 0.001), harmless. 2 (wall acceptance needs radius <= 2.5): accept as reported; the physics with the
  brief's constants is honest (wall bounce 0.04-0.05). 3 (optional `bounce`, `ms`): accept; `cacheOk` rejects any
  cache entry without it. 4 (endpoint cell blocks, march starts 0.15 / 0.25 m out): accept for surfaces; see polish 2
  for the uplight. 5 (copied, not transferred): accept (<= 225 KB). 6 (no changelog fragment): accept, the lead's.
- `lampBounce.ts` physics: patch irradiance `photoTerm x vis x max(0, n.L)` matches the field's direct term (falloff x
  cone, no N.L) times the face cosine; VPL as a Lambertian emitter `PHI cos / pi` and an omni receiver (fluence) is
  the brief's choice and consistent with the direct level's definition; the window and near term are right; the
  0.1 m march step cannot skip a >= 0.2 m axis-aligned slab; a convex mix of air-cell centres keeps a VPL in air.
  Doors are not in the bake, so the bounce ignores a shut door: measured 0.005 at 0.85 m behind a shut doorway, 0 past
  2 m: negligible.
- `bounceGrid.ts`: exact integer sums (worst case far under 2^53), only the lamp's box re-quantised, dirty box union,
  box-fit guard keeps `at` offsets right, no allocation. Every `LightRegistry` mutator bumps `version`; no code writes
  `on` / `destroyed` / `intensity` on a `LightDef` outside the registry (grep). Co-op: the client mirror goes through
  `kill` / `resetTo` (`src/net/lampSync.ts:101-103`), same ids, same bytes.
- Field cost: one `version` compare plus one 8-texel trilinear per `levelInto`; `bodyLevel` boxing unchanged (68 /
  134 B per the build report; test passes). No `Math.hypot`.
- Samplers: none added (RG8 replaces R8 in `lampAmb`). Babylon sets `UNPACK_ALIGNMENT` 1 for odd widths, so RG8 rows
  upload correctly; `RawTexture3D.update` is already used by `voxelWorld.ts:505`.
- Gameplay effect (warehouseOps S1, `bodyLevel`, with vs without the bounce): pockets unchanged but "behind the skip"
  0.375 -> 0.394 (already over at base) and "takedown 8" 0.224 -> 0.283; 10 stealth route / takedown spots newly over
  the 0.55 guard cap (+0.02) (e.g. R1[15] 0.55 -> 0.69); 70 of 825 dark floor points (1 m sweep) pushed over 0.30, max
  lift 0.23, mostly at pool rims. Expected by the brief (LR16g re-levels); the lead should hand these numbers to LR16g.

## Merge hazards (LR16e, LR16t)
- `LAMP_VERSION` (`src/voxel/lampJobs.ts:14`): set it to 4 when the second of LR16e / LR16-1 lands, not "keep 3". A
  device that ran an lr16-1 build holds v3 caches with the bounce but without LR16e's penumbra; `cacheOk` accepts them
  and the merged build would serve stale visibility (Michael's laptop GPU sheets are exactly that device). The reverse
  (v2 without bounce) is rejected by `cacheOk`.
- Retuning `BOUNCE` (LR16g's likely lever: albedo) must bump `LAMP_VERSION` too: the key does not hash `BOUNCE`. Say so
  next to `BOUNCE` or add its values to the key.
- `src/voxel/lampBake.ts:143-149`: the `bakeOne` call is now wrapped by timing lines; LR16e changing that call
  conflicts textually. Keep the timing and the `bounceLamp` call after it.
- `src/world/bakedLamps.ts:863` and `:877` (the uniform list and the one-line `fragment` uniform declarations): LR16t's
  torch atlas uniforms land on the same lines; keep both. LR16t adds a sampler, this slice none: re-count against 16.
- `src/world/world.ts:263`: the `BakedLamps` extras are one line; an LR16t extras field there conflicts; keep both.

## Polish (not blocking)
1. Voxels on Epic (`?voxels=1` only, not the default smooth path): `nsBounce` stacks on the voxel GI
   (`voxelPlugin` `voxGi`, skyBake `BOUNCE` 0.45). Drop one of them when both are present.
2. Uplight march start (`lampBounce.ts:68`, `:256`): the VPL sits 0.1 m over the lamp and the march starts 0.25 m out,
   so a lamp within ~0.15 m under a slab starts past a 0.2 m slab (fixture: 0.02-0.056 in the room above). Not seen on
   ctcourse / warehouseOps; on campusOps the bollards' caps are skipped the same way (outdoor, harmless). Start at the
   lamp's own position or clamp the start to the first occupied cell.
3. `bounceColor` normalises to luminance 1, but the level is the max channel (`nsS` uses `max(r, g, b)`): a warm tint
   (1, 0.9, 0.75) draws its red ~10% over the level. Normalise by the max channel.
4. Editor light view (`src/editor/lightView.ts:671`) builds `BakedLamps` without `bounce`: its darkness map (field)
   includes the bounce, its picture does not, and the new standard-material bounce term is never fed. Pass
   `bounce: c.field.bounce` (Kestrel is paused; one line).
5. The re-upload sends the whole fill texture (~450 KB on warehouseOps) per change; a sub-box upload would let the
   throttle drop to a frame.
6. The omni receiver lights a floor from its own coplanar neighbours (a pool's rim floor +0.07 at the pool edge) and
   doubles a diffuse source against a planar sensor; it is the brief's choice and consistent across meter and
   picture, but it is the main source of the S1 lifts above. LR16g's call.
7. `tests/lampBounce.test.ts` "bake time on the ctcourse fixture" is a timing ratio; it gets easier after LR16e
   (costlier `bakeOne`), but under load it can flake. Consider logging only.
