# Guard cap: results

Run 2026-10-24T09:46:42.481Z - 2026-10-24T09:54:13.097Z (7.5 min), version 4.93.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.8 / 1.8 | 0.313 | 0.028 | 0.237 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.235 (103.822) | 0 (0) |
| 0 | alert/facing | 0.4 / 0.9 | 0.365 | 0.032 | 0.264 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.276 (103.808) | 0 (0) |
| 12 | patrol/facing | 2.2 / 4.2 | 0.509 | 0.089 | 0.86 | 0.1 / 0.2 | 0.086 | 0.008 | 0.009 | 0.044 | 0.015 | 0.468 | 0 (0) | 0 | 0.003 (1.26) | 0 (0) | 0 (0) | 0.272 (104.258) | 0 (0) |
| 12 | alert/facing | 1 / 1.8 | 0.524 | 0.08 | 0.652 | 0.2 / 0.4 | 0.123 | 0.015 | 0.04 | 0.044 | 0.031 | 0.267 | 0.001 (0.02) | 0 | 0.006 (1.48) | 0.018 (5) | 0.003 (0.57) | 0.251 (104.927) | 0 (0) |
| 16 | patrol/facing | 1.7 / 4.1 | 0.421 | 0.071 | 0.825 | 0.1 / 0.2 | 0.072 | 0.006 | 0.013 | 0.032 | 0.01 | 0.543 | 0 (0) | 0 | 0.003 (1.285) | 0 (0) | 0 (0) | 0.237 (104.258) | 0 (0) |
| 16 | alert/facing | 1.5 / 2.6 | 0.509 | 0.079 | 0.82 | 0.2 / 0.4 | 0.147 | 0.015 | 0.055 | 0.052 | 0.027 | 0.465 | 0 (0.015) | 0 | 0.007 (1.993) | 0.013 (4.017) | 0.008 (1.27) | 0.234 (104.818) | 0 (0) |
| 24 | patrol/facing | 2.5 / 5.5 | 0.457 | 0.092 | 0.973 | 0.1 / 0.3 | 0.109 | 0.009 | 0.02 | 0.055 | 0.012 | 0.687 | 0 (0) | 0 | 0.003 (1.485) | 0 (0) | 0 (0) | 0.226 (104.265) | 0 (0) |
| 24 | alert/facing | 1.7 / 3 | 0.548 | 0.097 | 0.918 | 0.2 / 0.4 | 0.185 | 0.02 | 0.06 | 0.071 | 0.028 | 0.567 | 0.001 (0.013) | 0 | 0.009 (2.97) | 0.014 (4.983) | 0.006 (1.82) | 0.222 (104.492) | 0 (0) |
| 32 | patrol/facing | 2.3 / 3.7 | 0.524 | 0.118 | 1.189 | 0.2 / 0.3 | 0.146 | 0.013 | 0.025 | 0.077 | 0.02 | 0.863 | 0 (0) | 0 | 0.005 (1.89) | 0 (0) | 0 (0) | 0.227 (104.267) | 0 (0) |
| 32 | alert/facing | 1.9 / 2.8 | 0.659 | 0.122 | 1.129 | 0.3 / 0.6 | 0.269 | 0.027 | 0.089 | 0.103 | 0.029 | 0.718 | 0 (0.018) | 0 | 0.014 (3.93) | 0.015 (5) | 0.013 (2.513) | 0.235 (104.737) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 4 / 7.5 | 250 | 3.8 / 7.2 | 604 / 1656 | 4.2 / 7.8 | 4.3 / 7.8 | 3.6 / 6.7 | 15.768 | 0.5 | 3.1 / 6.1 | 3.687 / 6.788 | 267 | 0.88 | 2 | 5 | 300 | 0.9 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.6 / 5.6 | 384.6 | 2.4 / 5.2 | 583 / 2609 | 3 / 6.1 | 3.2 / 6.2 | 2.2 / 4.8 | 15.613 | 0.5 | 1.9 / 4.1 | 3.128 / 3.546 | 88 | 0.537 | 2 | 5 | 26 | 0.6 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 4.3 / 7 | 232.6 | 4.1 / 6.7 | 605 / 1575 | 4.3 / 7.2 | 4.6 / 7.4 | 3.8 / 6.5 | 15.763 | 0.5 | 3.3 / 5.9 | 3.87 / 6.248 | 267 | 0.88 | 2 | 5 | 300 | 0.9 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 6.1 / 10.4 | 163.9 | 5.9 / 10 | 607 / 938 | 6.1 / 11.4 | 6.3 / 10.5 | 5.4 / 9.5 | 16.026 | 0.6 | 4.5 / 8 | 5.192 / 6.905 | 341 | 2.001 | 2 | 5 | 323 | 1.6 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.7 / 6.8 | 270.3 | 3.4 / 6.5 | 603 / 1885 | 3.8 / 6.8 | 3.9 / 7.4 | 3.3 / 6 | 15.724 | 0.6 | 2.6 / 5.1 | 3.194 / 5.106 | 112 | 0.84 | 2 | 5 | 28 | 1.2 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.4 / 9.1 | 156.3 | 5.9 / 8.4 | 606 / 906 | 6.2 / 10.4 | 6.3 / 9.6 | 5.5 / 7.6 | 15.232 | 0.7 | 4.5 / 6.6 | 5.582 / 7.259 | 338 | 1.579 | 4 | 7 | 411 | 1.4 | 0 / 0 | 3 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 6.5 / 10.4 | 153.8 | 6.2 / 10.1 | 605 / 851 | 6.3 / 11.3 | 6.7 / 10.8 | 5.8 / 9.5 | 16.051 | 0.6 | 4.6 / 7.9 | 5.379 / 6.936 | 361 | 2.364 | 2 | 5 | 331 | 1.6 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 3.3 / 5.5 | 303 | 3.1 / 5.1 | 605 / 2258 | 3.2 / 6.1 | 3.9 / 6.4 | 2.9 / 4.6 | 15.686 | 0.6 | 2.4 / 4 | 3.199 / 4.633 | 112 | 0.84 | 2 | 5 | 28 | 1.1 | 0 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 7 / 10.5 | 142.9 | 6.5 / 9.9 | 607 / 768 | 6.8 / 11.3 | 6.9 / 10.9 | 6 / 9.1 | 15.429 | 0.7 | 4.9 / 7.8 | 5.985 / 7.792 | 401 | 2.482 | 4 | 7 | 383 | 1.6 | 0 / 0 | 4 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 7.4 / 10.9 | 135.1 | 7.2 / 10.7 | 605 / 696 | 7.1 / 12.2 | 7.6 / 11 | 6.7 / 9.8 | 16.137 | 0.7 | 5.3 / 7.9 | 5.144 / 6.598 | 402 | 3.04 | 2 | 5 | 346 | 2.3 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3.8 / 6.5 | 263.2 | 3.5 / 6.2 | 602 / 1882 | 3.6 / 7 | 4.4 / 7.3 | 3.3 / 5.6 | 15.776 | 0.6 | 2.8 / 4.9 | 3.312 / 4.592 | 112 | 0.84 | 2 | 5 | 28 | 1.5 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.2 / 11.8 | 122 | 7.7 / 11.2 | 608 / 577 | 7.8 / 13 | 8.1 / 12.3 | 7.1 / 9.9 | 15.597 | 0.7 | 5.8 / 8.6 | 6.235 / 7.841 | 419 | 2.827 | 4 | 7 | 398 | 2.1 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |
| 32 | patrol/facing | 8.4 / 12 | 119 | 8.1 / 11.6 | 608 / 549 | 8 / 12.6 | 8.6 / 12.1 | 7.5 / 11 | 16.182 | 0.7 | 5.9 / 8.8 | 5.618 / 7.27 | 437 | 3.603 | 2 | 5 | 359 | 2.6 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | patrol/away | 3.9 / 5.4 | 256.4 | 3.7 / 5.2 | 603 / 1889 | 3.8 / 5.5 | 4.5 / 5.7 | 3.5 / 4.5 | 15.812 | 0.6 | 2.9 / 3.8 | 3.447 / 4.337 | 112 | 0.84 | 2 | 5 | 28 | 1.5 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 9.2 / 12.8 | 108.7 | 8.7 / 12.1 | 607 / 454 | 8.8 / 13.1 | 9.1 / 12.7 | 7.9 / 11 | 15.68 | 0.8 | 6.4 / 9 | 6.752 / 8.669 | 487 | 3.968 | 4 | 7 | 408 | 2.4 | 0 / 0 | 4 of 4 | alert 32 -> alert 32 |

