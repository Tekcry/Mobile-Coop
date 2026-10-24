import {
  Color3,
  CreateBox,
  Matrix,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  Quaternion,
  PBRMaterial,
  TransformNode,
  Vector3,
  type Mesh,
  type Scene,
} from '../core/babylon';
import { G, doorMembership, markArmoured } from '../physics/groups';
import type { Door, TraversalAnchors } from './anchors';
import { hyp2 } from '../core/mathx';
import { DOOR_CRACK, isSlideDoor, stepCrack } from './doorPeek';

/** How a door was opened: quietly by hand, bashed open at a sprint, or by an enemy walking through. */
export type DoorHow = 'quiet' | 'bash' | 'enemy' | 'close' | 'crack' | 'drive';

/**
 * Open angle (rad) and swing times (s).
 * (G6, AUDIT-WALLS row 4, 052349 @ 5.95-9: the corrected normal OPEN DOOR) the leaf starts fast and eases: about 45 deg
 * at 0.25 s, 70 at 0.45, 78 at 1.05, drifting to 85-90 by about 3 s. `openAngle` 1.75 -> 1.53 (88 deg, was 100: 10-15 deg
 * wide); `quietTime` 1.1 -> 0.75 with the ease-out drawn curve (`quietShape`, `quietEase` of the swing, ours was a slow
 * smoothstep start peaking mid-swing), then a linear `quietDrift` s to the full angle (drawn only: the doorway, light and
 * sight are open from the swing's end, `open` 1).
 * (G6, AUDIT-EXTRA-OLD row 6, 052832 @ 11.9-12.5 / 17.33-17.67) a guard pushes a door open in about 0.4 s
 * (`enemyTime` 0.7 -> 0.4) and a door a guard opened shuts behind him in under 0.35 s (`autoCloseTime`; the player's
 * close stays `closeTime`, row 17: 052752 under 1 s).
 */
export const DOOR = {
  openAngle: 1.53,
  quietTime: 0.75,
  quietEase: 0.89,
  quietDrift: 2.0,
  bashTime: 0.22,
  enemyTime: 0.4,
  closeTime: 0.8,
  autoCloseTime: 0.35,
  thickness: 0.05,
  /** Within this of the doorway centre an enemy pushes a closed door open (m). */
  enemyReach: 1.0,
  /** Nobody within this of the doorway for it to close (m). */
  clearance: 0.75,
  /** (locomotion step 13) The door-peek crack: this fraction of the swing over `crackTime` s (closed in 0.4 s). */
  crack: DOOR_CRACK.crack,
  crackTime: DOOR_CRACK.crackTime,
  /** (F1b, G41) A stick-driven door under this swing fraction is still shut to light, sight and collision; over it
   *  it is a real opening (the body goes) and guards can notice it. */
  driveShut: 0.15,
  /** The stick-driven opening stops here (a full push on the stick takes 4 s to get there: slow on purpose). */
  driveMax: 0.7,
} as const;

/** Swing fraction (0..1) a stick-driven door moves this step: the push (-1 back .. 1 in) at DRIVE_RATE per second.
 *  (G6, AUDIT-WALLS row 14, 052349 @ 15.6-18.25: the stealth leaf about 12-18 deg/s) 0.2 -> 0.15 (13 deg/s of 88). */
export const DRIVE_RATE = 0.15;

/** (G6) The quiet open's drawn swing (0..1 of `openAngle`) at swing `open` (0..1 over `quietTime`) and drift `drift`
 *  (0..1 over `quietDrift`): ease-out to `quietEase`, then the drift. */
export function quietShape(open: number, drift: number): number {
  const u = 1 - Math.max(0, Math.min(1, open));
  return DOOR.quietEase * (1 - u * u) + (1 - DOOR.quietEase) * Math.max(0, Math.min(1, drift));
}
export function driveStep(amount: number, push: number, dt: number): number {
  const dead = 0.15;
  const p = Math.abs(push) < dead ? 0 : (push - Math.sign(push) * dead) / (1 - dead);
  return Math.max(DOOR.crack, Math.min(DOOR.driveMax, amount + p * DRIVE_RATE * dt));
}

