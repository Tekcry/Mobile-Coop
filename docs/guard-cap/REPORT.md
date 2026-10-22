# Guard cap: report

Roadmap item "Guard cap" (`docs/ROADMAP.md:133`, Michael 2026-10-22 ~14:50: "After Marlow + Sector Ops"). Options given:
dormant guards (all placed, at most `MAX_ALIVE` 12 awake), a desktop perf run at 12 / 16 / 24 awake (sim vs render),
AI / perception LOD and shared raycasts if sim-bound, the WebGPU trial, guard LOD and fewer flashlight shadows if
render-bound, guard snapshot trimming for co-op past ~16. This report is the perf run. Numbers: EMPTY until the laptop
GPU run (`docs/guard-cap/STATE.md` has the command).

## Method
- Tool: `scripts/guard-cap.mjs` (header comment = full usage). Headless Chromium, `E2E_GPU=1` (ANGLE D3D11), port 4189,
  `?gfx=epic` (governor off), 1920 x 1080, frame rate uncapped (`E2E_UNCAP=1`), `dist/` served via `vite preview` (as `scripts/run-e2e.mjs`).
- Maps: Sector Ops (`warehouseOps`, `mode=sector&sectorGuards=0`, section 1 start) and Marlow Yard (`ctcourse`,
  `mode=course`). Each map's own guards are removed (`EnemyManager.despawn`), the live cap `em.maxAlive` is set to N
  and N `grunt` guards are spawned with `em.spawn` in distinct walkable nav cells in a 120 degree wedge 5-24 m in front
  of the camera (nav line of sight preferred; fallback: any walkable cell round the player), so a map with few guard
  slots still gets N. Stealth rules on (`em.stealth = true`) on both maps; player damage off.
- Cells per map x N: patrol/facing (2-point beats, `passive`: full perception work, the meter never fills),
  patrol/away (camera turned 180 degrees: render only), alert/facing (all alerted: chase, cover, shooting).
- Sim: `loop.stepHeadless(1/60)` x secs x 60, clean (true step cost), then with page-side wrappers (prototype
  monkey-patches, `performance.now()` accumulators): fixed update, physics, frame update, `EnemyManager.update`,
  `Enemy.update` / `perceive` / `decide` / `move`, flashlights, guard animation, nav `findPath` / `lineClear` /
  `flowField`, every physics ray (charged to perception / torch / other AI / other), light-field reads.
- Render (after a 5 s minimum warm-up; the alert cell re-alerts before every sample): real rAF frames, split into frames with and without a 60 Hz step (uncapped, most run none), plus CPU ms per 1/60 s of sim (all frame CPU over the steps run: the AI-inclusive per-frame cost); interval, frame CPU, the loop's own sim / physics ms, `scene.render()` CPU, GPU ms
  (`EXT_disjoint_timer_query_webgl2` around `scene.render`; n/a when the driver hides it); then 2 s counted: draws and
  triangles over every pass, shadow-map passes per frame, active meshes, active-mesh evaluation ms; the light rig's
  shadow pool size and lit casters, flashlights on.
- Caveats: headless GPU timing is the hidden-window path, not a fullscreen swap chain (relative numbers count, absolute
  fps less so). Chrome coarsens `performance.now()` (resolution recorded in the JSON): small buckets are sums of many
  coarse samples; read means, not single steps. Wrappers add overhead: compare the clean and instrumented step.
  Flashlight shadows are capped by `LightRig.configure` (`src/world/lightRig.ts:312-345`; `shadowSpec(q).casters`
  medium 2 / high 3 / ultra-epic 4, `src/core/quality.ts:107-128`; 2 with baked lamps) and `FLASHLIGHTS = 4` slots on
  dark maps (`src/world/torches.ts:15`): their count does not grow with N. Perception rays go through `Ballistics.ray`
  (allocates a hit object, `src/weapons/ballistics.ts:87`), one think per 0.22-0.30 s per guard (`src/ai/enemy.ts:823`).

