# Guard cap: results

Run 2026-10-24T17:43:42.077Z - 2026-10-24T17:44:17.110Z (0.6 min), version 4.99.1, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 2.7 / 6 | 0.475 | 0.102 | 1.132 | 0.1 / 0.2 | 0.1 | 0.018 | 0.014 | 0.043 | 0.03 | 0.767 | 0.001 (0.018) | 0 | 0.011 (3.675) | 0 (0) | 0 (0) | 0.215 (101.813) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 7.2 / 8.8 | 138.9 | 7 / 8.6 | 606 / 770 | 6.9 / 8.7 | 7.4 / 9.1 | 6.6 / 8 | 16.116 | 0.6 | 5.1 / 6.3 | 6.739 / 7.548 | 384 | 2.769 | 4 | 8 | 291 | 1.9 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |


Draws per pass (last cell of each count):

- N 24 patrol/facing: PostProcessRTT-TAA 144.6, gBuffer 134.6, charshadow-#_shadowMap 74.4, RenderTargetWrapper 5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
