# Task: Tallow Wharf - a canal-side merchants' quarter at night, two co-op missions on one small map

Map spec (mission-framework slice CMS, 2026-10-24), filled from `graph.json` (slice CMG) on the section list of
`docs/templates/map-spec.md`. "greybox: pending" marks what only the greybox (PLAN slices GB0-GB5, GBM) can answer.
Plan: [`PLAN.svg`](PLAN.svg) (`scripts/graph-svg.mjs`, 1 m = 10 px, north up, scale bar). Sign-off: [`SIGNOFF.md`](SIGNOFF.md).

## Context (fill)
Night Shift (repo Tekcry/Mobile-Coop). Base branch: `master`. Job overrides (PLAN.md A13, 5): this spec lives on
`feature/mission-framework` (PR A); the greybox is built on `feature/mission-engine` (PR C) in
`C:/NightShift/Mobile-Coop-mission-engine`, not on a `feature/tallowWharf-map` branch. The lead commits; the
orchestrator merges.

Goal: a new unlisted campaign map, `tallowWharf` ("Tallow Wharf"): a small canal-side merchants' quarter at night,
about 120 x 80 m, canal along the south edge. Four sections: W1 night market, W2 arcade lofts, W3 the Gaunt & Lisle
counting house, W4 wharf sheds and the boat. Two 2-player missions share it (M4): Three Grey Coats (TGC) and Two-Key
Ledger (TKL). Every section forces a co-op traversal move with no solo bypass (M3). It follows `docs/level-design.md`
in full, except the solo rules that do not bind campaign maps (LD "Open items" 1, Michael 2026-10-22: "Co-op only";
BRIEF A2).

## Scope: existing systems only (fixed)
As the template, with the job's overrides (PLAN 5):
- Files (GB0-GB5): `src/world/maps/tallowWharf.ts` (MapDef, unlisted, `?autostart=tallowWharf&mode=sector&mission=<id>`),
  `src/world/maps/tallowWharfW<n>.ts` (one per section), `src/world/maps/tallowWharfSectors.ts`,
  `src/world/maps/tallowWharfMissions.ts`, the registration in `src/world/maps/index.ts`, tests under `tests/tallowWharf/`.
  No `src/config/missions.json` entry: missions are `MapDef.missions` on the Sector Ops runtime (A6, A7).
- New systems come from their own slices, not the greybox: the pull-up (KIT-PULL), the shutter (KIT-SHUT), the mission
  engine (EN1-EN3, NET). The greybox reserves their places and uses placeholders until they land.
- Enemies and tuning tables never change. If a move does not fit the tuning, change the building (see Engine questions).

## Originality (fixed)
As the template. Every name, layout and set piece here is original; no reference-game names (G6).

## Rules for working (fixed)
As the template, read with `docs/systems/session-method.md` (G87: implementer, fresh checker, one fix round) and the
agent preamble. Hyphens, never em dashes.

## Building brief (fill)
- **Building type and era:** a 19th-century canal quarter still trading today: a covered night market with a fish
  hall, a glazed shopping arcade with let lofts above, an old counting house (Gaunt & Lisle, private bankers and
  bookkeepers, two wings round a strongroom), and bonded wharf sheds with a quay crane.
- **Original purpose and how it worked:** barges unloaded at the canal steps into the market; porters barrowed goods
  along the fish hall's back passage to the arcade; the counting house kept the wharf's books and coal-fired its
  boilers from a coal yard with a hoist beam; tea came in by water to the bonded sheds under a customs locker.
- **Tonight:** the night market trades (wardens, porters, the lamp trimmer); the arcade has its beadle and Pell's men;
  the counting house has night clerks, porters, a yard watchman and a dog; the wharf lands a tea barge on the night tide
  (shed three works through the night; shed two is empty). Story fit: `docs/story.md` (Pell, Halcyon, the radio cast).
- **Site:** world metres, x east, z north, bounds 0-120 x 0-80. Canal z 0-6 along the south. Section boxes
  (`meta.section_info`): W1 x 0-40, z 6-62; W2 x 40-76, z 48-80; W3 x 82-120, z 34-80 (the arcade lane between W2 and
  W3, pinched to 2.5 m at the throw point); W4 x 44-120, z 0-34. Spine: W1 -> W2 -> W3 -> W4.
