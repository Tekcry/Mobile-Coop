# ON15 - Moon direction and time-of-night preview
Model: Opus, medium effort.
Decisions: 11

Read `ED-overnight.md` section 5 first. Then: `docs/systems/lighting.md` (moon, `moonLight`, theme, sky bake);
`src/voxel/skyBake.ts` (grep `bakeMoon`), `src/world/lightBake.ts` (moon inputs), the theme code (grep `moon` in
`src/world/` and `src/config/`), how the Kestrel map sets its theme (`src/world/maps/kestrel.ts`, grep `theme\|moon`);
`docs/kestrel/01-mission-brief.md` (grep `moon`, `night`, `time`, `weather`); ON7's light view and darkness map code.

Michael (2026-10-13): a moon direction and time-of-night preview.

| # | Decision |
| --- | --- |
| 1 | **Night panel** (View tab: "Moon and time"): moon direction (compass bearing, 5 degree steps), moon height (degrees above the horizon), moon brightness (new, quarter, half, full: as the game's theme scale allows), and a time-of-night slider (dusk to dawn) that sets direction and height from a simple sky path for the site (south-ish arc; Southern Hemisphere site if the brief says the site is in Australia; cite the brief, else note the assumption). |
| 2 | **Preview**: with the ON7 light view or darkness map on, changing the moon re-runs the game's moon bake for the editing level (the game's `bakeMoon`, not a copy) and updates shadows and the darkness map; quick while the slider moves (sky light only), exact on release. |
| 3 | **Moon shadow lines**: the plan shows the moon's direction arrow and building shadow outlines on the ground at the current setting, so long dark strips across the yard are easy to see. |
| 4 | **Save for the map**: "Use for the map" writes the setting to the campus file (`meta.night`: bearing, height, brightness, time; schema row) and the Kestrel map reads it for its theme in the game (dev and build), so the walk test and the game use it. Without `meta.night` the map keeps today's moon (no change). |
| 5 | The mission brief's night, if it states one, is the default and a "Brief" marker on the slider. |
| 6 | No change to the game's light model or theme code beyond reading the map's own setting (RULES 11): if the theme has no field for the moon direction, add the smallest map-level override with a test, no change for other maps. |
| 7 | Light parity: the game's light meter in the walk test agrees with the darkness map at one cell after a moon change (within 0.05). |
| 8 | Vitest: time-of-night to direction and height (dusk, midnight, dawn), `meta.night` round-trip, the map reading it (and other maps unchanged). |
| 9 | e2e: light view on, move the moon from east to west, a yard cell's darkness value changes; "Use for the map", save to the sandbox; walk test parity check. |
| 10 | Screenshots: the yard at two moon settings with the darkness map. GPU looks are Michael's check. |
| 11 | editor.md and schema.md rows. |

End per section 5 (game changed: `npm run e2e:quick` too). Commit id `ON15`.
