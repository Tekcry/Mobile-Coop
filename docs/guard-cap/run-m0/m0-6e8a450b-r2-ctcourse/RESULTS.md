# Guard cap: results

Run 2026-10-24T09:54:14.077Z - 2026-10-24T09:57:48.409Z (3.6 min), version 4.93.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.4 / 2 | 0.368 | 0.035 | 0.317 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.247 (100.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.252 | 0.018 | 0.195 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.19 (100.808) | 0 (0) |
| 12 | patrol/facing | 3.5 / 5.1 | 0.484 | 0.079 | 0.869 | 0.1 / 0.2 | 0.073 | 0.011 | 0.009 | 0.029 | 0.026 | 0.483 | 0.001 (0.018) | 0 | 0.007 (1.905) | 0 (0) | 0 (0) | 0.248 (101.813) | 0 (0) |
| 12 | alert/facing | 1.3 / 2.1 | 0.425 | 0.061 | 0.8 | 0.1 / 0.3 | 0.096 | 0.011 | 0.037 | 0.028 | 0.027 | 0.466 | 0.006 (0.043) | 0 | 0.005 (1.482) | 0.014 (5) | 0.001 (0.288) | 0.206 (101.712) | 0 (0) |
| 24 | patrol/facing | 3.6 / 6.7 | 0.492 | 0.091 | 1.102 | 0.1 / 0.3 | 0.104 | 0.023 | 0.014 | 0.039 | 0.028 | 0.769 | 0 (0.018) | 0 | 0.017 (3.67) | 0 (0) | 0 (0) | 0.241 (101.822) | 0 (0) |
| 24 | alert/facing | 2 / 3.6 | 0.635 | 0.116 | 1.534 | 0.2 / 0.6 | 0.208 | 0.021 | 0.084 | 0.061 | 0.033 | 1.042 | 0.015 (0.085) | 0 | 0.013 (3.018) | 0.015 (5) | 0.005 (0.762) | 0.248 (101.947) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.9 / 7.9 | 256.4 | 3.7 / 7.6 | 593 / 1653 | 4.1 / 10.4 | 4.3 / 8.2 | 3.4 / 7.2 | 15.853 | 0.5 | 3 / 6.6 | 4.44 / 6.395 | 287 | 1.425 | 4 | 8 | 246 | 0.8 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.7 / 17.4 | 370.4 | 2.5 / 17.1 | 532 / 1657 | 4.3 / 34.3 | 3.5 / 10.1 | 2.2 / 19 | 15.887 | 0.4 | 2 / 16.6 | 4.442 / 4.85 | 138 | 1.327 | 4 | 8 | 41 | 0.6 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3.7 / 8.4 | 270.3 | 3.5 / 8 | 594 / 1646 | 4.2 / 13.6 | 4 / 8.5 | 3.3 / 7.5 | 15.811 | 0.4 | 2.9 / 6.9 | 4.564 / 5.278 | 287 | 1.425 | 4 | 8 | 246 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.7 / 9.4 | 175.4 | 5.5 / 9.2 | 607 / 1036 | 5.6 / 10.3 | 6 / 10.1 | 5.2 / 8.4 | 15.981 | 0.6 | 4.2 / 7.2 | 5.762 / 8.346 | 352 | 2.273 | 4 | 8 | 268 | 1.4 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.5 / 8.3 | 222.2 | 4.3 / 8 | 603 / 1401 | 5 / 10.1 | 4.7 / 8.7 | 4 / 7.7 | 15.977 | 0.5 | 3.4 / 7 | 4.918 / 5.074 | 179 | 1.807 | 4 | 8 | 41 | 1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.2 / 9.1 | 161.3 | 5.7 / 8.4 | 605 / 956 | 5.8 / 10.9 | 6.2 / 9.8 | 5.4 / 7.6 | 15.579 | 0.6 | 4.3 / 6.3 | 6.157 / 7.913 | 385 | 2.734 | 7 | 11 | 311 | 1.5 | 0 / 0 | 4 of 4 | alert 12 -> alert 11, searching 1 |
| 24 | patrol/facing | 7 / 9.8 | 142.9 | 6.7 / 9.6 | 604 / 779 | 6.7 / 11.8 | 7.2 / 10.5 | 6.3 / 8.8 | 16.097 | 0.6 | 4.9 / 7 | 6.617 / 7.816 | 384 | 2.769 | 4 | 8 | 291 | 2 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.2 / 8.4 | 192.3 | 5 / 8.1 | 605 / 1221 | 5 / 8.9 | 5.6 / 9.5 | 4.7 / 7.2 | 15.953 | 0.7 | 3.8 / 6.3 | 5.166 / 7.291 | 186 | 1.907 | 4 | 8 | 41 | 1.5 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.4 / 11.8 | 119 | 7.9 / 11.1 | 607 / 549 | 8 / 12.9 | 8.4 / 11.6 | 7.3 / 10.4 | 15.672 | 0.7 | 5.6 / 7.9 | 7.71 / 9.381 | 440 | 3.517 | 8 | 11 | 389 | 2.1 | 0 / 0 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.092 ms, AI manager 0.006 ms, perceive 0.001 ms, frame 0.129 ms, frame CPU 0.125 ms, frame CPU (sim frames) 0.121 ms, CPU per 1/60 s sim 0.010 ms, GPU 0.091 ms, draws 4.042.
Per added guard, alert/facing, N 0 -> 24: sim step 0.063 ms, AI manager 0.011 ms, perceive 0.001 ms, frame 0.196 ms, frame CPU 0.183 ms, frame CPU (sim frames) 0.183 ms, CPU per 1/60 s sim -0.006 ms, GPU 0.131 ms, draws 6.375.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 120, gBuffer 110, charshadow-#_shadowMap 28, RenderTargetWrapper 5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 134.8, gBuffer 124.8, charshadow-#_shadowMap 63.9, torchshadow-#_shadowMap 25.4, RenderTargetWrapper 7.6, sun_CSMShadowMap 4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 147.5, gBuffer 137.5, charshadow-#_shadowMap 82.4, torchshadow-#_shadowMap 36.3, sun_CSMShadowMap 8, RenderTargetWrapper 7.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
