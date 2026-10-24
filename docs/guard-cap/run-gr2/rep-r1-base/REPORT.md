# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T08:48:43.831Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.7 | 0.004 | 0 | 103.813 | 0 | 0.031 | 1.9 / 18.6 | 526.3 | 1.8 / 18 | 2.8 / 4.9 | 15.897 | 3.622 / 3.922 | 104 | 1 | 122 |  |
| sectorops | 0 | alert/facing | 0.6 / 0.8 | 0.004 | 0 | 103.813 | 0 | 0.027 | 1.9 / 18.8 | 526.3 | 1.7 / 18.5 | 2.6 / 3.8 | 15.994 | 3.71 / 3.885 | 104 | 1 | 121 |  |
| sectorops | 24 | patrol/facing | 1.3 / 1.9 | 0.111 | 0.016 | 110.713 | 0 | 0.077 | 5.2 / 6.6 | 192.3 | 5 / 6.3 | 5.6 / 6.8 | 16.039 | 4.922 / 6.013 | 237 | 3 | 155 |  |
| sectorops | 24 | alert/facing | 1.8 / 2.7 | 0.212 | 0.018 | 113.92 | 0.022 | 0.094 | 6 / 7.5 | 166.7 | 5.5 / 6.8 | 6.1 / 7.2 | 15.226 | 5.654 / 6.426 | 255 | 5 | 201 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.033 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.117, CPU per 1/60 s sim 0.006, GPU 0.054, draws 5.542.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.050 ms, of it AI 0.009 (perceive 0.001), frame CPU (sim frames) 0.146, CPU per 1/60 s sim -0.032, GPU 0.081, draws 6.292.

<!-- guard-cap:results:end -->
