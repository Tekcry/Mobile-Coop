# Guard cap: results

Run 2026-10-24T08:47:10.458Z - 2026-10-24T08:48:43.831Z (1.6 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.378 | 0.031 | 0.268 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.299 (103.813) | 0 (0) |
| 0 | alert/facing | 0.6 / 0.8 | 0.364 | 0.027 | 0.257 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.291 (103.813) | 0 (0) |
| 24 | patrol/facing | 1.3 / 1.9 | 0.419 | 0.077 | 0.759 | 0.1 / 0.2 | 0.081 | 0.016 | 0.011 | 0.034 | 0.017 | 0.483 | 0 (0) | 0 | 0.009 (3.905) | 0 (0) | 0 (0) | 0.233 (106.808) | 0 (0) |
| 24 | alert/facing | 1.8 / 2.7 | 0.516 | 0.094 | 1.019 | 0.2 / 0.4 | 0.156 | 0.018 | 0.048 | 0.056 | 0.032 | 0.673 | 0.001 (0.022) | 0 | 0.007 (3.002) | 0.014 (5) | 0.003 (1.34) | 0.225 (104.578) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.9 / 18.6 | 526.3 | 1.8 / 18 | 487 / 2308 | 2.4 / 38 | 2.8 / 4.9 | 1.7 / 19.5 | 15.897 | 0.4 | 1.4 / 17.7 | 3.622 / 3.922 | 104 | 0.495 | 1 | 4 | 122 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.9 / 18.8 | 526.3 | 1.7 / 18.5 | 485 / 2303 | 2.4 / 38.6 | 2.6 / 3.8 | 1.6 / 20.8 | 15.994 | 0.4 | 1.3 / 18.1 | 3.71 / 3.885 | 104 | 0.495 | 1 | 4 | 121 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 24 | patrol/facing | 5.2 / 6.6 | 192.3 | 5 / 6.3 | 604 / 1286 | 5.1 / 6.3 | 5.6 / 6.8 | 4.8 / 5.8 | 16.039 | 0.6 | 3.7 / 4.5 | 4.922 / 6.013 | 237 | 2.51 | 3 | 6 | 155 | 1.6 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6 / 7.5 | 166.7 | 5.5 / 6.8 | 606 / 1045 | 5.7 / 6.9 | 6.1 / 7.2 | 5.2 / 6.1 | 15.226 | 0.7 | 4 / 4.7 | 5.654 / 6.426 | 255 | 2.491 | 5 | 8 | 201 | 1.7 | 0 / 0 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.033 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.138 ms, frame CPU 0.133 ms, frame CPU (sim frames) 0.117 ms, CPU per 1/60 s sim 0.006 ms, GPU 0.054 ms, draws 5.542.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.171 ms, frame CPU 0.158 ms, frame CPU (sim frames) 0.146 ms, CPU per 1/60 s sim -0.032 ms, GPU 0.081 ms, draws 6.292.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: sun_CSMShadowMap 72.8, PostProcessRTT-TAA 53.9, gBuffer 50.9, torchshadow-#_shadowMap 36.8, charshadow-#_shadowMap 8, RenderTargetWrapper 4.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
