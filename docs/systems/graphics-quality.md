# Graphics and quality
Owner: Sector Ops Build (lighting, visual gate). Status: current.
Purpose: presets, auto graphics, the frame governor, the benchmark, the renderer, materials, TAAU and weather.
Design authority: docs/DECISIONS.md (G12, G14, G68, G99-G102), then docs/design-bible.md (Section 8).

Desktop only (G12): one preset ladder, no phone preset, no phone look and no phone benchmark (deleted with the phone
code). Graphics never change gameplay: gameplay reads collision, occupancy, anchors, the light bake and the noise model
only. smooth-world (2026-10-20, replaces G68's voxel clause): the world, characters and weapons draw smooth; the voxel look
was retired 2026-10-23 (Michael: "nothing should be voxel"). Characters and weapons become realistic from the operators pipeline (G68).
Budgets: performance.md.

## Presets, auto graphics, governor
- Graphics (3.0, 3.1 ladder; `core/quality.ts` pure): `GRAPHICS_PRESETS` Low / Medium / High / Ultra / Epic (`PRESET_IDS`)
  fill `GraphicsFeatures` (shadows off / low / medium / high / ultra / epic -> `shadowSpec`: sun
  cascades, lamp / flashlight casters 0 / 2 / 3 / 4 / 4 (3.1.7 `MAX_SHADOW_CASTERS`: WebGL guarantees 16 textures per
  shader and the level material uses 11 without lamp shadows; lamps are PCF, one texture each - 8 soft ones broke
  the level on D3D11, while headless software GL allows 32; `e2e-desktop` checks every material at Epic <= 16, at the start
  and again with the guards alerted. PC1 fix: since the lamp bake the level's micro-detail shader takes 15 without a
  lamp shadow, and a spot's shadow joins a shader only once its map has casters - a guard's flashlight - so two shadowed
  flashlights took the near chunks to 17 and they stopped drawing as guards alerted; `LightRig` caps the pool at one with
  micro detail (`MICRO_SHADOWS`). Repro on a GPU: `?autostart=ctcourse&mode=course&gfx=epic` with E2E_GPU=1, call
  `alert()` on every `enemyMgr.enemies`, then count `MAX_TEXTURE_IMAGE_UNITS` console errors - 7 before the fix, 0 after), map
  size, sun filtering quality; lights 8-48; ao,
  bloom, reflections off / ssr / rt (+ `rtRes` half / full), volumetrics (shafts only: the height fog is drawn on every
  preset, fairness) + `volLights` 2-12, `postRes` half / full (SSAO ratio, SSR downsample), dof, motionBlur, lens, aa fxaa / msaa / taa,
  textures / detail / effects tiers), `presetOf` (Custom), `qualityLevel` -> `QualityLevel`. Settings `video.preset`,
  `video.gfx`, `renderScale` 0.5-2 (native DPR, no cap; desktop: Settings > Graphics > Resolution, `ui/screens/
  resolutionPicker.ts` - 3.2.1: the monitor's standard resolutions (`core/display.ts` `desktopResolutions(monW, monH)`
  from `STANDARD_RESOLUTIONS` of its aspect down to half its height; `resolutionScale` = lines / monitor height;
  `video.resolution` names the pick; `shownResolution` in benchmark lines / feedback adds the window's real size;
  Benchmark > Resolutions runs them, `benchOutput` = the monitor on desktop), applied on a pick, `KeepResolution` reverts after `RES_CONFIRM_S`
  15 s unless kept), `dynamicRes` (retired in 3.1.7: `QualityManager.auto` is false), `fpsCap` (`GameLoop.fpsCap`,
  `capAllows`), `fovH` 60-120 (default 86, G3; `camV` moves a saved 75 to 86); `setGfx` / `setPreset` (also sets `renderScale` / `upscaler` from `PRESET_DISPLAY`:
  Low 0.67 .. Ultra 0.9 TAAU, Epic native). `app.quality` (QualityManager) applies the level to the state's
  `applyQuality(level)` (GameState: `World.applyQuality` + `PostStack.apply`; MenuState: lamp shadows + its stack),
  feeds `RefreshDetector` (raw rAF intervals; 3.1.9: the 25th percentile, and in a match it only rises - GPU-bound
  frames last whole refresh periods), `FrameStats` and, only with dynamic resolution, the
  `ResolutionScaler` (0.5-1.0 against the cap or display budget). `?gfx=min|low|medium|high|ultra|epic` overrides for a page;
  `QualityManager.setOverride({ preset, scale })` is the benchmark's per-run override (never saved; ignored under `?gfx=`).
