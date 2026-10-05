import {
  BallAndSocketConstraint,
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeBox,
  PhysicsShapeCapsule,
  Quaternion,
  TransformNode,
  Vector3,
  type PhysicsShape,
  type Scene,
} from '../core/babylon';
import { G, MASK } from '../physics/groups';
import type { CharacterRig } from '../player/characterRig';

/**
 * Three-body ragdoll (upper body + two legs joined by ball-and-socket hips). The rig's
 * pivots are re-parented onto physics nodes; after settling, bodies are removed and
 * the corpse sinks away.
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
    private rig: CharacterRig,
    impulse: Vector3,
  ) {
    const k = rig.height / 1.8;
    rig.root.computeWorldMatrix(true);
    const rot = Quaternion.RotationYawPitchRoll(rig.root.rotation.y, 0, 0);
    const mk = (src: TransformNode, name: string): TransformNode => {
      src.computeWorldMatrix(true);
      const n = new TransformNode(name, this.scene);
      n.position.copyFrom(src.getAbsolutePosition());
      n.rotationQuaternion = rot.clone();
      this.nodes.push(n);
      return n;
    };
    const torsoN = mk(rig.hips, 'rag-torso');
    const legLN = mk(rig.hipL, 'rag-legL');
    const legRN = mk(rig.hipR, 'rag-legR');
    // detach legs first (they are children of hips)
    for (const [leg, node] of [
      [rig.hipL, legLN],
      [rig.hipR, legRN],
    ] as const) {
      leg.parent = node;
      leg.position.setAll(0);
      leg.rotation.setAll(0);
    }
    rig.kneeL.rotation.x = 0.2;
    rig.kneeR.rotation.x = 0.2;
    rig.hips.parent = torsoN;
    rig.hips.position.setAll(0);
    rig.hips.rotation.setAll(0);

    const filt = (s: PhysicsShape): PhysicsShape => {
      s.filterMembershipMask = G.RAGDOLL;
      s.filterCollideMask = MASK.RAGDOLL_COLLIDE;
      s.material = { friction: 0.8, restitution: 0.05 };
      this.shapes.push(s);
      return s;
    };
    const torsoShape = filt(new PhysicsShapeBox(new Vector3(0, 0.38 * k, 0), Quaternion.Identity(), new Vector3(0.42 * k, 0.9 * k, 0.28 * k), scene));
    const legShape = (): PhysicsShape => filt(new PhysicsShapeCapsule(new Vector3(0, -0.1 * k, 0), new Vector3(0, -0.75 * k, 0), 0.09 * k, scene));
    const body = (node: TransformNode, shape: PhysicsShape, mass: number): PhysicsBody => {
      const b = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, scene);
      b.shape = shape;
      b.setMassProperties({ mass });
      b.setAngularDamping(0.8);
      b.setLinearDamping(0.2);
      this.bodies.push(b);
      return b;
    };
    const tb = body(torsoN, torsoShape, 30);
    const lb = body(legLN, legShape(), 8);
    const rb = body(legRN, legShape(), 8);
    const hipOff = (leg: TransformNode): Vector3 => leg.getAbsolutePosition().subtract(torsoN.position);
    for (const [leg, b] of [
      [legLN, lb],
      [legRN, rb],
    ] as const) {
      const pivotA = hipOff(leg);
      // pivots are in body-local space; torso has rotation `rot`
      const inv = rot.clone().invert();
      const local = new Vector3();
      pivotA.rotateByQuaternionToRef(inv, local);
      const c = new BallAndSocketConstraint(local, Vector3.Zero(), Vector3.Up(), Vector3.Up(), scene);
      tb.addConstraint(b, c);
    }
    tb.applyImpulse(impulse, torsoN.position.add(new Vector3(0, 0.6 * k, 0)));
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.frozen && this.t > 3.5) {
      this.frozen = true;
      for (const b of this.bodies) b.dispose();
      for (const s of this.shapes) s.dispose();
      this.bodies.length = 0;
    }
    if (this.frozen) {
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
