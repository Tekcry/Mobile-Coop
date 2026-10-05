import { TransformNode, Vector3, type AbstractMesh, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { PartLibrary, PartPattern } from '../world/partLibrary';
import type { WeaponDef } from './weaponDefs';

export interface WeaponColors {
  body: string;
  grip: string;
  accent: string;
}

export const DEFAULT_WEAPON_COLORS: WeaponColors = { body: '#2d3238', grip: '#1a1c20', accent: '#4c555f' };

/** Builds a weapon from its data-driven primitive parts (instanced). */
export class WeaponModel {
  readonly node: TransformNode;
  readonly parts: AbstractMesh[] = [];
  readonly muzzleLocal: Vector3;

  constructor(scene: Scene, lib: PartLibrary, readonly def: WeaponDef, colors: WeaponColors, parent: TransformNode, pattern?: PartPattern) {
    this.node = new TransformNode(`wpn-${def.id}`, scene);
    this.node.parent = parent;
    for (const p of def.model) {
      const hex = p.color === 'body' || p.color === 'grip' || p.color === 'accent' ? colors[p.color] : p.color;
      // authored boxes/cylinders render with rounded edges
      const shape = p.shape === 'box' ? 'rbox' : p.shape === 'cyl' ? 'rcyl' : p.shape;
      const m = lib.instance(shape, hex, `wpn-${def.id}-part`, p.color === 'body' ? pattern : undefined);
      m.parent = this.node;
      m.scaling.set(...p.size);
      m.position.set(...p.pos);
      if (p.rot) m.rotation.set(...p.rot);
      this.parts.push(m);
    }
    this.muzzleLocal = new Vector3(...def.muzzle);
  }

  /** In the hands: parented to the rig's aim pocket, with the hands IK'd to its grips. */
  hold(rig: CharacterRig): void {
    this.node.parent = rig.weaponPivot;
    this.node.position.setAll(0);
    this.node.rotation.setAll(0);
    rig.grip.set(...this.def.grip);
    rig.foregrip.set(...this.def.foregrip);
    rig.magPoint.set(0, this.def.grip[1] - 0.08, (this.def.grip[2] + this.def.foregrip[2]) * 0.5);
    rig.heldWeapon = this.node;
    this.setVisible(true);
  }

  /** Holstered: pistols on the right hip, long guns slung across the back. */
  holster(rig: CharacterRig): void {
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    const hip = this.def.slot === 'secondary';
    this.node.parent = hip ? rig.hipSocket : rig.backSocket;
    this.node.rotation.setAll(0);
    // centre long guns on the back (muzzle up/out to the side)
    this.node.position.set(0, 0, hip ? -0.03 : -this.def.muzzle[2] * 0.45);
    this.setVisible(true);
  }

  get holsterSlot(): 'hip' | 'back' {
    return this.def.slot === 'secondary' ? 'hip' : 'back';
  }

  setVisible(v: boolean): void {
    this.node.setEnabled(v);
  }

  muzzleWorld(out: Vector3): Vector3 {
    this.node.computeWorldMatrix(true);
    return Vector3.TransformCoordinatesToRef(this.muzzleLocal, this.node.getWorldMatrix(), out);
  }

  dispose(): void {
    for (const m of this.parts) m.dispose();
    this.node.dispose();
  }
}
