# Guard cap: results

Run 2026-10-22T15:49:37.444Z - 2026-10-22T16:00:13.141Z (10.6 min), version 4.64.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 3.9 | 0.91 | 0.068 | 0.493 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.757 (103.813) | 0 (0) |
| 0 | alert/facing | 3.4 / 3.9 | 2.439 | 0.161 | 1.238 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.002 | 0.002 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 2.085 (103.813) | 0 (0) |
| 12 | patrol/facing | 7.2 / 9.6 | 2.859 | 0.349 | 3.844 | 0.3 / 0.5 | 0.228 | 0.056 | 0.04 | 0.077 | 0.033 | 2.328 | 0 (0) | 0 | 0.036 (2.24) | 0 (0) | 0 (0) | 2.135 (106.813) | 0 (0) |
| 12 | alert/facing | 8.1 / 12.1 | 3.626 | 0.378 | 4.503 | 0.6 / 1.3 | 0.405 | 0.061 | 0.151 | 0.137 | 0.135 | 2.678 | 0.011 (0.023) | 0.495 | 0.037 (1.558) | 0.086 (3.383) | 0.008 (0.268) | 2.147 (104.778) | 0 (0) |
| 16 | patrol/facing | 8.4 / 11.2 | 3.029 | 0.401 | 4.562 | 0.3 / 0.6 | 0.268 | 0.081 | 0.046 | 0.08 | 0.038 | 2.986 | 0 (0) | 0 | 0.054 (2.975) | 0 (0) | 0 (0) | 2.246 (106.813) | 0 (0) |
| 16 | alert/facing | 9.1 / 12.6 | 3.859 | 0.464 | 5.017 | 0.7 / 1.4 | 0.539 | 0.088 | 0.207 | 0.153 | 0.17 | 3.161 | 0.011 (0.015) | 0.516 | 0.054 (2.017) | 0.111 (4.175) | 0.015 (0.387) | 2.179 (104.28) | 0 (0) |
| 24 | patrol/facing | 10.1 / 13.4 | 3.095 | 0.492 | 5.82 | 0.5 / 0.7 | 0.366 | 0.122 | 0.06 | 0.103 | 0.054 | 4.239 | 0 (0) | 0 | 0.086 (4.43) | 0 (0) | 0 (0) | 2.167 (106.813) | 0 (0) |
| 24 | alert/facing | 10.6 / 13.8 | 3.978 | 0.617 | 6.107 | 0.8 / 1.7 | 0.634 | 0.101 | 0.223 | 0.181 | 0.189 | 4.24 | 0.015 (0.027) | 0.553 | 0.068 (2.978) | 0.126 (4.992) | 0.018 (0.548) | 2.137 (104.72) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.2 / 13.5 | 454.5 | 2.1 / 12.7 | 603 / 1323 | 9.9 / 14.8 | 11.4 / 14.1 | 1.7 / 9.4 | 15.59 | 2.2 | 1.5 / 8.9 | 3.499 / 8.121 | 104 | 0.494 | 1 | 4 | 123 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 8.6 / 11.9 | 116.3 | 8 / 11.2 | 609 / 661 | 8.3 / 11.9 | 10.2 / 11.6 | 7 / 8.6 | 15.582 | 2.2 | 6.1 / 7.2 | 4.46 / 7.073 | 75 | 0.473 | 1 | 4 | 20 | 1.9 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 11.1 / 13.3 | 90.1 | 10.5 / 12.6 | 607 / 367 | 10.1 / 13.4 | 11.2 / 12.8 | 8.4 / 9.9 | 15.72 | 2.2 | 7.3 / 8.5 | 6.38 / 8.513 | 104 | 0.494 | 1 | 4 | 123 | 2.1 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 36.4 / 45.2 | 27.5 | 35.6 / 44.3 | 280 / 0 | 36.4 / 45.2 | 35.6 / 44.3 | - / - | 16.318 | 2.4 | 25.5 / 31.8 | 22.395 / 27.061 | 142 | 0.889 | 1 | 4 | 736 | 9.6 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 24.8 / 30.3 | 40.3 | 24.1 / 29.4 | 413 / 4 | 24.9 / 30.3 | 24.1 / 29.4 | 17.9 / 19.9 | 16.174 | 2.4 | 16.1 / 19.5 | 13.447 / 16.672 | 95 | 0.563 | 1 | 4 | 20 | 8.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 41.4 / 54.5 | 24.2 | 39.2 / 52 | 250 / 0 | 41.4 / 54.5 | 39.2 / 52 | - / - | 15.808 | 2.6 | 26.1 / 30.2 | 25.549 / 30.986 | 162 | 1.014 | 3 | 6 | 876 | 10 | 2 / 2 | 4 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 42.6 / 53.3 | 23.5 | 41.9 / 52.4 | 248 / 0 | 42.6 / 53.3 | 41.9 / 52.4 | - / - | 16.382 | 2.367 | 29.7 / 36.9 | 24.294 / 29.39 | 142 | 0.991 | 1 | 4 | 884 | 12.7 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 29.7 / 35.4 | 33.7 | 28.9 / 34.4 | 349 / 0 | 29.7 / 35.4 | 28.9 / 34.4 | - / - | 16.224 | 2.5 | 18.8 / 22.2 | 15.766 / 19.336 | 95 | 0.594 | 1 | 4 | 20 | 10.4 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 49.1 / 64.2 | 20.4 | 46.8 / 62.2 | 208 / 0 | 49.1 / 64.2 | 46.8 / 62.2 | - / - | 16.149 | 2.667 | 31.4 / 36.7 | 28.566 / 34.551 | 166 | 1.193 | 3 | 6 | 1115 | 12.1 | 2 / 2 | 4 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 58 / 69 | 17.2 | 57.1 / 67.2 | 180 / 0 | 58 / 69 | 57.1 / 67.2 | - / - | 16.991 | 2.5 | 40.2 / 47.9 | 32.124 / 41.194 | 142 | 1.293 | 1 | 4 | 1429 | 17.4 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 37.1 / 45.1 | 27 | 36.3 / 44.3 | 281 / 0 | 37.1 / 45.1 | 36.3 / 44.3 | - / - | 16.326 | 2.467 | 23.8 / 28.2 | 18.331 / 22.084 | 95 | 0.624 | 1 | 4 | 20 | 14.3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 61.7 / 78.3 | 16.2 | 59.7 / 76.1 | 176 / 0 | 61.7 / 78.3 | 59.7 / 76.1 | - / - | 17.159 | 2.6 | 40.5 / 46.6 | 32.066 / 42.016 | 167 | 1.484 | 3 | 6 | 1614 | 17.5 | 2 / 2 | 4 of 4 | alert 24 -> alert 20, searching 4 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.400 ms, AI manager 0.019 ms, perceive 0.005 ms, frame 2.325 ms, frame CPU 2.292 ms, frame CPU (sim frames) 1.904 ms, CPU per 1/60 s sim 0.058 ms, GPU 1.193 ms, draws 1.583.
Per added guard, alert/facing, N 0 -> 24: sim step 0.300 ms, AI manager 0.059 ms, perceive 0.004 ms, frame 2.108 ms, frame CPU 2.050 ms, frame CPU (sim frames) 2.021 ms, CPU per 1/60 s sim 0.060 ms, GPU 1.070 ms, draws 2.625.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 46.5, gBuffer 43.5, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 15.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 16 alert/facing: PostProcessRTT-TAA 46.6, gBuffer 43.6, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 18.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: PostProcessRTT-TAA 46.9, gBuffer 43.9, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 17.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.2 / 4.6 | 2.238 | 0.176 | 1.2 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.002 | 0.005 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 1.783 (100.813) | 0 (0) |
| 0 | alert/facing | 3 / 3.7 | 2.151 | 0.165 | 1.124 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.003 | 0.004 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 1.755 (100.813) | 0 (0) |
| 12 | patrol/facing | 6.1 / 9.1 | 2.641 | 0.344 | 3.362 | 0.3 / 0.4 | 0.238 | 0.043 | 0.062 | 0.083 | 0.031 | 2.026 | 0 (0) | 0 | 0.029 (2.235) | 0 (0) | 0 (0) | 1.839 (102.673) | 0 (0) |
| 12 | alert/facing | 6.1 / 9.6 | 2.977 | 0.346 | 3.304 | 0.4 / 0.7 | 0.346 | 0.037 | 0.149 | 0.107 | 0.034 | 1.83 | 0 (0.002) | 0.304 | 0.026 (1.507) | 0 (0) | 0.011 (0.412) | 1.807 (101.125) | 0 (0) |
| 16 | patrol/facing | 7 / 9.9 | 2.759 | 0.384 | 3.838 | 0.4 / 0.6 | 0.296 | 0.055 | 0.069 | 0.108 | 0.038 | 2.539 | 0 (0) | 0 | 0.038 (2.98) | 0 (0) | 0 (0) | 1.881 (102.673) | 0 (0) |
| 16 | alert/facing | 6.8 / 10.6 | 3.123 | 0.385 | 3.766 | 0.5 / 0.9 | 0.428 | 0.052 | 0.163 | 0.152 | 0.034 | 2.3 | 0.002 (0.003) | 0.3 | 0.037 (1.98) | 0 (0) | 0.018 (0.557) | 1.871 (101.122) | 0 (0) |
| 24 | patrol/facing | 8.7 / 12.4 | 3.011 | 0.478 | 4.797 | 0.5 / 0.7 | 0.41 | 0.095 | 0.101 | 0.132 | 0.049 | 3.419 | 0 (0) | 0 | 0.069 (4.49) | 0 (0) | 0 (0) | 1.998 (102.682) | 0 (0) |
| 24 | alert/facing | 8.7 / 13.3 | 3.271 | 0.484 | 4.725 | 0.6 / 1 | 0.489 | 0.071 | 0.196 | 0.139 | 0.047 | 3.14 | 0.002 (0.005) | 0.287 | 0.046 (2.973) | 0 (0) | 0.027 (0.873) | 1.916 (101.13) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 11.3 / 14.8 | 88.5 | 10.7 / 14.1 | 605 / 312 | 11.2 / 15.5 | 11.4 / 14.5 | 8.7 / 11 | 15.732 | 1.9 | 7.7 / 10.3 | 6.591 / 9.522 | 115 | 0.211 | 0 | 4 | 92 | 2 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 7.7 / 10.3 | 129.9 | 7.1 / 9.7 | 608 / 690 | 7 / 9.7 | 8.7 / 10.1 | 6.3 / 7.5 | 15.506 | 1.9 | 5.3 / 6.2 | 3.494 / 5.925 | 52 | 0.204 | 0 | 4 | 14 | 1.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 9.9 / 12.3 | 101 | 9.3 / 11.6 | 609 / 468 | 9 / 12.5 | 10.2 / 12 | 7.9 / 9.4 | 15.683 | 1.8 | 6.9 / 8.1 | 5.888 / 8.21 | 115 | 0.211 | 0 | 4 | 92 | 1.8 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 29.6 / 36.4 | 33.8 | 28.8 / 35.8 | 347 / 2 | 29.6 / 36.4 | 28.8 / 35.8 | 22.7 / 22.7 | 16.219 | 2.1 | 20.6 / 25.4 | 17.894 / 21.008 | 133 | 0.549 | 0 | 4 | 772 | 8.5 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 17.6 / 21 | 56.8 | 16.9 / 20.3 | 571 / 16 | 17.7 / 21 | 17 / 20.3 | 13.2 / 16.8 | 15.994 | 2.1 | 11.2 / 13.2 | 6.118 / 8.648 | 52 | 0.204 | 0 | 4 | 14 | 6.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 29.1 / 37.1 | 34.4 | 28.2 / 35.8 | 359 / 3 | 29.1 / 37.2 | 28.2 / 36.4 | 15.8 / 21.9 | 16.089 | 2 | 20.7 / 24.2 | 16.311 / 19.828 | 147 | 0.622 | 1 | 4 | 943 | 7.9 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 36 / 43.2 | 27.8 | 35.1 / 42.3 | 287 / 0 | 36 / 43.2 | 35.1 / 42.3 | - / - | 16.308 | 2.2 | 25.2 / 30.5 | 21.78 / 25.427 | 133 | 0.683 | 0 | 4 | 1041 | 9.6 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 20.4 / 24.5 | 49 | 19.7 / 23.8 | 504 / 23 | 20.5 / 24.6 | 19.8 / 23.8 | 8.3 / 17.9 | 16.039 | 2.2 | 13 / 15.1 | 7.129 / 9.61 | 52 | 0.204 | 0 | 4 | 14 | 8 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 37.7 / 47.7 | 26.5 | 36.4 / 46.6 | 275 / 0 | 37.7 / 47.7 | 36.4 / 46.6 | - / - | 16.151 | 2.2 | 26.2 / 32.8 | 21.761 / 29.275 | 155 | 0.689 | 1 | 4 | 1045 | 10 | 2 / 0 | 0 of 4 | alert 16 -> alert 15, searching 1 |
| 24 | patrol/facing | 48.8 / 61 | 20.5 | 47.9 / 59.5 | 210 / 0 | 48.8 / 61 | 47.9 / 59.5 | - / - | 16.595 | 2.3 | 34.2 / 43.4 | 27.204 / 33.741 | 133 | 0.955 | 0 | 4 | 1588 | 14.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 27.3 / 32.3 | 36.6 | 26.6 / 31.4 | 382 / 4 | 27.3 / 32.3 | 26.6 / 31.4 | 21.5 / 23.1 | 16.193 | 2.3 | 16.8 / 19.7 | 9.39 / 11.9 | 52 | 0.204 | 0 | 4 | 14 | 12.5 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 50.9 / 64.2 | 19.6 | 49.9 / 62.7 | 204 / 0 | 50.9 / 64.2 | 49.9 / 62.7 | - / - | 16.514 | 2.367 | 34.2 / 41.8 | 28.353 / 36.506 | 147 | 0.858 | 1 | 4 | 1426 | 13.8 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.229 ms, AI manager 0.021 ms, perceive 0.004 ms, frame 1.563 ms, frame CPU 1.550 ms, frame CPU (sim frames) 1.521 ms, CPU per 1/60 s sim 0.036 ms, GPU 0.859 ms, draws 0.750.
Per added guard, alert/facing, N 0 -> 24: sim step 0.237 ms, AI manager 0.036 ms, perceive 0.003 ms, frame 1.708 ms, frame CPU 1.692 ms, frame CPU (sim frames) 1.654 ms, CPU per 1/60 s sim 0.035 ms, GPU 0.936 ms, draws 1.333.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 57.8, gBuffer 55.8, sun_CSMShadowMap 6.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 16 alert/facing: PostProcessRTT-TAA 57.8, gBuffer 55.8, sun_CSMShadowMap 16.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 57.9, gBuffer 55.9, sun_CSMShadowMap 6.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
