status: open

# LR16-M - Marlow Yard (ctcourse, A1-A8) re-tuned under the one LR16 light model (Opus build briefs, 4 parallel parts + 1 integration step)

Planner: Opus 5.5, 2026-10-24 (plans only). Base: `origin/feature/sector-redesign-lr16-entry` @ `f85ef736` (lr16int 809c25f4 +
master 5d1e8e3e, `PROTOCOL_VERSION` 45, `LAMP_VERSION` 7). Every number below was measured on that head (vitest, slot lock,
maxWorkers 2): the base run of `tests/ctcourseLight.test.ts`, a decomposition probe (per lamp direct, bounce, ambient), and
the full lever set below applied to the registry in memory before the bake (the bake, the meter and the guards read the
registry, so this is what the source edits will produce; fixture boxes are render-only). Result of the lever set: the band
test green (every pool, read, pocket, cut, standby and house spot), the tuned test green but for 6 floor pins (band `any`)
that the brief re-takes. Michael (PLAN.md LR16): "Must be realistic depiction of light"; soft edges, no hard arcs; light
parity (picture, meter and guards agree).

## Lead decisions baked in
1. Marlow's tuned levels (`tests/ctcourse/<set>.light.json`, master marlow-final) are the target: every spot comes back
   within 0.08 of its master level and in its meter band, so the json files stay as Marlow tuned them. The bands
   (`MARLOW_LEVEL`, `src/world/lighting/levels.ts`) and `tests/ctcourseLight.test.ts` do not change.
2. The only json edits: the six floor pins (band `any`, surface points, no design band) listed in "Re-takes". Under the
   photometric falloff plus bounce a floor under a high fitting is brighter relative to a standing body than under the old
   linear falloff (inverse square: the floor is only 1.6-1.8 m further from a 7 m fitting than the head; the floor also
   takes the bounce), so no realistic layout holds both the old floor pin and the old body level. Hand-edit those six
   values only; never `CTLIGHT_WRITE` a whole set.
3. A8 counter lamps `ctcourse:136-138` (y 1.4, 0.2 m over the 1.2 m counters): moved up, not accepted. The light point
   goes to y 1.6, the bulb inside a banker's-lamp shade 0.4 m over the marble top (a real fitting position); the brass
   stem dressing follows (1.23-1.4 -> 1.23-1.6). The cell under the light then clears the counter's occupancy (top 1.21 +
   0.1 m dilation < 1.4), so the three entries leave `KNOWN_EMBEDDED` (`tests/lampBoxAlign.test.ts:218-220`). Measured:
   the jam spot pocket stays 0.17 (pocket 0.22), A8 front 0.76.
4. No lamp is added or removed, no lamp moves in plan, no route point moves. Levers used: L1 night level (intensity), L2
   beam (a downward optic), L2' aim / reach of an existing spot (A5 flood reach, A5 kiosk hood), L3' height of the A8
   counter lamps. No light-model, bake, shader, constant or band change.

## Verdict in five lines
1. Red on the base: 2 asserts, 13 band breaks and 57 tuned misses (the train-entry check's list, reproduced exactly; table
   below). Cause: master's levels were set under the linear falloff. Under LR16 (reach x 1.6, photometric near field
   `10 / (d^2 + 1)`, the bake box on the lamp, one bounce) a fitting 0.8-2.3 m over a head reads 2-6x unclamped.
2. Fix: each circuit gets a night level (a dimmed LED setting) so the room reads Marlow's tuned level again; three places
   need more than a level: the A2 shed strips get a high-bay optic (the neck stays dark when cut), the A5 flood's reach
   stops short of the landing pocket (as the A5 sheet already says), the A5 kiosk panel light becomes a hooded gooseneck
   aimed at the keypad (it stood 0.1 m from the operator's head).
3. Four parts, two sets each, file-disjoint (each set is its own map file and its own json). INT re-pins the one shared
   hash (`tests/lampBake.test.ts:342`) after the merge.
4. All 13 bands and 51 of 57 tuned points are met by layout; the other 6 are the floor pins (decision 2). Two of those
   change meter band (A6 pump floor 0.39 mid -> 0.64 lit, A8 hall floor 0.23 dark -> 0.41 mid): Michael / Marlow see them.
5. No band needs a light-model change. Nothing blocks the build.

## Red list on f85ef736 -> after the lever set (measured)
`band` is the spot's `MARLOW_LEVEL` band (pool >= 0.60, read >= 0.40, pocket <= 0.22 crouched, cut <= 0.24 with its
circuit off); `tuned` is master's json; `base` is LR16 today; `after` is with this brief's levers. B = band break, T =
tuned miss (> 0.08), R = re-take (decision 2).

