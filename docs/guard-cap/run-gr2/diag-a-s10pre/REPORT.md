# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T08:25:00.973Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | alert/facing | 0.5 / 0.8 | 0.004 | 0 | 103.813 | 0 | 0.03 | 2 / 3.7 | 500 | 1.8 / 3.4 | 2.5 / 4.4 | 17.462 | 3.602 / 3.859 | 98 | 1 | 122 |  |
| sectorops | 24 | alert/facing | 1.7 / 2.6 | 0.24 | 0.019 | 113.949 | 0.03 | 0.101 | 5.8 / 7.3 | 172.4 | 5.3 / 6.7 | 5.9 / 7.2 | 15.088 | 5.405 / 6.097 | 200 | 5 | 194 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.142, CPU per 1/60 s sim -0.099, GPU 0.075, draws 4.250.

<!-- guard-cap:results:end -->
