# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:43:02.655Z (version 4.93.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ctcourse | 0 | patrol/facing | 1.7 / 2.4 | 0.015 | 0 | 100.813 | 0 | 0.104 | 6 / 9.8 | 166.7 | 5.7 / 9.5 | 6.6 / 10.4 | 15.908 | 5.858 / 9.505 | 287 | 4 | 246 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 4.2 / 6.8 | 238.1 | 3.9 / 6.5 | 5.1 / 7.3 | 16.131 | 4.74 / 5.673 | 138 | 4 | 41 |  |
| ctcourse | 0 | alert/facing | 0.6 / 1.1 | 0.004 | 0 | 100.822 | 0 | 0.018 | 4.5 / 7.7 | 222.2 | 4.3 / 7.3 | 5.3 / 7.6 | 15.896 | 4.863 / 7.131 | 287 | 4 | 246 |  |
| ctcourse | 12 | patrol/facing | 2.6 / 4.2 | 0.129 | 0.017 | 103.717 | 0.018 | 0.088 | 8.8 / 12.1 | 113.6 | 8.5 / 11.7 | 9.5 / 12.4 | 16.116 | 7.844 / 9.7 | 352 | 4 | 268 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 5.1 / 8.3 | 196.1 | 4.8 / 8 | 5.9 / 8.6 | 15.985 | 5.643 / 6.391 | 178 | 4 | 41 |  |
| ctcourse | 12 | alert/facing | 1.5 / 3.1 | 0.214 | 0.015 | 108.656 | 0.048 | 0.085 | 10.2 / 14.1 | 98 | 9.6 / 13.2 | 10.7 / 13.5 | 15.666 | 8.364 / 10.25 | 384 | 7 | 311 |  |
| ctcourse | 24 | patrol/facing | 7.4 / 13 | 0.422 | 0.058 | 105.478 | 0.02 | 0.27 | 13.7 / 21.9 | 73 | 13.3 / 21.3 | 14.5 / 21.9 | 16.246 | 9.68 / 15.046 | 384 | 4 | 291 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 5.4 / 7.3 | 185.2 | 5.1 / 7.1 | 5.7 / 7.4 | 15.966 | 5.233 / 6.393 | 186 | 4 | 42 |  |
| ctcourse | 24 | alert/facing | 2.3 / 4.6 | 0.265 | 0.022 | 110.649 | 0.083 | 0.117 | 8.4 / 11.5 | 119 | 7.9 / 10.9 | 8.3 / 11.3 | 15.727 | 7.495 / 9.435 | 438 | 7 | 401 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.238 ms, of it AI 0.017 (perceive 0.002), frame CPU (sim frames) 0.329, CPU per 1/60 s sim 0.014, GPU 0.159, draws 4.042.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.071 ms, of it AI 0.011 (perceive 0.001), frame CPU (sim frames) 0.125, CPU per 1/60 s sim -0.007, GPU 0.110, draws 6.292.

<!-- guard-cap:results:end -->