- Character shadows (LR14, `ShadowSpec.charLamps` / `charTile` from `CHAR_SHADOW_PRESET`): Low 0, Medium 0 (capsule
  shadows), High 2 lamps x 512 px, Ultra 3 x 1024, Epic 4 x 1024 - the nearest lamps' silhouette maps in one atlas, one
  texture per lit shader (`docs/systems/lighting.md`, Character silhouette shadows). `qualityLevel(.., charMode)` takes
  the override (Settings > Graphics > Character shadows: Auto / On / Off; On below High = High's); `?gfx=min` and the
  voxel micro-detail path never take them. The governor's `shadowEvery` slows their refresh too.
- Auto graphics (3.1, `core/deviceTier.ts` pure): `tierFromRenderer(renderer)` (the desktop GPU table, confident or
  not; a hidden GPU name is not), `deviceKey` (its `|desktop|` part keeps old saved keys valid), `Calibration` (the ladder top down on the menu stage, each at
  its render scale x `CALIBRATION.load` 1.4, warm-up 0.6 s + 1.2 s measured, p90 interval <= budget x 1.12; <= 6 s).
  Settings `video.auto` (default; 3.0 settings on Epic move to it; `setPreset` / `setGfx` turn it off, `setAuto(s,
  tier)`), `video.device {key, tier, source gpu | calibrated | none}`. `App.detectGraphics(force)` after
  `loadSettings`: known key -> its tier; else the GPU name; else `calibKey` and
  `calibFrame` runs it on `MenuState` (`menuStage`) through `QualityManager.setOverride`, aborted off the menu,
  toast + `onDetected`. Under automation only with `?detect=1` (`?renderer=` fakes the GPU name).
- Frame governor (3.1, `core/governor.ts` pure): `Governor.frame(interval, budget)` levels 0-10 (`adaptiveAt` ->
  `Adaptive`: scale 0.92 / 0.84 / 0.76, shadowEvery 2, volLights x0.5, step 6 (was voxel LOD) a no-op since voxel-retire, effects x0.6, lights x0.75,
  partLod x0.75, scale 0.68), down on a p90 miss (> budget x 1.08, >= 8 frames, 1 s cooldown), up by a trial after
  6 s doubling to 96 s on a miss; `thermal` (a minute's average 12% over the first at one level, or three failed
  tries). `QualityManager` runs it in a match when `video.adaptive`
  (default; replaces `dynamicRes`) and not under `?gfx=` / a benchmark override; `applyAdaptive` -> canvas scale
  (no TAAU) and `QualityTarget.applyAdaptive` (GameState: `World.applyAdaptive` - `LightRig.setAdaptive(lit share,
  shadow refresh)`, sun CSM refresh, part / anim LOD; `PostStack.setAdaptive` - `Taau.setScale` (the post
  process's ratio), volumetric light count; vfx / weather density). Reset on a new target or a settings change.
  Debug line `governor L<n>`; feedback context `adaptive`. `perf.mjs --preset=<p>` (budgets per preset).
- Benchmark (3.0, `game/benchmark.ts` pure: `BENCH`, `benchPlan(kind, w, h)`, `benchResult`, `sustainedDrift`):
  Settings > Graphics > Benchmark -> `app.benchmark(kind)` -> a Test Chamber match in the `test` mode (clean-up G2c; H removed the Warehouse) with `opts.benchmark`;
  `GameState` flies the camera along `benchFlight` (3.2.5, pure, `FLIGHT`: the room middles in a short tour (nearest
  neighbour + 2-opt on walking distance), joined by nav A* routes with `NavGrid.walkOnly` (doorways, stairs; no ladders
  / drops), a dead-end visit circled (`orbit`) instead of reversed, Taubin-smoothed and pushed off walls within
  `FLIGHT.drift` while every sample-to-sample line stays walkable, the eye `FLIGHT.eye` 1.9 m over the smoothed floor
  (lowered under anything overhead: `GameState.headroom` ray), the view a smoothed look ahead bent towards open space
  where it meets a wall (`FlightNav.see`, sight rays); `flightAt(dist)` at `FLIGHT.speed` 2.8 m/s, so every run sees
  the same views; doors open, leaves hidden (`Doors.setVisible`)), guards passive, one flight per run (`current`, `presets` (3.1: Low .. Epic), `features` (3.1.2: `featureRuns(current features)`:
  the settings, then one costly feature off / down per run, `FEATURE_SECONDS` 20; `BenchRun.gfx` ->
  `QualityManager.setOverride({ gfx })`; 3.1.4: then two diagnosis runs, `rebuild` 'post' / 'shadows' mid-match; 3.2: a 'render scale 75%' run second
  (`benchPlan(.., scale)`: GPU bound or not), 'anti-aliasing FXAA' and 'detail Medium' runs;
  3.1.4: every run in its own match - `app.benchmark(BenchSession)` calls `setOverride(o, false)` before `startGame`,
  the session carries the plan and lines, `sameMatch` runs go on in the last match; 3.1.5: the note (`BenchSession.note`)
  saved after every run, `ui/benchTag.ts` "Run n/N · label · fps" on screen), `resolutions` = the monitor's resolutions (3.2.1), `sustained` 10 min with per-minute averages), then a Dialog with a line per run
  (`benchmarkLines`: + frames over `BENCH.longMs` 50 and shaders compiled during the run, from the engine's
  `_compiledEffects`; 3.3: the run's spike log), saved as a performance feedback note. Every run sets an override, so the frame governor is
  off while measuring.
- Renderer (3.0): `LightRig.configure` - unshadowed map lights in a `ClusteredLightContainer` (plain pool of 6
  without float blending), a shadow pool of spot lights with `ShadowGenerator`s (flashlights first, then the
  nearest lamps; lamps use a 144 deg cone there; idle maps stop refreshing, shadows never toggle - no recompiles),
  one shared caster list (`addCaster`: level meshes, characters, props; `World.addShadowCaster` also sets the
  receiver), materials fitted by `onNewMaterialAddedObservable`; additive cones hidden with volumetrics.
  `World.applyQuality`: the sun / moon `CascadedShadowGenerator`. Blob shadows only with shadows off.
  `vfx/postStack.ts` `PostStack` (rebuilt on a change): TAA, SSAO2, SSR, screen motion blur, the volumetric pass
  (depth renderer; per light a ray / sphere stretch marched for cone in-scatter, closed-form height fog; 12 nearest
  lights; which lights beam and which haze under their shade: `vfx/volLights.ts`, per map `theme.lampBeams`), then `DefaultRenderingPipeline` (HDR, MSAA samples, FXAA, bloom, DOF focused by `focus` / `focusOn`:
  aiming = the aim ray's hit; not aiming = fully sharp, f/1e7, so its depth pass may pause - `vfx/dofAperture.ts`
  eases the aperture and opens it only while that depth renders (3.6: the old idle f/32 read the paused depth as
  "at the lens" and blurred the whole frame on High / Ultra / Epic with ray tracing off), chromatic aberration, sharpen with TAA, KHR PBR Neutral tone mapping);
  `CinematicPost.toEnd()` keeps the grade / vignette / goggles pass last (it also carries the one goggle frame (`GOGGLE_FRAME`, about 89% clear at 16:9), the night-vision frame auto-gain
  (`vfx/nightExposure.ts`) and the step 14 thermal /
  electro `vk` branch: render-only, never detection; no extra pass or target; see `docs/systems/lighting.md`).
  Goggle sensor grain (step 21v, M14 N7, A87): thermal, electro and night vision carry an animated, luminance-weighted
  grain and a slight soften, all in this pass (`SENSOR_GRAIN` in `vfx/visionLook.ts`, a constant, no setting): a
  sine-free hash per cell, 640 cells per screen height (the same grain size at any resolution), a new field 30 times a
  second; peak to peak at black thermal 0.13, electro 0.11 (green-tinted), night 0.06 (phosphor-tinted), down to 0.45 / 0.45 / 0.4
  of that at full output luma (night: the tube drive; `litNight`) so hot bodies, live devices and lit phosphor stay readable. Soften:
  thermal 4 taps (0.6), electro 4 taps (0.35), night 2 diagonal taps (0.3), at `THERMAL.blur` 0.0018 of screen
  height. Cost per pixel over step 14: +4 taps electro, +2 night, thermal unchanged; no texture, no target. Perception,
  the light meter and the wire never read any of it (`tests/visionIsolation.test.ts`). Decided, not built yet: the
  goggle modes are night, thermal and electro (G99), switched by an instant cut in CT's order (thermal, electro, night,
  off; G100; the wheel picks the mode and the flip plays only on on / off, G181); grain as in CT (G101); thermal follows
  CT's colour ramp and shows people behind closed doors as a dim silhouette (G102). The passes ahead of tone mapping
  (TAA, SSAO2, SSR, ray-traced reflections, motion blur, the volumetric pass, `taauPass`) hold linear light in half
  float when the GPU can render it (`PostStack.hdr`, Phase 1 Step 4b fix round 5): in 8 bits the darkness curve's dark
  band drew contour bands and blocky speckle.
- Materials (3.0): `world/surfaceAtlas.ts` `SurfaceAtlas` - two GPU `ProceduralTexture` atlases (4 x 4 tiles, periodic
  GLSL: `detail` rgb albedo variation + a roughness, `normal` rg normal + b height + a cavity) for `SURFACE_KINDS`
  (`SURFACE_PARAMS`: metres per tile, metallic, bump); drawn once, `setSize` by the Textures tier (`TEXTURE_SIZE`
  per tile, `TEXTURE_ANISO`; 256 for `?gfx=min`; 3.2.3: always re-made on `World.applyQuality`'s first call - the one
  made while the map loads draws empty). `world/surfacePlugin.ts` `SurfacePlugin` (PBR plugin): triplanar
  `textureGrad` taps in world space (level: per-instance `surf`) or object space (parts: `pattern.z`), albedo x
  detail x cavity, `metallicRoughness`, a UDN normal blend (world space). `world/surfaceKinds.ts` (pure)
  `pieceKind` / `floorKind` / `hsv`: floors by the footstep surface, else by colour; `partSurface` (weapons
  brushed / polymer, characters fabric / rubber, props like the level). The level (`LevelBuilder.build(.., { atlas,
  floor })`) and `PartLibrary(scene, atlas)` are `PBRMaterial`s: colours converted to linear, `usePhysicalLightFalloff
  = false` and `directIntensity = PI` (PBR divides diffuse by pi; the lights were authored for the standard
  material), `realTimeFiltering` on the `World` reflection probe (rendered once, then `scene.environmentTexture`;
  assigned after the capture to avoid a feedback loop). The menu stage has its own atlas for the operator.
- Detail (3.0): `world/detailPass.ts` (pure) `detailPieces(boxes, mapId, tier)` - skirting, conduit + junction
  boxes + switches, wall boxes / vents / signs (ultra), floor stains / puddles / debris (epic); every piece
  `collide: false`, `noLedge`, `detail`; `LevelBuilder.build(.., { detail })` from
  `WorldOptions.detail` (the Detail tier when the map loads; none with `?gfx=min`); a test builds every map and checks
  cover faces, ledges and the solid set are unchanged. `QualityLevel.detailScale` scales `PartLibrary.setLodScale`
  and `setAnimLodScale` (characterRig). `Vfx`: spent brass (`Brass`: one bounce, then lies at the shooter's floor;
  48 x effects density kept), 160 decals.
- Smooth world (the only renderer since voxel-retire, 2026-10-23, Michael: "nothing should be voxel"): `LevelBuilder.build`
  draws every visible piece as thin-instanced boxes / 12-sided cylinders in the PBR level material with `SurfacePlugin`
  (per-instance `surf` kind, as above); the box detail pass draws at the Detail tier; `BakedLamps` builds on every
  non-cheap path (below and lighting.md); characters, weapons and props are the smooth parts (guards merge into one
  skinned `SmoothBody`). The rain stops at `World.roofAt` (`world/roofGrid.ts`, the canonical light shapes' tops); fog
  shafts read the baked moon. `?gfx=min` is standard materials, no atlas, no baked lamps. `src/voxel/` now holds only
  the light bakes (lamp bake, light volume, moon / sky bake, canonical light shapes, the bake worker pool).
- Sky bake (`voxel/skyBake.ts`, pure, a worker job): the smooth level's sky visibility (`World` `smoothSky`, grid
  `SKY_GRID` + `SKY_CELL` 0.5 m in `world/levelFill.ts`): conservative occupancy over the canonical light shapes, 16
  cosine-weighted upward rays per air cell -> visibility (R8 3D texture, linear). `LampPlugin` `LAMP_LEVEL` takes the
  hemisphere's fill scaled by it and scales irradiance / reflections by it. `bakeMoon` bakes the moon's visibility
  (fog shafts, the lamp plugin's moon term). Its GI bake code stays but nothing in the game calls it.
- Weather choice (3.0, `MapDef.weathers`, `WeatherChoice` clear / rain / fog; Play screen + co-op lobby, `lobby` /
  `start` messages carry `weather`): rain = `Weather('rain')` with `occluder` = `roofAt` (no rain under roofs; it falls
  through the skylights), fog x1.6; fog = fog x4 and the volumetric
  pass's light shafts (`PostStack` `sky` + `shafts`: the baked moon sampled along the first 30 m of each ray).
- Reflections (`GraphicsFeatures.reflections` off / ssr / rt): `rt` runs screen space reflections since voxel-retire (the
  ray tracer traced only the voxel brickmap and is gone); the setting is kept for saved settings.
- TAAU (3.0 phase 5, Display > Upscaler, `video.upscaler` off / taau with a render scale < 1; `QualityLevel.upscale`):
  the canvas stays native (`QualityManager.applyScale`), `vfx/taau.ts` `Taau` is first in the chain (its input sets
  the scene's size), jitters the projection (Halton 2, 3 in low-res pixels; un-jittered view-projection kept for the
  reprojection), resolves at full resolution (Catmull-Rom current, history reprojected through the depth and clamped
  to the 4-neighbourhood, 1 : 9) into a ping-pong pair handed on by `taauPass`; replaces TAA.
- Panini (3.0 phase 5, `video.panini` 0..1, `QualityLevel.panini`): `core/panini.ts` (pure: `paniniView`,
  `paniniScale` fit to the width) and `vfx/paniniPass.ts` (after the default pipeline, before the grade). World
  prompts and markers are projected rectilinear (they drift a little near the sides with a strong Panini).
- Weather (3.0, `MapTheme.weather`: set only on the parked Port (rain), Dust Depot (dust) and Refinery (haze); the
  weather choice above works on any map): `vfx/weather.ts` `Weather`
  (thin-instanced streaks / motes in a box wrapped round the camera, updated in place, count x effects density),
  `SurfacePlugin.wet` (upward faces darker and glossy, more in cavities: SSR puddles), the volumetric pass's
  `shimmer` (heat haze: distant, low pixels displaced).
