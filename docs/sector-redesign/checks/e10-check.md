# E10 armoured routes - fresh check (Opus)

Scope: `git diff 251c2bfa dc19015d` (4c8ad94c engine, 527e2e05 data + tests, dc19015d report); A-E10-1..6 in BRIEF.md.

## Verdict: PASS

## Checked
- **Bit**: `G.GLASS_ARMOURED` = 1 << 14 is free (no raw bit literals elsewhere in `src`); in `PLAYER_SHOT` and
  `ENEMY_SHOT`, not in `SIGHT`, `WORLD`, `HEARING` (glass bit covers it) or `G.STATIC`. Glass children and the
  container carry the same membership, so Havok's `result.shape` (child) reads the bit; `Ballistics.ray` reads it only
  after the registry / prop lookups (no false flag on hitboxes).
- **Shot paths**: player hitscan, the aim ray and projectile weapons (`spawnProjectile` steps through `Ballistics.ray`
  with `MASK.PLAYER_SHOT`) all stop on armour; penetration is skipped on an armoured hit; a penetration continuation
  that lands on armour sparks and stops (one level only). Plain glass is not in any shot mask, so plain-then-armour
  just hits the armour. Enemy fire (`enemy.ts:2037`) casts `MASK.ENEMY_SHOT` and stops. Lamp and camera shots follow
  the round's segment (`onRay` -> `shotRay`), so nothing behind armour is shot out.
- **Co-op**: both pages build the same map (armoured doors via `Doors.addBody`, panes via `buildGlass`); a client's
  predicted round stops on armour, so it never claims a hit the host would refuse. No wire or save change.
- **Doors**: membership `G.STATIC | GLASS_ARMOURED`; nothing compares door membership for equality; open / lock /
  bash / peek and door indices unchanged; open doors have no body (rounds pass an open armoured door, as intended).
  `scripts/e2e-sectorops.mjs` door legs read indices and lock state only - unaffected. Renamed glass node / material
  ids have no readers.
- **Hot paths**: no new per-frame allocation (`isArmoured` is a mask test on the existing per-shot path; `buildGlass`
  is build time).
- **Bypass tests**: each bypass point lies on its route (0.6 m, same floor); the route's legs to the objective stay
  > 1.2 m from the piece; every walked leg up to the bypass has a `findPath` on the runtime nav grid
  (`tests/helpers/runtimeNav.ts`, climbs skipped as the existing route tests do). No route, door or nav data changed,
  so S1-S3, solo finish and co-op-only pathways are as before.

## Runs
- `npx tsc --noEmit`: clean.
- `npx vitest run` armour, glass, campusGlass, campusS4, campusS5, campusRuntimeNav, weapons, doors, doorOpen, net,
  coopFix, coopTorches, securityCameraE8, perception: 14 files, 258 / 258.
- No e2e (docs check); owed at the slice: `e2e-sectorops` S4 / S5 parts and a GPU look at the pane and sparks.

## Polish list (non-blocking)
1. `src/net/coopHost.ts:962` (`judge`) and `:1005` (`onLampShot`) validate line of sight with `G.STATIC` only: a
   modified client could claim a hit through armoured glass and the host would accept it. Parity for honest clients
   holds. Suggest `G.STATIC | G.GLASS_ARMOURED` in both host LOS checks.
2. `src/net/remoteAvatar.ts:604`: the partner's tracer is cast on `MASK.WORLD`, so it draws through an armoured pane
   (cosmetic). Suggest `MASK.WORLD | G.GLASS_ARMOURED`.
3. `src/weapons/explosions.ts:63`: blast LOS is `G.STATIC`, so a grenade blast reaches through any glass, armoured
   included (pre-existing for glass; grenades themselves bounce off panes).
4. A-E10-6: the S4 NOC pair will fire into their own window until Guard AI gates the fire decision on
   `MASK.ENEMY_SHOT` (handed off in e10-armour.md; harmless to the player).
5. `campusS5Data.ts` now imports `campusS5` at runtime (Babylon through `core/babylon`); same pattern as
   `campusSectors.ts` already uses for S1-S3, no cycle.
