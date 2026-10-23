# Guard cap: results

Run 2026-10-23T00:23:55.236Z - 2026-10-23T00:32:19.205Z (8.4 min), version 4.68.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## warehouseOps:sector&sectorGuards=0&guardsun=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.8 / 1.2 | 0.489 | 0.044 | 0.329 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.384 (103.813) | 0 (0) |
| 0 | alert/facing | 0.8 / 1.1 | 0.459 | 0.032 | 0.297 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.372 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.2 / 2.3 | 0.43 | 0.079 | 0.781 | 0 / 0.1 | 0.037 | 0.008 | 0.005 | 0.012 | 0.007 | 0.47 | 0 (0) | 0 | 0.006 (2.22) | 0 (0) | 0 (0) | 0.286 (106.813) | 0 (0) |
| 12 | alert/facing | 1.3 / 2.3 | 0.689 | 0.11 | 1.145 | 0.1 / 0.3 | 0.095 | 0.015 | 0.04 | 0.027 | 0.031 | 0.654 | 0.002 (0.013) | 0.129 | 0.006 (1.488) | 0.018 (4.742) | 0.002 (0.24) | 0.318 (104.715) | 0 (0) |
| 16 | patrol/facing | 1.3 / 1.9 | 0.384 | 0.069 | 0.783 | 0.1 / 0.1 | 0.04 | 0.011 | 0.006 | 0.012 | 0.008 | 0.508 | 0 (0) | 0 | 0.007 (2.985) | 0 (0) | 0 (0) | 0.254 (106.813) | 0 (0) |
| 16 | alert/facing | 1.4 / 2.1 | 0.574 | 0.083 | 0.895 | 0.1 / 0.3 | 0.092 | 0.015 | 0.036 | 0.026 | 0.028 | 0.553 | 0.001 (0.013) | 0.101 | 0.008 (2.027) | 0.014 (4.508) | 0.002 (0.375) | 0.268 (104.622) | 0 (0) |
| 24 | patrol/facing | 1.7 / 2.3 | 0.416 | 0.087 | 1.007 | 0.1 / 0.2 | 0.057 | 0.016 | 0.01 | 0.018 | 0.01 | 0.719 | 0 (0) | 0 | 0.013 (4.445) | 0 (0) | 0 (0) | 0.258 (106.813) | 0 (0) |
| 24 | alert/facing | 2 / 3.2 | 0.708 | 0.153 | 1.581 | 0.2 / 0.4 | 0.135 | 0.024 | 0.05 | 0.035 | 0.034 | 1.079 | 0.001 (0.022) | 0.118 | 0.015 (3.018) | 0.019 (5) | 0.002 (0.44) | 0.294 (105.118) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.7 / 4.4 | 370.4 | 2.5 / 4.1 | 509 / 2366 | 2.9 / 32.8 | 3.3 / 4.9 | 2.4 / 3.5 | 16.11 | 0.6 | 1.9 / 2.9 | 3.631 / 4.49 | 104 | 0.494 | 1 | 4 | 124 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.6 / 3.8 | 384.6 | 2.4 / 3.6 | 592 / 2958 | 2.7 / 4.8 | 3.1 / 4.1 | 2.3 / 3.2 | 15.424 | 0.6 | 1.8 / 2.5 | 2.731 / 3.044 | 75 | 0.473 | 1 | 4 | 20 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.9 / 4.9 | 344.8 | 2.7 / 4.6 | 520 / 2292 | 3 / 33.7 | 3.7 / 5.4 | 2.5 / 3.9 | 16.085 | 0.6 | 2.1 / 3.3 | 3.552 / 4.112 | 104 | 0.494 | 1 | 4 | 124 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.8 / 6.4 | 208.3 | 4.6 / 6.1 | 604 / 1444 | 4.6 / 6.2 | 5.1 / 6.7 | 4.3 / 5.6 | 15.873 | 0.6 | 3.3 / 4.4 | 4.276 / 5.487 | 180 | 1.425 | 1 | 4 | 295 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.6 / 4.7 | 277.8 | 3.4 / 4.4 | 604 / 2133 | 3.4 / 4.2 | 4.1 / 4.8 | 3.2 / 4 | 15.779 | 0.5 | 2.4 / 3 | 3.134 / 3.786 | 135 | 1.173 | 1 | 4 | 24 | 1.1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6 / 7.7 | 166.7 | 5.4 / 6.9 | 604 / 1042 | 5.6 / 7.1 | 5.9 / 7.8 | 5 / 6.3 | 14.987 | 0.6 | 3.8 / 4.8 | 5.217 / 6.176 | 213 | 1.743 | 3 | 6 | 383 | 1.4 | 2 / 2 | 4 of 4 | alert 12 -> alert 11, searching 1 |
| 16 | patrol/facing | 5.5 / 6.7 | 181.8 | 5.2 / 6.5 | 605 / 1222 | 5.3 / 6.3 | 5.7 / 6.8 | 5 / 6 | 16 | 0.5 | 3.8 / 4.7 | 4.779 / 5.461 | 204 | 1.743 | 1 | 4 | 341 | 1.9 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.4 / 5.7 | 227.3 | 4.3 / 5.4 | 603 / 1610 | 4.3 / 5.3 | 4.9 / 5.8 | 4.1 / 4.9 | 15.923 | 0.5 | 3 / 3.7 | 3.374 / 4.059 | 151 | 1.372 | 1 | 4 | 24 | 1.6 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 7.1 / 9 | 140.8 | 6.5 / 8.4 | 609 / 787 | 6.9 / 8.9 | 7 / 9.3 | 6.1 / 7.6 | 15.286 | 0.6 | 4.7 / 5.9 | 5.438 / 6.541 | 250 | 2.252 | 3 | 6 | 456 | 2.3 | 2 / 2 | 4 of 4 | alert 16 -> alert 15, searching 1 |
| 24 | patrol/facing | 6.9 / 8.3 | 144.9 | 6.7 / 8.1 | 607 / 845 | 6.6 / 8.2 | 7.1 / 8.5 | 6.3 / 7.6 | 16.111 | 0.6 | 4.8 / 5.8 | 5.117 / 6.02 | 240 | 2.263 | 1 | 4 | 493 | 2.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.3 / 6.6 | 188.7 | 5.1 / 6.3 | 605 / 1258 | 5.2 / 6.3 | 5.6 / 6.7 | 4.9 / 5.9 | 15.993 | 0.5 | 3.5 / 4.2 | 3.456 / 4.287 | 171 | 1.622 | 1 | 4 | 24 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.4 / 10.3 | 119 | 7.7 / 9.5 | 605 / 581 | 8 / 10.3 | 8.1 / 10.4 | 7.2 / 8.7 | 15.34 | 0.6 | 5.5 / 6.7 | 5.755 / 6.743 | 303 | 2.98 | 3 | 6 | 639 | 2.5 | 2 / 2 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.037 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.175 ms, frame CPU 0.175 ms, frame CPU (sim frames) 0.158 ms, CPU per 1/60 s sim 0.000 ms, GPU 0.062 ms, draws 5.667.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.012 ms, perceive 0.001 ms, frame 0.229 ms, frame CPU 0.208 ms, frame CPU (sim frames) 0.183 ms, CPU per 1/60 s sim -0.031 ms, GPU 0.092 ms, draws 8.292.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 63.4, PostProcessRTT-TAA 51.6, gBuffer 48.6, maplight-shadow-#_shadowMap 25, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 16 alert/facing: sun_CSMShadowMap 71.2, PostProcessRTT-TAA 54.9, gBuffer 51.9, maplight-shadow-#_shadowMap 44.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 95.9, PostProcessRTT-TAA 64, gBuffer 61, maplight-shadow-#_shadowMap 57.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse:course&guardsun=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.7 / 1.1 | 0.399 | 0.038 | 0.263 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.296 (100.822) | 0 (0) |
| 0 | alert/facing | 0.7 / 1 | 0.384 | 0.033 | 0.24 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.293 (100.822) | 0 (0) |
| 12 | patrol/facing | 0.9 / 1.5 | 0.361 | 0.064 | 0.599 | 0 / 0.1 | 0.039 | 0.008 | 0.008 | 0.014 | 0.007 | 0.342 | 0 (0) | 0 | 0.006 (2.22) | 0 (0) | 0 (0) | 0.224 (102.673) | 0 (0) |
| 12 | alert/facing | 1.1 / 2 | 0.483 | 0.074 | 0.651 | 0.1 / 0.2 | 0.063 | 0.008 | 0.032 | 0.013 | 0.008 | 0.337 | 0 (0.002) | 0.059 | 0.005 (1.493) | 0 (0) | 0.002 (0.418) | 0.248 (101.13) | 0 (0) |
| 16 | patrol/facing | 1.2 / 1.9 | 0.389 | 0.072 | 0.656 | 0.1 / 0.1 | 0.044 | 0.009 | 0.012 | 0.013 | 0.005 | 0.405 | 0 (0) | 0 | 0.006 (2.99) | 0 (0) | 0 (0) | 0.239 (102.678) | 0 (0) |
| 16 | alert/facing | 1.2 / 2.2 | 0.478 | 0.082 | 0.683 | 0.1 / 0.2 | 0.07 | 0.008 | 0.023 | 0.026 | 0.008 | 0.39 | 0.001 (0.002) | 0.061 | 0.005 (1.99) | 0 (0) | 0.003 (0.548) | 0.25 (101.13) | 0 (0) |
| 24 | patrol/facing | 1.3 / 2 | 0.402 | 0.091 | 0.844 | 0.1 / 0.2 | 0.065 | 0.014 | 0.014 | 0.024 | 0.009 | 0.571 | 0 (0) | 0 | 0.008 (4.505) | 0 (0) | 0 (0) | 0.228 (102.678) | 0 (0) |
| 24 | alert/facing | 1.6 / 3.4 | 0.555 | 0.117 | 0.986 | 0.1 / 0.3 | 0.097 | 0.013 | 0.04 | 0.027 | 0.011 | 0.634 | 0 (0.002) | 0.074 | 0.007 (2.99) | 0 (0) | 0.004 (0.875) | 0.253 (101.122) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.4 / 4 | 416.7 | 2.2 / 3.7 | 535 / 2722 | 2.6 / 34.3 | 3.1 / 4.3 | 2.1 / 3.2 | 15.669 | 0.6 | 1.7 / 2.6 | 3.253 / 3.732 | 115 | 0.211 | 0 | 4 | 92 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2 / 3.4 | 500 | 1.8 / 3.1 | 468 / 2944 | 2.1 / 58.2 | 2.6 / 4.6 | 1.7 / 2.7 | 15.848 | 0.5 | 1.3 / 2 | 2.749 / 3.289 | 52 | 0.204 | 0 | 4 | 14 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.2 / 3.7 | 454.5 | 2 / 3.4 | 488 / 2763 | 2.5 / 45.6 | 2.8 / 4.1 | 1.9 / 3 | 16.121 | 0.5 | 1.6 / 2.4 | 3.098 / 3.642 | 115 | 0.211 | 0 | 4 | 92 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.9 / 6.7 | 204.1 | 4.6 / 6.4 | 603 / 1393 | 4.8 / 6.5 | 5.3 / 6.9 | 4.4 / 5.9 | 15.849 | 0.6 | 3.4 / 4.6 | 4.161 / 5.289 | 143 | 0.598 | 0 | 4 | 284 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.2 / 4.7 | 312.5 | 3 / 4.4 | 603 / 2466 | 3.3 / 4.7 | 3.5 / 4.9 | 2.8 / 4 | 15.601 | 0.5 | 2 / 2.8 | 3.143 / 3.803 | 56 | 0.253 | 0 | 4 | 16 | 1.2 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.3 / 5.5 | 232.6 | 4 / 5.2 | 604 / 1686 | 4.2 / 5.1 | 4.6 / 5.9 | 3.9 / 4.7 | 15.703 | 0.5 | 3 / 3.7 | 3.915 / 4.758 | 151 | 0.585 | 1 | 4 | 331 | 1.4 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 4.8 / 6.2 | 208.3 | 4.5 / 5.9 | 604 / 1467 | 4.6 / 6 | 5.1 / 6.5 | 4.3 / 5.5 | 15.898 | 0.6 | 3.3 / 4.4 | 4.153 / 5.074 | 151 | 0.733 | 0 | 4 | 360 | 1.5 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 3.3 / 4.5 | 303 | 3.1 / 4.2 | 605 / 2362 | 3.2 / 4 | 3.9 / 4.7 | 3 / 3.8 | 15.705 | 0.5 | 2.1 / 2.7 | 3.249 / 3.688 | 56 | 0.253 | 0 | 4 | 16 | 1.3 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 5.2 / 8.2 | 192.3 | 4.9 / 7.8 | 608 / 1240 | 5.1 / 9.8 | 5.4 / 10.1 | 4.7 / 6.4 | 15.85 | 0.6 | 3.7 / 5.6 | 4.334 / 5.291 | 161 | 0.728 | 1 | 4 | 369 | 2.2 | 2 / 0 | 0 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 6.5 / 7.8 | 153.8 | 6.2 / 7.6 | 606 / 948 | 6.2 / 7.5 | 6.7 / 7.9 | 5.9 / 7 | 16.055 | 0.6 | 4.6 / 5.5 | 4.809 / 5.704 | 167 | 1.004 | 0 | 4 | 512 | 2.4 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4.5 / 5.8 | 222.2 | 4.3 / 5.5 | 605 / 1586 | 4.4 / 5.5 | 4.9 / 6 | 4.1 / 5.1 | 15.843 | 0.5 | 2.8 / 3.5 | 3.296 / 3.757 | 56 | 0.253 | 0 | 4 | 16 | 1.8 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.3 / 9.9 | 137 | 6.9 / 9.6 | 605 / 734 | 7 / 10.4 | 7.4 / 10.4 | 6.4 / 8.7 | 15.94 | 0.6 | 5.1 / 7 | 4.765 / 5.878 | 189 | 1.154 | 1 | 4 | 552 | 2.5 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.025 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.171 ms, frame CPU 0.167 ms, frame CPU (sim frames) 0.150 ms, CPU per 1/60 s sim 0.016 ms, GPU 0.065 ms, draws 2.167.
Per added guard, alert/facing, N 0 -> 24: sim step 0.038 ms, AI manager 0.008 ms, perceive 0.001 ms, frame 0.212 ms, frame CPU 0.204 ms, frame CPU (sim frames) 0.192 ms, CPU per 1/60 s sim -0.008 ms, GPU 0.069 ms, draws 3.083.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 62, gBuffer 60, sun_CSMShadowMap 2.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 16 alert/facing: PostProcessRTT-TAA 64.9, gBuffer 62.9, sun_CSMShadowMap 7.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 75, gBuffer 73, sun_CSMShadowMap 14.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
