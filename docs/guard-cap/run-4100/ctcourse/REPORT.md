# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T20:14:38.254Z (version 4.100.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ctcourse | 0 | patrol/facing | 0.6 / 0.8 | 0.005 | 0 | 100.822 | 0 | 0.026 | 3.8 / 8.1 | 263.2 | 3.6 / 7.9 | 3.9 / 7.9 | 16.031 | 4.322 / 4.867 | 287 | 4 | 246 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 2.2 / 12.7 | 454.5 | 2.1 / 12.4 | 3 / 12.4 | 16.35 | 4.608 / 4.671 | 138 | 4 | 41 |  |
| ctcourse | 0 | alert/facing | 0.4 / 0.6 | 0.005 | 0 | 100.822 | 0 | 0.017 | 3.9 / 8.2 | 256.4 | 3.7 / 8 | 4 / 7.9 | 16.012 | 4.374 / 4.966 | 287 | 4 | 246 |  |
| ctcourse | 12 | patrol/facing | 3.3 / 5.3 | 0.099 | 0.01 | 103.708 | 0.02 | 0.076 | 4.9 / 6.4 | 204.1 | 4.7 / 6.1 | 5.3 / 6.5 | 16.01 | 4.771 / 5.996 | 353 | 4 | 268 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 4.5 / 7.9 | 222.2 | 4.3 / 7.7 | 4.5 / 7.1 | 16.005 | 4.825 / 4.965 | 179 | 4 | 42 |  |
| ctcourse | 12 | alert/facing | 1.3 / 2 | 0.144 | 0.008 | 108.997 | 0.072 | 0.063 | 5.8 / 7.4 | 172.4 | 5.5 / 6.9 | 6 / 7.5 | 15.646 | 5.938 / 7.154 | 384 | 8 | 292 |  |
| ctcourse | 24 | patrol/facing | 3.8 / 7.3 | 0.119 | 0.017 | 105.497 | 0.022 | 0.082 | 6.2 / 7.6 | 161.3 | 5.9 / 7.3 | 6.5 / 7.7 | 16.09 | 5.992 / 6.767 | 385 | 4 | 291 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 4.4 / 6 | 227.3 | 4.2 / 5.7 | 4.8 / 6 | 15.986 | 4.538 / 5.235 | 188 | 4 | 42 |  |
| ctcourse | 24 | alert/facing | 2 / 3.1 | 0.244 | 0.016 | 110.559 | 0.183 | 0.081 | 7.3 / 8.9 | 137 | 6.8 / 8.2 | 7.4 / 8.6 | 15.677 | 6.851 / 7.946 | 433 | 6 | 385 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.133 ms, of it AI 0.005 (perceive 0.001), frame CPU (sim frames) 0.108, CPU per 1/60 s sim 0.002, GPU 0.070, draws 4.083.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.067 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim -0.014, GPU 0.103, draws 6.083.

<!-- guard-cap:results:end -->
