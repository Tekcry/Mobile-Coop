import { PhysicsBody, PhysicsMotionType, PhysicsShapeCapsule, TransformNode, Vector3, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { hitVolumes, proportions } from '../player/proportions';

/** Body capsule of the average build (the hit capsule's size): feet-relative bottom and top centres, radius. */
const HV = hitVolumes(proportions('average'));
/** (T5b2) A shown-feet jump longer than this between two syncs is a teleport: the blocker parks for `JUMP_PARK` frames. */
const JUMP_DIST = 0.6;
const JUMP_PARK = 3;

/** True while a remote team-mate's movement mode must not block (the boost and the human ladder overlap the pair). */
export function partnerPassable(mode: string): boolean {
  return mode === 'boost' || mode === 'stacked';
}

/**
 * (T5b2, D49) A co-op partner as a solid body: an upright capsule at their shown (interpolated) feet, in `G.PARTNER`,
 * which the local player's controller collides with (`MASK.PLAYER_COLLIDE`). Every page makes one per partner, so
 * partners block each other the same way on the host and on a client. Nothing else collides with it (bullets use the
 * hit capsule, AI sight the world). Parked under the map while the partner is down or in a boost / human ladder.
 */
export class PartnerBlocker {
  private node: TransformNode;
  private body: PhysicsBody;
  private shape: PhysicsShapeCapsule;
  private solid = true;
  /** The feet fed by the last sync (NaN before the first) and the frames left parked after a jump. */
  private last = new Vector3(NaN, NaN, NaN);
  private parkFrames = 0;

  constructor(scene: Scene, id: string) {
    this.node = new TransformNode(`partner-block-${id}`, scene);
    this.node.position.set(0, -500, 0);
    this.shape = new PhysicsShapeCapsule(new Vector3(0, HV.bodyY0, 0), new Vector3(0, HV.headY - HV.bodyR * 0.5, 0), HV.bodyR, scene);
    this.shape.filterMembershipMask = G.PARTNER;
    this.shape.filterCollideMask = G.PLAYER;
    this.body = new PhysicsBody(this.node, PhysicsMotionType.ANIMATED, false, scene);
    this.body.shape = this.shape;
    this.body.disablePreStep = false;
  }

  /** Per render frame: follow the partner's shown feet (lowered while crouched), or park it when not solid. */
  sync(feet: Vector3, crouched: boolean, solid: boolean): void {
    const dx = feet.x - this.last.x;
    const dy = feet.y - this.last.y;
    const dz = feet.z - this.last.z;
    // a teleport (or the first sync): never sweep the capsule from the old spot, appear a few frames later
    if (!(dx * dx + dy * dy + dz * dz <= JUMP_DIST * JUMP_DIST)) this.parkFrames = JUMP_PARK;
    this.last.copyFrom(feet);
    if (this.parkFrames > 0) {
      this.parkFrames--;
      solid = false;
    }
    this.solid = solid;
    if (!solid) {
      this.node.position.set(0, -500, 0);
      return;
    }
    this.node.position.copyFrom(feet);
    if (crouched) this.node.position.y -= 0.5;
  }

  /** Tests: the capsule radius. */
  get radius(): number {
    return HV.bodyR;
  }

  /** Tests: whether it blocks now. */
  get blocking(): boolean {
    return this.solid;
  }

  dispose(): void {
    this.body.dispose();
    this.shape.dispose();
    this.node.dispose();
  }
}
