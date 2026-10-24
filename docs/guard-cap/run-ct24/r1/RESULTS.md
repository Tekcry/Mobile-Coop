# Guard cap: results

Run 2026-10-24T17:42:09.089Z - 2026-10-24T17:42:43.683Z (0.6 min), version 4.99.1, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 3 / 5.9 | 0.442 | 0.092 | 1.029 | 0.1 / 0.2 | 0.095 | 0.017 | 0.013 | 0.039 | 0.026 | 0.702 | 0.001 (0.02) | 0 | 0.011 (3.7) | 0 (0) | 0 (0) | 0.203 (101.808) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 8.4 / 14.9 | 119 | 8.2 / 14.2 | 588 / 468 | 8.6 / 16.6 | 9 / 15.5 | 7.4 / 11 | 16.427 | 0.8 | 6 / 10.1 | 7.281 / 9.939 | 385 | 2.777 | 4 | 8 | 291 | 2.4 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |


Draws per pass (last cell of each count):

- N 24 patrol/facing: PostProcessRTT-TAA 144.9, gBuffer 134.9, charshadow-#_shadowMap 75.3, RenderTargetWrapper 5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
