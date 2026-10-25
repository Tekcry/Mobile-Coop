# J14 Marlow Yard re-plan: build plan
Owner: Marlow Build. Status: current (job doc).

Lead: Night Shift | Marlow Build. Planner: Opus 5.5, master 94e72b1cd (4.103.3). Brief: `docs/marlow-replan/BRIEF.md`
(Michael's words, picks, A1-A12). Approved page: `REPLAN.md` (Michael ~19:16 "Approve as drawn (Recommended)"); drawing
`replan-plan.svg` = `graph.json`. Every `path:line` below is origin/master 94e72b1cd unless a branch is named.

## 1. What is built today (the code this plan changes)
- **Map.** `ctcourse` = facility shell + eight set parts merged in `src/world/maps/ctcourse.ts` (`SET_BUILDERS` :33-42,
  each `build<Set>(b, kit): SetPart`); shell `ctcourseSets/facility.ts` (walls :145-210, one site floor slab :659,
  holding rooms `types.ts` `HOLD_BOX` :115-123, `HOLD_DOORS` :139-147); greybox helpers `ctcourseGreybox.ts`
  (`boostWall` :250, `coopDeck` :324, `throwGateway` :388, `hangPlate` :448, `syncStation` :532, `jamRelay` :582). No
  floor holes in Marlow; `slabWithHoles` / `pit` exist in `src/world/maps/bunkerUpper.ts:207`, `:237`. Map list
  `src/world/maps/index.ts:20`; the room's map `src/net/session.ts:64`; `start` carries `map` (`src/net/protocol.ts:285`).
- **Bays and checkpoints.** One bay per set (A1-A8), holding rooms L1-L7 are the airlocks; `CourseState.checkpoint`
  (`src/game/course/courseState.ts:179`), `seal()` :1241-1251, `startAt(n)` :544-556, start-at `opts.courseBay`
  (`src/game/gameState.ts:171`, `courseMode.ts:285-290`). No station / start-mark concept exists below the bay.
- **Spotted.** `BayDef.spotFail` (`src/game/course/courseDef.ts:179-183`) set only for A2 from `SPOT_FAIL`
  (`ctcourse.ts:59-61`, merged :109); check `spotFailed` (`src/game/course/spotFail.ts:16-23`, live non-passive guard
  `alerted`); trigger `courseMode.ts:592-600` -> `restartCheckpoint()` :398-406 -> `bayRestart` :696-721 (squad
  respawn :913-958, `checkpointReset`, `ct.repair(-1)`, lamps :1015-1030, doors, respawn at `checkpointPos()` :887-900).
  A3's camera send-back is a separate `HallRule` (`src/game/jammer.ts:401-449`; `A3_HALL` `a3OfficeRange.ts:76-83`,
  zones :315-316; `ctDevices.ts:914-957`; wire `back` `coopHost.ts:1887-1893`, `coopClient.ts:899-907`).
- **Restart scope.** `CourseState.restart()` (:563-595) resets the bay's gates, the flags set in the bay (`flagBay`),
  timers, role claims; drills already ticked are kept.
- **Drills.** `DrillDef` has no time limit (`courseDef.ts:117-135`); ctcourse has no drills (`types.ts:372`); timed
  windows re-arm and never fail (`courseState.ts:602-611`, `:1016-1021`): A2 isolator 15 s (`marlowCircuits.ts:159`),
  A4 loop 60 s (`a4GoodsShed.ts:66`), A8 loop 60 s and isolator 25 s (`a8Strongroom.ts:99`, `:481-493`). The drill
  pointer (Q18 "Keep as built") is `courseMode.ts:74-99`, dormant on ctcourse.
- **Guards.** Per set `p.squads` + `p.bay.squad`; today A1 1 (passive checker), A2 3, A3 1, A4 3, A5 1, A6 1, A7 1,
  A8 3 = 15 (`a2CarriageShed.ts:297-303`, `a3OfficeRange.ts:311-312`, ...); cap `SET_GUARDS_MAX` 3 (`types.ts:191`,
  `:465`). No alarm team on ctcourse (`stealthSystems.ts:564-566`).
- **Downed.** `REVIVES_PER_MISSION` 2 (`src/game/reviveClock.ts:10`), but course ratings add syringes to the cap
  (`courseMode.ts:832-834` -> `coopHost.ts:834-837`, CONFORMANCE M3 / P R35); one player "out" restarts the bay
  (`coopHost.ts:568-581`, `:1872-1876`); solo Start not blocked (`src/net/coopUi.ts:628-635`, P R36).
- **Wire / save.** `PackedCourse` (`courseState.ts:89-108`), `parseCourse` (`protocol.ts:750-792`), `CourseWire`
  (`courseWire.ts:14-35`). Save `course:fallow` (`src/save/courseRecord.ts:11-31`), no change needed.
- **Co-op kit.** On master: boost, throw, relay ladder, hang-down, two-person rope, vent (`src/game/teamMoves.ts`,
  `src/player/ventOpen.ts`), course `hold` / `timedHold` gates (`courseDef.ts:57-59`). The five new moves are Player
  Build's (origin/feature/coop-kit `docs/coop-kit/PLAN.md` part 2, K0-K5b, flag `kitMoves` ids `deadweight`,
  `dropCatch`, `chimneyPair`, `swingPass`, `plankBridge`), and part 2 waits for Campaign's mission-engine kit PR (KIT0
  registry + NET kinds). Plan check not yet passed on coop-kit (its STATE, 18:40).
- **Tests.** Each set's greybox checksum `GREY` (e.g. `tests/ctcourse/a2CarriageShed.test.ts:80`), shell pin
  `tests/ctcourse/facility.test.ts:60`, light files `tests/ctcourse/<set>.light.json` (`CTLIGHT_WRITE=<set|all> npx
  vitest run tests/ctcourseLight.test.ts`, :151-167), dead circuits `tests/marlowLightingCircuits.test.ts:30-33`.
  e2e: `e2e-ctcourse` parts 1-4 (`scripts/run-e2e.mjs:45-48`; `scripts/e2e-ctcourse.mjs:40-42` groups sets in pairs),
  `e2e-section-rating` Marlow blocks (:252-391), `e2e-coop` Marlow guard block needs the A1 checker
  (`scripts/e2e-coop.mjs:2057-2110`). `e2e-course` runs courselab / Fallow only. DIRECT_COVERS
  (`scripts/e2e-affected.mjs:253-302`): `ctcourseSets/` -> `e2e-ctcourse`; `src/game/course/` -> GAME + course +
  ctcourse; `courseMode.ts` -> + section-rating; `src/net/` -> co-op group.

## 2. How the re-plan is built
- **Dark as its own map id (A16).** The re-plan builds as map `ctcourseReplan` (unlisted, like `ctcourse`): the same
  set builders called with `{ replan: true }`. A host with `?marlowreplan=1` opens its room on `ctcourseReplan`; the
  client loads whatever map the host's `start` names, so both pages always build the same geometry and the client
  needs no flag. With the flag off nothing changes: `ctcourse` builds byte-identical (the built `GREY` checksums are
  the proof). At switch-on, slice C1 points `ctcourse` at the re-plan and deletes the built branches.
- **Where the code goes (A24).** New per-set code (geometry, closers, stations, stand-ins, lamps) lives in new files
  `src/world/maps/ctcourseSets/replan/<set>.ts`, called from `ctcourse.ts` right after each set builder when `replan` is
  set; the set files only gain small `if (!opts.replan)` guards round the pieces the re-plan removes (the A2 deck, the
  A6 staff stair, the extra guards, the A4 kettle loop). Built variant and #441's lines stay untouched.
