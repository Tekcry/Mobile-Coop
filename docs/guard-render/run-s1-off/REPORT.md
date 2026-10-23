# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-22T23:25:13.267Z (version 4.68.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 0 | patrol/facing | 0.9 / 1.5 | 0.002 | 0 | 103.813 | 0 | 0.046 | 3.2 / 5.5 | 312.5 | 2.9 / 5.1 | 4 / 6.4 | 15.506 | 3.519 / 5.012 | 104 | 1 | 124 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 0 | patrol/away | - | - | - | - | - | - | 2.5 / 4.4 | 400 | 2.3 / 4.1 | 3.1 / 5.2 | 15.43 | 2.632 / 3.565 | 75 | 1 | 20 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 0 | alert/facing | 0.9 / 1.3 | 0.002 | 0 | 103.808 | 0 | 0.043 | 3.1 / 5.4 | 322.6 | 2.9 / 5 | 3.7 / 5.9 | 15.503 | 3.415 / 4.376 | 104 | 1 | 123 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 12 | patrol/facing | 1.2 / 2.3 | 0.046 | 0.008 | 109.063 | 0 | 0.056 | 6.4 / 8.7 | 156.3 | 6.2 / 8.4 | 6.6 / 8.8 | 16.089 | 5.604 / 6.801 | 142 | 1 | 735 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 12 | patrol/away | - | - | - | - | - | - | 4.5 / 6 | 222.2 | 4.3 / 5.7 | 4.7 / 6.2 | 15.887 | 3.538 / 4.325 | 95 | 1 | 20 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 12 | alert/facing | 1.7 / 4.3 | 0.238 | 0.013 | 110.611 | 0.013 | 0.097 | 8.6 / 11.2 | 116.3 | 7.9 / 10.5 | 8.3 / 11.4 | 15.419 | 6.727 / 7.864 | 164 | 3 | 919 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 16 | patrol/facing | 1.7 / 2.6 | 0.082 | 0.013 | 109.802 | 0 | 0.109 | 9.1 / 12.9 | 109.9 | 8.8 / 12.6 | 9.2 / 13.7 | 16.206 | 6.273 / 7.847 | 142 | 1 | 884 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 16 | patrol/away | - | - | - | - | - | - | 5.7 / 7.1 | 175.4 | 5.5 / 6.9 | 6 / 7.4 | 16.003 | 3.5 / 4.181 | 95 | 1 | 20 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 16 | alert/facing | 1.4 / 2.1 | 0.208 | 0.012 | 112.429 | 0.015 | 0.088 | 9.3 / 11.2 | 107.5 | 8.7 / 10.6 | 9.1 / 11 | 15.637 | 6.609 / 7.713 | 163 | 3 | 1106 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 24 | patrol/facing | 1.6 / 2.1 | 0.079 | 0.017 | 111.298 | 0 | 0.086 | 9.7 / 11.8 | 103.1 | 9.5 / 11.5 | 9.8 / 11.9 | 16.251 | 6.702 / 7.801 | 142 | 1 | 1429 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 24 | patrol/away | - | - | - | - | - | - | 6.7 / 8.4 | 149.3 | 6.5 / 8.1 | 6.9 / 8.5 | 16.101 | 3.838 / 4.573 | 95 | 1 | 20 |  |
| warehouseOps:sector&sectorGuards=0&guardmerge=0 | 24 | alert/facing | 1.9 / 2.9 | 0.248 | 0.018 | 113.547 | 0.012 | 0.122 | 11 / 13 | 90.9 | 10.3 / 12.4 | 10.6 / 13 | 15.721 | 7.391 / 8.497 | 162 | 3 | 1459 |  |
| ctcourse:course&guardmerge=0 | 0 | patrol/facing | 0.7 / 1.1 | 0.001 | 0 | 100.813 | 0 | 0.043 | 2.6 / 4.1 | 384.6 | 2.3 / 3.8 | 3.1 / 4.2 | 15.924 | 3.081 / 3.84 | 115 | 0 | 92 |  |
| ctcourse:course&guardmerge=0 | 0 | patrol/away | - | - | - | - | - | - | 2 / 3.4 | 500 | 1.8 / 3.2 | 2.5 / 4.3 | 15.931 | 2.74 / 3.048 | 52 | 0 | 14 |  |
| ctcourse:course&guardmerge=0 | 0 | alert/facing | 0.7 / 1 | 0.002 | 0 | 100.822 | 0 | 0.038 | 2.4 / 4.3 | 416.7 | 2.2 / 4 | 3.2 / 4.9 | 15.707 | 3.218 / 3.646 | 115 | 0 | 92 |  |
| ctcourse:course&guardmerge=0 | 12 | patrol/facing | 0.9 / 1.4 | 0.038 | 0.005 | 104.897 | 0 | 0.063 | 5.1 / 6.3 | 196.1 | 4.9 / 6 | 5.4 / 6.3 | 15.94 | 4.443 / 5.159 | 133 | 0 | 772 |  |
| ctcourse:course&guardmerge=0 | 12 | patrol/away | - | - | - | - | - | - | 4 / 8.4 | 250 | 3.8 / 8 | 4.5 / 10.2 | 15.786 | 3.122 / 3.705 | 52 | 0 | 14 |  |
| ctcourse:course&guardmerge=0 | 12 | alert/facing | 1.3 / 3.6 | 0.215 | 0.012 | 102.976 | 0.002 | 0.117 | 5.7 / 10.7 | 175.4 | 5.4 / 10.3 | 6 / 11.5 | 15.906 | 4.48 / 5.924 | 139 | 0 | 814 |  |
| ctcourse:course&guardmerge=0 | 16 | patrol/facing | 1.2 / 3 | 0.072 | 0.011 | 105.667 | 0 | 0.08 | 6.8 / 10.9 | 147.1 | 6.6 / 10.6 | 7 / 11.7 | 16.119 | 5.318 / 6.663 | 133 | 0 | 1044 |  |
| ctcourse:course&guardmerge=0 | 16 | patrol/away | - | - | - | - | - | - | 4.2 / 6.5 | 238.1 | 4 / 6.2 | 4.5 / 7.7 | 15.859 | 3.276 / 3.684 | 52 | 0 | 14 |  |
| ctcourse:course&guardmerge=0 | 16 | alert/facing | 1 / 2.6 | 0.137 | 0.007 | 103.705 | 0.002 | 0.074 | 7.9 / 13.7 | 126.6 | 7.6 / 13.4 | 8.1 / 13.8 | 16.074 | 5.529 / 7.497 | 143 | 1 | 1117 |  |
| ctcourse:course&guardmerge=0 | 24 | patrol/facing | 1.3 / 3.2 | 0.087 | 0.011 | 107.122 | 0 | 0.098 | 9.2 / 14.5 | 108.7 | 8.9 / 14.2 | 9.3 / 14.9 | 16.224 | 6.105 / 7.97 | 133 | 0 | 1588 |  |
| ctcourse:course&guardmerge=0 | 24 | patrol/away | - | - | - | - | - | - | 5.4 / 9.6 | 185.2 | 5.2 / 9.3 | 5.5 / 10.2 | 15.953 | 2.921 / 3.44 | 52 | 0 | 14 |  |
| ctcourse:course&guardmerge=0 | 24 | alert/facing | 1.3 / 3 | 0.165 | 0.009 | 104.985 | 0.003 | 0.088 | 9.5 / 15.6 | 105.3 | 9.2 / 15.3 | 9.6 / 16.3 | 16.167 | 5.873 / 7.884 | 155 | 1 | 1522 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, warehouseOps:sector&sectorGuards=0&guardmerge=0 patrol/facing (N 0 -> 24): sim 0.029 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.242, CPU per 1/60 s sim 0.031, GPU 0.133, draws 1.583.

Per added guard, warehouseOps:sector&sectorGuards=0&guardmerge=0 alert/facing (N 0 -> 24): sim 0.042 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.287, CPU per 1/60 s sim 0.009, GPU 0.166, draws 2.417.

Per added guard, ctcourse:course&guardmerge=0 patrol/facing (N 0 -> 24): sim 0.025 ms, of it AI 0.004 (perceive 0.000), frame CPU (sim frames) 0.258, CPU per 1/60 s sim 0.013, GPU 0.126, draws 0.750.

Per added guard, ctcourse:course&guardmerge=0 alert/facing (N 0 -> 24): sim 0.025 ms, of it AI 0.007 (perceive 0.000), frame CPU (sim frames) 0.267, CPU per 1/60 s sim 0.019, GPU 0.111, draws 1.667.

<!-- guard-cap:results:end -->
