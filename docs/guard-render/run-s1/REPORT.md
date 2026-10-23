# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-22T23:16:50.379Z (version 4.68.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.8 / 1.2 | 0.002 | 0 | 103.813 | 0 | 0.041 | 3.1 / 5.4 | 322.6 | 2.9 / 5 | 3.8 / 5.6 | 15.772 | 3.517 / 4.071 | 104 | 1 | 124 |  |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 2.5 / 4.6 | 400 | 2.3 / 4.3 | 3.4 / 5.3 | 15.551 | 2.937 / 3.996 | 75 | 1 | 20 |  |
| sectorops | 0 | alert/facing | 0.7 / 1 | 0.003 | 0 | 103.813 | 0 | 0.031 | 2.8 / 5.3 | 357.1 | 2.6 / 5 | 3.5 / 5.7 | 15.806 | 3.656 / 4.102 | 104 | 1 | 124 |  |
| sectorops | 12 | patrol/facing | 1.4 / 2.2 | 0.048 | 0.01 | 109.068 | 0 | 0.074 | 4.4 / 6.1 | 227.3 | 4.2 / 5.8 | 4.9 / 6.5 | 15.902 | 4.288 / 5.477 | 180 | 1 | 295 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 3.4 / 4.4 | 294.1 | 3.2 / 4.2 | 3.7 / 4.6 | 15.762 | 3.244 / 3.941 | 135 | 1 | 24 |  |
| sectorops | 12 | alert/facing | 1.5 / 3.1 | 0.211 | 0.014 | 111.134 | 0.013 | 0.089 | 5.9 / 7.8 | 169.5 | 5.3 / 7.1 | 5.7 / 8.4 | 15.05 | 5.194 / 6.364 | 211 | 3 | 342 |  |
| sectorops | 16 | patrol/facing | 1.4 / 2 | 0.058 | 0.01 | 109.812 | 0 | 0.078 | 5.6 / 7.2 | 178.6 | 5.4 / 6.9 | 5.8 / 7.6 | 15.97 | 5.031 / 5.857 | 204 | 1 | 341 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 4.8 / 6.6 | 208.3 | 4.6 / 6.3 | 5.1 / 7.2 | 15.885 | 3.677 / 4.52 | 151 | 1 | 24 |  |
| sectorops | 16 | alert/facing | 1.8 / 4 | 0.243 | 0.015 | 111.464 | 0.012 | 0.126 | 6.2 / 8.6 | 161.3 | 5.7 / 7.8 | 6.1 / 9.3 | 15.236 | 5.287 / 6.392 | 237 | 3 | 425 |  |
| sectorops | 24 | patrol/facing | 1.8 / 3.1 | 0.083 | 0.019 | 111.263 | 0 | 0.097 | 7.1 / 9.1 | 140.8 | 6.8 / 8.8 | 7.2 / 9.4 | 16.132 | 5.455 / 6.543 | 240 | 1 | 493 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 5.7 / 7.9 | 175.4 | 5.4 / 7.6 | 5.9 / 8 | 16.004 | 3.795 / 4.76 | 171 | 1 | 24 |  |
| sectorops | 24 | alert/facing | 2.2 / 3.9 | 0.306 | 0.022 | 112.962 | 0.03 | 0.155 | 8.8 / 11.9 | 113.6 | 8.1 / 11.1 | 8.4 / 11.7 | 15.431 | 6.024 / 7.235 | 293 | 3 | 611 |  |
| ctcourse | 0 | patrol/facing | 0.7 / 1.1 | 0.002 | 0 | 100.813 | 0 | 0.037 | 2.7 / 4.6 | 370.4 | 2.5 / 4.3 | 3.3 / 5.1 | 15.662 | 3.255 / 3.882 | 115 | 0 | 92 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 2.7 / 4.3 | 370.4 | 2.4 / 4 | 3.2 / 4.8 | 15.201 | 3.077 / 3.712 | 52 | 0 | 14 |  |
| ctcourse | 0 | alert/facing | 0.6 / 0.9 | 0.003 | 0 | 100.822 | 0 | 0.03 | 2.4 / 4 | 416.7 | 2.2 / 3.7 | 3 / 4.5 | 16.021 | 3.496 / 3.941 | 115 | 0 | 92 |  |
| ctcourse | 12 | patrol/facing | 0.9 / 1.4 | 0.05 | 0.008 | 104.912 | 0 | 0.058 | 3.9 / 5.3 | 256.4 | 3.7 / 5.1 | 4.2 / 5.9 | 15.776 | 3.647 / 4.625 | 143 | 0 | 284 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 3.1 / 4.4 | 322.6 | 2.9 / 4.1 | 3.5 / 4.6 | 15.573 | 2.985 / 3.42 | 56 | 0 | 16 |  |
| ctcourse | 12 | alert/facing | 1.1 / 2 | 0.137 | 0.007 | 103.027 | 0.002 | 0.076 | 4.3 / 5.6 | 232.6 | 4 / 5.3 | 4.6 / 6.1 | 15.656 | 3.809 / 4.617 | 151 | 1 | 310 |  |
| ctcourse | 16 | patrol/facing | 1.3 / 1.9 | 0.065 | 0.009 | 105.672 | 0 | 0.082 | 5.5 / 6.9 | 181.8 | 5.2 / 6.7 | 5.8 / 7 | 15.918 | 4.511 / 5.454 | 151 | 0 | 360 |  |
| ctcourse | 16 | patrol/away | - | - | - | - | - | - | 4.9 / 8.4 | 204.1 | 4.7 / 8 | 6 / 8.6 | 15.79 | 3.429 / 4.393 | 56 | 0 | 16 |  |
| ctcourse | 16 | alert/facing | 2.3 / 3.8 | 0.218 | 0.012 | 103.665 | 0.002 | 0.143 | 8.1 / 11.2 | 123.5 | 7.7 / 10.7 | 8.3 / 11.4 | 15.899 | 5.07 / 6.389 | 169 | 1 | 394 |  |
| ctcourse | 24 | patrol/facing | 1.8 / 2.9 | 0.086 | 0.012 | 107.143 | 0 | 0.113 | 6.3 / 8.1 | 158.7 | 6 / 7.8 | 6.4 / 8.2 | 16.037 | 4.809 / 5.813 | 167 | 0 | 512 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 4 / 5.1 | 250 | 3.7 / 4.8 | 4.3 / 5.3 | 15.816 | 3.383 / 3.837 | 56 | 0 | 16 |  |
| ctcourse | 24 | alert/facing | 1.3 / 2.7 | 0.171 | 0.01 | 104.982 | 0.002 | 0.119 | 6.5 / 8.9 | 153.8 | 6.2 / 8.6 | 6.6 / 9.2 | 15.888 | 4.693 / 5.552 | 191 | 1 | 516 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.042 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim 0.015, GPU 0.081, draws 5.667.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.063 ms, of it AI 0.013 (perceive 0.001), frame CPU (sim frames) 0.204, CPU per 1/60 s sim -0.016, GPU 0.099, draws 7.875.

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.046 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.129, CPU per 1/60 s sim 0.016, GPU 0.065, draws 2.167.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.029 ms, of it AI 0.007 (perceive 0.000), frame CPU (sim frames) 0.150, CPU per 1/60 s sim -0.006, GPU 0.050, draws 3.167.

<!-- guard-cap:results:end -->
