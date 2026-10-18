# ON0b - Feel and finish: camera, walk, 0.1 m steps, wall corners, no random wall dressing
Model: Opus, medium effort.
Decisions: 13

Read `ED-overnight.md` section 5 first. Then: `src/editor/orbit.ts` (all), `src/editor/controls.ts` (all), in
`padControl.ts` grep `orbitIn`, `stickSpeed`, `walkFrame`, `magnet`; `src/editor/grab.ts` (constants), `src/editor/hub.ts`
(settings); `src/editor/scene3d.ts` (grep `wall`, `piece`, `box`); `src/world/maps/kestrelCampus.ts` (grep `wall`,
`extend`); `src/world/detailPass.ts` lines 1-40 and its callers (`src/world/levelBuilder.ts`, `src/voxel/lightShapes.ts`:
grep `detailPieces`); `src/world/mapDef.ts` (the MapDef fields); `scripts/kestrel/facts.json` `wallExtend`.

Michael (2026-10-13): camera movement is fidgety, hard to move up / down / side to side; walk should default to run,
and holding the walk button should start the character playthrough (the walk test); every adjustment in 0.1 m steps;
walls have gaps at corners and do not line up; walls must not have random conduits or anything on them.

| # | Decision |
| --- | --- |
| 1 | **Camera feel** (`orbit.ts` constants table, all tunable in one place): a radial dead zone (0.15) and an exponent-2 response curve on both sticks; pan acceleration that eases in over 0.25 s and stops without overshoot; orbit and tilt rates separate from pan; zoom on the triggers eased. Values chosen so a full stick pans one screen width in about 1.5 s at the default zoom. |
| 2 | **Up / down**: LB + right stick up / down raises or lowers the camera height without tilting (and plain right stick keeps orbit and tilt); D-pad up / down still changes the editing level when nothing is selected. Say the binding in the hint bar while LB is held. Check against ON0a's action map: no clash (the `conflicts()` test). |
| 3 | **Camera settings** (Hub > Settings): Pan speed, Orbit speed, Smoothing (low, medium, high), Invert tilt (exists), Dead zone; saved with the pad settings. |
| 4 | **Walk**: L3 tap = quick walk at the dot, running by default (the walk's RUN speed); L3 while walking toggles to a slow walk and back; B ends. **L3 held 0.6 s** = the walk test as the player (the game), same as Tab. The hint and Help say it. |
| 5 | **0.1 m everywhere** (Michael): the default grid for drawing, moving, stretching and every property step is 0.1 m (`meta.objectGrid` 0.1 exists; the editor grid setting reads Settings "Grid": 0.1 default, 0.25, 0.5); LB held no longer means "fine grid" but keeps "magnet off, slow camera". Nudges step one grid. The magnet still snaps onto wall ends, wall lines, room corners and door centres, so lining up stays easy. Existing tests that assume 0.5 steps are updated. |
| 6 | **Wall corners**: in the editor's 3D (and the walk test), walls meeting at a point (end to end, or an end on another wall's line) join with no gap: each wall end that meets another wall is extended by half the other wall's thickness (or by `wallExtend` x its own thickness, whichever closes the gap), so outside corners are square and T-joins meet the face. Pure function in `geometry.ts` with Vitest (L, T, X joins, different thicknesses, a free end stays as drawn). The data in the file is not changed (centre lines stay as they are). |
| 7 | **Wall line-up**: walls on the same line with ends that meet draw as one continuous wall (no seam); a wall end within 0.05 m of another wall's line or end shows a red "Gap 0.04 m" marker in the checks and on the plan, so near-misses can be fixed (one-click fix on the Selected tab: "Close gap"). |
| 8 | **No random wall dressing on Kestrel**: the game's detail pass (`detailPass.ts`: skirting, conduits, junction boxes, vents, signs, floor clutter at 'ultra' / 'epic') does not run for the Kestrel campus map; everything on a wall is placed on purpose in the editor (ON5 climb pieces, ON6 lights, ON4 objects). Add a `MapDef` field (for example `detail: false`), read it everywhere `detailPieces` is called (level builder and light shapes, so light parity holds), set it on the Kestrel map only; other maps unchanged (the detail pass test still passes). The editor itself never adds dressing. |
| 9 | Vitest: dead zone and response curve, corner join extension cases, gap marker threshold, grid setting, the MapDef opt-out (Kestrel builds 0 detail pieces, the warehouse still builds its usual count). |
| 10 | e2e: L3 starts a running quick walk (stride check vs the walk speed), L3 again slows it, B ends; L3 held starts the game walk test; a 0.3 m nudge is three 0.1 steps; two walls drawn to meet at a corner render with no gap (3D mesh bounds overlap at the corner). |
| 11 | e2e:quick too (the game's map build changed): the Kestrel walk test shows no detail pieces (debug hook count 0). |
| 12 | Screenshots: a corner close up before / after (from a test level), a corridor in the walk test with plain walls. |
| 13 | editor.md: camera controls and settings, walk buttons, grid, corners, no dressing. |

End per section 5 (game changed: `npm run e2e:quick` too). Commit id `ON0b`.
