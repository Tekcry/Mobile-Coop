# guard-cap run 4100 (laptop 4189, GPU, alone)

Train 74 head 3be7d1a2 (4.100.0), run 20261024T173652-night-shift-test-run-3be7d1a2-0337, 2026-10-25 ~07:05-07:19.
`--warm=5 --secs=10`. All 35 cells ok, 0 errors.

| Cell | frame med | cpu | gpu | draws | shadow passes / maps | sim step med / p95 |
| --- | --- | --- | --- | --- | --- | --- |
| campus 32 patrol/away | 3.5 ms | 3.3 | 3.16 | 91 | 2 / 5 | - |
| campus 32 alert | 8.6 ms | 8.0 | 6.05 | 456 | 4 / 7 | 1.9 / 2.8 |
| campus 32 alert r2 | 8.5 ms | 8.0 | 6.08 | 454 | 4 / 7 | 2.7 / 3.8 |
| campus 32 alert r3 | 8.5 ms | 8.0 | 5.74 | 447 | 4 / 7 | 1.9 / 2.5 |
| ctcourse 24 patrol/away | 4.4 ms | 4.2 | 4.54 | 188 | 4 / 8 | - |
| ctcourse 24 alert | 7.3 ms | 6.8 | 6.85 | 433 | 6 / 10 | 2.0 / 3.1 |
| sectorops 32 patrol/away | 4.0 ms | 3.8 | 3.50 | 116 | 4 / 7 | - |
| sectorops 32 alert | 7.4 ms | 6.9 | 6.13 | 289 | 6 / 9 | 2.3 / 3.4 |

Read: campus 32 alert is steady across 3 repeats (frame 8.5-8.6 ms, cpu 8.0, ~450 draws): the alert cost is render
CPU from draw count (~5x patrol), not AI (ai 0.2-0.3 ms). This is the guard-render PLAN2 target. Full cells per map in
the sub-folders (RESULTS.md / REPORT.md).
