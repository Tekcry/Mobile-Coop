# gm-g8-cap3 0fd85e2b (S11 on guard-models): guard figures ON (guardmodels=1) vs OFF

Laptop RTX 4090, E2E_GPU=1, gfx=epic, 1920x1080, uncapped. Errors ON: []

| map | N | cell | frame med/p95 ON | OFF | gpu ON | OFF | draws ON | OFF | tris M ON | OFF |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sectorops | 0 | patrol/facing | 2.5 / 4.2 | 2.3 / 3.9 | 3.203 | 3.516 | 104 | 104 | 0.494 | 0.494 |
| sectorops | 0 | patrol/away | 2.1 / 3.3 | 2.3 / 3.5 | 2.376 | 2.64 | 77 | 77 | 0.473 | 0.473 |
| sectorops | 0 | alert/facing | 2.4 / 4.9 | 2.4 / 3.8 | 3.025 | 3.452 | 104 | 104 | 0.494 | 0.494 |
| sectorops | 12 | patrol/facing | 5.2 / 6.5 | 4.7 / 5.9 | 4.611 | 4.292 | 187 | 187 | 0.86 | 1.489 |
| sectorops | 12 | patrol/away | 4.2 / 5.3 | 3.8 / 4.9 | 3.611 | 3.411 | 155 | 155 | 0.973 | 1.317 |
| sectorops | 12 | alert/facing | 5.8 / 7.3 | 5.7 / 7.3 | 5.232 | 5.053 | 226 | 224 | 1.042 | 1.871 |
| sectorops | 24 | patrol/facing | 7.3 / 8.8 | 6.4 / 7.7 | 5.492 | 5.011 | 258 | 258 | 1.218 | 2.481 |
| sectorops | 24 | patrol/away | 5.8 / 7 | 5.4 / 6.6 | 4.41 | 4.084 | 227 | 227 | 1.39 | 2.263 |
| sectorops | 24 | alert/facing | 8.9 / 11.1 | 8 / 9.4 | 6.259 | 5.533 | 303 | 278 | 1.429 | 2.649 |
| campusops | 0 | patrol/facing | 2.1 / 3.6 | 1.8 / 3.4 | 2.882 | 2.927 | 87 | 87 | 0.473 | 0.473 |
| campusops | 0 | patrol/away | 1.8 / 3.3 | 1.6 / 3.1 | 2.516 | 2.758 | 76 | 76 | 0.464 | 0.464 |
| campusops | 0 | alert/facing | 2 / 4.7 | 2 / 3.3 | 2.835 | 2.926 | 87 | 87 | 0.473 | 0.473 |
| campusops | 12 | patrol/facing | 5 / 6.1 | 4.9 / 6.2 | 3.926 | 3.855 | 173 | 173 | 0.859 | 1.524 |
| campusops | 12 | patrol/away | 3.8 / 4.9 | 3.7 / 4.7 | 3.191 | 3.141 | 139 | 139 | 0.799 | 1.17 |
| campusops | 12 | alert/facing | 5.6 / 7.5 | 5.7 / 7.2 | 4.341 | 4.451 | 184 | 187 | 0.906 | 1.571 |
| campusops | 24 | patrol/facing | 8 / 9.5 | 6.8 / 8.1 | 4.891 | 4.477 | 236 | 236 | 1.177 | 2.42 |
| campusops | 24 | patrol/away | 5.4 / 6.5 | 4.8 / 6 | 3.923 | 3.734 | 172 | 172 | 0.921 | 1.583 |
| campusops | 24 | alert/facing | 8.8 / 12 | 7.5 / 9.5 | 5.603 | 5.079 | 279 | 278 | 1.344 | 2.776 |
