# ON13 - Ceilings, ceiling voids and crawl spaces as editable pieces
Model: Opus, medium effort.
Decisions: 12

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/handover.md` (grep `void`, `1.5 m`, `ceiling`: corridor voids
1.5 m clear over 2.4 m ceilings, office floors only, never over rooms with walls to the slab); `docs/kestrel/02-building-brief.md`
(grep `ceiling`, `void`, `crawl`); `docs/kestrel/schema.md` `rooms[].ceiling` and level `H` rows; `scripts/kestrel/facts.json`
`player.crouchHeight`, crawl and duct facts (grep `crawl\|duct`); `src/player/moveState.ts` lines 12-45 (is there a
crawl or duct mode?), `src/world/anchors.ts` (grep `duct`); `src/world/maps/kestrelCampus.ts` (how ceilings build);
`scripts/kestrel/standards-check.mjs` (grep `crawl`).

Michael (2026-10-13): ceiling voids and crawl spaces above corridors as editable pieces.

| # | Decision |
| --- | --- |
| 1 | **Ceilings are pieces**: each room's ceiling (`rooms[].ceiling` height, 0 = none) shows in 3D as a thin slab you can select (A on it from below, or the Selected tab of the room "Ceiling"); its card rows: height (0.1 m), type (plasterboard, suspended grid tile, open / none, exposed slab), access hatches (count and positions). |
| 2 | **Ceiling void** = the space between the ceiling and the slab above: shown as a see-through box when "Ceiling voids" is on (View tab); its clear height is worked out (next floor's slab underside minus ceiling height minus the tile thickness) and shown with the 1.5 m crawl rule from facts (green when it meets it, red when not). |
| 3 | **Crawl spaces** (Y menu: Build > Crawl space): draw a route on a level at a height (default: inside a ceiling void), width 0.6-1.2 m, clear height from the void; ends at hatches (ceiling hatches in corridors or rooms) or vents (ON5 pieces); written as a new `crawls[]` collection (schema section 2 rows: id, level, path points, width, y0, y1, ends). |
| 4 | **Suspended tile hatches**: a hatch on a grid ceiling is any tile the player can push up (marked, with its position); on plasterboard ceilings only placed access hatches open. |
| 5 | **What the player can do**: crouch-move needs the crouch height fact; if the game has a duct or crawl move (`MOVE_MODES` / anchors), name it; if not, crawl spaces are crouch spaces and the card says so. Never a new move. |
| 6 | **Walk test**: ceilings build as thin collision slabs (the player can stand on a ceiling only if it is a slab type, never on tiles: tiles collide from below only, or are skipped with a note if one-sided collision is not available); crawl spaces build as clear volumes with floors and side boards; hatches as openings the player can climb through where the game's mantle reaches. |
| 7 | **Guards never enter voids** (handover); the card says so; nothing for guards to change. |
| 8 | **Light**: ceilings and void boards are light shapes in the walk test (parity), so voids are dark unless a lamp is placed inside. |
| 9 | Vitest: void clear height, crawl rule colours from the fact, crawl route record round-trip, hatch placement on grid tiles. |
| 10 | e2e: set a corridor ceiling to 2.4 m grid tiles, ceiling voids on (clear height shown), draw a crawl space along it from a hatch to a vent, walk test: the player can crouch in it (or the volume exists in the game's collision). |
| 11 | Screenshots: a corridor with its void shown, a crawl route. |
| 12 | editor.md and schema.md rows. |

End per section 5 (game build changed: `npm run e2e:quick` too). Commit id `ON13`.
