# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:57:48.409Z (version 4.93.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ctcourse | 0 | patrol/facing | 1.4 / 2 | 0.006 | 0 | 100.813 | 0 | 0.035 | 3.9 / 7.9 | 256.4 | 3.7 / 7.6 | 4.3 / 8.2 | 15.853 | 4.44 / 6.395 | 287 | 4 | 246 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 2.7 / 17.4 | 370.4 | 2.5 / 17.1 | 3.5 / 10.1 | 15.887 | 4.442 / 4.85 | 138 | 4 | 41 |  |
| ctcourse | 0 | alert/facing | 0.5 / 0.8 | 0.003 | 0 | 100.808 | 0 | 0.018 | 3.7 / 8.4 | 270.3 | 3.5 / 8 | 4 / 8.5 | 15.811 | 4.564 / 5.278 | 287 | 4 | 246 |  |
| ctcourse | 12 | patrol/facing | 3.5 / 5.1 | 0.108 | 0.011 | 103.718 | 0.018 | 0.079 | 5.7 / 9.4 | 175.4 | 5.5 / 9.2 | 6 / 10.1 | 15.981 | 5.762 / 8.346 | 352 | 4 | 268 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 4.5 / 8.3 | 222.2 | 4.3 / 8 | 4.7 / 8.7 | 15.977 | 4.918 / 5.074 | 179 | 4 | 41 |  |
| ctcourse | 12 | alert/facing | 1.3 / 2.1 | 0.138 | 0.011 | 108.482 | 0.043 | 0.061 | 6.2 / 9.1 | 161.3 | 5.7 / 8.4 | 6.2 / 9.8 | 15.579 | 6.157 / 7.913 | 385 | 7 | 311 |  |
| ctcourse | 24 | patrol/facing | 3.6 / 6.7 | 0.147 | 0.023 | 105.492 | 0.018 | 0.091 | 7 / 9.8 | 142.9 | 6.7 / 9.6 | 7.2 / 10.5 | 16.097 | 6.617 / 7.816 | 384 | 4 | 291 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 5.2 / 8.4 | 192.3 | 5 / 8.1 | 5.6 / 9.5 | 15.953 | 5.166 / 7.291 | 186 | 4 | 41 |  |
| ctcourse | 24 | alert/facing | 2 / 3.6 | 0.272 | 0.021 | 110.727 | 0.085 | 0.116 | 8.4 / 11.8 | 119 | 7.9 / 11.1 | 8.4 / 11.6 | 15.672 | 7.71 / 9.381 | 440 | 8 | 389 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.092 ms, of it AI 0.006 (perceive 0.001), frame CPU (sim frames) 0.121, CPU per 1/60 s sim 0.010, GPU 0.091, draws 4.042.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.063 ms, of it AI 0.011 (perceive 0.001), frame CPU (sim frames) 0.183, CPU per 1/60 s sim -0.006, GPU 0.131, draws 6.375.

<!-- guard-cap:results:end -->
