# LR16-W INT - merge and connector round (report)

Integrator: Opus 5.5, 2026-10-24. Branch `feature/sector-redesign-lr16w`, cut from `67f3661a`. Brief:
`docs/sector-redesign/briefs/LR16-W.md` ("Rules for every warehouse part", "INT", "Light parity").

## Merge
`git merge --no-ff`, in order, pushed after each:
| part | branch head | merge commit | conflicts |
| --- | --- | --- | --- |
| T | `bef5ca5f` | `39826721` | none |
| S1 | `d63ccd38` | `d7e925ae` | none |
| S2 | `678241fe` | `3f68534d` | none (`warehouseSectors.ts` auto-merged, disjoint blocks) |
| S3 | `b997a0fe` | `79f45a28` | none (`warehouseSectors.ts` auto-merged) |
C2 (`-lr16w-c2`) not merged (lead: master already replaced that ctcourse map). All four part reports kept:
`checks/lr16w-{t,s1,s2,s3}-build.md`.

## Red list after the merge (`79f45a28`)
`warehouseS1Light` 12/12, `warehouseS3Light` 11/11, `warehouseS2Light` 10/11. One red assert, "lit enough" (`:184`), 4 points,
all at (-14.5, -5.4), 0.364 (S1's C-entry; 0.37 on S1's branch, S2's #56 0.646 -> 0.640 took 0.006):
- R1[1], R2[1], R3[1] (-14.5, -5.4): 0.36 < 0.40 (gate 0.38)
- entry: the C2 far door (from the lobby): 0.36 < 0.45 (gate 0.43)
No other point red. Every other print row matches the parts' own reports.

## INT changes (old -> new, lever, reason)
| line | old | new | lever | reason |
| --- | --- | --- | --- | --- |
| `warehouseS2.ts` lane strip #56 (-12.5, 5.8, -4.6) | room beam `LANE` (pi/6, 0.52 rad), r 6.04, i 0.64 | own beam 0.62 rad, r and i unchanged | L2 (beam) | The C2 far door point is 2.15 m off #56's axis, 24-27 deg: inside the 30 deg cut but in its feather (cone factor ~0.36). A 0.62 rad (35.5 deg) high-bay optic puts it in the beam (~0.7). Realistic: the lane fitting by the C2 door gets a slightly wider optic than its row (the A1 lane fitting already has 0.85). Position, intensity and radius unchanged, so R2[2] under it barely moves; the lane's east-end pocket (-9.3, -5.2), 3.3 m off axis (34-38 deg), stays at the beam's edge. |
| `tests/warehouseLamps.test.ts:120` | `'S2 cage ceiling -22.2,14.4': [[-22.2, 13.4]]` | deleted | - | stale: S2 moved the cage strips to x -23.3; the key matched no fitting |

Not changed: S1's lobby pair #32 / #33 (the lobby points already sit at 0.541-0.549 of 0.55; no headroom), S3's #111-#114 /
#88 / #133, all route points (R*[1] reach 0.444 in place, so no L4 move was needed).

Beam sweep (`warehouseS2Light`, 3 decimals; merged = 0.524 rad):
| #56 beam | C2 far door / R*[1] | R2[2] (-12, -5.4) | lane east half (pocket; lamps off 0.122) | result |
| --- | --- | --- | --- | --- |
| 0.524 (merged) | 0.364 | 0.533 | 0.127 | red |
| 0.60 | 0.43 | 0.54 | 0.13 | green, KEY spot on the TOL edge |
| **0.62 (built)** | **0.444** | **0.537** | **0.136 (+0.009)** | green; every other point within +-0.01 |
| 0.63 | 0.448 | 0.538 | 0.140 (+0.013) | green |
| 0.65 | 0.454 | 0.540 | 0.150 (+0.023) | green, KEY spot in its nominal band; pocket moves past the INT +-0.01 rule |
| 0.70 | 0.47 | 0.54 | 0.18 (+0.06 vs lamps off) | red (pockets +0.05) |
0.62 keeps the INT rule (every other point +-0.01) and clears all four points; the KEY spot passes by the test's TOL
(lead: accepted). Undo or alternative: 0.65 puts the KEY spot at 0.454 (nominal band) for +0.023 on the lane pocket.

## Print diff, merged -> final (|delta| > 0.005, 2-decimal prints)
| section | point | merged | final |
| --- | --- | --- | --- |
| S2 | R1[1] R2[1] R3[1] (-14.5, -5.4) | 0.36 | 0.44 |
| S2 | entry: the C2 far door (from the lobby) | 0.36 | 0.44 |
| S2 | R2[2] (-12, -5.4) | 0.53 | 0.54 (0.533 -> 0.537) |
| S2 | lane east half (pocket) | 0.13 | 0.14 (0.127 -> 0.136) |
S1 and S3: no change.

## Thin margins re-checked on the final head (3 decimals; gate = band +- TOL 0.02)
| point | value | band | gate | status |
| --- | --- | --- | --- | --- |
| S2 connector: C3 near door | 0.448 | 0.45-0.55 | >= 0.43 | passes by TOL |
| S2 connector: C3 far door | 0.498 | 0.45-0.55 | | in band (lead accepted 0.54 -> 0.50) |
| S2 / S3 C3 checkpoint, R*[0] (-1.2, 14.8) | 0.552 | 0.45-0.55 / 0.4-0.55 | <= 0.57 | passes by TOL |
| S3 pocket: crane operator | +0.042 (0.164) | +0.05 | | in |
| S3 pocket: east bay | +0.044 (0.204) | +0.05 | | in |
| S1 lobby R1[19] R2[17] R3[22] (-14.5, -7.4) | 0.549 | 0.4-0.55 | | in |
| S1 connector: C2 far door | 0.454 | 0.45-0.55 | | in |
| S1 security office door | 0.436 | 0.45-0.8 | >= 0.43 | passes by TOL |
| S1 corridor: middle | 0.401 | 0.4-0.55 | | in |
| S2 cross aisle: east, R1[10] (-12, 5.5) | 0.562 | 0.4-0.55 | <= 0.57 | passes by TOL |
| S2 ladder foot: R2N | 0.439 | 0.45-0.55 | >= 0.43 | passes by TOL (Michael's list if layout cannot fix it) |
| S2 north gangway: the middle | 0.387 | 0.4-0.55 | >= 0.38 | passes by TOL |
| S2 C2 far door, R*[1] (-14.5, -5.4) | 0.444 | 0.45-0.55 / 0.4-0.55 | >= 0.43 / 0.38 | KEY passes by TOL; R*[1] in band |
None of the re-checked points moved in INT (all are as the parts left them, but the C2 far door).

## Final red list
Empty. `warehouseS1Light` 12/12, `warehouseS2Light` 11/11, `warehouseS3Light` 11/11. No light-model C-entry.

## Tests (final head, desktop, single files, `--maxWorkers=2`, slot lock, CPU gated)
| files | result |
| --- | --- |
| `warehouseS1Light`, `warehouseS2Light`, `warehouseS3Light` | 3 files, 34 / 34 |
| `sectors`, `warehouseCoopS1`, `warehouseCoopS2`, `warehouseCoopS3`, `warehouseLamps`, `lampAudit`, `warehouseDress`, `sectorLampSync`, `rooms`, `detailPass`, `lampFlicker`, `lampAtlasFit` | 12 files, 167 / 167 |
| `lampBoxAlign` | 1 file, 6 / 6 |
| `campusS4`, `campusRuntimeNav`, `torchOcclusion`, `lampBake`, `lightField`, `bounceGrid`, `lampFalloff`, `darkCurve` | 8 files, 118 / 118 |
24 files, 325 / 325. `npx tsc --noEmit` clean. `npm run lint`: 0 errors (42 warnings, pre-existing `no-console`).
Not run (rules): e2e, build, full vitest. Probe files (`tests/zzW*int.test.ts`) untracked and deleted.

## Laptop (Test Runner's queue, `E2E_GPU=1`, this head)
- `e2e-sectorops`: route legs on nav over every moved route point (S1 R1 legs 9-13, R3 legs 5-6 and 12-17; S2 the A2 jump,
  the R2 drop at z 14.2, the R3 drop at x -18.0; S3 R1[4], R1/R2 [12] [14] [17] [19], R2[3], R2[10] [11] [25] [26], R3[7], R3[9]),
  the S2 cage grab, the S4 cage (campus #81 post), the S3 crane operator's moved post (L6).
- `e2e-ctcourse`: base map (C2 not merged).
- `e2e-lightbake`, `e2e-darkness`.
- GPU sheet (brief "Laptop" 2) and Michael's walk (brief "Laptop" 3).

## Risks
1. Many points sit on the TOL edge by design (table above): C3 near door 0.448, C3 checkpoint 0.552, security office door
   0.436, cross aisle east 0.562, R2N ladder foot 0.439, north gangway 0.387, the C2 KEY spot 0.444. Any later light change
   in these rooms (a `LAMP_VERSION`, bounce or falloff change) can tip them; the bake is deterministic, so they hold on this head.
2. `ctcourseLight` S7 stair step 1 (0.31 < 0.33) stays red on this branch: C2 was dropped because master replaced the map;
   it clears only when the branch takes master. Not in this round's acceptance list; checked on this head: 11 passed, 1 skipped,
   1 failed (that point only).
3. `tests/warehouseLamps.test.ts:119` `LR16D_MOVED` still lists four `S1 plantDeck ceiling *,-15.15` keys; S1 moved that row to
   z -16.9, so they match no fitting either (harmless, the same cleanup as the S2 key; not in this round's scope).
4. Route-point moves from all three parts are unproven on nav until `e2e-sectorops` runs (the unit `sectors` test passes).
