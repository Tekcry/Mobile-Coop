# Guard cap: results

Run 2026-10-24T08:44:49.324Z - 2026-10-24T08:45:44.248Z (0.9 min), version 4.88.3, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## sectorops

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | alert/facing | 0.5 / 0.7 | 0.339 | 0.031 | 0.244 | 0 / 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) | 0 | 0 (0) | 0 (0) | 0 (0) | 0.255 (103.808) | 0 (0) |
| 24 | alert/facing | 1.6 / 2.5 | 0.549 | 0.097 | 1.015 | 0.2 / 0.5 | 0.179 | 0.02 | 0.058 | 0.065 | 0.028 | 0.645 | 0.004 (0.03) | 0 | 0.01 (2.957) | 0.014 (5) | 0.004 (1.11) | 0.236 (104.982) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | alert/facing | 2 / 16.5 | 500 | 1.9 / 16.1 | 484 / 2324 | 2.3 / 36.2 | 2.7 / 4.4 | 1.8 / 18.1 | 16.069 | 0.4 | 1.4 / 15.7 | 3.578 / 3.851 | 98 | 0.388 | 1 | 4 | 122 | 0.5 | 0 / 0 | 0 of 4 |  ->  |
| 24 | alert/facing | 6 / 7.4 | 166.7 | 5.5 / 6.8 | 604 / 1044 | 5.8 / 6.9 | 6.2 / 7.2 | 5.2 / 6.1 | 15.216 | 0.7 | 3.9 / 4.6 | 5.425 / 6.072 | 216 | 1.843 | 5 | 8 | 204 | 1.8 | 0 / 0 | 4 of 4 | alert 24 -> alert 22, searching 2 |

Per added guard, alert/facing, N 0 -> 24: sim step 0.046 ms, AI manager 0.009 ms, perceive 0.001 ms, frame 0.167 ms, frame CPU 0.150 ms, frame CPU (sim frames) 0.146 ms, CPU per 1/60 s sim -0.036 ms, GPU 0.077 ms, draws 4.917.

Draws per pass (last cell of each count):

- N 0 alert/facing: PostProcessRTT-TAA 35, gBuffer 32, sun_CSMShadowMap 6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, RenderTargetWrapper 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1
- N 24 alert/facing: PostProcessRTT-TAA 51.2, gBuffer 48.2, sun_CSMShadowMap 41.5, torchshadow-#_shadowMap 40, charshadow-#_shadowMap 8, RenderTargetWrapper 4.6, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: MISSING Enemy prototype (no guard alive), ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