| set | spot | band | tuned | base | after | | part |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | A1 mark | pool | 0.70 | 0.37 | 0.69 | B T | M1 |
| A1 | A1 apron centre | read | 1 | 0.85 | 1.00 | T | M1 |
| A1 | A1 lounge | read | 0.79 | 1.00 | 0.84 | T | M1 |
| A1 | A1 cabin | read | 0.67 | 1.00 | 0.69 | T | M1 |
| A1 | A1 apron floor | any | 0.81 | 0.62 | 1.00 | R | M1 |
| A2 | A2 neck crossing west / east cut | cut | 0.16 | 0.28 | 0.17 | B T | M1 |
| A2 | A2 neck cess west / east cut | cut | 0.19 | 0.30 | 0.18 | B T | M1 |
| A2 | A2 rake gap / east rake gap | read | 0.71 | 0.94 | 0.70 | T | M1 |
| A2 | A2 cess | read | 0.71 | 0.88 | 0.70 | T | M1 |
| A2 | A2 vantage | read | 0.54 | 0.69 | 0.49 | T | M1 |
| A2 | A2 cabinet 1 | read | 0.57 | 1.00 | 0.59 | T | M1 |
| A2 | A2 coat corner | pocket | 0.19 | 0.61 | 0.20 | B T | M1 |
| A2 | A2 deck | read | 0.54 | 1.00 | 0.56 | T | M1 |
| A2 | A2 cabinet 2 | read | 0.45 | 0.62 | 0.47 | T | M1 |
| A3 | A3 corridor centre | pool | 0.83 | 1.00 | 0.79 | T | M2 |
| A3 | A3 west lobby | read | 0.61 | 1.00 | 0.58 | T | M2 |
| A3 | A3 east lobby | read | 0.61 | 1.00 | 0.59 | T | M2 |
| A3 | A3 office 2 cut | cut | 0.14 | 0.35 | 0.21 | B T | M2 |
| A3 | A3 office 3 cut | cut | 0.14 | 0.25 | 0.21 | B T | M2 |
| A3 | A3 far desk | read | 0.48 | 1.00 | 0.49 | T | M2 |
| A3 | A3 corridor floor | any | 0.41 | 1.00 | 0.56 | R | M2 |
| A4 | A4 main aisle | pool | 0.83 | 0.91 | 0.84 | T | M2 |
| A4 | A4 main aisle east | pool | 0.83 | 0.98 | 0.90 | T | M2 |
| A4 | A4 aisle 2 / aisle 2 east | read | 0.45 | 1.00 | 0.48 / 0.47 | T | M2 |
| A4 | A4 east lane | read | 0.60 | 0.85 | 0.67 | T | M2 |
| A4 | A4 mezzanine | read | 0.89 | 1.00 | 0.92 | T | M2 |
| A4 | A4 floor | any | 0.35 | 0.63 | 0.59 | R | M2 |
| A5 | A5 strip centre | pool | 0.75 | 0.56 | 0.75 | B T | M3 |
| A5 | A5 kiosk cut | cut | 0.22 | 1.00 | 0.16 | B T | M3 |
| A5 | A5 landing mark | pocket | 0.14 | 0.23 | 0.17 | B T | M3 |
| A5 | A5 switchroom | read | 0.68 | 1.00 | 0.69 | T | M3 |
| A6 | A6 gauge board | read | 0.85 | 0.59 | 0.84 | T | M3 |
| A6 | A6 outfall approach | read | 0.95 | 0.69 | 1.00 | T | M3 |
| A6 | A6 holder | read | 0.52 | 1.00 | 0.49 | T | M3 |
| A6 | A6 cage | pool | 0.75 | 1.00 | 0.81 | T | M3 |
| A6 | A6 pump floor | any | 0.39 | 0.42 | 0.64 | R (moves with the bays) | M3 |
| A7 | A7 T1 | pool | 0.67 | 1.00 | 0.70 | T | M4 |
| A7 | A7 aisle B | read | 0.80 | 1.00 | 0.87 | T | M4 |
| A7 | A7 aisle C | read | 0.76 | 1.00 | 0.79 | T | M4 |
| A7 | A7 north apron | read | 0.76 | 1.00 | 0.71 | T | M4 |
| A7 | A7 R1 | read | 0.53 | 1.00 | 0.55 | T | M4 |
| A7 | A7 R1 cut | cut | 0.14 | 0.40 | 0.21 | B T | M4 |
| A7 | A7 lobby | read | 0.56 | 1.00 | 0.60 | T | M4 |
| A7 | A7 corridor | read | 0.90 | 1.00 | 0.94 | T | M4 |
| A7 | A7 grating | read | 0.48 | 1.00 | 0.47 | T | M4 |
| A7 | A7 T2 | read | 0.61 | 1.00 | 0.61 | T | M4 |
| A7 | A7 hall floor | any | 0.34 | 1.00 | 0.43 | R | M4 |
| A8 | A8 grille approach | pool | 0.64 | 0.86 | 0.64 | T | M4 |
| A8 | A8 grille approach cut | cut | 0.22 | 0.37 | 0.19 | B T | M4 |
| A8 | A8 gallery east | read | 0.59 | 1.00 | 0.59 | T | M4 |
| A8 | A8 office | read | 0.82 | 1.00 | 0.87 | T | M4 |
| A8 | A8 T1 | read | 0.79 | 1.00 | 0.80 | T | M4 |
| A8 | A8 T2 | read | 0.83 | 1.00 | 0.81 | T | M4 |
| A8 | A8 hall floor | any | 0.23 | 0.42 | 0.41 | R | M4 |
| - | `lampBoxAlign` KNOWN_EMBEDDED ctcourse:136-138 | - | - | listed | removed | decision 3 | M4 |
| - | `lampBake` Marlow scratch-cut hash | - | - | 6efdcc4965ad2745 | re-pin | | INT |

