# Guard cap: results

Run 2026-10-24T06:25:33.035Z - 2026-10-24T06:33:11.506Z (7.6 min), version 4.90.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.327 | 0.03 | 0.223 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.251 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.6 | 0.299 | 0.021 | 0.201 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.236 (103.813) | 0 (0) |
| 12 | patrol/facing | 1.1 / 2 | 0.369 | 0.05 | 0.506 | 0.1 / 0.2 | 0.046 | 0.006 | 0.006 | 0.02 | 0.009 | 0.262 | 0 (0) | 0 | 0.003 (1.825) | 0 (0) | 0 (0) | 0.232 (106.808) | 0 (0) |
| 12 | alert/facing | 1.2 / 1.5 | 0.443 | 0.068 | 0.733 | 0.1 / 0.3 | 0.092 | 0.011 | 0.03 | 0.029 | 0.024 | 0.414 | 0.002 (0.01) | 0 | 0.004 (1.49) | 0.013 (3.217) | 0.004 (0.973) | 0.244 (104.533) | 0 (0) |
| 24 | patrol/facing | 1.5 / 2.9 | 0.426 | 0.082 | 0.807 | 0.1 / 0.2 | 0.083 | 0.016 | 0.013 | 0.033 | 0.014 | 0.531 | 0 (0) | 0 | 0.009 (3.905) | 0 (0) | 0 (0) | 0.234 (106.813) | 0 (0) |
| 24 | alert/facing | 1.7 / 2.4 | 0.533 | 0.097 | 1.032 | 0.2 / 0.5 | 0.166 | 0.018 | 0.055 | 0.058 | 0.029 | 0.681 | 0.002 (0.025) | 0 | 0.01 (3.003) | 0.014 (5) | 0.006 (1.248) | 0.231 (104.885) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.9 / 3.8 | 526.3 | 1.8 / 3.5 | 364 / 2409 | 1.9 / 81 | 2.4 / 4.4 | 1.7 / 2.6 | 17.92 | 0.4 | 1.4 / 2.2 | 3.668 / 3.88 | 108 | 0.508 | 1 | 4 | 124 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.5 / 2.8 | 666.7 | 1.4 / 2.6 | 430 / 3263 | 1.6 / 60.6 | 2 / 3.8 | 1.3 / 2 | 16.162 | 0.4 | 1.1 / 1.8 | 2.721 / 2.761 | 85 | 0.494 | 1 | 4 | 27 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.8 / 4.2 | 555.6 | 1.7 / 4 | 362 / 2365 | 1.9 / 76.9 | 2.4 / 5 | 1.6 / 2.7 | 17.703 | 0.4 | 1.3 / 2.3 | 3.743 / 3.916 | 108 | 0.508 | 1 | 4 | 124 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 3.6 / 5.1 | 277.8 | 3.5 / 5 | 581 / 1909 | 3.7 / 21.4 | 4.2 / 5.4 | 3.3 / 4.5 | 15.986 | 0.5 | 2.6 / 3.5 | 4.095 / 4.542 | 176 | 1.538 | 1 | 4 | 140 | 1.1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 2.9 / 3.9 | 344.8 | 2.8 / 3.7 | 605 / 2768 | 2.9 / 3.6 | 3.4 / 4.1 | 2.7 / 3.3 | 15.737 | 0.5 | 2.2 / 2.7 | 2.881 / 3.59 | 135 | 1.12 | 4 | 7 | 31 | 0.8 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.8 / 6 | 208.3 | 4.3 / 5.3 | 604 / 1475 | 4.6 / 5.3 | 4.9 / 5.6 | 4.1 / 4.7 | 14.881 | 0.6 | 3.2 / 3.7 | 4.57 / 5.8 | 202 | 1.669 | 4 | 7 | 167 | 1.3 | 0 / 0 | 3 of 4 | alert 12 -> alert 11, searching 1 |
| 24 | patrol/facing | 5.4 / 6.5 | 185.2 | 5.1 / 6.3 | 606 / 1258 | 5.2 / 6.2 | 5.7 / 6.6 | 4.9 / 5.9 | 16.028 | 0.6 | 3.8 / 4.5 | 5.093 / 5.879 | 241 | 2.524 | 3 | 6 | 157 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3.5 / 4.7 | 285.7 | 3.3 / 4.4 | 605 / 2208 | 3.4 / 4.3 | 4.1 / 4.8 | 3.2 / 4 | 15.844 | 0.6 | 2.7 / 3.3 | 3.278 / 3.935 | 135 | 1.12 | 5 | 8 | 31 | 1.3 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6.2 / 7.4 | 161.3 | 5.6 / 6.8 | 605 / 1021 | 5.8 / 6.7 | 6.3 / 7.2 | 5.2 / 6.1 | 15.215 | 0.7 | 4.1 / 4.7 | 5.745 / 6.402 | 260 | 2.498 | 6 | 9 | 202 | 1.8 | 0 / 0 | 4 of 4 | alert 24 -> alert 20, searching 4 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.146 ms, frame CPU 0.137 ms, frame CPU (sim frames) 0.138 ms, CPU per 1/60 s sim -0.079 ms, GPU 0.059 ms, draws 5.542.
Per added guard, alert/facing, N 0 -> 24: sim step 0.050 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.183 ms, frame CPU 0.162 ms, frame CPU (sim frames) 0.163 ms, CPU per 1/60 s sim -0.104 ms, GPU 0.083 ms, draws 6.333.

