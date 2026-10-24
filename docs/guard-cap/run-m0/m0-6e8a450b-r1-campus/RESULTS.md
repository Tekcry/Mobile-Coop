# Guard cap: results

Run 2026-10-24T09:32:08.360Z - 2026-10-24T09:39:14.503Z (7.1 min), version 4.93.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.8 | 0.278 | 0.022 | 0.206 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.21 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.296 | 0.022 | 0.194 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.227 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.3 / 1.9 | 0.36 | 0.052 | 0.541 | 0.1 / 0.2 | 0.059 | 0.007 | 0.008 | 0.029 | 0.008 | 0.312 | 0 (0) | 0 | 0.003 (1.27) | 0 (0) | 0 (0) | 0.201 (104.267) | 0 (0) |
| 12 | alert/facing | 1.1 / 1.5 | 0.41 | 0.06 | 0.486 | 0.1 / 0.3 | 0.096 | 0.012 | 0.029 | 0.036 | 0.021 | 0.195 | 0.001 (0.017) | 0 | 0.006 (1.493) | 0.014 (5) | 0.003 (0.578) | 0.205 (105.042) | 0 (0) |
| 16 | patrol/facing | 1.5 / 2.3 | 0.385 | 0.067 | 0.735 | 0.1 / 0.2 | 0.07 | 0.008 | 0.01 | 0.032 | 0.007 | 0.483 | 0 (0) | 0 | 0.003 (1.295) | 0 (0) | 0 (0) | 0.205 (104.258) | 0 (0) |
| 16 | alert/facing | 1.1 / 1.6 | 0.493 | 0.084 | 0.917 | 0.2 / 0.3 | 0.143 | 0.017 | 0.05 | 0.052 | 0.025 | 0.526 | 0 (0.013) | 0 | 0.007 (1.99) | 0.014 (4.958) | 0.006 (1.082) | 0.21 (104.972) | 0 (0) |
| 24 | patrol/facing | 1.9 / 2.5 | 0.406 | 0.078 | 0.787 | 0.1 / 0.2 | 0.09 | 0.008 | 0.013 | 0.049 | 0.009 | 0.544 | 0 (0) | 0 | 0.003 (1.5) | 0 (0) | 0 (0) | 0.212 (104.258) | 0 (0) |
| 24 | alert/facing | 1.6 / 2.3 | 0.515 | 0.099 | 0.954 | 0.2 / 0.4 | 0.177 | 0.019 | 0.062 | 0.063 | 0.022 | 0.598 | 0.001 (0.018) | 0 | 0.009 (2.96) | 0.013 (5) | 0.008 (1.848) | 0.212 (104.858) | 0 (0) |
| 32 | patrol/facing | 1.5 / 2.1 | 0.489 | 0.108 | 1.082 | 0.2 / 0.3 | 0.131 | 0.011 | 0.022 | 0.069 | 0.019 | 0.791 | 0 (0) | 0 | 0.004 (1.93) | 0 (0) | 0 (0) | 0.217 (104.267) | 0 (0) |
| 32 | alert/facing | 2.4 / 4 | 0.67 | 0.158 | 1.519 | 0.3 / 0.5 | 0.235 | 0.026 | 0.075 | 0.089 | 0.035 | 0.993 | 0 (0.013) | 0 | 0.012 (3.963) | 0.017 (5) | 0.011 (2.673) | 0.245 (104.673) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.2 / 4.5 | 312.5 | 3 / 4.3 | 603 / 2348 | 3.2 / 15.2 | 3.6 / 4.6 | 2.9 / 3.9 | 15.82 | 0.4 | 2.5 / 3.4 | 3.367 / 3.796 | 267 | 0.88 | 2 | 5 | 300 | 0.6 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.7 / 3.5 | 588.2 | 1.6 / 3.3 | 460 / 2911 | 1.9 / 55.7 | 2.3 / 4 | 1.5 / 2.4 | 16.014 | 0.4 | 1.3 / 2 | 2.98 / 3.079 | 88 | 0.537 | 2 | 5 | 26 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3 / 4.9 | 333.3 | 2.9 / 4.7 | 592 / 2266 | 3.2 / 17.7 | 3.6 / 5 | 2.7 / 4.2 | 15.829 | 0.4 | 2.4 / 3.7 | 3.6 / 3.714 | 267 | 0.88 | 2 | 5 | 300 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5 / 6.1 | 200 | 4.8 / 5.9 | 604 / 1403 | 4.8 / 5.9 | 5.3 / 6.3 | 4.5 / 5.5 | 16.022 | 0.5 | 3.7 / 4.5 | 4.825 / 5.433 | 341 | 2.001 | 2 | 5 | 323 | 1.3 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 2.9 / 4.2 | 344.8 | 2.7 / 4 | 600 / 2699 | 2.9 / 4.7 | 3.5 / 4.4 | 2.6 / 3.5 | 15.741 | 0.5 | 2.2 / 2.9 | 3.117 / 3.187 | 112 | 0.84 | 2 | 5 | 28 | 0.9 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.6 / 6.9 | 178.6 | 5.2 / 6.3 | 605 / 1159 | 5.5 / 6.5 | 5.8 / 6.7 | 4.9 / 5.8 | 15.255 | 0.6 | 4.1 / 4.8 | 5.319 / 6.201 | 347 | 1.755 | 4 | 7 | 366 | 1.3 | 0 / 0 | 4 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 5.7 / 6.9 | 175.4 | 5.5 / 6.7 | 606 / 1152 | 5.5 / 6.4 | 6.1 / 6.9 | 5.2 / 6.1 | 16.062 | 0.6 | 4.2 / 4.9 | 4.912 / 5.448 | 361 | 2.364 | 2 | 5 | 331 | 1.7 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 2.9 / 4.1 | 344.8 | 2.7 / 3.9 | 595 / 2724 | 2.9 / 4.1 | 3.5 / 4.3 | 2.6 / 3.4 | 15.794 | 0.5 | 2.2 / 2.8 | 3.063 / 3.405 | 112 | 0.84 | 2 | 5 | 28 | 0.8 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 6.5 / 7.8 | 153.8 | 6 / 7.3 | 606 / 934 | 6.3 / 7.2 | 6.6 / 7.5 | 5.7 / 6.6 | 15.437 | 0.6 | 4.7 / 5.4 | 5.577 / 6.316 | 376 | 2.283 | 3 | 6 | 398 | 1.5 | 0 / 0 | 2 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 6.7 / 7.9 | 149.3 | 6.4 / 7.7 | 606 / 904 | 6.4 / 7.5 | 6.9 / 7.9 | 6.1 / 7.1 | 16.146 | 0.6 | 4.8 / 5.6 | 4.628 / 5.225 | 401 | 3.04 | 2 | 5 | 346 | 2.1 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3.3 / 4.3 | 303 | 3.1 / 4.1 | 603 / 2403 | 3.2 / 4 | 3.8 / 4.4 | 3 / 3.6 | 15.77 | 0.5 | 2.5 / 3 | 2.986 / 3.656 | 112 | 0.84 | 2 | 5 | 28 | 1.4 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.4 / 8.7 | 135.1 | 6.9 / 8.1 | 605 / 752 | 7 / 8 | 7.4 / 8.4 | 6.4 / 7.3 | 15.45 | 0.7 | 5.2 / 6 | 5.845 / 6.505 | 426 | 3.018 | 4 | 7 | 399 | 1.9 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |
| 32 | patrol/facing | 7.4 / 8.8 | 135.1 | 7.2 / 8.6 | 605 / 755 | 7 / 8.2 | 7.7 / 8.8 | 6.7 / 7.8 | 16.18 | 0.6 | 5.3 / 6.2 | 5.354 / 6.12 | 437 | 3.603 | 1 | 4 | 359 | 2.4 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 3.4 / 4.5 | 294.1 | 3.2 / 4.3 | 603 / 2259 | 3.3 / 4 | 4 / 4.7 | 3.1 / 3.8 | 15.802 | 0.6 | 2.6 / 3.2 | 3.151 / 3.93 | 112 | 0.84 | 2 | 5 | 28 | 1.5 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 11.3 / 18.3 | 88.5 | 10.5 / 17.5 | 602 / 251 | 12.9 / 18.9 | 12.3 / 18 | 8.2 / 13.9 | 15.763 | 1 | 8 / 12.9 | 7.696 / 10.787 | 482 | 3.829 | 4 | 7 | 412 | 3.7 | 0 / 0 | 3 of 4 | alert 32 -> alert 32 |

