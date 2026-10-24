# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:27:31.499Z (version 4.88.3, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 0.5 / 0.7 | 0.005 | 0 | 103.808 | 0 | 0.031 | 2 / 3.8 | 500 | 1.8 / 3.5 | 2.6 / 4.4 | 17.172 | 3.645 / 3.791 | 104 | 1 | 122 |  |
| sectorops | 0 | alert/facing | 0.5 / 0.8 | 0.003 | 0 | 103.813 | 0 | 0.024 | 1.7 / 4.1 | 588.2 | 1.6 / 3.8 | 2.2 / 4.1 | 18.688 | 3.714 / 3.88 | 104 | 1 | 121 | 1 |
| sectorops | 24 | patrol/facing | 1.2 / 1.6 | 0.106 | 0.013 | 110.728 | 0 | 0.07 | 5.1 / 6.2 | 196.1 | 4.9 / 6 | 5.5 / 6.3 | 16.018 | 4.781 / 5.74 | 214 | 1 | 155 |  |
| sectorops | 24 | alert/facing | 1.8 / 2.6 | 0.265 | 0.021 | 113.85 | 0.025 | 0.112 | 6.4 / 7.8 | 156.3 | 5.9 / 7.1 | 6.5 / 7.4 | 15.242 | 6.026 / 6.662 | 254 | 4 | 211 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 0 -> 24): sim 0.029 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.121, CPU per 1/60 s sim -0.048, GPU 0.047, draws 4.583.

Per added guard, sectorops alert/facing (N 0 -> 24): sim 0.054 ms, of it AI 0.011 (perceive 0.001), frame CPU (sim frames) 0.179, CPU per 1/60 s sim -0.144, GPU 0.096, draws 6.250.

<!-- guard-cap:results:end -->
