# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T20:18:01.711Z (version 4.100.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 12 | patrol/facing | 1.5 / 2.7 | 0.065 | 0.006 | 108.633 | 0 | 0.052 | 4.3 / 5.8 | 232.6 | 4.1 / 5.5 | 4.7 / 6.1 | 15.89 | 4.157 / 5.436 | 164 | 2 | 140 |  |
| sectorops | 12 | patrol/away | - | - | - | - | - | - | 3.1 / 4 | 322.6 | 2.9 / 3.8 | 3.6 / 4.1 | 15.721 | 2.826 / 3.55 | 108 | 4 | 31 |  |
| sectorops | 12 | alert/facing | 1.2 / 1.7 | 0.187 | 0.011 | 111.939 | 0.06 | 0.063 | 5.3 / 6.6 | 188.7 | 4.8 / 5.9 | 5.4 / 6.3 | 14.977 | 5.211 / 6.179 | 217 | 5 | 191 |  |
| sectorops | 16 | patrol/facing | 1.7 / 2.6 | 0.076 | 0.009 | 109.373 | 0 | 0.053 | 4.5 / 5.6 | 222.2 | 4.3 / 5.4 | 4.9 / 5.8 | 15.915 | 4.232 / 5.211 | 192 | 3 | 146 |  |
| sectorops | 16 | patrol/away | - | - | - | - | - | - | 3.5 / 4.5 | 285.7 | 3.3 / 4.2 | 4 / 4.6 | 15.8 | 3.142 / 3.807 | 113 | 5 | 31 |  |
| sectorops | 16 | alert/facing | 1.5 / 2.3 | 0.227 | 0.014 | 112.627 | 0.108 | 0.083 | 5.6 / 6.9 | 178.6 | 5.1 / 6.2 | 5.8 / 6.6 | 15.156 | 5.384 / 6.233 | 236 | 6 | 191 |  |
| sectorops | 32 | patrol/facing | 1.8 / 3.2 | 0.145 | 0.019 | 111.913 | 0 | 0.088 | 6.4 / 7.7 | 156.3 | 6.2 / 7.4 | 6.7 / 7.7 | 16.122 | 5.416 / 6.049 | 263 | 3 | 176 |  |
| sectorops | 32 | patrol/away | - | - | - | - | - | - | 4 / 5.3 | 250 | 3.8 / 5 | 4.6 / 5.5 | 15.89 | 3.501 / 4.048 | 116 | 4 | 31 |  |
| sectorops | 32 | alert/facing | 2.3 / 3.4 | 0.324 | 0.019 | 115.556 | 0.115 | 0.125 | 7.4 / 9 | 135.1 | 6.9 / 8.3 | 7.5 / 8.6 | 15.419 | 6.133 / 6.793 | 289 | 6 | 256 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, sectorops patrol/facing (N 12 -> 32): sim 0.015 ms, of it AI 0.004 (perceive 0.001), frame CPU (sim frames) 0.100, CPU per 1/60 s sim 0.012, GPU 0.063, draws 4.950.

Per added guard, sectorops alert/facing (N 12 -> 32): sim 0.055 ms, of it AI 0.007 (perceive 0.000), frame CPU (sim frames) 0.105, CPU per 1/60 s sim 0.022, GPU 0.046, draws 3.600.

<!-- guard-cap:results:end -->
