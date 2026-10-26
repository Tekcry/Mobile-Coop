# Marlow Yard re-plan: station sheet
Owner: Marlow Build. Status: current.

J14 slice D1 (`PLAN.md` "D1 Station sheet"). The data every set slice copies into `replan/<set>.ts` as
`SetPart.bay.stations` (`StationDef`, PLAN section 2), R1 reads for the retry runtime and R2 for the objective list.
Drawn from `PLAN.md` section 2, `BRIEF.md`, `REPLAN.md`, `graph.json`, `replan-plan.svg` and the set constants in
`src/world/maps/ctcourseSets/*.ts` on origin/master ef3e76691. Rules it applies: one forced route, every side route
closed but A8's (Q24); only the guards each lesson needs (Q11), 12 in all (Michael ~20:40); every failure in Marlow Yard
is a retry (Q5, G370); two players everywhere (Michael ~21:42, PLAN F1); chimney gap 1.4 m (A19).

## 1. How to read it
- **Plan and height.** Metres, x east, z north, y the floor the feet stand on (0 ground, 4.4 A1 wall top / A6 bridge /
  A8 gallery and office, -1.6 the A6 drive pit). Every mark is on the 0.5 m grid.
- **Yaw.** Radians, 0 faces +z (north), PI/2 faces +x (east), PI faces -z, -PI/2 faces -x (`types.ts` `SwitchDef`,
  `SPAWNS`).
- **Marks.** `marks[0]` is role A's, `marks[1]` role B's: the bay's role claim (`BayDef.roles`), P1 / P2 when no claim
  (assumption SA3). A split station puts the two marks on the two legs.
- **Ids.** `*` marks an id this sheet adds; the set slice creates it in `replan/<set>.ts`. The rest exist on master.
- **Retry kinds** (`StationDef.retry`). `none`: no guard, camera or drill reaches the station, nothing can fail. One
  exception: a set's own way out of a soft-lock may retry a `none` station with the cause `other` (A1's early drop into
  the yard, PLAN A26); nothing else does.
  `station` (A1-A7): a guard in combat on a player, a camera's full detection of a player, or the drill window failing
  (section 5) puts both players on the station's marks after `SPOT_HOLD` (`courseMode.ts:102`, 1.5 s). `caught` (A8):
  suspicion and search play out as on a mission; a guard holding combat on a player for `CAUGHT_HOLD` 2 s, or the drill
  window failing, retries the step (PLAN A14). Downed is the campaign rule, unchanged: past the revives, one out or both
  down restarts the bay from its holding room (level-design 9.4, G312).
- **Play order.** Stations go live in the order of each bay's `stations` array; `n` is the badge on `replan-plan.svg`.
  Only A4 differs from badge order (section 4). A8's badge 18 is four retry steps, `n` 18-21 (assumption SA4).

