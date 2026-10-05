import { TransformNode, Vector3, type AbstractMesh, type Scene } from '../core/babylon';
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

  constructor(scene: Scene, lib: PartLibrary, def: WeaponDef, colors: WeaponColors, parent: TransformNode, pattern?: PartPattern) {
    this.node = new TransformNode(`wpn-${def.id}`, scene);
    this.node.parent = parent;
    for (const p of def.model) {
      const hex = p.color === 'body' || p.color === 'grip' || p.color === 'accent' ? colors[p.color] : p.color;
      const m = lib.instance(p.shape, hex, `wpn-${def.id}-part`, p.color === 'body' ? pattern : undefined);
      m.parent = this.node;
      m.scaling.set(...p.size);
      m.position.set(...p.pos);
      if (p.rot) m.rotation.set(...p.rot);
      this.parts.push(m);
    }
    this.muzzleLocal = new Vector3(...def.muzzle);
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
