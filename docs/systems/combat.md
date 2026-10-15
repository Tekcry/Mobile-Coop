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

## Medkits (locomotion step 15, bible 5.13)

- Health 100, no regeneration. A medkit heals 40 linearly over 1.5 s (2.0 s on a team-mate, H2 / C14: `useMedkit` target API, only self wired). Pure: `src/game/medkit.ts` (`MEDKIT`, `MedkitUse`, `medkitCarry`, `addKit`, `medkitDenial`); controller `src/game/medkitController.ts`.
- Carry: `DifficultyDef.medkits` (Rookie 3, others 2); the host's difficulty applies in co-op. Respawns keep the count; checkpoint health is mission-framework work.
- Use: `medkit` action (pad X held 0.4 s while not aiming, A55; KBM H; no touch control, D1). Standing or crouched, grounded and free; movement locked, the weapon holstered (`forceHolster`, `handsBusy`). Aim, jump or sprint cancels: the kit is not spent and the heal so far is taken back; damage interrupts: the kit is spent, the heal so far stays (A56). No use at full health or with 0 kits.
- Pickups: the `medkit` crate gives one kit up to the carry max (a full carrier walks over it). Wall station `medkitWall` (Proving Grounds only, `MapLayout.medkitWalls`): hold 0.6 s, +1 kit, single use, shown spent.
