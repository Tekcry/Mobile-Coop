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
  (assumption S3). A split station puts the two marks on the two legs.
- **Ids.** `*` marks an id this sheet adds; the set slice creates it in `replan/<set>.ts`. The rest exist on master.
- **Retry kinds** (`StationDef.retry`). `none`: no guard, camera or drill reaches the station, nothing can fail.
  `station` (A1-A7): a guard in combat on a player, a camera's full detection of a player, or the drill window failing
  (section 5) puts both players on the station's marks after `SPOT_HOLD` (`courseMode.ts:102`, 1.5 s). `caught` (A8):
  suspicion and search play out as on a mission; a guard holding combat on a player for `CAUGHT_HOLD` 2 s, or the drill
  window failing, retries the step (PLAN A14). Downed is the campaign rule, unchanged: past the revives, one out or both
  down restarts the bay from its holding room (level-design 9.4, G312).
- **Play order.** Stations go live in the order of each bay's `stations` array; `n` is the badge on `replan-plan.svg`.
  Only A4 differs from badge order (section 4). A8's badge 18 is four retry steps, `n` 18-21 (assumption S4).

## 2. The stations
| n | Badge | Bay | id | Lesson (`teach:`) | Graph space | Retry | drillS | Done flag | Kit / stand-in |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | A1 | `a1-boost` | `boost` | `a1-walltop` | none | - | `a1-top1`* | - |
| 2 | 2 | A1 | `a1-ladder` | `human_ladder` | `a1-walltop` | none | - | `a1-top`* | - |
| 3 | 3 | A2 | `a2-shutter` | `shutter_hold` | `a2-lane` | station | - | `a2-lane`* | - |
| 4 | 4 | A2 | `a2-lights` | `timed_light_cut` | `a2-neck` | station | 15 | `a2-east` | - |
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
resets (the reset rule: assumption S1); a stand-in gate is also in `gates`.

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
const a2CarriageShedStations: StationDef[] = [
  { n: 3, id: 'a2-shutter', lesson: 'shutter_hold', retry: 'station', doneFlag: 'a2-lane',
    marks: [{ x: 31.0, z: 11.5, y: 0, yaw: Math.PI / 2 }, { x: 31.0, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-shutter'] },
  { n: 4, id: 'a2-lights', lesson: 'timed_light_cut', retry: 'station', doneFlag: 'a2-east', drillS: 15,
    marks: [{ x: 30.5, z: 2.5, y: 0, yaw: Math.PI }, { x: 45.5, z: 12.5, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-neck'] },
  { n: 5, id: 'a2-plank', lesson: 'plank_bridge', retry: 'station', doneFlag: 'a2-across', kit: 'plankBridge', standIn: 'g-a2-walkway',
    marks: [{ x: 65.5, z: 12.0, y: 0, yaw: Math.PI / 2 }, { x: 65.5, z: 13.0, y: 0, yaw: Math.PI / 2 }],
    guards: ['a2-shunter'], gates: ['g-a2-walkway'] },
];
// A3: replan/a3OfficeRange.ts
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
    marks: [{ x: 67.5, z: 33.0, y: 0, yaw: -Math.PI / 2 }, { x: 67.5, z: 34.5, y: 0, yaw: -Math.PI / 2 }],
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
    marks: [{ x: 141.5, z: 73.5, y: 4.4, yaw: Math.PI / 2 }, { x: 126.5, z: 76.5, y: 0, yaw: 0 }],
    guards: ['a8-night1', 'a8-night2', 'a8-officer'], gates: ['g-a8-night', 'g-a8-grille'] },
  { n: 21, id: 'a8-locks', lesson: 'synced_hack', retry: 'caught', doneFlag: 'a8-sync', drillS: 60,
    marks: [{ x: 141.5, z: 73.5, y: 4.4, yaw: Math.PI / 2 }, { x: 135.5, z: 66.5, y: 0, yaw: Math.PI / 2 }],
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
  S0's `checkSetPart` must not require `n` to rise inside a bay (assumption S7).
- **A8: four steps on badge 18,** in the order the set forces them (the built objective chain, `a8Strongroom.ts:551-596`):
  18a the leg-up split and the gallery run under C2 on the floor partner's jam, to the office door; 18b the officer and
  the console (the 60 s loop starts); 18c the lighting board, 25 s of dark to slip the grille; 18d the throw over the
  beam curtain and the paired hack, inside the loop. A8 keeps its side routes (public stair, the loop round the counters,
  the request-to-exit button in the lobby), so a step's done flag names a place, not a route.

## 5. Drill windows (every graph space with `drill_s`)
`StationDef` has only `drillS`. What opens a window and what fails it differs by drill, so R1 needs the rule below
(open question Q2). "Gate window": the timed gate in the station's `gates` (an isolator's dark, a console's loop);
"pair window": from the first of two to the second; "jam window": a jammer held on the named lamp or camera.

| Graph space | drill_s | Station | `drillS` | Window opens | Fails (-> retry) when | Note |
| --- | --- | --- | --- | --- | --- | --- |
| `a2-neck` | 15 | 4 | 15 | gate window: `g-a2-neck` dark (a press on `a2-iso-1` or `a2-iso-2`) | the dark ends with a player in the neck (x 46-56, z 0.3-19.7) | two crossings, one window each; the 3 s re-arm between |
| `a3-corridor` | 6.5 | 7 | - | jam window on `cam-a3-hall` (5 s held + 1.5 s reboot) | the camera's full detection (a `seen` retry) | not set: the camera judges each hop; a doneFlag test would fail after the first hop (S6) |
| `a4-main-aisle` | 60 | 8 | 60 | gate window: `g-a4-console` loop | the loop ends before `a4-west` | the console re-arms at once on the retry (it is in `gates`) |
| `a4-dock` | 1.5 | 10 | 1.5 | pair window: the first knock-out of `a4-dock1` / `a4-dock2` | the second loader is not down 1.5 s later (`SYNC_WINDOW`, `sectionRating.ts:24`) | one man taken alone retries, the pair reset at the desk |
| `a5-inner` | 9 | 13 | 9 | jam window on the kiosk flood (group 52; 5 s held + 4 s off) | the flood is back before `a5-release` | a beam broken also retries (Q4) |
| `a7-pod` | 1.5 | 17 | - | the scanner pair `sc-a7` (`a7-t1` / `a7-t2`) | a miss resets the terminals in place, no retry | not set: REPLAN A7 "Hack missed: the terminals reset" (Michael-approved) wins over PLAN A23 (S6) |
| `a8-board` | 25 | 18c | 25 | gate window: `g-a8-night` dark (a press on `a8-board`) | the dark ends before `a8-grille-in` (the grille relocks) | |
| `a8-lobby-inner` | 60 | 18d | 60 | gate window: `g-a8-console` loop (pressed in 18b, or again after a retry) | the loop ends before `a8-sync`; if 18d goes live after the loop has ended, it fails at once | the retry puts A back at the console, which re-arms at once |

## 6. LANTERN's retry lines
Plain, short, what and where (G343, G351); at most 90 characters (`COURSE_TEXT_MAX`). A `seen` / `caught` line plays for
a guard or camera, a `timer` line for a drill window. Keyed in the set's `bay.radio` as `at: 'retry:<station id>'`
and `at: 'retry:<station id>:timer'` (assumption S2). No line says "failed".

| n | id | Seen / caught | Timer |
| --- | --- | --- | --- |
| 1 | `a1-boost` | (none: nothing can fail) | - |
| 2 | `a1-ladder` | (none: nothing can fail) | - |
| 3 | `a2-shutter` | Seen at the roller door. Back to the stores bay. | - |
| 4 | `a2-lights` | The shunter saw you in the neck. Back to the cabin and the lane. | Lights came back with you in the neck. Back to the cabin and the lane. |
| 5 | `a2-plank` | The shunter saw the board. Back to the board stack at the east end. | - |
| 6 | `a3-vent` | The camera had you. Back to the west lobby. | - |
| 7 | `a3-jam` | The camera had you. Back to the corridor's west end; jam it again. | - |
| 9 | `a4-deadweight` | The duty officer saw you. Back to the security room door. | - |
| 8 | `a4-camloop` | Seen on the shop floor. Back to the security room; loop it again. | The cameras came back. Back to the security room; loop it again. |
| 10 | `a4-takedown` | The loaders saw you. Back behind the pallet stacks at the dock. | Both loaders at once, or the other one sees. Back behind the stacks. |
| 11 | `a5-chimney` | (none: nothing can fail) | - |
| 12 | `a5-swing` | (none: nothing can fail) | - |
| 13 | `a5-throw` | Seen in the floodlight. Back behind the transformer. | The floodlight came back. Back behind the transformer. |
| 14 | `a6-rope` | The attendant saw you. Back to the sump bay, behind the kerb. | - |
| 15 | `a6-hangdown` | The attendant saw you on the bridge. Back to the bridge's north end. | - |
| 16 | `a6-dropcatch` | The attendant heard the landing. Back to the bridge; catch your partner. | - |
| 17 | `a7-split` | Seen in the data hall. Back to the entry lobby. | - |
| 18a | `a8-c2run` | Caught in the banking hall. Back to the vestibule. | - |
| 18b | `a8-loopset` | Caught at the security office. Back to the office door and the board. | - |
| 18c | `a8-isolate` | Caught at the lighting board. Back to the board. | The hall lights came back. Back to the lighting board. |
| 18d | `a8-locks` | Caught in the vault lobby. Back to the office console and the lobby. | The cameras came back. Loop them again from the office console. |

## 7. Start marks and their space boxes
graph.json has no `area` boxes yet (G0 adds them). Each mark is checked against a box drawn from the set constants on
origin/master (sources below); G0 compares its boxes with these, and a mark outside a G0 box moves to the nearest grid
point inside it. All 42 marks are on the 0.5 m grid, inside their box and inside the set's `SET_BOX`.

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
| 12 | A | 67.5 | 33.0 | 0 | -PI/2 | `a5-apron-east` | yes |
| 12 | B | 67.5 | 34.5 | 0 | -PI/2 | `a5-apron-east` | yes |
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
| 18c | A | 141.5 | 73.5 | 4.4 | PI/2 | `a8-office` | yes |
| 18c | B | 126.5 | 76.5 | 0 | 0 | `a8-board` | yes |
| 18d | A | 141.5 | 73.5 | 4.4 | PI/2 | `a8-office` | yes |
| 18d | B | 135.5 | 66.5 | 0 | PI/2 | `a8-lobby-outer` | yes |

| Space | Box [minX, minZ, maxX, maxZ] | y | Source |
| --- | --- | --- | --- |
| `a1-apron` | [6, 2.25, 11.7, 19.75] | 0 | `a1Gate.ts:10` apron x 6-11.7; `SET_BOX.a1Gate` z 2-20 less the 0.25 m wall faces |
| `a1-walltop` | [11.7, 2.25, 12.3, 19.75] | 4.4 | `A1_WALL` near 11.7 / far 12.3, lip 4.4 (`a1Gate.ts:54`) |
| `a2-stores` | [28.25, 5.25, 33, 17.5] | 0 | shell face 28.25 (`a2CarriageShed.ts:104`); new roller-door wall x 33 and cabin line z 5.25 (`replan-plan.svg`); staging face z 17.5 (`A2_DECK.z`) |
| `a2-cabin` | [28.25, 1.1, 31.9, 4.9] | 0 | `A2_CABIN` x 28-32, z 1-5, 0.2 m walls; plant face z 1.1 (`a2CarriageShed.ts:101-103`) |
| `a2-lane` | [36, 11.3, 46, 13.7] | 0 | `A2_RAKES[0]` x 36-46; roads 2 / 3 at z 10 / 15 less `VAN.half` 1.3 (`a2CarriageShed.ts:93-95`) |
| `a2-east` | [65.5, 0.25, 66.5, 19.75] | 0 | pit west edge x 66.5 (`replan-plan.svg` rect x 499.5 px), graph size 1 m |
| `a3-west-lobby` | [76.25, 0.25, 79.5, 12.75] | 0 | `SET_BOX.a3OfficeRange` x 76, `A3_LOBBY_WALL_X` 79.5 (`a3OfficeRange.ts:105`) |
| `a3-corridor` | [79.5, 9, 97, 12.5] | 0 | `A3_HALL.box` (`a3OfficeRange.ts:77-83`) |
| `a4-secroom` | [100.25, 13.25, 106.35, 19.35] | 0 | `A4_ROOM` inner faces (`a4GoodsShed.ts:81`) |
| `a4-dock` | [76.25, 24.25, 85.75, 47.75] | 0 | `A4_FLOOR` x0 / z0 / z1 (`a4GoodsShed.ts:79`), graph size 9.5 m east |
| `a5-gap` | [68.35, 30, 69.75, 36] | 0 | L4 outer face 69.75 (`HOLD_BOX.L4`), the 1.4 m gap (PLAN A19), L4 z 30-36 |
| `a5-apron-east` | [67, 24.25, 68, 47.75] | 0 | trench east edge x 67 (`replan-plan.svg` rect x 478.5-503 px), new wall face ~68.05 at the 1.4 m gap |
| `a5-apron` | [58.15, 24.25, 63.5, 47.75] | 0 | `A5_WALL.near` 58.15 (`a5Substation.ts:106`), trench west edge x 63.5 (`replan-plan.svg`) |
| `a5-lee` | [54, 33, 57.85, 39] | 0 | `A5_WALL.far` 57.85, `A5_LANDING` (56, 36) (`a5Substation.ts:90`, `:106`), graph size 3.5 x 6 |
| `a6-sump` | [48.2, 54.25, 57.8, 58] | 0 | `A6_SUMP` (`a6PumpHouse.ts:117`) |
| `a6-bridge` | [49, 61.6, 54, 69.6] | 4.4 | `A6_BRIDGE`, deck 4.4 (`a6PumpHouse.ts:106-107`) |
| `a6-pit` | [49.4, 62, 53.6, 66.2] | -1.6 | `A6_CAGE` footprint (`a6PumpHouse.ts:108`), sunk 1.6 m (PLAN section 2) |
| `a7-lobby` | [70.25, 55.95, 75.85, 65.85] | 0 | `a7DataHall.ts:9` entry lobby |
| `a8-vestibule` | [106.25, 56, 109, 75] | 0 | `A8_RETURN` (`a8Strongroom.ts:166`) |
| `a8-board` | [106.25, 75, 133.85, 77.75] | 0 | `A8_NORTH` (`a8Strongroom.ts:167`), under the gallery |
| `a8-office` | [134.25, 71.65, 143.75, 77.75] | 4.4 | `a8Strongroom.ts:16` office x 134-144, z 71.4-78, faces 0.25 in |
| `a8-lobby-outer` | [134.15, 56.15, 140, 67.85] | 0 | `a8Strongroom.ts:20` vault lobby, beam curtain x 140 |

## 8. New done flags
Each is a pass zone the set slice adds (`PassZone`, `src/game/passZones.ts`): `any` = one player is enough, else both.
The other done flags exist on master: `a2-east`, `a3-far` (its zone loses `hall` on the re-plan: no send-back), `a4-west`,
`a5-release`, `a6-gal`, `a6-drive`, `a7-sync`, `a8-loop`, `a8-sync`.

| Flag | Zone [x0, z0, x1, z1] | floorY | Who | Means |
| --- | --- | --- | --- | --- |
| `a1-top1` | [11.7, 2.3, 12.3, 19.7] | 4.4 | any | one player on the wall top (the boost) |
| `a1-top` | [11.7, 2.3, 12.3, 19.7] | 4.4 | both | both players on the wall top (the ladder) |
| `a2-lane` | [36, 11.3, 46, 13.7] | 0 | both | both in the road 2 / 3 lane, under the shutter |
| `a2-across` | [69, 8.5, 69.75, 11.5] | 0 | both | both on the pit's far side at the L2 door (needs the pit at x 66-69, assumption S9) |
| `a3-fire` | [79.6, 9.2, 82, 12.3] | 0 | both | both through the fire door, west of the camera's 14 m |
| `a4-grille` | [98.5, 24.3, 104.5, 27.2] | 0 | both | both under the lift grille, in the back aisle |
| `a4-wicket` | [76.3, 33, 78, 36] | 0 | both | both at the dock wicket, past the loaders |
| `a5-apron-e` | [67, 24.3, 68, 47.7] | 0 | both | both down the wall's inside ladder |
| `a5-apron-w` | [58.2, 24.3, 63.5, 47.7] | 0 | both | both across the cable trench |
| `a6-pit` | [49.4, 62, 53.6, 66.2] | -1.6 | both | both in the drive pit |
| `a8-office-in` | [134.25, 75.5, 136, 77.75] | 4.4 | any | one player inside the security office door |
| `a8-grille-in` | [134.3, 60.5, 136, 63.5] | 0 | any | one player through the public grille |

