# Marlow Yard (`ctcourse`) - spec (CT prototype B1, 2026-10-18; built state updated by course-ready, 2026-10-20)

Prototype greybox under G117: every number is a starting value (G10). The level standard review (G157, `docs/level-design.md`) comes later; this spec follows the map-spec template only where it applies (id, setting, flow, footprints, gates, tests). Map rules are the bunker's (G117 / training D41): linear, no station skippable, anti-stuck resets (G80: the course framework restarts a bay when both are down or one goes out; the thrown / hung partner always gets a way back, built in B4 / B5).

- **Id / name / setting:** `ctcourse`, Marlow Yard. An operator training yard at night: an open obstacle course between 6 m fences, and a cheap cinderblock / plywood annex with a flat roof at station 5. Sodium lamps, dark between them (`lightLevel` 0.3). Not listed; course mode only.
- **Purpose:** the co-op training course of CT (G179 / G180): 8 stations in CT's order, one lesson each, every station splits the pair and reunites them through an airlock. Target 3-4 min for a practised pair, 9-16 casual.
- **Players:** 2 (`COURSE_MAX = 2`). Both start at x 2, z 6 / 8, facing +x. Solo is the dev flag only (`?course=solo`, dev builds).

## Plan (x east, z north, floor y 0)
Yard 14 m wide (z 0-14), 170 m long. Bay `i` (0-7) spans `x = 22 i .. 22 i + 16`; airlock `A(i+1)` (6 x 6, z 4-10) spans `22 i + 16 .. 22 i + 22`. Fences and airlock walls 6 m (above the 4.5 m leg-up reach, so nothing is climbed over). Each obstacle wall stands at bay x + 9, full width (stations 2, 3, 5, 6: one 1.2 m door; 4: a gap; 7: solid; 8: an open doorway). The exit zone is 4 x 8 m at the last bay's end.

| # | CT drill | Footprint / height | Built now (gate) |
| --- | --- | --- | --- |
| 1 | Read the panel | open bay, one optional panel on the north fence (x 3.5) | no gate: both onto the A1 pad |
| 2 | Leg-up over a wall | wall 4.4 m, 1 m thick (ledge band, G57); leg-up square at bay +8, z 3.5 | bolt `g-s2`: the boosted player unbolts S2-door from the far side (side test at the door plane x 31); then opens it for the partner |
| 3 | Jam a camera | wall 3.2 m, camera over the door; blind-spot pocket (blue-grey) in front of it | flag `g-s3`: both in the pocket (one jams the camera with the pistol's held LT / Z) |
| 4 | Partner throw over a laser | wall 3.5 m with a 6 m gap (z 4-10) closed by a 3-beam laser band; red release on the north fence (bay +12) | pickup `g-s4`: thrown player presses the release, the band goes off; jamming stays the alternative |
| 5 | Leg-up + ledge relay, hang-down hack | roofed annex x +9..+16, walls 4.0, roof top 4.4, grid wall at +12.5, wall medkit; leg-up square at bay +8, z 3.5; 0.55 m roof hatch over the back room (x +14.125..+14.675, z 1.0..1.55), hack panel under it (x +14.4, z 0.4, 1.2 m up) | pair `g-s5` (roof plates, 1 s window) opens S5-door; lever `g-s5-grid` (hack panel, reached hanging through the hatch) opens the grid; then off the roof, through S5-door and the grid to A5 |
| 6 | Paired scanners | wall 3.2 m, scanners 13 m apart on the two fences | flag `g-s6`: both hacks finish within the sync window |
| 7 | Two-person rope | solid wall 4.4 m, 1 m thick, full width, no door; leg-up square at bay +8, z 3.5; holder strip on top; far-side return stair (1.1 m rises, z 0.4-1.6) | none: leg-up one, the one on top drops the rope, the partner climbs |
| 8 | Last wall, both extract | wall 3.5 m with an open doorway, lit exit zone (x 165.5-169.5, z 3-11), wall medkit before the wall | none: both in the exit zone ends the course |

## Rules and rulings used
- The course ends only when BOTH players stand in the exit zone and the drills are done (G138); a downed player refuses it ("Revive first"). The dev solo flag lets one player end it.
- No bay has drills: the HUD step line shows the bay's objective (`CourseDef.objectives`, one per bay); LANTERN speaks a line at each bay start and when each station gate opens (radio keyed by gate id; a flag gate's line on its flag).
- Text names pad and keyboard both (A / E, Co-op RB / F, LT / Z, Y / Space, X / RMB, LB / Tab). Radio and objectives are <= 90 characters, panels <= 120.
- A lone roof-plate press shows "Partner: press the other plate now". The bolt's "Unbolt" item goes off once unbolted (the door menu shows) and comes back on a bay restart.
- A bay restart brings an alive partner back to the checkpoint too (as Sector Ops).
- Wall medkit stations (G180) at the annex (station 5) and before the last wall; they heal by difficulty: Normal / Rookie full, Hard (Realistic) 50% of max, Expert (Perfectionist) 25%; single use (existing station code).
- Return paths: the station 7 stair; a player dropped into the station 5 back room can press the hack panel from the floor.
- Panels are the interactable labels plus the bay's radio lines (text only, no voice). Names and text are original.

## Tests
`tests/ctcourse.test.ts` (map validates, exit both-in rule, bolt side and item, pair hint, radio per gate, text limits, leg-up squares), `tests/medkit.test.ts` (by difficulty), `scripts/e2e-ctcourse.mjs` (two pages walk all stations; the exit refuses with one player).
