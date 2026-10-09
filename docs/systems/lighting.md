# Light model, baked lamps and the phone look
> Status: Phase 1 replaces the three light calculations with one source of truth (bible 5.1).
Purpose: the gameplay light registry, desktop baked lamps, the phone light renderer and the lamp light volume.
Design authority: docs/design-bible.md (Section 5.1)

## Light model (3.6: one light function; Phase 1 Steps 1-2)
- The canonical bake (`world/lightBake.ts` `bakeLevelLight`, every device): lamp visibility (`voxel/lampBake.ts`),
  moon visibility (`voxel/skyBake.ts` `bakeMoon`, 0.5 m cells, one ray each) and the 1 m ambient grid
  (`world/ambientGrid.ts`), all from the canonical shapes (`voxel/lightShapes.ts`: visible blockout pieces >= 5 cm
  plus the Medium dressing). Keys hold only the map, seed, shapes, lights and the moon's direction.
- `world/lampMath.ts` (pure): the one formula - linear range falloff x cosine cone (lamps without a cone: the
  hemisphere below them, exponent 1; spots: squared, cut at the outer angle). `bakedLamps.ts` builds its GLSL from
  `LAMP_MATH_GLSL` and the same constants (`LAMP_CONE_COS`, `LAMP_EXP`, `SPOT_EXP`; `LIGHT_GAIN` 1.6 is rendering
  only, `LAMP_LEVEL_GAIN` 1.2 gameplay only).
  `moonLight(theme)`: the moon's gameplay share of `lightLevel` (sun / (ambient + sun)); the open sky's ambient
  gives that much up to it, zones keep theirs.
- `world/lightField.ts` (pure) `LightField` (`World.lightField`): `levelAt` = ambient grid + moon x moon visibility +
  the lamps listed for the 2 m column (as the shaders list them) x `LAMP_LEVEL_GAIN` x intensity x formula x trilinear baked visibility,
  closed doors (`Doors.list`, `DOOR_SHUT`) cutting a lamp by one segment-leaf test; `dynamicAt` = non-baked lights
  (flashlights) with the caller's ray; `totalAt`; `bodyLevel` = brighter of chest / head. Allocation-free (private
  steps write a scratch field; a unit test bounds the bytes per query). Without a bake: registry ambient, every
  light dynamic.