### Guard render CPU and active meshes (counted sample)

| N | cell | render.figure ms mean / p95 | of it frame / pose | poses / frame | render.s1 ms mean / p95 | S1 poses / frame | active total | guard-owned | body | lod | gear | gun parts | helmet | shield | other | per guard: owned / gun | other top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 124 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 124 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 12 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0.163 / 0.4 | 10.787 | 140 | 17 | 9 | 0 | 0 | 0 | 0 | 0 | 8 | 1.42 / 0 | e#-gun 7.8 |
| 12 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0.076 / 0.2 | 5 | 31 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0.33 / 0 |  |
| 12 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0.151 / 0.3 | 8.988 | 167 | 14 | 8 | 0 | 0 | 0 | 0 | 0 | 6 | 1.17 / 0 | e#-gun 6.2 |
| 24 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0.288 / 0.6 | 19.796 | 157 | 34 | 18 | 0 | 0 | 0 | 0 | 0 | 16 | 1.42 / 0 | e#-gun 16.1 |
| 24 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0.104 / 0.3 | 5 | 31 | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0.17 / 0 |  |
| 24 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0.254 / 0.5 | 15.143 | 202 | 26 | 14 | 0 | 0 | 0 | 0 | 0 | 12 | 1.08 / 0 | e#-gun 11.6 |

(render.figure: GuardBody.frame + GuardFigure.posePending per frame; render.s1: SmoothBody.frame + SmoothBody.pose; both wrapped only in the 2 s counted sample. Active meshes: the camera pass, guard-owned = under a guard rig root; gun parts = `wpn-*` instances.)

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 37, gBuffer 34, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: sun_CSMShadowMap 52, PostProcessRTT-TAA 48.9, gBuffer 45.9, torchshadow-#_shadowMap 26.5, RenderTargetWrapper 4.2, charshadow-#_shadowMap 3.4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 69.8, PostProcessRTT-TAA 55.8, gBuffer 52.8, torchshadow-#_shadowMap 35.5, charshadow-#_shadowMap 15.4, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.271 | 0.027 | 0.195 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.202 (103.808) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.272 | 0.026 | 0.189 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.212 (103.808) | 0 (0) |
| 12 | patrol/facing | 1.4 / 2.4 | 0.426 | 0.065 | 0.636 | 0.1 / 0.2 | 0.076 | 0.009 | 0.01 | 0.039 | 0.011 | 0.349 | 0 (0) | 0 | 0.004 (1.25) | 0 (0) | 0 (0) | 0.232 (104.258) | 0 (0) |
| 12 | alert/facing | 1.2 / 1.8 | 0.477 | 0.069 | 0.683 | 0.1 / 0.3 | 0.111 | 0.011 | 0.042 | 0.035 | 0.021 | 0.334 | 0 (0.018) | 0 | 0.004 (1.487) | 0.011 (4.625) | 0.003 (0.752) | 0.241 (104.978) | 0 (0) |
| 24 | patrol/facing | 2.4 / 4.2 | 0.507 | 0.113 | 1.004 | 0.2 / 0.2 | 0.119 | 0.01 | 0.023 | 0.059 | 0.016 | 0.67 | 0 (0) | 0 | 0.004 (1.49) | 0 (0) | 0 (0) | 0.25 (104.253) | 0 (0) |
| 24 | alert/facing | 1.8 / 3 | 0.604 | 0.114 | 1.125 | 0.2 / 0.5 | 0.194 | 0.024 | 0.063 | 0.072 | 0.034 | 0.68 | 0.001 (0.015) | 0 | 0.007 (2.99) | 0.02 (5) | 0.009 (1.818) | 0.24 (104.995) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.3 / 4.6 | 303 | 3.1 / 4.3 | 595 / 2303 | 3.3 / 11.7 | 3.7 / 4.7 | 3 / 4 | 15.831 | 0.4 | 2.6 / 3.5 | 3.463 / 4.111 | 267 | 0.88 | 2 | 5 | 300 | 0.8 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.7 / 3.5 | 588.2 | 1.6 / 3.3 | 456 / 2916 | 1.9 / 54.5 | 2.3 / 3.9 | 1.5 / 2.4 | 16.035 | 0.4 | 1.3 / 2.1 | 2.975 / 3.043 | 88 | 0.537 | 2 | 5 | 26 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3 / 4.7 | 333.3 | 2.8 / 4.4 | 594 / 2339 | 3.1 / 18.4 | 3.5 / 4.8 | 2.7 / 4 | 15.88 | 0.4 | 2.4 / 3.5 | 3.56 / 3.702 | 263 | 0.827 | 1 | 4 | 300 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 5.3 / 6.6 | 188.7 | 5.1 / 6.4 | 606 / 1277 | 5.1 / 6.3 | 5.6 / 6.9 | 4.8 / 5.9 | 15.989 | 0.6 | 3.9 / 4.8 | 4.992 / 5.579 | 341 | 2.001 | 2 | 5 | 323 | 1.5 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 2.8 / 4.4 | 357.1 | 2.6 / 4.1 | 575 / 2636 | 2.9 / 18.5 | 3.5 / 4.6 | 2.4 / 3.6 | 15.767 | 0.5 | 2 / 3 | 3.112 / 3.657 | 112 | 0.84 | 2 | 5 | 28 | 1.1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.2 / 7.6 | 161.3 | 5.7 / 7 | 606 / 996 | 6 / 7.3 | 6.3 / 7.3 | 5.4 / 6.3 | 15.315 | 0.6 | 4.5 / 5.3 | 5.631 / 6.566 | 343 | 1.664 | 4 | 7 | 378 | 1.5 | 0 / 0 | 4 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 7.8 / 9.7 | 128.2 | 7.6 / 9.4 | 606 / 669 | 7.5 / 9.8 | 8 / 9.7 | 7.1 / 8.9 | 16.133 | 0.7 | 5.6 / 7 | 5.444 / 6.542 | 402 | 3.04 | 2 | 5 | 346 | 2.1 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3.7 / 4.8 | 270.3 | 3.5 / 4.5 | 603 / 2030 | 3.6 / 4.4 | 4.2 / 5 | 3.4 / 4 | 15.75 | 0.6 | 2.8 / 3.3 | 3.373 / 4.202 | 112 | 0.84 | 2 | 5 | 28 | 1.4 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 8.2 / 10 | 122 | 7.7 / 9.3 | 607 / 614 | 7.8 / 10.1 | 8.2 / 9.7 | 7.1 / 8.6 | 15.581 | 0.7 | 5.8 / 7 | 6.411 / 7.333 | 435 | 3.084 | 4 | 7 | 380 | 2.1 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.079 ms, AI manager 0.006 ms, perceive 0.000 ms, frame 0.188 ms, frame CPU 0.188 ms, frame CPU (sim frames) 0.179 ms, CPU per 1/60 s sim 0.013 ms, GPU 0.083 ms, draws 5.625.
Per added guard, alert/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.011 ms, perceive 0.001 ms, frame 0.217 ms, frame CPU 0.204 ms, frame CPU (sim frames) 0.196 ms, CPU per 1/60 s sim -0.012 ms, GPU 0.119 ms, draws 7.167.

