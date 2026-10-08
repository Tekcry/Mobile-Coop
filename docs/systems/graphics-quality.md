# Graphics and quality
Purpose: presets, auto graphics, the frame governor, the benchmark, the renderer, materials, voxels, TAAU and weather.
Design authority: docs/design-bible.md (Section 8)

## Audio and quality (graphics, presets, auto graphics, governor, phone look settings)
- Graphics (3.0, 3.1 ladder; `core/quality.ts` pure): `GRAPHICS_PRESETS` Low / Medium / High / Ultra / Epic (`PRESET_IDS`;
  phones `MOBILE_PRESET_IDS` without Epic, `forPlatform` maps Epic -> Ultra on mobile and applies `MOBILE_OFF` (3.1.9: no AO, reflections, DOF, motion blur, lens; Panini 0, bloom kernel 32 at quarter size via `QualityLevel.mobile`), `QualityManager.setMobile`
  from `App.applyPlatform`) fill `GraphicsFeatures` (shadows off / low / medium / high / ultra / epic -> `shadowSpec`: sun
  cascades, lamp / flashlight casters 0 / 2 / 3 / 4 / 4 (3.1.7 `MAX_SHADOW_CASTERS`: WebGL guarantees 16 textures per
  shader and the voxel level material uses 11 without lamp shadows; lamps are PCF, one texture each - 8 soft ones broke
  the level on D3D11, while headless software GL allows 32; `e2e-desktop` checks every material at Epic <= 16), map
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
  `capAllows`), `fovH` 60-120; `setGfx` / `setPreset` (also sets `renderScale` / `upscaler` from `PRESET_DISPLAY`:
  Low 0.67 .. Ultra 0.9 TAAU, Epic native). `VOXEL_TIER` per Detail tier: structure 5 cm on every preset (fairness),
  the 2.5 cm prop layer from High up, character / weapon voxel sizes; `VOXEL_LOD` distances per tier. `app.quality` (QualityManager) applies the level to the state's
  `applyQuality(level)` (GameState: `World.applyQuality` + `PostStack.apply`; MenuState: lamp shadows + its stack),
  feeds `RefreshDetector` (raw rAF intervals; 3.1.9: the 25th percentile, and in a match it only rises - GPU-bound
  frames last whole refresh periods), `FrameStats` and, only with dynamic resolution, the
  `ResolutionScaler` (0.5-1.0 against the cap or display budget). `?gfx=min|low|medium|high|ultra|epic` overrides for a page;
  `QualityManager.setOverride({ preset, scale })` is the benchmark's per-run override (never saved; ignored under `?gfx=`).
- Auto graphics (3.1, `core/deviceTier.ts` pure): `tierFromRenderer(renderer, mobile)` (desktop / phone GPU tables,
  confident or not; iOS "Apple GPU" is not), `deviceKey`, `Calibration` (the ladder top down on the menu stage, each at
  its render scale x `CALIBRATION.load` 1.4, warm-up 0.6 s + 1.2 s measured, p90 interval <= budget x 1.12; <= 6 s).
  Settings `video.auto` (default; 3.0 settings on Epic move to it; `setPreset` / `setGfx` turn it off, `setAuto(s,
  tier)`), `video.device {key, tier, source gpu | calibrated | none}`. `App.detectGraphics(force)` after
  `loadSettings` and on a platform change: known key -> its tier; else the GPU name; else `calibKey` and
  `calibFrame` runs it on `MenuState` (`menuStage`) through `QualityManager.setOverride`, aborted off the menu,
  toast + `onDetected`. Under automation only with `?detect=1` (`?renderer=` fakes the GPU name).