- Gameplay reads only the field: `GameState.updateLight` (10 Hz, the local player and, on the host, every remote
  player's `PlayerRef.light`), `Enemy.perceive` (`ref.light`, else `totalAt` at the aim point), body light
  (`EnemyManager`, 1 Hz), `Enemy.torchWanted` (static level < `TORCH_DARK` 0.35, kept to `TORCH_KEEP` 0.45).
- `world/lights.ts` (pure): `LightRegistry` holds state only (lights, on / destroyed, groups, EMP, `zones`,
  `ambientAt` / `zoneAt`, `version`); `contribution` calls `lampMath` (x `LAMP_LEVEL_GAIN` 1.2, gameplay only); `LIGHT` thresholds 0.28 / 0.6 (bible L6);
  `visibilityFromLight`; `nearestLights`; `lightOnRay`.
- `world/lightRig.ts`: emissive bulbs (one thin-instanced mesh) for every light, and a fixed pool of
  `MAX_REAL_LIGHTS` spot lights (lamps = wide downward cone) given to the nearest lights at 4 Hz; quality sets how
  many are lit (`QualityLevel.realLights`). Pool lights are never enabled / disabled (no recompiles); materials
  get `maxSimultaneousLights` for the pool. Maps without lights create nothing.

## Baked lamps (3.2)
- `voxel/lampBake.ts` (pure, in the voxel workers): per fixed light (`bakedLights(reg)`: every kind but flashlight,
  `LAMP_STRIDE`: position, reach, cone, fixture sx / sz) a box over its reach (downward lamps stop a cell above
  themselves) of `LAMP_CELL` 0.2 m cells: the share of the fixture's sample points (one per 0.5 m along its longer
  side, <= 6; ends + middle first) each air cell sees through conservative occupancy (`occupancyShapes`: fills grown,
  carves shrunk by half a cell, paints dropped; every rendered layer's shapes); solid cells take their brightest air
  neighbour. `packLampAtlas` / `fillLampAtlas` (tiles along x in rows along z), `lampGrid` (2 m columns, <= 8 lights
  each, nearest first). `voxel/lampJobs.ts` `bakeLevelLamps` splits the lights across the `WorkerPool` (`lamps` jobs)
  and caches (`lamps:` keys, `LAMP_VERSION`).
- `world/bakedLamps.ts` `BakedLamps` (`World.lamps`; built when voxels are on and not `cheap`, `?baked=0` off): an R8
  3D atlas + one RGBA32F data texture (the grid; per lamp 6 texels: position + reach, colour x intensity x 1.6 x on,
  direction + cos, box origin + ny, tile + nx / nz, capsule ids; `MAX_CAPSULES` 16 character capsules from
  `GameState.rtCapsules`, 4 per lamp, re-written each frame). `LampPlugin` (priority 250, on every `PBRMaterial` via
  `attachAll`): per pixel the lamps in its 2 m column - range falloff, cone (lamps: `LAMP_CONE` exponent 1; spots:
  exponent 2), N.L - as Babylon's lights gave them, x the atlas (trilinear, a cell off the geometric normal) x
  `lampCapsule` soft shadows, added to `finalDiffuse`. `LightRig.setBaked(ids)`: the pools skip baked lights and hold
  <= 4 (`BAKED_POOL`) lights, <= 2 shadowed (`BAKED_SHADOWS`): the flashlights. GLSL names must not clash with
  Babylon's macros (`E` is one).

## Phone light look (3.6, Phase 1 Step 4)
- `World` `phoneLamps` (`QualityLevel.lite`): `BakedLamps` volume mode on the lit standard materials (`BakeExtras.standard`):
  `LampPlugin`'s standard variant adds `nsVolume` (two taps, N.L, capsules) and the ambient grid fill
  (`LEVEL_TO_RENDER`) to `diffuseBase`; the baked moon multiplies the sun; the hemisphere is off; the rig keeps
  `BAKED_PLAIN_POOL` 2 plain lights for flashlights. The grade lifts black to `PHONE_DARK_FLOOR` (L7). Maps without
  lamps keep the plain path. Tests: `e2e-phonelamps`, `perf.mjs --phone`.

## Darkness is dark (3.6, Phase 1 Step 4b; bible 1.10 L5 / L7)
- Rendering only; gameplay never reads any of it. `world/darkCurve.ts` (pure): the darkness curve
  `curve(s) = s x g x w(g s)`, `w(x) = floor + (top - floor) / (1 + (centre / x)^steep)`, from a pixel's summed static
  level `s` (fill + baked moon + baked lamps, as `LightField` sums them: no N.L) to the level it renders with; `g` the
  night-vision gain. Two parameter sets, one function: `DARK_PHONE` (gamma-space standard materials) and `DARK_DESKTOP`
  (linear PBR, then the neutral tone map's toe and the sRGB encode), each tuned on real pixels to the display targets
  `DARK_TARGETS` (L5). `top` lifts the lit band (both looks read under 45% at 0.70 before).
- `LampPlugin` applies it per pixel in the lighting: each light's diffuse is told apart as it is summed (the
  `CUSTOM_LIGHT{X}_COLOR` injection: directional = the moon, static; hemisphere = replaced by the ambient grid where the
  grid fills; the rest = flashlights and moving lights, added after the curve). Phone: on `diffuseBase` (static x ratio
  + dynamic). Desktop: on `finalDiffuse` (with the lamps, the voxels' own fill and bounce), `finalIrradiance`,
  `finalRadianceScaled` and `finalAmbient`. Uniforms `lampDark` (gain, the moon's level) and `lampDarkP` (the curve).
- Desktop's non-voxel surfaces (characters, props, weapons) take the ambient grid as their fill in place of the
  hemisphere, which lit them as if under open sky indoors; the voxels keep the sky bake's fill.
- Night vision (`VISION_GAIN` 8): `GameState` eases `BakedLamps.visionGain` with the goggles; `CinematicPost` maps the
  image to green nearly as it is and blows lamp light out towards white; on the phone the light over twice full joins
  the colour (`CUSTOM_FRAGMENT_BEFORE_FOG`: the standard material clamps the light before the surface colour).
- The phone's black floor is `PHONE_DARK_FLOOR` 0.008 (OLED smear). Brightness calibration (`BrightnessScreen`,
  Settings > Display; once after the update): an exposure multiplier in the grade, `BRIGHTNESS_MIN` .. `MAX`,
  `GameState.brightnessLocked` for the Confrontation.
- The goggle glow (`player/goggleGlow.ts`): the tri-lens lenses and a rear battery-pack LED as emissive instances of one
  unlit sphere (one draw), always on (brighter in a vision mode), hidden with the head. Visual only.
- A material made after load gets the lamp plugin on the next frame (`BakedLamps.frame` re-scans when the scene's
  material count changes; the scene's new-material event fires too early for a plugin).
- Tests: `tests/darkCurve.test.ts`, `scripts/e2e-darkness.mjs`.

## Phone look (3.3; 3.4 the light renderer)
- 3.4 direction: desktop first; phones get the 2.x renderer so they hold 60 cool or warm. `PHONE_FEATURES` (shadows off
  - blob shadows, 6 plain lights, every post feature off) + `QualityLevel.lite` (phone and `QualityManager.phoneLook`
  'lite', the default): GameState creates the world `cheap` (standard materials, no surface atlas) with no voxels (the
  blockout's boxes + the Medium box dressing), smooth characters / weapons (no `setVoxelBodies` / `setVoxelWeapons`),
  no baked lamps (the rig's plain pool, `LightRigConfig.plain`: no clustering); `PostStack.apply` builds nothing (the
  grade pass `CinematicPost` stays); the menu stage's operator is smooth too (`MenuState.lite`). No TAAU: the canvas
  itself scales - a match starts native (`phoneStart` from the base scale), the governor steps 100 / 92 / 84 / 75%,
  then 30 fps. Gameplay reads the blockout on every device, so the phone look changes nothing anyone can see or hide
  behind. Keep that rule: never make gameplay depend on what the voxel renderer draws.
- The 3.3 voxel look below stays for the Phone check's comparison run (`QualityOverride.look` / `BenchRun.look`
  'voxel': `PHONE_VOXEL_FEATURES`, TAAU from 75%, the cuts); `levelLabel` "phone voxel".
- `core/quality.ts`: `PHONE_VOXEL_FEATURES` (no AO / reflections / bloom / shafts / DOF / motion blur / lens; GI, textures /
  detail / effects Medium), `PHONE_SHADOW` (moon 1 cascade 1024, one flashlight 512), `PhoneCuts` / `PHONE_CUTS`
  (`lampVolume`, `plainVoxels`), `PHONE_SCALES` 1 / 0.92 / 0.84 / 0.75 (`PHONE_FLOOR`), `PHONE_FPS_FALLBACK` 30,
  `QualityLevel.phone`, `levelLabel`. `QualityManager.phone` (mobile and not `?gfx=`): `build` ignores presets / settings
  (`ov.gfx` for a Phone check run), TAAU at the base scale, the canvas native; `resetGovernor` sets `Governor.max` 4 and
  starts at 3 (75%); `applyAdaptive` -> `phoneAdaptiveAt` (resolution only, relative to the base; `PostStack.setAdaptive`
  caps the TAAU scale at 1) and `capNow` (60, 30 at level 4, uncapped in a benchmark run); `phoneCuts` (+ `ov.cuts`,
  `?lampvol=0`). `App.detectGraphics` skips phones. Settings > Display (`phoneDisplayTab`): FOV, FPS overlay, avatar
  style, interface, fullscreen, Phone check. GameState reads `phoneCuts` when the map loads: voxel `ao` / `micro` off,
  `WorldOptions.lampVolume`.
- Lamp light volume (`voxel/lampVolume.ts` pure grid / regions; `BakedLamps` volume mode, class `LampVolume`): two RGBA8
  3D render targets over the lamp boxes at `LAMP_CELL` (A rgb = sqrt(light / `LAMP_VOL_MAX`), B = light-weighted mean
  direction + how one-way it is), drawn slice by slice (`EffectRenderer`, `bindFramebuffer(.., layer)`, viewport = the
  region) by `MIX_GLSL` from the exact path's data texture + visibility atlas (the 2 m column's lamps: falloff, cone,
  visibility; no N.L) at load and over the union of changed lamps' regions on a registry change (`remixes`; a mix
  waiting on its shader retries). `LampPlugin` `LAMP_VOLUME`: two taps, N.L against the direction (wrapped by how
  spread the light is), capsule shadows from `VOL_CAPS` 4 nearest characters along it (`lampCaps` uniform array).
- Spike log (`core/spikes.ts` pure `SpikeLog`): frames over `SPIKE.over` x the budget or the typical frame (3.3.1:
  `typicalMs`, an exponential average) tagged shaders / lamps / lod /
  governor (event bits from the frame and the one before) else cpu / gpu; `GameState.trackSpikes` per render frame
  (`VoxelWorld.lodSwaps`, `BakedLamps.remixes`, the engine's compiled effects, the governor level); benchmark lines end
  with the run's summary, `feedbackContext().spikes`.
- Phone check 3.4 (`benchPlan('phone')` = `phoneCheckRuns`): the light look 100%, 75%, + the moon shadow (`shadows`
  'low'), the 3.3 voxel look at 75%, 100% again (heat), then the 3 min hold at 60 (100%); 30 s cool-downs. Before 3.4:
  nine `FEATURE_SECONDS` runs - 75%, 100%, then the exact lamps,
  voxel detail, bloom, shafts, High shadows put back, GI out, then 75% again (heat check) (`BenchRun.cuts` ->
  `QualityOverride.cuts`), then 3.3.2: `PHONE_HOLD_SECONDS` 180 held at 60 (`BenchRun.cap` -> `QualityOverride.cap`,
  sustained: per-minute averages); `PHONE_COOL_S` 30 s cool-down between runs (GameState hand-off, nothing drawn) -
  a hot iPhone throttles its GPU about 5x. 3.3.1: every non-sustained run line ends with `sectionText` - fps per `SECTION_SECONDS` 2.5 s
  of the route (a 20 s run ends at the long view down the corridor at the first guards: ~100 meshes against ~30).