- **Construction:** load-bearing brick, timber floors, lead flat roofs with 1.1 m parapets (LD 16.5.3). Storey heights:
  ground 0; lofts and the market gallery 4.5; arcade and counting house roofs 8.4; crane gantry 10; west wing light-well
  gallery 4.2; canal ledge -4.4; boat deck -1. At most 3 walkable surfaces per column (arcade 0 / 4.5 / 8.4; west wing
  0 / 4.2 / 8.4). Structural grid: greybox: pending.
- **Rooms:** 37 spaces, 72 links (`graph.json`). By section:

| Section | Space (id) | Storey | Size (m) | Original purpose / tonight | Tension |
| --- | --- | --- | --- | --- | --- |
| W1 | canal-steps (start, checkpoint) | 0 | 8 x 10 | barge landing steps; crew comes ashore | 1 |
| W1 | tea-stall | 0 | 8 x 8.5 | porters' tea stall (TGC overheard lead) | 2 |
| W1 | market (encounter) | 0 | 30 x 30 | night market square, fish hall clock on its north side | 3 |
| W1 | gallery | 4.5 | 4 x 32 | stall-roof plank walk, the trimmer's; vantage | 2 |
| W1 | warden-office | 4.5 | 8 x 8 | warden's office, tally book (TGC step 2) | 3 |
| W1 | fish-hall (encounter, choke) | 0 | 14 x 28 | covered fish hall under the clock tower | 4 |
| W1 | service-passage (exit) | 0 | 4 x 34 | barrow passage to the arcade | 2 |
| W2 | arcade (encounter, entry, checkpoint) | 0 | 14 x 36 | glazed shopping arcade, TKL start | 3 |
| W2 | pie-shop / pie-loft | 0 / 4.5 | 8 x 10 | pie shop (decoy Garrow) / loft with the clerk's telephone (TKL step 1) | 2 / 2 |
| W2 | walkway (choke) | 4.5 | 3 x 32 | loft balcony along the arcade's north side | 3 |
| W2 | pawn-loft | 4.5 | 8 x 10 | pawnbroker's loft, courier rota (TGC optional), decoy Fenn | 2 |
| W2 | reading-room (encounter) | 4.5 | 6.5 x 16 | subscription reading room, Teale's table (TGC step 3) | 4 |
| W2 | clock-loft | 4.5 | 6.5 x 10 | clock-mender's loft, Teale's bolt point (A11) | 2 |
| W2 | lane-window | 4.5 | 8 x 8 | empty corner loft; window on the brass plate (TKL lead); roof hatch | 2 |
| W2 | arcade-roof (exit) | 8.4 | 8 x 32 | lead flats beside the skylight ridge; vantage | 3 |
| W3 | roof (entry) | 8.4 | 28 x 38 | lead roof over both wings, clock turret, hoist beam; vantage | 2 |
| W3 | east-yard (encounter, checkpoint) | 0 | 14 x 14 | walled yard, keypad east gate, fire escape | 4 |
| W3 | lodge | 0 | 6 x 8 | porter's lodge, tell-tale bell (TKL twist) | 2 |
| W3 | east-wing / west-wing (encounters) | 0 | 14 x 22 each | clerks' halls; the west one round a top-lit light well with an iron gallery at 4.2 | 4 / 4 |
| W3 | partners-office (reward) | 0 | 4 x 7 | day book (TKL optional) | 2 |
| W3 | east-post / west-post (objectives) | 0 | 4 x 6 each | key alcoves, 21 m apart, no line of sight | 3 / 3 |
| W3 | passage | 0 | 3.5 x 10 | strongroom passage: grille, chute iron door, coal yard door | 3 |
| W3 | strongroom (objective) | 0 | 6 x 8 | ledger presses, two-key door (TKL step 3-4) | 4 |
| W3 | chute | 2.2 | 1.2 x 6 (1.5 high) | brick coal chute, passage to the yard hatch | 3 |
| W3 | coal-yard (choke) | 0 | 14 x 16 | coal bays, hoist beam, cart gate | 3 |
| W3 | cartway (exit) | 0 | 4 x 6 | covered cartway to the wharf back lane | 2 |
| W4 | back-lane (entry, checkpoint) | 0 | 4 x 76 | service lane behind the sheds | 2 |
| W4 | gantry | 10 | 4 x 36 | quay crane walkway; vantage over shed three's north-light roof | 3 |
| W4 | shed-three (encounter) | 0 | 14 x 18 | bonded tea store, the candle chest (TGC step 4) | 4 |
| W4 | shed-two | 0 | 14 x 18 | empty bonded store, the TKL way through | 2 |
| W4 | shed-yard (encounter) | 0 | 22 x 28 | open quay, yard watch, minders after the TGC twist | 4 |
| W4 | canal-ledge | -4.4 | 3 x 28 | towpath step at water level | 2 |
| W4 | jetty (choke) | 0 | 4 x 28 | jetty staging, crane's red lamp overhead | 4 |
| W4 | boat (exit, exfil) | -1 | 4 x 12 | moored launch: both aboard = extraction | 2 |

