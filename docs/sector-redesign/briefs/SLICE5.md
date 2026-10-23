# Slice 5 brief - S5 the Old House and the extraction (builder: Sonnet 5.5; checker: Opus)

Written by the planner (Opus) 2026-10-23 for the lead. Build exactly this; anything not covered: pick the simplest
option, log it as L1, L2 ... in your report (the lead renumbers them), never ask. Greybox only. No dressing, no refining.
Section index 4 (0-based) everywhere in data (`section: 4`, `useKeypad(4, k)`, `turnKey(4, k, ..)`). S4 is built in
parallel on another branch: never read or depend on S4 files; your only contact with S4 is its C4 connector (the stub
values in `campusSectors.ts`, unchanged by both of you).

## Before you start (the lead does this, not you)
1. "Next" 0 of STATE.md has landed on `feature/sector-redesign` (the part-6 first run reads counts per section).
2. Branch `feature/sector-redesign-s5` cut from that commit, worktree `C:/NightShift/Mobile-Coop-sector-redesign-s5`,
   node_modules junction (`cmd //c mklink //J <wt>\node_modules C:\NightShift\Mobile-Coop-sector-redesign\node_modules`).
Your guard before every write: `cd /c/NightShift/Mobile-Coop-sector-redesign-s5 && test "$(git rev-parse --abbrev-ref
HEAD)" = feature/sector-redesign-s5`. Never commit, push, stash, reset or checkout.

## Read first
1. `docs/systems/agent-preamble.md`.
2. `docs/sector-redesign/SPEC.md`: "Campus-wide rules" (115-180), "S5 - The Old House" (434-494), "Unavoidable posted
   guards (M12)" row K4, "Co-op routes" CR6 / CR7. This brief overrides SPEC where they differ (the A-numbers below).
3. `docs/sector-redesign/BRIEF.md` A2, A12, A15, A21, A29, A30, A46-A51, A60-A64, A70.
4. Pattern code, in full: `src/world/maps/campusS2.ts` (the fire-stair core: `Flight`, `Core`, `coreFlights` 62-118,
   `buildCore` 296-330, `FEATURE_STAIR` 121), `src/world/maps/campusS3.ts` (helpers 230-316, ladders 398-405),
   `src/world/maps/campusSectors.ts`, `src/world/maps/campusOps.ts`, `tests/campusS3.test.ts` (whole file),
   `tests/campusS2.test.ts` (the core / flight tests 376-420, K2 640-696, dormant 697-757). Engine shapes (read, never
   edit): `src/game/sectors.ts` 36-215 and 360-560, `src/game/sectorStage.ts` 1-200, `src/game/isolators.ts` 1-30,
   `src/game/teamMoves.ts` 281-300 (`ropeRoom`), `src/config/movement.ts` 450-513 (`TEAM` rope numbers),
   `src/player/movement.ts` 168-176 and `src/config/noise.ts` 1-12 (landing noise), `src/world/levelBuilder.ts` 241-330
   (`ladder`, `windowAt`, `door`, `rappel`, `fence`). Reports: `checks/slice2-build.md`, `checks/slice3-check.md`.

## Files you own
- NEW `src/world/maps/campusS5.ts`: all S5 geometry, lamps, switches, the board, rooms, hide spots, nav seeds (no pickups),
  the laser and its panel, test constants (`S5_BOX`, `S5_DOORS`, `S5_GROUPS`, `S5_FLIGHTS`, `S5_CORE`, `S5_ROPE_EDGE`,
  `S5_PANEL_NEAR`). Copy S2's core code and S3's helpers into it (private; never import or edit campusS2/3.ts).
- NEW `src/world/maps/campusS5Data.ts`: pure sector data (no Babylon): `S5_GUARDS`, `S5_ROUTES`, `S5_SECTOR: SectorDef`,
  `S5_CAMERAS`, `S5_ALARMS`, `S5_POSTS`.
- EDIT `src/world/maps/campusSectors.ts` (only these blocks; see "Merge notes" in SLICE4.md): import line; `CAMPUS_POSTS`
  gets `...S5_POSTS`; `CAMPUS_SECURITY.levels` gets `'s5-l1': 4.2`; `devices` gets `...S5_CAMERAS`; `CAMPUS_ALARMS`
  gets `...S5_ALARMS`; the `CAMPUS_SECTORS` entry `id: 's5'` (the stub, last entry) becomes `S5_SECTOR`.
- EDIT `src/world/maps/campusOps.ts` (only these blocks): import line; in `otherBuildings` delete the S5 `shell(...)`
  line (100) and nothing else; `STUB_NAV_SEEDS` delete `new Vector3(-46, 0, 33)`; `build` adds `buildCampusS5(b);` after
  `buildCampusS3(b);`; layout arrays append `...S5_HIDESPOTS`, `...S5_SWITCHES`, `...S5_ROOMS`,
  `...S5_NAV_SEEDS`; `lasers` / `laserPanels` become `[...S3_LASERS, ...S5_LASERS]` / `[...S3_PANELS, ...S5_PANELS]`;
  add `boards: [...S5_BOARDS]`.
