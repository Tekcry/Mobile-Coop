# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-22T23:34:26.849Z (version 4.68.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.8 / 1.8 | 0.003 | 0 | 103.813 | 0 | 0.049 | 2.7 / 6.4 | 370.4 | 2.5 / 6 | 3.6 / 7.6 | 15.772 | 3.173 / 4.654 | 104 | 1 | 124 |  |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 2.2 / 5.2 | 454.5 | 2 / 4.9 | 3.1 / 6.4 | 15.427 | 2.615 / 3.952 | 75 | 1 | 20 |  |
| sectorops | 0 | alert/facing | 0.5 / 1.3 | 0.001 | 0 | 103.808 | 0 | 0.026 | 2.8 / 6.5 | 357.1 | 2.6 / 6.1 | 3.5 / 7.3 | 15.546 | 3.208 / 4.081 | 104 | 1 | 123 |  |
| sectorops | 12 | patrol/facing | 1.1 / 1.7 | 0.044 | 0.006 | 109.018 | 0 | 0.062 | 6 / 9.1 | 166.7 | 5.8 / 8.8 | 6.2 / 10.4 | 16.066 | 5.288 / 6.518 | 142 | 1 | 736 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 4.4 / 8.1 | 227.3 | 4.2 / 7.8 | 4.7 / 9.1 | 15.908 | 3.402 / 4.592 | 95 | 1 | 20 |  |
| sectorops | 12 | alert/facing | 1.3 / 3 | 0.207 | 0.01 | 111.361 | 0.012 | 0.074 | 7.8 / 13.4 | 128.2 | 7.1 / 12.6 | 7.7 / 13.6 | 15.452 | 6.225 / 8.443 | 160 | 3 | 899 |  |
| sectorops | 16 | patrol/facing | 1.3 / 2 | 0.052 | 0.011 | 109.798 | 0 | 0.069 | 7 / 8.9 | 142.9 | 6.8 / 8.7 | 7.3 / 9 | 16.14 | 5.746 / 6.746 | 142 | 1 | 886 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 4.9 / 6.1 | 204.1 | 4.7 / 5.8 | 5.2 / 6.2 | 15.959 | 3.508 / 4.153 | 95 | 1 | 20 |  |
| sectorops | 16 | alert/facing | 1.6 / 2.5 | 0.226 | 0.015 | 111.855 | 0.017 | 0.123 | 8.3 / 10.5 | 120.5 | 7.7 / 9.7 | 8.1 / 10.5 | 15.497 | 6.418 / 7.539 | 167 | 3 | 997 |  |
| sectorops | 24 | patrol/facing | 1.5 / 2.3 | 0.072 | 0.014 | 111.263 | 0 | 0.092 | 10.1 / 12.2 | 99 | 9.9 / 11.9 | 10.2 / 12.3 | 16.269 | 6.808 / 7.964 | 142 | 1 | 1429 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 6.6 / 7.9 | 151.5 | 6.3 / 7.7 | 6.8 / 8 | 16.082 | 3.759 / 4.423 | 95 | 1 | 20 |  |
| sectorops | 24 | alert/facing | 2.2 / 3.9 | 0.239 | 0.018 | 113.991 | 0.025 | 0.124 | 12.1 / 14.6 | 82.6 | 11.4 / 13.9 | 11.6 / 14.2 | 15.761 | 7.977 / 9.182 | 162 | 3 | 1670 |  |
| ctcourse | 0 | patrol/facing | 0.7 / 1 | 0.002 | 0 | 100.808 | 0 | 0.04 | 2.5 / 4 | 400 | 2.3 / 3.7 | 3 / 4.2 | 15.472 | 2.897 / 3.294 | 115 | 0 | 92 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 2.5 / 4.2 | 400 | 2.3 / 3.8 | 3 / 4.8 | 15.1 | 2.84 / 3.164 | 52 | 0 | 14 |  |
| ctcourse | 0 | alert/facing | 0.7 / 1.1 | 0.003 | 0 | 100.813 | 0 | 0.033 | 2.5 / 4.2 | 400 | 2.3 / 3.9 | 3.3 / 4.5 | 15.775 | 2.961 / 3.473 | 115 | 0 | 92 |  |
| ctcourse | 12 | patrol/facing | 0.9 / 1.5 | 0.04 | 0.005 | 104.92 | 0 | 0.057 | 5 / 6.3 | 200 | 4.8 / 6.1 | 5.2 / 6.5 | 15.931 | 4.41 / 5.39 | 133 | 0 | 772 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 3.5 / 4.7 | 285.7 | 3.3 / 4.5 | 3.8 / 5.2 | 15.696 | 3.144 / 3.654 | 52 | 0 | 14 |  |
| ctcourse | 12 | alert/facing | 1.1 / 2 | 0.127 | 0.005 | 103.123 | 0.003 | 0.069 | 5.6 / 7 | 178.6 | 5.3 / 6.7 | 5.8 / 7.6 | 15.857 | 4.74 / 5.454 | 139 | 0 | 808 |  |
| ctcourse | 16 | patrol/facing | 1.1 / 1.8 | 0.06 | 0.008 | 105.643 | 0 | 0.072 | 6.7 / 8.7 | 149.3 | 6.5 / 8.4 | 6.9 / 8.8 | 16.087 | 5.426 / 6.487 | 133 | 0 | 1044 |  |
| ctcourse | 16 | patrol/away | - | - | - | - | - | - | 4.2 / 5.3 | 238.1 | 4 / 5.1 | 4.6 / 5.5 | 15.811 | 3.306 / 3.795 | 52 | 0 | 14 |  |
| ctcourse | 16 | alert/facing | 1.1 / 2.3 | 0.13 | 0.007 | 103.661 | 0 | 0.068 | 7.1 / 9.2 | 140.8 | 6.8 / 8.9 | 7.3 / 9.6 | 16.004 | 5.544 / 6.436 | 147 | 1 | 1026 |  |
| ctcourse | 24 | patrol/facing | 1.5 / 2.4 | 0.084 | 0.013 | 107.162 | 0 | 0.099 | 9.5 / 11.7 | 105.3 | 9.2 / 11.5 | 9.6 / 11.8 | 16.216 | 6.299 / 7.311 | 133 | 0 | 1588 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 5.7 / 7.5 | 175.4 | 5.5 / 7.2 | 5.9 / 7.6 | 15.996 | 3.124 / 3.595 | 52 | 0 | 14 |  |
| ctcourse | 24 | alert/facing | 2 / 3.5 | 0.193 | 0.014 | 104.992 | 0.003 | 0.123 | 9.9 / 12.8 | 101 | 9.6 / 12.4 | 10 / 12.7 | 16.196 | 6.233 / 7.462 | 155 | 1 | 1489 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.029 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.275, CPU per 1/60 s sim 0.021, GPU 0.151, draws 1.583.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.071 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.337, CPU per 1/60 s sim 0.009, GPU 0.199, draws 2.417.

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.033 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.275, CPU per 1/60 s sim 0.031, GPU 0.142, draws 0.750.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.054 ms, of it AI 0.008 (perceive 0.001), frame CPU (sim frames) 0.279, CPU per 1/60 s sim 0.018, GPU 0.136, draws 1.667.

<!-- guard-cap:results:end -->