- Frame governor (3.1, `core/governor.ts` pure): `Governor.frame(interval, budget)` levels 0-10 (`adaptiveAt` ->
  `Adaptive`: scale 0.92 / 0.84 / 0.76, shadowEvery 2, volLights x0.5, voxelLod x0.75, effects x0.6, lights x0.75,
  partLod x0.75, scale 0.68), down on a p90 miss (> budget x 1.08, >= 8 frames, 1 s cooldown), up by a trial after
  6 s doubling to 96 s on a miss; `thermal` (a minute's average 12% over the first at one level, or three failed
  tries), `lowPower` (a phone at < 40 Hz; App toasts once). `QualityManager` runs it in a match when `video.adaptive`
  (default; replaces `dynamicRes`) and not under `?gfx=` / a benchmark override; `applyAdaptive` -> canvas scale
  (no TAAU) and `QualityTarget.applyAdaptive` (GameState: `World.applyAdaptive` - `LightRig.setAdaptive(lit share,
  shadow refresh)`, sun CSM refresh, voxel / part / anim LOD; `PostStack.setAdaptive` - `Taau.setScale` (the post
  process's ratio), volumetric light count; vfx / weather density). Reset on a new target or a settings change.
  Debug line `governor L<n>`; feedback context `adaptive`. `perf.mjs --preset=<p> [--mobile]` (phone budgets per preset).
- Benchmark (3.0, `game/benchmark.ts` pure: `BENCH`, `benchPlan(kind, w, h)`, `benchResult`, `sustainedDrift`):
  Settings > Graphics > Benchmark -> `app.benchmark(kind)` -> a Clear match on the Warehouse with `opts.benchmark`;
  `GameState` flies the camera along `benchFlight` (3.2.5, pure, `FLIGHT`: the room middles in a short tour (nearest
  neighbour + 2-opt on walking distance), joined by nav A* routes with `NavGrid.walkOnly` (doorways, stairs; no ladders
  / drops), a dead-end visit circled (`orbit`) instead of reversed, Taubin-smoothed and pushed off walls within
  `FLIGHT.drift` while every sample-to-sample line stays walkable, the eye `FLIGHT.eye` 1.9 m over the smoothed floor
  (lowered under anything overhead: `GameState.headroom` ray), the view a smoothed look ahead bent towards open space
  where it meets a wall (`FlightNav.see`, sight rays); `flightAt(dist)` at `FLIGHT.speed` 2.8 m/s, so every run sees
  the same views; doors open, leaves hidden (`Doors.setVisible`)), guards passive, one flight per run (`current`, `presets` (3.1: Low .. Epic, phones Low .. Ultra), `features` (3.1.2: `featureRuns(current features)`:
  the settings, then one costly feature off / down per run, `FEATURE_SECONDS` 20; `BenchRun.gfx` ->
  `QualityManager.setOverride({ gfx })`; 3.1.4: then two diagnosis runs, `rebuild` 'post' / 'shadows' mid-match; 3.2: a 'render scale 75%' run second
  (`benchPlan(.., scale)`: GPU bound or not), 'anti-aliasing FXAA' and 'detail Medium' runs;
  3.1.4: every run in its own match - `app.benchmark(BenchSession)` calls `setOverride(o, false)` before `startGame`,
  the session carries the plan and lines, `sameMatch` runs go on in the last match; 3.1.5: the note (`BenchSession.note`)
  saved after every run, `ui/benchTag.ts` "Run n/N · label · fps" on screen), `resolutions` = the monitor's resolutions (3.2.1), `sustained` 10 min with per-minute averages), then a Dialog with a line per run
  (`benchmarkLines`: + frames over `BENCH.longMs` 50 and shaders compiled during the run, from the engine's
  `_compiledEffects`; 3.3: the run's spike log; phones: `phone` - the Phone check), saved as a performance feedback note. Every run sets an override, so the frame governor is
  off while measuring.
- Renderer (3.0): `LightRig.configure` - unshadowed map lights in a `ClusteredLightContainer` (plain pool of 6
  without float blending), a shadow pool of spot lights with `ShadowGenerator`s (flashlights first, then the
  nearest lamps; lamps use a 144 deg cone there; idle maps stop refreshing, shadows never toggle - no recompiles),
  one shared caster list (`addCaster`: level meshes, characters, props; `World.addShadowCaster` also sets the
  receiver), materials fitted by `onNewMaterialAddedObservable`; additive cones hidden with volumetrics.
  `World.applyQuality`: the sun / moon `CascadedShadowGenerator`. Blob shadows only with shadows off.
  `vfx/postStack.ts` `PostStack` (rebuilt on a change): TAA, SSAO2, SSR, screen motion blur, the volumetric pass
  (depth renderer; per light a ray / sphere stretch marched for cone in-scatter, closed-form height fog; 12 nearest
  lights), then `DefaultRenderingPipeline` (HDR, MSAA samples, FXAA, bloom, DOF focused by `focus` / `focusOn`:
  aiming = the aim ray's hit, chromatic aberration, sharpen with TAA, KHR PBR Neutral tone mapping);
  `CinematicPost.toEnd()` keeps the grade / vignette / goggles pass last.
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
  `collide: false`, `noLedge`, `detail` (the minimap skips it); `LevelBuilder.build(.., { detail })` from
  `WorldOptions.detail` (the Detail tier when the map loads; none with `?gfx=min`); a test builds every map and checks
  cover faces, ledges and the solid set are unchanged. `QualityLevel.detailScale` scales `PartLibrary.setLodScale`
  and `setAnimLodScale` (characterRig). `Vfx`: spent brass (`Brass`: one bounce, then lies at the shooter's floor;
  48 x effects density kept), 160 decals.
- Voxels (3.0, `src/voxel/`): the level renders as voxels; gameplay still reads the blockout (collision, cover, nav,
  ledges, anchors, perception). `levelVoxels` (pure) splits the pieces (every side >= `MIN_VOXELS` 1.5 voxels becomes
  voxels, thinner ones stay thin-instanced boxes / cylinders until the art layer models them) and builds the palette
  (`Palette`: colour + surface kind + emissive, <= 255) and the grid (`CHUNK` 128 voxels a side, origin on the brick
  grid). `shapes.ts` (pure): `VoxelShape` box (yaw / pitch as Babylon's) / cylinder, fill / carve / paint, packed 16
  floats each, `rasterise` by voxel centre (a surface lands within half a voxel). `mesher.ts` (pure) greedy meshing on
  occupancy only (one-voxel apron, Babylon winding). `chunk.ts` `buildChunk` (pure: rasterise + mesh + bricks) runs in
  `voxelWorker.ts` through `WorkerPool` (`hardwareConcurrency - 4`, 2..16; inline without Worker). `brickmap.ts`
  (pure) `Brickmap`: 8^3 bricks, empty / uniform / explicit (pool slots), `fold`, `compact`. `VoxelWorld` (Babylon):
  chunk jobs per level of detail (level l = 2^l x the size, same chunk extent), meshes per chunk, the brickmap on the
  GPU (indirection RGBA8 3D: a 0 empty / 254 uniform / 255 explicit slot; pool R8 3D 512 x 512 x 8n; palette RGBA8 256
  x 1), `VoxelPlugin` (PBR plugin: the voxel behind each pixel -> palette; per-voxel tone / roughness hash; AO and
  worn convex edges from neighbour voxels; the surface atlas as micro detail inside faces; rain `wet`; emissive;
  coarse levels search 2^l voxels inward), level of detail per chunk by camera distance at 5 Hz (`VOXEL_LOD` per Detail
  tier: Epic 30 / 60 m). `voxelCache.ts`: chunk results in IndexedDB `kv` (`voxel:<map>:<seed>:<size>:<levels>:v<VOXEL_VERSION>:<hash>`,
  newest 4 kept). `World.create(.., { voxel })` (GameState: 5 cm x 3 levels with AO / micro; `?gfx=min` 20 cm x 1, no
  AO / micro; `?voxels=0` the old boxes); chunk meshes are shadow casters and in the reflection probe.
  Coarse levels rasterise `coarseShapes` (every filled shape >= one voxel thick, so thin walls never drop out at a
  distance). `tests/losParity.test.ts` (3.1): sight lines through the Warehouse agree for every preset's layers and
  levels (against Epic up close), except lines grazing a surface within the coarsest voxel's reach; a line through
  every thin piece stays blocked at every level.
  `tests/voxelFit.test.ts`: parity (voxelising changes no cover face, ledge or solid) and fit (+-3 cm on every axis
  cover face, ledge lip and floor top against the plain blockout, art layer and fine layer included; round pillars:
  half a voxel's diagonal plus the curve's sag).
- Voxel art (3.0 phase 2): `MapDef.art` (`VoxelArt`: `piece(p, i, kind, pal, mat)` -> `{ mat, prog, params, fine }`,
  `extra(pal, boxes, cyls)` -> visual-only shapes) - `world/maps/warehouseArt.ts` picks by the builder's colours.
  `voxel/programs.ts` (pure) material programs run per voxel inside `rasterise`: BlockWall (running bond, mortar),
  Concrete (chipped arrises, form lines), Cladding (concrete plinth, ribs carved only above 4.4 m), Planks, Steel
  (worn edges, seams, rust), Hazard, Floor (saw cuts, stains), Wrap, Rack, paint programs Grime / Rust (-1 = keep);
  variants are consecutive palette entries (`Palette.range`). Rule: nothing carves or protrudes where gameplay reads a
  surface (cover faces, lips, floors) - the fit test enforces it. `fine: true` pieces (props, furniture, machines,
  vehicles; also pieces thinner than 1.5 coarse voxels) form a second `VoxelWorld` at `fineSize` (2.5 cm at Epic,
  `World.voxelsFine`, LOD at half the distances). With an art layer the box detail pass is skipped.
- Sky bake (`voxel/skyBake.ts`, pure, a worker job): conservative occupancy in 0.5 m cells, 16 cosine-weighted upward
  rays per air cell -> visibility (R8 3D texture, linear) + the roof height per column. `VoxelPlugin` takes the
  hemisphere's fill itself (`setFill`; the hemi light excludes voxel meshes) scaled by visibility, and scales
  irradiance / reflections by it; the fine layer reads the structure layer's bake (`skyFrom`). `VoxelWorld.roofAt`,
  `skyAt`. Palette row 1 r = puddle (mirror-like in the rain).
- Weather choice (3.0, `MapDef.weathers`, `WeatherChoice` clear / rain / fog; Play screen + co-op lobby, `lobby` /
  `start` messages carry `weather`): rain = `Weather('rain')` with `occluder` = `roofAt` (no rain under roofs; it falls
  through the skylights), voxels wet only where the sky reaches (`setWet`), fog x1.6; fog = fog x4 and the volumetric
  pass's light shafts (`PostStack` `sky` + `shafts`: the sky bake sampled along the first 30 m of each ray).
- Voxel characters (3.0 phase 3, `voxel/voxelBody.ts`): `setVoxelBodies(opts)` (GameState: 2 cm, 4 cm past
  `LOD_DISTANCE` x detail; menu stage 2 cm; `?gfx=min` / `?voxels=0`: null, the smooth parts render) makes every
  'detailed' `CharacterRig` (the stick style stays) a `VoxelBody`: every part on one joint voxelised into one grid in
  that joint's space (`meshVoxels.ts` `fillMesh`, pure: scanline parity by voxel centre; thin features keep the cell of
  a surface vertex with none of the part's cells beside it; a later part overwrites an earlier one - balaclava over the
  head), greedy meshed by value (`greedyMesh(.., byValue)`: faces between parts culled, a quad per part colour), cached
  per (joint's parts + transforms, size), merged into a body and a head mesh
  (+ the LOD pair) with per-vertex colour / pattern / `color2` / `vox` (the voxel-grid position: `VoxelBodyPlugin`
  per-voxel tone and fine seams), rigidly skinned: one flat bone per node a part hangs from, set each frame (skeleton
  `onBeforeComputeObservable`) to the node's world matrix relative to the root, so ragdolls (joints re-parented onto
  physics nodes) still drive it. The smooth parts stay, invisible (hit volumes, clearances, ghost / sonar read the
  joints). `rig.renderMeshes` (shadow casters), `rig.setHeadVisible` (camera fade), `setLensGlow` / `setFlash` reach
  the vertices (`setPartColor`). `PartLibrary.skinMaterial` (unfrozen twin of the part material + `VoxelBodyPlugin`,
  `mesh.metadata.skinMaterial` on the bases). Two draws per character (+ shadows).
- Voxel weapons / gadgets (3.0 phase 4, `voxel/voxelGroup.ts`): `VoxelGroup` merges the parts under one node into one
  rigid voxel mesh there (parts at `size`, parts thinner than `small` on a second grid at `fineSize`; a coarser LOD).
  `setVoxelWeapons` (`WeaponModel.voxel`, `renderMeshes` for shadow casters; 1 cm, 5 mm small parts, 2 cm LOD) and
  `setVoxelProps` + `voxeliseParts` (thrown grenades - the LED stays a part to blink - and the drone body, the rotors
  stay parts to spin). `VoxelSink` (`voxelBody.ts`) is the shared vertex builder.
- Chips (3.0 phase 4, cosmetic): `Ballistics.onWorldHit` (GameState, 5 cm voxels or finer) -> `VoxelWorld.chip`: the
  voxel behind a world hit (the prop layer first) turns to `LevelVoxels.chip` (a dark pock, the palette's last
  entry): one `texSubImage3D` texel, or for a uniform brick a new explicit slot from the GPU pool's spare capacity
  (brick + indirection texel); geometry, collision and meshes never change. `Vfx.chips` throws cubes of the struck
  colour (instead of the decal).
- GI (3.0 phase 6, `GraphicsFeatures.gi`, Epic; baked at load, so "next map"): `world.ts` `giLights(reg)` packs the
  map's fixed lights (not flashlights; `GI_STRIDE`) with a slot per lamp circuit (`group`, <= `GI_SLOTS` 12, more share
  the last); the sky bake job takes them (`skyBake.ts` `bakeGi`, pure: per air cell near a light, 12 rays to the
  surfaces round it, each surface's direct light from that lamp - falloff, cone, facing, a visibility march - bounced
  at a grey albedo, into the light's slot; RGBA / `GI_MAX`). `VoxelWorld.giData` (the sky cells, slots stacked along
  z); 3.2: `mixGiSlots` / `VoxelWorld.mixGi` sum the slots x the lit share of each circuit (World.updateGi on a
  `LightRegistry.version` change: switches, shot-out lamps, EMP) at half scale into one `giTex` (the fine layer reads
  the structure's), and `VoxelPlugin` `VOXEL_GI` takes one tap of it (x 2 `giScale`) into the voxel ambient.
  Cached with the sky (`VOXEL_VERSION` 4, the key carries the lights' hash).
- Reflections (3.0 phase 5, `GraphicsFeatures.reflections` off / ssr / rt; settings before had `ssr` on / off):
  `vfx/rtReflections.ts` `RtReflections` (PostStack, Ray traced with a voxel world, `PostStackOptions.rt` = GameState's
  `RtSource`: the structure layer's textures, its plugin's wet / fills, `rtCapsules`, the light registry): `rtScene`
  (a copy) -> `rtReflect` (per pixel, or a checkerboard alternating per frame at `rtRes` half: the voxel the pixel
  shows gives an axis normal, metal (`VX_P`), wetness / puddle -> roughness; glossy ones reflect: screen space first
  (20 steps against the depth), then a brickmap DDA (empty bricks skipped, <= 320 steps, 30 m) and up to 16 character
  capsules; hits shaded by palette colour, sky fill x baked visibility, 16 nearest lights, emissive) -> `rtComposite`
  (a tent over the traced pixels added to the scene). The SSR pipeline is off while it runs.
- TAAU (3.0 phase 5, Display > Upscaler, `video.upscaler` off / taau with a render scale < 1; `QualityLevel.upscale`):
  the canvas stays native (`QualityManager.applyScale`), `vfx/taau.ts` `Taau` is first in the chain (its input sets
  the scene's size), jitters the projection (Halton 2, 3 in low-res pixels; un-jittered view-projection kept for the
  reprojection), resolves at full resolution (Catmull-Rom current, history reprojected through the depth and clamped
  to the 4-neighbourhood, 1 : 9) into a ping-pong pair handed on by `taauPass`; replaces TAA.
- Panini (3.0 phase 5, `video.panini` 0..1, `QualityLevel.panini`): `core/panini.ts` (pure: `paniniView`,
  `paniniScale` fit to the width) and `vfx/paniniPass.ts` (after the default pipeline, before the grade). World
  prompts and markers are projected rectilinear (they drift a little near the sides with a strong Panini).
- Weather (3.0, `MapTheme.weather`: Port rain, Dust Depot dust, Refinery haze): `vfx/weather.ts` `Weather`
  (thin-instanced streaks / motes in a box wrapped round the camera, updated in place, count x effects density),
  `SurfacePlugin.wet` (upward faces darker and glossy, more in cavities: SSR puddles), the volumetric pass's
  `shimmer` (heat haze: distant, low pixels displaced).
