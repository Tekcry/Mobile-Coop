# Guard cap: results

Run 2026-10-24T20:18:02.650Z - 2026-10-24T20:18:41.358Z (0.6 min), version 4.100.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | alert/facing | 2.7 / 3.8 | 0.654 | 0.131 | 1.36 | 0.3 / 0.5 | 0.229 | 0.025 | 0.073 | 0.092 | 0.036 | 0.924 | 0.001 (0.025) | 0 | 0.015 (3.98) | 0.023 (5) | 0.012 (2.343) | 0.242 (104.865) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | alert/facing | 8.5 / 10.3 | 117.6 | 8 / 9.7 | 607 / 573 | 8 / 10 | 8.5 / 10.2 | 7.3 / 8.7 | 15.645 | 0.8 | 5.8 / 7 | 6.078 / 6.942 | 454 | 3.322 | 4 | 7 | 399 | 2.4 | 0 / 0 | 4 of 4 | alert 32 -> alert 32 |


Draws per pass (last cell of each count):

- N 32 alert/facing: PostProcessRTT-TAA 143.5, gBuffer 141.5, sun_CSMShadowMap 71.8, torchshadow-#_shadowMap 55.8, charshadow-#_shadowMap 12.7, RenderTargetWrapper 4, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
