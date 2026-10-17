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
  Code: 0.3 / 0.4 s draw, 0.4 s holster.
- Decided, not built yet (G104): normal aiming has no zoom; the marksman (sniper) attachment's scope has hold breath.
- Decided, not built yet (G105): loadouts are Stealth / Assault / Recommended. Code: Silent / Flash / Loud.
- Decided (G16): no aim assist (code still has pad aim assist, `docs/systems/movement.md`).
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

## Health and medkit stations (G20, G98)
- Health 100, no regeneration (bible 6). The only heal is a wall medkit station: `src/game/medkit.ts` (pure: `MEDKIT.heal`
  40, `MEDKIT.wallHold` 0.6 s, `stationHeal`). Interactable kind `medkitWall` from `MapDef.medkitWalls`: hold to heal 40,
  single use, shown spent; at full health or down it is left for later ("Health full").
- Co-op: the host heals a client's host-authoritative health (`CoopHost.healAtStation`); the client mirrors the spent
  station.
- Placed today only on Proving Grounds (Free Roam). The campaign maps and the bunker have no healing until stations are
  placed (G98, not built yet). Co-op revive of a downed partner is separate (`docs/systems/coop.md`).
- Tests: `tests/medkit.test.ts`; e2e-mouse (solo station on Proving), e2e-coop (client uses the host's station).
