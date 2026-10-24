# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T08:45:44.248Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | alert/facing | 0.5 / 0.7 | 0.004 | 0 | 103.808 | 0 | 0.031 | 2 / 16.5 | 500 | 1.9 / 16.1 | 2.7 / 4.4 | 16.069 | 3.578 / 3.851 | 98 | 1 | 122 |  |
| sectorops | 24 | alert/facing | 1.6 / 2.5 | 0.231 | 0.02 | 114.049 | 0.03 | 0.097 | 6 / 7.4 | 166.7 | 5.5 / 6.8 | 6.2 / 7.2 | 15.216 | 5.425 / 6.072 | 216 | 5 | 204 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.046 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.146, CPU per 1/60 s sim -0.036, GPU 0.077, draws 4.917.

<!-- guard-cap:results:end -->
