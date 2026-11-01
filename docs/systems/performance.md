# Performance budget
Owner: Test Runner. Status: current.
Purpose: the desktop frame-rate goals, CPU / draw / memory budgets and the perf script budgets.
Design authority: docs/DECISIONS.md (G12 desktop only, G14 goals set to the target laptop), then docs/design-bible.md.

Desktop only (G12): there are no phone budgets, no phone look and no `perf.mjs --phone` run. The target machine is
the gaming laptop (i9 HX, RTX 4090 Laptop 16 GB, 32 GB; built-in 2560 x 1600 240 Hz). G14: the goals are the
laptop's numbers today. Numbers measured on the laptop are the goals; numbers not measured there are marked "pending a
PC run" and stay as the goal until that run replaces them. Every number is a starting value (G10).

## Goals on the target laptop
- Frame rate (mains power, Epic, Warehouse, 10 guards; 1% low >= 70% of the average): 1920 x 1200 165 Hz (RT
  reflections 120), 2560 x 1600 120 Hz (RT 90), 3440 x 1440 100, 5120 x 1440 90, 4K 60 (RT 50), 7680 x 2160 60 with
  TAAU at 67% (High 120). Pending a PC run (Settings > Graphics > Benchmark gives each line).
- 32 guards alive (the campaign and Sector Ops ceiling, G359): 60 fps on a normal 60 Hz display (G369), the line set
  once the off-screen animation fix (G327, G382) is measured; the memory goals below hold at every guard count.
- GPU per frame = the target's frame time minus about 10% headroom: 165 Hz 5.5 ms, 120 Hz 7.5 ms, 100 Hz 9 ms, 90 Hz
  10 ms, 60 Hz 15 ms. Only the laptop can measure it (the benchmark).
- CPU main thread (the sim's fixed steps, animation and camera, plus the render's JS: LOD, culling, skeletons and
  bones): Epic p95 <= 5.5 ms, sim p95 <= 2.9 ms, animation <= 0.075 ms per character, rendered frame interval p95 <=
  1.2 x the display interval. `?gfx=min`: main <= 3.6 ms, sim <= 1.1 ms, animation <= 0.03 ms, pacing <= 1.15 x.
  Measured on the laptop (build 3.5.0, Warehouse, 10 guards: Epic sim p95 2.2-2.3 ms, animation 0.055-0.067 ms, main
  4.1-4.4 ms; `gfx=min` sim 0.8 ms, main 2.6 ms) plus 25-40% headroom: `LOCAL_BUDGET` in `scripts/perf.mjs`.
- Draws and triangles over every pass (shadow maps and post included): <= 600 draws and <= 8 M triangles per frame.
  Pending a PC run (the laptop measured about 205 draws and 0.6 M triangles at Epic in 3.5.0).
- Allocations <= 11.5 MB per second (per second, so a 240 Hz display does not double the garbage).
- Memory: VRAM <= 12 GB at Epic (High 6, Ultra 9; brick pool <= 5 GB; render targets <= 2.5 GB at 4K, 3.5 GB at
  7680 x 2160), tab <= 6 GB, JS heap <= 1.5 GB; Warehouse load <= 4 s cold, <= 1.5 s cached.
  Pending a PC run. Load-time aim (G405): a first-ever load takes seconds (shaders compile per GPU), repeat loads are
  near-instant; the numbers per map are still to be set (G394).
- Open: no download or texture budget covers the realistic operators (Wren's files are about 80 MB; feature/operators
  owns it, G75).
