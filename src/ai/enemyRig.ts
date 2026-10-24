import type { Scene } from '../core/babylon';
import { mergeGun } from './enemyGunMerge';
import { CharacterRig } from '../player/characterRig';
import { WeaponModel } from '../weapons/weaponModel';
import { WEAPONS } from '../weapons/weaponDefs';
import type { CarrySlot } from '../weapons/carrySlots';
import type { World } from '../world/world';
import type { EnemyDef } from './enemyDefs';
import { factionLook } from './factions';
import { CARRY_DRAWING, CARRY_DRAWN, CARRY_HOLSTERED, type GuardCarry } from './carryState';
import { GuardBody, guardModelsFor } from './guardBody';

const ENEMY_GUN = { body: '#2a2d31', grip: '#17191c', accent: '#3a3f45' };

/**
 * Shared enemy body (AI enemies and coop puppets): same rig/animation set as players, built per type. (guard-models
 * G7) With `flags.guardModels` a human guard also gets his `GuardBody` (the operator-pipeline figure over the rig, built
 * right after it: it measures the rig's rest); the merged body draws until the figure's first LOD is in. `figure` is
 * null with `?guardmodels=0` (today's S1 body, untouched) and for the dog. The owner sets its look seed and gear.
 */
export function buildEnemyRig(scene: Scene, world: World, def: EnemyDef, name: string): { rig: CharacterRig; gun: WeaponModel | null; figure: GuardBody | null } {
  const look = factionLook(def.look, def.kind, world.map.theme.faction);
  const rig = new CharacterRig(scene, (shape, hex, slot) => world.parts.instance(shape, hex, `enemy-${slot}`), look, def.height, name, {
    build: def.build,
    armor: def.plated,
    merge: true, // (guard-render S1) one merged smooth mesh (`?guardmerge=0`: the parts)
  });
  rig.guardRows = true; // (item 24, track A) the guard tables (tuneGuard.ts), never Wren's rows
  const figure = guardModelsFor(def) ? new GuardBody(scene, world, def, rig, name) : null;
  for (const m of rig.renderMeshes) world.addShadowCaster(m);
  let gun: WeaponModel | null = null;
  if (def.gun) {
    gun = new WeaponModel(scene, world.parts, WEAPONS[def.gun], ENEMY_GUN, rig.weaponPivot);
    // (perfg) one instance of the gun type's merged mesh instead of its parts (same colours; `?guardmerge=0`: parts)
    const merged = mergeGun(scene, gun, name);
    if (merged) world.addShadowCaster(merged);
    else for (const m of gun.renderMeshes) world.addShadowCaster(m);
    gun.hold(rig);
  }
  return { rig, gun, figure };
}

/**
 * (guard-ai S21) A guard's gun follows his carry (`carryState.ts` GuardCarry, stepped by the brain): holstered it rides
 * in its slot (`WeaponModel.holster`: the rifle slung across the back, the pistol on the right thigh, which sets the rig's
 * `thighGear`); a draw / holster carries it along the player's travel path in the trigger hand (`beginTravel` /
 * `travel`; the sling hands off), then it is held again (`hold`: the aim pocket). Render rate, before the rig animates;
 * no allocation. Co-op puppets pose through it too (A126: `EnemyPuppet` with `net/puppetCarry.ts`).
 */
export class GuardGunCarry {
  private seq = -1;

  constructor(
    private readonly rig: CharacterRig,
    private readonly gun: WeaponModel,
    readonly slot: CarrySlot,
  ) {}

  /** Pose the gun for the carry's phase now. */
  apply(c: GuardCarry): void {
    const g = this.gun;
    const r = this.rig;
    const fresh = c.seq !== this.seq;
    this.seq = c.seq;
    const ph = c.phase;
    if (ph === CARRY_HOLSTERED) {
      if (fresh || g.slot !== this.slot) g.holster(r, this.slot);
    } else if (ph === CARRY_DRAWN) {
      if (fresh || r.heldWeapon !== g.node) g.hold(r);
    } else {
      const travel = g.canTravel(this.slot);
      // a new draw / holster, or a travel cut short meanwhile (a takedown hid the gun): it starts from where the gun is
      if (fresh || (travel && !g.travelling)) {
        if (travel) g.beginTravel(r, this.slot, ph === CARRY_DRAWING);
        else if (ph === CARRY_DRAWING) g.inHand(r);
      }
      if (travel) g.travel(r, c.u);
    }
  }
}
