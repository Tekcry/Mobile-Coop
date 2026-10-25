# Guard cap: results

Run 2026-10-24T23:02:24.542Z - 2026-10-24T23:08:26.128Z (6 min), version 4.100.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.9 / 1.7 | 0.569 | 0.035 | 0.356 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.443 (103.822) | 0 (0) |
| 0 | alert/facing | 0.7 / 1.5 | 0.507 | 0.032 | 0.307 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.406 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.7 / 3.9 | 0.577 | 0.093 | 1.003 | 0.1 / 0.2 | 0.089 | 0.008 | 0.013 | 0.044 | 0.012 | 0.603 | 0 (0) | 0 | 0.003 (1.26) | 0 (0) | 0 (0) | 0.335 (104.253) | 0 (0) |
| 12 | alert/facing | 1.6 / 3.4 | 0.588 | 0.08 | 0.982 | 0.2 / 0.4 | 0.126 | 0.012 | 0.039 | 0.045 | 0.032 | 0.565 | 0 (0.018) | 0 | 0.007 (1.5) | 0.019 (4.875) | 0.004 (0.507) | 0.318 (105.047) | 0 (0) |
| 16 | patrol/facing | 2.1 / 4.5 | 0.687 | 0.106 | 1.163 | 0.1 / 0.3 | 0.119 | 0.011 | 0.02 | 0.058 | 0.012 | 0.76 | 0 (0) | 0 | 0.004 (1.275) | 0 (0) | 0 (0) | 0.4 (104.258) | 0 (0) |
| 16 | alert/facing | 2.7 / 5.1 | 0.733 | 0.106 | 1.39 | 0.2 / 0.6 | 0.183 | 0.018 | 0.06 | 0.064 | 0.04 | 0.903 | 0 (0.017) | 0 | 0.009 (1.99) | 0.023 (4.975) | 0.005 (0.9) | 0.369 (104.702) | 0 (0) |
| 24 | patrol/facing | 2.8 / 5.3 | 0.726 | 0.146 | 1.494 | 0.2 / 0.4 | 0.162 | 0.015 | 0.022 | 0.085 | 0.018 | 1.069 | 0 (0) | 0 | 0.007 (1.48) | 0 (0) | 0 (0) | 0.377 (104.257) | 0 (0) |
| 24 | alert/facing | 2 / 4.4 | 0.686 | 0.122 | 1.309 | 0.2 / 0.5 | 0.196 | 0.02 | 0.064 | 0.076 | 0.037 | 0.86 | 0 (0.02) | 0 | 0.01 (2.97) | 0.022 (4.983) | 0.01 (1.773) | 0.318 (104.783) | 0 (0) |
| 32 | patrol/facing | 3.8 / 5.8 | 0.901 | 0.171 | 1.679 | 0.3 / 0.5 | 0.252 | 0.022 | 0.04 | 0.13 | 0.019 | 1.227 | 0 (0) | 0 | 0.009 (1.885) | 0 (0) | 0 (0) | 0.461 (104.258) | 0 (0) |
| 32 | alert/facing | 3.1 / 5.7 | 0.869 | 0.168 | 1.921 | 0.3 / 0.8 | 0.297 | 0.034 | 0.082 | 0.123 | 0.04 | 1.354 | 0.001 (0.023) | 0 | 0.02 (3.977) | 0.022 (5) | 0.016 (2.442) | 0.367 (104.825) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 4.3 / 7.5 | 232.6 | 4.1 / 7.2 | 606 / 1523 | 4.8 / 8 | 4.9 / 8.1 | 3.7 / 6.7 | 15.814 | 0.6 | 3.3 / 6.1 | 3.926 / 6.725 | 257 | 0.72 | 1 | 4 | 300 | 1.5 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.2 / 4.5 | 454.5 | 2 / 4.2 | 529 / 2864 | 2.6 / 35.5 | 2.9 / 5.1 | 1.8 / 3.7 | 15.747 | 0.5 | 1.5 / 3.1 | 3.042 / 3.224 | 79 | 0.377 | 2 | 5 | 26 | 0.6 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 4 / 7.2 | 250 | 3.8 / 6.8 | 604 / 1670 | 4.4 / 7.4 | 4.6 / 7.5 | 3.5 / 6.4 | 15.77 | 0.5 | 3.1 / 5.8 | 3.621 / 6.353 | 261 | 0.773 | 2 | 5 | 300 | 0.9 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 7.6 / 12.3 | 131.6 | 7.3 / 11.9 | 606 / 651 | 7.9 / 13.5 | 8.1 / 12.7 | 6.5 / 10.6 | 16.084 | 0.7 | 5.6 / 9.2 | 6.253 / 8.685 | 328 | 1.768 | 2 | 5 | 324 | 1.9 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.5 / 7 | 222.2 | 4.2 / 6.7 | 603 / 1594 | 4.7 / 6.7 | 5.4 / 7.5 | 3.9 / 5.9 | 15.764 | 0.8 | 3.3 / 5 | 4.055 / 5.121 | 91 | 0.527 | 2 | 5 | 28 | 1.2 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 8.1 / 12.6 | 123.5 | 7.4 / 11.9 | 608 / 576 | 8.2 / 13.3 | 8.1 / 12.7 | 6.6 / 10.3 | 15.438 | 0.7 | 5.7 / 9.3 | 6.719 / 9.395 | 360 | 1.855 | 4 | 7 | 403 | 2 | 0 / 0 | 4 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 8.1 / 12.8 | 123.5 | 7.8 / 12.4 | 606 / 565 | 8.6 / 13.4 | 8.5 / 13.1 | 6.9 / 11.3 | 16.096 | 0.7 | 5.8 / 9.6 | 6.303 / 8.481 | 339 | 1.954 | 2 | 5 | 332 | 2.3 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.6 / 7.1 | 217.4 | 4.4 / 6.7 | 605 / 1513 | 4.7 / 6.6 | 5.5 / 7.5 | 4 / 5.9 | 15.762 | 0.7 | 3.5 / 5 | 3.994 / 4.987 | 91 | 0.527 | 2 | 5 | 28 | 1.5 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 8.9 / 13.7 | 112.4 | 8.3 / 13.1 | 605 / 466 | 9.3 / 14.8 | 9 / 13.7 | 7.5 / 11.7 | 15.58 | 0.8 | 6.3 / 10.2 | 6.964 / 10.032 | 365 | 1.987 | 4 | 7 | 404 | 2.1 | 0 / 0 | 4 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 9.6 / 15 | 104.2 | 9.3 / 14.6 | 610 / 406 | 10.1 / 15.6 | 9.8 / 15.1 | 8.3 / 12.9 | 16.204 | 0.8 | 6.8 / 11.1 | 6.954 / 9.254 | 367 | 2.397 | 2 | 5 | 346 | 2.8 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4.3 / 7.2 | 232.6 | 4.1 / 6.8 | 606 / 1578 | 4.4 / 7 | 5.1 / 7.5 | 3.7 / 6.1 | 15.796 | 0.7 | 3.2 / 5.1 | 3.749 / 4.97 | 91 | 0.527 | 2 | 5 | 28 | 1.9 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 10.3 / 16 | 97.1 | 9.7 / 15.2 | 609 / 317 | 10.8 / 16.5 | 10.3 / 15.7 | 8.5 / 13.3 | 15.689 | 0.8 | 7.1 / 11.5 | 7.853 / 11.261 | 398 | 2.451 | 4 | 7 | 389 | 2.7 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |
| 32 | patrol/facing | 11.4 / 18.1 | 87.7 | 11.1 / 17.7 | 604 / 242 | 12.4 / 18.8 | 12.1 / 18.1 | 9 / 14.1 | 16.23 | 0.9 | 8 / 12.9 | 7.72 / 11.213 | 389 | 2.783 | 2 | 5 | 359 | 3.7 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 4.8 / 8 | 208.3 | 4.6 / 7.7 | 604 / 1361 | 5 / 7.6 | 5.6 / 8.7 | 4.1 / 6.7 | 15.843 | 0.8 | 3.5 / 5.8 | 3.818 / 5.021 | 91 | 0.527 | 2 | 5 | 28 | 1.9 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 12.7 / 19 | 78.7 | 12 / 18.1 | 603 / 165 | 13.5 / 19.7 | 12.8 / 18.3 | 10 / 14.6 | 15.796 | 0.9 | 8.7 / 13.4 | 9.274 / 13.223 | 446 | 3.184 | 4 | 7 | 406 | 3.4 | 0 / 0 | 4 of 4 | alert 32 -> alert 32 |

