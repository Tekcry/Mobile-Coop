# LR16-M part M1 - A1 the Gate, A2 the Carriage Shed (build report)

Builder: Opus 5.5, 2026-10-24. Brief: `C:/NightShift/scratch/LR16-M-brief.md`, "Part M1". Base `f85ef736`, branch
`feature/marlow-lr16m-m1`. Every number below is `CTLIGHT_PRINT=1 npx vitest run tests/ctcourseLight.test.ts
--maxWorkers=2 --silent=false` on this branch (slot lock, CPU wait), base print before any edit, after print with the
source edits only (before the re-take). The brief's table values were reproduced exactly; no tuning beyond the table.

## Changed lines (old -> new, lever, why realistic)
| file:line | lamp (registry id) | old | new | lever, why |
| --- | --- | --- | --- | --- |
| `src/world/maps/ctcourseSets/a1Gate.ts:171` | lounge coves #43-#46, group 10 | `intensity: 0.4` | `intensity: 0.12` | L1: warm LED coves on a night setting; they hang 0.8 m over a head, so at 0.4 the lounge read 1.00 |
| `src/world/maps/ctcourseSets/a1Gate.ts:198` | apron flood #47, group 11, sodium spot | `intensity: 1.5` | `intensity: 3.5` | L1 up: a sodium security flood bright enough to reach the striped mark 9 m out under inverse-square falloff; aim and cone unchanged |
| `src/world/maps/ctcourseSets/a1Gate.ts:202` | cabin panel #51, group 13 | `intensity: 0.6` | `intensity: 0.065` | L1: a cabin panel on its night setting, 0.85 m over the checker's head |
| `src/world/maps/ctcourseSets/a2CarriageShed.ts:46` | - | - | `import { makeCone } from '../../lights';` | needed by the strip optic |
| `src/world/maps/ctcourseSets/a2CarriageShed.ts:276` | neck high-bays #52-#55, group 21 | `intensity: 1.0` | `intensity: 1.1` | L1: keeps the neck pool full with the strips on a beam |
| `src/world/maps/ctcourseSets/a2CarriageShed.ts:280-283` (was `:279`) | shed strips #56-#61, group 20, y 6.5 | `strip(x, 6.5, z, 20, 7.5, 1.1)` (point lamps) | own `b.light` call: `kind: 'spot'`, `cone: makeCone(0, -1, 0, 0.9)`, i 0.8; the east strip (68, 11) #61 i 0.95; radius, colour, fixture, group unchanged | L2 + L1: a high-bay optic (~52 degree half angle, soft `SPOT_FEATHER` edge). The neck cut points sit 45-48 degrees off the x 41 / 61 strips' axes, outside the cone, so cutting 21 darkens the crossing (LIGHTING-PLAN 3 A2: the strips' reach is the rakes). #61 slightly brighter so cabinet 2, 2.5 m off its axis, still reads. The `strip` helper stays for group 23 (point lamps) |
| `src/world/maps/ctcourseSets/a2CarriageShed.ts:284` (was `:280`) | cabin panel #62, group 22 | `intensity: 0.6` | `intensity: 0.075` | L1: cabin panel night setting; the coat corner 2.4 m off stays a pocket. The fallback downlight cone was not needed |
| `src/world/maps/ctcourseSets/a2CarriageShed.ts:285` (was `:281`) | staging strips #63-#66, group 23 | `strip(x, 7, 19, 23, 5, 0.8)` | `strip(x, 7, 19, 23, 5, 0.27)` | L1: the deck is 1 m under these strips; night setting |
| `tests/ctcourse/a1Gate.light.json:13` | re-take | `"A1 apron floor": 0.81` | `"A1 apron floor": 1` | decision 2: the floor under the flood's near beam (print 1.00, hand-edited) |

No lamp added, removed, regrouped or moved; no route point, band, constant or test edited. The set tests needed no
assert change.

## Red points of A1 / A2, base -> after (B band break, T tuned miss)
| spot | band | master | base | after | |
| --- | --- | --- | --- | --- | --- |
| A1 mark | pool | 0.70 | 0.37 | 0.69 | B T fixed |
| A1 apron centre | read | 1 | 0.85 | 1.00 | T fixed |
| A1 lounge | read | 0.79 | 1.00 | 0.84 | T fixed |
| A1 cabin | read | 0.67 | 1.00 | 0.69 | T fixed |
| A1 apron floor | any | 0.81 | 0.62 | 1.00 | re-take (json 0.81 -> 1) |
| A2 neck crossing west / east cut | cut | 0.16 | 0.28 | 0.17 | B T fixed |
| A2 neck cess west / east cut | cut | 0.19 | 0.30 | 0.18 | B T fixed |
| A2 rake gap / east rake gap | read | 0.71 | 0.94 | 0.70 | T fixed |
| A2 cess | read | 0.71 | 0.88 | 0.70 | T fixed |
| A2 vantage | read | 0.54 | 0.69 | 0.49 | T fixed |
| A2 cabinet 1 | read | 0.57 | 1.00 | 0.59 | T fixed |
| A2 coat corner | pocket | 0.19 | 0.61 | 0.20 | B T fixed |
| A2 deck | read | 0.54 | 1.00 | 0.56 | T fixed |
| A2 cabinet 2 | read | 0.45 | 0.62 | 0.47 | T fixed |

