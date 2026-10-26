# campus-greybox S3 join - r1-r4 merged into r5, the join list J1-J8
Owner: Night Shift | Sector Ops Build. Status: current.

Builder: Night Shift | Cloud Builder 3 (Opus, cloud), 2026-10-26, to `cloud-queue:briefs/campus-greybox-s3-join.md`. Base
`feature/campus-greybox-s3-r5` fc49d3547 (r5 done); pushed on the same branch. Unit tests only.

**Result: BLOCKED on one red test whose cause is not J1-J5** (the brief's rule): `tests/campusV2S3Shell.test.ts` "the G nav
seeds and hide spots are on nav" fails on `seed 33, 4.4, -18` (below). Everything else is done and green.

## Merges (`--no-ff`, in order; each head re-checked first: none had moved)
| Lane | Head | Merge commit | Conflicts |
| --- | --- | --- | --- |
| r1 | 5d7da838c | db349a0d | none |
| r2 | 107f42653 | e0651a93 | none |
| r3 | 4dd20af19 | ad6f5197 | none |
| r4 | e37b26565 | 33922f8f | none |

## Join items (one commit each)
- **J1** 47555b37: `s3.ts` imports `S3_ROOMS_STAIRS` from `./s3Stairs` and appends it to `S3_ROOMS` (comment: none overlap
  but the stair cores, smallest room wins in `roomAt`); the overlap loops in `campusV2S3Shell.test.ts` (~:262) and
  `campusV2S3L1.test.ts` (~:497) skip the three stair rooms. Line numbers as briefed after the merge.
- **J2** ffaec856: `s3L1.ts` (~:314) the two z -7 plenum walls become one, `wall(b, true, -7, 10, S3_BOX.eCore[0], C, R, [])`
  (the east-core run kept); `campusV2S3L1.test.ts` (~:456) skips only the east core; a new loop asserts the plenum wall
  over the north core x 30..33.5 at y 7.55 / 8.25 / 8.95 (the guards' nav has no cell at the void's height, so the
  seal is asserted as the wall; it fails on the pre-J2 code: `plenum wall at 30.3, 7.6`).
- **J3** a1cea631: `S3_L1_HOLES` north and east wells end at `-T` (was `core[3] - T / 2`); the test rows `-0.65` -> `-0.3`.
- **J4** 108e1a00: the core-slot strip line in `s3L1.ts` step 4 deleted, its comment fixed; the test's `strip ${x}` now
  `.toBeUndefined()` (the `core wall ${x} is R3's` line kept).
- **J5**: no-op, as the r5 checker said: `s3Data.ts` already imports `S3_ALARMS`, `S3_CAMERAS`, `S3_DESKS`, `S3_INTEL`,
  `S3_KEYPADS` from `./s3Devices` and `S3_BOARDS` through `./s3`; `S3_SECTOR` has `keypads` / `intel`, the parts `boards`.
- **J8** 695e619c: `s3L1.ts` after the hatch rails: `b.ledge(hhhx0, hhhz0, hhhx0, hhhz1, L1)` = (18, -6) -> (18, -3) at 4.5,
  normal (1, 0) toward the hatch (S3.md R6: lip x 18, z -6..-3, y 4.5, n (1, 0); the hatch hole starts at x 18, so the
  strip edge is x 18). New test in `campusV2S3L1.test.ts`: the ledge exists with those ends and normal, `canHang &&
  canClimbUp`, and the climb room (HANG.out + 0.45 in from the lip, one body radius round it, y 4.55..6.3) is clear. It
  fails without the ledge (`CR3b ledge: expected undefined to be defined`).
- r5 checker note: 772cc258 asserts no guard slot or route point in `s3-wstair` / `s3-nstair` / `s3-estair` (green).

## The red test (not J1-J5)
`campusV2S3Shell.test.ts` (R1) checks every `S3_NAV_SEEDS` seed on the merged build's nav. R2's seed (33, 4.4, -18) on the
environmental chamber roof (`s3L1.ts:67`, `S3_BOX.chamberTop`) is 0.25 m from the west face (x 33.5) of R1's refrigeration
plant on that roof (`s3Shell.ts` ~:141, x 33.5..35.5, y 4.4..5.6, z -21..-15), inside the 0.32 agent radius, so its cell
is not walkable. R2's own test passed because its stand-in chamber (`campusV2S3L1.test.ts` `standIns`) has no plant.
Bisect over the merge commits: green after r1 (db349a0d), red from the r2 merge on (e0651a93). Checked (not committed):
the seed at x 32 passes the shell test and the rest of the set. **Proposed fix (the lead's call):** `s3L1.ts:67`
`new Vector3(32, S3_BOX.chamberTop, -18)` and the pinned row in `campusV2S3L1.test.ts` (~:514) `[32, 4.4, -18]`.

## Tests (J6, on the head 772cc258)
- `npm run typecheck:fast` clean; eslint clean on every touched file.
- `npx vitest run --maxWorkers=2 tests/campusV2S3*.test.ts tests/campusS3*.test.ts tests/campusV2.test.ts
  tests/campusRuntimeNav.test.ts`: **143 / 144** in 11 files (the one above; 141 / 142 on the plain merge before the join
  items, the same failure). The new cases: J2 (in the existing plenum case), J8 (+1), stair cores (+1).
- R5's merged-only half (`describe.skipIf(!MERGED)` in `campusV2S3Guards.test.ts`) un-skips on the merged head: 6 cases,
  all green (slots / routes / takedown spots on nav, #11's nav cycle, routes, `checkSectors`, M8, A99: worst 11 seen at
  (15.75, 6.00, -29.25), 7523 points).
- M8 isolation for the lead (record only, no data change): #10, #15, #16 have 0 s alone at their spots in the sector
  check's model (#10: the dock posts #9 / #18 / #20 see the cage corner, R1's cage wall; #15: #5's post in his beat;
  #16: the open hall's west end, #6 / #7 and #11).

## Pending PC runs
e2e-sectorops:1..6 with the flag off at the S3-e head; the v2 walk of the stairs and the plenum after S3-f.
