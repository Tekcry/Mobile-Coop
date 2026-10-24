# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:05:44.048Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.8 | 0.004 | 0 | 103.813 | 0 | 0.032 | 1.7 / 3.2 | 588.2 | 1.6 / 3 | 2.2 / 4.2 | 18.778 | 3.603 / 3.725 | 98 | 1 | 121 | 1 |
| sectorops | 0 | alert/facing | 0.5 / 0.7 | 0.003 | 0 | 103.808 | 0 | 0.023 | 1.9 / 19.4 | 526.3 | 1.8 / 19.2 | 2.8 / 10.6 | 15.991 | 3.578 / 3.718 | 98 | 1 | 122 |  |
| sectorops | 24 | patrol/facing | 1.3 / 1.7 | 0.101 | 0.015 | 110.732 | 0 | 0.069 | 4.8 / 5.9 | 208.3 | 4.6 / 5.7 | 5.2 / 6 | 15.996 | 4.461 / 5.435 | 213 | 3 | 155 |  |
| sectorops | 24 | alert/facing | 1.7 / 2.3 | 0.224 | 0.014 | 113.746 | 0.022 | 0.108 | 6 / 7.4 | 166.7 | 5.5 / 6.7 | 6.2 / 7.1 | 15.167 | 5.747 / 6.418 | 243 | 4 | 212 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.033 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.125, CPU per 1/60 s sim -0.116, GPU 0.036, draws 4.792.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim -0.034, GPU 0.090, draws 6.042.

<!-- guard-cap:results:end -->
