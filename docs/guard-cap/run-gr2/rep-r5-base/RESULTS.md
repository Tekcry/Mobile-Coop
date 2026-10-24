# Guard cap: results

Run 2026-10-24T09:25:58.038Z - 2026-10-24T09:27:31.499Z (1.6 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 0.5 / 0.7 | 0.337 | 0.031 | 0.245 | 0 / 0 | 0 | 0 | 0 | 0 | 0.001 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.263 (103.808) | 0 (0) |
| 0 | alert/facing | 0.5 / 0.8 | 0.3 | 0.024 | 0.204 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.241 (103.813) | 0 (0) |
| 24 | patrol/facing | 1.2 / 1.6 | 0.413 | 0.07 | 0.759 | 0.1 / 0.2 | 0.078 | 0.013 | 0.01 | 0.034 | 0.016 | 0.494 | 0 (0) | 0 | 0.008 (3.92) | 0 (0) | 0 (0) | 0.235 (106.808) | 0 (0) |
| 24 | alert/facing | 1.8 / 2.6 | 0.591 | 0.112 | 1.199 | 0.2 / 0.6 | 0.197 | 0.021 | 0.07 | 0.066 | 0.03 | 0.775 | 0.003 (0.025) | 0 | 0.01 (3.037) | 0.015 (5) | 0.007 (1.22) | 0.236 (104.593) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | patrol/facing | 2 / 3.8 | 500 | 1.8 / 3.5 | 395 / 2455 | 2 / 73.2 | 2.6 / 4.4 | 1.8 / 2.8 | 17.172 | 0.4 | 1.5 / 2.3 | 3.645 / 3.791 | 104 | 0.495 | 1 | 4 | 122 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 0 | alert/facing | 1.7 / 4.1 | 588.2 | 1.6 / 3.8 | 337 / 2438 | 1.8 / 87.6 | 2.2 / 4.1 | 1.5 / 2.5 | 18.688 | 0.4 | 1.2 / 2.2 | 3.714 / 3.88 | 104 | 0.495 | 1 | 4 | 121 | 0.4 | 0 / 0 | 0 of 4 |  ->  |
| 24 | patrol/facing | 5.1 / 6.2 | 196.1 | 4.9 / 6 | 606 / 1361 | 4.9 / 6 | 5.5 / 6.3 | 4.6 / 5.6 | 16.018 | 0.6 | 3.6 / 4.3 | 4.781 / 5.74 | 214 | 2.217 | 1 | 4 | 155 | 1.7 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 6.4 / 7.8 | 156.3 | 5.9 / 7.1 | 605 / 952 | 6.1 / 7.2 | 6.5 / 7.4 | 5.5 / 6.4 | 15.242 | 0.7 | 4.2 / 4.9 | 6.026 / 6.662 | 254 | 2.489 | 4 | 7 | 211 | 1.7 | 0 / 0 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, patrol/facing, N 0 -> 24: sim step 0.029 ms, AI manager 0.004 ms, perceive 0.001 ms, frame 0.129 ms, frame CPU 0.129 ms, frame CPU (sim frames) 0.121 ms, CPU per 1/60 s sim -0.048 ms, GPU 0.047 ms, draws 4.583.
Per added guard, alert/facing, N 0 -> 24: sim step 0.054 ms, AI manager 0.011 ms, perceive 0.001 ms, frame 0.196 ms, frame CPU 0.179 ms, frame CPU (sim frames) 0.179 ms, CPU per 1/60 s sim -0.144 ms, GPU 0.096 ms, draws 6.250.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 12, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: sun_CSMShadowMap 71.4, PostProcessRTT-TAA 53.9, gBuffer 50.9, torchshadow-#_shadowMap 44.3, charshadow-#_shadowMap 7.8, RenderTargetWrapper 4.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.

## Flags (data-quality notes: read the flagged numbers with care)

- sectorops x 0 alert/facing: render: sim clock moved 8.633 s in 10.051 real s (the loop fell behind or paused; MAX_STEPS drops)
