# Guard cap: results

Run 2026-10-24T06:18:03.145Z - 2026-10-24T06:25:32.109Z (7.5 min), version 4.90.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.358 | 0.033 | 0.256 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.275 (103.813) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.7 | 0.331 | 0.025 | 0.217 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.259 (103.813) | 0 (0) |
| 12 | patrol/facing | 1 / 1.5 | 0.375 | 0.055 | 0.563 | 0.1 / 0.1 | 0.049 | 0.007 | 0.006 | 0.023 | 0.006 | 0.313 | 0 (0) | 0 | 0.004 (1.845) | 0 (0) | 0 (0) | 0.234 (106.813) | 0 (0) |
| 12 | alert/facing | 1.1 / 1.5 | 0.419 | 0.066 | 0.658 | 0.1 / 0.2 | 0.078 | 0.007 | 0.026 | 0.03 | 0.028 | 0.361 | 0.001 (0.012) | 0 | 0.004 (1.487) | 0.016 (5) | 0.003 (0.523) | 0.224 (105.152) | 0 (0) |
| 24 | patrol/facing | 1.3 / 1.6 | 0.419 | 0.069 | 0.725 | 0.1 / 0.2 | 0.075 | 0.014 | 0.01 | 0.032 | 0.018 | 0.472 | 0 (0) | 0 | 0.008 (3.94) | 0 (0) | 0 (0) | 0.243 (106.813) | 0 (0) |
| 24 | alert/facing | 1.6 / 2.3 | 0.541 | 0.096 | 1.018 | 0.2 / 0.5 | 0.174 | 0.018 | 0.055 | 0.066 | 0.03 | 0.674 | 0.002 (0.03) | 0 | 0.009 (2.98) | 0.014 (5) | 0.004 (0.962) | 0.231 (104.625) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 1.9 / 3.6 | 526.3 | 1.8 / 3.3 | 380 / 2473 | 2 / 75.6 | 2.5 / 4.4 | 1.7 / 2.6 | 17.242 | 0.4 | 1.4 / 2.2 | 3.56 / 3.823 | 108 | 0.508 | 1 | 4 | 124 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 1.5 / 2.7 | 666.7 | 1.4 / 2.5 | 422 / 3320 | 1.6 / 59.5 | 2 / 3.8 | 1.3 / 2 | 16.153 | 0.4 | 1.1 / 1.8 | 2.664 / 2.749 | 85 | 0.494 | 1 | 4 | 27 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.8 / 15.6 | 555.6 | 1.6 / 15.4 | 457 / 2307 | 2.4 / 45.2 | 2.5 / 5.4 | 1.5 / 17.4 | 16.126 | 0.4 | 1.3 / 15.1 | 3.667 / 3.879 | 108 | 0.508 | 1 | 4 | 123 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 4.2 / 5.3 | 238.1 | 4 / 5 | 604 / 1778 | 4.1 / 5 | 4.6 / 5.4 | 3.8 / 4.6 | 15.931 | 0.5 | 3 / 3.6 | 4.102 / 4.96 | 185 | 1.021 | 3 | 6 | 140 | 1.2 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3 / 3.9 | 333.3 | 2.8 / 3.7 | 603 / 2693 | 3 / 3.6 | 3.5 / 4 | 2.8 / 3.3 | 15.793 | 0.5 | 2.2 / 2.7 | 2.91 / 3.643 | 135 | 0.991 | 5 | 8 | 31 | 1.1 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 4.9 / 6.3 | 204.1 | 4.4 / 5.6 | 605 / 1402 | 4.8 / 5.6 | 5.1 / 5.9 | 4.2 / 4.9 | 14.937 | 0.6 | 3.3 / 3.8 | 4.755 / 6.061 | 213 | 1.158 | 6 | 9 | 183 | 1.3 | 0 / 0 | 4 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 5.3 / 6.5 | 188.7 | 5.1 / 6.3 | 605 / 1279 | 5.1 / 6.1 | 5.6 / 6.6 | 4.9 / 5.8 | 16.025 | 0.6 | 3.7 / 4.5 | 4.949 / 5.932 | 218 | 1.316 | 1 | 4 | 157 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3.6 / 4.6 | 277.8 | 3.4 / 4.4 | 603 / 2154 | 3.5 / 4.2 | 4.1 / 4.7 | 3.3 / 3.9 | 15.819 | 0.6 | 2.7 / 3.2 | 3.298 / 3.942 | 135 | 0.986 | 5 | 8 | 30 | 1.2 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6 / 7.2 | 166.7 | 5.5 / 6.6 | 605 / 1051 | 5.7 / 6.7 | 6.1 / 7 | 5.2 / 6 | 15.242 | 0.7 | 4 / 4.7 | 5.746 / 6.429 | 262 | 1.504 | 6 | 9 | 232 | 1.7 | 0 / 0 | 4 of 4 | alert 24 -> searching 2, alert 22 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.033 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.142 ms, frame CPU 0.137 ms, frame CPU (sim frames) 0.129 ms, CPU per 1/60 s sim -0.051 ms, GPU 0.058 ms, draws 4.583.
Per added guard, alert/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.175 ms, frame CPU 0.163 ms, frame CPU (sim frames) 0.150 ms, CPU per 1/60 s sim -0.037 ms, GPU 0.087 ms, draws 6.417.

