# Guard cap: results

Run 2026-10-24T00:51:11.676Z - 2026-10-24T01:06:26.749Z (15.3 min), version 4.80.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.8 | 0.301 | 0.026 | 0.21 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.232 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.336 | 0.025 | 0.209 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.264 (103.813) | 0 (0) |
| 12 | patrol/facing | 1 / 1.4 | 0.382 | 0.056 | 0.604 | 0.1 / 0.1 | 0.049 | 0.006 | 0.005 | 0.021 | 0.006 | 0.335 | 0 (0) | 0 | 0.003 (2.245) | 0 (0) | 0 (0) | 0.244 (106.813) | 0 (0) |
| 12 | alert/facing | 1.3 / 2.3 | 0.506 | 0.065 | 0.693 | 0.1 / 0.4 | 0.083 | 0.011 | 0.029 | 0.026 | 0.019 | 0.386 | 0.001 (0.022) | 0.084 | 0.004 (1.513) | 0.012 (3.75) | 0.005 (0.862) | 0.238 (104.637) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2.1 | 0.391 | 0.069 | 0.845 | 0.1 / 0.2 | 0.077 | 0.016 | 0.009 | 0.031 | 0.007 | 0.559 | 0 (0) | 0 | 0.01 (4.46) | 0 (0) | 0 (0) | 0.226 (106.813) | 0 (0) |
| 24 | alert/facing | 1.7 / 3 | 0.628 | 0.102 | 1.26 | 0.2 / 0.8 | 0.178 | 0.019 | 0.062 | 0.06 | 0.026 | 0.855 | 0.001 (0.025) | 0.089 | 0.009 (2.99) | 0.016 (5) | 0.006 (1.178) | 0.231 (104.787) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.8 / 4.1 | 555.6 | 1.6 / 3.9 | 425 / 2743 | 1.9 / 61.2 | 2.4 / 5.3 | 1.6 / 3.1 | 16.198 | 0.4 | 1.3 / 2.9 | 3.194 / 3.514 | 104 | 0.494 | 1 | 4 | 122 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.5 / 2.6 | 666.7 | 1.3 / 2.4 | 397 / 3409 | 1.5 / 60.6 | 2 / 3.9 | 1.3 / 2 | 16.007 | 0.4 | 1.1 / 1.7 | 2.625 / 2.722 | 77 | 0.473 | 1 | 4 | 23 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.7 / 4.1 | 588.2 | 1.6 / 3.9 | 417 / 2762 | 1.9 / 64.8 | 2.3 / 4.2 | 1.5 / 3.5 | 16.555 | 0.4 | 1.2 / 3.2 | 3.297 / 3.558 | 104 | 0.494 | 1 | 4 | 122 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.6 / 5.7 | 217.4 | 4.4 / 5.4 | 604 / 1551 | 4.5 / 5.2 | 5 / 5.8 | 4.2 / 5 | 15.964 | 0.5 | 3.3 / 4 | 4.264 / 5.053 | 189 | 1.058 | 2 | 5 | 295 | 1.2 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.7 / 4.7 | 270.3 | 3.6 / 4.5 | 604 / 2034 | 3.7 / 4.4 | 4.2 / 4.9 | 3.4 / 4.2 | 15.873 | 0.5 | 2.8 / 3.3 | 3.401 / 4.021 | 160 | 1.035 | 5 | 8 | 27 | 1.1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.7 / 7 | 175.4 | 5.2 / 6.4 | 606 / 1137 | 5.5 / 6.5 | 5.7 / 6.9 | 4.9 / 5.7 | 15.134 | 0.6 | 3.8 / 4.5 | 5.128 / 5.972 | 223 | 1.076 | 4 | 7 | 352 | 1.4 | 2 / 2 | 4 of 4 | alert 12 -> searching 2, alert 10 |
| 24 | patrol/facing | 7.2 / 8.6 | 138.9 | 7 / 8.3 | 606 / 776 | 7 / 8.3 | 7.4 / 8.6 | 6.7 / 7.8 | 16.144 | 0.6 | 5.3 / 6.3 | 5.387 / 6.021 | 260 | 1.417 | 2 | 5 | 489 | 2.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.8 / 7 | 172.4 | 5.6 / 6.8 | 607 / 1119 | 5.6 / 6.6 | 6.2 / 7.1 | 5.3 / 6.3 | 16.026 | 0.6 | 4.4 / 5.2 | 4.494 / 5.1 | 234 | 1.658 | 5 | 8 | 27 | 1.9 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 9 / 11.1 | 111.1 | 8.3 / 10.4 | 607 / 506 | 8.6 / 10.9 | 8.7 / 11 | 7.8 / 9.4 | 15.487 | 0.7 | 6 / 7.3 | 5.934 / 7 | 301 | 1.445 | 5 | 8 | 568 | 2.4 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.225 ms, frame CPU 0.225 ms, frame CPU (sim frames) 0.208 ms, CPU per 1/60 s sim -0.002 ms, GPU 0.091 ms, draws 6.500.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.013 ms, perceive 0.001 ms, frame 0.304 ms, frame CPU 0.279 ms, frame CPU (sim frames) 0.267 ms, CPU per 1/60 s sim -0.044 ms, GPU 0.110 ms, draws 8.208.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 51.1, gBuffer 48.1, maplight-shadow-#_shadowMap 33, RenderTargetWrapper 2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, charshadow-#_shadowMap 1.7, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 95.7, PostProcessRTT-TAA 63.6, gBuffer 60.6, maplight-shadow-#_shadowMap 50.4, charshadow-#_shadowMap 5, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.8 | 0.307 | 0.028 | 0.232 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.233 (100.813) | 0 (0) |
| 0 | alert/facing | 0.4 / 0.7 | 0.288 | 0.025 | 0.198 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.219 (100.813) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.373 | 0.065 | 0.748 | 0.1 / 0.2 | 0.06 | 0.007 | 0.008 | 0.026 | 0.006 | 0.436 | 0 (0) | 0 | 0.004 (2.235) | 0 (0) | 0 (0) | 0.211 (102.67) | 0 (0) |
| 12 | alert/facing | 1.1 / 1.7 | 0.433 | 0.058 | 0.694 | 0.1 / 0.3 | 0.09 | 0.005 | 0.035 | 0.029 | 0.006 | 0.384 | 0 (0.013) | 0.056 | 0.002 (1.49) | 0 (0) | 0.005 (1.242) | 0.205 (101.125) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2 | 0.386 | 0.07 | 0.949 | 0.1 / 0.2 | 0.085 | 0.009 | 0.013 | 0.041 | 0.009 | 0.662 | 0 (0) | 0 | 0.007 (4.485) | 0 (0) | 0 (0) | 0.208 (102.67) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.8 | 0.468 | 0.085 | 0.979 | 0.1 / 0.4 | 0.116 | 0.008 | 0.043 | 0.039 | 0.009 | 0.649 | 0 (0.008) | 0.054 | 0.005 (2.977) | 0 (0) | 0.009 (2.513) | 0.199 (101.125) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.7 / 3.3 | 588.2 | 1.6 / 3.1 | 494 / 3241 | 1.8 / 40.8 | 2.2 / 3.8 | 1.5 / 2.2 | 15.846 | 0.4 | 1.2 / 2 | 2.644 / 3.075 | 131 | 0.34 | 2 | 6 | 92 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.3 / 2.2 | 769.2 | 1.2 / 2 | 368 / 3543 | 1.3 / 70.4 | 1.7 / 3.5 | 1.1 / 1.7 | 16.768 | 0.3 | 0.9 / 1.4 | 2.567 / 2.644 | 60 | 0.269 | 1 | 5 | 14 | 0.3 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2 / 3.5 | 500 | 1.8 / 3.2 | 526 / 3098 | 2.1 / 36.9 | 2.4 / 3.7 | 1.7 / 2.6 | 15.738 | 0.4 | 1.4 / 2.2 | 2.875 / 3.279 | 131 | 0.34 | 2 | 6 | 92 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.9 / 6.1 | 204.1 | 4.7 / 5.9 | 605 / 1424 | 4.7 / 6 | 5.1 / 6.1 | 4.5 / 5.5 | 15.925 | 0.5 | 3.4 / 4.3 | 4.181 / 5.13 | 165 | 0.645 | 1 | 6 | 284 | 1.2 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.3 / 4.2 | 303 | 3.1 / 3.9 | 603 / 2429 | 3.2 / 4 | 3.6 / 4.3 | 3 / 3.6 | 15.765 | 0.5 | 2.3 / 2.9 | 3.182 / 3.67 | 98 | 0.671 | 2 | 6 | 16 | 1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.8 / 5.9 | 208.3 | 4.6 / 5.6 | 606 / 1454 | 4.7 / 5.6 | 5.1 / 6.2 | 4.4 / 5.1 | 15.736 | 0.5 | 3.4 / 4 | 4.255 / 4.936 | 206 | 0.759 | 3 | 6 | 305 | 1.2 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 7.1 / 8.4 | 140.8 | 6.9 / 8.1 | 607 / 803 | 6.9 / 8 | 7.3 / 8.4 | 6.6 / 7.6 | 16.147 | 0.5 | 5.1 / 6 | 5.63 / 6.461 | 235 | 1.232 | 2 | 6 | 512 | 2.1 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4.9 / 6 | 204.1 | 4.7 / 5.8 | 604 / 1425 | 4.8 / 5.7 | 5.2 / 6.1 | 4.5 / 5.3 | 15.97 | 0.5 | 3.7 / 4.4 | 3.25 / 4.025 | 94 | 0.615 | 1 | 6 | 16 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.7 / 9.3 | 129.9 | 7.4 / 8.9 | 608 / 697 | 7.4 / 8.9 | 7.8 / 9.4 | 7 / 8.1 | 16.002 | 0.6 | 5.5 / 6.4 | 5.705 / 6.409 | 253 | 1.173 | 3 | 6 | 532 | 2.2 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.037 ms, AI manager 0.004 ms, perceive 0.000 ms, frame 0.225 ms, frame CPU 0.221 ms, frame CPU (sim frames) 0.212 ms, CPU per 1/60 s sim 0.013 ms, GPU 0.124 ms, draws 4.333.
Per added guard, alert/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.008 ms, perceive 0.000 ms, frame 0.238 ms, frame CPU 0.233 ms, frame CPU (sim frames) 0.225 ms, CPU per 1/60 s sim 0.011 ms, GPU 0.118 ms, draws 5.083.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, charshadow-#_shadowMap 10.5, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 60.6, gBuffer 58.6, charshadow-#_shadowMap 31.5, sun_CSMShadowMap 20.3, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: PostProcessRTT-TAA 73.9, gBuffer 71.9, charshadow-#_shadowMap 49.5, sun_CSMShadowMap 16, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

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
