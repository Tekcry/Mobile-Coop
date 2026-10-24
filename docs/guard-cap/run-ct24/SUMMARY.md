# ctcourse 24 guards, patrol: repeat x3 (master fc4dc9ab, 4.99.1, laptop 4189, hardware GPU)

M0 read frame CPU p95 15.45 ms once with a hitch; this repeats that cell 3 times (request ...-fc4dc9ab-f4a0, Test Runner).

| run | frame ms med / p95 | fps | frame CPU med / p95 | render() CPU med / p95 |
| --- | --- | --- | --- | --- |
| r1 | 8.4 / 14.9 | 119 | 8.2 / 14.2 | 6 / 10.1 |
| r2 | 8.1 / 19.2 | 123.5 | 7.9 / 18.7 | 5.7 / 13.5 |
| r3 | 7.2 / 8.8 | 138.9 | 7 / 8.6 | 5.1 / 6.3 |

Medians are steady (frame CPU 7.0-8.2 ms). p95 is noisy (8.6-18.7), and 2 of 3 runs read over the 12 ms limit. The
M0 reading was not a one-off: ctcourse 24 patrol has tail spikes, not a raised median. render() p95 follows frame CPU
p95, so the spikes sit at least partly in render. Next: guard-render PLAN2 should include ctcourse 24 patrol with campus 32.