### Guard render CPU and active meshes (counted sample)

| N | cell | render.figure ms mean / p95 | of it frame / pose | poses / frame | render.s1 ms mean / p95 | S1 poses / frame | active total | guard-owned | body | lod | gear | gun parts | helmet | shield | other | per guard: owned / gun | other top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 124 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 27 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 123 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 12 | patrol/facing | 0.082 / 0.2 | 0.014 / 0.068 | 9.328 | 0.013 / 0.1 | 0 | 140 | 17 | 0 | 9 | 0 | 0 | 0 | 0 | 8 | 1.42 / 0 | e#-gun 7.8 |
| 12 | patrol/away | 0.045 / 0.2 | 0.004 / 0.041 | 3.882 | 0.012 / 0.1 | 0 | 31 | 4 | 0 | 4 | 0 | 0 | 0 | 0 | 0 | 0.33 / 0 |  |
| 12 | alert/facing | 0.061 / 0.2 | 0.008 / 0.053 | 8 | 0.012 / 0.1 | 0 | 183 | 15 | 0 | 8 | 0 | 0 | 0 | 0 | 7 | 1.25 / 0 | e#-gun 7 |
| 24 | patrol/facing | 0.16 / 0.3 | 0.026 / 0.135 | 18.379 | 0.027 / 0.1 | 0 | 157 | 34 | 0 | 18 | 0 | 0 | 0 | 0 | 16 | 1.42 / 0 | e#-gun 16.1 |
| 24 | patrol/away | 0.04 / 0.1 | 0.005 / 0.034 | 3.745 | 0.021 / 0.1 | 0 | 30 | 3 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0.13 / 0 |  |
| 24 | alert/facing | 0.122 / 0.3 | 0.016 / 0.106 | 14.645 | 0.023 / 0.1 | 0 | 233 | 29 | 0 | 15 | 0 | 0 | 0 | 0 | 14 | 1.21 / 0 | e#-gun 14.1 |

(render.figure: GuardBody.frame + GuardFigure.posePending per frame; render.s1: SmoothBody.frame + SmoothBody.pose; both wrapped only in the 2 s counted sample. Active meshes: the camera pass, guard-owned = under a guard rig root; gun parts = `wpn-*` instances.)

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 37, gBuffer 34, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 12 alert/facing: PostProcessRTT-TAA 48.5, sun_CSMShadowMap 48, gBuffer 45.5, torchshadow-#_shadowMap 34.1, charshadow-#_shadowMap 6, RenderTargetWrapper 5.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: sun_CSMShadowMap 64.3, PostProcessRTT-TAA 55.3, gBuffer 52.3, torchshadow-#_shadowMap 43.3, charshadow-#_shadowMap 16.7, RenderTargetWrapper 5.7, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

