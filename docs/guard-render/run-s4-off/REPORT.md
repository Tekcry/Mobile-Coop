# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-23T03:26:58.571Z (version 4.73.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 0 | patrol/facing | 0.8 / 1.6 | 0.005 | 0 | 103.813 | 0 | 0.041 | 3.2 / 5.4 | 312.5 | 3 / 5.1 | 4.2 / 6.1 | 15.639 | 3.501 / 3.898 | 104 | 1 | 115 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 0 | patrol/away | - | - | - | - | - | - | 2.3 / 4.6 | 434.8 | 2.2 / 4.3 | 3.4 / 5.2 | 15.624 | 2.761 / 3.043 | 75 | 1 | 20 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 0 | alert/facing | 0.7 / 1.2 | 0.003 | 0 | 103.813 | 0 | 0.036 | 2.7 / 5.1 | 370.4 | 2.5 / 4.8 | 3.7 / 5.6 | 15.926 | 3.459 / 3.849 | 104 | 1 | 115 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 12 | patrol/facing | 2 / 3.3 | 0.078 | 0.011 | 109.053 | 0 | 0.078 | 6.8 / 10.7 | 147.1 | 6.6 / 10.4 | 7.6 / 11.2 | 16.019 | 5.2 / 6.941 | 179 | 1 | 287 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 12 | patrol/away | - | - | - | - | - | - | 5.3 / 8.5 | 188.7 | 5 / 8.2 | 6.1 / 8.7 | 15.914 | 3.73 / 4.913 | 131 | 1 | 24 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 12 | alert/facing | 2.2 / 4.3 | 0.321 | 0.014 | 112.033 | 0.015 | 0.106 | 8.8 / 13.2 | 113.6 | 8 / 12.3 | 8.8 / 13.5 | 15.212 | 5.99 / 7.952 | 216 | 3 | 378 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 24 | patrol/facing | 2.7 / 4 | 0.157 | 0.032 | 111.318 | 0 | 0.152 | 10.7 / 15.3 | 93.5 | 10.4 / 15 | 11.1 / 15.5 | 16.217 | 6.193 / 8.445 | 239 | 1 | 485 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 24 | patrol/away | - | - | - | - | - | - | 8.4 / 12.8 | 119 | 8.1 / 12.5 | 9 / 13.3 | 16.1 | 4.399 / 5.671 | 167 | 1 | 24 |  |
| warehouseOps:sector&sectorGuards=0&animtier=0 | 24 | alert/facing | 3.1 / 6.6 | 0.395 | 0.025 | 113.451 | 0.03 | 0.163 | 12.3 / 17.7 | 81.3 | 11.4 / 16.8 | 12.1 / 17.2 | 15.495 | 6.965 / 8.912 | 278 | 3 | 564 |  |
| ctcourse:course&animtier=0 | 0 | patrol/facing | 0.6 / 1.3 | 0.004 | 0 | 100.808 | 0 | 0.037 | 2.5 / 4.8 | 400 | 2.3 / 4.5 | 3.4 / 5.5 | 15.686 | 3.175 / 4.47 | 115 | 0 | 92 |  |
| ctcourse:course&animtier=0 | 0 | patrol/away | - | - | - | - | - | - | 1.9 / 3.9 | 526.3 | 1.7 / 3.6 | 2.9 / 5.3 | 17.119 | 2.784 / 3.128 | 52 | 0 | 14 |  |
| ctcourse:course&animtier=0 | 0 | alert/facing | 0.9 / 1.4 | 0.004 | 0 | 100.808 | 0 | 0.053 | 3.3 / 5.6 | 303 | 3 / 5.3 | 4.2 / 6.1 | 15.482 | 3.326 / 4.48 | 115 | 0 | 92 |  |
| ctcourse:course&animtier=0 | 12 | patrol/facing | 2 / 3.6 | 0.112 | 0.012 | 104.895 | 0 | 0.106 | 8.5 / 12.8 | 117.6 | 8.2 / 12.4 | 9.1 / 12.9 | 16.076 | 5.113 / 6.929 | 143 | 0 | 284 |  |
| ctcourse:course&animtier=0 | 12 | patrol/away | - | - | - | - | - | - | 4.6 / 7.7 | 217.4 | 4.4 / 7.4 | 5.4 / 8.1 | 15.783 | 3.335 / 4.156 | 56 | 0 | 16 |  |
| ctcourse:course&animtier=0 | 12 | alert/facing | 1.7 / 4.2 | 0.183 | 0.009 | 103.048 | 0.013 | 0.087 | 7 / 11 | 142.9 | 6.6 / 10.5 | 7.6 / 11.6 | 15.826 | 4.647 / 6.285 | 161 | 1 | 319 |  |
| ctcourse:course&animtier=0 | 24 | patrol/facing | 1.9 / 3.6 | 0.118 | 0.018 | 107.157 | 0 | 0.106 | 9.3 / 13.3 | 107.5 | 9 / 13 | 9.8 / 13.7 | 16.157 | 5.191 / 6.777 | 167 | 0 | 512 |  |
| ctcourse:course&animtier=0 | 24 | patrol/away | - | - | - | - | - | - | 7.3 / 10.2 | 137 | 7 / 9.9 | 7.7 / 10.7 | 16.01 | 3.328 / 4.213 | 56 | 0 | 16 |  |
| ctcourse:course&animtier=0 | 24 | alert/facing | 3.8 / 6.2 | 0.305 | 0.015 | 105.005 | 0.012 | 0.152 | 11.5 / 17.6 | 87 | 11.1 / 17.1 | 12 / 17.7 | 16.065 | 5.865 / 8.061 | 188 | 1 | 561 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, warehouseOps:sector&sectorGuards=0&animtier=0 patrol/facing (N 0 -> 24): sim 0.079 ms, of it AI 0.006 (perceive 0.001), frame CPU (sim frames) 0.287, CPU per 1/60 s sim 0.024, GPU 0.112, draws 5.625.

Per added guard, warehouseOps:sector&sectorGuards=0&animtier=0 alert/facing (N 0 -> 24): sim 0.100 ms, of it AI 0.016 (perceive 0.001), frame CPU (sim frames) 0.350, CPU per 1/60 s sim -0.018, GPU 0.146, draws 7.250.

Per added guard, ctcourse:course&animtier=0 patrol/facing (N 0 -> 24): sim 0.054 ms, of it AI 0.005 (perceive 0.001), frame CPU (sim frames) 0.267, CPU per 1/60 s sim 0.020, GPU 0.084, draws 2.167.

Per added guard, ctcourse:course&animtier=0 alert/facing (N 0 -> 24): sim 0.121 ms, of it AI 0.013 (perceive 0.001), frame CPU (sim frames) 0.325, CPU per 1/60 s sim 0.024, GPU 0.106, draws 3.042.

<!-- guard-cap:results:end -->
