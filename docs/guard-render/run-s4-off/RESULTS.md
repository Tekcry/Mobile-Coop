# Guard cap: results

Run 2026-10-23T03:20:35.519Z - 2026-10-23T03:26:58.571Z (6.4 min), version 4.73.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## warehouseOps:sector&sectorGuards=0&animtier=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.8 / 1.6 | 0.508 | 0.041 | 0.308 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.412 (103.813) | 0 (0) |
| 0 | alert/facing | 0.7 / 1.2 | 0.551 | 0.036 | 0.309 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.451 (103.813) | 0 (0) |
| 12 | patrol/facing | 2 / 3.3 | 0.552 | 0.078 | 0.884 | 0.1 / 0.2 | 0.057 | 0.011 | 0.009 | 0.018 | 0.01 | 0.53 | 0 (0) | 0 | 0.007 (2.245) | 0 (0) | 0 (0) | 0.383 (106.808) | 0 (0) |
| 12 | alert/facing | 2.2 / 4.3 | 0.838 | 0.106 | 1.098 | 0.2 / 0.8 | 0.12 | 0.014 | 0.039 | 0.032 | 0.041 | 0.645 | 0.002 (0.015) | 0.133 | 0.009 (1.538) | 0.027 (5) | 0.001 (0.12) | 0.425 (105.375) | 0 (0) |
| 24 | patrol/facing | 2.7 / 4 | 0.802 | 0.152 | 1.787 | 0.2 / 0.3 | 0.126 | 0.032 | 0.02 | 0.034 | 0.017 | 1.295 | 0 (0) | 0 | 0.021 (4.51) | 0 (0) | 0 (0) | 0.498 (106.808) | 0 (0) |
| 24 | alert/facing | 3.1 / 6.6 | 0.919 | 0.163 | 1.812 | 0.2 / 0.8 | 0.174 | 0.025 | 0.059 | 0.043 | 0.038 | 1.29 | 0.003 (0.03) | 0.148 | 0.014 (2.992) | 0.025 (5) | 0.003 (0.422) | 0.406 (105.037) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.2 / 5.4 | 312.5 | 3 / 5.1 | 590 / 2352 | 3.7 / 5.3 | 4.2 / 6.1 | 2.8 / 4.6 | 15.639 | 0.7 | 2.4 / 3.9 | 3.501 / 3.898 | 104 | 0.494 | 1 | 4 | 115 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.3 / 4.6 | 434.8 | 2.2 / 4.3 | 544 / 2900 | 2.7 / 31.2 | 3.4 / 5.2 | 2 / 3.6 | 15.624 | 0.7 | 1.7 / 3 | 2.761 / 3.043 | 75 | 0.473 | 1 | 4 | 20 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.7 / 5.1 | 370.4 | 2.5 / 4.8 | 520 / 2381 | 3.2 / 42.1 | 3.7 / 5.6 | 2.3 / 4 | 15.926 | 0.6 | 2 / 3.4 | 3.459 / 3.849 | 104 | 0.494 | 1 | 4 | 115 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 6.8 / 10.7 | 147.1 | 6.6 / 10.4 | 607 / 819 | 7.1 / 11.4 | 7.6 / 11.2 | 5.9 / 9.3 | 16.019 | 0.7 | 5 / 7.8 | 5.2 / 6.941 | 179 | 1.412 | 1 | 4 | 287 | 2.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 5.3 / 8.5 | 188.7 | 5 / 8.2 | 606 / 1216 | 5.5 / 8.7 | 6.1 / 8.7 | 4.5 / 7.4 | 15.914 | 0.7 | 3.7 / 5.6 | 3.73 / 4.913 | 131 | 1.122 | 1 | 4 | 24 | 1.8 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 8.8 / 13.2 | 113.6 | 8 / 12.3 | 606 / 511 | 9.1 / 14.3 | 8.8 / 13.5 | 7.2 / 10.7 | 15.212 | 0.9 | 6 / 8.6 | 5.99 / 7.952 | 216 | 1.842 | 3 | 6 | 378 | 2.4 | 2 / 2 | 4 of 4 | alert 12 -> searching 2, alert 10 |
| 24 | patrol/facing | 10.7 / 15.3 | 93.5 | 10.4 / 15 | 607 / 341 | 11.2 / 16 | 11.1 / 15.5 | 9.1 / 13.1 | 16.217 | 0.8 | 7.8 / 10.8 | 6.193 / 8.445 | 239 | 2.25 | 1 | 4 | 485 | 3.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 8.4 / 12.8 | 119 | 8.1 / 12.5 | 607 / 561 | 8.7 / 13.5 | 9 / 13.3 | 7.1 / 10.7 | 16.1 | 0.9 | 5.8 / 8.4 | 4.399 / 5.671 | 167 | 1.571 | 1 | 4 | 24 | 3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 12.3 / 17.7 | 81.3 | 11.4 / 16.8 | 602 / 208 | 13 / 18.4 | 12.1 / 17.2 | 9.7 / 14.7 | 15.495 | 0.9 | 8.3 / 11.7 | 6.965 / 8.912 | 278 | 2.625 | 3 | 6 | 564 | 4.3 | 2 / 2 | 4 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.079 ms, AI manager 0.006 ms, perceive 0.001 ms, frame 0.312 ms, frame CPU 0.308 ms, frame CPU (sim frames) 0.287 ms, CPU per 1/60 s sim 0.024 ms, GPU 0.112 ms, draws 5.625.
Per added guard, alert/facing, N 0 -> 24: sim step 0.100 ms, AI manager 0.016 ms, perceive 0.001 ms, frame 0.400 ms, frame CPU 0.371 ms, frame CPU (sim frames) 0.350 ms, CPU per 1/60 s sim -0.018 ms, GPU 0.146 ms, draws 7.250.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 63, PostProcessRTT-TAA 49.5, gBuffer 46.5, maplight-shadow-#_shadowMap 31.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 94, PostProcessRTT-TAA 63.8, gBuffer 60.8, maplight-shadow-#_shadowMap 37.9, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse:course&animtier=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 1.3 | 0.391 | 0.037 | 0.272 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.299 (100.808) | 0 (0) |
| 0 | alert/facing | 0.9 / 1.4 | 0.6 | 0.053 | 0.374 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.002 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.467 (100.808) | 0 (0) |
| 12 | patrol/facing | 2 / 3.6 | 0.739 | 0.106 | 1.231 | 0.1 / 0.2 | 0.093 | 0.012 | 0.018 | 0.029 | 0.009 | 0.789 | 0 (0) | 0 | 0.008 (2.23) | 0 (0) | 0 (0) | 0.474 (102.665) | 0 (0) |
| 12 | alert/facing | 1.7 / 4.2 | 0.612 | 0.087 | 0.915 | 0.1 / 0.3 | 0.089 | 0.009 | 0.034 | 0.02 | 0.008 | 0.547 | 0 (0.013) | 0.072 | 0.005 (1.51) | 0 (0) | 0.003 (0.413) | 0.328 (101.125) | 0 (0) |
| 24 | patrol/facing | 1.9 / 3.6 | 0.529 | 0.106 | 1.275 | 0.1 / 0.3 | 0.094 | 0.018 | 0.018 | 0.025 | 0.012 | 0.944 | 0 (0) | 0 | 0.012 (4.49) | 0 (0) | 0 (0) | 0.305 (102.667) | 0 (0) |
| 24 | alert/facing | 3.8 / 6.2 | 0.851 | 0.152 | 1.779 | 0.2 / 0.7 | 0.172 | 0.015 | 0.064 | 0.042 | 0.018 | 1.278 | 0.001 (0.012) | 0.083 | 0.008 (2.967) | 0 (0) | 0.007 (0.913) | 0.407 (101.125) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.5 / 4.8 | 400 | 2.3 / 4.5 | 548 / 2711 | 3 / 26.5 | 3.4 / 5.5 | 2.2 / 4.1 | 15.686 | 0.5 | 1.8 / 3.5 | 3.175 / 4.47 | 115 | 0.211 | 0 | 4 | 92 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.9 / 3.9 | 526.3 | 1.7 / 3.6 | 439 / 2945 | 2.3 / 71.4 | 2.9 / 5.3 | 1.6 / 3.1 | 17.119 | 0.5 | 1.3 / 2.5 | 2.784 / 3.128 | 52 | 0.204 | 0 | 4 | 14 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3.3 / 5.6 | 303 | 3 / 5.3 | 600 / 2346 | 3.7 / 5.6 | 4.2 / 6.1 | 2.8 / 4.7 | 15.482 | 0.7 | 2.4 / 4 | 3.326 / 4.48 | 115 | 0.211 | 0 | 4 | 92 | 1.1 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 8.5 / 12.8 | 117.6 | 8.2 / 12.4 | 607 / 565 | 8.8 / 13 | 9.1 / 12.9 | 7.4 / 10.7 | 16.076 | 0.9 | 6 / 8.9 | 5.113 / 6.929 | 143 | 0.598 | 0 | 4 | 284 | 3.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.6 / 7.7 | 217.4 | 4.4 / 7.4 | 607 / 1444 | 5 / 7.4 | 5.4 / 8.1 | 4 / 6.6 | 15.783 | 0.7 | 3 / 4.8 | 3.335 / 4.156 | 56 | 0.253 | 0 | 4 | 16 | 1.5 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 7 / 11 | 142.9 | 6.6 / 10.5 | 606 / 779 | 7.1 / 11.5 | 7.6 / 11.6 | 6.1 / 9.3 | 15.826 | 0.8 | 5.1 / 7.7 | 4.647 / 6.285 | 161 | 0.693 | 1 | 4 | 319 | 2.6 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 9.3 / 13.3 | 107.5 | 9 / 13 | 608 / 467 | 9.7 / 13.9 | 9.8 / 13.7 | 8 / 11.5 | 16.157 | 0.7 | 6.6 / 9.6 | 5.191 / 6.777 | 167 | 1.004 | 0 | 4 | 512 | 4.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 7.3 / 10.2 | 137 | 7 / 9.9 | 607 / 783 | 7.5 / 10.6 | 7.7 / 10.7 | 6.5 / 9.1 | 16.01 | 0.8 | 4.6 / 6.3 | 3.328 / 4.213 | 56 | 0.253 | 0 | 4 | 16 | 3.1 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 11.5 / 17.6 | 87 | 11.1 / 17.1 | 601 / 262 | 12.5 / 18.4 | 12 / 17.7 | 9.2 / 14.1 | 16.065 | 0.9 | 8.1 / 11.9 | 5.865 / 8.061 | 188 | 1.138 | 1 | 4 | 561 | 3.7 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.283 ms, frame CPU 0.279 ms, frame CPU (sim frames) 0.267 ms, CPU per 1/60 s sim 0.020 ms, GPU 0.084 ms, draws 2.167.
Per added guard, alert/facing, N 0 -> 24: sim step 0.121 ms, AI manager 0.013 ms, perceive 0.001 ms, frame 0.342 ms, frame CPU 0.337 ms, frame CPU (sim frames) 0.325 ms, CPU per 1/60 s sim 0.024 ms, GPU 0.106 ms, draws 3.042.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 61.9, gBuffer 59.9, sun_CSMShadowMap 13.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 75, gBuffer 73, sun_CSMShadowMap 14, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
