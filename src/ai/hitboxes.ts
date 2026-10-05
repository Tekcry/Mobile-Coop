import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeCapsule,
  PhysicsShapeSphere,
  TransformNode,
  Vector3,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import type { DamageRegistry, Damageable } from '../game/damage';

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

  constructor(
    scene: Scene,
    private registry: DamageRegistry,
    target: Damageable,
    readonly scale = 1,
  ) {
    const s = scale;
    this.bodyNode = new TransformNode('hb-body', scene);
    this.headNode = new TransformNode('hb-head', scene);
    const cap = new PhysicsShapeCapsule(new Vector3(0, 0.38 * s, 0), new Vector3(0, 1.18 * s, 0), 0.3 * s, scene);
    cap.filterMembershipMask = G.ENEMY | G.ENEMY_HITBOX;
    cap.filterCollideMask = G.PLAYER | G.PROJECTILE | G.PROP;
    const sph = new PhysicsShapeSphere(Vector3.Zero(), 0.18 * s, scene);
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
  }

  /** Place at feet position; `headPos` from the rig's head node world position. */
  sync(feet: Vector3, headPos: Vector3): void {
    if (!this.enabled) return;
    this.bodyNode.position.copyFrom(feet);
    this.headNode.position.copyFrom(headPos);
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
    this.registry.unregisterBody(this.body);
    this.registry.unregisterBody(this.head);
    this.body.dispose();
    this.head.dispose();
    for (const s of this.shapes) s.dispose();
    this.bodyNode.dispose();
    this.headNode.dispose();
  }
}
