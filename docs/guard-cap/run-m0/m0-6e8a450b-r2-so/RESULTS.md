# Guard cap: results

Run 2026-10-24T09:43:07.520Z - 2026-10-24T09:46:41.257Z (3.6 min), version 4.93.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 3.1 / 5.1 | 0.632 | 0.107 | 1.008 | 0.1 / 0.3 | 0.092 | 0.011 | 0.011 | 0.038 | 0.015 | 0.51 | 0 (0) | 0 | 0.004 (1.83) | 0 (0) | 0 (0) | 0.355 (106.822) | 0 (0) |
| 12 | alert/facing | 3.1 / 6.1 | 0.81 | 0.12 | 1.314 | 0.2 / 0.7 | 0.193 | 0.021 | 0.066 | 0.065 | 0.046 | 0.714 | 0.004 (0.018) | 0 | 0.01 (1.507) | 0.026 (4.992) | 0.007 (0.683) | 0.404 (104.91) | 0 (0) |
| 16 | patrol/facing | 2.3 / 5.1 | 0.695 | 0.117 | 1.15 | 0.1 / 0.3 | 0.109 | 0.021 | 0.014 | 0.045 | 0.022 | 0.652 | 0 (0) | 0 | 0.012 (2.57) | 0 (0) | 0 (0) | 0.406 (106.822) | 0 (0) |
| 16 | alert/facing | 1.9 / 4.2 | 0.788 | 0.154 | 1.57 | 0.2 / 0.7 | 0.191 | 0.023 | 0.067 | 0.061 | 0.05 | 0.919 | 0.001 (0.015) | 0 | 0.011 (1.983) | 0.027 (5) | 0.008 (0.87) | 0.386 (104.588) | 0 (0) |
| 32 | patrol/facing | 3.6 / 6.6 | 0.643 | 0.127 | 1.409 | 0.2 / 0.4 | 0.152 | 0.028 | 0.016 | 0.069 | 0.043 | 0.967 | 0 (0) | 0 | 0.02 (5.085) | 0 (0) | 0 (0) | 0.307 (106.822) | 0 (0) |
| 32 | alert/facing | 2.8 / 5.7 | 0.85 | 0.173 | 1.915 | 0.3 / 1 | 0.315 | 0.035 | 0.1 | 0.115 | 0.043 | 1.315 | 0.004 (0.025) | 0 | 0.016 (4.025) | 0.019 (5) | 0.012 (1.627) | 0.303 (104.472) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 4.9 / 8 | 204.1 | 4.7 / 7.7 | 606 / 1326 | 4.9 / 8.6 | 5.3 / 8.6 | 4.4 / 7.3 | 15.929 | 0.6 | 3.4 / 6 | 4.491 / 6.678 | 183 | 1.614 | 2 | 5 | 140 | 2.6 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 6.1 / 11.4 | 163.9 | 5.8 / 11 | 606 / 941 | 7.3 / 12.2 | 7.9 / 12.1 | 4.5 / 9.4 | 15.949 | 1 | 4.4 / 8.3 | 4.9 / 7.576 | 135 | 1.12 | 4 | 7 | 31 | 2.2 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 7.6 / 14.1 | 131.6 | 6.8 / 13.1 | 608 / 599 | 8.3 / 15.4 | 8.1 / 14.2 | 5.8 / 10.7 | 15.136 | 0.9 | 4.8 / 9.3 | 6.737 / 10.379 | 201 | 1.656 | 5 | 8 | 204 | 1.4 | 0 / 0 | 4 of 4 | alert 12 -> alert 11, searching 1 |
| 16 | patrol/facing | 5.4 / 10 | 185.2 | 5.2 / 9.7 | 607 / 1091 | 5.4 / 10.4 | 5.8 / 10.6 | 4.8 / 8.7 | 15.989 | 0.6 | 3.7 / 7.1 | 4.818 / 7.663 | 209 | 2.006 | 3 | 6 | 145 | 1.6 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 3.9 / 6.8 | 256.4 | 3.7 / 6.5 | 604 / 1773 | 3.8 / 7.2 | 4.4 / 7.9 | 3.4 / 5.8 | 15.794 | 0.6 | 2.8 / 5.1 | 3.333 / 5.265 | 135 | 1.12 | 4 | 7 | 31 | 1.2 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 7 / 12.2 | 142.9 | 6.5 / 11.3 | 607 / 711 | 7 / 12.8 | 7.3 / 12.4 | 5.8 / 9.5 | 15.319 | 0.8 | 4.5 / 8.1 | 6.376 / 8.959 | 239 | 2.127 | 6 | 9 | 199 | 1.7 | 0 / 0 | 4 of 4 | alert 16 -> alert 14, searching 2 |
| 32 | patrol/facing | 7.5 / 12.1 | 133.3 | 7.2 / 11.8 | 607 / 663 | 7.4 / 12.9 | 7.7 / 12.4 | 6.7 / 10.4 | 16.143 | 0.7 | 5.1 / 8.4 | 5.957 / 7.834 | 242 | 2.608 | 1 | 4 | 170 | 2.3 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 4.6 / 7.6 | 217.4 | 4.3 / 7.3 | 606 / 1458 | 4.6 / 8 | 5 / 8.5 | 4.1 / 6.6 | 15.856 | 0.7 | 3.4 / 5.7 | 3.787 / 5.209 | 136 | 1.12 | 5 | 8 | 31 | 1.7 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 8.5 / 14.2 | 117.6 | 7.8 / 13.3 | 607 / 504 | 8.3 / 15.4 | 8.4 / 14.3 | 6.9 / 11.3 | 15.397 | 0.9 | 5.3 / 9.1 | 6.831 / 8.869 | 262 | 2.648 | 6 | 9 | 231 | 2.6 | 0 / 0 | 4 of 4 | alert 32 -> alert 29, searching 3 |

Per added guard, patrol/facing, N 12 -> 32: sim step 0.025 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.130 ms, frame CPU 0.125 ms, frame CPU (sim frames) 0.120 ms, CPU per 1/60 s sim 0.011 ms, GPU 0.073 ms, draws 2.950.
Per added guard, alert/facing, N 12 -> 32: sim step -0.015 ms, AI manager 0.007 ms, perceive 0.001 ms, frame 0.045 ms, frame CPU 0.050 ms, frame CPU (sim frames) 0.015 ms, CPU per 1/60 s sim 0.013 ms, GPU 0.005 ms, draws 3.050.

Draws per pass (last cell of each count):

- N 12 alert/facing: sun_CSMShadowMap 49.2, PostProcessRTT-TAA 48.6, gBuffer 45.6, torchshadow-#_shadowMap 24.5, charshadow-#_shadowMap 6.5, RenderTargetWrapper 5.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: sun_CSMShadowMap 59.5, PostProcessRTT-TAA 52.6, gBuffer 49.6, torchshadow-#_shadowMap 38, charshadow-#_shadowMap 8, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: sun_CSMShadowMap 80.7, PostProcessRTT-TAA 60, gBuffer 57, charshadow-#_shadowMap 19.9, torchshadow-#_shadowMap 18.6, RenderTargetWrapper 5.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
