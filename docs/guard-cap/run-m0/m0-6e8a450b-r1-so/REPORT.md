# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:32:07.440Z (version 4.93.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 12 | patrol/facing | 1.1 / 1.7 | 0.062 | 0.007 | 108.658 | 0 | 0.05 | 4.1 / 5.2 | 243.9 | 3.9 / 5 | 4.6 / 5.4 | 15.884 | 4.08 / 5.016 | 185 | 3 | 140 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 3 / 4 | 333.3 | 2.9 / 3.8 | 3.5 / 4.2 | 15.76 | 2.873 / 3.69 | 135 | 4 | 31 |  |
| sectorops | 12 | alert/facing | 1.2 / 1.6 | 0.143 | 0.013 | 111.252 | 0.013 | 0.073 | 5.1 / 6.3 | 196.1 | 4.5 / 5.7 | 5.2 / 6 | 14.978 | 4.894 / 5.918 | 194 | 6 | 180 |  |
| sectorops | 16 | patrol/facing | 1 / 1.5 | 0.073 | 0.008 | 109.368 | 0 | 0.052 | 4.5 / 5.6 | 222.2 | 4.3 / 5.4 | 4.9 / 5.7 | 15.935 | 4.299 / 5.228 | 209 | 3 | 145 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 3.2 / 4.2 | 312.5 | 3 / 4 | 3.7 / 4.4 | 15.78 | 2.963 / 3.763 | 136 | 5 | 31 |  |
| sectorops | 16 | alert/facing | 1.4 / 1.9 | 0.179 | 0.014 | 113.02 | 0.018 | 0.08 | 5.4 / 6.8 | 185.2 | 4.9 / 6.1 | 5.5 / 6.4 | 14.99 | 5.218 / 6.099 | 224 | 6 | 205 |  |
| sectorops | 32 | patrol/facing | 1.6 / 2.2 | 0.147 | 0.02 | 111.977 | 0 | 0.09 | 6 / 7.2 | 166.7 | 5.8 / 7 | 6.4 / 7.3 | 16.066 | 5.492 / 6.005 | 276 | 3 | 170 |  |
| sectorops | 32 | patrol/away | - | - | - | - | - | - | 3.7 / 4.8 | 270.3 | 3.5 / 4.6 | 4.3 / 5 | 15.848 | 3.353 / 3.943 | 135 | 4 | 31 |  |
| sectorops | 32 | alert/facing | 2.2 / 3.1 | 0.249 | 0.018 | 115.176 | 0.027 | 0.127 | 7 / 8.6 | 142.9 | 6.4 / 7.8 | 7 / 8.2 | 15.204 | 6.125 / 6.808 | 269 | 6 | 217 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 12 -> 32): sim 0.025 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.090, CPU per 1/60 s sim 0.009, GPU 0.071, draws 4.550.

Per added guard, sectorops alert/facing (N 12 -> 32): sim 0.050 ms, of it AI 0.005 (perceive 0.000), frame CPU (sim frames) 0.090, CPU per 1/60 s sim 0.011, GPU 0.062, draws 3.750.

<!-- guard-cap:results:end -->
