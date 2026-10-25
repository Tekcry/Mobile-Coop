# Task: Tallow Wharf - a canal-side merchants' quarter at night, two co-op missions on one small map
Owner: Campaign Build. Status: current.

The Tallow Wharf map spec on the map-spec template as changed for G157 (`docs/templates/map-spec.md` and
`docs/level-design.md` on `origin/feature/level-standard-g157`, PR #443; Michael adopted the 12 level-rule changes
2026-10-25 ~18:20). Job TW23 moved the signed-off spec onto it; the old spec
(`docs/missions/prototypes/campaign-map/SPEC.md`) stays as the record #372's sign-off pages point to, with its history
(graph edits, the engine fit, the resolved engine questions). This file wins where they differ.

The design does not change here. Michael (2026-10-25 ~18:05): "approve as drawn, id rather physically walk the map once
built and confirm changes". Where the template asks for a fact the old spec did not settle, this file writes an assumed
decision (A1-A12, each with its undo; the numbers are this file's own) or an open item for J8 / J23 (O1-O24); fixes
belong to those jobs. Michael's rules that bind above this file (CLAUDE.md authority order) are applied as written.

Map files: graph `docs/missions/prototypes/campaign-map/graph.json` (37 spaces, 72 links; A2), plan
[`PLAN.svg`](../missions/prototypes/campaign-map/PLAN.svg) (1 m = 10 px, north up), sign-off
[`SIGNOFF.md`](../missions/prototypes/campaign-map/SIGNOFF.md) (signed, unchanged). Missions:
`docs/missions/prototypes/three-grey-coats/` and `docs/missions/prototypes/two-key-ledger/` (BEAT.md, graph.json,
SIGNOFF.md). Co-op kit: `docs/missions/prototypes/coop-kit/SIGNOFF.md`.

## Michael's words that bind the map
ROADMAP "Decided" on origin/feature/menu (2026-10-25), then DECISIONS:
- Players: campaign, exactly two, no bot (G2, G48). Tallow Wharf is campaign Mission 1 (G340); "Tallow stays Mission 1"
  with Marlow Yard as the training prologue (Q6).
- Q2 dark spots: "Never" (every light works; darkness only from cover, cut power and shot lamps). Q3 light levels:
  "Australian standards (Recommended)". G329 real-world levels.
- Q8 civilians: "None on Mission 1 (Recommended)" (only the named people are protected; everyone else is an armed
  guard). Q12 campaign riot shields: "No, armed only (Recommended)". G155: no heavies or dogs in the campaign. G298:
  every guard armed.
- Q19 campaign rewards: "None (Recommended)" (optional objectives give nothing). Q23 Tallow throw gaps: "Force co-op".
- G359: the campaign caps at 32 alive, a ceiling, not a target. G290: up to 2 strict rules, signposted; breaking one
  restarts the section. G334: soft windows only. G336 / G339: no map screens, direction aids, objective markers or
  position dots; objectives name what and where. G126: 30 s revive, twice per mission.
- G157 (~18:20, "Adopt all as recommended"): the 12 changes, now in level-design 3.1, 3.10, 4.11, 5.6, 6.1, 6.2, 6.4,
  8.4, 11.11, 13, 15, 16.2.7, 16.3.6, 16.6.5. Michael confirms them on his Tallow walk.

## Context (fill)
Night Shift (repo Tekcry/Mobile-Coop). Base branch: `master`. The map's folder is `docs/tallowWharf-map/` (this spec;
the map's design docs join it, A1). The greybox already exists, built dark on `feature/mission-engine` before the
sign-off as G293 allows (GB0-GB6, `docs/missions/PLAN.md`). Its fixes are jobs of the signed folded plan
(origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md` section 4): J7 engine rule fixes, J8 greybox fixes
(`feature/tallow-fixes`), J9 shutters (`feature/tallow-shutters`), J23 design docs, encounter checkpoints, acceptance
tests and the greybox exit. Each job works in its own worktree and branch. Never merge into any branch and never merge
any branch into yours; the train merges it (`docs/RULES.md` "Getting to master").

Goal: a new campaign map, `tallowWharf` ("Tallow Wharf"): a small canal-side merchants' quarter at night, about
120 x 80 m with the canal along the south edge, in four sections: W1 night market, W2 arcade lofts, W3 the Gaunt &
Lisle counting house, W4 wharf sheds and the boat. Two 2-player missions share it: Three Grey Coats (TGC) and Two-Key
Ledger (TKL). Every section forces a co-op traversal move with no solo bypass (G292). It follows `docs/level-design.md`
(the level design standard) in full.

Mode: campaign. The mode's profile in `docs/level-design.md` ("Modes and tags") binds this map; its graph sets
`meta.mode` to the same value (`campaign`, set).

## Scope: existing systems only (fixed)
- This work builds a map, its missions as data for the mission engine, tests, dev scripts and docs. It adds no new game
  systems: no new movement, co-op moves, AI behaviour, takedown kinds, interactable kinds, net messages, HUD elements,
  input bindings or mode logic.
- Missions use the mission engine (`src/game/mission/`, `missionDef.ts`, on feature/mission-engine until it merges; the
  mission-framework job, `docs/missions/PLAN.md`): sections, objective steps, parallel team tracks and strict rules are
  `MissionDef` data. An objective step or rule kind the engine lacks, or a co-op move the kit lacks
  (`docs/level-design.md` 11.9), is built by the mission-framework or co-op job first, never in this map job. A map that
  starts before the engine is on master asks the orchestrator.
- TypeScript you write: `src/world/maps/tallowWharf.ts` (one file per section when it is large), its registration in
  `src/world/maps/index.ts` and `src/world/maps/listed.ts`, its sectors and missions
  (`src/world/maps/tallowWharfSectors.ts`, `tallowWharfMissions.ts`), an exported constant of the map's co-op lips, unit
  tests. The map's graph (`docs/level-validator/` schema, with the mission nodes) goes in the job folder. Scripts: e2e
  suites (and `scripts/plan-svg.mjs` if it does not exist yet).
- If a step seems to need anything else, stop and report it as a "Future" item. Do not build it.
- Enemies and tuning tables never change. If a set piece does not engage, change the building.
- Other maps: no changes.

## Originality (fixed)
- This map is an original design. Do not open, read or copy any other map file (`src/world/maps/*.ts` other than
  `index.ts`, `listed.ts`, `storey.ts`) and do not reuse another map's layout, coordinates, room ids or names, colours,
  set pieces or guard routes.
- Learn each `LevelBuilder` call from its signature and doc comment in `src/world/levelBuilder.ts`, the storey helpers
  from `src/world/maps/storey.ts`, the anchors from `src/world/anchors.ts`.

## Rules for working (fixed)
1. Read `CLAUDE.md`, `docs/RULES.md` and `docs/VISION.md` from origin/master, then `docs/level-design.md`, then this
   spec.
2. Before referencing any file, type, function, field or constant, confirm it exists with grep and note where. If
   something named here does not exist or differs, stop and report it; never invent a substitute.
3. One phase at a time. At the start of each phase re-read this spec (`docs/tallowWharf-map/SPEC.md`), the progress log and
   the approved design docs, then print a short plan (files and functions, one line each). Do only that phase.
4. End of each phase: run the listed checks, report results honestly (never claim a check passed unless you ran it in
   this phase; paste the summary line), list what changed, update the progress log, commit and push. Michael's gates are
   the one-click sign-offs of `docs/level-design.md` section 14.
5. Save this spec verbatim to `docs/tallowWharf-map/SPEC.md` in Phase 0. Never edit it without approval; proposed changes
   go in the progress log under "Spec change requests".
6. Progress log: the job's `docs/tallowWharf-map/STATE.md` (resume block on top, `docs/RULES.md` "A job"; below it the
   phase, status, files changed, decisions, tests with results, open issues, spec change requests).
7. Approved design docs are the build contract. Deviations go under "Decisions" with the reason; a deviation that
   changes a route, a guard job or a room needs approval first.
8. Update the map's docs and the changelog fragment (`changes/<branch-with-dashes>.md`; never `CHANGELOG.md`, G183) at the end
   of each phase that adds playable content.
9. Hyphens, never em dashes. Follow `CLAUDE.md` "Hard rules" and `docs/systems/conventions.md`.
10. Checks: `npm run typecheck:fast` and single `npx vitest run <file>` runs; CI runs `npm run check`; e2e through the
    laptop queue (`docs/RULES.md` "Test tiers").

## Building brief (fill)
- **Building type and era:** a 19th-century canal quarter still trading today: a covered night market with a fish
  hall, a glazed shopping arcade with let lofts above, an old counting house (Gaunt & Lisle, private bankers and
  bookkeepers, two wings round a strongroom), and bonded wharf sheds with a quay crane.
- **Original purpose and how it worked:** barges unloaded at the canal steps into the market; porters barrowed goods
  along the fish hall's back passage to the arcade; the counting house kept the wharf's books and coal-fired its
  boilers from a coal yard with a hoist beam; tea came in by water to the bonded sheds under a customs locker.
- **Present-day use and who is there tonight:** the night market trades (wardens, porters, the lamp trimmer); the
  arcade has its beadle and Pell's men; the counting house has night clerks, porters and a yard watchman; the wharf
  lands a tea barge on the night tide (shed three works through the night; shed two is empty). People (Q8, A7): the
  three grey-coated couriers (Teale, Fenn, Garrow; TGC) are the map's named, protected people (G353); everyone else on
  the guard lists is an armed guard (G298); no civilians. Story fit: `docs/story.md` (Pell, Halcyon, the radio cast).
- **Site:** world metres, x east, z north, bounds 0-120 x 0-80. Canal z 0-6 along the south. Section boxes
  (`meta.section_info`): W1 x 0-40, z 6-62; W2 x 40-76, z 48-80; W3 x 82-120, z 34-80 (the arcade lane between W2 and
  W3, pinched to 2.5 m at the throw point); W4 x 44-120, z 0-34. Spine: W1 -> W2 -> W3 -> W4.
- **Construction:** load-bearing brick, timber floors, lead flat roofs with 1.1 m parapets (16.5.3). Storey heights:
  ground 0; lofts and the market gallery 4.5; arcade and counting house roofs 8.4; crane gantry 10; west wing light-well
  gallery 4.2; canal ledge -4.4; boat deck -1. At most 3 walkable surfaces per column (arcade 0 / 4.5 / 8.4; west wing
  0 / 4.2 / 8.4); the build sets `navLayers: 4`. Structural grid: not settled (O17).
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
| W2 | clock-loft | 4.5 | 6.5 x 10 | clock-mender's loft, Teale's bolt point | 2 |
| W2 | lane-window | 4.5 | 8 x 8 | empty corner loft; window on the brass plate (TKL lead); roof hatch | 2 |
| W2 | arcade-roof (exit) | 8.4 | 8 x 32 | lead flats beside the skylight ridge; vantage | 3 |
| W3 | roof (entry) | 8.4 | 28 x 38 | lead roof over both wings, clock turret, hoist beam; vantage | 2 |
| W3 | east-yard (encounter, checkpoint) | 0 | 14 x 14 | walled yard, keypad east gate, fire escape | 4 |
| W3 | lodge | 0 | 6 x 8 | porter's lodge, tell-tale bell (TKL twist) | 2 |
| W3 | east-wing / west-wing (encounters) | 0 | 14 x 22 each | clerks' halls; the west one round a top-lit light well with an iron gallery at 4.2 | 4 / 4 |
| W3 | partners-office (payoff dead end) | 0 | 4 x 7 | day book (TKL optional, no reward, Q19) | 2 |
| W3 | east-post / west-post (objectives) | 0 | 4 x 6 each | key alcoves, 21 m apart, no line of sight | 3 / 3 |
| W3 | passage | 0 | 3.5 x 10 | strongroom passage: grille, chute iron door, coal yard door | 3 |
| W3 | strongroom (objective) | 0 | 6 x 8 | ledger presses, two-key door (TKL steps 3-4) | 4 |
| W3 | chute | 4.4 | 1.2 x 6 (1.5 high) | brick coal chute from the passage's iron door (4.4 m), falling to the yard hatch (2.2 m up the coal yard wall) | 3 |
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

- **Real dimensions for this building type:** doors 1.2 x 2.1, double doors 2.0, roller doors and the cart gate
  3 x 3; shutters 3 m wide with a 0.9 m crawl gap; fire stairs 1.3 m, open stairs 2.4 m; ducts and culverts 1.2 x 1.5
  (scale sheet crouch duct); co-op lips 4.4-4.5 m (level-design 11.8); corridors and lanes 3-4 m.
- **Palette, lighting character, grade, weather:** real-site light per space (G329, Q2, Q3), replacing the old spec's
  "lit by default" training basis (G279, never the campaign's fallback, level-design 5.5): each space is lit to the band
  of its space type, closed spaces by their night fittings, unfitted spaces by spill (A3-A5; table in "Mission and
  modes", Theme). Warm market and loft lamps, cold quay floods. Landmarks that guide: the fish hall clock (W1), the
  copper turret clock (W3), the crane's red lamp (W4). Unswitchable lamps have reasons (5.1): the clock faces
  (clockwork), the canal, coal yard and quay lamps (photocell), the passage bulkhead (emergency circuit, vandal cage),
  the crane lamp (aviation). Weather: none, a dry night (A8). Grade: art pass, not settled.
- **Stairs and exits** (16.2.7, 16.3.6):

| Building | Staircases (16.2.1 kinds) | Exits and their opening side |
| --- | --- | --- |
| Market and fish hall (W1) | Single storey; the warden's office block on the gallery has one enclosed stair (its foot door bolted from the stair side) and the inspection hatch | The hall opens to the market by the arch and the side door. Its back door is barred on the passage side: a security door to the arcade, not the hall's escape exit. One stair for the office block: O13 |
| Arcade lofts (W2) | The public open stair (west, to the reading room landing), the pawnbroker's enclosed fire stair (push bar on the loft side), the pie shop's enclosed back stair (bolted at the top by the clerk) | Fire stair doors open from the loft side; the clock-mender's door is bolted on his side. Roof by the corner loft's hatch and loft ladder: breaks 16.2.1 / 16.2.3 / 16.2.5 (O12) |
| Counting house (W3) | The roof bulkhead stair core (east) and the external iron fire escape on the yard wall; the west wing's light-well gallery stair (inside the wing) | The fire-escape bridge door over the lane opens only from the counting house side (escape direction). The coal yard door is barred on the yard side: a service door, the passage's exits are its east and west doors. How far apart the two stairs are: O13 |
| Wharf sheds and crane (W4) | Single storey; the crane's two caged leg ladders are plant ladders (16.2.1) | Shed three's yard door is barred inside (opens from inside); the jetty gate in the quay railing is chained on the jetty side (a fence gate, not a building exit) |

  No map relies on a fire alarm opening a door (level-design open item 3).
- **Security** (site security summary, 4.11; the register is Phase 2, O16):
  - How secure: a working canal quarter, mostly public by night, with two hard points: Gaunt & Lisle's strongroom and
    the customs bond in shed three. No cameras, lasers or alarm panels in the design.
  - Layers, fence to target: W1-W2 public (market wardens, the arcade beadle; Pell's men as private muscle) -> the
    counting house: the lane bridge door (opens only from inside), the walled east yard with the keypad east gate and
    the yard watchman, the porter's lodge and its key board, the clerks' halls, the passage grille, the two-key
    strongroom door -> the wharf: the yard gate under the floodlight, shed three's barred doors under bond, the chained
    jetty gate.
  - Who opens what: the east gate keypad, staff with the code (the founding year); the strongroom, two key-holders
    turning together; the bond, the customs locker's keys; the jetty gate, the yard watch.
  - Steps that need two people: the strongroom's two keys, a wing apart (TKL step 3).
  - Weak spots and their story reasons: the east gate code is the firm's founding year, on the brass plate ("Old firms
    never change a code they're proud of", TKL); the clerks' hall sash is left on the latch for the stove fumes; the
    fish hall shutter's winding gear is broken and shed two's chain gear is seized; the old coal hole plate by the lodge;
    the service runs (ice-melt drain, cellar coal passage, heating duct, coal chute, lane culvert).
  - Alarm chain: opening the strongroom rings the tell-tale bell in the lodge and sends the porter (about 60 s, TKL
    twist). Who else is called and how long they take: Phase 2 (O16).

## Stealth verbs found in the building (fill or delegate)
| Verb | Real building element |
| --- | --- |
| Split jump | Not planned. The throw gaps are 2.5 m, wider than 1.95 m, so no accidental split gap; greybox checks (level-design 15) |
| Horizontal pipe | Not settled (arcade gutters, shed eaves pipes are candidates) |
| Lip hang / shimmy / gap jump / corner | Gallery edge, walkway balustrade, roof parapets (the `drop` links: gallery -> market, walkway -> arcade, warden hatch -> fish hall) |
| Wall jump | Not in the graph; not settled |
| Ladders, drainpipes | Plant ladders only (16.2.1): the crane's two caged leg ladders, the iron quay ladder. The corner loft's loft ladder to its roof hatch is not a plant ladder (O12). Drainpipes: not settled |
| Ducts and vents | Real systems (16.7): the fish hall ice-melt drain to the canal, the arcade's shared cellar coal passage, the counting house hot-air heating duct, the old coal hole, the coal chute, the lane surface-water culvert |
| Rappel | None: the team rope is a climb up only, 2.2-6.0 m (`TEAM.ropeMin` / `ropeMax`). It serves the walkway's west pier (4.5 m, the second player up). The west wing is entered by a 4.2 m drop through the light-well lantern onto its gallery |
| Fence | The quay railing with its chained jetty gate |
| Doors, windows | 30 door, window, hatch and roller links in the graph, each with an owner and a locked side where it gates (bolted: the warden's stair, the fish hall back door, the fire stairs, the bridge door, the coal yard door, the chute hatch, shed three's yard door, the jetty gate) |
| Cover, hide spots | Stalls and stall backs, ice benches, shop fronts, ledger presses and stacks, coal bays, tea chests, carts. Hide spots: O8 |
| Not used (no believable element) | Split jump (no believable 1.2-1.95 m shaft on the routes) |

## The route (fill or delegate)
Spaces in spine order. Guards are estimates (measured at greybox exit, V6); every guard is armed (G298); no heavies,
dogs or riot shields (G155, Q12); helmets by difficulty (G350). Routes are the graph's links into each encounter
(shadow / high / loud / secret). Guard jobs are in each space's `note`; isolation moments, cycles and guard sheets are
Phase 2 (O17).
1. **W1 market** (0, 4 guards: 2 wardens on loops, the lamp trimmer back-and-forth, a warden posted under the clock):
   shadow the stall-back aisle; high the boost to the gallery; loud the tea stall side and the warden's stair; vantage
   the gallery. Teaches the boost (TGC step 1).
2. **W1 fish hall** (0, 3: porters as a talking pair, a watchman loop past the shutter): shadow the side door; high the
   warden's hatch drop; loud the main arch; secret the ice-melt drain from the canal steps. Exit: the shutter (forced).
3. **W1 service passage** (quiet connector, glimpses the arcade's glazed roof) -> W2.
4. **W2 arcade** (0, 3: the beadle loop, Pell's man posted at the stair foot, one walking): shadow the pie shop door;
   high the boost to the walkway (the second player by the rope or the pull-up); loud the public stair and the pawn
   fire stair; secret the cellar coal passage. Teaches the pull-up.
5. **W2 reading room** (4.5, 3: Pell's minder post, the keeper loop, a static reader): high the throw over the
   lightwell from the pawn loft; loud the public stair; shadow on to the clock loft. TGC step 3 (interrogation).
6. **W2 walkway -> lane window -> arcade roof** (choke and exit), then the throw over the arcade lane -> W3 roof.
7. **W3 east yard** (0, 3: the yard watchman loop, a second armed watchman posted by the lodge in the dog's place (A6),
   the porter at the twist): high the fire escape from the roof; loud the keypad gate and the lodge door; shadow the
   latched sash; secret the old coal hole.
8. **W3 east wing** (0, 4: 2 static night clerks, the porter's rounds, a messenger back-and-forth) and **west wing**
   (0, 3: a static clerk, the stacks porter loop, the front-hall watchman back-and-forth): high the bulkhead stair
   (east) and the drop through the light-well lantern onto the gallery (west); loud the front hall double doors; secret
   the heating duct. Key posts, the strongroom between them (TKL steps 2-3).
9. **W3 passage, chute, coal yard (choke), cartway** -> W4 back lane.
10. **W4 shed yard** (0, 6: the yard watchman loop, the dog handler and, in the dog's place, a second armed yard
    patrol (A6), the crane watchman post, Pell's 2 minders from the TGC twist): loud the lane gate; secret the culvert; high the crane leg ladder;
    shadow the quay ladder.
11. **W4 shed three** (0, 6: the bond tally clerk, static; the customs locker posted at the loading door; 2 dockers
    stacking, a talking pair; a docker on the hand truck, back-and-forth; the shed foreman, a loop through both aisles):
    high the boost through the lane-side clerestory; loud the yard door and the loading door; shadow the fire door from
    shed two. TGC step 4.
12. **W4 jetty (choke) -> boat** (extraction, both aboard).

Guard total per player count (2 players, the only count): 35 across the map in the graph (W1 7, W2 6, W3 10, W4 12),
the two dogs counted as armed guards (A6). Each mission spawns only its own sections' guards: TGC 25 (W1, W2, W4), TKL
28 (W2-W4); a section spawns at most 12 before reinforcements, under the 32 alive ceiling (G359; `SECTOR.maxAlive` 32,
`src/game/sectors.ts:508`). The build spawns more in W1 / W2 than the graph says (O11). Every encounter sits at or above
its band floor (early 3-6, late 6-10; W4 encounters `late`).
- Lookouts (entry vantage for two, 3.1; the finale seen early, 6.1):

| Encounter | Vantage (graph `vantage.at`) | Sees | Room for two |
| --- | --- | --- | --- |
| W1 market | gallery (4, 4.5, 30) | 75% | 4 m plank walk: two side by side, to check (O19) |
| W1 fish hall | gallery north end, through the open side bay (4, 4.5, 45) | 70% | to check (O19) |
| W2 arcade | arcade roof skylight ridge (60, 8.4, 62.5) | 80% | 8 m lead flats: yes |
| W2 reading room | arcade roof edge across the lightwell (52, 8.4, 69.5) | 70% | 8 m lead flats: yes |
| W3 east yard | W3 roof (107, 8.4, 52.5) | 80% | 28 x 38 m roof: yes |
| W3 east wing | the east yard's dark wall line at the tall windows (108, 0, 51.5) | 70% | one window or two: to check (O19) |
| W3 west wing | down the light-well lantern from the roof rail (89, 8.4, 63) | 70% | to check (O19) |
| W4 shed three | gantry, over the north-light glazing (79, 10, 17) | 70% | 4 m walkway: to check (O19) |
| W4 shed yard | gantry (58, 10, 17) | 85% | 4 m walkway: to check (O19) |

  The final area (the jetty and the boat) is first seen as the crane's red lamp on the jib over the jetty, from the W3
  roof, which both missions cross: a sightline to confirm in the greybox (O20).
- Blocked routes (6.4 two-minute test; what the players see from where they stand):

| Blocked route | Seen from | What shows the way past |
| --- | --- | --- |
| Gallery (C1) | canal steps, market stall backs | the gallery's plank edge on a bare brick wall 4.4-4.5 m up, no ladder |
| Fish hall back wall (C2) | fish hall west bay | the service shutter stuck at a 0.9 m gap beside the barred back door |
| Loft walkway (C3) | arcade floor, north-west bay | no stair to the balustrade; the plastered west pier and the east lip over the shop fascia |
| Lightwell (C4) | pawn loft, pie loft | open taking-in bays facing iron landing stages 2.5 m across |
| Clock loft | reading room landing | the mender's door bolted on his side; its landing stage seen across the lightwell |
| Arcade lane (C5) | arcade roof, corner loft window | the parapet broken out where the old lane bridge landed; the bridge door opposite |
| East gate keypad | corner loft window, east yard | the brass plate with the founding year over Gaunt & Lisle's door |
| Coal yard (C7) | strongroom passage | the chute's iron door 4.4 m up the wall; the yard door barred on the far side |
| Shed two (C8) | back lane | the seized loading shutter's 0.9 m gap |
| Shed three (C9) | back lane | the lit clerestory sash 4.4 m over the blind lane wall |
| Jetty (C10) | shed yard, canal ledge | the jetty gate chained on the jetty side; the staging edge 4.4 m over the ledge |

  A playtest target, not a validator check; the walk card asks it (level-design 13 playtest checklist).
- Exit run (3.10): both missions run from the last objective to the boat in well under 2 minutes by the graph's link
  times at the stealth pace (about 30-45 s each player, A11), over spaces not used on the way in. TGC: from shed three,
  A by shed two's canal door and the jetty, B down the crane's yard ladder, the quay ladder and the ledge, pulled up at
  the jetty lip. TKL: from the coal yard, the cartway, the back lane, shed two's shutter and canal door, the jetty; B
  round by the shed yard and the ledge. Both players must reach the boat (G138). Route-runs measure it (J23).

## Co-op routes (fill or delegate)
The co-op kit of `docs/level-design.md` 11.9. Every section forces a co-op move with no solo bypass (11.10, G292). The
map uses the six approved moves; the five that joined the kit on 2026-10-25 and the shoulder stand are not on Tallow
Wharf (approved as drawn).

| Id | Section | Link (graph kind) | Kit move | Real reason solo cannot |
| --- | --- | --- | --- | --- |
| C1 | W1 | canal-steps -> gallery (4.5 m), market -> gallery (4.4 m) (`coop_boost`) | Boost up a wall | The trimmer takes his ladder home; bare brick end wall, no ledge below |
| C2 | W1 | fish-hall -> service-passage (`shutter`, gap 0.9) | Hold shutter | Winding gear broken: one lifts and holds, the other crawls the 0.9 m gap; the back door is barred on the passage side until he lifts the bar |
| C3 | W2 | arcade -> walkway (4.5 m): `coop_boost` at the west pier, then `team_rope` there or `team_pull` at the east lip | Boost; rope (climb up); pull-up | No stair reaches the walkway (tenants use their own back stairs); plastered pier with no handhold. The boost puts the first player up (`TEAM.boostMax` 4.5); the relay ladder grabs only 4.1 m |
| C4 | W2 | pawn-loft -> reading-room, pie-loft -> clock-loft (`team_throw`, 2.5 m) | Throw over a gap | The lightwell between the loft rows, from the south lofts' open-fronted taking-in bays to the north lofts' iron landing stages |
| C5 | W2 -> W3 | arcade-roof -> w3-roof (`team_throw`, spine, 2.5 m) | Throw over a gap | The arcade lane at a break in both parapets (the old lane bridge's landing); the fire-escape bridge door opens only from the counting house side |
| C7 | W3 | passage -> chute (`coop_boost`, 4.4 m) + yard hatch (bolted, chute side) + coal yard door (bolted, yard side) | Vent unlock | Chute door 4.4 m up the wall; the only ways into the coal yard (the choke), so both missions cross W3 through it |
| C8 | W4 | back-lane -> shed-two (`shutter`, gap 0.9) | Hold shutter | Chain gear seized; 0.9 m crawl gap |
| C9 | W4 | back-lane -> shed-three (`coop_boost`, 4.4 m) | Boost | Shed three's lane-side clerestory sash over a blind brick wall; inside, down onto the tea-chest stacks |
| C10 | W4 | canal-ledge -> jetty (`team_pull`, 4.4 m) | Pull-up | Staging edge over the ledge, no ladder on the canal side |

C6 is gone (the rope is a climb up only; old spec, "Engine questions", Resolved 1).

Forced per section: W1 C2 at the exit (C1 is forced for the tally book); W2 C3 (choke: walkway) and C5 at the exit, C4
the quiet way to Teale and the only way into the clock loft; W3 C7 into the coal yard (choke); W4 every way onto the
jetty (choke) is C8, C9 or C10. The 2.5 m throws are solo-jumpable in the build today; Q23 "Force co-op" makes them
forced (O21). Until then W2 is forced by C3.

**Way back per gate** (11.6 gate reach, 11.10): each co-op link's solo way back from its far side to its near side,
timed on the graph by master's validator (`scripts/level-validate.mjs` on origin/master, `reach_speed_mps` 3,
`reach_max_s` 15; run by TW23). A passed shutter and an unbolted door count as staying open (graph schema).

| Gate | Way back (solo, far side -> near side) | Time | Status |
| --- | --- | --- | --- |
| C1 canal-steps -> gallery | drop off the gallery edge to the market, then the dark aisle to the steps | 9.8 s | ok |
| C1 market -> gallery | drop off the gallery edge behind the stall awnings | 2.0 s | ok |
| C2 fish hall shutter | the passed shutter; and the fish hall back door, unbarred from the passage side by the first one through, stays open | own way back | ok if a passed shutter stays open (O3) |
| C3 arcade -> walkway (boost, rope, pull-up) | drop off the walkway balustrade into the north-west bay; or the pawn fire stair (push bar on the loft side) | 2.0 s | ok |
| C4 pawn-loft -> reading-room | down the public stair to the arcade, up the pawn fire stair | 20.0 s | ERR, over 15 s (O1) |
| C4 pie-loft -> clock-loft | the mender's door (unbolted from his side), the public stair, the pie shop door, the pie shop's back stair | 28.2 s | ERR, over 15 s (O1) |
| C5 arcade-roof -> w3-roof | the fire-escape bridge door, opened from the counting house side | 13.7 s | ok |
| C7 passage -> chute | out by the yard hatch, then the coal yard door, unbarred from the yard side | 8.7 s | ok |
| C8 back-lane -> shed-two | the passed shutter; if a released shutter drops (O3): shed two's canal door, the jetty gate unchained from the jetty side, the shed yard, the lane gate (23.7 s by link lengths) | own way back | depends on O3 |
| C9 back-lane -> shed-three | the fire door to shed two, then shed two's shutter (validator); in TGC shed two's shutter is never opened, so: the yard door (barred inside, opened from inside), the shed yard, the lane gate (16.5 s by link lengths) | 10.7 s | ok for TKL; TGC over 15 s (O1) |
| C10 canal-ledge -> jetty | the jetty gate (unchained from the jetty side), the shed yard, the quay ladder | 15.8 s | ERR, over 15 s (O1) |

A partner downed on the far side of a gate before its way back is open (the shutter not yet passed, the bar not yet
lifted, the bridge door not yet opened) cannot be reached by the other, because the gate is forced; the revive window
runs out and the team restarts at its last checkpoint (9.4). Whether 11.6's "either side" asks more: O2.

- Teamwork minimums (11.11; per mission, A9):

| Kind | Minimum | TGC meets it at | TKL meets it at |
| --- | --- | --- | --- |
| A door or shutter held | 1 | the fish hall shutter (C2) | shed two's shutter (C8) |
| A boost or climb | 3 | the gallery boost (C1), walkway boost and rope (C3), chute boost (C7), clerestory boost (C9), jetty pull-up (C10) | walkway boost and pull-up (C3), chute boost (C7), jetty pull-up (C10) |
| One partner covering the other | 1 | Eyes on the gallery (W1), on the arcade roof skylight while A takes Teale (W2), on the gantry (W4) | B at the passage grille calling the porter (W3 twist) |
| A split ending in a joint action at its merge point | 1 | W1 split leads (tally book / tea stall) meeting at the shutter hold; W4 gantry / shed three meeting at the jetty pull-up | one player per wing, meeting in the synced key turn (step 3) |

  The throws (C4, C5) come on top. Splits keep the 90 s limit (11.3, `split_max_s`); they are declared in the graph by
  J8 (O9). Roles swap at each mission's step 3 (BEATs, "Roles"): neither player always boosts or holds. Waits over about
  60 s (playtest targets): the first one at a key post waiting for the other (TKL step 3), the Eyes player while the
  other questions Teale (TGC step 3, covering). Joint actions are forgiving and work with pings alone: the key turn is a
  1.0 s window on TALLY's count; its failure springs both keys back with no alarm (O14).
- Pings and warnings (13 co-op plan; who is where comes from the BEATs' "Roles", what the world shows from the graph
  notes; the ping per move is Phase 2, J23):

| Move | Who is where | What the world shows before they commit |
| --- | --- | --- |
| C1 | B boosts A (Eyes) onto the gallery | the wardens' loops and the trimmer's back-and-forth, read from the canal steps |
| C2 | B holds, A crawls, then A lifts the bar for B | the hall watchman's loop past the shutter |
| C3 | the booster at the west pier; the one up drops the rope or pulls at the east lip | the beadle's loop and Pell's man at the stair foot, from the dark north-west bay |
| C4 | B throws A from the pawn loft bay | the reading room's lit window: the minder at the stair head, the keeper's loop |
| C5 | the thrower at the parapet break | the counting house roof (no guard on it today; a G335 lookout later, O10) |
| C7 | B boosts A into the chute; B watches the passage | the porter's lantern down the corridor (TKL), from the grille |
| C8 | B holds, A crawls | the yard gate floodlight and the yard watchman's loop at the lane end |
| C9 | B boosts A, then climbs to the gantry | the lit sash: the foreman's aisle loop below it |
| C10 | the one on the jetty pulls the one on the ledge | the minders' walking pair (TGC after the twist), the loading-door flood |

- Revive check (15): the team-move surfaces are the gallery, the walkway, both lightwell landing stages, the W3 roof at
  the parapet break, the chute, the tea-chest stacks under the clerestory, the jetty staging, the canal ledge and both
  shutter gaps. J23 tests a revive inside the 30 s window on each (O2 for the far-side case).

## Mission and modes (fill)
- `modes` (`MapDef.modes`): `['sector']` (`src/world/maps/tallowWharf.ts:61` on `feature/mission-engine`): campaign
  missions run on the Sector Ops runtime (`SectorMode`, mission-framework A6). Unlisted; `?autostart` boots it only with
  `?missions=1` (FLG). Do not change any mode's default map.
- Players: campaign, exactly 2, no bot (G2, G48): graph `meta.players` `[2]`, both missions `players: [2]`. The run
  refuses any other count (J7, O22).
- Each mission (a `MissionDef`, `src/world/maps/tallowWharfMissions.ts` on `feature/mission-engine`):
  - `threeGreyCoats`, "Three Grey Coats" (`three-grey-coats/graph.json`, BEAT.md): insertion `w1-canal-steps`;
    sections W1-W4 (W3 is a crossing with no step); brief: the BEAT's briefing text (Pell's weekly cipher goes by hand,
    three couriers in one grey coat); strict rule `namedTarget` (1): "Rule - question only Pell's courier." in the
    briefing and the objective list; breaking it restarts W2 with Teale moved to the clock-mender's loft (Michael
    ~18:05 "He moves"); knocking out or killing Teale before he talks restarts the section (G353).
  - `twoKeyLedger`, "Two-Key Ledger" (`two-key-ledger/graph.json`, BEAT.md): insertion `w2-arcade`; sections W2-W4;
    brief: the ledger in Gaunt & Lisle's strongroom, two keys turned at once; strict rule `noKills` (1): "Rule - no
    kills." in the briefing and the objective list; a kill restarts the section.
  - Section checkpoints: `w1-canal-steps`, `w2-arcade`, `w3-east-yard` (the build restarts W3 at the roof bulkhead head
    instead, O7), `w4-back-lane`. An encounter checkpoint before every encounter space (3.9, G126): O7.
  - `budget` 20 in each mission graph is the beat chart's planning total, not a timer: no countdown closes a route
    (G334). Optional objectives give no reward (Q19).
- Objective chain (13 "Objective and lead plan", Chain), objective lines as the players read them:

| Step | Objective line | Both players? What each does | Reveals for the next step |
| --- | --- | --- | --- |
| TGC 1 (W1 market) | Find the three grey coats under the fish hall clock | Both: B boosts A onto the gallery | the three coats under the clock |
| TGC 2 (W1 office / tea stall) | Learn which grey coat is Pell's: the warden's tally book, the tea stall talk | Both, split: A reads the tally book, B listens at the tea stall; each holds half the answer | the courier: the black umbrella. The line names no single place (O15) |
| TGC 3 (W2 reading room) | Take the grey coat with the black umbrella in the reading room loft | Both: A boosts B, B ropes A up; B throws A over the lightwell; B covers from the arcade roof, A questions Teale | the chest: shed three, a candle on the lid |
| TGC optional (W2 pawn loft) | Optional: read Pell's courier rota in the pawnbroker's loft | One reads | story only (no reward, Q19) |
| TGC 4 (W4 shed three), twist | Find the chest stencilled with a candle in shed three | Both: B boosts A through the clerestory and covers from the gantry; A takes the chest | the minders arrive; the cipher was in the chest, never on Teale |
| TGC 5 (W4 boat) | Both of you, over the gangway to the boat under the crane | Both: A pulls B up the jetty lip; both aboard | extraction |
| TKL 1 (W2 pie loft) | Listen to the night clerk on his supper break in the pie shop loft | Both: A boosts B, B hauls A up the east lip; A listens | the east gate code (the founding year, on the brass plate) |
| TKL 2 (W3 east wing) | Into the counting house: the east gate by the yard, the west wing from the roof | Both, split: B types the code only A heard; A drops into the west wing | one player per wing, at the key posts |
| TKL 3 (W3 key posts) | Turn both strongroom keys together: the east wing and the west wing key posts | Both: a synced turn within 1.0 s | the strongroom opens |
| TKL optional (W3 partners' office) | Optional: copy the partners' day book in the east wing office | One copies | story only (no reward, Q19) |
| TKL 4 (W3 coal yard), twist | Take the ledger from the strongroom and leave by the coal chute to the yard | Both: B watches the porter from the grille, boosts A into the chute; A unbars the yard door | the bell sends the porter; the planned east gate exit is now his way in |
| TKL 5 (W4 boat) | Both of you, through the wharf sheds to the boat at the jetty steps | Both: B holds shed two's shutter for A; A pulls B up the jetty lip | extraction |

  The objective twist (6.2, the objective changes) falls at TGC step 4 and TKL step 4: about 60-65% of each mission by
  the BEAT minutes, at or past the 40-60% target (O15).
- Pacing and wow moments (6.2, 13 "Beat chart"; minutes are playtest targets for an average pair):

| Mission | Wow moment (kind) | Five tests (watcher reads it / players trigger it and it can fail / both have a job / danger reads first / one sentence) |
| --- | --- | --- |
| TGC | The throw over the lightwell to Teale's landing (two-person move, step 3) | yes / the players throw; how it fails is to check in the greybox / thrower and runner, then Eyes on the roof / the lit window shows the minder and the keeper first / "one threw the other across the lightwell to reach the courier" |
| TGC | The fish hall shutter between the watchman's passes (timing together, W1 exit) | yes / yes, a watchman who sees the held shutter comes to look (J9) / holder and crawler / his loop is visible from the west bay / "one held the shutter while the other rolled under" |
| TGC | "He never had the sheet" and the minders off the launch (story reveal, step 4) | yes / triggered by finishing step 3; the W4 run past the minders can fail / both in W4 / SEXTON's radio before the minders reach the yard / "the courier was only carrying the way to the chest" |
| TKL | The throw over the arcade lane onto the counting house roof (two-person move, W2 exit) | yes / the players throw; how it fails is to check in the greybox / thrower and runner / the lane and the roof are in view from the parapet break / "one threw the other over the lane to open the bridge door" |
| TKL | The two-key turn on TALLY's count, a wing apart (timing together, step 3; signature) | yes / yes, a miss springs the keys back / one key each / both posts are reached unseen first / "two keys, two wings, one count" |
| TKL | The tell-tale bell turns the exit into the porter's way in (story reveal, step 4) | yes / triggered by opening the strongroom; avoiding the porter can fail / Ears at the grille, Hands with the ledger / the bell and his lantern down the corridor / "the strongroom rang a bell and the way out closed" |

  Signature moments: TGC the three grey coats (a named target among decoys); TKL the two-key turn. Small teamwork
  moments every 2-4 min, a big one every 6-10 min with 30-90 s of calm after it: the route-runs and the walk card time
  them (J23).
- Final tests (15): the two-player unseen run to the exit (TGC's ghost route: into the reading room by the throw, out of
  shed three by shed two's canal door, aboard by the gangway; TKL: its ghost and pacifist runs); the goggle-light
  colours told apart at about 20 m at the map's darkest real spot, the canal ledge (A10); a revive inside 30 s on every
  team-move surface (Revive check above).
- Theme: night; real-site light per space type (5.5, G329, Q2, Q3); factions: Pell's men, the site's own watch and
  staff (market wardens, the arcade beadle, Gaunt & Lisle's porters and clerks, the wharf yard watch, customs); grade
  not settled; no weather (A8). Light per space:

  Space types and their draft bands (A5): light-realism's draft table
  (`origin/feature/light-realism:docs/light-realism/research/bands.md` section 3; every value "to verify"; scale sheet
  section 9 replaces them once Michael approves the table). Until then the interim rule binds: light each space like a
  real site of that type at night.

| Key | Space type (scale sheet 9) | Standard | Draft average lux (point minimum) |
| --- | --- | --- | --- |
| P | Pathway, landing | AS/NZS 1158.3.1 (pathway) | 0.85-3.5 (0.14-0.7) |
| PA | Public activity area, outdoor market | AS/NZS 1158.3.1 (public activity) | 7 (2) |
| L | Road, service lane | AS/NZS 1158.3.1 (P3) | 1.75 (0.3) |
| Y | Yard, loading apron | AS/NZS 1680.5 | 20-50 |
| C | Corridor, walkway, covered passage | AS/NZS 1680.2.1 | 40 |
| LO | Lobby, covered arcade | AS/NZS 1680 / EN 12464-1 | 100 |
| O | Office, reading room, security room | AS/NZS 1680.2.2 | 320 (task plane) |
| K | Kitchen, shop counter, canteen | AS/NZS 1680 | 160 |
| W | Warehouse, store (staffed) | AS/NZS 1680.2.4 | 100 |
| D | Market hall, loading dock (indoor, worked) | AS/NZS 1680.2.4 | 150 |
| WS | Workshop | AS/NZS 1680 | 300 |
| A | Archive, strongroom | AS/NZS 1680 | 160 |
| N | Closed tonight: its night fittings only (A3) | scale sheet 9, after-hours row | not set (light-realism) |
| U | Unfitted: no fitting a real site has there (A4) | - | night floor plus spill, measured |

| Space | Type | Fittings tonight (owner, switch) | Its darkness comes from | Old spec said |
| --- | --- | --- | --- | --- |
| w1-canal-steps | P | canal lamp at the water edge (photocell, unswitchable) | the stall row's shadow at the top step (cover) | "dark by default at the top step": kept, it is cover |
| w1-tea-stall | PA | paraffin lamp on the counter (turned down by hand) | the nook between the urn crates and the canal rail (cover); the lamp shot | - |
| w1-market | PA | two stall-lamp strings (row-end switches); the clock face lamp (clockwork) | the aisles between stall backs (cover); a string cut; stall lamps shot | "lit by default" (G279) |
| w1-gallery | U | none | spill from the stall lamps below | "dark: no lamps": kept, unfitted (A4) |
| w1-warden-office | O | desk lamp (switch by the gallery door) | the switch; the lamp shot | - |
| w1-fish-hall | D | pendants on one circuit (arch switch); pools on the ice benches | the west bay under the warden's office (cover); the arch switch; pendants shot | - |
| w1-service-passage | N | bulkhead at the arcade end | the stretch past the bulkhead's reach (a real gap); the lamp shot | - |
| w2-arcade | LO | gas-style pendants (west arch switch); the pie shop window | the north-west bay by the coal bunker (cover); the arch switch; pendants shot | "shop windows dark": the shut shops are closed spaces (A3) |
| w2-pie-shop | K | lit shop window (switch behind the counter) | the switch; the lamp shot | - |
| w2-walkway | U | none of its own | spill from the arcade pendants | "dark (no walkway lamps)": kept, unfitted (A4) |
| w2-pie-loft | K | lit window onto the walkway (switch by the stair head) | the switch; the lamp shot | - |
| w2-pawn-loft | O | lit desk lamp (switch: O4) | the lamp shot | - |
| w2-reading-room | O | table lamps (each switched); landing switch | the stacks aisle (cover); the switches | - |
| w2-clock-loft | N (WS when worked) | night fittings (A3, O4) | benches and cased clocks (cover) | "Dark (the mender has gone home)": now closed, night fittings (A3) |
| w2-lane-window | N | night fittings (A3, O4) | - | "Dark, unlet": now closed, night fittings (A3) |
| w2-arcade-roof | U | none | parapet shadow; skylight glow from below | "dark by default": kept, unfitted (A4) |
| w3-roof | U | turret clock face (clockwork) | - | "dark by default": kept, unfitted (A4) |
| w3-east-yard | Y | gate lamp over the keypad door (switch in the lodge); the lodge window | the wall line under the fire escape (cover); the lodge switch; the gate lamp shot | - |
| w3-lodge | O | lodge lamp | the switch; the lamp shot | "comes on at the twist": a lamp left off until then (O5) |
| w3-east-wing | O | green desk lamps (each switched); hall pendant at the front-hall door | the press aisles (cover); the hall switch; the pendant shot | - |
| w3-partners-office | N | warm desk lamp left on | the lamp shot | - |
| w3-east-post, w3-west-post | O | lit from the clerks' halls | - | - |
| w3-passage | C | caged bulkhead (emergency circuit, unswitchable, hardened) | the chute end past its reach (a real gap) | - |
| w3-strongroom | A | night fitting (A3, O4); lit through the door once open | - | "dark until the door opens" (A3) |
| w3-west-wing | O | copying-desk lamps (each switched); the light-well lantern (moonlight) | the stacks (cover); the desk switches; the front-hall switch | - |
| w3-chute | U | none (a duct) | - | - |
| w3-coal-yard | Y | yard lamp over the cart gate (photocell, unswitchable) | the coal bays (cover); the lamp shot | - |
| w3-cartway | C | lamp at the lane mouth | the lamp shot | - |
| w4-back-lane | L | lamp at the yard gate; the lane's fittings to the band by J8's light plan (A5) | the gaps between fittings (real gaps); shot lamps | "dark by default; one lamp": now lit to its band (A5) |
| w4-gantry | U | the crane's red lamp on the jib (aviation, unswitchable) | - | "dark walkway": kept, unfitted (A4) |
| w4-shed-three | W | loading-door floodlight (switch inside the door); two pendant rows on one switch | the side aisle among the tea-chest stacks (cover); the pendant switch; the floodlight shot | "side aisle dark": cover, not a missing fitting |
| w4-shed-two | N | emergency lamp at the canal door | its unlit aisle beyond the lamp's reach (a real gap) | "Dark": closed, night fitting (A3) |
| w4-shed-yard | Y | yard floodlight at the lane gate (gate-box switch); quay lamps (photocell) | the cart lines and coal heaps (cover); the gate-box switch; the floodlight shot | - |
| w4-canal-ledge | U | none (under the quay lamps' cut-off) | - | darkest real spot (A10) |
| w4-jetty | Y | shed three's loading-door flood (its inside switch); the crane's red lamp | the switch; the flood shot | - |
| w4-boat | U | the launch's own lamps: O6 | - | "Dark, the engine idling" |

  Readable machines (5.6): the switches sit by the doors they serve and name their circuit (J8 light plan); the crane
  is parked with its aviation lamp lit; the launch's engine idles. Lit windows expose both sides (G144): the pie loft,
  the reading room, the lodge, the clerestory sash. Harmless noises (8.4) for the sound plan: canal water, the idling
  launch, the ice-melt drip, the clocks.
- `reinforce`, `alarms`, `hideSpots`, `switches`: `reinforce` and `alarms` as built on `feature/mission-engine`
  (`src/world/maps/tallowWharfSectors.ts`), planned in Phase 2 (O16). `hideSpots`: two per section in the build, too few
  (O8). `switches` (from the graph notes): the market row-end switches (2 strings), the fish hall arch switch, the
  warden's office desk lamp, the arcade west arch switch, the pie shop counter switch, the pie loft stair-head switch,
  the reading room table lamps and landing switch, the lodge switch (gate lamp), the east and west wing desk lamps and
  the front-hall switch, shed three's pendant switch and loading-door switch, the shed yard gate-box switch.

## Engine questions for Phase 0 (fill)
Open (the old spec's resolved ones stay there: the rope is a climb up only, the throw lands 3.2 m out, the relay
ladder grabs 4.1 m, the jetty pull-up lip is 4.4 m in the 4.3-4.5 band):
1. **Canal ledge at -4.4 m** is below the nav sampler's reach (about -1.5 m, level-design 12.1): no guard walks it, as
   designed. Confirm player spawn, revive and the pull-up there (J23).
2. **Guard spawns.** The graph total is 35 against the 32 alive ceiling: each mission spawns only its own sections
   (TGC no W3 guards, TKL no W1 guards); a section spawns at most 12 before reinforcements (G359).
3. **Guards looking up.** The gallery, arcade roof and gantry vantages rely on height and no fitting: guard sight
   eases to a floor of 0.15 by 48 deg above the eye line (G44, `pitchFactor`, level-design 12.1); measured at the
   greybox exit (V6).
4. **Shutters.** Both are stand-in walls in the build; J9 wires them (`src/world/shutterDoor.ts`). Does a released
   shutter stay open after both have passed, as the graph schema assumes? (O3)
5. **Forced throws (Q23).** A solo running jump carries about 2.8 m and the in-air grab catches a lip up to about
   4.3 m, so the 2.5 m throw gaps are solo-jumpable today (O21).
6. **Night floor.** The theme's `ambient` / `lightLevel` 0.3 sit above the campus night floors, so a cut circuit
   cannot read dark (O4).
7. **The human ladder** is now the shoulder stand (4.5 m, J24); it is not used here (approved as drawn).

## Phases (fixed)
`docs/level-design.md` section 14 owns the phases and their gates (validator gate before greybox, one-click sign-off,
greybox exit with `--require-measured` (V6, not live yet), route-runs and the walk card); section 13 owns the
deliverables, section 15 the acceptance tests. Phase 0 also confirms by grep every fact this spec and level-design
section 12 rely on and reports how to build each element from the engine files only.

## Future recommendations (fixed)
At the end of the last phase, one paragraph each on systems this map would benefit from (how they would fit the existing
code, which space would use them). Do not build them.

## Report format (fixed)
Files changed (one line each); Decisions; checks run with their summary lines; anything left undone; the walk-card
lines for Michael per space (also in `TESTING.md`); then STOP.

## Validator result and warnings
Master's validator (`origin/master:scripts/level-validate.mjs` with `origin/master:docs/design/metrics.json`, run on
2026-10-25 by TW23 on this graph): **3 error(s), 6 warning(s)**. The errors are the gate reach of C4 x2 and C10 (O1).
The six warnings, each justified (level-design 14):
1. `w1-canal-steps` custom: an 8 x 10 m stone landing stair from the canal. It is a landing, not a room, and under the
   sheet's yard minimum of 14 m. Its size is the steps' real width beside the tea stall.
2. `w2-arcade-roof` custom: a lead-flat roof walk (8 x 32 m beside the skylight ridge, 1.1 m parapet). Roofs are route
   surfaces with no room class on the scale sheet.
3. `w3-roof` custom: the counting house's lead roof over both wings (28 x 38 m), with the turret, the light-well lantern
   and the hoist beam. It is a route surface and vantage, sized by the two wings below it.
4. `w3-chute` custom: a duct modelled as a space (1.2 x 1.5 m crouch, 6 m long), because the vent unlock needs a place
   to stand between the leg-up and the hatch. Its section is the scale sheet's crouch duct (16.7.3).
5. `w3-chute` off the 0.5 m grid (1.2 m): the scale sheet's crouch-duct width is 1.2 m, so the grid gives way to the
   duct standard.
6. `w4-boat` custom: a launch's deck (4 x 12 m at -1 m), the extraction zone. A vessel has no building class.

## Assumed decisions
Each is logged and undoable; none changes a room, route, door, co-op move or guard post of the approved drawing.
- **A1 Folder.** The map's folder is `docs/tallowWharf-map/`: the template's `docs/<map-id>-map/` with the exact map id,
  so it matches `src/world/maps/tallowWharf*.ts` (G55, one folder per map; Marlow Yard and the campus keep theirs in
  their job folders, `docs/ct-prototype/` and `docs/sector-redesign/`). Undo: rename the folder and the old spec's
  pointer.
- **A2 Files stay put.** The graph, plan, sign-off and mission files stay under `docs/missions/prototypes/` for
  #372's signed pages and the mission graphs' relative paths; the old spec keeps its text with a pointer here on its
  first line. J23 may move the graph into this folder, fixing every link. Undo: move them now.
- **A3 Closed spaces (Q2).** A space someone works in tonight is lit to its band. A space closed tonight (the shut
  shops, the clock loft, the corner loft, the strongroom, shed two, the partners' office) is lit by the night fittings a
  real site of its type keeps on (an emergency bulkhead, a stair or security light, a desk lamp left on), named in J8's
  light plan; no fitting is dead and no space is unlit by design. Darkness comes from cover, the real gaps between
  fittings, cut circuits and shot lamps. This matches J8's plan (its A1) and is the one a day-time lead may put to
  Michael. Undo: light the closed spaces to their working bands.
- **A4 Unfitted spaces.** Roofs, the gallery plank walk, the loft walkway, the chute and ducts, the canal ledge, the
  crane gantry and the boat deck get no fitting: a real site does not light them, so their dark is a real gap, not a
  lamp left off. They read the night floor plus their neighbours' spill, measured at the greybox exit. Undo: give one a
  real fitting with an owner and a switch.
- **A5 Draft bands.** Each space's band is light-realism's draft value for its type (table above) until scale sheet
  section 9 is filled; J8 lights to it and the bake is measured against the approved table at the greybox exit. Where
  the graph names fewer fittings than a band needs (the back lane, the offices), J8's light plan adds fittings of the
  same owner on the same switch or circuit. Undo: a data-only re-tune when the approved table differs.
- **A6 Dogs out (G155).** The W3 east yard dog and the W4 shed yard dog become armed guards at the same posts (a second
  yard watchman by the lodge; a second yard patrol beside the handler), so the counts and band floors hold (J7, folded
  plan break 10). Undo: drop them; the east yard then falls under the early band floor of 3.
- **A7 People (Q8).** Teale, Fenn and Garrow are the named, protected people; every other person on the guard lists
  (clerks, porters, dockers, the reader, the beadle, wardens, watchmen) is an armed guard; no civilians on this map.
  Undo: a civilian kind and plan after Mission 1 (Q8).
- **A8 No weather.** A dry night, so no weather changes light or sound (5.6, G157 item 7). Undo: add a weather with its
  light and sound effects in the light and sound plans.
- **A9 Teamwork minimums.** Per mission: 1 door or shutter held, 3 boosts or climbs, 1 covering, 1 split ending in a
  joint action, each already met (table above). Undo: raise a minimum in this spec.
- **A10 Darkest real spot.** The canal ledge (under the quay lamps' cut-off, on both missions' routes) is the spot for
  the goggle-colour test (15). Undo: J23 measures and names another.
- **A11 Exit run.** Judged on the graph's link times at the stealth pace (`split_speed_mps` 1.3) until the route-runs
  time it. Undo: the route-runs' times replace it.
- **A12 Progress log.** The map facts live here; each job keeps its own STATE (`docs/missions/STATE.md`, J8 / J9 / J23
  in their job folders) until a map job opens `docs/tallowWharf-map/STATE.md`. Undo: open it now.

## Open items
For J8 unless another owner is named; every fix inside the approved drawing goes on Michael's walk card as a change
since he approved it.

| Id | Item | Rule | Owner |
| --- | --- | --- | --- |
| O1 | Gate reach over 15 s: C4 reading room 20.0 s, C4 clock loft 28.2 s, C10 jetty 15.8 s (master's validator); C9 in TGC 16.5 s without shed two's shutter | 11.6, 14 | J8 |
| O2 | A partner downed on the far side of a gate before its way back opens cannot be reached; does 11.6's "either side" ask more? Revive test per team-move surface | 11.6, 15 | J8 asks Marlow (level standard), J23 tests |
| O3 | Whether a passed shutter stays open (graph schema) or drops when released (then C8's way back is 23.7 s) | 11.6 | J9 |
| O4 | Light re-base per A3-A5: graph `meta.note` and space notes still say "lit by default (LR1 / G279)" and "dark by default"; a space type per space; the light plan (fittings, switches by doors, the closed spaces' night fittings, the pawn loft and clock loft switches); the theme night floor (engine question 6) | 5.1, 5.5, 5.6, G329, Q2 | J8 |
| O5 | TKL's twist cue "the porter's lodge lamp coming on" needs the lodge lamp off before it (Q2): a cue that keeps the lamp on | Q2, 6.4 | J8 |
| O6 | The launch's own lamps at the jetty | 5.1 | J8 |
| O7 | Encounter checkpoints before every encounter space; W3's section checkpoint (graph: east yard; build: roof bulkhead head) | 3.9, G126 | J23 (engine list), J8 (tag) |
| O8 | Hide spots near every takedown spot; none today in the east yard or east wing | 4.7, 4.8 | J8 |
| O9 | Splits declared in the graph (legs, merge point, overwatch, assist) | 11.3-11.5, 11.11 | J8 |
| O10 | Static lookouts on high routes and paired patrols (G335), after Guard AI's build | 3.6, 4.4 | J8 after Guard AI |
| O11 | Graph counts against the build (W1 7 / W2 6 in the graph, 9 / 10 spawned); the dog rows (A6) | 4.9, 15 | J8 |
| O12 | Roof reached by a loft ladder through a hatch in a let loft | 16.2.1, 16.2.3, 16.2.5 | J8 |
| O13 | Two separate staircases: the warden's office block has one; the counting house's bulkhead stair and fire escape both sit on the east side | 16.2.7 | J8 |
| O14 | TKL's missed key turn springs back with no alarm; 11.11 says a failed joint action raises the alarm: read as "at most an alarm" (TKL conforms) or an alarm (TKL differs from its signed beat) | 11.11 | J8 asks Marlow |
| O15 | TGC step 2's line names two places but no single "where"; both twists sit at about 60-65% by the BEAT minutes (target 40-60%, a playtest target) | 6.2, 6.4, G336 | J7 (line), J23 (playtest) |
| O16 | Security register and the alarm chain (who is called, how long); `reinforce` / `alarms` plan | 4.11, 13 | J23 |
| O17 | Phase 1-2 deliverables: structural grid, floor plans per storey, space and guard sheets (isolation moments, cycles), light, sound, checkpoint, co-op, medkit and civilian plans, element register, coverage table, tool / problem matrix, metrics check, self-critique, 16.10 answers | 13, 16.9, 16.10 | J23 |
| O18 | Medkit stations: none in the build (G98, a station in every map) | 12.2, 13 | J8 |
| O19 | Room for two at each entry vantage marked "to check" | 3.1 | J8 |
| O20 | The crane's red lamp seen from the W3 roof (the finale seen early) | 6.1 | J8 |
| O21 | Q23 "Force co-op": the 2.5 m throws are solo-jumpable today | 11.8, 11.10, Q23 | J8 (geometry), co-op job if the engine is needed |
| O22 | Exactly two players enforced at start; dogs out of the build; revives 30 s x 2 not syringes; the shutters behind their flags | G2, G48, G155, G126 | J7, J9 |
| O23 | Both shutters are stand-in walls: neither mission completes | VISION rule 3, G146 | J9 |
| O24 | Which of the two missions plays first as Mission 1 in the campaign lobby | G340, Q6 | J22 |
