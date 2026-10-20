# Light model, baked lamps and vision rendering
Purpose: the gameplay light registry and light field, desktop baked lamps, darkness, night vision, thermal and electro
rendering, and the lamp light volume kept for the level editor.
Design authority: docs/DECISIONS.md (G41, G45, G47, G73, G100-G102), then docs/design-bible.md (Section 5.1).

Light parity (bible 5.1): what the player sees, the light meter and guard perception agree. Gameplay reads only the light
field (collision, the light bake, the noise model), never the render state.

## Decided direction
- Decided, not built yet (G41): a door past 15% open passes light (one threshold for light, sound and sight). Code:
  `DOOR_SHUT` 0.05 in `world/lightField.ts`.
- Decided, not built yet (G45): clear glass passes light and sight; frosted glass and blinds pass light only; thermal never
  sees through glass. No glass rule exists in the light field yet.
- Decided, not built yet (G100, G101, G102): an instant goggle cut in CT's order (thermal, electro, night, off), CT grain,
  thermal as CT (CT colour ramp; people behind closed doors as a dim silhouette). Code: the 0.2 s flip and grain on every
  mode, below.
- Decided, not built yet (G69, G73): an original goggle (no three-lens look); a dim glow on the brow with vision off, a full
  glow over the eyes with vision on. Code: `player/goggleGlow.ts` lights the current lenses always.
- Decided (G47): the parity test, long lamps and motion lights keep their plans and are sorted out when built.

## Light model (3.6: one light function)
- The canonical bake (`world/lightBake.ts` `bakeLevelLight`): lamp visibility (`voxel/lampBake.ts`), moon visibility
  (`voxel/skyBake.ts` `bakeMoon`, 0.5 m cells) and the 1 m ambient grid (`world/ambientGrid.ts`), all from the canonical
  shapes (`voxel/lightShapes.ts`: visible blockout pieces >= 5 cm plus the Medium dressing). Keys hold only the map, seed,
  shapes, lights and the moon's direction.
- `world/lampMath.ts` (pure): the one formula - linear range falloff x cosine cone (lamps without a cone: the hemisphere
  below them, exponent 1; spots: squared, cut at the outer angle). `bakedLamps.ts` builds its GLSL from `LAMP_MATH_GLSL` and
  the same constants (`LAMP_CONE_COS`, `LAMP_EXP`, `SPOT_EXP`; `LIGHT_GAIN` 1.6 is rendering only, `LAMP_LEVEL_GAIN` 1.2
  gameplay only). `moonLight(theme)`: the moon's gameplay share of `lightLevel`.
- `world/lightField.ts` (pure) `LightField` (`World.lightField`): `levelAt` = ambient grid + moon x moon visibility + the
  lamps listed for the 2 m column x `LAMP_LEVEL_GAIN` x intensity x formula x trilinear baked visibility, closed doors
  (`Doors.list`, `DOOR_SHUT`) cutting a lamp by one segment-leaf test; `dynamicAt` = non-baked lights (flashlights);
  `totalAt`; `bodyLevel` = brighter of chest / head. Allocation-free (a unit test bounds the bytes per query). Without a
  bake: registry ambient, every light dynamic.
- Gameplay reads only the field: `GameState.updateLight` (10 Hz, the local player and, on the host, every remote player's
  `PlayerRef.light`), `Enemy.perceive`, body light (`EnemyManager`, 1 Hz), `Enemy.torchWanted`.
- `world/lights.ts` (pure): `LightRegistry` holds state only (lights, on / destroyed, groups, EMP, `zones`, `ambientAt` /
  `zoneAt`, `version`); `contribution` calls `lampMath`; `LIGHT` thresholds 0.28 / 0.6 (bible L6); `visibilityFromLight`;
  `nearestLights`; `lightOnRay`.
- `world/lightRig.ts`: emissive bulbs (one thin-instanced mesh) for every light, and a fixed pool of `MAX_REAL_LIGHTS` spot
  lights given to the nearest lights at 4 Hz; quality sets how many are lit (`QualityLevel.realLights`). Pool lights are
  never enabled / disabled (no recompiles). Maps without lights create nothing.
- Fitting models (warehouse-lamps; Sector Ops only): `world/lampMount.ts` (pure) gives each fixed light of `warehouseOps`
  a `fixture.model` (dome high-bay, batten, caged bulkhead) and a mount (`base` ceiling / wall / mast, `mount` length,
  `yaw`, `strut`) on the boxes it finds over or beside it; the light's position and fixture box (what the bake samples,
  glare and shots read) do not change. `world/fixtureModels.ts` (pure) builds the meshes; `LightRig.buildFittings` draws
  a body (one shared PBR material) and an emissive face per model, thin-instanced, and every mount link as one box mesh.
  `tests/warehouseLamps.test.ts` pins every mount to its ceiling, wall or roof (3 cm).
