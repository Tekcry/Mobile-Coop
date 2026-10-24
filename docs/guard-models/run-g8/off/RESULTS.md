# Guard cap: results

Run 2026-10-24T01:06:28.128Z - 2026-10-24T01:21:46.924Z (15.3 min), version 4.80.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.314 | 0.026 | 0.226 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.244 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.316 | 0.025 | 0.22 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.251 (103.822) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.7 | 0.393 | 0.055 | 0.607 | 0.1 / 0.1 | 0.052 | 0.009 | 0.005 | 0.025 | 0.005 | 0.329 | 0 (0) | 0 | 0.004 (2.24) | 0 (0) | 0 (0) | 0.25 (106.808) | 0 (0) |
| 12 | alert/facing | 1.5 / 2.8 | 0.558 | 0.068 | 0.814 | 0.1 / 0.4 | 0.102 | 0.01 | 0.04 | 0.028 | 0.022 | 0.453 | 0.001 (0.015) | 0.094 | 0.005 (1.508) | 0.016 (4.842) | 0.004 (0.68) | 0.249 (105.04) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2.2 | 0.432 | 0.087 | 0.937 | 0.1 / 0.2 | 0.082 | 0.018 | 0.01 | 0.029 | 0.009 | 0.604 | 0 (0) | 0 | 0.011 (4.47) | 0 (0) | 0 (0) | 0.246 (106.813) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.6 | 0.597 | 0.103 | 1.027 | 0.2 / 0.5 | 0.161 | 0.015 | 0.056 | 0.056 | 0.024 | 0.677 | 0.002 (0.027) | 0.088 | 0.008 (3.04) | 0.015 (5) | 0.006 (1.342) | 0.228 (104.88) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.8 / 3.7 | 555.6 | 1.7 / 3.5 | 440 / 2806 | 1.9 / 58.3 | 2.4 / 4.1 | 1.6 / 2.6 | 16.212 | 0.4 | 1.3 / 2.2 | 3.294 / 3.392 | 104 | 0.494 | 1 | 4 | 121 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.7 / 3.1 | 588.2 | 1.6 / 2.8 | 513 / 3476 | 1.8 / 43.7 | 2.3 / 3.7 | 1.5 / 2.3 | 15.634 | 0.4 | 1.2 / 1.9 | 2.41 / 2.725 | 77 | 0.473 | 1 | 4 | 23 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.9 / 12.8 | 526.3 | 1.8 / 12.7 | 525 / 2602 | 2.2 / 32.5 | 2.6 / 3.7 | 1.7 / 14.9 | 15.897 | 0.4 | 1.4 / 12.2 | 3.058 / 3.635 | 104 | 0.494 | 1 | 4 | 122 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.5 / 5.9 | 222.2 | 4.3 / 5.6 | 603 / 1587 | 4.3 / 5.5 | 4.9 / 6 | 4.1 / 5.1 | 15.936 | 0.6 | 3.2 / 4.1 | 4.082 / 5.103 | 187 | 1.489 | 2 | 5 | 293 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.9 / 5 | 256.4 | 3.7 / 4.8 | 604 / 1905 | 3.8 / 4.7 | 4.3 / 5.2 | 3.6 / 4.3 | 15.858 | 0.5 | 2.9 / 3.5 | 3.41 / 4.168 | 155 | 1.317 | 5 | 8 | 27 | 1.1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.6 / 6.9 | 178.6 | 5.1 / 6.3 | 605 / 1156 | 5.4 / 6.4 | 5.7 / 7.1 | 4.8 / 5.7 | 15.059 | 0.6 | 3.7 / 4.4 | 5.002 / 5.82 | 217 | 1.776 | 4 | 7 | 386 | 1.6 | 2 / 2 | 3 of 4 | alert 12 -> alert 10, searching 2 |
| 24 | patrol/facing | 6.6 / 8 | 151.5 | 6.3 / 7.7 | 606 / 914 | 6.4 / 7.7 | 6.9 / 8 | 6 / 7.3 | 16.089 | 0.6 | 4.7 / 5.7 | 5.128 / 5.91 | 258 | 2.481 | 2 | 5 | 487 | 2.1 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.3 / 6.4 | 188.7 | 5 / 6.2 | 603 / 1288 | 5.1 / 5.9 | 5.7 / 6.5 | 4.8 / 5.6 | 16.044 | 0.6 | 4 / 4.7 | 4.277 / 4.926 | 219 | 2.162 | 4 | 8 | 27 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.7 / 9.3 | 129.9 | 7.1 / 8.7 | 607 / 696 | 7.3 / 8.8 | 7.5 / 9.3 | 6.6 / 7.7 | 15.353 | 0.7 | 5 / 5.9 | 5.436 / 6.228 | 277 | 2.587 | 5 | 8 | 536 | 2.2 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.200 ms, frame CPU 0.192 ms, frame CPU (sim frames) 0.188 ms, CPU per 1/60 s sim -0.005 ms, GPU 0.076 ms, draws 6.417.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.012 ms, perceive 0.001 ms, frame 0.242 ms, frame CPU 0.221 ms, frame CPU (sim frames) 0.204 ms, CPU per 1/60 s sim -0.023 ms, GPU 0.099 ms, draws 7.208.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 51.7, gBuffer 48.7, maplight-shadow-#_shadowMap 22.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.8, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 92.1, PostProcessRTT-TAA 63.5, gBuffer 60.5, maplight-shadow-#_shadowMap 23.8, charshadow-#_shadowMap 10.2, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.8 | 0.313 | 0.026 | 0.225 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.234 (100.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.6 | 0.299 | 0.022 | 0.199 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.235 (100.813) | 0 (0) |
| 12 | patrol/facing | 1 / 1.4 | 0.327 | 0.056 | 0.612 | 0.1 / 0.1 | 0.048 | 0.005 | 0.006 | 0.019 | 0.005 | 0.36 | 0 (0) | 0 | 0.003 (2.245) | 0 (0) | 0 (0) | 0.203 (102.67) | 0 (0) |
| 12 | alert/facing | 1.2 / 1.9 | 0.432 | 0.059 | 0.678 | 0.1 / 0.3 | 0.089 | 0.006 | 0.034 | 0.029 | 0.005 | 0.373 | 0 (0.012) | 0.054 | 0.003 (1.48) | 0 (0) | 0.004 (1.19) | 0.203 (101.125) | 0 (0) |
| 24 | patrol/facing | 1.7 / 2.3 | 0.415 | 0.087 | 1.085 | 0.1 / 0.2 | 0.094 | 0.011 | 0.013 | 0.048 | 0.011 | 0.726 | 0 (0) | 0 | 0.007 (4.5) | 0 (0) | 0 (0) | 0.205 (102.667) | 0 (0) |
| 24 | alert/facing | 1.8 / 3.2 | 0.494 | 0.088 | 1.056 | 0.2 / 0.5 | 0.134 | 0.008 | 0.049 | 0.042 | 0.009 | 0.694 | 0 (0.012) | 0.055 | 0.006 (2.967) | 0 (0) | 0.009 (2.55) | 0.198 (101.122) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.7 / 3.3 | 588.2 | 1.6 / 3.1 | 491 / 3313 | 1.8 / 41.2 | 2.2 / 3.7 | 1.5 / 2.3 | 15.84 | 0.4 | 1.2 / 2 | 2.669 / 3.094 | 131 | 0.34 | 2 | 6 | 92 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.3 / 2.3 | 769.2 | 1.2 / 2.1 | 385 / 3515 | 1.4 / 69.9 | 1.8 / 3.5 | 1.2 / 1.8 | 16.581 | 0.4 | 0.9 / 1.5 | 2.56 / 2.611 | 68 | 0.334 | 2 | 6 | 14 | 0.3 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.6 / 3.3 | 625 | 1.5 / 3.1 | 476 / 3247 | 1.7 / 42.3 | 2.1 / 3.6 | 1.5 / 2.2 | 15.862 | 0.4 | 1.2 / 1.9 | 2.69 / 3.06 | 131 | 0.34 | 2 | 6 | 92 | 0.3 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.4 / 5.5 | 227.3 | 4.2 / 5.3 | 604 / 1656 | 4.3 / 5.2 | 4.7 / 5.6 | 4.1 / 4.9 | 15.966 | 0.5 | 3.1 / 3.8 | 3.884 / 4.615 | 165 | 0.866 | 1 | 6 | 284 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.2 / 4.2 | 312.5 | 3.1 / 4 | 605 / 2456 | 3.2 / 4 | 3.6 / 4.4 | 2.9 / 3.6 | 15.794 | 0.5 | 2.4 / 2.9 | 3.148 / 3.499 | 98 | 0.764 | 2 | 6 | 16 | 1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.6 / 5.9 | 217.4 | 4.4 / 5.6 | 604 / 1530 | 4.5 / 5.5 | 4.9 / 6.2 | 4.2 / 5.1 | 15.75 | 0.5 | 3.2 / 4 | 4.129 / 4.743 | 191 | 1.102 | 3 | 6 | 312 | 1.4 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 7 / 8.4 | 142.9 | 6.8 / 8.1 | 608 / 816 | 6.8 / 7.9 | 7.2 / 8.4 | 6.5 / 7.5 | 16.103 | 0.6 | 5 / 5.9 | 5.089 / 5.752 | 235 | 1.945 | 2 | 6 | 512 | 2.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.2 / 6.3 | 192.3 | 5 / 6.1 | 605 / 1328 | 5 / 5.9 | 5.5 / 6.4 | 4.8 / 5.6 | 15.977 | 0.5 | 3.9 / 4.6 | 3.742 / 4.712 | 90 | 0.724 | 1 | 6 | 16 | 1.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.3 / 9 | 137 | 7 / 8.6 | 606 / 755 | 7.1 / 8.7 | 7.5 / 9 | 6.6 / 8.1 | 15.921 | 0.6 | 5.1 / 6.2 | 5.129 / 5.916 | 224 | 1.633 | 2 | 6 | 530 | 2.2 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.005 ms, perceive 0.000 ms, frame 0.221 ms, frame CPU 0.217 ms, frame CPU (sim frames) 0.208 ms, CPU per 1/60 s sim 0.011 ms, GPU 0.101 ms, draws 4.333.
Per added guard, alert/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.009 ms, perceive 0.000 ms, frame 0.237 ms, frame CPU 0.229 ms, frame CPU (sim frames) 0.225 ms, CPU per 1/60 s sim 0.002 ms, GPU 0.102 ms, draws 3.875.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, charshadow-#_shadowMap 10.5, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 60.7, gBuffer 58.7, charshadow-#_shadowMap 31.5, sun_CSMShadowMap 7.8, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: PostProcessRTT-TAA 72.5, gBuffer 70.5, charshadow-#_shadowMap 49.1, sun_CSMShadowMap 18.3, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |


Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.

## Errors

- campusops x 0: page.waitForFunction: Timeout 180000ms exceeded.
- campusops x 12: page.waitForFunction: Timeout 180000ms exceeded.
- campusops x 24: page.waitForFunction: Timeout 180000ms exceeded.
