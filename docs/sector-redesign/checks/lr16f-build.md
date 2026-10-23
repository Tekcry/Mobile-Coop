# LR16f build - character shadow softness (contact hardening)

Branch `feature/sector-redesign-lr16f` off `feature/sector-redesign-lampx` 1c22b913. Spec: `lr16-plan.md` LR16f row and
"Perf / VRAM". Michael ~18:08: light edges diffuse "depending on how far away it is", realistic.

## Changes
- `src/world/charShadows.ts:80-142` `CHAR_SHADOW_GLSL`: the 2 x 2 bilinear PCF is replaced by PCSS-style
  contact hardening. Same normal offset, metric and bias as before (the contact rule is unchanged).
  1. Blocker search: first `taps / 2` points of the fixed Poisson kernel, radius = the widest penumbra the lamp could
     give here (blockers at the slot's near plane), in texels. No blocker: lit, after the search taps only.
  2. Mean blocker depth -> metres (metric slope 1 / (far - near)); penumbra radius = `lightRadius x (dr - db) / db`,
     capped at `maxPenumbra`; texels = penumbra x `0.5 T sx / dr` (`sx` = |first row of the view-projection| =
     1 / tan(half angle)), clamped to [1, 24].
  3. Filter: first `taps` points of the kernel, nearest `texelFetch`, averaged; `mix(floor, 1, lit)` as before.
- `src/world/charShadows.ts:216-217` `configure`: `info[1]` (`lampCsI.y`, the unused "tiles per row" lane - the shader
  hard-codes the 2 x 2 layout) now carries the preset's tap count. No uniform, define or `bakedLamps.ts` change.
- `src/world/charShadowSet.ts:71-77` new constants: `lightRadius` 0.12 m, `maxPenumbra` 0.3 m, `minTexels` 1,
  `maxTexels` 24. `:80-91` `CHAR_SHADOW_TAPS`, `CHAR_SHADOW_KERNEL` (16), `charShadowTaps(lamps, tile)`. `:93-135`
  `CHAR_SHADOW_DISK`: 16-point Poisson disc by Mitchell's best candidate from a fixed seed, built once at load (every
  prefix well spread). `:137-149` `charPenumbra`, `charFilterTexels` (the GLSL's formula, for tests).
  Note: the brief named `charShadows.ts` only; the pure parts went into its pure half `charShadowSet.ts` (no other
  LR16 slice touches it) so they test without Babylon.

Picture only: nothing here reaches the light field, the meter or guards (LR14 rule unchanged).

## Taps per preset (per pixel, per lamp with a slot, inside that slot's frustum)
| Shadow tier | Filter taps | Search taps | Fetches, no blocker found | Fetches, in/near a shadow | Before |
|---|---|---|---|---|---|
| Low / Medium | capsules (no maps) | - | 0 | 0 | 0 |
| High (2 lamps, 512) / override On | 8 | 4 | 4 | 12 | 4 |
| Ultra (3 lamps, 1024) | 12 | 6 | 6 | 18 | 4 |
| Epic (4 lamps, 1024) | 16 | 8 | 8 | 24 | 4 |

No per-frame allocation (the tap count is set at `configure`; the kernel is a GLSL const array).

## Expected GPU cost
Only pixels lit by one of the 2-4 slotted lamps and inside its fitted cone run the test, and most of those exit after
the search taps (no blocker). Fetches are R16F/R32F nearest from one atlas, mostly cache-local (radius <= 24 texels).
Estimate: High ~ +0.1-0.2 ms, Epic ~ +0.3-0.5 ms at 1080p on the laptop GPU when a character's shadow fills much of
the screen; near zero otherwise. To be measured.

## Tests
`tests/charShadowSet.test.ts` new block "LR16f": kernel in the unit disc, every prefix (4/6/8/12/16) spread (min
spacing > 1.4 / sqrt(n), centroid < 0.35), the GLSL embeds those exact taps and has no time / random input; penumbra
0 at contact, monotonic in the receiver-blocker gap, capped; texel width monotonic, floor at contact, cap; preset tap
gating 0/0/0/8/12/16 and the override; pure math allocation-free. `npx tsc --noEmit` clean; vitest
`charShadowSet`, `lampPluginClone`, `lampPluginGap` 18/18 pass.

## GPU check (laptop, `E2E_GPU=1`, pending)
- Shader compiles on ANGLE D3D11 (the const `vec2[16]` array and the uniform-bounded loops with `break`).
- Character at 1 m and 4 m from a lamp: feet contact sharp, head/shoulder shadow soft (wider at 4 m); no shimmer while
  standing still or walking; no tile seam or atlas bleed at the map edge (taps clamp to the tile).
- Banding: High's 8 taps give 9 levels in a wide penumbra; check it reads as soft, not stepped.
- Acne / peter-panning at the feet unchanged vs before.
- e2e `char-shadow` suite; perf budget on High and Epic with 2+ characters near lamps.

## Open
- `lightRadius` 0.12 m is one value for every fixture; per-lamp fixture size would need a lamp texel lane (LR16e area).

## LR16-7 - character shadows on every tier
Spec: `lr16-0-ct-audit.md` gap 1 and the LR16-7 row (Low / Medium were capsule blobs only).

### Changes
- `src/world/charShadowSet.ts:21-29` `CHAR_SHADOW_PRESET`: Low `1 x 256`, Medium `1 x 512` (was 0 slots). Off stays 0;
  the override 'on' now only lifts Off (to High's set, `:33`). The slot count is read from this table only
  (`core/quality.ts:117` `shadowSpec` copies it into `charLamps` / `charTile`); no governor or `quality.ts` change.
- `:80-97` `CHAR_SHADOW_TAPS` Low / Medium 4 (search 2); `charShadowTaps` maps a single slot at <= 512 px to 4.
- `:100-106` new `CHAR_SHADOW_EVERY` (Low / Medium 2, rest 1) and `charShadowEvery(lamps, tile)`.
- `:299-302` `LampSlotPicker.refreshEvery(s, governorEvery, base = 1)`: `max(base, near ? 1 : 2) x governor`.
- `:413-417` `atlasSize(tile, slots = 4)`: one slot -> the atlas is the single tile (slot 0's origin is 0, the GLSL is
  unchanged), a quarter of the memory.
- `src/world/charShadows.ts:165-166, 205-207, 224` `configure`: `baseEvery = charShadowEvery(n, tile)`, atlas
  `atlasSize(tile, n)`; `:238, :255` `makeSlot` sizes its copy viewport `tile / size` (was a fixed 0.5); `:301` the
  refresh passes `baseEvery`.
- Unchanged: the nearest lamp wins the one slot (the picker's distance order + hysteresis); every character outside
  that slot's fitted map, and every other lamp, keeps the capsule blob (`covers` / `spheresHold`). Picture only: the
  meter and guards read the light field, which never sees these maps.

### Tap choice (Low / Medium: 4 filter + 2 search, same shader as High up)
The old 2 x 2 PCF took 4 fetches on every pixel in a slot's frustum. 4 + 2 takes 2 where no blocker is near (most of
the pool) and 6 inside or beside a shadow, so the mean cost is at or under the old PCF while keeping contact
hardening (sharp feet, soft head). The kernel's first point sits near its centre, so a 2-tap search still finds the
umbra; only the outer fringe of a wide penumbra can read a little harder. 4 taps give 5 grey levels; at Low's 256 tile
the filter radius in metres is the same (texels per metre scale with the tile). A separate 2 x 2 PCF path for Low was
not worth a second shader variant.

### Per-tier cost estimate (one slot, every 2nd frame)
| Tier | Atlas | Shadow map | Caster pass | Lit-pixel fetches (no blocker / shadow) |
|---|---|---|---|---|
| Low | 256^2 R32F 0.25 MB | 256^2 + depth ~0.5 MB | casters in the lamp's reach, 1 draw each, every 2nd frame | 2 / 6 |
| Medium | 512^2 R32F 1 MB | 512^2 + depth ~2 MB | same | 2 / 6 |
Expected GPU: caster pass ~0.05-0.15 ms on the frames it runs (2-6 skinned bodies into a small depth target) plus the
copy (one quad); lit pixels ~+0.02-0.08 ms at 1080p with a guard's shadow on screen. Near zero with no character
under the nearest lamp (the slot idles, nothing drawn). CPU: the picker and one cone fit per frame, no allocation.

### Textures
`scripts/e2e-lightbake.mjs:73-156` counts `effect._samplerList.length` on every ready visible submesh at smooth Epic
(guards alerted) and asserts <= 16; it does not run Low / Medium. The atlas is one sampler on any tier with maps, and
Low / Medium's other lamp-shadow samplers (rig casters 0 / 2, cascades 1 / 2) are at or under Epic's (4 / 4), so every
tier stays within Epic's count; the micro-detail voxel shader still gets no maps (`world/world.ts:571`). Unit test
"textures" asserts the casters / cascades dominance. Note: the comment at `e2e-lightbake.mjs:151` ("Low ... keep the
capsules") is now stale (comment only, not an assert; not this slice's file).

### Tests
`tests/charShadowSet.test.ts`: preset test now expects maps on every preset and 'on' lifting only Off; taps 4/4/8/12/16;
new block "LR16-7": refresh floor 2 at Low / Medium (x governor), the single slot takes the nearest lamp, one-slot
atlas = tile, texture dominance vs Epic, lookups allocation-free. `npx tsc --noEmit` clean; vitest `charShadowSet`,
`lampPluginClone`, `lampPluginGap`, `settings`, `shadowAccuracy`, `graphics` all pass (65).

### GPU checklist (laptop, `E2E_GPU=1`, pending)
- `?gfx=low` and `?gfx=medium`: `world.charShadows.stats()` shows 1 slot; LAMP_CSHADOW compiles on ANGLE D3D11.
- A guard at 1 m and 4 m from the nearest lamp on Low and Medium: his shape (not a blob) on the floor; feet sharp,
  head softer at 4 m; a second guard under another lamp keeps his capsule blob.
- No visible stepping from the every-2nd-frame refresh while walking (one frame of lag at 60 fps).
- Max samplers per shader at Low / Medium <= 16 (the lightbake read-back run at those presets).
- Frame p95 within the governor budget at Low and Medium with 2+ guards near a lamp (perf script).

## LR16-3 - dynamic occluders in the character shadow casters
Spec: `lr16-0-ct-audit.md` (props were excluded; an open door leaf cast nothing from lamps).

### Changes
- `src/world/charShadows.ts` `CharShadowDoors` / `CharShadowProps` (structural views of `Doors` and `PropSystem`, read only),
  `setDynamic(doors, props)`, `addDynamic(slot, lx, ly, lz, reach)` (called in `gather` after the cone fit). Door leaves:
  the one thin-instanced `leafMesh` is pushed once when any door with `open > 0` or `ajar > 0` (open, moving, cracked)
  is within the lamp's reach (`casterInReach`, hyp3 on the door's mid-height centre, radius (width + height) / 2).
  Props: every live prop within reach + 0.9 m (`PROP_REACH`) adds its part meshes, so a pushed or carried crate's shadow
  follows its node each frame.
- Render list only: the cone fit and `covers` still follow the characters (the spheres `sp` are not touched), so a leaf
  or crate throws onto characters but never changes which characters hold a map. `src/world/lightField.ts` untouched:
  the meter and guards are unchanged (LR14 rule).
- `src/world/charShadowSet.ts` end: pure `casterInReach` (hyp3, allocation-free).
- Outside the two files: `src/world/world.ts` (after `new CharShadows`): `w.charShadows.setDynamic(w.doors, w.props)`.
  No door / prop file changed; both registries read through existing public fields (`Doors.list`, `leafMesh`; `PropSystem.props`).
- No new texture or sampler (shader unchanged; textures stay <= 16). Per frame: indexed loops, no closures, no arrays.
- Cost note: the leaf mesh is thin-instanced, so a slot that lists it draws every door's instance (closed ones are cheap
  and sit in walls). Per-instance filtering would need a second matrix buffer; not done.

### Tests
`tests/charShadowSet.test.ts` block "LR16-3": reach gate (inside / edge / outside, vertical), allocation-free.
`npx tsc --noEmit` clean; vitest `charShadowSet`, `lampPluginClone`, `lampPluginGap` 24/24 pass. No door file touched.

### GPU checklist (laptop, `E2E_GPU=1`, pending)
- A door at 90 deg under a mapped lamp on EVERY map with doors: the leaf's shadow lands on a character behind / beside it;
  closing it removes the shadow (leaf only listed while `open` / `ajar` > 0); a closed door adds nothing new.
- A character walking through a doorway while the leaf swings: no flicker, no pop at the swing's start / end.
- A pushed crate and a carried crate near a mapped lamp: its shadow on a character follows it; a crate leaving the lamp's
  reach drops out with no stale shadow.
- Meter / guard perception unchanged beside an open door (render-only).
- Perf with several props in reach on Low / Medium (1 slot, every 2nd frame) and Epic.
