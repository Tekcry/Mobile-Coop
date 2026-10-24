# Guard cap: results

Run 2026-10-24T09:28:52.198Z - 2026-10-24T09:32:07.440Z (3.3 min), version 4.93.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 1.1 / 1.7 | 0.365 | 0.05 | 0.519 | 0.1 / 0.2 | 0.049 | 0.007 | 0.005 | 0.023 | 0.006 | 0.273 | 0 (0) | 0 | 0.004 (1.85) | 0 (0) | 0 (0) | 0.231 (106.808) | 0 (0) |
| 12 | alert/facing | 1.2 / 1.6 | 0.447 | 0.073 | 0.754 | 0.1 / 0.3 | 0.1 | 0.013 | 0.038 | 0.029 | 0.023 | 0.423 | 0.001 (0.013) | 0 | 0.005 (1.493) | 0.011 (4.042) | 0.005 (0.892) | 0.234 (104.825) | 0 (0) |
| 16 | patrol/facing | 1 / 1.5 | 0.376 | 0.052 | 0.563 | 0.1 / 0.2 | 0.053 | 0.008 | 0.005 | 0.023 | 0.011 | 0.321 | 0 (0) | 0 | 0.005 (2.56) | 0 (0) | 0 (0) | 0.231 (106.808) | 0 (0) |
| 16 | alert/facing | 1.4 / 1.9 | 0.489 | 0.08 | 0.765 | 0.2 / 0.4 | 0.127 | 0.014 | 0.044 | 0.041 | 0.027 | 0.444 | 0.004 (0.018) | 0 | 0.005 (1.977) | 0.014 (5) | 0.004 (0.823) | 0.24 (105.22) | 0 (0) |
| 32 | patrol/facing | 1.6 / 2.2 | 0.472 | 0.09 | 0.926 | 0.1 / 0.2 | 0.111 | 0.02 | 0.011 | 0.052 | 0.022 | 0.654 | 0 (0) | 0 | 0.012 (5.155) | 0 (0) | 0 (0) | 0.239 (106.822) | 0 (0) |
| 32 | alert/facing | 2.2 / 3.1 | 0.564 | 0.127 | 1.229 | 0.2 / 0.4 | 0.177 | 0.018 | 0.054 | 0.067 | 0.031 | 0.861 | 0.002 (0.027) | 0 | 0.01 (3.983) | 0.015 (5) | 0.006 (1.503) | 0.241 (104.69) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 4.1 / 5.2 | 243.9 | 3.9 / 5 | 603 / 1777 | 4.1 / 4.9 | 4.6 / 5.4 | 3.8 / 4.6 | 15.884 | 0.5 | 3 / 3.6 | 4.08 / 5.016 | 185 | 1.604 | 3 | 6 | 140 | 1.3 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3 / 4 | 333.3 | 2.9 / 3.8 | 605 / 2651 | 3 / 3.7 | 3.5 / 4.2 | 2.8 / 3.4 | 15.76 | 0.5 | 2.3 / 2.8 | 2.873 / 3.69 | 135 | 1.12 | 4 | 7 | 31 | 1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.1 / 6.3 | 196.1 | 4.5 / 5.7 | 606 / 1370 | 4.9 / 5.7 | 5.2 / 6 | 4.3 / 5 | 14.978 | 0.6 | 3.3 / 3.9 | 4.894 / 5.918 | 194 | 1.535 | 6 | 9 | 180 | 1.3 | 0 / 0 | 4 of 4 | alert 12 -> searching 3, alert 9 |
| 16 | patrol/facing | 4.5 / 5.6 | 222.2 | 4.3 / 5.4 | 604 / 1609 | 4.4 / 5.2 | 4.9 / 5.7 | 4.1 / 4.9 | 15.935 | 0.5 | 3.2 / 3.8 | 4.299 / 5.228 | 209 | 2.006 | 3 | 6 | 145 | 1.5 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 3.2 / 4.2 | 312.5 | 3 / 4 | 604 / 2469 | 3.2 / 3.8 | 3.7 / 4.4 | 2.9 / 3.5 | 15.78 | 0.5 | 2.4 / 2.9 | 2.963 / 3.763 | 136 | 1.12 | 5 | 8 | 31 | 1.1 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 5.4 / 6.8 | 185.2 | 4.9 / 6.1 | 606 / 1226 | 5.2 / 6.1 | 5.5 / 6.4 | 4.6 / 5.4 | 14.99 | 0.6 | 3.6 / 4.3 | 5.218 / 6.099 | 224 | 1.898 | 6 | 9 | 205 | 1.5 | 0 / 0 | 4 of 4 | alert 16 -> alert 15, searching 1 |
| 32 | patrol/facing | 6 / 7.2 | 166.7 | 5.8 / 7 | 607 / 1058 | 5.8 / 6.7 | 6.4 / 7.3 | 5.5 / 6.4 | 16.066 | 0.7 | 4.2 / 4.9 | 5.492 / 6.005 | 276 | 3.078 | 3 | 6 | 170 | 2.1 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 3.7 / 4.8 | 270.3 | 3.5 / 4.6 | 605 / 2082 | 3.6 / 4.3 | 4.3 / 5 | 3.3 / 4 | 15.848 | 0.6 | 2.8 / 3.3 | 3.353 / 3.943 | 135 | 1.12 | 4 | 7 | 31 | 1.3 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 7 / 8.6 | 142.9 | 6.4 / 7.8 | 605 / 827 | 6.5 / 7.7 | 7 / 8.2 | 5.9 / 6.9 | 15.204 | 0.8 | 4.5 / 5.2 | 6.125 / 6.808 | 269 | 2.661 | 6 | 9 | 217 | 2 | 0 / 0 | 4 of 4 | alert 32 -> alert 25, searching 7 |

Per added guard, patrol/facing, N 12 -> 32: sim step 0.025 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.095 ms, frame CPU 0.095 ms, frame CPU (sim frames) 0.090 ms, CPU per 1/60 s sim 0.009 ms, GPU 0.071 ms, draws 4.550.
Per added guard, alert/facing, N 12 -> 32: sim step 0.050 ms, AI manager 0.005 ms, perceive 0.000 ms, frame 0.095 ms, frame CPU 0.095 ms, frame CPU (sim frames) 0.090 ms, CPU per 1/60 s sim 0.011 ms, GPU 0.062 ms, draws 3.750.

Draws per pass (last cell of each count):

- N 12 alert/facing: sun_CSMShadowMap 50.1, PostProcessRTT-TAA 48.9, gBuffer 45.9, torchshadow-#_shadowMap 14.3, charshadow-#_shadowMap 6.3, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: sun_CSMShadowMap 56, PostProcessRTT-TAA 50.6, gBuffer 47.6, torchshadow-#_shadowMap 32.7, charshadow-#_shadowMap 7.9, RenderTargetWrapper 5.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: sun_CSMShadowMap 80, PostProcessRTT-TAA 57.9, gBuffer 54.9, torchshadow-#_shadowMap 28.7, charshadow-#_shadowMap 17.7, RenderTargetWrapper 5.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