Per added guard, patrol/facing, N 0 -> 32: sim step 0.031 ms, AI manager 0.005 ms, perceive 0.000 ms, frame 0.131 ms, frame CPU 0.131 ms, frame CPU (sim frames) 0.128 ms, CPU per 1/60 s sim 0.011 ms, GPU 0.062 ms, draws 5.313.
Per added guard, alert/facing, N 0 -> 32: sim step 0.059 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.259 ms, frame CPU 0.237 ms, frame CPU (sim frames) 0.272 ms, CPU per 1/60 s sim -0.002 ms, GPU 0.128 ms, draws 6.719.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 114, gBuffer 112, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, charshadow-#_shadowMap 1.5, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 12 alert/facing: PostProcessRTT-TAA 121.3, gBuffer 119.3, sun_CSMShadowMap 41.8, torchshadow-#_shadowMap 30.3, charshadow-#_shadowMap 5.8, RenderTargetWrapper 4.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: PostProcessRTT-TAA 127.6, gBuffer 125.6, sun_CSMShadowMap 62.5, torchshadow-#_shadowMap 26.3, charshadow-#_shadowMap 8.3, RenderTargetWrapper 3.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 134.1, gBuffer 132.1, sun_CSMShadowMap 82, torchshadow-#_shadowMap 46.8, charshadow-#_shadowMap 8.8, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: PostProcessRTT-TAA 142.2, gBuffer 140.2, sun_CSMShadowMap 106.8, torchshadow-#_shadowMap 53.3, charshadow-#_shadowMap 11.6, RenderTargetWrapper 4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
