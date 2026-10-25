# guard-cap run 41002 (master 833db92e, laptop 4189 alone, E2E_GPU=1)

| Map x guards | Cell | Frame med | CPU | GPU | Draws | Shadow passes / maps |
| --- | --- | --- | --- | --- | --- | --- |
| ctcourse x 24 | patrol | 9.5 ms (105 fps) | 9.2 | 7.4 | 382 | 4 / 8 |
| ctcourse x 24 | alert | 10.6 ms (94 fps) | 10.0 | 8.6 | 457 | 7 / 11 |
| campus x 32 | patrol | 11.0 ms (91 fps) | 10.7 | 7.6 | 380 | 1 / 4 |
| campus x 32 | alert | 13.1 ms (76 fps) | 12.4 | 9.7 | 471 | 4 / 7 |

Sim step med 2.2-3.1 ms, AI 0.1-0.3 ms in every cell. Campus 32 alert is still the worst cell (render CPU and draws).
Per-cell detail: `ct24/`, `c32/` (RESULTS.md, REPORT.md, csv, json).
