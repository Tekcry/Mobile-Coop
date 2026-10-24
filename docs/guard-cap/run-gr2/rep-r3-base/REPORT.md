# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:21:59.949Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.7 | 0.002 | 0 | 103.808 | 0 | 0.03 | 1.8 / 17 | 555.6 | 1.7 / 16.7 | 2.6 / 6.5 | 16.068 | 3.693 / 3.793 | 104 | 1 | 121 |  |
| sectorops | 0 | alert/facing | 0.5 / 0.9 | 0.003 | 0 | 103.813 | 0 | 0.031 | 2.1 / 16.6 | 476.2 | 1.9 / 16.4 | 2.8 / 14.2 | 15.961 | 3.636 / 3.918 | 104 | 1 | 122 |  |
| sectorops | 24 | patrol/facing | 1.3 / 1.9 | 0.107 | 0.016 | 110.738 | 0 | 0.071 | 5.3 / 6.7 | 188.7 | 5.1 / 6.5 | 5.8 / 6.8 | 15.997 | 4.92 / 5.911 | 214 | 1 | 155 |  |
| sectorops | 24 | alert/facing | 1.8 / 2.5 | 0.238 | 0.02 | 113.755 | 0.025 | 0.104 | 6.1 / 7.5 | 163.9 | 5.5 / 6.9 | 6.2 / 7.2 | 15.211 | 5.67 / 6.49 | 245 | 5 | 205 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.033 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.133, CPU per 1/60 s sim -0.003, GPU 0.051, draws 4.583.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.054 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim -0.031, GPU 0.085, draws 5.875.

<!-- guard-cap:results:end -->
