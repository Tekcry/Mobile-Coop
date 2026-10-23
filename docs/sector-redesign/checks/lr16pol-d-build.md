# LR16-POLISH part D build (feature/sector-redesign-lr16pol-d, base artpol b5e93548)

Docs and one header comment only. No code change, so the b5e93548 laptop verdict stays valid.

| Item | Where | Done |
| --- | --- | --- |
| artnext 1 | `TESTING.md:477-478` | "No greybox showing" now lists S2 green wall and S5 kitchen run (S3 lockers, S5 vault frame, monitor wall dropped). `TESTING.md:481` "S1 35, S2 33 of 40". |
| artnext 2 | `docs/systems/world-and-characters.md:118-119` | Budget line: S1 35 / S2 33 / S3 27 / S4 19 / S5 29 draws; campus 143 draws, 186 k triangles (185,532), 1930 placements. "S1 and S2 at 39" sentence replaced by "S1 sits at 35 of 40". The "Not built yet" bullet (old :120-122) deleted. |
| artnext 3 | `changes/feature-sector-redesign-artnext.md:10` | "Freeze polish C4-C6 (C1-C3 were already on the base; C7-C9 at the master merge)." |
| perf 4 | `src/ai/enemyGunMerge.ts:12-15` (header comment only), `docs/sector-redesign/checks/perfg-build.md:19-22` | Gun parts drew with `partMat` (`src/world/partLibrary.ts:103,115`); merged gun moves them to `partSkinMat` (same `make()` settings plus voxel / smooth plugins), as the merged body; the no-look-change claim rests on the GPU look shot. |

## Numbers (from `artnext-build.md` artCounts, after lane B)
Draws 35 + 33 + 27 + 19 + 29 = 143. Triangles 13104 + 51428 + 16016 + 79532 + 25452 = 185,532. Placements
76 + 780 + 189 + 632 + 253 = 1930.

Deviation: the brief says 1921 placements. 1921 is the lane A dump (S2 777, S5 247); the lane B table, which the
doc's "Now" line describes, sums to 1930 (S2 780, S5 253). The doc uses 1930. The draw and triangle totals were
re-taken from the same table (the old 162 / 183 k were the pre-artnext numbers).

## Checks
`npx tsc --noEmit` clean. No vitest (no code touched).