Per added guard, patrol/facing, N 0 -> 32: sim step 0.047 ms, AI manager 0.006 ms, perceive 0.000 ms, frame 0.138 ms, frame CPU 0.134 ms, frame CPU (sim frames) 0.134 ms, CPU per 1/60 s sim 0.013 ms, GPU 0.060 ms, draws 5.313.
Per added guard, alert/facing, N 0 -> 32: sim step 0.047 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.153 ms, frame CPU 0.144 ms, frame CPU (sim frames) 0.141 ms, CPU per 1/60 s sim -0.003 ms, GPU 0.090 ms, draws 6.875.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 114, gBuffer 112, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, charshadow-#_shadowMap 1.5, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 12 alert/facing: PostProcessRTT-TAA 122.1, gBuffer 120.1, sun_CSMShadowMap 34.6, torchshadow-#_shadowMap 30.9, charshadow-#_shadowMap 5.1, RenderTargetWrapper 3.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 16 alert/facing: PostProcessRTT-TAA 127.9, gBuffer 125.9, sun_CSMShadowMap 63.5, torchshadow-#_shadowMap 46.8, charshadow-#_shadowMap 7.5, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 132.4, gBuffer 130.4, sun_CSMShadowMap 79.3, torchshadow-#_shadowMap 38.3, charshadow-#_shadowMap 9.7, RenderTargetWrapper 3.9, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 32 alert/facing: PostProcessRTT-TAA 141.2, gBuffer 139.2, sun_CSMShadowMap 105.9, torchshadow-#_shadowMap 55.4, charshadow-#_shadowMap 11.3, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
