# Guard cap: report

## Results

<!-- guard-cap:results:start (scripts/guard-cap.mjs fills this block) -->

Filled 2026-10-24T09:54:13.097Z (version 4.93.0, hardware GPU, uncapped, gfx=epic, 1920x1080). Medians / p95 in ms; AI / perceive / physics: mean ms per 60 Hz step. Full numbers: `guard-cap.json`, `guard-cap.csv`, `RESULTS.md`.

| Map | N | Cell | Sim step med / p95 | AI manager | Perceive | Rays / step | findPath / step | Physics | Frame ms med / p95 | fps | Frame CPU | Frame CPU, sim frames | CPU per 1/60 s sim | GPU ms | Draws | Shadow passes | Active meshes | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| campus | 0 | patrol/facing | 0.8 / 1.8 | 0.006 | 0 | 103.822 | 0 | 0.028 | 4 / 7.5 | 250 | 3.8 / 7.2 | 4.3 / 7.8 | 15.768 | 3.687 / 6.788 | 267 | 2 | 300 |  |
| campus | 0 | patrol/away | - | - | - | - | - | - | 2.6 / 5.6 | 384.6 | 2.4 / 5.2 | 3.2 / 6.2 | 15.613 | 3.128 / 3.546 | 88 | 2 | 26 |  |
| campus | 0 | alert/facing | 0.4 / 0.9 | 0.002 | 0 | 103.808 | 0 | 0.032 | 4.3 / 7 | 232.6 | 4.1 / 6.7 | 4.6 / 7.4 | 15.763 | 3.87 / 6.248 | 267 | 2 | 300 |  |
| campus | 12 | patrol/facing | 2.2 / 4.2 | 0.119 | 0.008 | 105.518 | 0 | 0.089 | 6.1 / 10.4 | 163.9 | 5.9 / 10 | 6.3 / 10.5 | 16.026 | 5.192 / 6.905 | 341 | 2 | 323 |  |
| campus | 12 | patrol/away | - | - | - | - | - | - | 3.7 / 6.8 | 270.3 | 3.4 / 6.5 | 3.9 / 7.4 | 15.724 | 3.194 / 5.106 | 112 | 2 | 28 |  |
| campus | 12 | alert/facing | 1 / 1.8 | 0.177 | 0.015 | 111.977 | 0.02 | 0.08 | 6.4 / 9.1 | 156.3 | 5.9 / 8.4 | 6.3 / 9.6 | 15.232 | 5.582 / 7.259 | 338 | 4 | 411 |  |
| campus | 16 | patrol/facing | 1.7 / 4.1 | 0.098 | 0.006 | 105.543 | 0 | 0.071 | 6.5 / 10.4 | 153.8 | 6.2 / 10.1 | 6.7 / 10.8 | 16.051 | 5.379 / 6.936 | 361 | 2 | 331 |  |
| campus | 16 | patrol/away | - | - | - | - | - | - | 3.3 / 5.5 | 303 | 3.1 / 5.1 | 3.9 / 6.4 | 15.686 | 3.199 / 4.633 | 112 | 2 | 28 |  |
| campus | 16 | alert/facing | 1.5 / 2.6 | 0.195 | 0.015 | 112.098 | 0.015 | 0.079 | 7 / 10.5 | 142.9 | 6.5 / 9.9 | 6.9 / 10.9 | 15.429 | 5.985 / 7.792 | 401 | 4 | 383 |  |
| campus | 24 | patrol/facing | 2.5 / 5.5 | 0.14 | 0.009 | 105.75 | 0 | 0.092 | 7.4 / 10.9 | 135.1 | 7.2 / 10.7 | 7.6 / 11 | 16.137 | 5.144 / 6.598 | 402 | 2 | 346 |  |
| campus | 24 | patrol/away | - | - | - | - | - | - | 3.8 / 6.5 | 263.2 | 3.5 / 6.2 | 4.4 / 7.3 | 15.776 | 3.312 / 4.592 | 112 | 2 | 28 |  |
| campus | 24 | alert/facing | 1.7 / 3 | 0.242 | 0.02 | 114.265 | 0.013 | 0.097 | 8.2 / 11.8 | 122 | 7.7 / 11.2 | 8.1 / 12.3 | 15.597 | 6.235 / 7.841 | 419 | 4 | 398 |  |
| campus | 32 | patrol/facing | 2.3 / 3.7 | 0.189 | 0.013 | 106.157 | 0 | 0.118 | 8.4 / 12 | 119 | 8.1 / 11.6 | 8.6 / 12.1 | 16.182 | 5.618 / 7.27 | 437 | 2 | 359 |  |
| campus | 32 | patrol/away | - | - | - | - | - | - | 3.9 / 5.4 | 256.4 | 3.7 / 5.2 | 4.5 / 5.7 | 15.812 | 3.447 / 4.337 | 112 | 2 | 28 |  |
| campus | 32 | alert/facing | 1.9 / 2.8 | 0.334 | 0.027 | 116.18 | 0.018 | 0.122 | 9.2 / 12.8 | 108.7 | 8.7 / 12.1 | 9.1 / 12.7 | 15.68 | 6.752 / 8.669 | 487 | 4 | 408 |  |

Frame CPU, sim frames: frames that ran a 60 Hz step (uncapped, most frames run none). CPU per 1/60 s sim: all frame CPU ms over the steps run (the cost of a real-time second / 60, AI included). Flags: count of data-quality notes (listed in `RESULTS.md`).

Per added guard, campus patrol/facing (N 0 -> 32): sim 0.047 ms, of it AI 0.006 (perceive 0.000), frame CPU (sim frames) 0.134, CPU per 1/60 s sim 0.013, GPU 0.060, draws 5.313.

Per added guard, campus alert/facing (N 0 -> 32): sim 0.047 ms, of it AI 0.010 (perceive 0.001), frame CPU (sim frames) 0.141, CPU per 1/60 s sim -0.003, GPU 0.090, draws 6.875.

<!-- guard-cap:results:end -->
