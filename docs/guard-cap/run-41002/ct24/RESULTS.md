# Guard cap: results

Run 2026-10-24T22:36:56.250Z - 2026-10-24T22:38:19.816Z (1.4 min), version 4.100.2, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 20 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## ctcourse

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 3.1 / 5.5 | 0.578 | 0.091 | 1.208 | 0.1 / 0.4 | 0.124 | 0.021 | 0.018 | 0.055 | 0.028 | 0.855 | 0 (0.014) | 0 | 0.014 (3.627) | 0 (0) | 0 (0) | 0.295 (101.811) | 0 (0) |
| 24 | alert/facing | 2.2 / 4.9 | 0.687 | 0.111 | 1.444 | 0.2 / 0.9 | 0.227 | 0.025 | 0.099 | 0.062 | 0.036 | 0.98 | 0.042 (0.189) | 0 | 0.014 (2.956) | 0.016 (5) | 0.006 (0.994) | 0.28 (101.929) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 24 | patrol/facing | 9.5 / 15.2 | 105.3 | 9.2 / 14.8 | 1208 / 815 | 10.2 / 16.3 | 10.1 / 15.8 | 8 / 12.4 | 16.179 | 0.8 | 6.7 / 10.8 | 7.364 / 9.921 | 382 | 2.765 | 4 | 8 | 290 | 3.1 | 0 / 0 | 0 of 4 | unaware 24 -> unaware 24 |
| 24 | alert/facing | 10.6 / 16.6 | 94.3 | 10 / 15.8 | 1201 / 590 | 11.2 / 17.3 | 10.6 / 16.4 | 8.8 / 14.2 | 15.874 | 0.8 | 7 / 11.6 | 8.607 / 12.058 | 457 | 3.775 | 7 | 11 | 363 | 3.4 | 0 / 0 | 4 of 4 | alert 24 -> alert 20, searching 4 |


Draws per pass (last cell of each count):

- N 24 alert/facing: PostProcessRTT-TAA 147.9, gBuffer 137.9, charshadow-#_shadowMap 87, torchshadow-#_shadowMap 47.4, RenderTargetWrapper 7.8, sun_CSMShadowMap 2.5, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
