# Guard cap: results

Run 2026-10-24T22:38:25.686Z - 2026-10-24T22:39:48.454Z (1.4 min), version 4.100.2, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 20 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | patrol/facing | 2.4 / 4.9 | 0.662 | 0.142 | 1.382 | 0.2 / 0.5 | 0.192 | 0.018 | 0.031 | 0.101 | 0.018 | 1.018 | 0 (0) | 0 | 0.008 (2.115) | 0 (0) | 0 (0) | 0.316 (104.246) | 0 (0) |
| 32 | alert/facing | 2.3 / 5.3 | 0.828 | 0.167 | 1.885 | 0.3 / 0.7 | 0.283 | 0.033 | 0.079 | 0.117 | 0.039 | 1.336 | 0.001 (0.022) | 0 | 0.017 (3.977) | 0.021 (5) | 0.015 (2.362) | 0.353 (104.848) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | patrol/facing | 11 / 17 | 90.9 | 10.7 / 16.6 | 1203 / 533 | 12.1 / 17.5 | 11.6 / 17 | 9 / 14.1 | 16.229 | 0.9 | 7.8 / 12 | 7.587 / 10.499 | 380 | 2.657 | 1 | 4 | 356 | 3.5 | 0 / 0 | 0 of 4 | unaware 32 -> unaware 32 |
| 32 | alert/facing | 13.1 / 19.9 | 76.3 | 12.4 / 19.2 | 1184 / 285 | 14.2 / 20.4 | 13.3 / 19.6 | 9.9 / 16 | 15.863 | 1 | 8.9 / 14.1 | 9.701 / 13.433 | 471 | 3.601 | 4 | 7 | 433 | 3.3 | 0 / 0 | 4 of 4 | alert 32 -> alert 32 |


Draws per pass (last cell of each count):

- N 32 alert/facing: PostProcessRTT-TAA 144.7, gBuffer 142.7, sun_CSMShadowMap 68.4, torchshadow-#_shadowMap 65.4, charshadow-#_shadowMap 15.7, RenderTargetWrapper 3.9, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
