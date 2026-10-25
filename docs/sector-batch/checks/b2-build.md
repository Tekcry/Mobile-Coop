# sector-batch B2 - build report (solo-route data check)

Owner: Night Shift | Cloud Builder 2 (cloud session, for Night Shift | Sector Ops Build). Status: current.

Brief `docs/sector-batch/briefs/B2.md` (cloud brief `briefs/sector-batch-B2.md` on `cloud-queue`). Branch
`feature/sector-batch-b2` from origin/feature/sector-batch 31e9f22e. Built 2026-10-25.

## Built (per step)
| Step | Commit | File | Change |
| --- | --- | --- | --- |
| 1 | 926127a4 | `src/game/sectorSolo.ts` (new, 79 lines) | the brief's content verbatim: `SOLO_DOOR_PAD` 0.3, `SOLO_DOOR_DY` 1.5, `teamDoorPoints`, `legCrossesDoor`, `checkSoloRoutes`. `SectorDef.routes` (sectors.ts:136), `bolts` (:138), `pairGates` (:143), `SectorPairGate.door`, `SectorBolt.at`, `RoutePt` and `StageDoorInfo` match what the code assumes |
| 2 | 82115fca | `tests/sectorSolo.test.ts` (new) | the six cases of the brief, each its own `it`; `sec(...)` copied from `tests/sectorBolt.test.ts`; the stub `doorAt` matches within 0.5 m of (0, 0) with `hyp2` |
| 3 | 2b7a5f91 | `tests/campusSoloRoute.test.ts` (new) | the brief's content verbatim; not changed after the run (see "Stopped / open") |
| 4 | this commit | `docs/sector-batch/checks/b2-build.md` | this report |

## Checks
- `npm run typecheck:fast`: pass (exit 0).
- `npx vitest run tests/sectorSolo.test.ts tests/campusSoloRoute.test.ts tests/sectorBolt.test.ts tests/sectorBoltPair.test.ts --maxWorkers=2`:
  4 files, 33 tests: 32 pass, 1 fail.
  - `tests/sectorSolo.test.ts` 6 / 6 pass.
  - `tests/campusSoloRoute.test.ts` 2 / 3 pass: "the live campus has team doors to check" and "every section with team
    doors keeps a route past them" pass; "the rule bites" fails with its own error `no campus route crosses a team door:
    the rule-bites case has nothing to bite on` (kept as is, brief step 3).
  - `tests/sectorBolt.test.ts` + `tests/sectorBoltPair.test.ts` 24 / 24 pass.
- `git diff origin/feature/sector-batch --stat`: only `src/game/sectorSolo.ts`, `tests/sectorSolo.test.ts`,
  `tests/campusSoloRoute.test.ts` (and this report).

## Saltmarsh Park sections with team doors
Found with a temporary diagnostic `it` (door per team door point, each route's closest leg; removed before the commit).
| Section | Team door (data) | Door found (`doorFinder`) | Routes | Crosses the leaf at its floor |
| --- | --- | --- | --- | --- |
| s4 | cage pair gate (18, 40), `campusS4Data.ts:203` (`S4_DOORS.pgCage`, campusS4.ts:60) | centre (18, 40), yaw pi/2 (leaf along x), width 1.2, y 0 | stealth "The service corridor, the battery room and the hot aisles" | no: closest leg (18, 34.8) -> (18, 37.3), 2.7 m short of the leaf |
| | | | loud "The lobby, the mantrap and the centre aisle" | no: same closest leg, 2.7 m |
| | | | high "The compound, the plant deck and the cable baskets" | no: leg (18, 41.25, 4.4) -> (18, 39.6, 4.4) passes over the leaf in plan, but at y 4.4 (the cable basket), 4.4 m above the leaf floor (> `SOLO_DOOR_DY` 1.5) |
| s5 | pair gate (-41, 38.6), `campusS5Data.ts:183` | centre (-40.95, 38.6), yaw 0 (leaf along z), width 1.2, y 4.2 | "The back corridor, the anteroom side door and the garden" | no: closest leg (-43, 38) -> (-43, 42.2), 2.05 m off |
| | | | "The front hall, the kitchen and the terrace gate" | no: same closest leg, 2.05 m |
| | | | "The service stair, the roof and the rappel" | no: closest leg (-41, 35, 8.4) -> (-44, 40, 8.4), 1.9 m off and on the roof |

So all three routes of each section pass; S1-S3 have no team doors. The S4 objective (18, 38.3) sits on the near side of
the cage gate and every S4 route reaches it at (18, 37.3) and leaves by the shared EXIT legs, so the gate is on no
declared route (PLAN 9's S4 / S5 risk did not happen).

## Stopped / open (for the lead)
- The rule-bites case in `tests/campusSoloRoute.test.ts` throws: no declared campus route crosses a team door at its
  floor (table above), so a copy of a section with only crossing routes cannot be made from live data. Per brief step 3
  it is kept as is and fails on the branch; the lead decides whether it becomes a synthetic copy (the synthetic bite is
  already covered by `tests/sectorSolo.test.ts` cases 3 and 4). The PLAN's expectation "a copy of S4 with only its loud
  route fails" does not hold on this data: the loud route stops at the objective in front of the cage gate.

## Deviations
- Cloud session: the brief's desktop worktree path and toplevel guard were replaced by the branch-only guard; commit
  trailers are the cloud session's (Claude Opus 5.5, with the session link), per the cloud brief.
- None in code: files 1 and 3 are the brief's text verbatim.

## Pending PC runs
- None: the brief names no e2e or GPU leg.
