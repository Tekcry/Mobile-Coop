import {
  BallAndSocketConstraint,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
  TransformNode,
  Vector3,
  type PhysicsShape,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';

/**
 * Five-body ragdoll fitted to the shared rig: torso (pelvis..head), two legs and two arms,
 * joined by ball-and-socket constraints at the hips and shoulders. Knees/elbows keep the pose
 * they died in. Rig joints are re-parented onto physics nodes (world transforms preserved), so the
 * smooth body parts simply ride along. Limbs never collide with their own torso; torsos collide
 * with the world, props and other ragdolls. After settling the physics bodies are removed; the corpse
 * then sinks away, or with `keep` stays where it lies (a body that can be found and carried). The count of
 * simulating ragdolls is capped by `BUDGET.maxRagdolls`.
 */
export class Ragdoll {
  private nodes: TransformNode[] = [];
  private bodies: PhysicsBody[] = [];
  private shapes: PhysicsShape[] = [];
  private t = 0;
  private frozen = false;
  done = false;

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
      s.filterCollideMask = self ? G.STATIC | G.PROP | G.RAGDOLL : G.STATIC | G.PROP;
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

  update(dt: number): void {
    this.t += dt;
    if (!this.frozen && this.t > this.settleTime) {
      this.frozen = true;
      for (const b of this.bodies) b.dispose();
      for (const s of this.shapes) s.dispose();
      this.bodies.length = 0;
    }
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
