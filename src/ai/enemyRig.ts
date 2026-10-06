import type { Scene } from '../core/babylon';
import { CharacterRig } from '../player/characterRig';
import { WeaponModel } from '../weapons/weaponModel';
import { WEAPONS } from '../weapons/weaponDefs';
import type { World } from '../world/world';
import type { EnemyDef } from './enemyDefs';
import { factionLook } from './factions';

const ENEMY_GUN = { body: '#2a2d31', grip: '#17191c', accent: '#3a3f45' };

/** Shared enemy body (AI enemies and coop puppets): same rig/animation set as players, built per type. */
export function buildEnemyRig(scene: Scene, world: World, def: EnemyDef, name: string): { rig: CharacterRig; gun: WeaponModel | null } {
  const look = factionLook(def.look, def.kind, world.map.theme.faction);
  const rig = new CharacterRig(scene, (shape, hex, slot) => world.parts.instance(shape, hex, `enemy-${slot}`), look, def.height, name, {
    build: def.build,
    armor: def.plated,
  });
  for (const m of rig.parts) world.addShadowCaster(m);
  let gun: WeaponModel | null = null;
  if (def.gun) {
    gun = new WeaponModel(scene, world.parts, WEAPONS[def.gun], ENEMY_GUN, rig.weaponPivot);
    for (const m of gun.parts) world.addShadowCaster(m);
    gun.hold(rig);
  }
  return { rig, gun };
}
