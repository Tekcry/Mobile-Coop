# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T23:08:26.128Z (version 4.100.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 0 | patrol/facing | 0.9 / 1.7 | 0.006 | 0 | 103.822 | 0 | 0.035 | 4.3 / 7.5 | 232.6 | 4.1 / 7.2 | 4.9 / 8.1 | 15.814 | 3.926 / 6.725 | 257 | 1 | 300 |  |
| campus | 0 | patrol/away | - | - | - | - | - | - | 2.2 / 4.5 | 454.5 | 2 / 4.2 | 2.9 / 5.1 | 15.747 | 3.042 / 3.224 | 79 | 2 | 26 |  |
| campus | 0 | alert/facing | 0.7 / 1.5 | 0.004 | 0 | 103.808 | 0 | 0.032 | 4 / 7.2 | 250 | 3.8 / 6.8 | 4.6 / 7.5 | 15.77 | 3.621 / 6.353 | 261 | 2 | 300 |  |
| campus | 12 | patrol/facing | 1.7 / 3.9 | 0.117 | 0.008 | 105.513 | 0 | 0.093 | 7.6 / 12.3 | 131.6 | 7.3 / 11.9 | 8.1 / 12.7 | 16.084 | 6.253 / 8.685 | 328 | 2 | 324 |  |
| campus | 12 | patrol/away | - | - | - | - | - | - | 4.5 / 7 | 222.2 | 4.2 / 6.7 | 5.4 / 7.5 | 15.764 | 4.055 / 5.121 | 91 | 2 | 28 |  |
| campus | 12 | alert/facing | 1.6 / 3.4 | 0.18 | 0.012 | 111.929 | 0.018 | 0.08 | 8.1 / 12.6 | 123.5 | 7.4 / 11.9 | 8.1 / 12.7 | 15.438 | 6.719 / 9.395 | 360 | 4 | 403 |  |
| campus | 16 | patrol/facing | 2.1 / 4.5 | 0.15 | 0.011 | 105.533 | 0 | 0.106 | 8.1 / 12.8 | 123.5 | 7.8 / 12.4 | 8.5 / 13.1 | 16.096 | 6.303 / 8.481 | 339 | 2 | 332 |  |
| campus | 16 | patrol/away | - | - | - | - | - | - | 4.6 / 7.1 | 217.4 | 4.4 / 6.7 | 5.5 / 7.5 | 15.762 | 3.994 / 4.987 | 91 | 2 | 28 |  |
| campus | 16 | alert/facing | 2.7 / 5.1 | 0.251 | 0.018 | 112.567 | 0.017 | 0.106 | 8.9 / 13.7 | 112.4 | 8.3 / 13.1 | 9 / 13.7 | 15.58 | 6.964 / 10.032 | 365 | 4 | 404 |  |
| campus | 24 | patrol/facing | 2.8 / 5.3 | 0.211 | 0.015 | 105.737 | 0 | 0.146 | 9.6 / 15 | 104.2 | 9.3 / 14.6 | 9.8 / 15.1 | 16.204 | 6.954 / 9.254 | 367 | 2 | 346 |  |
| campus | 24 | patrol/away | - | - | - | - | - | - | 4.3 / 7.2 | 232.6 | 4.1 / 6.8 | 5.1 / 7.5 | 15.796 | 3.749 / 4.97 | 91 | 2 | 28 |  |
| campus | 24 | alert/facing | 2 / 4.4 | 0.267 | 0.02 | 114.509 | 0.02 | 0.122 | 10.3 / 16 | 97.1 | 9.7 / 15.2 | 10.3 / 15.7 | 15.689 | 7.853 / 11.261 | 398 | 4 | 389 |  |
| campus | 32 | patrol/facing | 3.8 / 5.8 | 0.304 | 0.022 | 106.143 | 0 | 0.171 | 11.4 / 18.1 | 87.7 | 11.1 / 17.7 | 12.1 / 18.1 | 16.23 | 7.72 / 11.213 | 389 | 2 | 359 |  |
| campus | 32 | patrol/away | - | - | - | - | - | - | 4.8 / 8 | 208.3 | 4.6 / 7.7 | 5.6 / 8.7 | 15.843 | 3.818 / 5.021 | 91 | 2 | 28 |  |
| campus | 32 | alert/facing | 3.1 / 5.7 | 0.392 | 0.034 | 116.244 | 0.023 | 0.168 | 12.7 / 19 | 78.7 | 12 / 18.1 | 12.8 / 18.3 | 15.796 | 9.274 / 13.223 | 446 | 4 | 406 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, campus patrol/facing (N 0 -> 32): sim 0.091 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.225, CPU per 1/60 s sim 0.013, GPU 0.119, draws 4.125.

Per added guard, campus alert/facing (N 0 -> 32): sim 0.075 ms, of it AI 0.012 (perceive 0.001), frame CPU (sim frames) 0.256, CPU per 1/60 s sim 0.001, GPU 0.177, draws 5.781.

<!-- guard-cap:results:end -->
