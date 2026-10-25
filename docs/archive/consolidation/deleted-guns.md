# Deleted guns - log (integrate/consolidate, 2026-10-18)

Michael's decision (DECISIONS G76, G115): "CT kit only": one rifle with attachments (sniper, shotgun, launcher), one pistol
(with a light / electronics disruptor) and the knife. Every other gun is deleted in this merge. Gadgets and attachments are
CT's set, settled by a later research job: no attachment, loadout or gadget was built here, and no gadget was deleted.
No docs (*.md) were edited except this log; nothing committed.

## Guns kept and deleted

| Id | Name | Class / slot | Fate |
| --- | --- | --- | --- |
| `rifle` | Heron Carbine | rifle / primary | **Kept**: the CT rifle (campaign default primary, issued suppressed, A62) |
| `pistolSd` | Hush 9 SD | pistol / secondary | **Kept**: the CT pistol (campaign default sidearm, integral suppressor, carries the light disruptor) |
| `pistol` | Warden .45 | pistol / secondary | Deleted (second pistol) |
| `fiveseven` | Kite 5.7 | pistol / secondary | Deleted (second pistol) |
| `smg` | Marten 9 SMG | smg / primary | Deleted (SMG) |
| `vector` | Ferret .45 SMG | smg / primary | Deleted (SMG) |
| `p90` | Swift 5.7 PDW | smg / primary | Deleted (SMG) |
| `ak` | Steppe 5.45 Rifle | rifle / primary | Deleted (second rifle) |
| `tavor` | Ibex Bullpup | rifle / primary | Deleted (second rifle) |
| `dmr` | Spotter 7.62 Marksman | dmr / primary | Deleted (marksman rifle) |
| `sniper` | Ridgeline Bolt | sniper / primary | Deleted (sniper rifle, the only projectile gun but the crossbow) |
| `shotgun` | Mason 12 Pump | shotgun / primary | Deleted (shotgun) |
| `semiShotgun` | Talon 12 Semi | shotgun / primary | Deleted (shotgun) |
| `breacher` | Breacher | shotgun / primary | Deleted (shotgun) |
| `crossbow` | Silent Crossbow | crossbow / primary | Deleted (non-lethal sleep bolts) |
| `lmg` | Anvil 5.56 LMG | lmg / primary | Deleted (machine gun) |

- The knife: no knife exists in code (no hits for `knife` in `src`); nothing kept or built.
- No existing rifle implemented a sniper / shotgun / launcher mode; the rifle keeps only the legacy progression
  attachments (red dot, 4x scope, suppressor, compensator, grip, laser, magazines). CT's attachment set is the later job.

## Files deleted / added
- None. `src/config/weapons.json` lost 14 of its 16 entries (pure deletion, 2509 lines).

## Ids / data / settings removed
- `WeaponId` is now `'rifle' | 'pistolSd'`; `WEAPON_IDS` likewise (`src/weapons/weaponDefs.ts`).
- `WeaponDef.nonLethal` (crossbow only) and the player slot's `nonLethal` field (`playerWeapons.ts`); a player hit no longer
  sets `nonLethal`. `Hit.nonLethal` (`game/damage.ts`) and the enemy knock-out path (`ai/enemy.ts`) stay (generic; nothing sets it now).
- Attachment `lethalBolts` (crossbow only) and its model case; attachment `weapons` lists cut to the kept guns
  (`scope4x`, `comp`, `grip`: rifle; `suppressor`: rifle, pistolSd).
- Unlocks (`progression/unlocks.ts`): the 14 `weapon:` entries and `att:lethalBolts`; `STARTER_UNLOCKS` is
  `weapon:rifle`, `weapon:pistolSd`. Upgrade price tiers (`progression/upgrades.ts`) for the deleted guns.
- Campaign arsenal (`config/arsenal.ts`): primary `['rifle']`, sidearm `['pistolSd']` (was rifle, smg, shotgun, dmr / pistolSd, pistol).
- Sandbox (Free Roam) loadout: `rifle, pistolSd` (was rifle, smg, shotgun, sniper, pistol), in `gameState.ts` and
  `profile.ts`; the fallback match loadout `rifle, pistol` is now `rifle, pistolSd`.
- Loadout list order (`loadoutScreen.ts` `WEAPON_ORDER`): `pistolSd, rifle`.
- Preset "Loud" (`progression/suit.ts`): `rifle + pistolSd` (was rifle + pistol).
- Weapon audio (`audio/weapons/guns.ts`): `GUNS` entries `fiveseven`, `vector`, `p90`, `tavor`, `dmr`, `shotgun`,
  `breacher`, `crossbow`; `CLASS_GUN` is `{ pistol, rifle, heavy }` (co-op shots carry the class; only rifle and pistol
  classes remain). Weapon lab (`weaponLab.ts`) lists the two kept guns.
- Mastery camos (`cosmetics/catalog.ts`) follow `WEAPON_IDS`, so the deleted guns' `camo:<gun>:<camo>` unlocks are gone.
- HUD icons, pickups, map spawns, shop: no per-gun entries existed (HUD and carry are class-keyed; maps place no guns).