- `campusLips.ts`: no change (S5 has no leg-up lip; CR6 is a pair gate, CR7 a rope edge).
- NEW `tests/campusS5.test.ts`.
- EDIT (counts only) `tests/campusS2.test.ts:156` `5 + 7 + 9` -> `5 + 7 + 9 + <S5 switch count>`;
  `tests/laserPanels.test.ts:123` `8` -> `9` (comment "+ S5's las-shaft").
- EDIT `scripts/e2e-sectorops.mjs`: append `campusS5Part(page)` and its `if (want(6))` run after the S3 block (before
  the final `console.log`). Touch nothing earlier.
- APPEND one line to `changes/feature-sector-redesign.md`: "Sector Ops campusOps: S5 the Old House greybox and the
  jetty extraction (two dogs, response team, pair gate, light well)."
- NEW `docs/sector-redesign/checks/slice5-build.md` (your report).

Never edit: `src/ai/*`, `src/net/*`, `src/security/*`, `src/game/*`, `ctDevices.ts`, `securityRoom.ts`, `warehouse*.ts`,
`campusS1.ts`-`campusS3.ts`, `campusLips.ts`, the S1-S4 SectorDefs, `missionsScreen.ts`, `docs/level-design.md`,
`docs/templates/*`, `CHANGELOG.md`, `package.json`, BRIEF / SPEC / PLAN / STATE, anything of S4.

## Frame and hard rules (metres; yaw 0 = +z, PI / 2 = +x)
- S5 occupies x -70..-26, z 18..70: the main block x -56..-32, z 18..44 (G 0, L1 4.2, roof 8.4); the service wing
  x -32..-26, z 18..44 (one storey, low roof 4.2); the walled garden x -70..-56, z 18..44; the terrace z 44..50; the lawn
  z 50..58; the boathouse and the jetty to z 66. Main-block walls 0.3 to 8.4; L1 slab 4.0-4.2; roof slab 8.2-8.4.
  Partitions 0.2. Doors 1.2 x 2.1 with heads. Boxes 1.9-4.2 standing on a floor are `noLedge`; all boxes yaw 0.
- Lamp groups 80-89. Level id `'s5-l1'` = 4.2 for the camera on L1.
- **Runtime nav (an S3 stair leg failed e2e at 4def7d24 while analyticNav passed):** use only geometry whose legs passed
  the runtime grid: (1) the service stair is S2's core copied verbatim (`coreFlights` / `buildCore`, no spine wall,
  landings `overhead`, 1.2 near / 0.8 half landings, flights 3.6 long) with floors [0, 4.2, 8.4]; (2) the hall stair is
  built like S2's `FEATURE_STAIR` (`b.stairs`). Route legs change floor only (a) between two points stacked at the core's
  near-landing centre (`[-35, 38.9]` -> `[-35, 38.9, 8.4]`, the S2 pattern `[-40.7, -23] -> [-40.7, -23, 12.3]`) or
  (b) from 0.8 m beyond the feature stair's foot to 0.8 m beyond its head. No route point within 0.6 m (plan) of a
  collide box below head height, a rail or a flight side. Rappel, ladder and drop legs go in `climbs`.
- **Plan-only doors:** every keypad, pair gate, lockdown and connector door centre >= 1.2 m (plan) from every other door
  anchor centre on any floor (the values below satisfy it; the test asserts it).
- **Sealed section (A84 proposed):** boundaries are walls, never `b.fence` (climbable): the garden's S and N walls and
  the estate wall (x -26, z 44..70) are 2.8 noLedge; x -70 and z 70 are the map perimeter. No fall damage exists, so roof
  edges over ground outside S5 carry 1.9 parapets: the main roof's S edge and the service wing's E and S edges; the other
  roof edges (over the garden, the terrace, the low roof) 1.1. The front door is locked and unbreachable.
- **E2 glass is not in:** no glazing; the anteroom window is an open sash (window anchor `open: true`).

