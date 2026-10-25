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

## Reading of the first run (2026-10-23, 4.64.0, laptop RTX 4090, alone, Epic 1920x1080, uncapped)
- Option 2, render-bound, with a sim share: every guard costs about 2.0-2.3 ms of frame CPU in Sector Ops (1.65 in
  Marlow Yard) and about 1.1 ms of GPU, but only about 0.02-0.06 ms of AI (perceive 0.005). The growth is `render()` CPU
  (1.5 ms at 0 guards, 40 ms at 24 facing), active meshes (123 -> 1429) and the sim's `anim` bucket (0 -> 4.2 ms at 24,
  about 0.17 ms a guard). Flashlight shadows are flat (capped pool), so they are not the per-guard cost.
- Budgets are broken already at 12 awake guards facing: frame CPU 35.6 ms (Epic main p95 budget 5.5), sim p95 9.6 ms
  (2.9), 27.5 fps (Sector Ops); at 24: 57-60 ms, 16-17 fps. Facing away halves it (the visible guards' share).
- So AI / perception LOD would not help; guard render LOD (cheaper far skeletons / skinning, culling off-screen
  guards' bones) and the animation cost per guard are the levers. Until then, more than ~4-6 awake guards on screen at
  Epic does not fit 60 Hz on this machine.

## 2026-10 re-measure (M0)
Opus read, 2026-10-24, vs PLAN section 2. Data: `origin/feature/guard-cap-results` 6b9efc8f, `docs/guard-cap/run-m0/m0-6e8a450b-r{1,2}-{so,campus,ctcourse}/guard-cap.json` (master 6e8a450b, 4.93.0, laptop RTX 4090, Epic 1920x1080, uncapped, warm 5 s, 10 s). Sector Ops 0 / 24 are not in M0: they come from the #323 baseline `run-gr2/rep-r{1,3,5}-base/guard-cap.json` (master 6b44efb8, median of 3). Values: median of r1 / r2 (A7); "r1 / r2 -> med" where it matters. ms. Sim = `stepHeadless` clean p95 (the away cell shares patrol's sim, not timed). Shares = bucket mean / growth of the instrumented step mean vs N 0, same cell. Guard AI Build's reading (cloud-queue `briefs/guard-ai-T1.md` "Answer") checked against the JSON: all four rows match.

### Sector Ops (`run-m0/...-r{1,2}-so`; N 0 / 24 `run-gr2/rep-r{1,3,5}-base`)
| N | cell | sim p95 | frame CPU p95 | GPU p95 | ai.anim (share) | ai.manager (share) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol | 0.7 | 16.7 (0-guard noise: 18 / 16.7 / 3.5) | 3.79 | 0 | 0.00 |
| 0 | alert | 0.8 | 16.4 (18.5 / 16.4 / 3.8) | 3.88 | 0 | 0.00 |
| 12 | patrol | 1.7 / 5.1 -> 3.4 | 5.0 / 7.7 -> 6.4 | 5.85 | 0.39 (54%) | 0.09 (12%) |
| 12 | away | - | 3.8 / 11.0 -> 7.4 | 5.63 | - | - |
| 12 | alert | 1.6 / 6.1 -> 3.85 | 5.7 / 13.1 -> 9.4 | 8.15 | 0.57 (48%) | 0.21 (17%) |
| 16 | patrol | 1.5 / 5.1 -> 3.3 | 5.4 / 9.7 -> 7.6 | 6.45 | 0.49 (56%) | 0.11 (12%) |
| 16 | away | - | 4.0 / 6.5 -> 5.3 | 4.51 | - | - |
| 16 | alert | 1.9 / 4.2 -> 3.05 | 6.1 / 11.3 -> 8.7 | 7.53 | 0.68 (51%) | 0.23 (17%) |
| 24 | patrol | 1.9 (gr2) | 6.3 | 5.91 | 0.48 (77%) | 0.11 (16%) |
| 24 | alert | 2.6 (gr2: 2.7 / 2.5 / 2.6) | 6.9 | 6.49 | 0.67 (62%) | 0.24 (22%) |
| 32 | patrol | 2.2 / 6.6 -> 4.4 | 7.0 / 11.8 -> 9.4 | 6.92 | 0.81 (66%) | 0.18 (14%) |
| 32 | away | - | 4.6 / 7.3 -> 6.0 | 4.58 | - | - |
| 32 | alert | 3.1 / 5.7 -> 4.4 | 7.8 / 13.3 -> 10.55 | 7.84 | 1.09 (59%) | 0.33 (18%) |
r2 Sector Ops reads high in every cell (12 alert sim 6.1 vs r1 1.6 and gr2 24 alert 2.6): its medians are pessimistic; r1 alone still has 32 alert at 3.1.

### Campus (`run-m0/...-r{1,2}-campus`)
| N | cell | sim p95 | frame CPU p95 | GPU p95 | ai.anim (share) | ai.manager (share) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol / away / alert | 1.3 / - / 0.8 | 5.75 / 4.25 / 5.7 | 5.29 / 3.31 / 4.98 | 0 | 0.01 |
| 12 | patrol | 1.9 / 4.2 -> 3.05 | 7.95 | 6.17 | 0.39 (59%) | 0.10 (14%) |
| 12 | away / alert | - / 1.65 | 5.25 / 7.35 | 4.15 / 6.73 | alert 0.23 (44%) | alert 0.16 (29%) |
| 16 | patrol | 2.3 / 4.1 -> 3.2 | 8.4 | 6.19 | 0.51 (72%) | 0.09 (13%) |
| 16 | away / alert | - / 2.1 | 4.5 / 8.6 | 4.02 / 7.05 | alert 0.50 (57%) | alert 0.19 (22%) |
| 24 | patrol | 2.5 / 5.5 -> 4.0 | 9.2 | 5.91 | 0.62 (72%) | 0.13 (14%) |
| 24 | away | - | 5.15 | 4.12 | - | - |
| 24 | alert | 2.3 / 3.0 -> 2.65 | 8.1 / 11.2 -> 9.65 | 7.17 | 0.58 (59%) | 0.23 (24%) |
| 32 | patrol | 2.1 / 3.7 -> 2.9 | 10.1 | 6.70 | 0.83 (68%) | 0.18 (15%) |
| 32 | away | - | 4.75 | 4.13 | - | - |
| 32 | alert | 4.0 / 2.8 -> 3.4 | 17.5 / 12.1 -> 14.8 | 9.73 | 0.86 (55%) | 0.32 (20%) |
Campus 32 alert: render() CPU p95 10.95, draws 484.5, 30 of 32 guards in sight, mean 14.8 m.

### ctcourse, Marlow Yard (`run-m0/...-r{1,2}-ctcourse`)
| N | cell | sim p95 | frame CPU p95 | GPU p95 | ai.anim (share) | ai.manager (share) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol / away / alert | 2.2 / - / 0.95 | 8.55 / 11.8 (6.5 / 17.1) / 7.65 | 7.95 / 5.26 / 6.20 | 0 | 0.01 |
| 12 | patrol | 4.2 / 5.1 -> 4.65 | 10.45 | 9.02 | 0.52 (49%*) | 0.12 (11%*) |
| 12 | away | - | 8.0 | 5.73 | - | - |
| 12 | alert | 3.1 / 2.1 -> 2.6 | 13.2 / 8.4 -> 10.8 | 9.08 | 0.56 (53%) | 0.18 (16%) |
| 24 | patrol | 13.0 / 6.7 -> 9.85 | 21.3 / 9.6 -> 15.45 | 11.43 | 1.55 (53%*) | 0.28 (10%*) |
| 24 | away | - | 7.6 | 6.84 | - | - |
| 24 | alert | 4.6 / 3.6 -> 4.1 | 10.9 / 11.1 -> 11.0 | 9.41 | 1.02 (58%) | 0.27 (15%) |
\* on the alert N 0 base: the patrol N 0 cell (first after load) reads 1.20 instrumented mean vs 0.51. r1 24 patrol is a hitch run (sim p95 13.0).
Method note for M2 / the next rerun: on campus and ctcourse the patrol cells read worse than alert on sim (campus 24 4.0 vs 2.65) and their clean mean exceeds the instrumented mean (campus 24 patrol 2.39 vs 1.40): a likely start transient in the clean window. The verdict below keeps PLAN's alert/facing rule; patrol does not change it.

### Verdict (PLAN section 2; worst cell alert/facing, median r1 / r2, at 24 and 32)
- "32 holds": NO. Sim p95 > 2.9 at 32 on campus (3.4) and Sector Ops (4.4), and on ctcourse (Marlow Yard) at 24 (4.1). At 24, campus (2.65 / 9.65 / 7.17) and Sector Ops (gr2 2.6 / 6.9 / 6.49) pass on the host.
- T1: YES (triggered). `ai.anim` is 55-59% of the sim growth in every failing cell (campus 32 55%, Sector Ops 32 59%, ctcourse 24 58%; campus 32 on the clean mean 49%, borderline). Built: `feature/guard-ai-t1-anim-tier` bbbfbecf (Guard AI, unit tests only, not on master). Limit: T1 acts on off-screen guards only; campus 32 alert has 30 of 32 in sight, so its visible pose share goes to Player (PLAN2 S11) per the T1 row.
- D1 / D2: CLOSED. `ai.manager` is 15-24% of the growth (rule: >= 40%) in every 24 / 32 alert cell.
- Render (Test Runner, PLAN2 addition): campus 32 alert/facing frame CPU p95 14.8 (r1 17.5, r2 12.1: both over 12), render() CPU p95 10.95, draws 484.5, GPU 9.73. Sim is over too, so the cell is mixed; render() alone sits near 12. GPU p95 <= 15 everywhere (max 11.43, ctcourse 24 patrol); draws <= 600 everywhere. ctcourse 24 patrol 15.45 is one hitch run: repeat it, do not send it.
- Caps: `SECTOR.maxAlive` stays 32 (`sectors.ts:508`): it equals `MAX_ENEMIES` 32 (`protocol.ts:25`), so it cannot rise without a wire change, and 32 fails today. No K1 yet: K1 waits for T1 + guard-render-2 + gm-perf on master and a 32 (+ new 28) rerun still over. `MAX_ALIVE` stays 12 (`enemyManager.ts:81`, Marlow Yard = ctcourse): at 12, alert frame CPU 10.8 leaves 1.2 ms and patrol sim p95 reads 4.2 / 5.1 (both over; see the method note); 24 alert sim 4.1 fails; no ctcourse 16 cell exists. A rise to 16 needs a ctcourse 16 cell after T1.
- Pending: campus `perf.mjs` (real sections, step 4; retry set guard-cap-m0-perf): no output on the results branch at 6b9efc8f.
- M1 must still confirm for clients: client frame CPU p95 <= 12 and client minus host <= 1.0 ms at 24 and 32 (else C1, then C2); host snap <= 6 KB steady at 4 players and upload <= 1.7 Mbit/s (else N1). Until M1, 24 holds on the host only.

## 2026-10 co-op measure (M1) and run 4100
Opus read, 2026-10-25, vs PLAN section 2. Data (copied here from `origin/feature/guard-cap-results` 2540ea38):
`run-m1/` (`scripts/guard-cap-coop.mjs` on a55a12b3 = master 6e8a450b + script, laptop 4189 alone, 2026-10-24 13:42-13:57,
882 s, Epic, 1280x720 per page, host and client in one headless browser on one GPU) and `run-4100/` (`scripts/guard-cap.mjs`
on train 74 head 3be7d1a2, 4.100.0, laptop 4189 alone, 1920x1080, 35 cells, campus 32 alert x3). ms; frame CPU p95 is
the rule's number. M1 compares host and client inside M1 only (its resolution and shared GPU differ from guard-cap's solo cells).

### Data quality
- M1 is one clean repeat (A7 wants two). `run-m1/step1.txt` also holds three aborted starts (11:30, 11:51, 12:31) under
  load: their 0-guard host alert p95 read 9.4-11.7 vs 5.4 in the final run, so they are excluded.
- M1's 4-player cells all failed ("host sees client"): on master Sector Ops' room capacity is `COURSE_MAX` 2
  (`protocol.ts:41`, `capacity()`); coop4 #317 (OPEN) adds `SECTOR_MAX`. No 4-player or 3-client wire figures exist yet.
- M1 patrol cells spike p95 on BOTH pages at every N >= 12 (host 16-26, client 16-25; medians 6-10): the first cell after
  spawn on a fresh browser, as M0's method note. Not judged; run 4100's patrol cells are clean (campus 32 8.6).
- Run 4100 is one repeat except campus 32 alert (x3). Guard models flag off in both runs.

### Co-op host vs client (M1, 2 players; frame CPU med / p95, render() CPU med, draws med)
| Map | N | cell | host frame CPU | client frame CPU | client - host p95 | render() host / client | draws host / client |
| --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 0 | away | 3.2 / 4.0 | 2.9 / 3.6 | -0.4 | 2.6 / 2.3 | 114 / 112 |
| campus | 12 | away | 4.4 / 5.4 | 4.9 / 5.8 | +0.4 | 3.5 / 3.7 | 133 / 168 |
| campus | 24 | away | 4.5 / 5.7 | 6.5 / 7.6 | **+1.9** | 3.5 / 4.6 | 133 / 200 |
| campus | 32 | away | 4.7 / 6.2 | 7.5 / 8.8 | **+2.6** | 3.8 / 5.3 | 133 / 221 |
| campus | 24 | alert | 9.1 / 10.9 | 9.1 / 10.7 | -0.2 | 6.6 / 6.5 | 444 / 485 |
| campus | 32 | alert | 10.2 / **12.2** | 10.5 / **12.5** | +0.3 | 7.4 / 7.5 | 474 / 536 |
| sectorops | 0 | away | 3.1 / 4.1 | 3.1 / 4.1 | 0 | 2.4 / 2.4 | 111 / 106 |
| sectorops | 12 | away | 4.5 / 5.7 | 5.4 / 6.4 | +0.7 | 3.5 / 4.0 | 164 / 178 |
| sectorops | 24 | away | 4.9 / 6.1 | 6.7 / 7.9 | **+1.8** | 3.9 / 4.8 | 159 / 248 |
| sectorops | 32 | away | 4.9 / 6.2 | 7.2 / 8.4 | **+2.2** | 3.9 / 5.0 | 164 / 268 |
| sectorops | 24 | alert | 8.2 / 10.3 | 8.0 / 9.7 | -0.6 | 5.7 / 5.5 | 284 / 311 |
| sectorops | 32 | alert | 9.0 / 11.3 | 8.5 / 10.3 | -1.0 | 6.2 / 5.8 | 320 / 358 |

GPU p95 <= 9.84 on every page and cell (alert <= 6.26). Puppets: 12 / 24 / 32 alive on the client in every cell (no drops).

### Wire (M1 host, 2 players = 1 client; `JSON.stringify` characters)
| Map | N | cell | snap med / max | all types per s med / max | upload, 1 client (Mbit/s, max) | x3 clients (Mbit/s, med / max) |
| --- | --- | --- | --- | --- | --- | --- |
| campus | 24 | alert | 3744 / 5976 | 54206 / 56651 | 0.45 | 1.30 / 1.36 |
| campus | 32 | alert | 4691 / 6915 | 67353 / 72254 | 0.58 | 1.62 / 1.73 |
| sectorops | 24 | alert | 3912 / 9054 | 57043 / 64550 | 0.52 | 1.37 / 1.55 |
| sectorops | 32 | alert | 5014 / 10170 | 71372 / 77836 | 0.62 | 1.71 / 1.87 |

~120-133 characters a guard. The snap max sits a fixed ~2.2 K (campus) / ~5.1 K (Sector Ops) over the median at every N,
0 guards included (one large snap a window), so it is not guard growth; steady = median. Host stringify 0.33 ms a second.
The x3 column is an extrapolation (no 4-player run), before coop4's rounding (`snapEnemyState`, not in this build) and
without the two extra players' entries.

### Run 4100 (4.100.0) vs M0 (6e8a450b), host / solo, alert/facing
| Map | N | sim p95 M0 -> 4100 | frame CPU p95 M0 -> 4100 | render() p95 (4100) | GPU p95 (4100) | draws (4100) | ai.anim / ai.manager mean (4100, share of step growth) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 32 | 3.4 -> **2.8** (2.8 / 3.8 / 2.5) | 14.8 -> **9.7** (9.7 / 9.7 / 9.6) | 7.0 (M0 10.95) | 6.9 (M0 9.73) | ~450 (M0 484.5) | 0.77-0.92 (~55%) / 0.27 (~19%) |
| sectorops | 32 | 4.4 -> **3.4** | 10.55 -> 8.3 | 5.4 | 6.79 | 289 | 1.00 (~53%, N 12 -> 32) / 0.3 |
| ctcourse | 24 | 4.1 -> **3.1** | 11.0 -> 8.2 | 5.6 | 7.95 | 433 | 0.81 (~50%) / 0.2 (~12%) |
| ctcourse | 12 | 2.6 -> 2.0 | 10.8 -> 6.9 | 5.1 | 7.15 | 384 | - |

**Which campus number to trust: run 4100's 9.7, not M0's 14.8.** (Test Runner's 8.5 is frame ms median; the rule reads
frame CPU p95, 9.7.) 4100 is the build the cap ships on: it has guard-render-2 (merged in train 64; not in 6e8a450b)
and R1 allocation-free rays (#326, train 60); render() p95 fell 10.95 -> 7.0 and draws 484 -> ~450, which is
guard-render-2's work. Its three repeats agree (9.6-9.7); M0's two did not (17.5 / 12.1). Same rig and script. M0's 14.8
stays as the pre-guard-render-2 baseline. Caveat: both are figures off; gm-flip #375 turns guard models on by default,
and G8 measured +1.1 to +2.5 ms frame p95 at 24 with figures, so campus 32 alert would read ~11-12 after #375.

### Verdict (PLAN section 2)
- **Host: 32 holds on render, sim sits at the line.** 4.100.0: frame CPU p95 <= 9.7, GPU <= 6.9, draws <= 456 at 32 on
  both maps. Sim p95 campus 32 2.8 (median of 3, one repeat 3.8), Sector Ops 32 3.4 and ctcourse 24 3.1 (one repeat
  each): 0.2-0.5 over 2.9. `ai.anim` is still ~50-55% of the growth, `ai.manager` 12-19%: the anim rule (T1) stands,
  D1 / D2 stay closed. Render no longer needs a PLAN2 addition for campus 32 (M0's 14.8 is superseded).
- **Co-op client: facing costs what the host does; off-screen guards cost the client ~2 ms more.** Facing alert: client
  = host within +-1 ms at 24 and 32 (campus 32 12.5 vs 12.2, both just over 12 on the old build with two pages on one
  GPU; Sector Ops 10.3 vs 11.3). Away (every guard behind the page): client minus host +1.9 / +2.6 (campus 24 / 32),
  +1.8 / +2.2 (Sector Ops) -> **C1 TRIGGERED** (rule: > 1.0 at the same N). At 0 guards the client is not dearer. The
  extra splits about evenly (medians at 32): render() +1.1 to +1.5 with +88 to +104 draws while active meshes match
  (host 35 / client 33): the puppets still cast into the shadow maps because the client has no render freeze -> C2's
  share; outside render +1.2 to +1.3: puppet rigs solve every frame (no anim tier on the client) -> C1's share.
  `enemyPuppet.ts` on 4.100.0 still has no tier or freeze. Where it breaks: off-screen puppets from 24 up; facing,
  campus 32 (old build).
- **Buckets that grow.** Host: `ai.anim` (sim) and draws (render). Client: puppet anim (C1) and puppet shadow draws (C2).
  Net: no (stringify 0.33 ms a second, client GPU low). `ai.manager`: no.
- **Wire: N1 NOT triggered on measured data.** 2 players: snap median <= 5.0 K, upload <= 0.62 Mbit/s. 4 players
  unmeasured (capacity 2); the x3 extrapolation at 32 alert reads 1.62-1.71 Mbit/s median, 1.73-1.87 max, at A24's 1.7
  before coop4's rounding: decide on a real 4-player M1 after coop4 merges.
- **Caps.** `SECTOR.maxAlive` stays 32 (host passes render, sim is 0.2-0.5 over with T1 pending; client facing = host;
  = `MAX_ENEMIES` 32). No K1. `MAX_ALIVE` stays 12: ctcourse 12 alert now has room (sim 2.0, frame CPU 6.9); no
  ctcourse 16 cell exists, and no one asked for a rise.
- **T1 (#360, held for the shadow case, guard-ai BRIEF A183).** M1 bears on it twice. (1) The host sim is still 0.2-0.5
  over with anim the largest share, so T1's saving is still wanted. (2) The client pays the same off-screen cost on
  puppets, and M1's extra client draws show off-screen puppets DO reach the shadow maps: the "shadow in view counts as
  seen" problem applies to C1 too. C1 reads `ANIM_TIER_OFFSCREEN` from `animTier.ts`, so Michael's T1 call (ship 8 /
  count shadow-in-view as seen / close) also sets C1's off-screen rule. Recommend "shadow in view counts as seen" for
  both: it keeps light parity, and C2 then removes the shadow draws of puppets that cannot reach the screen.

### Next slices and gate state (2026-10-25, origin/master 833db92e)
| Slice | Trigger | Gate branches | State today |
| --- | --- | --- | --- |
| C1 puppet anim tiers | M1: client - host +1.8 to +2.6 off-screen | guard-models (#318 merged), gm-perf (only in gm-flip #375, OPEN), coop4 (#317 OPEN), optic-coop (#314 merged), guard-ai-coop-carry (#313 merged) | WAITS #375 + #317; off-screen "seen" rule waits Michael's T1 call |
| C2 puppets in render freeze (Test Runner, PLAN2 addition) | M1: render half of the client extra (+88 to +104 draws) | guard-render-2 (merged, train 64), coop4 #317 OPEN, optic + carry merged; after C1 | brief can go to Test Runner now; build WAITS #317 + C1 |
| T1 (#360) | M0 + 4100: anim ~50-55% of sim growth, sim 0.2-0.5 over | none (built) | HELD for Michael (A183) |
| M1b rerun | 4-player cells, second repeat, figures on | coop4 #317, gm-flip #375 on master | WAITS; with an M0 rerun on the same head (M2 script, also waits gm-perf) |
| N1 | only if M1b breaks A24 | coop4, optic, carry, guard-models | NOT triggered |
| K1 / D1 / D2 | - | - | NOT triggered / CLOSED |
| DOC | last | guard-models merged | after the above |
