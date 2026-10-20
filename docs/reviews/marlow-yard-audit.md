# Marlow Yard design audit (2026-10-20, orchestrator review, suggestions only)

Michael: "it seems to have no ceiling, and lights need to be on ceiling also. I would like to audit the design and make it
more accurate to being an underground training bunker that isn't just square/rectangle rooms, it needs to be high tech
and have variety. Only review and make suggestions that are cheap for prototype and fast." Then: "Make the mallow yard
review comprehensive."

## Now
- No ceiling anywhere: built as an outdoor yard at night (sky, moon `sunIntensity` 0.05, `lightLevel` 0.3), 14 x 170 m,
  6 m "fences", 7 airlocks. Only the S5 annex has a roof (4.0-4.4).
- All 29 lamps are bare floating bulbs (`fixture: null`): bays y 5 (S5 second 6.8), airlocks 4.6, S2 / S7 wall tops
  6.6, S3 3.0, S5 annex 3.4.
- Light: open floor 0.3 (0.25 fill + 0.05 moon), just above the 0.28 shadow line. A full ceiling removes the moon: the
  floor between lamps drops to ~0.25 (shadow) unless ambient is raised to hold 0.3 (a gameplay choice).

## Engine facts
- `collide=false` or pitched boxes never make ledges (anchors.ts:312-316).
- The bake sees only visible pieces >= 5 cm: strips, paint, rods under 5 cm never change light; ribs / racks do (parity
  holds, values may shift: rerun e2e-lightbake).
- Lamp `color` is render only (stay near white). `fixture` boxes give an emissive housing that darkens when off;
  embassy.ts:381 pattern: lamp at ceiling - 0.15, fixture `{sx 0.9, sy 0.08, sz 0.25, oy 0.08}`.
- `led()` / `glass()` exist in bunkerUpper.ts (legacy): copy, do not import.
- Linear falloff: y 5 -> 7.35 loses ~29% at the floor; radius 13 -> 16 and intensity 0.9 -> 1.0 restores it.

## Bunker fiction (text, 15 min)
Training floor of a Cold War signals bunker: a 170 m cut-and-cover gallery refitted as a two-operator assessment course.
Test cells divided by blast bulkheads; airlocks are decontamination locks with an instructor booth and plant room beside
each; entry by the lift lobby (west), extract by the goods lift (east). S1 induction hall and sentry post, S2 / S7
climbing halls, S3 security cell, S4 perimeter laser gate, S5 kill-house mock-up inside a high hall, S6 vault vestibule
(two-person rule), S8 extraction lobby. "fence" -> "wall" in PANEL_TEXT[3], RADIO_ENTER[3], OBJECTIVE_TEXT[3], the
guard's second line and the walkthrough.

## Whole map
1. Ceilings, one slab per bay [60 min, gameplay: light, camera, collision]: 0.4 m, `DARK`, collides,
   `b.mark(from, {overhead: true, noLedge: true})`. Low cells 4.5 (S1, S3, S6, S8); S4 5.5 (throw apex); high halls 7.5
   (S2, S5, S7: 3.1 m over the 4.4 tops). `FENCE` 6 -> 7.5 seals perimeter and airlocks (may also close an unverified
   annex-roof wall-jump onto A5). Theme `sunIntensity` 0, dark sky, fog 40-120; choose darker 0.25 floor or ambient to 0.3.
2. Rhythm [30 min, visual, in the bake]: ceiling ribs 0.3 deep every 4 m (>= 2 m from lamps); 1 m chamfered haunches
   (pitched boxes) at ceiling / wall joints.
3. Wayfinding [20 min, visual]: a colour band per cell at 1.2 m, panel seams every 2 m; keep yellow, green, blue-grey
   reserved for floor marks.

## Connectors and pockets
- Airlocks [40 min, gameplay: light]: inner lid 3.2 with 45 deg haunches at z 4.3 / 9.7; lamp 4.6 -> 3.05 with a caged
  bulkhead `{0.3, 0.2, 0.3}`, intensity 0.5 -> ~0.35; yellow-black door frames and a status light (visual).
