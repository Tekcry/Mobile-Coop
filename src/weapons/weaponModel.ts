import { Matrix, Quaternion, TransformNode, Vector3, type AbstractMesh, type InstancedMesh, type Material, type Mesh, type Scene } from '../core/babylon';
import { VoxelGroup, type VoxelGroupOptions } from '../voxel/voxelGroup';
import { hyp3 } from '../core/mathx';
import type { CharacterRig } from '../player/characterRig';
import type { PartLibrary, PartPattern } from '../world/partLibrary';
import { modelExtents, type ModelExtents, type WeaponDef } from './weaponDefs';
import { BACK_SPLAY, isBackSlot, type CarrySlot } from './carrySlots';
import { loadWeaponMesh } from './weaponMesh';
import { diagTurn, diagTurnSling, useDiagTurn, FRAME_DOWN, FRAME_UP, planeFrame, slungPosition, slungTheta, type DiagKey, type DiagTurnStep } from './backDiag';

/** (feature/weapons) The built mesh instead of the primitive parts (A6, A7): the players' guns, not the guards'. */
export interface WeaponMeshOptions {
  /** Load the kit item's baked mesh (weaponMesh.ts); the parts show until it is in, then hide. No voxel model. */
  mesh?: boolean;
  /** Gets the mesh when it arrives (shadow casters: the parts were registered at construction). */
  caster?: (m: AbstractMesh) => void;
}

export interface WeaponColors {
  body: string;
  grip: string;
  accent: string;
}

export const DEFAULT_WEAPON_COLORS: WeaponColors = { body: '#2d3238', grip: '#1a1c20', accent: '#4c555f' };

/** Gap (m) between a carried weapon and the body or gear it rests against. */
const CARRY_GAP = 0.012;
/** (feature/weapons) The back stud's head sits this far (m) inside the socket's face (the keyhole's depth). */
const STUD_SEAT = -0.002;
/** (21w, PC-PASS 42) The weapon's last posed world matrix before a re-parent (scratch, no allocation). */
const glideM = new Matrix();
/** Back carry: muzzle-up guns side by side (thin side to the back), butts at this height on the chest. */
const BACK_X = 0.07;
const BACK_BUTT_Y = -0.4;
/** A centre back gun keeps its bore at least this far (m) behind its top surface's rest plane (head clearance). */
const CENTRE_CLEAR = 0.09;
/** Sling: the hanging gun splays out from the leg (rad), more than the thigh swings out on a side-step. */
const SLING_SPLAY = 0.12;
/** Kept this much (rad) outside the thigh when the leg swings the gun out. */
const SLING_MARGIN = 0.12;
/** The sling hangs this far (m) outside the thigh (the detailed body's hip and cargo pocket swing in a side-step). */
const SLING_GAP = 0.035;

/** 3.0 voxel weapons (null: the smooth parts render, e.g. `?gfx=min`). */
let VOXEL_WEAPONS: VoxelGroupOptions | null = null;
export function setVoxelWeapons(o: VoxelGroupOptions | null): void {
  VOXEL_WEAPONS = o;
}

const ax = new Vector3();
const ay = new Vector3();
const az = new Vector3();

/**
 * (anim-cleanup) Draw / holster travel: the gun goes between the aim pocket and its slot along a path, carried by the
 * trigger hand on its grip (Michael: "Must holster without clipping"). In the chest frame (x right, y up, z forward,
 * metres) the grip passes near this point: (ct-prototype D1) out at the right shoulder for a back slot (was [0.28, 0.3,
 * 0.08], beside the head: the hand rose above the shoulder), never across the face; out beside the right hip for the thigh
 * holster.
 */
export const TRAVEL_VIA = { back: [0.36, 0.15, 0.18], thigh: [0.24, -0.1, 0.34], sling: [0.3, -0.22, 0.14] } as const;
/**
 * (anim-rework S3, M2) The sling draw's grip waypoint (chest frame, m) is `TRAVEL_VIA.sling`: low beside the right hip,
 * a little forward, under the arm (the gun hangs muzzle down there before it swings up into the shoulder), clear of the
 * right thigh. Only a long gun drawn from the diagonal back sling by LT from holstered takes it (`beginTravel` sling).
 */
