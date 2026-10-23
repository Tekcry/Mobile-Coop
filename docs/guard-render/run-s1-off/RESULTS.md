# Guard cap: results

Run 2026-10-22T23:16:51.314Z - 2026-10-22T23:25:13.267Z (8.4 min), version 4.68.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## warehouseOps:sector&sectorGuards=0&guardmerge=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.9 / 1.5 | 0.431 | 0.046 | 0.314 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.333 (103.813) | 0 (0) |
| 0 | alert/facing | 0.9 / 1.3 | 0.481 | 0.043 | 0.334 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.378 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.2 / 2.3 | 0.373 | 0.056 | 0.674 | 0 / 0.1 | 0.036 | 0.008 | 0.006 | 0.013 | 0.006 | 0.399 | 0 (0) | 0 | 0.005 (2.25) | 0 (0) | 0 (0) | 0.246 (106.813) | 0 (0) |
| 12 | alert/facing | 1.7 / 4.3 | 0.625 | 0.097 | 1.061 | 0.1 / 0.3 | 0.093 | 0.013 | 0.039 | 0.028 | 0.03 | 0.61 | 0.001 (0.013) | 0.107 | 0.006 (1.517) | 0.016 (4.242) | 0.002 (0.252) | 0.284 (104.6) | 0 (0) |
| 16 | patrol/facing | 1.7 / 2.6 | 0.535 | 0.109 | 1.128 | 0.1 / 0.2 | 0.061 | 0.013 | 0.013 | 0.017 | 0.012 | 0.706 | 0 (0) | 0 | 0.007 (2.98) | 0 (0) | 0 (0) | 0.334 (106.822) | 0 (0) |
| 16 | alert/facing | 1.4 / 2.1 | 0.557 | 0.088 | 1.012 | 0.1 / 0.3 | 0.081 | 0.012 | 0.028 | 0.027 | 0.027 | 0.63 | 0.002 (0.015) | 0.093 | 0.006 (2.06) | 0.015 (5) | 0.002 (0.322) | 0.256 (105.047) | 0 (0) |
| 24 | patrol/facing | 1.6 / 2.1 | 0.415 | 0.086 | 1.029 | 0.1 / 0.2 | 0.059 | 0.017 | 0.01 | 0.018 | 0.01 | 0.723 | 0 (0) | 0 | 0.01 (4.485) | 0 (0) | 0 (0) | 0.251 (106.813) | 0 (0) |
| 24 | alert/facing | 1.9 / 2.9 | 0.616 | 0.122 | 1.297 | 0.1 / 0.3 | 0.107 | 0.018 | 0.044 | 0.026 | 0.031 | 0.881 | 0.001 (0.012) | 0.099 | 0.011 (3.03) | 0.018 (5) | 0.004 (0.455) | 0.269 (105.062) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.2 / 5.5 | 312.5 | 2.9 / 5.1 | 587 / 2255 | 3.3 / 6.2 | 4 / 6.4 | 2.7 / 4.5 | 15.506 | 0.6 | 2.2 / 3.7 | 3.519 / 5.012 | 104 | 0.494 | 1 | 4 | 124 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.5 / 4.4 | 400 | 2.3 / 4.1 | 582 / 3041 | 2.6 / 6.3 | 3.1 / 5.2 | 2.1 / 3.6 | 15.43 | 0.6 | 1.7 / 2.9 | 2.632 / 3.565 | 75 | 0.473 | 1 | 4 | 20 | 0.8 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3.1 / 5.4 | 322.6 | 2.9 / 5 | 568 / 2241 | 3.4 / 9 | 3.7 / 5.9 | 2.7 / 4.5 | 15.503 | 0.6 | 2.2 / 3.7 | 3.415 / 4.376 | 104 | 0.494 | 1 | 4 | 123 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 6.4 / 8.7 | 156.3 | 6.2 / 8.4 | 605 / 914 | 6.3 / 8.6 | 6.6 / 8.8 | 5.9 / 7.9 | 16.089 | 0.5 | 4.9 / 6.7 | 5.604 / 6.801 | 142 | 0.889 | 1 | 4 | 735 | 1.9 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.5 / 6 | 222.2 | 4.3 / 5.7 | 605 / 1550 | 4.5 / 6.1 | 4.7 / 6.2 | 4.2 / 5.4 | 15.887 | 0.5 | 3.2 / 4.2 | 3.538 / 4.325 | 95 | 0.564 | 1 | 4 | 20 | 1.7 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 8.6 / 11.2 | 116.3 | 7.9 / 10.5 | 609 / 548 | 8.2 / 11.8 | 8.3 / 11.4 | 7.4 / 9.3 | 15.419 | 0.6 | 6.2 / 7.8 | 6.727 / 7.864 | 164 | 1.036 | 3 | 6 | 919 | 2.2 | 2 / 2 | 4 of 4 | alert 12 -> alert 10, searching 2 |
| 16 | patrol/facing | 9.1 / 12.9 | 109.9 | 8.8 / 12.6 | 606 / 460 | 8.9 / 14.2 | 9.2 / 13.7 | 8.3 / 10.9 | 16.206 | 0.6 | 7 / 9.9 | 6.273 / 7.847 | 142 | 0.992 | 1 | 4 | 884 | 2.8 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 5.7 / 7.1 | 175.4 | 5.5 / 6.9 | 607 / 1122 | 5.5 / 6.8 | 6 / 7.4 | 5.2 / 6.4 | 16.003 | 0.6 | 4.1 / 4.9 | 3.5 / 4.181 | 95 | 0.594 | 1 | 4 | 20 | 2.6 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 9.3 / 11.2 | 107.5 | 8.7 / 10.6 | 608 / 468 | 9.1 / 11.2 | 9.1 / 11 | 8.2 / 9.7 | 15.637 | 0.6 | 6.9 / 8.1 | 6.609 / 7.713 | 163 | 1.147 | 3 | 6 | 1106 | 2.6 | 2 / 2 | 4 of 4 | alert 16 -> alert 15, searching 1 |
| 24 | patrol/facing | 9.7 / 11.8 | 103.1 | 9.5 / 11.5 | 609 / 421 | 9.5 / 11.9 | 9.8 / 11.9 | 8.9 / 10.5 | 16.251 | 0.6 | 7.6 / 9 | 6.702 / 7.801 | 142 | 1.293 | 1 | 4 | 1429 | 3.3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 6.7 / 8.4 | 149.3 | 6.5 / 8.1 | 606 / 879 | 6.5 / 8.1 | 6.9 / 8.5 | 6.1 / 7.4 | 16.101 | 0.6 | 4.7 / 5.8 | 3.838 / 4.573 | 95 | 0.625 | 1 | 4 | 20 | 3.2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 11 / 13 | 90.9 | 10.3 / 12.4 | 607 / 304 | 10.9 / 13.4 | 10.6 / 13 | 9.8 / 11.3 | 15.721 | 0.6 | 8.2 / 9.4 | 7.391 / 8.497 | 162 | 1.349 | 3 | 6 | 1459 | 3.3 | 2 / 2 | 4 of 4 | alert 24 -> searching 6, alert 18 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.029 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.271 ms, frame CPU 0.275 ms, frame CPU (sim frames) 0.242 ms, CPU per 1/60 s sim 0.031 ms, GPU 0.133 ms, draws 1.583.
Per added guard, alert/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.329 ms, frame CPU 0.308 ms, frame CPU (sim frames) 0.287 ms, CPU per 1/60 s sim 0.009 ms, GPU 0.166 ms, draws 2.417.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 46.7, gBuffer 43.7, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 17, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 16 alert/facing: PostProcessRTT-TAA 46.8, gBuffer 43.8, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 15.3, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: PostProcessRTT-TAA 46.8, gBuffer 43.8, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 14.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse:course&guardmerge=0

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.7 / 1.1 | 0.412 | 0.043 | 0.276 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.305 (100.813) | 0 (0) |
| 0 | alert/facing | 0.7 / 1 | 0.39 | 0.038 | 0.253 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.292 (100.822) | 0 (0) |
| 12 | patrol/facing | 0.9 / 1.4 | 0.321 | 0.063 | 0.52 | 0 / 0.1 | 0.029 | 0.005 | 0.009 | 0.009 | 0.004 | 0.295 | 0 (0) | 0 | 0.003 (2.22) | 0 (0) | 0 (0) | 0.207 (102.677) | 0 (0) |
| 12 | alert/facing | 1.3 / 3.6 | 0.751 | 0.117 | 1.094 | 0.1 / 0.5 | 0.111 | 0.012 | 0.045 | 0.04 | 0.01 | 0.615 | 0 (0.002) | 0.085 | 0.007 (1.487) | 0 (0) | 0.003 (0.367) | 0.397 (101.122) | 0 (0) |
| 16 | patrol/facing | 1.2 / 3 | 0.453 | 0.08 | 0.777 | 0.1 / 0.2 | 0.056 | 0.011 | 0.011 | 0.02 | 0.007 | 0.484 | 0 (0) | 0 | 0.008 (3) | 0 (0) | 0 (0) | 0.291 (102.667) | 0 (0) |
| 16 | alert/facing | 1 / 2.6 | 0.459 | 0.074 | 0.672 | 0.1 / 0.2 | 0.067 | 0.007 | 0.031 | 0.018 | 0.007 | 0.387 | 0 (0.002) | 0.055 | 0.004 (1.987) | 0 (0) | 0.002 (0.588) | 0.245 (101.13) | 0 (0) |
| 24 | patrol/facing | 1.3 / 3.2 | 0.411 | 0.098 | 0.854 | 0.1 / 0.2 | 0.065 | 0.011 | 0.019 | 0.02 | 0.012 | 0.589 | 0 (0) | 0 | 0.007 (4.455) | 0 (0) | 0 (0) | 0.233 (102.667) | 0 (0) |
| 24 | alert/facing | 1.3 / 3 | 0.468 | 0.088 | 0.892 | 0.1 / 0.3 | 0.081 | 0.009 | 0.034 | 0.022 | 0.012 | 0.577 | 0 (0.003) | 0.063 | 0.005 (2.99) | 0 (0) | 0.003 (0.878) | 0.226 (101.117) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.6 / 4.1 | 384.6 | 2.3 / 3.8 | 520 / 2681 | 2.8 / 37.6 | 3.1 / 4.2 | 2.3 / 3.4 | 15.924 | 0.5 | 1.8 / 2.7 | 3.081 / 3.84 | 115 | 0.211 | 0 | 4 | 92 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2 / 3.4 | 500 | 1.8 / 3.2 | 461 / 2964 | 2.1 / 56.4 | 2.5 / 4.3 | 1.7 / 2.7 | 15.931 | 0.5 | 1.3 / 2 | 2.74 / 3.048 | 52 | 0.204 | 0 | 4 | 14 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.4 / 4.3 | 416.7 | 2.2 / 4 | 529 / 2703 | 2.5 / 30.2 | 3.2 / 4.9 | 2.1 / 3.5 | 15.707 | 0.5 | 1.7 / 2.9 | 3.218 / 3.646 | 115 | 0.211 | 0 | 4 | 92 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.1 / 6.3 | 196.1 | 4.9 / 6 | 606 / 1349 | 4.9 / 6 | 5.4 / 6.3 | 4.6 / 5.6 | 15.94 | 0.5 | 3.8 / 4.6 | 4.443 / 5.159 | 133 | 0.549 | 0 | 4 | 772 | 1.6 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4 / 8.4 | 250 | 3.8 / 8 | 604 / 1597 | 4.1 / 9.5 | 4.5 / 10.2 | 3.6 / 7.2 | 15.786 | 0.5 | 2.6 / 5.9 | 3.122 / 3.705 | 52 | 0.204 | 0 | 4 | 14 | 1.6 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.7 / 10.7 | 175.4 | 5.4 / 10.3 | 607 / 1006 | 5.8 / 12.1 | 6 / 11.5 | 5.1 / 9 | 15.906 | 0.5 | 4.2 / 8.1 | 4.48 / 5.924 | 139 | 0.552 | 0 | 4 | 814 | 1.8 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 6.8 / 10.9 | 147.1 | 6.6 / 10.6 | 604 / 783 | 6.8 / 12.8 | 7 / 11.7 | 6.2 / 9.7 | 16.119 | 0.5 | 5.2 / 8.6 | 5.318 / 6.663 | 133 | 0.684 | 0 | 4 | 1044 | 2.4 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.2 / 6.5 | 238.1 | 4 / 6.2 | 603 / 1644 | 4.2 / 7.8 | 4.5 / 7.7 | 3.8 / 5.8 | 15.859 | 0.5 | 2.9 / 4.8 | 3.276 / 3.684 | 52 | 0.204 | 0 | 4 | 14 | 2.1 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 7.9 / 13.7 | 126.6 | 7.6 / 13.4 | 606 / 566 | 7.9 / 14.2 | 8.1 / 13.8 | 7 / 11.6 | 16.074 | 0.6 | 6.1 / 10.8 | 5.529 / 7.497 | 143 | 0.694 | 1 | 4 | 1117 | 2.4 | 2 / 0 | 0 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 9.2 / 14.5 | 108.7 | 8.9 / 14.2 | 607 / 435 | 9.1 / 15.5 | 9.3 / 14.9 | 8.4 / 11.8 | 16.224 | 0.5 | 7.3 / 11.6 | 6.105 / 7.97 | 133 | 0.955 | 0 | 4 | 1588 | 3.1 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.4 / 9.6 | 185.2 | 5.2 / 9.3 | 606 / 1132 | 5.2 / 10.5 | 5.5 / 10.2 | 4.9 / 8.1 | 15.953 | 0.5 | 3.7 / 6.9 | 2.921 / 3.44 | 52 | 0.204 | 0 | 4 | 14 | 2.8 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 9.5 / 15.6 | 105.3 | 9.2 / 15.3 | 606 / 388 | 9.5 / 16.8 | 9.6 / 16.3 | 8.5 / 13.2 | 16.167 | 0.55 | 7.4 / 12.4 | 5.873 / 7.884 | 155 | 0.911 | 1 | 4 | 1522 | 3.3 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.025 ms, AI manager 0.004 ms, perceive 0.000 ms, frame 0.275 ms, frame CPU 0.275 ms, frame CPU (sim frames) 0.258 ms, CPU per 1/60 s sim 0.013 ms, GPU 0.126 ms, draws 0.750.
Per added guard, alert/facing, N 0 -> 24: sim step 0.025 ms, AI manager 0.007 ms, perceive 0.000 ms, frame 0.296 ms, frame CPU 0.292 ms, frame CPU (sim frames) 0.267 ms, CPU per 1/60 s sim 0.019 ms, GPU 0.111 ms, draws 1.667.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 57.9, gBuffer 55.9, sun_CSMShadowMap 3.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 16 alert/facing: PostProcessRTT-TAA 57.9, gBuffer 55.9, sun_CSMShadowMap 5.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 57.9, gBuffer 55.9, sun_CSMShadowMap 16.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
