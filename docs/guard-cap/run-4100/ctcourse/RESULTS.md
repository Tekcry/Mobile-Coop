# Guard cap: results

Run 2026-10-24T20:11:06.958Z - 2026-10-24T20:14:38.254Z (3.5 min), version 4.100.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.8 | 0.317 | 0.026 | 0.248 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.23 (100.822) | 0 (0) |
| 0 | alert/facing | 0.4 / 0.6 | 0.294 | 0.017 | 0.216 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.217 (100.822) | 0 (0) |
| 12 | patrol/facing | 3.3 / 5.3 | 0.463 | 0.076 | 0.798 | 0.1 / 0.2 | 0.069 | 0.01 | 0.01 | 0.028 | 0.022 | 0.423 | 0.001 (0.02) | 0 | 0.006 (1.9) | 0 (0) | 0 (0) | 0.234 (101.808) | 0 (0) |
| 12 | alert/facing | 1.3 / 2 | 0.42 | 0.063 | 0.725 | 0.1 / 0.3 | 0.105 | 0.008 | 0.046 | 0.03 | 0.026 | 0.408 | 0.012 (0.072) | 0 | 0.004 (1.455) | 0.016 (5) | 0.002 (0.335) | 0.197 (102.207) | 0 (0) |
| 24 | patrol/facing | 3.8 / 7.3 | 0.42 | 0.082 | 0.952 | 0.1 / 0.2 | 0.087 | 0.017 | 0.012 | 0.039 | 0.019 | 0.659 | 0 (0.022) | 0 | 0.01 (3.675) | 0 (0) | 0 (0) | 0.203 (101.822) | 0 (0) |
| 24 | alert/facing | 2 / 3.1 | 0.526 | 0.081 | 1.174 | 0.2 / 0.7 | 0.192 | 0.016 | 0.087 | 0.055 | 0.025 | 0.806 | 0.032 (0.183) | 0 | 0.009 (2.988) | 0.012 (5) | 0.003 (1.008) | 0.203 (101.563) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.8 / 8.1 | 263.2 | 3.6 / 7.9 | 584 / 1688 | 4.1 / 11.4 | 3.9 / 7.9 | 3.4 / 7.8 | 16.031 | 0.4 | 2.9 / 7.4 | 4.322 / 4.867 | 287 | 1.425 | 4 | 8 | 246 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.2 / 12.7 | 454.5 | 2.1 / 12.4 | 471 / 1720 | 4.3 / 57.3 | 3 / 12.4 | 1.9 / 12.4 | 16.35 | 0.4 | 1.6 / 12 | 4.608 / 4.671 | 138 | 1.327 | 4 | 8 | 41 | 0.6 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3.9 / 8.2 | 256.4 | 3.7 / 8 | 592 / 1690 | 4.3 / 10.4 | 4 / 7.9 | 3.5 / 8.1 | 16.012 | 0.4 | 3.1 / 7.4 | 4.374 / 4.966 | 287 | 1.425 | 4 | 8 | 246 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.9 / 6.4 | 204.1 | 4.7 / 6.1 | 599 / 1401 | 4.8 / 6.2 | 5.3 / 6.5 | 4.5 / 5.6 | 16.01 | 0.5 | 3.6 / 4.5 | 4.771 / 5.996 | 353 | 2.273 | 4 | 8 | 268 | 1.3 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.5 / 7.9 | 222.2 | 4.3 / 7.7 | 605 / 1479 | 5 / 10.2 | 4.5 / 7.1 | 4 / 7.9 | 16.005 | 0.5 | 3.3 / 7 | 4.825 / 4.965 | 179 | 1.812 | 4 | 8 | 42 | 1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.8 / 7.4 | 172.4 | 5.5 / 6.9 | 605 / 1090 | 5.6 / 7 | 6 / 7.5 | 5.2 / 6.4 | 15.646 | 0.6 | 4.1 / 5.1 | 5.938 / 7.154 | 384 | 2.655 | 8 | 11 | 292 | 1.3 | 0 / 0 | 4 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 6.2 / 7.6 | 161.3 | 5.9 / 7.3 | 605 / 1010 | 6 / 7.3 | 6.5 / 7.7 | 5.7 / 6.7 | 16.09 | 0.6 | 4.3 / 5.3 | 5.992 / 6.767 | 385 | 2.777 | 4 | 8 | 291 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4.4 / 6 | 227.3 | 4.2 / 5.7 | 594 / 1570 | 4.3 / 9 | 4.8 / 6 | 4 / 5.3 | 15.986 | 0.6 | 3.3 / 4.5 | 4.538 / 5.235 | 188 | 1.919 | 4 | 8 | 42 | 1.3 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.3 / 8.9 | 137 | 6.8 / 8.2 | 604 / 763 | 6.8 / 7.9 | 7.4 / 8.6 | 6.4 / 7.3 | 15.677 | 0.7 | 4.9 / 5.6 | 6.851 / 7.946 | 433 | 3.415 | 6 | 10 | 385 | 1.9 | 0 / 0 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.133 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.100 ms, frame CPU 0.096 ms, frame CPU (sim frames) 0.108 ms, CPU per 1/60 s sim 0.002 ms, GPU 0.070 ms, draws 4.083.
Per added guard, alert/facing, N 0 -> 24: sim step 0.067 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.142 ms, frame CPU 0.129 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim -0.014 ms, GPU 0.103 ms, draws 6.083.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 120, gBuffer 110, charshadow-#_shadowMap 28, RenderTargetWrapper 5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 134.5, gBuffer 124.5, charshadow-#_shadowMap 59.4, torchshadow-#_shadowMap 31, RenderTargetWrapper 7.6, sun_CSMShadowMap 4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 146, gBuffer 136, charshadow-#_shadowMap 84.6, torchshadow-#_shadowMap 39.3, RenderTargetWrapper 7.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
