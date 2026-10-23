# LR16-M part M3 build - A5 the Substation, A6 the Pump House

Brief: `C:/NightShift/scratch/LR16-M-brief.md`, "Part M3". Branch `feature/marlow-lr16m-m3` off `f85ef736`. Opus 5.5, 2026-10-24.
Every lever in the brief's M3 tables landed as written; no tuning beyond the table was needed, no probe was used.

## Changed lines (old -> new, lever, why realistic)
`src/world/maps/ctcourseSets/a5Substation.ts`
| line (old -> new) | old | new | lever, why |
| --- | --- | --- | --- |
| `:133` -> `:133-135` | flood comment, one line | names the reach that stops short of the landing (the A5 sheet's words), radius 6.9 / reach 11.0 m | comment |
| `:134` -> `:136` `A5_FLOOD` | radius 10.5, intensity 1.5 | radius 6.9 (registry reach 11.0), intensity 3.0; aim and outer 0.55 unchanged | L2' + L1: the landing mark is 11.9 m out and nearer the axis than the kiosk, so only the reach separates them; a sodium flood with a shorter throw, brighter, lights the strip |
| `:135` -> `:137-139` | kiosk lamp comment | a hooded gooseneck task light aimed down and back at the keypad; the operator behind the hood | comment |
| `:136` -> `:140` `A5_KIOSK_LAMP` | `{ x, y, z, radius: 1.2, intensity: 0.1 }` | adds `aim: [-0.3, -0.35, 0]`, `outer: 0.5` | L2: the aim lives in the constant |
| `:334` -> `:338` | switchroom panel i 0.8 | i 0.23 | L1: a night setting on a panel 1.3 m over the head |
| `:336` -> `:340` | point lamp | `kind: 'spot'`, `cone: makeCone(k.aim[0], k.aim[1], k.aim[2], k.outer)`; position, radius 1.2, i 0.1 unchanged | L2: a hooded gooseneck lights the keypad on the kiosk's east face, not the operator standing behind its hood |

`src/world/maps/ctcourseSets/a6PumpHouse.ts`
| line (old -> new) | old | new | lever, why |
| --- | --- | --- | --- |
| `:47` (new) | - | `import { makeCone } from '../../lights';` | import |
| `:303` (new comment) | - | `// one high-bay optic for the row (LR16-M) ...` | comment |
| `:303-304` -> `:305-306` | point high-bays, i 1.1 each, loop tuple `[x, z]` | `kind: 'spot'`, `cone: makeCone(0, -1, 0, 0.9)`; tuple `[x, z, intensity]`: 2.8 / 2.9 / 1.2 (z 57.5 / 63 / 68.5) | L2 + L1: a high-bay optic (about 50 degrees half angle) keeps the entry vantage dark; brighter bays over pumps 1-2 reach the gauge board and the outfall approach through the pump gear; the bay over the desk stays lower (the desk has its own lamp) |
| `:307` -> `:309` | bridge pendant i 0.9 | i 0.28 | L1 |
| `:309` -> `:311` | gallery bulkheads i 0.9 | i 0.7 | L1 |
| `:311` -> `:313` | desk lamp i 0.6 | i 0.7 | L1 |
| `:312` -> `:314` | cage work light i 1.3 | i 0.21 | L1: the cage stays a pool, B hanging in it is lit, the tension stays |

`tests/ctcourse/a6PumpHouse.light.json`: "A6 pump floor" 0.39 -> 0.64 (the re-take, hand-edited; no other key).

## Red points base -> after (`CTLIGHT_PRINT=1`, 2 decimals; band = `MARLOW_LEVEL`)
| spot | band | master | base | after |
| --- | --- | --- | --- | --- |
| A5 strip centre | pool | 0.75 | 0.56 B T | 0.75 |
| A5 kiosk cut | cut | 0.22 | 1.00 B T | 0.16 |
| A5 landing mark | pocket | 0.14 | 0.23 B T | 0.16 |
| A5 switchroom | read | 0.68 | 1.00 T | 0.69 |
| A6 gauge board | read | 0.85 | 0.59 T | 0.84 |
| A6 outfall approach | read | 0.95 | 0.69 T | 1.00 |
| A6 holder | read | 0.52 | 1.00 T | 0.49 |
| A6 cage | pool | 0.75 | 1.00 T | 0.81 |
| A6 pump floor | any | 0.39 | 0.42 | 0.64 (re-take) |
Other A5 / A6 spots after: A5 kiosk 1.00 (0.97), landing 0.15 (0.14), strip floor 0.56 (0.51), A6 desk 0.75 (0.78), vantage 0.14
(0.14; base 0.19), holder cut 0.14 (0.19); all within 0.08 and in band.

## Edges after
No A5 / A6 spot within 0.035 of its `MARLOW_LEVEL` band edge (nearest: A5 kiosk cut 0.16 / cut 0.24, landing mark 0.16 / pocket
0.22, A6 holder 0.49 / read 0.40). Tuned edges (0.05-0.08 from master): A5 kiosk cut 0.16 (0.22), A5 strip floor 0.56 (0.51;
also 0.04 under the meter's lit line 0.60), A6 outfall approach 1.00 (0.95), A6 cage 0.81 (0.75), A6 holder cut 0.14 (0.19).

## Re-take
`tests/ctcourse/a6PumpHouse.light.json` "A6 pump floor": 0.39 -> 0.64 (meter mid -> lit; the brief's "For Michael" 2).

## Checks
- `tests/ctcourseLight.test.ts`: no failure line names an A5 / A6 spot (base: 3 band + 8 tuned A5 / A6 lines). The other sets'
  125 printed levels all within +-0.02 of the base print (diffed: 0 over). The other parts' reds stay until the merge.
- Pass: `tests/ctcourse/a5Substation.test.ts` (61), `tests/ctcourse/a6PumpHouse.test.ts` (55), `tests/ctcourse.test.ts` (28),
  `tests/ctcourseGreybox.test.ts` (77), `tests/marlowLightingCircuits.test.ts` (9), `tests/lampBoxAlign.test.ts` (6),
  `tests/lampAtlasFit.test.ts` (6), `tests/lampFlicker.test.ts` (20). No set test assert needed a change (`a5Substation.test.ts`
  radius and position checks and the gooseneck skin hold; `a6PumpHouse.test.ts` checks the bays' x and y only).
- Red, not this part's: `tests/marlowLightingLevels.test.ts` 2 of 7 ("lampLevel is the registry contribution of a downward
  lamp": 0.346 vs 0.907; "a room cove row ... reads lit enough": 0.396 < 0.40). The test imports only `src/world/lights.ts`,
  `src/world/lighting/levels.ts`, `marlowCircuits.ts` and `lampBake` with synthetic lamps; none is touched here, so it is red
  on `f85ef736` (the LR16 photometric model against the planning formula `lampLevel`). For the lead / INT.
- `npx tsc --noEmit` clean; `npx eslint` on both set files clean.
- `lampBake` not run (INT's hash).

## Deviations
- The base print needed `--silent=false`: vitest 5 here swallowed the print case's `console.info` without it (the first base
  run printed only the failure lists). Same flag on the after print.
- Report path per the caller: `docs/marlow-final/slices/LR16M-M3-build.md` (the brief names `docs/sector-redesign/checks/`),
  committed on the branch.
- The two A5 comments grew from one line to three each (line numbers below `:136` shift by 4); one comment line added over
  the A6 bay loop.

## Marlow-owned lines touched (for Marlow Build)
- `src/world/maps/ctcourseSets/a5Substation.ts:133-140` (was `:133-136`): `A5_FLOOD` radius 10.5 -> 6.9, intensity 1.5 -> 3.0;
  `A5_KIOSK_LAMP` + `aim: [-0.3, -0.35, 0]`, `outer: 0.5`; both comments.
- `a5Substation.ts:338` (was `:334`): switchroom panel intensity 0.8 -> 0.23.
- `a5Substation.ts:340` (was `:336`): kiosk lamp point -> `kind: 'spot'` with `cone: makeCone(k.aim..., k.outer)`.
- `src/world/maps/ctcourseSets/a6PumpHouse.ts:47`: + `import { makeCone } from '../../lights';`.
- `a6PumpHouse.ts:303-306` (was `:303-304`): + comment; bay loop `[x, z]` -> `[x, z, intensity]` (2.8 / 2.9 / 1.2), point i 1.1
  -> `kind: 'spot'`, `cone: makeCone(0, -1, 0, 0.9)`.
- `a6PumpHouse.ts:309` (was `:307`): pendant 0.9 -> 0.28; `:311` (`:309`): bulkheads 0.9 -> 0.7; `:313` (`:311`): desk lamp
  0.6 -> 0.7; `:314` (`:312`): cage light 1.3 -> 0.21.
- `tests/ctcourse/a6PumpHouse.light.json`: "A6 pump floor" 0.39 -> 0.64.
