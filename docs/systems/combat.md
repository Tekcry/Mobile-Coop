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
