# Slice 4 brief - S4 data hall, the first dog and the first desk (builder: Sonnet 5.5; checker: Opus)

Written by the planner (Opus) 2026-10-23 for the lead. Build exactly this; anything not covered: pick the simplest
option, log it as L1, L2 ... in your report (the lead renumbers them), never ask. Greybox only. No dressing, no refining.
Section index 3 (0-based) everywhere in data (`section: 3`, `useKeypad(3, k)`, `turnKey(3, k, ..)`).

## Before you start (the lead does this, not you)
1. "Next" 0 of STATE.md has landed on `feature/sector-redesign`: the part-6 first run (the S1 + S2 block of
   `scripts/e2e-sectorops.mjs`) reads guard and camera counts per section, so later sections need no edit there.
2. Branch `feature/sector-redesign-s4` cut from that commit, worktree `C:/NightShift/Mobile-Coop-sector-redesign-s4`,
   node_modules junction (`cmd //c mklink //J <wt>\node_modules C:\NightShift\Mobile-Coop-sector-redesign\node_modules`).
Your guard before every write: `cd /c/NightShift/Mobile-Coop-sector-redesign-s4 && test "$(git rev-parse --abbrev-ref
HEAD)" = feature/sector-redesign-s4`. Never commit, push, stash, reset or checkout.

## Read first
1. `docs/systems/agent-preamble.md`.
2. `docs/sector-redesign/SPEC.md`: "Campus-wide rules" (lines 115-180), "S4 - Data hall" (378-433), "Unavoidable posted
   guards (M12)" row K3, "Co-op routes" CR4 / CR5. This brief overrides SPEC where they differ (the A-numbers below).
3. `docs/sector-redesign/BRIEF.md` A2, A5, A21, A29, A30, A46-A51, A60-A64, A70.
4. Pattern code, in full: `src/world/maps/campusS3.ts` (helpers `lamp`, `bx`, `wall`, `doorAt`, `slab`, `rail` at
   230-316, the walkway ladders at 398-405), `src/world/maps/campusSectors.ts`, `src/world/maps/campusOps.ts`,
   `src/world/maps/campusLips.ts`, `tests/campusS3.test.ts` (whole file), `tests/campusS2.test.ts` 640-760 (K2 choke
   and dormant tests). Engine shapes (read, never edit): `src/game/sectors.ts` 36-215 and 360-560 (SectorDef,
   SectorGuard, keypads, intel, pair gates, `checkSectors`), `src/game/sectorStage.ts` 1-200 (stage actions,
   `doorFinder`, `checkStageActions`), `src/game/sectorDesks.ts` 1-60, `src/game/isolators.ts` 1-30 (BoardDef),
   `src/world/mapDef.ts` 55-80. Reports: `checks/slice3-build.md`, `checks/slice3-check.md`, `checks/e6-desk.md`.

## Files you own
- NEW `src/world/maps/campusS4.ts`: all S4 geometry, lamps, switches, the board, rooms, hide spots, nav seeds (no pickups),
  lasers, panels, `S4_COOP_LIPS`, and exported test constants (`S4_BOX`, `S4_DOORS`, `S4_GROUPS`, `S4_FLIGHT`,
  `S4_PANEL_NEAR`). Copy S3's helpers into it (private; do not import from or edit campusS3.ts).
- NEW `src/world/maps/campusS4Data.ts`: the S4 sector data, pure (no Babylon import): `S4_GUARDS`, `S4_ROUTES`,
  `S4_SECTOR: SectorDef`, `S4_CAMERAS`, `S4_ALARMS`, `S4_DESKS`, `S4_POSTS`. Imports only types from
  `../../game/*` and constants from `./campusS4` / `./campusS3` (S3_DOORS for C3).
- EDIT `src/world/maps/campusSectors.ts` (only these blocks; see "Merge notes"): import line; `CAMPUS_POSTS` gets
  `...S4_POSTS`; `CAMPUS_SECURITY.devices` gets `...S4_CAMERAS` and a new `desks: [...S4_DESKS]`; `CAMPUS_ALARMS` gets
  `...S4_ALARMS`; the `CAMPUS_SECTORS` entry `id: 's4'` (lines ~412-428, the stub) becomes `S4_SECTOR`.
- EDIT `src/world/maps/campusOps.ts` (only these blocks): import line; in `otherBuildings` delete the S4 `shell(...)`
  line (98) and nothing else (keep the C3 and C4 `connector(...)` lines); `STUB_NAV_SEEDS` delete
  `new Vector3(24, 0, 30)`; `build` adds `buildCampusS4(b);` after `buildCampusS3(b);`; the layout arrays append
  `...S4_HIDESPOTS`, `...S4_SWITCHES`, `...S4_ROOMS`, `...S4_NAV_SEEDS`; `lasers` and `laserPanels`
  become `[...S3_LASERS, ...S4_LASERS]` / `[...S3_PANELS, ...S4_PANELS]`; add `boards: [...S4_BOARDS]`.
- EDIT `src/world/maps/campusLips.ts`: import `S4_COOP_LIPS` and append it to the list.
- NEW `tests/campusS4.test.ts` (the test list below).
- EDIT (counts only) `tests/campusS2.test.ts:156` `5 + 7 + 9` -> `5 + 7 + 9 + <S4 switch count>` and
  `tests/laserPanels.test.ts:123` `8` -> `9` (update the comment: "+ S4's las-tray").
- EDIT `scripts/e2e-sectorops.mjs`: append `campusS4Part(page)` and its `if (want(6))` run after the S3 block (after
  line ~2020, before the final `console.log`). Do not touch any earlier block.
