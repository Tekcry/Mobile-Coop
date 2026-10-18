# ON2 - Levels and vertical pieces: stairs, ladders, floor holes, levels, renaming (ED2 Part E, pad-first)
Model: Opus, medium effort.
Decisions: 17

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/prompts/ED2-editor-v2.md` lines 342-392 (Part E, binding
except where this table differs); `docs/kestrel/schema.md` sections 1-2 (stairs, ladders, voids, levels, A11 rows by
grep); `scripts/kestrel/facts.json` groups `stair`, `player`, `reach`, `room`; `scripts/kestrel/standards-check.mjs`
(grep `stair`, `vertical`); progress.md Decisions by grep `25 risers`; `src/world/maps/kestrelCampus.ts` (the walk
test's stair builder: grep `stair`); `docs/kestrel/editor-controller-review.md` section 5 rows 1, 6, 7.

| # | Decision |
| --- | --- |
| 1 | **Stair tool** (Build wheel: Stair; tool bar slot): A at the start corner, point the climbing direction with the dot, A again: the smallest legal stair is proposed from the facts and the two floor heights (to-level = the level above), shown as a ghost with risers, riser height, going, flights and landing in words; A accepts, B cancels. Layout straight or dogleg, kind main or fire: Selection wheel > Properties or the stair's own submenu on the Build wheel (Stair > Main dogleg, Fire dogleg, Straight). |
| 2 | One pure stair-sizing function shared by the editor and the walk test's stair builder (move the maths, do not copy it): 25 risers per 4.2 m storey (progress.md Decisions), dogleg rule A11 (schema.md). Too short or too narrow: the words say by how much ("needs 1.4 m more length for 25 risers"); "Fit" (Selection wheel) resizes from the corner it was drawn from. |
| 3 | The floor hole above (kind `stairwell`, same rect on the to-level) is made, moved, resized and deleted with the stair in the same edit. |
| 4 | Stairs draw in 3D as real flights and landings (the shared function), as the walk test builds them. Handles: four edges and an arrow that turns the climb 90 degrees. |
| 5 | **Ladder tool**: A on a wall face (or a point): from-level = editing level, to-level = the level above (Properties to change); facing from the wall; the words give the climb height and whether it is within `reach` facts. |
| 6 | **Floor hole tool**: draw a rectangle on a level; kind from schema (stairwell, liftshaft, riser, hatch, rooflight); holes cut the floor in 3D and in the walk test (already built by the converter: check it). |
| 7 | **Levels panel** (hub Levels tab, pad-first): add a level above or below (storey height from the neighbour, name asked with the on-screen keyboard or a name list: Ground, First, Second, Roof, Basement, Mezzanine), duplicate a level one storey up (rooms, walls, openings, objects, voids copied with new ids), delete a level (confirm lists what goes with it), rename, change storey height. |
| 8 | A storey height change moves every level above by the difference and offers to stretch walls whose height equalled the old storey height ("47 walls were 4.2 m: stretch to 4.5 m?" A yes, B no). One undo step, words. |
| 9 | Building footprints (`meta.buildings`) editable with edge handles in a site view (Levels tab "Edit building outlines"); RULES 2 caps (site 110 x 80, building 48 x 30, from facts.json `rules`) shown as limits; warn, never block. |
| 10 | **Renaming ids** (Properties > Id): every reference updated in the same edit (openings' `wall`, rooms in `between` and ladders' `room`, levels everywhere, stairs' from / to, voids' level); unique and in the file's style or a warning; each rename on its own change-log line ("Renamed WG-NEW1 to WG015"). |
| 11 | Every new tool works with the mouse and keyboard too (keys 6 Stair, 7 Ladder, 8 Floor hole). |
| 12 | Vitest: stair sizing (straight, dogleg, main, fire, against facts), stair and hole kept in step (move, resize, delete, undo), storey change moves levels above and stretches only matching walls, rename updates every reference (count references before and after on the real campus file), duplicate level (ids fresh, counts equal). |
| 13 | e2e: draw a dogleg main stair from ground to first floor with the pad, accept the proposed size; its hole exists on the first floor; walk test (Tab) can climb it (player's floor height reaches the first floor within 30 s of stick forward, or the e2e teleports to the stair foot and checks the flights exist in the game's collision); add a level above the roof and delete it again: campus text byte-identical after undo. |
| 14 | The walk test builds new stairs, ladders and holes from the same data (no special cases). |
| 15 | Schema: no new fields unless needed; if one is, add it to schema.md section 2 with a one-line meaning. |
| 16 | Screenshots: the stair ghost with its words; the Levels tab; a dogleg stair in 3D. |
| 17 | editor.md: the stair, ladder, hole tools, Levels tab, renaming; remove them from "What it does not do yet". |

End per section 5. Commit id `ON2`.
