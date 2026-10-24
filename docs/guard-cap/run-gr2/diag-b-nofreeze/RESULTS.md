# Guard cap: results

Run 2026-10-24T08:42:50.796Z - 2026-10-24T08:43:46.865Z (0.9 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## warehouseOps:sector&sectorGuards=0&guardfreeze=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | alert/facing | 0.5 / 0.7 | 0.328 | 0.034 | 0.226 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.252 (103.813) | 0 (0) |
| 24 | alert/facing | 2.1 / 2.9 | 0.565 | 0.117 | 1.282 | 0.2 / 0.4 | 0.175 | 0.019 | 0.054 | 0.059 | 0.029 | 0.838 | 0.005 (0.037) | 0 | 0.01 (2.98) | 0.015 (5) | 0.006 (1.017) | 0.235 (104.733) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | alert/facing | 2.2 / 4.1 | 454.5 | 2 / 3.9 | 445 / 2544 | 2.4 / 60.5 | 2.9 / 4.6 | 1.9 / 3.2 | 16.468 | 0.4 | 1.6 / 2.7 | 3.377 / 3.54 | 98 | 0.388 | 1 | 4 | 121 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 24 | alert/facing | 6.9 / 8.7 | 144.9 | 6.2 / 8.1 | 606 / 846 | 6.5 / 8.6 | 6.9 / 8.5 | 5.8 / 7.3 | 15.234 | 0.7 | 4.3 / 5.5 | 5.6 / 6.374 | 222 | 1.969 | 4 | 7 | 220 | 1.9 | 0 / 0 | 4 of 4 | alert 24 -> alert 18, searching 6 |

Per added guard, alert/facing, N 0 -> 24: sim step 0.067 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.196 ms, frame CPU 0.175 ms, frame CPU (sim frames) 0.167 ms, CPU per 1/60 s sim -0.051 ms, GPU 0.093 ms, draws 5.167.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 60.2, gBuffer 57.2, sun_CSMShadowMap 41.3, torchshadow-#_shadowMap 25.4, charshadow-#_shadowMap 8.3, RenderTargetWrapper 4.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
