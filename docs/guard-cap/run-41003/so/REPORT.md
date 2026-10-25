# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T23:11:53.592Z (version 4.100.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 12 | patrol/facing | 2.3 / 3.9 | 0.135 | 0.012 | 108.638 | 0 | 0.114 | 5.2 / 9.2 | 192.3 | 5 / 8.8 | 6.3 / 9.8 | 15.952 | 4.868 / 7.065 | 171 | 3 | 141 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 3.6 / 6.2 | 277.8 | 3.4 / 6 | 4.3 / 6.7 | 15.762 | 3.105 / 4.383 | 108 | 4 | 31 |  |
| sectorops | 12 | alert/facing | 2.4 / 4 | 0.244 | 0.018 | 110.385 | 0.058 | 0.093 | 6.7 / 10.8 | 149.3 | 6 / 9.9 | 6.8 / 10.4 | 15.049 | 5.956 / 7.724 | 211 | 6 | 188 |  |
| sectorops | 16 | patrol/facing | 1.7 / 3.8 | 0.124 | 0.016 | 109.392 | 0 | 0.093 | 7 / 10.5 | 142.9 | 6.7 / 10.2 | 7.7 / 10.8 | 16.015 | 5.837 / 7.635 | 171 | 1 | 146 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 4.4 / 7.3 | 227.3 | 4.1 / 6.9 | 5 / 7.7 | 15.827 | 3.71 / 4.929 | 112 | 4 | 31 |  |
| sectorops | 16 | alert/facing | 1.8 / 4.2 | 0.252 | 0.014 | 112.441 | 0.1 | 0.093 | 9 / 12.9 | 111.1 | 8.3 / 12 | 9.3 / 12.4 | 15.335 | 7.444 / 9.564 | 235 | 6 | 199 |  |
| sectorops | 32 | patrol/facing | 2.9 / 5.2 | 0.238 | 0.031 | 111.963 | 0 | 0.135 | 9.7 / 14.8 | 103.1 | 9.5 / 14.4 | 10.4 / 15.2 | 16.194 | 6.931 / 9.648 | 263 | 3 | 176 |  |
| sectorops | 32 | patrol/away | - | - | - | - | - | - | 5.5 / 9.1 | 181.8 | 5.2 / 8.7 | 6.2 / 9.6 | 15.93 | 4.173 / 5.68 | 119 | 5 | 31 |  |
| sectorops | 32 | alert/facing | 2.5 / 5.5 | 0.464 | 0.032 | 115.159 | 0.127 | 0.167 | 11.5 / 16.8 | 87 | 10.8 / 15.9 | 11.6 / 16.4 | 15.642 | 8.196 / 11.128 | 321 | 6 | 280 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 12 -> 32): sim 0.030 ms, of it AI 0.005 (perceive 0.001), frame CPU (sim frames) 0.205, CPU per 1/60 s sim 0.012, GPU 0.103, draws 4.600.

Per added guard, sectorops alert/facing (N 12 -> 32): sim 0.005 ms, of it AI 0.011 (perceive 0.001), frame CPU (sim frames) 0.240, CPU per 1/60 s sim 0.030, GPU 0.112, draws 5.500.

<!-- guard-cap:results:end -->
