# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T06:33:11.506Z (version 4.90.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.7 | 0.003 | 0 | 103.813 | 0 | 0.03 | 1.9 / 3.8 | 526.3 | 1.8 / 3.5 | 2.4 / 4.4 | 17.92 | 3.668 / 3.88 | 108 | 1 | 124 | 1 |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 1.5 / 2.8 | 666.7 | 1.4 / 2.6 | 2 / 3.8 | 16.162 | 2.721 / 2.761 | 85 | 1 | 27 |  |
| sectorops | 0 | alert/facing | 0.5 / 0.6 | 0.003 | 0 | 103.813 | 0 | 0.021 | 1.8 / 4.2 | 555.6 | 1.7 / 4 | 2.4 / 5 | 17.703 | 3.743 / 3.916 | 108 | 1 | 124 |  |
| sectorops | 12 | patrol/facing | 1.1 / 2 | 0.065 | 0.006 | 108.633 | 0 | 0.05 | 3.6 / 5.1 | 277.8 | 3.5 / 5 | 4.2 / 5.4 | 15.986 | 4.095 / 4.542 | 176 | 1 | 140 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 2.9 / 3.9 | 344.8 | 2.8 / 3.7 | 3.4 / 4.1 | 15.737 | 2.881 / 3.59 | 135 | 4 | 31 |  |
| sectorops | 12 | alert/facing | 1.2 / 1.5 | 0.136 | 0.011 | 110.213 | 0.01 | 0.068 | 4.8 / 6 | 208.3 | 4.3 / 5.3 | 4.9 / 5.6 | 14.881 | 4.57 / 5.8 | 202 | 4 | 167 |  |
| sectorops | 24 | patrol/facing | 1.5 / 2.9 | 0.109 | 0.016 | 110.718 | 0 | 0.082 | 5.4 / 6.5 | 185.2 | 5.1 / 6.3 | 5.7 / 6.6 | 16.028 | 5.093 / 5.879 | 241 | 3 | 157 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 3.5 / 4.7 | 285.7 | 3.3 / 4.4 | 4.1 / 4.8 | 15.844 | 3.278 / 3.935 | 135 | 5 | 31 |  |
| sectorops | 24 | alert/facing | 1.7 / 2.4 | 0.223 | 0.018 | 114.136 | 0.025 | 0.097 | 6.2 / 7.4 | 161.3 | 5.6 / 6.8 | 6.3 / 7.2 | 15.215 | 5.745 / 6.402 | 260 | 6 | 202 |  |
| campusops | 0 | patrol/facing | 0.5 / 0.7 | 0.004 | 0 | 103.808 | 0 | 0.027 | 3.3 / 4.6 | 303 | 3.1 / 4.3 | 3.7 / 4.7 | 15.831 | 3.463 / 4.111 | 267 | 2 | 300 |  |
| campusops | 0 | patrol/away | - | - | - | - | - | - | 1.7 / 3.5 | 588.2 | 1.6 / 3.3 | 2.3 / 3.9 | 16.035 | 2.975 / 3.043 | 88 | 2 | 26 |  |
| campusops | 0 | alert/facing | 0.5 / 0.7 | 0.003 | 0 | 103.808 | 0 | 0.026 | 3 / 4.7 | 333.3 | 2.8 / 4.4 | 3.5 / 4.8 | 15.88 | 3.56 / 3.702 | 263 | 1 | 300 |  |
| campusops | 12 | patrol/facing | 1.4 / 2.4 | 0.097 | 0.009 | 105.508 | 0 | 0.065 | 5.3 / 6.6 | 188.7 | 5.1 / 6.4 | 5.6 / 6.9 | 15.989 | 4.992 / 5.579 | 341 | 2 | 323 |  |
| campusops | 12 | patrol/away | - | - | - | - | - | - | 2.8 / 4.4 | 357.1 | 2.6 / 4.1 | 3.5 / 4.6 | 15.767 | 3.112 / 3.657 | 112 | 2 | 28 |  |
| campusops | 12 | alert/facing | 1.2 / 1.8 | 0.152 | 0.011 | 111.842 | 0.018 | 0.069 | 6.2 / 7.6 | 161.3 | 5.7 / 7 | 6.3 / 7.3 | 15.315 | 5.631 / 6.566 | 343 | 4 | 378 |  |
| campusops | 24 | patrol/facing | 2.4 / 4.2 | 0.152 | 0.01 | 105.743 | 0 | 0.113 | 7.8 / 9.7 | 128.2 | 7.6 / 9.4 | 8 / 9.7 | 16.133 | 5.444 / 6.542 | 402 | 2 | 346 |  |
| campusops | 24 | patrol/away | - | - | - | - | - | - | 3.7 / 4.8 | 270.3 | 3.5 / 4.5 | 4.2 / 5 | 15.75 | 3.373 / 4.202 | 112 | 2 | 28 |  |
| campusops | 24 | alert/facing | 1.8 / 3 | 0.255 | 0.024 | 114.803 | 0.015 | 0.114 | 8.2 / 10 | 122 | 7.7 / 9.3 | 8.2 / 9.7 | 15.581 | 6.411 / 7.333 | 435 | 4 | 380 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.042 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.138, CPU per 1/60 s sim -0.079, GPU 0.059, draws 5.542.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.163, CPU per 1/60 s sim -0.104, GPU 0.083, draws 6.333.

Per added guard, campusops patrol/facing (N 0 -> 24): sim 0.079 ms, of it AI 0.006 (perceive 0.000), frame CPU (sim frames) 0.179, CPU per 1/60 s sim 0.013, GPU 0.083, draws 5.625.

Per added guard, campusops alert/facing (N 0 -> 24): sim 0.054 ms, of it AI 0.011 (perceive 0.001), frame CPU (sim frames) 0.196, CPU per 1/60 s sim -0.012, GPU 0.119, draws 7.167.

<!-- guard-cap:results:end -->
