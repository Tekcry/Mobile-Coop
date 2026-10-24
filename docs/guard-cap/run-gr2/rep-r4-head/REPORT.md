# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:24:33.481Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.6 | 0.003 | 0 | 103.813 | 0 | 0.029 | 1.9 / 3.6 | 526.3 | 1.7 / 3.4 | 2.4 / 4.6 | 17.846 | 3.616 / 3.767 | 98 | 1 | 122 | 1 |
| sectorops | 0 | alert/facing | 0.5 / 0.7 | 0.003 | 0 | 103.808 | 0 | 0.028 | 1.7 / 19.3 | 588.2 | 1.6 / 19.1 | 2.5 / 4.4 | 16.028 | 3.722 / 3.962 | 98 | 1 | 122 |  |
| sectorops | 24 | patrol/facing | 1.4 / 2 | 0.104 | 0.012 | 110.718 | 0 | 0.075 | 5.2 / 6.4 | 192.3 | 4.9 / 6.2 | 5.5 / 6.6 | 15.986 | 4.781 / 5.718 | 230 | 3 | 160 |  |
| sectorops | 24 | alert/facing | 1.7 / 2.4 | 0.235 | 0.02 | 113.732 | 0.022 | 0.102 | 6.3 / 7.7 | 158.7 | 5.8 / 7 | 6.4 / 7.3 | 15.233 | 5.795 / 6.465 | 256 | 5 | 230 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.037 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.129, CPU per 1/60 s sim -0.077, GPU 0.049, draws 5.500.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.163, CPU per 1/60 s sim -0.033, GPU 0.086, draws 6.583.

<!-- guard-cap:results:end -->
