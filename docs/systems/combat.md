# Combat
Purpose: weapon data, firing, the draw, the CT kit and health.
Design authority: docs/DECISIONS.md (G16, G20, G21, G76, G98, G103-G105), then docs/design-bible.md (Section 5.6).

## Decided direction
- Decided (G76, G115, built): the CT kit only: one rifle and one pistol (code: `rifle` and `pistolSd`); the knife is part of
  the kit. Every other gun is deleted (docs/consolidation/deleted-guns.md).
- Decided, not built yet (G76): the rifle's attachments are a sniper, a shotgun and a launcher; the pistol carries a light /
  electronics disruptor (spec: `docs/systems/ct-toolkit.md` 3.5); the knife's role and the attachment set are settled by
  the CT co-op research. No attachment mode, disruptor or knife exists in code; the rifle keeps the legacy progression
  attachments (red dot, 4x scope, suppressor, compensator, grip, laser, magazines).
- Decided, not built yet (G103): CT draw timings, about 0.6 s (pistol) and 0.75 s (rifle) to raise, 0.5-0.6 s to lower.
  Code: (CT prototype G2, footage wins, AUDIT-AIM rows 1 / 2 / 7) rifle 0.3 s draw with the raise running from the press
  (about 0.55 s to settled, muzzle up at the shoulder, no chest hold), pistol 0.5 s, holster 0.15 s (CT instant), carry
  lower 0.2 s. Recoil (row 11): no visible flip (weapon flip 0.02 rad per kick, rifle recoilPitch 0.6, no shot shake).
- Decided, not built yet (G104): normal aiming has no zoom; the marksman (sniper) attachment's scope has hold breath.
- Decided, not built yet (G105): loadouts are Stealth / Assault / Recommended. Code: Silent / Flash / Loud.
- Decided and built (G16): no aim assist on any input. The pad's aim assist code and its `gamepad.aimAssist` setting are
  gone; an old stored value is dropped when settings load (`sanitizeSettings`).
- Decided (G20, G98): health comes back only at wall medkit stations; no carried medkits, no kit count (built). Stations in
  every map: not built yet (only Proving Grounds has one).
- Open (DECISIONS, unanswered): which gun comes out first (WEAP-09), how guns are carried when put away (WEAP-10).

## Combat
- Weapon content is JSON (`config/weapons.json`), validated by `validateWeaponDefs`; maths in `weapons/weaponStats.ts`
  (pure). Add a weapon: JSON entry + id in `WEAPON_IDS` (`weapons/weaponDefs.ts`; `WeaponId` = `'rifle' | 'pistolSd'`).
- `PlayerWeapons` (fixed step) owns fire / reload / swap / grenades; `Ballistics` owns rays and pooled swept projectiles;
  `Explosions` queues detonations (never recursive); `Vfx` pools every effect.
- Anything shootable implements `Damageable` and registers its bodies with `DamageRegistry`.
- HUD rules: `docs/systems/ui.md`.
- Holstered unless aiming (step 09, G21): `weapons/drawState.ts` (pure) holds the draw phase (0 holstered, 1 drawing, 2
  drawn, 3 holstering; `DRAW_TIME_SIDEARM` 0.3 s, `DRAW_TIME_PRIMARY` 0.4 s, `HOLSTER_TIME` 0.4 s; a release mid-draw
  reverses from the current progress). Aim pressed draws, released holsters, in every alert state. `PlayerWeapons` drives
  the stow path from it (weapon-to-weapon swaps keep `SWAP_TIME` 0.9; RB swaps while aiming; a swap while holstered only
  changes the selection). A match starts holstered. Attached stow and the one-handed sidearm (split, rappel, inverted pipe,
  hostage) win over aim. Grenades and gadgets work holstered.
- (anim-rework S3, M2) The sling draw: LT from holstered with a long gun on the diagonal back sling takes
  `STANCE.slingDrawLong` 2.5 x the draw (0.75 s; the pistol `slingDrawMult` 1.6 x) on its own path: `WeaponModel.beginTravel`
  `sling`, the grip through `TRAVEL_VIA.sling` (low beside the right hip, under the arm) and the turn `backDiag.diagTurnSling`
  (the holster's turn backwards: round the right side in the back's plane to muzzle down, the top forward, then the
  muzzle swings up onto the line into the shoulder; never muzzle up over the shoulder). Local only: a remote copy poses
  its draw from `dw` as before.