Every other spot of the 135 set spots and the 15 facility spots stays in band and within 0.08 of master (measured).
Edges after (watch them; within 0.035 of a band edge): A2 coat corner 0.200 (pocket 0.22), A3 office 2 cut 0.206 / office
3 cut 0.209 (cut 0.24), A7 R1 cut 0.206 (cut 0.24). Tuned edges 0.05-0.075: A2 neck floor, A3 office cuts, A4 main aisle
east / east lane, A5 kiosk cut / strip floor, A6 outfall / cage, A7 aisle B / R1 cut.

### Re-takes (decision 2): hand-edit these six json values only
| file | key | master | new |
| --- | --- | --- | --- |
| `tests/ctcourse/a1Gate.light.json` | A1 apron floor | 0.81 | measured (about 1) |
| `tests/ctcourse/a3OfficeRange.light.json` | A3 corridor floor | 0.41 | measured (about 0.56) |
| `tests/ctcourse/a4GoodsShed.light.json` | A4 floor | 0.35 | measured (about 0.59) |
| `tests/ctcourse/a6PumpHouse.light.json` | A6 pump floor | 0.39 | measured (about 0.64) |
| `tests/ctcourse/a7DataHall.light.json` | A7 hall floor | 0.34 | measured (about 0.43) |
| `tests/ctcourse/a8Strongroom.light.json` | A8 hall floor | 0.23 | measured (about 0.41) |
Take the value from `CTLIGHT_PRINT=1` (2 decimals). Every other key in every json stays as master has it.

## Parts (all branch off `f85ef736`; Opus builds each)
| part | branch | files (only these) | fixes |
| --- | --- | --- | --- |
| M1 | `feature/sector-redesign-lr16m-m1` | `src/world/maps/ctcourseSets/a1Gate.ts` (`:171`, `:198`, `:202`); `src/world/maps/ctcourseSets/a2CarriageShed.ts` (an import line, `:270-281`); `tests/ctcourse/a1Gate.light.json` (one key); `tests/ctcourse/a1Gate.test.ts`, `a2CarriageShed.test.ts` only if a lamp assert needs the new shape | A1 5 + A2 12 |
| M2 | `feature/sector-redesign-lr16m-m2` | `a3OfficeRange.ts` (`:297-299`); `a4GoodsShed.ts` (`LAMP` `:208-213`); `tests/ctcourse/a3OfficeRange.light.json`, `a4GoodsShed.light.json` (one key each); their `.test.ts` as above | A3 7 + A4 7 |
| M3 | `feature/sector-redesign-lr16m-m3` | `a5Substation.ts` (`:133-136`, `:334`, `:336`); `a6PumpHouse.ts` (an import line, `:301-312`); `tests/ctcourse/a6PumpHouse.light.json` (one key); their `.test.ts` as above | A5 4 + A6 5 |
| M4 | `feature/sector-redesign-lr16m-m4` | `a7DataHall.ts` (`:360-366`); `a8Strongroom.ts` (`LAMP` `:191-198`, `:507`, `:513-514`, the stem `:998-1001` and the A8-20 register text `:987`); `tests/ctcourse/a7DataHall.light.json`, `a8Strongroom.light.json` (one key each); `tests/lampBoxAlign.test.ts:218-220` (remove); their `.test.ts` as above | A7 11 + A8 7 + decision 3 |
| INT | on the lead's merge branch `feature/sector-redesign-lr16m` (cut from `f85ef736`) | `tests/lampBake.test.ts:342` (hash) | the hash; the whole file green |
Merge order: M1, M2, M3, M4 (any order: disjoint files), then INT. Nobody edits `src/world/maps/ctcourse.ts`,
`ctcourseSets/facility.ts`, `types.ts`, `stub.ts`, `tests/ctcourseLight.test.ts`, `MARLOW_LEVEL`, `marlowCircuits.ts`.

