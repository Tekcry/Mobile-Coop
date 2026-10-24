import {
  BallAndSocketConstraint,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
  Quaternion,
  TransformNode,
  Vector3,
  type PhysicsShape,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';

/** (rig-pose-fix S5) Seconds a settled ragdoll takes to ease onto its body's sim lie. */
export const SNAP_EASE = 0.3;
const SNAP_Q = new Quaternion();

/**
 * Five-body ragdoll fitted to the shared rig: torso (pelvis..head), two legs and two arms,
 * joined by ball-and-socket constraints at the hips and shoulders. Knees/elbows keep the pose
 * they died in. Rig joints are re-parented onto physics nodes (world transforms preserved), so the
 * smooth body parts simply ride along. Limbs never collide with their own torso; torsos collide
 * with the world, props and other ragdolls. After settling the physics bodies are removed; the corpse
 * then sinks away, or with `keep` stays where it lies (a body that can be found and carried). The count of
 * simulating ragdolls is capped by `BUDGET.maxRagdolls`.
 *
 * (rig-pose-fix S5) Visual only: gameplay reads the body's sim lie (`bodyLie.ts`), never these nodes. A kept body's
 * ragdoll is given that lie (`snapTo`) and, once it settles, eases there in `SNAP_EASE` s (its pelvis onto the lie's
 * pelvis, turned about it so its head points the lie's way).
 */
export class Ragdoll {
  private nodes: TransformNode[] = [];
  private bodies: PhysicsBody[] = [];
  private shapes: PhysicsShape[] = [];
  private t = 0;
  private frozen = false;
  done = false;
  /** (S5) The sim lie to settle onto (`snapTo`), the ease's clock (< 0: not started) and its start pose. */
  private snap: { x: number; y: number; z: number; headYaw: number } | null = null;
  private snapT = -1;
  private snapFrom: { p: Vector3; q: Quaternion }[] | null = null;
  private snapP0 = new Vector3();
  private snapYaw = 0;

  constructor(
    private scene: Scene,
    readonly rig: CharacterRig,
    impulse: Vector3,
    readonly keep = false,
    /** Seconds of simulation before it freezes. */
    private settleTime = 3.5,
  ) {
    const p = rig.p;
    rig.heldWeapon = null;
    rig.emote = null;
    rig.root.computeWorldMatrix(true);
    const mk = (src: TransformNode, name: string): TransformNode => {
      src.computeWorldMatrix(true);
      const n = new TransformNode(name, this.scene);
      n.position.copyFrom(src.getAbsolutePosition());
      n.rotationQuaternion = src.absoluteRotationQuaternion.clone();
      this.nodes.push(n);
      return n;
    };
    const torsoN = mk(rig.hips, 'rag-torso');
    const legs = [mk(rig.hipL, 'rag-legL'), mk(rig.hipR, 'rag-legR')] as const;
    const arms = [mk(rig.shoulderL, 'rag-armL'), mk(rig.shoulderR, 'rag-armR')] as const;
    // limbs first (they are descendants of the pelvis), then the pelvis itself
    rig.hipL.setParent(legs[0]);
    rig.hipR.setParent(legs[1]);
    rig.shoulderL.setParent(arms[0]);
    rig.shoulderR.setParent(arms[1]);
    rig.hips.setParent(torsoN);

    const filt = (s: PhysicsShape, self: boolean): PhysicsShape => {
      s.filterMembershipMask = G.RAGDOLL;
      s.filterCollideMask = self ? G.STATIC | G.PROP | G.RAGDOLL | G.GLASS : G.STATIC | G.PROP | G.GLASS;
      s.material = { friction: 0.85, restitution: 0.05 };
      this.shapes.push(s);
      return s;
    };
    const torsoTop = p.y.neck - p.y.hip + p.head.h * 0.3;
    const torsoShape = filt(new PhysicsShapeCapsule(new Vector3(0, 0.02, 0), new Vector3(0, torsoTop, 0), p.chest.d * 0.55, scene), true);
    const legLen = (p.thigh.len + p.calf.len) * 0.92;
    const armLen = (p.upperArm.len + p.forearm.len) * 0.9;
    const body = (node: TransformNode, shape: PhysicsShape, mass: number): PhysicsBody => {
      const b = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, scene);
      b.shape = shape;
      b.setMassProperties({ mass });
      b.setAngularDamping(0.9);
      b.setLinearDamping(0.2);
      this.bodies.push(b);
      return b;
    };
    const tb = body(torsoN, torsoShape, 34);
    torsoN.computeWorldMatrix(true);
    const invTorso = torsoN.getWorldMatrix().clone().invert();
    const join = (limb: TransformNode, shape: PhysicsShape, mass: number): void => {
      const b = body(limb, shape, mass);
      const pivotA = Vector3.TransformCoordinates(limb.position, invTorso);
      tb.addConstraint(b, new BallAndSocketConstraint(pivotA, Vector3.Zero(), Vector3.Up(), Vector3.Up(), scene));
    };
    for (const l of legs) join(l, filt(new PhysicsShapeCapsule(new Vector3(0, -0.06, 0), new Vector3(0, -legLen, 0), p.thigh.r0 * 0.85, scene), false), 10);
    for (const a of arms) join(a, filt(new PhysicsShapeCapsule(new Vector3(0, -0.04, 0), new Vector3(0, -armLen, 0), p.upperArm.r0, scene), false), 4);
    tb.applyImpulse(impulse, torsoN.position.add(new Vector3(0, 0.45, 0)));
  }

  /** Physics done: the corpse lies still (no longer counts against the ragdoll budget). */
  get settled(): boolean {
    return this.frozen;
  }

  /** Pelvis world position. */
  torso(out: Vector3): Vector3 {
    return out.copyFrom(this.nodes[0]!.position);
  }

  /** (S5) The sim lie this kept body settles onto: pelvis (x, y, z), head toward `headYaw` (rad, 0 = +Z). */
  snapTo(x: number, y: number, z: number, headYaw: number): void {
    this.snap = { x, y, z, headYaw };
    this.snapT = -1;
    if (this.frozen) this.beginSnap();
  }

  /** The way the head points from the pelvis now (rad, 0 = +Z). */
  headYaw(): number {
    const r = this.rig;
    r.hips.computeWorldMatrix(true);
    r.headNode.computeWorldMatrix(true);
    const h = r.headNode.getAbsolutePosition();
    const p = r.hips.getAbsolutePosition();
    return Math.atan2(h.x - p.x, h.z - p.z);
  }

  /** Settled: the ease from where physics left it starts (the nodes' poses kept as its start; once per body). */
  private beginSnap(): void {
    const s = this.snap;
    if (!s || this.done || !this.keep) return;
    this.snapFrom = this.nodes.map((n) => ({ p: n.position.clone(), q: (n.rotationQuaternion ?? Quaternion.Identity()).clone() }));
    this.snapP0.copyFrom(this.nodes[0]!.position);
    let d = s.headYaw - this.headYaw();
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    this.snapYaw = d;
    this.snapT = 0;
  }

  private stepSnap(dt: number): void {
    const s = this.snap;
    const from = this.snapFrom;
    if (!s || !from || this.snapT < 0 || this.snapT >= SNAP_EASE) return;
    this.snapT = Math.min(SNAP_EASE, this.snapT + dt);
    const e = this.snapT / SNAP_EASE;
    const a = e * e * (3 - 2 * e);
    const ang = this.snapYaw * a;
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const p0 = this.snapP0;
    const px = p0.x + (s.x - p0.x) * a;
    const py = p0.y + (s.y - p0.y) * a;
    const pz = p0.z + (s.z - p0.z) * a;
    Quaternion.RotationYawPitchRollToRef(ang, 0, 0, SNAP_Q);
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i]!;
      const f = from[i]!;
      const lx = f.p.x - p0.x;
      const lz = f.p.z - p0.z;
      // turned about the pelvis on the vertical (a yaw takes +Z to (sin, cos)), then carried onto the lie
      n.position.set(px + lx * c + lz * sn, py + (f.p.y - p0.y), pz - lx * sn + lz * c);
      n.rotationQuaternion = SNAP_Q.multiplyToRef(f.q, n.rotationQuaternion ?? new Quaternion());
    }
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.frozen && this.t > this.settleTime) {
      this.frozen = true;
      for (const b of this.bodies) b.dispose();
      for (const s of this.shapes) s.dispose();
      this.bodies.length = 0;
      this.beginSnap();
    }
    if (this.frozen && this.keep) this.stepSnap(dt);
    if (this.frozen && !this.keep) {
      for (const n of this.nodes) n.position.y -= dt * 0.25;
      if (this.t > 5.5) this.dispose();
    }
  }

  dispose(): void {
    if (this.done) return;
    this.done = true;
    for (const b of this.bodies) b.dispose();
    for (const s of this.shapes) s.dispose();
    this.rig.dispose();
    for (const n of this.nodes) n.dispose();
  }
}