- APPEND one line to `changes/feature-sector-redesign.md`: "Sector Ops campusOps: S4 data hall greybox (first dog,
  security desk, pair gate, keypads)."
- NEW `docs/sector-redesign/checks/slice4-build.md` (your report).

Never edit: `src/ai/*`, `src/net/*`, `src/security/*`, `src/game/*`, `ctDevices.ts`, `securityRoom.ts`, `warehouse*.ts`,
`campusS1.ts`, `campusS2.ts`, `campusS3.ts`, the S1-S3 SectorDefs, `missionsScreen.ts`, `docs/level-design.md`,
`docs/templates/*`, `CHANGELOG.md`, `package.json`, BRIEF / SPEC / PLAN / STATE, anything of S5 (index 4).

## Frame and hard rules (all values in metres, yaw radians with 0 = +z, PI / 2 = +x)
- Footprint: building x -10..34, z 16..48; generator compound x 34..40, z 16..48. Floor 0; hall clear 7.0; roof slab
  7.0-7.3 (top 7.3 = the plant deck). Exterior walls 0.3 to 7.3 on the footprint lines; partitions 0.2 to 7.0 unless
  stated. Doors 1.2 wide, 2.1 high, a head over every gap (overhead). Every box 1.9-4.2 high standing on a floor is
  `noLedge`; every box is axis-aligned (yaw 0).
- Lamp groups 70-79 (S1 40-49, S2 50-58, S3 60-67, S5 takes 80-89). Light ids follow registry order (no fixed ids).
- **Runtime nav (the S3 stair leg failed e2e at 4def7d24 while analyticNav passed).** The only stair in S4 is the NOC
  flight, built with `b.stairs` exactly as S2's feature stair (`campusS2.ts:121`, proven on the runtime grid: S2's
  loud route legs passed e2e). Rules: (a) no fire-stair core in S4; (b) a route leg changes floor only from a point
  0.8 m beyond a flight's foot to a point 0.8 m beyond its head (as S2 `[-18, -12.5] -> [-18, -20.5, 4.4]`); (c) no
  route point within 0.6 m (plan) of any collide box below head height, a rail, a spine or a flight's side; (d) every
  ladder, basket and drop leg is in `climbs`; (e) a leg through a keypad door is fine (e2e opens the keypads first);
  a leg through the pair gate is not allowed (the gate is co-op only). The unit test asserts (b)-(d).
- **Doors are found by plan position only** (`Doors.nearest`, 1.2 m): every keypad, pair gate, lockdown and connector
  door centre must be >= 1.2 m (plan) from every other door anchor centre on any floor (unit test).
- **Sealed section (A84 proposed):** S4's boundary is walls, never `b.fence` (fences are climbable): the compound's
  east (x 40), south (z 16) and north (z 48) sides are 2.8 noLedge walls; the yard gate (z 16, x 36.5..38.5) is a
  locked, unbreachable 2.0 door. The deck's north, south and west edges carry a 2.0 acoustic plant screen (7.3-9.3,
  noLedge); its east edge (over the compound, inside S4) a 1.1 parapet with the ladder gap. No fall damage exists in
  the engine, so any roof edge over ground outside the section must be >= 1.9 above the roof.
- **E2 glass is not in:** the NOC window is the L10 fence fallback (fence panels, top band closed by the wall head).