## Rules for every part
Read `docs/systems/agent-preamble.md` first. Desktop only: `npx tsc --noEmit` (or `npm run typecheck:fast`), `npx eslint
<your files>`, single vitest files `--maxWorkers=2` under a slot lock (`( set -o noclobber; echo "<part> | <time>" >
C:/NightShift/scratch/sr-slot-<n>.lock )`, n 1..4, delete after; wait while `powershell -NoProfile -Command
"(Get-CimInstance Win32_Processor).LoadPercentage"` > 90). No e2e, no build, no `npm run dev`. Commit on your branch, push;
the lead merges.

Levers (each is map data; say which per line in the report and why it is realistic):
- L1 night level: a fitting's intensity (an LED on its night setting). A lit fitting stays >= 0.03.
- L2 beam: a downward optic on a fitting that is a point lamp today: `kind: 'spot'`, `cone: makeCone(0, -1, 0, <half
  angle rad>)` (`src/world/lights.ts:125`; inner defaults to 0.6 x outer; the field uses the outer edge with
  `SPOT_FEATHER` 0.65, so the edge is soft) and `import { makeCone } from '../../lights';` where the file lacks it. A spot
  uses `SPOT_EXP` 2, so it reads about 25-30% lower under its axis than the point lamp it replaces: the intensities below
  already include that.
- L2' an existing spot's aim, half angle or reach (authored radius; the registry holds radius x `PHOTO.reach` 1.6).
- L3' a fitting's height on its own mount (A8 counter lamps only).
Never: add or remove a lamp, change a lamp's group, move a lamp in plan, move a route point, guard post or named spot,
change any band, `MARLOW_LEVEL`, `CAP`-like constants, `PHOTO`, `BOUNCE`, `LAMP_LEVEL_GAIN`, `lampMath`, `lampBake`,
`lightField`, `LAMP_VERSION`, `ctcourseLight.test.ts`, or any json key but the one re-take your part owns.

