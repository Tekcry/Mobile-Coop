# S5 sign-off - detail (the Old House and the extraction)

Backing for `S5.md`. Plan graph: `docs/sector-redesign/graph/plan/campusOps-S5.json`. Plans: `S5-plan-0.svg`,
`S5-plan-4.2.svg`, `S5-plan-8.4.svg` (1 m = 10 px; px = (x + 76) x 10; ground plan py = (70 - z) x 10, frame z 10..70
with the jetty and the extraction, its overlay drawn at (52 - z) x 10 under `translate(0,180)`; L1 and roof py = (52 - z) x 10). Sources read:
`src/world/maps/campusS5.ts`, `campusS5Data.ts`, `campusSectors.ts`, SPEC S5 (437-498, K4 499, CR 516),
`docs/level-validator/campus-run/S5.md` (findings F1-F10). Coordinates x / z in metres, y = storey (G 0, L1 4.2,
roof 8.4). Every shadow / vantage / LOS value is a declared target, measured in greybox (V6).

Lead updates applied (2026-10-24): Marlow picked S4 for Code Relay, so S5's code_source / code_sink pair is a
reserved spare ("reserved, not used by Code Relay"): the strongroom day gate stands open, no route depends on it.
Sync nodes are the top-level `syncs` array (id / kind / space / src / lead / track), as every campus graph.

## 1. Change list

### Ground (y 0)
| # | Change | Where (x, z, size) | Why |
| --- | --- | --- | --- |
| G1 | Hall takes the back corridor's south 14 m: the x -38 partition becomes a 2.2 m noLedge timber screen z 21..29, open 3 m at each end; the strip x -38..-32 is the dark **screens passage** (two 1.2 settles at z 22.5..24, 26.5..28 on the east wall) | hall x -50..-32, z 18..32 = 14 x 18 | ERR hall 12 x 14 < lobby 14 x 17; F5 20 m run with no cover; shadow route through the hall |
| G2 | Old west passage becomes the hall's alcove (wall z 32, x -50..-46 removed); drawing-room door (-50, 33) swings into the drawing room | alcove x -50..-46, z 32..34 | ERR pass 2 x 4 < corridor 3 x 3; F2 leaf in the 1.8 m passage; F3 door-after-door 2.2 m |
| G3 | **Back hall** replaces the vestibule and the corridor's north end: walls x -37 (side door (-37, 34)) and x -33 (kitchen door (-33, 36.5)), 3.5 m opening south to the screens passage (x -36.75..-33.25), stair door (-35, 38.1) kept; the hall lamp switch (circuit 88) here | x -37..-33, z 32..38 = 4 x 6 | ERR vest 2 x 3; F1; F2 side-door leaf; F3 doors 2.0 apart |
| G4 | **Anteroom** grows: x -46..-37, z 32..38.5 (clear 8.8 x 6.3); north wall at z 38.5 with the strongroom day gate (-43, 38.5) and the shaft door (-39.5, 38.5); west wall onto the well a 3.0 glazed screen (z 34.5..37.5, sill 0.5, the 1.6 sash kept); audit table 2 x 1 x 0.9 at x -43.5..-41.5, z 34..35; alarm-ante to (-37.15, 36.5) | as left | ERR ante 4.7 x 5.7 < meeting_room 5.5 x 8.5 and < 6 m camera floor; no high approach; vantage 0.4 |
| G5 | Strongroom x -46..-40.5, z 38.5..44 (5.5 x 5.5); day gate = steel grille, **open** tonight (its keypad is the reserved spare); warm lamp (-43, 3.4, 41.5); token box unchanged | as left | goal visible first (grille + well screen); room for G4 |
| G6 | Shaft moves to x -40.5..-38.5, z 38.5..40.5; ladder on its north wall (-39.5, 40.35); door leaf swings out into the anteroom; beams las-shaft x -40.1..-38.9 at z 38.35; closet x -40.5..-37, z 40.5..44 and x -38.5..-37, z 38.5..40.5 solid | as left | room for G4; F2 shaft-door leaf over the ladder foot |
| G7 | Kitchen west wall moves 1 m into the main block (x -33); the main block's G east wall x -32, z 32..44 goes; garden board to (-32.85, 0, 40); smoke hatch 1.2 x 1.2 at (-28, 42), kerb 4.4 over the floor | kitchen x -33..-26, z 32..44 = 7 x 12 | ERR kitchen 6 < break_room 7; kitchen approaches (shadow, high) |
| G8 | Plant / lobby wall z 26 -> z 26.5; lobby doors moved: plant (-30.5, 26.5), kitchen (-27.5, 32); flue-access ladder + hatch to the low roof at (-27, 19.5) | plant 6 x 8.5; lobby 5.5 x 6 | ERR plant 8 < 8.5; plant dead end; F3 facing lobby doors (N / S) |
| G9 | Hall stair 2.0 -> 2.4, two flights of 13 risers (0.165 / 0.285) + 2.0 landing: x -46.2..-43.8, z 20.2..29.0 (foot 2.2 m inside the front door) | as left | WARN open stair 2.0 < 2.4; F4 24 risers, no landing |
| G10 | Control room: new garden door (-56, 22) | ctl west wall | ERR ctl dead end; garden loud approach; the response team deploys into the grounds |
| G11 | Light well: cleaning ladder on its west wall (-49.85, 36), 0 -> 8.4, through a gate in the roof rim | well x -50..-46, z 34..38 | the solo's own (longer) way to CR7's spot |
| G12 | Garden: the 0.5 beds become 1.2 box hedges (x -68..-58, z 26..28 and 34..36); west uplights (-67, 25), (-67, 37.2) removed | garden | F5 no cover; shadow 0.15 -> 0.5 |
| G13 | Terrace merged into the lawn (one yard s5-lawn x -70..-26, z 44..70); balustrade z 50 1.0 -> 1.2 (low cover, vaultable); jetty deck top 0.4 -> 0.3 | lawn 26 x 44 | ERR terrace 6 x 44 < yard 14 x 14; lawn 2 approaches; F5; F8 step band edge |
| G14 | Lamps: hall chandelier r 12 -> r 7, hall west wall lamps off; ante r 6 ceiling lamp -> r 3 warm desk lamp; kitchen two r 6 -> one r 3.5 over the table; lawn adds the jetty lantern r 6 (-45, 62, warm), van work light r 6 (-29, 52), lane lamp r 6 (-36, 56) | as left | shadow targets 0.4-0.6 |
| G15 | cam-hall moves from the hall east wall (-38.2, 25) to the south wall (-39, 3.2, 18.2), facing the front door and the stair foot; the screens passage is behind it | hall | the old wall is now the screen |
| G16 | #22 moves to (-28.8, 30.8) facing E | lobby | F2 C4 leaf 0.68 m from him |

