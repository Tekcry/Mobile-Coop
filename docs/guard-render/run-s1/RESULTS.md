# Guard cap: results

Run 2026-10-22T23:07:45.794Z - 2026-10-22T23:16:50.379Z (9.1 min), version 4.68.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.8 / 1.2 | 0.458 | 0.041 | 0.312 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.355 (103.813) | 0 (0) |
| 0 | alert/facing | 0.7 / 1 | 0.407 | 0.031 | 0.255 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.329 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.4 / 2.2 | 0.391 | 0.074 | 0.735 | 0 / 0.1 | 0.036 | 0.01 | 0.006 | 0.012 | 0.007 | 0.43 | 0 (0) | 0 | 0.005 (2.255) | 0 (0) | 0 (0) | 0.256 (106.813) | 0 (0) |
| 12 | alert/facing | 1.5 / 3.1 | 0.581 | 0.089 | 0.89 | 0.1 / 0.3 | 0.075 | 0.014 | 0.029 | 0.019 | 0.029 | 0.485 | 0.002 (0.013) | 0.1 | 0.007 (1.543) | 0.017 (4.533) | 0.002 (0.275) | 0.268 (104.783) | 0 (0) |
| 16 | patrol/facing | 1.4 / 2 | 0.398 | 0.078 | 0.847 | 0.1 / 0.1 | 0.041 | 0.01 | 0.007 | 0.014 | 0.008 | 0.543 | 0 (0) | 0 | 0.007 (2.99) | 0 (0) | 0 (0) | 0.249 (106.822) | 0 (0) |
| 16 | alert/facing | 1.8 / 4 | 0.622 | 0.126 | 1.18 | 0.1 / 0.3 | 0.099 | 0.015 | 0.039 | 0.026 | 0.029 | 0.71 | 0.001 (0.012) | 0.107 | 0.008 (1.997) | 0.015 (4.417) | 0.003 (0.348) | 0.274 (104.702) | 0 (0) |
| 24 | patrol/facing | 1.8 / 3.1 | 0.435 | 0.097 | 1.154 | 0.1 / 0.2 | 0.062 | 0.019 | 0.008 | 0.019 | 0.01 | 0.817 | 0 (0) | 0 | 0.012 (4.455) | 0 (0) | 0 (0) | 0.26 (106.808) | 0 (0) |
| 24 | alert/facing | 2.2 / 3.9 | 0.707 | 0.155 | 1.554 | 0.2 / 0.4 | 0.145 | 0.022 | 0.058 | 0.032 | 0.032 | 1.052 | 0.002 (0.03) | 0.116 | 0.012 (3.043) | 0.017 (5) | 0.003 (0.442) | 0.291 (104.477) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.1 / 5.4 | 322.6 | 2.9 / 5 | 560 / 2128 | 3.4 / 23.7 | 3.8 / 5.6 | 2.7 / 4.7 | 15.772 | 0.6 | 2.2 / 3.9 | 3.517 / 4.071 | 104 | 0.494 | 1 | 4 | 124 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.5 / 4.6 | 400 | 2.3 / 4.3 | 574 / 2825 | 2.7 / 20.6 | 3.4 / 5.3 | 2.2 / 3.8 | 15.551 | 0.6 | 1.8 / 3.1 | 2.937 / 3.996 | 75 | 0.473 | 1 | 4 | 20 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.8 / 5.3 | 357.1 | 2.6 / 5 | 544 / 2265 | 2.9 / 29.2 | 3.5 / 5.7 | 2.5 / 4.3 | 15.806 | 0.5 | 2.1 / 3.7 | 3.656 / 4.102 | 104 | 0.494 | 1 | 4 | 124 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.4 / 6.1 | 227.3 | 4.2 / 5.8 | 602 / 1580 | 4.3 / 6.2 | 4.9 / 6.5 | 4 / 5.4 | 15.902 | 0.5 | 3.1 / 4.1 | 4.288 / 5.477 | 180 | 1.425 | 1 | 4 | 295 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.4 / 4.4 | 294.1 | 3.2 / 4.2 | 605 / 2274 | 3.4 / 4.3 | 3.7 / 4.6 | 3.1 / 3.9 | 15.762 | 0.5 | 2.3 / 2.9 | 3.244 / 3.941 | 135 | 1.173 | 1 | 4 | 24 | 1.1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.9 / 7.8 | 169.5 | 5.3 / 7.1 | 605 / 1056 | 5.6 / 7.8 | 5.7 / 8.4 | 5 / 6.6 | 15.05 | 0.6 | 3.8 / 5 | 5.194 / 6.364 | 211 | 1.686 | 3 | 6 | 342 | 1.5 | 2 / 2 | 4 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 5.6 / 7.2 | 178.6 | 5.4 / 6.9 | 607 / 1156 | 5.3 / 7.2 | 5.8 / 7.6 | 5.1 / 6.6 | 15.97 | 0.6 | 3.9 / 5.1 | 5.031 / 5.857 | 204 | 1.743 | 1 | 4 | 341 | 1.7 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.8 / 6.6 | 208.3 | 4.6 / 6.3 | 604 / 1433 | 4.5 / 6.6 | 5.1 / 7.2 | 4.3 / 5.8 | 15.885 | 0.6 | 3.2 / 4.3 | 3.677 / 4.52 | 151 | 1.372 | 1 | 4 | 24 | 1.3 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 6.2 / 8.6 | 161.3 | 5.7 / 7.8 | 608 / 964 | 6 / 8.6 | 6.1 / 9.3 | 5.4 / 6.8 | 15.236 | 0.5 | 4.1 / 5.4 | 5.287 / 6.392 | 237 | 2.039 | 3 | 6 | 425 | 1.8 | 2 / 2 | 2 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 7.1 / 9.1 | 140.8 | 6.8 / 8.8 | 605 / 790 | 6.8 / 9.1 | 7.2 / 9.4 | 6.4 / 8.3 | 16.132 | 0.6 | 4.9 / 6.4 | 5.455 / 6.543 | 240 | 2.263 | 1 | 4 | 493 | 2.3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.7 / 7.9 | 175.4 | 5.4 / 7.6 | 605 / 1105 | 5.5 / 8.2 | 5.9 / 8 | 5.1 / 7.3 | 16.004 | 0.6 | 3.7 / 5.2 | 3.795 / 4.76 | 171 | 1.622 | 1 | 4 | 24 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.8 / 11.9 | 113.6 | 8.1 / 11.1 | 608 / 510 | 8.4 / 12.1 | 8.4 / 11.7 | 7.6 / 9.7 | 15.431 | 0.6 | 5.8 / 7.7 | 6.024 / 7.235 | 293 | 2.861 | 3 | 6 | 611 | 2.4 | 2 / 2 | 4 of 4 | alert 24 -> alert 19, searching 5 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.167 ms, frame CPU 0.163 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim 0.015 ms, GPU 0.081 ms, draws 5.667.
Per added guard, alert/facing, N 0 -> 24: sim step 0.063 ms, AI manager 0.013 ms, perceive 0.001 ms, frame 0.250 ms, frame CPU 0.229 ms, frame CPU (sim frames) 0.204 ms, CPU per 1/60 s sim -0.016 ms, GPU 0.099 ms, draws 7.875.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 57.9, PostProcessRTT-TAA 50.7, gBuffer 47.7, maplight-shadow-#_shadowMap 29.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 16 alert/facing: sun_CSMShadowMap 70, PostProcessRTT-TAA 54.5, gBuffer 51.5, maplight-shadow-#_shadowMap 34.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 98.9, PostProcessRTT-TAA 62.9, gBuffer 59.9, maplight-shadow-#_shadowMap 45.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.7 / 1.1 | 0.374 | 0.037 | 0.261 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.266 (100.813) | 0 (0) |
| 0 | alert/facing | 0.6 / 0.9 | 0.363 | 0.03 | 0.23 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.28 (100.822) | 0 (0) |
| 12 | patrol/facing | 0.9 / 1.4 | 0.333 | 0.058 | 0.504 | 0 / 0.1 | 0.04 | 0.008 | 0.01 | 0.014 | 0.006 | 0.287 | 0 (0) | 0 | 0.005 (2.24) | 0 (0) | 0 (0) | 0.204 (102.672) | 0 (0) |
| 12 | alert/facing | 1.1 / 2 | 0.458 | 0.076 | 0.639 | 0.1 / 0.2 | 0.061 | 0.007 | 0.028 | 0.017 | 0.01 | 0.32 | 0 (0.002) | 0.059 | 0.004 (1.477) | 0 (0) | 0.001 (0.42) | 0.231 (101.13) | 0 (0) |
| 16 | patrol/facing | 1.3 / 1.9 | 0.409 | 0.082 | 0.735 | 0.1 / 0.2 | 0.049 | 0.009 | 0.013 | 0.018 | 0.005 | 0.456 | 0 (0) | 0 | 0.005 (3.005) | 0 (0) | 0 (0) | 0.246 (102.667) | 0 (0) |
| 16 | alert/facing | 2.3 / 3.8 | 0.688 | 0.143 | 1.183 | 0.1 / 0.3 | 0.101 | 0.012 | 0.043 | 0.026 | 0.018 | 0.681 | 0.001 (0.002) | 0.089 | 0.006 (1.983) | 0 (0) | 0.005 (0.565) | 0.321 (101.117) | 0 (0) |
| 24 | patrol/facing | 1.8 / 2.9 | 0.417 | 0.113 | 0.936 | 0.1 / 0.2 | 0.065 | 0.012 | 0.017 | 0.02 | 0.012 | 0.627 | 0 (0) | 0 | 0.006 (4.465) | 0 (0) | 0 (0) | 0.217 (102.678) | 0 (0) |
| 24 | alert/facing | 1.3 / 2.7 | 0.492 | 0.119 | 0.952 | 0.1 / 0.3 | 0.087 | 0.01 | 0.036 | 0.027 | 0.011 | 0.606 | 0 (0.002) | 0.064 | 0.005 (2.987) | 0 (0) | 0.004 (0.878) | 0.229 (101.117) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.7 / 4.6 | 370.4 | 2.5 / 4.3 | 546 / 2515 | 3 / 30 | 3.3 / 5.1 | 2.3 / 3.9 | 15.662 | 0.6 | 1.9 / 3.2 | 3.255 / 3.882 | 115 | 0.211 | 0 | 4 | 92 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.7 / 4.3 | 370.4 | 2.4 / 4 | 592 / 2791 | 2.8 / 4.8 | 3.2 / 4.8 | 2.3 / 3.6 | 15.201 | 0.7 | 1.8 / 2.8 | 3.077 / 3.712 | 52 | 0.204 | 0 | 4 | 14 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.4 / 4 | 416.7 | 2.2 / 3.7 | 503 / 2686 | 2.7 / 47.4 | 3 / 4.5 | 2.1 / 3.3 | 16.021 | 0.5 | 1.7 / 2.7 | 3.496 / 3.941 | 115 | 0.211 | 0 | 4 | 92 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 3.9 / 5.3 | 256.4 | 3.7 / 5.1 | 603 / 1898 | 3.8 / 5.5 | 4.2 / 5.9 | 3.5 / 4.6 | 15.776 | 0.5 | 2.7 / 3.6 | 3.647 / 4.625 | 143 | 0.598 | 0 | 4 | 284 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.1 / 4.4 | 322.6 | 2.9 / 4.1 | 604 / 2547 | 3.2 / 4.3 | 3.5 / 4.6 | 2.8 / 3.7 | 15.573 | 0.6 | 1.9 / 2.6 | 2.985 / 3.42 | 56 | 0.253 | 0 | 4 | 16 | 0.9 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.3 / 5.6 | 232.6 | 4 / 5.3 | 605 / 1684 | 4.1 / 5.4 | 4.6 / 6.1 | 3.8 / 4.8 | 15.656 | 0.5 | 2.9 / 3.7 | 3.809 / 4.617 | 151 | 0.569 | 1 | 4 | 310 | 1.3 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 5.5 / 6.9 | 181.8 | 5.2 / 6.7 | 607 / 1197 | 5.3 / 6.9 | 5.8 / 7 | 5 / 6.3 | 15.918 | 0.5 | 3.9 / 4.9 | 4.511 / 5.454 | 151 | 0.733 | 0 | 4 | 360 | 1.7 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.9 / 8.4 | 204.1 | 4.7 / 8 | 605 / 1233 | 5.6 / 8.1 | 6 / 8.6 | 4.2 / 7 | 15.79 | 0.8 | 3 / 4.9 | 3.429 / 4.393 | 56 | 0.253 | 0 | 4 | 16 | 2.1 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 8.1 / 11.2 | 123.5 | 7.7 / 10.7 | 608 / 612 | 7.8 / 11.6 | 8.3 / 11.4 | 7.3 / 9.4 | 15.899 | 0.8 | 5.7 / 7.7 | 5.07 / 6.389 | 169 | 0.852 | 1 | 4 | 394 | 2.4 | 2 / 0 | 0 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 6.3 / 8.1 | 158.7 | 6 / 7.8 | 607 / 967 | 6.1 / 8.2 | 6.4 / 8.2 | 5.7 / 7.5 | 16.037 | 0.6 | 4.4 / 5.8 | 4.809 / 5.813 | 167 | 1.004 | 0 | 4 | 512 | 2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4 / 5.1 | 250 | 3.7 / 4.8 | 602 / 1870 | 3.8 / 4.8 | 4.3 / 5.3 | 3.6 / 4.4 | 15.816 | 0.5 | 2.5 / 3.1 | 3.383 / 3.837 | 56 | 0.253 | 0 | 4 | 16 | 1.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6.5 / 8.9 | 153.8 | 6.2 / 8.6 | 606 / 903 | 6.2 / 9.1 | 6.6 / 9.2 | 5.8 / 7.6 | 15.888 | 0.5 | 4.6 / 6.2 | 4.693 / 5.552 | 191 | 1.153 | 1 | 4 | 516 | 2.1 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.150 ms, frame CPU 0.146 ms, frame CPU (sim frames) 0.129 ms, CPU per 1/60 s sim 0.016 ms, GPU 0.065 ms, draws 2.167.
Per added guard, alert/facing, N 0 -> 24: sim step 0.029 ms, AI manager 0.007 ms, perceive 0.000 ms, frame 0.171 ms, frame CPU 0.167 ms, frame CPU (sim frames) 0.150 ms, CPU per 1/60 s sim -0.006 ms, GPU 0.050 ms, draws 3.167.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 59.8, gBuffer 57.8, sun_CSMShadowMap 10, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 16 alert/facing: PostProcessRTT-TAA 65.9, gBuffer 63.9, sun_CSMShadowMap 12.9, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 72.3, gBuffer 70.3, sun_CSMShadowMap 22, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
