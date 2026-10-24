# gm-g8-cap2 c76cf326 (G8 cull): guard figures ON (guardmodels=1) vs OFF

Laptop RTX 4090, E2E_GPU=1, gfx=epic, 1920x1080, uncapped. Errors ON: []

| map | N | cell | frame med/p95 ON | OFF | gpu ON | OFF | draws ON | OFF | tris M ON | OFF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 2.5 / 3.9 | 2.5 / 5.8 | 3.395 | 3.438 | 104 | 104 | 0.494 | 0.494 |
| sectorops | 0 | patrol/away | 1.9 / 3.3 | 2 / 3.5 | 2.598 | 2.644 | 77 | 77 | 0.473 | 0.473 |
| sectorops | 0 | alert/facing | 2.3 / 3.9 | 2.1 / 4.2 | 3.394 | 3.451 | 104 | 104 | 0.494 | 0.494 |
| sectorops | 12 | patrol/facing | 4.9 / 6 | 4.6 / 5.8 | 4.47 | 4.186 | 187 | 187 | 1.052 | 1.489 |
| sectorops | 12 | patrol/away | 4.1 / 5.2 | 3.8 / 4.9 | 3.558 | 3.339 | 155 | 155 | 1.016 | 1.317 |
| sectorops | 12 | alert/facing | 6.1 / 7.6 | 5.8 / 7.3 | 5.326 | 5.137 | 228 | 218 | 1.109 | 1.821 |
| sectorops | 24 | patrol/facing | 7.3 / 8.9 | 7.5 / 9.2 | 5.587 | 5.162 | 258 | 258 | 1.411 | 2.481 |
| sectorops | 24 | patrol/away | 6 / 7.1 | 6 / 7.5 | 4.609 | 4.286 | 227 | 228 | 1.604 | 2.275 |
| sectorops | 24 | alert/facing | 9.1 / 11.5 | 8.3 / 9.9 | 6.192 | 5.458 | 286 | 295 | 1.395 | 2.822 |
| campusops | 0 | patrol/facing | 2.4 / 3.9 | 2.3 / 4.3 | 2.869 | 3.049 | 87 | 87 | 0.473 | 0.473 |
| campusops | 0 | patrol/away | 2.6 / 3.8 | 2 / 5.9 | 2.637 | 2.849 | 76 | 76 | 0.464 | 0.464 |
| campusops | 0 | alert/facing | 2.8 / 4.1 | 2.1 / 5 | 2.848 | 3.012 | 87 | 87 | 0.473 | 0.473 |
| campusops | 12 | patrol/facing | 5.5 / 7.4 | 5 / 6.5 | 4.31 | 4.053 | 173 | 173 | 0.859 | 1.524 |
| campusops | 12 | patrol/away | 4 / 5.2 | 3.8 / 4.9 | 3.483 | 3.32 | 139 | 139 | 0.84 | 1.17 |
| campusops | 12 | alert/facing | 6.6 / 9 | 5.8 / 7.7 | 4.893 | 4.62 | 188 | 179 | 0.927 | 1.498 |
| campusops | 24 | patrol/facing | 8.1 / 9.7 | 7.4 / 8.8 | 5.147 | 4.761 | 236 | 236 | 1.177 | 2.42 |
| campusops | 24 | patrol/away | 5.5 / 6.8 | 5.4 / 6.7 | 3.972 | 3.981 | 172 | 172 | 0.963 | 1.583 |
| campusops | 24 | alert/facing | 8.8 / 11.9 | 9.6 / 12.9 | 5.606 | 5.786 | 259 | 246 | 1.263 | 2.417 |
