# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:46:41.257Z (version 4.93.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 12 | patrol/facing | 3.1 / 5.1 | 0.12 | 0.011 | 108.652 | 0 | 0.107 | 4.9 / 8 | 204.1 | 4.7 / 7.7 | 5.3 / 8.6 | 15.929 | 4.491 / 6.678 | 183 | 2 | 140 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 6.1 / 11.4 | 163.9 | 5.8 / 11 | 7.9 / 12.1 | 15.949 | 4.9 / 7.576 | 135 | 4 | 31 |  |
| sectorops | 12 | alert/facing | 3.1 / 6.1 | 0.271 | 0.021 | 112.092 | 0.018 | 0.12 | 7.6 / 14.1 | 131.6 | 6.8 / 13.1 | 8.1 / 14.2 | 15.136 | 6.737 / 10.379 | 201 | 5 | 204 |  |
| sectorops | 16 | patrol/facing | 2.3 / 5.1 | 0.144 | 0.021 | 109.392 | 0 | 0.117 | 5.4 / 10 | 185.2 | 5.2 / 9.7 | 5.8 / 10.6 | 15.989 | 4.818 / 7.663 | 209 | 3 | 145 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 3.9 / 6.8 | 256.4 | 3.7 / 6.5 | 4.4 / 7.9 | 15.794 | 3.333 / 5.265 | 135 | 4 | 31 |  |
| sectorops | 16 | alert/facing | 1.9 / 4.2 | 0.274 | 0.023 | 112.441 | 0.015 | 0.154 | 7 / 12.2 | 142.9 | 6.5 / 11.3 | 7.3 / 12.4 | 15.319 | 6.376 / 8.959 | 239 | 6 | 199 |  |
| sectorops | 32 | patrol/facing | 3.6 / 6.6 | 0.214 | 0.028 | 111.907 | 0 | 0.127 | 7.5 / 12.1 | 133.3 | 7.2 / 11.8 | 7.7 / 12.4 | 16.143 | 5.957 / 7.834 | 242 | 1 | 170 |  |
| sectorops | 32 | patrol/away | - | - | - | - | - | - | 4.6 / 7.6 | 217.4 | 4.3 / 7.3 | 5 / 8.5 | 15.856 | 3.787 / 5.209 | 136 | 5 | 31 |  |
| sectorops | 32 | alert/facing | 2.8 / 5.7 | 0.417 | 0.035 | 115.124 | 0.025 | 0.173 | 8.5 / 14.2 | 117.6 | 7.8 / 13.3 | 8.4 / 14.3 | 15.397 | 6.831 / 8.869 | 262 | 6 | 231 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 12 -> 32): sim 0.025 ms, of it AI 0.005 (perceive 0.001), frame CPU (sim frames) 0.120, CPU per 1/60 s sim 0.011, GPU 0.073, draws 2.950.

Per added guard, sectorops alert/facing (N 12 -> 32): sim -0.015 ms, of it AI 0.007 (perceive 0.001), frame CPU (sim frames) 0.015, CPU per 1/60 s sim 0.013, GPU 0.005, draws 3.050.

<!-- guard-cap:results:end -->
