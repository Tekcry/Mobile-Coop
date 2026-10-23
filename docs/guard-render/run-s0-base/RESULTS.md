# Guard cap: results

Run 2026-10-22T23:26:08.441Z - 2026-10-22T23:34:26.849Z (8.3 min), version 4.68.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.8 / 1.8 | 0.55 | 0.049 | 0.348 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.443 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 1.3 | 0.326 | 0.026 | 0.202 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.272 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.7 | 0.388 | 0.062 | 0.66 | 0 / 0.1 | 0.034 | 0.006 | 0.009 | 0.011 | 0.005 | 0.394 | 0 (0) | 0 | 0.004 (2.21) | 0 (0) | 0 (0) | 0.265 (106.808) | 0 (0) |
| 12 | alert/facing | 1.3 / 3 | 0.548 | 0.074 | 0.785 | 0.1 / 0.4 | 0.075 | 0.01 | 0.029 | 0.024 | 0.029 | 0.438 | 0.001 (0.012) | 0.098 | 0.004 (1.563) | 0.018 (4.708) | 0.001 (0.238) | 0.264 (104.852) | 0 (0) |
| 16 | patrol/facing | 1.3 / 2 | 0.352 | 0.069 | 0.737 | 0 / 0.1 | 0.037 | 0.011 | 0.006 | 0.012 | 0.008 | 0.47 | 0 (0) | 0 | 0.006 (2.985) | 0 (0) | 0 (0) | 0.226 (106.813) | 0 (0) |
| 16 | alert/facing | 1.6 / 2.5 | 0.615 | 0.123 | 1.115 | 0.1 / 0.3 | 0.096 | 0.015 | 0.038 | 0.025 | 0.029 | 0.646 | 0.002 (0.017) | 0.092 | 0.006 (2.025) | 0.015 (4.408) | 0.002 (0.362) | 0.271 (105.06) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2.3 | 0.385 | 0.092 | 0.978 | 0.1 / 0.2 | 0.053 | 0.014 | 0.009 | 0.018 | 0.01 | 0.699 | 0 (0) | 0 | 0.009 (4.455) | 0 (0) | 0 (0) | 0.238 (106.808) | 0 (0) |
| 24 | alert/facing | 2.2 / 3.9 | 0.601 | 0.124 | 1.402 | 0.1 / 0.3 | 0.109 | 0.018 | 0.038 | 0.034 | 0.027 | 0.947 | 0.002 (0.025) | 0.093 | 0.01 (3.095) | 0.015 (5) | 0.001 (0.343) | 0.262 (105.553) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.7 / 6.4 | 370.4 | 2.5 / 6 | 561 / 2342 | 3.2 / 20.5 | 3.6 / 7.6 | 2.3 / 5.3 | 15.772 | 0.6 | 1.9 / 4.7 | 3.173 / 4.654 | 104 | 0.494 | 1 | 4 | 124 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.2 / 5.2 | 454.5 | 2 / 4.9 | 579 / 3031 | 2.9 / 11 | 3.1 / 6.4 | 1.8 / 4.4 | 15.427 | 0.6 | 1.5 / 3.7 | 2.615 / 3.952 | 75 | 0.473 | 1 | 4 | 20 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.8 / 6.5 | 357.1 | 2.6 / 6.1 | 586 / 2257 | 3.3 / 18.3 | 3.5 / 7.3 | 2.4 / 5.6 | 15.546 | 0.6 | 2 / 4.7 | 3.208 / 4.081 | 104 | 0.494 | 1 | 4 | 123 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 6 / 9.1 | 166.7 | 5.8 / 8.8 | 606 / 988 | 5.8 / 10.4 | 6.2 / 10.4 | 5.4 / 7.8 | 16.066 | 0.5 | 4.5 / 6.9 | 5.288 / 6.518 | 142 | 0.889 | 1 | 4 | 736 | 1.9 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.4 / 8.1 | 227.3 | 4.2 / 7.8 | 604 / 1493 | 4.3 / 9 | 4.7 / 9.1 | 3.9 / 7 | 15.908 | 0.5 | 3.1 / 5.9 | 3.402 / 4.592 | 95 | 0.564 | 1 | 4 | 20 | 1.8 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 7.8 / 13.4 | 128.2 | 7.1 / 12.6 | 605 / 585 | 7.9 / 14.8 | 7.7 / 13.6 | 6.6 / 11.3 | 15.452 | 0.6 | 5.5 / 10 | 6.225 / 8.443 | 160 | 0.968 | 3 | 6 | 899 | 2 | 2 / 2 | 2 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 7 / 8.9 | 142.9 | 6.8 / 8.7 | 604 / 799 | 6.9 / 9.1 | 7.3 / 9 | 6.5 / 8.2 | 16.14 | 0.5 | 5.4 / 6.8 | 5.746 / 6.746 | 142 | 0.992 | 1 | 4 | 886 | 2.2 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.9 / 6.1 | 204.1 | 4.7 / 5.8 | 603 / 1403 | 4.9 / 5.9 | 5.2 / 6.2 | 4.5 / 5.5 | 15.959 | 0.5 | 3.5 / 4.3 | 3.508 / 4.153 | 95 | 0.593 | 1 | 4 | 20 | 2.1 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 8.3 / 10.5 | 120.5 | 7.7 / 9.7 | 608 / 589 | 8 / 10.4 | 8.1 / 10.5 | 7.3 / 9 | 15.497 | 0.6 | 6 / 7.5 | 6.418 / 7.539 | 167 | 1.143 | 3 | 6 | 997 | 2.4 | 2 / 2 | 4 of 4 | alert 16 -> alert 14, searching 2 |
| 24 | patrol/facing | 10.1 / 12.2 | 99 | 9.9 / 11.9 | 609 / 378 | 10 / 12.3 | 10.2 / 12.3 | 9.4 / 11.2 | 16.269 | 0.6 | 7.9 / 9.5 | 6.808 / 7.964 | 142 | 1.292 | 1 | 4 | 1429 | 3.6 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 6.6 / 7.9 | 151.5 | 6.3 / 7.7 | 605 / 908 | 6.4 / 7.7 | 6.8 / 8 | 6 / 7.3 | 16.082 | 0.5 | 4.6 / 5.5 | 3.759 / 4.423 | 95 | 0.626 | 1 | 4 | 20 | 3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 12.1 / 14.6 | 82.6 | 11.4 / 13.9 | 610 / 219 | 12.1 / 15 | 11.6 / 14.2 | 10.8 / 12.8 | 15.761 | 0.6 | 9.1 / 10.6 | 7.977 / 9.182 | 162 | 1.452 | 3 | 6 | 1670 | 3.5 | 2 / 2 | 4 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.029 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.308 ms, frame CPU 0.308 ms, frame CPU (sim frames) 0.275 ms, CPU per 1/60 s sim 0.021 ms, GPU 0.151 ms, draws 1.583.
Per added guard, alert/facing, N 0 -> 24: sim step 0.071 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.388 ms, frame CPU 0.367 ms, frame CPU (sim frames) 0.337 ms, CPU per 1/60 s sim 0.009 ms, GPU 0.199 ms, draws 2.417.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 46.8, gBuffer 43.8, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 11.3, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 16 alert/facing: PostProcessRTT-TAA 46.7, gBuffer 43.7, sun_CSMShadowMap 32, maplight-shadow-#_shadowMap 19.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 24 alert/facing: PostProcessRTT-TAA 46.9, gBuffer 43.9, sun_CSMShadowMap 31.6, maplight-shadow-#_shadowMap 14.8, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.7 / 1 | 0.394 | 0.04 | 0.264 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.294 (100.808) | 0 (0) |
| 0 | alert/facing | 0.7 / 1.1 | 0.395 | 0.033 | 0.249 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.302 (100.813) | 0 (0) |
| 12 | patrol/facing | 0.9 / 1.5 | 0.328 | 0.057 | 0.522 | 0 / 0.1 | 0.031 | 0.005 | 0.006 | 0.012 | 0.004 | 0.294 | 0 (0) | 0 | 0.003 (2.245) | 0 (0) | 0 (0) | 0.21 (102.675) | 0 (0) |
| 12 | alert/facing | 1.1 / 2 | 0.437 | 0.069 | 0.594 | 0.1 / 0.2 | 0.057 | 0.005 | 0.023 | 0.02 | 0.006 | 0.3 | 0.001 (0.003) | 0.058 | 0.002 (1.49) | 0 (0) | 0.002 (0.428) | 0.234 (101.205) | 0 (0) |
| 16 | patrol/facing | 1.1 / 1.8 | 0.39 | 0.072 | 0.691 | 0.1 / 0.1 | 0.045 | 0.008 | 0.011 | 0.016 | 0.008 | 0.425 | 0 (0) | 0 | 0.005 (2.975) | 0 (0) | 0 (0) | 0.243 (102.668) | 0 (0) |
| 16 | alert/facing | 1.1 / 2.3 | 0.436 | 0.068 | 0.691 | 0.1 / 0.2 | 0.054 | 0.007 | 0.021 | 0.016 | 0.009 | 0.404 | 0 (0) | 0.06 | 0.005 (1.987) | 0 (0) | 0.002 (0.557) | 0.228 (101.117) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2.4 | 0.418 | 0.099 | 0.913 | 0.1 / 0.2 | 0.062 | 0.013 | 0.015 | 0.018 | 0.013 | 0.622 | 0 (0) | 0 | 0.009 (4.495) | 0 (0) | 0 (0) | 0.242 (102.667) | 0 (0) |
| 24 | alert/facing | 2 / 3.5 | 0.557 | 0.123 | 1.187 | 0.1 / 0.3 | 0.103 | 0.014 | 0.043 | 0.029 | 0.016 | 0.76 | 0 (0.003) | 0.061 | 0.008 (2.983) | 0 (0) | 0.005 (0.887) | 0.253 (101.122) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.5 / 4 | 400 | 2.3 / 3.7 | 541 / 2827 | 2.7 / 32.4 | 3 / 4.2 | 2.2 / 3.3 | 15.472 | 0.5 | 1.8 / 2.7 | 2.897 / 3.294 | 115 | 0.211 | 0 | 4 | 92 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.5 / 4.2 | 400 | 2.3 / 3.8 | 578 / 2960 | 2.6 / 5 | 3 / 4.8 | 2.2 / 3.4 | 15.1 | 0.6 | 1.7 / 2.7 | 2.84 / 3.164 | 52 | 0.204 | 0 | 4 | 14 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.5 / 4.2 | 400 | 2.3 / 3.9 | 530 / 2775 | 2.6 / 27.7 | 3.3 / 4.5 | 2.2 / 3.4 | 15.775 | 0.5 | 1.8 / 2.8 | 2.961 / 3.473 | 115 | 0.211 | 0 | 4 | 92 | 0.7 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5 / 6.3 | 200 | 4.8 / 6.1 | 606 / 1369 | 5 / 6.4 | 5.2 / 6.5 | 4.6 / 5.8 | 15.931 | 0.5 | 3.8 / 4.7 | 4.41 / 5.39 | 133 | 0.549 | 0 | 4 | 772 | 1.5 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.5 / 4.7 | 285.7 | 3.3 / 4.5 | 604 / 2187 | 3.4 / 4.8 | 3.8 / 5.2 | 3.1 / 4.2 | 15.696 | 0.5 | 2.3 / 3.1 | 3.144 / 3.654 | 52 | 0.204 | 0 | 4 | 14 | 1.4 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.6 / 7 | 178.6 | 5.3 / 6.7 | 608 / 1169 | 5.4 / 6.5 | 5.8 / 7.6 | 5 / 6.1 | 15.857 | 0.5 | 4.2 / 5.1 | 4.74 / 5.454 | 139 | 0.551 | 0 | 4 | 808 | 1.6 | 2 / 0 | 0 of 4 | alert 12 -> alert 12 |
| 16 | patrol/facing | 6.7 / 8.7 | 149.3 | 6.5 / 8.4 | 605 / 872 | 6.5 / 8.7 | 6.9 / 8.8 | 6.1 / 7.8 | 16.087 | 0.5 | 5.1 / 6.6 | 5.426 / 6.487 | 133 | 0.684 | 0 | 4 | 1044 | 2.1 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | patrol/away | 4.2 / 5.3 | 238.1 | 4 / 5.1 | 604 / 1741 | 4 / 5.1 | 4.6 / 5.5 | 3.8 / 4.7 | 15.811 | 0.5 | 2.8 / 3.4 | 3.306 / 3.795 | 52 | 0.204 | 0 | 4 | 14 | 1.8 | 2 / 0 | 0 of 4 | unaware 16 -> unaware 16 |
| 16 | alert/facing | 7.1 / 9.2 | 140.8 | 6.8 / 8.9 | 605 / 774 | 6.9 / 9.1 | 7.3 / 9.6 | 6.5 / 8.1 | 16.004 | 0.5 | 5.4 / 6.9 | 5.544 / 6.436 | 147 | 0.658 | 1 | 4 | 1026 | 2.4 | 2 / 0 | 0 of 4 | alert 16 -> alert 16 |
| 24 | patrol/facing | 9.5 / 11.7 | 105.3 | 9.2 / 11.5 | 612 / 444 | 9.3 / 12 | 9.6 / 11.8 | 8.8 / 10.5 | 16.216 | 0.5 | 7.5 / 9.3 | 6.299 / 7.311 | 133 | 0.955 | 0 | 4 | 1588 | 3.3 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.7 / 7.5 | 175.4 | 5.5 / 7.2 | 606 / 1136 | 5.5 / 7.4 | 5.9 / 7.6 | 5.2 / 6.7 | 15.996 | 0.5 | 3.9 / 4.9 | 3.124 / 3.595 | 52 | 0.204 | 0 | 4 | 14 | 2.7 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 9.9 / 12.8 | 101 | 9.6 / 12.4 | 606 / 391 | 9.8 / 13 | 10 / 12.7 | 9 / 11.6 | 16.196 | 0.6 | 7.8 / 9.8 | 6.233 / 7.462 | 155 | 0.909 | 1 | 4 | 1489 | 3.2 | 2 / 0 | 0 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.033 ms, AI manager 0.003 ms, perceive 0.001 ms, frame 0.292 ms, frame CPU 0.287 ms, frame CPU (sim frames) 0.275 ms, CPU per 1/60 s sim 0.031 ms, GPU 0.142 ms, draws 0.750.
Per added guard, alert/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.008 ms, perceive 0.001 ms, frame 0.308 ms, frame CPU 0.304 ms, frame CPU (sim frames) 0.279 ms, CPU per 1/60 s sim 0.018 ms, GPU 0.136 ms, draws 1.667.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 46, gBuffer 44, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1, PostProcessRTT-SSRblurX 1
- N 12 alert/facing: PostProcessRTT-TAA 57.6, gBuffer 55.6, sun_CSMShadowMap 3.3, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 16 alert/facing: PostProcessRTT-TAA 57.9, gBuffer 55.9, sun_CSMShadowMap 9.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 57.9, gBuffer 55.9, sun_CSMShadowMap 17.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
