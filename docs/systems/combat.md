# Combat
Purpose: weapon data, firing, damage and the HUD rules for combat.
Design authority: docs/design-bible.md (Section 5.6)

## Combat
- Weapon content is JSON (`config/weapons.json`), validated by `validateWeaponDefs`; maths in
  `weapons/weaponStats.ts` (pure). Add a weapon: JSON entry + id in `WEAPON_IDS`.
- `PlayerWeapons` (fixed step) owns fire/reload/swap/grenades; `Ballistics` owns rays and pooled swept
  projectiles; `Explosions` queues detonations (never recursive); `Vfx` pools every effect.
- Anything shootable implements `Damageable` and registers its bodies with `DamageRegistry`.
- HUD (`ui/hud/hud.ts`) only writes DOM when a value changes; minimap redraws at 20 Hz.
- (step 09, A20 / A41) Holstered unless aiming: `weapons/drawState.ts` (pure) holds the draw phase (0 holstered,
  1 drawing, 2 drawn, 3 holstering; draw 0.3 s pistol / 0.4 s primary, holster 0.4 s, a release mid-draw reverses
  from the current progress). Aim pressed draws, released holsters, in every alert state. `PlayerWeapons` drives the
  existing stow path from it (the swap timeline paced to the draw state; weapon-to-weapon swaps keep `SWAP_TIME` 0.9,
  RB swaps while aiming too, a swap while holstered only changes the selection). A match starts holstered. Attached
  stow and the one-handed sidearm (split, rappel, inverted pipe, hostage) win over aim. Grenades and gadgets work
  holstered.
- No hip fire: a shot needs the drawn phase and `cam.ads >= 0.9` (`fireReady`); fire while holstered does nothing
  (no shot, dry click or bloom; step 10 binds the elbow strike there). Fire no longer raises aim (`player.ts`).
  The crosshair shows only drawn and aiming.
- Player spread (`playerSpreadDeg`, weaponStats.ts): base `spreadAds`; crouched and still x0.7; standing still x1;
  moving adds `spreadMove x min(speed, 2.8) / 2.8`; bloom on top, capped at `maxSpread`. `spreadHip` and the hip-fire
  attachment mods stay for guards and parked modes only.
- Mouse: a second button pressed while another is held arrives as a chorded `pointermove` (no `pointerdown`);
  `keyboardMouseSource` reads it, so RMB held then LMB fires.

## Arsenal (locomotion step 16, bible 5.6)
- Original names only (A28): ids are unchanged (no save change), the data `name` and every UI string are new.
  `tests/weaponNames.test.ts` bans real makers, model designations and SC terms in the names.
- `config/arsenal.ts` (pure): `CAMPAIGN_ARSENAL` = primary `rifle`, `smg`, `shotgun`, `dmr`; sidearm `pistolSd`,
  `pistol`; defaults `rifle` + `pistolSd`. The non-lethal dart sidearm is reserved there, not built (it needs a
  knockout hit kind). `campaignLoadout(lo)` maps a loadout onto the set at use (an off-set id becomes its slot
  default; always one primary + one sidearm; the save's order is kept, so the issued kit still starts on the
  sidearm). `profile.loadoutEntries` applies it in Infiltration only; sandbox keeps its fixed set, `?loadout=a,b`
  bypasses it, the co-op lobby's loadout validation is unchanged.
- Loadout screen: the campaign lists only the set (rows Primary = the long gun, Sidearm), `?legacy=1` all 16 in
  `WEAPON_ORDER`.
- Suppressor: every firearm but the shotguns (`shotgun`, `semiShotgun`, `breacher`) and the crossbow. `pistolSd`
  ships suppressed (integral, `noise` 0.35).
- Marksman: `dmr` keeps its ADS zoom; hold breath does not exist yet (Phase 6, REVIEW.md).

| id | name | campaign |
| --- | --- | --- |
| rifle | Heron Carbine | primary, suppressed rifle (default) |
| smg | Marten 9 SMG | primary, suppressed SMG |
| shotgun | Mason 12 Pump | primary, shotgun (close, loud) |
| dmr | Spotter 7.62 Marksman | primary, marksman (zoom) |
| pistolSd | Hush 9 SD | sidearm, suppressed pistol (default) |
| pistol | Warden .45 | sidearm, heavy pistol |
| fiveseven | Kite 5.7 | unused |
| vector | Ferret .45 SMG | unused |
| p90 | Swift 5.7 PDW | unused |
| ak | Steppe 5.45 Rifle | unused |
| tavor | Ibex Bullpup | unused |
| semiShotgun | Talon 12 Semi | unused |
| sniper | Ridgeline Bolt | unused |
| lmg | Anvil 5.56 LMG | unused |
| breacher | Breacher | unused |
| crossbow | Silent Crossbow | unused |

## Medkits (locomotion step 15, bible 5.13)

- Health 100, no regeneration. A medkit heals 40 linearly over 1.5 s (2.0 s on a team-mate, H2 / C14: `useMedkit` target API, only self wired). Pure: `src/game/medkit.ts` (`MEDKIT`, `MedkitUse`, `medkitCarry`, `addKit`, `medkitDenial`); controller `src/game/medkitController.ts`.
- Carry: `DifficultyDef.medkits` (Rookie 3, others 2); the host's difficulty applies in co-op. Respawns keep the count; checkpoint health is mission-framework work.
- Use: `medkit` action (pad X held 0.4 s while not aiming, A55; KBM H; no touch control, D1). Standing or crouched, grounded and free; movement locked, the weapon holstered (`forceHolster`, `handsBusy`). Aim, jump or sprint cancels: the kit is not spent and the heal so far is taken back; damage interrupts: the kit is spent, the heal so far stays (A56). No use at full health or with 0 kits.
- Pickups: the `medkit` crate gives one kit up to the carry max (a full carrier walks over it). Wall station `medkitWall` (Proving Grounds only, `MapLayout.medkitWalls`): hold 0.6 s, +1 kit, single use, shown spent.