## Results (the script fills the block below at the end of a run; full numbers in `RESULTS.md`, `guard-cap.json`, `guard-cap.csv`)

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-22T16:00:13.141Z (version 4.64.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 3.9 | 0.004 | 0 | 103.813 | 0 | 0.068 | 2.2 / 13.5 | 454.5 | 2.1 / 12.7 | 11.4 / 14.1 | 15.59 | 3.499 / 8.121 | 104 | 1 | 123 |  |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 8.6 / 11.9 | 116.3 | 8 / 11.2 | 10.2 / 11.6 | 15.582 | 4.46 / 7.073 | 75 | 1 | 20 |  |
| sectorops | 0 | alert/facing | 3.4 / 3.9 | 0.01 | 0 | 103.813 | 0 | 0.161 | 11.1 / 13.3 | 90.1 | 10.5 / 12.6 | 11.2 / 12.8 | 15.72 | 6.38 / 8.513 | 104 | 1 | 123 |  |
| sectorops | 12 | patrol/facing | 7.2 / 9.6 | 0.296 | 0.056 | 109.053 | 0 | 0.349 | 36.4 / 45.2 | 27.5 | 35.6 / 44.3 | 35.6 / 44.3 | 16.318 | 22.395 / 27.061 | 142 | 1 | 736 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 24.8 / 30.3 | 40.3 | 24.1 / 29.4 | 24.1 / 29.4 | 16.174 | 13.447 / 16.672 | 95 | 1 | 20 |  |
| sectorops | 12 | alert/facing | 8.1 / 12.1 | 1.075 | 0.061 | 109.987 | 0.023 | 0.378 | 41.4 / 54.5 | 24.2 | 39.2 / 52 | 39.2 / 52 | 15.808 | 25.549 / 30.986 | 162 | 3 | 876 |  |
| sectorops | 16 | patrol/facing | 8.4 / 11.2 | 0.344 | 0.081 | 109.788 | 0 | 0.401 | 42.6 / 53.3 | 23.5 | 41.9 / 52.4 | 41.9 / 52.4 | 16.382 | 24.294 / 29.39 | 142 | 1 | 884 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 29.7 / 35.4 | 33.7 | 28.9 / 34.4 | 28.9 / 34.4 | 16.224 | 15.766 / 19.336 | 95 | 1 | 20 |  |
| sectorops | 16 | alert/facing | 9.1 / 12.6 | 1.266 | 0.088 | 110.859 | 0.015 | 0.464 | 49.1 / 64.2 | 20.4 | 46.8 / 62.2 | 46.8 / 62.2 | 16.149 | 28.566 / 34.551 | 166 | 3 | 1115 |  |
| sectorops | 24 | patrol/facing | 10.1 / 13.4 | 0.472 | 0.122 | 111.243 | 0 | 0.492 | 58 / 69 | 17.2 | 57.1 / 67.2 | 57.1 / 67.2 | 16.991 | 32.124 / 41.194 | 142 | 1 | 1429 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 37.1 / 45.1 | 27 | 36.3 / 44.3 | 36.3 / 44.3 | 16.326 | 18.331 / 22.084 | 95 | 1 | 20 |  |
| sectorops | 24 | alert/facing | 10.6 / 13.8 | 1.435 | 0.101 | 113.238 | 0.027 | 0.617 | 61.7 / 78.3 | 16.2 | 59.7 / 76.1 | 59.7 / 76.1 | 17.159 | 32.066 / 42.016 | 167 | 3 | 1614 |  |
| ctcourse | 0 | patrol/facing | 3.2 / 4.6 | 0.009 | 0 | 100.813 | 0 | 0.176 | 11.3 / 14.8 | 88.5 | 10.7 / 14.1 | 11.4 / 14.5 | 15.732 | 6.591 / 9.522 | 115 | 0 | 92 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 7.7 / 10.3 | 129.9 | 7.1 / 9.7 | 8.7 / 10.1 | 15.506 | 3.494 / 5.925 | 52 | 0 | 14 |  |
| ctcourse | 0 | alert/facing | 3 / 3.7 | 0.011 | 0 | 100.813 | 0 | 0.165 | 9.9 / 12.3 | 101 | 9.3 / 11.6 | 10.2 / 12 | 15.683 | 5.888 / 8.21 | 115 | 0 | 92 |  |
| ctcourse | 12 | patrol/facing | 6.1 / 9.1 | 0.299 | 0.043 | 104.908 | 0 | 0.344 | 29.6 / 36.4 | 33.8 | 28.8 / 35.8 | 28.8 / 35.8 | 16.219 | 17.894 / 21.008 | 133 | 0 | 772 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 17.6 / 21 | 56.8 | 16.9 / 20.3 | 17 / 20.3 | 15.994 | 6.118 / 8.648 | 52 | 0 | 14 |  |
| ctcourse | 12 | alert/facing | 6.1 / 9.6 | 0.715 | 0.037 | 103.044 | 0.002 | 0.346 | 29.1 / 37.1 | 34.4 | 28.2 / 35.8 | 28.2 / 36.4 | 16.089 | 16.311 / 19.828 | 147 | 1 | 943 |  |
| ctcourse | 16 | patrol/facing | 7 / 9.9 | 0.373 | 0.055 | 105.653 | 0 | 0.384 | 36 / 43.2 | 27.8 | 35.1 / 42.3 | 35.1 / 42.3 | 16.308 | 21.78 / 25.427 | 133 | 0 | 1041 |  |
| ctcourse | 16 | patrol/away | - | - | - | - | - | - | 20.4 / 24.5 | 49 | 19.7 / 23.8 | 19.8 / 23.8 | 16.039 | 7.129 / 9.61 | 52 | 0 | 14 |  |
| ctcourse | 16 | alert/facing | 6.8 / 10.6 | 0.8 | 0.052 | 103.659 | 0.003 | 0.385 | 37.7 / 47.7 | 26.5 | 36.4 / 46.6 | 36.4 / 46.6 | 16.151 | 21.761 / 29.275 | 155 | 1 | 1045 |  |
| ctcourse | 24 | patrol/facing | 8.7 / 12.4 | 0.505 | 0.095 | 107.172 | 0 | 0.478 | 48.8 / 61 | 20.5 | 47.9 / 59.5 | 47.9 / 59.5 | 16.595 | 27.204 / 33.741 | 133 | 0 | 1588 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 27.3 / 32.3 | 36.6 | 26.6 / 31.4 | 26.6 / 31.4 | 16.193 | 9.39 / 11.9 | 52 | 0 | 14 |  |
| ctcourse | 24 | alert/facing | 8.7 / 13.3 | 0.875 | 0.071 | 104.976 | 0.005 | 0.484 | 50.9 / 64.2 | 19.6 | 49.9 / 62.7 | 49.9 / 62.7 | 16.514 | 28.353 / 36.506 | 147 | 1 | 1426 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.400 ms, of it AI 0.019 (perceive 0.005), frame CPU (sim frames) 1.904, CPU per 1/60 s sim 0.058, GPU 1.193, draws 1.583.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.300 ms, of it AI 0.059 (perceive 0.004), frame CPU (sim frames) 2.021, CPU per 1/60 s sim 0.060, GPU 1.070, draws 2.625.

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.229 ms, of it AI 0.021 (perceive 0.004), frame CPU (sim frames) 1.521, CPU per 1/60 s sim 0.036, GPU 0.859, draws 0.750.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.237 ms, of it AI 0.036 (perceive 0.003), frame CPU (sim frames) 1.654, CPU per 1/60 s sim 0.035, GPU 0.936, draws 1.333.

<!-- guard-cap:results:end -->

## Which option fits (decision rule)
Budgets (`docs/systems/performance.md`): main thread Epic p95 <= 5.5 ms, sim p95 <= 2.9 ms, GPU 7.5 ms at 120 Hz
(5.5 at 165 Hz), <= 600 draws / 8 M triangles. Judge on alert/facing p95 (the worst case).
1. Sim-bound -> AI / perception LOD + shared raycasts: sim p95 passes 2.9 ms at or before 24, the AI manager is most of
   the step's growth, and perceive + rays grow about linearly with N.
2. Render-bound -> guard LOD + fewer flashlight shadows (the WebGPU trial if draw submission dominates): frame CPU minus
   sim, or GPU ms, breaks its budget before sim does; draws, active meshes, render() CPU grow with N (facing vs away
   shows the visible guards' share). Flat shadow passes (capped pool) mean shadows are not the per-guard cost: guard LOD
   and skinning are.
3. Both cheap per guard but the total breaks past some N -> dormant guards: small linear slopes, budget crossed only at
   large N: place all, keep awake at most the N that fits (MAX_ALIVE from the numbers).
4. Nothing breaks at 24 -> raise `MAX_ALIVE` to 24 (the co-op snapshot trimming item stays for > 16).
