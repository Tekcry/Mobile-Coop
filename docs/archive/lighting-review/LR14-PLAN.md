# LR14 - character silhouette shadows from lamps (plan)
Written 2026-10-23 by the LR14 builder (branch `feature/sector-redesign-charshadow`, off `-lightrev` 7c403385).
Michael (~14:42): "yes i want to include this system now as its one of the main focus of the game". The CT look: a guard
or the partner throws a real silhouette across the floor and walls from the lamp overhead.

## 1. Today's shadow path (file:line at 7c403385)
- Static geometry: baked per-lamp visibility (`voxel/lampBake.ts`, R8 3D atlas), sampled per pixel in the lamp loop
  (`world/bakedLamps.ts:886-889`, `texture(lampVis, ...)`). Unchanged by LR14.
- Characters: soft capsule shadows. `GameState.rtCapsules` (`game/gameState.ts:825`; `rtCapsule` at `:3381`: an upright
  capsule r 0.22 from the feet + 0.25 to the head - 0.2) fills up to `MAX_CAPSULES` 16 (`bakedLamps.ts:54`) - the local
  player and the living guards only (no partner, no bodies, no weapons, no pose). `BakedLamps.writeCapsules`
  (`:339`) lists per lamp up to `CAPS_PER_LAMP` 4 capsules in its reach in texel t5; the shader multiplies each listed
  capsule's `lampCapsule` (`:624`, floor 0.15, no self shadow) into the lamp's term (`:912-920`).
- Real Babylon shadow maps: `LightRig` (`world/lightRig.ts`) gives the moving lights (flashlights) a pool of spot
  lights with PCF `ShadowGenerator`s. With baked lamps `BAKED_SHADOWS` 2 (`:28`); with voxel micro detail
  `MICRO_SHADOWS` 1 (`:36`). Every shadowed spot is one sampler in every lit shader. `MAX_SHADOW_CASTERS` 4
  (`core/quality.ts:107`) is the preset ceiling; `e2e-desktop` asserts every drawn material <= 16 textures at Epic,
  before and after the guards alert (`scripts/e2e-desktop.mjs:534-583`).
- The meter and guards: `LightField` (`world/lightField.ts`) - ambient + moon + lamps x baked visibility, never any
  character shadow. The picture's darkness curve takes the same level (`nsLampRaw`, no N.L, no character shadows), so
  capsules today already darken the picture only (a linear factor after the curve).

## 2. Design
### 2.1 What renders
- N lamp slots (N = preset, max 4). Each slot owns one Babylon `SpotLight` + one `ShadowGenerator` (no filter, float
  red target, back faces only, bias 0). The spot is excluded from every mesh (`includeOnlyWithLayerMask` = a bit no
  mesh has), so it adds no light and no sampler to any material; it only drives its shadow map.
- Each slot's map draws characters only: a custom render list (`getCustomRenderList`, a preallocated array refilled in
  place) of the character casters within the lamp's reach: players (local + remote partner), guards, bodies, held
  weapons and gear - every mesh registered through `World.addShadowCaster` except props (`World.charCasters`).
- Babylon renders the maps (skinned Wren, instanced guard parts, morph targets: its own depth shader). After each map
  renders (`shadowMap.onAfterUnbindObservable`) one `EffectWrapper` pass copies it, texel for texel, into its tile of
  ONE shared atlas (a float R render target, 2 x 2 tiles) and snapshots that render's view-projection matrix and depth
  range into the slot's uniforms. Only the atlas reaches the materials.
- A far slot's map refreshes every 2nd frame (`refreshRate`, x the governor's `shadowEvery`); an idle slot or one with
  no character in reach does not render at all (`refreshRate` 0 + nothing listed).

### 2.2 Atlas layout
- 2 x 2 tiles of `tile` px (High 512, Ultra / Epic 1024): slot s at pixel origin ((s mod 2) x tile, (s div 2) x tile).
  Format R32F (R16F when only half-float targets render; neither: the feature stays off, capsules everywhere).
- Stored value: Babylon's own shadow metric `(clip.z + minZ) / (minZ + maxZ)` of the slot's spot projection. The
  shader recomputes it from the snapshotted matrix, so the copy is a plain texelFetch.

### 2.3 Lamp selection and hysteresis (pure, `world/charShadowSet.ts`)
- Candidates: baked lamps that are on (lit, not shot, not jammed: their colour in the data texture is non-zero) whose
  distance to the nearest focus point (the local player, the camera) is under radius + 3 m.
- Score = that distance. A held lamp competes at score x 0.75 (a newcomer must be 25% nearer), and holds its slot at
  least 0.5 s; a lamp switched off or out of reach + 1 m leaves at once. Re-picked at 10 Hz.
- Slots are stable: a lamp that stays keeps its slot (tile); a newcomer takes a free one. Allocation-free (fixed
  typed arrays, insertion into <= 4).
- Frustum fit per slot per frame: the spot points at the mean direction of the listed casters' bounding spheres; its
  half-angle covers the widest one (+ 0.02 rad), capped at 1.25 rad (a "partial" fit); near = 0.9 x the nearest
  sphere's front, far = the lamp's radius. Casters outside a partial fit keep their capsule for that lamp.

### 2.4 Shader changes (`world/bakedLamps.ts`, kept in separate chunks for the -shadow auditor's merge)
- `LAMP_TEXELS` 7 -> 8: t7.x = the lamp's slot + 1 (0: capsules only). Written by `writeCapsules` each frame (from the
  selection) only once that slot's map holds this lamp (a fresh pick draws capsules for one frame, never a stale tile).