### Step 0 (each part, before any edit)
1. Base: `CTLIGHT_PRINT=1 npx vitest run tests/ctcourseLight.test.ts --maxWorkers=2 > <scratch>/base.txt 2>&1` (~40 s; the
   print case runs before the tuned case, so the file has every set's levels plus both failure lists). The base reproduces
   the table above (13 band lines, 57 tuned lines).
2. After each change, the same into `<scratch>/after.txt`. Your sets' spot names start with your set ids ("A1 ", "A2 ").
   Accept when neither failure list holds a name of your sets, and every other set's printed level is within +-0.02 of
   the base print (diff the two prints; another part's red stays red until the merge).
3. Optional, for a lever that does not land: the decomposition probe of LR16-W (`docs/sector-redesign/briefs/LR16-W.md`
   "Step 0", adapted to `LIGHT_SPOTS` / `levelOf`) in an untracked `tests/zzMprobe.test.ts`; delete before the commit.
   Registry ids (`ctcourse:<id>`) are given per lamp below.

### Acceptance (each part)
- In `ctcourseLight`: no failure line names a spot of your sets; your re-take key changed, no other key; the other sets'
  levels within +-0.02 of base.
- `tests/ctcourse/<your two sets>.test.ts`, `tests/ctcourse.test.ts`, `tests/ctcourseGreybox.test.ts`,
  `tests/marlowLightingCircuits.test.ts`, `tests/marlowLightingLevels.test.ts`, `tests/lampBoxAlign.test.ts`,
  `tests/lampAtlasFit.test.ts`, `tests/lampFlicker.test.ts` pass (`lampBake` is INT's: its Marlow hash goes red with any
  lamp change; leave it). A set test that asserts an old lamp value or shape: update the assert to the new value and say
  so (keep its intent; positions, groups and counts do not change here). `npx tsc --noEmit` clean; eslint clean on your files.
- Report `docs/sector-redesign/checks/lr16m-<part>-build.md` (the lead commits it): every changed line old -> new with
  its lever and why it is realistic; every red point base -> after; your edges after; the re-take old -> new; the list of
  Marlow-owned lines you touched (file:line, old -> new) for Marlow Build.

## Part M1 - A1 the Gate, A2 the Carriage Shed
Branch `feature/sector-redesign-lr16m-m1`. Files: `a1Gate.ts`, `a2CarriageShed.ts`, `tests/ctcourse/a1Gate.light.json`
(A1 apron floor only).

A1 (`a1Gate.ts`; LIGHTING-PLAN 3 A1: lounge house 10, apron 11 photocell flood, yard 12, cabin 13):
| line | lamp (registry id) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:171` | lounge coves, 4 lit slots (#43-#46), group 10 | i 0.4 | i 0.12 | L1: the lounge read 1.00 (unclamped 2.1, four coves 0.45 each at 0.8 m over a head); warm coves on a night setting bring "A1 lounge" to 0.84 (master 0.79) |
| `:198` | apron flood (#47), sodium spot on the cabin | i 1.5 | i 3.5 | L1 up: the striped mark is 9 m out; photometric falloff takes it from 0.70 to 0.37. A sodium security flood at 3.5 lights the mark 0.69 (pool 0.60, the bolt reads) while the apron near the cabin clamps at 1 (master 1). Aim and cone unchanged (`a1Gate.test.ts:403-404`) |
| `:202` | cabin panel (#51), group 13 | i 0.6 | i 0.065 | L1: the panel is 0.85 m over the checker's head (unclamped 5.2); a cabin night panel gives 0.69 (master 0.67). Yard bulkheads `:201` unchanged |
Re-take: "A1 apron floor" 0.81 -> measured (about 1.0: the flood's floor under its near beam).

A2 (`a2CarriageShed.ts`; LIGHTING-PLAN 3 A2: "Shed general 20's strips stop short of the neck (their reach is the
rakes), else the cut does not darken the crossing"):
| line | lamp (registry id) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:275` | neck high-bays (#52-#55), group 21 | i 1.0 | i 1.1 | L1: keeps the neck pool >= 0.94 with the strips on a beam |
| `:279` (with the `strip` helper `:270-272`) | shed strips (#56-#61), group 20, y 6.5 | point, i 1.1 | spot `makeCone(0, -1, 0, 0.9)`, i 0.8; the east strip (68, 11) (#61) i 0.95 | L2 + L1: a high-bay optic (about 50 degrees half angle). Under the old reach the strips stopped short of the neck; at reach x 1.6 the x 41 / 61 strips light the neck cut points 5.5 m away at 45-48 degrees off axis (0.28-0.30 with 21 cut). With the optic those points sit outside the cone (0.17 / 0.18; cut 0.24), the rakes under the strips read 0.70 (master 0.71). #61 is a touch brighter so cabinet 2 (2.5 m off its axis) reads 0.47 (read 0.40). Give group 20 its own `b.light` call (or a beam argument): the staging strips (group 23) share the helper and must stay point lamps (the deck is 1 m under them, 2 m to the side) |
| `:280` | cabin panel (#62), group 22 | i 0.6 | i 0.075 | L1: cabinet 1 under the panel 0.59 (master 0.57); the coat corner (crouched, 2.4 m off) 0.20 (pocket 0.22). If the coat corner drifts over 0.21: L2 `makeCone(0, -1, 0, 0.7)` on this panel (a downlight; the corner falls outside) and re-tune |
| `:281` | staging strips (#63-#66), group 23 | i 0.8 | i 0.27 | L1: the deck reads 0.56 (master 0.54; the deck is 1 m under the strips) |
Watch: "A2 neck floor" 0.935 (master 0.88), the coat corner (edge), cabinet 2 (0.47).
`a2CarriageShed.test.ts:478-481` checks group 20's x and y only: unchanged.

## Part M2 - A3 the Office Range, A4 the Goods Shed
Branch `feature/sector-redesign-lr16m-m2`. Files: `a3OfficeRange.ts`, `a4GoodsShed.ts`, their light json (one key each).

A3 (`a3OfficeRange.ts:297-299`, the `panel` helper `:294`; the ceiling is 2.95 m, every panel 1.3 m over a head):
| line | lamp (registry id) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:297` | corridor panels (#67-#72), group 30 | i 0.9 | i 0.16 | L1: corridor centre 0.79 (pool, master 0.83). An office corridor on its night setting |
| `:298` | office panels (#73-#78), groups 31-33 | i 0.85 each | office 1 (31) 0.30, office 2 (32) 0.52, office 3 (33) 0.20 (per circuit: pass the level by group) | L1: the offices' middles stay clamped at 1 (master 1); each office's light passes the frosted partitions (collision-only glass, LIGHTING-PLAN 3 A3), so the two neighbours of a cut office set its cut level: office 2 cut 0.21, office 3 cut 0.21 (cut 0.24); office 3's far desk 0.49 (master 0.48: the isolation moment, lit but darkenable) |
| `:299` | lobby downlights (#79 west, #80 east), group 34 | 1.5 / 0.9 | 0.5 / 0.2 | L1: west lobby 0.58, east lobby 0.59 (master 0.61) |
Re-take: "A3 corridor floor" 0.41 -> measured (about 0.56).

A4 (`a4GoodsShed.ts`, the `LAMP` table `:208-213`; one value per fitting type):
| line | lamps (registry ids) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:209` room | security room panels (#81-#82), group 40 | i 0.8 | i 0.21 | L1: secroom stays clamped (master 0.92); passage pocket 0.18 |
| `:210` bay | floor high-bays (#83-#90), group 41, y 7.2 | i 1.15 | i 1.05 | L1: main aisle 0.84 (master 0.83), dock 0.66, east lane 0.67 |
| `:211` aisle | aisle strips (#91-#96), group 42, y 5.6 | i 1.25 | i 0.22 | L1: aisle 2 0.48 / 0.47 (master 0.45) |
| `:212` mezz | mezzanine strips (#97-#100), group 43, y 6.3 | i 0.9 | i 0.33 | L1: mezzanine 0.92 (master 0.89) |
Re-take: "A4 floor" 0.35 -> measured (about 0.59). Update the table's comment ("tuned with `CTLIGHT_WRITE`") to name LR16-M.

## Part M3 - A5 the Substation, A6 the Pump House
Branch `feature/sector-redesign-lr16m-m3`. Files: `a5Substation.ts`, `a6PumpHouse.ts`, `tests/ctcourse/a6PumpHouse.light.json`
(A6 pump floor only).

A5 (`a5Substation.ts`; A5 sheet: "a5-landing ... no fitting reaches it, the flood's cone and radius stop short"; "the
kiosk's panel light is a small fitting ... that lights the panel, not the operator"):
| line | lamp (registry id) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:134` `A5_FLOOD` | kiosk flood (#101), group 52, sodium spot | radius 10.5 (reach 16.8), i 1.5, outer 0.55 | radius 6.9 (reach 11.0), i 3.0, outer and aim unchanged | L2' + L1: the landing mark is 11.9 m from the flood and 20 degrees off its axis, closer to the axis than the kiosk (24 degrees), so a narrower cone cannot separate them; the reach can (the sheet's own words). Strip centre 0.75 (pool, master 0.75), kiosk 1.00 (master 0.97), landing mark 0.17 / landing 0.15 (pocket 0.22). Update the `:133` comment |
| `:136` `A5_KIOSK_LAMP` + `:336` | kiosk panel light (#109), group 53 | point lamp at (47.5, 1.45, 33), 0.1 m from the operator's head | the same point, `kind: 'spot'`, `cone: makeCone(-0.3, -0.35, 0, 0.5)` (hooded down and back at the keypad on the kiosk's east face), radius 1.2, i 0.1 | L2: a hooded gooseneck task light on the keypad; the operator stands behind its hood, outside the cone. Kiosk cut 0.16 (cut 0.24; base 1.00). Put the aim in the constant (e.g. `aim: [-0.3, -0.35, 0]`, `outer: 0.5`) and read it at `:336`; update the `:135` comment. `a5Substation.test.ts:609-613` (radius <= `lampReach(1.2)`, within 0.6 m of (47, 33)) and `:1037` (the gooseneck skin) still hold |
| `:334` | switchroom panel (#108), group 51 | i 0.8 | i 0.23 | L1: the switchroom 0.69 (master 0.68) |
Bulkheads `:328-333` unchanged (inner zone 0.52, apron 0.55).

A6 (`a6PumpHouse.ts:301-312`; LIGHTING-PLAN 3 A6):
| line | lamp (registry id) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:303-305` | pump floor high-bays (#110 z 57.5, #111 z 63, #112 z 68.5), group 60, y 8.4 | point, i 1.1 each | spot `makeCone(0, -1, 0, 0.9)` on all three (one optic for the row), i 2.8 / 2.9 / 1.2 (carry the level in the loop's tuple) | L2 + L1: the gauge board and the outfall approach sit 3 m off the bays and partly shaded by the pump gear in the bake (0.59 / 0.69, master 0.85 / 0.95); brighter bays over pumps 1-2 give 0.84 / 1.00. The optic keeps the entry vantage (10 m off, 53 degrees) dark: 0.14 (pocket 0.22; 0.23 with point bays at this level). The bay over the desk stays lower: the desk has its own lamp (62), desk 0.75 (pool, master 0.78) |
| `:307` | bridge pendant (#113), group 61 | i 0.9 | i 0.28 | L1: the holder 0.49 (read, master 0.52); holder cut 0.21 |
| `:309` | gallery bulkheads (#114, #115), group 61 | i 0.9 | i 0.7 | L1 |
| `:311` | desk lamp (#116), group 62 | i 0.6 | i 0.7 | L1 |
| `:312` | cage work light (#117), group 63 | i 1.3 | i 0.21 | L1: the cage 0.81 (pool, master 0.75): B hanging in it is lit, the tension stays |
Re-take: "A6 pump floor" 0.39 -> measured (about 0.64: mid -> lit, see "For Michael").
`a6PumpHouse.test.ts:569-572` checks the bays' x and y only: unchanged.

## Part M4 - A7 the Data Hall, A8 the Strongroom
Branch `feature/sector-redesign-lr16m-m4`. Files: `a7DataHall.ts`, `a8Strongroom.ts`, their light json (one key each),
`tests/lampBoxAlign.test.ts:218-220`.

A7 (`a7DataHall.ts:360-366`; strips 2.2 m over the heads, cool):
| line | lamps (registry ids) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:360-361` | rack-row strips (#118-#123), group 70 | i 1.0 | i 0.25 | L1: aisle B 0.87, aisle C 0.79, T1 0.70, north apron 0.71 (masters 0.80 / 0.76 / 0.67 / 0.76) |
| `:362` | lobby panel (#124), group 70 | i 0.8 | i 0.18 | L1: lobby 0.60 (master 0.56) |
| `:363-364` | aisle-end bulkheads (#125, #126), group 71 | i 0.9 | i 0.115 | L1: R1 0.55 (master 0.53); R1 cut 0.21 (the row strip #118 spills 4 m) |
| `:365` | corridor bulkheads (#127-#130), group 72 | i 1.0 | x 74 / 79.5 / 85: 0.19; x 91 (by the grating): 0.22 | L1: corridor 0.94 (master 0.90), grating 0.47 (master 0.48) |
| `:366` | pod strips (#131, #132), group 73 | i 1.0 | i 0.17 | L1: T2 0.61 (master 0.61) |
Re-take: "A7 hall floor" 0.34 -> measured (about 0.43).

A8 (`a8Strongroom.ts`, the `LAMP` table `:191-198` and the lamp lines `:505-514`):
| line | lamps (registry ids) | now | after | lever, why |
| --- | --- | --- | --- | --- |
| `:192` chandelier | chandeliers (#133-#135), group 81, y 7.5 | i 1.5 | i 1.4 | L1: front 0.76 (master 0.77), grille approach 0.64 (master 0.64) |
| `:507` (and `:193`) | counter lamps (#136-#138), group 81 | y 1.4 | y 1.6, radius and i unchanged | L3' (decision 3): the bulb inside the shade 0.4 m over the marble top; out of the counter's cell. Jam spot 0.17 (pocket 0.22) |
| `:998-1001`, `:987` | the counter lamps' brass stems (dressing) | stem 1.23-1.4; text "float 0.2 m" | stem 1.23-1.6; text updated | follows the lamp (the fixture's foot is the light point) |
| `:195` gallery | gallery wall lights (#140-#142), group 82, y 6.6 (2.2 m over the gallery floor) | i 0.9 | i 0.15 | L1: gallery east 0.59 (master 0.59); a body by the wall stands 1.3 m from the light |
| `:196` office | office panels (#143, #144), group 83 | i 0.9 | i 0.28 | L1: office 0.87 (master 0.82) |
| `:197` lobby | vault lobby panels (#145, #146), group 84 | i 1.0 | i 0.2 | L1: the lobby panel lit the grille approach through the open grille (0.37 with 81 cut); now 0.19 (cut 0.24). The device-supply rule (LIGHTING-PLAN 2: "tuned so a body beside it stays under cutMax") |
| `:198` lock, `:513-514` | time-lock status lamps (#147 T1, #148 T2), group 84, 2.2 m over the locks | i 0.7 | T1 0.07, T2 0.085 (two values: T1 also takes the lobby panel's light) | L1: T1 0.80, T2 0.81 (masters 0.79 / 0.83) |
Desk lamp `:508` unchanged. Re-take: "A8 hall floor" 0.23 -> measured (about 0.41: dark -> mid, see "For Michael").
`tests/lampBoxAlign.test.ts:218-220`: remove the three `ctcourse:136-138` entries (the test then requires them clear).
If `lampBoxAlign` still finds the cell under a counter lamp solid, take y 1.65 and report.

## INT - the shared hash after the merge
On `feature/sector-redesign-lr16m` after M1-M4 merged. Opus, one round. Run `tests/ctcourseLight.test.ts`: all 8 cases
green (no skip but the print case). Then `tests/lampBake.test.ts`: re-pin the Marlow scratch-cut hash (`:342`,
`6efdcc4965ad2745` -> the new value; the scratch-cut equivalence stays proven by the fixture hashes, as at the train
entry). Then once on the merged head: `ctcourse`, `ctcourseGreybox`, `tests/ctcourse/*.test.ts` (all nine),
`marlowLightingCircuits`, `marlowLightingLevels`, `marlowLightingSchedule`, `lampBoxAlign`, `lampBake`, `lampBounce`,
`lightField`, `lampFalloff`, `lampAtlasFit`, `lampFlicker`, `sectorLampSync`; `npx tsc --noEmit`; `npm run lint`. Report in
`checks/lr16m-int.md`.

## Laptop (Test Runner's queue, `E2E_GPU=1`, on the INT head)
1. `e2e-ctcourse` (every set's meter reads on two pages: A2 neck dark on the isolator, A5 jam darkens the strip, A8
   front dark on the board; the lures) and `e2e-lightbake` (the bake path, the version key).
2. GPU sheet (optional, before `f85ef736` / after): `scripts/shots-ctcourse.mjs` rows for each set's start view. Pass:
   pools on the work spots, the routes in their rim, the cut areas dark, no hard arc on a wall.
3. Michael (TESTING.md line, the lead): Marlow Yard, each set from its entry: the meter matches 4.x master's read (lit pools,
   mid floors, dark pockets), the cut circuits go dark, the kiosk operator is not lit by his own lamp.

## Light parity (all parts)
Every change is lamp data (intensity, a downward optic, a spot's reach or hood, three lamps 0.2 m higher). There is one
registry and one bake: the lamp shader (the same cone and feather), the meter (`LightField.bodyLevel`) and the guards
(`fieldLight`) read them, so they move together. No shader, field, bake, band or constant change.

## Coordination (Marlow Build)
The set files `src/world/maps/ctcourseSets/a1-a8*.ts` and `tests/ctcourse/*.light.json` / `*.test.ts` belong to Marlow
Build (marlow-final, map `ctcourse`); `src/world/maps/ctcourse.ts` is not touched at all. The builders edit only the lamp
data lines listed above, plus: the `makeCone` import line in `a2CarriageShed.ts` and `a6PumpHouse.ts`, the A8 stem dressing
line and its register text, the two A5 comments, the A4 table comment. Each part's report lists every touched line
(file:line, old -> new). The lead sends that list to Marlow Build with the merge, so a marlow-final change over the same
lines rebases onto LR16-M's levels (or re-runs this brief's probe on its own layout).

## For Michael (none blocks the build)
1. Look: Marlow Yard keeps its master meter reads, but most room fittings now run at 0.1-0.35x of master's values (the
   photometric near field: a panel 1 m over a head reads 3-6x the level 3 m away), and the two floods run brighter (A1
   apron 3.5, A5 kiosk 3.0) to reach their far marks. Same finding as LR16-W in Sector Ops.
2. Six floor pins re-taken (decision 2): the floor under a fitting reads brighter against the body than the old linear
   model gave. Two cross a meter line: A6 pump floor 0.39 -> 0.64 (mid -> lit) and A8 hall floor 0.23 -> 0.41 (dark ->
   mid: the floor 4 m from a chandelier; the SPEC's dark centre is the west bays, still 0.14-0.17). Neither is a band.
3. No band needs a light-model change: every pool, read floor, pocket and cut is met by realistic layout.
