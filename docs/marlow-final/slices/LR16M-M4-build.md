# LR16-M M4 build - A7 the Data Hall, A8 the Strongroom

Builder: Opus 5.5, 2026-10-24. Branch `feature/marlow-lr16m-m4`, base `f85ef736`. Brief: `scratch/LR16-M-brief.md`, Part M4
(decision 3 is this part's). Every lever landed at the brief's value; no tuning beyond the table was needed.

## Changed lines (old -> new, lever, why it is realistic)
`src/world/maps/ctcourseSets/a7DataHall.ts` (A7-8):
| line | lamps (registry ids) | old -> new | lever, why |
| --- | --- | --- | --- |
| `:360-361` | rack-row strips (#118-#123), group 70 | i 1.0 -> 0.25 | L1: cool LED strips 2.2 m over the heads on their night setting |
| `:362` | lobby panel (#124), group 70 | i 0.8 -> 0.18 | L1: a lobby panel dimmed for the night |
| `:363-364` | aisle-end bulkheads (#125, #126), group 71 | i 0.9 -> 0.115 | L1: low-level aisle-end bulkheads; R1 cut stays dark with 71 off |
| `:365` | corridor bulkheads (#127-#130), group 72 | `for (const x of [...]) ... 1.0` -> `for (const [x, i] of [[74.0, 0.19], [79.5, 0.19], [85.0, 0.19], [91.0, 0.22]])` | L1 per lamp: corridor bulkheads on a night level; the one by the grating a touch higher so the grating reads |
| `:366` | pod strips (#131, #132), group 73 | i 1.0 -> 0.17 | L1: the pod roof strips 0.4 m over a head at a night level |

`src/world/maps/ctcourseSets/a8Strongroom.ts`:
| line | lamps (registry ids) | old -> new | lever, why |
| --- | --- | --- | --- |
| `:190` | the `LAMP` table comment | "tuned with `CTLIGHT_WRITE=a8Strongroom`" -> names the LR16 re-tune (LR16-M), the counter bulb height and the per-lock levels | comment |
| `:192` chandelier | chandeliers (#133-#135), group 81, y 7.5 | i 1.5 -> 1.4 | L1: the hall's night chandeliers a step down |
| `:193` counter | counter lamps (#136-#138) | `{ radius: 2.2, intensity: 0.6 }` -> `{ radius: 2.2, intensity: 0.6, y: 1.6 }` | L3' (decision 3): the light point's height lives in the table; radius and i unchanged |
| `:195` gallery | gallery wall lights (#140-#142), group 82 | i 0.9 -> 0.15 | L1: brass wall lights 1.3 m from a body by the wall, on a night level |
| `:196` office | office panels (#143, #144), group 83 | i 0.9 -> 0.28 | L1: office panels dimmed for the night |
| `:197` lobby | vault lobby panels (#145, #146), group 84 | i 1.0 -> 0.2 | L1: the lobby panels no longer light the grille approach through the open grille (the device-supply rule, LIGHTING-PLAN 2) |
| `:198` lock | time-lock status lamps | `{ radius: 3.4, intensity: 0.7 }` -> `{ radius: 3.4, t1: 0.07, t2: 0.085 }` | L1: small status lamps 2.2 m over the locks; T1 lower since it also takes the lobby panel's light |
| `:507` | counter lamps (#136-#138), group 81 | y 1.4 -> `LAMP.counter.y` (1.6) | L3' (decision 3): the bulb inside a banker's-lamp shade 0.4 m over the marble top; out of the counter's cell |
| `:513` | T1 status lamp (#147) | `LAMP.lock.intensity` -> `LAMP.lock.t1` (0.7 -> 0.07) | L1 |
| `:514` | T2 status lamp (#148) | `LAMP.lock.intensity` -> `LAMP.lock.t2` (0.7 -> 0.085) | L1 |
| `:987` | A8-20 register text | "the lamps' fixtures float 0.2 m over the counter tops in the greybox" -> "the counter lamps' light points sit 0.4 m over the counter tops in the greybox, the bulb inside a banker's-lamp shade" | follows the lamp |
| `:998` | stem comment | "to the fixture's foot at 1.4" -> "to the fixture's foot at the light point" | follows the lamp |
| `:1001` | brass stems (dressing) | stem 1.23-1.4 -> 1.23-`LAMP.counter.y` (1.6) | follows the lamp (the fixture's foot is the light point) |

Desk lamp `:508` unchanged.

Tests:
| file:line | old -> new | why |
| --- | --- | --- |
| `tests/lampBoxAlign.test.ts:218-220` | the three `ctcourse:136-138` `KNOWN_EMBEDDED` entries -> removed | decision 3: the test now requires the cell under each counter lamp clear; it passes at y 1.6 (the y 1.65 fallback was not needed) |
| `tests/ctcourse/a8Strongroom.test.ts:1003` | group 81 positions `121,1.4,65.9` / `124.8,1.4,65.9` / `125.6,1.4,61.5` -> `...,1.6,...` | the counter lamps' new height (intent kept: the doc's positions; x, z, group, count unchanged) |
| `tests/ctcourse/a8Strongroom.test.ts:1888, 1890, 1892, 1899` | the stem test: title "(1.21 to 1.4)" -> "(1.21 to 1.6)"; stem height `s[1]` 0.17 -> 0.37; stem top 1.4 -> 1.6; carried lamps' y 1.4 -> 1.6 | the stems follow the lamps (intent kept: the stems carry the counter lamps from the marble top) |

## Re-takes (decision 2), hand-edited, `CTLIGHT_PRINT=1`, 2 decimals
| file | key | old -> new |
| --- | --- | --- |
| `tests/ctcourse/a7DataHall.light.json` | A7 hall floor | 0.34 -> 0.43 |
| `tests/ctcourse/a8Strongroom.light.json` | A8 hall floor | 0.23 -> 0.40 (printed 0.4; 3-decimal 0.405; brief said about 0.41) |
No other json key changed.

## Red points base -> after (`tests/ctcourseLight.test.ts`; after = 3-decimal probe, rounded)
| spot | band | tuned | base | after |
| --- | --- | --- | --- | --- |
| A7 T1 | pool | 0.67 | 1.00 | 0.70 (0.696) |
| A7 aisle B | read | 0.80 | 1.00 | 0.87 (0.871) |
| A7 aisle C | read | 0.76 | 1.00 | 0.79 |
| A7 north apron | read | 0.76 | 1.00 | 0.71 |
| A7 R1 | read | 0.53 | 1.00 | 0.55 (0.545) |
| A7 R1 cut | cut | 0.14 | 0.40 (B) | 0.21 (0.206) |
| A7 lobby | read | 0.56 | 1.00 | 0.60 (0.599) |
| A7 corridor | read | 0.90 | 1.00 | 0.94 |
| A7 grating | read | 0.48 | 1.00 | 0.47 |
| A7 T2 | read | 0.61 | 1.00 | 0.61 |
| A7 hall floor | any | 0.34 | 1.00 | 0.43 (re-take) |
| A8 grille approach | pool | 0.64 | 0.86 | 0.64 (0.643) |
| A8 grille approach cut | cut | 0.22 | 0.37 (B) | 0.19 (0.188) |
| A8 gallery east | read | 0.59 | 1.00 | 0.59 |
| A8 office | read | 0.82 | 1.00 | 0.87 (0.866) |
| A8 T1 | read | 0.79 | 1.00 | 0.79 (0.795) |
| A8 T2 | read | 0.83 | 1.00 | 0.81 |
| A8 hall floor | any | 0.23 | 0.42 | 0.40 (re-take) |
| `lampBoxAlign` ctcourse:136-138 | - | - | listed | removed, passes |
Also moved: A8 front 0.80 -> 0.76 (master 0.77). A8 jam spot 0.17 (pocket 0.22), unchanged.

## Edges after
- Band (within 0.035 of an edge): A7 R1 cut 0.206 (cut 0.24, 0.034).
- Near: A8 grille approach 0.643 (pool 0.60, 0.043), A8 jam spot 0.170 (pocket 0.22, 0.05).
- Tuned (0.05-0.075 off master): A7 aisle B 0.871 (0.80, 0.071), A7 R1 cut 0.206 (0.14, 0.066), A7 north apron 0.711 (0.76, 0.049), A8 office 0.866 (0.82, 0.046).

## Results
- `ctcourseLight` after: no failure line names an A7 or A8 spot (50 lines left, all A1-A6, the other parts'); the
  other sets' printed levels are identical to the base print (0.00 change on all 124 non-A7/A8 keys incl. facility).
- Pass: `tests/ctcourse/a7DataHall.test.ts` (60), `tests/ctcourse/a8Strongroom.test.ts` (83), `tests/ctcourse.test.ts`
  (28), `tests/ctcourseGreybox.test.ts` (77), `tests/marlowLightingCircuits.test.ts` (9), `tests/lampBoxAlign.test.ts`
  (6), `tests/lampAtlasFit.test.ts` (6), `tests/lampFlicker.test.ts` (20).
- `tests/marlowLightingLevels.test.ts`: 2 of 7 fail ("lampLevel is the registry contribution of a downward lamp", "a
  room cove row at 2.4 m centres reads lit enough"). Not this part's: the file imports only `levels.ts`, `lights.ts`,
  `lampBake.ts`, `marlowCircuits.ts` and a test helper, none touched here; it compares the `levels.ts` estimate formula with
  the LR16 registry, so it is red on the base head too (not rerun on the base; for the lead / INT).
- `lampBake` not run (INT's hash).
- `npx tsc --noEmit` clean; `npx eslint` clean on the four edited source / test files.
- Runs: single files, `--maxWorkers=2`, each under an `sr-slot-<n>.lock`, CPU under 90 at start.

## Marlow-owned lines touched (for Marlow Build)
- `src/world/maps/ctcourseSets/a7DataHall.ts:360-366` (old -> new above).
- `src/world/maps/ctcourseSets/a8Strongroom.ts:190, 192, 193, 195-198, 507, 513-514, 987, 998, 1001` (old -> new above).
- `tests/ctcourse/a8Strongroom.test.ts:1003, 1888, 1890, 1892, 1899`.
- `tests/ctcourse/a7DataHall.light.json` "A7 hall floor"; `tests/ctcourse/a8Strongroom.light.json` "A8 hall floor".

## Deviations from the brief
- The counter lamps' y lives in the `LAMP` table (`counter.y`, `:193`) and is read at `:507` and by the stem at `:1001`;
  the time locks' two levels are `lock.t1` / `lock.t2` (`:198`).
- `a8Strongroom.test.ts` lamp and stem asserts updated (listed above), as the brief allows.
- The `:998` stem comment edited with the stem line.
- Report path per the lead's prompt (`docs/marlow-final/slices/`), not `docs/sector-redesign/checks/`.