- **Bays and stations (lead note 2).** Bays stay one per set: `PackedCourse.bay`, `courseBay` / "Start at bay N",
  the holding-room checkpoints and `?course=all` keep meaning A1-A8. The 18 numbered steps are **stations** inside the
  bays: `BayDef.stations` (`courseDef.ts`, from `SetPart.bay.stations`), each with its global number `n` 1-18; the
  live station is `PackedCourse.st` (wire), read by tests and route-runs as `__app.current.mode.course.station()`;
  `?course=station:<n>` starts at a station's start mark (dev / tests / route-runs). STATIONS.md (slice D1) is the
  table: station number, bay, lesson, start marks, retry kind, `drill_s`, guards, gates.
- **The station type** (written by S0 exactly as below in `src/game/course/stationDef.ts`; R1 never edits it, a change
  goes through the lead as an S0 fix):
  ```ts
  /** One numbered step of a Marlow bay (J14). Retry = back to `marks`, only this station's guards / gates / flags reset. */
  export interface StationDef {
    n: number;                       // 1-18, the badge number (REPLAN, STATIONS.md)
    id: string;                      // 'a2-plank'
    lesson: string;                  // move or skill taught, the graph's teach id ('plank_bridge')
    marks: readonly [{ x: number; z: number; y: number; yaw: number }, { x: number; z: number; y: number; yaw: number }];
    retry: 'none' | 'station' | 'caught'; // none: nothing can fail; station: spotted / drill = retry (A1-A7); caught: A8 (A14)
    drillS?: number;                 // the graph's drill_s: the timed window that fails into a retry
    guards: readonly string[];       // squad ids reset by a retry (A17)
    gates: readonly string[];        // gate / device ids reset by a retry
    doneFlag: string;                // the flag that ends the station (the next one starts)
    kit?: 'deadweight' | 'dropCatch' | 'chimneyPair' | 'swingPass' | 'plankBridge'; // kitMoves id; stand-in while off (A18)
    standIn?: string;                // the gate the host opens when `kit` is off on the host
  }
  ```
