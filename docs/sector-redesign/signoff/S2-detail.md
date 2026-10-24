# Campus S2 - plan detail (backing for S2.md)

Planner: Opus, overnight 2026-10-24. This page finishes the S2 plan a previous planner left: graph and SVGs done, pages missing. Inputs:
- `docs/level-validator/campus-run/S2.md` (F1-F10) and REPORT.md;
- SPEC.md S2 (:273-322);
- `src/world/maps/campusS2.ts` and the S2 entries of `campusSectors.ts` (guards :84-137, cameras :277-281, sector :355-380);
- the mission design audit, section 4;
- the sync-node contract (README);
- Marlow's Split Shift beat chart (`origin/feature/mission-framework:docs/missions/prototypes/split-shift/BEAT.md`).

Outputs:
- Graph: `docs/sector-redesign/graph/plan/campusOps-S2.json`. It has 27 spaces and 53 links, plus the C2 spine link. Every space carries an `area` box [x0, z0, x1, z1] (world metres, its bounding box; Marlow lead note). It also has a top-level `tracks` block (Split Shift) and a top-level `syncs` array.
- Plans:
  - `S2-plan-0.svg` (G);
  - `S2-plan-4.4.svg` (L1);
  - `S2-plan-8.4.svg` (L2);
  - `S2-plan-12.3.svg` (roof).

Map frame and drawing:
- Plan bounds: x -50..10, z -36..12, 1 m = 10 px. Pixel x = (x + 50) * 10, pixel y = (12 - z) * 10.
- The canvas is widened by a 240 px legend panel on the right. The map's frame and mapping are unchanged.
- Frame: x east, z north, y up, metres. Boxes are wall centre lines.

Fixed and kept:
- Footprint x -44..4, z -30..6.
- Floors G 0, L1 4.4, L2 8.4, roof 12.3. The roof light is at 13.2.
- The C1 far door (-20,-30) and the start (C1 checkpoint (-20,0,-32)).
- The C2 card door (4,-14) and the spine link `s2-l1-landing -> s3-c2` (unchanged).
- Both fire-stair cores: SW x -42..-39.4, z -28..-22.4; NE x 0..2.6, z 0..5.6.
- The objective: the BMS terminal hack (-6.5,4.4,4.3).
- Map meta `players [1, 2, 3, 4]`.

## 1. Validator counts (S2's ids only)

Command: the rulebook's five-file `node scripts/level-validate.mjs docs/sector-redesign/graph/plan/campusOps-S{1,2,3,4,5}.json`.

| | ERR | WARN |
| --- | --- | --- |
| As built (`campus-run/run.txt`) | 41 | 44 |
| Plan copy as the earlier planner left it (this graph, before this page) | 0 | 30 |
| **After (this plan, with split s2-hack)** | **0** | **30** |

The 41 as-built errors:
- Class or camera-floor size, 12: foyer, kitchen, meet4, MR1, MR2, MR3, facilities (camera floor), comms, landing, L2 wing, board room, roof plant room.
- Approaches and route kinds, 7: foyer (2 approaches, no high), L1 wing (no high), facilities (1 approach, 1 kind, no high, no loud).
- Declared targets, 7: shadow for the foyer, hall, L1 plan, wing and facilities; vantage for the L1 plan and the wing.
- Dead ends, 15: lift lobby, store, plant room, kitchen, print room, meet4, MR1-MR3, comms, SE meeting room, offices A / B, board room, roof plant room.

The map-wide co-op coverage ERR as built (6 of 25 encounter spaces) is gone in the five-file plan run. The whole run is 0 errors / 117 warnings.

The 30 S2 WARNs are justified in section 9.

Guards as built: 12 (SPEC), of which 11 are counted in encounter spaces. Five spaces were WARN below the 3-6 early band: foyer, hall, L1 plan, wing, facilities.

## 2. Change list

Ids C1-C18 are the `PLAN Cn` tags in the graph notes and on the SVGs.

### G (y 0), `S2-plan-0.svg`

| # | Change | Where (x, z; y; size) | Fixes / why |
| --- | --- | --- | --- |
| C1 | **One lobby**. Foyer, hall and NE lobby become one space. The turnstile barrier stays inside it (z -23, 1.1 high, three open 1.2 gates). | Box x -30..-8, z -30..6 (22 x 36), plus the NE lobby x -8..4, z -4..6; clear height 4.0 under the L1 slab | Foyer 7 x 22 ERR (lobby 14 x 17). Foyer 2 approaches / no high. Foyer and hall shadow (one light plan: section 3). |
| C3 | **Feature stair** rebuilt in its as-built box. Two flights of 13 risers (0.169 x 0.285) with a 2.0 m mid landing; rails both sides, 1.1. | x -19.2..-16.8 (2.4 wide). Foot z -9.5 (G), landing z -13.1..-15.1, head z -18.5 on the L1 south strip. The old 24-step flight (x -19.4..-16.6, z -20.2..-11.7) is removed. | F4: no landing, open sides. NCC 2-18 risers. Sheet section 3. |
| C5 | **Plant-room switchgear and north door**. The east-wing breaker board (BoardDef, no window) on the switchgear faces west and carries groups 55 + 56. New north door to the NE lobby: locked, breachable (loud to force). Guard nav cannot use it, so #7 walks round by reception. | Board (0.3,0,-22). Door (-5,-4), 1.2 x 2.1. The plant room stays x -8..4, z -30..-4. Hide spot (2.5,0,-24) kept. | Plant-room dead end. Sync node sync-s2-power. Marlow's twist path. |
| C6 | **Back-of-house doors**: mail room to lift lobby, and lift lobby to store. | (-36,-12) and (-36,-4), 1.2 x 2.1 | Dead ends: lift lobby, store. The foyer's secret approach (the trolley run). |
| C16 | **Mail-lift ladder** (old mail lift, out of service): a 1.2 x 1.5 shaft with a service ladder from an L1 hatch down behind the cages. | Shaft x -34..-32.8, z -19.5..-18, rise 4.4, 6 s | Mail room high approach; L1 plan high route that is not co-op. |
| - | Mail room re-typed to encounter: #12 is awake and posted at the goods door. | x -44..-30, z -20..-12 | V5f-3: track B passes him (beat 1B). |

