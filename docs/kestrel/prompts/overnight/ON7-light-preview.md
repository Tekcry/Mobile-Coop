# ON7 - Live lighting in the editor, darkness map, emergency and motion preview, guard view tester
Model: Opus, medium effort.
Decisions: 15

Read `ED-overnight.md` section 5 first. Then: `docs/systems/lighting.md` (all); `docs/systems/ai.md` perception section
(grep `perceive`, `sight`, `cone`, `TORCH`); `src/world/lightField.ts`, `src/world/lightBake.ts`, `src/world/lampMath.ts`
(exports and the main functions), `src/voxel/lampJobs.ts` (grep `bakeLevelLamps`), `src/world/bakedLamps.ts` (grep
`class`, `attachAll`); `src/ai/` perception constants (grep `FOV\|viewDist\|sightRange` in `src/ai/enemy.ts` and
`src/config`); `src/editor/scene3d.ts` (how the editor builds meshes and materials); the ON6 lamp records and
`lightCatalogue.ts`.

Michael (2026-10-13): update lighting in real time in the editor; quick while dragging, exact on drop; a darkness map
toggle in View; emergency and motion preview; a guard view tester. Light parity (bible 5.1): what the editor shows
must be what the game computes.

| # | Decision |
| --- | --- |
| 1 | **Light view** (Hub > View "Lighting", key `Y` with the keyboard; pad: View tab row): the editor scene switches from its flat massing light to night: the theme's ambient and moon as the game sets them for this map, plus every lamp. |
| 2 | **Exact light**: the game's own pipeline: the editor builds the light shapes and calls the game's bake (`bakeLevelLight` / `bakeLevelLamps` through the game's worker pool, or the pure functions directly if the pool cannot be used in the editor page; say which) and applies the game's `LampPlugin` to the editor's materials, so the 3D view is lit as the game lights it. Runs after a lamp edit is dropped and after any wall, object or opening change on that level (debounced 300 ms); a small "Baking light..." status while it runs; the previous result stays on screen until the new one is ready. |
| 3 | **Quick light while dragging** a lamp (or changing its intensity, aim or beam): the game's `lampMath` formula without occlusion for the moving lamp only (the others keep their exact bake), so the drag is smooth; the exact bake runs on drop. The quick view never feeds the darkness map numbers. |
| 4 | **Darkness map** (Hub > View "Darkness map", key `B` (free; `U` and `D` are taken); pad: View tab): every 0.5 m cell of the editing level's floor walkable area shaded by the game's `LightField.levelAt` at chest height (the meter's sample height; grep `bodyLevel`): black under the shadow threshold (`LIGHT.shadow`, 0.28), grey to the lit threshold (`LIGHT.lit`, 0.6), white above; the two thresholds drawn as contour lines labelled "hidden" and "lit". Same on the plan. Values from the exact bake only. |
| 5 | **Meter at the dot**: the dot's words add the light meter value and its band ("0.21 hidden") when the light view or darkness map is on. |
| 6 | **Lights preview modes** (View tab, pad and keys): Normal; Mains off (only `maintained` and `non-maintained` emergency fittings and exit signs lit; everything else off); Switched off (pick a circuit with the D-pad, it turns off); Motion lights on (PIR lamps lit, as if triggered); Lamp shot out (select a `breakable` lamp, Selection wheel "Preview shot out"). Each mode re-bakes; none changes the saved data. |
| 7 | **Guard view tester** (Build wheel: Light > Guard view, or Hub > Play): A places a guard eye at the dot (standing eye height from facts or the guard's own constant, cite it), right stick turns it; the floor area the guard can see within its sight range and cone (the AI's own constants, cited) is tinted, cells where the player would be noticed at once (lit) red, noticed slowly (between thresholds) amber, unseen (hidden or out of sight) clear; line of sight blocked by walls, objects and closed doors exactly as the game's ray test does (reuse its function, never a copy). B removes the eye. Several eyes allowed; not saved. |
| 8 | **Performance**: the exact bake on the editing level only; other levels keep their last result or flat light; the darkness map and guard view are recomputed only when their inputs change (the ON-wide lesson); the editor stays usable while baking (worker or chunked). |
| 9 | **Walk test** uses the same lamps (ON6), so the game and the editor agree; the e2e checks one cell's darkness map value against the walk test's light meter at that spot (within 0.05). |
| 10 | No change to the game's light model, constants or shaders (RULES 11); only new callers. If the editor needs a hook the game lacks (for example a way to bake without a running game), add it as a pure function export with a test, no behaviour change. |
| 11 | Vitest: darkness map banding at the thresholds (from `LIGHT`, never typed), mode filtering (mains off keeps only emergency fittings; switched-off circuit; motion on), guard view classification (red, amber, clear) on a small synthetic level, the quick formula equals `lampMath` for an unoccluded point. |
| 12 | e2e: light view on; place a downlight, the darkness map cell under it moves from hidden to lit after the bake; Mains off: the cell goes dark, a spitfire's cells stay lit; a guard eye in a corridor tints the lit cells red; the parity check of decision 9. |
| 13 | Screenshots: the lit office at night, the darkness map on the plan with its contours, Mains off, the guard view. |
| 14 | GPU note: visual quality and frame time on this PC are Michael's check (CLAUDE.md GPU rule); the e2e runs on software GL and checks values, not looks. |
| 15 | editor.md: Light view, darkness map, modes, guard view tester, what is quick and what is exact, limits. |

End per section 5 (the game may change through new pure exports: run `npm run e2e:quick` too). Commit id `ON7`.
