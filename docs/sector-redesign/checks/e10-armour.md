# E10 armoured routes (A97) - build report

Branch `feature/sector-redesign-e10` (Opus), base 251c2bfa (E2 glass + posts move). Commits: 4c8ad94c (engine),
527e2e05 (S4 / S5 data, tests), then this report and the BRIEF / changelog lines.
Michael ~10:10 item 10: "armoured routes (bulletproof glass / doors) with a quiet bypass (vent, hack, hang-down)".

## Built
- **Collision bit** `G.GLASS_ARMOURED` = 1 << 14 (free; the test asserts no other group shares it). In
  `MASK.PLAYER_SHOT` and `MASK.ENEMY_SHOT`; not in `MASK.SIGHT`, `MASK.WORLD` or `G.STATIC`. Pure helpers in
  `src/physics/groups.ts`: `glassMembership(kind, armoured)`, `doorMembership(armoured)`, `isArmoured(bits)`.
- **Armoured glass**: `BoxPiece.armoured?: true`, set by `LevelBuilder.glass(..., color, { armoured: true })`.
  `buildGlass` makes one body per kind x armour (`G.GLASS` [+ `GLASS_FROSTED`] + `GLASS_ARMOURED`). Light, nav, cover,
  voxels, ledges, hearing and `SightWorld` treat it as a plain pane (they read `glass`, not the armour). Clear armoured
  glass still sees; rounds stop. Render tell: alpha 0.24 against 0.16 (render only).
- **Armoured doors**: `Door.armoured?: boolean` (`LevelBuilder.door(..., { armoured: true })`). Doors cannot be shot
  open today (no runtime code reads `breachable`; shots never open doors), but a closed leaf is a 0.1 `G.STATIC` box,
  thinner than a rifle's 0.2 penetration, so rounds went through. An armoured leaf's body is `G.STATIC | GLASS_ARMOURED`
  (`doors.ts addBody`). Open, lock, bash and peek are unchanged.
- **Shots**: `Ballistics.ray` sets `RayHit.armoured` from the struck shape's membership (per shot, not per frame).
  `PlayerWeapons` skips penetration on an armoured hit. `impactFx` gives sparks only (5), no chip or decal: the same
  look as an E8 bulletproof-camera ricochet. Enemy rounds already cast `MASK.ENEMY_SHOT`, so they stop on the pane.
- No wire change: both pages build the same map data. No save change. Hot paths untouched (sight casts are unchanged).

## Data (A97): 4 pieces, one named quiet bypass each
| Id | Piece | Loud route | Quiet bypass (kind, where, route) |
| --- | --- | --- | --- |
| arm-mantrap | S4 mantrap inner door (10.5, 22) | The lobby, the mantrap and the centre aisle | keypad: kp-batt, the battery room keypad door (-4, 17), code on the dock board; stealth route |
| arm-noc | S4 NOC window, clear, x -3.5..7.5 z 42, sill 4.6 | same | hang: the hang-down from the cable basket into the cage (18, 36.6, y 4.4); high route |
| arm-ante | S5 anteroom hall door (-43, 32) | The front hall, the kitchen and the terrace gate | side door: the anteroom side door from the vestibule (-40, 33.2); stealth route |
| arm-front | S5 front door (-44, 18), locked | same | rappel: the north parapet rappel to the terrace (-54, 44.15, y 8.4); high route |

`S4_ARMOURED` / `S5_ARMOURED` (type `ArmourPiece` in `campusS4Data.ts`) now carry `loud` and a `bypass` object
(`kind`, `name`, `at`, `y`, `route`) in place of a route-name string. S1-S3 unchanged. No route, door, lock or nav changed,
so every walked leg and the co-op-only pathways are as before; solo still finishes by the bypass routes.

## Files
src/physics/groups.ts, src/world/levelBuilder.ts, src/world/anchors.ts, src/world/doors.ts, src/weapons/ballistics.ts,
src/weapons/playerWeapons.ts, src/world/maps/campusS4.ts, campusS4Data.ts, campusS5.ts, campusS5Data.ts,
tests/armour.test.ts (new, 11), tests/campusS4.test.ts and tests/campusS5.test.ts (bypass.route),
docs/sector-redesign/BRIEF.md (A-E10-1..6), changes/feature-sector-redesign.md.

## Tests
- `npx tsc --noEmit`: clean.
- vitest single files: armour (11), glass, campusGlass, campusS4, campusS5, campusRuntimeNav: 96 / 96. campusS1,
  campusS2, campusS3, securityCameraE8, perception: 160 / 160.
- armour.test.ts covers: the bit is free; armoured panes are in both shot masks, clear armoured is out of SIGHT, frosted
  armoured in it; plain panes still pass bullets; a stand-in shot ray stops at an armoured clear pane while `losClear`
  passes; door membership; the builder flags; light shapes equal to a plain pane; `SightWorld` sees through it; the built
  campus has exactly the 3 armoured doors and 1 armoured pane the tables list, all in S4 / S5; each bypass is on its
  route (within 0.6 m, on its floor) and the route's legs to the objective stay > 1.2 m from the piece; every walked leg
  of each bypass route up to its bypass has a path on the runtime nav grid (`tests/helpers/runtimeNav.ts`).
- No e2e (brief). Owed at the slice: `e2e-sectorops` S4 / S5 parts; a GPU look at the armoured pane and the sparks.

## Guard AI must change
1. Carry `armoured?: true` in its `BoxPiece` glass type and its validator (a pane may be `{ glass: 'clear', armoured: true }`);
   `Door.armoured?: boolean` likewise if it validates doors.
2. The fire decision: guards decide to fire on sight (`losClear` on `MASK.SIGHT`, enemy.ts ~1380), then `shoot()` casts
   `MASK.ENEMY_SHOT` and the round stops on armoured glass. Before firing, test the fire line (muzzle -> aim point) with
   `MASK.ENEMY_SHOT`; if blocked by armour (`RayHit.armoured`), do not fire - reposition, call it in or hold (the S4 NOC
   pair must not empty magazines into their own window).
3. Keep sight on `MASK.SIGHT` (armoured clear glass still sees) and hearing on `MASK.HEARING` (armour is glass: a wall).

## Open items
- Light parity: unchanged (armour is not in the light shapes or any sight mask).
- `docs/level-design.md` Section 12 lists no bullet fact, so it is not edited; if Michael wants it there: "armoured glass
  and doors stop rounds; plain glass does not" (the standard changes only with his approval).
- A distinct ricochet whine and glass-crack decal on armour (polish).
- The mantrap's outer door stays plain (A-E10-4).
