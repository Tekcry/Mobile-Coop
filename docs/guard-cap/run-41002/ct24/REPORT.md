# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T22:38:19.816Z (version 4.100.2, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ctcourse | 24 | patrol/facing | 3.1 / 5.5 | 0.169 | 0.021 | 105.438 | 0.014 | 0.091 | 9.5 / 15.2 | 105.3 | 9.2 / 14.8 | 10.1 / 15.8 | 16.179 | 7.364 / 9.921 | 382 | 4 | 290 |  |
| ctcourse | 24 | alert/facing | 2.2 / 4.9 | 0.298 | 0.025 | 110.879 | 0.189 | 0.111 | 10.6 / 16.6 | 94.3 | 10 / 15.8 | 10.6 / 16.4 | 15.874 | 8.607 / 12.058 | 457 | 7 | 363 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

<!-- guard-cap:results:end -->