- Pockets beside airlocks (6 x 4 m void): south as plant rooms (louvre, trunking) [20 min, visual]; optional north
  instructor booths at A3 / A4 with `glass()` and desk / screens [45 min]; a booth lamp spills into the bay (gameplay).
  Skip A5 (looks into the annex back room by the medkit).

## Stations
- S1: low ceiling, lamps 5 -> 4.35 (intensity 0.9 -> 0.83); blast-door frame and lift doors on the west wall [20 min,
  visual]; sentry desk at z 1-2 behind the guard [10 min, collision, noLedge], keep x 2-10.5, z 2.5-5 clear for the grab.
- S2: high hall, pendant lamps on a 0.04 rod at today's y 5 (zero light change) [15 min]; wall-top lamp 6.6 -> 7.35;
  yellow band on the wall face over the leg-up square (collide false) [5 min]; red / green bolt on the far side.
- S3: low ceiling; obstacle wall to the ceiling as a bulkhead with its door [10 min, collision, light; also settles the
  3.2 m vs 3.8 m wall-jump]; lamp stays at 3.0 as a pendant; monitor wall on the south wall [20 min, visual]; floor lines
  on the +-30 deg sweep edges [10 min, visual].
- S4: ceiling 5.5; wall to the ceiling except the gap, header bottom >= 4.6 [15 min, collision; rerun throwOver];
  emitter posts (collide false) [10 min]; yellow-black frame on the red release [5 min]; faintly red lamp colour [2 min].
- S5: reframe as a plywood kill-house inside the hall; interior lamps 3.4 -> 3.85 as panels `{0.6, 0.05, 0.6}`,
  intensity 0.9 -> 1.0 (the x+14.2, z 3 lamp clear of the hatch); roof lamp 6.8 -> 7.35; roof lip bare (relay); open
  hatch cover 0.04 thick [5 min]; plywood faces and painted window outlines [10 min].
- S6: low ceiling, wall to the ceiling; pilaster-and-lintel frames round each scanner (0.3 proud, noLedge) [15 min];
  painted "pair" line A -> B [5 min]; server racks on the west wall [15 min, collide false or noLedge].
- S7: high hall, wall-top lamp 7.35; rope-anchor plate [5 min]; return stair restyled as concrete training blocks (colour).
- S8: low ceiling with a 6 m coffer over the exit (LED ring, green-tinted fixture) [25 min]; goods-lift doors east [15 min].

## Fixtures
| Fixture | Where | Spec |
| --- | --- | --- |
| Recessed linear strip | Low cells | `{1.6, 0.06, 0.2}` |
| Pendant | High halls | 0.04 m rod + strip, today's positions |
| Caged bulkhead | Airlocks, plant rooms | `{0.3, 0.2, 0.3}` + visual cage |
| Square panel | Annex, booths | `{0.6, 0.05, 0.6}` |
Cool white `[0.85, 0.92, 1]` replaces the sodium look [5 min, visual].

## Ranked shortlist
| # | Change | Time | Type |
| --- | --- | --- | --- |
| 1 | Per-bay ceilings 4.5 / 5.5 / 7.5, FENCE 7.5, underground theme | 60 min | Gameplay: light, collision |
| 2 | All 29 lamps with fittings (pendants high, flush elsewhere, compensated), cool white | 45 min | Gameplay: light |
| 3 | Airlock lids, haunches, caged lamps, door frames | 40 min | Gameplay: light |
| 4 | Ribs, LED strips, panel seams, cell bands | 30 min | Visual |
| 5 | Obstacle walls to the ceiling at S3, S6, S8; S4 header | 25 min | Gameplay: collision, light |
| 6 | Readability paint (S2 band, S6 pair line, S3 sweep lines, S4 emitters, S5 hatch, S7 anchor) | 35 min | Visual |
| 7 | Entry lift and exit goods lift | 35 min | Visual |
| 8 | Spec fiction and "fence" -> "wall" text | 15 min | Text |
About 4.75 h + ~30 min tests (ctcourse unit, e2e-ctcourse, e2e-lightbake, light meter): 5-5.5 h. The element register
(level-design 16.9) needs a row for each new lamp and object.