## Enemy guns (AI)
- AI combat is unchanged: guards shoot with `enemies.json` `weapon` (their own numbers) and sound like `GUARD_GUN`.
- `enemies.json` `gun` is only the carried model (`ai/enemyRig.ts`, `WEAPONS[def.gun]`). It pointed at deleted player data, so
  the kept guns stand in (no AI number changes): heavy `smg` -> `rifle`, sniper `sniper` -> `rifle`, droneOp `smg` -> `rifle`,
  enforcer and officer `pistol` -> `pistolSd`. Visible change: those guards now carry the carbine or the suppressed pistol model.
- Kept on purpose: the `GUNS` audio entries the guards use (`GUARD_GUN`: `ak`, `lmg`, `sniper`, `semiShotgun`, `smg`,
  `pistol`) and the shot sprite (`src/assets/sfx/weapons.*`, not re-rendered; it still holds takes only deleted guns used,
  e.g. `ppq`, `ppsh`, `sks`, `nova`, `cd`, the crossbow `bow`).

## Wire / protocol
- `PROTOCOL_VERSION` stays 13 (already bumped in this branch). Weapon ids on the wire (`hello.loadout`, `pstate.w`,
  `shot.w`, `weaponKills`) are validated against `WEAPON_IDS`, so the deleted ids are now rejected / dropped.

## Save (SAVE_VERSION stays 9; the v8 -> v9 migration is extended)
- `migrations.ts` exports `DELETED_GUNS` (each deleted id -> the kept gun of its slot: `pistol`, `fiveseven` ->
  `pistolSd`; the rest -> `rifle`). The v8 -> v9 step now also maps a deleted gun in `loadout` and in every preset to the kept
  gun of its slot, drops the deleted guns' `weapons` entries and their unlocks (`weapon:<gun>`, `camo:<gun>:...`,
  `att:lethalBolts`). The sanitiser then splits a doubled kit (e.g. smg + rifle -> rifle + pistolSd).
- Literal v8 test extended (`tests/save.test.ts`): smg + pistol loadout, an smg progress entry, deleted-gun unlocks and presets.

## Unit tests changed
- `arsenal.test.ts` rewritten for the two-gun kit (campaign lists, order, A62 suppressor, D8 lobby loadout).
- `carry.test.ts`: dimension table for the two kept guns; carry-slot tests use literal class items for classes no gun has now.
- `weapons.test.ts`: validation on the rifle; the shotgun / sniper / SMG role tests replaced by a rifle-vs-pistol check;
  small-magazine rule on a 5-round copy of the pistol.
- `economy.test.ts`, `cosmetics.test.ts`, `progression.test.ts`, `legacy.test.ts`, `net.test.ts`, `medkit.test.ts`,
  `readyHands.test.ts`: deleted ids switched to `rifle` / `pistolSd`; weapon-unlock tests moved to attachment unlocks.
- `save.test.ts`: v1 test expects the smg dropped; v6 -> v7 checks the chosen kit at v7 (`MIGRATIONS[6]`) and the CT kit after v9.
- `weapons-audio.test.ts`: the crossbow release test deleted; the pump line deleted; shell reloads use `semiShotgun` (guards).

## E2E suites changed
- `e2e-combat`: pistol checks on `pistolSd` (magazine 15); the sniper projectile step deleted; one RB back to the rifle.
- `e2e-pad`, `e2e-mouse`: campaign loadout lists are `Heron Carbine` / `Hush 9 SD`; no other gun to equip.
- `e2e-park`: the "locked marksman equips" step deleted; the attachment-without-unlock, reload and import checks use the rifle;
  the `?legacy=1` "locked / buyable weapons show again" check now looks at the rifle's attachments (no gun is locked now).
- `e2e-weapon-audio`: the lab lists 2 guns (was 16, campaign 6); the weapon lab drops its "Sandbox and legacy" row.
- `e2e-weapons-carry`: Free Roam carries 2 guns; the extra loadouts are `pistolSd,rifle` (was three loadouts of deleted guns).
- `e2e-offline`: the v1 save upgrade expects the smg unlock dropped.
- `e2e-progression` (legacy, report only): focuses the rifle; the "buy the SMG" step deleted; A (not Y) customises the
  equipped Hush 9 SD; reload and suppressor checks use the rifle / pistolSd upgrades. Open: it now times out waiting for the
  Hunter match to start (`window.__app.current?.enemyMgr`, 30 s) right after the upgrade purchase, in 2 of 2 solo runs.

## Lost coverage
- Projectile ballistics through a player gun (the sniper e2e step; `kind: 'projectile'` code stays, no gun uses it).
- Pellet guns, pump action audio, the crossbow release and its knock-out hit from a player gun.
- Compact (SMG) and two-long-gun carry slots in e2e (the unit tests keep them with literal items).
- Buying a weapon unlock (parked economy); equipping a gun the profile does not own in the campaign.

## Kept on purpose
- Class-keyed code for classes no gun has now (`carrySlots` compact, `weaponCarry.classWeight`, `PENETRATION`, camera shake,
  casing / muzzle-flash branches, `sfx.gunshot` synth cases, projectile and pellet handling): the rifle's sniper / shotgun /
  launcher attachment modes (later research job) will need them.

## Separate item: e2e-pad capture cancel (stale step)
- `scripts/e2e-pad.mjs` "B held 1 s cancels the capture": the fixed `waitForTimeout(1500)` hold is replaced by holding B
  until `window.__app.input.gamepad.capturing` is false (`waitForFunction`, 8 s timeout), then releasing. Capture code unchanged.