### L1 (y 4.2) and the low roof
| # | Change | Where | Why |
| --- | --- | --- | --- |
| L1 | Landing strip x -38..-36.5, z 38..44 closed (solid); kp-arch moves to (-38, 35.5) on the landing's open west wall | landing x -38..-32, z 32..38 | F1 1.4 m strip; F2 leaf 0.3 m from the core |
| L2 | Cage moves to x -41.5..-38, z 38..41 over the new shaft; pair gate pg-arch in its west face (z 39..40.2), switches (-39, 37.8) and (-45.6, 43.6) about 9 m apart; panel-shaft (-41.65, 5.6, 39.0) | archive | follows G6 |
| L3 | Archive stacks: one free-standing 2.2 row x -45.9..-43, z 40.4..41.2, wall shelving z 43.2..43.9 (aisles 1.9 and 2.0); 1.2 plan chest x -44.5..-43, z 34.5..35.5; warm r 4 reading lamp at the records desk (-42.2, 39.5) | archive x -46..-38, z 32..44 | F1 aisles 1.55; shadow 1.0 -> 0.5 |
| L4 | **Hoist door (-46, 36) becomes an E3 pair bolt** (`SectorBolt` `pair: true`, side = archive): one player pushes the swollen leaf home while the other draws the bolt; never one player alone | archive west wall | **CR7 works solo (blocker 1, G280)** |
| L5 | Archive rooflight 1.2 x 3 (x -45.85..-44.65, z 32.4..35.4); its south 1.2 m opens as a hatch over a fixed ladder on the west wall at z 33 | archive / roof | arch high approach; roof approaches; archive vantage |
| L6 | Boardroom <-> CEO suite connecting door (-53, 30) | L1 west | ERR board and ceo dead ends; L1 loop |
| L7 | House lighting board (E4, circuits 83 ante + 88 hall wall lamps, window 45 s) on the landing's east wall (-32.15, 35) | landing | sync power_cut |
| L8 | Gallery lamps r 5 -> r 3 cones on the walkway | gallery | they lit the hall floor |
| L9 | Low roof: north 1.1 rail -> 0.2 gutter kerb (lip 4.4 from the lawn, CR8); plant hatch (-27, 19.5); kitchen smoke hatch (-28, 42) | x -32..-26, z 18..44 | ERR lowroof dead end; co-op coverage |

