# Campus S3 - re-plan detail (backing for S3.md)

Planner: Opus, overnight 2026-10-24, S3 RE-PLAN. Inputs: `docs/level-validator/campus-run/S3.md` (H1-H9), REPORT.md (verdict "Re-plan"), SPEC.md S3, `src/world/maps/campusS3.ts`, `campusSectors.ts` S3 entries, the mission design audit (section 4), and the sync-node contract (README).
- Graph: `docs/sector-redesign/graph/plan/campusOps-S3.json`: 19 spaces, 34 links + the C3 spine link, and a top-level `sync` array.
- Plans: `S3-plan-0.svg` (G) and `S3-plan-4.5.svg` (L1, with the walkway at 6.0 and the void at 7.5 drawn on it).

Frame: x east, z north, y up, metres. Boxes are wall centre lines (walls 0.3, so clear = box - 0.3).

Fixed and kept:
- Footprint x 10..64, z -30..0. Not extended.
- Floors G 0, L1 4.5, roof 9.0 (underside; 9.2 top).
- C2 far door (10, 4.5, -14) on L1.
- C3 near door (24, 0) on G and the spine link `s3-dock -> s4-dock` (unchanged).

Everything else inside the shell is re-laid.

## 1. Validator counts (S3's ids only)

Command: the rulebook's five-file `node scripts/level-validate.mjs ...plan/campusOps-S{1..5}.json`.

| | ERR | WARN |
| --- | --- | --- |
| As built (`campus-run/run.txt`, rerun) | 25 | 32 |
| Plan copy before this edit (same graph) | 25 | 31 |
| **After (this plan)** | **0** | **9** |

The 25 as-built errors:
- Class sizes: 9.
- Fire-stair width: 3.
- Unreachable yard: 1.
- Hall: rule of three (no loud approach), shadow 0.02, vantage 0.45.
- Dock: 2 approaches, 1 kind, no high, no loud, shadow 0.12.
- Dead ends: write-up room, clean room, security room.
- Redundancy: 1 route.

Every one is fixed by the re-plan (section 2). The whole five-file run is now 0 errors / 116 warnings. Map-wide lines are not S3's.

The 9 S3 WARNs are justified in section 9.

## 2. Change list

### G (y 0), `S3-plan-0.svg`

