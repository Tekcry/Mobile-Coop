# Guard cap: results

Run 2026-10-23T03:00:47.235Z - 2026-10-23T03:07:07.960Z (6.3 min), version 4.73.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.9 / 1.6 | 0.56 | 0.045 | 0.339 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.458 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 1.3 | 0.575 | 0.04 | 0.31 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.47 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.7 / 3.8 | 0.556 | 0.081 | 0.872 | 0.1 / 0.2 | 0.056 | 0.01 | 0.007 | 0.02 | 0.006 | 0.532 | 0 (0) | 0 | 0.005 (2.25) | 0 (0) | 0 (0) | 0.385 (106.808) | 0 (0) |
| 12 | alert/facing | 1.4 / 3.7 | 0.793 | 0.099 | 1.045 | 0.2 / 0.7 | 0.12 | 0.015 | 0.04 | 0.034 | 0.032 | 0.624 | 0.001 (0.018) | 0.109 | 0.006 (1.51) | 0.023 (4.908) | 0.002 (0.165) | 0.41 (104.788) | 0 (0) |
| 24 | patrol/facing | 2 / 3.8 | 0.527 | 0.098 | 1.161 | 0.1 / 0.2 | 0.08 | 0.023 | 0.011 | 0.022 | 0.012 | 0.838 | 0 (0) | 0 | 0.016 (4.485) | 0 (0) | 0 (0) | 0.331 (106.808) | 0 (0) |
| 24 | alert/facing | 2.3 / 5.3 | 0.878 | 0.157 | 1.729 | 0.2 / 1 | 0.177 | 0.028 | 0.059 | 0.039 | 0.042 | 1.224 | 0.004 (0.028) | 0.113 | 0.017 (3.103) | 0.027 (4.975) | 0.001 (0.353) | 0.4 (104.677) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.4 / 5.6 | 294.1 | 3.2 / 5.3 | 599 / 2235 | 3.7 / 5.7 | 4.2 / 5.9 | 3 / 4.6 | 15.567 | 0.7 | 2.5 / 3.9 | 3.5 / 4.566 | 104 | 0.494 | 1 | 4 | 115 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.1 / 4.6 | 476.2 | 1.9 / 4.2 | 567 / 3073 | 2.7 / 25.9 | 2.9 / 4.8 | 1.7 / 3.8 | 15.655 | 0.6 | 1.4 / 3 | 2.782 / 3.168 | 75 | 0.473 | 1 | 4 | 20 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.1 / 6.4 | 476.2 | 1.9 / 5.9 | 523 / 2488 | 2.9 / 35.7 | 3 / 6 | 1.7 / 5.7 | 15.791 | 0.4 | 1.5 / 4.4 | 3.346 / 4.243 | 104 | 0.494 | 1 | 4 | 116 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 6.2 / 9.6 | 161.3 | 5.9 / 9.3 | 606 / 978 | 6.3 / 9.9 | 7 / 9.9 | 5.4 / 8.4 | 16.014 | 0.7 | 4.5 / 6.9 | 4.849 / 6.474 | 179 | 1.412 | 1 | 4 | 288 | 2.2 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 5 / 8.3 | 200 | 4.8 / 7.9 | 605 / 1329 | 5.3 / 8.3 | 5.8 / 8.6 | 4.4 / 7.1 | 15.856 | 0.8 | 3.7 / 5.9 | 3.664 / 5.018 | 131 | 1.122 | 1 | 4 | 24 | 1.6 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 8.6 / 12.6 | 116.3 | 7.8 / 11.6 | 608 / 563 | 8.8 / 13.1 | 8.7 / 12.4 | 6.8 / 10 | 15.138 | 0.9 | 5.7 / 8.1 | 6.346 / 8.347 | 196 | 1.53 | 3 | 6 | 387 | 2.2 | 2 / 2 | 4 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 9.4 / 14.3 | 106.4 | 9.1 / 14 | 610 / 429 | 10.3 / 15.3 | 10.3 / 14.8 | 8 / 12.6 | 16.188 | 0.7 | 6.9 / 10.6 | 6.608 / 8.525 | 239 | 2.25 | 1 | 4 | 485 | 3.5 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 7.7 / 12 | 129.9 | 7.4 / 11.7 | 604 / 667 | 8.2 / 12.6 | 8.7 / 12.2 | 6.4 / 10.3 | 16.089 | 0.9 | 6 / 9 | 4.834 / 6.88 | 167 | 1.571 | 1 | 4 | 24 | 3.3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 13 / 17.8 | 76.9 | 12.2 / 17 | 601 / 180 | 13.9 / 18.3 | 12.9 / 17.1 | 10.4 / 14.8 | 15.618 | 1 | 8.9 / 12.1 | 8.354 / 10.539 | 292 | 2.856 | 3 | 6 | 558 | 3.4 | 2 / 2 | 4 of 4 | alert 24 -> searching 3, alert 21 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.250 ms, frame CPU 0.246 ms, frame CPU (sim frames) 0.254 ms, CPU per 1/60 s sim 0.026 ms, GPU 0.129 ms, draws 5.625.
Per added guard, alert/facing, N 0 -> 24: sim step 0.075 ms, AI manager 0.015 ms, perceive 0.001 ms, frame 0.454 ms, frame CPU 0.429 ms, frame CPU (sim frames) 0.413 ms, CPU per 1/60 s sim -0.007 ms, GPU 0.209 ms, draws 7.833.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 58.1, PostProcessRTT-TAA 52, gBuffer 49, maplight-shadow-#_shadowMap 12.3, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 101.2, PostProcessRTT-TAA 63.8, gBuffer 60.8, maplight-shadow-#_shadowMap 35.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.8 / 1.6 | 0.49 | 0.045 | 0.316 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.382 (100.813) | 0 (0) |
| 0 | alert/facing | 0.7 / 1.5 | 0.485 | 0.043 | 0.297 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.38 (100.817) | 0 (0) |
| 12 | patrol/facing | 1.6 / 2.7 | 0.652 | 0.092 | 1.011 | 0.1 / 0.2 | 0.076 | 0.011 | 0.014 | 0.023 | 0.009 | 0.647 | 0 (0) | 0 | 0.007 (2.215) | 0 (0) | 0 (0) | 0.423 (102.672) | 0 (0) |
| 12 | alert/facing | 1.9 / 4.2 | 0.787 | 0.113 | 1.171 | 0.1 / 0.4 | 0.114 | 0.012 | 0.041 | 0.027 | 0.013 | 0.696 | 0 (0.01) | 0.072 | 0.008 (1.487) | 0 (0) | 0.002 (0.385) | 0.434 (101.13) | 0 (0) |
| 24 | patrol/facing | 2.9 / 4.4 | 0.637 | 0.126 | 1.473 | 0.1 / 0.3 | 0.111 | 0.02 | 0.025 | 0.03 | 0.015 | 1.096 | 0 (0) | 0 | 0.013 (4.45) | 0 (0) | 0 (0) | 0.365 (102.67) | 0 (0) |
| 24 | alert/facing | 2.3 / 4.9 | 0.656 | 0.12 | 1.373 | 0.2 / 0.5 | 0.134 | 0.014 | 0.053 | 0.031 | 0.013 | 0.986 | 0 (0.013) | 0.074 | 0.008 (2.98) | 0 (0) | 0.006 (0.877) | 0.302 (101.138) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.8 / 5.2 | 357.1 | 2.6 / 4.8 | 570 / 2545 | 3.3 / 5.8 | 3.6 / 5.8 | 2.4 / 4.4 | 15.619 | 0.6 | 2 / 3.7 | 3.178 / 4.489 | 115 | 0.211 | 0 | 4 | 92 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.4 / 4.1 | 416.7 | 2.2 / 3.7 | 510 / 2784 | 2.7 / 38 | 3.2 / 4.4 | 2.1 / 3.2 | 15.926 | 0.7 | 1.7 / 2.6 | 3.031 / 3.639 | 52 | 0.204 | 0 | 4 | 14 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3.4 / 5.4 | 294.1 | 3.1 / 5.1 | 601 / 2329 | 3.7 / 5.4 | 4.2 / 5.8 | 2.9 / 4.5 | 15.471 | 0.7 | 2.5 / 3.8 | 3.284 / 4.515 | 115 | 0.211 | 0 | 4 | 92 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 7.2 / 10.9 | 138.9 | 6.9 / 10.5 | 599 / 763 | 7.3 / 11.7 | 7.8 / 11.4 | 6.3 / 9.2 | 16.01 | 0.8 | 5 / 7.6 | 4.902 / 7.055 | 143 | 0.598 | 0 | 4 | 284 | 2 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 6.2 / 8.2 | 161.3 | 5.8 / 7.8 | 604 / 1020 | 6 / 7.6 | 6.6 / 8.2 | 5.5 / 6.9 | 15.756 | 0.9 | 4.2 / 5.4 | 3.478 / 4.569 | 56 | 0.253 | 0 | 4 | 16 | 1.9 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 7.6 / 10.9 | 131.6 | 7.2 / 10.3 | 607 / 707 | 7.5 / 11.3 | 8.1 / 11.1 | 6.6 / 9.2 | 15.672 | 0.8 | 5.4 / 7.5 | 5 / 6.781 | 155 | 0.629 | 1 | 4 | 312 | 2.5 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 9.5 / 13.5 | 105.3 | 9.2 / 13.2 | 606 / 446 | 9.8 / 14.4 | 9.8 / 13.5 | 8.3 / 12.5 | 16.18 | 0.7 | 6.9 / 9.9 | 5.738 / 7.59 | 167 | 1.004 | 0 | 4 | 512 | 3.9 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.2 / 7.9 | 192.3 | 4.9 / 7.6 | 606 / 1278 | 5.2 / 7.7 | 5.9 / 8.5 | 4.6 / 6.9 | 15.848 | 0.7 | 3.8 / 5.5 | 3.127 / 3.827 | 56 | 0.253 | 0 | 4 | 16 | 2.4 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 9.6 / 13.9 | 104.2 | 9.1 / 13.4 | 609 / 433 | 10.1 / 14.5 | 9.9 / 13.7 | 8.2 / 12.2 | 16.021 | 0.7 | 6.8 / 9.7 | 5.755 / 7.481 | 178 | 1.021 | 1 | 4 | 551 | 3.6 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.087 ms, AI manager 0.006 ms, perceive 0.001 ms, frame 0.279 ms, frame CPU 0.275 ms, frame CPU (sim frames) 0.258 ms, CPU per 1/60 s sim 0.023 ms, GPU 0.107 ms, draws 2.167.
Per added guard, alert/facing, N 0 -> 24: sim step 0.067 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.258 ms, frame CPU 0.250 ms, frame CPU (sim frames) 0.238 ms, CPU per 1/60 s sim 0.023 ms, GPU 0.103 ms, draws 2.625.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 61.9, gBuffer 59.9, sun_CSMShadowMap 8.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 74, gBuffer 72, sun_CSMShadowMap 7.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
