# Guard cap: results

Run 2026-10-23T00:15:35.797Z - 2026-10-23T00:23:54.318Z (8.3 min), version 4.68.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.7 / 1.6 | 0.452 | 0.042 | 0.306 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.361 (103.808) | 0 (0) |
| 0 | alert/facing | 0.4 / 0.7 | 0.328 | 0.026 | 0.205 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.27 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.3 / 3.3 | 0.427 | 0.07 | 0.744 | 0 / 0.1 | 0.039 | 0.009 | 0.007 | 0.014 | 0.005 | 0.453 | 0 (0) | 0 | 0.006 (2.24) | 0 (0) | 0 (0) | 0.288 (106.822) | 0 (0) |
| 12 | alert/facing | 1.4 / 2.3 | 0.579 | 0.102 | 0.963 | 0.1 / 0.3 | 0.083 | 0.01 | 0.035 | 0.025 | 0.027 | 0.544 | 0 (0.005) | 0.091 | 0.006 (1.49) | 0.016 (4.408) | 0.002 (0.297) | 0.259 (104.87) | 0 (0) |
| 16 | patrol/facing | 1.2 / 1.9 | 0.396 | 0.079 | 0.777 | 0 / 0.1 | 0.04 | 0.011 | 0.006 | 0.014 | 0.006 | 0.494 | 0 (0) | 0 | 0.006 (2.99) | 0 (0) | 0 (0) | 0.257 (106.808) | 0 (0) |
| 16 | alert/facing | 1.6 / 4.5 | 0.706 | 0.124 | 1.163 | 0.1 / 0.5 | 0.11 | 0.024 | 0.043 | 0.027 | 0.031 | 0.712 | 0.001 (0.013) | 0.105 | 0.013 (1.987) | 0.017 (4.133) | 0.003 (0.337) | 0.347 (104.972) | 0 (0) |
| 24 | patrol/facing | 1.7 / 4.4 | 0.432 | 0.089 | 1.019 | 0.1 / 0.2 | 0.063 | 0.017 | 0.012 | 0.018 | 0.01 | 0.726 | 0 (0) | 0 | 0.012 (4.49) | 0 (0) | 0 (0) | 0.27 (106.808) | 0 (0) |
| 24 | alert/facing | 1.9 / 3.3 | 0.567 | 0.124 | 1.181 | 0.1 / 0.3 | 0.101 | 0.018 | 0.042 | 0.025 | 0.027 | 0.788 | 0.002 (0.02) | 0.089 | 0.011 (3.088) | 0.015 (5) | 0.002 (0.538) | 0.254 (104.703) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.1 / 6.7 | 322.6 | 2.9 / 6.3 | 571 / 2095 | 3.7 / 7 | 4.1 / 7.5 | 2.6 / 5.6 | 15.699 | 0.7 | 2.2 / 4.9 | 3.509 / 6.067 | 104 | 0.494 | 1 | 4 | 123 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.7 / 6.1 | 370.4 | 2.4 / 5.6 | 593 / 2580 | 3 / 6.8 | 3.7 / 7.2 | 2.2 / 5 | 15.392 | 0.7 | 1.8 / 4.3 | 2.752 / 3.97 | 75 | 0.473 | 1 | 4 | 20 | 0.4 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.9 / 7.2 | 344.8 | 2.7 / 6.8 | 560 / 2125 | 3.9 / 19.7 | 3.8 / 8 | 2.4 / 5.8 | 15.77 | 0.6 | 2 / 5.2 | 3.484 / 5.513 | 104 | 0.494 | 1 | 4 | 124 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.7 / 10.7 | 175.4 | 5.4 / 10.5 | 607 / 992 | 6.1 / 11.7 | 6.4 / 11.9 | 4.8 / 9.4 | 16.012 | 0.6 | 3.8 / 8 | 4.605 / 6.973 | 179 | 1.412 | 1 | 4 | 295 | 1.6 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.8 / 5 | 263.2 | 3.6 / 4.8 | 605 / 1991 | 3.6 / 4.6 | 4.3 / 5.1 | 3.4 / 4.3 | 15.809 | 0.5 | 2.6 / 3.2 | 3.265 / 4.028 | 131 | 1.122 | 1 | 4 | 24 | 1.1 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.5 / 6.9 | 181.8 | 4.9 / 6.3 | 606 / 1193 | 5.3 / 6.5 | 5.5 / 7.1 | 4.7 / 5.7 | 15.076 | 0.5 | 3.6 / 4.4 | 4.928 / 5.837 | 212 | 1.747 | 3 | 6 | 318 | 1.5 | 2 / 2 | 4 of 4 | alert 12 -> alert 11, searching 1 |
| 16 | patrol/facing | 5 / 6.3 | 200 | 4.8 / 6 | 604 / 1368 | 4.9 / 6.3 | 5.2 / 6.4 | 4.6 / 5.6 | 15.944 | 0.5 | 3.5 / 4.4 | 4.418 / 5.453 | 203 | 1.73 | 1 | 4 | 341 | 1.5 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.4 / 7.4 | 227.3 | 4.2 / 7.1 | 606 / 1546 | 4.2 / 8.2 | 4.7 / 8.5 | 4 / 6.2 | 15.861 | 0.6 | 2.9 / 5.1 | 3.503 / 4.562 | 147 | 1.321 | 1 | 4 | 24 | 1.2 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 7.2 / 13.9 | 138.9 | 6.5 / 13.1 | 610 / 641 | 7.7 / 14.8 | 7.4 / 13.9 | 5.8 / 10.9 | 15.373 | 0.7 | 4.6 / 9.5 | 5.651 / 7.927 | 221 | 1.845 | 3 | 6 | 400 | 1.9 | 2 / 2 | 4 of 4 | alert 16 -> alert 14, searching 2 |
| 24 | patrol/facing | 7.2 / 11.7 | 138.9 | 7 / 11.4 | 605 / 697 | 7.1 / 13.3 | 7.5 / 12.5 | 6.5 / 10.8 | 16.151 | 0.6 | 5.1 / 8.7 | 5.096 / 6.879 | 239 | 2.25 | 1 | 4 | 493 | 2.4 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.4 / 6.6 | 185.2 | 5.2 / 6.4 | 604 / 1234 | 5.1 / 6.4 | 5.7 / 6.8 | 4.9 / 6 | 15.994 | 0.5 | 3.6 / 4.4 | 3.319 / 4.13 | 167 | 1.571 | 1 | 4 | 24 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.1 / 9.8 | 123.5 | 7.4 / 9 | 608 / 625 | 7.7 / 9.5 | 7.8 / 9.5 | 7 / 8.2 | 15.316 | 0.6 | 5.5 / 6.4 | 5.585 / 6.511 | 271 | 2.598 | 3 | 6 | 617 | 2.5 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.171 ms, frame CPU 0.171 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim 0.019 ms, GPU 0.066 ms, draws 5.625.
Per added guard, alert/facing, N 0 -> 24: sim step 0.063 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.217 ms, frame CPU 0.196 ms, frame CPU (sim frames) 0.167 ms, CPU per 1/60 s sim -0.019 ms, GPU 0.088 ms, draws 6.958.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 50.9, gBuffer 47.9, maplight-shadow-#_shadowMap 24.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 16 alert/facing: sun_CSMShadowMap 69.9, PostProcessRTT-TAA 53.9, gBuffer 50.9, maplight-shadow-#_shadowMap 20.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: sun_CSMShadowMap 92.8, PostProcessRTT-TAA 63.9, gBuffer 60.9, maplight-shadow-#_shadowMap 30.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.7 / 1.1 | 0.403 | 0.04 | 0.28 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.303 (100.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 1 | 0.331 | 0.029 | 0.208 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.254 (100.813) | 0 (0) |
| 12 | patrol/facing | 0.9 / 1.5 | 0.321 | 0.056 | 0.523 | 0 / 0.1 | 0.035 | 0.007 | 0.009 | 0.012 | 0.005 | 0.303 | 0 (0) | 0 | 0.004 (2.245) | 0 (0) | 0 (0) | 0.197 (102.667) | 0 (0) |
| 12 | alert/facing | 0.9 / 1.4 | 0.398 | 0.06 | 0.547 | 0.1 / 0.2 | 0.054 | 0.008 | 0.025 | 0.013 | 0.006 | 0.277 | 0 (0) | 0.056 | 0.004 (1.497) | 0 (0) | 0.001 (0.383) | 0.2 (101.13) | 0 (0) |
| 16 | patrol/facing | 1.1 / 2.5 | 0.426 | 0.082 | 0.733 | 0.1 / 0.2 | 0.052 | 0.011 | 0.014 | 0.016 | 0.009 | 0.457 | 0 (0) | 0 | 0.007 (2.985) | 0 (0) | 0 (0) | 0.247 (102.678) | 0 (0) |
| 16 | alert/facing | 1.4 / 2.6 | 0.599 | 0.114 | 0.956 | 0.1 / 0.3 | 0.089 | 0.011 | 0.044 | 0.019 | 0.01 | 0.542 | 0 (0.002) | 0.079 | 0.006 (1.99) | 0 (0) | 0.004 (0.56) | 0.287 (101.117) | 0 (0) |
| 24 | patrol/facing | 1.4 / 2.2 | 0.409 | 0.097 | 0.882 | 0.1 / 0.2 | 0.061 | 0.013 | 0.013 | 0.021 | 0.011 | 0.605 | 0 (0) | 0 | 0.008 (4.485) | 0 (0) | 0 (0) | 0.229 (102.667) | 0 (0) |
| 24 | alert/facing | 1.7 / 3.2 | 0.476 | 0.102 | 0.936 | 0.1 / 0.2 | 0.089 | 0.009 | 0.038 | 0.023 | 0.011 | 0.625 | 0 (0.003) | 0.051 | 0.005 (2.99) | 0 (0) | 0.005 (0.892) | 0.225 (101.138) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.6 / 4 | 384.6 | 2.4 / 3.7 | 527 / 2685 | 2.7 / 29.3 | 3.1 / 4.3 | 2.3 / 3.4 | 15.857 | 0.5 | 1.8 / 2.7 | 3.186 / 3.786 | 115 | 0.211 | 0 | 4 | 92 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 3 / 6 | 333.3 | 2.7 / 5.6 | 592 / 2406 | 3.5 / 6.3 | 3.8 / 6.8 | 2.6 / 5.1 | 15.331 | 0.7 | 2 / 4.2 | 3.078 / 4.294 | 52 | 0.204 | 0 | 4 | 14 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.7 / 6 | 370.4 | 2.5 / 5.6 | 583 / 2514 | 3.2 / 7.3 | 3.7 / 6.6 | 2.2 / 4.9 | 15.507 | 0.6 | 1.9 / 4.4 | 3.144 / 4.314 | 115 | 0.211 | 0 | 4 | 92 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4 / 5.3 | 250 | 3.8 / 5 | 603 / 1826 | 3.9 / 4.9 | 4.5 / 5.5 | 3.6 / 4.6 | 15.788 | 0.5 | 2.9 / 3.6 | 3.832 / 4.683 | 143 | 0.598 | 0 | 4 | 284 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.4 / 4.8 | 294.1 | 3.1 / 4.5 | 602 / 2288 | 3.3 / 4.6 | 3.8 / 5.1 | 3 / 4 | 15.605 | 0.5 | 2.1 / 2.9 | 3.243 / 3.738 | 56 | 0.253 | 0 | 4 | 16 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.2 / 5.4 | 238.1 | 4 / 5.1 | 603 / 1718 | 4.2 / 5.2 | 4.4 / 5.9 | 3.8 / 4.7 | 15.634 | 0.5 | 3 / 3.7 | 3.893 / 4.824 | 151 | 0.568 | 1 | 4 | 298 | 1.3 | 2 / 0 | 0 of 4 | alert 12 -> alert 11, searching 1 |
| 16 | patrol/facing | 5.3 / 9.9 | 188.7 | 5 / 9.6 | 604 / 1123 | 5.4 / 10.4 | 5.5 / 10.8 | 4.7 / 8.5 | 15.939 | 0.6 | 3.6 / 7.2 | 4.234 / 6.013 | 151 | 0.733 | 0 | 4 | 360 | 1.8 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4 / 5.4 | 250 | 3.8 / 5.1 | 603 / 1835 | 3.9 / 5.3 | 4.3 / 5.5 | 3.6 / 4.7 | 15.675 | 0.6 | 2.5 / 3.3 | 3.333 / 3.908 | 56 | 0.253 | 0 | 4 | 16 | 1.4 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 5.7 / 7.5 | 175.4 | 5.4 / 7.2 | 606 / 1128 | 5.7 / 7.4 | 6 / 8.1 | 5.2 / 6.5 | 15.775 | 0.6 | 4.1 / 5.2 | 4.348 / 5.322 | 161 | 0.739 | 1 | 4 | 379 | 1.5 | 2 / 0 | 0 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 6.3 / 7.7 | 158.7 | 6 / 7.5 | 603 / 982 | 6.1 / 7.4 | 6.5 / 7.8 | 5.7 / 6.9 | 16.071 | 0.5 | 4.5 / 5.4 | 4.761 / 5.593 | 167 | 1.004 | 0 | 4 | 512 | 2.3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 4.1 / 5 | 243.9 | 3.8 / 4.8 | 604 / 1841 | 3.9 / 4.7 | 4.4 / 5.1 | 3.7 / 4.4 | 15.849 | 0.5 | 2.5 / 3.1 | 3.342 / 3.765 | 56 | 0.253 | 0 | 4 | 16 | 1.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6.5 / 8 | 153.8 | 6.3 / 7.6 | 607 / 923 | 6.3 / 7.7 | 6.7 / 8 | 5.9 / 7.1 | 15.959 | 0.6 | 4.6 / 5.5 | 4.635 / 5.38 | 187 | 1.104 | 1 | 4 | 503 | 2.2 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.029 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.154 ms, frame CPU 0.150 ms, frame CPU (sim frames) 0.142 ms, CPU per 1/60 s sim 0.009 ms, GPU 0.066 ms, draws 2.167.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.007 ms, perceive 0.000 ms, frame 0.158 ms, frame CPU 0.158 ms, frame CPU (sim frames) 0.125 ms, CPU per 1/60 s sim 0.019 ms, GPU 0.062 ms, draws 3.000.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 60.1, gBuffer 58.1, sun_CSMShadowMap 8.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 16 alert/facing: PostProcessRTT-TAA 66, gBuffer 64, sun_CSMShadowMap 5.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 72.8, gBuffer 70.8, sun_CSMShadowMap 18, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
