# Scale sheet - Night Shift

Measured from the code (2026-10-10; speeds, camera and the co-op kit 2026-10-25). "Derived" = worked out from code numbers, not run in a test. Never change the player to fit a map. This sheet owns every size, speed, time and target `docs/level-design.md` names by its metrics key.

## 1. What the game has

| Thing | Value | Source |
| --- | --- | --- |
| Player capsule | 1.75 m stand, 1.15 m crouch, radius 0.30 | `config/movement.ts` |
| Eye height | 1.60 stand, 1.05 crouch | `playerController.ts:216` |
| Camera | boom 1.8 m in tight spaces, 2.8 m in open ones (crouched 2.2), aim 0.4; shoulder offset 0.15 (aim 0.30); pivot 1.68 m (the head top); wall padding 0.16, min boom 0.28; FOV 86 | `config/camera.ts` |
| Walk speeds (m/s) | stand 0.75 / 1.4 / 2.1 / 3.0 / 4.0; crouch 0.85 / 1.3 / 1.7 / 2.15 / 2.6 (creep, sneak, walk, jog, run; the stick sets the speed between them; no sprint) | `GEARS`, `config/movement.ts:159-160` |
| Silent speeds | footsteps are silent on every floor up to 1.9 m/s crouched (creep, sneak, walk) and 1.65 m/s standing (creep, sneak); the floor only scales audible steps | `NOISE_QUIET`, `config/movement.ts:273-276` |
| Guard walk speed | 0.75 - 0.9 (officer 0.85, grunt 0.9, heavy 0.75, sniper 0.85) | `enemies.json` |
| Step limit | player 0.42 m, nav 0.45 m | `MOVEMENT.maxStep`, `navBuild.ts:72` |
| Stairs and ramps | collide as a smooth ramp; nav accepts a surface if its normal.y > 0.65 (slope up to about 49 deg) | `levelBuilder.ts:191`, `navBuild.ts:88` |
| Nav grid | cell 0.5 m, agent radius 0.32, headroom 1.7 m, up to 8 layers per column | `navBuild.ts`, `navGrid.ts` |
| Ladder | 0.5 m wide, climbed from 0.32 m off the wall, nav link both ways | `levelBuilder.ts:226`, `navBuild.ts:106` |
| Wall jump | up 3.8 m solo (the highest lip one player reaches alone) | `WALL_JUMP.maxUp`, `config/movement.ts:338` |

The character is 1.75 m, so it is close to a real 1.8 m person. The ratio is already normal: a 2.1 m door is 1.20 x the character (real: 2.04 / 1.75 = 1.17). No in-map correction needed. Keep door height 2.1 m; do not go below 2.0 or above 2.2.

## 2. Camera sets the room size

Measured on the old camera (boom 2.2 m, shoulder offset 0.62 m). The CT camera (section 1) sits closer; the widths are
re-measured on it before they change (G54), and until then these sizes stand.

Camera needs 0.62 + 0.16 = 0.78 m from the spine to a wall on the shoulder side, and the same again after a shoulder swap. A boom of 2.2 m needs open space behind the player.

- Camera never compresses with 1.6 m between walls; it compresses a little at 2.4 m on a bend. Target 3.5 m so two players pass and the camera stays out.
- A turn needs about 2.4 m of straight run behind the player or the boom shortens. Bends are 3.5 m wide with no pillar inside the corner.

## 3. Sizes this map uses