/**
 * (anim-cleanup, check fix r1) At the slot end the grip first moves out by this much (chest frame): off the back plate to
 * the right of the spine before it rises (a long gun lifted straight up from the back mount passed through the back of
 * her head), out from the thigh before it turns.
 */
export const TRAVEL_OUT = { back: [0.2, 0.02, -0.06], thigh: [0.1, 0.02, 0.06] } as const;
/**
 * (ct-prototype D1) A long gun turns to its slot's orientation spread over the whole path (was 60 %: with the waypoint
 * at shoulder height, y 0.15 (was 0.3, head height), the hand stays below the shoulder line and the turn need not
 * finish early).
 */
const TRAVEL_TURN = 0.95;
/**
 * (ct-prototype D1) A draw waits in the slot until the trigger hand is on the grip (wrist within this many metres of the
 * grip point), at most until this share of the travel: the gun never leaves the holster ahead of the hand. The rest of
 * the travel then runs over the time left (the draw's total time is kept).
 */
const CATCH_DIST = 0.13;
const CATCH_MAX = 0.4;
const catchP = new Vector3();
const trInv = new Matrix();
const trM = new Matrix();
const trS = new Vector3();
const trP = new Vector3();
const trQ = new Quaternion();
const trG0 = new Vector3();
const trG1 = new Vector3();
const trG = new Vector3();
const QUAT_ID = Quaternion.Identity();
/** (G2) Diagonal sling scratch (no allocation in the travel). */
const dStep: DiagTurnStep = { kind: 0, theta: 0, t: 0, from: 'start', to: 'end' };
const dFrame: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const dPos: number[] = [0, 0, 0];
const dqA = new Quaternion();
const dqB = new Quaternion();
const dAx = new Vector3();
const dAy = new Vector3();
const dAz = new Vector3();
/** A gun frame (x, y, z axes, 9 numbers) as a rotation. */
function frameQuat(f: readonly number[], q: Quaternion): Quaternion {
  dAx.set(f[0]!, f[1]!, f[2]!);
  dAy.set(f[3]!, f[4]!, f[5]!);
  dAz.set(f[6]!, f[7]!, f[8]!);
  Quaternion.RotationQuaternionFromAxisToRef(dAx, dAy, dAz, q);
  return q;
}

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

  constructor(scene: Scene, lib: PartLibrary, readonly def: WeaponDef, colors: WeaponColors, parent: TransformNode, pattern?: PartPattern, opts: WeaponMeshOptions = {}) {
    this.node = new TransformNode(`wpn-${def.id}`, scene);
    this.node.parent = parent;
    this.node.rotationQuaternion = Quaternion.Identity();
    // (anim-cleanup) the travel target: the slot's (or the aim pocket's) pose, placed like the weapon
    this.ghost = new TransformNode(`wpn-${def.id}-travel`, scene);
    this.ghost.rotationQuaternion = Quaternion.Identity();
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
    if (rec && def.class !== 'pistol') {
      const [w, h, l] = rec.size;
      const [x, y, z] = rec.pos;
      const detail = (hex: string, sx: number, sy: number, sz: number, px: number, py: number, pz: number): void => {
        const m = lib.instance('rbox', hex, `wpn-${def.id}-part`);
        m.parent = this.node;
        m.scaling.set(sx, sy, sz);
        m.position.set(px, py, pz);
        this.parts.push(m);
      };
      // (set into the receiver's faces, so the carried model's extents - and the slot clearances - stay the same)
      detail('#0d0e10', 0.006, h * 0.32, l * 0.22, x + w / 2 - 0.0025, y + h * 0.12, z + l * 0.08);
      if (def.class !== 'shotgun') detail(colors.grip, w * 0.55, 0.012, l * 0.62, x, y + h / 2 - 0.0055, z);
    }
    this.muzzleLocal = new Vector3(...def.muzzle);
    this.ext = modelExtents(def);
    // voxels (3.0): one rigid voxel mesh under the weapon's node (the parts stay, unseen)
    const skin = ((this.parts[0] as InstancedMesh | undefined)?.sourceMesh?.metadata as { skinMaterial?: Material } | null | undefined)?.skinMaterial;
    // (feature/weapons) the baked mesh replaces the parts once loaded; such a weapon never builds a voxel model (A7)
    const meshed = opts.mesh === true && loadWeaponMesh(scene, def.id, this.node, () => !this.disposed, (m, mag) => this.useMesh(m, mag, opts.caster), () => (this.meshWanted = false));
    this.meshWanted = meshed;
    if (VOXEL_WEAPONS && skin && !meshed) this.voxel = new VoxelGroup(scene, this.node, this.parts, skin, `wpn-${def.id}`, VOXEL_WEAPONS);
  }

  /** The baked mesh once loaded (null: the parts or the voxel model render). */
  mesh: Mesh | null = null;
  private disposed = false;
  /** A baked mesh was asked for and has neither loaded nor failed yet. */
  private meshWanted = false;

  /** (menu-notes note 2) The baked mesh is still on its way (the menu's load screen waits for it). */
  get meshPending(): boolean {
    return this.meshWanted && !this.mesh && !this.disposed;
  }

  private useMesh(m: Mesh, mag: Mesh | null, caster?: (m: AbstractMesh) => void): void {
    this.mesh = m;
    this.magMesh = mag;
    for (const p of this.parts) p.setEnabled(false);
    caster?.(m);
    if (mag) caster?.(mag);
  }

  /** (anim-cleanup) The magazine mesh (seated in the gun unless a reload has it in the hand). */
  magMesh: Mesh | null = null;
  private magInHand = false;
  private magSeating = false;
  private readonly magP0 = new Vector3();
  private readonly magQ0 = new Quaternion();

  /**
   * (anim-cleanup) The magazine through a reload at progress `rt` (0..1) with its clip's beats: in the gun until
   * `magOut`, then in the left hand (where it was gripped, so it moves with the hand to the pouch and back: the swap at
   * the pouch is the same mesh), blended into the well over the last stretch before `magIn`, seated from `magIn` on.
   * `rt` < 0: no reload (seated at once).
   */
  magFollow(rig: CharacterRig, rt: number, magOut: number, magIn: number): void {
    const mag = this.magMesh;
    if (!mag) return;
    const SEAT = 0.07;
    if (rt < 0 || rt < magOut || rt >= magIn) {
      if (this.magInHand || this.magSeating || mag.parent !== this.node) this.magSeated();
      rig.holdingMag = false;
      return;
    }
    if (rt < magIn - SEAT) {
      if (!this.magInHand) {
        mag.setParent(rig.wristL);
        this.magInHand = true;
        this.magSeating = false;
      }
      rig.holdingMag = true;
      return;
    }
    // seating: from where the hand holds it into the well
    if (!this.magSeating) {
      mag.setParent(this.node);
      this.magP0.copyFrom(mag.position);
      this.magQ0.copyFrom(mag.rotationQuaternion!);
      this.magSeating = true;
      this.magInHand = false;
    }
    const u = Math.min(1, (rt - (magIn - SEAT)) / SEAT);
    const k = u * u * (3 - 2 * u);
    mag.position.set(this.magP0.x * (1 - k), this.magP0.y * (1 - k), this.magP0.z * (1 - k));
    Quaternion.SlerpToRef(this.magQ0, QUAT_ID, k, mag.rotationQuaternion!);
    rig.holdingMag = true;
  }

  /** (anim-cleanup) The magazine back in the gun at once (a reload cut short, a swap). */
  magSeated(): void {
    const mag = this.magMesh;
    this.magInHand = false;
    this.magSeating = false;
    if (!mag) return;
    mag.parent = this.node;
    mag.position.setAll(0);
    mag.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    mag.scaling.setAll(1);
  }

  /** The voxel model (3.0; null: the smooth parts render). */
  readonly voxel: VoxelGroup | null = null;

  /** What renders (shadow casters). */
  get renderMeshes(): AbstractMesh[] {
    return this.mesh ? [this.mesh] : this.voxel ? this.voxel.meshes : this.parts;
  }

  /** In the hands: parented to the rig's aim pocket, with the hands IK'd to its grips. */
  hold(rig: CharacterRig): void {
    this.trSlot = null;
    if (rig.travelNode === this.node) rig.travelNode = null;
    const had = this.glideFrom(rig);
    this.owner = rig;
    this.slot = null;
    this.track(rig, false);
    this.node.parent = rig.weaponPivot;
    this.node.position.setAll(0);
    this.node.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    this.gripsOn(rig);
    const e = this.ext;
    rig.gunSpan.z0 = e.z0;
    rig.gunSpan.z1 = e.z1;
    rig.gunSpan.bore = this.def.muzzle[1];
    rig.gunSpan.top = e.y1;
    if (this.def.magHold) rig.magPoint.set(...this.def.magHold);
    else if (this.magLocal) rig.magPoint.copyFrom(this.magLocal);
    else rig.magPoint.set(0, this.def.grip[1] - 0.08, (this.def.grip[2] + this.def.foregrip[2]) * 0.5);
    rig.heldWeapon = this.node;
    this.setVisible(true);
    if (had) rig.glideWeapon(this.node, glideM);
  }

  /** The rig's hand points for this weapon (the hands IK to them while it is `rig.heldWeapon`). */
  private gripsOn(rig: CharacterRig): void {
    rig.grip.set(...this.def.grip);
    rig.foregrip.set(...this.def.foregrip);
    // (feature/weapons) the support hand under a long gun's handguard, cupping a pistol's grip
    rig.supportStyle = this.def.class === 'pistol' ? 'cup' : 'tube';
  }

  private readonly ghost: TransformNode;
  private readonly trP0 = new Vector3();
  private readonly trQ0 = new Quaternion();
  /** The slot a travel goes to / comes from (null: none running). */
  private trSlot: CarrySlot | null = null;
  private trDraw = false;
  /** (anim-rework S3, M2) This draw is the sling draw (LT from holstered, a long gun off the diagonal back sling). */
  private trSling = false;
  /** (G2 fix r1) The travel left from `trSlot` itself (a draw from the slung gun), not from mid-holster (a reversal). */
  private trFromSlot = false;
  /** (ct-prototype D1) The draw's u when the hand reached the grip (-1: not yet). */
  private trCatch = -1;

  /** (anim-cleanup) Whether a draw / holster to `slot` travels (back and thigh slots; the sling keeps the hand-off). */
  canTravel(slot: CarrySlot | null): boolean {
    return slot !== null && slot !== 'sling';
  }

  /**
   * (anim-cleanup) Starts a draw (`draw`: from where the gun is to the aim pocket) or a holster (to `slot`): the gun
   * leaves its parent for the chest frame where it is, and is the rig's held weapon, so the trigger hand holds its grip
   * the whole way. `travel(rig, u)` moves it; the caller ends with `hold` (a draw) or `holster` (a holster).
   */
  beginTravel(rig: CharacterRig, slot: CarrySlot, draw: boolean, sling = false): void {
    rig.torso.computeWorldMatrix(true).invertToRef(trInv);
    this.node.computeWorldMatrix(true).multiplyToRef(trInv, trM);
    trM.decompose(trS, this.trQ0, this.trP0);
    this.owner = rig;
    this.trFromSlot = this.slot === slot;
    this.slot = null;
    this.track(rig, false);
    this.node.parent = rig.torso;
    this.node.position.copyFrom(this.trP0);
    this.node.rotationQuaternion!.copyFrom(this.trQ0);
    this.gripsOn(rig);
    rig.heldWeapon = this.node;
    rig.travelNode = this.node;
    this.trSlot = slot;
    this.trDraw = draw;
    this.trSling = sling && draw && this.trFromSlot && useDiagTurn(slot, true, true);
    this.trCatch = draw ? -1 : 0;
    this.setVisible(true);
  }

  /** (anim-cleanup) The travel at `u` 0..1: the grip along a curve through TRAVEL_VIA, the gun turning to the end's pose. */
  travel(rig: CharacterRig, u: number): void {
    const slot = this.trSlot;
    if (!slot) return;
    const g = this.ghost;
    if (this.trDraw) {
      g.parent = rig.weaponPivot;
      g.position.setAll(0);
      g.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    } else this.place(g, rig, slot);
    rig.torso.computeWorldMatrix(true).invertToRef(trInv);
    g.computeWorldMatrix(true).multiplyToRef(trInv, trM);
    trM.decompose(trS, trQ, trP);
    // (ct-prototype D1) a draw holds the gun in its slot until the hand is on it (or CATCH_MAX), then runs the rest
    if (this.trCatch < 0) {
      catchP.set(this.def.grip[0], this.def.grip[1], this.def.grip[2]);
      Vector3.TransformCoordinatesToRef(catchP, this.node.computeWorldMatrix(true), catchP);
      const w = rig.wristR.absolutePosition;
      if (u >= CATCH_MAX || hyp3(w.x - catchP.x, w.y - catchP.y, w.z - catchP.z) < CATCH_DIST) this.trCatch = Math.min(CATCH_MAX, Math.max(0, u));
    }
    const k = this.trCatch < 0 ? 0 : Math.max(0, Math.min(1, (u - this.trCatch) / (1 - this.trCatch)));
    // one ease on the travel (smoothstep in time; the curve's shape is spatial only)
    const sm = k * k * (3 - 2 * k);
    // (ct-prototype D1) the turn spread over the path: a holster from the start, a draw from 5 % (level in the pocket)
    const r = this.trDraw ? Math.max(0, Math.min(1, (sm - 0.05) / TRAVEL_TURN)) : Math.min(1, sm / TRAVEL_TURN);
    // (G2, AUDIT-AIM rows 1-3) the diagonal sling turns through its keys (round the right side, muzzle up at the shoulder
    // on a draw; muzzle down beside the hip on a holster), every other slot slerps straight to its end
    // (G2 fix r1) a draw reversed mid-holster (the gun still in front of the body) slerps from where it is: the keyed
    // draw turn starts from the slung frame, so taken from mid-holster it snapped the gun through the torso and swept it
    // (anim-rework S3, M2) the sling draw: the holster's turn backwards (round the right side, muzzle down under the arm,
    // then up into the shoulder), over the whole travel (no 5 % hold level in the pocket: it is the swing up)
    if (this.trSling) this.diagSlingTo(this.node.rotationQuaternion!, Math.min(1, sm / TRAVEL_TURN));
    else if (useDiagTurn(slot, this.trDraw, this.trFromSlot)) this.diagTurnTo(this.node.rotationQuaternion!, this.trDraw, r);
    else Quaternion.SlerpToRef(this.trQ0, trQ, r, this.node.rotationQuaternion!);
    // the grip's start and end (chest frame), and the curve through the waypoint
    trG.set(this.def.grip[0], this.def.grip[1], this.def.grip[2]);
    trG.rotateByQuaternionToRef(this.trQ0, trG0).addInPlace(this.trP0);
    trG.rotateByQuaternionToRef(trQ, trG1).addInPlace(trP);
    const back = isBackSlot(slot);
    const via = this.trSling ? TRAVEL_VIA.sling : back ? TRAVEL_VIA.back : TRAVEL_VIA.thigh;
    const out = back ? TRAVEL_OUT.back : TRAVEL_OUT.thigh;
    // a cubic: the slot end steps out first (P1 of a draw, P2 of a holster), the other control is the waypoint
    const slotG = this.trDraw ? trG0 : trG1;
    const o1x = slotG.x + out[0];
    const o1y = slotG.y + out[1];
    const o1z = slotG.z + out[2];
    const c1x = this.trDraw ? o1x : via[0];
    const c1y = this.trDraw ? o1y : via[1];
    const c1z = this.trDraw ? o1z : via[2];
    const c2x = this.trDraw ? via[0] : o1x;
    const c2y = this.trDraw ? via[1] : o1y;
    const c2z = this.trDraw ? via[2] : o1z;
    const v = 1 - sm;
    const a = v * v * v;
    const b = 3 * v * v * sm;
    const c = 3 * v * sm * sm;
    const d = sm * sm * sm;
    const px = a * trG0.x + b * c1x + c * c2x + d * trG1.x;
    const py = a * trG0.y + b * c1y + c * c2y + d * trG1.y;
    const pz = a * trG0.z + b * c1z + c * c2z + d * trG1.z;
    trG.rotateByQuaternionToRef(this.node.rotationQuaternion!, trG0);
    this.node.position.set(px - trG0.x, py - trG0.y, pz - trG0.z);
  }

  /** (G2) The diagonal sling's draw / holster turn at r (backDiag.diagTurn), into `q` (chest frame). */
  private diagTurnTo(q: Quaternion, draw: boolean, r: number): void {
    const st = diagTurn(draw, r, dStep);
    if (st.kind === 0) {
      frameQuat(planeFrame(st.theta, dFrame), q);
      return;
    }
    this.diagKey(st.from, dqA);
    this.diagKey(st.to, dqB);
    Quaternion.SlerpToRef(dqA, dqB, st.t, q);
  }

  /** (anim-rework S3, M2) The sling draw's turn at r (backDiag.diagTurnSling), into `q` (chest frame). */
  private diagSlingTo(q: Quaternion, r: number): void {
    const st = diagTurnSling(r, dStep);
    if (st.kind === 0) {
      frameQuat(planeFrame(st.theta, dFrame), q);
      return;
    }
    this.diagKey(st.from, dqA);
    this.diagKey(st.to, dqB);
    Quaternion.SlerpToRef(dqA, dqB, st.t, q);
  }

  private diagKey(k: DiagKey, q: Quaternion): void {
    if (k === 'start') q.copyFrom(this.trQ0);
    else if (k === 'end') q.copyFrom(trQ);
    else if (k === 'up') frameQuat(FRAME_UP, q);
    else if (k === 'down') frameQuat(FRAME_DOWN, q);
    else frameQuat(planeFrame(k === 'plane0' ? 0 : Math.PI, dFrame), q);
  }

  /** (anim-cleanup) Is a travel running. */
  get travelling(): boolean {
    return this.trSlot !== null;
  }

  /** (anim-cleanup) Ends a travel (the caller then holds or holsters the gun). */
  endTravel(): void {
    this.trSlot = null;
    if (this.owner?.travelNode === this.node) this.owner.travelNode = null;
  }

  /** Mid-swap: in the right hand (grip at the palm) on its way from its slot to the aim pocket. */
  inHand(rig: CharacterRig): void {
    const had = this.glideFrom(rig);
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    this.owner = rig;
    this.slot = null;
    this.track(rig, false);
    this.node.parent = rig.weaponSocket;
    this.node.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    this.node.position.set(-this.def.grip[0], -this.def.grip[1], -this.def.grip[2]);
    this.setVisible(true);
    if (had) rig.glideWeapon(this.node, glideM);
  }

  /**
   * (step 21w, PC-PASS 42) Before a re-parent (slot, hand, aim pocket): keep the node's last posed world matrix when
   * it was shown on this rig, so the rig glides it from there onto its new place (`CharacterRig.glideWeapon`) instead
   * of jumping (a mid-draw release, a draw taken while the hand is still on its way, the open-side hand switch).
   */
  private glideFrom(rig: CharacterRig): boolean {
    if (this.owner !== rig || !this.node.isEnabled(false)) return false;
    glideM.copyFrom(this.node.computeWorldMatrix(true));
    return true;
  }

  /**
   * Carried in a slot (see `carrySlots`): long guns vertically on the back, muzzle up, thin side to the
   * back and the magazine pointing away, splayed a little from the butt; compact guns on the left-hip
   * sling (splayed clear of the leg) and the pistol low on the right thigh, muzzle down, flat to the body. Placement stands off
   * the body and any back gear (`rig.backGear`) so nothing clips.
   */
  holster(rig: CharacterRig, slot: CarrySlot): void {
    if (rig.travelNode === this.node) rig.travelNode = null;
    this.trSlot = null;
    const had = slot !== 'sling' && this.glideFrom(rig);
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    this.owner = rig;
    this.slot = slot;
    this.track(rig, slot === 'sling');
    const n = this.node;
    this.place(n, rig, slot);
    this.setVisible(true);
    if (had) rig.glideWeapon(n, glideM);
  }

  /**
   * The carry slot's pose for this weapon, written into `n` (its parent, rotation and position): the weapon itself
   * (`holster`) or the travel target (anim-cleanup: a draw / holster carries the gun along a path to it).
   */
  private place(n: TransformNode, rig: CharacterRig, slot: CarrySlot): void {
    const e = this.ext;
    const p = rig.p;
    const mount = isBackSlot(slot) && rig.backMount && this.def.backStud ? rig.backMount[slot as 'backL' | 'backC' | 'backR'] : null;
    if (slot === 'backC') {
      // (CT prototype G2, AUDIT-AIM row 3) the centre long gun is slung DIAGONALLY across the back (CT 053525 / 053709 /
      // 054237): the stock at the right shoulder blade, the muzzle down to the left hip, flat on the back plate (or the
      // generic back) with the grip low on the right blade (backDiag.ts). The back plate's built socket (WREN_BACK_MOUNT
      // backC) is left empty until the Blender kit gets a diagonal anchor.
      n.parent = rig.torso;
      frameQuat(planeFrame(slungTheta(), dFrame), n.rotationQuaternion!);
      const backZ = rig.backMount ? rig.backMount.backC.origin[2]! : -p.chest.d / 2 - rig.backGear - CARRY_GAP;
      slungPosition(this.def.grip, e.x1, backZ, dPos);
      n.position.set(dPos[0]!, dPos[1]!, dPos[2]!);
    } else if (mount) {
      // (feature/weapons) hung from the body's back plate socket by the gun's back stud: muzzle up, the left side flat to
      // the plate (its right side out), so the top faces the wearer's left and the pistol grip her right hand
      const st = this.def.backStud!;
      az.set(mount.up[0]!, mount.up[1]!, mount.up[2]!);
      ax.set(mount.out[0]!, mount.out[1]!, mount.out[2]!);
      Vector3.CrossToRef(az, ax, ay);
      n.parent = rig.torso;
      Quaternion.RotationQuaternionFromAxisToRef(ax, ay, az, n.rotationQuaternion!);
      const ox = mount.origin[0]! + ax.x * STUD_SEAT;
      const oy = mount.origin[1]! + ax.y * STUD_SEAT;
      const oz = mount.origin[2]! + ax.z * STUD_SEAT;
      n.position.set(ox - ax.x * st[0] - ay.x * st[1] - az.x * st[2], oy - ax.y * st[0] - ay.y * st[1] - az.y * st[2], oz - ax.z * st[0] - ay.z * st[1] - az.z * st[2]);
    } else if (isBackSlot(slot)) {
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
      if (n === this.node) this.placeSling(rig, SLING_SPLAY);
    } else if (rig.thighMount) {
      // (feature/weapons) the body's own built holster: its frame from the hip, the weapon point at its origin
      const h = rig.thighMount;
      ax.set(h.x[0]!, h.x[1]!, h.x[2]!);
      ay.set(h.y[0]!, h.y[1]!, h.y[2]!);
      az.set(h.z[0]!, h.z[1]!, h.z[2]!);
      n.parent = rig.hipR;
      Quaternion.RotationQuaternionFromAxisToRef(ax, ay, az, n.rotationQuaternion!);
      const cx = h.centre[0]!;
      const cy = h.centre[1]!;
      const cz = h.centre[2]!;
      n.position.set(h.origin[0]! - ax.x * cx - ay.x * cy - az.x * cz, h.origin[1]! - ax.y * cx - ay.y * cy - az.y * cz, h.origin[2]! - ax.z * cx - ay.z * cy - az.z * cz);
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
    const px = -(rig.p.hipHalf + rig.thighOuter + SLING_GAP);
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

  /** (fix 21-2) The rig given to the last hold / inHand / holster. */
  private owner: CharacterRig | null = null;
  /** (fix 21-2) The rig whose `thighCount` this model is counted in (visible on its right thigh), else null. */
  private thighOn: CharacterRig | null = null;

  setVisible(v: boolean): void {
    this.node.setEnabled(v);
    // (ct-prototype D+E fix r1) hidden mid-travel (death, a stow): the travel is over
    if (!v && this.trSlot !== null) this.endTravel();
    this.syncThigh();
  }

  /** (fix 21-2) `rig.thighGear` is true iff a visible model is holstered on that rig's thigh. */
  private syncThigh(): void {
    const want = this.slot === 'thigh' && this.node.isEnabled(false) ? this.owner : null;
    if (want === this.thighOn) return;
    if (this.thighOn) this.thighOn.thighCount = Math.max(0, this.thighOn.thighCount - 1);
    if (want) want.thighCount++;
    this.thighOn = want;
  }

  muzzleWorld(out: Vector3): Vector3 {
    this.node.computeWorldMatrix(true);
    return Vector3.TransformCoordinatesToRef(this.muzzleLocal, this.node.getWorldMatrix(), out);
  }

  dispose(): void {
    this.disposed = true;
    // (ct-prototype D+E fix r1) a travel abandoned by the weapon going away
    this.trSlot = null;
    if (this.owner?.travelNode === this.node) this.owner.travelNode = null;
    this.mesh?.dispose();
    this.magMesh?.dispose();
    if (this.rig) this.track(this.rig, false);
    this.slot = null;
    this.syncThigh();
    this.voxel?.dispose();
    for (const m of this.parts) m.dispose();
    this.ghost.dispose();
    this.node.dispose();
  }
}