## 2. The stations
| n | Badge | Bay | id | Lesson (`teach:`) | Graph space | Retry | drillS | Done flag | Kit / stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | A1 | `a1-boost` | `boost` | `a1-walltop` | none | - | `a1-top1`* | - |
| 2 | 2 | A1 | `a1-ladder` | `human_ladder` | `a1-walltop` | none | - | `a1-top`* | - |
| 3 | 3 | A2 | `a2-shutter` | `shutter_hold` | `a2-lane` | station | - | `a2-lane`* | - |
| 4 | 4 | A2 | `a2-lights` | `timed_light_cut` | `a2-neck` | station | 15 | `a2-east` | no kit / `g-a2-shutter-open`* (the roller door's latch) |
| 5 | 5 | A2 | `a2-plank` | `plank_bridge` | `a2-pitside` | station | - | `a2-across`* | `plankBridge` / `g-a2-walkway`* |
| 6 | 6 | A3 | `a3-vent` | `vent_unlock` | `a3-corridor` | station | - | `a3-fire`* | - |
| 7 | 7 | A3 | `a3-jam` | `jam_relay` | `a3-corridor` | station | - | `a3-far` | - |
| 9 | 9 | A4 | `a4-deadweight` | `deadweight` | `a4-cross` | station | - | `a4-grille`* | `deadweight` / `g-a4-grille-motor`* |
| 8 | 8 | A4 | `a4-camloop` | `camera_loop` | `a4-main-aisle` | station | 60 | `a4-west` | - |
| 10 | 10 | A4 | `a4-takedown` | `synced_takedown` | `a4-dock` | station | 1.5 | `a4-wicket`* | - |
| 11 | 11 | A5 | `a5-chimney` | `chimney_pair` | `a5-walltop` | none | - | `a5-apron-e`* | `chimneyPair` / `g-a5-wicket`* |
| 12 | 12 | A5 | `a5-swing` | `swing_pass` | `a5-apron` | none | - | `a5-apron-w`* | `swingPass` / `g-a5-footbridge`* |
| 13 | 13 | A5 | `a5-throw` | `throw` | `a5-inner` | station | 9 | `a5-release` | - |
| 14 | 14 | A6 | `a6-rope` | `rope` | `a6-gallery` | station | - | `a6-gal` | - |
| 15 | 15 | A6 | `a6-hangdown` | `hang_down` | `a6-bridge` | station | - | `a6-drive` | - |
| 16 | 16 | A6 | `a6-dropcatch` | `drop_catch` | `a6-pit` | station | - | `a6-pit`* | `dropCatch` / `g-a6-pit-ladder`* |
| 17 | 17 | A7 | `a7-split` | `synced_hack` | `a7-hall` | station | - | `a7-sync` | - |
| 18 | 18a | A8 | `a8-c2run` | `jam_relay` | `a8-gallery` | caught | - | `a8-office-in`* | - |
| 19 | 18b | A8 | `a8-loopset` | `camera_loop` | `a8-office` | caught | - | `a8-loop` | - |
| 20 | 18c | A8 | `a8-isolate` | `timed_light_cut` | `a8-board` | caught | 25 | `a8-grille-in`* | - |
| 21 | 18d | A8 | `a8-locks` | `synced_hack` | `a8-lobby-inner` | caught | 60 | `a8-sync` | - |

21 rows: one per badge 1-17, four for badge 18 (A8). Every badge on `replan-plan.svg` has a row; every graph space with
`drill_s` has one in section 5.

## 3. StationDef rows (copy per set)
Each block is one set's `SetPart.bay.stations`, in play order. `guards` and `gates` are what a retry of that station
resets (the reset rule: assumption SA1); a stand-in gate is also in `gates`.

```ts
// A1: replan/a1Gate.ts
const a1GateStations: StationDef[] = [
  { n: 1, id: 'a1-boost', lesson: 'boost', retry: 'none', doneFlag: 'a1-top1',
    marks: [{ x: 10.5, z: 6.0, y: 0, yaw: Math.PI / 2 }, { x: 9.5, z: 6.0, y: 0, yaw: Math.PI / 2 }],
    guards: [], gates: [] },
  { n: 2, id: 'a1-ladder', lesson: 'human_ladder', retry: 'none', doneFlag: 'a1-top',
    marks: [{ x: 10.5, z: 6.0, y: 0, yaw: Math.PI / 2 }, { x: 12.0, z: 6.0, y: 4.4, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a1-wicket'] },
];
// A2: replan/a2CarriageShed.ts
// Station 4's standIn is the roller door's latch (no kit): the host opens it as 4 goes live, so the presser walks from
// the cabin to the lane, and it stays open through 4's retries.
const a2CarriageShedStations: StationDef[] = [
  { n: 3, id: 'a2-shutter', lesson: 'shutter_hold', retry: 'station', doneFlag: 'a2-lane',
    marks: [{ x: 31.0, z: 11.5, y: 0, yaw: Math.PI / 2 }, { x: 31.0, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-shutter'] },
  { n: 4, id: 'a2-lights', lesson: 'timed_light_cut', retry: 'station', doneFlag: 'a2-east', drillS: 15,
    marks: [{ x: 30.5, z: 2.5, y: 0, yaw: Math.PI }, { x: 45.5, z: 12.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-neck', 'g-a2-shutter-open'], standIn: 'g-a2-shutter-open' },
  { n: 5, id: 'a2-plank', lesson: 'plank_bridge', retry: 'station', doneFlag: 'a2-across', kit: 'plankBridge', standIn: 'g-a2-walkway',
    marks: [{ x: 65.5, z: 12.0, y: 0, yaw: Math.PI / 2 }, { x: 65.5, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-walkway'] },
];
// A3: replan/a3OfficeRange.ts
// Station 6: the bay keeps the built role claim (B = first into the corridor), so the crawler is B and a retry swaps the
// jobs (SA14).
const a3OfficeRangeStations: StationDef[] = [
  { n: 6, id: 'a3-vent', lesson: 'vent_unlock', retry: 'station', doneFlag: 'a3-fire',
    marks: [{ x: 77.5, z: 2.0, y: 0, yaw: Math.PI }, { x: 78.5, z: 10.5, y: 0, yaw: Math.PI / 2 }],
    guards: [], gates: ['g-a3-fire', 'cam-a3-hall'] },
  { n: 7, id: 'a3-jam', lesson: 'jam_relay', retry: 'station', doneFlag: 'a3-far',
    marks: [{ x: 80.0, z: 10.0, y: 0, yaw: Math.PI / 2 }, { x: 80.0, z: 11.5, y: 0, yaw: Math.PI / 2 }],
    guards: [], gates: ['cam-a3-hall'] },
];
// A4: replan/a4GoodsShed.ts
const a4GoodsShedStations: StationDef[] = [
  { n: 9, id: 'a4-deadweight', lesson: 'deadweight', retry: 'station', doneFlag: 'a4-grille', kit: 'deadweight', standIn: 'g-a4-grille-motor',
    marks: [{ x: 102.5, z: 14.0, y: 0, yaw: 0 }, { x: 103.5, z: 14.0, y: 0, yaw: 0 }],
    guards: ['a4-officer'], gates: ['g-a4-grille', 'g-a4-grille-motor'] },
  { n: 8, id: 'a4-camloop', lesson: 'camera_loop', retry: 'station', doneFlag: 'a4-west', drillS: 60,
    marks: [{ x: 104.5, z: 14.0, y: 0, yaw: 0 }, { x: 105.5, z: 14.0, y: 0, yaw: 0 }],
    guards: ['a4-officer', 'a4-dock1', 'a4-dock2'], gates: ['g-a4-console', 'cam-a4-c1', 'cam-a4-c2', 'cam-a4-c3'] },
  { n: 10, id: 'a4-takedown', lesson: 'synced_takedown', retry: 'station', doneFlag: 'a4-wicket', drillS: 1.5,
    marks: [{ x: 80.5, z: 36.5, y: 0, yaw: Math.PI }, { x: 79.5, z: 29.5, y: 0, yaw: 0 }],
    guards: ['a4-dock1', 'a4-dock2'], gates: ['g-a4-wicket'] },
];
// A5: replan/a5Substation.ts
const a5SubstationStations: StationDef[] = [
  { n: 11, id: 'a5-chimney', lesson: 'chimney_pair', retry: 'none', doneFlag: 'a5-apron-e', kit: 'chimneyPair', standIn: 'g-a5-wicket',
    marks: [{ x: 69.0, z: 32.0, y: 0, yaw: -Math.PI / 2 }, { x: 69.0, z: 34.0, y: 0, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a5-wicket'] },
  { n: 12, id: 'a5-swing', lesson: 'swing_pass', retry: 'none', doneFlag: 'a5-apron-w', kit: 'swingPass', standIn: 'g-a5-footbridge',
    marks: [{ x: 67.0, z: 33.0, y: 0, yaw: -Math.PI / 2 }, { x: 67.0, z: 34.5, y: 0, yaw: -Math.PI / 2 }],
    guards: [], gates: ['g-a5-footbridge', 'g-a5-plates'] },
  { n: 13, id: 'a5-throw', lesson: 'throw', retry: 'station', doneFlag: 'a5-release', drillS: 9,
    marks: [{ x: 59.0, z: 36.0, y: 0, yaw: -Math.PI / 2 }, { x: 56.0, z: 36.0, y: 0, yaw: -Math.PI / 2 }],
    guards: ['a5-patrol', 'a5-watcher'], gates: ['g-a5-release', 'laser-a5'] },
];
// A6: replan/a6PumpHouse.ts
const a6PumpHouseStations: StationDef[] = [
  { n: 14, id: 'a6-rope', lesson: 'rope', retry: 'station', doneFlag: 'a6-gal',
    marks: [{ x: 51.0, z: 56.5, y: 0, yaw: 0 }, { x: 52.5, z: 56.5, y: 0, yaw: 0 }],
    guards: ['a6-attendant'], gates: ['g-a6-edge'] },
  { n: 15, id: 'a6-hangdown', lesson: 'hang_down', retry: 'station', doneFlag: 'a6-drive',
    marks: [{ x: 50.5, z: 68.5, y: 4.4, yaw: Math.PI }, { x: 52.5, z: 68.5, y: 4.4, yaw: Math.PI }],
    guards: ['a6-attendant'], gates: ['g-a6-panel'] },
  { n: 16, id: 'a6-dropcatch', lesson: 'drop_catch', retry: 'station', doneFlag: 'a6-pit', kit: 'dropCatch', standIn: 'g-a6-pit-ladder',
    marks: [{ x: 51.5, z: 65.5, y: 4.4, yaw: Math.PI }, { x: 51.5, z: 63.5, y: -1.6, yaw: 0 }],
    guards: ['a6-attendant'], gates: ['g-a6-pit-ladder'] },
];
// A7: replan/a7DataHall.ts
const a7DataHallStations: StationDef[] = [
  { n: 17, id: 'a7-split', lesson: 'synced_hack', retry: 'station', doneFlag: 'a7-sync',
    marks: [{ x: 74.0, z: 62.0, y: 0, yaw: Math.PI / 2 }, { x: 72.5, z: 57.0, y: 0, yaw: Math.PI }],
    guards: ['a7-tech', 'a7-tech2'], gates: ['g-a7-cage-w', 'g-a7-cage-e', 'g-a7-east', 'a7-cam1', 'a7-cam2'] },
];
// A8: replan/a8Strongroom.ts
const a8StrongroomStations: StationDef[] = [
  { n: 18, id: 'a8-c2run', lesson: 'jam_relay', retry: 'caught', doneFlag: 'a8-office-in',
    marks: [{ x: 107.5, z: 64.0, y: 0, yaw: Math.PI / 2 }, { x: 107.5, z: 65.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['a8-cam1', 'a8-cam2', 'a8-cam3'] },
  { n: 19, id: 'a8-loopset', lesson: 'camera_loop', retry: 'caught', doneFlag: 'a8-loop',
    marks: [{ x: 135.0, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console'] },
  { n: 20, id: 'a8-isolate', lesson: 'timed_light_cut', retry: 'caught', doneFlag: 'a8-grille-in', drillS: 25,
    marks: [{ x: 137.5, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-night', 'g-a8-grille'] },
  { n: 21, id: 'a8-locks', lesson: 'synced_hack', retry: 'caught', doneFlag: 'a8-sync', drillS: 60,
    marks: [{ x: 137.5, z: 76.5, y: 4.4, yaw: Math.PI / 2 }, { x: 135.5, z: 66.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-console', 'g-a8-vault', 'laser-a8'] },
];
```

## 4. Order inside A4 and the A8 steps
- **A4: 9, then 8, then 10.** The deadweight comes before the console press (graph.json, the `a4-passage` -> `a4-cross`
  link: "Done before the console press, so it never runs inside the 60 s loop"). Station 9 starts at L3's far door
  behind the duty officer (he sits facing the monitors on the north wall, the passage door 2-3 m to his left, so he is
  taken or slipped first); its done flag is both players under the pinned grille in the back aisle. Station 8 then
  starts in the security room again: take the officer if he is still up, press the console, cross to the dock inside
  the 60 s loop. Station 10 is the synced takedown at the dispatch desk. The bay's `stations` array is `[9, 8, 10]`, so
  S0's `checkSetPart` must not require `n` to rise inside a bay (assumption SA7).
- **A8: four steps on badge 18,** in the order the set forces them (the built objective chain, `a8Strongroom.ts:551-596`):
  18a the leg-up split and the gallery run under C2 on the floor partner's jam, to the office door; 18b the officer and
  the console (the 60 s loop starts); 18c the lighting board, 25 s of dark to slip the grille; 18d the throw over the
  beam curtain and the paired hack, inside the loop. A8 keeps its side routes (public stair, the loop round the counters,
  the request-to-exit button in the lobby), so a step's done flag names a place, not a route.

## 5. Drill windows (every graph space with `drill_s`)
`StationDef` has only `drillS`. What opens a window and what fails it differs by drill, so R1 needs the rule below
(open question OQ2). "Gate window": the timed gate in the station's `gates` (an isolator's dark, a console's loop);
"pair window": from the first of two to the second; "jam window": a jammer held on the named lamp or camera.

| Graph space | drill_s | Station | `drillS` | Window opens | Fails (-> retry) when | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `a2-neck` | 15 | 4 | 15 | gate window: `g-a2-neck` dark (a press on `a2-iso-1` or `a2-iso-2`) | the dark ends with a player in the neck (x 46-56, z 0.3-19.7) | two crossings, one window each; the 3 s re-arm between |
| `a3-corridor` | 6.5 | 7 | - | jam window on `cam-a3-hall` (5 s held + 1.5 s reboot) | the camera's full detection (a `seen` retry) | not set: the camera judges each hop; a doneFlag test would fail after the first hop (SA6) |
| `a4-main-aisle` | 60 | 8 | 60 | gate window: `g-a4-console` loop | the loop ends before `a4-west` | the console re-arms at once on the retry (it is in `gates`) |
| `a4-dock` | 1.5 | 10 | 1.5 | pair window: the first knock-out of `a4-dock1` / `a4-dock2` | the second loader is not down 1.5 s later (`SYNC_WINDOW`, `sectionRating.ts:24`) | one man taken alone retries, the pair reset at the desk |
| `a5-inner` | 9 | 13 | 9 | jam window on the kiosk flood (group 52; 5 s held + 4 s off) | the flood is back before `a5-release` | a beam broken also retries (OQ4) |
| `a7-pod` | 1.5 | 17 | - | the scanner pair `sc-a7` (`a7-t1` / `a7-t2`) | a miss resets the terminals in place, no retry | not set: REPLAN A7 "Hack missed: the terminals reset" (Michael-approved) wins over PLAN A23 (SA6) |
| `a8-board` | 25 | 18c | 25 | gate window: `g-a8-night` dark (a press on `a8-board`) | the dark ends before `a8-grille-in` (the grille relocks) | |
| `a8-lobby-inner` | 60 | 18d | 60 | gate window: `g-a8-console` loop (pressed in 18b, or again after a retry) | the loop ends before `a8-sync`; if 18d goes live after the loop has ended, it fails at once | the retry puts A back at the console, which re-arms at once |

## 6. LANTERN's retry lines
Plain, short, what and where (G343, G351); at most 90 characters (`COURSE_TEXT_MAX`). A `seen` / `caught` line plays for
a guard or camera, a `timer` line for a drill window, an `other` line for A1's early drop (PLAN A26). Keyed in the set's `bay.radio` as `at: 'retry:<station id>'`,
`at: 'retry:<station id>:timer'` and, for A1 only, `at: 'retry:<station id>:other'` (assumption SA2). No line says
"failed".

| n | id | Seen / caught | Timer | Other |
| --- | --- | --- | --- | --- |
| 1 | `a1-boost` | (none: nothing can be seen) | - | Into the yard too soon. The wicket stays shut till you are both up. Back to the mark. |
| 2 | `a1-ladder` | (none: nothing can be seen) | - | Into the yard too soon. The wicket stays shut till you are both up. Back to the wall. |
| 3 | `a2-shutter` | Seen at the roller door. Back to the stores bay. | - | - |
| 4 | `a2-lights` | The shunter saw you in the neck. Back to the cabin and the lane. | Lights came back with you in the neck. Back to the cabin and the lane. | - |
| 5 | `a2-plank` | The shunter saw the board. Back to the board stack at the east end. | - | - |
| 6 | `a3-vent` | The camera had you. Back to the west lobby. | - | - |
| 7 | `a3-jam` | The camera had you. Back to the corridor's west end; jam it again. | - | - |
| 9 | `a4-deadweight` | The duty officer saw you. Back to the security room door. | - | - |
| 8 | `a4-camloop` | Seen on the shop floor. Back to the security room; loop it again. | The cameras came back. Back to the security room; loop it again. | - |
| 10 | `a4-takedown` | The loaders saw you. Back behind the pallet stacks at the dock. | Both loaders at once, or the other one sees. Back behind the stacks. | - |
| 11 | `a5-chimney` | (none: nothing can fail) | - | - |
| 12 | `a5-swing` | (none: nothing can fail) | - | - |
| 13 | `a5-throw` | Seen in the floodlight. Back behind the transformer. | The floodlight came back. Back behind the transformer. | - |
| 14 | `a6-rope` | The attendant saw you. Back to the sump bay, behind the kerb. | - | - |
| 15 | `a6-hangdown` | The attendant saw you on the bridge. Back to the bridge's north end. | - | - |
| 16 | `a6-dropcatch` | The attendant heard the landing. Back to the bridge; catch your partner. | - | - |
| 17 | `a7-split` | Seen in the data hall. Back to the entry lobby. | - | - |
| 18a | `a8-c2run` | Caught in the banking hall. Back to the vestibule. | - | - |
| 18b | `a8-loopset` | Caught at the security office. Back to the office door and the board. | - | - |
| 18c | `a8-isolate` | Caught at the lighting board. Back to the board. | The hall lights came back. Back to the lighting board. | - |
| 18d | `a8-locks` | Caught in the vault lobby. Back to the office console and the lobby. | The cameras came back. Loop them again from the office console. | - |

## 7. Start marks and their space boxes
Each mark is checked against its graph space's `area` box (G0, 7bc609ba2; rechecked at the D1 check, J14 wave 2). All 42
marks are on the 0.5 m grid, inside their G0 box and inside the set's `SET_BOX`. The boxes below are G0's; the source
column is D1's first box from the set constants (G0 agreed within 0.4 m). A new space's box changes with the built
geometry at G1 (A2 pit, A5 trench: SA9, SA10).

| n | Mark | x | z | y | yaw | Space | In box |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A | 10.5 | 6.0 | 0 | PI/2 | `a1-apron` | yes |
| 1 | B | 9.5 | 6.0 | 0 | PI/2 | `a1-apron` | yes |
| 2 | A | 10.5 | 6.0 | 0 | PI/2 | `a1-apron` | yes |
| 2 | B | 12.0 | 6.0 | 4.4 | -PI/2 | `a1-walltop` | yes |
| 3 | A | 31.0 | 11.5 | 0 | PI/2 | `a2-stores` | yes |
| 3 | B | 31.0 | 13.0 | 0 | PI/2 | `a2-stores` | yes |
| 4 | A | 30.5 | 2.5 | 0 | PI | `a2-cabin` | yes |
| 4 | B | 45.5 | 12.5 | 0 | PI/2 | `a2-lane` | yes |
| 5 | A | 65.5 | 12.0 | 0 | PI/2 | `a2-east` | yes |
| 5 | B | 65.5 | 13.0 | 0 | PI/2 | `a2-east` | yes |
| 6 | A | 77.5 | 2.0 | 0 | PI | `a3-west-lobby` | yes |
| 6 | B | 78.5 | 10.5 | 0 | PI/2 | `a3-west-lobby` | yes |
| 7 | A | 80.0 | 10.0 | 0 | PI/2 | `a3-corridor` | yes |
| 7 | B | 80.0 | 11.5 | 0 | PI/2 | `a3-corridor` | yes |
| 9 | A | 102.5 | 14.0 | 0 | 0 | `a4-secroom` | yes |
| 9 | B | 103.5 | 14.0 | 0 | 0 | `a4-secroom` | yes |
| 8 | A | 104.5 | 14.0 | 0 | 0 | `a4-secroom` | yes |
| 8 | B | 105.5 | 14.0 | 0 | 0 | `a4-secroom` | yes |
| 10 | A | 80.5 | 36.5 | 0 | PI | `a4-dock` | yes |
| 10 | B | 79.5 | 29.5 | 0 | 0 | `a4-dock` | yes |
| 11 | A | 69.0 | 32.0 | 0 | -PI/2 | `a5-gap` | yes |
| 11 | B | 69.0 | 34.0 | 0 | -PI/2 | `a5-gap` | yes |
| 12 | A | 67.0 | 33.0 | 0 | -PI/2 | `a5-apron-east` | yes |
| 12 | B | 67.0 | 34.5 | 0 | -PI/2 | `a5-apron-east` | yes |
| 13 | A | 59.0 | 36.0 | 0 | -PI/2 | `a5-apron` | yes |
| 13 | B | 56.0 | 36.0 | 0 | -PI/2 | `a5-lee` | yes |
| 14 | A | 51.0 | 56.5 | 0 | 0 | `a6-sump` | yes |
| 14 | B | 52.5 | 56.5 | 0 | 0 | `a6-sump` | yes |
| 15 | A | 50.5 | 68.5 | 4.4 | PI | `a6-bridge` | yes |
| 15 | B | 52.5 | 68.5 | 4.4 | PI | `a6-bridge` | yes |
| 16 | A | 51.5 | 65.5 | 4.4 | PI | `a6-bridge` | yes |
| 16 | B | 51.5 | 63.5 | -1.6 | 0 | `a6-pit` | yes |
| 17 | A | 74.0 | 62.0 | 0 | PI/2 | `a7-lobby` | yes |
| 17 | B | 72.5 | 57.0 | 0 | PI | `a7-lobby` | yes |
| 18a | A | 107.5 | 64.0 | 0 | PI/2 | `a8-vestibule` | yes |
| 18a | B | 107.5 | 65.5 | 0 | PI/2 | `a8-vestibule` | yes |
| 18b | A | 135.0 | 76.5 | 4.4 | PI/2 | `a8-office` | yes |
| 18b | B | 126.5 | 76.5 | 0 | 0 | `a8-board` | yes |
| 18c | A | 137.5 | 76.5 | 4.4 | PI/2 | `a8-office` | yes |
| 18c | B | 126.5 | 76.5 | 0 | 0 | `a8-board` | yes |
| 18d | A | 137.5 | 76.5 | 4.4 | PI/2 | `a8-office` | yes |
| 18d | B | 135.5 | 66.5 | 0 | PI/2 | `a8-lobby-outer` | yes |

| Space | Box [minX, minZ, maxX, maxZ] | y | Source |
| --- | --- | --- | --- |
| `a1-apron` | [6.15, 2.25, 11.7, 19.75] | 0 | `a1Gate.ts:10` apron x 6-11.7; `SET_BOX.a1Gate` z 2-20 less the 0.25 m wall faces |
| `a1-walltop` | [11.7, 2.25, 12.3, 19.75] | 4.4 | `A1_WALL` near 11.7 / far 12.3, lip 4.4 (`a1Gate.ts:54`) |
| `a2-stores` | [28.25, 5.1, 33, 17.5] | 0 | shell face 28.25 (`a2CarriageShed.ts:104`); new roller-door wall x 33 and cabin line z 5.25 (`replan-plan.svg`); staging face z 17.5 (`A2_DECK.z`) |
| `a2-cabin` | [28.25, 1.1, 31.9, 4.9] | 0 | `A2_CABIN` x 28-32, z 1-5, 0.2 m walls; plant face z 1.1 (`a2CarriageShed.ts:101-103`) |
| `a2-lane` | [33, 11.3, 46, 13.7] | 0 | `A2_RAKES[0]` x 36-46; roads 2 / 3 at z 10 / 15 less `VAN.half` 1.3 (`a2CarriageShed.ts:93-95`) |
| `a2-east` | [65.25, 0.25, 66.25, 19.25] + [56, 11.3, 65.25, 13.7] | 0 | pit west edge x 66.5 (`replan-plan.svg` rect x 499.5 px), graph size 1 m; G0 put the pit at x 66.25-69.25, SA9 at 66.0-69.0 (G-A2 builds one, G1 matches) |
| `a3-west-lobby` | [76.25, 0.25, 79.35, 12.75] | 0 | `SET_BOX.a3OfficeRange` x 76, `A3_LOBBY_WALL_X` 79.5 (`a3OfficeRange.ts:105`) |
| `a3-corridor` | [79.5, 9, 97, 12.5] + [87.55, 8, 88.95, 9] | 0 | `A3_HALL.box` (`a3OfficeRange.ts:77-83`) |
| `a4-secroom` | [100.25, 13.25, 106.35, 19.35] | 0 | `A4_ROOM` inner faces (`a4GoodsShed.ts:81`) |
| `a4-dock` | [76.25, 24.25, 86, 37.9] + [82.7, 37.9, 86, 44.1] + [76.25, 44.1, 86, 47.75] | 0 | `A4_FLOOR` x0 / z0 / z1 (`a4GoodsShed.ts:79`), graph size 9.5 m east |
| `a5-gap` | [68.35, 30.25, 69.75, 35.75] | 0 | L4 outer face 69.75 (`HOLD_BOX.L4`), the 1.4 m gap (PLAN A19), L4 z 30-36 |
| `a5-apron-east` | [67, 24.25, 67.85, 47.75] | 0 | trench east edge x 67 (`replan-plan.svg` rect x 478.5-503 px), new wall face 67.85 at the 1.4 m gap; [65.85, 24.25, 67.85, 47.75] after the trench shift (SA10) |
| `a5-apron` | [58.15, 24.25, 63.5, 47.75] | 0 | `A5_WALL.near` 58.15 (`a5Substation.ts:106`), trench west edge x 63.5 (`replan-plan.svg`); x1 62.35 after the trench shift (SA10) |
| `a5-lee` | [54.35, 34.5, 57.85, 40.5] | 0 | `A5_WALL.far` 57.85, `A5_LANDING` (56, 36) (`a5Substation.ts:90`, `:106`), graph size 3.5 x 6 |
| `a6-sump` | [48.2, 54.25, 57.8, 57.85] | 0 | `A6_SUMP` (`a6PumpHouse.ts:117`) |
| `a6-bridge` | [49, 61.6, 54, 69.6] | 4.4 | `A6_BRIDGE`, deck 4.4 (`a6PumpHouse.ts:106-107`) |
| `a6-pit` | [49.55, 62.15, 53.45, 66.05] | -1.6 | `A6_CAGE` footprint (`a6PumpHouse.ts:108`), sunk 1.6 m (PLAN section 2) |
| `a7-lobby` | [70.25, 55.95, 75.85, 65.85] | 0 | `a7DataHall.ts:9` entry lobby |
| `a8-vestibule` | [106.25, 56.2, 108.8, 75] | 0 | `A8_RETURN` (`a8Strongroom.ts:166`) |
| `a8-board` | [106.25, 75.2, 133.85, 77.75] | 0 | `A8_NORTH` (`a8Strongroom.ts:167`), under the gallery |
| `a8-office` | [134.15, 71.55, 143.85, 77.75] | 4.4 | `a8Strongroom.ts:16` office x 134-144, z 71.4-78, faces 0.25 in |
| `a8-lobby-outer` | [134.15, 56.15, 139.85, 67.85] | 0 | `a8Strongroom.ts:20` vault lobby, beam curtain x 140 |

## 8. New done flags
Each is a pass zone the set slice adds (`PassZone`, `src/game/passZones.ts`): `any` = one player is enough, else both.
The other done flags exist on master: `a2-east`, `a3-far` (its zone loses `hall` on the re-plan: no send-back), `a4-west`,
`a5-release`, `a6-gal`, `a6-drive`, `a7-sync`, `a8-loop`, `a8-sync`.

| Flag | Zone [x0, z0, x1, z1] | floorY | Who | Means |
| --- | --- | --- | --- | --- |
| `a1-top1` | [11.7, 2.3, 12.3, 19.7] | 4.4 | any | one player on the wall top (the boost) |
| `a1-top` | [11.7, 2.3, 12.3, 19.7] | 4.4 | both | both players on the wall top (the ladder) |
| `a2-lane` | [36, 11.3, 46, 13.7] | 0 | both | both in the road 2 / 3 lane, under the shutter |
| `a2-across` | [69, 8.5, 69.75, 11.5] | 0 | both | both on the pit's far side at the L2 door (needs the pit at x 66-69, assumption SA9) |
| `a3-fire` | [79.6, 9.2, 82, 12.3] | 0 | both | both through the fire door, west of the camera's 14 m |
| `a4-grille` | [98.5, 24.3, 104.5, 27.2] | 0 | both | both under the lift grille, in the back aisle |
| `a4-wicket` | [76.3, 33, 78, 36] | 0 | both | both at the dock wicket, past the loaders |
| `a5-apron-e` | [65.85, 24.3, 67.85, 47.7] | 0 | both | both down the wall's inside ladder (2 m strip after the trench shift, SA10) |
| `a5-apron-w` | [58.2, 24.3, 62.35, 47.7] | 0 | both | both across the cable trench (trench x 62.35-65.85, SA10) |
| `a6-pit` | [49.55, 62.15, 53.45, 66.05] | -1.6 | both | both in the drive pit (G0's `a6-pit` box) |
| `a8-office-in` | [134.25, 75.5, 136, 77.75] | 4.4 | any | one player inside the security office door |
| `a8-grille-in` | [134.3, 60.5, 136, 63.5] | 0 | any | one player through the public grille |

## 9. Security register
LD 4.11 and 13: every camera and beam with what it protects and why a real site has it there; every guard with the
lesson that needs his eyes or ears (Q11). A1, A2 and A6 have no camera or beam. Camera `facing` is in degrees, 0 north,
90 east (`CameraDevice`).

**Cameras and beams**
| id | Set | Device and place | Protects | Why it is there | Beaten by | Stations |
| --- | --- | --- | --- | --- | --- | --- |
| `cam-a3-hall` | A3 | IR ceiling camera at (96.6, 2.8, 10.75), facing west, range 14, armoured (`ARMOURED_FROM_SET`) | the office corridor to the east lift lobby | the landlord's out-of-hours CCTV on the floor's only corridor | the jam relay (5 s jam, 1.5 s reboot); the services crawl and the fire door sit past its 14 m | 6, 7 |
| `cam-a4-c1` | A4 | wall camera (111.5, 39.8), facing 270, range 14, on the loop flag `a4-loop` | the main aisle's east half | warehouse CCTV down the main aisle | the 60 s console loop | 8 |
| `cam-a4-c2` | A4 | mezzanine-face camera (96.75, 43.6), facing 180, range 14, `a4-loop` | the cross aisle | the one aisle between the rack runs | the loop; the grille and back aisle (z 24-27) are 16 m out, so station 9 is out of its range | 8 |
| `cam-a4-c3` | A4 | camera over the wicket (76.4, 33.0), facing 90, range 14, off for good on `a4-grille` (station 9 done; B2) | the dock, the loaders' desk, the main aisle's west end | dock CCTV over the yard door | off once the grille is passed; the crouch spots behind the pallet stacks (SA12) | none (off from 8 on) |
| `laser-a5` | A5 | three IR beams at 0.35 / 0.9 / 1.45 m across the 6 m cable gateway (x 58, z 33-39) | the inner zone | a substation's perimeter detection at its vehicle gateway | the throw over them; switched off for good by the far-side release `sw-a5-release` | 13 |
| `a7-cam1` | A7 | wall camera (86.5, 71.5), facing 195, range 12, short aim | the front aisle's north mouth, the cage's north apron | colocation CCTV on the client's cage | the technicians' rounds; the rack-light panel cut | 17 |
| `a7-cam2` | A7 | camera at the corridor's east end (99.6, 54.0), sweep 220-320, range 14 | the plant corridor and the pod door | the plant corridor's CCTV | slip the sweep in the cooling units' lees | 17 |
| `a8-cam1` | A8 | south-wall camera (120.0, 50.4), facing 0, range 14, `a8-loop` | the public floor south of the counters | bank CCTV over the public floor | the office loop; the counters' cover | 18a-18d |
| `a8-cam2` | A8 | east-wall camera at gallery level (133.75, 73.0), facing 323, range 10, `a8-loop` | the gallery's last 8 m and the office door | the security office's own door camera | the floor partner's jam from the counters (118.0, 67.2) | 18a |
| `a8-cam3` | A8 | lobby camera (134.45, 56.45), facing 45, range 14, `a8-loop` | both time locks, the throw spot, the beam curtain | vault lobby CCTV | the office loop | 18d |
| `laser-a8` | A8 | the beam curtain at x 140 across the vault lobby | the inner lobby and time lock two | the vault company's last layer | the throw; off on `a8-sync` | 18d |

**Guards: 12** (Michael ~20:40 "12, add two (Recommended)"; PLAN section 2 "Guards per lesson")
| id | Set | Post or round | Stations | Why the lesson needs him |
| --- | --- | --- | --- | --- |
| `a2-shunter` | A2 | post (51, 10) in the neck, facing east down it (graph, svg; the built post faces west: G-A2 turns him), round to the east end (66, 7.5) and back (`A2_SHUNTER_ROUTE`) | 3, 4, 5 | his eyes on the lit neck make the 15 s dark necessary; he notices a board left in the light at the pit (plank) |
| `a4-officer` | A4 | seated at the monitors (104.8, 17.6), facing north | 9, 8 | the console loops only with him down (`SecurityConsole.guard`); he is in the room both stations start in |
| `a4-dock1` | A4 | the dispatch desk (80.0, 34.4), facing south | 8, 10 | the synced takedown: taken alone, his partner sees |
| `a4-dock2` | A4 | the dispatch desk (80.0, 31.6), facing north; the kettle loop is removed, so he stays | 8, 10 | as `a4-dock1` |
| `a5-patrol` | A5 | round kiosk (47.9, 33.4), pen 1 (41.3, 31.0), (47.0, 34.6), the landing side (56.5, 37.6) (`A5_PATROL_ROUTE`) | 13 | the throw lands on his round |
| `a5-watcher`* | A5 | static beside the release kiosk, about (46.5, 32.0), facing east down the floodlit strip (G-A5 sets the exact post) | 13 | **extra guard 1.** With the patrol alone the strip is unwatched for part of his round, so the pair could wait him out and skip the floodlight jam; the watcher makes the jam necessary ("Seen in the floodlight: retry from behind the transformer"). Graph `a5-inner` guards 2 |
| `a6-attendant` | A6 | gauge round from the desk (61.5, 67.1) to pump 3 (48.2, 61.0) and back (`A6_ATTENDANT_ROUTE`) | 14, 15, 16 | his eyes on the loading edge and the bridge; his ears on the 6 m landing (the drop catch) |
| `a7-tech` | A7 | round rows 1-2 (`A7_TECH_ROUTE`) | 17 | the hall leg's threat, covered from the pod through the mesh |
| `a7-tech2`* | A7 | round from the hall's east side across the pod approach and back, spawned in the hall, in view of the hall leg through the cage mesh (G-A1A7 draws the route) | 17 | **extra guard 2.** With only the hall leg guarded, "covering each other" worked one way; now each partner covers the other. Counted on `a7-hall` (guards 2); `a7-pod` stays a quiet connector with no guard (LD 3.8) |
| `a8-night1` | A8 | post at the night desk (128.5, 71.6), head turns | 18a-18d | the graduation: mission rules in the banking hall |
| `a8-night2` | A8 | round desk, stair foot, grille, south-east floor, counters' east end (`A8_N2_ROUTE`) | 18a-18d | as `a8-night1`; his grille stop times the board drill |
| `a8-officer` | A8 | seated at the console (142.9, 74.7, y 4.4), his back to the door | 18a-18d | the office console loops only with him down |

Per set: A1 0, A2 1, A3 0, A4 3, A5 2, A6 1, A7 2, A8 3 = 12. Ordinary armed guards, no alarm team (BRIEF A12). Not a
guard: the A1 checker `a1-checker` stays seated, passive, blind and deaf (BRIEF A11; he stays in A1's `bay.squad` so
`e2e-coop.mjs:2057-2110` keeps working, and on no station's list). Removed from the built yard: `a2-watch-w`,
`a2-watch-e`, `a3-cleaner`. A4 and A8 sit at the training cap of 3 (`SET_GUARDS_MAX`).

**Station 16 fallback (BRIEF A6, PLAN section 2).** If G-A6's unit test shows a 6 m landing's noise does not reach the
attendant's round, the A5 watcher moves to A6 as a listener at the pit side, `a6-listener` (A5 1, A6 2, still 12):
station 13's `guards` lose `a5-watcher` and station 16's become `['a6-attendant', 'a6-listener']`. G-A5 and G-A6 agree it
with the lead before either builds its guards. Only if a listener there cannot hear it either does station 16 get a
rule (a heavy landing retries the station).

## 10. Assumptions, open questions, deviations
**Assumptions** (logged, each with its undo)
- **SA1 Reset rule.** A retry of station n resets each guard on n's `guards` list that was knocked out, alerted or moved
  since n went live (a guard dealt with at an earlier station stays as left, PLAN A17; this is why a guard may sit on
  several stations' lists), plus any guard alerted in the bay at that moment, listed or not, so the cause of a retry
  never repeats it (lead answer to OQ1, J14 wave 2). Undo: reset the listed guards only, and list every guard that can
  see a station's ground.
- **SA2 Line keys.** A station's lines are `bay.radio` rows at `retry:<station id>` and `retry:<station id>:timer`. Undo:
  a `say` field on the station (an S0 fix).
- **SA3 Marks by role.** `marks[0]` goes to role A, `marks[1]` to role B (the bay's role claim; P1 / P2 without one).
  Undo: by player slot, as the airlock spawns (`AirlockDef.spawns`).
- **SA4 A8 as four stations.** Badge 18 is four `StationDef`s, `n` 18-21, so each step retries at its own marks (PLAN
  section 2: "retries that step"). Undo: one station 18 at the vestibule marks (every A8 retry goes back to the start).
- **SA5 Station 13's marks.** A (the thrower) on the throw mark, B at the landing in the lee: Michael's approved line is
  "Seen in the floodlight: retry from behind the transformer". `?course=station:13` therefore starts B past the beams.
  Undo: both on the apron at the throw mark (59.0 / 60.0, 36.0).
- **SA6 No `drillS` on 7 and 17.** Station 7's 6.5 s is the jam's own length and the camera judges each hop; station
  17's 1.5 s is the scanner pair's window, which resets the terminals in place (REPLAN A7, Michael-approved). Undo:
  set them and give R1 a per-hop / per-try success test.
- **SA7 A4 play order 9, 8, 10** (section 4). Undo: move the grille past the console press (graph change).
- **SA8 Done flags are places.** Twelve new pass zones (section 8); the set slices build them. Undo: per-station flags set
  by the mode.
- **SA9 A2 pit at x 66.0-69.0.** The drawing's 66.5-69.5 leaves 0.25 m before the L2 door's wall; at 66.0-69.0 (still
  3 m) the far landing is 0.75 m and `a2-across` fits. The near-side marks (x 65.5, in the road 2 / 3 van gap) fit
  both. Undo: keep 66.5-69.5 and make `a2-across` the L2 door seal.
- **SA10 A5 gap and wall.** The gap is closed at z 30 and 36 (graph size 6 m) and 1.4 m clear (A19): the new wall x
  67.85-68.35 (east face 68.35). The 1.4 m gap left the apron's east strip only 0.85 m (G0, 82ea0134d), so the 3.5 m
  trench moves 1.15 m west to x 62.35-65.85 (lead, J14 wave 2): east strip x 65.85-67.85 (2 m), west strip x
  58.15-62.35; station 12's marks at x 67.0, 0.85 m off the wall face (graph `area` follows at G1). Undo: 1 m gap (A19's
  undo) and the trench back at x 63.5-67; marks at x 69.0 still fit, 0.25 m off the wall.
- **SA11 New ids and kinds.** `g-a2-shutter` (hold, door `A2-shutter`); `g-a2-shutter-open` (egress latch on the roller door, station 4's stand-in: open for good once station 3 passes);
  `g-a2-walkway` (stand-in, door `A2-walkway`);
  `g-a3-fire` (bolt, door `A3-fire`, push bar on the corridor side); `g-a4-grille` (the deadweight grille, KS1's hookup)
  and `g-a4-grille-motor` (stand-in: the motor button); `g-a5-wicket` and `g-a5-footbridge` (stand-ins, doors
  `A5-wicket`, `A5-footbridge`); `g-a5-plates` (the trench plates, laid from the west side); `g-a6-edge` (the gallery's
  self-closing edge gate); `g-a6-pit-ladder` (stand-in: `anchorLock` on the cage ladder `a6-pit-ladder`); squads
  `a5-watcher`, `a7-tech2` (fallback `a6-listener`). Undo: rename in the set slice and here together.
- **SA12 Station 10 and C3.** C3 watches the loaders' desk. The marks are the
  crouch spots behind the two pallet stacks (`A4_SPOT_N` / `A4_SPOT_S` on the grid), about 40-48 degrees off C3's axis;
  C3 is fixed at facing 90 down the wicket line, so both marks sit outside its frame (lead call, PLAN A28). Undo: marks
  at the main aisle's west end (85.5, 37.0 / 38.0). (marlow-play B2) C3's `offFlag` is `a4-grille`, not the loop flag:
  it is off for the rest of the set once station 9 is done. On the loop flag it came back when the 60 s ran out and saw
  every takedown at the desk (the attackers stand 27-29 degrees off its axis, 4 m out), and station 10's retry never
  re-runs the loop, so the pair retried forever. Undo: back on `a4-loop` with station 10's retry re-pressing the loop.
- **SA13 No-fail stations.** 1, 2, 11 and 12 have no guard, camera or drill, so they stay `retry: 'none'`. The cable
  trench has step irons on its east face at both ends and between its two decks (marlow-play-2 C18), so a fall is a walk back, never a soft-lock. A1 has one way out of
  its own: a player who drops into the yard before the ladder is done (the wicket stays shut till both have been on the
  wall top) is retried after 5 s with nobody on or climbing the wall, cause `other`, both back at the live station's
  marks with its `:other` line (PLAN A26, Q5). Station 15: a hanger who lets go before the key drops into the pit and
  walks out by the cage's push-bar door (graph `a6-pit` -> `a6-floor`); no retry needed.
- **SA14 Station 6 roles and the crawl.** The bay keeps the built role claim: B is the first one into the corridor box,
  so the crawler out of the grille becomes B, while mark A is the cupboard. A station 6 retry therefore swaps the jobs:
  the crawler goes to the door mark (B) and the one who waited at the door to the cupboard (A). Nothing stops both
  players crawling, which skips "open the door for your partner" without breaking anything (a one-user rule on the duct
  is engine work). Lead call, to be confirmed at Michael's walk (PLAN A29). Undo: swap station 6's marks, or add the
  one-user rule.
- **SA15 Station 20 can be skipped.** A8 keeps its side routes (Q24): the office stair's foot door opens from the stair
  side, so A can walk down into the lobby and either stand in `a8-grille-in` or press the request-to-exit to let B in.
  Station 20 is then done without the board's 25 s dark. Accepted as the Q24 side route working (PLAN A28 / A30). Undo:
  tie 20's done flag to the dark.

**Open questions for the lead** (assumed as above meanwhile; none blocks a set slice). Lead answers (J14 wave 2, sent to
S0 / R1): OQ1 the listed guards plus any guard alerted in the bay (SA1); OQ2 `StationDef` keeps its shape, each set file
runs its own drill windows (section 5) and calls R1's host `stationRetry(n, 'timer')`; OQ3 `n` 1-21 and play order not
rising; OQ4 the beam trip on station 13 is the set's `stationRetry(13, 'seen')`; OQ5 marks by role (SA3); OQ6 goes to
G-A6's brief.
- **OQ1 (R1)** The reset rule SA1. Without its "any guard in combat" part, a guard who caused a retry but is not on that
  station's list stays in combat and the retries repeat.
- **OQ2 (R1, S0)** Drill windows (section 5): `StationDef` has only `drillS`. R1 needs each drill's window source (gate,
  pair, jam) and fail test; station 4's "a player in the neck when the lights return" is the one a done flag cannot
  express. Suggested: a per-station constant in `replan/<set>.ts`, or an S0 fix adding `drill?: { kind, id, zone? }`.
- **OQ3 (S0)** `checkSetPart` and the `stationDef.ts` comment ("1-18") must allow `n` 18-21 (SA4) and a bay whose array is
  not in `n` order (A4, SA7).
- **OQ4 (R1)** A trip of a station's listed beam (`laser-a5` on station 13) is a `seen` retry (graph `a5-inner`: "Breaking
  a beam also retries").
- **OQ5 (R1)** Marks by role (SA3) or by player slot.
- **OQ6 (G-A6)** Station 16's drop must land in the pit: the 0.55 m gland hole is too small for a body, so the drive pit
  needs a drop opening under the bridge's rail (PLAN risk: the cage move).

**Deviations**
- graph `a5-gap` `size` is still 1 m ([1, 6, 6]; its G0 `area` is 1.4 m); this sheet uses Michael's 1.4 m. G1 fixes the
  size.
- PLAN A23 puts every `drill_s` into `drillS`; stations 7 and 17 do not take it (SA6).
- Badge 18 has four rows, `n` 18-21 (SA4).
