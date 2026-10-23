# LR16d campusOps lamp moves

Input: `lr16-lamp-audit.md`, "Flagged lamps (LR16d input)", campusOps rows (26, all `push`, 0 `none`). Each row applied exactly; height kept; call order, ids, groups and cones unchanged (loops with one flagged member became `[x, z]` tables in the same order, so lamp ids do not shift). No other files touched.

| Lamp ids | File:line (after) | Before (x, z) | After (x, z) |
|---|---|---|---|
| 64 | `campusS3.ts:473` (east of the three view lamps; 27 and 37 unflagged) | (47, -7) | (47, -7.35) |
| 89, 90 | `campusS4.ts:497` | x 34.3, z 24 / 40 | x 35.35 |
| 98-101 | `campusS4.ts:502` | z 33.6 (x 6, 14, 22, 28) | z 34.2 |
| 103, 104 | `campusS5.ts:601` (gal) | (-49.85, 21), (-49.85, 27) | x -48.7 |
| 105, 106 | `campusS5.ts:601` | (-46, 31.85), (-42, 31.85) | z 30.7 |
| 107, 108 | `campusS5.ts:601` | (-38.15, 21), (-38.15, 27) | x -39.2 |
| 115, 116 | `campusS5.ts:605` (garden; the z 25 pair unflagged) | (-67, 37), (-59, 37) | z 37.2 |
| 117-122 | `campusS5.ts:606` | z 49.5 (x -64, -56, -48, -40, -34, -28) | z 48.7 |
| 127 | `campusS5.ts:609` (roof) | (-40, 43.6) | (-40, 42.6) |
| 128, 129 | `campusS5.ts:610` (hall) | (-49.85, 22), (-49.85, 28) | x -48.7 |
| 130, 131 | `campusS5.ts:610` | (-38.15, 26), (-38.15, 30) | x -39.3 |

`none` rows: 0 in campusOps. Source `(call)` rows were all in the three files above (lines 472, 497, 502, 606).

## Audit rerun
`node scripts/lamp-audit.mjs --no-views --json --map=campusOps` (JSON to stdout so `lr16-lamp-audit.md` is not overwritten with a partial map; that file still lists the pre-move rows until the lead re-runs the full audit): `campusOps: 134 lamps, 0 flagged`.

## Checks
- `npx tsc --noEmit`: clean.
- vitest (24 files, 348 passed, 4 skipped, 0 failed): campusS1-S5, campusGlass, campusRuntimeNav, detailPass, lampAtlasFit, polishBatch, rooms, sectorItemScope, lampAudit, lampBake*, every `tests/*light*` and `*dress*` file.
- No test asserted a moved lamp position or level; no test edited. No failures to record.
- Not run: e2e, dev server. `node_modules` in this worktree is a junction to the lr16c one (untracked, same lockfile).
