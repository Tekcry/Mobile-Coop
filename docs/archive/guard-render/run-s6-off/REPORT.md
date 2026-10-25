# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-23T00:32:19.205Z (version 4.68.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 0 | patrol/facing | 0.8 / 1.2 | 0.003 | 0 | 103.813 | 0 | 0.044 | 2.7 / 4.4 | 370.4 | 2.5 / 4.1 | 3.3 / 4.9 | 16.11 | 3.631 / 4.49 | 104 | 1 | 124 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 0 | patrol/away | - | - | - | - | - | - | 2.6 / 3.8 | 384.6 | 2.4 / 3.6 | 3.1 / 4.1 | 15.424 | 2.731 / 3.044 | 75 | 1 | 20 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 0 | alert/facing | 0.8 / 1.1 | 0.003 | 0 | 103.808 | 0 | 0.032 | 2.9 / 4.9 | 344.8 | 2.7 / 4.6 | 3.7 / 5.4 | 16.085 | 3.552 / 4.112 | 104 | 1 | 124 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 12 | patrol/facing | 1.2 / 2.3 | 0.053 | 0.008 | 109.033 | 0 | 0.079 | 4.8 / 6.4 | 208.3 | 4.6 / 6.1 | 5.1 / 6.7 | 15.873 | 4.276 / 5.487 | 180 | 1 | 295 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 12 | patrol/away | - | - | - | - | - | - | 3.6 / 4.7 | 277.8 | 3.4 / 4.4 | 4.1 / 4.8 | 15.779 | 3.134 / 3.786 | 135 | 1 | 24 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 12 | alert/facing | 1.3 / 2.3 | 0.266 | 0.015 | 111.185 | 0.013 | 0.11 | 6 / 7.7 | 166.7 | 5.4 / 6.9 | 5.9 / 7.8 | 14.987 | 5.217 / 6.176 | 213 | 3 | 383 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 16 | patrol/facing | 1.3 / 1.9 | 0.055 | 0.011 | 109.798 | 0 | 0.069 | 5.5 / 6.7 | 181.8 | 5.2 / 6.5 | 5.7 / 6.8 | 16 | 4.779 / 5.461 | 204 | 1 | 341 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 16 | patrol/away | - | - | - | - | - | - | 4.4 / 5.7 | 227.3 | 4.3 / 5.4 | 4.9 / 5.8 | 15.923 | 3.374 / 4.059 | 151 | 1 | 24 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 16 | alert/facing | 1.4 / 2.1 | 0.229 | 0.015 | 111.532 | 0.013 | 0.083 | 7.1 / 9 | 140.8 | 6.5 / 8.4 | 7 / 9.3 | 15.286 | 5.438 / 6.541 | 250 | 3 | 456 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 24 | patrol/facing | 1.7 / 2.3 | 0.076 | 0.016 | 111.258 | 0 | 0.087 | 6.9 / 8.3 | 144.9 | 6.7 / 8.1 | 7.1 / 8.5 | 16.111 | 5.117 / 6.02 | 240 | 1 | 493 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 24 | patrol/away | - | - | - | - | - | - | 5.3 / 6.6 | 188.7 | 5.1 / 6.3 | 5.6 / 6.7 | 15.993 | 3.456 / 4.287 | 171 | 1 | 24 |  |
| warehouseOps:sector&sectorGuards=0&guardsun=0 | 24 | alert/facing | 2 / 3.2 | 0.297 | 0.024 | 113.576 | 0.022 | 0.153 | 8.4 / 10.3 | 119 | 7.7 / 9.5 | 8.1 / 10.4 | 15.34 | 5.755 / 6.743 | 303 | 3 | 639 |  |
| ctcourse:course&guardsun=0 | 0 | patrol/facing | 0.7 / 1.1 | 0.004 | 0 | 100.822 | 0 | 0.038 | 2.4 / 4 | 416.7 | 2.2 / 3.7 | 3.1 / 4.3 | 15.669 | 3.253 / 3.732 | 115 | 0 | 92 |  |
| ctcourse:course&guardsun=0 | 0 | patrol/away | - | - | - | - | - | - | 2 / 3.4 | 500 | 1.8 / 3.1 | 2.6 / 4.6 | 15.848 | 2.749 / 3.289 | 52 | 0 | 14 |  |
| ctcourse:course&guardsun=0 | 0 | alert/facing | 0.7 / 1 | 0.002 | 0 | 100.822 | 0 | 0.033 | 2.2 / 3.7 | 454.5 | 2 / 3.4 | 2.8 / 4.1 | 16.121 | 3.098 / 3.642 | 115 | 0 | 92 |  |
| ctcourse:course&guardsun=0 | 12 | patrol/facing | 0.9 / 1.5 | 0.052 | 0.008 | 104.893 | 0 | 0.064 | 4.9 / 6.7 | 204.1 | 4.6 / 6.4 | 5.3 / 6.9 | 15.849 | 4.161 / 5.289 | 143 | 0 | 284 |  |
| ctcourse:course&guardsun=0 | 12 | patrol/away | - | - | - | - | - | - | 3.2 / 4.7 | 312.5 | 3 / 4.4 | 3.5 / 4.9 | 15.601 | 3.143 / 3.803 | 56 | 0 | 16 |  |
| ctcourse:course&guardsun=0 | 12 | alert/facing | 1.1 / 2 | 0.137 | 0.008 | 103.041 | 0.002 | 0.074 | 4.3 / 5.5 | 232.6 | 4 / 5.2 | 4.6 / 5.9 | 15.703 | 3.915 / 4.758 | 151 | 1 | 331 |  |
| ctcourse:course&guardsun=0 | 16 | patrol/facing | 1.2 / 1.9 | 0.056 | 0.009 | 105.668 | 0 | 0.072 | 4.8 / 6.2 | 208.3 | 4.5 / 5.9 | 5.1 / 6.5 | 15.898 | 4.153 / 5.074 | 151 | 0 | 360 |  |
| ctcourse:course&guardsun=0 | 16 | patrol/away | - | - | - | - | - | - | 3.3 / 4.5 | 303 | 3.1 / 4.2 | 3.9 / 4.7 | 15.705 | 3.249 / 3.688 | 56 | 0 | 16 |  |
| ctcourse:course&guardsun=0 | 16 | alert/facing | 1.2 / 2.2 | 0.146 | 0.008 | 103.668 | 0.002 | 0.082 | 5.2 / 8.2 | 192.3 | 4.9 / 7.8 | 5.4 / 10.1 | 15.85 | 4.334 / 5.291 | 161 | 1 | 369 |  |
| ctcourse:course&guardsun=0 | 24 | patrol/facing | 1.3 / 2 | 0.085 | 0.014 | 107.183 | 0 | 0.091 | 6.5 / 7.8 | 153.8 | 6.2 / 7.6 | 6.7 / 7.9 | 16.055 | 4.809 / 5.704 | 167 | 0 | 512 |  |
| ctcourse:course&guardsun=0 | 24 | patrol/away | - | - | - | - | - | - | 4.5 / 5.8 | 222.2 | 4.3 / 5.5 | 4.9 / 6 | 15.843 | 3.296 / 3.757 | 56 | 0 | 16 |  |
| ctcourse:course&guardsun=0 | 24 | alert/facing | 1.6 / 3.4 | 0.195 | 0.013 | 104.987 | 0.002 | 0.117 | 7.3 / 9.9 | 137 | 6.9 / 9.6 | 7.4 / 10.4 | 15.94 | 4.765 / 5.878 | 189 | 1 | 552 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, warehouseOps:sector&sectorGuards=0&guardsun=0 patrol/facing (N 0 -> 24): sim 0.037 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.158, CPU per 1/60 s sim 0.000, GPU 0.062, draws 5.667.

Per added guard, warehouseOps:sector&sectorGuards=0&guardsun=0 alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.012 (perceive 0.001), frame CPU (sim frames) 0.183, CPU per 1/60 s sim -0.031, GPU 0.092, draws 8.292.

Per added guard, ctcourse:course&guardsun=0 patrol/facing (N 0 -> 24): sim 0.025 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.150, CPU per 1/60 s sim 0.016, GPU 0.065, draws 2.167.

Per added guard, ctcourse:course&guardsun=0 alert/facing (N 0 -> 24): sim 0.038 ms, of it AI 0.008 (perceive 0.001), frame CPU (sim frames) 0.192, CPU per 1/60 s sim -0.008, GPU 0.069, draws 3.083.

<!-- guard-cap:results:end -->
