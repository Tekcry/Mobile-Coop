# Guard cap: results

Run 2026-10-24T03:05:25.175Z - 2026-10-24T03:12:03.148Z (6.6 min), version 4.80.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.9 | 0.308 | 0.03 | 0.221 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.234 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.335 | 0.029 | 0.226 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.265 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.393 | 0.059 | 0.623 | 0.1 / 0.2 | 0.055 | 0.01 | 0.006 | 0.022 | 0.006 | 0.341 | 0 (0) | 0 | 0.005 (2.26) | 0 (0) | 0 (0) | 0.251 (106.808) | 0 (0) |
| 12 | alert/facing | 1.5 / 3.3 | 0.547 | 0.067 | 0.737 | 0.1 / 0.5 | 0.099 | 0.011 | 0.038 | 0.031 | 0.024 | 0.418 | 0 (0.013) | 0.101 | 0.006 (1.512) | 0.014 (4.717) | 0.003 (0.658) | 0.233 (105.013) | 0 (0) |
| 24 | patrol/facing | 1.9 / 2.6 | 0.593 | 0.137 | 1.443 | 0.1 / 0.3 | 0.115 | 0.024 | 0.015 | 0.046 | 0.015 | 0.898 | 0 (0) | 0 | 0.014 (4.475) | 0 (0) | 0 (0) | 0.312 (106.822) | 0 (0) |
| 24 | alert/facing | 2.9 / 5.7 | 0.709 | 0.142 | 1.568 | 0.2 / 0.6 | 0.198 | 0.019 | 0.063 | 0.07 | 0.031 | 1.01 | 0.002 (0.025) | 0.09 | 0.008 (2.99) | 0.015 (4.683) | 0.009 (1.585) | 0.259 (104.597) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.5 / 5.8 | 400 | 2.3 / 5.4 | 515 / 2304 | 2.7 / 43.4 | 3.2 / 6.9 | 2.2 / 4.8 | 15.751 | 0.5 | 1.8 / 4.1 | 3.438 / 3.771 | 104 | 0.494 | 1 | 4 | 122 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2 / 3.5 | 500 | 1.8 / 3.3 | 502 / 3136 | 2.2 / 48.3 | 2.6 / 4 | 1.7 / 2.9 | 15.761 | 0.4 | 1.4 / 2.3 | 2.644 / 2.904 | 77 | 0.473 | 1 | 4 | 23 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.1 / 4.2 | 476.2 | 2 / 3.9 | 443 / 2561 | 2.2 / 61.1 | 2.6 / 4.3 | 1.9 / 3.2 | 16.063 | 0.4 | 1.5 / 2.6 | 3.451 / 3.579 | 104 | 0.494 | 1 | 4 | 122 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.6 / 5.8 | 217.4 | 4.4 / 5.6 | 604 / 1546 | 4.5 / 5.6 | 4.9 / 5.9 | 4.2 / 5.2 | 15.942 | 0.5 | 3.3 / 4.1 | 4.186 / 5.224 | 187 | 1.489 | 2 | 5 | 293 | 1.4 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.8 / 4.9 | 263.2 | 3.6 / 4.7 | 603 / 1957 | 3.7 / 4.7 | 4.2 / 5.3 | 3.5 / 4.3 | 15.858 | 0.5 | 2.8 / 3.5 | 3.339 / 4.126 | 155 | 1.317 | 4 | 8 | 27 | 1.1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.8 / 7.3 | 172.4 | 5.2 / 6.6 | 604 / 1100 | 5.6 / 6.8 | 5.8 / 7.4 | 4.9 / 6.1 | 15.044 | 0.6 | 3.8 / 4.6 | 5.137 / 5.908 | 218 | 1.821 | 4 | 7 | 369 | 1.4 | 2 / 2 | 3 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 7.5 / 9.2 | 133.3 | 7.2 / 8.9 | 608 / 723 | 7.2 / 8.8 | 7.7 / 9.5 | 6.8 / 8.2 | 16.095 | 0.6 | 5.4 / 6.6 | 5.162 / 6.052 | 258 | 2.481 | 2 | 5 | 488 | 2.4 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 6 / 7.5 | 166.7 | 5.8 / 7.2 | 607 / 1058 | 5.8 / 7 | 6.4 / 7.5 | 5.5 / 6.6 | 16.013 | 0.6 | 4.5 / 5.4 | 4.286 / 5.15 | 228 | 2.275 | 5 | 8 | 27 | 1.9 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.3 / 9.9 | 120.5 | 7.7 / 9.2 | 609 / 599 | 7.8 / 9.6 | 8.1 / 9.7 | 7.2 / 8.4 | 15.414 | 0.7 | 5.5 / 6.3 | 5.458 / 6.426 | 295 | 2.822 | 5 | 8 | 564 | 2.3 | 2 / 2 | 4 of 4 | alert 24 -> searching 6, alert 18 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.058 ms, AI manager 0.006 ms, perceive 0.001 ms, frame 0.208 ms, frame CPU 0.204 ms, frame CPU (sim frames) 0.188 ms, CPU per 1/60 s sim 0.014 ms, GPU 0.072 ms, draws 6.417.
Per added guard, alert/facing, N 0 -> 24: sim step 0.100 ms, AI manager 0.014 ms, perceive 0.001 ms, frame 0.258 ms, frame CPU 0.238 ms, frame CPU (sim frames) 0.229 ms, CPU per 1/60 s sim -0.027 ms, GPU 0.084 ms, draws 7.958.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 50.5, gBuffer 47.5, maplight-shadow-#_shadowMap 30.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.8, charshadow-#_shadowMap 1.4, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 94.7, PostProcessRTT-TAA 62.6, gBuffer 59.6, maplight-shadow-#_shadowMap 42.4, charshadow-#_shadowMap 8.3, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.9 | 0.33 | 0.028 | 0.233 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.26 (103.808) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.319 | 0.026 | 0.21 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.251 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.415 | 0.069 | 0.731 | 0.1 / 0.2 | 0.075 | 0.014 | 0.013 | 0.03 | 0.005 | 0.418 | 0 (0) | 0 | 0.008 (2.23) | 0 (0) | 0 (0) | 0.232 (104.258) | 0 (0) |
| 12 | alert/facing | 1.4 / 2.4 | 2.39 | 0.078 | 0.847 | 0.1 / 0.4 | 0.119 | 0.01 | 0.039 | 0.044 | 0.024 | 0.457 | 0.001 (0.015) | 1.913 | 0.004 (1.51) | 0.017 (4.942) | 0.004 (0.74) | 0.224 (105.2) | 0 (0) |
| 24 | patrol/facing | 1.8 / 2.5 | 0.456 | 0.091 | 1.017 | 0.1 / 0.2 | 0.105 | 0.02 | 0.013 | 0.048 | 0.007 | 0.691 | 0 (0) | 0 | 0.011 (4.485) | 0 (0) | 0 (0) | 0.243 (104.267) | 0 (0) |
| 24 | alert/facing | 2.2 / 3.6 | 2.8 | 0.166 | 1.739 | 0.3 / 0.6 | 0.232 | 0.031 | 0.079 | 0.075 | 0.032 | 1.075 | 0.001 (0.027) | 2.082 | 0.012 (3.072) | 0.017 (5) | 0.009 (1.647) | 0.298 (105.33) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.3 / 4.3 | 434.8 | 2.1 / 3.6 | 572 / 2783 | 2.4 / 24.8 | 2.8 / 4.2 | 2 / 3.1 | 14.718 | 0.45 | 1.6 / 2.4 | 3.049 / 3.605 | 87 | 0.473 | 1 | 4 | 212 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2 / 5.9 | 500 | 1.8 / 5.7 | 555 / 2930 | 2.2 / 26.6 | 2.6 / 5.7 | 1.7 / 5.1 | 15.676 | 0.5 | 1.4 / 4.7 | 2.849 / 3.157 | 76 | 0.464 | 1 | 4 | 22 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.1 / 5 | 476.2 | 2 / 3.8 | 550 / 2739 | 2.4 / 25.8 | 2.8 / 4.6 | 1.9 / 3.5 | 14.515 | 0.4 | 1.5 / 2.7 | 3.012 / 3.301 | 87 | 0.473 | 1 | 4 | 212 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5 / 6.5 | 200 | 4.8 / 6.2 | 603 / 1358 | 4.9 / 6.1 | 5.4 / 6.7 | 4.6 / 5.7 | 15.983 | 0.6 | 3.6 / 4.5 | 4.053 / 4.844 | 173 | 1.524 | 2 | 5 | 440 | 1.5 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.8 / 4.9 | 263.2 | 3.6 / 4.6 | 606 / 2003 | 3.7 / 4.6 | 4.2 / 5 | 3.4 / 4.2 | 15.811 | 0.5 | 2.8 / 3.4 | 3.32 / 4.013 | 139 | 1.17 | 2 | 5 | 24 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.8 / 7.7 | 172.4 | 5.3 / 7 | 540 / 945 | 5.6 / 8.5 | 5.9 / 8.9 | 5 / 6 | 15.503 | 0.6 | 3.9 / 4.8 | 4.62 / 5.459 | 179 | 1.498 | 4 | 7 | 350 | 1.6 | 2 / 2 | 3 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 7.4 / 8.8 | 135.1 | 7.2 / 8.5 | 606 / 752 | 7.1 / 8.5 | 7.6 / 8.9 | 6.8 / 8 | 16.135 | 0.6 | 5.2 / 6.2 | 4.761 / 5.564 | 236 | 2.42 | 2 | 5 | 668 | 2.5 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.4 / 6.7 | 185.2 | 5.2 / 6.4 | 605 / 1234 | 5.2 / 6.2 | 5.8 / 6.8 | 4.9 / 5.8 | 15.986 | 0.6 | 4 / 4.8 | 3.981 / 4.803 | 172 | 1.583 | 2 | 5 | 24 | 1.8 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 9.6 / 12.9 | 104.2 | 8.9 / 12.1 | 536 / 378 | 9.2 / 13.8 | 9.4 / 13.5 | 8.2 / 9.8 | 16.141 | 0.8 | 6.4 / 7.7 | 5.786 / 6.92 | 246 | 2.417 | 3 | 6 | 581 | 2.6 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.213 ms, frame CPU 0.212 ms, frame CPU (sim frames) 0.200 ms, CPU per 1/60 s sim 0.059 ms, GPU 0.071 ms, draws 6.208.
Per added guard, alert/facing, N 0 -> 24: sim step 0.071 ms, AI manager 0.099 ms, perceive 0.001 ms, frame 0.313 ms, frame CPU 0.288 ms, frame CPU (sim frames) 0.275 ms, CPU per 1/60 s sim 0.068 ms, GPU 0.116 ms, draws 6.625.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 26, gBuffer 24, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 56.9, PostProcessRTT-TAA 36.4, gBuffer 34.4, maplight-shadow-#_shadowMap 16.5, charshadow-#_shadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 99.1, PostProcessRTT-TAA 48.8, gBuffer 46.8, maplight-shadow-#_shadowMap 19.7, charshadow-#_shadowMap 7.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