### Roof (y 8.4)
| # | Change | Where | Why |
| --- | --- | --- | --- |
| R1 | East parapet x -32 cut from 1.1 to a 0.2 coping for z 30..33 (8.6 = 4.4 over the low roof: CR9) | roof east edge | roof approaches; co-op coverage |
| R2 | West rappel point (-56.15, 8.4, 31) into the garden | west parapet | garden high approach without an 8.4 drop (SPEC's garden hang-drop) |
| R3 | Well rim ladder gate at (-50, 36) | well rim | G11 |
| R4 | Bulkhead: wired-glass lights 0.6 x 0.9 in its west and north faces; roof lamps: two north walk lamps r 6 (-50, 42), (-40, 42), bulkhead lamp r 6 (-35, 37.5) | core-r / roof | roof vantage; shadow 0.95 -> 0.55 |

Data: `S5_ROUTES` (campusS5Data.ts:100) rewritten so the high route has L1 points (F7): lobby -> screens passage -> back
hall -> service stair -> landing (-35, 35.5, 4.2) -> archive (-42, 36, 4.2) -> rooflight ladder -> roof -> north
rappel -> lawn; the stealth route enters by the screens passage and the side door; loud by the hall front to the
anteroom's hall door.

## 2. The CR7 fix (the validator's worst find)
- **Two players only:** the hoist door (L4) is an E3 pair bolt. `SectorBolt.pair` (sectors.ts:243) "One player alone can
  never draw it, from either side." Shut, the sill is a closed door: no solo step-off, no solo rope. Opened by two, each
  rappels 4.2 m off the hoist beam into the well (`RAPPEL`, src/config/movement.ts:370); the engine's two-person rope
  climbs only, so the rope is the way back up: the holder at the open door lets it down and the climber climbs 4.2 m
  (`ropeRoom(4.2, 0)` = ok, TEAM.ropeMin 2.2 / ropeMax 6.0; Marlow mission-validator 0c62a921 flagged a rope written as
  a descent). It is a co-op
  route, NOT a sync node: no solo timer fallback (G280: "true 2-player pathways that cannot be used solo").
- **Solo has its own longer route:** archive -> rooflight ladder -> roof (behind #19's back, behind chimney (-53, 36))
  -> rim gate -> cleaning ladder 8.4 m -> the well: 11.5 + 17.5 = **29 s** against the rope's **6 s**, on the high /
  shadow route kinds and 30.5 m against 4.5 m, so the validator's solo-twin check no longer fires.
- Graph: the `s5-arch -> s5-well` drop is gone; `s5-arch -> s5-well` is a one-way `rappel` behind the pair-bolt door and
  `s5-well -> s5-arch` a one-way `team_rope` climb; `s5-well <-> s5-roof` ladder added.
- Alternative (was S5.md option 2 before the fix round; now held item 6): no cleaning ladder and a 1.9 rim, the SPEC's
  "solo cannot"; solo then meets K4 only through the side door and the hall.

## 3. Routes per guarded space (encounter spaces; route kinds as in the graph)
| Space | Dark / shadow | High / vent | Social / tool (loud) | Secret | Loop | LOS break |
| --- | --- | --- | --- | --- | --- | --- |
| s5-hall | lobby door into the screens passage; back-hall opening | gallery rail drop | front of the screen, stair, control-room door, ante hall door | drawing-room door (alcove) | screen's two ends + the back hall | 2.5 s |
| s5-ante | side door from the back hall | well window (from the rope or the roof ladder) | armoured hall door | shaft door (CR6 / the beams) | side door - back hall - screens passage - hall door | 2 s |
| s5-arch | kp-arch from the landing | rooflight ladder | gallery door (cam-gallery) | CR6 cage, CR7 rope | kp-arch - landing - core - roof - hatch | 1.5 s |
| s5-kitchen | back-hall door | low roof smoke hatch drop | lobby door, back door | CR10 boost | lobby - kitchen - back hall - screens passage - lobby | 2 s |
| s5-garden | gate from the lawn | west rappel | control-room door | drawing-room door | gate - lawn - kitchen... or draw - hall - ctl | 2.5 s |
| s5-roof | well ladder | rooflight ladder, CR9 from the low roof | bulkhead door | - | bulkhead - roof - hatch - archive - landing - core | 3 s |
| s5-lawn | garden gate, boathouse path | north rappel, low roof drop, CR8 | kitchen back door | - | gate west / kitchen east, both to the jetty | 3 s |

Secret in 5 of 7 guarded spaces (aim half). Routes cross at the hall, the back hall and the lawn.

## 4. Choke, vantage, goal visible first, landmark, light language
- **Choke:** K4, the anteroom: the token's only door is the day gate (-43, 38.5) inside the anteroom, guarded by the
  keyholder pair (#9, #10) and #28 (SPEC "unavoidable posted guards").
- **Vantages (all dark, out of every cycle):** hall from the back hall through the 3.5 m opening and the screen's north
  end (0.7); anteroom from the well through the 3 m glazed screen (0.75); kitchen through the back-hall door's wired
  glass (0.8); archive from the roof through the rooflight (0.7); garden from the roof's south-west corner behind
  chimney (-53, 22) (0.8); roof from inside the bulkhead through its two lights (0.7); lawn from the low roof's dark
  north kerb (-30, 43.5) (0.7; the boathouse and trees hide the west end). Half-the-patrols rule: the roof sees the
  garden team, the terrace team and #20 (5 of 8 outside guards, all 3 outside patrols); the back hall sees the hall's three.
- **Goal visible first:** the token's warm lamp through the open day-gate grille from the anteroom door, and through the
  well's glazed screen from the well.
- **Landmark:** the hall chandelier (r 7 pool), seen from the lobby door down the screens passage, from the gallery and
  through the alcove; outside, the jetty lantern marks the exit (warm = objective / exit).
- **Light language:** white cone = patrolled (chandelier pool on the door officer and stair foot, the bollards on the lake
  team, the marksman's light, the van light); warm lamp = social / objective (audit desk lamp, strongroom lamp,
  the archive reading lamp, the kitchen table lamp, the jetty lantern); dark = route (screens passage, back hall, drawing
  room, well, archive aisles, garden's west half, the boathouse path, the roof behind the chimneys, the low roof).

## 5. Sync nodes (top-level `syncs` array in the graph)
| id | kind | space | src | lead | track | status |
| --- | --- | --- | --- | --- | --- | --- |
| sync-s5-rota | code_source | s5-kitchen | built: rota board intel, campusS5Data.ts:182 | s5-kitchen | B | active: B relays 1960 to A |
| sync-s5-kparch | code_sink | s5-landing | built: kp-arch keypad, campusS5Data.ts:181 (moved to (-38, 35.5, 4.2)) | s5-landing | A | active (no-code way: the gallery door) |
| sync-s5-houseboard | power_cut | s5-landing | planned E4 board (S5_BOARDS pattern, campusS5.ts:221), circuits 83 + 88, 45 s | s5-landing | A | active: A darkens B's anteroom and hall |
| sync-s5-gardenboard | power_cut | s5-kitchen | built: S5_BOARDS campusS5.ts:221, circuit 84, 20 -> 30 s | s5-kitchen | B | active: B darkens A's rappel landing and the lawn |
| sync-s5-fob | code_source | s5-arch | planned: #29 Ms Penhale, the time-lock fob; not posted in this plan (cap, AS9): a mission that arms the spare posts her in place of #18 | s5-gal | A | **reserved, not used by Code Relay** |
| sync-s5-strongkey | code_sink | s5-ante | E1 keypad on the day gate (-43, 38.5), 30 s rolling code planned | s5-ante | B | **reserved, not used by Code Relay**; gate open by default |

Solo in sequence: rota (kitchen) -> kp-arch; house board then 15-20 s down the core to the anteroom (window 45 s);
garden board on the way out by the kitchen back door (30 s). The reserved pair, if a later mission arms it: anteroom
first, then the code from Penhale, then archive -> kp-arch -> landing -> core -> back hall -> side door -> keypad =
21 m + 7 s stair = 14 s running / 23 s at stealth pace, inside 30 s.

## 6. Guards (26: 24 kept, 2 new; above S4's 25, the response team included)
The live-guard cap binds: `SECTOR.maxAlive` 32 (`src/game/sectors.ts:508`) = the co-op snapshot's `MAX_ENEMIES` 32
(`src/net/protocol.ts:25`), and `tests/campusS5.test.ts:200` asserts guards + alarmMax 3 x perStage 2 <= 32. So S5 posts
at most 26 (26 + 6 = 32). The fix round cut the first plan's 36 to 26: of its 12 new posts it keeps the two that guard
the section's two must-pass points, #28 the audit officer (the K4 choke) and #34 the jetty sentry (the extraction), and
drops the other 10 (#25-#27, #29-#33, #35, #36: reliefs, a smoker, a spotter, a second roof walk, a lane patrol and a tea
break, none of them on a choke). Routes are unchanged: every guarded space keeps its three route kinds (section 3).

| Space | Count | Guards (post / patrol, archetype) | Isolation moment |
| --- | --- | --- | --- |
| s5-hall | 3 | #12 door officer (-41.5, 19.6) officer; #4 hall walk (-53, 28.4) <-> (-41.5, 23.5) grunt (response); #24 clocking round (-35, 37) <-> (-35, 19.6) officer, down the screens passage | #24 at the passage's south end (-35, 19.6), dark, 3 s stop |
| s5-ante | 4 | #9 / #10 keyholders (-44.5, 37.0) / (-41.5, 37.0) officers facing S, body armour; #11 escort (-45, 33) -> (-39.5, 37.4) -> (-38, 33.5) officer; **+28** audit officer at the table (-42.5, 34.5) facing N | #11 alone at the shaft door, 4 s |
| s5-arch | 1 | #18 round (-39.5, 33) -> (-45.2, 33) -> (-45.2, 42.2) -> (-42.6, 42.2) grunt | #18 at the round's north-west corner (-45.2, 42.2), in the dark west aisle, 3 s |
| s5-kitchen | 1 | #21 service round (-29, 42.5) <-> (-29, 23.5) grunt | #21 in the plant room (-29, 23.5), 3 s |
| s5-garden | 2 | #5 handler + #6 dog loop (-63, 23.5) <-> (-63, 40.5) (shared 44 s clock) | the pair at the loop's north end (-63, 40.5), backs to the drawing-room door, 3 s |
| s5-roof | 1 | #19 marksman (-40, 43) <-> (-39, 43) rifle, facing N over the lawn | always: his back is to the roof |
| s5-lawn | 5 | #7 handler + #8 dog terrace loop (-36, 47) <-> (-53, 47); #20 terrace gate (-44, 50.7) -> jetty route; #23 van driver (-31.4, 53.5); **+34** jetty sentry at the deck foot (-43.5, 58.5) facing S | #23 alone by the van light, back to the estate wall |
| s5-ctl (utility) | 3 | #1-3 response team, dormant until stage 1 (grunts, body armour) | - |
| s5-gal (connector) | 2 | #13 / #14 opposite-phase arms | screens at each arm's south end |
| s5-ceo / s5-board | 2 + 1 | #16 officer + #17 grunt at the suite door; #15 dormant | - |
| s5-lobby (hub) | 1 | #22 arrivals officer (-28.8, 30.8) | - |

Gear as built (officer pistolSd, grunt rifle; helmets; armour on the response team and the keyholders). Escalation
unchanged: stage 1 the response team deploys (now also through the garden door), dogs released; stages 2-3 +2 each
(the 6 reinforcements that fill the cap to 32). Screen cap (CAMPUS_SCREEN_CAP 12): worst view is the roof's north-west
corner: roof 1 + lawn 5 + garden 2 = **8**; hall view 3 + gallery 2 = 5; under the cap everywhere. Guard band WARNs
(late band 6-10): all seven guarded spaces (hall 3, ante 4, arch 1, kitchen 1, garden 2, roof 1, lawn 5): the cap binds
first.

**Option 2 on S5.md (raise the cap, 36 guards) costs:**
- Wire: `MAX_ENEMIES` 32 -> 48 (`src/net/protocol.ts:25`, the snapshot's enemies and bodies slices at :973 / :1004, the
  host's cap at `src/net/coopHost.ts:1591` / :1603); `PROTOCOL_VERSION` bumped once by the train build.
- Engine: `SECTOR.maxAlive` 32 -> 42 (`src/game/sectors.ts:508`); the guard keys are u32 masks, `MAX_KEYS` 32
  (`src/ai/awareness.ts:51`, masks at :87 / :151-271 / :394-436, `src/ai/enemyManager.ts:94`; reinforcements take keys
  24-31): 42 keys need two-word or 64-bit masks.
- Tests: `tests/campusS5.test.ts:194-200` (24 guards, the cap assert) and the cap / key tests in `coopGuardAi`,
  `enemyManagerDespawn`, `fourIntruders`, `guardLook`, `net`.
- Perf: a guard costs ~0.28-0.34 ms of frame CPU at Epic (`src/game/sectorGuardFreeze.ts:4`: S5 worst 15.6 ms at 24
  guards). +12 guards = +3.4-4.1 ms, ~19-20 ms at S5's worst view, over the 16.7 ms frame unless the freeze culls them:
  a laptop GPU perf pass is needed.
- Hours: wire + keys + tests ~5 h (Opus, `src/net`), perf pass ~2 h (laptop GPU slot), +1 h guard slice for the 10
  posts: **~+8 h**. Screen cap at 36: the roof's north-west view reaches 12 (roof 3 + lawn 6 + garden 3), at the cap.

## 7. Co-op moves, split, solo
- **Co-op moves:** CR6 pair gate (arch <-> cage); CR7 pair-bolted hoist (rappel arch -> well, team rope well -> arch); NEW CR8 boost lawn ->
  low roof (gutter kerb 4.4); NEW CR9 boost low roof -> roof (coping 4.4); NEW CR10 boost kitchen -> low roof (smoke
  hatch kerb 4.4); K4 dual takedown (sync_pair). Co-op touches 4 of 7 S5 encounter spaces (arch, kitchen, lawn, roof).
  Each lip has no solo stand-on within reach (counter 9 m away; low roof kerb 0.2; 1.9 parapets 6 m away).
  CR8 + CR9 give team A a co-op way in from outside: kitchen back door -> CR8 -> CR9 -> rooflight -> archive.
- **Split s5-k4 (graph-tagged, the K4 dual takedown):** fork s5-lobby, rejoin s5-ante. Leg a (kitchen, back hall, side
  door) **17.7 s**; leg b (hall, armoured hall door) **18.5 s**; parity **4%**; both under 90 s. Overwatch: s5-back
  (sees down the screens passage and across the hall to the hall door). Assist: leg a switches the hall wall lamps off
  in the back hall (circuit 88), darkening leg b's crossing. Partner reach worst 7.5 s (kitchen -> hall), under 15 s.
- **2+2 tracks:** A (high): back hall -> service stair -> landing (house board on B's call) -> kp-arch (1960 relayed by B)
  -> archive -> rooflight -> roof -> north rappel (B's garden board darkens the landing) -> lawn. B (ground): kitchen
  (rota board, garden board) -> back hall -> anteroom (K4, A's dark) -> token -> exit west or east. They meet at the jetty
  extraction (all present players in the box x -50..-40, z 60..66). A can also join B through CR6 / CR7.
- **Two-route exfil:** WEST strongroom -> anteroom -> hall door -> alcove -> drawing room -> garden door -> garden ->
  gate (-63, 44) -> boathouse path under the trees -> jetty (~93 m, ~72 s at 1.3 m/s); EAST anteroom -> side door ->
  back hall -> kitchen -> back door (-29, 44) -> along the estate wall behind the van -> jetty (~61 m, ~47 s). High exit
  for A: north rappel (16 s) or the low roof's gutter drop.
- **Solo path (longer, never impossible):** lobby (slip behind #22) -> screens passage (dark, settles) -> back hall ->
  kitchen rota (1960) -> service stair -> landing: pull the house board -> down to the side door inside 45 s -> K4 by
  lure + two takedowns in the dark; or the solo's own well route (archive -> rooflight -> roof -> cleaning ladder ->
  window behind #9) -> token -> exit west (garden board pulled on the way, or exit east through the kitchen).

## 8. Validator counts (S5 lines only)
| | ERR | WARN |
| --- | --- | --- |
| As built (`campus-run/run.txt`; same as the plan copy before editing) | 41 | 44 (+2 C4 spine WARNs that belong to S4) |
| Plan (all five plan graphs together, fix round 2026-10-25, 26 guards) | **0** | 31 |

The 31 WARNs, justified: 12 ceilings 4.0 / 2.4 against 3.0 / 3.3 (the shell's 4.2 storeys stay); 6 core sizes 2.6 /
5.6 off the grid (S2's core copy); 5 custom classes (landing, cage, shaft, well, low roof: no sheet-7 class); 1 control
room 12 > 11 (three rack rows, as built); 7 guard bands (section 6: the 32 live cap binds first). Map-wide co-op coverage and the secret-route WARN
now pass with all five files. Run: `node scripts/level-validate.mjs docs/sector-redesign/graph/plan/campusOps-S{1..5}.json`.

## 9. Held items
- Core near landing 1.2 (sheet 1.3) and the first riser 1.3 m from the door: S2's core copy; fix with S2's core.
- Lobby east / west doors face each other (C4 far door fixed by the contract; the lobby is 5.5 deep); #22 stands between.
- SPEC garden buttress wall-jump (2.8): not added (the west rappel gives the garden its high way).
- The reserved Code Relay pair (fob, day-gate keypad, 30 s window): data hooks only, no build in this plan.
- CEO safe / laptop: reserved optional objective for Marlow.
- (6) The light well co-op only (the first plan's option 2): no cleaning ladder, the roof's well rim raised to 1.9 m; solo
  reaches the keyholders by the side door and the hall only. Moved off the page in the fix round so the page's one
  decision is the guard cap. Undo: put it back as option 2.

## 10. Assumptions (each undoable)
- AS1 The hoist pair bolt reuses E3 `SectorBolt { pair: true }` (needs `bolts` in S5_SECTOR; the SPEC said "bolts
  none"). Undo: back to a plain door plus a 1.9 rail (S5.md option 2 direction).
- AS2 Terrace + lawn + jetty are one space (1.2 balustrade vaultable anywhere, as the as-built lawn + jetty merge). Undo:
  split back, deepen the terrace to 14 m by moving the balustrade to z 58.
- AS3 Guard key "1" = the count at every player count (campus guards do not scale; no minPlayers tags). Undo: rekey.
- AS4 The kitchen's west wall moves 1 m into the main block at G only (L1 / roof walls stay on x -32). Undo: kitchen
  back to 6 m and retype it utility (then the loud route must not use it).
- AS5 The hall's screen is 2.2 m high, so the hall is one 14 x 18 space; a full-height screen would make the passage a
  separate corridor. Undo: full-height wall, hall class needs another fix.
- AS6 Anteroom size declared [6, 8.5] under its clear 6.3 x 8.8 (on the grid).
- AS7 Targets (shadow, vantage, LOS) are estimates from lamp radii and sight wedges on the plan, pending V6.
- AS8 (fix round) S5 posts 26: the 32 live cap less the 6 alarm reinforcements (alarmMax 3 x perStage 2). Undo: S5.md
  option 2 (raise the cap), or perStage 1 for S5 (29 posts, a weaker response).
- AS9 (fix round) The kept new posts are #28 (K4 choke) and #34 (extraction); Penhale (#29, the reserved fob) is not
  posted, so the spare needs her swapped in for #18 if a mission arms it. Undo: post #29 instead of #28.
- AS10 (fix round) The light-well co-op-only alternative leaves the page (held item 6) for the cap question.
  Undo: restore it as option 2.

## 11. Greybox build cost (after sign-off)
| Slice | Content | Hours |
| --- | --- | --- |
| S5-P1 shell re-cut | G1-G13, L1-L3, L5-L6, L9, R1-R3 boxes, doors, ladders, slabs, nav seeds | 4 |
| S5-P2 devices and light | L4 pair bolt, L7 board, garden board, beams / panel / pair gate moves, cam-hall, G14 / L8 / R4 lamps, S5_ROUTES rewrite | 3 |
| S5-P3 guards | 2 new, 8 moved, routes / cycles 25-45 s, takedown spots, the cap assert (26 + 6 <= 32) | 2 |
| S5-P4 tests | campusS5.test.ts: CR7 solo-cannot (bolt shut, no sill), rope room ok, lips 4.4 with no solo stand-on, nav flood, routes walk, door swings | 3 |
| S5-P5 V6 | measure shadow / vantage / LOS / reach, write `measured` | 2 |
| **Total** | | **~14 h** |