## campusops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.267 | 0.033 | 0.209 | 0 / 0.1 | 0 | 0 | 0 | 0 | 0.001 | 0.001 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.197 (103.808) | 0 (0) |
| 0 | alert/facing | 0.4 / 0.7 | 0.267 | 0.023 | 0.185 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.204 (103.822) | 0 (0) |
| 12 | patrol/facing | 1.6 / 2.6 | 0.416 | 0.065 | 0.675 | 0.1 / 0.2 | 0.067 | 0.006 | 0.01 | 0.031 | 0.01 | 0.392 | 0 (0) | 0 | 0.002 (1.27) | 0 (0) | 0 (0) | 0.229 (104.237) | 0 (0) |
| 12 | alert/facing | 1.3 / 1.7 | 0.452 | 0.063 | 0.665 | 0.1 / 0.3 | 0.111 | 0.014 | 0.038 | 0.038 | 0.02 | 0.323 | 0 (0.013) | 0 | 0.006 (1.48) | 0.014 (4.508) | 0.004 (0.808) | 0.223 (104.862) | 0 (0) |
| 24 | patrol/facing | 1.9 / 3.4 | 0.442 | 0.095 | 0.895 | 0.1 / 0.2 | 0.102 | 0.01 | 0.016 | 0.053 | 0.012 | 0.616 | 0 (0) | 0 | 0.003 (1.48) | 0 (0) | 0 (0) | 0.222 (104.213) | 0 (0) |
| 24 | alert/facing | 1.4 / 2.2 | 0.542 | 0.093 | 1.072 | 0.2 / 0.4 | 0.182 | 0.018 | 0.064 | 0.062 | 0.03 | 0.689 | 0.001 (0.015) | 0 | 0.008 (2.963) | 0.015 (4.933) | 0.009 (1.92) | 0.218 (104.983) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 3.6 / 4.5 | 277.8 | 3.4 / 4.3 | 603 / 2149 | 3.5 / 4.3 | 3.9 / 4.6 | 3.3 / 4 | 15.771 | 0.4 | 2.9 / 3.5 | 3.381 / 4.071 | 263 | 0.827 | 1 | 4 | 300 | 0.8 | 0 / 0 | 0 of 4 |  ->  |
| 0 | patrol/away | 2.2 / 3.6 | 454.5 | 2 / 3.4 | 543 / 2961 | 2.3 / 34.7 | 2.7 / 4 | 2 / 2.9 | 15.697 | 0.4 | 1.6 / 2.5 | 2.849 / 3.191 | 88 | 0.537 | 2 | 5 | 26 | 0.7 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 3.6 / 4.6 | 277.8 | 3.4 / 4.4 | 603 / 2171 | 3.5 / 4.5 | 3.8 / 4.9 | 3.2 / 4.1 | 15.714 | 0.4 | 2.8 / 3.6 | 3.418 / 4.213 | 267 | 0.88 | 2 | 5 | 300 | 0.8 | 0 / 0 | 0 of 4 |  ->  |
| 12 | patrol/facing | 6 / 7.2 | 166.7 | 5.8 / 7 | 605 / 1066 | 5.8 / 6.8 | 6.2 / 7.3 | 5.5 / 6.4 | 16.039 | 0.6 | 4.5 / 5.3 | 5.361 / 6.084 | 349 | 1.452 | 2 | 5 | 324 | 1.6 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | patrol/away | 3.7 / 4.8 | 270.3 | 3.5 / 4.5 | 605 / 2085 | 3.6 / 4.4 | 4.1 / 4.9 | 3.3 / 4.1 | 15.746 | 0.6 | 2.8 / 3.4 | 3.361 / 4.253 | 112 | 0.771 | 2 | 5 | 28 | 1.3 | 0 / 0 | 0 of 4 | unaware 12 -> unaware 12 |
| 12 | alert/facing | 6.9 / 8.1 | 144.9 | 6.3 / 7.5 | 607 / 863 | 6.6 / 7.6 | 6.8 / 7.8 | 6 / 7 | 15.422 | 0.6 | 4.9 / 5.7 | 5.738 / 6.514 | 355 | 1.387 | 3 | 6 | 376 | 1.7 | 0 / 0 | 2 of 4 | alert 12 -> alert 12 |
| 24 | patrol/facing | 7.4 / 9 | 135.1 | 7.2 / 8.8 | 605 / 736 | 7.1 / 8.9 | 7.7 / 9.2 | 6.7 / 8.3 | 16.138 | 0.6 | 5.4 / 6.6 | 5.322 / 6.212 | 407 | 1.89 | 2 | 5 | 347 | 2 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | patrol/away | 3.4 / 4.5 | 294.1 | 3.2 / 4.3 | 605 / 2263 | 3.3 / 4 | 4 / 4.7 | 3.1 / 3.8 | 15.821 | 0.6 | 2.7 / 3.2 | 3.177 / 3.943 | 112 | 0.771 | 2 | 5 | 28 | 1.4 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 7.7 / 9.2 | 129.9 | 7.2 / 8.6 | 605 / 695 | 7.3 / 8.9 | 7.7 / 9 | 6.7 / 7.9 | 15.573 | 0.7 | 5.4 / 6.3 | 6.168 / 7.006 | 423 | 1.879 | 4 | 7 | 418 | 1.9 | 0 / 0 | 4 of 4 | alert 24 -> alert 24 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.058 ms, AI manager 0.005 ms, perceive 0.000 ms, frame 0.158 ms, frame CPU 0.158 ms, frame CPU (sim frames) 0.158 ms, CPU per 1/60 s sim 0.015 ms, GPU 0.081 ms, draws 6.000.
Per added guard, alert/facing, N 0 -> 24: sim step 0.042 ms, AI manager 0.010 ms, perceive 0.001 ms, frame 0.171 ms, frame CPU 0.158 ms, frame CPU (sim frames) 0.163 ms, CPU per 1/60 s sim -0.006 ms, GPU 0.115 ms, draws 6.500.