### L1 (y 4.4), `S2-plan-4.4.svg`

| # | Change | Where | Fixes / why |
| --- | --- | --- | --- |
| C2 | **Void narrowed** from 16 x 16 to 14.5 x 14.5. The L1 balustrade moves from z -19.9 to z -18.4 and from x -10.1 to x -11.6. Hatched on the plan. | Void x -26..-11.5, z -18.5..-4. South strip z -22.4..-18.45 and east strip x -11.45..-7.6: both 3.9 m clear (were 2.45). The pendants at (-22 / -18 / -14, 9.0, -17) stay inside the void. | F1 (69 m of walkway under the 3.0 m sheet minimum, on the loud route and #4's patrol). |
| C4 | **CR2 slab nose**: a 6 m gap in the balustrade at x -11.6. The planter is removed. | Lip x -11.5, z -11..-5, 4.4. Boost spot (-12.1,0,-8). The top is the 3.9 m east strip, flat. The feature stair's east rail is 5.3 m off (AS11). | F2: the 0.7 m sliver and the 0.45 step. |
| C8 | **Kitchen widened**: west wall moved from x -28.5 to x -30. New north door. **Project room**: the print room and meet4 merged (partition x -13 removed), with a new door to the SE meeting room. | Kitchen x -30..-21, z -30..-22.5 (7.5 x 9). Doors (-30,-26) (the overhear spot, out of the lamp) and (-25,-22.5). Project room x -21..-7.5, z -30..-22.5. Doors (-17,-22.5), (-10,-22.5), (-7.5,-27). | Kitchen class + dead end. meet4 class + dead end. Print room dead end. SE meeting room dead end. |
| C9 | **Meeting rooms**. MR1's front moves from x -36 to x -35.5, with a glass door and a new north door. MR2 and MR3: fronts move from z 2 to z 0, side walls extended, new side doors. | MR1 x -44..-35.5, z -20..-14; doors (-35.5,-17), (-40,-14). MR2 x -44..-34, z 0..6; doors (-39,0), (-34,3). MR3 x -26..-16, z 0..6; doors (-21,0), (-16,3). Fronts frosted to 1.2, clear above. | MR1-MR3 class + dead ends. The 1.2 glass gaps become doors (opening-width WARNs gone). |
| C10 | **East wing re-cut**. The old landing walls (x -2, z -16..-12; z -12 and z -16 lines) and the old comms walls (x -2, z -9..-4; z -9) are removed. New walls at x -2.5 (z -17.5..-4.5) and at z -17.5, -10.5 and -4.5 (x -2.5..4). The facilities south wall moves from z 0 to z -1. | Facilities x -7.5..-0.2, z -1..6 (clear 7.1 x 6.75). Doors (-4,-1) and (-7.5,3), both kp-fac. Glazed partition on x -7.5, z 0.5..5.5. Comms room x -2.5..4, z -10.5..-4.5; doors (-2.5,-7.5) and (1,-10.5); patch panel (3.6,4.4,-6.5). Landing x -2.5..4, z -17.5..-10.5 (6.5 x 7); west door (-2.5,-16) is pair gate pg-brg; card door (4,-14). Wing hall x -7.5..-2.5 (5 m) plus the strip z -4.5..-1 to the NE stair door. | Facilities camera-floor ERR + 4 approach ERRs. Comms class + dead end. Landing class (F7). K2's blind side. |
| C12 | **Sunshade ledge and window**: a 1.2 m steel sunshade on the north face, with a window anchor into the facilities office. | Ledge x -7..-1, z 6..7.2, y 4.4. Window (-4,4.4,6). | Facilities high approach (the rappel, C12 on the roof). |
| C15 | **Fire-stair landings**: near landing 1.2 -> 1.3 (`NEAR_D`). Doors moved 1.5 m off the core corners. Vision panels in the L1 / L2 doors. | Both cores, every floor | F5. The SPEC vantage "SW stair L1 door (vision panel)" now exists. |

### L2 (y 8.4), `S2-plan-8.4.svg`

| # | Change | Where | Fixes / why |
| --- | --- | --- | --- |
| C2 | L2 balustrade moved with the void: the same 3.9 m south and east strips. | z -18.4, x -11.6 | F1 (#4's strip). |
| C13 | **Rooms opened up**: office A gets a second door; office B gets a side door into the east wing. The board room grows (south wall z 0 -> -2.5) and gets a west door. The executive suite's south door becomes pair gate pg-exec. | Office A (-24,-22.5). Office B (-7.5,-26). Board room x -7.5..-0.2, z -2.5..6; doors (-4,-2.5), (-7.5,3). pg-exec door (-33,-4); keys a (-34.8,8.4,-4.6) and b (-31.2,8.4,-4.6). | Offices A / B and board room dead ends. Board room class. A co-op door (CR-S2b). |
| C14 (L2 end) | Roof-plant hatch and cat ladder land on the north plan. | (-18,8.4,3) | Roof route into L2. |

### Roof (y 12.3), `S2-plan-12.3.svg`

| # | Change | Where | Fixes / why |
| --- | --- | --- | --- |
| C2 | Roof-light rim follows the void. | Rim x -26.4..-11.1, z -18.9..-3.6 (was x -26.6..-9.4, z -20.6..-3.4) | Matches C2. |
| C12 | **Window-cleaning davit** on the north parapet: rappel 7.9 m to the sunshade ledge. | Davit (-4,12.3,5.8). Rappel at `RAPPEL.descend` 0.6 m/s (`movement.ts:370`), 16 s; window anchor (`traversal.ts:270`). | Facilities high approach with no code. |
| C14 | **Roof plant room** rebuilt to plant-room class. Door to the roof; floor hatch with a cat ladder down to L2. | x -20.5..-12, z 0..6, walls 4.0 (was x -20..-12, z 0..4.5, 2.4). Door (-16,0). Hatch (-18,3). | Class ERR + dead end. The roof route's way into L2. |

### Not drawn (data and engine)

| # | Change | Fixes / why |
| --- | --- | --- |
| C7 | **Guards**: 18 (section 6). #10 and #12 lose `dormant`. New: #13, #14, #18, #19, #20, #21. #11 (K2) moves to (1.5,4.4,-15.8), yaw 0 (faces the comms door). | Band WARNs (5 -> 3). Michael's 22:00 density. Ramp S1 15 < S2 18 < S3 20. |
| C11 | **Lights**: the reception downlight joins `s2-atrium` (group 50, the atrium board). Facilities lamp = group 55 (a cold desk lamp). Wing corridor: two downlights on `l1Cor` 56, at the facilities door and the landing's west door. L2 south ring: eight balcony downlights on 52. The K2 landing gets a white downlight. | Shadow targets (section 3). |
| C17 | **RoomDefs and data**: `S2_ROOMS` re-cut to the new boxes (closes F3, the 266 m2 of L1 floor in no room). `S2_DOORS`, routes, hide spots, cameras unchanged. Intel entries for the overhear and the plant log. The patch panel is an E6 desk entry. The switchgear goes in `S2_BOARDS`. | F3. Sync nodes. |
| C18 | **Solo window on the pair gates** (pg-brg, pg-exec): one player turns both keys within 8 s, named in the briefing. Today `SectorPairGate` needs two players (`sectors.ts:443`). This is an engine cost. | Contract rule 4 (solo can do every node). Marlow A16 (`solo` field). |

### Door rules checked on the plan (scale sheet section 5)
- Doors are 1.2 x 2.1 everywhere.
- Fire-stair doors sit 1.5 m off the core corners, on 1.3 landings.
- Wing hall: the doors at (-4,-1), (-2.5,-7.5), (-2.5,-16) and (-4.5,-23) are at least 6 m apart. Swings go into the rooms, leaving the 5 m hall at least 3.8 m clear.
- South ring: doors at x -25, -24, -20, -17 and -10 open off a 3.9 m strip (walls at z -22.5). All swing south into the rooms.
- The facilities door (-4,-1) and the NE stair door (1.5,-0.1) are 5.6 m apart on the 3.5 m strip.

## 3. Routes per guarded space

Route kinds in the graph are shadow / high / loud / secret. The audit's words are dark / high-or-vent / social-or-tool.

| Space (guards) | Dark (shadow) | High / vent | Social / tool (loud) | Secret |
| --- | --- | --- | --- | --- |
| s2-foyer (4) | Post-room door (-30,-27) behind cam-turnstile's line. Lift-lobby door (-30,-8). NE stair door off the dark NE lobby. Plant-room door behind #1's back. | CR2 hang-drop off the slab nose into the dark cafe | Through the turnstiles under cam-turnstile, then the lit feature stair (#14). Mail-room door under the G night lamp in #2's round. Force the plant room's north door. | Store door at the hall's dark NW corner (the back-of-house chain) |
| s2-mail (1) | Post-room door (-36,-20) | Mail-lift ladder from the L1 hatch, behind the cages | Mail-room door (-30,-16) onto the hall's west strip | C6 door from the lift lobby |
| s2-l1-plan (3) | SW fire stair, L1 door (vision panel) | CR2 boost / human ladder (co-op). Mail-lift ladder up from the mail room. | Feature stair (lit, watched) | Project-room back loop (-10,-22.5) |
| s2-l1-wing (2) | North door (-7.5,-3) off the dark north plan | NE fire stair down from the roof bulkhead | South door (-7.5,-21) at the end of the lit south strip | Comms-room door; SE meeting room by the project room |
| s2-l1-facilities (1, objective) | West door (-7.5,3) from the dark north plan, kp-fac (code overheard at the kitchen) | Davit rappel to the sunshade ledge and window (no code) | Wing door (-4,-1) beside the corridor light switch, kp-fac | - |
| s2-l2-plan (4) | SW stair L2 door. Or the NE stair, the L2 wing and the north door. | Roof-plant hatch and cat ladder (from the roof) | Wing south door (-7.5,-21) at the lit south ring (#4) | Office B, through to the wing |
| s2-l1-landing (K2, choke) | Comms-room door (1,-10.5), facing K2 (lure first) | - | - | pg-brg west door on K2's blind side (co-op, or the solo window) |

### Loop, choke, vantage, goal, landmark

**Loop.** The section ring: foyer -> post room -> SW stair -> L1 plan -> wing -> NE stair -> NE lobby -> foyer. Inner loops:
- G back-of-house: post -> mail -> lift lobby -> store -> foyer -> post.
- L1: round the void ring (3.9 m strips). Also plan -> project room -> SE meeting room -> wing -> north door -> plan.
- L2 stealth loop (SPEC): SW stair -> L2 west gallery -> north strip -> wing -> NE stair.
- High: SW bulkhead -> roof -> NE bulkhead or the davit or the roof-plant hatch.

**Choke.** The bridge landing: K2 (#11) is posted at (1.5,4.4,-15.8) facing north to the comms door, leash 5, guarding `c2-door`.
- Under cam-bridge, with alarm-brg beside him.
- Ways past: lure or take him from the comms door; the pg-brg west door on his blind side (90 degrees off his facing); or cam-bridge looped from the patch panel.

**Scouting vantage.** The roof-light rim (12.3), dark. It looks down the void at the L2 strips, the L1 strips and the hall. It sees about 9 of the 18 guards' patrols: #2, #3, #4, #9 (part), #10 (part), #13 (cafe edge), #14, #19, #21. Declared, measured in greybox (V6).

Per-space vantages (graph `vantage`, all declared, V6):

| Space | Vantage | sees_pct |
| --- | --- | --- |
| foyer | store doorway (-30,1), dark, over the hall to the turnstiles | 0.7 |
| mail | post-room door (-36,-20) | 0.7 |
| L1 plan | dark MR1, standing over the 1.2 frosted band | 0.7 |
| wing | the SE meeting room door (-4.5,-23), up the hall | 0.7 |
| facilities | the dark north plan, through the glazed partition | 0.75 |
| L2 plan | the SW core's L2 door vision panel | 0.7 |

**Goal visible first.**
- Ghost walks the dark north plan and sees, about 20 m off, the cold desk lamp on the BMS terminal through the facilities office's glazed partition (x -7.5, z 0.5..5.5).
- The exit (the glazed C2 bridge) is seen from the roof and from the L1 south strip across the wing glass.

**Landmark.** The atrium: three pendants hung at 9.0 under the roof light, the one lit column in the building. It is seen from every floor's ring and from the roof rim. It is a star on all four plans.

### Light language

| Space | White cone (patrolled) | Warm lamp (objective / social) | Dark (route) |
| --- | --- | --- | --- |
| foyer | Atrium pendants over the void's south half and the reception downlight (both on the atrium board, group 50) | Reception desk (#1) | Cafe, NE lobby, west strip, NW store corner |
| mail | Bulkhead lamp over the goods door (#12) | - | Cage aisle |
| plant room | - | - | All of it (nobody works there at night); the hold and the takedowns |
| L1 plan | Eight balcony downlights on the 3.9 m strips (51) | Kitchen (54), where the coffee pair talks | West and north plan (PIR off), MR1-MR3 |
| wing | Two corridor downlights (56) at the facilities door and the landing's west door | - | SE end, comms door; all of it after the cut |
| facilities | - | Cold desk lamp on the BMS half (55): the objective's light, out with the cut | Plotter half |
| landing | White downlight over K2 | - | West corner (pg-brg door) |
| L2 plan | Eight balcony downlights (52); lift-lobby night lamp | - | Offices, west gallery, north plan |
| roof | - | - | All of it; the rim |

## 4. Sync nodes and tracks

Top-level `syncs` array in the graph. Per Marlow's mission-validator note, it is named `syncs`: that is the schema key, and the validator accepts `sync` too, which S1 uses. Each node has id / kind / space / src / lead / track, plus `helps`, `lead_note` and (pair nodes) `solo`.

| id | kind | space | src | lead | track | helps / solo |
| --- | --- | --- | --- | --- | --- | --- |
| sync-s2-comms | camera_loop | s2-l1-comms | planned: SecurityDesk as a patch panel (`sectorDesks.ts:14`, E6) at (3.6,4.4,-6.5); cameras cam-turnstile, cam-lift, cam-bridge (`campusSectors.ts:277-281`) | s2-l1-wing: #8 at his panel stop (2.2,-6.5), heard through the comms door: "UPS green, cameras green." | A | B: the foyer crossing behind reception; both: the landing |
| sync-s2-power (was sync-s2-switchgear; `aka` kept in the graph) | power_cut, HELD (`held: true`, `timer_s: null`, `circuits: [55, 56]`) | s2-plant-g | planned: breaker BoardDef, no window (`isolators.ts:25`, E4) at (0.3,0,-22) on groups facilities 55 + l1Cor 56 (`campusS2.ts:49`) | s2-foyer: #1's radio at the desk: "Facilities, your east boards tripped again." Which breaker: the plant log. | B | A: the facilities office and the L1 wing go dark, and #7 leaves the BMS desk; dark until a guard relights the board (no timer) |
| sync-s2-atrium (optional) | power_cut | s2-foyer | built: `S2_BOARDS`, `campusS2.ts:192`, group 50 | s2-foyer: the board on the foyer's east wall (-8.4,-28.5), in the reception downlight | B | B: pulls #1 to his own board, splitting the twist pair (guard-ai LR16-4) |
| kp-fac | code_sink | s2-l1-facilities | planned: SectorKeypad, code s2-fac-code, on both facilities doors (`sectors.ts:166`, EW5; not built, `campusSectors.ts:360`) | s2-l1-plan (the kitchen door) | A | No-code way in: the roof rappel |
| lead-s2-kitchen | code_source | s2-l1-plan | planned: SectorIntel overhear (`sectors.ts:182`), a 2 x 2 box outside the kitchen west door (-31,-26); talkers #5-6; grants s2-fac-code | (the lead itself: the overheard line) | A | A: kp-fac |
| lead-s2-plantlog | code_source | s2-mail | planned: SectorIntel board (`sectors.ts:183`) in parcel cage 3 (-41.5,0,-18.5); grants s2-board | s2-post: the sorting-table note (-35,-26), "Plant log - cage 3 for facilities" | B | B: names the east-wing breaker |
| sync-s2-pairdoor | pair_door | s2-l1-landing | planned: SectorPairGate pg-brg (`sectors.ts:410`, E3) | s2-l1-wing: #8 to #20 at the pair-door corner: "Two keys on the bridge lobby door since the labs thing; mine is in the comms room." | A with B | **solo**: the solo window (C18), turning key b in the comms room then key a in the wing (11.8 m) within 8 s; without it, the comms door facing K2 |

Leads required by the lead's note are all present:
- kitchen overheard line (lead-s2-kitchen);
- mail-room plant log (lead-s2-plantlog);
- post-room note (the lead of the plant log).

Marlow Build's Split Shift graph notes (lead messages, overnight), as applied:
1. **sync-s2-comms** is the camera_loop panel in s2-l1-comms (Ghost, track A), looping cam-turnstile / cam-lift / cam-bridge. There is no reception-desk loop (`sync-s2-desk`) in this plan, so nothing duplicates those cameras. A desk loop at #1's desk would be the alternative, not offered.
2. **sync-s2-power** is a held cut on 55 + 56 with no timer: the board has no `window`. It is renamed from sync-s2-switchgear to Marlow's id. No timed 45 s balcony cut (51 / 52) is planned: the balconies stay lit as the patrolled white cones.
3. **sync-s2-atrium** is the built reception board (`campusS2.ts:192`, group 50).
4. **`solo`** is on sync-s2-pairdoor (table above). Every pair sync needs one (Marlow A16).
5. **Leads**: the kitchen pair's overheard line gives the facilities keypad code; the plant log in the s2-mail cages gives the breaker.
6. **exfil**: the bridge landing is Split Shift's exfil, recorded as `tracks.exfil: "s2-l1-landing"` and not as a space tag. Tagging `exfil` on s2-l1-landing makes the five-file campus run fail: 2 ERRs, "a route from start to exfil skips section S3 / S4". The campus exfil is S5's (AS16).
7. **`area`** [x0, z0, x1, z1] is on every S2 space: the bounding box in world metres. The validator accepts the extra field.
8. **`syncs`** is the array key (Marlow's schema key; the validator also accepts `sync`).

**Track A, Team Ghost (L1)**: foyer -> post -> SW stair -> L1 plan (1A: overhear at the kitchen door) -> wing -> comms (2: patch panel) -> wing -> facilities (4A: the hack, in the dark) -> wing -> landing (5).
- 144 m, 122 s with actions (1.3 m/s, plus the overhear 4-6 s, panel 1.5 s and hack 3 s).
- It waits for the cut before 4A.

**Track B, Team Shadow (G)**: foyer -> post -> mail (1B: plant log) -> post -> foyer -> plant room (3: the cut; 4B: the hold, taking #7 and #1 in the dark) -> foyer -> NE stair -> wing -> landing (5).
- 146 m, 115 s plus the hold. #7 and #1 reach the board in about 70 s.

The tracks meet at the bridge landing. Parity: 6% on time (122 vs 115 s), 1% on walk.
- These are mission tracks, not a validator split. They run apart for the whole section and do not cover each other, so the 90 s split cap and 15 s reach rules apply to the sub-split in section 5.
- The tracks block now says `parity_pct` 6; it said 1, which was the walk parity.

What each node does for the other track:
- A's comms loop blinds cam-turnstile for B's foyer crossing behind reception.
- B's switchgear cut darkens 55 + 56. #7 leaves for the plant room, so A hacks in the dark.
- Both need the pair door, or K2 handled, at the meet.

Guards relight boards (guard-ai S15). The cut is a window: here it lasts until #7 reaches the board, unless Shadow holds it.

## 5. Co-op moves and split numbers

| Move | Spaces | What it buys | Solo bypass |
| --- | --- | --- | --- |
| CR2 leg-up + human ladder (kept, re-cut C4) | foyer -> L1 plan at the slab nose (4.4) | Skips reception, the turnstiles and the SW stair; tops out on the dark east strip | SW fire stair (shadow) or the feature stair (loud). The way down for a player left on top is the hang-drop (4.4). |
| pg-brg pair gate (sync-s2-pairdoor) | wing -> landing | The west door on K2's blind side, at the meet | Solo window (C18) or the comms door facing K2 |
| pg-exec pair gate (CR-S2b) | L2 plan -> executive suite | The short way into the suite out of #21's loop | Solo window or the east door (20.5 m vs 17 m: no solo twin) |
| Dual takedown (`sync_pair`) | kitchen #5 + #6 | Clears the coffee pair | Wait for the refill trip (isolation) |

**Split `s2-hack`** (tagged in the graph; this is the validator's split, inside Ghost's track A):
- Fork: s2-l1-plan. Rejoin: s2-l1-wing.
- Leg a: s2-l1-facilities, entered by the west door (kp-fac) and left by the wing door. 38.5 + 14 m, **40.4 s**.
- Leg b: s2-l1-project -> s2-l1-se-meet, the cover player's back-room loop. 25.5 + 12.5 + 16 m, **41.5 s**.
- Parity **2.7%** (max 20). Both legs are under 90 s.
- Overwatch: s2-l1-se-meet. Its dark door sees up the wing hall to the facilities door, #8 and #20.
- Assist, on `s2-l1-wing -> s2-l1-se-meet`: leg a leaves the office and turns the wing corridor lights (56) off at the switch beside its door (-4,-1). Leg b then walks up a dark hall. In Split Shift the switchgear cut has already done it.
- Worst partner reach: **14.2 s**, from the project room to the office by the SE meeting room and the wing (42.5 m at 3.0 m/s). The office to the SE meeting room is 10.0 s. This is under 15 s but tight; greybox measures it.
- Lengths are middle to middle on the plan (AS9).
- Proof the split is checked: with leg a's first link stretched to 95 m, the validator prints `split s2-hack: legs 83.8 s vs 41.5 s differ by 50%`.

**With 2+2:**
- Ghost's two players run `s2-hack`: one keys in from the north plan, the other covers from the SE meeting room. One of them also loops the comms panel.
- Shadow's two players: one holds the plant room and takes #7 and #1 in the dark (hide spot (2.5,0,-24)). The other pulls the atrium board, sending #1 to his own board and splitting the pair.
- Overwatch per team: Ghost has the SE meeting room. Shadow has the store doorway over the hall (the foyer vantage).

**With 2 players:** one per team (Marlow's A9). The kitchen pair, CR2 and pg-brg are their co-op beats. **With 3:** the third joins Ghost.

## 6. Guards per space (18; was 12)

Ramp: S1 15 -> **S2 18** -> S3 20 -> S4 > 20 -> S5 most.

Archetypes per SPEC: officer = pistolSd, grunt = rifle. No enforcers, no dogs (S4+).

Escalation: 18 + `perStage` 2 x 3 stages = 24, within `SECTOR.maxAlive` 32. Reinforcement spawns stay at the goods door (-40,-16.5) and the L2 lift lobby (-36,-7). No guard is dormant.

| Space (count) | # | Archetype | Post / patrol (x, y, z; cycle) | Reason | Isolation / overlap |
| --- | --- | --- | --- | --- | --- |
| foyer (4) | 1 | officer | Post at the reception desk (-20,0,-24.9), faces the turnstiles; operator of cam-turnstile / cam-lift monitors | Front of house; answers the atrium board | Goes to the board when it is cut (LR16-4); on the cut, #7 collects him (twist) |
| | 2 | grunt | Desk (-24,-24.8) <-> lift-lobby door (-29,-8.5), 4 s stops, 42 s | Ground-floor round | Alone at the lift-lobby door, in the dark west strip |
| | 13 NEW | grunt | Cafe (-20,0,2) <-> NE lobby (-2,0,2), 4 s stops, ~38 s | Cafe and NE lobby round (the NE stair door) | Dark at the NE lobby end; overlaps #2 at the cafe |
| | 14 NEW | officer | Atrium sentry at the feature-stair foot (-18,0,-8.5), faces S, 60 degrees either side, 12 s | Watches the hall and the stair (the loud way up) | Back to the cafe and the CR2 drop |
| mail (1) | 12 | grunt | Post at the goods door (-42.5,0,-16), faces into the room (awake now) | Takes the courier's paperwork | Faces E; cage 3 is behind his left shoulder |
| L1 plan (3) | 3 | officer | North strip (-24.5,4.4,-2.7) <-> (-11.5,-2.7), 4 s stops, 36 s | Looks down into the atrium | Covered by #4 across the void |
| | 18 NEW | grunt | West plan: SW fire door (-38,4.4,-21) -> MR1 (-33,-16) -> (-32,-8), 4 s stops, ~36 s | Checks the west plan and the mail-lift hatch | Alone at the north end; the SW door is dark behind him |
| | 19 NEW | officer, torch | North plan: MR2 (-39,4.4,-1.5) <-> facilities west door (-9,-1.5), 4 s stops, ~44 s | Torch round of the dark north plan and the meeting rooms | Alone at MR2 (32 m from the office); overlaps #3 on the strip |
| kitchen (2; utility, counted here) | 5, 6 | grunt + officer | Talking pair, 34 s master-clock loop of a 4 x 3 rectangle (-27..-23, -27.5..-23.5) | Their break; they rehearse the facilities code | Refill trip; dual takedown |
| wing (2) | 8 | grunt | Facilities door (-4,4.4,-1.5) -> comms panel stop (2.2,-6.5) -> pair-door corner (-4,-16.5), 3 / 7 / 3 s, ~40 s | Reads the UPS panel each round | In the comms room for 7 s (the panel loop waits for him to leave) |
| | 20 NEW | officer | Relief: NE stair door (1.2,4.4,-2.7) <-> facilities door (-4.5,-2.2), 6 s stops, ~24 s | Relieves #11; chats with #8 (the pair-door line) | Overlaps #8 at the facilities door |
| facilities (1) | 7 | officer | BMS desk (-6.5,4.4,2.9) 28 s <-> plotter (-2.5,4.2) 6 s, 43 s | Night facilities duty | On the cut: NE stair, hall, reception (collects #1), plant room |
| landing (1; connector, counted here) | 11 | officer | K2: post (1.5,4.4,-15.8), yaw 0 (faces the comms door), leash 5, guards `c2-door` | The labs' only link | Blind to the west door (pg-brg) |
| L2 plan (4) | 4 | grunt | South ring (-11.5,8.4,-21.3) <-> (-24.5,-21.3), 4 s stops, 36 s, opposite phase to #3 | Watches L1 across the void | At the east end, under the strip's last downlight |
| | 9 | officer | SW fire door (-37.5,8.4,-23.5) <-> lift lobby (-33.5,-8.5), 5 s stops, 43 s | Clocking round | First to a report on L2 |
| | 10 | grunt | Lift sentry (-35,8.4,-7) <-> (-33,-7), 12 s sweeps (awake now) | Watches the corridor to the executive suite | Overlaps #9 at the lift lobby |
| | 21 NEW | grunt | North plan: exec east door (-29,8.4,-1.5) <-> east-wing north door (-9,-1.5), 4 s stops, ~40 s | North strip round; the board-room door | Turns away from pg-exec at the east end |

Graph counts per encounter space: foyer 4, mail 1, L1 plan 3, wing 2, facilities 1, L2 plan 4. The kitchen pair and K2 sit on a utility space and a connector, so they are not in `guards` (campus convention). Total 18.

Three spaces are WARN below the 3-6 band (section 9).

**Screen cap** (`CAMPUS_SCREEN_CAP` 12, rulebook floor ~12 awake on screen). The worst spots look across the void:
- The CR2 top on the L1 east strip sees about 11: L1 3, L2 #4 / #21 / #9, G #2 / #13 / #14, the kitchen pair through the door.
- The roof rim sees 9.
- Measured by the greybox screen-count test. If a spot is over 12, #13 is tagged dormant.

Cameras are unchanged: cam-turnstile, cam-lift, cam-bridge. All three are on the comms patch panel loop.

## 7. Solo path (every sync node in sequence)

Order from Marlow's beat chart: 1B, 1A, 2, 3, 4A, 5. About 24 min, rated lower.
1. Post room note -> mail room: plant log from cage 3, behind #12's left shoulder (lead-s2-plantlog).
2. Post room -> SW stair -> L1 west plan: overhear the code at the kitchen door (lead-s2-kitchen).
3. North plan -> wing north door -> comms room when #8 has left: loop the cameras (sync-s2-comms).
4. NE stair down -> NE lobby -> hall (cam-turnstile is looped) -> plant room: cut the switchgear (sync-s2-power).
   - The solo fallback is named in the briefing: the cut sends #7 down to the board and back, about two minutes.
   - Optional: the atrium board, to split #1 from #7.
5. NE stair -> wing (dark) -> facilities office (kp-fac, or the roof rappel with no code): hack.
6. Landing: the pg-brg solo window (C18), or the comms door with K2 lured or taken. Then C2.

No co-op move is needed: CR2, pg-brg, pg-exec and the dual takedown all have solo ways. Longer, never impossible.

## 8. Held items

- **EW5 keypads (kp-fac)** are not built (`campusSectors.ts:360`). The code beat needs them. The rappel is the no-code way, so nothing softlocks. Build cost: slice S2-G5.
- **Solo window on pair gates** (C18) is an engine change: `SectorPairGate` is two players only today. Without it, solo uses the comms door past K2 and the exec east door.
- **Rappel onto a 1.2 m ledge** into a window anchor: S5's rappels end on the ground. Engine check at greybox.
- **Ceiling-void duct** (SPEC :106, finding F9) is not built in this plan either. The secret routes come from the back-of-house doors, office B and the project room. It could be added later, about 2 h.
- **Parapet mantle** out of bounds (as-built finding, audit 4): engine behaviour, checked in V6 / e2e.
- **Per-team restart** (Marlow EN2) and the alarm areas belong to the mission framework, not the layout.
- **Sync nodes** are not read by the level validator: `mergeGraphs` ignores the `syncs` and `tracks` blocks. Marlow's mission validator reads them.
- **Declared values** (shadow, vantage, LOS, partner reach) are measured in greybox (V6, `--require-measured`).

## 9. WARN justification (30 S2 lines)

| WARN (count) | Why it stays |
| --- | --- |
| Ceiling outside class (17): foyer 4.0; cores 4.0; L1 rooms 3.8; L2 rooms 3.6 | Campus storeys are 4.4 floor to floor (SPEC). The class rows assume 3.0-3.3 suspended ceilings. Same as every campus section. |
| Off the 0.5 grid (4): both cores 2.6 x 5.6 | The cores are kept as built (fixed). |
| `custom` (3): lift lobby, L1 wing, L2 wing | The sheet has no lift-lobby or corridor-hall class. Sizes: lift lobby 8 x 14 (dummy lifts, cam-lift, the stage-2 spawn); wings 11.5 wide. The L2 wing was open_office, ERR 11.5 below 14. |
| Above class max (3): executive suite 10 x 14, offices A 7.5 x 15.5 and B 5.5 x 7.5 | An executive suite and cellular offices are inside the as-built L2 shell. Cutting them smaller would add dead rooms. |
| Guards below the early band (3): mail 1, wing 2, facilities 1 | Mail room: one goods-door post is what a mail room has at night. Wing: a 5 m hall; a third post would block both tracks. Facilities: Marlow's premise is one officer who leaves when his lights go out. |

## 10. Assumptions (logged, undoable)

- **AS1** The void narrows to 14.5 x 14.5 so both ring strips are 3.9 m clear.
  - Undo: option 2 (keep 16 x 16). The strips stay 2.45 (F1), and CR2 goes back to x -10 with the planter removed.
- **AS2** 18 guards: +#13, #14, #18, #19, #20, #21, and #10 / #12 awake. This follows the ramp S1 15 < S2 < S3 20.
  - Undo: drop the six new ones (12). The band WARNs return on the foyer and the L1 plan.
- **AS3** The comms room is re-classed `server_room` -> `storage`: a comms cupboard, not a data room.
  - Undo: `server_room` needs 8.5 x 11, which eats the landing.
- **AS4** The sync array is named `syncs` (Marlow's schema key, lead note), with `track`, `helps`, `lead_note`, and `solo` on pair nodes. S1 uses `sync`. The validator accepts both.
  - Undo: rename it.
- **AS5** The validator split `s2-hack` is a sub-split inside track A, as S3 did. The mission tracks (122 / 115 s) are over the 90 s cap by design; they do not cover each other.
  - Undo: remove the three `split:` tags, the overwatch tag and the `assist`. S2 then has no validator split.
- **AS6** The pair gates' solo window is 8 s, named in the briefing.
  - Undo: no solo window. Solo takes the comms door past K2.
- **AS7** The plant room's north door is locked and breachable, so the twist walks #7 through reception.
  - Undo: unlock it. #7 then comes straight from the NE stair and the twist pair never forms.
- **AS8** The davit rappel is the facilities office's high approach.
  - Undo: needs another high approach, for example the ceiling-void hatch from the comms room (F9). Otherwise the facilities ERR returns.
- **AS9** Link lengths are measured middle to middle on the plan.
  - The L1 plan's middle is (-27.5,-12): its box centre (-25.75,-12) is on the void edge, so the west strip at that z is used.
  - Other middles are box centres: the wing (-5,-11.5), the office (-3.85,2.5), the project room (-14.25,-26.25), the SE meeting room (-1.75,-26.5).
- **AS10** The split's assist is the wing corridor light switch beside the facilities door (an existing switch, no new device).
  - Undo: move the assist to the switchgear cut.
- **AS11** The feature stair's east rail is 5.3 m from the CR2 lip (SPEC wanted 6 m from the old gap). The 4 m solo-standable rule holds, and there are rails on both sides.
  - Undo: shift the stair 0.7 m west.
- **AS12** The mail room is an encounter space (#12 awake, on track B).
  - Undo: utility with #12 dormant. Shadow's beat 1B then has no guard.
- **AS13** Guard keys hold `"2"` only, the campus convention: campus guards do not scale by player count.
- **AS14** #19 carries a torch: the archetype's flashlight (`src/ai/archetypes.ts`), no new gear.
- **AS15** Campus unwalked features are not tracked per area yet. This plan counts as +1 for campus.
- **AS16** Split Shift's exfil (the bridge landing) is a `tracks.exfil` field, not an `exfil` tag, because the tag breaks the campus spine check.
  - Undo: tag the space only in a mission-scoped S2 graph (meta sections ['S2'] run alone).

## 11. Greybox build cost (after sign-off; Sonnet builds from Opus briefs, one checker)

| Slice | Work | h |
| --- | --- | --- |
| S2-G1 G floor | Lobby RoomDef merge, feature stair (2 flights, landing, rails), plant-room north door + switchgear board, C6 doors, mail-lift shaft + ladder | 3.5 |
| S2-G2 Void and rings | Void 14.5 on L1 / L2, balustrades moved, CR2 lip re-cut (planter out, `S2_COOP_LIPS`), roof-light rim, pendants checked | 3 |
| S2-G3 L1 rooms | Kitchen, project room, MR1-MR3, east wing re-cut (facilities, comms, landing), sunshade ledge, core landings 1.3 + vision panels | 4 |
| S2-G4 L2 + roof | Office doors, board room, pg-exec, roof plant room + hatch + cat ladder, davit + rappel window | 3 |
| S2-G5 Devices + engine | kp-fac (EW5 keypad), patch panel (E6 desk), switchgear (E4), pg-brg, intel (overhear, plant log), pair-gate solo window (C18), light groups 55 / 56 | 4.5 |
| S2-G6 Guards + tests | 18 guards (`S2_GUARDS`), K2 move, routes, hide spots; `tests/campusS2.test.ts` (cycles, screen cap 12, CR2 lip, pair gates); V6 measured graph pass | 3 |
| **Total** | 6 slices | **~21 h** |

Option 2 (keep the 16 m void): drops the void and rim part of S2-G2, about 3 h. Total about 18 h.
