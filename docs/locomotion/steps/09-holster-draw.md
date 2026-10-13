# Step 09 - holster-draw (Block C)

Holstered unless aiming, no hip fire, ADS spread tuning; drawn state and weapon in hand host-authoritative (bible 1.11,
5.6; D8). Deps: 06. Model: implementer opus; checker opus (changes src/net). (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A done (MoveState slot 1 = `wall`, PROTOCOL_VERSION 3, no shield / marks / sonar) and Block B
(`scripts/anim-audit.mjs` local + remote). Line numbers verified 2026-10-13 before Block A; Block A shifts gameState,
moveState, localMoveState, protocol, coopHost, coopClient, remoteAvatar: grep the named symbol first.

## Read
- docs/design-bible.md 467-510 (5.6 gunplay), 428-438 (5.4 elbow strike, fire button)
- src/weapons/playerWeapons.ts 60-125 (SWAP_TIME :68, SWAP_HOLSTER :70, STOW_RATE :81), 182-260 (`setStowed`,
  `setAttachedStow`), 305-320 (`currentSpread`), 330-420 (update, swap, fire gate :405-420)
- src/weapons/weaponStats.ts 20-50, 80-95 (`spreadDeg` :86-89); src/config/weapons.json 1-30 (pistol spread :19-24)
- src/progression/attachments.ts 1-40 (hip-fire mods :17-22)
- src/player/player.ts 180-215 (`ci.fire` :189, `aiming: ... || inp.down('fire')` :211)
- src/game/gameState.ts: grep `setAttachedStow` (~1155-1162, draw on fire :1157), grep `crosshair` (~2334)
- src/player/moveState.ts 55-110 (MoveCommit, MoveState), 160-230 (sanitize :166, pack :214), 250-300 (MovePose,
  `poseFromMoveState` :279); src/game/localMoveState.ts 1-130
- src/net/protocol.ts 10-75 (PROTOCOL_VERSION :12, PF :52, PlayerState :54, wire :71-74), 225-240 (sanitize player)
- src/net/coopHost.ts 430-470 (`pstate`), 695-770 (`takeShot` :719, :748), 785-835 (own state :791, snapshot :833)
- src/net/coopClient.ts 470-490 (pstate send); src/net/remoteAvatar.ts 55-110 (`setWeapon`, `stowed`), 196-215

## Task
1. New pure module src/weapons/drawState.ts (Babylon-free): phases 0 holstered, 1 drawing, 2 drawn, 3 holstering.
   Draw 0.3 s pistol / sidearm, 0.4 s primary; holster 0.4 s (bible 5.6). Aim pressed starts the draw, aim released
   starts the holster, in every state including alert and combat. Release mid-draw reverses from the current progress.
2. PlayerWeapons drives the existing stow path from it: holstered = `setStowed(true)` (playerWeapons.ts:190-220), draw
   continues the swap from its holstered beat. Attached stow and the one-handed sidearm (:236-260) keep their rules
   and win over aim. Swap stays >= 0.6 s total (5.12.2.6; SWAP_TIME 0.9).
3. No hip fire: a shot needs phase 2 and `cam.ads >= 0.9` (fire gate :405-420). Fire while holstered does nothing in
   this step (step 10 binds the elbow strike there): no shot, no dry-fire click, no bloom.
4. player.ts:211: fire no longer raises aim. gameState draw rule (:1157): aim only draws (hostage sidearm too).
5. ADS spread tuning in `spreadDeg` (weaponStats.ts:86-89), player path: base = `spreadAds`; crouched and still x0.7;
   standing still x1.0; moving adds `spreadMove x speed / 2.8` (gear 4 cap); bloom unchanged. `spreadHip` stays in data
   for guards and parked modes only. Hip-fire attachment mods (attachments.ts:17-22) no longer apply to the player.
6. Crosshair only while drawn and aiming (gameState ~2334).
7. MoveState gains `dw` (0-3, the draw phase) in the interface, `localMoveState`, `packMoveState`, `sanitizeMoveState`
   (clamp 0-3, default 0) and `poseFromMoveState` (`MovePose.drawn`). Remotes take the weapon in hand from `dw`, not
   from `PF.ads` (remoteAvatar `setWeapon(id, stowed)`).
8. Host authority (D8): on `pstate` the host keeps `w` only if it is in that player's validated lobby `loadout`, else
   the last valid id; it forces `dw = 0` while its own view of that player is attached-with-holster, in a takedown,
   in a team move with busy hands or downed. Snapshots carry the host's values. `takeShot` (:719, :748) refuses a
   client shot unless the host's `dw` for that shooter is 2 (no hip fire enforced on the host).
9. A client whose `dw` the host forced to 0 for > 0.3 s holsters locally (no flicker for normal latency).
10. PROTOCOL_VERSION 3 -> 4. No new MoveState mode (drawn is a field on every mode).
11. Fix e2e suites that fire without aiming (grep `fire` in scripts/e2e-*.mjs: clip, gadgets, mouse, takedown, touch,
    plus suites using `__pad` RT): they aim first.

## Tests
- tests/drawState.test.ts: draw / holster times per class, reversal mid-draw, aim-only trigger.
- tests/weapons.test.ts: no shot while holstered or raising; spread table (crouch still < still < moving, monotonic).
- tests/net.test.ts: `dw` pack / sanitize clamps; a literal `pstate` with an off-loadout `w` keeps the last valid id;
  host refuses a shot with `dw` 0 (pure check in src/net/validate.ts).
- e2e-pad: LT draws within 0.45 s, RT then fires; release holsters within 0.45 s; RT while holstered: shot tally unchanged.
- e2e-mouse: RMB draws, LMB fires; LMB alone fires nothing.
- e2e-netmove: case "drawn" (client aims: host remote has the weapon in hand, joints <= 10 cm) and "holstered"
  (released: remote stowed within 0.6 s, joints <= 10 cm).
- e2e-coop: a client shot while holstered is refused by the host (enemy hp unchanged).

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-netmove e2e-coop e2e-weapons-carry`
- `node scripts/anim-audit.mjs` local and remote (draw / holster poses: swap >= 0.6 s, hands < 2 cm, settle <= 0.2 s)
- Grep proofs: `grep -n "inp.down('fire')" src/player/player.ts` shows no aim coupling; `grep -n PROTOCOL_VERSION
  src/net/protocol.ts` = 4; `grep -n "dw" src/player/moveState.ts` shows pack and sanitize.
- PC-PASS: holstered silhouette and draw look (contact sheet), pending PC run.

## Commit
"locomotion 09: holstered unless aiming, no hip fire, ADS spread, host-authoritative drawn state"
Then LOG, STATE, AUDIT (W10, W11), CHANGELOG, TESTING, docs/systems/combat.md and coop.md.
