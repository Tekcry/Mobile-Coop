# Scale sheet - Night Shift small map

Measured from the code (2026-10-10). "Derived" = worked out from code numbers, not run in a test. Never change the player to fit a map.

## 1. What the game has

| Thing | Value | Source |
| --- | --- | --- |
| Player capsule | 1.75 m stand, 1.15 m crouch, radius 0.30 | `config/movement.ts` |
| Eye height | 1.60 stand, 1.05 crouch | `playerController.ts:216` |
| Camera | boom 2.2 m (ADS 1.5), shoulder offset 0.62 m, pivot 1.62 m, wall padding 0.16, min boom 0.28, FOV 75 | `config/camera.ts` |
| Walk speeds (m/s) | stand 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0; crouch 0.5 / 0.9 / 1.3 / 1.8 / 2.3 / 2.8 | `GEARS` |
| Guard walk speed | 0.75 - 0.9 (officer 0.85, grunt 0.9, heavy 0.75, sniper 0.85) | `enemies.json` |
| Step limit | player 0.42 m, nav 0.45 m | `MOVEMENT.maxStep`, `navBuild.ts:72` |
| Stairs and ramps | collide as a smooth ramp; nav accepts a surface if its normal.y > 0.65 (slope up to about 49 deg) | `levelBuilder.ts:191`, `navBuild.ts:88` |
| Nav grid | cell 0.5 m, agent radius 0.32, headroom 1.7 m, up to 8 layers per column | `navBuild.ts`, `navGrid.ts` |
| Ladder | 0.5 m wide, climbed from 0.32 m off the wall, nav link both ways | `levelBuilder.ts:226`, `navBuild.ts:106` |
| Exchange v2 | door 1.0 x 2.1, interior wall 0.30, exterior 0.45, basement storey 3.3, ground 0, first 4.5; stair rise 0.165 / run 0.28 (B), steep 0.75 slope (V, R, coke) | `exchange.ts` |

The character is 1.75 m, so it is close to a real 1.8 m person. The ratio is already normal: a 2.1 m door is 1.20 x the character (real: 2.04 / 1.75 = 1.17). No in-map correction needed. Keep door height 2.1 m; do not go below 2.0 or above 2.2.

## 2. Camera sets the room size

Camera needs 0.62 + 0.16 = 0.78 m from the spine to a wall on the shoulder side, and the same again after a shoulder swap. A boom of 2.2 m needs open space behind the player.

- Camera never compresses with 1.6 m between walls; it compresses a little at 2.4 m on a bend. Target 3.5 m so two players pass and the camera stays out.
- A turn needs about 2.4 m of straight run behind the player or the boom shortens. Bends are 3.5 m wide with no pillar inside the corner.

## 3. Sizes this map uses

| Item | Size |
| --- | --- |
| Single door | 1.2 x 2.1 (always passes nav, see 4). 1.0 x 2.1 only on half-metre centres |
| Double door | 1.8 or 2.0 x 2.1 |
| Wide opening, no door | 2.5 - 3.5 m, lintel 2.1 or a full-height arch |
| Roller door | 3.0 x 3.0 (open gap, or a locked door) |
| Corridor | 3.5 - 4.0 m wide (never under 3.0) |
| Play space | at least 6 m on the short side |
| Ceiling | 3.0 m rooms and corridors; 4.5 - 6.0 m halls. Storey height (floor to floor) 3.3 m with a 0.3 slab |
| Fire stair (enclosed) | 1.3 m wide, two flights and a 1.3 m landing, fire door top and bottom (1.2 wide), the only stairs with doors |
| Open feature stair | 2.4 m wide, rise 0.165, run 0.285 (slope 0.58, 30 deg), mid landing 2.0 m, no door, rails on open sides |
| Stair height rule | floor to floor 3.3 m = 20 risers, so two flights of 10 (NCC allows 2 - 18 per flight) |
| Ladder shaft | 1.0 x 1.0 m, ladder 0.5 wide, 0.6 m clear in front of the rungs |
| Duct, trench, pipe subway (crouch) | 1.2 wide x 1.5 high clear (Michael, 2026-10-10; was 0.9 x 1.3, too low for the camera: `dead-line-v2-engine-check.md`). Player only: nav headroom is 1.7 so guards cannot enter. Walked crouched, no auto-crawl anchor |
| Walk-in tunnel | 2.1 m clear minimum, 2.4 preferred; guards can enter |
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

## 6. Real code check (NCC, Australia)

Stair risers 115 - 190 mm, goings 240 - 355 mm, 2R + G 550 - 700 mm, 2 - 18 risers per flight. Accessible door clear opening 850 mm and passing space 1.8 m (AS 1428.1 via a third-party summary, unverified). Our numbers sit inside these. Gameplay widths are larger than code on purpose.

Sources: [NCC 2022 Housing Provisions Part 11.2.2](https://abcb.gov.au/editions/ncc-2022/adopted/housing-provisions/11-safe-movement-and-access/part-112-stairway-and-ramp-construction), [NCC 2019 Vol 2 Part 3.9.1](https://ncc.abcb.gov.au/editions/2019/ncc-2019-volume-two/part-39-safe-movement-and-access/part-391-stairway-and-ramp), [Sydney Access Consultants](https://sydneyaccessconsultants.com.au/articles/282-is-your-door-wide-enough-for-a-wheelchair.html).
