# Guard cap: results

Run 2026-10-24T02:58:51.102Z - 2026-10-24T03:05:24.179Z (6.6 min), version 4.80.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 1 | 0.359 | 0.033 | 0.264 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.275 (103.808) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.307 | 0.024 | 0.214 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.246 (103.813) | 0 (0) |
| 12 | patrol/facing | 1 / 1.5 | 0.361 | 0.053 | 0.579 | 0.1 / 0.1 | 0.045 | 0.008 | 0.007 | 0.018 | 0.004 | 0.316 | 0 (0) | 0 | 0.004 (2.24) | 0 (0) | 0 (0) | 0.233 (106.808) | 0 (0) |
| 12 | alert/facing | 1.4 / 2.6 | 0.56 | 0.08 | 0.897 | 0.1 / 0.5 | 0.102 | 0.013 | 0.034 | 0.03 | 0.025 | 0.499 | 0.002 (0.027) | 0.091 | 0.005 (1.563) | 0.015 (4.892) | 0.003 (0.692) | 0.237 (104.82) | 0 (0) |
| 24 | patrol/facing | 1.6 / 2.3 | 0.441 | 0.085 | 0.972 | 0.1 / 0.2 | 0.088 | 0.017 | 0.011 | 0.031 | 0.011 | 0.63 | 0 (0) | 0 | 0.011 (4.48) | 0 (0) | 0 (0) | 0.252 (106.813) | 0 (0) |
| 24 | alert/facing | 2.1 / 3.1 | 0.689 | 0.128 | 1.522 | 0.2 / 0.7 | 0.192 | 0.023 | 0.059 | 0.063 | 0.03 | 1.023 | 0.002 (0.033) | 0.096 | 0.011 (3.07) | 0.015 (5) | 0.004 (1.095) | 0.259 (105.292) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.5 / 3.9 | 400 | 2.3 / 3.6 | 519 / 2581 | 2.5 / 40.5 | 2.9 / 4.1 | 2.2 / 3.1 | 15.775 | 0.45 | 1.8 / 2.6 | 3.395 / 3.81 | 104 | 0.494 | 1 | 4 | 121 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.9 / 3.3 | 526.3 | 1.8 / 3.1 | 511 / 3185 | 2 / 44.2 | 2.5 / 3.9 | 1.7 / 2.6 | 15.71 | 0.4 | 1.4 / 2.1 | 2.598 / 2.681 | 77 | 0.473 | 1 | 4 | 23 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.3 / 3.9 | 434.8 | 2.1 / 3.6 | 462 / 2558 | 2.4 / 56.9 | 2.8 / 4.2 | 2 / 3.1 | 15.984 | 0.4 | 1.7 / 2.5 | 3.394 / 3.528 | 104 | 0.494 | 1 | 4 | 122 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.9 / 6 | 204.1 | 4.7 / 5.8 | 607 / 1432 | 4.8 / 5.7 | 5.2 / 6.1 | 4.5 / 5.3 | 15.939 | 0.5 | 3.6 / 4.3 | 4.47 / 5.274 | 187 | 1.052 | 2 | 5 | 293 | 1.4 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.1 / 5.2 | 243.9 | 3.9 / 4.9 | 603 / 1821 | 4 / 4.9 | 4.5 / 5.2 | 3.7 / 4.6 | 15.848 | 0.5 | 3 / 3.7 | 3.558 / 4.207 | 155 | 1.016 | 5 | 8 | 27 | 1.2 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.1 / 7.6 | 163.9 | 5.5 / 7 | 604 / 1022 | 5.8 / 7.4 | 6 / 8 | 5.2 / 6.4 | 15.122 | 0.6 | 4 / 5 | 5.326 / 6.298 | 228 | 1.109 | 4 | 7 | 373 | 1.5 | 2 / 2 | 3 of 4 | alert 12 -> alert 11, searching 1 |
| 24 | patrol/facing | 7.3 / 8.9 | 137 | 7.1 / 8.6 | 605 / 752 | 7 / 8.6 | 7.5 / 9 | 6.7 / 8 | 16.149 | 0.6 | 5.3 / 6.5 | 5.587 / 6.395 | 258 | 1.411 | 2 | 5 | 488 | 2.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 6 / 7.1 | 166.7 | 5.7 / 6.9 | 605 / 1071 | 5.7 / 6.7 | 6.3 / 7.1 | 5.5 / 6.4 | 16.041 | 0.6 | 4.5 / 5.2 | 4.609 / 5.273 | 227 | 1.604 | 5 | 8 | 27 | 1.9 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 9.1 / 11.5 | 109.9 | 8.5 / 10.9 | 607 / 478 | 8.8 / 11.7 | 8.9 / 11.7 | 8 / 9.7 | 15.531 | 0.7 | 6.1 / 7.5 | 6.192 / 7.517 | 286 | 1.395 | 5 | 8 | 577 | 2.3 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.200 ms, frame CPU 0.200 ms, frame CPU (sim frames) 0.192 ms, CPU per 1/60 s sim 0.016 ms, GPU 0.091 ms, draws 6.417.
Per added guard, alert/facing, N 0 -> 24: sim step 0.067 ms, AI manager 0.014 ms, perceive 0.001 ms, frame 0.283 ms, frame CPU 0.267 ms, frame CPU (sim frames) 0.254 ms, CPU per 1/60 s sim -0.019 ms, GPU 0.117 ms, draws 7.583.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 51.5, gBuffer 48.5, maplight-shadow-#_shadowMap 30.5, charshadow-#_shadowMap 5.8, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 94, PostProcessRTT-TAA 62.7, gBuffer 59.7, maplight-shadow-#_shadowMap 29.8, charshadow-#_shadowMap 12, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.8 | 0.297 | 0.032 | 0.223 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.226 (103.813) | 0 (0) |
| 0 | alert/facing | 0.6 / 0.9 | 0.316 | 0.026 | 0.223 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.251 (103.822) | 0 (0) |
| 12 | patrol/facing | 1.5 / 2.8 | 0.457 | 0.088 | 0.882 | 0.1 / 0.2 | 0.081 | 0.013 | 0.01 | 0.034 | 0.006 | 0.49 | 0 (0) | 0 | 0.007 (2.245) | 0 (0) | 0 (0) | 0.251 (104.258) | 0 (0) |
| 12 | alert/facing | 1.7 / 3.5 | 2.54 | 0.087 | 0.937 | 0.2 / 0.3 | 0.121 | 0.013 | 0.048 | 0.035 | 0.025 | 0.503 | 0.001 (0.018) | 2.032 | 0.005 (1.505) | 0.015 (4.783) | 0.004 (0.695) | 0.256 (105.118) | 0 (0) |
| 24 | patrol/facing | 1.7 / 2.3 | 0.457 | 0.105 | 1.007 | 0.1 / 0.2 | 0.111 | 0.024 | 0.013 | 0.049 | 0.005 | 0.684 | 0 (0) | 0 | 0.011 (4.485) | 0 (0) | 0 (0) | 0.24 (104.267) | 0 (0) |
| 24 | alert/facing | 2.2 / 3.8 | 2.402 | 0.116 | 1.253 | 0.2 / 0.5 | 0.184 | 0.02 | 0.065 | 0.065 | 0.027 | 0.801 | 0.001 (0.017) | 1.845 | 0.009 (2.998) | 0.018 (5) | 0.009 (1.673) | 0.24 (105.165) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.4 / 3.9 | 416.7 | 2.3 / 3.6 | 586 / 2978 | 2.5 / 16.7 | 2.9 / 4.3 | 2.2 / 3.3 | 15.63 | 0.5 | 1.8 / 2.7 | 2.869 / 3.119 | 87 | 0.473 | 1 | 4 | 212 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.6 / 3.8 | 384.6 | 2.4 / 3.5 | 604 / 3129 | 2.6 / 3.9 | 3 / 4.3 | 2.3 / 3.3 | 15.377 | 0.5 | 1.8 / 2.7 | 2.637 / 2.938 | 76 | 0.464 | 1 | 4 | 22 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.8 / 4.1 | 357.1 | 2.6 / 3.8 | 593 / 2766 | 2.8 / 4.2 | 3.2 / 4.5 | 2.5 / 3.5 | 15.479 | 0.5 | 2.1 / 2.9 | 2.848 / 3.346 | 87 | 0.473 | 1 | 4 | 212 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.5 / 7.4 | 181.8 | 5.2 / 7.1 | 605 / 1183 | 5.4 / 7.4 | 5.7 / 7.7 | 5 / 6.7 | 15.98 | 0.6 | 3.9 / 5.3 | 4.31 / 5.275 | 173 | 0.859 | 2 | 5 | 440 | 1.5 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4 / 5.2 | 250 | 3.8 / 4.9 | 603 / 1849 | 3.9 / 5 | 4.4 / 5.3 | 3.7 / 4.5 | 15.827 | 0.5 | 2.9 / 3.6 | 3.483 / 4.124 | 139 | 0.84 | 2 | 5 | 24 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.6 / 9 | 151.5 | 6.1 / 8.2 | 537 / 754 | 6.4 / 9.2 | 6.6 / 10.2 | 5.8 / 7.1 | 15.699 | 0.7 | 4.5 / 5.8 | 4.893 / 5.914 | 188 | 0.927 | 3 | 6 | 364 | 1.6 | 2 / 2 | 4 of 4 | alert 12 -> alert 10, searching 2 |
| 24 | patrol/facing | 8.1 / 9.7 | 123.5 | 7.8 / 9.4 | 608 / 629 | 7.8 / 9.6 | 8.2 / 9.7 | 7.4 / 8.7 | 16.137 | 0.6 | 5.8 / 6.9 | 5.147 / 5.972 | 236 | 1.177 | 2 | 5 | 668 | 2.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.5 / 6.8 | 181.8 | 5.2 / 6.5 | 604 / 1207 | 5.3 / 6.5 | 5.8 / 6.9 | 5 / 5.9 | 15.959 | 0.6 | 4 / 4.9 | 3.972 / 4.793 | 172 | 0.963 | 2 | 5 | 24 | 2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.8 / 11.9 | 113.6 | 8.2 / 10.9 | 541 / 460 | 8.4 / 11.9 | 8.6 / 13 | 7.6 / 8.8 | 15.82 | 0.7 | 6.1 / 7.3 | 5.606 / 6.849 | 259 | 1.263 | 4 | 7 | 549 | 2.5 | 2 / 2 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.237 ms, frame CPU 0.229 ms, frame CPU (sim frames) 0.221 ms, CPU per 1/60 s sim 0.021 ms, GPU 0.095 ms, draws 6.208.
Per added guard, alert/facing, N 0 -> 24: sim step 0.067 ms, AI manager 0.087 ms, perceive 0.001 ms, frame 0.250 ms, frame CPU 0.233 ms, frame CPU (sim frames) 0.225 ms, CPU per 1/60 s sim 0.014 ms, GPU 0.115 ms, draws 7.167.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 26, gBuffer 24, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 57.3, PostProcessRTT-TAA 38.1, gBuffer 36.1, maplight-shadow-#_shadowMap 22.7, charshadow-#_shadowMap 5.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 101, PostProcessRTT-TAA 48.8, gBuffer 46.8, maplight-shadow-#_shadowMap 23.2, charshadow-#_shadowMap 8.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
