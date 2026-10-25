# Guard cap: results

Run 2026-10-24T23:08:27.273Z - 2026-10-24T23:11:53.592Z (3.4 min), version 4.100.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 2.3 / 3.9 | 0.779 | 0.114 | 1.192 | 0.1 / 0.3 | 0.105 | 0.012 | 0.013 | 0.045 | 0.019 | 0.658 | 0 (0) | 0 | 0.006 (1.825) | 0 (0) | 0 (0) | 0.486 (106.813) | 0 (0) |
| 12 | alert/facing | 2.4 / 4 | 0.781 | 0.093 | 1.135 | 0.2 / 0.6 | 0.178 | 0.018 | 0.077 | 0.05 | 0.037 | 0.641 | 0.028 (0.058) | 0 | 0.008 (1.503) | 0.014 (3.233) | 0.006 (0.912) | 0.423 (104.737) | 0 (0) |
| 16 | patrol/facing | 1.7 / 3.8 | 0.621 | 0.093 | 1.017 | 0.1 / 0.3 | 0.094 | 0.016 | 0.013 | 0.04 | 0.018 | 0.577 | 0 (0) | 0 | 0.009 (2.57) | 0 (0) | 0 (0) | 0.368 (106.822) | 0 (0) |
| 16 | alert/facing | 1.8 / 4.2 | 0.673 | 0.093 | 1.062 | 0.2 / 0.7 | 0.186 | 0.014 | 0.094 | 0.042 | 0.039 | 0.627 | 0.037 (0.1) | 0 | 0.007 (1.993) | 0.019 (4.783) | 0.007 (1.045) | 0.33 (104.62) | 0 (0) |
| 32 | patrol/facing | 2.9 / 5.2 | 0.766 | 0.135 | 1.582 | 0.2 / 0.5 | 0.175 | 0.031 | 0.022 | 0.076 | 0.043 | 1.134 | 0 (0) | 0 | 0.022 (5.155) | 0 (0) | 0 (0) | 0.397 (106.808) | 0 (0) |
| 32 | alert/facing | 2.5 / 5.5 | 0.935 | 0.167 | 1.928 | 0.3 / 1.2 | 0.356 | 0.032 | 0.142 | 0.119 | 0.051 | 1.359 | 0.051 (0.127) | 0 | 0.018 (3.967) | 0.025 (5) | 0.012 (1.485) | 0.361 (104.707) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 5.2 / 9.2 | 192.3 | 5 / 8.8 | 605 / 1156 | 5.6 / 9.2 | 6.3 / 9.8 | 4.5 / 8 | 15.952 | 0.7 | 3.7 / 6.4 | 4.868 / 7.065 | 171 | 1.356 | 3 | 6 | 141 | 1.4 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.6 / 6.2 | 277.8 | 3.4 / 6 | 605 / 1981 | 3.7 / 5.8 | 4.3 / 6.7 | 3.2 / 5.3 | 15.762 | 0.6 | 2.6 / 4.3 | 3.105 / 4.383 | 108 | 0.706 | 4 | 7 | 31 | 1.1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.7 / 10.8 | 149.3 | 6 / 9.9 | 605 / 819 | 6.6 / 11.1 | 6.8 / 10.4 | 5.4 / 8.4 | 15.049 | 0.8 | 4.2 / 6.9 | 5.956 / 7.724 | 211 | 1.733 | 6 | 9 | 188 | 1.6 | 0 / 0 | 4 of 4 | alert 12 -> alert 11, searching 1 |
| 16 | patrol/facing | 7 / 10.5 | 142.9 | 6.7 / 10.2 | 606 / 800 | 7.1 / 11.3 | 7.7 / 10.8 | 6.1 / 9.1 | 16.015 | 0.9 | 5.1 / 7.3 | 5.837 / 7.635 | 171 | 1.433 | 1 | 4 | 146 | 1.8 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.4 / 7.3 | 227.3 | 4.1 / 6.9 | 606 / 1570 | 4.5 / 7.2 | 5 / 7.7 | 3.8 / 6.2 | 15.827 | 0.7 | 3.2 / 5.2 | 3.71 / 4.929 | 112 | 0.774 | 4 | 7 | 31 | 1.6 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 9 / 12.9 | 111.1 | 8.3 / 12 | 606 / 491 | 9.3 / 13.3 | 9.3 / 12.4 | 7.2 / 10.8 | 15.335 | 1 | 6 / 8.6 | 7.444 / 9.564 | 235 | 2.072 | 6 | 9 | 199 | 2.3 | 0 / 0 | 4 of 4 | alert 16 -> alert 15, searching 1 |
| 32 | patrol/facing | 9.7 / 14.8 | 103.1 | 9.5 / 14.4 | 601 / 399 | 10.2 / 16 | 10.4 / 15.2 | 8.2 / 12.9 | 16.194 | 0.9 | 6.6 / 10.1 | 6.931 / 9.648 | 263 | 2.861 | 3 | 6 | 176 | 3.8 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 5.5 / 9.1 | 181.8 | 5.2 / 8.7 | 606 / 1126 | 5.5 / 9.2 | 6.2 / 9.6 | 4.7 / 7.8 | 15.93 | 0.8 | 4 / 6.6 | 4.173 / 5.68 | 119 | 0.858 | 5 | 8 | 31 | 2 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 11.5 / 16.8 | 87 | 10.8 / 15.9 | 607 / 244 | 12.1 / 17.4 | 11.6 / 16.4 | 9.1 / 13.2 | 15.642 | 1 | 7.4 / 11.2 | 8.196 / 11.128 | 321 | 3.481 | 6 | 9 | 280 | 3.9 | 0 / 0 | 4 of 4 | alert 32 -> alert 28, searching 4 |

Per added guard, patrol/facing, N 12 -> 32: sim step 0.030 ms, AI manager 0.005 ms, perceive 0.001 ms, frame 0.225 ms, frame CPU 0.225 ms, frame CPU (sim frames) 0.205 ms, CPU per 1/60 s sim 0.012 ms, GPU 0.103 ms, draws 4.600.
Per added guard, alert/facing, N 12 -> 32: sim step 0.005 ms, AI manager 0.011 ms, perceive 0.001 ms, frame 0.240 ms, frame CPU 0.240 ms, frame CPU (sim frames) 0.240 ms, CPU per 1/60 s sim 0.030 ms, GPU 0.112 ms, draws 5.500.

Draws per pass (last cell of each count):

- N 12 alert/facing: PostProcessRTT-TAA 51.7, gBuffer 48.7, sun_CSMShadowMap 38.8, torchshadow-#_shadowMap 29.2, charshadow-#_shadowMap 13.8, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: PostProcessRTT-TAA 53.9, gBuffer 50.9, sun_CSMShadowMap 46.7, torchshadow-#_shadowMap 31.6, charshadow-#_shadowMap 21.8, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: PostProcessRTT-TAA 67.6, sun_CSMShadowMap 65.5, gBuffer 64.6, torchshadow-#_shadowMap 54.4, charshadow-#_shadowMap 30.8, RenderTargetWrapper 5.9, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
