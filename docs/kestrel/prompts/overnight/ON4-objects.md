# ON4 - Objects and cover: realistic catalogue, object tool, rows, stealth badges (ED2 Part F, extended by Michael)
Model: Opus, medium effort.
Decisions: 16

Read `ED-overnight.md` section 5 first. Then: `docs/kestrel/prompts/ED2-editor-v2.md` lines 393-430 (Part F; this
brief wins where they differ); `docs/kestrel/schema.md` `objects` rows (grep `objects`); `scripts/kestrel/facts.json`
groups `player`, `reach`, `lip`, `door`, `rules` (`rackWidth`, `aisleMin`, `aisleTallObject`); `docs/level-design.md`
cover and climb sections (grep `cover`, `vault`, `mantle`; read only those ranges); `docs/kestrel/02-building-brief.md`
section 5 room list (grep the room names, for which sets belong where); `src/world/maps/kestrelCampus.ts` (how the
walk test builds boxes).

Michael (2026-10-13): objects must suit the building: a colocation data centre campus with offices, a security
building, plant, goods-in, yards and roofs. All four sets below, real sizes.

| # | Decision |
| --- | --- |
| 1 | **Catalogue** `src/editor/catalogue.ts` (pure data): id, name, group, footprint w x d, height, base height `y`, `noLedge`, mount (`floor`, `wall`, `ceiling`), and `src` per entry. Sizes below are typical real products ("editor default: typical product" as src) unless the brief, facts.json or level-design gives one (then cite it). Michael adds presets later by editing this file only. |
| 2 | **Data hall set**: server rack 42U 0.6 x 1.2 x 2.0 (width = facts `rackWidth` if it differs, cite it); network rack 0.8 x 1.2 x 2.0; rack row (n racks, drawn); aisle containment end door panel 1.2 x 0.1 x 2.1; containment roof (drawn over an aisle, y 2.0, 0.05 thick, `noLedge`); in-row cooler 0.3 x 1.2 x 2.0; floor cooling unit (CRAH) 2.5 x 0.9 x 1.95; power distribution cabinet 0.8 x 0.6 x 1.9; overhead cable tray 0.6 wide, drawn, y 2.7, 0.1 high, `noLedge`; gas suppression cylinder bank 1.8 x 0.4 x 1.7; customer cage mesh (drawn line, 2.4 high, see-through: mark `seeThrough`); crash cart 0.5 x 0.4 x 1.0; tape library 1.0 x 1.2 x 2.0; step ladder 0.5 x 0.6 x 1.5. |
| 3 | **Plant set**: UPS cabinet 1.2 x 0.85 x 1.9; battery rack 1.5 x 0.8 x 1.8; LV switchboard section 0.8 x 0.8 x 2.2 (row drawn); diesel generator 6.0 x 2.2 x 2.6; day tank 2.0 x 1.0 x 1.2; bulk fuel tank (outside) 8.0 x 2.5 x 2.5; chiller (roof) 6.0 x 2.2 x 2.4; condenser unit 1.2 x 0.6 x 1.4; pump set 1.2 x 0.6 x 1.0; pad transformer 2.2 x 1.8 x 2.0; ring main unit 1.6 x 0.8 x 1.6; air handling unit (roof) 5.0 x 2.0 x 2.0. |
| 4 | **Office and security set**: desk 1.6 x 0.8 x 0.75; desk pod of 4 with screens 3.2 x 1.6 x 1.2; office chair 0.65 x 0.65 x 1.1 (no cover badge: it is see-through); filing cabinet 0.47 x 0.62 x 1.32; tall cupboard 0.9 x 0.45 x 1.8; locker bank of 3 0.9 x 0.5 x 1.8; reception counter 3.0 x 0.8 x 1.1; security desk 2.4 x 0.9 x 0.75 with monitors to 1.15; CCTV video wall (wall) 3.6 x 0.3 x 2.2 at y 0.8; meeting table 2.4 x 1.2 x 0.75; sofa 2.0 x 0.9 x 0.85; kitchenette run 2.4 x 0.6 x 0.9; fridge 0.6 x 0.65 x 1.8; vending machine 0.9 x 0.85 x 1.83; water cooler 0.35 x 0.35 x 1.1; copier 0.6 x 0.7 x 1.2; shredder 0.4 x 0.3 x 0.7; whiteboard (wall) 1.8 x 0.05 x 1.2 at y 0.9; pot plant 0.5 x 0.5 x 1.2. |
| 5 | **Goods-in set**: pallet 1.165 x 1.165 x 0.15 (Australian pallet); pallet stack 1.165 x 1.165 x 1.5; boxed equipment 1.2 x 0.8 x 1.0; packing bench 2.0 x 0.8 x 0.9; roll cage 0.8 x 0.7 x 1.8; pallet jack 1.6 x 0.55 x 1.2; shelving bay 1.8 x 0.6 x 2.4; crate 1.0 and 1.2 (cubes). |
| 6 | **Yard and roof set**: car 4.7 x 1.85 x 1.45; van 5.3 x 2.0 x 2.3; ute 5.3 x 1.9 x 1.8; skip 3.6 x 1.8 x 1.5; wheelie bin 240 L 0.58 x 0.73 x 1.07; bulk bin 1100 L 1.37 x 1.07 x 1.33; bollard 0.2 x 0.2 x 1.0; boom gate (arm 4.0 long at 1.0 high, post 0.3 x 0.3 x 1.1); bike rack 2.0 x 0.6 x 0.8; smoking shelter 3.0 x 1.5 x 2.4 (roof slab, open front); gas bottle cage 1.2 x 0.8 x 1.8 (mesh, see-through); low wall 0.2 thick x 0.9 (drawn); planter 2.0 x 0.6 x 0.6; column 0.4 x 0.4 x storey; roof walkway grating 0.6 wide (drawn, y 0.1). |
| 7 | **Schema**: `objects[]` gains optional `preset` (catalogue id), `yaw` (0, 90, 180, 270; the rect stays axis-aligned, so 90 / 270 swap w and d) and `seeThrough` (true for mesh, chairs, glass); `exterior[]` unchanged here (ON5). Add the rows to schema.md section 2. The campus file stays byte-identical on a no-op save. |
| 8 | **Object tool** (Build wheel: Object > Data hall, Plant, Office, Goods-in, Yard and roof > presets; tool bar slot "Object" with the preset under it): ghost at the dot, RB turns 90 degrees, A places, Y tap repeats. Snaps to the 0.1 m object grid (`meta.objectGrid`) and backs onto a wall face within 0.3 m (wall-mounted presets must touch a wall: else the dot is red, "Move onto a wall"). Mouse: key 9, click, `R` turns. |
| 9 | **Rows**: rack row, switchboard row, low wall, cable tray, containment roof, cage mesh and walkway are drawn (A start, A end, as walls); racks snap to whole racks; the panel and the dot show the aisle clear width to the next parallel row against facts `aisleMin` / `aisleTallObject`, red when under. |
| 10 | **Stealth badges** (pure, from facts only): full cover (top above stand height), crouch cover (top above crouch height and below stand), vault (top at or under the low-climb fact), climb (top within grab reach and not `noLedge`), hang (a lip the player can hang from); `seeThrough` gives no cover. Missing fact: no badge, a "no fact" note (never a typed number). Shown on the selection card and as an icon over each object. |
| 11 | **Stealth view** (Hub > View, key `J`): objects tinted by badge in 3D and on the plan (full cover green, crouch cover yellow, climb blue, see-through grey). |
| 12 | **Walk test**: objects build as solid boxes of their real height and base (`seeThrough` ones too: collision is real); their `yaw` honoured. Through the existing campus converter, no special cases. |
| 13 | **Plan**: objects drawn with their name and footprint (plans.mjs already draws `objects`; check it and extend only if needed). |
| 14 | Vitest: badge rules at each boundary (just under and over each fact), turning keeps the footprint on the grid, rack rows snap to whole racks, aisle width words, catalogue entries all have a src and positive sizes. |
| 15 | e2e: place a rack row of 10 in the data hall with the pad, a second row with an aisle (aisle words correct), a crate in the yard, turn a desk 90 degrees; stealth view on; walk test: the player cannot walk through the rack row (collision) and crouches behind the crate. |
| 16 | Screenshots: the Object wheel, a data hall bay with two rows, the stealth view. |

End per section 5. Commit id `ON4`.
