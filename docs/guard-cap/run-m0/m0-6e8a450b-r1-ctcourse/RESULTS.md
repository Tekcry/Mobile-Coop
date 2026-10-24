# Guard cap: results

Run 2026-10-24T09:39:18.116Z - 2026-10-24T09:43:02.655Z (3.7 min), version 4.93.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.7 / 2.4 | 0.737 | 0.104 | 0.803 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.001 | 0.002 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.444 (100.813) | 0 (0) |
| 0 | alert/facing | 0.6 / 1.1 | 0.305 | 0.018 | 0.22 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.228 (100.822) | 0 (0) |
| 12 | patrol/facing | 2.6 / 4.2 | 0.599 | 0.088 | 0.999 | 0.1 / 0.3 | 0.09 | 0.017 | 0.011 | 0.035 | 0.024 | 0.565 | 0 (0.018) | 0 | 0.009 (1.895) | 0 (0) | 0 (0) | 0.322 (101.822) | 0 (0) |
| 12 | alert/facing | 1.5 / 3.1 | 0.648 | 0.085 | 1.114 | 0.2 / 0.5 | 0.154 | 0.015 | 0.055 | 0.05 | 0.037 | 0.652 | 0.008 (0.048) | 0 | 0.009 (1.513) | 0.021 (5) | 0.002 (0.383) | 0.307 (101.76) | 0 (0) |
| 24 | patrol/facing | 7.4 / 13 | 1.479 | 0.27 | 3.336 | 0.4 / 0.6 | 0.31 | 0.058 | 0.042 | 0.123 | 0.069 | 2.322 | 0.001 (0.02) | 0 | 0.04 (3.67) | 0 (0) | 0 (0) | 0.719 (101.808) | 0 (0) |
| 24 | alert/facing | 2.3 / 4.6 | 0.627 | 0.117 | 1.502 | 0.2 / 0.7 | 0.201 | 0.022 | 0.072 | 0.066 | 0.029 | 1.006 | 0.013 (0.083) | 0 | 0.012 (2.957) | 0.015 (5) | 0.005 (0.937) | 0.241 (101.755) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 6 / 9.8 | 166.7 | 5.7 / 9.5 | 608 / 1077 | 6.2 / 10.3 | 6.6 / 10.4 | 5.1 / 8.5 | 15.908 | 0.7 | 4.8 / 8 | 5.858 / 9.505 | 287 | 1.425 | 4 | 8 | 246 | 1.3 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 4.2 / 6.8 | 238.1 | 3.9 / 6.5 | 522 / 1492 | 4.8 / 37.7 | 5.1 / 7.3 | 3.5 / 5.7 | 16.131 | 0.7 | 3.2 / 5 | 4.74 / 5.673 | 138 | 1.327 | 4 | 8 | 41 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 4.5 / 7.7 | 222.2 | 4.3 / 7.3 | 587 / 1433 | 5.4 / 17.6 | 5.3 / 7.6 | 3.8 / 6.8 | 15.896 | 0.5 | 3.6 / 6.1 | 4.863 / 7.131 | 287 | 1.425 | 4 | 8 | 246 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 8.8 / 12.1 | 113.6 | 8.5 / 11.7 | 608 / 561 | 9.2 / 12.5 | 9.5 / 12.4 | 7.4 / 10.8 | 16.116 | 0.8 | 6.7 / 9.1 | 7.844 / 9.7 | 352 | 2.273 | 4 | 8 | 268 | 2.4 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 5.1 / 8.3 | 196.1 | 4.8 / 8 | 587 / 1234 | 5.7 / 9.9 | 5.9 / 8.6 | 4.4 / 7.3 | 15.985 | 0.7 | 3.8 / 6.2 | 5.643 / 6.391 | 178 | 1.799 | 4 | 8 | 41 | 1.2 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 10.2 / 14.1 | 98 | 9.6 / 13.2 | 609 / 391 | 10.4 / 14.4 | 10.7 / 13.5 | 8.3 / 11.6 | 15.666 | 1 | 7.4 / 9.8 | 8.364 / 10.25 | 384 | 2.666 | 7 | 11 | 311 | 2.8 | 0 / 0 | 4 of 4 | alert 12 -> alert 11, searching 1 |
| 24 | patrol/facing | 13.7 / 21.9 | 73 | 13.3 / 21.3 | 574 / 151 | 15 / 22.4 | 14.5 / 21.9 | 10.1 / 14.9 | 16.246 | 1.1 | 9.7 / 15.7 | 9.68 / 15.046 | 384 | 2.769 | 4 | 8 | 291 | 2 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.4 / 7.3 | 185.2 | 5.1 / 7.1 | 600 / 1205 | 5.3 / 8 | 5.7 / 7.4 | 4.8 / 6.7 | 15.966 | 0.7 | 3.9 / 5.6 | 5.233 / 6.393 | 186 | 1.907 | 4 | 8 | 42 | 1.4 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.4 / 11.5 | 119 | 7.9 / 10.9 | 605 / 558 | 7.9 / 12 | 8.3 / 11.3 | 7.3 / 10 | 15.727 | 0.8 | 5.5 / 7.7 | 7.495 / 9.435 | 438 | 3.459 | 7 | 11 | 401 | 2 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.238 ms, AI manager 0.017 ms, perceive 0.002 ms, frame 0.321 ms, frame CPU 0.317 ms, frame CPU (sim frames) 0.329 ms, CPU per 1/60 s sim 0.014 ms, GPU 0.159 ms, draws 4.042.
Per added guard, alert/facing, N 0 -> 24: sim step 0.071 ms, AI manager 0.011 ms, perceive 0.001 ms, frame 0.163 ms, frame CPU 0.150 ms, frame CPU (sim frames) 0.125 ms, CPU per 1/60 s sim -0.007 ms, GPU 0.110 ms, draws 6.292.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 120, gBuffer 110, charshadow-#_shadowMap 28, RenderTargetWrapper 5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 134, gBuffer 124, charshadow-#_shadowMap 60.7, torchshadow-#_shadowMap 33.8, RenderTargetWrapper 7.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: PostProcessRTT-TAA 147, gBuffer 137, charshadow-#_shadowMap 84.1, torchshadow-#_shadowMap 31.1, RenderTargetWrapper 7.5, sun_CSMShadowMap 6.3, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
