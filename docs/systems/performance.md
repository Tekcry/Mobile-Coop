# Performance budget
Purpose: frame-rate targets, CPU / draw / memory budgets and the perf script budgets (desktop, phone and test path).
Design authority: docs/design-bible.md (Section 8)

## Performance budget (3.0: the gaming laptop; desktop first)
- Frame-rate targets (the RTX 4090 Laptop, mains power, Epic, Warehouse, 10 guards; 1% low >= 70% of the average):
  1920 x 1200 165 Hz (RT reflections 120), 2560 x 1600 120 Hz (RT 90), 3440 x 1440 100, 5120 x 1440 90, 4K 60 (RT 50),
  7680 x 2160 60 with TAAU at 67% (High 120). Phones run the same settings slower (accepted); 3.1.9: the iPhone 17 Pro Max target is 60 fps at Ultra, native.
- GPU per frame = the target's frame time minus ~10% headroom: 165 Hz 5.5 ms, 120 Hz 7.5 ms, 100 Hz 9 ms, 90 Hz 10 ms,
  60 Hz 15 ms. Only the laptop can measure it: Settings > Graphics > Benchmark (TESTING.md table).
- CPU main thread <= 3 ms per frame (inside a 240 Hz frame's 4.17 ms): the sim (fixed steps, anim, camera) + the
  render's JS (active mesh evaluation: LOD, culling, skeletons / voxel bones). Animation <= 0.04 ms per character with
  voxel bodies. <= 600 draw calls and <= 8 M triangles per frame over every pass (shadow maps and post included).
  Allocations <= 11.5 MB per second (per second, so a 240 Hz display does not double the garbage). Memory: VRAM <=
  12 GB at Epic (High 6, Ultra 9; brick pool <= 5 GB; render targets <= 2.5 GB at 4K, 3.5 GB at 7680 x 2160), tab <=
  6 GB, JS heap <= 1.5 GB, voxel cache <= 2 GB; Warehouse load <= 4 s cold, <= 1.5 s cached.
- `perf.mjs --desktop --budget` (the PC path, `?gfx=epic`, 640 x 360): the sim's p95 (fixed steps, anim, camera)
  <= 2 ms (the rest of the 3 ms is the render's submission), animation <= 0.04 ms per character, allocations <= 11.5
  MB/s; draws <= 520 and triangles <= 1.7 M as the regression check (counted by wrapping the engine's draw calls: every
  pass; the laptop's GPU budget stays 600 / 8 M). Measured (3.1.0, idle VM): sim p95 2.05 ms at speed x1.19, animation
  0.044 ms, 444 draws (moon cascades 172, lamp shadows 140, main 55, G-buffer 52), 1.34 M triangles, 9.9 MB/s. CPU
  budgets scale by the machine: a fixed pure-JS workload against `REF_MS` (the VM the 2.3 budgets were set on), so a
  slower or busier VM does not fail an unchanged build (a reading far off the usual ~4.2 ms means the VM was busy:
  run again). The render's JS is printed but not enforced (software GL stalls land in it); the laptop's benchmark
  line carries the real main thread p95 (`benchResult` cpu from `GameLoop.stats.frameCpuMs`).
- 3.1 phone budgets (`perf.mjs --preset=<p> --mobile --budget`, `PASSES=1` prints draws per pass): draws Low 120 /
  Medium 170 / High 230 / Ultra 250 (the iPhone 17 Pro Max target: main thread <= 4 ms of 8.33, <= 2 M triangles);
  measured Low 103, Medium 156, High 218, Ultra 233. What keeps them there: `World` shadow proxy (below Epic the
  voxelised pieces cast from one thin-instanced box + cylinder mesh on `PROXY_LAYER`, which no camera draws -
  explicit shadow lists ignore layers; `setCasterMode` by `shadows === 'epic'`), `World.updateSunCasters` (4 Hz:
  static + moving casters open to the sky, none under 0.3 m; Low `ShadowSpec.staticSun`: static only, blob shadows
  on), `LightRig.fillCasters` skips casters under 0.3 m, `PostStack.depthSource` (the G-buffer's raw view z for fog /
  TAAU when SSAO / SSR enable it; else (3.2) the scene pass's hardware depth - `bindSceneDepth` gives the first post
  process's input target a depth texture, `VIEW_Z_GLSL` linearises it; the depth renderer only with MSAA; `depthRaw`
  uniform 0 / 1 / 2; DOF's depth renderer `enabled` only while aiming, unless RT
  reflections share it - 3.1.9), non-player
  `VoxelBody` without the head split.
- 3.1.1 phone GPU (the iPhone benchmark was GPU-bound at Medium+): with TAAU the volumetric pass is first in the chain
  at the TAAU ratio (`makeVolumetric(ratio)`; `PostStack.setAdaptive` moves its `_options` with TAAU's) and TAAU sets
  its jitter in `scene.onBeforeCameraRenderObservable` (before shadow maps / G-buffer / any pass ahead of it); the
  G-buffer is enabled at the TAAU ratio; volumetric `steps` uniform (Epic effects 16, else 8); phones' output
  `video.phoneOutput` (3.1.9, Settings > Graphics > Output resolution: native (default) or a DPR cap 2 / 1.5;
  `PHONE_OUTPUTS`, `QualityManager.applyScale` on mobile); `presetDisplay(p, mobile)` (phone Ultra native, no TAAU);
  `App.phoneDefaults` once per phone (`video.phoneSetup`; skipped under automation without `?detect=1`): Target frame
  rate `PHONE_FPS` 60 and the preset's resolution again. 3.2.2 phones: `mobileShadow` (moon maps <= 1024, one
  flashlight shadow), textures <= High (`forPlatform`), `world/renderOpts.ts` (set by `App.applyPlatform`, read when
  materials are made: `iblFilter` off - PBR `realTimeFiltering` - and `aoLite`: `VOXEL_AO_LITE`, side neighbours only),
  FXAA off behind TAAU (all devices), `dropCpuCopy` (voxel pools, lamp atlas: no `_bufferView` kept), shaders
  compiled on the loading screen (`GameState.create` awaits `scene.whenReadyAsync`, <= `WARMUP_MAX_MS`), benchmark
  runs on phones release the match and wait `MOBILE_RUN_GAP_MS` 2.5 s. `World.refreshMaterials` when the shadow spec changes or the post stack rebuilds in a match (3.1.3; `PostStack.builds`; frozen
  materials re-read their lights, refreeze after two frames).
- Local profile (`E2E_GPU=1 node scripts/perf.mjs [--desktop | --phone] --budget`, Michael's PC only; cloud VMs mark perf "pending PC run"): the
  hardware GPU, no machine-speed scaling, plus the main thread (sim p95 + render JS) and the rendered frame interval p95. Limits (`LOCAL_BUDGET`):
  gfx=min sim 1.1 ms / animation 0.03 / main 3.6 / pacing 1.15x; phone look 1.1 / 0.03 / 3.4 / 1.15x; Epic and presets 2.9 / 0.075 / 5.5 / 1.2x. Draws,
  triangles and allocations keep the table's limits.
- `perf.mjs --budget` (no flag) is the test-path regression check (`?gfx=min`: no post stack, no voxel characters,
  20 cm voxels): sim p95 <= 2.5 ms, animation <= 0.04 ms per character, <= 55 draws, <= 0.2 M triangles, allocations
  <= 11.5 MB/s. Measured (3.1.0): sim p95 1.5 ms, 0.043 ms, 43 draws, 0.14 M triangles, 11.0 MB/s.
- Draw calls (3.0 fix): voxel chunks merge into super-chunks (`VoxelWorldOptions.group`: structure 2^3, props 4^3);
  each lamp's shadow map lists only the casters within its reach (`LightRig.fillCasters`, refilled per pick, the
  list replaced only when it changes); the moon's cascades list moving casters and the static meshes the moon can
  reach (`World.sunCasters`: open sky above, or the roof itself); the character skin material is frozen.
- Static level geometry uses thin instances, `freezeWorldMatrix()`, frozen materials.
- Dynamic physics bodies capped (see `physics/budget`). Projectiles/effects pooled, never allocated per shot.
- Render scale: native DPR x `renderScale` (0.5-2), dynamic resolution (optional) within it; with TAAU the canvas stays native and the scene renders at the scale.
