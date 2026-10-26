/**
 * (feature/weapons, A5) The knife in the hand: CT's close lethal option, always carried (research 1.11). Wren wears it
 * sheathed on her left thigh (part of her mesh), so this model shows only when drawn: in the right fist, the blade out
 * of the thumb side, the edge towards the knuckles, the handle across the palm. The game has no knife verb yet; `show`
 * is the hook for it (and for the review screenshots). Render only.
 */
import { Quaternion, TransformNode, Vector3, type AbstractMesh, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { HandFrame } from '../player/handHold';
import { loadWeaponMesh } from './weaponMesh';

/** (piano-knife S1) The blade tip in the knife's frame (m): `points.tip` of `assets/knife.json` (the GLB's frame, the
 *  grip at the origin, the blade along z: 0.145 m). */
export const KNIFE_TIP = [0, 0.0015, 0.145] as const;

/** The handle sits this far (m) off the palm centre towards the palm: inside the closed fist. */
const PALM_IN = 0.016;

export class KnifeModel {
  readonly node: TransformNode;
  private shown = false;
  private disposed = false;

  constructor(scene: Scene, private readonly rig: CharacterRig, hand: HandFrame, caster?: (m: AbstractMesh) => void) {
    this.node = new TransformNode('knife', scene);
    this.node.parent = rig.wristR;
    // the knife frame in the wrist's rest frame: blade (z) out of the thumb side, spine (y) back to the wrist
    const d = new Vector3(...hand.d).normalize();
    const n = new Vector3(...hand.n).normalize();
    const z = Vector3.Cross(d, n).normalize().scaleInPlace(-1);
    const y = d.scale(-1);
    const x = Vector3.Cross(y, z).normalize();
    this.node.rotationQuaternion = Quaternion.RotationQuaternionFromAxis(x, y, z);
    this.node.position.set(hand.palm[0] + n.x * PALM_IN, hand.palm[1] + n.y * PALM_IN, hand.palm[2] + n.z * PALM_IN);
    this.node.setEnabled(false);
    loadWeaponMesh(scene, 'knife', this.node, () => !this.disposed, (m) => caster?.(m));
  }

  /** Drawn (in the right fist, the hand closed) or away (only the sheathed one on her thigh shows). */
  show(on: boolean): void {
    this.shown = on;
    this.node.setEnabled(on);
    this.rig.holdingKnife = on;
  }

  /** (piano-knife S1) The blade tip in world space this frame (from the node and the blade length, KNIFE_TIP), into
   *  `out`. No allocation. */
  tipWorld(out: Vector3): Vector3 {
    const m = this.node.computeWorldMatrix(true);
    return Vector3.TransformCoordinatesFromFloatsToRef(KNIFE_TIP[0], KNIFE_TIP[1], KNIFE_TIP[2], m, out);
  }

  get visible(): boolean {
    return this.shown;
  }

  dispose(): void {
    this.disposed = true;
    this.rig.holdingKnife = false;
    this.node.dispose();
  }
}
