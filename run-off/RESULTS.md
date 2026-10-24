# Guard cap: results

Run 2026-10-24T03:51:58.250Z - 2026-10-24T03:58:30.798Z (6.5 min), version 4.80.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.9 | 0.362 | 0.032 | 0.256 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.289 (103.813) | 0 (0) |
| 0 | alert/facing | 0.6 / 1 | 0.376 | 0.03 | 0.265 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.299 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.366 | 0.052 | 0.589 | 0.1 / 0.1 | 0.044 | 0.008 | 0.004 | 0.021 | 0.005 | 0.311 | 0 (0) | 0 | 0.005 (2.25) | 0 (0) | 0 (0) | 0.239 (106.808) | 0 (0) |
| 12 | alert/facing | 1.5 / 3.6 | 0.555 | 0.072 | 0.788 | 0.1 / 0.5 | 0.097 | 0.012 | 0.03 | 0.028 | 0.021 | 0.432 | 0.001 (0.02) | 0.105 | 0.005 (1.553) | 0.015 (4.733) | 0.004 (0.76) | 0.243 (104.752) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2.2 | 0.412 | 0.08 | 0.874 | 0.1 / 0.2 | 0.077 | 0.016 | 0.009 | 0.032 | 0.009 | 0.567 | 0 (0) | 0 | 0.01 (4.475) | 0 (0) | 0 (0) | 0.234 (106.813) | 0 (0) |
| 24 | alert/facing | 1.7 / 3.3 | 0.634 | 0.105 | 1.249 | 0.2 / 0.6 | 0.172 | 0.021 | 0.052 | 0.057 | 0.024 | 0.839 | 0.001 (0.028) | 0.09 | 0.009 (3.048) | 0.015 (5) | 0.006 (1.248) | 0.242 (104.712) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.3 / 3.9 | 434.8 | 2.1 / 3.7 | 483 / 2592 | 2.4 / 53.6 | 2.8 / 4.5 | 2 / 3.1 | 15.876 | 0.4 | 1.7 / 2.5 | 3.516 / 4.032 | 104 | 0.494 | 1 | 4 | 121 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.3 / 3.5 | 434.8 | 2.1 / 3.3 | 565 / 3068 | 2.3 / 27.7 | 2.7 / 3.9 | 2 / 2.9 | 15.532 | 0.5 | 1.6 / 2.3 | 2.64 / 2.939 | 77 | 0.473 | 1 | 4 | 23 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.4 / 3.8 | 416.7 | 2.2 / 3.6 | 505 / 2549 | 2.5 / 46.4 | 2.9 / 4.2 | 2.1 / 3.1 | 15.747 | 0.4 | 1.7 / 2.5 | 3.452 / 3.929 | 104 | 0.494 | 1 | 4 | 122 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.7 / 5.9 | 212.8 | 4.5 / 5.7 | 606 / 1496 | 4.6 / 5.5 | 5.1 / 6 | 4.3 / 5.2 | 15.919 | 0.6 | 3.4 / 4.1 | 4.292 / 5.261 | 187 | 1.489 | 2 | 5 | 293 | 1.4 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.8 / 4.9 | 263.2 | 3.6 / 4.6 | 605 / 1959 | 3.8 / 4.7 | 4.3 / 5 | 3.5 / 4.3 | 15.833 | 0.5 | 2.8 / 3.4 | 3.411 / 4.201 | 155 | 1.317 | 5 | 8 | 27 | 1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.7 / 7.3 | 175.4 | 5.2 / 6.5 | 605 / 1116 | 5.5 / 6.6 | 5.8 / 7.5 | 4.9 / 5.9 | 15.088 | 0.6 | 3.7 / 4.5 | 5.053 / 5.819 | 224 | 1.871 | 4 | 7 | 372 | 1.4 | 2 / 2 | 4 of 4 | alert 12 -> alert 10, searching 2 |
| 24 | patrol/facing | 6.4 / 7.7 | 156.3 | 6.1 / 7.5 | 605 / 958 | 6.1 / 7.4 | 6.7 / 8 | 5.8 / 6.9 | 16.086 | 0.6 | 4.6 / 5.5 | 5.011 / 5.74 | 258 | 2.481 | 2 | 5 | 488 | 2.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.4 / 6.6 | 185.2 | 5.2 / 6.3 | 605 / 1254 | 5.2 / 6.2 | 5.7 / 6.6 | 4.9 / 5.8 | 16.015 | 0.6 | 4.1 / 4.8 | 4.084 / 4.764 | 227 | 2.263 | 5 | 8 | 27 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8 / 9.4 | 125 | 7.4 / 8.7 | 608 / 653 | 7.6 / 9.2 | 7.8 / 9.3 | 6.9 / 8 | 15.41 | 0.7 | 5.2 / 6.1 | 5.533 / 6.339 | 278 | 2.649 | 5 | 8 | 584 | 2.3 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.037 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.171 ms, frame CPU 0.167 ms, frame CPU (sim frames) 0.163 ms, CPU per 1/60 s sim 0.009 ms, GPU 0.062 ms, draws 6.417.
Per added guard, alert/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.013 ms, perceive 0.001 ms, frame 0.233 ms, frame CPU 0.217 ms, frame CPU (sim frames) 0.204 ms, CPU per 1/60 s sim -0.014 ms, GPU 0.087 ms, draws 7.250.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 51.5, gBuffer 48.5, maplight-shadow-#_shadowMap 33.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.8, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 91.3, PostProcessRTT-TAA 63.6, gBuffer 60.6, maplight-shadow-#_shadowMap 27.5, charshadow-#_shadowMap 10.2, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.8 | 0.311 | 0.03 | 0.217 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.233 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.298 | 0.026 | 0.21 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.238 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.409 | 0.067 | 0.706 | 0.1 / 0.2 | 0.07 | 0.015 | 0.009 | 0.03 | 0.004 | 0.41 | 0 (0) | 0 | 0.005 (2.225) | 0 (0) | 0 (0) | 0.241 (104.267) | 0 (0) |
| 12 | alert/facing | 1.4 / 2.8 | 2.286 | 0.071 | 0.787 | 0.1 / 0.3 | 0.098 | 0.011 | 0.029 | 0.033 | 0.025 | 0.447 | 0 (0.018) | 1.851 | 0.005 (1.492) | 0.017 (5) | 0.004 (0.597) | 0.216 (105.302) | 0 (0) |
| 24 | patrol/facing | 1.6 / 2.1 | 0.453 | 0.094 | 1.023 | 0.1 / 0.2 | 0.106 | 0.016 | 0.018 | 0.048 | 0.008 | 0.703 | 0 (0) | 0 | 0.01 (4.46) | 0 (0) | 0 (0) | 0.243 (104.258) | 0 (0) |
| 24 | alert/facing | 1.9 / 3.8 | 2.394 | 0.116 | 1.131 | 0.2 / 0.5 | 0.173 | 0.024 | 0.057 | 0.052 | 0.024 | 0.73 | 0.001 (0.017) | 1.86 | 0.011 (3.005) | 0.017 (5) | 0.009 (1.63) | 0.236 (105.18) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.8 / 3.4 | 555.6 | 1.7 / 3.1 | 470 / 3043 | 1.9 / 55.3 | 2.4 / 4.1 | 1.6 / 2.5 | 16.041 | 0.4 | 1.3 / 2.1 | 2.927 / 3.233 | 87 | 0.473 | 1 | 4 | 212 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.6 / 3.1 | 625 | 1.5 / 2.9 | 424 / 3174 | 1.7 / 66.1 | 2.2 / 4.1 | 1.4 / 2.3 | 16.348 | 0.4 | 1.1 / 1.8 | 2.758 / 2.782 | 76 | 0.464 | 1 | 4 | 22 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2 / 3.3 | 500 | 1.8 / 3 | 466 / 2908 | 2.1 / 55.5 | 2.5 / 4 | 1.8 / 2.6 | 16.056 | 0.4 | 1.4 / 2.1 | 2.926 / 3.317 | 87 | 0.473 | 1 | 4 | 212 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.9 / 6.2 | 204.1 | 4.7 / 5.9 | 606 / 1415 | 4.8 / 5.9 | 5.2 / 6.4 | 4.5 / 5.6 | 15.996 | 0.5 | 3.5 / 4.3 | 3.855 / 4.588 | 173 | 1.524 | 2 | 5 | 440 | 1.6 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.7 / 4.7 | 270.3 | 3.6 / 4.5 | 603 / 2063 | 3.6 / 4.4 | 4.1 / 4.7 | 3.4 / 4.1 | 15.842 | 0.5 | 2.8 / 3.3 | 3.141 / 3.715 | 139 | 1.17 | 2 | 5 | 24 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.7 / 7.2 | 175.4 | 5.1 / 6.5 | 544 / 996 | 5.4 / 7.3 | 5.7 / 8.3 | 4.9 / 5.7 | 15.289 | 0.6 | 3.8 / 4.5 | 4.451 / 5.136 | 187 | 1.571 | 4 | 7 | 340 | 1.6 | 2 / 2 | 4 of 4 | alert 12 -> alert 10, searching 2 |
| 24 | patrol/facing | 6.8 / 8.1 | 147.1 | 6.6 / 7.8 | 605 / 872 | 6.5 / 7.6 | 7.1 / 8.1 | 6.2 / 7.2 | 16.11 | 0.6 | 4.7 / 5.6 | 4.477 / 5.077 | 236 | 2.42 | 2 | 5 | 668 | 2.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4.8 / 6 | 208.3 | 4.6 / 5.7 | 606 / 1455 | 4.6 / 5.5 | 5.2 / 6 | 4.4 / 5.2 | 15.932 | 0.6 | 3.6 / 4.3 | 3.734 / 4.453 | 172 | 1.583 | 2 | 5 | 24 | 1.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.5 / 9.5 | 133.3 | 7 / 8.8 | 542 / 628 | 7.2 / 9.1 | 7.5 / 10.4 | 6.5 / 7.6 | 15.699 | 0.7 | 5.1 / 6 | 5.079 / 5.853 | 278 | 2.776 | 4 | 7 | 570 | 2.2 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.208 ms, frame CPU 0.204 ms, frame CPU (sim frames) 0.196 ms, CPU per 1/60 s sim 0.003 ms, GPU 0.065 ms, draws 6.208.
Per added guard, alert/facing, N 0 -> 24: sim step 0.058 ms, AI manager 0.087 ms, perceive 0.001 ms, frame 0.229 ms, frame CPU 0.217 ms, frame CPU (sim frames) 0.208 ms, CPU per 1/60 s sim -0.015 ms, GPU 0.090 ms, draws 7.958.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 26, gBuffer 24, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 55.2, PostProcessRTT-TAA 38, gBuffer 36, maplight-shadow-#_shadowMap 26.1, charshadow-#_shadowMap 5.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 100.8, PostProcessRTT-TAA 49.8, gBuffer 47.8, maplight-shadow-#_shadowMap 45.2, charshadow-#_shadowMap 7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
