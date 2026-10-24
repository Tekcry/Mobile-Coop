# Guard cap: results

Run 2026-10-24T09:20:26.545Z - 2026-10-24T09:21:59.949Z (1.6 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.321 | 0.03 | 0.23 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.244 (103.808) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.9 | 0.323 | 0.031 | 0.231 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.253 (103.813) | 0 (0) |
| 24 | patrol/facing | 1.3 / 1.9 | 0.405 | 0.071 | 0.702 | 0.1 / 0.2 | 0.078 | 0.016 | 0.009 | 0.034 | 0.017 | 0.453 | 0 (0) | 0 | 0.011 (3.93) | 0 (0) | 0 (0) | 0.223 (106.808) | 0 (0) |
| 24 | alert/facing | 1.8 / 2.5 | 0.543 | 0.104 | 1.025 | 0.2 / 0.6 | 0.175 | 0.02 | 0.058 | 0.061 | 0.028 | 0.667 | 0.002 (0.025) | 0 | 0.01 (2.993) | 0.015 (5) | 0.005 (1.055) | 0.23 (104.707) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.8 / 17 | 555.6 | 1.7 / 16.7 | 484 / 2341 | 2.3 / 40 | 2.6 / 6.5 | 1.6 / 18.2 | 16.068 | 0.4 | 1.3 / 16.3 | 3.693 / 3.793 | 104 | 0.495 | 1 | 4 | 121 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.1 / 16.6 | 476.2 | 1.9 / 16.4 | 503 / 2286 | 2.5 / 35.9 | 2.8 / 14.2 | 1.8 / 16.4 | 15.961 | 0.4 | 1.5 / 16 | 3.636 / 3.918 | 104 | 0.495 | 1 | 4 | 122 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 24 | patrol/facing | 5.3 / 6.7 | 188.7 | 5.1 / 6.5 | 606 / 1257 | 5.2 / 6.3 | 5.8 / 6.8 | 4.9 / 5.8 | 15.997 | 0.6 | 3.8 / 4.6 | 4.92 / 5.911 | 214 | 2.217 | 1 | 4 | 155 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6.1 / 7.5 | 163.9 | 5.5 / 6.9 | 607 / 1036 | 5.8 / 6.8 | 6.2 / 7.2 | 5.2 / 6.1 | 15.211 | 0.7 | 4.1 / 4.8 | 5.67 / 6.49 | 245 | 2.389 | 5 | 8 | 205 | 1.7 | 0 / 0 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.033 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.146 ms, frame CPU 0.142 ms, frame CPU (sim frames) 0.133 ms, CPU per 1/60 s sim -0.003 ms, GPU 0.051 ms, draws 4.583.
Per added guard, alert/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.167 ms, frame CPU 0.150 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim -0.031 ms, GPU 0.085 ms, draws 5.875.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: sun_CSMShadowMap 64.5, PostProcessRTT-TAA 52.1, gBuffer 49.1, torchshadow-#_shadowMap 45.9, charshadow-#_shadowMap 7.9, RenderTargetWrapper 4.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
