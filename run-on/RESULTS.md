# Guard cap: results

Run 2026-10-24T03:45:25.136Z - 2026-10-24T03:51:57.057Z (6.5 min), version 4.80.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.9 | 0.328 | 0.028 | 0.239 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.255 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.34 | 0.023 | 0.232 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.271 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.412 | 0.066 | 0.685 | 0.1 / 0.2 | 0.055 | 0.008 | 0.007 | 0.024 | 0.006 | 0.362 | 0 (0) | 0 | 0.003 (2.23) | 0 (0) | 0 (0) | 0.25 (106.822) | 0 (0) |
| 12 | alert/facing | 1.3 / 2.3 | 0.531 | 0.066 | 0.739 | 0.1 / 0.5 | 0.09 | 0.011 | 0.032 | 0.027 | 0.025 | 0.412 | 0.001 (0.022) | 0.089 | 0.005 (1.503) | 0.017 (4.958) | 0.005 (0.64) | 0.233 (105.095) | 0 (0) |
| 24 | patrol/facing | 1.6 / 2.5 | 0.422 | 0.082 | 0.979 | 0.1 / 0.2 | 0.084 | 0.019 | 0.01 | 0.032 | 0.011 | 0.631 | 0 (0) | 0 | 0.011 (4.475) | 0 (0) | 0 (0) | 0.231 (106.813) | 0 (0) |
| 24 | alert/facing | 1.9 / 3 | 0.68 | 0.129 | 1.364 | 0.2 / 0.7 | 0.186 | 0.019 | 0.067 | 0.057 | 0.029 | 0.851 | 0.001 (0.022) | 0.105 | 0.01 (3.03) | 0.017 (5) | 0.009 (1.517) | 0.236 (104.89) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.5 / 4.2 | 400 | 2.3 / 3.9 | 549 / 2709 | 2.6 / 28.8 | 3.1 / 4.7 | 2.2 / 3.5 | 15.579 | 0.5 | 1.8 / 2.9 | 3.203 / 3.517 | 104 | 0.494 | 1 | 4 | 121 | 0.6 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.1 / 3.3 | 476.2 | 2 / 3 | 580 / 3483 | 2.2 / 22 | 2.6 / 3.6 | 1.9 / 2.7 | 15.452 | 0.5 | 1.5 / 2.2 | 2.376 / 2.706 | 77 | 0.473 | 1 | 4 | 23 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2.4 / 4.9 | 416.7 | 2.2 / 4.6 | 567 / 2631 | 2.6 / 25.3 | 3 / 4.5 | 2.1 / 4.6 | 15.657 | 0.4 | 1.7 / 3.4 | 3.025 / 3.562 | 104 | 0.494 | 1 | 4 | 121 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.2 / 6.5 | 192.3 | 4.9 / 6.2 | 604 / 1302 | 5 / 6.3 | 5.4 / 6.6 | 4.7 / 5.7 | 15.939 | 0.6 | 3.7 / 4.6 | 4.611 / 5.538 | 187 | 0.86 | 2 | 5 | 293 | 1.4 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 4.2 / 5.3 | 238.1 | 4 / 5 | 606 / 1785 | 4.1 / 5 | 4.5 / 5.4 | 3.8 / 4.6 | 15.846 | 0.6 | 3.1 / 3.7 | 3.611 / 4.314 | 155 | 0.973 | 5 | 8 | 27 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.8 / 7.3 | 172.4 | 5.3 / 6.7 | 606 / 1082 | 5.6 / 6.7 | 5.8 / 7.3 | 5 / 5.9 | 15.105 | 0.6 | 3.9 / 4.7 | 5.232 / 6.069 | 226 | 1.042 | 4 | 7 | 372 | 1.6 | 2 / 2 | 4 of 4 | alert 12 -> alert 10, searching 2 |
| 24 | patrol/facing | 7.3 / 8.8 | 137 | 7 / 8.5 | 606 / 769 | 7 / 8.6 | 7.4 / 8.8 | 6.7 / 8 | 16.131 | 0.6 | 5.3 / 6.5 | 5.492 / 6.441 | 258 | 1.218 | 2 | 5 | 487 | 2.1 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.8 / 7 | 172.4 | 5.6 / 6.8 | 605 / 1107 | 5.6 / 6.6 | 6.1 / 7.1 | 5.4 / 6.3 | 16.026 | 0.6 | 4.4 / 5.2 | 4.41 / 5.075 | 227 | 1.39 | 5 | 8 | 27 | 1.9 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.9 / 11.1 | 112.4 | 8.2 / 10.3 | 607 / 509 | 8.5 / 11.4 | 8.7 / 11.5 | 7.7 / 9.6 | 15.495 | 0.7 | 6 / 7.4 | 6.259 / 7.603 | 303 | 1.429 | 5 | 8 | 571 | 2.3 | 2 / 2 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.200 ms, frame CPU 0.196 ms, frame CPU (sim frames) 0.179 ms, CPU per 1/60 s sim 0.023 ms, GPU 0.095 ms, draws 6.417.
Per added guard, alert/facing, N 0 -> 24: sim step 0.058 ms, AI manager 0.014 ms, perceive 0.001 ms, frame 0.271 ms, frame CPU 0.250 ms, frame CPU (sim frames) 0.237 ms, CPU per 1/60 s sim -0.007 ms, GPU 0.135 ms, draws 8.292.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 64, PostProcessRTT-TAA 51.7, gBuffer 48.7, maplight-shadow-#_shadowMap 30.5, charshadow-#_shadowMap 4.7, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 87.7, PostProcessRTT-TAA 63.2, gBuffer 60.2, maplight-shadow-#_shadowMap 51.8, charshadow-#_shadowMap 14.5, RenderTargetWrapper 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.6 / 0.8 | 0.304 | 0.033 | 0.232 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.229 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.287 | 0.022 | 0.194 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.226 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.1 / 1.6 | 0.39 | 0.07 | 0.683 | 0.1 / 0.2 | 0.069 | 0.011 | 0.009 | 0.032 | 0.005 | 0.392 | 0 (0) | 0 | 0.006 (2.245) | 0 (0) | 0 (0) | 0.219 (104.25) | 0 (0) |
| 12 | alert/facing | 1.4 / 2.6 | 2.396 | 0.085 | 0.86 | 0.1 / 0.4 | 0.11 | 0.015 | 0.034 | 0.036 | 0.023 | 0.456 | 0 (0.015) | 1.922 | 0.006 (1.5) | 0.015 (5) | 0.003 (0.66) | 0.242 (105.485) | 0 (0) |
| 24 | patrol/facing | 1.7 / 2.4 | 0.463 | 0.105 | 1.11 | 0.1 / 0.2 | 0.112 | 0.02 | 0.018 | 0.049 | 0.008 | 0.731 | 0 (0) | 0 | 0.013 (4.48) | 0 (0) | 0 (0) | 0.227 (104.267) | 0 (0) |
| 24 | alert/facing | 2 / 3.5 | 2.47 | 0.127 | 1.367 | 0.2 / 0.5 | 0.191 | 0.026 | 0.062 | 0.065 | 0.024 | 0.842 | 0.001 (0.02) | 1.884 | 0.011 (3.015) | 0.014 (5) | 0.007 (1.622) | 0.237 (104.997) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2.1 / 3.6 | 476.2 | 1.9 / 3.3 | 524 / 3083 | 2.2 / 40 | 2.5 / 4.1 | 1.8 / 2.7 | 15.736 | 0.4 | 1.5 / 2.3 | 2.882 / 3.215 | 87 | 0.473 | 1 | 4 | 212 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.8 / 3.3 | 555.6 | 1.7 / 3 | 502 / 3305 | 1.9 / 43.3 | 2.4 / 3.7 | 1.6 / 2.4 | 15.643 | 0.4 | 1.2 / 1.9 | 2.516 / 2.831 | 76 | 0.464 | 1 | 4 | 22 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 2 / 4.7 | 500 | 1.8 / 4.3 | 555 / 2968 | 2.2 / 27.7 | 2.6 / 5.1 | 1.8 / 3.6 | 15.802 | 0.4 | 1.4 / 3.2 | 2.835 / 3.219 | 87 | 0.473 | 1 | 4 | 212 | 0.5 | 2 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5 / 6.1 | 200 | 4.8 / 5.9 | 606 / 1377 | 4.9 / 5.9 | 5.3 / 6.3 | 4.6 / 5.5 | 15.939 | 0.5 | 3.6 / 4.4 | 3.926 / 4.666 | 173 | 0.859 | 2 | 5 | 440 | 1.4 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.8 / 4.9 | 263.2 | 3.6 / 4.6 | 605 / 1999 | 3.7 / 4.6 | 4.2 / 5 | 3.4 / 4.2 | 15.802 | 0.5 | 2.8 / 3.4 | 3.191 / 3.846 | 139 | 0.799 | 2 | 5 | 24 | 1.3 | 2 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 5.6 / 7.5 | 178.6 | 5.1 / 6.9 | 545 / 1000 | 5.4 / 8.4 | 5.7 / 9.4 | 4.8 / 6 | 15.49 | 0.6 | 3.7 / 4.7 | 4.341 / 5.135 | 184 | 0.906 | 4 | 7 | 306 | 1.5 | 2 / 2 | 4 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 8 / 9.5 | 125 | 7.7 / 9.3 | 607 / 649 | 7.7 / 9.3 | 8.1 / 9.5 | 7.3 / 8.6 | 16.168 | 0.6 | 5.7 / 6.9 | 4.891 / 5.773 | 236 | 1.177 | 2 | 5 | 668 | 2.4 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 5.4 / 6.5 | 185.2 | 5.1 / 6.2 | 607 / 1254 | 5.2 / 6 | 5.7 / 6.5 | 4.9 / 5.7 | 15.932 | 0.6 | 4 / 4.6 | 3.923 / 4.572 | 172 | 0.921 | 2 | 5 | 24 | 2 | 2 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.8 / 12 | 113.6 | 8.2 / 11.3 | 540 / 454 | 8.5 / 12.8 | 8.7 / 13.5 | 7.7 / 9.1 | 15.877 | 0.7 | 6.1 / 7.5 | 5.603 / 6.904 | 279 | 1.344 | 4 | 7 | 546 | 2.4 | 2 / 2 | 4 of 4 | alert 24 -> alert 23, searching 1 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.006 ms, perceive 0.001 ms, frame 0.246 ms, frame CPU 0.242 ms, frame CPU (sim frames) 0.233 ms, CPU per 1/60 s sim 0.018 ms, GPU 0.084 ms, draws 6.208.
Per added guard, alert/facing, N 0 -> 24: sim step 0.063 ms, AI manager 0.088 ms, perceive 0.001 ms, frame 0.283 ms, frame CPU 0.267 ms, frame CPU (sim frames) 0.254 ms, CPU per 1/60 s sim 0.003 ms, GPU 0.115 ms, draws 8.000.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 26, gBuffer 24, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 55.4, PostProcessRTT-TAA 35.5, gBuffer 33.5, maplight-shadow-#_shadowMap 27.1, charshadow-#_shadowMap 6.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 98.4, PostProcessRTT-TAA 49.6, maplight-shadow-#_shadowMap 48.5, gBuffer 47.6, charshadow-#_shadowMap 7.9, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
