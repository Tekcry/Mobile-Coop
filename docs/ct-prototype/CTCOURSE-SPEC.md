# Marlow Yard (`ctcourse`) - spec (CT prototype B1, 2026-10-18)

Prototype greybox under G117: every number is a starting value (G10). The level standard review (G157, `docs/level-design.md`) comes later; this spec follows the map-spec template only where it applies (id, setting, flow, footprints, gates, tests). Map rules are the bunker's (G117 / training D41): linear, no station skippable, anti-stuck resets (G80: the course framework restarts a bay when both are down; the thrown / hung partner always gets a way back, built in B4 / B5).

- **Id / name / setting:** `ctcourse`, Marlow Yard. An operator training yard at night: an open obstacle course between 6 m fences, and a cheap cinderblock / plywood annex with a flat roof at station 5. Sodium lamps, dark between them (`lightLevel` 0.3). Not listed; course mode only.
- **Purpose:** the co-op training course of CT (G177 / G178): 8 stations in CT's order, one lesson each, every station splits the pair and reunites them through an airlock. Target 3-4 min for a practised pair, 9-16 casual.
- **Players:** 2 (`COURSE_MAX = 2`). Both start at x 2, z 6 / 8, facing +x. Solo is the dev flag only (`?course=solo`, dev builds).

## Plan (x east, z north, floor y 0)
Yard 14 m wide (z 0-14), 170 m long. Bay `i` (0-7) spans `x = 22 i .. 22 i + 16`; airlock `A(i+1)` (6 x 6, z 4-10) spans `22 i + 16 .. 22 i + 22`. Fences and airlock walls 6 m (above the 4.5 m leg-up reach, so nothing is climbed over). Each obstacle wall stands at bay x + 9, full width, with one 1.2 m door (placeholder). The exit zone is 4 x 8 m at the last bay's end.

| # | CT drill | Footprint / height | Placeholder now (door gate) | Real mechanic |
| --- | --- | --- | --- | --- |
| 1 | Read the wall panels | open bay, 3 panels on the north fence (x 4 / 8 / 12), striped squares | the airlock waits for both to read 3 panels (drill, verb `switch`) | done in B1 (text on the panels, radio line) |
| 2 | Leg-up over a wall | wall 4.4 m (ledge band, G57) | pair plates A / B (both within 1 s) | B2 leg-up on Co-op Action |
| 3 | Jam a camera | wall 3.2 m, camera body on it | timed hold console (hold, then 6 s) | B3 held jammer |
| 4 | Partner throw over a laser | wall 3.5 m with a 6 m gap (z 4-10) closed by a 3-beam laser band (B4 layout); release switch on the far side (north fence, bay +12) | none (B4: plates removed) | B3 laser, B4 partner throw (built): throw one over, they press the release, the band goes off; jamming stays the alternative |
| 5 | Leg-up + ledge relay, hang-down hack | roofed annex x +9..+16, walls 4.0, roof top 4.4, internal grid wall at +12.5, wall medkit | pair plates, then the hack computer (lever) opens the grid door | B2 relay, B5 hang-down |
| 6 | Paired scanners | wall 3.2 m, scanners 13 m apart on the two fences | the real pair gate (1 s window) | B6 forgiving sync, health cost |
| 7 | Throw over wire, pipe, two-person rope | wall 4.4 m, wire strip on top, rope post | timed hold console | B4 throw, B7 rope |
| 8 | Final throw, both extract | wall 3.5 m, lit exit zone (x 165.5-169.5, z 3-11), wall medkit before the wall | timed hold console | B4 throw, B8 end screen |

## Rules and rulings used
- The course ends only when BOTH players stand in the exit zone and the drills are done (G138); a downed player refuses it ("Revive first"). The dev solo flag lets one player end it.
- Wall medkit stations (G178) at the annex (station 5) and before the last wall; they heal by difficulty: Normal / Rookie full, Hard (Realistic) 50% of max, Expert (Perfectionist) 25%; single use (existing station code).
- A thrown / lifted player's return path and 2.4 m screens on skip routes are B2-B8 work, not present in B1 (the placeholder doors are the only way through).
- Panels are the interactable labels plus the bay's radio line (text only, no voice). Names and text are original.

## Tests
`tests/ctcourse.test.ts` (map validates, exit both-in rule), `tests/medkit.test.ts` (by difficulty), `scripts/e2e-ctcourse.mjs` (two pages walk all stations; the exit refuses with one player).
