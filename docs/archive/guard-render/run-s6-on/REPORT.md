# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-23T00:23:54.318Z (version 4.68.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.7 / 1.6 | 0.002 | 0 | 103.808 | 0 | 0.042 | 3.1 / 6.7 | 322.6 | 2.9 / 6.3 | 4.1 / 7.5 | 15.699 | 3.509 / 6.067 | 104 | 1 | 123 |  |
| sectorops | 0 | patrol/away | - | - | - | - | - | - | 2.7 / 6.1 | 370.4 | 2.4 / 5.6 | 3.7 / 7.2 | 15.392 | 2.752 / 3.97 | 75 | 1 | 20 |  |
| sectorops | 0 | alert/facing | 0.4 / 0.7 | 0.002 | 0 | 103.808 | 0 | 0.026 | 2.9 / 7.2 | 344.8 | 2.7 / 6.8 | 3.8 / 8 | 15.77 | 3.484 / 5.513 | 104 | 1 | 124 |  |
| sectorops | 12 | patrol/facing | 1.3 / 3.3 | 0.05 | 0.009 | 109.062 | 0 | 0.07 | 5.7 / 10.7 | 175.4 | 5.4 / 10.5 | 6.4 / 11.9 | 16.012 | 4.605 / 6.973 | 179 | 1 | 295 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 3.8 / 5 | 263.2 | 3.6 / 4.8 | 4.3 / 5.1 | 15.809 | 3.265 / 4.028 | 131 | 1 | 24 |  |
| sectorops | 12 | alert/facing | 1.4 / 2.3 | 0.21 | 0.01 | 111.065 | 0.005 | 0.102 | 5.5 / 6.9 | 181.8 | 4.9 / 6.3 | 5.5 / 7.1 | 15.076 | 4.928 / 5.837 | 212 | 3 | 318 |  |
| sectorops | 16 | patrol/facing | 1.2 / 1.9 | 0.053 | 0.011 | 109.798 | 0 | 0.079 | 5 / 6.3 | 200 | 4.8 / 6 | 5.2 / 6.4 | 15.944 | 4.418 / 5.453 | 203 | 1 | 341 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 4.4 / 7.4 | 227.3 | 4.2 / 7.1 | 4.7 / 8.5 | 15.861 | 3.503 / 4.562 | 147 | 1 | 24 |  |
| sectorops | 16 | alert/facing | 1.6 / 4.5 | 0.254 | 0.024 | 111.429 | 0.013 | 0.124 | 7.2 / 13.9 | 138.9 | 6.5 / 13.1 | 7.4 / 13.9 | 15.373 | 5.651 / 7.927 | 221 | 3 | 400 |  |
| sectorops | 24 | patrol/facing | 1.7 / 4.4 | 0.083 | 0.017 | 111.298 | 0 | 0.089 | 7.2 / 11.7 | 138.9 | 7 / 11.4 | 7.5 / 12.5 | 16.151 | 5.096 / 6.879 | 239 | 1 | 493 |  |
| sectorops | 24 | patrol/away | - | - | - | - | - | - | 5.4 / 6.6 | 185.2 | 5.2 / 6.4 | 5.7 / 6.8 | 15.994 | 3.319 / 4.13 | 167 | 1 | 24 |  |
| sectorops | 24 | alert/facing | 1.9 / 3.3 | 0.226 | 0.018 | 113.329 | 0.02 | 0.124 | 8.1 / 9.8 | 123.5 | 7.4 / 9 | 7.8 / 9.5 | 15.316 | 5.585 / 6.511 | 271 | 3 | 617 |  |
| ctcourse | 0 | patrol/facing | 0.7 / 1.1 | 0.003 | 0 | 100.813 | 0 | 0.04 | 2.6 / 4 | 384.6 | 2.4 / 3.7 | 3.1 / 4.3 | 15.857 | 3.186 / 3.786 | 115 | 0 | 92 |  |
| ctcourse | 0 | patrol/away | - | - | - | - | - | - | 3 / 6 | 333.3 | 2.7 / 5.6 | 3.8 / 6.8 | 15.331 | 3.078 / 4.294 | 52 | 0 | 14 |  |
| ctcourse | 0 | alert/facing | 0.5 / 1 | 0.002 | 0 | 100.813 | 0 | 0.029 | 2.7 / 6 | 370.4 | 2.5 / 5.6 | 3.7 / 6.6 | 15.507 | 3.144 / 4.314 | 115 | 0 | 92 |  |
| ctcourse | 12 | patrol/facing | 0.9 / 1.5 | 0.045 | 0.007 | 104.912 | 0 | 0.056 | 4 / 5.3 | 250 | 3.8 / 5 | 4.5 / 5.5 | 15.788 | 3.832 / 4.683 | 143 | 0 | 284 |  |
| ctcourse | 12 | patrol/away | - | - | - | - | - | - | 3.4 / 4.8 | 294.1 | 3.1 / 4.5 | 3.8 / 5.1 | 15.605 | 3.243 / 3.738 | 56 | 0 | 16 |  |
| ctcourse | 12 | alert/facing | 0.9 / 1.4 | 0.123 | 0.008 | 103.01 | 0 | 0.06 | 4.2 / 5.4 | 238.1 | 4 / 5.1 | 4.4 / 5.9 | 15.634 | 3.893 / 4.824 | 151 | 1 | 298 |  |
| ctcourse | 16 | patrol/facing | 1.1 / 2.5 | 0.068 | 0.011 | 105.663 | 0 | 0.082 | 5.3 / 9.9 | 188.7 | 5 / 9.6 | 5.5 / 10.8 | 15.939 | 4.234 / 6.013 | 151 | 0 | 360 |  |
| ctcourse | 16 | patrol/away | - | - | - | - | - | - | 4 / 5.4 | 250 | 3.8 / 5.1 | 4.3 / 5.5 | 15.675 | 3.333 / 3.908 | 56 | 0 | 16 |  |
| ctcourse | 16 | alert/facing | 1.4 / 2.6 | 0.188 | 0.011 | 103.667 | 0.002 | 0.114 | 5.7 / 7.5 | 175.4 | 5.4 / 7.2 | 6 / 8.1 | 15.775 | 4.348 / 5.322 | 161 | 1 | 379 |  |
| ctcourse | 24 | patrol/facing | 1.4 / 2.2 | 0.08 | 0.013 | 107.152 | 0 | 0.097 | 6.3 / 7.7 | 158.7 | 6 / 7.5 | 6.5 / 7.8 | 16.071 | 4.761 / 5.593 | 167 | 0 | 512 |  |
| ctcourse | 24 | patrol/away | - | - | - | - | - | - | 4.1 / 5 | 243.9 | 3.8 / 4.8 | 4.4 / 5.1 | 15.849 | 3.342 / 3.765 | 56 | 0 | 16 |  |
| ctcourse | 24 | alert/facing | 1.7 / 3.2 | 0.163 | 0.009 | 105.02 | 0.003 | 0.102 | 6.5 / 8 | 153.8 | 6.3 / 7.6 | 6.7 / 8 | 15.959 | 4.635 / 5.38 | 187 | 1 | 503 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.042 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim 0.019, GPU 0.066, draws 5.625.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.063 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.167, CPU per 1/60 s sim -0.019, GPU 0.088, draws 6.958.

Per added guard, ctcourse patrol/facing (N 0 -> 24): sim 0.029 ms, of it AI 0.003 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim 0.009, GPU 0.066, draws 2.167.

Per added guard, ctcourse alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.007 (perceive 0.000), frame CPU (sim frames) 0.125, CPU per 1/60 s sim 0.019, GPU 0.062, draws 3.000.

<!-- guard-cap:results:end -->
