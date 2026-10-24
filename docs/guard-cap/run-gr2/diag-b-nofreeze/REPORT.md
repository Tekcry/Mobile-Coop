# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T08:43:46.865Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| warehouseOps:sector&sectorGuards=0&guardfreeze=0 | 0 | alert/facing | 0.5 / 0.7 | 0.004 | 0 | 103.813 | 0 | 0.034 | 2.2 / 4.1 | 454.5 | 2 / 3.9 | 2.9 / 4.6 | 16.468 | 3.377 / 3.54 | 98 | 1 | 121 |  |
| warehouseOps:sector&sectorGuards=0&guardfreeze=0 | 24 | alert/facing | 2.1 / 2.9 | 0.228 | 0.019 | 113.73 | 0.037 | 0.117 | 6.9 / 8.7 | 144.9 | 6.2 / 8.1 | 6.9 / 8.5 | 15.234 | 5.6 / 6.374 | 222 | 4 | 220 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, warehouseOps:sector&sectorGuards=0&guardfreeze=0 alert/facing (N 0 -> 24): sim 0.067 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.167, CPU per 1/60 s sim -0.051, GPU 0.093, draws 5.167.

<!-- guard-cap:results:end -->
