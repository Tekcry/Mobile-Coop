# Tallow Wharf greybox - slice briefs GB0, GB1-GB4, GB5

Planner: Opus, 2026-10-25. Builders: Sonnet 5.5, one per slice, from these briefs only. Checker: one fresh Sonnet
checker for the GB0-GB5 batch (PLAN 6). Every builder first reads `docs/systems/agent-preamble.md` (the lead pastes it
with `<job>` = the slice's worktree name) and then only its own brief below plus the files it names.

Sources (read-only): `docs/missions/PLAN.md` (rows GB0-GB5, GB6, GBM, section 6);
`docs/missions/prototypes/campaign-map/{graph.json,SPEC.md}` (the graph is the source of truth for ids, `area` boxes,
storeys, link heights, guards, lights); `three-grey-coats/` and `two-key-ledger/` `{graph.json,BEAT.md}`. Code facts
below were read on `feature/mission-engine` at 9e87b4b34 (EN1-EN3, KIT0, KIT-PULL, KIT-SHUT merged; NET not yet).

---

## 0. Before any slice starts

### 0.1 Open questions for the lead (decide before GB0; each has a recommended answer the briefs already follow)
1. **TKL's start section.** `SectorRun` always starts at section 0 (`src/game/sectors.ts:703` `index = 0`;
   `src/game/modes/sectorMode.ts:282`). Two-Key Ledger starts at W2. Recommended: an EN2 follow-up slice (Opus; a
   `sectorMode` hook line plus a start index on `SectorRun`) before GB6. GB0-GB5 do not depend on it.
2. **Guards for each mission.** There is one `sectors` list for the map, so Three Grey Coats would spawn W3's 10 guards
   and Two-Key Ledger would get TGC's couriers in W2. Recommended: the same EN2 follow-up reads a per-mission filter.
   GB5 writes the data now (`WHARF_GUARD_MISSIONS` in `tallowWharfSectors.ts`). Nothing reads it until then.
3. **The three throw gaps can be jumped solo.** They are 2.5 m, flat, at the same height. A top-gear running jump
   carries about 2.8 m, and the fall grab catches a lip up to 4.34 m away (`tests/helpers/soloJumpReach.ts`:
   `soloJumpReach(4.5, 4.5)`). The throw cannot cover a gap wider than that (`throwLandingOk` allows 3.2 +- 1 m and
   +-1.0 m of height). Recommended (built below): C4 and C5 are co-op moves on routes that C3 (the walkway) already
   gates, so W2 stays forced. The south lofts' taking-in doors are bolted on the loft side, so a solo player on the
   reading-room side cannot jump the lightwell back to the south lofts. The SPEC line "the clock loft is reached only by
   C4" becomes "only by C4 or a jump from a south loft, which C3 already gates". Re-spec only if Michael wants the
   throws to force co-op on their own (that would need an IR beam band, `throwGateway`).
4. **Drops are free.** The game has no fall damage (`teamMoves.ts:329` `hangLanding`). A solo player can mantle a
   1.1 m parapet (`mantleMax` 1.8, `scripts/kestrel/facts.json` F04) and drop off any roof. Recommended (built below):
   a 2.2 m `noLedge` drop guard (over the 1.8 m mantle, with no lip) wherever a drop would skip a forced move. That
   means the W3 roof's coal-yard edge, and the W4 gantry and its north arm, which are caged.
5. **The coal chute's height.** The graph gives the chute `storey` 2.2, but its door must be a 4.4 m boost lip (C7). A
   2.2 m sill is a solo jump grab (`REACH.grabMax` 2.7). Recommended (built below): the chute floor is 4.4, a 2 m brick
   duct out over the coal yard. Its "hatch" is a small bolted door in the duct's end wall, from which you drop 4.4 m
   into the yard. GBM rewrites the measured values.
6. **No working shutter yet** (see 0.2). W1's only exit (C2) and the TKL way through W4 (C8) are closed stand-ins
   until the shutter is wired. Playtests cross by debug teleport. Recommended: accept, because GB6 waits for NET anyway.
7. **One restart point per section.** A section's restart point is the previous connector's `checkpoint`, one per
   map. W3's restart point is the head of the roof bulkhead stair (the "roof fire escape into the east wing", SPEC
   Mission and modes) for both missions. Two-Key Ledger loses the SPEC's east-yard checkpoint. Recommended: accept.

### 0.2 The shutter: what it needs before it can be placed
- `placeShutter` (`src/world/shutterDoor.ts:54`) builds only the head box and the side guides, and registers the spec.
  The curtain's static body is made by `ShutterDoors` (same file), and nothing constructs that yet: no World /
  GameState wiring. `SHUTTER_MOVE.build` (`src/game/kit/shutter.ts:797-798`) turns every registered spec into a live
  device. So calling `placeShutter` today leaves an open 3 m hole that a solo player walks through, while the holder
  "lifts" a curtain that does not exist.
- The kit checker (`C:/NightShift/scratch/mission-kit-check.md`) found that it needs, first, a KitMove `tick?(h, run, dt)`
  hook in `registry.ts`. TeamController.fixedUpdate calls it before the `!alive` return, and `syncShutters` moves into
  it. That is cloud brief `briefs/mission-framework-kit-tick.md`. After the hook come the world wiring
  (`ShutterDoors.update(team.devices.list)`, the guards' notice) and NET items 1-4 and 6 (wire kinds, host checks,
  `crouch` in `teamSide`).
- **Decision: the GB slices only reserve shutter openings as data until the tick hook, the wiring and NET land.** Each
  shutter is a `ShutterSpec` constant in the section file, exported in `shutters`. The opening is built as a gap in the
  wall, filled by a closed stand-in panel: a collide box, `noLedge`, tagged `shutter-standin:<id>`. There is **no
  `placeShutter` call** in any GB slice. The wiring slice deletes the stand-ins (found by tag) and calls
  `placeShutter(b, spec)` for each reserved spec.
- The pull-up needs no data. KIT-PULL finds its edge with `TeamController.hangPoint` (`teamController.ts:609`). In
  co-op it works only after NET (wire kind `pull`). The greybox only builds the edges to the band.

### 0.3 Order and worktrees
- **Step 1 (the lead runs it; agents never merge):** merge the spec into the engine branch (PLAN 5, PR C note):
  ```
  cd /c/NightShift/Mobile-Coop-mission-engine && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-engine && git fetch origin feature/mission-framework && git merge --no-ff origin/feature/mission-framework -m "Merge origin/feature/mission-framework into feature/mission-engine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && test -f docs/missions/prototypes/campaign-map/graph.json
  ```
  Today `origin/feature/mission-framework` (003dc95e7) is not in the engine branch, and the engine tree has no
  `docs/missions/prototypes/`.
- **GB0** on `feature/mission-engine` in `C:/NightShift/Mobile-Coop-mission-engine`. The lead commits it, and that
  commit is the base for GB1-GB4.
- **GB1, GB2, GB3, GB4 run in parallel.** Each gets its own branch and worktree off the GB0 commit, created by the lead:
  `git -C /c/NightShift/Mobile-Coop-mission-engine worktree add -b feature/mission-gb<n> C:/NightShift/Mobile-Coop-mission-gb<n> <GB0 sha>`,
  then the lead's usual `node_modules` setup in the new folder. The lead merges the four branches back into
  `feature/mission-engine` with the subject `Merge feature/mission-gb<n> into feature/mission-engine`. They never share
  a file: each owns one section file and one test file, and GB0's files are frozen while they run.
- **GB5** on `feature/mission-engine` after all four merges (it needs every section built for its route and nav tests).
- Then the Sonnet checker (GB0-GB5), GB6 (needs NET and open question 1), and GBM (needs VAL and V6's measure CLI).

### 0.4 Common rules for every GB slice
- **Frame (world metres):** x east, z north (north up), **y up**. A `storey` in the graph, and every "y" below, is the
  **feet height of the walking surface**. Street and quay level is y 0. A box's `c[1]` is its centre, so a slab whose
  top is at y has `c[1] = y - th / 2`. Yaw 0 faces +z, PI / 2 faces +x (campusS2.ts:11 convention). Bounds 0-120 x
  0-80; canal z 0-6 along the south.
- **Area boxes** are clear interiors. A wall between two spaces is centred on their shared edge line, `T` = 0.3 thick
  (outer brick walls 0.6 where the brief says so). Every room's HUD `RoomDef` uses the space id as `id` and its `area`
  as the box. Any deviation is listed in the section's `deviations` with a reason, and the size test reads that list.
- **Solid mass:** any plan inside a section's box that is not a space's area, a stair core or a listed element is solid
  building mass. That is one collide box from y 0 (or the canal bed) to y 12, marked `noLedge`. Masses make the
  unassigned plan unwalkable and give no lips.
- **noLedge by default:** every box a slice adds is `noLedge`, except the pieces the brief names as a planned lip.
  Planned lips are manual `b.ledge(...)` on a `noLedge` piece, as `coopDeck` does (`ctcourseGreybox.ts:324-361`), or a
  generated face lip on a named wall. Stalls, counters, crates, tea chests, coal bays and bunkers are noLedge and at
  least 2.0 m tall when they stand within 4.7 m of a co-op lip, or no taller than 0.3 m.
- **Keep-clear:** nothing a player alone can stand on (a top over 0.3 m) within `GREY_KEEP_CLEAR` 4.7 m
  (`ctcourseGreybox.ts:45`) of any co-op lip on its approach side. Proved by `soloJumpThreats` (see the tests).
- **Doors:** 1.2 x 2.1 (`DOOR_H` 2.1), built with the kit's `doorIn` (a copy of `campusS2.ts:256-259` that also takes
  width and height). A door a later slice locks or bolts is listed by name in `doors` with its centre `[x, y, z]`.
  GB1-GB4 never lock doors themselves; GB5's `SectorBolt` / keypad / pair-gate data and the mode do that.
- **Lights:** lit by default (LR1 / G279). Each lamp is `b.light` through the kit's `lamp()` (a copy of
  `campusS2.ts:200-217` with `destructible` and `electric` options). Every switchable circuit is a `group` number with
  at least one switch. Unswitchable lamps (clockwork, photocell, emergency, aviation) get their own group with no
  switch. Group ranges: W1 60-67, W2 70-76, W3 80-90, W4 91-97.
