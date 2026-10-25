# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T20:11:05.797Z (version 4.100.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 0 | patrol/facing | 0.5 / 0.7 | 0.003 | 0 | 103.808 | 0 | 0.018 | 3 / 4.8 | 333.3 | 2.9 / 4.4 | 3.5 / 4.9 | 15.804 | 3.371 / 3.579 | 261 | 2 | 300 |  |
| campus | 0 | patrol/away | - | - | - | - | - | - | 1.7 / 3.5 | 588.2 | 1.5 / 3.2 | 2.2 / 4 | 16.087 | 2.918 / 3.004 | 79 | 2 | 26 |  |
| campus | 0 | alert/facing | 0.5 / 0.6 | 0.004 | 0 | 103.813 | 0 | 0.02 | 2.8 / 4.7 | 357.1 | 2.7 / 4.4 | 3.4 / 4.6 | 15.845 | 3.506 / 3.63 | 261 | 2 | 300 |  |
| campus | 12 | patrol/facing | 1 / 1.5 | 0.082 | 0.006 | 105.513 | 0 | 0.052 | 5.4 / 6.6 | 185.2 | 5.2 / 6.3 | 5.7 / 6.6 | 15.979 | 5.062 / 5.695 | 327 | 2 | 324 |  |
| campus | 12 | patrol/away | - | - | - | - | - | - | 2.3 / 4 | 434.8 | 2.2 / 3.7 | 3 / 4.6 | 15.823 | 3.063 / 3.153 | 91 | 2 | 28 |  |
| campus | 12 | alert/facing | 1.3 / 1.9 | 0.161 | 0.01 | 111.806 | 0.023 | 0.06 | 6 / 7.2 | 166.7 | 5.5 / 6.7 | 6 / 7 | 15.243 | 5.419 / 6.237 | 333 | 4 | 404 |  |
| campus | 16 | patrol/facing | 1.2 / 1.5 | 0.09 | 0.009 | 105.548 | 0 | 0.063 | 5.6 / 6.8 | 178.6 | 5.4 / 6.5 | 6 / 6.9 | 16.041 | 5.057 / 5.558 | 340 | 2 | 332 |  |
| campus | 16 | patrol/away | - | - | - | - | - | - | 3.1 / 4 | 322.6 | 2.9 / 3.8 | 3.5 / 4.3 | 15.697 | 3.042 / 3.642 | 91 | 2 | 28 |  |
| campus | 16 | alert/facing | 1.5 / 2.4 | 0.168 | 0.01 | 112.63 | 0.02 | 0.076 | 6.6 / 7.9 | 151.5 | 6.1 / 7.3 | 6.7 / 7.6 | 15.425 | 5.609 / 6.356 | 366 | 4 | 388 |  |
| campus | 24 | patrol/facing | 1.5 / 1.9 | 0.123 | 0.006 | 105.768 | 0 | 0.084 | 6.3 / 7.8 | 158.7 | 6.1 / 7.5 | 6.6 / 7.8 | 16.073 | 4.891 / 5.5 | 368 | 2 | 346 |  |
| campus | 24 | patrol/away | - | - | - | - | - | - | 3 / 4.1 | 333.3 | 2.8 / 3.8 | 3.5 / 4.3 | 15.69 | 2.858 / 3.536 | 91 | 2 | 28 |  |
| campus | 24 | alert/facing | 1.7 / 2.5 | 0.213 | 0.014 | 114.31 | 0.022 | 0.1 | 7 / 8.5 | 142.9 | 6.5 / 7.9 | 7 / 8.4 | 15.483 | 5.415 / 6.203 | 378 | 3 | 397 |  |
| campus | 32 | patrol/facing | 1.6 / 2.2 | 0.171 | 0.014 | 106.173 | 0 | 0.106 | 7.4 / 8.9 | 135.1 | 7.1 / 8.6 | 7.7 / 9 | 16.169 | 4.998 / 5.604 | 391 | 2 | 359 |  |
| campus | 32 | patrol/away | - | - | - | - | - | - | 3.5 / 4.6 | 285.7 | 3.3 / 4.4 | 4.1 / 4.8 | 15.798 | 3.155 / 3.859 | 91 | 2 | 28 |  |
| campus | 32 | alert/facing | 1.9 / 2.8 | 0.267 | 0.023 | 116.586 | 0.02 | 0.105 | 8.6 / 10.2 | 116.3 | 8 / 9.7 | 8.6 / 10.2 | 15.648 | 6.05 / 6.867 | 456 | 4 | 411 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, campus patrol/facing (N 0 -> 32): sim 0.034 ms, of it AI 0.005 (perceive 0.000), frame CPU (sim frames) 0.131, CPU per 1/60 s sim 0.011, GPU 0.051, draws 4.063.

Per added guard, campus alert/facing (N 0 -> 32): sim 0.044 ms, of it AI 0.008 (perceive 0.001), frame CPU (sim frames) 0.162, CPU per 1/60 s sim -0.006, GPU 0.080, draws 6.094.

<!-- guard-cap:results:end -->
