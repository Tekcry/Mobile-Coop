# ON10 - Roof tool: flat, pitched, hip, skillion and more, all adjustable
Model: Opus, medium effort.
Decisions: 13

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/schema.md` levels, rooms of kind `roof`, voids `rooflight`
(grep); `docs/kestrel/02-building-brief.md` roof lines (grep `roof`, `parapet`, `pitch`); `scripts/kestrel/facts.json`
`rules.parapet` and `player` / `reach`; `src/world/levelBuilder.ts` (grep `ramp\|slope\|pitch\|box(`: can the game
walk on a slope?), `src/player/` slope limits (grep `slope\|maxSlope\|groundAngle`); `src/world/maps/kestrelCampus.ts`
(how roofs and level R build today).

Michael (2026-10-13): add roofs; choose flat, pitched and so on, all customisable.

| # | Decision |
| --- | --- |
| 1 | **Roof record** (schema section 2, new collection `roofs[]`): id, name, building, `rect` (the plan outline, axis-aligned for now), `base` (eaves height above ground, default the top of the highest level under it), `type`, and type settings. |
| 2 | **Types**: flat (with fall 1-2 degrees, parapet height default facts `rules.parapet` 1.1, or upstand 0.3 with no parapet), mono-pitch (skillion: pitch degrees, high side N / S / E / W), gable (pitch, ridge along x or z), hip (pitch; hips on all four sides), sawtooth (pitch, tooth width, glazed side), curved (barrel: rise). Every type: overhang (0-1.0 m), fascia depth, material (metal deck, concrete, membrane, tile) and colour. |
| 3 | **Roof tool** (Y menu, Build tab: Roof): draw the outline (or A on a building to take its footprint), pick the type tile; the selection card rows show only that type's settings (pitch steps 1 degree, lengths 0.1 m). |
| 4 | **Geometry** (pure, `src/editor/roofGeometry.ts`, Vitest): each type to planes (triangles) and a ridge height; used by the editor's 3D, the plan (outline, ridge and hip lines, fall arrows, height labels) and the walk test. |
| 5 | **Walk test**: flat roofs as walkable floors with their parapets or upstands; sloped planes as collision the player can stand on only if the game allows that slope (cite the limit), else as walls the player slides off, and the card says "too steep to walk (game limit N degrees)". No player or physics change. |
| 6 | **Roof access and edges**: the existing level R and roof rooms stay; a flat roof's top is checked against level R (warn on mismatch); roof lights (voids `rooflight`) cut through. |
| 7 | **Gutters and downpipes**: optional gutter along eaves (a drawn ledge the ON5 rules judge), downpipe positions offered at the corners (ON5 pieces). |
| 8 | **Light and sight**: roofs block the moon and sky light as the game's sky bake does (the walk test feeds them in as shapes; parity holds). |
| 9 | Vitest: geometry per type (ridge height = half span x tan pitch for gable; hip ridge length; sawtooth count), overhang, the steepness flag from the game's limit, schema round-trip byte-identical. |
| 10 | e2e: put a gable roof on the gatehouse (pitch 25), change it to hip with the D-pad Type row, set the overhang 0.6; a flat roof with parapet on a test outline; walk test: the player stands on the flat roof. |
| 11 | Screenshots: each type in 3D (one image with four small roofs), the plan symbols. |
| 12 | Plans (`scripts/kestrel/plans.mjs`): draw roofs on level R or L plans as dashed outlines with ridge lines (only if the script has an easy hook; else an editor-only overlay and a note). |
| 13 | editor.md and schema.md rows. |

End per section 5 (game build changed: `npm run e2e:quick` too). Commit id `ON10`.