- New define `LAMP_CSHADOW` (on only while the feature is on), sampler `lampCsAtlas`, UBO `lampCsM[16]` (4 mat4),
  `lampCsP[4]` (min z, min + max z, bias, valid), `lampCsI` (tile, tiles per row, -, depth sign).
- New GLSL function `nsCharShadow(slot, p, gn, lamp)` (its own string constant, `CHAR_SHADOW_GLSL` in
  `world/charShadows.ts`): normal offset 2 cm + 0.4% of the lamp distance, project, 2 x 2 bilinear PCF on texelFetch
  (4 taps), bias 3 cm, floor 0.15 (as the capsules', so a preset switch changes the shape, not the darkness).
- In the lamp loop, after N.L and before the capsule loop: `if (slot) k *= nsCharShadow(...)`. The capsule list of a
  mapped lamp holds only capsules its frustum does not cover (none, unless the fit was partial).

### 2.5 Budget
- Textures per shader: +1 (`lampCsAtlas`) while on. Smooth default: the plugin's 5 + surface atlas 2 + env / BRDF +
  the moon's cascades + the cluster's 2 + 2 flashlight shadows; the GPU smoke counts the real maximum with the
  `e2e-desktop` probe (now also in `e2e-lightbake`, smooth Epic, guards alerted). Voxel micro detail (`?voxels=1`, a dev
  path: 15 + 1 flashlight = 16 today) keeps the capsules (as built: the flashlight keeps its one shadow, which
  `e2e-desktop` part 3 asserts). If the smooth default reads 17 the flashlight pool drops to 1 there.
- GPU: per slot one depth pass over the characters in reach (instanced guard parts batch: about 20-40 draws per
  lamp), one tile copy; per pixel in a mapped lamp's light: 1 mat4 x vec4 and 4 texelFetch in place of up to 4
  capsule tests.
- Memory: High 2 x 512 (atlas 1024^2 R32F 4 MB + maps 2 x 2 MB), Epic 4 x 1024 (atlas 2048^2 16 MB + maps 4 x 8 MB).
- CPU per frame: selection 10 Hz over the lamps (one pass); per slot one pass over `charCasters` (sphere tests). No
  allocation per frame (render lists refilled in place).

### 2.6 Presets and toggle
- `ShadowSpec` gains `charLamps` / `charTile` (`core/quality.ts` `shadowSpec`): off / low / medium 0 (capsules), high
  2 x 512, ultra 3 x 1024, epic 4 x 1024. A change rebuilds through `World.applyQuality` (the shadow key changes, the
  materials re-read their defines).
- Settings toggle (final commit, after merging `-lightrev`, which owns the settings model and UI):
  `video.charShadows` 'auto' | 'on' | 'off' (Settings > Graphics "Character shadows"); 'auto' = the preset's.
  `qualityLevel` applies it (on: at least 2 x 512; off: 0). Each co-op machine uses its own; no wire change.
- `?gfx=min` (no baked lamps) and maps without baked lamps: nothing changes.

## 3. Render only and parity
The meter and guard perception keep their model (`LightField`; no character shadow ever). The darkness curve's input
is unchanged (`nsLampRaw` never took capsules). What changes on screen, logged in the report: real silhouettes in
place of capsules, plus shadows from casters the capsules never had (the partner, bodies, weapons, crouched / prone
poses) and self shadow (an arm across the chest). In such a patch the lamp's direct term drops to 0.15 on screen
while the meter, which samples the lit chest / head of the field, reads that lamp in full - the same kind of gap the
capsules already make, now with the true shape.

## 4. Tests
- Vitest (Babylon-free): `tests/charShadowSet.test.ts` - presets (on from High, capsules at Low / Medium, the override),
  the picker (nearest first, the 25% margin and 0.5 s hold stop flicker between two equal lamps, a switched-off lamp
  leaves at once, stable slots), the cone fit (covers every sphere, partial flag, coverage test), atlas tiles, refresh
  rates, and no allocation per call (heap bound as `lightField.test.ts`).
- tsc; the vitest files touched (`graphics.test.ts`).
- GPU smoke (desktop, only if CPU < 50%, port 4189, `heavy2.lock`): campusOps and ctcourse at Epic boot without console
  errors, the plugin compiles with `LAMP_CSHADOW`, slots take lamps, max textures per shader read.
- Laptop (Test Runner): `e2e-desktop` (texture cap at Epic with guards alerted), `e2e-darkness`, `e2e-lightbake`,
  `perf.mjs --preset=high|epic --budget` with 24 guards per section, a contact sheet of a guard under a lamp.

## 5. Risks
- Babylon internals: the copy reads the generator's float target; a driver without float-linear may pick half float
  (handled: both formats compare the same metric). A packed RGBA fallback is not supported: the feature stays off.
- Shader compile on first use: the first configure renders every slot once with all characters listed (warms the depth
  shader variants), and the materials recompile at the preset change as for any shadow change.
- Wide fits (a wall lamp with guards on both sides) thin the map's resolution; the cap keeps the far ones on capsules.
- Bind-pose bounds of the skinned operator: the fit adds 0.3 m to every sphere.
- Merge with the -shadow auditor (bake visibility tap in the same lamp loop): LR14's lines sit after N.L, before the
  capsule loop, and in their own GLSL / TS functions.

## 6. How to undo
Settings > Graphics > Character shadows: Off (or a preset below High). Code: `charLamps` 0 in `shadowSpec` for every
tier restores the capsule path exactly (the define is off, t7 stays 0).
