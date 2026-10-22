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
Not run yet.
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