| Item | Size |
| --- | --- |
| Single door | 1.2 x 2.1 (always passes nav, see 4). 1.0 x 2.1 only on half-metre centres |
| Door height | 2.0 - 2.2 m, build 2.1 (section 1: the door-to-character ratio) |
| Double door | 1.8 or 2.0 x 2.1 |
| Wide opening, no door | 2.5 - 3.5 m, lintel 2.1 or a full-height arch |
| Roller door | 3.0 x 3.0 (open gap, or a locked door) |
| Corridor | 3.5 - 4.0 m wide (never under 3.0) |
| Play space | at least 6 m on the short side |
| Ceiling | 3.0 m rooms and corridors; 4.5 - 6.0 m halls. Storey height (floor to floor) 3.3 m with a 0.3 slab |
| Ceiling minimum | 2.4 m clear wherever a player walks: the validator's hard floor (ERR), not a room height; rooms and corridors stay 3.0 m (row above); ducts and open sky exempt |
| Fire stair (enclosed) | 1.3 m wide, two flights and a 1.3 m landing, fire door top and bottom (1.2 wide), the only stairs with doors |
| Open feature stair | 2.4 m wide, rise 0.165, run 0.285 (slope 0.58, 30 deg), mid landing 2.0 m, no door, rails on open sides |
| Stair height rule | floor to floor 3.3 m = 20 risers, so two flights of 10 (NCC allows 2 - 18 per flight) |
| Ladder shaft | 1.0 x 1.0 m, ladder 0.5 wide, 0.6 m clear in front of the rungs |
| Duct, trench, pipe subway (crouch) | 1.2 wide x 1.5 high clear (Michael, 2026-10-10; was 0.9 x 1.3, too low for the camera: `dead-line-v2-engine-check.md`). Player only: nav headroom is 1.7 so guards cannot enter. Walked crouched, no auto-crawl anchor |
| Walk-in tunnel | 2.1 m clear minimum, 2.4 preferred; guards can enter |
| Co-op lip | 4.3 - 4.5 m, above the solo wall jump (section 1); one band for the boost and the human ladder (level-design 11.8, 12.2 G57; `TEAM.boostMax` 4.5, `config/movement.ts:459`) |
| Split-jump gap | 1.2 - 1.95 m between faces, faces at least 3.6 m tall (level-design 12.1: split gaps are found from these automatically) |
| Pull-up lip | 4.3 - 4.5 m over the catcher's floor, the co-op lip band (`PULL.min` - `max` = `WALL_JUMP.maxUp` 3.8 + 0.5 and `TEAM.boostMax` 4.5; the pull-up kit move is on the mission-framework branch, not on master yet). Graph kind `team_pull` |
| Relay lip | 4.3 - 4.6 m over the climber's floor: the co-op band's low end up to the highest hang the relay serves (`TEAM.relayMax` 4.6, `config/movement.ts:476`). Graph kind `team_hang` |
| Two-person rope | 2.2 - 6.0 m climb from the climber's floor to the holder's edge (`TEAM.ropeMin` - `ropeMax`, `config/movement.ts:513-514`); a climb up only, no descent. Graph kind `team_rope` |
| Throw gap | at most 2.7 m: the runner lands `TEAM.throwDist` 3.2 m past the thrower (`config/movement.ts:483`), less a 0.5 m landing margin. Graph kind `team_throw` |
| Held shutter | 0.9 m crawl gap under the held shutter (`SHUTTER.holdGap`; the shutter kit move is on the mission-framework branch, not on master yet); the doorway follows the door rows. Graph kind `shutter` |
| Low cover | 1.2 m high hides a crouched player; a 1.0 m rail does not |
| Curb or step | 0.15 - 0.40 m; never between 0.40 and 0.45 (player and nav disagree) |
| Recess, locker bay, pillar niche | 1.0 deep x 1.2 wide minimum, opening faces away from the guard's approach |

## 4. Nav grid limits for doors and stairs (derived)

The grid blocks a cell within 0.32 m of a wall face. Cell centres sit every 0.5 m.