export interface DoorState {
  anchor: Door;
  /** 0 closed .. 1 open. */
  open: number;
  target: 0 | 1;
  rate: number;
  /** (step 13) Cracked by a door peek (host-authoritative in co-op): the leaf is drawn `ajar` of its swing while
   *  `open` stays 0, so the body, the light field / bake and guard sight treat it as closed (A25). */
  cracked: boolean;
  /** The drawn crack, 0 .. DOOR.crack (eased toward `cracked`). */
  ajar: number;
  /** (F1b) Held by the stick between shut and open: open stays where it is (no swing) until a close / open. */
  held: boolean;
  /** (G6) The drawn curve: a quiet open eases out (`quietShape`, `drift` 0..1 after it), anything else is the smooth
   *  swing scaled by `visMax` (a close from a drifting quiet open starts where its leaf is drawn). `by` who opened it. */
  ease?: boolean;
  drift?: number;
  visMax?: number;
  by?: 'quiet' | 'bash' | 'enemy' | 'drive' | '';
  /** Doorway centre (closed leaf middle) on the floor. */
  cx: number;
  cz: number;
  body: PhysicsBody | null;
  node: TransformNode | null;
  index: number;
}

/**
 * Hinged doors (the `Door` anchors): one thin-instanced leaf mesh, a static collision body only while closed
 * (added by `arm`, after the nav grid is built, so doorways stay walkable for the AI). A closed door blocks
 * movement, sight and light; opening removes its body at once and swings the leaf (quietly by hand, fast and
 * loud when bashed at a sprint, briskly when an enemy walks through). `onSound` reports each for noise.
 */
export class Doors {
  readonly list: DoorState[] = [];
  private mesh: Mesh | null = null;
  /** The leaves' mesh (one thin-instanced box; null without doors): a shadow caster for the flashlights (3.6). */
  get leafMesh(): Mesh | null {
    return this.mesh;
  }
  private buf: Float32Array | null = null;
  private armed = false;
  private m = new Matrix();
  private q = new Quaternion();
  private s = new Vector3();
  private p = new Vector3();
  onSound: ((d: DoorState, how: DoorHow) => void) | null = null;
  /** (guard-ai S28) A door's lock changed (`setLocked`), or a locked door was shut or forced open (`setOpen`, both
   *  directions since polish C2): the guards' nav grid shuts or opens its doorway at once (`EnemyManager`,
   *  `ai/lockedDoors.ts`). */
  onLocked: ((d: DoorState) => void) | null = null;

  constructor(
    private scene: Scene,
    anchors: TraversalAnchors,
  ) {
    const doors = anchors.doors;
    if (!doors.length) return;
    doors.forEach((a, i) => {
      const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
      const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
      this.list.push({ anchor: a, open: 0, target: 0, rate: 0, cracked: false, ajar: 0, held: false, cx, cz, body: null, node: null, index: i });
    });
    const mat = new PBRMaterial('doorMat', scene);
    mat.albedoColor = Color3.FromHexString('#6e5a43').toLinearSpace();
    mat.metallic = 0;
    mat.roughness = 0.7;
    mat.usePhysicalLightFalloff = false;
    mat.directIntensity = Math.PI;
    mat.freeze();
    const mesh = CreateBox('doors', { size: 1 }, scene);
    mesh.material = mat;
    mesh.isPickable = false;
    this.buf = new Float32Array(doors.length * 16);
    mesh.thinInstanceSetBuffer('matrix', this.buf, 16, false);
    this.mesh = mesh;
    for (const d of this.list) this.write(d);
    mesh.thinInstanceBufferUpdated('matrix');
    mesh.thinInstanceRefreshBoundingInfo(false);
  }

