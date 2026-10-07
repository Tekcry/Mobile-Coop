import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
  PhysicsShapeSphere,
  Quaternion,
  TransformNode,
  Vector3,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import type { DamageRegistry, Damageable } from '../game/damage';
import { DEBUG_VOLUMES, type DebugVolume } from '../ui/debugVolumes';
import { hitVolumes, proportions, STANDARD_HEIGHT, type Build } from '../player/proportions';

/**
 * Kinematic hit volumes for a character: a body capsule (also blocks the player and props)
 * and a head sphere for headshots. Moved by teleporting their nodes (pre-step on).
 */
export class Hitboxes {
  private bodyNode: TransformNode;
  private headNode: TransformNode;
  readonly body: PhysicsBody;
  readonly head: PhysicsBody;
  private shapes: (PhysicsShapeCapsule | PhysicsShapeSphere)[] = [];
  private enabled = true;
  /** Hip joint height (m): where the posed pelvis sits along the body capsule (`sync` with hips). */
  private hipY = 0.9;
  private dbg: DebugVolume[];

  constructor(
    scene: Scene,
    private registry: DamageRegistry,
    target: Damageable,
    readonly scale = 1,
    build: Build = 'average',
  ) {
    // fitted to the shared rig's proportions (body type differences are within a few cm)
    const pr = proportions(build, STANDARD_HEIGHT * scale);
    const hv = hitVolumes(pr);
    this.hipY = pr.y.hip;
    this.bodyNode = new TransformNode('hb-body', scene);
    this.headNode = new TransformNode('hb-head', scene);
    const cap = new PhysicsShapeCapsule(new Vector3(0, hv.bodyY0, 0), new Vector3(0, hv.bodyY1, 0), hv.bodyR, scene);
    cap.filterMembershipMask = G.ENEMY | G.ENEMY_HITBOX;
    cap.filterCollideMask = G.PLAYER | G.PROJECTILE | G.PROP;
    const sph = new PhysicsShapeSphere(Vector3.Zero(), hv.headR, scene);
    sph.filterMembershipMask = G.ENEMY_HITBOX;
    sph.filterCollideMask = G.PROJECTILE;
    this.shapes.push(cap, sph);
    this.body = new PhysicsBody(this.bodyNode, PhysicsMotionType.ANIMATED, false, scene);
    this.body.shape = cap;
    this.body.disablePreStep = false;
    this.head = new PhysicsBody(this.headNode, PhysicsMotionType.ANIMATED, false, scene);
    this.head.shape = sph;
    this.head.disablePreStep = false;
    registry.register(this.body, target, 'body');
    registry.register(this.head, target, 'head');
    this.dbg = [
      { node: this.bodyNode, kind: 'capsule', y0: hv.bodyY0, y1: hv.bodyY1, r: hv.bodyR, color: '#ff5050' },
      { node: this.headNode, kind: 'sphere', y0: 0, y1: 0, r: hv.headR, color: '#ffd040' },
    ];
    for (const d of this.dbg) DEBUG_VOLUMES.add(d);
  }

  /**
   * Place at feet position; `headPos` from the rig's head node world position. (3.2.0) With `hipsPos` (players: the
   * posed pelvis) the body capsule runs along the hips -> head line instead of standing upright on the feet, so it
   * follows a hanging, crawling or leaning body and never covers its head.
   */
  sync(feet: Vector3, headPos: Vector3, hipsPos: Vector3 | null = null): void {
    if (!this.enabled) return;
    this.headNode.position.copyFrom(headPos);
    const n = this.bodyNode;
    if (!hipsPos) {
      n.position.copyFrom(feet);
      if (n.rotationQuaternion) n.rotationQuaternion.set(0, 0, 0, 1);
      return;
    }
    let ux = headPos.x - hipsPos.x;
    let uy = headPos.y - hipsPos.y;
    let uz = headPos.z - hipsPos.z;
    const len = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
    ux /= len;
    uy /= len;
    uz /= len;
    // rotation taking +Y onto u (half-way quaternion; u = -Y never happens for a live body)
    const q = (n.rotationQuaternion ??= new Quaternion());
    // (straight down: hanging inverted)
    if (1 + uy < 1e-4) q.set(1, 0, 0, 0);
    else q.set(uz, 0, -ux, 1 + uy).normalize();
    // the pelvis sits at the hip joint height along the capsule's axis
    n.position.set(hipsPos.x - ux * this.hipY, hipsPos.y - uy * this.hipY, hipsPos.z - uz * this.hipY);
  }

  /**
   * (3.2.0) Solid to bodies (the player's capsule) or not: a hostage held right in front of the operator must not push
   * them back. Bullets still hit it either way.
   */
  setSolid(on: boolean): void {
    const cap = this.shapes[0]!;
    cap.filterMembershipMask = on ? G.ENEMY | G.ENEMY_HITBOX : G.ENEMY_HITBOX;
  }

  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    // Park disabled volumes far below the map; cheaper than add/remove from the world.
    if (!on) {
      this.bodyNode.position.set(0, -500, 0);
      this.headNode.position.set(0, -500, 0);
    }
  }

  dispose(): void {
    for (const d of this.dbg) DEBUG_VOLUMES.delete(d);
    this.registry.unregisterBody(this.body);
    this.registry.unregisterBody(this.head);
    this.body.dispose();
    this.head.dispose();
    for (const s of this.shapes) s.dispose();
    this.bodyNode.dispose();
    this.headNode.dispose();
  }
}