- **Retry rule (BRIEF A1, A2; A14, A17, A22, A23).** A1-A7 (`retry: 'station'`): a guard in combat on a player, a
  camera's full detection on a player, or a station's drill window ending with the drill not done -> LANTERN's line,
  then both players back to the station's two marks after `SPOT_HOLD`, that station's guards, gates, devices and flags
  reset, earlier stations stay done. A8 (`retry: 'caught'`): suspicion, search and line-of-sight breaks play out as on a
  mission; a guard holding combat on a player for `CAUGHT_HOLD` 2 s, or a timed step ending, retries that step the same
  way. Drills retry in place (the station's own marks, never a checkpoint reload). Downed is the campaign rule,
  unchanged (BRIEF ~11:20 (3); REPLAN "no change to the downed rule"; level-design 9.4 [Training]): past the revives,
  one player out, or both players down, the bay restarts from its holding room, a full reset (G312), as on the built
  yard today. No strict rule, no send-back, no fail screen anywhere: the A2 `spotFail` and the A3 `HallRule` are off on
  `ctcourseReplan`.
- **Guards per lesson (Q11; Michael picked "12, add two (Recommended)" ~20:40, BRIEF "Michael picked").** A1 0 (the
  seated checker stays, passive, not a guard: A11, so `e2e-coop.mjs:2057-2110` keeps working), A2 1 (shunter), A3 0
  (one IR camera), A4 3, A5 2, A6 1, A7 2, A8 3 = 12. Ordinary armed guards, no alarm team (A12). A1 / A3 stay at 0
  ("Two sections have none" on the approved page) and A4 / A8 stay at the training cap of 3 (`SET_GUARDS_MAX`, LD 4.9).
  The two extra:
  - **A7 +1, station 17 (the pod leg):** a second technician whose round crosses the pod approach, in view of the hall
    leg through the cage mesh. With only the hall leg guarded, "covering each other" (REPLAN A7) worked one way; now
    each partner covers the other. Same retry ("Seen: retry that step"). Graph: counted on `a7-hall` (`guards` 2: his
    round runs from the hall's east side across the pod approach); `a7-pod` stays a quiet connector with no guard (LD
    3.8; plan check 2 polish 2, `validate-run.txt` rerun).
  - **A5 +1, station 13 (the throw):** a static watcher at the release kiosk facing the floodlit strip. With the roving
    patrol alone the strip is unwatched for part of his round, so the pair could wait him out and skip the floodlight
    jam the drill teaches; the watcher makes the jam necessary ("Seen in the floodlight: retry from behind the
    transformer"). Graph: `a5-inner` `guards` 2.
  - **Fallback:** if G-A6's noise test comes out silent (BRIEF A6), the A5 watcher moves to A6 as a listener at the pit
    side (A5 1, A6 2, still 12), so the drop catch stays forced by a guard rather than a rule.
- **Side routes closed except A8 (Q24).** A2: gap 1/2 lane mouths (extend the `A2-21` closer idiom,
  `a2CarriageShed.ts:69-72`, `:216-222`), the staging deck and its stair (:256-268, dressing :430-465, :633-686),
  the cabin back door (:82, :242). A3: the office doors (:89-94, :249-267). A4: west back aisle, aisle 2, east lane,
  mezzanine stairs (:244-283) by pallet end frames; one floor route for both (M4). A5: switchroom back door (:308-313),
  the north trench path (:319-321), the beam-panel jam route (:86, :95, :270). A6: staff stair (:228, :245-259) and the
  ledge relay route. A7 keeps its split (one route under J12 A23). A8 keeps its side routes and the public stair.
- **Geometry on the 0.5 m grid** (graph.json, STATE "Geometry changes"): A2 3 m open wheel-drop pit across the east end
  between `a2-east` and the L2 door, cabinet 2 moved to the west side (`A2_CAB2` :85), wheel stops / track panels /
  east rake trimmed (:134-141, :210-213); A3 locked fire door at the corridor mouth (x 79.5, z 9-12.5), riser cupboard
  and services crawl; A4 counterweighted lift grille at the passage mouth (`facility.ts:175`, `:179`), kettle loop
  removed (:59, :118-126, :308-310, :382, :409); A5 6 m perimeter wall, the gap at L4's far door (width: A19), inside
  access ladder, 3.5 m cable trench (A19), drums / apron switch / bulkheads moved (:107, :172-183, :332-344); A6 drive
  pit sunk 1.6 m with the low outfall door to L6 (cage move, :106-110, :263-300), staff stair closed; A7 full-height
  glazed lobby screen (:275-291); A8 public stair 2.4 m (:173, :379-382; column :169 / desk :186 to clear), glazed office
  west wall (:399-401). Floor holes: S0 cuts the site slab from per-set hole tables (each set's `replan/<set>.ts`
  exports its `FLOOR_HOLES`), so the set slices never share a file.
- **Every light works (Q2; J10 hand-off, A20).** On `ctcourseReplan`: groups 49 (A4 back aisle) and 69 (A6 sump / west)
  live, A8 vestibule and west bays and the A4 dispatch office get fittings on their own switches, the A2 coat corner a
  lamp. The circuit table is S0's (`marlowCircuits.ts` variant), the lamps are each set slice's.
- **The five new-move stations (BRIEF A3, A18).** Built in their sets with the move's real geometry (pit, grille, wall
  gap, trench, drive pit) plus a **stand-in**: a gated crossing (A2 a hoarded maintenance walkway over the pit, A4 the
  grille's own motor button, A5 a wicket in the perimeter wall and a hoarded trench footbridge, A6 the cage's fixed
  ladder into the pit), whose gate the host opens at bay start when the station's `kitMoves` id is off on the host,
  and keeps locked when it is on. Gate state rides the existing course wire (`gates`), so both pages agree. Each
  station's real hookup (KS1-KS5) lands after Player Build's move slice is on master.

## Claims
```claims
files:
  - src/core/flags.ts
  - src/world/maps/index.ts
  - src/world/maps/ctcourse.ts
  - src/world/maps/ctcourseGreybox.ts
  - src/world/maps/ctcourseSets/types.ts
  - src/world/maps/ctcourseSets/facility.ts
  - src/world/maps/ctcourseSets/{a1Gate,a2CarriageShed,a3OfficeRange,a4GoodsShed,a5Substation,a6PumpHouse,a7DataHall,a8Strongroom}.ts
  - src/world/maps/ctcourseSets/replan/**
  - src/world/lighting/marlowCircuits.ts
  - src/game/course/stationDef.ts
  - src/game/course/courseDef.ts
  - src/game/course/courseMarks.ts
  - src/game/course/courseState.ts
  - src/game/course/spotFail.ts
  - src/game/course/courseWire.ts
  - src/game/modes/courseMode.ts
  - src/net/protocol.ts
  - src/net/coopHost.ts
  - src/net/coopUi.ts
  - src/net/session.ts
  - src/ui/hud/courseHud.ts
  - tests/ctcourse/replan/**
  - tests/ctcourseLight.test.ts
  - tests/ctcourse/facility.test.ts
  - tests/ctcourse/a2CarriageShed.test.ts
  - tests/marlowLightingCircuits.test.ts
  - tests/courseStation.test.ts
  - tests/courseRuleFixes.test.ts
  - tests/spotFail.test.ts
  - tests/course.test.ts
  - tests/courseMarks.test.ts
  - scripts/e2e-ctcourse.mjs
  - scripts/e2e-ctcourse/replan/**
  - scripts/e2e-ctcourse/revive.mjs
  - scripts/run-e2e.mjs
  - scripts/e2e-times.json
  - scripts/e2e-section-rating.mjs
  - docs/marlow-replan/**
maps: ctcourse, ctcourseReplan
protocol: course
save: none
```
Wire: `course` gains `PackedCourse.st` (the live station), `rs` (retry count), `rt` (the station of the last retry)
and `rc` (its cause), all R1;
`start` / `lobby` are unchanged (the host names `ctcourseReplan` in the existing `map` field); the train bumps
`PROTOCOL_VERSION`. Save: none (`courseRecord` keys bays).

**Collisions with open work** (`gh pr list` and origin/feature/* changed vs master, 2026-10-25 ~20:45):
- **#441 feature/marlow-objective-place (J5, ours):** `ctcourseSets/a2CarriageShed.ts`, `a3OfficeRange.ts`,
  `a6PumpHouse.ts` (objective lines), `src/ui/hud/courseHud.ts`, `scripts/e2e-ctcourse/a2CarriageShed.mjs`,
  `a3OfficeRange.mjs`. Order: #441 lands first. Set slices A2 / A3 / A6 touch those set files only with guards far
  from the objective lines (their new objective lines go in `replan/<set>.ts`); R2 (the HUD) is cut after #441 is on
  master. Built e2e modules are never edited (the re-plan has its own under `scripts/e2e-ctcourse/replan/`).
- **feature/hud-guidance (+ -a1..-b4, #447, Campaign):** `courseMode.ts` (removes `blips()` near :1118), `coopHost.ts`,
  `scripts/e2e-ctcourse.mjs` (:323 no-minimap assert). Different lines from R1 / F1 / S0; whichever lands second
  resolves a trivial conflict.
- **#445 / feature/test-runner-j20-* (Test Runner):** `scripts/e2e-ctcourse.mjs` (:362 per-set guard check: every
  guard alive and above -5 m). Our only sunk space is the A6 pit at -1.6 m with no guard; an empty set passes.
- **coopHost.ts** also on feature/mission-engine(-flg-gb6), guard-rules-s2, coop4: F1 edits only the `addSyringes`
  body (:834-837); `goOut` (:568-581) is not edited by this job.
- **src/core/flags.ts** also on guard-ai-g327 (#438), char-shadow-meter, campus-greybox, gm-look / gm-polish,
  mission-engine, coop4, and feature/coop-kit's `kitMoves`: one added field each, trivial.
- **J12 feature/validator-port (ours):** `scripts/level-validate.mjs`, `docs/level-design.md`,
  `docs/level-validator/**`, S9's `docs/marlow-final/graph/**` (the as-built graph). This job claims none of those; it
  supplies the re-planned graph (`docs/marlow-replan/graph.json`).
- **J13 feature/route-runs-2 (ours):** `scripts/route-run*`, `docs/route-runs/**`, `docs/level-design.md`. No overlap;
  J13 reads our graph, the station hook and R1's `window.__course.restarts` / `lastRetry` / `retryOff(n)` (R4c). The
  J13 lead is told R1's names and the cause mapping (`seen` / `caught` -> seen, `timer` -> timer, `out` / `down` ->
  other; R1 "Retry-off switch") when this PLAN passes its checker.
- **feature/coop-kit (Player):** `teamMoves.ts`, `teamController.ts`, `src/world/plankBridge.ts`,
  `src/world/counterweightGrate.ts`, `src/game/kit/*`, `flags.ts` (`kitMoves`). No overlap except `flags.ts`; KS1-KS5
  only call Player's devices from `replan/<set>.ts`.
- **feature/light-realism (Sector Ops J10):** hands Marlow's pockets to Marlow Build (its PLAN L3-H, `marlow.md`); no
  file overlap.
- **feature/map-ready (Sector Ops J21, the biggest overlap):** `courseMode.ts` (bay squad kinds listed at load, its S3),
  `protocol.ts` / `session.ts` / `coopHost.ts` / `coopUi.ts` / `coopClient.ts` (new `mr`, `go` messages), `flags.ts`,
  `scripts/e2e-ctcourse.mjs` (`mapready=1` co-op asserts), map `ctcourse`. Different functions from R1 / F1 / S0; the
  orchestrator orders: R1 and F1 first (small), map-ready rebases its `courseMode.ts` hunk. `ctcourseReplan` must be
  in map-ready's warm list when both are on master (a one-line follow-up for whichever lands second).
- **feature/player-batch-j19 (Player):** `session.ts`, `coopUi.ts`, `protocol.ts` (`lobby` / `start` gain `ff`),
  `coopHost.ts`. R1's `session.ts` line (the room map) and F1's `coopUi.ts` Start check are separate hunks.
- **feature/mission-rules (+ -r1 / -r2 / -r3, Campaign J7):** `session.ts`, `coopUi.ts`, `coopHost.ts`, wire (`ms.f`
  gains a fact bit). Its R4 (refuse a campaign start below 2 players, the lobby says why) and R5 (`addSyringes` does
  nothing in a campaign mission, `coopHost.ts:858` on its branch) touch the same Start check and the same `addSyringes`
  body as F1. Order: F1 first (small, wave 1, from master); mission-rules R4 / R5 rebase on it and widen F1's checks
  rather than add second ones: one "needs two players" check (Course, then campaign) and one "no syringe grant outside
  Sector Ops" rule (Course, then campaign). F1 writes each as one small named check so R4 / R5 extend it in one line.
  Wire: different message, one train bump.
- **claims-check (2026-10-25 ~21:23, master's script, `--plan` on this PLAN):** 43 overlaps (41 at plan check 2; the
  two new are slice branches of campus-greybox and hud-guidance), all files above plus `flags.ts` one-liners
  (campus-greybox x4, char-shadow-meter x2, guard-ai-mission-hooks, sector-batch, guard-rules x4) and `coopHost.ts`
  (player-hygiene, guard-rules, sector-batch); mission-rules x4 (above); test-runner-j20 (14 branches) and
  campus-greybox on `scripts/run-e2e.mjs` (S0 adds parts 5-8 to `PARTS` only: a separate hunk); test-runner-j20 on
  `scripts/e2e-ctcourse.mjs`; coop-kit and player-hygiene on `protocol.ts` (R1 touches only `parseCourse`), coop-kit
  on `coopHost.ts` / `flags.ts`. No other job claims a Marlow set file, `ctcourseSets/replan/**`,
  `src/game/course/**`, `scripts/e2e-ctcourse/revive.mjs` or the map `ctcourseReplan`.

## Slices and PRs
Each slice is one PR to master unless grouped. Branches `feature/marlow-replan-<slice>` in
`C:/NightShift/Mobile-Coop-marlow-replan-<slice>`. Sizes count code and tests (light files and docs not counted). Every
code PR: `npm run typecheck:fast` + the named vitest files on the desktop; `affected-e2e` on the laptop by itself; the
lead requests the co-op group (`e2e-coop`, `e2e-netmove`, `e2e-ctcourse`) where noted.

**D1 Station sheet (Opus, docs).** `docs/marlow-replan/STATIONS.md`: the 18 stations as `StationDef` rows (number,
bay, lesson, two start marks on the 0.5 m grid with y and yaw, retry kind, `drill_s`, guard ids, gate / device ids,
done flag, kit id and stand-in gate), the A8 retry steps (board drill, gallery under C2, office console, lobby throw +
paired hack), LANTERN's retry line per station (what and where, G343), the security register per set (cameras, beams,
guards: LD 4.11, 13; guards A1 0, A2 1, A3 0, A4 3, A5 2, A6 1, A7 2, A8 3 = 12, with station 13's kiosk watcher and
station 17's pod-leg technician in their stations' `guards` lists and the reason per extra guard from section 2; the A6
fallback noted on station 16), and the order inside A4 (deadweight before the console press, graph.json :98). It is
the data every set slice copies. Est. docs only. Checks: doc lint. Done: every badge of `replan-plan.svg` and every
graph space with `drill_s` has a row; marks sit inside their graph space's `area` (G0). Flag: none.

**G0 Graph for the gates, first pass (Sonnet, docs / data; lead note 2).** `graph.json`: `area` box lists
(`[minX, minZ, maxX, maxZ][]`, V6 schema) on all 53 spaces, copied from the v7 as-built graph
(`origin/feature/level-validator-v7:docs/marlow-final/graph/ctcourse.json`) where a space keeps its built box, drawn
from `replan-plan.svg` / the set constants for the new or changed ones (A2 pit sides, A5 gap / walltop / apron strips,
A6 pit); link `at` where a shared edge has 2+ gaps; `meta.taught_by` and the `teach:` tags are already in (8217b0628,
A13). Stand-in kinds and `move` fields stay until J12 PR A lands (G1). Rerun the master validator; update
`validate-run.txt`. Est. docs only. Done: every space has `area`; validator count unchanged except the noted WARNs.
Flag: none.

**S0 Variant base (Sonnet, strict Opus brief; PR 1).** The flag `marlowReplan` (`?marlowreplan=1`, default off,
`src/core/flags.ts`); map `ctcourseReplan` registered unlisted (`maps/index.ts`, a second `MapDef` in `ctcourse.ts`
built with `{ replan: true }`, its own `registerCourse`); `SET_BUILDERS` take `(b, kit, opts)`; `SetPart.bay.stations`
(`types.ts`, `checkSetPart` checks station numbers, marks inside the set box, guards in the squad); the new
`src/game/course/stationDef.ts` (section 2, verbatim); eight stub files `replan/<set>.ts` (a no-op `replan<Set>(b, kit,
part)` plus empty `FLOOR_HOLES`), each called from `ctcourse.ts` right after its set builder when `replan` is set (S0
does not edit the set files; the set slices add only their `if (!opts.replan)` guards there); `facility.ts` cuts the
site slab round every set's `FLOOR_HOLES` on the replan variant (a `slabWithHoles` helper in `ctcourseGreybox.ts`, from
`bunkerUpper.ts:207`); `marlowCircuits.ts` replan circuits (49 and 69 live, new groups for the A8 vestibule / west bays
and the A4 dispatch office); test harness: the light test takes `CTLIGHT_VARIANT=replan` and writes
`tests/ctcourse/replan/<set>.light.json`; e2e: `PARTS` gains `5`-`8` (`scripts/run-e2e.mjs:45-48`), `e2e-ctcourse.mjs`
parts 5-8 boot `ctcourseReplan` and walk the modules in `scripts/e2e-ctcourse/replan/` (stubs re-export the built ones
until each set slice replaces its own), part budgets in `scripts/e2e-times.json`: S0 sets the final budgets for parts
5-8 (each built pair's budget plus 30 s for the station retries); the set slices never edit `e2e-times.json`, and a part
that runs over gets one serial follow-up from the lead.
- **First commit (the seam with R1, pushed before anything else):** `src/game/course/stationDef.ts` (verbatim), the
  flag in `flags.ts`, `SetPart.bay.stations` in `types.ts`, the `stations: p.bay.stations` line in the bay merge
  (`ctcourse.ts:100-110`) and the one optional line `stations?: readonly StationDef[];` in `BayDef`
  (`src/game/course/courseDef.ts`, with its `import type`). After that commit S0 never edits `courseDef.ts` again; R1
  branches from it and owns `courseDef.ts` from then on.
- Files: the claims rows above for flags, maps, ctcourse, greybox, types, facility, replan/**, marlowCircuits,
  stationDef, `src/game/course/courseDef.ts` (the one `BayDef` line, first commit only),
  `tests/ctcourse/replan/variant.test.ts` (new), `tests/ctcourseLight.test.ts`,
  `tests/ctcourse/facility.test.ts`, `tests/marlowLightingCircuits.test.ts`, `scripts/run-e2e.mjs`,
  `scripts/e2e-ctcourse.mjs`, `scripts/e2e-ctcourse/replan/*.mjs` (stubs), `scripts/e2e-times.json`,
  `changes/feature-marlow-replan-s0.md`. Est. 800.
- Checks: vitest `tests/ctcourse/*.test.ts tests/ctcourse/replan/variant.test.ts tests/ctcourseLight.test.ts
  tests/marlowLightingCircuits.test.ts tests/e2eAffected.test.ts`; affected-e2e (e2e-ctcourse parts 1-8, levels,
  anchors).
- Done looks like: every built `GREY` checksum and light file unchanged; `ctcourseReplan` boots with
  `?autostart=ctcourseReplan&mode=course` and walks parts 5-8 green; the flag off changes nothing.
- Flag: `marlowReplan`.

**R1 Station retry runtime (Opus; PR 2; two Opus checkers: wire).** Branches from S0's first commit (which already has
the `stations?` line in `BayDef` and the `ctcourse.ts` mapping); R1 validates the stations and their `retry` in
`courseDef.ts` (`validateCourse` :324+) without touching that line; `CourseState` keeps the live station (advanced by
each `doneFlag`), `retryStation()` resets only that station's gates, flags, drill timer and role claim (earlier stations
stay done), `startStation(n)` for `?course=station:<n>`; `PackedCourse.st` + `parseCourse` (`protocol.ts:750-792`);
`spotFail.ts` generalised: `retry: 'station'` fires on a guard in combat or a camera's full detection on a player (A22),
`retry: 'caught'` after `CAUGHT_HOLD` 2 s of combat (A14), on a station's `drillS` running out (A23); `courseMode.ts`:
the trigger (:592-600) calls the station retry (LANTERN's line, `SPOT_HOLD`), resets that station's guards by id (the
`dropSquad` / `spawnSquad` path per guard, :913-958) and devices (`ct.repair` for its cameras), lamps of its circuit,
respawns both at `marks` through `checkpointPos()` / `checkpointSpawns()` (:887-900; the client is placed by the host's
`onRespawn`, no new event); the A3 `HallRule` and the A2 `spotFail` are not set on `ctcourseReplan`; the drill pointer
shows the next station's mark as built (Q18) and a drill-mark guard test pins it; the host's room map is
`ctcourseReplan` when `flags.marlowReplan` (`session.ts:64`, moved here from F1: it needs S0's flag). The built
`ctcourse` keeps its rules.
- **Route-run hooks (J13 R4c, origin/feature/route-runs-2 `docs/route-runs/PLAN.md:192-221`).** R4c's course watcher
  reads a rise of `window.__course.restarts` on every poll and names the cause (seen / timer / other). R1 gives it:
  `CourseState.restarts` (a count, 0 at match start) and `CourseState.lastRetry`, one shape on host and client:
  `type LastRetry = { st: number; cause: RetryCause } | null` with `type RetryCause = 'seen' | 'caught' | 'timer' |
  'out' | 'down'` (both in `courseState.ts`), `null` before the first retry; `st` is the station live when the retry
  fired (the one retried; for `out` / `down` the station the bay restart interrupted; 0 on a bay without stations), so
  it can differ from the live `st` after a bay restart. Packed as `PackedCourse.rs` (count), `rt` (`lastRetry.st`) and
  `rc` (`lastRetry.cause`) beside `st`. Every station retry increments `restarts` and records its cause: `seen` (A1-A7
  guard combat or a camera's full detection), `caught` (A8 `CAUGHT_HOLD`), `timer` (a `drillS` window or A8 timed step
  ending); a downed bay restart (two bullets down) also increments it, with `out` (one player out) or `down` (both
  down). Host:
  `window.__course` is the `CourseMode` (`courseMode.ts:292`), so `CourseMode.restarts` and `lastRetry` are getters on
  the state. Client: the mirror object (`courseMode.ts:1362`) gains `restarts: w.s.rs` and `lastRetry: w.s.rc ? { st:
  w.s.rt, cause: w.s.rc } : null` (the same `LastRetry`, not the live station), so the harness reads the same hook on
  host and client. No new event, no save.
- **Retry-off switch and cause names for R4c (plan check 2 fix 2).** On the second seen retry from one space R4c turns
  "that set's retry rule off ... read from J14's build" and pushes the robots past. R1 gives it
  `window.__course.retryOff(n)` on the host: `CourseMode.retryOff(n)` calls `CourseState.retryOff(n)`, which puts
  station `n` in a `retryOff` set the trigger reads live, so that station's retry acts as `'none'` (a guard alert, a
  caught hold or a drill window ending plays out with no retry) until the bay restarts (`restart()` clears the set, so a
  downed bay restart turns it back on). `StationDef` stays readonly (S0's file unchanged). Returns true, or false for an
  `n` not in the live bay (on the built `ctcourse` there are no stations: R4c keeps master's `spotFail` path there).
  Host only: retries are the host's call, the harness drives the host page (`verb()`, `setFlag()`), and the client
  mirror has no `retryOff`. Cause mapping R4c uses for its seen / timer / other: `seen` and `caught` -> seen, `timer` ->
  timer, `out` and `down` -> other. So an A8 caught retry whose alert rose more than 2 s earlier still reads as seen,
  never as a second `other` (R4c's only `restart-loop` dead stop).
- **One out and both down (level-design 9.4 [Training], unchanged; plan check 2 fix 1).** On `ctcourseReplan` a player
  out with no revives left takes the path both down takes, as on the built yard: `coopHost.goOut` (:568-581, not edited)
  calls `CourseMode.onPlayerDeath()`, the bay restarts from its holding room after `RESTART_DELAY`, a full reset with
  the bay's stations undone (G312), both respawn in the checkpoint airlock. R1 adds no `onPlayerOut` and no station
  retry on out; it only records the restart: `restarts` +1 with cause `out` when one player was still up as the restart
  began, `down` when both were down.
- **`src/net` rule:** `st`, `rs`, `rt` and `rc` are parsed in `src/net/protocol.ts` (`parseCourse`) only, as plain
  fields; no new static import from `src/game` into `src/net` (CLAUDE.md co-op rule; `import type` only if a type is
  needed).
- **Respawn points:** `checkpointSpawns()` returns the station's two marks only while a station retry is placing the
  players (host and a client rejoining during it); otherwise it returns the checkpoint airlock's slots as today, so a
  rejoin, a seal or a both-down restart never lands on a station mark.
- Files: `src/game/course/{courseDef,courseState,spotFail,courseWire}.ts`,
  `src/game/modes/courseMode.ts`, `src/net/protocol.ts`, `src/net/session.ts` (the room-map line),
  `tests/courseStation.test.ts` (new), `tests/spotFail.test.ts`, `tests/course.test.ts`,
  `tests/courseMarks.test.ts` (R1 rebases on F1, which sets its co-op `courseGrant` cases to syringe 0; the
  `parseCourse` round trip of `st` / `rs` / `rt` / `rc` goes in `courseStation.test.ts`, not `net.test.ts`),
  `changes/feature-marlow-replan-r1.md`. Est. ~1,100 (re-estimated at plan check 2: the station runtime ~650, the
  route-run hooks and `retryOff` ~150, the wire fields and mirror ~50, tests ~250; under the ~1.5k cap).
- Checks: vitest on those files plus `tests/ctcourse.test.ts`; laptop: affected-e2e (GAME, e2e-course, e2e-ctcourse,
  e2e-section-rating) + the co-op group (protocol).
- Done looks like: in a unit course of two stations, a guard alert in station 2 puts both players at station 2's marks
  with station 1 still done and station 1's downed guard still down; a `caught` bay ignores a 1.5 s combat and retries
  at 2 s; a drill window ending retries in place; each of those retries raises `window.__course.restarts` by one on
  host and client with `lastRetry` `{ st: 2, cause }` and cause `seen`, `caught` and `timer` in turn (unit test in
  `tests/courseStation.test.ts`: the count and `lastRetry` through `pack()` -> `parseCourse` -> the client mirror
  object, equal on both sides);
  one player out in station 2 (partner up) restarts the bay from its holding room, a full reset with station 1 undone
  (level-design 9.4, G312; `restarts` +1, cause `out`); both down after station 2 does the same (A17; cause `down`);
  after `window.__course.retryOff(2)` a second guard alert in station 2 does not retry (no rise in `restarts`, players
  stay put) and a bay restart turns station 2's retry back on (unit test in `tests/courseStation.test.ts`);
  `checkpointSpawns()` returns station marks only during a station retry (a rejoining client then too) and the airlock
  slots otherwise; the built `ctcourse` behaves as today (its tests unchanged); the flag off leaves the room on
  `ctcourse`.
- Flag: `marlowReplan` (only `ctcourseReplan` carries stations). Depends on: S0's first commit (`stationDef.ts`, the
  flag, `SetPart.bay.stations`, the `ctcourse.ts` mapping, the `BayDef` line).

**F1 Live rule fixes (Opus; PR 3; two Opus checkers: src/net).** Three fixes to the shipped yard, each a gap the Marlow
conformance review lists, allowed at the walk cap (G355; A21):
- **Revive cap 2 (M3 / R35).** The course grant's syringe is 0 in co-op as it already is solo: `courseGrant`
  (`src/game/course/courseMarks.ts:65-70`, course-only; Sector Ops calls `rewardsFor` directly, `sectorMode.ts:1039`)
  sets `r.syringe = 0` (M3's own fix: "Zero the syringe grant in Course mode (keep gadget and medkit grants)"). So
  `giveGrant` never calls `addSyringes` or records `given.syringe` (`courseMode.ts:832-835`), and the card
  (`src/ui/hud/ratingCard.ts:39`), the wire (`w.syringe`, the client's card) and the cap agree: no syringe offered,
  revives stay at 2. `coopHost.addSyringes` (:834-837) also ignores course grants, the one named "no syringe grant
  outside Sector Ops" rule mission-rules R5 extends. Gadget and medkit grants kept.
- **Two players to start (R36).** Host Start needs 2 players in Course mode on every build, live included, the lobby
  saying why (`coopUi.ts:628-635`; Michael picked ~21:42 "Yes, everywhere now", BRIEF "Michael picked"). The check
  has no solo exception: `?course=solo` stays a dev-only test switch (`courseSoloFlag()`, `courseMode.ts:44-48`, true
  only under `import.meta.env.DEV`; it boots the course single player without the lobby, `main.ts:447`), never walk
  advice. F1's PR body names the release that carries it (the first version that refuses a one-player Marlow start),
  so the walk card tells Michael to bring his second PC.
- **M8.** The A2 entry vantage joins the sight test (`tests/ctcourse/a2CarriageShed.test.ts:1366-1371`).

The downed rule does not change: one player out (no revives left) still restarts the bay, as both down does
(level-design 9.4; `coopHost.ts:568-581`, not edited; conformance-marlow :112 lists it as conforming; REPLAN "no change
to the downed rule"). F1 reads no `marlowReplan` flag, does not edit `courseState.ts` and needs nothing from S0 (the
room-map line is R1's), so it branches from master and ships first. Its one course hunk is the `courseGrant` line in
`courseMarks.ts`, a file no other slice edits; `tests/courseMarks.test.ts` is also in R1's list, so F1 updates its
co-op cases and R1 rebases on F1.
- Files: `src/net/coopHost.ts` (the `addSyringes` body only), `src/net/coopUi.ts` (the Start check only),
  `src/game/course/courseMarks.ts` (the `courseGrant` syringe line only), `tests/courseMarks.test.ts` (the co-op
  `courseGrant` / `coopRating` cases, :129-151: syringe 0), `tests/courseRuleFixes.test.ts` (new),
  `tests/ctcourse/a2CarriageShed.test.ts`, `scripts/e2e-ctcourse/revive.mjs` (only if it leans on the syringe cap or a
  lone-host start), `changes/feature-marlow-replan-f1.md`. Est. 250.
- Checks: vitest on those plus `tests/course.test.ts`; grep `scripts/` and `tests/` for asserts on the syringe cap, a
  course syringe grant or a lone-host Course start (`scripts/e2e-ctcourse/revive.mjs` first) and update them in the
  same PR; laptop: co-op group + affected-e2e, `e2e-section-rating` included (its Sector Ops grant block, :199-216,
  stays green: Sector Ops still grants syringes).
- Done looks like: `tests/courseRuleFixes.test.ts` shows three ratings later the cap is still 2 (gadget and medkit
  grants still land) and the course card shows no syringe on host and client; a lone host's Start refused in Course
  mode on every build (the case runs with DEV off and on, and with `?course=solo` in the URL: still refused), the
  lobby saying why; the M8 sight case passes; one player out still restarts the bay (the built tests and `revive.mjs`
  unchanged on that); the Sector Ops grant e2e green.
- Flag: none (rule fixes on the shipped yard). Depends on: nothing in this plan. Order with Campaign's mission-rules:
  claims section.

**Set slices (Sonnet greybox from strict Opus briefs; one checker per batch of three).** Each: guards round the
removed pieces in `<set>.ts`, everything new in `replan/<set>.ts` (geometry, closers, guards per lesson, stations from
STATIONS.md, objective lines naming what and where, stand-ins, lamps, `FLOOR_HOLES`), `tests/ctcourse/replan/<set>.test.ts`
(new `GREY` pin, squad, closures walk-tested on the nav, stations' marks reachable, lamps live, light file),
`scripts/e2e-ctcourse/replan/<set>.mjs` (the set walked by both players on host and client: every station, one
spotted retry per guarded station landing both at its marks, one drill retry, stand-ins open), and a changelog
fragment. Checks: vitest `tests/ctcourse/replan/<set>.test.ts tests/ctcourse/replan/variant.test.ts
tests/ctcourseLight.test.ts`; `CTLIGHT_VARIANT=replan CTLIGHT_WRITE=<set>` then a clean rerun; affected-e2e
(e2e-ctcourse 1-8). Flag: `marlowReplan`. Depends on: S0 and R1 (cut from the lead's merge of both; the PRs open only
after S0 and R1 are released, wave 2).

| Slice | PR | Set | Main work | Est. |
| --- | --- | --- | --- | --- |
| G-A1A7 | 4 | A1 + A7 | A1: checker kept passive, stations 1-2, no fail; A7: full-height glazed screen, split kept, 2 guards, both spawned in the hall (the rows 1-2 technician plus the pod-leg technician whose round runs from the hall's east side across the pod approach in view of the hall leg: two-way cover; the pod itself has no guard), station 17 (`retry: 'station'`, hack miss resets the terminals) | 600 |
| G-A2 | 5 | A2 | watchers out (1 guard), deck + stair out, lane / back-door closers, shutter hold gate (station 3), neck drill 15 s (4), 3 m pit + cabinet 2 west + plank stand-in walkway (5), coat-corner lamp | 1,250 |
| G-A3 | 6 | A3 | cleaner out (0 guards), office doors closed, fire door + riser + crawl (vent unlock, station 6), jam relay hops 6.5 s (7), hall send-back off | 950 |
| G-A4 | 7 | A4 | one floor route (pallet frames, mezzanine stairs out), lift grille + motor stand-in (deadweight, station 9), loop 60 s (8), kettle loop out, synced takedown 1.5 s (10), back aisle + office lamps | 900 |
| G-A5 | 8 | A5 | 6 m perimeter wall + gap + wicket stand-in (chimney, 11), inside ladder, trench + footbridge stand-in (swing, 12), drums / switch / bulkheads moved, back door + trench path + panel-jam route closed, 2 guards (the patrol plus a static watcher at the release kiosk facing the floodlit strip, so the jam is needed), throw 9 s (13) | 1,300 |
| G-A6 | 9 | A6 | staff stair + relay route closed, sump re-lamped (69), rope (14), hang-down (15), drive pit -1.6 m + outfall to L6 + cage ladder stand-in (drop catch, 16); a unit test that a 6 m landing's noise reaches the attendant's round (BRIEF A6; if not, the guard fallback in section 2: A5's kiosk watcher becomes a listener at the pit side, A5 1, A6 2; G-A5 and G-A6 agree it with the lead before either builds its guards) | 1,300 |
| G-A8 | 10 | A8 | stair 2.4 m, glazed office west wall, vestibule + west-bay lamps, A8 retry steps (`caught`), board 25 s, loop 60 s, side routes kept | 800 |

**R2 Signposting and ratings (Sonnet; PR 11).** The objective list names the retry rule per bay ("Seen or out of time:
you go back to the start of this step", LD 9.3) and the station number; `e2e-section-rating` gains a `ctcourseReplan`
block (A1 and A3 unrated: no rated guard; A3's camera breaks no rating; a station retry is not a set restart).
Files: `src/ui/hud/courseHud.ts`, `scripts/e2e-section-rating.mjs`, `tests/ctcourse/replan/hud.test.ts`, fragment.
Est. 350. Checks: vitest; affected-e2e. Depends on: #441 on master, R1. Flag: `marlowReplan`.

**G1 Graph as built and the gates (Sonnet, docs / data; PR 12 or with the walk PR).** After the set slices: `area`,
`at` and widths from the built geometry; the five stand-in kinds and A3's `bolted` door swapped for J12's A25 kinds
(`plank_bridge`, `deadweight`, `chimney_pair`, `swing_pass`, `drop_catch`, `vent_unlock`) once J12 PR A is on master;
link `teach` on single forced links (route-run hold, J13 BRIEF A13); `node scripts/level-validate.mjs` on the training
profile with J12 S4's checks: 0 ERR; `node scripts/level-measure.mjs docs/marlow-replan/graph.json --write` (J12 S2)
then `--require-measured` (J12, when live): the measured pass; then the lead requests the J13 gate run from this graph
(one start-to-exfil run plus A8's campaign coverage, pass = never stuck, Q7). Output `docs/marlow-replan/run.txt`,
`REPORT.md`. Done: the three greybox-exit gates' results in REPORT; the walk card items handed to the orchestrator.

**KS1-KS5 Kit stations live (Sonnet, each after Player's move slice is on master; PRs 13-17, ~150-300 each).** KS1
deadweight (A4 grille -> Player's `counterweightGrate.ts`), KS2 drop catch (A6 bridge edge), KS3 chimney (A5 gap at
K3's band), KS4 swing (A5 gantry pipe at K4's band), KS5 plank (A2 board stack and Player's plank prop; the shunter
notices a laid board through Guard AI's hook). Each: the station's stand-in gate locks when its `kitMoves` id is on, the
replan e2e module walks the move with the id on both pages, the graph link `move` -> kind (G1). Flag: the `kitMoves` id
(Player's).

**C1 Switch-on cleanup (Sonnet, after Michael accepts the walk item).** `ctcourse` builds the re-plan; the built
branches, `SPOT_FAIL`, the A3 `HallRule` data, built tests and e2e modules 1-8 fold into one set; the flag goes. Mostly
deletion (likely over 1.5k: split per set pair or the orchestrator's `big-pr` label).

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `marlowReplan` (`?marlowreplan=1`, host page; `src/core/flags.ts`) | off | Night Shift \| Marlow Build | target 2026-10-29 | S0, R1, set slices, R2 on master; G1 gates pass; Michael accepts the walk item (Marlow Yard is AT CAP: switch-on waits for his walk, RULES "Walk pacing") |
| `kitMoves` ids `plankBridge`, `deadweight`, `chimneyPair`, `swingPass`, `dropCatch` (Player's flag) | off | Night Shift \| Player Build | Player's dates (2-4 days after Campaign's kit PR) | that move's slice and its KS slice on master, its walk item accepted; until then the station's stand-in is open |

## Order and waves
- **Marlow first (Michael picked "Marlow first (Recommended)", ~20:50, ROADMAP Decided):** right after the Mixamo PR's
  laptop run, Marlow Build's laptop requests go first in the queue and Marlow gets desktop CPU priority; Sector Ops and
  Campaign keep building behind it. Target: walk-ready Tue 27 Oct evening (S0, R1, F1, the set slices, R2, G1 gates),
  co-op kit stations (KS1-KS5) 29 Oct.
- **Wave 1, now (parallel, no shared files or hunks):** D1 (Opus, docs), G0 (Sonnet, docs: `graph.json` /
  `validate-run.txt`), S0 (Sonnet), F1 (Opus, from master, needs nothing from S0: ships first); R1 (Opus) branches from
  S0's first pushed commit (`stationDef.ts`, the flag, `SetPart.bay.stations`, the `ctcourse.ts` mapping, the `BayDef`
  line; S0 section). File seams: S0 owns `courseDef.ts` for that one line in its first commit only, then R1; R1 owns
  `courseState.ts` whole (F1 does not edit it); the room-map line in `session.ts` is R1's; F1 owns `courseMarks.ts`
  (one line) and updates the co-op cases of `tests/courseMarks.test.ts` first, R1 rebases on F1 there. D1 and G0 both
  live in `docs/marlow-replan/` but in different files (STATIONS.md vs graph.json / validate-run.txt).
- **Wave 2, when S0 and R1 pass their checkers (lead merges both into `feature/marlow-replan-base`):** the seven set
  slices build in parallel (G-A1A7, G-A2, G-A3, G-A4, G-A5, G-A6, G-A8), each in its own worktree; briefs written during
  wave 1. Their PRs open only after S0 and R1 are released (on master): `scripts/pr-size.mjs` counts against the merge
  base, so a PR cut from the S0 + R1 merge would count ~1.9k extra lines before then. G-A2, G-A3, G-A6 wait for #441
  on master if it is not there yet (they touch its set files).
- **Wave 3:** R2 (after #441), G1 (after the set slices; its gate steps wait on J12 PR A + S2 + S4 and J13 R6 / R8).
- **Then:** KS1-KS5 as Player's moves land; the walk card; C1 after acceptance.

## Gates
- **Plan checker** on this PLAN (Intake 4) before any build.
- **Level validator on the built map** (G1): training profile, 0 ERR with J12 S4 (`taught_by`, `teach`, one route
  before `taught_by`, A8's campaign route rules) and J12 A7 (the coverage ERR off on training; today's 2 ERR,
  `validate-run.txt`).
- **Greybox exit** (RULES Intake 5, LD 14): the measured validator pass (J12 V6: S2 `level-measure`, `--require-measured`
  when live) and the bot route-runs (J13: R6 resolver, R8 gate run; pass = never stuck, Q7; Marlow run time against
  15-20 min, A8 of the BRIEF).
- **Walk card** (the orchestrator writes it, ~10 min, from the items below).
- Per PR: CI `check`, `checker`, `affected-e2e` (train-ready).

## Walk items (for the orchestrator's card; menu: co-op lobby, host page with `?marlowreplan=1`, Marlow Yard)
Every Marlow walk needs two players: a partner, or Michael's second PC joining with the room code (Marlow Yard will not
start with one player once F1 is live, on either yard).
- Every set: one way through; side routes closed by pallets, locked doors and screens; only the Strongroom has
  choices - accept when no set can be crossed without its lesson.
- A2 or A4: get seen by the shunter / a camera - accept when both land back at that step's start, earlier steps stay
  done, nothing says "failed".
- A8: let a guard see you, then break away - accept when the guard searches like on a mission and only being caught
  sends you back a step.
- A5 and A6 new spaces (wall gap, trench, drive pit): accept when they read as real places and the stand-in crossings
  are obvious until each new move is on.
- Lamps: A4 back aisle, A6 sump, A8 vestibule all working - accept when no dark corner comes from a dead light.
- F1 (live on the built yard, so before the re-plan walk): from the release F1's PR names, Marlow Yard will not start
  with one player (Michael walked 4.82.0 solo; he picked "Yes, everywhere now" ~21:42) - bring the second PC and join
  with the room code; try Start alone first, then with both players rate a set well three times - accept when the
  lobby says why one player cannot start, the card never offers a syringe and revives still stop at two.

## Assumed decisions (A13+, each with its undo)
- **A13** `meta.taught_by` is "A6" (the set where drop catch, the last kit move, is taught alone, J12 BRIEF A8), so
  A7 (one split, no side route; J12 A23 counts a split as one route) and A8 (the only set keeping side routes, the lead's
  "the Strongroom is the only late section") come after it. "A7" would make A7's `split:` tags an ERR under J12 A8.
  Lessons are `teach:<move>` space tags on the space each move reaches (parallel links like A1 boost / human ladder
  cannot carry a forced element). Undo: `taught_by` "A7" and drop A7's split tags.
- **A14** A8 "caught" = a guard holding combat on a player for 2 s (`CAUGHT_HOLD`); suspicion, search and short sightings
  play out; caught or a timed step running out retries that step at its marks (REPLAN A8 row; BRIEF A2 as fixed in
  8217b0628). Undo: hold 0 (as A1-A7).
- **A15** Settled: Michael picked "12, add two (Recommended)" (~20:40; BRIEF "Michael picked", ROADMAP Decided). The
  two extra go where they best teach (lead decision, plan check 1 fix 2): A7 +1 at station 17's pod leg, A5 +1 at the
  release kiosk (section 2 "Guards per lesson", with the A6 fallback). Undo of the placement: move either guard; the
  total stays 12.
- **A16** The re-plan ships dark as map `ctcourseReplan`, picked by the host's `?marlowreplan=1`, rather than a per-page
  switch inside `ctcourse`: one map per match, the client follows the host's `start`. Undo: none needed at switch-on (C1).
- **A17** A station retry resets only that station's guards, gates, devices and flags; guards dealt with at earlier
  stations stay as left; both down stays the full checkpoint reset (G312). Undo: a retry resets the whole bay but
  respawns at the station's marks.
- **A18** A new-move station is open from day one through a stand-in gate the host opens while that move's `kitMoves`
  id is off (BRIEF A3 "until then that station's crossing is a plain door"). Undo: hold `marlowReplan` until all five
  moves ship (BRIEF A3 undo).
- **A19** (Michael picked "1.4 m (Recommended)", ~20:40.) Widths follow Player's researched bands: the A5 chimney gap starts at 1.4 m (two operators back to back need
  more than the drawn 1 m; mission PLAN 1.2-1.6 m), the trench stays 3.5 m if inside K4's swing band. The new wall moves
  west into the apron; nothing else moves. Undo: build 1 m.
- **A20** Marlow's J10 re-light (light-realism PLAN L3-H) is done on `ctcourseReplan` only, with live fittings at
  today's set standby level; lux bands are tuned when J10's band table lands. The built yard keeps its pockets until
  switch-on. Undo: port the lamps to the built yard as a rule fix if switch-on slips.
- **A21** F1's three rule fixes (revive cap 2, the lone-host Start block, the M8 sight test) ship on, now, on the built
  yard (G355: fixes to shipped features are allowed at the cap; each is a conformance-listed gap). The Start block is
  Michael's pick, not an assumption (~21:42 "Yes, everywhere now", BRIEF): unconditional, live, no flag. The downed
  rule is not among them: one out still restarts the bay (level-design 9.4, plan check 2 fix 1). Undo: revert F1.
- **A22** "Spotted" in A1-A7 includes a camera's full detection (A3's IR camera, A4 C1-C3 after the loop, A7's
  cameras), not only guards; the A3 send-back becomes this retry. Undo: guards only.
- **A23** A drill running out = the station retry at its own marks ("Retry the drill only", ~11:55: no checkpoint reload,
  no set restart); `drill_s` comes from the graph into `StationDef.drillS`. Undo: reset the drill device only, players
  stay where they are.
- **A24** New per-set code in `ctcourseSets/replan/<set>.ts`; set files only get guards. Undo: n/a (layout of code).
- **A25** The re-plan's e2e = `e2e-ctcourse` parts 5-8 (same suite, so DIRECT_COVERS needs no change). Undo: its own
  suite name.
- **A26** (Q5 / G370, lead 2026-10-26 after the A1 / A7 set check) A1 never traps the pair: while station 1 or 2 is live
  (wicket shut, `a1-top` not set), a player on the yard floor with nobody on or climbing the wall for 5 s
  (`A1_TRAP_GRACE`, `src/game/course/replan/a1Ticks.ts`) retries the live station with the new cause `other` (the only
  cause a `retry: 'none'` station takes; R4c and the route-runs read it as other), both back at its marks with LANTERN's
  `retry:<id>:other` line. Stations 1-2 stay `retry: 'none'`. Branch feature/marlow-replan-a1-retry. Undo: empty
  `a1Tick` and drop the two radio rows.

**Assume and log (RULES Intake step 2), for the orchestrator to put to Michael:** BRIEF A3 (new-move stations open as
moves ship, Q29), A5 (pull-up counted with the human ladder, Q29), A7 (A8 keeps 3 guards under campaign-area route
rules, Q24); PLAN A20 (the built yard keeps its dead-light pockets until switch-on; the re-light is on
`ctcourseReplan` only), so J10 ("no dead-light dark spots anywhere", Q2) knows the built yard waits for switch-on. A15
(12 guards) and A19 (chimney 1.4 m) answered by Michael ~20:40.

## Risks and open questions
- **Blocks on other leads:** Player Build's coop-kit part 2 (K0-K5b) for KS1-KS5, itself waiting on Campaign Build's
  mission-engine kit PR (KIT0 + NET); Player's `kitMoves` flag (coop-kit A1) for the stand-in switch (until it is on
  master, S0's helper treats every kit id as off); Guard AI's "board noticed" hook for KS5 (A2's shunter). Our own J12
  (PR A kinds, S2 measure, S4 training checks, D-A V6 schema) and J13 (R6, R8) for G1's gates.
- **Orchestrator:** #441 lands before G-A2 / G-A3 / G-A6 / R2; F1 edits `coopHost.ts` beside four other branches; S0
  edits `scripts/run-e2e.mjs` and `e2e-times.json` (Test Runner's files: tell Test Runner); Marlow's three unwalked
  items (training cameras, LR16 re-light, joint interrogation) could be walked inside the re-plan walk.
- The A6 pit and outfall move the cage east into pump 1 and the gauge board (`a6PumpHouse.ts:106-110`): G-A6's brief
  fixes the layout from the SVG before code; if it does not fit, the pit shifts north (graph unchanged).
- A drop-catch noise check that comes out silent moves A5's kiosk watcher to the A6 pit side as a listener (section 2
  "Guards per lesson" fallback); only if a listener there cannot hear it either does the station get a rule (BRIEF A6
  undo).
- Double e2e time on Marlow PRs while parts 1-8 both run (~150 s per part); C1 removes it.