- A gap of width `w` has a free band of `w - 0.64` m. A cell centre is guaranteed inside it only when the band is at least one cell: `w - 0.64 >= 0.5`, so `w >= 1.14`.
- So: **1.2 m and wider always passes.** 1.0 m (band 0.36) passes only when a cell centre is on the door axis, i.e. door centre on a multiple of 0.5 with the world bounds on the 0.25 offset (the S1a finding). Confirmed by the code, not changed.
- Headroom 1.7 vs lintel 2.1: floor may rise 0.4 m at most under a door (door 0.3 thick plus one cell). With a 0.75 slope that is 0.53 m of run; the old "0.45 m from the stair end" rule. With the open stair slope of 0.58 it is 0.69 m.
- **Rule:** no door within 1.5 m of a stair end; the fire stair doors sit on a flat landing at least 1.3 m long. Open stairs and wide openings have no door, so the 0.45 m problem does not occur.
- Open stairs: nav accepts any slope under 49 deg, so 30 deg is safe. The upper slab hole covers the full stair plan so nothing hangs under 1.7 m headroom.
- A 2.0 m double door and a 3.0 m opening are never limited by alignment.
- Test to add in the build step: a 1.2 m door at an odd centre (for example x = 12.3) must be reachable from both sides on the grid.

## 5. Spacing rules

- Door centres 3.0 m or more apart on one wall.
- No door within 1.5 m of a corner.
- Never two doors facing each other across a corridor (offset by 2.0 m or more).
- No door-after-door chain: at least 5 m of open floor between doors on a route.
- Recess or cover every 8 m; no straight run over 12 m without a bend or cover.
- Shadow-route stepping stones (darkness, cover or a hide spot): 4 - 8 m apart, never more than 8 m (level-design 3.5).

## 6. Real code check (NCC, Australia)

Stair risers 115 - 190 mm, goings 240 - 355 mm, 2R + G 550 - 700 mm, 2 - 18 risers per flight. Accessible door clear opening 850 mm and passing space 1.8 m (AS 1428.1 via a third-party summary, unverified). Our numbers sit inside these. Gameplay widths are larger than code on purpose.