  /** Leaf matrix at its current swing. */
  private write(d: DoorState): void {
    const a = d.anchor;
    // (marlow-final kit) a sliding door's leaves are the facility kit's (world/kit/kitRender.ts): no hinged leaf drawn
    if (a.leaf === 'slide') {
      this.buf!.fill(0, d.index * 16, d.index * 16 + 16);
      return;
    }
    const yaw = a.yaw + a.swing * DOOR.openAngle * leafFraction(d);
    Quaternion.RotationYawPitchRollToRef(yaw, 0, 0, this.q);
    const w = a.width - 0.04;
    this.s.set(DOOR.thickness, a.height, w);
    this.p.set(a.hinge.x + Math.sin(yaw) * (0.02 + w / 2), a.hinge.y + a.height / 2, a.hinge.z + Math.cos(yaw) * (0.02 + w / 2));
    Matrix.ComposeToRef(this.s, this.q, this.p, this.m);
    this.m.copyToArray(this.buf!, d.index * 16);
  }

  /** Collision on: closed doors get their bodies (call once the nav grid is built). */
  arm(): void {
    if (this.armed) return;
    this.armed = true;
    for (const d of this.list) if (d.open === 0) this.addBody(d);
  }

  private addBody(d: DoorState): void {
    if (d.body || !this.armed) return;
    const a = d.anchor;
    const node = new TransformNode(`door-${a.id}`, this.scene);
    node.position.set(d.cx, a.hinge.y + a.height / 2, d.cz);
    node.rotationQuaternion = Quaternion.RotationYawPitchRoll(a.yaw, 0, 0);
    const body = new PhysicsBody(node, PhysicsMotionType.STATIC, false, this.scene);
    const shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), new Vector3(DOOR.thickness * 2, a.height, a.width - 0.04), this.scene);
    shape.filterMembershipMask = doorMembership(a.armoured === true);
    shape.filterCollideMask = 0xffffffff & ~G.STATIC;
    body.shape = shape;
    // (sniper triage) armour is the body's mark (`isArmouredBody`, what ballistics reads)
    if (a.armoured === true) markArmoured(body);
    d.body = body;
    d.node = node;
  }

  private removeBody(d: DoorState): void {
    if (!d.body) return;
    d.body.shape?.dispose();
    d.body.dispose();
    d.node?.dispose();
    d.body = null;
    d.node = null;
  }

  /** Lock or unlock a door at run time (pure state on the anchor; a locked door refuses `open`, `setOpen` ignores it). */
  setLocked(d: DoorState, on: boolean): void {
    if (d.anchor.locked === on) return;
    d.anchor.locked = on;
    this.onLocked?.(d);
  }

  /** Open a door (`how` sets the swing speed and the sound). False when locked or already opening. */
  open(d: DoorState, how: 'quiet' | 'bash' | 'enemy'): boolean {
    if (d.anchor.locked || d.target === 1) return false;
    d.target = 1;
    d.held = false;
    d.rate = 1 / (how === 'bash' ? DOOR.bashTime : how === 'enemy' ? DOOR.enemyTime : DOOR.quietTime);
    this.uncrackOpen(d);
    // (G6) a quiet open from closed eases out (from a crack it carries on the smooth swing)
    d.ease = how === 'quiet' && d.open === 0;
    d.drift = 0;
    d.visMax = 1;
    d.by = how;
    this.removeBody(d);
    this.onSound?.(d, how);
    return true;
  }

  /** Close a door, unless someone stands in the doorway (`occupied`). */
  close(d: DoorState, occupied: (x: number, z: number, r: number) => boolean): boolean {
    if (d.target === 0 || occupied(d.cx, d.cz, DOOR.clearance)) return false;
    // (G6) the close starts from the drawn leaf (no jump off the quiet curve) and a guard's door shuts fast
    d.visMax = d.open > 0 ? leafFraction(d) / smooth(d.open) : 1;
    d.ease = false;
    d.target = 0;
    d.held = false;
    d.rate = 1 / (d.by === 'enemy' ? DOOR.autoCloseTime : DOOR.closeTime);
    d.by = '';
    this.onSound?.(d, 'close');
    return true;
  }

  /**
   * (F1b, door-2) Stealth open driven by the stick: the leaf's opening is amount (swing fraction, DOOR.crack ..
   * DOOR.driveMax) and it stays there when the stick is released. Under DOOR.driveShut it is still a crack (body,
   * light and sight shut, G41); over it the door is a real opening, held. Solo and host only (the wire has no angle:
   * clients see a held door as open).
   */
  drive(d: DoorState, amount: number): void {
    // (marlow-final N9) a sliding door has no stealth drive (it opens only through `open` / `setOpen`)
    if (d.anchor.locked || isSlideDoor(d.anchor)) return;
    const a = Math.max(DOOR.crack, Math.min(DOOR.driveMax, amount));
    if (a <= DOOR.driveShut) {
      if (d.target === 1) {
        // back down to the crack: the body returns
        d.target = 0;
        d.open = 0;
        d.rate = 0;
        this.addBody(d);
      }
      d.cracked = true;
      d.ajar = a;
      d.held = true;
    } else {
      if (d.target === 0) {
        // over the line: a real opening
        d.cracked = false;
        d.open = Math.max(d.open, d.ajar);
        d.ajar = 0;
        d.target = 1;
        this.removeBody(d);
        this.onSound?.(d, 'drive');
      }
      d.open = a;
      d.rate = 0;
      d.held = true;
      d.ease = false;
      d.visMax = 1;
    }
    if (this.buf) this.write(d);
    this.mesh?.thinInstanceBufferUpdated('matrix');
    this.mesh?.thinInstanceRefreshBoundingInfo(false);
  }

  /** Force a door's state (co-op clients follow the host): open drops the body and swings, closed restores it. */
  setOpen(d: DoorState, open: boolean): void {
    if ((d.target === 1) === open) return;
    d.visMax = !open && d.open > 0 ? leafFraction(d) / smooth(d.open) : 1;
    d.ease = open && d.open === 0;
    d.drift = 0;
    d.target = open ? 1 : 0;
    d.rate = 1 / (open ? DOOR.quietTime : DOOR.closeTime);
    // (guard-ai S28) lock then shut (`courseMode.applyLocks`, `sectorMode.lockDoor`): the doorway shuts on the grid now.
    // (guard-ai polish C2) and a still-locked door forced open opens it now (no update with a shut doorway); the hook
    // (`LockedDoorNav.sync`) only toggles what changed, so a second call is a no-op
    if (d.anchor.locked) this.onLocked?.(d);
    // (closed: the body comes back when the leaf is shut, in `update`)
    if (open) {
      this.uncrackOpen(d);
      this.removeBody(d);
    }
  }

  /**
   * (step 13) Crack a closed, unlocked door for a peek (`on`), or close the crack. The body stays (the swing `open`
   * stays 0); only the drawn leaf moves. False when nothing changes (open, locked, already so).
   */
  crack(d: DoorState, on: boolean): boolean {
    // (marlow-final N9) a sliding door never cracks (host, client prediction and solo all land here)
    if (on && (d.target !== 0 || d.anchor.locked || d.cracked || isSlideDoor(d.anchor))) return false;
    if (!on && !d.cracked) return false;
    d.cracked = on;
    d.held = false;
    this.onSound?.(d, 'crack');
    return true;
  }

  /** Opening fully clears the crack: the swing goes on from the cracked angle. */
  private uncrackOpen(d: DoorState): void {
    d.cracked = false;
    if (d.ajar > d.open) d.open = d.ajar;
    d.ajar = 0;
  }

  /** Every door open, no collision. */
  openAll(): void {
    for (const d of this.list) {
      this.removeBody(d);
      d.open = 1;
      d.target = 1;
      d.cracked = false;
      d.ajar = 0;
      d.held = false;
      d.ease = false;
      d.visMax = 1;
      this.write(d);
    }
    this.mesh?.thinInstanceBufferUpdated('matrix');
    this.mesh?.thinInstanceRefreshBoundingInfo(false);
  }

  /**
   * (sector-redesign perf, render only: the guard freeze's occlusion rays) Is `body` a door leaf drawn not shut (cracked
   * for a peek, easing, driven ajar, or opening / closing)? Gameplay rays never ask: the body stays solid for them.
   * Allocation-free.
   */
  seeThrough(body: unknown): boolean {
    for (let i = 0; i < this.list.length; i++) {
      const d = this.list[i]!;
      if (d.body === body) return leafSeeThrough(d);
    }
    return false;
  }

  /** (frzpol) Per door: its leaf no longer hid the view at the last `viewVersion` read (1). */
  private viewClear = new Uint8Array(0);
  private viewV = 0;

  /**
   * (sector-redesign frzpol, render only: the guard freeze's view epoch) A count that grows each time a door stops
   * hiding what is behind it (a leaf cracked, eased or driven ajar, swung, or its body removed). Read once per camera
   * evaluation; a shut leaf going back up does not count. Allocation-free after the first read.
   */
  viewVersion(): number {
    const l = this.list;
    if (this.viewClear.length !== l.length) this.viewClear = new Uint8Array(l.length);
    const v = this.viewClear;
    for (let i = 0; i < l.length; i++) {
      const d = l[i]!;
      const clear = d.body === null || leafSeeThrough(d) ? 1 : 0;
      if (clear && !v[i]) this.viewV++;
      v[i] = clear;
    }
    return this.viewV;
  }

  /** Leaves shown or hidden (the benchmark flight: open doorways, no leaf standing out into a corridor). */
  setVisible(on: boolean): void {
    if (this.mesh) this.mesh.isVisible = on;
  }

  /** Nearest door within `r` of (x, z). */
  nearest(x: number, z: number, r: number): DoorState | null {
    let best: DoorState | null = null;
    let bd = r;
    // (G3) indexed: the camera's door passage asks every step (hot path, no iterator)
    for (let i = 0; i < this.list.length; i++) {
      const d = this.list[i]!;
      const k = hyp2(d.cx - x, d.cz - z);
      if (k < bd) {
        bd = k;
        best = d;
      }
    }
    return best;
  }

  /** An enemy at (x, z) pushes open any closed door it walks into. */
  pushOpen(x: number, z: number): void {
    for (let i = 0; i < this.list.length; i++) {
      const d = this.list[i]!;
      if (d.target === 0 && hyp2(d.cx - x, d.cz - z) < DOOR.enemyReach) this.open(d, 'enemy');
    }
  }

  update(dt: number): void {
    if (!this.mesh) return;
    let moved = false;
    for (const d of this.list) {
      // (step 13) the crack eases on its own (the body and `open` untouched)
      const goal = d.cracked ? DOOR.crack : 0;
      if (d.ajar !== goal && !(d.held && d.cracked)) {
        d.ajar = stepCrack(d.ajar, d.cracked, dt);
        if (d.open === d.target) {
          this.write(d);
          moved = true;
        }
      }
      // (G6) the quiet open's drawn drift to the full angle after the swing
      if (d.ease && d.target === 1 && d.open === 1 && (d.drift ?? 0) < 1) {
        d.drift = Math.min(1, (d.drift ?? 0) + dt / DOOR.quietDrift);
        this.write(d);
        moved = true;
        continue;
      }
      if (d.open === d.target || d.rate === 0) continue;
      d.open = d.target === 1 ? Math.min(1, d.open + d.rate * dt) : Math.max(0, d.open - d.rate * dt);
      this.write(d);
      moved = true;
      if (d.open === 0) this.addBody(d);
    }
    if (moved) {
      this.mesh.thinInstanceBufferUpdated('matrix');
      this.mesh.thinInstanceRefreshBoundingInfo(false);
    }
  }

  dispose(): void {
    for (const d of this.list) this.removeBody(d);
    this.mesh?.material?.dispose();
    this.mesh?.dispose();
  }
}

/** (sector-redesign perf, render only) A leaf the camera can see past: cracked, drawn ajar, or swung at all. */
export function leafSeeThrough(d: Pick<DoorState, 'cracked' | 'ajar' | 'open'>): boolean {
  return d.cracked || d.ajar > 0 || d.open > 0;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** (G6) The leaf's drawn swing 0..1 of `DOOR.openAngle` (the crack, the quiet ease-out and drift, or the smooth swing). */
export function leafFraction(d: Pick<DoorState, 'open' | 'ajar' | 'ease' | 'drift' | 'visMax' | 'target'>): number {
  if (d.ease && d.target === 1 && d.open > d.ajar) return quietShape(d.open, d.drift ?? 0);
  return smooth(Math.max(d.open, d.ajar)) * (d.open > d.ajar ? (d.visMax ?? 1) : 1);
}