Other A1 / A2 spots moved at most 0.01 (neck centre 0.94 -> 1, neck cuts 0.15 -> 0.14) except A2 neck floor 0.86 -> 0.93
(master 0.88, band `any`). After the re-take no failure line in `ctcourseLight` names an A1 or A2 spot. Every other set's
printed level is identical to the base print (158 keys diffed, 0 drift > 0.02).

## Edges after
- Band edge (within 0.035): A2 coat corner 0.20 (pocket 0.22; the brief measured 0.200).
- Tuned edges (0.05 from master): A1 lounge 0.84 (0.79), A2 vantage 0.49 (0.54), A2 neck floor 0.93 (0.88).
- Nearest others: A2 cabinet 2 0.47 (read 0.40), A1 mark 0.69 (pool 0.60), A2 neck cess cuts 0.18 (cut 0.24).

## Checks
- `tests/ctcourseLight.test.ts`: still red (2 cases) on the other parts' sets (A3-A8) only, as the brief expects until
  the merge; no A1 / A2 line.
- Single files, `--maxWorkers=2`, slot lock: see the results list below.
- `npx tsc --noEmit` clean; `npx eslint` clean on `a1Gate.ts`, `a2CarriageShed.ts`.

Results (each file alone):
- PASS: `tests/ctcourse/a1Gate.test.ts` 43/43, `tests/ctcourse/a2CarriageShed.test.ts` 62/62, `tests/ctcourse.test.ts` 28/28, `tests/ctcourseGreybox.test.ts` 77/77, `tests/marlowLightingCircuits.test.ts` 9/9, `tests/lampBoxAlign.test.ts` 6/6, `tests/lampAtlasFit.test.ts` 6/6, `tests/lampFlicker.test.ts` 20/20. No set-test assert changed.
- `tests/ctcourseLight.test.ts`: 2 red cases, 0 lines naming A1 / A2 (A3-A8 belong to M2-M4).
- FAIL, not M1's: `tests/marlowLightingLevels.test.ts` 2 of 7 red: `:13` (`lampLevel` 0.3456 vs `contribution` 0.9072: the planning formula in `src/world/lighting/levels.ts` no longer matches the LR16 registry contribution) and `:32` (cove row mid 0.396 < read 0.40). The file imports only `lighting/levels`, `lights`, `lampBake` and `marlowCircuits`, none of which M1 touches, so it is red on base `f85ef736` too. Fixing it means editing `levels.ts` (`MARLOW_LEVEL`'s module) or the test, which the brief forbids; left for the lead / INT.

## Marlow-owned lines touched (for Marlow Build)
- `src/world/maps/ctcourseSets/a1Gate.ts:171` cove `intensity: 0.4` -> `0.12`
- `src/world/maps/ctcourseSets/a1Gate.ts:198` apron flood `intensity: 1.5` -> `3.5`
- `src/world/maps/ctcourseSets/a1Gate.ts:202` cabin panel `intensity: 0.6` -> `0.065`
- `src/world/maps/ctcourseSets/a2CarriageShed.ts:46` new import `makeCone`
- `src/world/maps/ctcourseSets/a2CarriageShed.ts:276` neck high-bays `intensity: 1.0` -> `1.1`
- `src/world/maps/ctcourseSets/a2CarriageShed.ts:279` (old) -> `:280-283` group 20 strips: `strip(...)` point lamps i 1.1 -> own spot call, `makeCone(0, -1, 0, 0.9)`, i 0.8 (68, 11: 0.95), plus a one-line comment
- `src/world/maps/ctcourseSets/a2CarriageShed.ts:280` (old) -> `:284` cabin panel `intensity: 0.6` -> `0.075`
- `src/world/maps/ctcourseSets/a2CarriageShed.ts:281` (old) -> `:285` staging strips `0.8` -> `0.27`
- `tests/ctcourse/a1Gate.light.json:13` `"A1 apron floor": 0.81` -> `1`

## Deviations from the brief
- Branch and report path follow the lead's prompt: `feature/marlow-lr16m-m1` (brief: `feature/sector-redesign-lr16m-m1`),
  this file (brief: `docs/sector-redesign/checks/lr16m-m1-build.md`); the builder commits and pushes.
- The print needs `--silent=false` on this vitest (5.0.3 hides passing tests' console output by default).
