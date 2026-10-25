# guard-cap run 41003 (master 6c3f4a87, laptop 4189 alone, E2E_GPU=1)

Full cells: campus 0 / 12 / 16 / 24 / 32 and sectorops 12 / 16 / 32, each patrol / away / alert. 24 cells ok, 0 errors.

| Map x 32 | Cell | Frame med | CPU | GPU | Draws |
| --- | --- | --- | --- | --- | --- |
| campus | away | 4.8 ms (208 fps) | 4.6 | 3.8 | 91 |
| campus | alert | 12.7 ms (79 fps) | 12.0 | 9.3 | 446 |
| sectorops | away | 5.5 ms (182 fps) | 5.2 | 4.2 | 119 |
| sectorops | alert | 11.5 ms (87 fps) | 10.8 | 8.2 | 321 |

Campus 32 alert 12.7 ms vs 13.1 ms on 41002 (same cell): within noise. Per-cell detail: `campus/`, `so/`.