- **Codes from the tables, never retuned:** `COOP_BAND` 4.3-4.5 (`ctcourseGreybox.ts:29`: `WALL_JUMP.maxUp` 3.8 + 0.5,
  `TEAM.boostMax` 4.5); `PULL.min`-`max` 4.3-4.5 (`src/game/kit/pullUp.ts:51-53`); `TEAM.ropeMin`-`ropeMax` 2.2-6.0
  (`src/config/movement.ts:513-514`, `ropeRoom` `teamMoves.ts:341`); `TEAM.throwDist` 3.2, `throwDrop` 1.0, `throwUp`
  2.2 (`movement.ts:483-487`), `throwLandingOk` (`src/game/teamMoves.ts:227`; the brief's ":193" was an older line),
  `throwRoom` (`teamMoves.ts:268`: headroom >= 1.2); `TEAM.roomSide` 1.0, `roomUp` 2.6; `WALL_STANDOFF` 0.9 (a wall
  face) and `LEGUP_STANDOFF` 0.5 (a deck face) (`ctcourseGreybox.ts:31-38`); `SHUTTER.holdGap` 0.9, `crawlOut` 0.7
  (`shutter.ts:35-52`); crouch 1.15 (`movement.ts:76`); `LEDGE.climbDepth` 0.38 (a 0.3 wall top is hang-only).
- **Commands** (in the slice's worktree, after the guard line; every command has a timeout):
  - CPU rule. Before each vitest or tsc run, wait while the desktop is over 85 % CPU: check every 60 s, at most 10
    tries, then run anyway. Run the wait in the background and wait for its notification; never use a foreground
    `sleep`:
    `for i in 1 2 3 4 5 6 7 8 9 10; do l=$(powershell -NoProfile -Command "[int](Get-CimInstance Win32_Processor | Measure-Object LoadPercentage -Average).Average"); [ "$l" -le 85 ] && break; sleep 60; done; echo cpu=$l`
  - `npx vitest run <the slice's test file>` (GB0 also runs `tests/tallowWharf/shell.test.ts`).
  - `npm run typecheck:fast`.
  - `npx eslint <the slice's files>`.
  - Never `npm run check`, a full `vitest run`, `npm run dev` / `preview`, or e2e.
- **Commit message** (the lead commits; agents never commit). The format is:
  ```
  mission-framework GB<n>: Tallow Wharf <section> greybox (<one line>)

  <what was built, the numbers used, deviations, tests run and their results>

  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```
- **Report:** a slice's report goes to `C:/NightShift/scratch/mission-gb<n>-report.md`: built, numbers, files,
  deviations, test results, open items. The final message is short.

### 0.5 Heights and the limits they must meet (all slices)
| Element | Section | Height (m over its approach floor) | Code limit |
| --- | --- | --- | --- |
| C1 boost lips, canal steps -> gallery and market -> gallery | W1 | 4.5 and 4.5 (graph 4.4 for the market lip: the gallery is one 4.5 floor; GBM re-measures) | `COOP_BAND` 4.3-4.5 |
| C2 fish hall shutter (reserved) | W1 | opening 3.0 w x 3.0 h, hold gap 0.9 | `SHUTTER.holdGap` 0.9 < crouch 1.15 |
| C3 walkway: west-pier boost, west-pier rope, east-lip pull | W2 | 4.5, 4.5, 4.5 | `COOP_BAND`; rope 2.2-6.0; `PULL` 4.3-4.5 |
| C4 lightwell throws (two) | W2 | gap 2.5, level (4.5 -> 4.5) | landing 3.2 +- 1 m, dy <= 1.0; thrower headroom >= 3.2 |
| C5 lane throw | W2 -> W3 | gap 2.5, level (8.4 -> 8.4) | as C4 |
| Lantern drop roof -> west-wing gallery | W3 | 4.2 drop | free (no fall damage) |
| C7 chute door boost | W3 | 4.4 | `COOP_BAND` |
| C7 hatch drop chute -> coal yard | W3 | 4.4 drop | free |
| C8 shed two shutter (reserved) | W4 | 3.0 x 3.0, gap 0.9 | as C2 |
| C9 clerestory boost | W4 | 4.4 | `COOP_BAND` |
| C10 jetty pull | W4 | 4.4 (canal bed -4.4 -> jetty 0) | `PULL` 4.3-4.5 |
| Ducts (secret routes) | all | interior 1.2 w x 1.5 h | crouch 1.15 < 1.5 |
| Drop guards | W3, W4 | 2.2 over the walking surface | > mantle 1.8, no lip |
| Parapets | roofs | 1.1 | LD 16.5.3 |

---

## GB0 - the shell (`tallowWharf` MapDef, kit, stubs, shared test helpers)

- **Model:** Sonnet. **Branch / folder:** `feature/mission-engine`, `C:/NightShift/Mobile-Coop-mission-engine`.
- **Guard line:** `cd /c/NightShift/Mobile-Coop-mission-engine && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-engine && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-engine"`
- **Step 1:** the lead's merge in 0.3. Check `docs/missions/prototypes/campaign-map/graph.json` is in the tree; stop
  if it is not.
- **Files owned:** `src/world/maps/tallowWharf.ts`; `src/world/maps/tallowWharfKit.ts` (new; PLAN's row lacks it: it
  holds the shared types and helpers so GB1-GB4 never touch `tallowWharf.ts`); stubs of
  `src/world/maps/tallowWharfW{1,2,3,4}.ts`, `src/world/maps/tallowWharfSectors.ts` and
  `src/world/maps/tallowWharfMissions.ts` (each later slice takes over its own); `src/world/maps/index.ts:20` (one
  entry); `tests/tallowWharf/shell.test.ts`; `tests/tallowWharf/helpers.ts`.

### Build
1. **`tallowWharfKit.ts`** (pure, Babylon only through `core/babylon`, `import type` where it can):
   - `WHARF_BOUNDS = { minX: 0, maxX: 120, minZ: 0, maxZ: 80 }`. `SECTION_BOX` copied from
     `meta.section_info`: W1 [0,6,40,62], W2 [40,48,76,80], W3 [82,34,120,80], W4 [44,0,120,34], as
     `[x0, z0, x1, z1]`. `SECTION_IDS = ['W1','W2','W3','W4'] as const` (section index 0-3, the sector order).
   - Heights: `Y = { ground: 0, loft: 4.5, roof: 8.4, gantry: 10, wingGallery: 4.2, chute: 4.4, canalBed: -4.4, boat: -1 }`.
     Constants `T = 0.3`, `OUTER = 0.6`, `DOOR_H = 2.1`, `PARAPET = 1.1`, `SCREEN = 2.2`, `MASS_TOP = 12`,
     `DUCT = { w: 1.2, h: 1.5 }`.
   - `GROUPS` ranges per section (0.4).
   - Types:
     ```ts
     export interface WharfThrow { id: string; link: string; thrower: { x: number; y: number; z: number }; runner: { x: number; y: number; z: number }; stage: [number, number, number, number]; }
     export interface WharfPull { id: string; link: string; holder: { x: number; y: number; z: number }; yaw: number; partner: { x: number; y: number; z: number }; }
     export interface WharfRope { id: string; link: string; holder: { x: number; y: number; z: number }; yaw: number; foot: { x: number; y: number; z: number }; }
     export interface DropGuard { id: string; a: { x: number; z: number }; b: { x: number; z: number }; y: number; h: number; }
     export interface WharfSection {
       id: 'W1' | 'W2' | 'W3' | 'W4';
       build(b: LevelBuilder): void;
       rooms: RoomDef[]; switches: NonNullable<MapLayout['switches']>; hideSpots: NonNullable<MapLayout['hideSpots']>;
       navSeeds: Vector3[];
       lips: readonly CoopLip[];           // ctcourseGreybox CoopLip: boost lips (floor = the approach floor y)
       legUps: readonly { lip: string; x: number; y: number; z: number; facing: { x: number; z: number } }[];
       pulls: readonly WharfPull[]; ropes: readonly WharfRope[]; throws: readonly WharfThrow[];
       shutters: readonly ShutterSpec[];   // reserved, data only (0.2)
       dropGuards: readonly DropGuard[];
       doors: Readonly<Record<string, readonly [number, number, number]>>;
       debugPoints: { id: string; label: string; pos: Vector3; yaw: number }[];
       deviations: readonly { space: string; why: string }[];
       entry: readonly [number, number, number]; exit: readonly [number, number, number];
     }
     ```
   - Helpers (copied, not imported from campusS2): `lamp(b, x, y, z, o)`, `wall(b, alongX, at, a, e, gaps, y0, y1, th)`
     (campusS2.ts:236-254, marks noLedge), `doorIn(b, alongX, at, c, y, { w = 1.2, h = 2.1 })`,
     `mass(b, x0, z0, x1, z1, y0 = 0, y1 = MASS_TOP)` (one noLedge collide box), `standIn(b, spec)` (the closed
     shutter panel: a collide noLedge box filling `spec.width` x `spec.height` in the opening, 0.1 thick; it records
     `shutter-standin:<id>` in an exported `STANDIN_TAGS` map of box index to tag),
     `duct(b, pts: [number, number][], y)` (a crouch duct along a polyline: floor slab, two walls, lid, interior
     1.2 x 1.5, all noLedge), `screen(b, g: DropGuard)` (a collide noLedge box 0.1 thick, `h` tall on `y`, a -> b).
2. **Stubs** `tallowWharfW1.ts` ... `W4.ts`: `export const W1: WharfSection = { id: 'W1', build: () => {}, ...empty
   arrays..., entry, exit }`. Use these entries and exits (they are the no-bypass test's ends):
   W1 (7, 0, 10) -> (38, 0, 60); W2 (42, 0, 55) -> (60, 8.4, 66); W3 (100, 8.4, 70) -> (90, 0, 36);
   W4 (90, 0, 32) -> (90, -1, 3).
   `tallowWharfSectors.ts` stub: `export const WHARF_SECTORS: SectorDef[] = [<one minimal section 'W1' with start at
   (7, 0, 10), an objective at (20, 0, 28), extract box [6, 6, 12, 14], guards [], reinforce [[20, 20]], perStage 0,
   routes []>]`. That keeps `mode=sector` bootable. `tallowWharfMissions.ts` stub:
   `export const WHARF_MISSIONS: MissionDef[] = []`.
3. **`tallowWharf.ts`:** `export const tallowWharf: MapDef`:
   - `id: 'tallowWharf'`, `name: 'Tallow Wharf'`, `description: 'A canal-side merchants\' quarter at night: the night
     market, the arcade lofts, the counting house and the wharf sheds.'`
   - `modes: ['sector']`, `sectors: WHARF_SECTORS`, `missions: WHARF_MISSIONS` (as `campusOps.ts:87-88`),
     `navLayers: 4`, `detail: false`.
   - `theme`: campusOps' night theme (`campusOps.ts:92-109`) with `faction: 'maritime'` and `fogEnd: 120`.
   - `build(b)`:
     - the ground: `b.floor(60, 43, 120, 74, GROUND, 0, 1)` (z 6-80, top y 0);
     - `b.perimeter(0, 120, 0, 80, MASS_TOP, ...)`;
     - the W1 canal barrier (x 0-44, z 0-6): a visible dark water box with its top at y -0.6, plus an invisible
       collide noLedge wall on z 6 from x 0 to 44, y 0-3. The W4 canal (x 44-120) is GB4's.
     - the masses between section boxes: x 0-40 z 62-80; x 40-44 z 0-48; x 44-82 z 34-48;
     - the arcade lane (x 76-82, z 48-80): its floor is the ground. Close it at z 48 with a wall x 76-82, 0-12, noLedge
       (the perimeter closes z 80). The lane's door into the arcade is GB2's.
     - then each section through `buildSection(b, index, W<n>.build, ranges)` (a copy of `campusOps.ts:60-67`: tags
       the doors it made with the section index);
     - the layout: `playerSpawns` [(7, 0, 10) yaw 0, (8.5, 0, 10) yaw 0] (W1 canal steps, TGC's start); `enemySpawns:
       []`; rooms, switches (`inSection`, `campusOps.ts:55-57`), hide spots and nav seeds concatenated from the four
       sections; `debugPoints` per section group `W<n>`; `alarms: []`; `reinforce` none (the sectors give theirs).
4. **`index.ts:20`:** add `tallowWharf` to `MAPS` after `ctcourse`. Do **not** add it to `LISTED_MAP_IDS`
   (`src/world/maps/listed.ts`: unlisted). Boot it with `?autostart=tallowWharf&mode=sector&mission=<id>`.
5. **`tests/tallowWharf/helpers.ts`** (shared, frozen after GB0):
   - `GRAPH` (JSON read from `../../docs/missions/prototypes/campaign-map/graph.json` via `readFileSync(new URL(...))`),
     `space(id)`, `spacesIn(section)`, `linksOf(kind)`.
   - `builtWharf()`: `new LevelBuilder()`, `tallowWharf.build(b, 0)`, cached. `solidOf(b)`: collide, unrotated boxes
     (`a1Gate.test.ts:40`).
   - `anchorsOf(b)`: `generateLedges(b.boxes, b.anchors)` (manual ledges included, `a2CarriageShed.test.ts:122`).
   - `legUpTarget(anchors, spot, facing)`: `findJumpTarget(anchors, { x, y: spot.y + TEAM.boostMax - 1.15, z }, -1,
     facing.x, facing.z, 1, 2.2, 0.2)` (`tests/ctcourse/a1Gate.test.ts:157-174`, `ctcourseGreybox.test.ts:125-126`).
   - `roomForBoost(solid, spot)`: no solid in the body band at +-`TEAM.roomSide` beside the spot, and nothing over it
     under `TEAM.roomUp` (`a1Gate.test.ts:171-173`).
   - `onPlannedLip(l, lips)` (`ctcourseGreybox.test.ts:105-118`).
   - `throwCheck(solid, t: WharfThrow)`. It runs `throwLanding(runner.x, runner.z, thrower.x, thrower.z, 0, out)`
     (`teamMoves.ts:208`) and returns `{ land, ok: throwLandingOk(...), floorY, head, arcClear, upClear }`. It
     replicates `TeamController.requestThrow` (`teamController.ts:939-960`): an analytic down-cast at the landing,
     head room over it, 8 legs of `throwArc` sampled at feet +0.3 and head +1.6. It also replicates `throwRoomUp`
     (`:927`): nothing solid from the thrower's y + 1.0 to y + 1.0 + `TEAM.throwUp`.
   - `pullCheck(solid, p: WharfPull)`. It checks `pullBand(holder.y - partner.y) === 'ok'` (`pullUp.ts`). Then it
     replicates `hangPoint` (`teamController.ts:609-640`) analytically: the plan ray at holder y + 0.5 is clear for
     0.4-1.0 m ahead, and a point there has no floor within `TEAM.hangDrop` below. The catch point is within
     `PULL.reach` 1.6 of the partner and within `TEAM.hangProbe` + 0.6 of the holder (`hangPointOk`).
   - `ropeCheck(solid, r)`: `ropeRoom(holder.y, foot.y) === 'ok'`, the foot within `TEAM.ropeReach` 2.0 of the holder
     in plan, and the same edge test as the pull.
   - `soloNav(b, layers, seeds, shut: { at: [number, number]; y: number; w: number; alongX: boolean }[])`:
     `runtimeNav(b, seeds[0], layers, seeds)` (`tests/helpers/runtimeNav.ts`; doors are open there), then every nav
     cell within 0.6 m of a listed door's plane, along its width, on its floor, gets `walk = 0` (the pattern of
     `campusS2.test.ts:722-735`). It returns the grid and a `restore()`.
   - Re-exports `soloJumpThreats` (`tests/helpers/soloJumpReach.ts:79`), `GREY_KEEP_CLEAR`, `COOP_BAND`.

### GB0 tests (`tests/tallowWharf/shell.test.ts`)
- `getMap('tallowWharf').id === 'tallowWharf'`; `isListedMap('tallowWharf') === false`; `modes` equals `['sector']`;
  `missions` and `sectors` are defined.
- `WHARF_BOUNDS` equals `GRAPH.meta.bounds`. Each `SECTION_BOX` equals `meta.section_info[W].box`. `SECTION_IDS`
  equals `meta.sections`.
- `build` runs without throwing. The perimeter pieces span 0-120 x 0-80. `playerSpawns[0]` lies inside
  `w1-canal-steps`' area.
- No GB0 mass or lane box intersects any graph space's `area` in plan, at a storey where that space is. Lane boxes at
  z 48 are allowed only on x 76-82.
- Every stub section exports `entry` and `exit`, and each lies inside its section box.
- Commands as 0.4, then also `npx vitest run tests/tallowWharf/` (the shell test only so far).

---

## GB1 - W1 night market (`tallowWharfW1.ts`)

- **Model:** Sonnet. **Branch / folder:** `feature/mission-gb1`, `C:/NightShift/Mobile-Coop-mission-gb1` (off the GB0 commit).
- **Guard line:** `cd /c/NightShift/Mobile-Coop-mission-gb1 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-gb1 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-gb1"`
- **Files owned:** `src/world/maps/tallowWharfW1.ts`; `tests/tallowWharf/w1.test.ts`. Read-only: the kit, helpers, the graph.

### Spaces (ids and areas from graph.json; y = storey)
| Id | Area [x0, z0, x1, z1] | y | Build |
| --- | --- | --- | --- |
| w1-canal-steps | [2, 6, 12, 14] | 0 | open landing; quay barrier is GB0's; x 0-2 z 6-14 is mass |
| w1-tea-stall | [12, 6, 20, 14.5] | 0 | awning posts at the 4 corners (0.15 sq, 2.6 tall, noLedge); counter x 13-19 z 13.5-14.2, h 1.0; urn crates x 18-19.6 z 6.6-8, h 2.0 (the dark nook between them and the canal rail) |
| w1-market | [6, 14, 36, 44] | 0 | open square (no roof). Stall row S: counter x 12-32 z 20-21, h 1.0; stall back wall x 12-32 z 22.85-23.15, h 2.4. Row N: back wall z 32.85-33.15, counter z 35-36. The aisle between the backs (z 23-33) is the dark aisle. Nothing over 0.3 m tall at x < 10.7 except the gallery |
| w1-gallery | [2, 14, 6, 46] | 4.5 | one solid deck block x 2-6 z 14-46, y 0-4.5, noLedge (the drain runs through it, below). No parapet |
| w1-warden-office | [0, 46, 8, 54] | 4.5 | floor slab top 4.5, noLedge; walls 4.5-7.5; ceiling slab 7.5-7.8; under it mass y 0-4.2 (except the core and the drain) |
| w1-fish-hall | [8, 44, 36, 58] | 0 | walls 0-6 (south wall z 44, north wall z 58, east wall x 36), roof slab 6.0-6.3, noLedge |
| w1-service-passage | [6, 58, 40, 62] | 0 | walls 0-3 (north z 62 is mass beyond), roof slab 3.0-3.2 noLedge; cross wall at x 36 with the connector's near door |

### Elements
- **C1 lip A, `w1-lip-steps`:** a manual ledge on the deck's south face z 14, from x 2.25 to 5.75, top 4.5, n (0, -1),
  floor 0. Leg-up spot (4, 0, 13.5) (deck face: `LEGUP_STANDOFF` 0.5), facing (0, 1).
- **C1 lip B, `w1-lip-market`:** a manual ledge on the deck's east face x 6, from z 26.5 to 31.5, top 4.5, n (1, 0),
  floor 0. Leg-up spot (6.5, 0, 29), facing (-1, 0).
- **Gallery -> office door:** (4, 4.5, 46) in the office's south wall (alongX at z 46), unlocked.
- **Warden's stair (bolted at its foot):** an enclosed core, walls x 6.2 and 7.8 z 44-52, 0-7.5. The flight runs inside
  x 6.35-7.65 from z 44.3 (y 0) to z 52 (y 4.5), with `stairSteps(4.5)` treads (27 x 0.167, run 0.285: 7.7 m). It
  arrives through a hole in the office slab at x 6.2-7.8 z 44.3-52. The foot door is in a wall alongX at z 44, centre
  x 7, opening onto the market: `doors['w1-warden-stair'] = [7, 0, 44]`. GB5 bolts it on side [0, 1]. The graph's
  link marker [12.5, 0, 39.5] moves here (deviation).
- **Inspection hatch:** an opening 1.2 w x 1.2 h, bottom at 4.5, in the office's east wall x 8, z 52.4-53.6. Beyond it
  is a straight 4.5 m drop into the fish hall's west bay. The office slab edge is noLedge.
- **Fish hall south wall (z 44):** the main arch, an opening x 20.25-23.75, 4.0 high. The side door at x 33
  (`doors['w1-hall-side'] = [33, 0, 44]`, unlocked).
- **Fish hall north wall (z 58), C2 shutter, reserved:** an opening x 20.5-23.5, y 0-3.0. Spec
  `{ id: 'w1-shutter', x: 22, y: 0, z: 58, yaw: 0, width: 3, height: 3 }` (the plane's normal points +z, toward the
  passage). Fill it with `standIn`. Keep 0.7 m clear on both sides: no box within z 57.0-59.0 at x 20.5-23.5 except the
  wall and the stand-in.
- **Fish hall back door:** x 30 in the z 58 wall: `doors['w1-hall-back'] = [30, 0, 58]`. GB5 bolts it on side [0, 1]
  (the passage).
- **Ice-melt drain (secret duct `w1-canal-steps -> w1-fish-hall`):** `duct(b, [[3, 14], [3, 53], [8, 53]], 0)`. It
  runs north through the gallery block (build the block as pieces around the duct: x 2-2.4, x 3.6-6, and y 1.5-4.5 over
  x 2.4-3.6), then under the office's mass, and out through the fish hall's west wall x 8 at z 52.4-53.6. Its mouth is
  on the deck's south face at x 2.4-3.6, which is not inside the leg-up room (spot x 4 +- 1.0 only needs body
  clearance; an opening is clear).
- **Connector cross wall:** a wall alongZ at x 36 in the passage (z 58-62, 0-3) with a door at z 60:
  `doors['w1-conn-near'] = [36, 0, 60]`, unlocked. The east end of the passage meets the arcade at x 40 through a
  3.0 w x 3.0 h opening at z 58.5-61.5 (GB2 builds the arcade's west wall at x 40 with this opening).
- **Masses (W1 box):** x 0-2 z 6-14; x 0-2 z 14-46 (west of the gallery); x 0-6.2 z 44-46 y 0-4.5 (under the office's
  south strip) and x 0-8 z 46-54 y 0-4.2 (under the office, minus the core and the drain); x 0-6 z 54-62; x 20-40 z 6-14
  (east of the tea stall); x 36-40 z 14-58 (east of the market and the hall).

### Lights (SPEC W1 notes)
| Group | Lamps (x, y, z), r, i | Switch (pos, yaw) | Note |
| --- | --- | --- | --- |
| 60 market row S | (14,3.0,19), (20,3.0,19), (26,3.0,19), (32,3.0,19); r 8, i 0.9, warm | (11.5, 0, 20.5), yaw -PI/2 | row-end switch |
| 61 market row N | (14,3.0,37), (20,3.0,37), (26,3.0,37), (32,3.0,37); r 8, i 0.9 | (11.5, 0, 35.5), yaw -PI/2 | row-end switch |
| 62 fish hall pendants | (14,5.4,51), (22,5.4,51), (30,5.4,51); r 9, i 1.0 | (24.4, 0, 44.6), yaw 0 | arch switch; west bay x 8-12 stays dark |
| 63 warden desk lamp | (3, 5.4, 50); r 5, i 0.8 | (5.2, 4.5, 46.6), yaw 0 | by the gallery door |
| 64 tea stall paraffin | (16, 2.4, 12); r 6, i 0.8 | (13, 0, 13.3), yaw 0 | "turned down by hand" |
| 65 canal lamp (photocell) | (7, 3.5, 6.4); r 6, i 0.7 | none | the top step at z 14 stays dark |
| 66 fish hall clock face | (22, 7.5, 43.6); r 6, i 0.6; `destructible: false`, `electric: false` | none | landmark (clockwork) |
| 67 passage bulkhead | (38, 2.6, 60); r 5, i 0.5 | none | quiet connector |
The gallery and the market's stall-back aisle have no lamps (dark). Made dark: the row switches, the arch switch, and
shooting lamps (destructible by default).

### Data exports
- `rooms`: the seven spaces (y bands: a ground space has `maxY` 4.4; the gallery and the office have `minY` 4.5).
- `navSeeds`: (7,0,10), (20,0,28), (4,4.5,30), (3,4.5,50), (20,0,51), (20,0,60), (38,0,60).
- `hideSpots`: behind row S's back wall (20, 0, 23.6); the hall's west bay (9.5, 0, 46).
- `debugPoints`: the start, both leg-up spots, the shutter (22, 0, 57.2), the passage end (38, 0, 60).
- `lips`: A and B. `legUps`: their spots. `shutters`: `w1-shutter`. `dropGuards`: none.
- `deviations`: `w1-warden-office` (the stair core at x 6.2-7.8 z 44-52; the link marker moved);
  `w1-gallery` (the market lip is 4.5, the graph says 4.4).

### Tests (`tests/tallowWharf/w1.test.ts`)
1. **Sizes vs the graph:** for every graph space with `section: 'W1'`, a room with that id exists. Its plan box equals
   the `area` within 0.01, and its `minY` equals the `storey` (0 for ground spaces). There are 7 rooms.
2. **Boost lips:** each lip's `y - floor` is within `COOP_BAND` (4.3-4.5). `legUpTarget` from its spot finds a ledge
   with `canClimbUp`, `top` equal to the lip's y within 1e-6, and the normal facing the spot side (dot with `n` > 0.99).
   `roomForBoost` is clear at the spot.
3. **No solo jump onto a lip:** `soloJumpThreats(solidOf(b), lip)` is `[]` for both lips.
4. **Only planned lips:** every generated or manual ledge in the W1 box with `canHang`, a top between
   `WALL_JUMP.maxUp` and `TEAM.boostMax + 0.05`, and a drop >= 1.9 lies on a planned lip (`onPlannedLip`).
5. **No solo bypass:** run `soloNav(b, 4, W1.navSeeds, shut)` with `shut` = the warden-stair foot door, the hall back
   door and the connector near door. `findPath([7,10], [38,60], 1e6, 0, 0)` is null (the shutter stand-in is solid).
   Control: `findPath([20,51], [34,60], 1e6, 0, 0)` is not null with the back door left out of `shut` (so it is the
   bolt that blocks).
6. **The shutter reservation:** `shutters` has one spec equal to the one above. The opening's stand-in box exists
   (tag `shutter-standin:w1-shutter`, collide, noLedge, covering 3 x 3). There is no `placeShutter` in the file:
   `readFileSync` of the source does not contain the string `placeShutter(`.
7. **Lights:** every switch's group has at least one lamp. Groups 65, 66 and 67 have no switch. Every lamp group in
   the W1 box is within 60-67. Group 66 is not destructible.

---

## GB2 - W2 arcade lofts (`tallowWharfW2.ts`)

- **Model:** Sonnet. **Branch / folder:** `feature/mission-gb2`, `C:/NightShift/Mobile-Coop-mission-gb2`.
- **Guard line:** `cd /c/NightShift/Mobile-Coop-mission-gb2 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-gb2 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-gb2"`
- **Files owned:** `src/world/maps/tallowWharfW2.ts`; `tests/tallowWharf/w2.test.ts`.

### Spaces
| Id | Area | y | Build |
| --- | --- | --- | --- |
| w2-arcade | [40, 48, 76, 62] | 0 | walls 0-7.5 (west x 40 with the 3 x 3 opening at z 58.5-61.5 from W1; south z 48; east x 76 with the lane door); glazed roof slab 7.5-7.7 over z 48-59 (collide, `glass` if the builder marks it, noLedge). The walkway's floor slab covers z 59-62 |
| w2-walkway | [44, 59, 76, 62] | 4.5 | see C3 below |
| w2-pie-shop | [56, 62, 66, 70] | 0 | ground shop unit, walls 0-4.2, ceiling = the pie loft slab (4.2-4.5) |
| w2-pie-loft | [56, 62, 66, 70] | 4.5 | slab 4.2-4.5; walls 4.5-8.1; **no ceiling** (open to the roof slab 8.1-8.4: 3.6 m clear for the throw) |
| w2-pawn-loft | [44, 62, 54, 70] | 4.5 | as the pie loft; below it (y 0-4.2) mass except the pawn stair core |
| w2-lane-window | [68, 62, 76, 70] | 4.5 | as the pie loft; below it mass |
| w2-reading-room | [44, 73.5, 60, 80] | 4.5 | slab 4.2-4.5, walls 4.5-7.5, roof slab 7.5-7.8; below it mass |
| w2-clock-loft | [60, 73.5, 70, 80] | 4.5 | as the reading room; dark |
| w2-arcade-roof | [44, 62, 76, 70] | 8.4 | lead flat (the roof slab 8.1-8.4 over the three south lofts and x 54-56 and x 66-68); 1.1 parapets on z 70 and x 44; on x 76 a parapet with a break at z 64.5-67.5 |

Also: the **stair hall** x 54-56 z 62-73.5 (part of the link `w2-arcade -> w2-reading-room`; not a space). It has walls
0-7.8 and a flight 1.7 wide, `stairSteps(4.5)`, from z 62.3 (y 0, a door from the arcade at (55, 0, 62)) north to
z 70.0 (y 4.5). Then an enclosed landing z 70-73.5 at y 4.5 crosses the lightwell to a door into the reading room at
(55, 4.5, 73.5). Below the landing (y 0-4.2) is mass. The **party wall** x 66-68 z 62-70 is mass y 0-8.4, with an inner
door passage at z 66 for y 4.5-6.6 (`w2-pie-loft -> w2-lane-window`, a 1.2 x 2.1 opening through 2 m). The
**lightwell** x 44-70 z 70-73.5 is open to the sky, with its floor at y 0. Its way out is a door into the pie shop at
(61, 0, 70) (unlocked: a fall-in is never a softlock). The **corner** x 70-76 z 70-80 is mass to 8.4.

### C3: the walkway (choke), boost + rope at the west pier, pull at the east lip
- **West pier:** a solid block x 44-48 z 59-62, y 0-4.5, noLedge. Its top is the walkway floor.
- **East fascia:** a solid block x 71-76 z 59-62, y 0-4.5, noLedge.
- **Walkway slab:** x 48-71 z 59-62, 4.2-4.5, noLedge, on posts 0.3 x 0.3 at x 52, 56, 60, 64, 68 (z 59.15), y 0-4.2,
  noLedge.
- **Balustrade:** 1.1 tall, 0.1 thick, noLedge, on z 59.05 along x 44-45, 47-72.5 and 74.5-76. The two gaps are the
  only open edges.
- **Boost lip `w2-lip-pier`:** a manual ledge on the pier's south face z 59, x 45.25-46.75, top 4.5, n (0, -1),
  floor 0. Leg-up spot (46, 0, 58.5) (deck face, 0.5), facing (0, 1).
- **Rope `w2-rope-pier`:** holder (46, 4.5, 59.35), yaw PI (facing -z, over the gap); foot (46, 0, 58.4).
  `ropeRoom(4.5, 0)` is 'ok'.
- **Pull `w2-pull-east`:** holder (73.5, 4.5, 59.35), yaw PI; partner (73.5, 0, 58.3). Band 4.5 'ok'. The edge ahead
  is open (balustrade gap x 72.5-74.5).
- **Doors onto the walkway** (y 4.5, in the loft row's south wall z 62): pawn loft (49, 4.5, 62); pie loft
  (61, 4.5, 62), propped open (unlocked); lane window (72, 4.5, 62). All unlocked.
- **Keep-clear in the arcade:** nothing over 0.3 m tall within 4.7 m of the two edges (x 40.5-51.5 and x 67.8-79 for
  z 54.3-59). The coal bunker and the shop fronts stay outside that.
- **Drop link walkway -> arcade:** anywhere over the balustrade (it can be mantled at 1.1). Nothing to build.

### Ground floor of the arcade
- Pie shop door: (61, 0, 62), unlocked. **Coal bunker:** x 62.5-64.5 z 59.6-62, h 2.0, noLedge.
  **Cellar coal passage (secret duct):** `duct(b, [[63.6, 59.6], [63.6, 63.2]], 0)`, through the wall z 62 into the pie
  shop.
- **Pawn fire stair:** core x 52.2-53.8 z 62.2-69.9. The foot door from the arcade is at (53, 0, 62), unlocked. The
  flight is `stairSteps(4.5)` north. The top door is in the core's west face x 52.2 at z 69 (y 4.5):
  `doors['w2-pawn-stair-top'] = [52.2, 4.5, 69]`. GB5 bolts it on side [-1, 0] (the loft side; it has a push bar).
  The graph marker [49, 0, 62] moves (deviation).
- **Pie shop back stair:** core x 56.2-57.8 z 62.2-69.9, its foot inside the pie shop. The top door is in the core's
  east face x 57.8 at z 69 (y 4.5): `doors['w2-pie-stair-top'] = [57.8, 4.5, 69]`. GB5 bolts it on side [1, 0].
- **Lane door:** (76, 0, 55) in the arcade's east wall, unlocked. It is the way out of the lane for anyone who falls in.
- **Shop fronts** along z 48.3 (0.6 deep, h 3.0, noLedge), x 41-75. Gaps by the 4.7 m keep-clear do not apply here
  (they are over 10 m from the lips).

### C4: the lightwell throws (thrower inside the south loft, landing on the north lofts' iron stage)
- **Taking-in doors** in the south lofts' north wall (z 70, `T` 0.2 here: inner face 69.9): an opening 2.0 wide from
  y 4.5 to the roof slab underside 8.1 (3.6 tall), a door leaf 2.0 x 3.6.
  - pawn loft x 49.5-51.5: `doors['w2-pawn-taking-in'] = [50.5, 4.5, 70]`, bolted by GB5 on side [0, -1];
  - pie loft x 62-64: `doors['w2-pie-taking-in'] = [63, 4.5, 70]`, bolted on side [0, -1].
  No sill outside the doors: the wall face is flush and noLedge.
- **Stages** (iron landing stages, slab top 4.5, 0.2 thick, noLedge): `w2-stage-reading` x 49-52 z 72.5-73.5;
  `w2-stage-clock` x 61.5-64.5 z 72.5-73.5. The gap from the door plane z 70 to the stage edge z 72.5 is 2.5 m.
- **Doors from the stages:** the reading room door (50.5, 4.5, 73.5); the clock loft's taking-in door (63, 4.5, 73.5).
  Both unlocked.
- **Throws** (`throws`):
  - `w2-throw-pawn` (link `w2-pawn-loft -> w2-reading-room`): thrower (50.5, 4.5, 69.6), runner (50.5, 4.5, 68.3),
    stage [49, 72.5, 52, 73.5];
  - `w2-throw-pie` (link `w2-pie-loft -> w2-clock-loft`): thrower (63, 4.5, 69.6), runner (63, 4.5, 68.3),
    stage [61.5, 72.5, 64.5, 73.5].
  Landing z = 69.6 + 3.2 = 72.8, which leaves 0.3 m (the body radius) on the stage.
- **Clock loft door off the reading-room landing:** in the wall x 60 at z 76.75 (y 4.5):
  `doors['w2-clock-door'] = [60, 4.5, 76.75]`. GB5 bolts it on side [1, 0] (the mender's side).

### C5 (the W2 side): the lane throw and the bridge
- **Old bridge landing:** a lead flat x 76-79.5 z 64.5-67.5, top 8.4 (slab 8.1-8.4 on a noLedge corbel block down to
  y 6.0). No parapet on its east edge. Its north and south edges get a 1.1 parapet.
- **Throw `w2-throw-lane`** (link `w2-arcade-roof -> w3-roof`): thrower (79.2, 8.4, 66), runner (77.6, 8.4, 66),
  stage [82, 64.5, 86.5, 67.5] (W3's corner-bay roof, built by GB3). Landing x = 82.4.
- **Fire-escape bridge (W2 half):** a deck x 76-82 z 68.6-69.8, top 8.4 (0.3 slab), with railings 1.1 noLedge on both
  long sides. The roof-side end at x 76 is open. The door at the x 82 end is GB3's.
- **Hatch to the roof:** an opening x 71.4-72.6 z 65.4-66.6 in the lane-window loft's roof slab. Under it,
  `b.ladder(72, 65.3, 4.5, 8.4, 0)` (a fixed loft ladder, facing +z). The dormer window (link `window`) uses the same
  opening (deviation: one opening for both links).

### Lights
| Group | Lamps, r, i | Switch | Note |
| --- | --- | --- | --- |
| 70 arcade pendants | (46,6.5,53), (54,6.5,53), (62,6.5,53), (70,6.5,53); r 10, i 1.1 | (41, 0, 57.4), yaw PI/2 (west arch) | the NW bay under the walkway, x 40-56 z 57-62, is the dark part |
| 71 pie shop window | (60, 2.6, 63.2); r 5, i 0.8 | (64.6, 0, 64), yaw -PI/2 | behind the counter |
| 72 pie loft | (61, 7.0, 66); r 5, i 0.8 | (58.4, 4.5, 68.8), yaw PI/2 | stair-head switch; the lit window over the walkway |
| 73 pawn loft desk | (52.5, 5.6, 63.5); r 4, i 0.7 | (50.2, 4.5, 62.6), yaw 0 | |
| 74 Teale's table lamp | (51, 5.4, 74.6); r 4, i 0.8 | (51.8, 4.5, 74.3), yaw 0 | |
| 75 reader's lamp | (47, 5.4, 78.6); r 4, i 0.7 | (47.8, 4.5, 78.8), yaw PI | |
| 76 reading-room landing | (55, 7.2, 72); r 6, i 0.8 | (55.8, 4.5, 72.4), yaw -PI/2 | landing switch |
The walkway, the lane-window loft, the clock loft, the arcade roof and the stacks (x 56-60) are dark.

### Data exports
- `rooms`: the nine spaces.
- `navSeeds`: (58,0,55), (60,4.5,60.5), (46,4.5,66), (60,4.5,66), (72,4.5,66), (60,8.4,66), (52,4.5,77),
  (65,4.5,77), (60,0,71.7), (61,0,66), (79,0,60), (78,8.4,66).
- `hideSpots`: (60, 4.5, 79) (the stacks); (42, 0, 61) (the NW bay).
- `lips`: `w2-lip-pier`. `pulls`: `w2-pull-east`. `ropes`: `w2-rope-pier`. `throws`: the three above.
- `dropGuards`: none. `shutters`: none.
- `deviations`: the pawn stair (marker moved); the stair hall and the party wall (not spaces); the dormer window
  shares the hatch opening; the boost / rope / pull positions split from the graph's single marker [60, 0, 60.5]
  (west pier x 46, east lip x 73.5).

### Tests (`tests/tallowWharf/w2.test.ts`)
1. **Sizes:** 9 rooms, each matching its graph `area` (+-0.01) and storey.
2. **Boost:** the `w2-lip-pier` leg-up as in GB1 test 2 (band, target, `roomForBoost`).
3. **Pull:** `pullCheck` is ok for `w2-pull-east`: band 'ok' (4.5), an open edge, the catch point in reach.
4. **Rope:** `ropeCheck` is ok for `w2-rope-pier` (4.5 within 2.2-6.0).
5. **Throws:** for each of the three, `throwCheck` gives `ok === true` (`throwLandingOk`); the floor at the landing
   within `throwDrop`; head room >= 1.2; `arcClear`; `upClear` (3.2 m over the thrower). The landing is at least 0.3 m
   inside the stage box (the lane throw: `land.x - 0.3 >= 82 - 1e-6`).
6. **No solo jump onto C3's lips:** `soloJumpThreats` is `[]` for the pier lip and for the pull edge (as a grip at y
   4.5 along x 72.5-74.5, n (0, -1)).
7. **Only planned lips** in the W2 box at band height: the pier lip only (the pull edge needs no ledge; the stages, the
   walkway slab and the taking-in walls give none).
8. **No solo bypass:** `soloNav` with `shut` = the pawn stair top, the pie stair top, both taking-in doors and the
   clock door. `findPath` from (42, 55, y 0) to the arcade roof (60, 66, y 8.4) is null. Also, from the reading room
   (52, 77, y 4.5) to the pawn loft (46, 66, y 4.5) is null. Control: from the walkway (60, 60.5, 4.5) to the arcade
   roof is not null (the ladder leg is skipped: test the walkway -> lane-window loft leg, then assert the hatch opening
   and the ladder anchor exist).
9. **Reverse lightwell jump closed:** each taking-in door anchor exists, with width 2.0 and height 3.6, and no
   collide box outside the door plane (z 70-70.6, door x range, y 4.3-4.7) gives a standable top.
10. **Lights:** as GB1 test 7, with groups 70-76.

---

## GB3 - W3 counting house (`tallowWharfW3.ts`)

- **Model:** Sonnet. **Branch / folder:** `feature/mission-gb3`, `C:/NightShift/Mobile-Coop-mission-gb3`.
- **Guard line:** `cd /c/NightShift/Mobile-Coop-mission-gb3 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-gb3 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-gb3"`
- **Files owned:** `src/world/maps/tallowWharfW3.ts`; `tests/tallowWharf/w3.test.ts`.

### Spaces
| Id | Area | y | Build |
| --- | --- | --- | --- |
| w3-roof | [82, 52, 120, 80] | 8.4 | roof slab 8.1-8.4 over the whole box, except the lantern and the bulkhead. Parapet 1.1 on x 82 (break z 64.5-67.5 for the throw; the bridge door frame at z 68.6-69.8), z 80 and x 120. On z 52: a **drop guard** over x 82-98 (above the coal yard), a 1.1 parapet over x 98-120 except the fire-escape head (x 106.3-107.6) |
| w3-east-yard | [100, 38, 114, 52] | 0 | open; yard walls on x 100 (z 38-52) and z 38 (x 100-114): 6.0 tall, noLedge |
| w3-lodge | [114, 44, 120, 52] | 0 | walls 0-3, roof 3-3.3 noLedge (its roof under the main roof's parapet; nothing reaches it) |
| w3-east-wing | [106, 52, 120, 74] | 0 | walls 0-8.1 (south wall z 52 `OUTER` 0.6), ceiling slab 3.3-3.6, void sealed above (mass 3.6-8.1) |
| w3-partners-office | [113, 74, 120, 78] | 0 | walls 0-3.3, ceiling |
| w3-east-post | [106, 74, 112, 78] | 0 | alcove; 3 m arch from the wing at (109, 0, 74) |
| w3-passage | [96, 52, 106, 55.5] | 0 | walls 0-6.0 (tall: the chute door is 4.4 up); the south wall z 52 is `OUTER` 0.6 (z 51.7-52.3); ceiling 6.0-6.3 |
| w3-strongroom | [98, 56, 104, 64] | 0 | walls 0-3.3, ceiling; dark |
| w3-west-wing | [82, 52, 96, 74] | 0 | walls 0-8.1, **open to the roof slab** (the light well); the iron gallery at 4.2 (below) |
| w3-west-post | [85, 74, 91, 78] | 0 | alcove; arch at (88, 0, 74) |
| w3-chute | see C7 | 4.4 | deviation (0.1 question 5) |
| w3-coal-yard | [82, 38, 98, 52] | 0 | open; walls x 82 and x 98 (z 38-52) 6.0 noLedge; south wall z 38 with the cart gate |
| w3-cartway | [88, 34, 92, 38] | 0 | graph [88, 34, 92, 40] overlaps the coal yard at z 38-40 (deviation); walls x 88, x 92, 0-3; roof 3-3.3; opening at z 34 (x 88.5-91.5, 3 high) onto the W4 lane |

**Front hall** x 96-106 z 64-72 (not a space; the link `w3-east-wing -> w3-west-wing`): walls 0-3.3 and a ceiling. Its
west end has double doors (96, 0, 68), width 2.0, unlocked. Its east end opens to the east wing through a 3 m opening at
z 66.5-69.5. **Masses:** x 96-98 and x 104-106 z 55.5-64; x 96-106 z 72-80 (the heating duct runs through it); x 91-106
z 74-80 and x 82-85 z 74-80 (between the posts); x 112-113 z 74-78; x 106-120 z 78-80; x 98-100 z 34-52; x 114-120
z 34-44; x 100-114 z 34-38; x 82-88 and x 92-98 z 34-38; under the roof and above the low ceilings, y 3.6-8.1.

### Roof elements
- **Corner bay (the throw's landing):** the roof's corner x 82-86.5 z 64.5-67.5 is a plain part of the roof slab
  (y 8.4), with no parapet at x 82 there.
- **Bridge door:** a frame wall x 82 z 68.3-70.1, y 8.4-11.0, noLedge, with a door at z 69.2:
  `doors['w3-bridge'] = [82, 8.4, 69.2]`. GB5 bolts it on side [1, 0] (it opens from the counting-house side).
- **Lantern (the drop to the west wing):** a roof opening x 87-91 z 61-65. A glazed upstand 1.0 tall, noLedge, runs
  round it, except an opening sash on its south side at x 88.4-89.6 (z 61). Through it, the drop is 4.2 m onto the
  gallery.
- **West-wing gallery (y 4.2):** a ring slab x 86-92 z 60-66 (0.2 thick) with a hole x 87.5-90.5 z 61.5-64.5. A 1.1
  rail runs on the hole's edge (noLedge) and on the ring's outer edges except at the stair head. **Stair down:** a
  flight 1.2 wide at x 84.4-85.6 from z 66 (y 4.2) south to z 58.8 (y 0), `stairSteps(4.2)` (25 risers). A link slab at
  y 4.2 joins x 85.6-86 z 65-66.
- **Bulkhead stair (roof -> east wing):** a core x 112.4-115.2 z 58.6-69.4, walls 0-10.6 (the bulkhead stands 2.2
  over the roof), lid. A switchback of two `stairSteps(4.2)` flights with landings at 0, 4.2 and 8.4, near end north.
  The roof door is in the core's west face x 112.4 at z 68, y 8.4. The east-wing door is in the core's west face at
  z 60, y 0. Both unlocked.
- **Fire escape (roof -> east yard), external iron stair:** in the band z 49.4-52 against the yard face. The head
  landing x 106.3-107.6 z 50.7-52 is at y 8.4, reached through the parapet gap. Flight A (`stairSteps(4.2)`, 1.3 wide,
  z 50.7-52) runs west from x 106.3 down to a half landing x 100.2-101.5 z 49.4-52 at y 4.2. Flight B (z 49.4-50.7)
  runs east from x 101.5 down to y 0 at x 108.7. Everything is noLedge, and no top within 4.7 m of a co-op lip (none
  here).
- **Turret clock:** a noLedge box x 99-103 z 64-68 from 8.4 to 12, with the face lamp (group 90).

### C7: the chute (vent unlock)
- **Chute door:** an opening in the passage's south wall (z 51.7-52.3), x 96.5-97.7, from y 4.4 to 5.9. The wall below
  it (y 0-4.4, 0.6 thick) carries the **planned lip `w3-lip-chute`**: a generated face lip at top 4.4 along x
  96.75-97.45, n (0, 1) (into the passage), floor 0. Climb-up depth 0.6 is over `LEDGE.climbDepth` 0.38. Every other
  piece of that wall is noLedge (mark the pieces either side of x 96.5-97.7 and the head over the opening). Leg-up spot
  (97.1, 0, 53.2) (wall face 52.3 + `WALL_STANDOFF` 0.9), facing (0, -1).
- **Chute duct:** floor slab top 4.4, interior x 96.5-97.7 z 50.0-52.3, 1.5 high (4.4-5.9), walls and lid noLedge,
  standing out over the coal yard on a noLedge corbel. Room: `w3-chute`, box [96.5, 50.0, 97.7, 52.3], `minY` 4.4.
- **Yard hatch (the bolted end):** a door in the duct's south end wall z 50.0, 1.2 wide x 1.5 tall, bottom 4.4:
  `doors['w3-chute-hatch'] = [97.1, 4.4, 50.0]`. GB5 bolts it on side [0, 1] (the chute side). Beyond it is a 4.4 m drop
  to the coal yard.
- **Coal yard door:** in the passage's south wall at x 99.5, y 0: `doors['w3-coalyard-door'] = [99.5, 0, 52]`. GB5
  bolts it on side [0, -1] (the yard side: the one out of the chute lifts the bar).
- **Keep-clear in the passage:** nothing over 0.3 m tall within 4.7 m of the lip on the passage side. The strongroom
  door at (101, 0, 55.5) is a door, not a top.

### Other doors, the keypad gate and the ducts
- **Passage doors:** east (106, 0, 53.75) and west (96, 0, 53.75), both unlocked.
- **Strongroom door:** (101, 0, 55.5), in the passage's north wall: `doors['w3-strongroom'] = [101, 0, 55.5]` (GB5's
  pair gate).
- **Key posts' key switch points** (for GB5): east (109, 0, 76.4), west (88, 0, 76.4). They are 21 m apart, and the
  front-hall walls stand between them (no line of sight).
- **East gate (keypad):** (112, 0, 52) in the wing's south wall: `doors['w3-east-gate'] = [112, 0, 52]`. **Sash
  window:** an opening x 108.2-109.4 z 52, sill 1.0, head 2.2, open (latched).
- **Lodge:** yard door (114, 0, 48), inner door (117, 0, 52), both unlocked. **Partners' office** door
  (116.5, 0, 74), unlocked.
- **Old coal hole (secret duct, passage -> east yard):** `duct(b, [[104.5, 52.3], [104.5, 49.2]], 0)`, through the
  south wall and out under the fire escape's half landing.
- **Heating duct (secret, east wing -> west wing):** `duct(b, [[106, 73.2], [96, 73.2]], 0)`, through the mass behind
  the front hall. Its mouths are in the wings' walls.
- **Cart gate (coal yard -> cartway, wall z 38):** a roller door 1.8 wide (`leaf: 'slide'`, x 88.5-90.3, unlocked) and a
  wicket 1.2 (x 90.3-91.5): `doors['w3-conn-near'] = [90.9, 0, 38]`, the W3 connector's near door.
- **Coal bays:** x 83-87 z 39-44 and x 83-87 z 45-50, h 2.0, noLedge, 4.7 m clear of the chute lip's approach (the lip
  faces the passage, so the yard is its far side; keep the bays anyway).

### Drop guards (`dropGuards`)
- `w3-dg-coalyard`: a (82, 52) -> b (98, 52), y 8.4, h 2.2 (the roof edge over the coal yard, replacing the parapet).
- `w3-dg-cartway`: none needed (the cartway is roofed and under the coal yard's south wall).

### Lights
| Group | Lamps, r, i | Switch | Note |
| --- | --- | --- | --- |
| 80 gate lamp | (112, 3.0, 51.6); r 7, i 1.0 | (115, 0, 51.4) in the lodge | the wall line west of x 109.4 stays dark |
| 81 lodge lamp | (117, 2.6, 48); r 5, i 0.7; `on: false` | (118.6, 0, 46), yaw -PI/2 | "comes on at the twist" (the SPEC says both: starts off; GB5 / a Guard AI event turns it on) |
| 82, 83 east-wing desk lamps | (110,1.2,58), (116,1.2,58); r 4, i 0.7 | on each desk (110.6,0,57.4), (116.6,0,57.4) | each switched |
| 84 front-hall pendant | (101, 2.9, 68), (107.5, 2.9, 68); r 8, i 1.0 | (100.6, 0, 64.6), yaw 0 | the front-hall switch; press aisles dark |
| 85 west-wing copying desk | (90, 1.2, 56); r 4, i 0.7 | (90.6, 0, 55.4) | stacks x 82-86 dark |
| 86 lantern moonlight | (89, 7.8, 63); r 8, i 0.4, cool; `destructible: false`, `electric: false` | none | |
| 87 partners' office | (117, 1.2, 76.5); r 3.5, i 0.8, warm | (115.8, 0, 74.6) | |
| 88 passage bulkhead | (101, 2.7, 53.75); r 5, i 0.5; `destructible: false` | none | vandal cage, emergency circuit |
| 89 photocell lamps | coal-yard gate (90, 3.6, 38.6); cartway mouth (90, 2.6, 34.6); r 6, i 0.7 | none | coal bays dark |
| 90 turret clock face | (101, 11, 66); r 6, i 0.5; `destructible: false`, `electric: false` | none | landmark |

### Data exports
- `rooms`: the 13 graph spaces (the chute with its deviation box) plus the front hall (`w3-front-hall`, marked
  non-graph).
- `navSeeds`: (100,8.4,70), (106,0,44), (117,0,48), (112,0,62), (88,0,58), (89,4.2,60.6), (101,0,53.75),
  (101,0,60), (90,0,46), (90,0,36), (109,0,76), (88,0,76), (117,0,76), (101,0,68).
- `hideSpots`: (84, 0, 72) (west stacks), (85, 0, 44) (the coal bays).
- `lips`: `w3-lip-chute`. `legUps`: its spot. `dropGuards`: `w3-dg-coalyard`. `shutters`: none.
- `debugPoints`: the bulkhead head (111.4, 8.4, 68), the corner bay (84, 8.4, 66), the chute spot, the coal yard, the
  cartway.
- `deviations`: the chute (floor 4.4 not 2.2, box z 50.0-52.3 not 50-56); the cartway (z 34-38); the front hall
  (non-graph); the fire escape's marker [107, 8.4, 52] is its head.

### Tests (`tests/tallowWharf/w3.test.ts`)
1. **Sizes:** each W3 graph space has a room. Its box equals the graph area, except the two listed deviations, which
   equal the brief's boxes.
2. **Chute boost:** the lip is 4.4, within `COOP_BAND`. `legUpTarget` from (97.1, 0, 53.2) facing (0, -1) finds a
   ledge with `canClimbUp`, top 4.4 and `nz` > 0.99. `roomForBoost` is clear. The chute interior is >= 1.5 high (crouch
   1.15 fits).
3. **No solo jump onto the chute lip:** `soloJumpThreats` is `[]`.
4. **Only planned lips** in the W3 box at band height: the chute lip only. The yard walls (6.0), the parapets (a lip at
   9.5 is not in the band) and the stair pieces give none in the band.
5. **Lantern:** an analytic down-cast at (89, 8.5, 60.8) (through the sash) hits a surface at 4.2 +- 0.05 (the ring).
   The ring connects to the hall floor on the nav grid (`findPath` (89, 60.6, y 4.2) -> (88, 58, y 0) not null).
6. **No solo bypass:** `soloNav` with `shut` = the chute hatch, the coal-yard door, the strongroom door, the east gate
   (keypad), the bridge door and the connector near door. `findPath` from (100, 70, y 8.4) to (90, 36, y 0) is null.
   Control: (90, 46) -> (90, 36) is not null once the connector near door is dropped from `shut`.
7. **Drops cannot skip C7:** the drop guard `w3-dg-coalyard` exists as collide noLedge boxes covering x 82-98 at z 52,
   y 8.4-10.6. No walkable top over y 1.5 lies above the coal yard's area except the chute duct (whose only exit is the
   bolted hatch).
8. **Pair-gate geometry:** the two key points are 21 m apart (+-0.5). A plan segment between them crosses at least one
   collide box taller than 2 m.
9. **Lights:** as GB1, groups 80-90. Groups 86, 88, 89 and 90 have no switch. Group 81 starts off.

---

## GB4 - W4 wharf sheds (`tallowWharfW4.ts`)

- **Model:** Sonnet. **Branch / folder:** `feature/mission-gb4`, `C:/NightShift/Mobile-Coop-mission-gb4`.
- **Guard line:** `cd /c/NightShift/Mobile-Coop-mission-gb4 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-gb4 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-gb4"`
- **Files owned:** `src/world/maps/tallowWharfW4.ts`; `tests/tallowWharf/w4.test.ts`.

### Spaces
| Id | Area | y | Build |
| --- | --- | --- | --- |
| w4-back-lane | [44, 30, 120, 34] | 0 | open; its north side z 34 is mass (GB0 x 44-82, GB3 x 82-120) with W3's cartway mouth at x 88.5-91.5. **Apron:** x 72-100 z 28-30 is open too (in front of the shed doors; deviation) |
| w4-gantry | [48, 15, 84, 19] | 10 | walkway slab 9.7-10 on two portal frames (legs x 48.5 and x 83.5, z 15.2 and 18.8, noLedge, 0-9.7). **Caged:** drop guards 2.2 on both long sides and both ends |
| w4-shed-three | [72, 10, 86, 28] | 0 | walls 0-6 (north wall z 28 `OUTER` 0.6, z 27.7-28.3), roof slab 6.0-6.3 with north-light glazing boxes (noLedge), all noLedge |
| w4-shed-two | [86, 10, 100, 28] | 0 | as shed three; dark; one emergency lamp |
| w4-shed-yard | [44, 6, 72, 28] | 0 | open quay. North boundary z 28-30 is mass (x 44-72) with the lane gate; east boundary x 72 is shed three's wall (z 10-28) and the jetty fence (z 6-10) |
| w4-canal-ledge | [44, 3, 72, 6] | -4.4 | the canal bed: one slab, top -4.4, over **x 44-120, z 0-6** (the whole W4 canal is walkable; the room keeps the graph area; deviation) |
| w4-jetty | [72, 6, 100, 10] | 0 | staging deck, a solid block from -4.4 to 0, noLedge on every face |
| w4-boat | [84, 1, 96, 5] | -1 | hull block x 84-96 z 1-5 from -4.4 to -1.0, noLedge (3.4 m over the bed, no lip: out of a solo climb) |

**Masses:** x 100-120 z 6-28 (east of shed two, to the map edge); x 100-120 z 28-30; x 44-72 z 28-30 except the gate
and the culvert. The quay wall (the yard's south face at z 6, x 44-72, from -4.4 to 0) and the jetty's south face are
noLedge. **Canal ends:** a wall at x 44 from -4.4 to 3.0, noLedge (joins GB0's barrier). The quay railing on z 6.05,
x 44-72, is 1.1 tall and noLedge, with a gap at x 57.5-58.5 for the quay ladder.

### Forced moves and doors
- **C8 shed two shutter, reserved:** an opening in shed two's north wall at x 90.5-93.5, y 0-3.0. Spec
  `{ id: 'w4-shutter', x: 92, y: 0, z: 28, yaw: 0, width: 3, height: 3 }`, filled by `standIn`. 0.7 m clear both sides
  (z 27.0-29.0). The graph marker [87.5, 0, 25.5] moves to the wall (deviation).
- **C9 clerestory boost:** an opening in shed three's north wall, x 78.4-79.6, y 4.4-5.6 (the sash, open). The wall
  below it (0-4.4, 0.6 thick) gives the **planned lip `w4-lip-clerestory`**: top 4.4, x 78.65-79.35, n (0, 1) (to the
  lane), floor 0. Leg-up spot (79, 0, 29.2) (face 28.3 + 0.9), facing (0, -1). Inside, the tea-chest stack under the
  sash is x 77.5-80.5 z 25.5-27.7, top 2.0, noLedge (the way down). The rest of the north wall is noLedge.
- **C10 jetty pull `w4-pull-jetty`:** holder (73.5, 0, 6.35), yaw PI (facing -z over the canal); partner
  (73.5, -4.4, 5.3). Band 4.4 is 'ok'. The edge ahead is open: no railing on the jetty's south edge x 72-76.
- **Jetty gate (chained):** a fence on x 72 from z 6 to 10, 2.4 tall, noLedge, extending 1.0 m south over the canal
  (to z 5.0, from -4.4 to 2.4). Its gate is a door at z 8: `doors['w4-jetty-gate'] = [72, 0, 8]`. GB5 bolts it on side
  [1, 0] (the jetty side).
- **Shed three yard door (barred inside):** `doors['w4-shed3-yard'] = [72, 0, 19]`. GB5 bolts it on side [1, 0].
- **Shed three loading door:** in the south wall z 10, a sliding door 3.0 wide at x 77.5-80.5 (`leaf: 'slide'`,
  unlocked).
- **Party fire door** (86, 0, 19), unlocked. **Shed two canal door** (93, 0, 10), unlocked.
- **Lane gate (lane -> shed yard):** an opening 3.5 wide x 4.0 at x 64.25-67.75 through the z 28-30 mass.
- **Culvert (secret duct):** `duct(b, [[70.5, 30], [70.5, 27.5]], 0)`.
- **Crane ladders:** the yard leg, `b.ladder(60, 14.6, 0, 10, PI)` (on the gantry's south face, facing -z); and the lane
  leg. The **north arm** is a caged catwalk 1.2 wide x 84-85.2 z 19-29.4 at y 10 (slab, drop guards both sides). Its
  ladder is `b.ladder(84.6, 29.7, 0, 10, 0)` down to the apron. That is 5.0 m from the clerestory lip, over the 4.7 m
  keep-clear. The graph marker [74, 0, 24.5] moves (deviation).
- **Quay ladder:** `b.ladder(58, 6.1, -4.4, 0, PI)` down the quay face to the canal bed.
- **Jetty steps / gangway (one element, both links):** a stair x 86.75-89.25 from the jetty edge z 6 (y 0) south down
  to z 4.3 (y -1), `stairSteps(1)` (6 risers), its solid body down to -4.4, noLedge.
- **Keep-clear (lane side of the clerestory):** nothing over 0.3 m tall within 4.7 m of the lip on the lane side
  (x 74.3-84.3, z 28.3-33). **Canal bed:** nothing over 0.3 m within 4.7 m of the pull edge (x 68.8-78.2, z 0-6), and
  no box on the bed anywhere that comes within 3.8 m below the jetty or hull tops.

### Drop guards (`dropGuards`)
- `w4-dg-gantry-n` (48, 19) -> (84, 19) and `w4-dg-gantry-s` (48, 15) -> (84, 15), y 10, h 2.2; the ends
  `w4-dg-gantry-w` (48, 15) -> (48, 19) and `w4-dg-gantry-e` (84, 15) -> (84, 19), each with a gap only where a ladder
  or the north arm joins (the yard leg ladder gap x 59.4-60.6 on the south side; the arm gap x 84-85.2 on the north
  side).
- `w4-dg-arm-w` (84, 19) -> (84, 29.4) and `w4-dg-arm-e` (85.2, 19) -> (85.2, 29.4), y 10, h 2.2.
Reason: from the gantry or the arm, a drop onto shed three's roof (6.3) and then off its south edge onto the jetty
would skip C8, C9 and C10.

### Lights
| Group | Lamps, r, i | Switch | Note |
| --- | --- | --- | --- |
| 91 shed three pendants | two rows: (75,5.4,14), (75,5.4,22), (81,5.4,14), (81,5.4,22); r 8, i 0.9 | (85.4, 0, 20.4), yaw -PI/2 | side aisle x 84-86 dark |
| 92 loading-door flood | spot (79, 4.0, 9.6), cone down-south; r 12, i 1.3 | (81.2, 0, 10.6), yaw 0 | floods the jetty's middle |
| 93 yard flood | spot (66, 6.0, 27.2), cone south; r 16, i 1.4 | (63.4, 0, 27.6) in the gate box, yaw PI | cart lines dark |
| 94 quay lamps (photocell) | (50, 4.0, 6.6), (64, 4.0, 6.6); r 7, i 0.6 | none | |
| 95 lane lamp | (66, 4.0, 30.4); r 6, i 0.6 | none | one lamp at the yard gate |
| 96 shed two emergency | (93, 2.4, 10.6); r 4, i 0.4; `destructible: false` | none | |
| 97 crane red lamp | (88, 12, 5), red [1, 0.1, 0.1]; r 6, i 0.6; `destructible: false`, `electric: false` | none | aviation, landmark (on a jib box over the jetty, noLedge, off the gantry) |

### Data exports
- `rooms`: the 8 graph spaces.
- `navSeeds`: (90,0,32), (58,0,18), (79,0,18), (93,0,18), (86,0,8), (66,10,17), (90,-1,3). The canal bed is below the
  sampler's reach (SPEC Engine question 5; `downCast` casts to y -2), so it gets no seed.
- `hideSpots`: (76, 0, 26) (the tea chests), (46, 0, 26) (the cart line).
- `lips`: `w4-lip-clerestory`. `pulls`: `w4-pull-jetty`. `shutters`: `w4-shutter`. `dropGuards`: the six above.
- `debugPoints`: the lane checkpoint (90, 0, 32), the clerestory spot, the shutter (92, 0, 29.2), the canal bed
  (73.5, -4.4, 5.0), the boat (90, -1, 3).
- `deviations`: the apron z 28-30; the canal bed x 44-120 z 0-6; the north arm; the shutter marker; the gangway and the
  jetty steps as one element.

### Tests (`tests/tallowWharf/w4.test.ts`)
1. **Sizes:** 8 rooms, each equal to its graph area and storey (`w4-canal-ledge` minY -4.4; `w4-boat` -1).
2. **Clerestory boost:** 4.4, within `COOP_BAND`. `legUpTarget` from (79, 0, 29.2) facing (0, -1) finds a ledge with
   `canClimbUp`, top 4.4, `nz` > 0.99. `roomForBoost` is clear.
3. **Jetty pull:** `pullCheck` is ok (band 'ok' at 4.4, an open edge, the catch point within 1.6 of the partner).
4. **No solo jump:** `soloJumpThreats` is `[]` for the clerestory lip and for the pull edge (a grip at y 0 along x
   72.5-74.5 at z 6, n (0, -1), floor -4.4).
5. **Only planned lips** at band height in the W4 box: the clerestory lip only. The quay face, the jetty faces and the
   hull give no ledge (noLedge).
6. **No solo bypass:** `soloNav` with `shut` = the jetty gate and the shed three yard door (the shutter stand-in is
   solid). `findPath` (90, 32, y 0) -> (88, 8, y 0) (the jetty) is null. Control: (79, 18, y 0) -> (88, 8, y 0) through
   the loading door is not null.
7. **Canal:** the bed's top is -4.4. The hull (3.4 m over the bed, under `WALL_JUMP.maxUp` 3.8) and the jetty (4.4 m)
   are noLedge: `anchorsOf` gives no ledge within 0.3 m of their faces, so there is no wall-jump lip from the bed. The
   jetty steps' body faces are noLedge too. The quay ladder anchor exists from -4.4 to 0.
8. **Drop guards:** all six exist as collide noLedge boxes 2.2 tall on y 10 along their segments (gaps only at the
   listed ladder and arm joins).
9. **Lights:** as GB1, groups 91-97. Groups 94-97 have no switch. Group 97 is not destructible.

---

## GB5 - sectors and missions (`tallowWharfSectors.ts`, `tallowWharfMissions.ts`)

- **Model:** Sonnet. **Branch / folder:** `feature/mission-engine`, `C:/NightShift/Mobile-Coop-mission-engine`,
  after GB1-GB4 are merged.
- **Guard line:** `cd /c/NightShift/Mobile-Coop-mission-engine && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-engine && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-engine"`
- **Files owned:** `src/world/maps/tallowWharfSectors.ts`; `src/world/maps/tallowWharfMissions.ts`;
  `tests/tallowWharf/sectors.test.ts`. Read-only: the four section files (use their `doors` map for every door centre;
  never retype a coordinate that a section exports).
- **Patterns:** `campusSectors.ts:354-395` (a full `SectorDef`), `campusMissionTest.ts` (a `MissionDef`), `sectors.ts`
  types (`SectorDef` :105, `ConnectorDef` :50, `SectorBolt` :238, `SectorKeypad` :167, `SectorIntel` :182,
  `SectorPairGate` :411), `missionDef.ts` (`MissionStep` :18, `MissionDef` :94; `stepCond` :348: an explicit `done`
  wins, so a `sync` step may finish on a pair-gate flag).

### `WHARF_SECTORS` (ids = graph section ids `W1`..`W4`, in that order)
| Section | start (+ start2) | objective | connector / extract |
| --- | --- | --- | --- |
| W1 | (7, 0, 10, yaw 0); (8.5, 0, 10) | grab "Take the warden's tally book" at (2.5, 4.5, 50) | box [36.2, 58.2, 39.8, 61.8], floorY 0, `nearAt` = `doors['w1-conn-near']`, no `farAt`; checkpoint (42, 0, 55, yaw PI/2), checkpoint2 (42, 0, 56.5) |
| W2 | (42, 0, 55, yaw PI/2); (42, 0, 56.5) | grab "Lift the clerk's notebook in the pie shop loft" at (58.6, 4.5, 68.4) | box [82.2, 64.5, 86.5, 67.5], floorY 8.4, no doors; **checkpoint = the head of the roof bulkhead stair** (111.4, 8.4, 68, yaw PI/2), checkpoint2 (111.4, 8.4, 66.6) |
| W3 | (111.4, 8.4, 68, yaw PI/2); (111.4, 8.4, 66.6) | grab "Take the ledger from the strongroom" at (101, 0, 62.5) | box [88.2, 34.2, 91.8, 37.8], floorY 0, `nearAt` = `doors['w3-conn-near']`; checkpoint (90, 0, 32, yaw -PI/2), checkpoint2 (91.5, 0, 32) |
| W4 | (90, 0, 32, yaw -PI/2); (91.5, 0, 32) | grab "Take the packet from the candle chest in shed three" at (75.5, 0, 14) | `extract` box [84, 1, 96, 5], floorY -1 (the boat) |
`perStage` 2 in every section; `reinforce`: W1 [[34, 60.5], [36, 16]]; W2 [[74, 50], [42, 50]]; W3 [[103, 40],
[94, 46]]; W4 [[46, 30.5], [118, 31.5]]. `dogs`: W3 1, W4 1, else 0.

### Team doors, keypad, pair gate (indices fix the flags `<id>-bolt<k>`, `-key<k>`, `-gate<k>`)
- **W1 bolts:** 0 the warden stair foot, side [0, 1]; 1 the fish hall back door, side [0, 1].
- **W2 bolts:** 0 the pawn stair top, [-1, 0]; 1 the pie stair top, [1, 0]; 2 the clock door, [1, 0]; 3 the pawn
  taking-in door, [0, -1], `w: 2.0`; 4 the pie taking-in door, [0, -1], `w: 2.0`.
- **W3 bolts:** 0 the chute hatch, [0, 1]; 1 the coal-yard door, [0, -1]; 2 the bridge door, [1, 0].
  **Keypad** 0: `doors['w3-east-gate']`, code `tkl-gate-code`. **Pair gate** 0: door `doors['w3-strongroom']`, `a`
  east key (109, 76.4) label 'Turn the east key', `b` west key (88, 76.4) label 'Turn the west key', window 1.0.
- **W4 bolts:** 0 the shed three yard door, [1, 0]; 1 the jetty gate, [1, 0].

### Intel (flags the steps read; lines <= `INTEL_LINE_MAX` 60, written to be voiced, G82)
- **W1:** 0 overhear `tgc-1` box [16, 38, 28, 44], hold 1, line "SEXTON: Three grey coats under the clock."; 1 board
  `tgc-tally` at (2.5, 4.5, 50.6), "Tally book: brass-tag satchel left at nine."; 2 overhear `tgc-tea` box
  [17.5, 6.5, 20, 9], hold 4, talkers [7, 8], "Porter: the flat cap's a hired man, him."
- **W2:** 0 board `tgc-opt` at (52.5, 4.5, 63.5), "Rota: Teale walks Thursdays. Always the umbrella."; 1 overhear
  `tkl-gate-code` box [59.8, 59.3, 62.2, 61.7], floorY 4.5, hold 4, talkers [the night clerk's index], "Clerk: east
  gate's the founding year again."
- **W3:** 0 board `tkl-opt` at (117, 0, 76.5), "Day book: Halcyon, paid through the wharf account."; 1 overhear
  `tkl-4-yard` box [83, 41, 97, 51], hold 1, "TALLY: Ledger's out. Cartway's ahead."

### Guards (`SectorGuard`: kind, x, z, yaw, y, route, `pair`, `handler`, `zone`, `role`, `reason`, `takedownSpot`)
Posts and jobs are the SPEC's space notes. Every human is `grunt` (armed, `checkSectorGuards` M1) and every dog is
`dog` with a `handler`. Give each guard a `takedownSpot` 1.5 m behind him on his route, out of the others' sight.
- **W1 (9):** 0 market warden loop [[14,17],[34,17],[34,28],[14,28]]; 1 market warden loop
  [[34,40],[12,40],[12,31],[34,31]]; 2 lamp trimmer back-and-forth [[11,18],[11,42]]; 3 warden posted under the clock
  (22, 42.5, yaw PI); 4, 5 porters, a talking pair at the scales (16, 50) and (17.2, 50) (`pair` each other); 6 hall
  watchman loop [[12,47],[33,47],[33,56.5],[12,56.5]]; 7, 8 tea-stall porters (TGC's talkers), a pair at (15, 10) and
  (16.2, 10.6).
- **W2 (10):** 0 beadle loop [[42,50],[74,50],[74,57],[42,57]]; 1 Pell's man posted at the stair foot (55, 60.8,
  yaw PI); 2 Pell's man walking [[44,54],[70,54]]; 3 Pell's minder at the stair head (55.5, y 4.5, 75, yaw PI); 4 the
  reading-room keeper loop at y 4.5 [[46,76],[58,76],[58,79],[46,79]]; 5 night reader, static (47, 4.5, 78.2);
  6 **Teale** (`tgc-teale`), static at his table (51, 4.5, 75.4), `info` lines "Shed three. Candle on the lid." /
  "Under the tea."; 7 **Fenn** (decoy) (46, 4.5, 66); 8 **Garrow** (decoy) (60, 0, 66); 9 **night clerk** (TKL's
  talker) (60, 4.5, 66.8), static.
- **W3 (10):** 0 yard watchman loop [[102,40],[112,40],[112,47],[102,47]]; 1 dog on a running line (112.5, 46),
  `handler` 0; 2 the lodge porter (117, 0, 48), static (the TKL twist walker); 3, 4 night clerks, static (110, 57.4)
  and (116, 57.4); 5 porter on rounds [[108,56],[118,56],[118,72],[108,72]]; 6 messenger back-and-forth
  [[108,68],[100,68]]; 7 west-wing clerk, static (90, 55.4); 8 stacks porter loop [[83,68],[85.5,58],[83,58]];
  9 front-hall watchman back-and-forth [[99,68],[90,66]].
- **W4 (12):** shed yard: 0 yard watchman loop [[46,26],[70,26],[70,9],[46,9]]; 1 dog handler [[50,20],[66,20]];
  2 dog, `handler` 1; 3 crane watchman posted at the yard leg (60, 13.6, yaw PI); 4, 5 **Pell's minders** (TGC
  twist), a pair, posted at (48, 26) until the twist event. Shed three: 6 tally clerk static (74, 24); 7 customs locker
  posted at the loading door (80.8, 11.2, yaw 0); 8, 9 dockers, a talking pair (76, 16) and (77.2, 16); 10 hand truck
  back-and-forth [[78,24],[78,12]]; 11 foreman loop [[74,12],[85,12],[85,26],[74,26]] (the dark side aisle included).
- **`WHARF_GUARD_MISSIONS`** (data only, open question 2): `{ threeGreyCoats: { W1: 'all', W2: [0..8], W3: [],
  W4: 'all' }, twoKeyLedger: { W2: [0,1,2,3,4,5,9], W3: 'all', W4: [0,1,2,3,6,7,8,9,10,11] } }`.

### Routes (M8: at least 2 per section; `climbs` = legs the nav does not walk). Waypoint `[x, z]` or `[x, z, y]`.
- **W1** obj = the tally book (index in brackets):
  - "Gallery and the warden's hatch": [7,10],[4,13.5],[4,16,4.5],[4,44,4.5],[4,47.5,4.5],[3,50,4.5] (obj 5),
    [6,53,4.5],[9.5,53],[22,56.8],[22,59.2],[37,60]. Climbs [1, 6, 8].
  - "Stall backs, the market lip and the warden's stair": [7,10],[9,15],[12,27],[6.5,29],[5,29,4.5],[4,44,4.5],
    [4,47.5,4.5],[3,50,4.5] (obj 7),[7,51.5,4.5],[7,44.6],[7,43.4],[33,43.4],[33,45],[22,56.8],[22,59.2],[37,60].
    Climbs [3, 13].
- **W2** obj = the notebook:
  - "West pier and the lofts": [42,55],[46,58.5],[46,60.5,4.5],[61,60.5,4.5],[61,63,4.5],[59,66.5,4.5],
    [58.6,67.8,4.5] (obj 6),[61,63,4.5],[72,60.5,4.5],[72,63,4.5],[72,65,4.5],[72,66,8.4],[78.9,66,8.4],[83,66,8.4].
    Climbs [1, 10, 12].
  - "East lip and the corner loft": [42,55],[73.5,58.3],[73.5,60.5,4.5],[72,63,4.5],[69,66,4.5],[64,66,4.5],
    [58.6,67.8,4.5] (obj 6),[64,66,4.5],[72,65,4.5],[72,66,8.4],[78.9,66,8.4],[83,66,8.4]. Climbs [1, 8, 10].
- **W3** obj = the ledger:
  - "Bulkhead, passage and the chute": [111.4,68,8.4],[113.8,66,8.4],[113.8,60,0],[111.4,60],[108,54],[106.6,53.75],
    [101,53.75],[101,56.2],[101,62.5] (obj 8),[101,53.75],[97.1,53.2],[97.1,51,4.4],[97.1,49.2],[99.5,51.2],[90,46],
    [90,38.6],[90,36]. Climbs [1, 10, 11] (leg 1 runs down the bulkhead core; if the nav walks it, drop 1).
  - "Fire escape and the east gate": [111.4,68,8.4],[107,52.6,8.4],[101,50,4.2],[108.4,50],[112,51.2],[112,53],
    [108,54],[106.6,53.75],[101,53.75],[101,56.2],[101,62.5] (obj 10),[101,53.75],[97.1,53.2],[97.1,51,4.4],
    [97.1,49.2],[99.5,51.2],[90,46],[90,36]. Climbs [12, 13].
- **W4** obj = the candle chest:
  - "Clerestory and the loading door": [90,32],[79,29.2],[79,27,2.0],[79,24],[75.5,15] (obj 4),[79,11],[79,9],
    [86.5,8],[88,5.6],[88,3,-1]. Climbs [1, 2].
  - "Shed two shutter and the canal door": [90,32],[92,29.2],[92,26.8],[90,20],[86.4,19],[80,17],[75.5,15] (obj 6),
    [86.4,19],[93,11],[93,9],[88,6.5],[88,3,-1]. Climbs [1].

### `WHARF_MISSIONS` (from the TGC / TKL graph.json; texts copied character for character)
- **threeGreyCoats:** `mode 'campaign'`, `players [2]`, `sections ['W1','W2','W3','W4']`, `briefing` = the five
  BEAT briefing lines. Steps:
  - `tgc-1` reach, W1, `done { flag: 'tgc-1' }`;
  - `tgc-2` intel, W1, after tgc-1, `gives 'tgc-courier'`, `done { all: [{ flag: 'tgc-tally' }, { flag: 'tgc-tea' }] }`;
  - `tgc-3` interrogate, W2, after tgc-2, `needs 'tgc-courier'`, `gives 'tgc-chest'`, `target 'W2:6'`, `decoys
    ['W2:7', 'W2:8']`, `bolt [65, 4.5, 76.75]`;
  - `tgc-opt` interact, W2, after tgc-2, `optional {}` (no reward: campaign, Q19), `done { flag: 'tgc-opt' }`;
  - `tgc-4` exploit, W4, twist, after tgc-3, `needs 'tgc-chest'`, `done { flag: 'W4-obj' }`, `events [{ name:
    'mindersArrive', guardTag: 'tgc-minders', postId: 'w4-quay' }]` (set `zone: 'tgc-minders'` on W4 guards 4 and 5);
  - `tgc-5` extract, W4, after tgc-4.
  Rules: `[{ kind: 'namedTarget', scope: 'mission', step: 'tgc-3', text: 'Rule - question only Pell\'s courier' }]`.
- **twoKeyLedger:** `sections ['W2','W3','W4']`, the BEAT's five briefing lines. Steps:
  - `tkl-1` intel, W2, `gives 'tkl-gate-code'` (default done = the fact);
  - `tkl-2` exploit, W3, after tkl-1, `needs 'tkl-gate-code'`, `done { flag: 'W3-key0' }`;
  - `tkl-3` sync, W3, after tkl-2, `window 1.0`, `done { flag: 'W3-gate0' }`, `events [{ name: 'telltale', guardTag:
    'w3-lodge-porter', postId: 'w3-passage' }]` (set `zone: 'w3-lodge-porter'` on W3 guard 2);
  - `tkl-opt` interact, W3, after tkl-2, `optional {}` (no reward: campaign, Q19), `done { flag: 'tkl-opt' }`;
  - `tkl-4` carry, W3, twist, after tkl-3, `item 'tkl-ledger'`, `done { all: [{ flag: 'W3-obj' }, { flag:
    'tkl-4-yard' }] }`;
  - `tkl-5` extract, W4, after tkl-4.
  Rules: `[{ kind: 'noKills', scope: 'mission', text: 'Rule - no kills.' }]`.
- `tallowWharf.ts` already reads `WHARF_SECTORS` / `WHARF_MISSIONS` (GB0). GB5 does not touch it.

### Tests (`tests/tallowWharf/sectors.test.ts`)
1. `checkSectors(WHARF_SECTORS)` (`sectors.ts:549`) is `[]`. `checkSectorCodes(WHARF_SECTORS)` (`:212`) is `[]`.
2. For each mission, `checkMission(m, sectorGuardIds(WHARF_SECTORS))` (`missionDef.ts:156`, `sectorMission.ts:42`)
   is `[]`.
3. The section ids equal `GRAPH.meta.sections`. Each mission's `sections` equals its graph's `mission.sections`. Its
   step ids, kinds, `after`, `gives`, `needs`, `twist`, `optional` and `text` equal the graph's `objectives`
   (`hint` too). `rules` kind and scope equal the graph's.
4. Guard counts: W1 9, W2 10, W3 10, W4 12. The graph's per-section sums are W1 7, W2 6, W3 10, W4 12. The extras
   (W1 the two tea-stall porters; W2 Teale, Fenn, Garrow and the clerk) are listed in an exported
   `WHARF_GUARD_EXTRAS` with reasons. Every guard's (x, z) lies inside its section box. Every route point lies inside
   a room of that section.
5. Every `start`, `checkpoint` and `extract` lies inside its box and on a walkable surface (an analytic down-cast at
   the point hits within 0.1 of its y). W2's checkpoint is within 1.5 m of the W3 bulkhead roof door.
6. Every bolt: `onBoltSide(b, ...)` is true for a point 0.6 m into its named side and false 0.6 m into the other. Each
   bolt's `at` equals a section `doors` entry.
7. Routes on the runtime nav grid (`tests/helpers/runtimeNav.ts`, the pattern of `campusRuntimeNav.test.ts`). The seeds
   are every section's `navSeeds`; doors are open. Every non-climb leg has a path within 200000 expansions. Every
   section has at least 2 routes.
8. The runner on TGC: `new MissionRunner(TGC, 2)`. Setting `tgc-1`, then `tgc-tally` and `tgc-tea`, then `update`,
   leaves `tgc-2` done and the fact `tgc-courier` held. If the runner does not set `gives` on an explicit-done step,
   **stop and report** (an EN1 finding; do not change `src/game/mission`).
9. `sectorGuardIds` contains `W2:6`, `W2:7` and `W2:8`, and `W2:6` has `info`.

---

## Things in the graph that cannot be built as-is (all handled above; the lead confirms in 0.1)
- The 2.5 m throw gaps (C4 x 2, C5) are within a solo running jump and fall grab: open question 3.
- The chute's `storey` 2.2 contradicts its 4.4 boost lip: open question 5.
- No fall damage makes roof drops skip C7 (the W3 roof over the coal yard) and C8-C10 (gantry -> shed three roof ->
  jetty): open question 4 (drop guards).
- `w3-cartway` [88,34,92,40] overlaps `w3-coal-yard` [82,38,98,52] at z 38-40: the cartway is built z 34-38.
- The arcade lane's areas leave 6 m between `w2-arcade-roof` (x 76) and `w3-roof` (x 82), not the 2.5 m pinch: GB2
  adds the old bridge landing x 76-79.5.
- The W2 boost, rope and pull share one marker [60, 0, 60.5], but the notes put them at the west pier and the east
  lip: they are built at x 46 and x 73.5.
- The canal ledge [44,3,72,6] ends where the jetty begins (x 72), so the pull needs the bed under the jetty: the whole
  W4 canal is walkable bed, closed by noLedge faces.
- Several link markers coincide (the fish hall arch and side door; the shutter and the back door; the cart gate and
  the wicket; the shed three ladder). The briefs give each its own position. GBM re-measures.
- The lodge lamp is "lit by default" and also "comes on at the twist": built off.
- Engine gaps outside the greybox: TKL's start section, per-mission guards, twist spawns (the minders and the porter
  wait for Guard AI's `missionEvent` readers), the shutter (tick hook, wiring, NET) and the pull-up in co-op (NET).
