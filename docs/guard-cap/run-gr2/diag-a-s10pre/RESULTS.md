# Guard cap: results

Run 2026-10-24T08:24:06.003Z - 2026-10-24T08:25:00.973Z (0.9 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | alert/facing | 0.5 / 0.8 | 0.314 | 0.03 | 0.222 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.24 (103.813) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.6 | 0.548 | 0.101 | 1.003 | 0.2 / 0.6 | 0.18 | 0.019 | 0.058 | 0.068 | 0.023 | 0.642 | 0.005 (0.03) | 0 | 0.01 (3.005) | 0.011 (5) | 0.005 (0.942) | 0.228 (105.002) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | alert/facing | 2 / 3.7 | 500 | 1.8 / 3.4 | 392 / 2453 | 2.1 / 78.6 | 2.5 / 4.4 | 1.7 / 2.7 | 17.462 | 0.4 | 1.4 / 2.3 | 3.602 / 3.859 | 98 | 0.388 | 1 | 4 | 122 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 24 | alert/facing | 5.8 / 7.3 | 172.4 | 5.3 / 6.7 | 605 / 1092 | 5.6 / 6.7 | 5.9 / 7.2 | 5 / 6 | 15.088 | 0.7 | 3.8 / 4.5 | 5.405 / 6.097 | 200 | 1.601 | 5 | 8 | 194 | 1.6 | 0 / 0 | 4 of 4 | alert 24 -> alert 20, searching 4 |

Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.158 ms, frame CPU 0.146 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim -0.099 ms, GPU 0.075 ms, draws 4.250.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 50.6, gBuffer 47.6, sun_CSMShadowMap 38.3, torchshadow-#_shadowMap 28.1, charshadow-#_shadowMap 6.2, RenderTargetWrapper 4.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