| # | Change | Where (x, z; y; size) | Fixes / why |
| --- | --- | --- | --- |
| G1 | West lobby removed as a room. Its east wall x 22 removed; the hall extends west to x 10. | Hall box x 10..52, z -30..-11, 42 x 19. Low aisle x 10..14 under the landing, 4.3 high. Main hall 9.0 high. | H9 (720 m2 of transit), lobby class ERR, single chain. |
| G2 | Hall north wall moved from z -8 to z -11. Doors: goods roller door x 20..23 (3.0 x 3.0) to the dock; control-room door (40.6, -11). Observation glass x 34..39 and 44..50, 1.0..2.1 high. | z -11, x 10..52 | Dock and control room room sizes; hall loud approach (roller door). |
| G3 | SW stair core removed. New **west fire stair**. | Core x 14..17.5, z -21..-14.5. Flights 1.4. G door west face (14, -19.4) into the low aisle; L1 door stacked above. | Fire-stair width ERR; stair 1 of 3. |
| G4 | **Dock** re-cut and re-classed `loading_dock` -> `storage`. | x 10..30, z -11..0, 20 x 11, 4.3 high. C3 door (24, 0) kept. Desk x 23.5..25.5, z -2.6..-1.8. Gas cage moved to x 10..13.5, z -3.5..0. Loading pad 0.1 under the hoist hatch x 18..21, z -6..-3. | Dock class ERR (was 8 x 18); approaches; choke. |
| G5 | Old north stair core (x 40..42.6) removed. New **north fire stair**. | Core x 30..33.5, z -7..-0.5. G doors west (30, -6) to the dock and east (33.5, -6) to the control room. L1 door (31.6, -7). | Stair 2 of 3; second dock door; split fork. |
| G6 | **Test control room** (NEW; replaces the sealed plant under L1 and the old dock's east half). | x 30..52, z -11..0 less the north stair core; 22 x 11, 4.3 high. Doors: hall (40.6, -11), north stair (33.5, -6), plant (52, -9). Sign-out board (44, -0.3). | H9 (162 m2 sealed); B-track code source; B objective hook. |
| G7 | **Plant room** (NEW; replaces the sealed east annex). Annex north wall at z -8 removed. New wall z -7, x 52..64. | x 52..64, z -30..-7, 12 x 23. 4.3 high under L1 (z -18..-7), 9.0 over the chiller bay. Doors: hall (52, -26.8), control (52, -9), east stair (59.7, -7). Lighting board with the timed isolator (56, -7.3). | H9 (264 m2 sealed); B-track power cut; loop. |
| G8 | **East fire stair** (NEW). | Core x 58..61.5, z -7..-0.5. G door (59.7, -7) into the plant. Riser x 61.5..64 and LV switch room x 52..58, z -7..0 stay sealed (services, locked). | Stair 3 of 3; split rejoin. |
| G9 | **Chilled-water trench** (NEW, crouch duct 1.2 x 1.5). | From the plant (53.5, -29) west under the south strip to a grated pit at the chamber's SE corner (37, -23). | Hall secret approach. |
| G10 | **East yard sealed**: two 6 m walls, noLedge, the perimeter's height. `s3-yard` removed from the graph; #14 moves into the plant. | x 64..70 at z 0 and at z -30 | H8 out of bounds; unreachable-space ERR. |
| G11 | Kept: chamber x 30..36, z -22..-14 (4.4), EMC room x 42..48, z -24..-16, burn-in racks along x 50.6..51.6 (cut to z -25..-11.5 to clear the plant door). Crane-bay screen shortened to z -21.5..-14. | | Identity (SPEC). |

### L1 (y 4.5) and the high surfaces, `S3-plan-4.5.svg`

| # | Change | Where | Fixes / why |
| --- | --- | --- | --- |
| L1 | **Landing** cut from 12 x 30 to 4 x 19. | x 10..14, z -30..-11. Glass east face (from the floor, 1.1 rail) over the hall. Suspended ceiling at 7.5, open in the 2 m crane-access bay at the south end. Fire double door 1.8 at (12, -11) to the corridor. West stair door (14, -19.4). | Lobby class ERR; the landing now has 3 ways off (was 1). |
| L2 | **Crane walkway** widened 1.25 -> 1.5 and extended west to x 14. Ship ladder (1.5) from the landing's crane bay to a door at 6.0 in the x 14 glass wall. | x 14..52, z -29.85..-28.35, 6.0. Ladders at x 18 and x 51. | The high route starts at the entry; the hall vantage (0.75). |
| L3 | **Viewing corridor** widened 2.0 -> 4.0 (hatched on the plan), moved to z -11..-7, lengthened. | x 10..52; ceiling 7.5 (3.0 clear). Glass south side x 14..52 on a 1.1 spandrel. 0.8 deep sample cases at x 18, 26, 34, 46 as cover. | H2, H6 (pair blocks the corridor), corridor ERR. |
| L4 | **East lobby** (NEW): the corridor's continuation. | x 52..64, z -11..-7 | Reaches the east stair and the security room. |
| L5 | **Goods landing / hoist room** (NEW). | x 10..21, z -7..0. Hoist hatch x 18..21, z -6..-3: rail on three sides, chain stowed, no ladder. Maintenance hatch to the void at (20.5, -1). | Dock high approach and vantage; CR3b; void access. |
| L6 | **Write-up room** re-cut (`reward`: the code lead). | x 21..30, z -7..0, 9 x 7, glass front. Door (24.6, -7). | Dead-end ERR (now a reward room under 15 m). |
| L7 | **Gowning room** widened 3 -> 4. | x 33.5..37.5, z -7..0. Door (35.5, -7). Pass-through door (37.5, -3) with las-gown inside. panel-gown on its north wall. | Storage ERR; H1 (no door swings into the corridor at 3.7 clear). |
| L8 | **Clean room** grown 6 x 7 -> 7 x 9.5. New airlock door (47, -3) into the store. | x 37.5..47, z -7..0 | Lab ERR; dead end -> the dark route to the objective. |
| L9 | **Prototype store** grown 4.4 x 7.4 -> 7 x 11. Shelving partition at x 53, aisle gap z -4..-2.8 with las-store; panel-store on the front-bay side. Hatch (49.6, -7), airlock (47, -3), staff door (58, -6) on kp-store into the inner bay, void tile (49.5, -3). | x 47..58, z -7..0 | Objective with 4 ways in (dark / vent / social / tool). |
| L10 | **Security room** moved over the plant. Door (58.6, -11); escape ladder (54, -17) to the plant. | x 53..64, z -18..-11, 7 x 11 | Dead-end ERR; overwatch of the split; camera loop. |
| L11 | Back corridor (1.55) and north strip (1.3) removed. | | H2, H4 (door spacing). |
| L12 | **Escape gallery** moved with the wall. | Deck x 28..44, z -12.5..-11, 1.5 wide; spur x 31..35, z -14..-12.5 lands on the chamber roof over a 3.0 bridge plate. Door to the corridor (43.2, -11). Sprung drop gate at x 44 (4.5, one way down). | H5 / CR3 lands in a usable place; the 0.5 hop WARN is gone. |
| L13 | **Ceiling void** (NEW): walk-on clean-suite ceiling, 1.5 clear (crouch; guards cannot enter, nav headroom 1.7). | 7.5, x 21..58, z -7..0 | Secret route to the store. |
| L14 | A70's 1.7 spandrel (`S3_VIEW_SPANDREL_TOP` 6.2) goes back to 1.1. | | The walkway vantage sees the corridor pair (AS2). |

### Door rules checked on the plan (scale sheet section 5)
- North corridor wall door centres: 12.6, 24.6, 31.6, 35.5, 49.6, 59.7 (gaps >= 3.0).
- The gallery door (43.2) faces no door within 2.0.
- No door within 1.5 m of a stair end: stair doors sit on the 1.4 landings.
- C2 (z -14) and the west stair door (z -19.4) sit 5.4 m apart across the landing.
- Every door that swings into the corridor leaves at least 2.5 m clear (H1 closed).

## 3. Routes per guarded space

Route kinds in the graph: shadow / high / loud / secret. Audit wording: dark / high-or-vent / social-or-tool.

| Space | Dark | High / vent | Social / tool | Secret |
| --- | --- | --- | --- | --- |
| s3-hall (6 guards) | West stair into the low aisle, the south strip under the walkway, round the EMC room (cut hb-3 or time #8) | Walkway from the landing, down the SE ladder. CR3 chamber roof to the gallery. Gallery drop gate. | Roller door from the dock (lit, #18). The high-bay switch bank lure. | Trench from the plant to the chamber pit |
| s3-dock (4) | North stair west door into the dark west end | Hoist hatch drop (and the hatch vantage). CR3b back up. | Roller door from the hall. cam-dock looped at the security desk. Lure #9 with the dock lights. | none (map WARN, section 9) |
| s3-store (objective; #5 + las-store) | Clean suite: las-gown jammed or cut, then the airlock | Void crawl, then the ceiling tile | Keyholder at the hatch, taken in the isolator's dark; or kp-store with the relayed code | the void counts as vent |
| s3-view (connector; pair + keyholder) | Isolator cuts the corridor circuit | Gallery outside the glass (x 28..44) | Dual takedown of the pair (`sync_pair`) | |

### Loop, choke, vantage, goal, landmark
- **Loop**: section ring landing -> corridor -> north stair -> dock -> roller door -> hall -> west stair -> landing. Inner loops:
  - round the chamber;
  - hall -> control room -> north stair -> dock -> hall;
  - corridor -> gowning -> clean -> store -> hatch -> corridor;
  - store -> east stair -> east lobby -> corridor.
- **Choke**: the C3 near door. Dock officer #9 is posted at the desk (24.5, -3), facing south into the dock, the door 2.5 m behind him. Leash 5, guards `c3-door`.
  - This reverses SPEC A60 ("S3 has no choke") for the audit's one-choke-per-section rule.
  - Distractions: noise, a thrown item, the dock work lamps, cam-dock looped.
- **Vantage**: the crane walkway (6.0, eye 7.6), dark, reached from the landing before the hall.
  - Sees about 0.75 of the hall floor.
  - Sees 6 of the 11 moving guards: #6, #7, #8, #11, plus #2 and #3 through the corridor glass. Also #16, #17 and #5.
  - Second vantage: the hoist hatch over the dock (0.8).
  - Third: the control-room window (B's look into the hall).
- **Goal visible first**: from the landing's fire door (12, -11) the store hatch's warm shelf lamp shows at the far end of the corridor, 37.6 m off.
- **Landmark**: the environmental chamber, a white insulated box with a slow red status beacon on its refrigeration plant. Seen from the landing, walkway, corridor and control room. Marked with a star on both plans.

### Light language

| Space | White cone (patrolled) | Warm lamp (objective / social) | Dark (route) |
| --- | --- | --- | --- |
| Hall | 5 high bays, 3 circuits: crane bay (20, -20); aisle pairs (27, -12) / (39, -12) and (27, -25) / (39, -25) | burn-in log desk task lamp | low aisle, south strip, behind the EMC room, east of the chamber, the walkway |
| Dock | desk and C3 door work lamps | none | west end, gas cage, under the hatch |
| Corridor | downlights over the pair's beat | the store hatch shelf lamp (goal) | the gallery outside the glass |
| L1 rooms | security room | write-up desk lamp (code lead); store shelf lamp | goods landing, gowning (night light only), clean room (off), void |
| G rooms | control-room consoles; plant chiller bay | sign-out board lamp (code source) | trench, the plant's north passage |

## 4. Sync nodes and tracks

Top-level `sync` array in the graph: id / kind / space / src / lead / track, plus a note. The S1 shape, as the lead asked.

| id | kind | space | src | lead | track | helps |
| --- | --- | --- | --- | --- | --- | --- |
| sync-s3-isolator | power_cut | s3-plant | planned (engine `src/game/isolators.ts:53` IsolatorBoards) | s3-plant (permit-to-work tag on the board; #14's grumble) | B | A: corridor and gowning dark for 45 s (the split's assist on the hatch link) |
| sync-s3-code-src | code_source | s3-control | planned (`src/game/sectorKeypads.ts:10` SectorCodes, a board) | s3-writeup (#13's radio handover names the board) | B | A: the store's staff door |
| sync-s3-camloop | camera_loop | s3-sec | planned (`src/game/sectorDesks.ts:14` SecurityDesk, `DESK_LOOP_TIME` 30 s `:34`) | s3-sec (operator's kettle routine, the monitor wall) | A | B and the pair: cam-dock at the choke, cam-view |
| sync-s3-code-sink | code_sink | s3-store | planned (`sectorKeypads.ts:10`; kp-store, SPEC S3 register) | s3-view (keyholder #5: "use the staff door") | A | the store's inner bay past las-store |

**Track A (L1 / high)**: landing -> corridor (or the gallery) -> clean suite, hatch or void -> store -> east stair landing -> east lobby -> security room (camera loop) -> corridor west -> goods landing -> hatch drop into the dock.
- About 149 m, about 114 s at 1.3 m/s.

**Track B (G / service)**: landing -> west stair -> hall (dark south strip, or the walkway) -> control room (code) -> plant (isolator) -> east stair foot (meets A for the hand-off) -> plant -> control room -> north stair foot -> dock.
- About 147 m, about 113 s.

The tracks meet at the dock, at the choke. Track parity is about 1%.

## 5. Co-op moves and split numbers

- **CR3 (kept)**: leg-up onto the chamber's west face (lip 4.4) at (29.2, -18), then the spur and gallery, then the corridor door. Gets past the pair without the north stair.
  - Solo bypass: the north stair.
  - The roof is solo-reachable from the gallery (no softlock).
  - Boost spot: #6 and #7 loop 2.5 m off the chamber faces. The west face is out of both views for at least 12 s per 42 s cycle (declared, V6).
- **CR3b (NEW)**: leg-up from the dock's 0.1 loading pad into the hoist hatch (lip 4.4).
  - Nothing over 1.0 within 4 m: the gas cage is 4.5 m off.
  - Solo bypass: the north stair. The way down is a solo drop.
  - Validator: no solo twin, no softlock.
- **Dual takedown**: the corridor pair, one at each end (`sync_pair` on s3-view). Solo waits for their split at the hatch end.
- **Split `s3-obj`** (tagged in the graph; numbers from the validator's model, middle to middle at 1.3 m/s):
  - Fork: the north stair. Rejoin: the east stair foot.
  - Leg a: s3-view -> s3-store (hatch), 53.5 m, **41.2 s**.
  - Leg b: s3-control -> s3-plant, 45 m, **34.6 s**.
  - Parity **15.9%** (max 20).
  - Overwatch: s3-sec. Its monitors show leg a, and the desk loops cam-view and cam-dock.
  - Assist: the hatch link (leg b's isolator darkens the keyholder).
  - Worst partner reach: **9.8 s** (store <-> plant by the east stair, 29.5 m). Others: corridor <-> control 7.5 s (max 15).
  - The clean-suite leg (via gowning and the clean room) measures 43.1 s vs 34.6 s, 19.6%: legal but with no margin, so the hatch leg is the tagged one (AS7).
- Shared links: none tagged. Corridors are 3.7 clear (>= 2.0).

## 6. Guards per space (20; was 16)

Ramp: S1 15 -> S2 > 15 -> **S3 20** -> S4 must plan > 20 (today 20).

Archetypes per SPEC: officer = pistolSd, grunt = rifle, no enforcers. Escalation: 20 + `perStage` 2 x `alarmMax` 3 = 26 <= `SECTOR.maxAlive` 32. None dormant now.

Awake on screen, worst spot (rulebook floor ~12):
- Walkway: 10 (hall 6, corridor 3, #19 through the control window).
- Corridor glass: 11 (hall 6, #2, #3, #5, #13, #15).

| Space | n | Guards (post / patrol, cycle) |
| --- | --- | --- |
| s3-c2 | 1 | #1 officer, posted (12.8, -17) facing the C2 door |
| s3-hall | 6 | #6, #7 grunts, loop round the chamber 2.5 m off its faces, opposite phase, 42 s. #8 grunt, racks (49.4, -20) <-> log desk, 43 s. #11 officer, stair tour: west stair foot <-> control-room door, 44 s. #16 grunt, crane-bay sweep at (20, -17), 12 s each way. **#17 NEW** grunt, EMC door post (45, -15): "the EMC test is running". |
| s3-dock | 4 | #9 officer, **posted choke** at the desk. #10 grunt, roller door <-> gas cage, 36 s. **#18 NEW** grunt, goods-door watch (22.5, -9.6). **#20 NEW** officer, courier escort: talks with #9, walks to the C3 door and back, 40 s. |
| s3-view | 3 | #2 officer + #3 grunt, talking pair, x 16..46, 40 s. #5 officer, keyholder at the hatch (49.6, -8.3) facing west. |
| s3-east | 1 | #15 officer, supervisor, x 44..58.6, 40 s |
| s3-gown | 1 | #4 grunt, at the pass-through |
| s3-writeup | 1 | #13 officer, desk facing the glass (radio handover = the code lead) |
| s3-sec | 1 | #12 officer, monitors 26 s / kettle 4 s (awake now: the desk is a sync node) |
| s3-control | 1 | **#19 NEW** officer, posted at the consoles |
| s3-plant | 1 | #14 grunt, chillers <-> board, 38 s (moved from the sealed yard) |

Isolation moments:
- #10 behind the gas cage.
- #8 at the racks (the EMC room hides him).
- #12 at the kettle.
- #20 at the C3 door.
- #14 in the chiller bay.

Overlaps:
- #6 / #7 at the chamber corners.
- #9 / #20 / #18 in the dock.
- #2 / #3 / #5 at the hatch end.

Encounter graph counts: hall 6, dock 4, early band 3-6, no WARN.

## 7. Solo path (every sync node in sequence)

1. Landing -> west stair -> hall (dark south strip).
2. Control room: read the code (code source).
3. Plant: isolator (optional; a 45 s window named in the briefing).
4. East stair -> east lobby -> security room: loop the cameras (operator at the kettle or down).
5. East stair landing: kp-store staff door with the code (code sink) -> grab.
6. Hatch -> corridor -> north stair -> dock: lure or take #9 under the looped cam-dock -> C3.

About 194 m, about 149 s of walking, plus waits. No co-op move is needed. Longer, never impossible.

## 8. Held items
- `measured` values (shadow, vantage, LOS, partner reach on the nav grid) wait for greybox (V6).
- The B-team objective (burn-in logs on the control-room consoles) is a hook for Marlow's mission spec, not a SPEC change.
- The isolator's 45 s window and the briefing line belong to Marlow (mission framework).
- S3 dressing (`campusS3Dress.ts`) is redone after greybox. Hero pieces kept: chamber, gas bottles, log desk, clean bench.

## 9. WARN justification (S3 lines)

| WARN | Why it stays |
| --- | --- |
| s3-walkway, s3-chamber, s3-gallery, s3-void: `custom` | The sheet has no catwalk, roof-deck or void class. Sizes: walkway 1.5 deck, gallery 1.5, chamber roof 6 x 8, void 1.5 clear crouch (sheet duct size). |
| s3-hall above lab max (19 x 42) and ceiling 9.0 | It is a test hall, not a lab room. No hall class exists; SPEC sets 9.0 clear for the crane. |
| s3-nstair, s3-estair ceiling 4.5 vs 3.3 | Floor-to-floor is 4.5 (S3 storeys). The class row assumes 3.3. Same as every campus stair. |
| s3-dock -> s4-dock width 3.7 off grid | The C3 stub as built. The spine link is kept unchanged (rulebook). |

## 10. Assumptions (logged, undoable)
- **AS1** Dock re-classed `loading_dock` -> `storage` (goods-in room; the truck apron is outside C3). S3.md / REPORT allowed it.
  - Undo: `loading_dock` needs 21 x 28, which would eat the hall.
- **AS2** A70's 1.7 corridor spandrel goes back to 1.1, so the walkway sees the corridor pair. Rulebook floor is ~12 awake on screen; SPEC's older cap is 6.
  - Undo: `S3_VIEW_SPANDREL_TOP` 6.2. The vantage then sees 6 of 11 movers without the pair.
- **AS3** SPEC A60 reversed: S3 gets a choke (#9 posted at C3).
  - Undo: #9 back to a desk role.
- **AS4** 20 guards (+#17, #18, #19, #20), per the lead's ramp. #12 and #14 are no longer dormant.
  - Undo: drop the four new ones (16).
- **AS5** L1 rooms and corridors get a 3.0 suspended ceiling (7.5). The 1.5 m plenum above is the void.
  - Undo: no ceilings. Ceiling WARNs return and the void goes.
- **AS6** Sync nodes sit in a top-level `sync` array with `track`, as S1 did (the lead's message).
- **AS7** The tagged split leg a is the hatch line (15.9%), not the clean suite (19.6%).
  - Undo: move the `split:s3-obj:a` tags to view / gown / clean / store and the assist to the gowning-door link.
- **AS8** The isolator window is 45 s (engine default `ISOLATOR_WINDOW` 20).
- **AS9** Footprint not extended. The yard is sealed by two 6 m walls instead of being used (6 m wide is under the yard class).
  - Undo: delete the walls; `s3-yard` returns unreachable.
- **AS10** CR3b lip is 4.4 via a 0.1 loading pad (the slab top 4.5 is the band's edge).
- **AS11** The staff door is a push-bar exit from inside and kp-store from the stair, written as a two-way `fire_stair` link.
- **AS12** Link lengths are measured middle to middle on the plan. Middles are walkable picks:
  - hall (31, -25.5), south aisle (the box centre is inside the chamber);
  - stairs at their ground landings;
  - box centres elsewhere.
  - Stair walk inside a core: 11 m.
- **AS13** Guard keys `"1".."4"` hold the same count (campus guards do not scale by player count).

## 11. Greybox build cost (after sign-off; Sonnet builds from Opus briefs, one checker)

| Slice | Work | h |
| --- | --- | --- |
| S3-R1 | Shell and G re-lay: hall to x 10, north wall z -11, dock, control room, plant, switch room / riser, yard walls, roller door, trench | 5 |
| S3-R2 | L1 re-lay: landing, corridor + east lobby, 7 rooms, security room, gallery move, walkway widen + access, hoist hatch, void, ceilings | 5 |
| S3-R3 | Three fire stairs at 1.4 (`S3_FLIGHTS`, nav ramp checks), door anchors and swings | 2 |
| S3-R4 | Lights (5 high bays / 3 circuits, rooms), switches, isolator board, E6 desk, kp-store / kp-sec, lasers + panels moved, cameras re-aimed | 3 |
| S3-R5 | `campusSectors.ts`: 20 guards, choke post block, `S3_ROUTES` / `S3_EXIT` / `S3_ENTRY`, hide spots, nav seeds, reinforce points | 3 |
| S3-R6 | Co-op lips (CR3 retest, CR3b new, `CAMPUS_COOP_LIPS`), panel near-side tests, nav reach test (three stairs, hatch drop) | 3 |
| S3-R7 | Dressing re-run (`campusS3Dress.ts`) + checker fix round | 2 |
| **Total** | | **~23 h, 7 slices** |

Option 2 (patch in the as-built layout) estimate: ~11 h, 4 slices.
- Widen the corridor to 3.0 by taking 1 m from the rooms.
- Door from the landing to L1, second stair at the landing's north end, second hall-to-dock door.
- Re-class the dock and seal the yard.
- Keeps the 12 x 30 lobby and landing, the 8 m north band (clean room re-classed) and two sealed rooms.
