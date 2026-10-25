# Guard cap: results

Run 2026-10-24T20:05:17.018Z - 2026-10-24T20:11:05.797Z (5.8 min), version 4.100.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.288 | 0.018 | 0.207 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.211 (103.808) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.6 | 0.296 | 0.02 | 0.189 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.231 (103.813) | 0 (0) |
| 12 | patrol/facing | 1 / 1.5 | 0.368 | 0.052 | 0.602 | 0.1 / 0.2 | 0.062 | 0.006 | 0.007 | 0.032 | 0.009 | 0.36 | 0 (0) | 0 | 0.002 (1.26) | 0 (0) | 0 (0) | 0.216 (104.253) | 0 (0) |
| 12 | alert/facing | 1.3 / 1.9 | 0.458 | 0.06 | 0.76 | 0.1 / 0.3 | 0.115 | 0.01 | 0.041 | 0.039 | 0.028 | 0.437 | 0.001 (0.023) | 0 | 0.005 (1.5) | 0.019 (4.783) | 0.004 (0.568) | 0.222 (104.955) | 0 (0) |
| 16 | patrol/facing | 1.2 / 1.5 | 0.377 | 0.063 | 0.712 | 0.1 / 0.2 | 0.068 | 0.009 | 0.01 | 0.032 | 0.007 | 0.462 | 0 (0) | 0 | 0.004 (1.29) | 0 (0) | 0 (0) | 0.209 (104.258) | 0 (0) |
| 16 | alert/facing | 1.5 / 2.4 | 0.462 | 0.076 | 0.876 | 0.2 / 0.3 | 0.121 | 0.01 | 0.043 | 0.037 | 0.026 | 0.516 | 0.001 (0.02) | 0 | 0.004 (1.98) | 0.013 (4.883) | 0.004 (0.922) | 0.208 (104.845) | 0 (0) |
| 24 | patrol/facing | 1.5 / 1.9 | 0.418 | 0.084 | 0.863 | 0.1 / 0.2 | 0.094 | 0.006 | 0.016 | 0.052 | 0.009 | 0.607 | 0 (0) | 0 | 0.003 (1.51) | 0 (0) | 0 (0) | 0.211 (104.258) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.5 | 0.514 | 0.1 | 1.189 | 0.2 / 0.4 | 0.158 | 0.014 | 0.05 | 0.063 | 0.025 | 0.814 | 0 (0.022) | 0 | 0.006 (2.98) | 0.012 (5) | 0.006 (1.528) | 0.219 (104.802) | 0 (0) |
| 32 | patrol/facing | 1.6 / 2.2 | 0.48 | 0.106 | 1.015 | 0.2 / 0.3 | 0.137 | 0.014 | 0.022 | 0.072 | 0.013 | 0.737 | 0 (0) | 0 | 0.006 (1.915) | 0 (0) | 0 (0) | 0.22 (104.258) | 0 (0) |
| 32 | alert/facing | 1.9 / 2.8 | 0.563 | 0.105 | 1.119 | 0.2 / 0.4 | 0.216 | 0.023 | 0.059 | 0.094 | 0.023 | 0.767 | 0 (0.02) | 0 | 0.013 (3.98) | 0.014 (5) | 0.008 (2.433) | 0.216 (105.173) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3 / 4.8 | 333.3 | 2.9 / 4.4 | 600 / 2376 | 3.2 / 15.1 | 3.5 / 4.9 | 2.7 / 4 | 15.804 | 0.4 | 2.4 / 3.6 | 3.371 / 3.579 | 261 | 0.773 | 2 | 5 | 300 | 0.6 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.7 / 3.5 | 588.2 | 1.5 / 3.2 | 425 / 3017 | 1.9 / 62.8 | 2.2 / 4 | 1.5 / 2.4 | 16.087 | 0.4 | 1.2 / 2 | 2.918 / 3.004 | 79 | 0.377 | 2 | 5 | 26 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.8 / 4.7 | 357.1 | 2.7 / 4.4 | 584 / 2380 | 3 / 21.2 | 3.4 / 4.6 | 2.5 / 4.1 | 15.845 | 0.4 | 2.2 / 3.5 | 3.506 / 3.63 | 261 | 0.773 | 2 | 5 | 300 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.4 / 6.6 | 185.2 | 5.2 / 6.3 | 607 / 1241 | 5.3 / 6.3 | 5.7 / 6.6 | 5 / 5.9 | 15.979 | 0.6 | 4 / 4.7 | 5.062 / 5.695 | 327 | 1.76 | 2 | 5 | 324 | 1.4 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 2.3 / 4 | 434.8 | 2.2 / 3.7 | 545 / 2830 | 2.4 / 34.8 | 3 / 4.6 | 2.1 / 3.2 | 15.823 | 0.5 | 1.7 / 2.7 | 3.063 / 3.153 | 91 | 0.527 | 2 | 5 | 28 | 0.9 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6 / 7.2 | 166.7 | 5.5 / 6.7 | 604 / 1057 | 5.8 / 6.9 | 6 / 7 | 5.2 / 6.1 | 15.243 | 0.6 | 4.3 / 5.1 | 5.419 / 6.237 | 333 | 1.572 | 4 | 7 | 404 | 1.3 | 0 / 0 | 3 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 5.6 / 6.8 | 178.6 | 5.4 / 6.5 | 605 / 1162 | 5.5 / 6.4 | 6 / 6.9 | 5.2 / 6.1 | 16.041 | 0.5 | 4.1 / 4.8 | 5.057 / 5.558 | 340 | 1.966 | 2 | 5 | 332 | 1.6 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 3.1 / 4 | 322.6 | 2.9 / 3.8 | 603 / 2639 | 3 / 3.7 | 3.5 / 4.3 | 2.8 / 3.4 | 15.697 | 0.5 | 2.3 / 2.8 | 3.042 / 3.642 | 91 | 0.527 | 2 | 5 | 28 | 0.8 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 6.6 / 7.9 | 151.5 | 6.1 / 7.3 | 607 / 918 | 6.3 / 7.3 | 6.7 / 7.6 | 5.7 / 6.7 | 15.425 | 0.6 | 4.7 / 5.4 | 5.609 / 6.356 | 366 | 2.002 | 4 | 7 | 388 | 1.7 | 0 / 0 | 4 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 6.3 / 7.8 | 158.7 | 6.1 / 7.5 | 604 / 976 | 6.1 / 7.4 | 6.6 / 7.8 | 5.7 / 6.9 | 16.073 | 0.6 | 4.4 / 5.4 | 4.891 / 5.5 | 368 | 2.409 | 2 | 5 | 346 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3 / 4.1 | 333.3 | 2.8 / 3.8 | 605 / 2703 | 2.9 / 3.7 | 3.5 / 4.3 | 2.7 / 3.3 | 15.69 | 0.6 | 2.2 / 2.7 | 2.858 / 3.536 | 91 | 0.527 | 2 | 5 | 28 | 1 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7 / 8.5 | 142.9 | 6.5 / 7.9 | 607 / 837 | 6.6 / 7.8 | 7 / 8.4 | 6 / 7.1 | 15.483 | 0.7 | 4.8 / 5.8 | 5.415 / 6.203 | 378 | 2.209 | 3 | 6 | 397 | 1.7 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |
| 32 | patrol/facing | 7.4 / 8.9 | 135.1 | 7.1 / 8.6 | 605 / 751 | 7 / 8.4 | 7.7 / 9 | 6.7 / 7.9 | 16.169 | 0.6 | 5.2 / 6.2 | 4.998 / 5.604 | 391 | 2.798 | 2 | 5 | 359 | 2.4 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 3.5 / 4.6 | 285.7 | 3.3 / 4.4 | 604 / 2214 | 3.4 / 4.2 | 4.1 / 4.8 | 3.2 / 3.9 | 15.798 | 0.6 | 2.6 / 3.2 | 3.155 / 3.859 | 91 | 0.527 | 2 | 5 | 28 | 1.5 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 8.6 / 10.2 | 116.3 | 8 / 9.7 | 608 / 573 | 8 / 10 | 8.6 / 10.2 | 7.4 / 8.6 | 15.648 | 0.7 | 5.9 / 7.1 | 6.05 / 6.867 | 456 | 3.437 | 4 | 7 | 411 | 2.5 | 0 / 0 | 4 of 4 | alert 32 -> alert 32 |

