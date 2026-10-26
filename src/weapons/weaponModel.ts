import { Matrix, Quaternion, TransformNode, Vector3, type AbstractMesh, type Mesh, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import type { PartLibrary, PartPattern } from '../world/partLibrary';
import { modelExtents, type ModelExtents, type WeaponDef } from './weaponDefs';
import { BACK_SPLAY, isBackSlot, type CarrySlot } from './carrySlots';
import { loadWeaponMesh } from './weaponMesh';
import { rotInto, type GunVisual } from '../anim/tuneHands';
import { gearSocketOfSlot, GS } from '../anim/tuneGear';
import { DRAW_CUR, drawClass, drawEase, drawPath, liftStart, reachStart, reachWeight, settleAt, turnEase, type DrawClass } from '../anim/drawMotion';
import { diagTurn, diagTurnSling, useDiagTurn, FRAME_DOWN, FRAME_UP, planeFrame, slungPosition, slungTheta, type DiagKey, type DiagTurnStep } from './backDiag';

/** (feature/weapons) The built mesh instead of the primitive parts (A6, A7): the players' guns, not the guards'. */
export interface WeaponMeshOptions {
  /** Load the kit item's baked mesh (weaponMesh.ts); the parts show until it is in, then hide. */
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
/**
 * (piano-knife S4a) How far an empty pistol's slide sits back when locked open (m, along -z of the weapon frame).
 * Starting value (prototype mode): the slide is 0.182 m long (`pistolSd.json` partBounds.slide).
 */
export const SLIDE_LOCK_BACK = 0.02;
/** (anim-gear) The slot pivot `place` hands to `CharacterRig.gearPlace` (item frame). */
const gearV = new Vector3();
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
export const TRAVEL_VIA = { back: [0.36, 0.15, 0.18], thigh: [0.24, -0.1, 0.34], sling: [0.4, -0.22, 0.04] } as const;
/**
 * (anim-rework S3, M2) The sling draw's grip waypoint (chest frame, m) is `TRAVEL_VIA.sling`: low beside the right hip,
 * a little forward, under the arm (the gun hangs muzzle down there before it swings up into the shoulder), clear of the
 * right thigh. Only a long gun drawn from the diagonal back sling by LT from holstered takes it (`beginTravel` sling).
 * (traverse-fix) [0.3, -0.22, 0.14] -> [0.4, -0.22, 0.04]: further out from the hip and less forward, so the rifle swinging
 * up into the shoulder clears the trunk (e2e-clip "sling draw + glide" trunk -1.5 -> +0.9 cm, legs 0.2 -> 2.8 cm; z 0.22
 * forward was worse, -2.6 cm and into the thigh).
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
 * (anim-natural N3, replaces ct-prototype D1's catch: the gun waited in the slot until the wrist came within 13 cm, then
 * the hand snapped onto the grip) A draw from the slot reaches first: the trigger hand's IK blends onto the gun's grip
 * (`CharacterRig.travelReach`, drawMotion.reachWeight), the gun leaves as the fingers close (`drawPath`), so the gun
 * never leaves ahead of the hand and the hand never stops. The settle's overshoot past the pocket extrapolates the
 * path's end: the grip along its end tangent, the turn along its last `OVER_DT` of the path.
 */
const OVER_DT = 0.04;
const trQPrev = new Quaternion();
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
/** (tuner-v2 item 2) Gun visual scratch (no allocation). */
const tunedP = { x: 0, y: 0, z: 0 };
const tunedList: (Mesh | null)[] = [null, null];

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
    this.trCls = drawClass(def.class);
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
    // (feature/weapons) the baked mesh replaces the parts once loaded
    const meshed = opts.mesh === true && loadWeaponMesh(scene, def.id, this.node, () => !this.disposed, (m, mag, slide) => this.useMesh(m, mag, slide, opts.caster), () => (this.meshWanted = false));
    this.meshWanted = meshed;
  }

  /** The baked mesh once loaded (null: the parts render). */
  mesh: Mesh | null = null;
  private disposed = false;
  /** A baked mesh was asked for and has neither loaded nor failed yet. */
  private meshWanted = false;

  /** (menu-notes note 2) The baked mesh is still on its way (the menu's load screen waits for it). */
  get meshPending(): boolean {
    return this.meshWanted && !this.mesh && !this.disposed;
  }

  private useMesh(m: Mesh, mag: Mesh | null, slide: Mesh | null, caster?: (m: AbstractMesh) => void): void {
    this.mesh = m;
    this.magMesh = mag;
    this.slideMesh = slide;
    for (const p of this.parts) p.setEnabled(false);
    caster?.(m);
    if (mag) caster?.(mag);
    if (slide) {
      caster?.(slide);
      this.placeSlide();
    }
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

  /** (piano-knife S4a) The slide mesh (a child of the baked mesh; null: no baked mesh or no separate slide). */
  slideMesh: Mesh | null = null;
  private slideBack = false;

  /** (piano-knife S4a) The slide is locked back (set by slideLock; kept across a late mesh load). */
  get slideLocked(): boolean {
    return this.slideBack;
  }

  /**
   * (piano-knife S4a) An empty pistol: the slide locked back `SLIDE_LOCK_BACK` (on) or forward (off). Render only
   * (the muzzle, grip points and extents are untouched); applied when the mesh arrives if it is not in yet. A gun
   * without a separate slide ignores it. No allocation.
   */
  slideLock(on: boolean): void {
    this.slideBack = on;
    this.placeSlide();
  }

  private placeSlide(): void {
    const s = this.slideMesh;
    if (!s) return;
    s.position.set(0, 0, this.slideBack ? -SLIDE_LOCK_BACK : 0);
  }

  /** What renders (shadow casters). */
  get renderMeshes(): AbstractMesh[] {
    return this.mesh ? [this.mesh] : this.parts;
  }

  /** In the hands: parented to the rig's aim pocket, with the hands IK'd to its grips. */
  hold(rig: CharacterRig): void {
    this.trSlot = null;
    if (rig.travelNode === this.node) rig.travelNode = null;
    if (rig.travelNode === null) rig.travelReach = 1;
    const had = this.glideFrom(rig);
    this.owner = rig;
    this.slot = null;
    this.track(rig, false);
    this.node.parent = rig.weaponPivot;
    this.node.position.setAll(0);
    this.node.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    this.gripsOn(rig);
    if (this.def.magHold) rig.magPoint.set(...this.def.magHold);
    else if (this.magLocal) rig.magPoint.copyFrom(this.magLocal);
    else rig.magPoint.set(0, this.def.grip[1] - 0.08, (this.def.grip[2] + this.def.foregrip[2]) * 0.5);
    rig.heldWeapon = this.node;
    rig.heldModel = this;
    this.setVisible(true);
    if (had) rig.glideWeapon(this.node, glideM);
  }

  /** The rig's hand points for this weapon (the hands IK to them while it is `rig.heldWeapon`). */
  private gripsOn(rig: CharacterRig): void {
    rig.grip.set(...this.def.grip);
    rig.foregrip.set(...this.def.foregrip);
    // (feature/weapons) the support hand under a long gun's handguard, cupping a pistol's grip
    rig.supportStyle = this.def.class === 'pistol' ? 'cup' : 'tube';
    // (anim-natural N3) the gun's span for the sight weld and the body clearance from the travel's start (set only at the
    // hold, a draw measured the pocket with the last gun held: the pistol's aim pocket sat 7 cm low through the LT draw,
    // with the rifle's sight height, and jumped up when the travel ended)
    const e = this.ext;
    rig.gunSpan.z0 = e.z0;
    rig.gunSpan.z1 = e.z1;
    rig.gunSpan.bore = this.def.muzzle[1];
    rig.gunSpan.top = e.y1;
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
  /** (anim-natural N3) This draw reaches for the gun in its slot first (a draw from the slot, not a reversal). */
  private trReach = false;
  /** (anim-natural N3 fix) Where this draw's travel starts (`u`): past 0 when the hand is still on the gun (a re-draw). */
  private trU0 = 0;
  /** (anim-natural N3) The draw motion class (`DRAW_CUR` row) of this gun. */
  private readonly trCls: DrawClass;

  /** (anim-cleanup) Whether a draw / holster to `slot` travels (back and thigh slots; the sling keeps the hand-off). */
  canTravel(slot: CarrySlot | null): boolean {
    return slot !== null && slot !== 'sling';
  }

  /**
   * (anim-cleanup) Starts a draw (`draw`: from where the gun is to the aim pocket) or a holster (to `slot`): the gun
   * leaves its parent for the chest frame where it is, and is the rig's held weapon, so the trigger hand holds its grip
   * the whole way. `travel(rig, u)` moves it; the caller ends with `hold` (a draw) or `holster` (a holster).
   * (anim-natural N3) A draw from the slot starts with the reach: the hand's IK weight on the grip is 0 and rises with
   * `travel` (`CharacterRig.travelReach`).
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
    rig.heldModel = this;
    rig.travelNode = this.node;
    this.trSlot = slot;
    this.trDraw = draw;
    this.trSling = sling && draw && this.trFromSlot && useDiagTurn(slot, true, true);
    this.trReach = draw && this.trFromSlot;
    // (anim-natural N3 fix) drawn again while the hand still lets go of it (within RELEASE_TIME of the seat): the reach is
    // that far along already and the gun leaves sooner (it restarted at 0: the hand left the grip, 5-7 cm in a frame)
    this.trU0 = this.trReach ? reachStart(rig.releaseOf(this.node), DRAW_CUR[this.trCls]) : 0;
    rig.travelReach = this.trReach ? reachWeight(this.trU0, DRAW_CUR[this.trCls]) : 1;
    this.setVisible(true);
  }

  /**
   * (anim-cleanup) The travel at `u` 0..1: the grip along a curve through TRAVEL_VIA, the gun turning to the end's pose.
   * (anim-natural N3) A draw from the slot: the reach (the hand onto the grip), the lift as the fingers close, the
   * present eased in and the settle past the pocket and back (anim/drawMotion.ts); a reversal: the present and settle
   * only; a holster: one ease, seated in the slot.
   */
  travel(rig: CharacterRig, u: number): void {
    const slot = this.trSlot;
    if (!slot) return;
    const g = this.ghost;
    if (this.trDraw && this.trFromSlot) {
      // (anim-natural N3 fix) a draw from the slot starts from the slot where it is now (chest frame), not where it was
      // at the press: the thigh holster moves with the hip, so a draw rewound to the slot (holstered mid-draw) seated the
      // pistol 7 cm off its holster and it jumped there in a frame
      this.place(g, rig, slot);
      rig.torso.computeWorldMatrix(true).invertToRef(trInv);
      g.computeWorldMatrix(true).multiplyToRef(trInv, trM);
      trM.decompose(trS, this.trQ0, this.trP0);
    }
    if (this.trDraw) {
      g.parent = rig.weaponPivot;
      g.position.setAll(0);
      g.rotationQuaternion!.copyFromFloats(0, 0, 0, 1);
    } else this.place(g, rig, slot);
    rig.torso.computeWorldMatrix(true).invertToRef(trInv);
    g.computeWorldMatrix(true).multiplyToRef(trInv, trM);
    trM.decompose(trS, trQ, trP);
    const m = DRAW_CUR[this.trCls];
    const uc0 = u < 0 ? 0 : u > 1 ? 1 : u;
    const uc = this.trReach ? this.trU0 + (1 - this.trU0) * uc0 : uc0;
    let p: number;
    // (anim-natural N3) a draw from the slot turns the gun at an even rate over its lift / present (drawMotion.turnEase)
    let turn = -1;
    if (this.trReach) {
      rig.travelReach = reachWeight(uc, m);
      p = drawPath(uc, m, settleAt(m.settle, rig.aimWeight));
      const s = liftStart(m);
      turn = 0.05 + 0.95 * turnEase((uc - s) / (1 - s)); // (turnAt's draw r is then the eased turn itself)
    } else if (this.trDraw) {
      rig.travelReach = 1;
      p = drawEase(uc, settleAt(m.settle, rig.aimWeight));
    } else {
      rig.travelReach = 1;
      p = uc * uc * (3 - 2 * uc);
    }
    // the path at sm (0..1); past 1 (the settle) the end extrapolated by `over`
    const sm = p < 1 ? p : 1;
    const over = p > 1 ? p - 1 : 0;
    this.turnAt(slot, turn >= 0 ? turn : sm, this.node.rotationQuaternion!);
    if (over > 0 && turn < 0) {
      // the turn carried on along its last stretch of the path (slerp past 1 extrapolates on the same arc)
      this.turnAt(slot, 1 - OVER_DT, trQPrev);
      Quaternion.SlerpToRef(trQPrev, this.node.rotationQuaternion!, 1 + over / OVER_DT, this.node.rotationQuaternion!);
    }
    // the grip's start and end (chest frame), and the curve through the waypoint
    trG.set(this.def.grip[0], this.def.grip[1], this.def.grip[2]);
    trG.rotateByQuaternionToRef(this.trQ0, trG0).addInPlace(this.trP0);
    trG.rotateByQuaternionToRef(trQ, trG1).addInPlace(trP);
    const back = isBackSlot(slot);
    const via = this.trSling ? TRAVEL_VIA.sling : back ? TRAVEL_VIA.back : TRAVEL_VIA.thigh;
    const out = back ? TRAVEL_OUT.back : TRAVEL_OUT.thigh;
    // a cubic: the slot end steps out first (P1 of a draw, P2 of a holster), the other control is the waypoint
    // (anim-natural N3: both moved by the Draw section's lift / clear and present offsets)
    const slotG = this.trDraw ? trG0 : trG1;
    const o1x = slotG.x + out[0] + m.out[0];
    const o1y = slotG.y + out[1] + m.out[1];
    const o1z = slotG.z + out[2] + m.out[2];
    const vx = via[0] + m.via[0];
    const vy = via[1] + m.via[1];
    const vz = via[2] + m.via[2];
    const c1x = this.trDraw ? o1x : vx;
    const c1y = this.trDraw ? o1y : vy;
    const c1z = this.trDraw ? o1z : vz;
    const c2x = this.trDraw ? vx : o1x;
    const c2y = this.trDraw ? vy : o1y;
    const c2z = this.trDraw ? vz : o1z;
    const v = 1 - sm;
    const a = v * v * v;
    const b = 3 * v * v * sm;
    const c = 3 * v * sm * sm;
    const d = sm * sm * sm;
    // past the end: along the curve's end tangent, 3 (P3 - P2) per unit of the path
    const px = a * trG0.x + b * c1x + c * c2x + d * trG1.x + 3 * over * (trG1.x - c2x);
    const py = a * trG0.y + b * c1y + c * c2y + d * trG1.y + 3 * over * (trG1.y - c2y);
    const pz = a * trG0.z + b * c1z + c * c2z + d * trG1.z + 3 * over * (trG1.z - c2z);
    trG.rotateByQuaternionToRef(this.node.rotationQuaternion!, trG0);
    this.node.position.set(px - trG0.x, py - trG0.y, pz - trG0.z);
  }

  /** The gun's turn at path `sm` 0..1 into `q` (chest frame; reads `trQ`, the end pose, set by `travel`). */
  private turnAt(slot: CarrySlot, sm: number, q: Quaternion): void {
    // (ct-prototype D1) the turn spread over the path: a holster from the start, a draw from 5 % (level in the pocket)
    const r = this.trDraw ? Math.max(0, Math.min(1, (sm - 0.05) / TRAVEL_TURN)) : Math.min(1, sm / TRAVEL_TURN);
    // (G2, AUDIT-AIM rows 1-3) the diagonal sling turns through its keys (round the right side, muzzle up at the shoulder
    // on a draw; muzzle down beside the hip on a holster), every other slot slerps straight to its end
    // (G2 fix r1) a draw reversed mid-holster (the gun still in front of the body) slerps from where it is: the keyed
    // draw turn starts from the slung frame, so taken from mid-holster it snapped the gun through the torso and swept it
    // (anim-rework S3, M2) the sling draw: the holster's turn backwards (round the right side, muzzle down under the arm,
    // then up into the shoulder), over the whole travel (no 5 % hold level in the pocket: it is the swing up)
    if (this.trSling) this.diagSlingTo(q, Math.min(1, sm / TRAVEL_TURN));
    else if (useDiagTurn(slot, this.trDraw, this.trFromSlot)) this.diagTurnTo(q, this.trDraw, r);
    else Quaternion.SlerpToRef(this.trQ0, trQ, r, q);
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
    if (this.owner && this.owner.travelNode === null) this.owner.travelReach = 1;
  }

  /** Mid-swap: in the right hand (grip at the palm) on its way from its slot to the aim pocket. */
  inHand(rig: CharacterRig): void {
    const had = this.glideFrom(rig);
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    this.tuneVisual(null);
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
    if (rig.travelNode === null) rig.travelReach = 1;
    this.trSlot = null;
    const had = slot !== 'sling' && this.glideFrom(rig);
    if (rig.heldWeapon === this.node) rig.heldWeapon = null;
    this.tuneVisual(null);
    this.owner = rig;
    this.slot = slot;
    // (anim-gear) every carried gun follows the rig's gear offsets (re-placed in `follow` when they change)
    this.track(rig, true);
    const n = this.node;
    this.gearOn = false;
    this.gearVer = rig.gearVer;
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
      gearV.set(this.def.grip[0], this.def.grip[1], this.def.grip[2]);
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
      gearV.set(st[0], st[1], st[2]);
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
      gearV.set(0, e.y1, e.z0);
    } else if (slot === 'sling') {
      n.parent = rig.hips;
      if (n === this.node) this.placeSling(rig, SLING_SPLAY);
      return; // (anim-gear) placeSling applies the slingHip offset
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
      gearV.set(cx, cy, cz);
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
      gearV.set((e.x0 + e.x1) / 2, yc, zc);
    }
    // (anim-gear) the slot's gear offset (a Wren rig's base table + Gear tuner; moved in the slot's frame, turned about
    // the pivot set above): the gun in its slot and the travel's end (the draw / holster hand reach) both take it
    rig.gearPlace(n, gearSocketOfSlot(slot), gearV.x, gearV.y, gearV.z);
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
    // (anim-gear) the slingHip socket's offset, about the stock-end pivot
    rig.gearPlace(n, GS.slingHip, e.x1, yc, e.z0);
  }

  /**
   * After each pose: the slung gun swings out with the left thigh when the leg pushes it (a side-step
   * can take the thigh well past the resting splay), and settles back when it does not.
   */
  private follow(): void {
    const rig = this.rig;
    if (!rig) return;
    if (this.slot !== 'sling') {
      // (anim-gear) the rig's gear offsets changed (the tuner, a base table load, the crouch): back into the slot with
      // them (not mid-glide: the glide lands on the slot, then this runs)
      const v = rig.gearVer;
      if (this.slot !== null && v !== this.gearVer && rig.gliding !== this.node && rig.travelNode !== this.node) {
        this.gearVer = v;
        this.gearOn = false;
        this.place(this.node, rig, this.slot);
      }
      return;
    }
    rig.hipL.getDirectionToRef(Vector3.DownReadOnly, ax);
    rig.hips.getDirectionToRef(Vector3.RightReadOnly, ay);
    // outward (to the left) swing of the thigh in the pelvis frame
    const out = -Math.asin(Math.max(-1, Math.min(1, ax.x * ay.x + ax.y * ay.y + ax.z * ay.z)));
    const want = Math.max(SLING_SPLAY, out + SLING_MARGIN);
    // pushed out at once, swings back with a little damping
    this.splay = want > this.splay ? want : this.splay + (want - this.splay) * 0.15;
    this.placeSling(rig, this.splay);
  }

  /** (anim-weight) The carried-gear spring's slot position (parent frame) while an offset is applied. */
  private gearOn = false;
  private gearBX = 0;
  private gearBY = 0;
  private gearBZ = 0;

  /**
   * (anim-weight) The Weight section's carried-gear spring (`WEIGHT_POSE.gearX / Y / Z`, the local player only): this
   * gun, carried on the back or the sling, offset in its slot by (dx, dy, dz) m in its parent's frame (x right, y up,
   * z forward). The thigh holster, a gun in hand, on its travel or gliding into the slot are left alone. At 0 nothing
   * is touched (and an applied offset puts the slot position back exactly). No allocation.
   */
  weightGear(dx: number, dy: number, dz: number): void {
    const s = this.slot;
    const rig = this.owner;
    if (s === null || s === 'thigh' || !rig || rig.heldWeapon === this.node || rig.gliding === this.node) {
      this.gearOn = false;
      return;
    }
    const p = this.node.position;
    if (s === 'sling') {
      // the sling is placed again after every pose (`follow`): its slot position is the current one
      if (dx === 0 && dy === 0 && dz === 0) return;
      p.set(p.x + dx, p.y + dy, p.z + dz);
      return;
    }
    if (!this.gearOn) {
      if (dx === 0 && dy === 0 && dz === 0) return;
      this.gearOn = true;
      this.gearBX = p.x;
      this.gearBY = p.y;
      this.gearBZ = p.z;
    }
    p.set(this.gearBX + dx, this.gearBY + dy, this.gearBZ + dz);
    if (dx === 0 && dy === 0 && dz === 0) this.gearOn = false;
  }

  private rig: CharacterRig | null = null;
  /** (anim-gear) The rig's gear version this gun was placed in its slot at. */
  private gearVer = 0;
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

  /** (tuner-v2 item 2) The tuner's gun transform is on the rendered mesh now. */
  private tuned = false;

  /**
   * (tuner-v2 item 2) The local player's tuner gun transform (scale, position, rotation about the trigger grip point,
   * weapon frame) on the RENDERED mesh only: the baked mesh and its seated magazine. `node`, `muzzleLocal`, the grip
   * points, so the muzzle, the aim and ballistics, are untouched. null: back to the mesh's own pose (once). The
   * primitive parts (no baked mesh) are not moved. No allocation.
   */
  tuneVisual(v: GunVisual | null): void {
    if (!v || !v.on) {
      if (!this.tuned) return;
      this.tuned = false;
      const ms = this.tunedMeshes();
      for (let i = 0; i < ms.length; i++) {
        const m = ms[i];
        if (!m) continue;
        m.position.setAll(0);
        m.scaling.setAll(1);
        if (m.rotationQuaternion) m.rotationQuaternion.copyFromFloats(0, 0, 0, 1);
      }
      return;
    }
    this.tuned = true;
    const g = this.def.grip;
    // p' = g + t + R (s (p - g)): position g + t - R (s g), rotation q, scale s
    rotInto(v.qx, v.qy, v.qz, v.qw, g[0] * v.s, g[1] * v.s, g[2] * v.s, tunedP);
    const px = g[0] + v.tx - tunedP.x;
    const py = g[1] + v.ty - tunedP.y;
    const pz = g[2] + v.tz - tunedP.z;
    const ms = this.tunedMeshes();
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (!m) continue;
      m.position.set(px, py, pz);
      m.scaling.setAll(v.s);
      (m.rotationQuaternion ??= new Quaternion()).copyFromFloats(v.qx, v.qy, v.qz, v.qw);
    }
  }

  /** The meshes the tuner's gun transform moves: the baked gun, and its magazine while seated in the well (the slide rides on the baked mesh as its child). */
  private tunedMeshes(): readonly (Mesh | null)[] {
    tunedList[0] = this.mesh;
    tunedList[1] = this.magMesh && !this.magInHand && !this.magSeating && this.magMesh.parent === this.node ? this.magMesh : null;
    return tunedList;
  }

  dispose(): void {
    this.disposed = true;
    if (this.owner?.heldModel === this) this.owner.heldModel = null; // (tuner-v2 item 2)
    // (ct-prototype D+E fix r1) a travel abandoned by the weapon going away
    this.trSlot = null;
    if (this.owner?.travelNode === this.node) this.owner.travelNode = null;
    this.slideMesh?.dispose();
    this.mesh?.dispose();
    this.magMesh?.dispose();
    if (this.rig) this.track(this.rig, false);
    this.slot = null;
    this.syncThigh();
    for (const m of this.parts) m.dispose();
    this.ghost.dispose();
    this.node.dispose();
  }
}
