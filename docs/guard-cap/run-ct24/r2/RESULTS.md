# Guard cap: results

Run 2026-10-24T17:42:51.264Z - 2026-10-24T17:43:41.148Z (0.8 min), version 4.99.1, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 3.8 / 6.4 | 0.924 | 0.193 | 2.437 | 0.3 / 0.4 | 0.189 | 0.032 | 0.027 | 0.082 | 0.057 | 1.733 | 0.001 (0.02) | 0 | 0.02 (3.59) | 0 (0) | 0 (0) | 0.418 (101.813) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 8.1 / 19.2 | 123.5 | 7.9 / 18.7 | 588 / 404 | 9.4 / 20.6 | 9.3 / 19.8 | 7 / 11.8 | 16.099 | 0.8 | 5.7 / 13.5 | 6.817 / 11.775 | 386 | 2.792 | 4 | 8 | 290 | 2 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |


Draws per pass (last cell of each count):

- N 24 patrol/facing: PostProcessRTT-TAA 145, gBuffer 135, charshadow-#_shadowMap 77.2, RenderTargetWrapper 5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1, PostProcessRTT-ssaoCombine 1, PostProcessRTT-ssr 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