Per added guard, patrol/facing, N 0 -> 32: sim step 0.091 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.222 ms, frame CPU 0.219 ms, frame CPU (sim frames) 0.225 ms, CPU per 1/60 s sim 0.013 ms, GPU 0.119 ms, draws 4.125.
Per added guard, alert/facing, N 0 -> 32: sim step 0.075 ms, AI manager 0.012 ms, perceive 0.001 ms, frame 0.272 ms, frame CPU 0.256 ms, frame CPU (sim frames) 0.256 ms, CPU per 1/60 s sim 0.001 ms, GPU 0.177 ms, draws 5.781.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 114, gBuffer 112, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, charshadow-#_shadowMap 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 12 alert/facing: PostProcessRTT-TAA 125.9, gBuffer 123.9, torchshadow-#_shadowMap 41.6, sun_CSMShadowMap 30.7, charshadow-#_shadowMap 8, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: PostProcessRTT-TAA 126.8, gBuffer 124.8, torchshadow-#_shadowMap 39.8, sun_CSMShadowMap 36.5, charshadow-#_shadowMap 9.7, RenderTargetWrapper 3.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 134.3, gBuffer 132.3, sun_CSMShadowMap 50.9, torchshadow-#_shadowMap 47.1, charshadow-#_shadowMap 11.2, RenderTargetWrapper 3.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: PostProcessRTT-TAA 143.1, gBuffer 141.1, sun_CSMShadowMap 67.7, torchshadow-#_shadowMap 51.8, charshadow-#_shadowMap 12.1, RenderTargetWrapper 3.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
