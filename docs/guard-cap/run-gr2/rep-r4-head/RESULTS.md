# Guard cap: results

Run 2026-10-24T09:23:00.201Z - 2026-10-24T09:24:33.481Z (1.6 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.6 | 0.324 | 0.029 | 0.235 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.246 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.297 | 0.028 | 0.215 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.232 (103.808) | 0 (0) |
| 24 | patrol/facing | 1.4 / 2 | 0.416 | 0.075 | 0.794 | 0.1 / 0.2 | 0.076 | 0.012 | 0.009 | 0.034 | 0.018 | 0.532 | 0 (0) | 0 | 0.008 (3.91) | 0 (0) | 0 (0) | 0.23 (106.808) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.4 | 0.543 | 0.102 | 1.096 | 0.2 / 0.5 | 0.178 | 0.02 | 0.055 | 0.067 | 0.03 | 0.725 | 0.002 (0.022) | 0 | 0.009 (2.992) | 0.018 (5) | 0.006 (1.238) | 0.233 (104.502) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.9 / 3.6 | 526.3 | 1.7 / 3.4 | 369 / 2453 | 1.9 / 83.1 | 2.4 / 4.6 | 1.7 / 2.6 | 17.846 | 0.4 | 1.3 / 2.2 | 3.616 / 3.767 | 98 | 0.388 | 1 | 4 | 122 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.7 / 19.3 | 588.2 | 1.6 / 19.1 | 473 / 2324 | 2.3 / 40.6 | 2.5 / 4.4 | 1.5 / 20.7 | 16.028 | 0.4 | 1.3 / 18.9 | 3.722 / 3.962 | 98 | 0.388 | 1 | 4 | 122 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 24 | patrol/facing | 5.2 / 6.4 | 192.3 | 4.9 / 6.2 | 604 / 1319 | 5 / 6 | 5.5 / 6.6 | 4.7 / 5.6 | 15.986 | 0.6 | 3.6 / 4.3 | 4.781 / 5.718 | 230 | 2.356 | 3 | 6 | 160 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6.3 / 7.7 | 158.7 | 5.8 / 7 | 607 / 976 | 6.1 / 7.1 | 6.4 / 7.3 | 5.4 / 6.4 | 15.233 | 0.7 | 4 / 4.7 | 5.795 / 6.465 | 256 | 2.469 | 5 | 8 | 230 | 1.8 | 0 / 0 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.037 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.138 ms, frame CPU 0.133 ms, frame CPU (sim frames) 0.129 ms, CPU per 1/60 s sim -0.077 ms, GPU 0.049 ms, draws 5.500.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.192 ms, frame CPU 0.175 ms, frame CPU (sim frames) 0.163 ms, CPU per 1/60 s sim -0.033 ms, GPU 0.086 ms, draws 6.583.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 58.4, gBuffer 55.4, sun_CSMShadowMap 51.5, torchshadow-#_shadowMap 49.5, charshadow-#_shadowMap 12.2, RenderTargetWrapper 4.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.

## Flags (data-quality notes: read the flagged numbers with care)

- sectorops x 0 patrol/facing: render: sim clock moved 9.067 s in 10.105 real s (the loop fell behind or paused; MAX_STEPS drops)
