/**
 * (guard-ai S9) The guards' visible gear, shared by the host's `Enemy` and the co-op client's `EnemyPuppet` so both
 * screens build the same parts: the S12 placeholder helmet and armour plates (A45, built once and then only shown or
 * hidden) and the enforcer's riot shield (by kind). Load time only: nothing here runs per step.
 */
import type { AbstractMesh, InstancedMesh, TransformNode } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { World } from '../world/world';
import type { EnemyDef } from './enemyDefs';
import { factionLook } from './factions';
import { mergeRigGear, mergeStaticParts } from './guardGearMerge';

/** What the builders read from the world: the part library, the shadow list and the map's faction. */
export type GearWorld = Pick<World, 'parts' | 'addShadowCaster' | 'map'>;

/** The helmet's size over the rig's head box (x w, h, d), and so the dropped helmet's (`HelmetDrops.drop`). */
export const HELMET_FIT = { w: 1.26, h: 0.82, d: 1.18 } as const;

/** His faction's helmet / accent colours (the rig's look). */
export function gearColour(def: EnemyDef, world: GearWorld, slot: 'helmet' | 'accent'): string {
  const look = factionLook(def.look, def.kind, world.map.theme.faction);
  return slot === 'helmet' ? look.colors.helmet : look.colors.accent;
}

/** The helmet: the rig's combat-helmet part on his head node (over a cap). */
export function buildHelmetPart(world: GearWorld, rig: CharacterRig, hex: string): InstancedMesh {
  const H = rig.p.head;
  const m = world.parts.instance('helmet', hex, 'enemy-helmet');
  m.parent = rig.headNode;
  m.scaling.set(H.w * HELMET_FIT.w, H.h * HELMET_FIT.h, H.d * HELMET_FIT.d);
  m.position.set(0, H.h * 0.14, -0.006);
  world.addShadowCaster(m);
  return m;
}

/** Body armour: the rig's armour plates (front and back on the torso node, shoulder caps). (guard-models perf S13)
 *  On the S1 merged body: one mesh skinned on its skeleton (`mergeRigGear`), else the 4 part instances; the caller
 *  shows / hides every mesh returned. */
export function buildArmourParts(world: GearWorld, rig: CharacterRig, hex: string): AbstractMesh[] {
  const p = rig.p;
  const parts = world.parts;
  const front = p.chest.d / 2;
  const out: InstancedMesh[] = [];
  const plate = (z: number): void => {
    const m = parts.instance('pill', hex, 'enemy-armour');
    m.parent = rig.torso;
    m.scaling.set(p.chest.w * 0.9, 0.34, 0.07);
    m.position.set(0, 0.1, z);
    out.push(m);
  };
  plate(front + 0.004);
  plate(-front - 0.004);
  for (const side of [-1, 1]) {
    const m = parts.instance('dome', hex, 'enemy-armour');
    m.parent = side < 0 ? rig.shoulderL : rig.shoulderR;
    m.scaling.set(p.upperArm.r0 * 3.2, 0.095, p.upperArm.r0 * 3.2);
    m.position.set(side * 0.01, 0, 0);
    m.rotation.set(0, 0, -side * 0.35);
    out.push(m);
  }
  const merged = mergeRigGear(rig, out, 'enemy-armour');
  if (merged) {
    world.addShadowCaster(merged);
    const lo = merged.getLODLevels()[0]?.mesh;
    if (lo) world.addShadowCaster(lo);
    return [merged];
  }
  for (let i = 0; i < out.length; i++) world.addShadowCaster(out[i]!);
  return out;
}

/** The enforcer's riot shield (with its visor) on his root, in front of his left side. (guard-models perf S13) One
 *  instance of a merged shield + visor source (`mergeStaticParts`), else the two parts. */
export function buildShieldPart(world: Pick<World, 'parts'>, root: TransformNode, scale: number): InstancedMesh {
  const parts = world.parts;
  const sh = parts.instance('rbox', '#20242b', 'shield');
  sh.parent = root;
  sh.scaling.set(0.58, 0.95 * scale, 0.07);
  sh.position.set(-0.08, 1.05 * scale, 0.45);
  const visor = parts.instance('rbox', '#7fb6d9', 'shield-visor');
  visor.parent = sh;
  visor.scaling.set(0.6, 0.12, 0.5);
  visor.position.set(0, 0.32, 0.4);
  return mergeStaticParts(root, [sh, visor], `shield-${scale.toFixed(4)}`, 'shield') ?? sh;
}
