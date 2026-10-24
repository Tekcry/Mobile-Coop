# Guard cap: results

Run 2026-10-24T09:04:11.007Z - 2026-10-24T09:05:44.048Z (1.6 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.8 | 0.367 | 0.032 | 0.256 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.281 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.307 | 0.023 | 0.21 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.244 (103.808) | 0 (0) |
| 24 | patrol/facing | 1.3 / 1.7 | 0.418 | 0.069 | 0.718 | 0.1 / 0.2 | 0.074 | 0.015 | 0.008 | 0.034 | 0.017 | 0.464 | 0 (0) | 0 | 0.01 (3.91) | 0 (0) | 0 (0) | 0.236 (106.822) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.3 | 0.534 | 0.108 | 1.081 | 0.2 / 0.4 | 0.154 | 0.014 | 0.05 | 0.054 | 0.034 | 0.704 | 0.001 (0.022) | 0 | 0.008 (2.958) | 0.018 (5) | 0.006 (1.255) | 0.239 (104.533) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.7 / 3.2 | 588.2 | 1.6 / 3 | 338 / 2521 | 1.7 / 88.2 | 2.2 / 4.2 | 1.5 / 2.3 | 18.778 | 0.4 | 1.2 / 2 | 3.603 / 3.725 | 98 | 0.388 | 1 | 4 | 121 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.9 / 19.4 | 526.3 | 1.8 / 19.2 | 488 / 2278 | 2.6 / 37.3 | 2.8 / 10.6 | 1.7 / 19.9 | 15.991 | 0.4 | 1.4 / 18.8 | 3.578 / 3.718 | 98 | 0.388 | 1 | 4 | 122 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 24 | patrol/facing | 4.8 / 5.9 | 208.3 | 4.6 / 5.7 | 603 / 1460 | 4.6 / 5.6 | 5.2 / 6 | 4.4 / 5.3 | 15.996 | 0.6 | 3.3 / 4 | 4.461 / 5.435 | 213 | 2.088 | 3 | 6 | 155 | 1.8 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6 / 7.4 | 166.7 | 5.5 / 6.7 | 605 / 1042 | 5.7 / 6.7 | 6.2 / 7.1 | 5.2 / 6 | 15.167 | 0.7 | 3.9 / 4.5 | 5.747 / 6.418 | 243 | 2.19 | 4 | 7 | 212 | 1.9 | 0 / 0 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.033 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.129 ms, frame CPU 0.125 ms, frame CPU (sim frames) 0.125 ms, CPU per 1/60 s sim -0.116 ms, GPU 0.036 ms, draws 4.792.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.171 ms, frame CPU 0.154 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim -0.034 ms, GPU 0.090 ms, draws 6.042.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 56.7, gBuffer 53.7, sun_CSMShadowMap 49.5, torchshadow-#_shadowMap 42.4, charshadow-#_shadowMap 10.1, RenderTargetWrapper 4.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.

## Flags (data-quality notes: read the flagged numbers with care)

- sectorops x 0 patrol/facing: render: sim clock moved 8.667 s in 10.121 real s (the loop fell behind or paused; MAX_STEPS drops)
