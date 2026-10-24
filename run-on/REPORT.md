# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T06:25:32.109Z (version 4.90.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.7 | 0.005 | 0 | 103.813 | 0 | 0.033 | 1.9 / 3.6 | 526.3 | 1.8 / 3.3 | 2.5 / 4.4 | 17.242 | 3.56 / 3.823 | 108 | 1 | 124 |  |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 1.5 / 2.7 | 666.7 | 1.4 / 2.5 | 2 / 3.8 | 16.153 | 2.664 / 2.749 | 85 | 1 | 27 |  |
| sectorops | 0 | alert/facing | 0.5 / 0.7 | 0.004 | 0 | 103.813 | 0 | 0.025 | 1.8 / 15.6 | 555.6 | 1.6 / 15.4 | 2.5 / 5.4 | 16.126 | 3.667 / 3.879 | 108 | 1 | 123 |  |
| sectorops | 12 | patrol/facing | 1 / 1.5 | 0.063 | 0.007 | 108.658 | 0 | 0.055 | 4.2 / 5.3 | 238.1 | 4 / 5 | 4.6 / 5.4 | 15.931 | 4.102 / 4.96 | 185 | 3 | 140 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 3 / 3.9 | 333.3 | 2.8 / 3.7 | 3.5 / 4 | 15.793 | 2.91 / 3.643 | 135 | 5 | 31 |  |
| sectorops | 12 | alert/facing | 1.1 / 1.5 | 0.126 | 0.007 | 112.162 | 0.012 | 0.066 | 4.9 / 6.3 | 204.1 | 4.4 / 5.6 | 5.1 / 5.9 | 14.937 | 4.755 / 6.061 | 213 | 6 | 183 |  |
| sectorops | 24 | patrol/facing | 1.3 / 1.6 | 0.103 | 0.014 | 110.753 | 0 | 0.069 | 5.3 / 6.5 | 188.7 | 5.1 / 6.3 | 5.6 / 6.6 | 16.025 | 4.949 / 5.932 | 218 | 1 | 157 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 3.6 / 4.6 | 277.8 | 3.4 / 4.4 | 4.1 / 4.7 | 15.819 | 3.298 / 3.942 | 135 | 5 | 30 |  |
| sectorops | 24 | alert/facing | 1.6 / 2.3 | 0.231 | 0.018 | 113.567 | 0.03 | 0.096 | 6 / 7.2 | 166.7 | 5.5 / 6.6 | 6.1 / 7 | 15.242 | 5.746 / 6.429 | 262 | 6 | 232 |  |
| campusops | 0 | patrol/facing | 0.5 / 0.7 | 0.006 | 0 | 103.808 | 0 | 0.033 | 3.6 / 4.5 | 277.8 | 3.4 / 4.3 | 3.9 / 4.6 | 15.771 | 3.381 / 4.071 | 263 | 1 | 300 |  |
| campusops | 0 | patrol/away | - | - | - | - | - | - | 2.2 / 3.6 | 454.5 | 2 / 3.4 | 2.7 / 4 | 15.697 | 2.849 / 3.191 | 88 | 2 | 26 |  |
| campusops | 0 | alert/facing | 0.4 / 0.7 | 0.004 | 0 | 103.822 | 0 | 0.023 | 3.6 / 4.6 | 277.8 | 3.4 / 4.4 | 3.8 / 4.9 | 15.714 | 3.418 / 4.213 | 267 | 2 | 300 |  |
| campusops | 12 | patrol/facing | 1.6 / 2.6 | 0.089 | 0.006 | 105.507 | 0 | 0.065 | 6 / 7.2 | 166.7 | 5.8 / 7 | 6.2 / 7.3 | 16.039 | 5.361 / 6.084 | 349 | 2 | 324 |  |
| campusops | 12 | patrol/away | - | - | - | - | - | - | 3.7 / 4.8 | 270.3 | 3.5 / 4.5 | 4.1 / 4.9 | 15.746 | 3.361 / 4.253 | 112 | 2 | 28 |  |
| campusops | 12 | alert/facing | 1.3 / 1.7 | 0.147 | 0.014 | 111.658 | 0.013 | 0.063 | 6.9 / 8.1 | 144.9 | 6.3 / 7.5 | 6.8 / 7.8 | 15.422 | 5.738 / 6.514 | 355 | 3 | 376 |  |
| campusops | 24 | patrol/facing | 1.9 / 3.4 | 0.133 | 0.01 | 105.693 | 0 | 0.095 | 7.4 / 9 | 135.1 | 7.2 / 8.8 | 7.7 / 9.2 | 16.138 | 5.322 / 6.212 | 407 | 2 | 347 |  |
| campusops | 24 | patrol/away | - | - | - | - | - | - | 3.4 / 4.5 | 294.1 | 3.2 / 4.3 | 4 / 4.7 | 15.821 | 3.177 / 3.943 | 112 | 2 | 28 |  |
| campusops | 24 | alert/facing | 1.4 / 2.2 | 0.235 | 0.018 | 114.799 | 0.015 | 0.093 | 7.7 / 9.2 | 129.9 | 7.2 / 8.6 | 7.7 / 9 | 15.573 | 6.168 / 7.006 | 423 | 4 | 418 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.033 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.129, CPU per 1/60 s sim -0.051, GPU 0.058, draws 4.583.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.046 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.150, CPU per 1/60 s sim -0.037, GPU 0.087, draws 6.417.

Per added guard, campusops patrol/facing (N 0 -> 24): sim 0.058 ms, of it AI 0.005 (perceive 0.000), frame CPU (sim frames) 0.158, CPU per 1/60 s sim 0.015, GPU 0.081, draws 6.000.

Per added guard, campusops alert/facing (N 0 -> 24): sim 0.042 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.163, CPU per 1/60 s sim -0.006, GPU 0.115, draws 6.500.

<!-- guard-cap:results:end -->