### Guard render CPU and active meshes (counted sample)

| N | cell | render.figure ms mean / p95 | of it frame / pose | poses / frame | render.s1 ms mean / p95 | S1 poses / frame | active total | guard-owned | body | lod | gear | gun parts | helmet | shield | other | per guard: owned / gun | other top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 299 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 301 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 12 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0.182 / 0.4 | 11.521 | 324 | 24 | 12 | 0 | 0 | 0 | 0 | 0 | 12 | 2 / 0 | e#-gun 11.5 |
| 12 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0.066 / 0.2 | 3 | 28 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0.17 / 0 |  |
| 12 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0.122 / 0.3 | 5.968 | 378 | 8 | 4 | 0 | 0 | 0 | 0 | 0 | 4 | 0.67 / 0 | e#-gun 3.9 |
| 24 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0.367 / 0.7 | 22.636 | 346 | 46 | 23 | 0 | 0 | 0 | 0 | 0 | 23 | 1.92 / 0 | e#-gun 22.6 |
| 24 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0.082 / 0.2 | 3 | 28 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0.08 / 0 |  |
| 24 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0.302 / 0.6 | 18.319 | 380 | 32 | 16 | 0 | 0 | 0 | 0 | 0 | 16 | 1.33 / 0 | e#-gun 15.8 |

(render.figure: GuardBody.frame + GuardFigure.posePending per frame; render.s1: SmoothBody.frame + SmoothBody.pose; both wrapped only in the 2 s counted sample. Active meshes: the camera pass, guard-owned = under a guard rig root; gun parts = `wpn-*` instances.)

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 114, gBuffer 112, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, RenderTargetWrapper 1.5, charshadow-#_shadowMap 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 12 alert/facing: PostProcessRTT-TAA 121.6, gBuffer 119.6, sun_CSMShadowMap 39.9, torchshadow-#_shadowMap 29.9, charshadow-#_shadowMap 5.5, RenderTargetWrapper 4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 134.2, gBuffer 132.2, sun_CSMShadowMap 86.2, torchshadow-#_shadowMap 43.5, charshadow-#_shadowMap 8.7, RenderTargetWrapper 4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.

## Flags (data-quality notes: read the flagged numbers with care)

- sectorops x 0 patrol/facing: render: sim clock moved 8.983 s in 10.03 real s (the loop fell behind or paused; MAX_STEPS drops)
