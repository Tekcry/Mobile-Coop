import { Quaternion, TransformNode, Vector3, type AbstractMesh, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { PartLibrary, PartPattern } from '../world/partLibrary';
import { modelExtents, type ModelExtents, type WeaponDef } from './weaponDefs';
import { BACK_SPLAY, isBackSlot, type CarrySlot } from './carrySlots';

export interface WeaponColors {
  body: string;
  grip: string;
  accent: string;
}

export const DEFAULT_WEAPON_COLORS: WeaponColors = { body: '#2d3238', grip: '#1a1c20', accent: '#4c555f' };

/** Gap (m) between a carried weapon and the body or gear it rests against. */
const CARRY_GAP = 0.012;
/** Back carry: muzzle-up guns side by side (thin side to the back), butts at this height on the chest. */
const BACK_X = 0.07;
const BACK_BUTT_Y = -0.4;
/** A centre back gun keeps its bore at least this far (m) behind its top surface's rest plane (head clearance). */
const CENTRE_CLEAR = 0.09;
/** Sling: the hanging gun splays out from the leg (rad), more than the thigh swings out on a side-step. */
const SLING_SPLAY = 0.12;
/** Kept this much (rad) outside the thigh when the leg swings the gun out. */
const SLING_MARGIN = 0.12;

const ax = new Vector3();
const ay = new Vector3();
const az = new Vector3();

/** Builds a weapon from its data-driven primitive parts (instanced). */
export class WeaponModel {
  readonly node: TransformNode;
  readonly parts: AbstractMesh[] = [];
  readonly muzzleLocal: Vector3;
  /** Weapon-local extents of the model (carry placement, clip checks). */
  readonly ext: ModelExtents;
  /** Carry slot when holstered (null = in the hands or hidden). */
  slot: CarrySlot | null = null;
  private magLocal: Vector3 | null = null;

  constructor(scene: Scene, lib: PartLibrary, readonly def: WeaponDef, colors: WeaponColors, parent: TransformNode, pattern?: PartPattern) {
    this.node = new TransformNode(`wpn-${def.id}`, scene);
    this.node.parent = parent;
    this.node.rotationQuaternion = Quaternion.Identity();
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
      // the off hand's reload point: the top of the magazine well
      if (p.role === 'mag') this.magLocal = new Vector3(p.pos[0], p.pos[1] + p.size[1] * 0.3, p.pos[2]);
    }
    // finer detail on long guns: an ejection port on the right of the receiver and a top rail under the optic
    const rec = def.model.find((p) => p.role === 'receiver');
    if (rec && def.class !== 'pistol' && def.class !== 'crossbow') {
      const [w, h, l] = rec.size;
      const [x, y, z] = rec.pos;
      const detail = (hex: string, sx: number, sy: number, sz: number, px: number, py: number, pz: number): void => {
        const m = lib.instance('rbox', hex, `wpn-${def.id}-part`);
        m.parent = this.node;
        m.scaling.set(sx, sy, sz);
        m.position.set(px, py, pz);
        this.parts.push(m);
      };
      detail('#0d0e10', 0.006, h * 0.32, l * 0.22, x + w / 2 + 0.002, y + h * 0.12, z + l * 0.08);
      if (def.class !== 'shotgun') detail(colors.grip, w * 0.55, 0.012, l * 0.62, x, y + h / 2 + 0.005, z);
    }
    this.muzzleLocal = new Vector3(...def.muzzle);
    this.ext = modelExtents(def);
  }

  /** In the hands: parented to the rig's aim pocket, with the hands IK'd to its grips. */
  hold(rig: CharacterRig): void {
    this.slot = null;
    this.track(rig, false);
    this.node.parent = rig.weaponPivot;
    this.node.position.setAll(0);
    this.node.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    rig.grip.set(...this.def.grip);
    rig.foregrip.set(...this.def.foregrip);
    const e = this.ext;
    rig.gunSpan.z0 = e.z0;
    rig.gunSpan.z1 = e.z1;
    rig.gunSpan.bore = this.def.muzzle[1];
    rig.gunSpan.top = e.y1;
    if (this.magLocal) rig.magPoint.copyFrom(this.magLocal);
    else rig.magPoint.set(0, this.def.grip[1] - 0.08, (this.def.grip[2] + this.def.foregrip[2]) * 0.5);
    rig.heldWeapon = this.node;
    this.setVisible(true);
  }

  /** Mid-swap: in the right hand (grip at the palm) on its way from its slot to the aim pocket. */
  inHand(rig: CharacterRig): void {
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    this.slot = null;
    this.track(rig, false);
    this.node.parent = rig.weaponSocket;
    this.node.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    this.node.position.set(-this.def.grip[0], -this.def.grip[1], -this.def.grip[2]);
    this.setVisible(true);
  }

  /**
   * Carried in a slot (see `carrySlots`): long guns vertically on the back, muzzle up, thin side to the
   * back and the magazine pointing away, splayed a little from the butt; compact guns on the left-hip
   * sling (splayed clear of the leg) and the pistol low on the right thigh, muzzle down, flat to the body. Placement stands off
   * the body and any back gear (`rig.backGear`) so nothing clips.
   */
  holster(rig: CharacterRig, slot: CarrySlot): void {
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    this.slot = slot;
    this.track(rig, slot === 'sling');
    const e = this.ext;
    const p = rig.p;
    const n = this.node;
    if (isBackSlot(slot)) {
      const side = slot === 'backL' ? -1 : slot === 'backR' ? 1 : 0;
      const a = side * BACK_SPLAY;
      // muzzle up (splayed outward), top of the gun towards the body, thin side flat to the back
      az.set(Math.sin(a), Math.cos(a), 0);
      ay.set(0, 0, 1);
      Vector3.CrossToRef(ay, az, ax);
      n.parent = rig.torso;
      Quaternion.RotationQuaternionFromAxisToRef(ax, ay, az, n.rotationQuaternion!);
      // the butt and the top surface rest at the slot point
      const sx = side * BACK_X;
      const sy = BACK_BUTT_Y;
      // the centre gun passes behind the head: one whose bore runs near its top (no optic above it) stands off more
      const sz = -p.chest.d / 2 - rig.backGear - CARRY_GAP - (side === 0 ? Math.max(0, CENTRE_CLEAR - (e.y1 - this.def.muzzle[1])) : 0);
      n.position.set(sx - ay.x * e.y1 - az.x * e.z0, sy - ay.y * e.y1 - az.y * e.z0, sz - ay.z * e.y1 - az.z * e.z0);
    } else if (slot === 'sling') {
      n.parent = rig.hips;
      this.placeSling(rig, SLING_SPLAY);
    } else {
      // right thigh, low: muzzle down, top of the gun forward, thin side flat against the thigh (moves with it)
      az.set(0, -1, 0);
      ay.set(0, 0, 1);
      Vector3.CrossToRef(ay, az, ax);
      n.parent = rig.hipR;
      Quaternion.RotationQuaternionFromAxisToRef(ax, ay, az, n.rotationQuaternion!);
      const half = (e.x1 - e.x0) / 2;
      const sx = rig.thighOuter + CARRY_GAP + half;
      const cy = -0.25;
      const yc = (e.y0 + e.y1) / 2;
      const zc = (e.z0 + e.z1) / 2;
      n.position.set(sx - ax.x * ((e.x0 + e.x1) / 2), cy - az.y * zc, -ay.z * yc);
    }
    this.setVisible(true);
  }

  /** Left-hip sling: muzzle down, top forward, thin side to the hip, splayed out by `splay` (rad). */
  private placeSling(rig: CharacterRig, splay: number): void {
    const e = this.ext;
    const n = this.node;
    az.set(-Math.sin(splay), -Math.cos(splay), 0);
    ay.set(0, 0, 1);
    Vector3.CrossToRef(ay, az, ax);
    Quaternion.RotationQuaternionFromAxisToRef(ax, ay, az, n.rotationQuaternion!);
    // pivot: the inner face of the stock end, just outside the thigh at belt height
    const yc = (e.y0 + e.y1) / 2;
    const px = -(rig.p.hipHalf + rig.thighOuter + CARRY_GAP);
    const py = -0.02;
    const pz = -0.02;
    n.position.set(px - ax.x * e.x1 - ay.x * yc - az.x * e.z0, py - ax.y * e.x1 - ay.y * yc - az.y * e.z0, pz - ax.z * e.x1 - ay.z * yc - az.z * e.z0);
  }

  /**
   * After each pose: the slung gun swings out with the left thigh when the leg pushes it (a side-step
   * can take the thigh well past the resting splay), and settles back when it does not.
   */
  private follow(): void {
    const rig = this.rig;
    if (!rig || this.slot !== 'sling') return;
    rig.hipL.getDirectionToRef(Vector3.DownReadOnly, ax);
    rig.hips.getDirectionToRef(Vector3.RightReadOnly, ay);
    // outward (to the left) swing of the thigh in the pelvis frame
    const out = -Math.asin(Math.max(-1, Math.min(1, ax.x * ay.x + ax.y * ay.y + ax.z * ay.z)));
    const want = Math.max(SLING_SPLAY, out + SLING_MARGIN);
    // pushed out at once, swings back with a little damping
    this.splay = want > this.splay ? want : this.splay + (want - this.splay) * 0.15;
    this.placeSling(rig, this.splay);
  }

  private rig: CharacterRig | null = null;
  private splay = SLING_SPLAY;
  private readonly followFn = (): void => this.follow();

  private track(rig: CharacterRig, on: boolean): void {
    const list = rig.onPosed;
    const k = list.indexOf(this.followFn);
    if (on && k < 0) list.push(this.followFn);
    if (!on && k >= 0) list.splice(k, 1);
    this.rig = on ? rig : null;
    this.splay = SLING_SPLAY;
  }

  setVisible(v: boolean): void {
    this.node.setEnabled(v);
  }

  muzzleWorld(out: Vector3): Vector3 {
    this.node.computeWorldMatrix(true);
    return Vector3.TransformCoordinatesToRef(this.muzzleLocal, this.node.getWorldMatrix(), out);
  }

  dispose(): void {
    if (this.rig) this.track(this.rig, false);
    for (const m of this.parts) m.dispose();
    this.node.dispose();
  }
}