- Roof sheets (warehouse-lamps; `LevelBuilder.sheet`, `world/roofSheets.ts`): a translucent sheet is a collision-only
  box (not in the light shapes) plus one see-through mesh that is not a shadow caster, so light passes it in the bake,
  the meter, the guards and the picture alike. A dimmer pass-through needs a translucency rule in the bake (G45).
- Map dressing as `detail` boxes (e.g. `world/maps/warehouseDress.ts`) is out of the light shapes (`canonicalLightShapes`
  skips `detail` pieces); collision-only boxes (`visible: false`) are too. Neither changes the bake.

## Baked lamps (3.2)
- `voxel/lampBake.ts` (pure, in the voxel workers): per fixed light (`bakedLights(reg)`: every kind but flashlight) a box
  over its reach of `LAMP_CELL` 0.2 m cells: the share of the fixture's sample points each air cell sees through
  conservative occupancy; solid cells take their brightest air neighbour. `packLampAtlas` / `fillLampAtlas`, `lampGrid` (2 m
  columns, <= 8 lights each, nearest first). `voxel/lampJobs.ts` `bakeLevelLamps` splits the lights across the `WorkerPool`
  and caches (`lamps:` keys, `LAMP_VERSION`).
- `world/bakedLamps.ts` `BakedLamps` (`World.lamps`; built when voxels are on and not `cheap`, `?baked=0` off): an R8 3D
  atlas + one RGBA32F data texture (per lamp 6 texels; `MAX_CAPSULES` 16 character capsules from `GameState.rtCapsules`, 4
  per lamp, re-written each frame). `LampPlugin` (priority 250, on every `PBRMaterial` via `attachAll`): per pixel the lamps
  in its 2 m column - range falloff, cone, N.L - x the atlas x `lampCapsule` soft shadows, added to `finalDiffuse`.
  `LightRig.setBaked(ids)`: the pools skip baked lights and hold <= 4 (`BAKED_POOL`) lights, <= 2 shadowed (`BAKED_SHADOWS`;
  1 with micro detail): the flashlights. GLSL names must not clash with Babylon's macros (`E` is one).
- A material made after load gets the lamp plugin on the next frame (`BakedLamps.frame` re-scans when the material count
  changes).

## Lamp light volume (Kestrel editor only)
The game never builds it; the level editor's light view does (`src/editor/lightView.ts`, G15). Removing it needs an editor
change.
- `BakedLamps` volume mode on standard materials (`standard` / `standardLook`, `remixes`, `volumeAt`), class `LampVolume`,
  pure grid / regions in `voxel/lampVolume.ts`: two RGBA8 3D render targets over the lamp boxes at `LAMP_CELL` (A rgb =
  sqrt(light / `LAMP_VOL_MAX`), B = light-weighted mean direction + how one-way it is), drawn slice by slice by `MIX_GLSL`
  from the data texture and visibility atlas at load and over changed lamps' regions on a registry change. `LampPlugin`
  `LAMP_VOLUME`: two taps, N.L against the direction, capsule shadows from `VOL_CAPS` 4 nearest characters.
- Its darkness parameters are `DARK_STANDARD` (gamma-space standard materials).

## Darkness is dark (3.6, bible L5 / L7)
- Rendering only. `world/darkCurve.ts` (pure): `curve(s) = s x g x w(g s)`, `w(x) = floor + (top - floor) / (1 + (centre /
  x)^steep)`, from a pixel's summed static level `s` (fill + baked moon + baked lamps, as `LightField` sums them) to the
  level it renders with; `g` the night-vision gain. `DARK_DESKTOP` (linear PBR, then the tone map's toe and the sRGB
  encode) is the game's set, tuned on real pixels to `DARK_TARGETS` (L5); `DARK_STANDARD` serves the editor.
- `LampPlugin` applies it per pixel: each light's diffuse is told apart as it is summed (`CUSTOM_LIGHT{X}_COLOR`:
  directional = the moon, static; hemisphere = replaced by the ambient grid where the grid fills; the rest = flashlights
  and moving lights, added after the curve) on `finalDiffuse`, `finalIrradiance`, `finalRadianceScaled` and `finalAmbient`.
  Uniforms `lampDark`, `lampDarkP`.
- Non-voxel surfaces (characters, props, weapons) take the ambient grid as their fill in place of the hemisphere; the
  voxels keep the sky bake's fill.
- No light cones: a beam is not seen in clean air, only where it lands. The volumetric haze (post stack) stays. Research:
  `docs/research/night-vision-and-lamps.md`.
- Brightness calibration (`BrightnessScreen`, Settings > Display): an exposure multiplier in the grade, `BRIGHTNESS_MIN` ..
  `MAX`. `GameState.brightnessLocked` (nothing sets it now; its mission was the Confrontation, removed by G9).

