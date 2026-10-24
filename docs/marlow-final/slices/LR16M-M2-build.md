# LR16-M part M2 - A3 the Office Range, A4 the Goods Shed (build report)

Builder: Opus 5.5, 2026-10-24. Branch `feature/marlow-lr16m-m2`, base `f85ef736`. Brief: `C:/NightShift/scratch/LR16-M-brief.md`
"Part M2". Every number is from `CTLIGHT_PRINT=1 npx vitest run tests/ctcourseLight.test.ts --silent=false --maxWorkers=2`
under a slot lock (`--silent=false` is needed on vitest 5: without it the print case's `console.info` is not shown).

## Result
PASS against the brief's Acceptance list, with one pre-existing red outside the part (below). All brief values landed as
written; no tuning beyond the brief's table was needed; no probe was used.

## Changed lines (old -> new, lever, why realistic)
| file:line | lamps (registry ids) | old -> new | lever, why |
| --- | --- | --- | --- |
| `src/world/maps/ctcourseSets/a3OfficeRange.ts:297` | corridor panels #67-#72, group 30 | i 0.9 -> 0.16 | L1: an office corridor on its night setting; the panels are 1.3 m over a head |
| `a3OfficeRange.ts:298` | office panels #73-#78, groups 31-33 | i 0.85 each -> per group `{ 31: 0.3, 32: 0.52, 33: 0.2 }[g]` | L1: one night level per circuit; each office's light passes the frosted (collision-only) partitions, so the neighbours set a cut office's level |
| `a3OfficeRange.ts:299` | lobby downlights #79 west, #80 east, group 34 | i 1.5 / 0.9 -> 0.5 / 0.2 | L1: the landlord's timer downlights dimmed |
| `src/world/maps/ctcourseSets/a4GoodsShed.ts:207` | the `LAMP` table comment | "prototype values, tuned with `CTLIGHT_WRITE=a4GoodsShed`" -> "night levels re-tuned under the LR16 light model in LR16-M to the levels tuned with `CTLIGHT_WRITE=a4GoodsShed`" | comment (brief) |
| `a4GoodsShed.ts:209` room | security room panels #81-#82, group 40 | i 0.8 -> 0.21 | L1: panel night level |
| `a4GoodsShed.ts:210` bay | floor high-bays #83-#90, group 41, y 7.2 | i 1.15 -> 1.05 | L1: a 7.2 m high-bay barely changes under inverse square at the head |
| `a4GoodsShed.ts:211` aisle | aisle strips #91-#96, group 42, y 5.6 | i 1.25 -> 0.22 | L1: rack-aisle strips on their night setting |
| `a4GoodsShed.ts:212` mezz | mezzanine strips #97-#100, group 43, y 6.3 | i 0.9 -> 0.33 | L1: strips close over the mezzanine deck dimmed |
| `tests/ctcourse/a3OfficeRange.light.json:14` | "A3 corridor floor" | 0.41 -> 0.56 | re-take (decision 2), hand-edited from the print |
| `tests/ctcourse/a4GoodsShed.light.json:23` | "A4 floor" | 0.35 -> 0.59 | re-take (decision 2), hand-edited from the print |

No lamp added, removed, moved or regrouped; radii, colours and fixtures unchanged; no set test assert needed a change.

## Red points base -> after (B band break, T tuned miss, R re-take)
| spot | band | tuned | base | after | |
| --- | --- | --- | --- | --- | --- |
| A3 corridor centre | pool | 0.83 | 1.00 | 0.79 | T |
| A3 west lobby | read | 0.61 | 1.00 | 0.58 | T |
| A3 east lobby | read | 0.61 | 1.00 | 0.59 | T |
| A3 office 2 cut | cut | 0.14 | 0.35 | 0.21 | B T |
| A3 office 3 cut | cut | 0.14 | 0.25 | 0.21 | B T |
| A3 far desk | read | 0.48 | 1.00 | 0.49 | T |
| A3 corridor floor | any | 0.41 -> 0.56 | 1.00 | 0.56 | R |
| A4 main aisle | pool | 0.83 | 0.91 | 0.84 | T |
| A4 main aisle east | pool | 0.83 | 0.98 | 0.90 | T |
| A4 aisle 2 / aisle 2 east | read | 0.45 | 1.00 | 0.48 / 0.47 | T |
| A4 east lane | read | 0.60 | 0.85 | 0.67 | T |
| A4 mezzanine | read | 0.89 | 1.00 | 0.92 | T |
| A4 floor | any | 0.35 -> 0.59 | 0.63 | 0.59 | R |

Base reproduced the brief's table exactly (13 band lines, 57 tuned lines). After: no failure line names an A3 or A4 spot;
the remaining 54 lines are M1 / M3 / M4's (70 - 16 = 54). Other prints within +-0.02 of base: the only change outside A3 / A4
is "F L2 pad floor" (facility, band checks only) 0.83 -> 0.81.

Other A3 / A4 spots moved too but stay in band and within 0.08: A3 office 1 cut 0.22 -> 0.19, A4 secroom 1.00 -> 0.93
(master 0.92), A4 passage 0.18 -> 0.15, A4 dock 0.76 -> 0.71 (master 0.68), A4 back aisle west end 0.19 -> 0.18.

## Edges after
- Band edges (within 0.035): A3 office 2 cut 0.21 and office 3 cut 0.21 (cut 0.24; the brief measured 0.206 / 0.209).
- Tuned edges (0.05-0.075 off master): A3 office 2 / 3 cut +0.07, A4 main aisle east +0.07, A4 east lane +0.07.

## Checks
- `tests/ctcourseLight.test.ts`: still red on other parts' sets only (expected until the merge); A3 / A4 clean.
- Pass: `tests/ctcourse/a3OfficeRange.test.ts` 54, `tests/ctcourse/a4GoodsShed.test.ts` 57, `tests/ctcourse.test.ts` 28,
  `tests/ctcourseGreybox.test.ts` 77, `tests/marlowLightingCircuits.test.ts` 9, `tests/lampBoxAlign.test.ts` 6,
  `tests/lampAtlasFit.test.ts` 6, `tests/lampFlicker.test.ts` 20.
- `tests/marlowLightingLevels.test.ts`: 2 of 7 red, pre-existing and outside this part. The file imports only
  `src/world/lights`, `src/world/lighting/levels`, `src/voxel/lampBake` and `marlowCircuits` (none touched here):
  "lampLevel is the registry contribution of a downward lamp" (0.3456 vs 0.9072, the old linear formula against the LR16
  registry) and "a room cove row at 2.4 m centres reads lit enough" (0.396 < 0.4). Left for the lead / INT.
- `npx tsc --noEmit` clean; `npx eslint` on the two map files clean. `lampBake` not run (INT owns its hash).

## Marlow-owned lines touched (for Marlow Build)
- `src/world/maps/ctcourseSets/a3OfficeRange.ts:297` `panel(x, A3_CORRIDOR.at.z, 30, 3.8, 0.9, 1.2, 0.3)` -> intensity 0.16
- `a3OfficeRange.ts:298` office panel intensity 0.85 -> `({ 31: 0.3, 32: 0.52, 33: 0.2 } as const)[g]`
- `a3OfficeRange.ts:299` lobby tuples `[77.75, 8.0, 6.0, 1.5], [98.5, 6.5, 5.5, 0.9]` -> intensities 0.5 / 0.2
- `src/world/maps/ctcourseSets/a4GoodsShed.ts:207` `LAMP` comment (text above)
- `a4GoodsShed.ts:209-212` `LAMP` intensities room 0.8 -> 0.21, bay 1.15 -> 1.05, aisle 1.25 -> 0.22, mezz 0.9 -> 0.33
- `tests/ctcourse/a3OfficeRange.light.json:14` "A3 corridor floor" 0.41 -> 0.56
- `tests/ctcourse/a4GoodsShed.light.json:23` "A4 floor" 0.35 -> 0.59

## Deviations
- Report path: `docs/marlow-final/slices/LR16M-M2-build.md` (the lead's instruction) instead of the brief's
  `docs/sector-redesign/checks/lr16m-m2-build.md`. Committed and pushed on the branch by the builder (the lead's
  instruction), not left for the lead.
