# coop4 merge 7 - origin/master 4.116.0 (train 131, 1b58989ed) into feature/coop4 (from 24b75b79)

Why: clear PR #317's merge conflict. Master's Sector Ops lead re-laid Saltmarsh Park v2 sections 2-5 (campus-greybox
J17, G4.6, P3): new guard positions, routes, zones and numbering, new base guards. coop4 had appended its two
`minPlayers` extras (A8) to each v2 section's guard list, on the v1 layout.

## Resolution
- `src/world/maps/campusV2/s{2,3,4,5}Data.ts`: master's file verbatim (base guards, cameras, routes, sectors), then
  coop4's two extras appended after master's base list with the coop4 A8 comment, re-placed on master's layout. Each
  keeps its `minPlayers` and kind; reasons and number comments follow master's numbering.
- Base counts stay master's (1-2 players): S2 18, S3 20, S4 25, S5 26. With the extras, teams of 1 / 2 / 3 / 4 spawn
  S2 18 / 18 / 19 / 20, S3 20 / 20 / 21 / 22, S4 25 / 25 / 26 / 27, S5 26 / 26 / 27 / 28 (job BRIEF A14's totals);
  every spawned list is under the 32 alive cap.
- v2 graphs (`docs/sector-redesign/graph/v2/campusOps-S{2,3,4,5}.json`): keys "3" / "4" raised in the extras' spaces
  (BRIEF A16 / A17); keys "1" / "2" unchanged.

## The extras (section, old -> new, why)
| Section | Extra | Old (coop4, v1 layout) | New (master layout) | Why |
| --- | --- | --- | --- | --- |
| S2 | tag 3 (index 18, 3+) second lobby patrol | (-29, -8.5) -> (-24, -24.8), yaw 0 | unchanged route; yaw PI | Master's #2 kept his route, so the reversed round still doubles him. Row as `briefs/S2.md` 6b TAG-2 tag 3 (yaw PI: faces his second point). |
| S2 | tag 4 (index 19, 4+) bridge officer's second | (1, 4.4, -11.2) yaw PI, spot (1, -10.8), role post | (2.8, 4.4, -13.0) yaw PI, spot (2.8, -12.5), role backup | Master moved K2 #11 to (1.5, -15.8) facing the north door; the old slot stood in that door's mouth. TAG-2 tag 4's slot: in the landing by the card door. |
| S3 | 21 (tag 3, 3+) third hall patrol | #6 / #7 chamber loop from (37, -23), waits 2.5 / 0.5 / 0.5 / 2.5 | same loop and corner, waits 1.5 / 0.3 / 0.3 / 1.5 | Master kept the chamber rectangle and cut the stops; the extra takes #6's new stops (42.0 s). |
| S3 | 22 (tag 4, 4+) second dock patrol | (38.9, -4.6) -> (25, -4.5) (v1 dock) | (14.5, -3.5) -> (20.5, -2.5), waits 9.85 / 9.85, faces -PI/2 / PI/2, spot (15.0, -3.5); 32.0 s | Master moved the dock west (#10: roller door (21.5, -8.5) <-> gas cage (14.5, -4.5)). #10's line reversed fails the screen cap: the crane walkway sees the dock south of z -4.5 through the open roller door, and a fourth guard there put 13 in one view at (15.75, 6.0, -29.25) and (36.75, 6.0, -29.25) (A99 cap 12). He keeps #10's stops but walks the dock's north strip (hidden from the walkway), from the gas cage's SE corner (facing it) to the dock desk's west side (facing the desk and the C3 door). |
| S4 | 26 (tag 3, 3+) rear-gate watch (was the cage keyholder's second) | (16.8, 33.0) at the front gate, 1.2 m W of keyholder #9 | (25.5, 40.8) yaw -PI/2, spot (26.0, 40.8), static | Master added #22, a second keyholder walking round the cage (dual custody): the same job. Moved to the next cover point of its reason (the cage pair gate): the rear gate pg-cage (18, 40), from the north strip 3 m east of #22's NE corner, facing west along the cage's north wall. |
| S4 | 27 (tag 4, 4+) second battery checker | (-7, 20) <-> (-7, 37) straight | #12's new round reversed, from (-5.5, 37.0) (UPS room north end) via ccUps, the colonnade and battCC to (-7, 21); waits 3 / 3; spot (-5.5, 35.4) | Master re-routed #12 through battCC, the colonnade and ccUps (the old straight line crosses walls). Starts at the UPS end; same 42.1 s cycle and spot as #12 (his M8 spot). |
| S5 | tag 3 (index 26, 3+) second archive round | rectangle loop (-42.2, 43) -> (-42.2, 33) -> (-45, 33) -> (-45, 43) | (-45.0, 4.2, 39.5) <-> (-39.5, 4.2, 33.0), waits 6 / 6, faces PI/2 / 0, spot (-45.5, 39.5) | Master's #18 is now an out-and-back up the 1.5 m aisle between the free-standing row and the cage; a second guard on his line walks head-on into him and the v1 loop crosses the new shelving. The round crosses the archive's open south half instead, from the pg-hoist / pg-arch side (facing the pg-arch door) to the SE corner by kp-arch (facing the cage); 29.2 s. |
| S5 | tag 4 (index 27, 4+) second service round | (-29, 23.5) <-> (-29, 42.5), waits 3 / 3 | same line (#21's round reversed), waits 2 / 2 | Master kept #21's line; it now bends through the moved lobby doors: 46.4 s by nav path at 3 s stops (recorded for #21 only). 2 s stops give 44.4 s. |

## Tests changed (master tests that asserted "no minPlayers row" / a single count at every key)
- `campusV2S2Guards`, `S3Guards`, `S4Guards`, `S5Guards`: the table checks run on the base list (non-`minPlayers`
  rows); a new block checks the extras (indices, `minPlayers` 3 then 4, spawned counts per team, no post / pair /
  handler / dormant, reason > 30, >= 7 m from the start, cycle 25-45 s, what each doubles). The nav checks (slot, route,
  takedown spot, legs; S3 stair cores) take every guard.
- M8 isolation (`campusV2S2Routes`, `S3Guards`, `S4Guards`, `S5Guards`): the base list, as `tests/sectors.test.ts`
  does (an extra walks beside a base guard by design).
- Screen cap A99 (`campusV2S2Routes`, `S3Guards`, `S4Screen`, `S5Screen`): every guard a team of 4 spawns.
- Graph tests (`campusV2S2Graph`, `S3Graph`, `S4Graph`, `S5Graph`): key k = the guards a team of k spawns.

## Assumptions
- The task brief (keep coop4's extras, re-placed) wins over master's campus-greybox PLAN section 5 / `briefs/S4.md`
  TAG-4 / `briefs/S5.md` TAG-5, which say coop4's S4 and S5 rows are replaced by the briefs' v2 rows (exit watch and
  north-corridor officer; lane patrol and roof walk) and S3 B10's TAG-3 (Opus). Those lanes can still swap these rows;
  the tests now take any two appended extras. For S2 the TAG-2 rows are coop4's rows, so they are used as written.
- Spaces that held no guard get a guards entry for the extra: `s4-ups` and `s5-plant` `{ "1": 0, "2": 0, "3": 0, "4": 1 }`
  (utility spaces; the validator checks guard keys only on encounter spaces).
- Phase (where two guards on one route meet) is not modelled: guards do not all start at their first point in play.
