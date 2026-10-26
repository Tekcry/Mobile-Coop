status: done feature/marlow-kit-wire d3e2e747b9eacc44e8c0a8a3ea8f0800f66a46ae

# Brief marlow-kit-wire: Marlow Yard kit stations on Player Build's kit API

Planner: Opus, 2026-10-26. Builder: one cloud builder (or desktop Sonnet). Read first: `git show
origin/master:docs/systems/agent-preamble.md` (incl. "Cloud sessions"), this brief, `git show
origin/feature/coop-kit:docs/coop-kit/PLAN.md` lines 408-616 ("The Marlow API", "Design per move"), and
`docs/marlow-replan/STATIONS.md` on the base. Marlow Yard rules (binding): every failure is a retry (Q5, G370); two
players everywhere (PLAN F1).

## Base and branch
- **Base:** a branch holding both PR #594 (`feature/marlow-play-2`, head e234da6ff = master + #591 + #594) and PR #599
  (`feature/coop-kit-k0`, head 162ce150d). The lead creates it (suggested `feature/marlow-kit-base`) and writes its sha
  here before the brief goes open: `base sha: db7ef88fd89f64a628bfc2b93ae034da35bdc962` (feature/marlow-kit-base). The two merge clean (`git merge-tree` checked 2026-10-26).
  Line numbers below are at e234da6ff (#594) and 162ce150d (#599); on the merged base `courseMode.ts` sits 1 line
  earlier, everything else is the same.
- **New branch:** `feature/marlow-kit-wire` from the base. Guard before every write:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-kit-wire`.

## Goal
Each of the five kit stations switches from its stand-in to the real move the moment Player Build's `kitMoves` id is on
(its K slice adds the id to `KIT_BUILT`; on in /preview/, off live), and stays exactly as today while the id is off.
No new move code, no new collision geometry, nothing in Player's files.

## Only these files
1. `src/game/course/stationDef.ts`
2. `src/game/course/courseState.ts`
3. `src/game/modes/courseMode.ts`
4. `src/world/maps/ctcourseSets/replan/a2CarriageShed.ts`
5. `src/world/maps/ctcourseSets/replan/a4GoodsShed.ts`
6. `src/world/maps/ctcourseSets/replan/a5Substation.ts`
7. `src/world/maps/ctcourseSets/replan/a6PumpHouse.ts`
8. `docs/marlow-replan/STATIONS.md`
9. `tests/courseStation.test.ts`
10. `tests/ctcourse/replan/a2CarriageShed.test.ts`, `a4GoodsShed.test.ts`, `a5Substation.test.ts`, `a6PumpHouse.test.ts`
11. `changes/feature-marlow-kit-wire.md` (new changelog fragment, the repo's `changes/` pattern)

**Do not touch:** `src/game/kit/**`, `src/net/**`, `src/core/flags.ts`, `src/game/teamMoves.ts`,
`src/game/teamController.ts`, `src/game/modes/gameMode.ts`, `src/game/gameState.ts`, `src/anim/**`,
`src/world/shutterDoor.ts` (Player's / NET's); any other set file, `ctcourseSets/*.ts` (built sets), `facility.ts`,
`graph.json`, `scripts/**`. No collider added, moved or removed in any set (A7). If a change seems to need another file,
stop: `status: blocked <file and why>`.

## Player's API (what exists on the base, read-only)
- Ids: `kitMoves` id = `StationDef.kit` = `KitKind` = wire kind: `deadweight`, `dropCatch`, `chimneyPair`, `swingPass`,
  `plankBridge` (`src/game/teamMoves.ts:27-30` on #599). None is in `KIT_BUILT` yet (`src/core/flags.ts:137`); each K
  slice adds its own. `flags.kitMoves` (`flags.ts:132`, load value `:277`) only ever holds `KIT_BUILT` ids
  (`readKitMoves` `:151-163` filters); tests set it in `beforeEach` / `beforeAll` and restore it (`flags.ts:131`).
- Spots: `addKitSpot(key, spot)` (`src/game/kit/kitApi.ts:43`), `key` = the builder's `b.anchors`; `kitSpotsOf(level,
  kind?)` (`:50`) reads them back from anything with `.anchors` (the `LevelBuilder` itself in tests). A spot is inert
  while its id is off: place it unconditionally.
- Done: `GameMode.onKitDone?(kind, spot, a, b)` (`src/game/modes/gameMode.ts:92-94`), called on the host only through
  `kitDone` (`kitApi.ts:90`, a no-op on a client page), once per completed move; `spot` = the spot id, `''` a free move;
  `a` / `b` player ids, undefined = the host. Also fires for `pull` and `shutter`.
- Reset: `TeamController.resetKit()` (`src/game/teamController.ts:1414`; `g.team`, `gameState.ts:460`), already run by
  `checkpointReset` on a bay restart (`gameState.ts:1170`). Later K slices extend it (K5a: boards back to their stack).

## What to build

### 1. `kitMoveOn` reads Player's flag (stationDef.ts, courseState.ts)
- Move `kitMoveOn` from `courseState.ts:146-154` into `stationDef.ts` (pure; import `flags` from `../../core/flags`):
  `export function kitMoveOn(kit: NonNullable<StationDef['kit']>): boolean { return flags.kitMoves.has(kit); }`
  Doc comment: Player's `kitMoves` set, which holds only `KIT_BUILT` ids, so a station switches the moment its K slice
  adds the id; never a Marlow list (A1). No allocation (`has`).
- `courseState.ts` re-exports it (`export { kitMoveOn } from './stationDef';`) so `courseMode.ts:9`'s import stays.
- Rewrite the stale comment at `courseState.ts:146-151` (KS1-KS5 no longer exist as separate slices: this slice is all
  five hookups).

### 2. The done rule: place + kit credit (courseState.ts)
While a station's kit id is on, the station is done when its done flag (the pass zone, as today, STATIONS SA8) is set
AND its kit credit is set; while off, the done flag alone, exactly as today (A2).
- `StRt` (`:136-143`) gets `kk: string`: `kit:<station id>` for a station with `kit`, else `''`; precomputed where the
  list is built (`:346`).
- `advanceStations` (`:776-787`): a station counts done when its done flag (`doneFlag` / `d1` / `d2`) is set and
  (`kk === ''` or `!kitMoveOn(def.kit)` or `flags.has(kk)`). No allocation.
- New public `kitDone(kind: string, spot: string): boolean` (host): the live station `s`; false (nothing changes) unless
  `!this.over`, `s.def.kit === kind`, `s.def.id === spot` and `kitMoveOn(s.def.kit)`; then `addFlag(s.kk, this.bay)`
  (owned by the live station: a station retry drops it through `flagSt`, a bay restart through `flagBay`) and true.
  `addFlag` already calls `advanceStations`. A credit already set: false. `''`, `pull`, `shutter`, another station's
  id, a station not yet live: false (A3).
- `startStation(n)` (`:655-667`): for each earlier station it marks done, also set its `kk` when its kit is on.

### 3. Held gates (courseState.ts)
A station's stand-in gate, and every gate in the same station's `gates` that unlocks one of the stand-in's doors, is
**held** while the station's kit id is on: no press opens it (A4). Today this matters only at A4: the motor button
`a4-grille-motor` is the switch of both the lever stand-in `g-a4-grille-motor` and the egress gate `g-a4-grille` on the
same door (`replan/a4GoodsShed.ts:156-158`), so with `deadweight` on a press would unlock the grille: a solo way round.
The A2 / A5 / A6 stand-ins are flag / anchorLock gates nothing presses; A5 station 12's `g-a5-plates` (door `A5-plates`)
shares no door with its stand-in and stays a working bolt.
- `GateRt` gets `kit: StationKit | null` (`StationKit = NonNullable<StationDef['kit']>`), set in the constructor's
  station loop (`:341-350`) from `gateDoors` (the stand-in's GateRt and same-door gates of that station).
- `press` (`:507-`): a gate whose `kit` is set and `kitMoveOn(kit)` is skipped (not opened, not paired, not unbolted)
  and, when the press was its switch, the press returns `REFUSE_KIT_HELD = 'No power here. This one takes the co-op
  move.'` (new exported constant beside the other refusals, under `COURSE_TEXT_MAX` 90).
- `openStandIn` / `standInGate` (`:789-812`) stay as they are (they already open nothing while the kit is on).

### 4. CourseMode (courseMode.ts)
- `onKitDone(kind: KitKind, spot: string, _a: string | undefined, _b: string | undefined): void` beside `onTeamMove`
  (`:730-745`): `const st = this.state; if (st && st.kitDone(kind, spot)) this.dirty = true;`. `import type { KitKind }
  from '../teamMoves'`. No stats here (`onTeamMove` already counts the team move at its start). Doc comment: host only
  (CourseMode runs on the host; `kitDone` is a no-op on a client page); spot ids not ours, `''`, `pull` and `shutter`
  are ignored because no station's `kit` names them.
- `onStationRetry` (`:1259-1290`): after `g.gadgets.clearWorld()` (`:1278`), when `def.kit !== undefined &&
  kitMoveOn(def.kit)`: `g.team?.resetKit();` (optional chaining: the test rigs have no team). The kit move in flight ends
  and the move's devices go back (K5a's boards to the stack) on the host (A8).
- `restoreStationDoors` (`:940-963`) unchanged: with the kit on there is no kept stand-in, so every gate door of the
  station goes back as the set began (the grille shut after a deadweight retry).

### 5. The five stations (set files)
Each set file: `import { addKitSpot } from '../../../../game/kit/kitApi';` (a pure module; update the header line that
says which value imports the file takes) and `import { kitMoveOn } from '../../../../game/course/stationDef'` where text
switches. Place the spot unconditionally next to the station's gates. Kit-on texts are chosen while the set builds
(`kitMoveOn(kind)` inside the `replan*` function, never at module level), so the exported constants stay the kit-off
text and the existing tests keep passing (A6). Every new line at most `COURSE_TEXT_MAX` 90.

**A2 station 5 `a2-plank` (Plank Bridge; stand-in walkway `g-a2-walkway`, `a2CarriageShed.ts:231-248`).**
- Lift the stack's numbers into `export const A2_BOARD_STACK = { x0: 60.9, x1: 64.8, z0: 13.23, z1: 13.68, top: 0.16 }
  as const` and use it in the dressing loop (`:253-259`: x 60.9-64.8 `:258`; columns z 13.46-13.68 and 13.23-13.45
  `:257`; four 0.04 m layers `:256`).
- Spot (the board stack's middle, PLAN "Plank Bridge"):
  `addKitSpot(b.anchors, { id: 'a2-plank', kind: 'plankBridge', x: 62.85, y: 0, z: 13.455, yaw: Math.PI / 2, w: 3.9 })`
  - x 62.85 = (60.9 + 64.8) / 2 (`:258`); z 13.455 = (13.23 + 13.68) / 2 (`:257`); y 0 the lane floor (pass zone
    `floorY: 0` `:283`); yaw PI/2: the boards lie along x (`:258`); w 3.9 = 64.8 - 60.9 (`:253`, `:258`).
  - Band check (PLAN): pit 3.0 m (`A2_PIT` x 66.0-69.0 `:38`, band 1.0-3.3), both edges at 0, stack 3.2 m from the near
    edge. **But see Q1: the far barrier leaves no landing for a board.**
- Kit-on text (`plankBridge` on): objective `a2-plank` (`:309-314`) text `Lay a board from the stack over the pit by the
  east vans, then cross to the L2 door.` The retry line (`:130`) already names the board: unchanged.

**A4 station 9 `a4-deadweight` (Deadweight; stand-in lever `g-a4-grille-motor`, `a4GoodsShed.ts:155-158`).**
- Spot (near chain in the staff passage, far chain in the back aisle; both on the west side, clear of the motor
  button at x 103.55 and of the passer's line):
  `addKitSpot(b.anchors, { id: 'a4-deadweight', kind: 'deadweight', x: 101.75, y: 2.4, z: 22.5, yaw: 0, x2: 101.75,
  y2: 2.4, z2: 25.5, door: p.doors[A4_GRILLE_DOOR]! })` (after `:153`, where the door is made)
  - Door plane z 24, opening x 101-104, leaf 2.4 m (`A4_GRILLE` `:46`); passage faces x 101.25 / 103.75 (the 0.5 m
    walls on x 101 / 104; east face `:47`).
  - x / x2 101.75: 0.5 m off the west face (a hanging body's 0.3 m clear). z 22.5 = 24 - 1.5 and z2 25.5 = 24 + 1.5:
    band 1.0-3.0 m from the door plane; z2 inside the back aisle (z 24.25-27.3, `A4_FRAMES` `:61-63`) and the done
    zone `A4_GRILLE_ZONE` (z 24.3-27.2, `:51`). y / y2 2.4 = the grille's height `A4_GRILLE.h` (`:46`): band 2.2-2.6
    over the floor (0). yaw 0: across the door, passage (south) to back aisle (north).
  - `door` = the grate's world door id (the anchor id `b.door(...).id` stored in `p.doors[A4_GRILLE_DOOR]`, `:153`) (A5).
- Dressing (visual only, no collision; A10): move the counterweight chain skins (`:203-204`, now at x 101.3, z 23.55)
  to the near grip (x 101.75, z 22.5) and add the same pair at the far grip (x 101.75, z 25.5), same heights.
- Held gates (section 3): `g-a4-grille-motor` and `g-a4-grille` both held while `deadweight` is on.
- Texts unchanged (the objective `:233` and retry line `:110` fit both).

**A5 station 11 `a5-chimney` (Chimney Pair; stand-in wicket `g-a5-wicket`, `a5Substation.ts:311`).**
- `addKitSpot(b.anchors, { id: 'a5-chimney', kind: 'chimneyPair', x: 69.05, y: 0, z: 33.0, yaw: -Math.PI / 2, w: 1.4,
  h: 6, x2: 68.1, z2: 33.0 })`
  - x 69.05 = (68.35 + 69.75) / 2 and z 33.0 = (30.25 + 35.75) / 2: the gap's floor centre (`A5_GAP` `:47`); y 0
    (marks `:124`); yaw -PI/2 across the shaft toward the exit wall (the marks face it, `:124`); w 1.4 = 69.75 - 68.35
    (`:47`, A19; band 1.2-1.6); h 6 = the wall top (`A5_PERIM.h` `:45`, `A5_WALLTOP.y` `:49`; band 3-8); x2 68.1 =
    (67.85 + 68.35) / 2 the wall top's middle (`:49`), z2 33.0: the exit is the wall top, then the inside ladder
    (`A5_LADDER` `:56`) down to the done zone `A5_APRON_E` (`:118`).
  - See Q3 (the gap's east wall is only 3.6 m).
- Kit-on text (`chimneyPair` on): objective `a5-wall` (`:140`) text `Back to back up the gap to the wall top, then down
  its ladder onto the apron.`

**A5 station 12 `a5-swing` (Swing Pass; stand-in footbridge `g-a5-footbridge`, `:312`).**
- `addKitSpot(b.anchors, { id: 'a5-swing', kind: 'swingPass', x: 65.85, y: 2.6, z: 44.6, yaw: -Math.PI / 2, w: 3.5, y2: 0 })`
  - x 65.85 = the trench's east (near) edge (`A5_CABLE_TRENCH.x1` `:40`); y 2.6 = `A5_GANTRY_PIPE_Y` (`:79`; band
    2.2-2.8 over the near floor 0); z 44.6 = the gantry pipe's line (`A5_GANTRY.z` `:77`); yaw -PI/2 across the gap
    westward; w 3.5 = 65.85 - 62.35 (`:40`; band 2.0-3.5); y2 0 the west strip's floor (pass zone `floorY: 0` `:318`).
  - **See Q2: at z 44.6 the far landing fails the band (posts and drums).** Placed per PLAN anyway (A11).
- Kit-on text (`swingPass` on): objective `a5-trench` (`:141`) text `Swing one of you over the trench from the pipe; the
  swung one unbolts the plates.`

**A6 station 16 `a6-dropcatch` (Drop Catch; stand-in ladder `g-a6-pit-ladder`, `a6PumpHouse.ts:335-339`).**
- `addKitSpot(b.anchors, { id: 'a6-dropcatch', kind: 'dropCatch', x: 52.5, y: deck, z: 65.4, yaw: Math.PI / 2 })`
  (after `:339`; `deck` = `A6_HANG.deck` 4.4, `:272`)
  - x 52.5 = the drop opening's middle (`A6_DROP` x 52.0-53.0, `:71`); z 65.4: inside the opening (z 65.0-66.0) with a
    body's 0.3 m clear of the stand-in ladder at z 65.85 (`A6_PIT_LADDER_AT` `:78`) (A9); yaw PI/2: the dropper steps
    off the west side (the drop-out rail section; rails on the south and east sides, `:19-20`, `:326-328`) facing east.
  - Band: 4.4 - (-1.6) = 6.0 m (`A6_PIT_Y` `:48`; band 2.5-6.5); the catcher's floor under it is the pit (x 49.5-53.5,
    z 62.1-66.1), done zone `A6_PIT_ZONE` (`:109`).
- Kit-on texts (`dropCatch` on), the move's lines the file already holds in comments (`:134-136`, `:165-168`): objective
  `a6-drop` text `One of you drops through the bridge opening into the drive pit; the other catches.`, a `Step off the
  bridge through the opening over the pit.`, b `Stand under the opening in the drive pit and catch your partner.`;
  retry line at `retry:a6-dropcatch` `The attendant heard the landing. Back to the bridge; catch your partner.` (STATIONS
  section 6, verbatim). Applied in the builder where the lines are pushed (`:370`, `:373`).

### 6. What a retry does (summary, no extra code beyond 2 and 4)
| Kit id | Stand-in | Its doors on a station retry | Kit credit | Kit devices |
| --- | --- | --- | --- | --- |
| off | opens as the station goes live, kept through retries (as today) | kept as they are (as today) | not used | untouched |
| on | stays shut; held gates refuse presses | back as the set began (grille shut) | dropped with the station's flags | host `resetKit()` |
Spots are level data: nothing to reset. A bay restart is as today (`checkpointReset` runs `resetKit` on both pages).

### 7. STATIONS.md
- Section 2 rows 5, 9, 11, 12, 16 (lines 37, 40, 43, 44, 48), column "Kit / stand-in": append `; spot <id>` (e.g.
  `plankBridge` / `g-a2-walkway`*; spot `a2-plank`).
- Section 6 row 16 (line 209): the kit-on line as is, plus "(kit off: ... take the cage ladder down.)".
- Section 8 (line 292): one sentence: while a station's kit id is on, its done flag also needs the kit credit
  `kit:<station id>` (`CourseState.kitDone`, from `CourseMode.onKitDone`).
- Section 10 SA11 (lines 389-394): `g-a4-grille` is no longer "KS1's hookup": both grille gates are held while
  `deadweight` is on; the move drives the door through the spot.
- New **SA16 Kit wiring** after SA15 (line 415): the rule of sections 1-4 here in five lines, the five spots (id,
  kind, point) and the undo (A1-A4).

### 8. Tests (Vitest; every test that sets `flags.kitMoves` restores it in `afterEach`)
`tests/courseStation.test.ts`, new `describe('kit stations (marlow-kit-wire)')` on the file's `def` / `station` / `rig`
helpers (`:787-833` pattern); add `team: { resetKit: vi.fn() }` to the rig's fake game (`rig` `:106`, its `g` object `:166-`) or a local copy:
1. For each of the five kinds: `flags.kitMoves = new Set([kind])` -> `kitMoveOn(kind)` true and the other four false;
   `new Set()` -> all five false.
2. Kit on: the stand-in stays shut as its station goes live and through a retry (door locked); kit off: opens and is
   kept (the existing fix 7 tests stay green unchanged).
3. Kit on: the done flag alone does not move the live station; `kitDone(kind, id)` then does; the reverse order
   (credit first, done flag second) also does. Kit off: the done flag alone does, `kitDone` returns false.
4. `kitDone` false and no change for: another station's id, `''`, the right id with the wrong kind, `pull`, `shutter`,
   a station not yet live, a second call.
5. Kit on, a retry: the credit and the done flag are dropped, the stand-in stays shut, a stand-in door the players
   opened is shut again (`restoreStationDoors`), `team.resetKit` called once; kit off: not called.
6. Held gates: a lever stand-in and an egress gate on the same door, one switch: kit on -> `press` returns
   `REFUSE_KIT_HELD`, both stay shut, the door stays locked; kit off -> as today. A gate of the station on another door
   (a bolt) still opens with the kit on.
7. `CourseMode.onKitDone` on the rig credits the live station and marks the wire dirty; ignored when not ours.
8. `startStation(n)` past a kit station with its kit on: that station counts done (its credit set).

`tests/ctcourse/replan/a2CarriageShed.test.ts`, `a4GoodsShed.test.ts`, `a5Substation.test.ts`, `a6PumpHouse.test.ts`,
each:
- Exactly one spot of the station's kind in `kitSpotsOf(b)`, id = the station id, every field equal to the numbers
  above computed from the set's own constants (not literals), placed with the id off.
- The PLAN band of that move, from the set constants (A2 gap / level / stack walk; A4 grip height over the floor, each
  chain's distance from z 24, near chain in the passage box, far chain in `A4_GRILLE_ZONE`, `door` = the grille's door
  id; A5 chimney w and h, swing gap and bar height; A6 drop height, the point inside `A6_DROP` with 0.3 m clear of its
  edges and of the ladder). For A5 swing assert only the parts that pass; Q2's landing depth is an `it.todo`.
- Kit on / off texts: rebuild `buildCtcourse(new LevelBuilder(), { replan: true })` with `flags.kitMoves` set to the
  station's kind -> the kit-on lines (each at most `COURSE_TEXT_MAX`); off -> today's lines (the existing assertions
  `a6PumpHouse.test.ts:329`, `:337`, `a5Substation.test.ts:1001` stay as they are).
- A4 only: on the built def, `deadweight` on -> `press(A4_GRILLE_MOTOR, 0)` returns `REFUSE_KIT_HELD`, `g-a4-grille`
  and `g-a4-grille-motor` shut, `locked(A4_GRILLE_DOOR)` true; off -> the existing test at `:435-460` unchanged.
- A4 only: the chain skins stand at the two grips.

## Checks (cloud: these only)
- `npm run typecheck:fast`
- `npx vitest run tests/courseStation.test.ts tests/ctcourse/replan/a2CarriageShed.test.ts
  tests/ctcourse/replan/a4GoodsShed.test.ts tests/ctcourse/replan/a5Substation.test.ts
  tests/ctcourse/replan/a6PumpHouse.test.ts tests/courseConsole.test.ts tests/marlowN4Hold.test.ts tests/kit/kitApi.test.ts`
  (the last three: CourseMode rigs and Player's API, unchanged files that must stay green).
- Pending PC run (write it so in the report): the replan e2e modules `a2CarriageShed`, `a4GoodsShed`, `a5Substation`,
  `a6PumpHouse` with every kit id off (the stand-in path must be unchanged); no kit-on e2e until a K slice ships its move.

## Done when
- With every kit id off, every existing test in the files above passes unchanged except where a line moved (the A4
  chain skins) and the stand-in behaviour is byte-for-byte today's.
- The five spots are in the built level with the numbers above; `kitMoveOn` reads only `flags.kitMoves`.
- With a station's id on: stand-in shut, held gates refuse, done = place + credit, `onKitDone` credits only its own
  station, a retry drops the credit and resets the kit on the host.
- tsc clean, the named vitest files green, STATIONS.md updated, changelog fragment written.
- Report appended below (what changed, test counts, deviations, the pending PC runs), then `status: done
  feature/marlow-kit-wire <sha>`.

## Assumed decisions (logged; each with its undo)
- **A1** `kitMoveOn(kit)` = `flags.kitMoves.has(kit)` (PLAN "The Marlow API": Marlow rewires it so; the set only ever
  holds `KIT_BUILT` ids), housed in `stationDef.ts` so the set files can read it. Undo: `kitIdOn(kit)` from
  `teamMoves.ts:52` (same answer for the five part 2 kinds).
- **A2** Done with the kit on = the existing place flag + a kit credit from `onKitDone`. Reason: Deadweight and Plank
  Bridge fire once per crossing (one player through), the station needs both players through; the place keeps that.
  Undo: `kitDone` sets the station's `doneFlag` directly (done on the first completed move).
- **A3** Only `spot === station id` credits; a free move (`''`) never does, Drop Catch included. Undo: accept `''` for
  `dropCatch` while station 16 is live.
- **A4** Held gates (section 3) with the refusal `No power here. This one takes the co-op move.` Undo: make
  `g-a4-grille-motor` a flag gate and drop `g-a4-grille` (STATIONS SA11 and A4 tests change with it).
- **A5** A4's spot `door` is the world door's anchor id (what `world.doors.list[i].anchor.id` holds), not the course
  name `A4-grille`. Undo: pass `A4_GRILLE_DOOR` if K1 resolves doors through the course layout. Lead: confirm with
  Player before K1.
- **A6** Kit-on objective / retry text is picked while the level builds, from each page's own `flags.kitMoves` (host
  and client use the same URL / /preview/ default, so they match; text only, no gameplay). Undo: keep the stand-in
  text until a per-objective kit line exists in `CourseObjective`.
- **A7** No collision geometry changes in this slice (no visual sign-off or level validator in a cloud run). The three
  geometry gaps are Q1-Q3 for the lead.
- **A8** A station retry with the kit on resets the kit on the host only (`g.team.resetKit()`); the client's own reset
  at a station retry (a laid board on the client page) is Player's, through `src/net`. Undo: none here; ask Player.
- **A9** A6's drop point z 65.4, not the opening's middle 65.5: 0.3 m body clearance from the ladder at z 65.85. Undo:
  65.5.
- **A10** A4's chain skins move to the grips and a far pair is added (visual only). Undo: leave the dressing.
- **A11** A5 swing spot on the gantry as built (z 44.6) though Q2 shows the landing fails; Q2's fix moves it.
- **A12** An objective step keyed on a place flag can show done before the credit lands (A6: both in the pit, the catch
  credit a moment later). Accepted for the prototype.

## Questions for the lead (geometry; not this slice; each must be settled before that move's K slice ships its id,
## or /preview/ soft-locks at that station: the stand-in shuts the moment the id is in `KIT_BUILT`)
- **Q1 A2 board landing (before K5b).** The far site barrier (1.1 m, `a2CarriageShed.ts:238-241`) runs wall to wall
  except z 11.3-12.7, which the walkway's hoarding fills (`:242-246`), so a laid board has nowhere to bear on the far
  landing (x 69.04-69.75). A plain gap in the barrier is a solo way round (running hop 3.2 m over the 3.0 m pit from the
  lane; a mantle out of the 1.6 m pit, per `:19-21`). Option: a 1.0 m board slot in the barrier opposite the lane strip
  z 12.7-13.7, with the near edge notched to x 65.7 there (gap 3.3: over the hop, inside the band) and the pit floor at
  the slot lowered to -2.0 (over the 1.8 m mantle). Michael-level if it touches the forced-co-op rule.
- **Q2 A5 swing landing (before K4).** On the line z 44.6 the far landing is 0.55 m deep (drums `A5_DRUMS_RP` x
  59.6-61.8, z 43.9-47.5, `a5Substation.ts:82`; band 0.75 m) and the gantry's posts stand on both edges on the line (x
  62.2-62.35 and 65.85-66.0, `:238-239`). Option: a short swing bar along the east edge (two posts at z 42.4 and 43.6 on
  x 65.85-66.0, pipe at y 2.6) and the spot to z 43.0 (0.6 m clear of the plates' hoarding at 42.1 and of the drums at
  43.9; landing 4.15 m deep); the cable-tray gantry stays as dressing.
- **Q3 A5 chimney east wall (before K3; looks, not function).** The gap's east side is L4's wall and lid, 3.6 m
  (`types.ts:126` `HOLD_H` 3.2 + the 0.4 m lid, `facility.ts:674`); the chimney climbs to 6 m with nothing at its back
  above 3.6. Option: a 0.5 m noLedge face on L4's wall line (x 69.75-70.25, z 30.25-35.75, y 3.6-6.0); it closes the
  L4 roof from the gap too.

## Risks (for the K slices, logged)
- A6: the stand-in ladder (z 65.85) stands inside the 1.0 m opening; K2's "clear 1.0 x 1.0 m opening" test may count it.
- Co-op: a host and client with different `?kitmoves=` disagree on offers (Player's rule: the host refuses ids it has
  off); Marlow follows the host only.
- Two players everywhere: no solo path is added; a lone player at a kit-on station waits for the partner, as today.

## Report (builder appends below)

### Report (Night Shift | Cloud Builder 6, 2026-10-26)
**Branch:** feature/marlow-kit-wire, head d3e2e747b9eacc44e8c0a8a3ea8f0800f66a46ae, base db7ef88fd (feature/marlow-kit-base).
14 files, +617 / -48, only the brief's files.

**Commits:**
- 2a530c18: the code.
- 637fac91: the tests.
- d3e2e747: STATIONS.md and the changelog fragment.

**What changed**
- **`kitMoveOn`** lives in `stationDef.ts` and returns `flags.kitMoves.has(kit)`. `courseState.ts` re-exports it, and the
  stale KS1-KS5 comment is rewritten.
- **`CourseState`:**
  - `StRt.kk` holds `kit:<id>`.
  - `advanceStations` needs the place flag, plus the kit credit while the kit is on.
  - New `kitDone(kind, spot)`.
  - `startStation` sets the credit of each kit-on station it passes.
  - `GateRt.kit` covers the stand-in and the station's gates on the stand-in's doors.
  - `press` skips a held gate and returns `REFUSE_KIT_HELD` when the press was its switch (a new `switchedBy` helper:
    lever / egress / pickup switch, bolt door, pair plate, isolator).
- **`CourseMode`:** `onKitDone` (sets `dirty` on a credit); `onStationRetry` calls `g.team?.resetKit()` when the station's
  kit is on.
- **Spots,** all placed unconditionally:
  - `a2-plank` (from the new `A2_BOARD_STACK`, which the dressing loop now uses).
  - `a4-deadweight` (from the new `A4_DEADWEIGHT` { x 101.75, off 1.5 } and `A4_GRILLE`; the chain skins move to both grips).
  - `a5-chimney` and `a5-swing` (from `A5_GAP`, `A5_WALLTOP`, `A5_CABLE_TRENCH`, `A5_GANTRY`, `A5_GANTRY_PIPE_Y`).
  - `a6-dropcatch` (the new `A6_DROP_CATCH` { 52.5, 65.4 }, at `A6_HANG.deck`).
- **Kit-on texts** are exported constants (`A2_PLANK_KIT_TEXT`, `A5_CHIMNEY_KIT_TEXT`, `A5_SWING_KIT_TEXT`,
  `A6_DROP_KIT_OBJECTIVE`, `A6_DROPCATCH_KIT_RETRY`). They are picked in the builders, while the set builds, and the existing
  constants keep the kit-off text. Every line is at most 90 characters.
- **STATIONS.md:** the section 2 rows have their spots; the section 6 row 16 has its kit-off line; section 8 has the credit
  sentence; SA11 is updated; SA16 is new.
- **Changelog:** `changes/feature-marlow-kit-wire.md` (`kind: minor`; it parses, `tests/changesFragments.test.ts` green).

**Tests**
- `npm run typecheck:fast`: clean. eslint on all 12 changed ts files: clean.
- `npx vitest run` on the 8 named files: **240 passed, 2 todo**:
  - courseStation: 60 (8 new).
  - The A2 / A4 / A5 / A6 set tests: 3 + 4 + 3 + 3 new, plus Q1 and Q2 as `it.todo`.
  - courseConsole, marlowN4Hold, kitApi: unchanged and green.
- With every kit id off, every existing test passed unchanged; no existing assertion was edited.
- `node scripts/doc-lint.mjs`: 1 error, `docs/systems/coop.md:386` links `docs/coop-kit/PLAN.md`, which does not exist on
  this base. It is on the base too (checked with my changes stashed), and it is not a G-file of this brief; for the lead.

**Deviations**
1. **`door` is a string of the anchor id.** `KitSpot.door` is a `string`, but `p.doors[...]` holds the door anchor's
   numeric id. The spot carries `String(p.doors[A4_GRILLE_DOOR])` (A5: "the door anchor's id"), and K1 must compare
   `String(anchor.id)`. Lead: confirm with Player, as A5 says.
2. **Fake team in the rig.** The courseStation rig's fake game gets `team` in the new tests only, set on the mode's `g` by a
   local helper, so the shared `rig` stays as it was.
3. **A6 retry-line source.** The kit-on retry line is chosen in the builder's radio loop, not by editing
   `A6_RETRY_LINES`, so that constant keeps its kit-off text (A6).
4. **The bolt test.** The held-gates test places the presser on the bolt's side after the rig's step, because the rig
   resets the host's feet each step.

**Pending PC run:** the replan e2e modules `a2CarriageShed`, `a4GoodsShed`, `a5Substation`, `a6PumpHouse`, with every
kit id off (the stand-in path must be unchanged). No kit-on e2e until a K slice ships its move.

**Open for the lead:**
- Q1-Q3 as written (the A2 board landing, the A5 swing landing, the A5 chimney's east wall). Each is unchanged and must be
  settled before its K slice adds the id, or /preview/ soft-locks there.
- The A5 door-id form (deviation 1).
- The `coop.md` link error.