## Geometry (exact boxes; walls on the listed lines, doors at the listed centres)
| Space (room id) | Box x0..x1, z0..z1 (floor) | Height | Doors (centre) and notes |
| --- | --- | --- | --- |
| Dock `s4-dock` | 14..34, 16..22 | 7.0 | C3 far door (24, 16) S wall (keep: S1 test asserts it); W door (14, 17) to SC; E door (34, 19) to the compound; roller door dressing x 28..32 on the S wall (static, no gap). Two crate stacks 1.0 high at (18, 20.8) and (20.5, 20.8) (1.2 x 0.8). |
| Service corridor `s4-sc` | -4..14, 16..18 | 7.0 (ceiling slab 3.0-3.2, overhead) | E door (14, 17); W door **kp-batt** (-4, 17); N door (4, 18) to the lobby. Dark (no lamp). |
| Hall lobby `s4-lobby` | -4..14, 18..22 | 3.2 (slab 3.0-3.2 overhead) | S door (4, 18). Mantrap desk (0.75) x 5.2..6.8, z 20.6..21.4. |
| Mantrap `s4-mantrap` | 9..12, 19..22 | walls 0.2 to 3.0, lid 3.0-3.1 | Outer door W (9, 20.5); inner door N (10.5, 22) into the hall (in the hall's S wall). |
| Battery room `s4-batt` | -10..-4, 16..27.8 | 7.0 | E door kp-batt (-4, 17); E door (-4, 25) to the hall; N door (-7, 27.8) to CC. Battery racks 1.2 high: x -9.4..-8.4, z 18.0..26.5 and x -5.6..-4.6, z 18.0..23.5 (clear of both east doors). Dark (lights off, A6). |
| Colonnade corridor `s4-cc` | -10..-4, 27.8..30.2 | 7.0 | W door = **C4 near door (-10, 29)** (keep, S1 test asserts it); E door (-4, 29) to the hall; S door (-7, 27.8); N door (-7, 30.2) to UPS. |
| UPS room `s4-ups` | -10..-4, 30.2..48 | 7.0 | S door (-7, 30.2); E door (-4, 38) to the hall. UPS cabinets 2.0 high (noLedge) x -9.6..-8.6, z 32..46. |
| Data hall `s4-hall` | -4..34, 22..42 | 7.0 (its four walls 0.3) | S wall (z 22) door (10.5, 22); W wall (x -4) doors (-4, 25), (-4, 29), (-4, 38); E wall (x 34) door (34, 30) to the compound; N wall (z 42) doors (2, 42) security room, (20, 42) north corridor; basket penetration in the N wall x 31.55..32.65, y 4.4..6.4 (no door). |
| Pods P1-P5 (in the hall) | x0 = -1.0, 4.6, 10.2, 22.2, 27.8; each x0..x0+3.6, z 24..32 | 3.0 | Two rack rows (x0..x0+1.2 and x0+2.4..x0+3.6, 0..2.2, noLedge), containment panels 2.2..2.9 on the outer faces, roof slab 2.9-3.0 over the whole pod (`overhead`, noLedge). Hot aisle x0+1.2..x0+2.4 with end doors at (x0+1.8, 24) and (x0+1.8, 32). Hot-aisle centres: 0.8, 6.4, 12.0, 24.0, 29.6. Cold aisles C1 x 2.6..4.6, C2 x 8.2..10.2, C3 x 25.8..27.8; centre aisle CA x 13.8..22.2. |
| Cage `s4-cage` | 14..22, 34..40 | walls 0.1 thick, 0..3.0, solid, noLedge, open top (A83) | Front gate S (18, 34) plain door; **rear gate pg-cage** N (18, 40). Terminal desk (0.75) x 17.4..18.6, z 38.2..38.8. |
| Build-out area (part of hall) | -4..13.8, 33..42 | - | Spare-rack row 2.2 (noLedge) x -1.0..4.0, z 37.0..38.2. Dark (no racks fitted: lights off). |
| NE plant area (part of hall) | 22.2..34, 33..42 | - | CRAC units 2.0 (noLedge) x 24..32, z 37.0..38.2. |
| Security room `s4-sec` | -4..8, 42..48 | G 0..3.4 (NOC slab 3.4-3.6) | S door (2, 42); E door (8, 45) to NC. Monitors desk 0.75 x -3.9..-3.3, z 43.2..46.0. NOC flight `S4_FLIGHT = { cx: 2.0, cz: 47.2, w: 1.2, len: 6.4, rise: 3.6, yaw: PI / 2, y0: 0, steps: 20 }` (x -1.2 at 0 to x 5.2 at 3.6). |
| NOC `s4-noc` | -4..8, 42..48 | 3.6..7.0 | Slab top 3.6 with a hole x -1.2..5.2, z 46.6..47.8 (the flight); 1.1 rails (noLedge) on the hole's S edge and W end. S wall on this floor: solid 3.6..4.6, fence panels 4.6..6.6 from (-3.5, 42) to (7.5, 42) (L10), wall head 6.6..7.0. |
| North corridor `s4-nc` | 8..30.6, 42..48 | 7.0 | S door (20, 42); W door (8, 45); E door **kp-deck** (30.6, 45). Dark. |
| Riser `s4-riser` | 30.6..34, 42..48 | 7.0 | W door kp-deck. Basket landing slab x 30.7..33.85, z 42.15..44.6, 4.0-4.4 (noLedge) with a 1.1 rail on its N edge except x 31.7..32.7. Ladder R1 `b.ladder(32.2, 45.05, 0, 4.4, PI)`. Roof hatch hole x 31.6..32.8, z 42.6..43.8 (no lid), ladder R2 `b.ladder(32.2, 43.35, 4.4, 7.3, 0)` (base on the landing); deck rails 1.1 on the hole's W, S, E sides. Dark. |
| Compound `s4-yard` | 34..40, 16..48 | walls 2.8 (A84) | Generator 2.6 (noLedge) x 36..39, z 34..40; fuel tanks 1.6 x 36..39, z 26..30. Plant ladder `b.ladder(34.6, 23, 0, 7.3, -PI / 2)` on the building's E wall; deck parapet gap x 34, z 22.4..23.6. Yard gate locked unbreachable (z 16, x 36.5..38.5, width 2.0). |
| Plant deck `s4-deck` (minY 7.3) | -10..34, 16..48 | top 7.3 | Chillers 2.0 (noLedge) x 4..8, 12..16, 20..24, 26..30, all z 31..33. Screens / parapet per "Sealed section". |

Cable baskets (all top 4.4, boxes 4.0-4.4: the 0.4 thickness is S2's L1 ledge-cutter lesson): B1 x 3.1..4.1, z 24..40.8
in three boxes: z 24..32.4 (noLedge), **z 32.4..35.6 (ledges kept: CR4)**, z 35.6..40.8 (noLedge); B2 x 8.7..9.7, z 24..40.8;
B3 x 26.3..27.3, z 24..40.8; B-N x 3.1..32.6, z 40.8..41.8; B-cage x 17.5..18.5, z 34.4..40.8; the penetration stub
x 31.6..32.6, z 41.8..42.15. All noLedge except the CR4 box. Supports are visual only (`collide` false).

`S4_COOP_LIPS` (into `campusLips.ts`): `{ id: 'CR4', section: 3, lip: { x: 4.1, z0: 32.4, z1: 35.6, y: 4.4, n: { x: 1,
z: 0 } }, top: { x0: 3.1, x1: 4.1, z0: 32.4, z1: 35.6, top: 4.4 }, boost: { floor: 0, x: 4.8, z: 34.0 }, solo: 'the hot
aisles to the cage front (keyholder), or the riser ladder to the basket landing (high route)' }` and `CR4-west` (lip x 3.1,
n -x, boost (2.4, 34.0), solo 'as CR4'). Nothing solo-standable >= 1.2 within 4 m of either (the spare-rack row and the pods
are noLedge over the mantle; keep crates out of the hall).

## Lighting (groups, positions; `makeCone` down-lights as S3)
| Group | Lamps (x, y, z), r, i | Switch / board | Dark by reason |
| --- | --- | --- | --- |
| 70 `s4-cold-1` | C1 (3.6, 3.6, 25), (3.6, 3.6, 29); C2 (9.2, 3.6, 25), (9.2, 3.6, 29); W aisle (-2.5, 3.6, 26), (-2.5, 3.6, 34); r 4.5, i 0.8 | **Hall panel** in SC: switches 70 / 71 / 72 at (-1.4 / -1.0 / -0.6, 0, 17.85), yaw PI (lure #4 or #20) | the CR4 boost points (4.8, 34) and (2.4, 34) stay under the shadow line |
| 71 `s4-cold-2` | CA (18, 3.6, 25), (18, 3.6, 29.5), (18, 3.6, 33.0); cage (18, 2.8, 37); r 5 | the panel | - |
| 72 `s4-cold-3` | C3 (26.8, 3.6, 25), (26.8, 3.6, 29); E aisle (32.7, 3.6, 26), (32.7, 3.6, 34); r 4.5 | the panel | - |
| 73 `s4-lobby` | (5, 2.8, 20), r 5 | (4.8, 0, 18.15) yaw 0 | - |
| 74 `s4-dock` | floods (20, 6.0, 19), (29, 6.0, 19), r 8, shootable | (14.15, 0, 18.8) yaw PI / 2 | - |
| 75 `s4-yard` | floods on the E wall (34.3, 6.0, 24), (34.3, 6.0, 40), r 9 | **board** (timed isolator, window 20) in the dock (33.85, 0, 20.8), yaw -PI / 2 (A90) | compound N end beyond r 9 |
| 76 `s4-noc` | (0, 6.4, 45), (5, 6.4, 45) | (6.0, 3.6, 47.85) yaw PI | - |
| 77 `s4-sec` | (0, 3.1, 44.5), (5, 3.1, 44.5) | (2.8, 0, 42.15) yaw 0 | - |
| 78 `s4-ups` | UPS (-7, 3.4, 34), (-7, 3.4, 41); CC (-7, 2.8, 29) | (-4.15, 0, 37.0) yaw -PI / 2 (the K3 "colonnade lights" lure) | - |
| 79 `s4-deck` | chiller task lights (6 / 14 / 22 / 28, 8.8, 33.6), r 3.5 | none (shoot / jam) | the deck between them |
Unlit: battery room, SC, NC, riser, hot aisles, baskets (above the cones), build-out area. `b.ambientZone(-10, 40, 16,
48, 0.14, -1, 9.5)`. C3 and C4 keep their 0.30.

## Guards (20; `S4_GUARDS`, index = number - 1; plain routes close back to point 0)
Speeds for the cycle arithmetic: plain route grunt 0.99, officer 0.935, enforcer 0.88; `loop` grunt 0.9, dog 1.1.
| # | Kind | Slot (x, z, y) yaw | Route / waits / faces / loop | Cycle | Tags (role, zone, squad, extra) | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | grunt | (37.5, 27) 0 | [[37.5, 27], [37.5, 44]], faces [0, PI], loop { period: 44, leave: [3, 25], t0: 0 } | 44 | handler, yard, 0 | Diesel was stolen from the tanks twice |
| 2 | dog | (38.5, 27) 0 | [[38.5, 27], [38.5, 44]], same loop | 44 | dog, yard, 0, `handler: 0` | At heel (A87) |
| 3 | officer | (37, 17.6) PI | post | - | gate, yard, 0 | Lets the 03:00 courier van in at the yard gate |
| 4 | officer | (6.0, 20.2) PI / 2 | post | - | mantrap, lobby, 1 | Admits one at a time; answers the hall panel |
| 5 | officer | (-2.5, 44.6) -PI / 2 | post | - | operator, sec, 2, `pair: 5` | Watches the hall cameras (desk operator) |
| 6 | enforcer | (-1.2, 44.0) -PI / 2 + 0.6 | post | - | supervisor, sec, 2, `pair: 4` | Site supervisor at the monitors |
| 7 | grunt | (3.6, 23) 0 | [[3.6, 23], [3.6, 33], [9.2, 33], [9.2, 23]], waits [3, 0.5, 3, 0.5], faces [0, PI / 2, PI, -PI / 2] | 38.5 | patrol, cold-w, 3 | Floor round, west aisles |
| 8 | grunt | (32.7, 33) PI | [[32.7, 33], [32.7, 23], [26.8, 23], [26.8, 33]], waits [3, 0.5, 3, 0.5] | 39.1 | patrol, cold-e, 3 | Floor round, east aisles (opposite phase) |
| 9 | officer | (18, 33.0) PI | post (the front gate 1 m behind) | - | keyholder, cage, 3 | Holds one of the two cage keys; under cam-cage |
| 10 | grunt | (0.8, 24.7) 0 | [[0.8, 24.7], [0.8, 33.0]], waits [6, 6] | 28.8 | checker, pod-1, 3, dormant | Reads the pod thermometers |
| 11 | grunt | (24.0, 33.0) PI | [[24.0, 33.0], [24.0, 24.7]], waits [6, 6] | 28.8 | checker, pod-4, 3, dormant | Reads the pod thermometers |
| 12 | grunt | (-7, 37) PI | [[-7, 37], [-7, 20]], waits [3, 3] (through (-7, 30.2) and (-7, 27.8)) | 40.3 | checker, batt, 4 | Reads cell voltages with his torch |
| 13 | grunt | (12, 36, y 7.3) PI / 2 | [[12, 36], [30, 36]], waits [3, 3] | 42.4 | patrol, deck, 5 | A chiller alarm earlier tonight; covers the riser hatch |
| 14 | officer | (1.0, 43.0, y 3.6) PI | post | - | noc, noc, 2, `pair: 14` | Watches the hall from the NOC window |
| 15 | officer | (3.0, 43.0, y 3.6) PI | post | - | noc, noc, 2, `pair: 13` | Watches the screens and the hall |
| 16 | officer | (11, 45.8) PI / 2 | [[11, 45.8], [28, 45.8]], waits [3, 3] | 42.4 | tour, nc, 4, dormant | Clocking round: the security room side door and the riser door (A94) |
| 17 | grunt | (31.5, 18.6) -PI / 2 | [[31.5, 18.6], [16.5, 20.4]], loop { period: 42, leave: [4, 25], t0: 0 } | 42 | dock, dock, 1 | Unloads the 03:00 drives (staggered, A89) |
| 18 | grunt | (16.5, 18.6) PI / 2 | [[16.5, 18.6], [31.5, 20.4]], same loop | 42 | dock, dock, 1 | Unloads the drives; alone at the shelf end each trip |
| 19 | grunt | (-8.5, 29) PI / 2 | post (C4 door 1.5 m behind) | - | posted, c4, 4 (**K3**) | The Old House is closed tonight: nobody goes down the colonnade |
| 20 | enforcer | (-2.5, 23.0) 0 | [[-2.5, 23.0], [-2.5, 39.5]], waits [3, 3] | 43.5 | supervisor, hall-w, 3 | Mobile supervisor: visits the battery, colonnade and UPS doors |
Takedown spots: give each a spot 0.4-0.6 m behind its post or at its route's isolated end; the M8 test decides (record).
`S4_POSTS = { 's4#19': { leash: 5, guards: 'c4-gate' } }`. Dormant only on #10, #11, #16 (allowed: none is posted, a
pair member, a handler or a dog). Squads as listed. `dogs: 1`, `perStage: 2`, `reinforce: [[28, 20.5], [-7, 40]]`.

## Security register (section 3)
| Id | Data | Protects / why there | Weak side |
| --- | --- | --- | --- |
| cam-mantrap | `{ level: 'ground', at: [11.8, 21.8], y: 2.6, facing: 225, aim: 3, range: 8 }` | The entrance interlock: an admission record | Inside the mantrap only |
| cam-cage | `{ at: [22.15, 33.85], y: 2.8, facing: 235, aim: 5, range: 9 }` | The cage front gate and the centre aisle (high-value servers) | The rear gate is behind it |
| cam-dock4 | `{ at: [25.5, 21.8], y: 3.2, facing: 150, aim: 6, range: 10 }` | The goods-in roller door and the van bay | The C3 door (24, 16) is outside its 70 deg view (test) |
| desk-sec4 | `S4_DESKS = [{ id: 'desk-sec4', section: 3, at: [-2.8, 44.6], yaw: -PI / 2, cameras: ['cam-mantrap', 'cam-cage', 'cam-dock4'], operator: 4 }]` | The console that loops / switches off the three cameras (E6) | Usable once #5 is down or lured > 2.5 m |
| las-tray | `{ id: 'las-tray', x1: 17.5, z1: 40.4, x2: 18.5, z2: 40.4, ys: [0.3, 0.9], floorY: 4.4, label: 'Cage tray beams', section: 3 }` | The cage from above (overhead intrusion detection) | Panel `{ id: 'panel-tray', lasers: ['las-tray'], x: 23.5, y: 5.8, z: 41.85, yaw: PI, section: 3, label: 'Cage tray beams power' }` on the hall's N wall above B-N; `S4_PANEL_NEAR['panel-tray'] = [[21.0, 4.4, 41.3], [25.0, 4.4, 41.3], [28.0, 4.4, 41.3]]` |
| kp-batt, kp-deck | `keypads: [{ at: [-4, 17], code: 's4-codes' }, { at: [30.6, 45], code: 's4-codes' }]` | Battery room (hydrogen safety), plant access | Code from the dock board (A81) |
| dock board | `intel: [{ kind: 'board', grants: 's4-codes', line: 'Dock board: plant doors 2208, battery room the same.', at: [16.0, 1.5, 21.85], yaw: PI }]` | - | Read at the dock pair's shelf end (timing) |
| pg-cage | `pairGates: [{ door: [18, 40], a: { at: [13.85, 39.6], yaw: -PI / 2 }, b: { at: [21.8, 40.15], yaw: 0 } }]` (window default 1.0) | Two-person rule on the rear gate (CR5) | Solo: the front gate after #9 |
| alarms | `S4_ALARMS`: `{ at: [-3.85, 46.8], yaw: PI / 2, section: 3 }` (alarm-sec4), `{ at: [5.0, 21.85], yaw: PI, section: 3 }` (alarm-mt), `{ at: [14.15, 20.8], yaw: PI / 2, section: 3 }` (alarm-dk) | Guard posts | - |
| stage actions | `[{ stage: 1, lightsFull: [70, 71, 72] }, { stage: 2, releaseDogs: true, responseRoute: [[-7, 42], [-7, 38], [-2.5, 36], [-2.5, 24]], lockDoors: [[14, 17]] }, { stage: 3, lockDoors: [[-4, 25]] }]` | Lights to full; the dog off the heel and the UPS response; the dock and battery doors lock | `checkStageActions` softlock check passes (the compound door (34, 30) and CC stay open) |

## Stealth over shooting (Michael 2026-10-23 ~10:10 and ~10:20)
Engine fact (grep, 2026-10-23): no bulletproof, thermal or armoured flag exists in `src/security`, `src/game/ctDevices.ts`,
`src/world`; every camera already ignores lamps (IR, `src/security/securitySystem.ts:47-49`). So the data below goes in
guarded side tables in `campusS4Data.ts` (like `CAMPUS_POSTS`), never on the engine types; the engine items at the end of
this brief move them on.
- **Bulletproof cameras:** `S4_CAMERA_FLAGS: Record<string, { bulletproof?: true; thermal?: true }> = { 'cam-mantrap':
  { bulletproof: true }, 'cam-cage': { bulletproof: true }, 'cam-dock4': { bulletproof: true } }` (comment: "moves onto
  CameraDevice with E8"). Ways to beat them: the jammer, the desk (loop / off), the routes round. S1-S2 stay shootable;
  S3 cam-view becomes bulletproof and cam-dock stays shootable (E8 sets S3, not you).
- **Armoured routes:** `S4_ARMOURED: { id: string; kind: 'door' | 'glass'; at: readonly [number, number]; y?: number;
  bypass: string }[] = [{ id: 'arm-mantrap', kind: 'door', at: [10.5, 22], bypass: 'The service corridor, the battery room
  and the hot aisles' }, { id: 'arm-noc', kind: 'glass', at: [2, 42], y: 3.6, bypass: 'The service corridor, the battery
  room and the hot aisles' }]`; build the mantrap's two doors with `breachable: false` now. `bypass` is a route name of
  S4 (the keypad hack and the hot aisles; the riser and basket hang-down is the high one).
- **Ammo:** no ammo inside the section: S4 adds no pickups. One weapons-crate slot at the section start (data only):
  `S4_AMMO_CRATE = { x: 25.4, y: 0, z: 9.0, yaw: -PI / 2, section: 3 }` inside C3 by its east wall (comment: "crate engine
  pending E9-crate: once per player per section, tops up to the starting loadout, never above, restart resets").
- Tests (add to the list below): no `lay.pickups` entry inside x -10..40, z 16..48; the crate slot is inside the C3 box
  and `nearNav`; every `S4_ARMOURED.bypass` names an S4 route whose legs up to OBJ stay > 1.2 m (plan) from that entry's
  `at`; every key of `S4_CAMERA_FLAGS` is an S4 camera id.

## Engine items (Opus, not the builder)
| Id | Item | Files | Acceptance |
| --- | --- | --- | --- |
| E8 | `CameraDevice.bulletproof?` (a shot ricochets: no destroy, a ricochet spark / sound) and `thermal?` (behaves as today's IR; shown with its own LED colour) | `src/security/data.ts`, the camera shot path in `src/game/ctDevices.ts`, `securityView.ts`; then the flags tables of S3 (cam-view), S4, S5 move onto the devices | Unit: a shot on a bulletproof camera leaves it live; a thermal camera's meter is unchanged when every lamp is cut; co-op: no wire change (the host never destroys it); e2e: shooting cam-cage leaves it live |
| E9-crate | Section-start ammo crate: `SectorDef.crate?: { x, y, z, yaw }`, one use per player per section, tops up to the starting loadout (never above), a restart resets it; the S4 / S5 `*_AMMO_CRATE` move onto it | `src/game/sectors.ts`, `src/game/modes/sectorMode.ts` (item, per-player used set), the weapons loadout API | Unit: use twice -> second refused; never above the start loadout; restart resets; co-op client use goes through the host |
| E10 | Armoured pieces: `BoxPiece.armoured?` (with E2 glass) and door `bulletproof?`: bullets stop, a breach is refused; `*_ARMOURED` move onto them | `src/world/levelBuilder.ts`, `src/world/anchors.ts`, the bullet ray path in `src/weapons/`; needs E2 for glass | Unit: a ray through an armoured piece stops; a check that every armoured piece names a bypass route of its section |

## Objective, connector, routes
- `objective: { kind: 'download', label: 'Download the build and signing logs', x: 18, y: 0, z: 38.3, yaw: PI }`
  (player stands at (18, 37.3); stays within 4 m for 10 s).
- `start: { x: 24, y: 0, z: 8, yaw: 0 }` (= S3's C3 checkpoint). `connector: { label: 'Along the colonnade to the Old
  House', box: [-26, 26, -10, 32], nearAt: [-10, 29], farAt: [-26, 29], checkpoint: { x: -18, y: 0, z: 29, yaw: -PI /
  2 } }` (the stub values: S5 starts there; do not change them).
- Routes (`obj` = index of the point marked OBJ; `climbs` = indices i of legs pts[i] -> pts[i + 1] marked `^`):
  - Stealth "The service corridor, the battery room and the hot aisles": [24, 8], [24, 14.8], [24, 17.6], [16, 17.2],
    [12.8, 17.0], [-2.6, 17.0], [-5.4, 17.0], [-7.0, 22.0], [-5.4, 25.0], [-2.6, 25.0], [-2.5, 23.0], [6.4, 23.0],
    [6.4, 24.7], [6.4, 31.3], [6.4, 33.0], [12.6, 33.2], [16.6, 33.2], [18.0, 34.8], **OBJ [18.0, 37.3]**, [18.0, 34.8],
    [16.6, 33.2], [12.6, 35.5], [5.0, 36.0], [-2.6, 38.0], [-5.4, 38.0], [-7.0, 33.0], [-7.0, 30.9], [-7.6, 29.5],
    [-9.4, 29.0], [-11.0, 29.0], [-18, 29]. The last legs pass #19 (K3): the route is the solved path after the lure.
  - Loud "The lobby, the mantrap and the centre aisle": [24, 8], [24, 14.8], [24, 17.6], [16, 17.2], [12.8, 17.0],
    [4.0, 17.0], [4.0, 18.9], [7.6, 20.0], [10.2, 20.5], [10.5, 23.0], [16.6, 23.0], [18.0, 25.0],
    [16.6, 32.6], [18.0, 34.8], **OBJ [18.0, 37.3]**, then R1's exit from [18.0, 34.8].
  - High "The compound, the plant deck and the cable baskets": [24, 8], [24, 14.8], [24, 17.6], [31.5, 19.0],
    [35.2, 19.0], [35.2, 23.0] `^` [33.1, 23.0, 7.3], [32.6, 30.0, 7.3], [32.6, 40.0, 7.3], [32.2, 44.4, 7.3] `^`
    [32.2, 43.0, 4.4] `^` [32.1, 41.3, 4.4] `^` [21.0, 41.3, 4.4] `^` [18.0, 41.3, 4.4] `^` [18.0, 39.6, 4.4] `^`
    [18.0, 36.6, 4.4] `^` [19.3, 36.6], **OBJ [18.0, 37.3]**, then R1's exit from [18.0, 34.8].
  If a point fails the rule (c) clearance or the nav grid, move it <= 0.5 m and log it; never delete a leg.

## M12 choke K3 (unit test, as `tests/campusS2.test.ts` 640-696)
#19's cone (PERCEPTION focus and peripheral, facing east from (-8.5, 29), the ground storey) as a nav blocker: no path
from the S4 start (24, 8) to the cell 0.6 m east of the C4 near door; without it, a path. The C4 door cell is not in the
cone (the pocket behind him); the leash edge (5) is >= 1 m beyond that cell; the cells of the doors (-7, 30.2), (-7, 27.8)
and (-4, 29) are inside the cone. Lures (data only, guard-ai GA3): noise in the hall west aisle, a thrown item, cutting
group 78 at its switch (-4.15, 37.0).

## Tests: `tests/campusS4.test.ts` (copy the S3 file's structure, analyticNav and helpers)
Nav: the S3 `analyticNav` over `[-12, 14, 42, 50]` with 5 layers, `S4_FLIGHT` as the one ramp, the ladders as links.
1. Shape: S4 id, download, 20 guards, `dogs` 1, perStage 2, start = `CAMPUS_SECTORS[2].connector.checkpoint`, C4 as
   above, `guards + alarmMax * perStage <= SECTOR.maxAlive`; `checkSectors(CAMPUS_SECTORS, undefined, lay.security)`
   is `[]` (the desk check: layout.security as the 3rd argument); `checkStageActions([CAMPUS_SECTORS[2], S4], { nav,
   doorAt: doorFinder(b.anchors.doors) })` is `[]`.
2. Guards: kinds as the table, `checkSectorGuards(S4)` `[]`, one dog with `handler: 0`, every guard role / zone / reason
   / squad, pairs #5-#6 and #14-#15, #19 posted with `CAMPUS_POSTS['s4#19']`; cycles 25-45 s and stops 3-6 s (the S3
   arithmetic; loops by period, the slower walker fits every leg: dog and handler, the dock pair); slots >= 7 m (plan)
   from the start; every slot, route point, takedown spot and reinforce point on the nav grid at its floor (`onNav`);
   every switch, board, alarm, keypad side, key switch, the intel board and the desk console within 1.1 m of a nav cell
   on its floor (`nearNav`, `tests/campusS2.test.ts:119`).
3. Cameras: three, range 8-12, aim, reason, section 3; `validateSecurity(CAMPUS_SECURITY)` `[]`; `liveCameraPeak` <= 12;
   map cameras <= `WIRE_CAMERAS`; the C3 door (24, 16.3) bearing from cam-dock4 is > `CAMERA.hFov / 2` + 5 deg off its
   facing (`CAMERA` from `src/config/security`, not the player camera); the desk: operator index 4 is #5, #5 within `DESK_POST_RADIUS` of `at`, #5's slot >= 7 m from the S4 start.
4. Codes and gates: the board is reachable from the start with both keypad doors blocked; no route leg passes within
   1.2 m of the pg-cage door; the key switches 7.5-9 m apart, both outside the cage on the nav grid.
5. Laser: las-tray with exactly one panel (`checkPanels`), the panel's jam point clear from every near point within
   `JAMMER.range`; the beams span B-cage's full width (x 17.5..18.5).
6. Routes: start at the start, OBJ within 1.8 of the objective, end inside the C4 zone; every route point on the nav;
   every leg not in `climbs` has a nav path; rule (b)-(d) of "Runtime nav" (a leg whose ends differ in height by > 0.5
   is either a `climbs` leg or runs from 0.8 m beyond the NOC flight's foot to 0.8 m beyond its head).
7. CR4 and CR4-west: `soloJumpThreats` + `soloTopLandingThreats` (0.5 m), headroom from 4.5 to 6.2 over each lip, rule 2
   (4 m, the S3 filter: `noLedge && top > MANTLE` excluded), rule 3, rule 6 over the S4 footprint, ledges only on the CR4
   box among the baskets, both boost points under `LIGHT.shadow` (as `tests/campusS2.test.ts` 514), in
   `CAMPUS_COOP_LIPS`; rule 7: the basket landing has a nav path to B1 (solo reaches the baskets from the riser).
8. Lighting: group counts as the table, every lit group but 79 has a switch or the board, the board is timed (window
   20), no lamp in the battery room, SC, NC, riser, hot aisles or the build-out area, ambient 0.14.
9. Rooms do not overlap (storeys apart); sealing: a flood from the start on the nav (doors open, ladders as links)
   never leaves x -10..40, z 16..48 plus the C3 and C4 boxes; every deck edge over outside ground is >= 1.9 high.
10. Door separation: every keypad, pair gate, lockdown and connector door centre >= 1.2 m (plan) from every other door.
11. M8 isolation (exceptions recorded, not silenced: #1-#2, #5-#6, #14-#15).
12. K3 as above. Dormant rule: only #10, #11, #16; none posted, pair, handler or dog.
13. **A64** (copy `tests/campusS3.test.ts` 556-602): every walkable 0.5 m nav cell with x -10..40, z 16..48, h <= 9,
    32 facings, `guardPoints` of every non-dormant guard (the dog counts), sight world = pieces near the footprint plus a
    shut leaf for every door no guard route passes (the pod end doors of P1 and P4 and the doors (-7, 30.2) / (-7, 27.8)
    stay open); assert samples > 4000, > 50 on the baskets (h 4.4), > 200 on the deck (h 7.3), worst <= 6.
    If it fails, fix in this order and re-run, logging each: (1) raise the NOC window's solid spandrel to 5.0; (2)
    lengthen the spare-rack row east to x 8.0 and the CRAC row west to x 23; (3) end #20's route at z 36.5; (4) a 2.2
    noLedge rack row x 14.5..21.5, z 32.4..33.4 is NOT allowed (it blocks the front gate) - instead report the point
    and the guards. Never silence the test.

## e2e: `campusS4Part(page)` (written, not run; pattern `campusS3Part`, lines 1872-2015)
Skip with a log unless `S.length >= 4 && S[3].id === 's4' && S[3].guards === 20`. Freeze the AI, advance sections 0-2
(`objectiveDone` / download, teleport to each checkpoint, `sim(4.6)`), then:
(a) index 3, 20 alive, live cameras sorted `['cam-cage', 'cam-dock4', 'cam-mantrap']`, las-tray live with its panel,
`g.interactables.items.length < 128` (E6 polish 1); (b) read the dock board (`c-sintel-3-0` item `onUse(it, 'local')`),
`useKeypad(3, 0)` and `useKeypad(3, 1)` true; (c) every non-climb leg of the three routes has a path on `g.nav`
(200000 expansions); (d) `useDesk(0)` refused while #5 stands (the guard nearest (-2.5, 44.6)); knock him out (the
`knockOut` call at line 100); `useDesk(0)` returns 1 and `debug().desks[0]` is 1; (e) one player: `turnKey(3, 0, true)`
then `turnKey(3, 0, false)` -> `'wait'`, `debug().pairGates[3][0]` false; (f) teleport the stealth route to OBJ, press A,
`sim(10.8)`: phase `connector`, C4's near door unlocked; (g) AI on, player hidden in the riser: use the group-70 switch;
within 15 s some alive guard is >= 4 m closer to the panel and the group-70 lamps are off; (h) the exit legs, C4's
checkpoint, `sim(1.3)` cycling, `sim(3.2)`: index 4 `s5` loads. Probe run (the S1 / S2 `probe` helper, top gear, take-off
0.3 / 0.15 / 0.02): running jumps from the floor at (5.6, 34.0) toward -x and at (1.6, 34.0) toward +x, and a wall jump off
P2's west face toward B1: never stand on or hold a basket. Skipped (log): co-op leg-up, jam-and-pass, the pair gate
opening for two.

## Checks (desktop CPU is busy: nothing heavier)
- `npx tsc --noEmit -p .` (timeout 600000).
- `npx vitest run tests/campusS4.test.ts tests/campusS1.test.ts tests/campusS2.test.ts tests/campusS3.test.ts
  tests/laserPanels.test.ts` (timeout 600000) - your file plus the shared files you touched or that read the map.
- `npx eslint` on your changed src / test files; `node --check scripts/e2e-sectorops.mjs`. No build, no e2e.

## Report: `docs/sector-redesign/checks/slice4-build.md`
Files; every value you chose that this brief left open (takedown spots, any moved point); L-numbered assumptions; A64
worst point, guards and histogram; the M8 table; skipped items; check results. Final message under 10 lines.

## Merge notes (S4 and S5 build in parallel; the lead joins them)
| File | S4 touches | S5 touches | Join |
| --- | --- | --- | --- |
| campusSectors.ts | import line; `CAMPUS_POSTS` (+S4_POSTS); `CAMPUS_SECURITY.devices` (+S4_CAMERAS), new `desks`; `CAMPUS_ALARMS` (+S4_ALARMS); the `'s4'` entry -> `S4_SECTOR` | import; `CAMPUS_POSTS` (+S5_POSTS); `levels` (+'s5-l1'); devices (+S5_CAMERAS); `CAMPUS_ALARMS` (+S5_ALARMS); the `'s5'` entry -> `S5_SECTOR` | Keep both spreads in every list (S4 before S5); the two SectorDef entries are adjacent lines: take `S4_SECTOR,` then `S5_SECTOR,` |
| campusOps.ts | import; delete shell line 98; delete seed (24, 0, 30); `buildCampusS4(b)`; arrays + lasers / panels + `boards` | import; delete shell line 100; delete seed (-46, 0, 33); `buildCampusS5(b)`; arrays + lasers / panels + `boards` | Both shell lines go (keep the comment and both `connector(...)` lines); seeds keep (24, 0, -14), (24, 0, 8), (-18, 0, 29); build order S1, S2, others, S3, S4, S5; every array `S1..S3, S4, S5`; `boards: [...S4_BOARDS, ...S5_BOARDS]` |
| campusLips.ts | + S4_COOP_LIPS | none (S5 has no leg-up lip) | - |
| tests/campusS2.test.ts:156 | + S4 switch count | + S5 switch count | Sum both |
| tests/laserPanels.test.ts:123 | 9 | 9 | 10 |
| scripts/e2e-sectorops.mjs | appended `campusS4Part` block | appended `campusS5Part` block | Keep both, S4 first |
| changes/feature-sector-redesign.md | one line | one line | Keep both |
