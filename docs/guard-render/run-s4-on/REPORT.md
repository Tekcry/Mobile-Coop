# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-23T03:07:07.960Z (version 4.73.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.9 / 1.6 | 0.005 | 0 | 103.813 | 0 | 0.045 | 3.4 / 5.6 | 294.1 | 3.2 / 5.3 | 4.2 / 5.9 | 15.567 | 3.5 / 4.566 | 104 | 1 | 115 |  |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 2.1 / 4.6 | 476.2 | 1.9 / 4.2 | 2.9 / 4.8 | 15.655 | 2.782 / 3.168 | 75 | 1 | 20 |  |
| sectorops | 0 | alert/facing | 0.5 / 1.3 | 0.004 | 0 | 103.813 | 0 | 0.04 | 2.1 / 6.4 | 476.2 | 1.9 / 5.9 | 3 / 6 | 15.791 | 3.346 / 4.243 | 104 | 1 | 116 |  |
| sectorops | 12 | patrol/facing | 1.7 / 3.8 | 0.073 | 0.01 | 109.058 | 0 | 0.081 | 6.2 / 9.6 | 161.3 | 5.9 / 9.3 | 7 / 9.9 | 16.014 | 4.849 / 6.474 | 179 | 1 | 288 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 5 / 8.3 | 200 | 4.8 / 7.9 | 5.8 / 8.6 | 15.856 | 3.664 / 5.018 | 131 | 1 | 24 |  |
| sectorops | 12 | alert/facing | 1.4 / 3.7 | 0.284 | 0.015 | 111.371 | 0.018 | 0.099 | 8.6 / 12.6 | 116.3 | 7.8 / 11.6 | 8.7 / 12.4 | 15.138 | 6.346 / 8.347 | 196 | 3 | 387 |  |
| sectorops | 24 | patrol/facing | 2 / 3.8 | 0.104 | 0.023 | 111.293 | 0 | 0.098 | 9.4 / 14.3 | 106.4 | 9.1 / 14 | 10.3 / 14.8 | 16.188 | 6.608 / 8.525 | 239 | 1 | 485 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 7.7 / 12 | 129.9 | 7.4 / 11.7 | 8.7 / 12.2 | 16.089 | 4.834 / 6.88 | 167 | 1 | 24 |  |
| sectorops | 24 | alert/facing | 2.3 / 5.3 | 0.374 | 0.028 | 113.108 | 0.028 | 0.157 | 13 / 17.8 | 76.9 | 12.2 / 17 | 12.9 / 17.1 | 15.618 | 8.354 / 10.539 | 292 | 3 | 558 |  |
| ctcourse | 0 | patrol/facing | 0.8 / 1.6 | 0.005 | 0 | 100.813 | 0 | 0.045 | 2.8 / 5.2 | 357.1 | 2.6 / 4.8 | 3.6 / 5.8 | 15.619 | 3.178 / 4.489 | 115 | 0 | 92 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 2.4 / 4.1 | 416.7 | 2.2 / 3.7 | 3.2 / 4.4 | 15.926 | 3.031 / 3.639 | 52 | 0 | 14 |  |
| ctcourse | 0 | alert/facing | 0.7 / 1.5 | 0.004 | 0 | 100.817 | 0 | 0.043 | 3.4 / 5.4 | 294.1 | 3.1 / 5.1 | 4.2 / 5.8 | 15.471 | 3.284 / 4.515 | 115 | 0 | 92 |  |
| ctcourse | 12 | patrol/facing | 1.6 / 2.7 | 0.095 | 0.011 | 104.887 | 0 | 0.092 | 7.2 / 10.9 | 138.9 | 6.9 / 10.5 | 7.8 / 11.4 | 16.01 | 4.902 / 7.055 | 143 | 0 | 284 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 6.2 / 8.2 | 161.3 | 5.8 / 7.8 | 6.6 / 8.2 | 15.756 | 3.478 / 4.569 | 56 | 0 | 16 |  |
| ctcourse | 12 | alert/facing | 1.9 / 4.2 | 0.217 | 0.012 | 103.002 | 0.01 | 0.113 | 7.6 / 10.9 | 131.6 | 7.2 / 10.3 | 8.1 / 11.1 | 15.672 | 5 / 6.781 | 155 | 1 | 312 |  |
| ctcourse | 24 | patrol/facing | 2.9 / 4.4 | 0.145 | 0.02 | 107.12 | 0 | 0.126 | 9.5 / 13.5 | 105.3 | 9.2 / 13.2 | 9.8 / 13.5 | 16.18 | 5.738 / 7.59 | 167 | 0 | 512 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 5.2 / 7.9 | 192.3 | 4.9 / 7.6 | 5.9 / 8.5 | 15.848 | 3.127 / 3.827 | 56 | 0 | 16 |  |
| ctcourse | 24 | alert/facing | 2.3 / 4.9 | 0.247 | 0.014 | 104.995 | 0.013 | 0.12 | 9.6 / 13.9 | 104.2 | 9.1 / 13.4 | 9.9 / 13.7 | 16.021 | 5.755 / 7.481 | 178 | 1 | 551 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.046 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.254, CPU per 1/60 s sim 0.026, GPU 0.129, draws 5.625.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.075 ms, of it AI 0.015 (perceive 0.001), frame CPU (sim frames) 0.413, CPU per 1/60 s sim -0.007, GPU 0.209, draws 7.833.

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.087 ms, of it AI 0.006 (perceive 0.001), frame CPU (sim frames) 0.258, CPU per 1/60 s sim 0.023, GPU 0.107, draws 2.167.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.067 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.238, CPU per 1/60 s sim 0.023, GPU 0.103, draws 2.625.

<!-- guard-cap:results:end -->