- **Real dimensions:** doors 1.2 x 2.1, double doors 2.0, roller doors and the cart gate 3 x 3; shutters 3 m wide with a
  0.9 m crawl gap (KIT-SHUT); fire stairs 1.3 m, open stairs 2.4 m; ducts and culverts 1.2 x 1.5 (scale sheet crouch
  duct); co-op lips 4.4-4.5 m (LD 11.3); corridors and lanes 3-4 m.
- **Palette, lighting, weather:** lit by default, darkness made by switches, shot lamps and isolated circuits (LR1 /
  G279); every encounter is a mixed zone with a named dark part and a switch by its door (each space's `note`).
  Landmarks that guide without markers: the fish hall clock (W1), the copper turret clock (W3), the crane's red lamp
  (W4). Unswitchable lamps have reasons (LD 16.8.1): the clock faces (clockwork), the canal and coal yard lamps
  (photocell), the passage bulkhead (emergency circuit, vandal cage), the crane lamp (aviation). Weather and grade:
  greybox: pending.

## Stealth verbs found in the building (fill or delegate)
| Verb | Real building element |
| --- | --- |
| Split jump | Not planned. The throw gaps over the lightwell and the arcade lane are 2.5 m, wider than 1.95 m, so no accidental split gap; greybox checks (LD 15) |
| Horizontal pipe | greybox: pending (arcade gutters, shed eaves pipes are candidates) |
| Lip hang / shimmy / gap jump / corner | Gallery edge, walkway balustrade, roof parapets (the `drop` links: gallery -> market, walkway -> arcade, warden hatch -> fish hall) |
| Wall jump | Not in the graph; greybox: pending |
| Ladders, drainpipes | Plant ladders only (LD 16.2.1): the crane's two caged leg ladders, the iron quay ladder, the corner loft's fixed loft ladder to its roof hatch. Drainpipes: greybox: pending |
| Ducts and vents | Real systems (LD 16.7): the fish hall ice-melt drain to the canal, the arcade's shared cellar coal passage, the counting house hot-air heating duct, the old coal hole, the coal chute, the lane surface-water culvert |
| Rappel | None: the team rope (B7) is a climb up only, 2.2-6.0 m. It serves the walkway's west pier (4.5 m, the second player up). The west wing is entered by a 4.2 m drop through the light-well lantern onto its gallery |
| Fence | The quay railing with its chained jetty gate |
| Doors, windows | 30 door, window, hatch and roller links in the graph, each with an owner and a locked side where it gates (bolted: the warden's stair, the fish hall back door, the fire stairs, the bridge door, the coal yard door, the chute hatch, shed three's yard door, the jetty gate) |
| Cover, hide spots | Stalls and stall backs, ice benches, shop fronts, ledger presses and stacks, coal bays, tea chests, carts. Hide-spot positions: greybox: pending |
| Not used | Split jump (no believable 1.2-1.95 m shaft on the routes) |

## The route (fill or delegate)
Spaces in spine order. Guards are ESTIMATES (pending V6). Routes are the graph's links into each encounter (shadow /
high / loud / secret). Guard jobs are in each space's `note`; isolation moments, cycles and guard sheets: greybox: pending
(GB5).
1. **W1 market** (0, 4 guards: 2 wardens on loops, the lamp trimmer back-and-forth, a warden posted under the clock):
   shadow the dark stall-back aisle; high the boost to the gallery; loud the tea stall side and the warden's stair;
   vantage the gallery. Teaches the boost (TGC step 1).
