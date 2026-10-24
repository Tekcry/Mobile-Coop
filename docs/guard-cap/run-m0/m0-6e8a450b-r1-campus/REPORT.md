# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:39:14.503Z (version 4.93.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 0 | patrol/facing | 0.5 / 0.8 | 0.005 | 0 | 103.813 | 0 | 0.022 | 3.2 / 4.5 | 312.5 | 3 / 4.3 | 3.6 / 4.6 | 15.82 | 3.367 / 3.796 | 267 | 2 | 300 |  |
| campus | 0 | patrol/away | - | - | - | - | - | - | 1.7 / 3.5 | 588.2 | 1.6 / 3.3 | 2.3 / 4 | 16.014 | 2.98 / 3.079 | 88 | 2 | 26 |  |
| campus | 0 | alert/facing | 0.5 / 0.7 | 0.004 | 0 | 103.813 | 0 | 0.022 | 3 / 4.9 | 333.3 | 2.9 / 4.7 | 3.6 / 5 | 15.829 | 3.6 / 3.714 | 267 | 2 | 300 |  |
| campus | 12 | patrol/facing | 1.3 / 1.9 | 0.08 | 0.007 | 105.537 | 0 | 0.052 | 5 / 6.1 | 200 | 4.8 / 5.9 | 5.3 / 6.3 | 16.022 | 4.825 / 5.433 | 341 | 2 | 323 |  |
| campus | 12 | patrol/away | - | - | - | - | - | - | 2.9 / 4.2 | 344.8 | 2.7 / 4 | 3.5 / 4.4 | 15.741 | 3.117 / 3.187 | 112 | 2 | 28 |  |
| campus | 12 | alert/facing | 1.1 / 1.5 | 0.134 | 0.012 | 112.113 | 0.017 | 0.06 | 5.6 / 6.9 | 178.6 | 5.2 / 6.3 | 5.8 / 6.7 | 15.255 | 5.319 / 6.201 | 347 | 4 | 366 |  |
| campus | 16 | patrol/facing | 1.5 / 2.3 | 0.091 | 0.008 | 105.553 | 0 | 0.067 | 5.7 / 6.9 | 175.4 | 5.5 / 6.7 | 6.1 / 6.9 | 16.062 | 4.912 / 5.448 | 361 | 2 | 331 |  |
| campus | 16 | patrol/away | - | - | - | - | - | - | 2.9 / 4.1 | 344.8 | 2.7 / 3.9 | 3.5 / 4.3 | 15.794 | 3.063 / 3.405 | 112 | 2 | 28 |  |
| campus | 16 | alert/facing | 1.1 / 1.6 | 0.19 | 0.017 | 113.002 | 0.013 | 0.084 | 6.5 / 7.8 | 153.8 | 6 / 7.3 | 6.6 / 7.5 | 15.437 | 5.577 / 6.316 | 376 | 3 | 398 |  |
| campus | 24 | patrol/facing | 1.9 / 2.5 | 0.118 | 0.008 | 105.758 | 0 | 0.078 | 6.7 / 7.9 | 149.3 | 6.4 / 7.7 | 6.9 / 7.9 | 16.146 | 4.628 / 5.225 | 401 | 2 | 346 |  |
| campus | 24 | patrol/away | - | - | - | - | - | - | 3.3 / 4.3 | 303 | 3.1 / 4.1 | 3.8 / 4.4 | 15.77 | 2.986 / 3.656 | 112 | 2 | 28 |  |
| campus | 24 | alert/facing | 1.6 / 2.3 | 0.226 | 0.019 | 114.666 | 0.018 | 0.099 | 7.4 / 8.7 | 135.1 | 6.9 / 8.1 | 7.4 / 8.4 | 15.45 | 5.845 / 6.505 | 426 | 4 | 399 |  |
| campus | 32 | patrol/facing | 1.5 / 2.1 | 0.177 | 0.011 | 106.197 | 0 | 0.108 | 7.4 / 8.8 | 135.1 | 7.2 / 8.6 | 7.7 / 8.8 | 16.18 | 5.354 / 6.12 | 437 | 1 | 359 |  |
| campus | 32 | patrol/away | - | - | - | - | - | - | 3.4 / 4.5 | 294.1 | 3.2 / 4.3 | 4 / 4.7 | 15.802 | 3.151 / 3.93 | 112 | 2 | 28 |  |
| campus | 32 | alert/facing | 2.4 / 4 | 0.305 | 0.026 | 116.309 | 0.013 | 0.158 | 11.3 / 18.3 | 88.5 | 10.5 / 17.5 | 12.3 / 18 | 15.763 | 7.696 / 10.787 | 482 | 4 | 412 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, campus patrol/facing (N 0 -> 32): sim 0.031 ms, of it AI 0.005 (perceive 0.000), frame CPU (sim frames) 0.128, CPU per 1/60 s sim 0.011, GPU 0.062, draws 5.313.

Per added guard, campus alert/facing (N 0 -> 32): sim 0.059 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.272, CPU per 1/60 s sim -0.002, GPU 0.128, draws 6.719.

<!-- guard-cap:results:end -->