## Night vision
- Gain: `VISION_GAIN` 6, the darkness curve's floor eased up to `VISION_FLOOR` 1.0 under the goggles (`visionDark`);
  `GameState` eases `BakedLamps.visionGain` with the goggles. Bodies: the flat ambient fill on non-voxel surfaces is
  scaled by `BODY_FILL` (nv 0.35, render path only; lamp light untouched).
- The tube (`vfx/nightVision.ts`, pure; GLSL `NV_GLSL`): `CinematicPost` maps luma through `nvDrive` (contrast `gamma` 1.3)
  and `nvColor` (a green phosphor, tint 0.35 / 0.85 / 0.30, that clips to pale white from drive 0.85), adds intensifier
  grain (strongest in the dark; `SENSOR_GRAIN.night` 0.06) and the goggle frame (`GOGGLE_FRAME` in `vfx/visionLook.ts`: a
  wide, thin rounded rectangle, about 89% clear at 16:9, corners about 30%). `?gfx=min` lifts the tube input (`postLift` 3).
- Frame auto-gain (`vfx/nightExposure.ts`, pure; measured in `NightBloom`): the scene's mean luma eases (0.5 s) into a
  1x1 target and `CinematicPost` scales the tube input by a clamped gain: 1 inside a band, up to 3 in near-black frames,
  down to 0.6 in over-bright ones. Render path only.
- Bloom (`vfx/nightBloom.ts` runs it while the goggles are on, from `PostProcessManager.onBeforeRenderObservable`): a bright pass
  at `BLOOM.scale` 0.25 (4 bilinear taps masked by `brightShare`), then `passes` 3 x a horizontal and vertical 9-tap
  Gaussian (`spread` 1.3); `CinematicPost` adds the glow's luma x `strength` to the drive. Numbers in `BLOOM`
  (`vfx/nightVision.ts`): `bright` threshold 0.8 on the compressed luma l / (1 + l) (half float; 8-bit keeps `ldrThreshold` 0.85 on raw luma), knee 0.1, strength 0.6 (linear, before TAA and tone mapping); the default pipeline bloom is weight 0 while the goggles are on. Targets are half float where supported, else 8-bit divided by `range` 4. What glows
  is what is bright on screen; nothing glows through a wall.
- Auto-gain (`vfx/nightAutoGain.ts`): up to `GLARE.max` 8 fixed lamps in view within 45 m with a clear Havok ray from the
  camera (each fading over 0.12 s); near lamps (`abcWeight`) turn the gain down (`veil`; `abcAttack` 0.25 s, `abcRelease`
  0.6 s; the image divides by 1 + veil x `gainDrop` 0.6, except highlights from `gainKeep` 0.75 up).
  `LightRig.setVisionBoost` raises the fixtures (`NV_BULB` 8; electro `ELECTRO_BULB` 2.5). Rendering only.
- `NightAutoGain` runs from `scene.onBeforeCameraRenderObservable`, after the camera's update. Reading the camera's matrices
  earlier in the frame marks its view as current, so Babylon sees a moving camera as still and TAA blends stale history
  (the night-vision smear; `e2e-darkness` checks a turning camera reads as moving). Per-frame code must not call
  `getViewMatrix` / `getTransformationMatrix` / `getDirection*` / `getWorldMatrix` on the active camera before the scene
  renders.
- The switch: `VisionState` flips over `VISION.flip` 0.2 s and switches at the middle; `CinematicPost` draws the housing as
  a dark band sweeping down (on) or up (off) (`flipCentre`). Replaced by an instant cut (G100).

## Thermal and electro (locomotion step 14)
- `vfx/visionLook.ts` (pure, GLSL `VISION_GLSL`): a `vk` branch in the cinematic post pass (1 thermal, 2 electro). No new
  render target or material. Warm bodies and live devices set the free `pattern.w` channel of the PatternPlugin (per
  instance, or per vertex on voxel bodies), a white emissive added to the lit colour; the ramp then colours by luma.
  Thermal softens with 4 taps in the same pass. Sensor grain and softening on all three modes (A87). Render-only: the light
  meter, the light bake and guard perception never read it.
- What glows in each mode: `docs/systems/gadgets.md`.
- The goggle glow (`player/goggleGlow.ts`): the goggle lenses and a rear battery LED as emissive instances of one unlit
  sphere (one draw), always on (brighter in a vision mode), hidden with the head. Visual only.

## Spike log
- `core/spikes.ts` (pure `SpikeLog`): frames over `SPIKE.over` x the budget or the typical frame (`typicalMs`) tagged
  shaders / lod / governor (event bits from the frame and the one before) else cpu / gpu; `GameState.trackSpikes` per render
  frame; benchmark lines end with the run's summary, `feedbackContext().spikes`.
- Tests: `tests/darkCurve.test.ts`, `tests/lampBake.test.ts`, `tests/nightVision.test.ts`, `tests/benchmark.test.ts`;
  `scripts/e2e-darkness.mjs` (GPU list: `npm run e2e:gpu` on Michael's PC), `scripts/e2e-lightbake.mjs`.
