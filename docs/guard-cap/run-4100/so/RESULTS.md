# Guard cap: results

Run 2026-10-24T20:14:39.162Z - 2026-10-24T20:18:01.711Z (3.4 min), version 4.100.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 1.5 / 2.7 | 0.384 | 0.052 | 0.571 | 0.1 / 0.2 | 0.047 | 0.006 | 0.007 | 0.02 | 0.009 | 0.312 | 0 (0) | 0 | 0.005 (1.82) | 0 (0) | 0 (0) | 0.242 (106.813) | 0 (0) |
| 12 | alert/facing | 1.2 / 1.7 | 0.5 | 0.063 | 0.747 | 0.2 / 0.4 | 0.137 | 0.011 | 0.054 | 0.043 | 0.029 | 0.414 | 0.016 (0.06) | 0 | 0.006 (1.502) | 0.017 (4.842) | 0.003 (0.682) | 0.239 (104.913) | 0 (0) |
| 16 | patrol/facing | 1.7 / 2.6 | 0.381 | 0.053 | 0.622 | 0.1 / 0.2 | 0.057 | 0.009 | 0.007 | 0.025 | 0.01 | 0.364 | 0 (0) | 0 | 0.005 (2.565) | 0 (0) | 0 (0) | 0.226 (106.808) | 0 (0) |
| 16 | alert/facing | 1.5 / 2.3 | 0.538 | 0.083 | 0.88 | 0.2 / 0.6 | 0.173 | 0.014 | 0.086 | 0.043 | 0.03 | 0.507 | 0.038 (0.108) | 0 | 0.005 (1.968) | 0.014 (4.783) | 0.004 (1.068) | 0.23 (104.808) | 0 (0) |
| 32 | patrol/facing | 1.8 / 3.2 | 0.456 | 0.088 | 0.942 | 0.1 / 0.2 | 0.109 | 0.019 | 0.015 | 0.049 | 0.022 | 0.681 | 0 (0) | 0 | 0.012 (5.105) | 0 (0) | 0 (0) | 0.235 (106.808) | 0 (0) |
| 32 | alert/facing | 2.3 / 3.4 | 0.644 | 0.125 | 1.41 | 0.3 / 1 | 0.236 | 0.019 | 0.097 | 0.076 | 0.044 | 0.996 | 0.038 (0.115) | 0 | 0.011 (3.97) | 0.013 (5) | 0.011 (1.923) | 0.24 (104.663) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | patrol/facing | 4.3 / 5.8 | 232.6 | 4.1 / 5.5 | 604 / 1701 | 4.2 / 5.8 | 4.7 / 6.1 | 3.9 / 5.2 | 15.89 | 0.6 | 3.1 / 4 | 4.157 / 5.436 | 164 | 1.281 | 2 | 5 | 140 | 1.3 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.1 / 4 | 322.6 | 2.9 / 3.8 | 603 / 2609 | 3 / 3.6 | 3.6 / 4.1 | 2.8 / 3.3 | 15.721 | 0.5 | 2.3 / 2.7 | 2.826 / 3.55 | 108 | 0.706 | 4 | 7 | 31 | 1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.3 / 6.6 | 188.7 | 4.8 / 5.9 | 605 / 1262 | 5.1 / 6.1 | 5.4 / 6.3 | 4.6 / 5.3 | 14.977 | 0.6 | 3.5 / 4 | 5.211 / 6.179 | 217 | 1.807 | 5 | 8 | 191 | 1.5 | 0 / 0 | 4 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 4.5 / 5.6 | 222.2 | 4.3 / 5.4 | 606 / 1596 | 4.4 / 5.3 | 4.9 / 5.8 | 4.1 / 5 | 15.915 | 0.5 | 3.2 / 3.8 | 4.232 / 5.211 | 192 | 1.683 | 3 | 6 | 146 | 1.5 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 3.5 / 4.5 | 285.7 | 3.3 / 4.2 | 602 / 2227 | 3.4 / 4.1 | 4 / 4.6 | 3.2 / 3.8 | 15.8 | 0.5 | 2.6 / 3.1 | 3.142 / 3.807 | 113 | 0.775 | 5 | 8 | 31 | 1.1 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 5.6 / 6.9 | 178.6 | 5.1 / 6.2 | 603 / 1159 | 5.4 / 6.2 | 5.8 / 6.6 | 4.9 / 5.5 | 15.156 | 0.6 | 3.7 / 4.2 | 5.384 / 6.233 | 236 | 2.07 | 6 | 9 | 191 | 1.6 | 0 / 0 | 4 of 4 | alert 16 -> alert 16 |
| 32 | patrol/facing | 6.4 / 7.7 | 156.3 | 6.2 / 7.4 | 605 / 956 | 6.1 / 7.2 | 6.7 / 7.7 | 5.8 / 6.9 | 16.122 | 0.7 | 4.4 / 5.1 | 5.416 / 6.049 | 263 | 2.861 | 3 | 6 | 176 | 2.3 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 4 / 5.3 | 250 | 3.8 / 5 | 603 / 1834 | 3.9 / 4.7 | 4.6 / 5.5 | 3.7 / 4.4 | 15.89 | 0.6 | 3 / 3.6 | 3.501 / 4.048 | 116 | 0.837 | 4 | 7 | 31 | 1.6 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 7.4 / 9 | 135.1 | 6.9 / 8.3 | 605 / 743 | 6.9 / 7.9 | 7.5 / 8.6 | 6.4 / 7.2 | 15.419 | 0.8 | 4.8 / 5.4 | 6.133 / 6.793 | 289 | 2.918 | 6 | 9 | 256 | 2.3 | 0 / 0 | 4 of 4 | alert 32 -> alert 27, searching 5 |

Per added guard, patrol/facing, N 12 -> 32: sim step 0.015 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.105 ms, frame CPU 0.105 ms, frame CPU (sim frames) 0.100 ms, CPU per 1/60 s sim 0.012 ms, GPU 0.063 ms, draws 4.950.
Per added guard, alert/facing, N 12 -> 32: sim step 0.055 ms, AI manager 0.007 ms, perceive 0.000 ms, frame 0.105 ms, frame CPU 0.105 ms, frame CPU (sim frames) 0.105 ms, CPU per 1/60 s sim 0.022 ms, GPU 0.046 ms, draws 3.600.

Draws per pass (last cell of each count):

- N 12 alert/facing: PostProcessRTT-TAA 51.7, gBuffer 48.7, sun_CSMShadowMap 39.2, torchshadow-#_shadowMap 31.7, charshadow-#_shadowMap 14.7, RenderTargetWrapper 5.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: PostProcessRTT-TAA 54.2, gBuffer 51.2, sun_CSMShadowMap 43.6, torchshadow-#_shadowMap 35.3, charshadow-#_shadowMap 19.2, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: PostProcessRTT-TAA 65.3, gBuffer 62.3, sun_CSMShadowMap 60.9, torchshadow-#_shadowMap 33.2, charshadow-#_shadowMap 30.4, RenderTargetWrapper 5.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