- Guard figures (guard-models, `docs/guard-models/PLAN.md` section 5; budget). G8's first runs held (+1.1 to +2.5 ms
  frame CPU p95 at 24 guards, gate +0.5 ms; docs/guard-models/STATE.md "G8 budget run", docs/guard-models/run-g8/);
  after gm-perf the gate passed ("Guard models" below) and gm-flip made the figures the default (`?guardmodels=0` off). `tests/guardKit.test.ts` enforces the
  kit data, `tests/guardAssets.test.ts` the bundled files in `src/operators/assets/guards/`. Per guard,
  LOD0 (< 8 m) / LOD1 (8-25 m) / LOD2 (> 25 m):
  - triangles shown (body, head, shown pieces) <= 20,000 / 7,000 / 2,800; in the buffer (every head, cap and piece)
    <= 45,000 / 14,000 / 5,000;
  - head + neck 4,000 / 1,200 / 400 (eyes 2 x 250 at LOD0, inside the head below), hair cap <= 1,000 / 300 / in the
    albedo; headwear <= 600, helmet <= 1,200, vest <= 1,800, plate <= 2,600, shield <= 800 (LOD0);
  - 1 draw per pass (+1 shield, + gun); bones 33 / 23 / 23 (no face bones); influences 4 / 4 / 2;
  - textures (BC7, mips) per base: albedo + normal / ORM 4096 x 2048 / 2048 x 1024 (25.2 MB) at LOD0, 2048 x 1024 /
    1024 x 512 (6.3 MB) at LOD1, 512 / 256 (0.8 MB) at LOD2; a face tile per head 1024 / 512 / 128; ~32 MB a base, ~99
    MB with all three bases and the shield in a scene (~112 MB with meshes and the per-guard buffers);
  - per-guard buffers: `gvis` 4 B a vertex (~150 KB) plus the visible-piece index buffer (up to ~180 KB), a 33 x 64 B bone
    upload per posed frame; static buffers shared per (base, LOD);
  - download (KTX2 UASTC + Zstd) <= 75 MB for every guard file, cached by the service worker (`guards` cache); level
    load awaits every game LOD, LOD2 first (`?gfx=min`: LOD2 only; F59), within the loading screen's cap.
  Section 6 of the plan fits this to the 24-guard baselines: draws neutral, GPU +0.3 to +0.8 ms typical and +1.5 to +2.5
  ms worst (all 24 inside 8 m), frame CPU within +0.5 ms of `?guardmodels=0`. `scripts/guard-cap.mjs` measures it (G8).
  The enforcer's figure shield shares its materials and buffers per scene (a LOD switch allocates nothing); per scene one
  disabled warm mesh per guard base and LOD and one merged S1 body (F59) stay loaded, never drawn (`ai/guardWarm.ts`).

