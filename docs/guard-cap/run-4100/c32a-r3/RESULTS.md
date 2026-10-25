# Guard cap: results

Run 2026-10-24T20:18:42.529Z - 2026-10-24T20:19:19.008Z (0.6 min), version 4.100.0, hardware GPU (E2E_GPU=1), frame rate uncapped, gfx=epic, 1920x1080, guards: grunt, warm 5 s, sample 10 s.
Medians / p95 in ms unless named. Script: `scripts/guard-cap.mjs`; method and decision rule: `REPORT.md`.

## campus

### Sim per 60 Hz step (headless stepHeadless; clean = no wrappers)

| N | cell | step clean med / p95 | fixed | physics | frame | AI manager | brain | perceive | decide | move | torches | anim | findPath (calls) | flowField | rays perceive (calls) | rays torch | rays other AI | rays other | light reads (calls) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | alert/facing | 1.9 / 2.5 | 0.576 | 0.121 | 1.187 | 0.2 / 0.4 | 0.2 | 0.021 | 0.066 | 0.074 | 0.027 | 0.816 | 0 (0.023) | 0 | 0.01 (3.983) | 0.014 (5) | 0.011 (2.522) | 0.23 (105.07) | 0 (0) |

(bucket columns: mean ms per step; inclusive: brain holds perceive / decide / move, and those hold their rays and nav calls)

### Render (real frames)

| N | cell | frame ms med / p95 | fps | frame CPU | frames sim / no sim | frame ms, sim frames | frame CPU, sim frames | frame CPU, no-sim frames | CPU per 1/60 s sim | loop sim / step | render() CPU | GPU ms | draws | tris M | shadow passes (label) | shadow map renders | active meshes | eval ms | shadow pool / lit | torches on | levels start -> end |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 32 | alert/facing | 8.5 / 10.1 | 117.6 | 8 / 9.6 | 607 / 571 | 8 / 10 | 8.6 / 9.9 | 7.4 / 8.7 | 15.658 | 0.8 | 5.9 / 7 | 5.74 / 6.559 | 447 | 3.325 | 4 | 7 | 425 | 2.5 | 0 / 0 | 4 of 4 | alert 32 -> alert 32 |


Draws per pass (last cell of each count):

- N 32 alert/facing: PostProcessRTT-TAA 144.8, gBuffer 142.8, sun_CSMShadowMap 65.9, torchshadow-#_shadowMap 51.6, charshadow-#_shadowMap 11, RenderTargetWrapper 4.1, PostProcessRTT-vertical blur 2, PostProcessRTT-horizontal blur 2, PostProcessRTT-imageProcessing 2, TileMaskTexture 1, PostProcessRTT-SSAOOriginalSceneColor 1, PostProcessRTT-ssao 1, PostProcessRTT-BlurH 1, PostProcessRTT-BlurV 1

Timer resolution in the page: 0.09999990463256836 ms (cross-origin isolated: false). Wrapped: ai.brain, ai.perceive, ai.decide, ai.move, ai.manager, ai.torches, ai.anim, nav.findPath, nav.lineClear, nav.flowField, light.totalAt, step.fixed, step.frame, ray.*.