Per added guard, patrol/facing, N 0 -> 32: sim step 0.034 ms, AI manager 0.005 ms, perceive 0.000 ms, frame 0.138 ms, frame CPU 0.131 ms, frame CPU (sim frames) 0.131 ms, CPU per 1/60 s sim 0.011 ms, GPU 0.051 ms, draws 4.063.
Per added guard, alert/facing, N 0 -> 32: sim step 0.044 ms, AI manager 0.008 ms, perceive 0.001 ms, frame 0.181 ms, frame CPU 0.166 ms, frame CPU (sim frames) 0.162 ms, CPU per 1/60 s sim -0.006 ms, GPU 0.080 ms, draws 6.094.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 114, gBuffer 112, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, charshadow-#_shadowMap 1.5, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 12 alert/facing: PostProcessRTT-TAA 124.2, gBuffer 122.2, sun_CSMShadowMap 27.1, torchshadow-#_shadowMap 26.6, charshadow-#_shadowMap 7.4, RenderTargetWrapper 3.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: PostProcessRTT-TAA 128.1, gBuffer 126.1, sun_CSMShadowMap 37.6, torchshadow-#_shadowMap 34.6, charshadow-#_shadowMap 10, RenderTargetWrapper 3.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 130.9, gBuffer 128.9, sun_CSMShadowMap 46.6, torchshadow-#_shadowMap 34.5, charshadow-#_shadowMap 10.7, RenderTargetWrapper 3.3, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: PostProcessRTT-TAA 145.4, gBuffer 143.4, sun_CSMShadowMap 74.3, torchshadow-#_shadowMap 52.9, charshadow-#_shadowMap 13.3, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
