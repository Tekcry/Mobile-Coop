# gm-g8-cap cf5a2bf8: guard figures ON (guardmodels=1) vs OFF

Laptop RTX 4090, E2E_GPU=1, gfx=epic, 1920x1080, uncapped. Errors ON: ["campusops x 0: page.waitForFunction: Timeout 180000ms exceeded.","campusops x 12: page.waitForFunction: Timeout 180000ms exceeded.","campusops x 24: page.waitForFunction: Timeout 180000ms exceeded."]

| map | N | cell | frame med/p95 ON | OFF | gpu ON | OFF | draws ON | OFF | tris M ON | OFF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 1.8 / 4.1 | 1.8 / 3.7 | 3.194 | 3.294 | 104 | 104 | 0.494 | 0.494 |
| sectorops | 0 | patrol/away | 1.5 / 2.6 | 1.7 / 3.1 | 2.625 | 2.41 | 77 | 77 | 0.473 | 0.473 |
| sectorops | 0 | alert/facing | 1.7 / 4.1 | 1.9 / 12.8 | 3.297 | 3.058 | 104 | 104 | 0.494 | 0.494 |
| sectorops | 12 | patrol/facing | 4.6 / 5.7 | 4.5 / 5.9 | 4.264 | 4.082 | 189 | 187 | 1.058 | 1.489 |
| sectorops | 12 | patrol/away | 3.7 / 4.7 | 3.9 / 5 | 3.401 | 3.41 | 160 | 155 | 1.035 | 1.317 |
| sectorops | 12 | alert/facing | 5.7 / 7 | 5.6 / 6.9 | 5.128 | 5.002 | 223 | 217 | 1.076 | 1.776 |
| sectorops | 24 | patrol/facing | 7.2 / 8.6 | 6.6 / 8 | 5.387 | 5.128 | 260 | 258 | 1.417 | 2.481 |
| sectorops | 24 | patrol/away | 5.8 / 7 | 5.3 / 6.4 | 4.494 | 4.277 | 234 | 219 | 1.658 | 2.162 |
| sectorops | 24 | alert/facing | 9 / 11.1 | 7.7 / 9.3 | 5.934 | 5.436 | 301 | 277 | 1.445 | 2.587 |
| ctcourse | 0 | patrol/facing | 1.7 / 3.3 | 1.7 / 3.3 | 2.644 | 2.669 | 131 | 131 | 0.34 | 0.34 |
| ctcourse | 0 | patrol/away | 1.3 / 2.2 | 1.3 / 2.3 | 2.567 | 2.56 | 60 | 68 | 0.269 | 0.334 |
| ctcourse | 0 | alert/facing | 2 / 3.5 | 1.6 / 3.3 | 2.875 | 2.69 | 131 | 131 | 0.34 | 0.34 |
| ctcourse | 12 | patrol/facing | 4.9 / 6.1 | 4.4 / 5.5 | 4.181 | 3.884 | 165 | 165 | 0.645 | 0.866 |
| ctcourse | 12 | patrol/away | 3.3 / 4.2 | 3.2 / 4.2 | 3.182 | 3.148 | 98 | 98 | 0.671 | 0.764 |
| ctcourse | 12 | alert/facing | 4.8 / 5.9 | 4.6 / 5.9 | 4.255 | 4.129 | 206 | 191 | 0.759 | 1.102 |
| ctcourse | 24 | patrol/facing | 7.1 / 8.4 | 7 / 8.4 | 5.63 | 5.089 | 235 | 235 | 1.232 | 1.945 |
| ctcourse | 24 | patrol/away | 4.9 / 6 | 5.2 / 6.3 | 3.25 | 3.742 | 94 | 90 | 0.615 | 0.724 |
| ctcourse | 24 | alert/facing | 7.7 / 9.3 | 7.3 / 9 | 5.705 | 5.129 | 253 | 224 | 1.173 | 1.633 |
| campusops | 0 | boot | error | error | - | - | - | - | - | - |
| campusops | 12 | boot | error | error | - | - | - | - | - | - |
| campusops | 24 | boot | error | error | - | - | - | - | - | - |
