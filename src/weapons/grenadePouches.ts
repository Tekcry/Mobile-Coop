import type { AbstractMesh } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { PartLibrary } from '../world/partLibrary';
import { GRENADE_POUCHES } from './carrySlots';

/**
 * Grenade pouches on the front of the belt (left of centre, clear of the left-hip sling and the
 * thigh holster): one pouch each, with the grenade's top showing while it is carried. Instanced parts
 * of the shared library, so they cost no extra draw calls.
 */
export class GrenadePouches {
  readonly parts: AbstractMesh[] = [];
  private grenades: AbstractMesh[] = [];
  /** Grenades shown. */
  count = -1;

  constructor(lib: PartLibrary, rig: CharacterRig, count = GRENADE_POUCHES) {
    const p = rig.p;
    const z = p.pelvis.d / 2 + 0.02;
    for (let i = 0; i < GRENADE_POUCHES; i++) {
      const x = -0.13 + i * 0.065;
      const pouch = lib.instance('rcyl', '#2f3329', 'pouch');
      pouch.parent = rig.hips;
      pouch.scaling.set(0.058, 0.07, 0.05);
      pouch.position.set(x, 0.05, z);
      const g = lib.instance('sphere', '#3d4a2c', 'pouch-grenade');
      g.parent = rig.hips;
      g.scaling.setAll(0.05);
      g.position.set(x, 0.09, z);
      this.parts.push(pouch, g);
      this.grenades.push(g);
    }
    this.setCount(count);
  }

  setCount(n: number): void {
    if (n === this.count) return;
    this.count = n;
    for (let i = 0; i < this.grenades.length; i++) this.grenades[i]!.setEnabled(i < n);
  }

  dispose(): void {
    for (const m of this.parts) m.dispose();
  }
}