- (anim-rework S3) Low ready: the rifle `READY_POSES.low` muzzle about 40 deg down, 13 deg inboard; the pistol's low ready
  is `PISTOL_READY` (a compressed ready, by the light gun's weight). Elbows: `AIM_ELBOW_TUCK` 0.85 raised,
  `READY_ELBOW_TUCK` 0.5 with a gun in the hands.
- No hip fire: a shot needs the drawn phase and `cam.ads >= 0.9` (`fireReady`); fire while holstered is the close strike
  (`docs/systems/takedowns.md`). The crosshair shows only drawn and aiming.
- Player spread (`playerSpreadDeg`, weaponStats.ts): base `spreadAds`; crouched and still x0.7; standing still x1; moving
  adds `spreadMove x min(speed, 2.8) / 2.8`; bloom on top, capped at `maxSpread`. `spreadHip` and the hip-fire attachment
  mods are for guards only.
- Mouse: a second button pressed while another is held arrives as a chorded `pointermove` (no `pointerdown`);
  `keyboardMouseSource` reads it, so RMB held then LMB fires.
- Guards shoot with their own numbers (`enemies.json` `weapon`); `enemies.json` `gun` is only the carried model (rifle or
  suppressed pistol).
- Class-keyed code for classes no gun has now (compact carry slots, pellets, projectiles, shell reloads) stays for the
  rifle's attachment modes.

## The CT kit (G76)
- `config/arsenal.ts` (pure): `CAMPAIGN_ARSENAL` = primary `rifle`, sidearm `pistolSd`, both defaults. `campaignLoadout(lo)`
  maps a loadout onto the set (always one primary + one sidearm; the save's order is kept). `profile.loadoutEntries` applies
  it in Infiltration; Free Roam carries the same two; `?loadout=a,b` bypasses it.
- Original names only (A28): `tests/weaponNames.test.ts` bans real makers, model designations and reference-game terms.
- Suppressors: `rifle` is issued suppressed in the campaign (A62); `pistolSd` has an integral suppressor (`noise` 0.35).
- Save: deleted gun ids in a loadout or preset map to the kept gun of their slot (`DELETED_GUNS`, v8 -> v9 migration).

| id | name | role |
| --- | --- | --- |
| rifle | Heron Carbine | primary, suppressed rifle (default) |
| pistolSd | Hush 9 SD | sidearm, suppressed pistol (default) |

Meshes (feature/weapons, `docs/weapons/`): each kit item is a baked GLB in `src/weapons/assets/<id>.glb` with its build
report `<id>.json`, built by `npm run weapons:build [rifle|pistolSd|knife] [--render]` (Blender 5.2.2 headless:
scripts/weapons/py/<id>.py on wlib.py; GPU bake of albedo / ORM / normal; KTX2). `weaponMesh.ts` loads each once per scene;
`WeaponModel` with `{ mesh: true }` (the player, the co-op partner, the menu preview) shows it in place of the primitive
parts, which stay as the loading fallback and as the proxy whose extents the carry slots use (guards keep the parts,
A6). Each mesh is built around the weapon's data: `grip`, `foregrip`, `muzzle`, and for long guns `backStud` (the stud
that hangs it from an operator's back plate); `tests/weaponMesh.test.ts` checks the points, the proxy fit, budgets and
KTX2. The knife (`KnifeModel`, `weapons.knife.show`) sits in the right fist when drawn. `npm run weapons:shots`
(`E2E_GPU=1`, port 4189) takes the in-game review screenshots on the training map (`STAGE=warehouse`: under a lamp).

## Health and medkit stations (G20, G98)
- Health 100, no regeneration (bible 6). The only heal is a wall medkit station: `src/game/medkit.ts` (pure: `MEDKIT.heal`
  40, `MEDKIT.wallHold` 0.6 s, `stationHeal`). Interactable kind `medkitWall` from `MapDef.medkitWalls`: hold to heal 40,
  single use, shown spent; at full health or down it is left for later ("Health full").
- Co-op: the host heals a client's host-authoritative health (`CoopHost.healAtStation`); the client mirrors the spent
  station.
- Placed today only on Proving Grounds (Free Roam). The campaign maps and the bunker have no healing until stations are
  placed (G98, not built yet). Co-op revive of a downed partner is separate (`docs/systems/coop.md`).
- Tests: `tests/medkit.test.ts`; e2e-mouse (solo station on Proving), e2e-coop (client uses the host's station).