## Perf script checks (`scripts/perf.mjs`)
Warehouse, 10 guards (`STEALTH=1`: unaware and perceiving). Options: `docs/systems/testing-tools.md`, "Helper scripts".
- `perf.mjs --budget` (no flag): the test-path regression check (`?gfx=min`: no post stack, the blockout's boxes): sim p95 <= 2.5 ms, animation <= 0.04 ms per character, <= 55 draws, <= 0.2 M triangles, allocations
  <= 11.5 MB/s. Measured 3.1.0 in the old phone viewport (sim p95 1.5 ms, 43 draws, 0.14 M triangles); it now runs in
  the 1280 x 640 desktop context, so draws and triangles may read slightly differently: pending a PC run.
- `perf.mjs --desktop --budget` (`?gfx=epic`, 640 x 360): sim p95 <= 2 ms, animation <= 0.04 ms per character, <= 520
  draws and <= 1.7 M triangles (a regression check: measured 3.1.0 on a VM, 444 draws, 1.34 M triangles, plus
  15-25%), allocations <= 11.5 MB/s.
- `perf.mjs --preset=<low|medium|high|ultra|epic> --budget`: that preset with the governor off; draws Low 120 /
  Medium 170 / High 230 / Ultra 250, triangles 0.8 / 1.2 / 1.6 / 2 M, sim p95 <= 2 ms.
- Cloud (software GL) budgets scale by machine speed (a fixed pure-JS workload against `REF_MS`; a reading far off the
  usual ~4.2 ms means the VM was busy: run again). The render's JS is printed there, not enforced.
- `E2E_GPU=1` (Michael's PC only) swaps in the laptop goals above (`LOCAL_BUDGET`: no machine-speed scaling; main
  thread and frame pacing enforced; draws, triangles and allocations keep the script's limits). Cloud sessions never
  claim a perf result: they mark it "pending PC run".

## Guard models (2026-10-24)
Realistic guard models are on by default (`?guardmodels=0` is off). Gate: frame CPU p95 with the models on within
+0.5 ms of off at 24 guards. Measured on the laptop RTX 4090, 1080p epic, `E2E_GPU=1`, `scripts/guard-cap.mjs`
(branch `shots/gm-perf-408ab154`, after frozen guard materials and the lazy visible-only pose): PASS.

| Map, cell (24 guards) | Frame p95 ON (ms) | Frame p95 OFF (ms) |
| --- | --- | --- |
| sectorops patrol | 6.5 | 6.5 |
| sectorops away | 4.6 | 4.7 |
| sectorops alert | 7.2 | 7.4 |
| campusops patrol | 9.0 | 9.7 |
| campusops away | 4.5 | 4.8 |
| campusops alert | 9.2 | 10.0 |

At 12 guards campusops ON is +0.4 to +0.6 ms. The merged armour, shield and visor meshes (S13) came after this run and
have no GPU number yet (they only act on the flag-off and fallback path). Detail: docs/guard-models/reports/PERF-REPORT.md,
`GM-PERF-CHECK.md`.

## What keeps the frame inside the budget
- Static level geometry: thin instances, `freezeWorldMatrix()`, frozen materials. (marlow-final S9) The facility kit and
  props bake their static opaque pieces into one mesh per material and draw ahead of the level boxes they cover
  (`world/kit/staticMerge.ts` `skinsFirst`: no second lit shade of the box under a skin). The character skin
  material is frozen.
- Shadows: each lamp's shadow map lists only the casters within its reach (`LightRig.fillCasters`, refilled per pick,
  casters under 0.3 m skipped); the moon's cascades list moving casters and the static meshes it can reach
  (`World.sunCasters`, `World.updateSunCasters` at 4 Hz). Low uses static sun casters and blob shadows.
- Post: `PostStack.depthSource` shares one depth (the G-buffer's view z when SSAO / SSR need it, else the scene pass's
  hardware depth); DOF's depth renderer runs only while aiming unless RT reflections share it. With TAAU the volumetric
  pass and the G-buffer run at the TAAU ratio and TAAU jitters before every pass; volumetric steps 16 at Epic effects,
  else 8. FXAA is off behind TAAU.
- Loading (G394): a map is fully built before play starts (today it still builds in the first seconds of play, a fix
  job), and the graphics warm-up finishes on the loading screen up to a written cap, with a job to shorten it. Shaders
  compile on the loading screen (`GameState.create` awaits `scene.whenReadyAsync`, <= `WARMUP_MAX_MS`);
  `dropCpuCopy` frees CPU copies of the lamp atlas and its pools; `World.refreshMaterials` re-reads lights when the
  shadow spec changes or the post stack rebuilds.
- Near-instant loads (G405; decided, not built yet; the map-ready job, Sector Ops): (1) the graphics settings are
  applied before the shader warm-up, and characters, guards and weapons are warmed up behind the loading screen; (2)
  the campus lamp bakes ship pre-built instead of baking on the player's PC; (3) the map starts loading in the lobby
  once it is picked; (4) characters, guards, weapons and compiled shaders are kept between maps and only the level is
  swapped.
- Dynamic physics bodies are capped (`physics/budget`); projectiles and effects are pooled, never allocated per shot.
- Render scale: native DPR x `renderScale` (0.5-2), with the frame governor (graphics-quality.md) inside it; with TAAU
  the canvas stays native and the scene renders at the scale.
- Awake guards: `MAX_ALIVE` 12 for Marlow Yard (its sets post only what each exercise needs, G376); Sector Ops and the campaign cap at 32 alive, a ceiling (G187, G289,
  G359).
- Guard anim tiers (`src/ai/animTier.ts`, `animTierView.ts`; G327, A195): pinned or within 4 m of a player, every
  frame; else, not drawn by any local camera and no shadow of his can be in a view (the render freeze's
  `guardFrustum`: the moon capsule, lamp, torch and character-atlas shadow volumes, frustum only), every
  `ANIM_TIER_OFFSCREEN` th (8) frame; past 22 m, every 2nd; else every frame. `?animtier=0` off, `?animshadow=0` camera
  only, `?animoff=N` the off-screen period (N >= 2; A/B). Measured at 32 guards (laptop GPU, epic,
  docs/guard-ai/slices/T1-SHADOW-REPORT.md): the shadow rule costs 0.07-0.18 ms of anim a frame; the tier saves up to
  ~0.6 ms, little in Sector Ops where the render freeze already stops off-camera guards.
