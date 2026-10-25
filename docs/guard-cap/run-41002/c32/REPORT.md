# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T22:39:48.454Z (version 4.100.2, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 32 | patrol/facing | 2.4 / 4.9 | 0.239 | 0.018 | 106.361 | 0 | 0.142 | 11 / 17 | 90.9 | 10.7 / 16.6 | 11.6 / 17 | 16.229 | 7.587 / 10.499 | 380 | 1 | 356 |  |
| campus | 32 | alert/facing | 2.3 / 5.3 | 0.368 | 0.033 | 116.187 | 0.022 | 0.167 | 13.1 / 19.9 | 76.3 | 12.4 / 19.2 | 13.3 / 19.6 | 15.863 | 9.701 / 13.433 | 471 | 4 | 433 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

<!-- guard-cap:results:end -->