## Geometry (exact boxes; walls on the box lines, doors at the listed centres)
| Space (room id) | Box x0..x1, z0..z1 | Floor / height | Doors (centre) and notes |
| --- | --- | --- | --- |
| Control room `s5-ctl` | -56..-50, 18..30 | G | E (-50, 27). Table 0.75 x -53.5..-52.5, z 23..26. |
| Drawing room `s5-draw` | -56..-50, 30..44 | G | E (-50, 33) to the passage; W (-56, 40) to the garden. Dark (closed, dust sheets). |
| Stair hall `s5-hall` | -50..-38, 18..32 | G, void to 8.2 over x -47..-41, z 18..29 | S front door (-44, 18) locked, unbreachable; W (-50, 27); N (-48, 32) passage; N (-43, 32) anteroom; E (-38, 22) back corridor. Feature stair `{ cx: -45, cz: 25.3, w: 2.0, len: 7.4, rise: 4.2, yaw: 0, y0: 0, steps: 24 }` (z 21.6 at 0 to z 29.0 at 4.2). |
| West passage `s5-pass` | -50..-46, 32..34 | G | S (-48, 32); W (-50, 33). Dark. |
| Light well | -50..-46, 34..38 | G, open to the sky | No door. Rim 1.1 (noLedge) on the roof round it. |
| Plate store | -50..-46, 38..44 | solid 0..8.4 | No room. |
| Anteroom `s5-ante` | -46..-40, 32..37 | G | S (-43, 32); E side door (-40, 33.2); E shaft door (-40, 36); N (-43, 37). Window in the W wall: hole z 34.7..36.3, y 0.45..2.05, `b.windowAt(-46, 1.25, 35.5, 1.6, 1.6, PI / 2, { sill: 0.45, open: true, breakable: false })`. Floor clear (no audit table: L-log it). |
| Strongroom `s5-strong` | -46..-40, 37..44 | G | S (-43, 37), open tonight. Token table 0.9 x -43.6..-42.4, z 43.2..43.8. |
| Shaft | -40..-38, 35..37 | G..8.2 | W door (-40, 36) into the anteroom; L1 slab hole over it; ladder `b.ladder(-39, 36.55, 0, 4.2, 0)` (top steps north onto the L1 cage floor). |
| Vestibule `s5-vest` | -40..-38, 32..35 | G | W (-40, 33.2) anteroom side door; E (-38, 33.5) back corridor (stage-3 lockdown). |
| Closet | -40..-38, 37..44 | solid 0..4.0 | No room. |
| Back corridor `s5-back` | -38..-32, 18..38 | G | W (-38, 22) hall; W (-38, 33.5) vestibule; E (-32, 29) service lobby; N the core's G door (-35, 38.0). Unlit. Solid slivers x -38..-36.5 and -33.5..-32, z 38..44 at G. |
| Service stair `S5_CORE` | interior x -36.3..-33.7, z 38.2..43.8 | 0 / 4.2 / 8.4, bulkhead top 11.0 | S2 `Core` with `near: 'S'`, `door: { wall: 'S', c: -35.0 }`: doors at G, L1 and the roof, all at (-35, 38.0). |
| Service lobby `s5-lobby` | -32..-26, 26..32 | G (wing) | E = **C4 far door (-26, 29)** (keep: the S1 test asserts it); W (-32, 29); N (-29, 32); S (-29, 26). Dark (the colonnade end). |
| Kitchen `s5-kitchen` | -32..-26, 32..44 | G (wing) | S (-29, 32); N back door (-29, 44) to the terrace. Counter 0.9 x -31.6..-30.8, z 34..42. |
| Plant room `s5-plant` | -32..-26, 18..26 | G (wing) | N (-29, 26). Boiler 2.0 (noLedge) x -31.5..-30.0, z 19..21. Dark. |
| Boardroom `s5-board` | -56..-50, 18..30 | L1 | E (-50, 27). |
| CEO suite `s5-ceo` | -56..-50, 30..44 | L1 | E (-50, 31) onto the gallery's NW corner. |
| Gallery `s5-gal` | west arm -50..-47, 18..29; north -50..-38, 29..32; east arm -41..-38, 18..29 | L1 | 1.1 rails (noLedge) on the void edges, gap x -46..-44 at z 29 (the stair head). |
| Archive `s5-arch` | -46..-38, 32..44 | L1 | S (-40.5, 32) to the gallery; E **kp-arch** (-38, 41.0) to the back landing; W hoist door (-46, 36.0) onto the well (CR7). Rolling stacks 2.2 (noLedge) x -44.3..-42.9 at z 34..35, 37..38, 40..41. **Cage** x -41..-38, z 34.6..39.4: 0.1 solid walls 4.2..8.2 (the archive E wall is its fourth side), door **pg-arch** in its W face (-41, 38.6) (opening z 38.0..39.2); the shaft hole and the ladder top inside it. |
| Back landing `s5-landing` | -38..-32, 32..38 plus strip -38..-36.5, 38..44 | L1 | The core's L1 door (-35, 38.0); kp-arch. The L1 block x -38..-32, z 18..32 is solid (no doors). |
| Roof `s5-roof` | main block | 8.4 | Holes: the well, the core (bulkhead). Parapets per "Sealed section". Rappel `b.rappel(-54, 8.4, 44.15, 0, 8.4)` with a parapet gap x -54.6..-53.4. Chimneys 1.2 x 1.2 x 2.0 (noLedge) at (-53, 22), (-53, 36), (-41, 24), (-36, 21). |
| Low roof | wing | 4.2 | Reached only by a drop from the main roof's E parapet; parapets E and S 1.9, N 1.1. |
| Garden `s5-garden` | -70..-56, 18..44 | G | Walls 2.8 noLedge S (z 18) and N (z 44); gate (plain door) (-63, 44). Beds 0.5 high (cover) x -68..-58, z 26..28 and 34..36. |
| Terrace `s5-terrace` | -70..-26, 44..50 | G | Balustrade 1.0 (low cover) along z 50 with gaps x -44.6..-43.4 (**the terrace gate**, #20) and x -64.6..-63.4 (the boathouse path). |
| Lawn and lane `s5-lawn` | -70..-26, 50..58 | G | Van box 2.4 (noLedge) x -30.5..-27.5, z 52..57. Trees (cylinders r 0.35, h 6, collide) at (-65, 52), (-62, 53.5), (-65, 55.5), (-61, 56.5), (-57, 58), (-53, 57). Estate wall x -26, z 44..70. |
| Jetty `s5-jetty` | deck x -47..-43, z 58..66, top 0.4; boathouse 3.0 (noLedge) x -54..-49, z 58..64 | G | `extract: { label: 'Extract at the boathouse jetty', box: [-50, 60, -40, 66] }`. The lake is not modelled (L-log). |

`S5_ROPE_EDGE = { x: -46.15, z: 36.0, y: 4.2, n: { x: -1, z: 0 }, floor: 0 }` (the hoist door's sill over the well).

## Lighting (groups 80-89; `makeCone` down-lights where a fitting points down)
| Group | Lamps (x, y, z), r | Switch / board | Note |
| --- | --- | --- | --- |
| 80 `s5-chand` | chandelier (-44, 6.5, 23.5), r 12, i 0.9, shootable | (-42.5, 0, 18.15) yaw 0, beside the front door (in #12's view) | The lure for #13-#14 is a shot or a jam |
| 81 `s5-gal` | wall lights at 6.6: (-49.85, 21), (-49.85, 27), (-46, 31.85), (-42, 31.85), (-38.15, 21), (-38.15, 27), r 5 | (-49.85, 4.2, 19.0) yaw PI / 2 and (-38.15, 4.2, 19.0) yaw -PI / 2 | - |
| 82 `s5-board` | (-53, 7.4, 21), (-53, 7.4, 27) | (-50.15, 4.2, 25.8) yaw -PI / 2 | - |
| 83 `s5-ante` | anteroom (-43, 3.4, 34.5); strongroom (-43, 3.4, 40.5) | in the hall by the anteroom door (-44.2, 0, 31.85) yaw PI | The K4 "anteroom light" lure (cut from outside) |
| 84 `s5-garden` | garden uplights (y 0.3) (-67, 25), (-59, 25), (-67, 37), (-59, 37), r 6; terrace bollards (y 0.8) x -64, -56, -48, -40, -34, -28 at z 49.5, r 4 | **board** (timed isolator, window 20) in the kitchen (-31.85, 0, 40.0) yaw PI / 2 | #21 answers it (A90 logic: the nearest calm armed guard) |
| 85 `s5-ctl` | (-53, 3.4, 21), (-53, 3.4, 27) | (-50.15, 0, 28.2) yaw -PI / 2 | - |
| 86 `s5-kitchen` | (-29, 3.4, 35), (-29, 3.4, 41) | (-29.8, 0, 32.15) yaw 0 | - |
| 87 `s5-roof` | the marksman's position light (-40, 9.6, 43.6), r 4 | none (shoot) | - |
| 88 `s5-hall` | hall wall lights at 2.6: (-49.85, 22), (-49.85, 28), (-38.15, 26), (-38.15, 30), r 5 | (-38.15, 0, 23.2) yaw -PI / 2 | - |
| 89 `s5-ceo` | (-53, 7.4, 34), (-53, 7.4, 40) | (-50.15, 4.2, 32.3) yaw -PI / 2 | - |
Unlit by reason: archive (aisle lights off), drawing room (closed), passage, well, back corridor, service lobby, plant
room, lawn, the boathouse path, the jetty, the roof but for #19's light. `b.ambientZone(-70, -26, 18, 66, 0.14, -1, 12)`;
0.30 over the core box. C4 keeps its 0.30.

## Guards (24; `S5_GUARDS`, index = number - 1; plain routes close back to point 0)
Speeds: plain grunt 0.99, officer 0.935, enforcer 0.88; `loop` grunt 0.9, dog 1.1. `y` 4.2 on L1, 8.4 on the roof.
| # | Kind | Slot (x, z, y) yaw | Route / waits / faces / loop | Cycle | Tags (role, zone, squad, extra) | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | enforcer | (-54.5, 21.0) PI / 4 | post | - | response, ctl, 0, dormant | Standing reaction force for the ceremony |
| 2 | enforcer | (-52.0, 21.5) 0 | post | - | response, ctl, 0, dormant | Same |
| 3 | enforcer | (-54.5, 26.0) PI / 2 | post | - | response, ctl, 0, dormant | Same |
| 4 | enforcer | (-53, 27.5) PI / 2 | [[-53, 27.5], [-41.5, 23.5]], waits [6, 6] | 39.7 | response, hall, 0 | The team's hall walk |
| 5 | grunt | (-63, 23.5) 0 | [[-63, 23.5], [-63, 40.5]], faces [0, PI], loop { period: 44, leave: [3, 25], t0: 0 } | 44 | handler, garden, 1 | Grounds patrol for the ceremony |
| 6 | dog | (-62, 23.5) 0 | [[-62, 23.5], [-62, 40.5]], same loop | 44 | dog, garden, 1, `handler: 4` | At heel (A87) |
| 7 | grunt | (-36, 47) -PI / 2 | [[-36, 47], [-53, 47]], faces [-PI / 2, PI / 2], same loop (west stop at t 22-25 with the garden team's north stop) | 44 | handler, terrace, 1 | Lake-side patrol |
| 8 | dog | (-36, 46) -PI / 2 | [[-36, 46], [-53, 46]], same loop | 44 | dog, terrace, 1, `handler: 6` | At heel |
| 9 | officer | (-44, 34.0) PI | post | - | posted, token, 2, `pair: 9` (**K4**) | Two-person rule: neither alone with the token |
| 10 | officer | (-42, 34.0) PI | post | - | posted, token, 2, `pair: 8` (**K4**) | Same |
| 11 | officer | (-45.2, 33.0) PI / 2 | [[-45.2, 33.0], [-40.8, 36.2], [-39.0, 33.6]], waits [4, 4, 4] | 27.9 | escort, ante, 2 | Escorts the audit papers; alone at the shaft door |
| 12 | officer | (-44, 20.5) PI | post | - | door, hall, 0 | Front door, under cam-hall |
| 13 | grunt | (-48.5, 19.6, 4.2) 0 | [[-48.5, 19.6], [-48.5, 28.4]], waits [5, 5] | 27.8 | gallery, gal-w, 3 | Overlooks the stair hall |
| 14 | grunt | (-39.5, 28.4, 4.2) PI | [[-39.5, 28.4], [-39.5, 19.6]], waits [5, 5] | 27.8 | gallery, gal-e, 3 | Same, opposite phase |
| 15 | officer | (-53, 24, 4.2) PI / 2 | post | - | post, board, 3, dormant | Board papers laid out for 08:00 |
| 16 | officer | (-51.6, 30.8, 4.2) 0 | post | - | post, ceo, 3, `pair: 16` | The CEO's safe and laptop |
| 17 | grunt | (-51.6, 32.0, 4.2) PI | post | - | post, ceo, 3, `pair: 15` | Same |
| 18 | grunt | (-45, 33, 4.2) 0 | [[-45, 33], [-45, 43], [-42.2, 43], [-42.2, 33]], waits [3, 3, 3, 3] | 37.9 | patrol, archive, 3 | Archive round; alone in the dark stacks |
| 19 | grunt | (-40, 43.0, 8.4) 0 | [[-40, 43.0], [-39, 43.0]], waits [12, 12], faces [-0.6, 0.6] | 26.0 | marksman, roof, 4 | Overwatch of the lake approach (a rifle, A12) |
| 20 | grunt | (-44, 50.7) 0 | post | - | gate, terrace, 1 | The terrace gate, lake side |
| 21 | grunt | (-29, 42.5) PI | [[-29, 42.5], [-29, 23.5]], waits [3, 3] | 44.4 | patrol, wing, 5 | Service round; answers the garden board |
| 22 | officer | (-27.6, 29.0) -PI / 2 | post (the C4 door 1.6 m behind him, A95) | - | post, lobby, 5 | Checks anyone coming in from the data hall |
| 23 | grunt | (-31.4, 53.5) -PI / 2 | post | - | driver, lane, 4 | The team's van; overlooks the jetty path |
| 24 | officer | (-35, 37.2) PI | [[-35, 37.2], [-35, 19.6]], waits [3, 3] | 43.6 | tour, back, 5 | Clocking round of the back stair door and the hall door (one floor, A94) |
Takedown spots: 0.4-0.6 m behind each post, or a route end out of the others' view; the M8 test decides (record).
`S5_POSTS = { 's5#9': { leash: 3, highSecurity: true, guards: 'token' }, 's5#10': { leash: 3, highSecurity: true,
guards: 'token' } }`. Dormant only #1, #2, #3, #15. `dogs: 2`, `perStage: 2`, `reinforce: [[-44, 21], [-29, 21]]`
(peak 24 + 3 x 2 = 30 <= 32).

## Security register (section 4)
| Id | Data | Protects / why there | Weak side |
| --- | --- | --- | --- |
| cam-hall | `{ level: 'ground', at: [-38.2, 25.0], y: 3.2, facing: 225, aim: 6, range: 10 }` | The front door and the stair foot | The back-corridor door beside it is out of frame |
| cam-gallery | `{ level: 's5-l1', at: [-38.2, 26.0], y: 2.6, facing: 340, aim: 5, range: 9 }` | The archive's gallery door (-40.5, 32) | The kp-arch back door is on the other side |
| cam-terrace | `{ level: 'ground', at: [-44, 44.3], y: 3.0, facing: 0, aim: 6, range: 12 }` | The terrace gate and the lawn | The boathouse path under the trees (x < -56) is outside it |
| las-shaft | `{ id: 'las-shaft', x1: -40.35, z1: 35.4, x2: -40.35, z2: 36.6, ys: [0.4, 0.9, 1.4], floorY: 0, label: 'Shaft landing beams', section: 4 }` | The anteroom from the shaft (the lift is out of use tonight, so armed) | Panel `{ id: 'panel-shaft', lasers: ['las-shaft'], x: -41.15, y: 5.6, z: 36.0, yaw: -PI / 2, section: 4, label: 'Shaft landing beams power' }` on the cage's W face in the archive: the far side for a solo, the near side for CR6. `S5_PANEL_NEAR['panel-shaft'] = [[-43.0, 4.2, 36.0], [-42.2, 4.2, 33.0], [-42.2, 4.2, 40.0]]` |
| kp-arch | `keypads: [{ at: [-38, 41.0], code: 's5-arch' }]` | Records | Code on the kitchen rota board (A81) |
| rota board | `intel: [{ kind: 'board', grants: 's5-arch', line: 'Rota board: archive keypad 1960 until Monday.', at: [-26.15, 1.5, 37.0], yaw: -PI / 2 }]` | - | Read in the kitchen on #21's round |
| pg-arch | `pairGates: [{ door: [-41, 38.6], a: { at: [-40.0, 34.45], y: 4.2, yaw: PI }, b: { at: [-45.85, 42.0], y: 4.2, yaw: PI / 2 } }]` (9.5 m apart; window 1.0) | The archive cage to the shaft (CR6) | Solo: the anteroom side or hall door |
| alarms | `S5_ALARMS`: `{ at: [-55.85, 26.5], yaw: PI / 2, section: 4 }` (alarm-ctl), `{ at: [-40.15, 34.6], yaw: -PI / 2, section: 4 }` (alarm-ante), `{ at: [-44.8, 44.15], yaw: 0, section: 4 }` (alarm-ter) | Guard posts | - |
| stage actions | `[{ stage: 1, responseRoute: [[-53, 24], [-47, 27], [-43, 30.5]], releaseDogs: true }, { stage: 2, lightsFull: [81, 84], lockDoors: [[-56, 40]] }, { stage: 3, lightsFull: [80, 88], lockDoors: [[-38, 33.5]] }]` | Stage 1 the team deploys from the control room and the dogs come off the heel; stage 2 the gallery and the grounds to full, the garden door locks; stage 3 the hall to full, the back corridor sealed from the anteroom | The jetty stays open (G125); `checkStageActions` passes (the kitchen and the hall stay open) |
No security desk in S5 (the control room is the response team's).

## Stealth over shooting (Michael 2026-10-23 ~10:10 and ~10:20)
Engine fact (grep, 2026-10-23): no bulletproof, thermal or armoured flag exists; every camera already ignores lamps (IR,
`src/security/securitySystem.ts:47-49`), so cutting lights never beats a camera. Data goes in guarded side tables in
`campusS5Data.ts`, never on the engine types; the engine items (E8, E9-crate, E10) are listed at the end of
`briefs/SLICE4.md` and move them on.
- **Bulletproof thermal cameras:** `S5_CAMERA_FLAGS = { 'cam-hall': { bulletproof: true, thermal: true }, 'cam-gallery':
  { bulletproof: true, thermal: true }, 'cam-terrace': { bulletproof: true, thermal: true } }` (comment "moves onto
  CameraDevice with E8"). Ways to beat them: the jammer, the routes round (the boathouse path, the kp-arch back door).
- **Armoured routes:** `S5_ARMOURED = [{ id: 'arm-ante', kind: 'door', at: [-43, 32], bypass: 'The back corridor, the
  anteroom side door and the garden' }, { id: 'arm-front', kind: 'door', at: [-44, 18], bypass: 'The back corridor, the
  anteroom side door and the garden' }]` (same type as S4's); build the anteroom hall door with `breachable: false`
  (the front door is already locked and unbreachable). Quiet ways past the armoured anteroom door: the side door, CR6
  (shaft) and CR7 (the well).
- **Ammo:** no ammo inside the section: S5 adds no pickups. One crate slot at the section start (data only):
  `S5_AMMO_CRATE = { x: -18, y: 0, z: 31.4, yaw: PI, section: 4 }` inside C4 by its north wall (comment "crate engine
  pending E9-crate").
- Tests (add to the list below): no `lay.pickups` entry inside x -70..-26, z 18..70; the crate slot inside the C4 box and
  `nearNav`; every `S5_ARMOURED.bypass` names an S5 route whose legs up to OBJ stay > 1.2 m (plan) from that entry's
  `at`; every key of `S5_CAMERA_FLAGS` is an S5 camera id.

## Objective, extraction, routes
- `start: { x: -18, y: 0, z: 29, yaw: -PI / 2 }` (= the C4 checkpoint). `objective: { kind: 'grab', label: 'Take the signing
  key token', x: -43, y: 0, z: 43.4, yaw: 0 }`. No connector; `extract` as above.
- Routes (`obj` = index of OBJ; `climbs` = indices of legs marked `^`):
  - Stealth "The back corridor, the anteroom side door and the garden": [-18, 29], [-24.6, 29], [-27.0, 28.0],
    [-31.0, 29.0], [-33.0, 29.0], [-36.5, 31.0], [-36.5, 33.5], [-39.0, 33.5], [-41.0, 33.4], [-43.0, 35.6],
    [-43.0, 38.0], **OBJ [-43.0, 42.2]**, [-43.0, 38.0], [-43.0, 35.6], [-43.0, 32.8], [-43.0, 31.0], [-48.0, 31.0],
    [-48.0, 33.0], [-51.0, 33.0], [-55.0, 39.5], [-57.0, 40.0], [-60.0, 42.5], [-63.0, 45.5], [-64.0, 49.0],
    [-64.0, 51.0], [-63.0, 55.0], [-56.0, 58.5], [-51.0, 57.0], [-45.0, 59.5, 0.4], [-45.0, 63.0, 0.4].
  - Loud "The front hall, the kitchen and the terrace gate": [-18, 29], [-24.6, 29], [-27.0, 28.0], [-31.0, 29.0],
    [-33.0, 29.0], [-36.5, 23.0], [-39.0, 22.0], [-41.5, 23.0], [-42.0, 30.8], [-43.0, 32.8], [-43.0, 35.6],
    [-43.0, 38.0], **OBJ [-43.0, 42.2]**, [-43.0, 38.0], [-43.0, 35.6], [-43.0, 32.8], [-42.0, 30.8], [-39.0, 22.0],
    [-36.5, 23.0], [-33.0, 29.0], [-31.0, 29.0], [-29.0, 31.0], [-29.0, 33.0], [-29.0, 43.0], [-29.0, 45.0],
    [-33.0, 49.0], [-44.0, 49.0], [-44.0, 51.3], [-45.0, 57.0], [-45.0, 59.5, 0.4], [-45.0, 63.0, 0.4].
  - High "The service stair, the roof and the rappel": [-18, 29], [-24.6, 29], [-27.0, 28.0], [-31.0, 29.0],
    [-33.0, 29.0], [-35.0, 37.2], [-35.0, 38.9], [-35.0, 38.9, 8.4], [-35.0, 37.0, 8.4], [-44.0, 40.0, 8.4],
    [-53.6, 43.2, 8.4] `^` [-54.0, 45.4], [-63.0, 45.5], [-63.0, 42.5], [-57.0, 40.0], [-55.0, 39.5], [-51.0, 33.0],
    [-48.0, 33.0], [-48.0, 31.0], [-43.0, 31.0], [-43.0, 32.8], [-43.0, 35.6], [-43.0, 38.0], **OBJ [-43.0, 42.2]**,
    then the stealth route's exit from [-43.0, 38.0].
  The routes are solved paths (after the lure or the takedown); a point that fails the clearance or the nav grid moves
  <= 0.5 m (log it); never delete a leg.

## M12 choke K4 and the co-op routes
- **K4 (unit test, as K2's):** both keyholders' cones (PERCEPTION focus and peripheral, facing south from their posts,
  the ground storey) and a shut leaf in the pg-arch door (co-op only) as nav blockers: no path from the start to the
  token's stand point (-43, 42.2); without the cones (leaf still shut), a path. Also assert: the hall door (-43, 32) and
  the side door (-40, 33.2) cells are inside a cone; the window (-46, 35.5) and the shaft door (-40, 36) are more than
  100 deg off both facings (behind them: the CR6 / CR7 approaches, A86). Lures (data, GA3): noise, the anteroom light
  (group 83, switch in the hall).
- **CR6 (pair gate, co-op only):** both players in the archive (kp-arch), keys a and b within 1 s open the cage; one climbs
  down the shaft ladder; the partner jams panel-shaft from the archive; the climber crosses the beams behind the
  keyholders. Solo bypass: the side door or the hall door. Test: no route leg passes within 1.2 m of the pg-arch door.
- **CR7 (two-person rope, co-op-quiet, A85):** the partner braces in the archive's hoist door and lowers the climber 4.2 m
  into the well; the climber vaults the open window behind the keyholders (a dual takedown). Tests: `ropeRoom(4.2, 0)` is
  `'ok'`; the well's nav cells reach nothing else (a flood from (-48, 36) stays in x -50..-46, z 34..38); a straight line
  from the well centre (-48, 0.3, 36) to #9's head (-44, 1.6, 34) is clear (`SightWorld.clear`, through the window hole)
  and shorter than `LANDING_NOISE_RADIUS.roll` (5 m): a solo's 4.2 m drop (a roll landing) is heard by #9.
- No leg-up lip in S5: assert no ledge anchor in the S5 footprint has a drop of 2.6-4.6 m (nothing a boost reaches
  that is not listed), and the low roof, the garden walls, the boathouse, the van and the chimneys are noLedge.

## Tests: `tests/campusS5.test.ts` (copy the S3 file's structure; analyticNav as S2's with `S5_FLIGHTS` ramps)
Nav: analyticNav over `[-72, 16, -24, 68]`, 5 layers, the core flights and the feature stair as ramps, ladders as links.
1. Shape: S5 id, grab, 24 guards, `dogs` 2, perStage 2, start = `CAMPUS_SECTORS[3].connector.checkpoint`, the extract box,
   no connector, peak alive <= `SECTOR.maxAlive`; `checkSectors(CAMPUS_SECTORS, undefined, lay.security)` `[]`;
   `checkStageActions([CAMPUS_SECTORS[3], S5], { nav, doorAt: doorFinder(b.anchors.doors) })` `[]`.
2. Guards: kinds per the table, `checkSectorGuards(S5)` `[]`, two dogs with handlers 4 and 6, every guard role / zone /
   reason / squad, pairs #9-#10 and #16-#17, #9 and #10 posted with `CAMPUS_POSTS`; cycles 25-45 s, stops 3-6 s (loops by
   period; the slower walker fits every leg); slots >= 7 m from the start; slots, route points, takedown spots and
   reinforce points `onNav` at their floor; switches, the board, alarms, the keypad's sides, the key switches and the
   intel board `nearNav` (`tests/campusS2.test.ts:119`).
3. Cameras: three, range 8-12, aim, reason, section 4, `validateSecurity(CAMPUS_SECURITY)` `[]`, map cameras <=
   `WIRE_CAMERAS`; cam-terrace's view excludes (64, 52)-style path points: the bearing to (-62, 53) is > `CAMERA.hFov / 2`
   off its facing (`CAMERA` from `src/config/security`); the three mounts are not inside a solid.
4. Codes and gate: the rota board reachable from the start with kp-arch blocked; the key switches 8.5-10 m apart, both
   in the archive on the nav grid; no route leg within 1.2 m of the pg-arch door.
5. Laser: las-shaft with exactly one panel (`checkPanels`); the panel's jam point clear from every near point within
   `JAMMER.range`; the beams span the shaft door's opening (z 35.4..36.6).
6. Routes: start at the start, OBJ within 1.8 of the token, end inside the extract zone; every route point on the nav;
   every non-climb leg has a nav path; the floor-change rule of "Runtime nav"; the core is the S2 shape (six flights,
   rise 2.1, slope <= 0.61, doors at three floors, bulkhead top 11.0) as `tests/campusS2.test.ts` 376-408.
7. K4, CR6, CR7 and "no leg-up lip" as above.
8. Lighting: group counts, a switch or the board for every lit group but 87, the board timed (window 20), no lamp in the
   archive, drawing room, passage, well, back corridor, service lobby or plant room, ambient 0.14 and the core 0.30.
9. Rooms do not overlap (storeys apart); sealing: a flood from the start (doors open, ladders as links) never leaves
   x -70..-26, z 18..70 plus the C4 box; every roof edge over ground outside S5 is >= 1.9 high.
10. Door separation: every keypad, pair gate, lockdown and connector door centre >= 1.2 m (plan) from every other door.
11. M8 isolation (exceptions recorded: #5-#6, #7-#8, #9-#10, #16-#17).
12. Dormant rule: only #1, #2, #3, #15; none posted, pair, handler or dog.
13. **A64** (copy `tests/campusS3.test.ts` 556-602): every walkable 0.5 m nav cell with x -70..-26, z 18..66, h <= 12,
    32 facings, `guardPoints` of every non-dormant guard (dogs count), shut leaves on every door no guard route passes
    (open: the control room door (-50, 27), the side door (-40, 33.2), the kitchen and plant doors (-29, 32), (-29, 26));
    assert samples > 8000, > 300 on L1 (h 4.2), > 300 on the roof (h 8.4), worst <= 6. If it fails, in order: (1) raise
    the gallery rails to a solid 1.3; (2) move #16-#17 1 m further west into the suite; (3) end #4's walk at (-44, 24.5);
    (4) report the point and the guards. Never silence the test.

## e2e: `campusS5Part(page)` (written, not run; pattern `campusS3Part`)
Skip with a log unless `S.length === 5 && S[4].id === 's5' && S[4].guards === 24`. Freeze the AI, advance sections 0-3
(objective done or download, teleport to each checkpoint, `sim(4.6)`), then: (a) index 4, 24 alive, live cameras sorted
`['cam-gallery', 'cam-hall', 'cam-terrace']`, las-shaft live with its panel, `g.interactables.items.length < 128`;
(b) the two alive guards nearest (-44, 34) and (-42, 34) stand within 0.5 m of them; (c) read the rota board
(`c-sintel-4-0`, `onUse(it, 'local')`), `useKeypad(4, 0)` true; (d) every non-climb leg of the three routes has a path on
`g.nav` (200000 expansions); (e) one player: `turnKey(4, 0, true)` then `turnKey(4, 0, false)` -> `'wait'`; (f) the
garden board (`board-<i>` item of the board on group 84): lamps of group 84 off, `sim(21)`, back on; (g) teleport the
stealth route to OBJ, press A, `sim(0.4)`: phase `extract`; (h) if `src/game/modes/sectorMode.ts` exposes a way to raise
the alarm (grep `raised(` / `raise`), raise to stage 2 and assert `debug().lockdown` is 1 and the garden door (-56, 40)
locked, else log skipped; (i) teleport onto the jetty (-45, 0.4, 63), `sim(1)`: `debug().phase` is `done`. Skipped
(log): CR6 with two players, the CR7 rope, the dual takedown.

## Checks (desktop CPU is busy: nothing heavier)
- `npx tsc --noEmit -p .` (timeout 600000).
- `npx vitest run tests/campusS5.test.ts tests/campusS1.test.ts tests/campusS2.test.ts tests/campusS3.test.ts
  tests/laserPanels.test.ts` (timeout 600000).
- `npx eslint` on your changed src / test files; `node --check scripts/e2e-sectorops.mjs`. No build, no e2e.

## Report: `docs/sector-redesign/checks/slice5-build.md`
Files; every value you chose that this brief left open; L-numbered assumptions; A64 worst point, guards and histogram; the
M8 table; skipped items; check results. Final message under 10 lines.

## Merge notes
The shared blocks and how the lead joins them are the table at the end of `briefs/SLICE4.md`. S5's own: the `levels`
line of `CAMPUS_SECURITY` (only S5 edits it), and no `campusLips.ts` change.