### Guard render CPU and active meshes (counted sample)

| N | cell | render.figure ms mean / p95 | of it frame / pose | poses / frame | render.s1 ms mean / p95 | S1 poses / frame | active total | guard-owned | body | lod | gear | gun parts | helmet | shield | other | per guard: owned / gun | other top |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 301 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | patrol/away | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 0 | alert/facing | 0 / 0 | 0 / 0 | 0 | 0 / 0 | 0 | 301 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 / 0 |  |
| 12 | patrol/facing | 0.096 / 0.3 | 0.02 / 0.077 | 11.669 | 0.023 / 0.1 | 0 | 324 | 24 | 0 | 12 | 0 | 0 | 0 | 0 | 12 | 2 / 0 | e#-gun 11.7 |
| 12 | patrol/away | 0.041 / 0.1 | 0.007 / 0.034 | 2.201 | 0.017 / 0.1 | 0 | 28 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0.17 / 0 |  |
| 12 | alert/facing | 0.078 / 0.2 | 0.01 / 0.068 | 7.753 | 0.018 / 0.1 | 0 | 376 | 15 | 0 | 8 | 0 | 0 | 0 | 0 | 7 | 1.25 / 0 | e#-gun 6.7 |
| 24 | patrol/facing | 0.173 / 0.4 | 0.024 / 0.149 | 21.721 | 0.034 / 0.1 | 0 | 347 | 46 | 0 | 23 | 0 | 0 | 0 | 0 | 23 | 1.92 / 0 | e#-gun 23.2 |
| 24 | patrol/away | 0.028 / 0.1 | 0.009 / 0.02 | 2.237 | 0.03 / 0.1 | 0 | 28 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0.08 / 0 |  |
| 24 | alert/facing | 0.113 / 0.3 | 0.01 / 0.103 | 14.305 | 0.033 / 0.1 | 0 | 417 | 28 | 0 | 14 | 0 | 0 | 0 | 0 | 14 | 1.17 / 0 | e#-gun 14.3 |

(render.figure: GuardBody.frame + GuardFigure.posePending per frame; render.s1: SmoothBody.frame + SmoothBody.pose; both wrapped only in the 2 s counted sample. Active meshes: the camera pass, guard-owned = under a guard rig root; gun parts = `wpn-*` instances.)

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 114, gBuffer 112, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, charshadow-#_shadowMap 1.5, RenderTargetWrapper 1.5, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1
- N 12 alert/facing: PostProcessRTT-TAA 124.7, gBuffer 122.7, sun_CSMShadowMap 52.8, torchshadow-#_shadowMap 20, charshadow-#_shadowMap 6.6, RenderTargetWrapper 3.2, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1
- N 24 alert/facing: PostProcessRTT-TAA 132.2, gBuffer 130.2, sun_CSMShadowMap 77.4, torchshadow-#_shadowMap 47, charshadow-#_shadowMap 9.6, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
