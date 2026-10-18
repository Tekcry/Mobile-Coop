# ON9 - Doors, windows and glass: types and behaviour you can set
Model: Opus, medium effort.
Decisions: 14

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/handover.md` notes "DR door kinds" and "DR, exit-only doors"
(grep `DR`); `docs/kestrel/schema.md` `openings` rows; `docs/kestrel/S0-security-spec.md` (grep `reader`, `level`,
`door`; access levels 0-5); `src/world/levelBuilder.ts` (grep `door(`, `window`, `glass`, `pane`: what the game has);
`src/world/maps/kestrelCampus.ts` (grep `opening`); ON0a's selection card rows (`src/editor/` grep `cardRows` or the
module ON0a made).

Michael (2026-10-13): adding doors and windows should allow customisation: breakable, one-way, locked, sliding glass
and so on. Glass partitions, frosted glass and blinds too. The engine stage DR builds the game behaviour of sliding and
glass doors later (handover); this part sets the data, draws it in the editor and builds what the game already has.

| # | Decision |
| --- | --- |
| 1 | **Door types** (`openings[].type` plus a new optional `door` object; schema rows added): single swing, double swing, sliding glass (automatic), sliding glass (card), sliding manual, glass swing, solid fire door, roller shutter, gate (swing), sliding gate, hatch (floor or ceiling), arch (no leaf). Window types: fixed, opening (top hung), frosted fixed, louvre, roof light. Every type has a catalogue entry (`src/editor/openingCatalogue.ts`: name, default width x height x sill from the scale sheet or facts `door`, leaf material solid / glass / mesh, `src`). |
| 2 | **Door settings** (`openings[].door`, all optional): `hinge` (left / right), `swing` (in / out, which room), `oneWay` (which side opens freely: push-bar exits, fire exits; the other side needs a key or cannot open), `locked` (exists) with `key` (exists) or `level` (card access level 0-5, S0), `reader` (none, card, card and PIN, keypad, key switch), `closer` (self-closing yes / no), `alarmed` (yes / no), `breakable` (glass leaves and panes: can be shot or smashed), `vision` (a glass vision panel in a solid leaf). |
| 3 | **Window and glass settings**: `glass` (clear, frosted, wired, tinted), `blinds` (none, open, half, closed), `breakable`, `opens` (yes / no; an opening window the player can climb through needs the facts' window size). Frosted glass and closed blinds block sight but pass light (bible 5.1: the light model treats them as the game's glass does; if the game has no such state, the editor shows it and editor.md says "in the game from stage DR"). |
| 4 | **Glass partitions**: a wall kind `glass` (schema: add to the wall kinds list) with the same glass and blinds settings; drawn see-through in 3D; collide in the walk test; for sight and light, as decision 3. |
| 5 | **Editing**: the Openings tab of the Y menu lists every type; the selection card's Type row flips through types of the same family (doors with doors, windows with windows); the card's rows show the settings that apply to that type only (no hinge on a sliding door). Defaults are realistic per type (fire doors self-closing and one-way from the stair side out; exits push-bar; sliding glass automatic at the main entrance). |
| 6 | **Drawing**: 3D shows the leaf (solid, glass, mesh), its hinge side and swing arc on the floor, a sliding door's track and stack side, a lock or reader icon at the handle height, one-way arrows; the plan shows the standard symbols (swing arcs, sliding arrows, glass hatching). |
| 7 | **Ring and checks**: an opening with `level` updates the room access levels' check input as the S0 rules expect (no change to the checks themselves; their results show in Checks). |
| 8 | **Walk test**: openings build as the game can today: swing doors with the game's hinged door (`levelBuilder.door`: hinge, swing, locked) where the converter can, else gaps as now; glass panes as the game's breakable panes where it has them; sliding and glass doors as gaps with a note "Sliding and glass doors open in the game from stage DR". Never a game behaviour change. |
| 9 | **Door signs**: the access level shows on the door in 3D as a small coloured plate (Level 1-5 colours as the plans use). |
| 10 | Vitest: catalogue complete, settings shown per type, defaults per type, one-way side from the swing room, schema round-trip byte-identical, the glass wall kind. |
| 11 | e2e: place a sliding glass (card) door at Building A's entrance, set level 2, card reader; a fire door with one-way out; a frosted window with blinds closed; flip a door's Type with the D-pad; save to the sandbox; walk test: a hinged door builds where supported. |
| 12 | Screenshots: the Openings tab, a door's card rows, the plan symbols. |
| 13 | Handover note for stage DR: the data fields this part added (so DR builds them into the game without a schema change). |
| 14 | editor.md and schema.md rows. |

End per section 5 (the walk test path may change: `npm run e2e:quick` too). Commit id `ON9`.