2. **W1 fish hall** (0, 3: porters as a talking pair, a watchman loop past the shutter): shadow the side door; high the
   warden's hatch drop; loud the main arch; secret the ice-melt drain from the canal steps. Exit: the shutter (forced).
3. **W1 service passage** (quiet connector, glimpses the arcade's glazed roof) -> W2.
4. **W2 arcade** (0, 3: the beadle loop, Pell's man posted at the stair foot, one walking): shadow the pie shop door;
   high the boost to the walkway (the second player by the rope or the pull-up); loud the public stair and the pawn
   fire stair; secret the cellar coal passage. Teaches the pull-up.
5. **W2 reading room** (4.5, 3: Pell's minder post, the keeper loop, a static reader): high the throw over the
   lightwell from the pawn loft; loud the public stair; shadow on to the clock loft. TGC step 3 (interrogation).
6. **W2 walkway -> lane window -> arcade roof** (choke and exit), then the throw over the arcade lane -> W3 roof.
7. **W3 east yard** (0, 3: yard watchman loop, a dog on a running line, the porter at the twist): high the fire escape
   from the roof; loud the keypad gate and the lodge door; shadow the latched sash; secret the old coal hole.
8. **W3 east wing** (0, 4: 2 static night clerks, the porter's rounds, a messenger back-and-forth) and **west wing**
   (0, 3: a static clerk, the stacks porter loop, the front-hall watchman back-and-forth): high the bulkhead stair (east)
   and the drop through the light-well lantern onto the gallery (west); loud the front hall double doors; secret the heating duct. Key posts, the
   strongroom between them (TKL steps 2-3).
9. **W3 passage, chute, coal yard (choke), cartway** -> W4 back lane.
10. **W4 shed yard** (0, 6: yard watchman loop, a dog handler with a dog, the crane watchman post, Pell's 2 minders
    from the TGC twist): loud the lane gate; secret the culvert; high the crane leg ladder; shadow the quay ladder.
11. **W4 shed three** (0, 6: see "Graph edits"): high the boost through the lane-side clerestory; loud the yard door and the loading door;
    shadow the fire door from shed two. TGC step 4.
12. **W4 jetty (choke) -> boat** (extraction, both aboard).

Guard total: 35 across the map (W1 7, W2 6, W3 10, W4 12). Over the template's 9 (old Infiltration `SQUAD_CAP`): the
map runs on Sector Ops (`SECTOR.maxAlive` 32, `src/game/sectors.ts:508`), and each mission spawns only its own sections'
guards: TGC 25 (W1, W2, W4; W3 is a crossing), TKL 28 (W2-W4). See Engine questions 6.

Beat chart (tension in spine order, `checkPacing`): opens at 1; every peak of 4 is released at 1-2 before the next
peak (the service passage, the spine links, the lofts, the lodge, the cartway, shed two, the canal ledge); never three
4s in a row; the jetty (4) then the boat (2) closes the map. The validator reports no pacing warning. Per-space beat
sheets: greybox: pending.

## Co-op routes (fill or delegate)
Template wording replaced for campaign maps (M3: forced, no solo bypass; LD Open items 1). Each forced move has a real
reason solo cannot do it; no-softlock is the validator's reach check (0 ERR). Kit coverage: all six approved moves
(M5, PLAN 4a).

| Id | Section | Link | Kit move | Real reason solo cannot |
| --- | --- | --- | --- | --- |
| C1 | W1 | canal-steps -> gallery (4.5 m), market -> gallery (4.4 m) | Boost up a wall | The trimmer takes his ladder home; bare brick end wall, no ledge below |
| C2 | W1 | fish-hall -> service-passage | Hold shutter | Winding gear broken: one lifts and holds, the other crawls the 0.9 m gap; the back door is barred on the passage side until he lifts the bar |
| C3 | W2 | arcade -> walkway (4.5 m): boost at the west pier, then the rope there or the pull-up at the east lip | Boost; rope (climb up); pull-up | No stair reaches the walkway (tenants use their own back stairs); plastered pier with no handhold. The boost puts the first player up (`TEAM.boostMax` 4.5); the human ladder grabs only 4.1 m, so it is not used |
| C4 | W2 | pawn-loft -> reading-room, pie-loft -> clock-loft | Throw over a gap | The lightwell between the loft rows: 2.5 m from the south lofts' full-height taking-in doors to the north lofts' iron landing stages |
| C5 | W2 -> W3 | arcade-roof -> w3-roof (spine) | Throw over a gap | The arcade lane, 2.5 m at a break in both parapets (the old lane bridge's landing); the fire-escape bridge door opens only from the counting house side |
| C7 | W3 | passage -> chute (4.4 m) + yard hatch + coal yard door | Vent unlock | Chute door 4.4 m up the wall; hatch bolted on the chute side; coal yard door barred on the yard side. The only ways into the coal yard (the choke), so both missions cross W3 through it |
| C8 | W4 | back-lane -> shed-two | Hold shutter | Chain gear seized; 0.9 m crawl gap |
| C9 | W4 | back-lane -> shed-three (4.4 m) | Boost | Shed three's lane-side clerestory sash over a blind brick wall; inside, down onto the tea-chest stacks |
| C10 | W4 | canal-ledge -> jetty (4.4 m) | Pull-up | Staging edge over the ledge, no ladder on the canal side |

C6 (the rope from the roof into the west wing and the coal yard) is gone: the rope is a climb up only (Engine questions,
"Resolved"). The west wing is now entered by a solo 4.2 m drop through the light-well lantern onto its gallery, and the
coal yard only through C7.

Forced per section (removing the section's co-op links cuts entry from exit, validator VAL; choke found):
- **W1:** C2 at the exit (choke: fish hall). C1 is forced for the tally book (the office's other way in, the warden's
  stair, is bolted from the office side).
- **W2:** C3 (choke: walkway, every route to the roof) and C5 at the exit. C4 is the quiet way to Teale; the clock loft
  (his bolt point) is reached only by C4.
- **W3:** C7 into the coal yard (choke). The west wing (TKL key post) is reached by the lantern drop or through the
  east wing.
- **W4:** every way onto the jetty (choke) is C8, C9 or C10; the jetty gate is chained on the jetty side.

The two missions' routes:
- **Three Grey Coats:** W1 -> W2 -> W3 (crossing, no step) -> W4. Canal steps, boost to the gallery and the tally book,
  fish hall shutter; arcade, boost and rope to the walkway, throw over the lightwell to Teale; arcade roof, throw over
  the lane; W3 roof, the fire escape down into the east wing, the strongroom passage, the coal chute (vent unlock: A is
  boosted in, unbolts the yard hatch, unbars the yard door for B) into the coal yard, out the cartway to the W4 back lane
  (its one W3 move is the vent unlock, and both players end on the ground); B boosts A into shed three through the
  lane-side clerestory, B climbs the crane to the gantry; canal ledge pull-up onto the jetty, boat.
- **Two-Key Ledger:** W2 -> W3 -> W4. Arcade, boost and pull-up to the walkway, the clerk at the pie loft; corner loft,
  roof hatch, throw over the lane; W3 roof, A drops through the light-well lantern into the west wing, B takes the fire
  escape and the east gate (keypad); both key posts turn together; out through the chute (vent unlock) to the coal yard,
  cartway; shed two shutter, jetty, boat.

## Mission and modes (fill)
- `modes`: Sector Ops runtime only (`mode=sector`, `players: [2]`, A6). Unlisted. No other mode's default map changes.
- Missions (`MapDef.missions`, GB5 `tallowWharfMissions.ts`), from the committed mission graphs:
  - `threeGreyCoats` (`../three-grey-coats/graph.json`, `BEAT.md`): start `w1-canal-steps`, sections W1-W4, budget 20
    min, rule `namedTarget` (question only Pell's courier).
  - `twoKeyLedger` (`../two-key-ledger/graph.json`, `BEAT.md`): start `w2-arcade`, sections W2-W4, budget 20 min, rule
    `noKills`; step 3 is a `sync` (both keys within 1.0 s).
- Checkpoints (section restart, M1): `w1-canal-steps`, `w2-arcade`, `w3-east-yard`, `w4-back-lane`. TGC's W3 restart
  point (it has no W3 step): greybox: pending (EN2 / GB5; the head of the roof fire escape into the east wing is the obvious one).
- Theme: night, lit by default (LR1 / G279), canal-side, warm market lamps and cold quay floods. Grade and weather:
  greybox: pending.
- `reinforce`, `alarms`, `hideSpots`: greybox: pending (GB5). `switches` (from the space notes): market row-end
  switches (2 strings), fish hall arch switch, warden office desk lamp, arcade west arch switch, pie shop counter switch,
  pie loft stair-head switch, reading room table lamps and landing switch, east yard lodge switch (gate lamp), east and
  west wing desk lamps and the front-hall switch, shed three pendant switch and loading-door switch, shed yard gate-box
  switch.

## Engine questions for Phase 0 (fill)
Found by grep on this branch (2026-10-24). The kit moves now fit the code (graph fixed 2026-10-25, "Resolved" below);
the open notes for the greybox or kit slices are:
5. **Canal ledge at -4.4 m** is below the nav sampler's reach (about -1.5 m, LD 12.1): no guard walks it, which matches
   the design (no guards there). Confirm that player spawn, revive and the pull-up work there. Owner: GB4.
6. **Guard spawns.** The map total is 35, over `SECTOR.maxAlive` 32. GB5 spawns only the active mission's sections
   (TGC: no W3 guards; TKL: no W1 guards), or each section on entry. The guard-cap perf floor (performance.md, 24 within
   8 m) holds per section (12 max). Owner: GB5 / EN2.
7. **Guards looking up.** The gallery, arcade-roof and gantry vantages rely on darkness and height. The engine has no
   vertical sight limit (LD 12.1; G44 not built). Owner: greybox: pending (V6 measured vantage).
8. **The fish hall shutter and shed two shutter** are KIT-SHUT devices (`src/world/shutterDoor.ts`); the walkway and
   jetty lips are KIT-PULL's. The greybox reserves them with placeholders until those slices land.

Resolved (graph changed to the engine's facts, 2026-10-25; ids unchanged, mission files updated with them):
1. **Rope.** The two-person rope (B7) is a climb up only. The host wants the climber below the holder, 1.8-6.4 m
   (`teamMoves.ts:68-72`); the climb starts at the climber's own floor (`teamController.ts:931`); `ropeSlide`
   (`teamMoves.ts:327`) is only the slide back to that floor when either lets go. The span is `TEAM.ropeMin` 2.2 to
   `ropeMax` 6.0 m (`ropeRoom`, `teamMoves.ts:307`; `src/config/movement.ts:513-514`). No descent exists or is planned
   (PLAN 4a: "data only"), so the three descents went:
   - roof -> west wing (8.4 m) is now a solo `drop` of 4.2 m through the light-well lantern onto the wing's iron gallery
     (its stair goes down to the hall). The west wing keeps its high approach; W3 stays forced by C7.
   - roof -> coal yard (8.4 m) is removed. Three Grey Coats crosses W3 by the vent unlock (C7) like Two-Key Ledger: the
     roof fire escape into the east wing, the passage, the chute. Both players end on the ground, holder included.
   - gantry -> shed three (10 m) is now a boost from the back lane through shed three's lane-side clerestory (4.4 m sill,
     `TEAM.boostMax` 4.5, `movement.ts:459`). W4 stays forced: every way onto the jetty is still co-op.
   - The rope now serves the walkway's west pier in W2: the player already up drops it for the partner (4.5 m, in range).
     The map still uses all six approved kit moves.
2. **Throw.** The runner lands `TEAM.throwDist` 3.2 m past the thrower (`throwLanding`, `teamMoves.ts:174-190`; host
   bound +-1 m, `throwLandingOk` `:193`; `movement.ts:483-487`). The lightwell throws and the lane throw are now 2.5 m
   gaps (still over the 1.95 m split band): from the south lofts' full-height taking-in doors (2.8 m, for `throwUp` 2.2
   and the arc) to 1 m iron landing stages on the north lofts, and across the lane at a break in both parapets (the old
   lane bridge's landing). No sash window is a launch or a landing. GB2 proves each with the `throwLandingOk` test.
3. **Human ladder.** `TEAM.ladderGrab` 4.1 m (`movement.ts:464`) is under the 4.5 m walkway lip, so that link is now a
   boost (`boostMax` 4.5); the second player comes up by the rope or the pull-up. No ladder lip is left on the map.
4. **Jetty pull-up lip** is 4.4 m (ledge at -4.4, quay ladder 4.4), inside the pull-up band 4.3-4.5 (`PULL.min` =
   `WALL_JUMP.maxUp` + 0.5, `PULL.max` = `TEAM.boostMax`, `src/game/kit/pullUp.ts:51-53` on
   `feature/mission-kit-pull`). The validator still does not band `team_pull`.

## Phases (fixed; per `docs/level-design.md` section 14)
As the template, with the job's order (PLAN 5-6, G87): this spec + sign-off (CMS) -> Michael approves -> GB0 shell ->
GB1-GB4 one section each in parallel -> GB5 guards, sectors and missions -> GB6 mission e2e -> GBM measured pass
(`level-measure --write`, then `level-validate --require-measured` 0 ERR, M4). Space sheets, guard sheets, the element
register (16.9) and the 16.10 checklist are written with GB1-GB5 (greybox: pending).

## Future recommendations (fixed)
As the template: one paragraph per system at the end of the last phase. Not built here.

## Report format (fixed)
As the template.

## Validator, graph edits and WARNs
`node scripts/level-validate.mjs <abs graph.json>` from `C:/NightShift/Mobile-Coop-mission-validator`
(feature/mission-validator): **0 error(s), 6 warning(s)** after the CMS edits (was 0 / 7).

Graph edits by CMS (ids unchanged):
- **`w4-shed-three` guards 3 -> 6** (late band 6-10; Michael 2026-10-24: "as many guards as realistically possible").
  Reason: a tea barge lands on the night tide for the morning sale, so the bonded shed works all night. The 6 are the
  bond tally clerk (static), the customs locker who holds the bond keys (post at the loading door), 2 dockers stacking
  (talking pair), a docker on the hand truck (back-and-forth), and the shed foreman (loop through both aisles, the dark
  one included).
- **`phase`: W4 encounters set `late`; W1-W3 stay `early`.** The pacing check (`checkPacing`) does not read `phase`; it
  charts tension in spine order and passes either way. Only the guard band reads it. Without `phase` it falls back to the
  spine half (A3), which would make W3 "late" because W3 is third on the map. But every W3 guard is met only in TKL,
  where W3 is section 2 of 3, and A3's own rule (index 1 < 3 / 2) calls that early. TGC crosses W3 (roof, east wing,
  passage, chute, coal yard, cartway) with no W3 guards spawned (Engine questions 6). So `early` on W3 is the override
  A3 provides for this case. W2 is early in both missions: TKL's first, TGC's 2 of 4. W4 is last in both, so it is set
  `late` explicitly.
- `meta.note`: TGC's route reads W1 -> W2 -> W3 (crossing, no step) -> W4.

Graph edits by the engine fit (2026-10-25, Engine questions "Resolved"; validator still 0 / 6, the same six WARNs):
`w2-arcade -> w2-walkway` human_ladder -> coop_boost, plus a new team_rope there (4.5 m); the three team_throw widths
3.5 / 3.5 / 4 -> 2.5; `w3-roof -> w3-west-wing` team_rope 8.4 -> drop 4.2; `w3-roof -> w3-coal-yard` team_rope
removed; `w4-gantry -> w4-shed-three` team_rope 10 -> `w4-back-lane -> w4-shed-three` coop_boost 4.4;
`w4-canal-ledge` storey -4.2 -> -4.4 (quay ladder and jetty pull-up 4.2 -> 4.4). 37 spaces, 72 links as before.

The six remaining WARNs, each justified (LD: "justify the size in the design doc"):
1. `w1-canal-steps` custom: an 8 x 10 m stone landing stair from the canal. It is a landing, not a room, and under the
   sheet's yard minimum of 14 m. Its size is the steps' real width beside the tea stall.
2. `w2-arcade-roof` custom: a lead-flat roof walk (8 x 32 m beside the skylight ridge, 1.1 m parapet). Roofs are route
   surfaces with no room class on the scale sheet.
3. `w3-roof` custom: the counting house's lead roof over both wings (28 x 38 m), with the turret, the light-well lantern
   and the hoist beam. It is a route surface and vantage, sized by the two wings below it.
4. `w3-chute` custom: a duct modelled as a space (1.2 x 1.5 m crouch, 6 m long), because the vent unlock needs a place
   to stand between the leg-up and the hatch. Its section is the scale sheet's crouch duct (LD 16.7.3).
5. `w3-chute` off the 0.5 m grid (1.2 m): the scale sheet's crouch-duct width is 1.2 m, so the grid gives way to the
   duct standard.
6. `w4-boat` custom: a launch's deck (4 x 12 m at -1 m), the extraction zone. A vessel has no building class.