Sources: [NCC 2022 Housing Provisions Part 11.2.2](https://abcb.gov.au/editions/ncc-2022/adopted/housing-provisions/11-safe-movement-and-access/part-112-stairway-and-ramp-construction), [NCC 2019 Vol 2 Part 3.9.1](https://ncc.abcb.gov.au/editions/2019/ncc-2019-volume-two/part-39-safe-movement-and-access/part-391-stairway-and-ramp), [Sydney Access Consultants](https://sydneyaccessconsultants.com.au/articles/282-is-your-door-wide-enough-for-a-wheelchair.html).

## 7. Room sizes by type

Added 2026-10-24 (Michael, "Add 1-4 as extras", changes M1 and M2: scale the room table 1.3-1.5x real, one source of truth). `scripts/metrics-gen.mjs` reads this section and section 8 into `docs/design/metrics.json`; the level validator reads every size from that JSON. Values are tuned in greybox. Never edit the JSON by hand: edit this sheet and regenerate.

How a row is built:

1. Real size: the stealth-level skill's room table (`docs/level-validator/source/SKILL.md` 3.5), or a Marlow estimate where the skill has no row (source column says which).
2. Game size = real x Scale (1.4, the middle of 1.3-1.5; it matches the corridor and door scaling: corridor 3.5-4.0 vs real about 2.4, door 1.2 vs 0.9), rounded to the nearest 0.5 m.
3. Camera floor on the short side (w): the game min w is raised to the floor if the scaled value is lower. Max w, min l and max l are not floored.

Parameters (one value per row, keys are fixed):

| Key | Value | Unit | Note |
| --- | --- | --- | --- |
| `room_scale` | 1.4 | factor | real x this, tuned in greybox (range 1.3-1.5) |
| `room_round_m` | 0.5 | m | game size rounded to this |
| `camera_floor_encounter_m` | 6.0 | m | short side of an encounter space (play space, section 3) |
| `camera_floor_walkthrough_m` | 3.5 | m | short side of any room a player walks through |
| `camera_floor_corridor_m` | 3.0 | m | corridor (section 3: never under 3.0; target 3.5-4.0) |

Rules the table rests on (section 2: the boom needs 0.78 m of shoulder clearance each side and 2.4 m behind the player):

- An encounter space is at least 6.0 m on the short side. A class marked `conditional` may be an encounter space only when the built room is 6.0 m or more on the short side; a class marked `no` is never an encounter space.
- Every other room a player walks through is at least 3.5 m on the short side, except a corridor (3.0 floor), a stair core (exempt, `Camera floor` 0.0), a duct or a recess (section 3 sizes).
- `Ceiling` is not scaled (section 3: 3.0 m rooms, 4.5 - 6.0 m halls); `open` means no ceiling.
- Stair core is Scale 1.0 on purpose: the fire stair is 1.3 m wide with a 1.3 m landing (section 3) and the built `SW_CORE` is 2.6 x 5.6 (`campusS2.ts:90`).

In the table every cell holds one value; units are in the header; `w` is the short side (w <= l); `Encounter` is `yes`, `conditional` or `no`.

| Class | Real min w (m) | Real min l (m) | Real max w (m) | Real max l (m) | Scale | Game min w (m) | Game min l (m) | Game max w (m) | Game max l (m) | Camera floor (m) | Ceiling min (m) | Ceiling max (m) | Encounter | Source | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `private_office` | 3.0 | 4.0 | 4.0 | 5.0 | 1.4 | 4.0 | 5.5 | 5.5 | 7.0 | 3.5 | 3.0 | 3.0 | no | skill 3.5 | never an encounter space |
| `open_office` | 10.0 | 15.0 | 30.0 | 40.0 | 1.4 | 14.0 | 21.0 | 42.0 | 56.0 | 6.0 | 3.0 | 3.3 | yes | skill 3.5 |  |
| `meeting_room` | 4.0 | 6.0 | 6.0 | 10.0 | 1.4 | 5.5 | 8.5 | 8.5 | 14.0 | 3.5 | 3.0 | 3.0 | conditional | skill 3.5 | encounter only at 6 m short side |
| `restroom` | 3.0 | 5.0 | 6.0 | 8.0 | 1.4 | 4.0 | 7.0 | 8.5 | 11.0 | 3.5 | 3.0 | 3.0 | no | skill 3.5 |  |
| `break_room` | 5.0 | 6.0 | 8.0 | 10.0 | 1.4 | 7.0 | 8.5 | 11.0 | 14.0 | 6.0 | 3.0 | 3.0 | yes | skill 3.5 |  |
| `server_room` | 6.0 | 8.0 | 15.0 | 20.0 | 1.4 | 8.5 | 11.0 | 21.0 | 28.0 | 6.0 | 3.0 | 4.5 | yes | skill 3.5 |  |
| `security_room` | 4.0 | 5.0 | 6.0 | 8.0 | 1.4 | 5.5 | 7.0 | 8.5 | 11.0 | 3.5 | 3.0 | 3.0 | conditional | skill 3.5 | encounter only at 6 m short side |
| `gatehouse` | 3.0 | 4.0 | 5.0 | 8.0 | 1.4 | 4.0 | 5.5 | 7.0 | 11.0 | 3.5 | 3.0 | 3.0 | conditional | Marlow estimate | not in skill table; encounter only at 6 m short side |
| `lobby` | 10.0 | 12.0 | 25.0 | 30.0 | 1.4 | 14.0 | 17.0 | 35.0 | 42.0 | 6.0 | 4.5 | 9.0 | yes | skill 3.5 | ceiling 9.0 = atrium |
| `lab` | 5.0 | 6.0 | 9.0 | 18.0 | 1.4 | 7.0 | 8.5 | 12.5 | 25.0 | 6.0 | 3.0 | 4.5 | yes | Marlow estimate | not in skill table |
| `warehouse` | 25.0 | 40.0 | 60.0 | 120.0 | 1.4 | 35.0 | 56.0 | 84.0 | 168.0 | 6.0 | 6.0 | 12.0 | yes | skill 3.5 |  |
| `loading_dock` | 15.0 | 20.0 | 30.0 | 40.0 | 1.4 | 21.0 | 28.0 | 42.0 | 56.0 | 6.0 | 4.5 | 8.0 | yes | skill 3.5 | apron; may be open to the sky |
| `plant_room` | 4.0 | 6.0 | 14.0 | 20.0 | 1.4 | 6.0 | 8.5 | 19.5 | 28.0 | 6.0 | 4.0 | 6.0 | yes | Marlow estimate | not in skill table; camera floor lifts min w |
| `storage` | 3.0 | 3.0 | 10.0 | 18.0 | 1.4 | 4.0 | 4.0 | 14.0 | 25.0 | 3.5 | 3.0 | 6.0 | conditional | Marlow estimate | not in skill table; encounter only at 6 m short side |
| `corridor` | 1.5 | 2.0 | 3.0 | 60.0 | 1.4 | 3.0 | 3.0 | 4.0 | 84.0 | 3.0 | 3.0 | 3.0 | no | skill 3.5 + scale sheet 3 | w capped at 4.0 by scale sheet 3; target 3.5-4.0 |
| `stair_core` | 2.6 | 5.6 | 6.0 | 8.0 | 1.0 | 2.6 | 5.6 | 6.0 | 8.0 | 0.0 | 3.3 | 3.3 | no | scale sheet 3 + campusS2 SW_CORE | scale 1.0: stair geometry is set in section 3; 3.3 = storey height; camera floor 0 = exempt |
| `car_park` | 10.0 | 15.0 | 40.0 | 60.0 | 1.4 | 14.0 | 21.0 | 56.0 | 84.0 | 6.0 | 2.4 | 3.3 | yes | Marlow estimate | not in skill table; deck, may be open |
| `yard` | 10.0 | 10.0 | 60.0 | 90.0 | 1.4 | 14.0 | 14.0 | 84.0 | 126.0 | 6.0 | open | open | yes | Marlow estimate | not in skill table; no ceiling |

## 8. Validator numbers

Added 2026-10-24 (Michael, changes M2 and M4). The speeds, times and targets the level validator (`scripts/level-validate.mjs`) uses. One value per row; the unit is in the key and in the Unit column; keys are fixed (the generator reads them by key). A value is one number or a `min - max` range (two numbers).

| Key | Value | Unit | Source |
| --- | --- | --- | --- |
| `split_speed_mps` | 1.3 | m/s | stealth pace, crouched sneak, gear 2 (`GEARS.crouch[1]`, `src/config/movement.ts:159`); used for split-leg traversal time |
| `reach_speed_mps` | 3.0 | m/s | standing jog (`GEARS.stand[3]`, `src/config/movement.ts:160`; the run is 4.0, so 3.0 is the stricter choice); used for reaching a downed partner |
| `split_max_s` | 90 | s | longest planned split leg (Michael 4); about 117 m at `split_speed_mps` |
| `split_parity_pct` | 20 | % | split legs within this of each other, by traversal time (Michael 4, M4) |
| `reach_max_s` | 15 | s | a downed partner reachable within this (Michael 4); about 45 m at `reach_speed_mps` |
| `shared_min_w_m` | 2.0 | m | link marked `shared` (both partners move together) is at least this wide |
| `shadow_min_frac` | 0.4 | fraction of floor | encounter space floor in shadow, lower bound; INFO only since 2026-10-25 (the light band of section 9 wins; level-design 5.5) |
| `shadow_max_frac` | 0.6 | fraction of floor | encounter space floor in shadow, upper bound; INFO only (level-design 5.5) |
| `vantage_min_frac` | 0.7 | fraction of space | a vantage sees at least this share of the space (Michael 3) |
| `los_break_max_s` | 5 | s | line of sight breakable within this from any point of a stealth route (Michael 3) |
| `step_band_min_m` | 0.40 | m | level changes between this and `step_band_max_m` are forbidden (player 0.42 vs nav 0.45 disagree, section 3) |
| `step_band_max_m` | 0.45 | m | upper edge of the forbidden step band |
| `grid_m` | 0.5 | m | snap grid for every size, width, height and length (nav cell, section 1) |
| `dead_end_max_m` | 15 | m | a dead end (one neighbour) is allowed only for a reward or objective space no longer than this (level-design 3.4, 16.6.3) |
| `guards_early` | 3 - 6 | guards | per encounter space and player count in the first half of the spine; WARN below the low end only, no upper limit (Michael 2026-10-24: "as many guards as realistically possible"; bounded by the guard-cap perf floor and passable routes; level-design 4.9) |
| `guards_late` | 6 - 10 | guards | the same in the second half of the spine; WARN below the low end only (level-design 4.9) |
| `sector_alive_max` | 32 | guards | Sector Ops: the most guards alive at once, a ceiling per section and player count, not a target (`SECTOR.maxAlive`, `src/game/sectors.ts:508`; G187); level-design 4.9 |
| `safe_drop_m` | 4.5 | m | a drop above this ends in a heavy landing with a recovery (`LANDING.heavy`, `src/player/movement.ts:168`); no fall damage, so the validator only warns |

Vantage and line-of-sight numbers are declared targets in the graph and are measured in greybox (M4); a map fails if the measurement misses the target. Shadow share is measured too but only reported (INFO); the light band (section 9) is the light target.

## 9. Light levels by space type (placeholder)

Added 2026-10-25 (Michael ~09:05, "Real-world levels"; level-design 5.5). Each space type gets a real-world maintained
illuminance band from the lighting standards; the engine light is calibrated to lux once and the bake is measured at
greybox exit. **Values set by light-realism** (the Sector Ops Build job): until it fills them, every cell reads `TBD`
and `scripts/metrics-gen.mjs` does not read this section.

**Until then (interim rule):** light each space like a real site of that type at night (G329): a car park, a road or a
yard lit as such sites are lit, an interior lit as it would be after hours. The floor shadow share is reported for
information only. Marlow Yard's "lit by default, the players cut it" (G279) is the training course's rule; it is never
the fallback for the campaign or Sector Ops.

| Space type | Standard | Min lux | Max lux | Note |
| --- | --- | --- | --- | --- |
| Outdoor car park | AS/NZS 1158.3.1 | TBD | TBD | values set by light-realism |
| Road, service lane | AS/NZS 1158.3.1 | TBD | TBD | values set by light-realism |
| Yard, loading apron | AS/NZS 1158.3.1 | TBD | TBD | values set by light-realism |
| Lobby, reception | AS/NZS 1680 / EN 12464-1 | TBD | TBD | values set by light-realism |
| Corridor, stair | AS/NZS 1680 / EN 12464-1 | TBD | TBD | values set by light-realism |
| Office, meeting room | AS/NZS 1680 / EN 12464-1 | TBD | TBD | values set by light-realism |
| Lab, server room | AS/NZS 1680 / EN 12464-1 | TBD | TBD | values set by light-realism |
| Warehouse, plant room | AS/NZS 1680 / EN 12464-1 | TBD | TBD | values set by light-realism |
| After-hours interior (lights off) | - | TBD | TBD | values set by light-realism |

## 10. Patrol timing

Added 2026-10-25 (moved from level-design 4.3). Design-doc checks on the guard sheets and the e2e patrol test
(level-design 15); `scripts/metrics-gen.mjs` does not read this section. Starting values (G10).

| Thing | Value |
| --- | --- |
| Patrol cycle | 25 - 45 s |
| Stop at a patrol point | 3 - 6 s |
| Gap in coverage the player can use | 3 - 8 s |
