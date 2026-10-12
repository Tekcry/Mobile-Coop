# ON14 - Mirror, align and evenly space; door name plates and wayfinding signs
Model: Opus, medium effort.
Decisions: 13

Read `ED-overnight.md` section 5 first. Then: the box select and multi-select code from ON3 (grep `boxSelect\|multi`),
the Selected tab model from ON0a; `docs/story.md` (grep `sign`, `Ostler`, `Cinder Yard`, company names: in-game text
rules; never Splinter Cell names); `docs/kestrel/01-mission-brief.md` (grep `sign`, `wayfinding`); `src/world/detailPass.ts`
(grep `sign`: how the game draws signs), `src/world/levelBuilder.ts` (grep `text\|label\|DynamicTexture`); the ON9 door
plates (access level colours).

Michael (2026-10-13): mirror, align and evenly space tools for repeated rooms and objects; door name plates and
wayfinding signs.

| # | Decision |
| --- | --- |
| 1 | **Mirror** (Selected tab, one or many): flip the selection east-west or north-south about its own centre or about a picked line (A, A); doors keep their hinge mirrored, stairs their climb mirrored, objects their yaw mirrored; walls reused as the ED3-3a rules. One undo step. |
| 2 | **Align** (two or more selected): left, right, top, bottom, centres (x or z), and "to the first picked". |
| 3 | **Evenly space** (three or more selected, in a row): equal gaps along x or z between the outer two; or "Array": copies along a line with a count and spacing (0.1 m steps), shown as a ghost before A. |
| 4 | Pure functions (`src/editor/arrange.ts`) with Vitest: mirror (rects, walls, openings, stairs, objects, lamps), align, distribute, array; the room-wall links from ED3-3a kept. |
| 5 | **Door name plates**: every door gets an optional `plate` (room name text, by default the name of the room it opens into, and the access level colour from ON9); toggle on the card; plates shown in 3D on the door's outside face at 1.5 m, and on the plan as a small tag. |
| 6 | **Wayfinding signs** (Y menu: Objects > Signs): wall or ceiling-hung signs with an arrow (left, right, up, down, ahead) and text (from a list built from room and building names: "Building B ->", "Data Hall", "Reception", "Goods In", "Exit", or typed); safety signs (fire extinguisher, first aid, high voltage, gas suppression warning, no entry, authorised only, CCTV in operation) as fixed presets. New collection `signs[]` (schema section 2: id, level, at, wall or hang, kind, text, arrow, size). |
| 7 | All sign text is in-world text: follows `docs/story.md` writing rules and the site's names; no Splinter Cell names. |
| 8 | **Walk test**: plates and signs build as thin non-colliding panels with their text where the game can draw text on a panel (the detail pass or level builder way, cited); if it cannot, plain panels with the colour and a note. Signs are light shapes only if the game treats them so (parity). |
| 9 | Auto plates: Selected tab on a building or level "Add name plates to every door" (one undo step), skipping doors that have one. |
| 10 | Vitest: plate default text from `between`, sign record round-trip, auto plates count. |
| 11 | e2e: three rooms in a row, evenly space them; mirror an office with its door; align two desks; add plates to every door on a level; place a "Building B ->" sign in a corridor. |
| 12 | Screenshots: a mirrored pair, a corridor with signs and plates. |
| 13 | editor.md and schema.md rows. |

End per section 5 (walk test build changed: `npm run e2e:quick` too). Commit id `ON14`.
