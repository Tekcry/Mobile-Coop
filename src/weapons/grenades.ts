import {
  PhysicsBody,
  PhysicsMotionType,
  PhysicsShapeSphere,
  TransformNode,
  Vector3,
  type AbstractMesh,
  type Scene,
} from '../core/babylon';
import { G } from '../physics/groups';
import { voxeliseParts } from '../voxel/voxelGroup';
import type { PartLibrary } from '../world/partLibrary';
import type { Explosions } from './explosions';
import { GRENADE } from './weaponDefs';
import type { Team } from '../game/damage';

interface Live {
  node: TransformNode;
  body: PhysicsBody;
  shape: PhysicsShapeSphere;
  mesh: AbstractMesh;
  blink: AbstractMesh;
  fuse: number;
  team: Team;
  owner: string;
  kind: string;
}

/** Thrown physics grenades with a fuse. Capped at 6 live. */
export class Grenades {
  private live: Live[] = [];
  /** Non-frag kinds (gas, flash, EMP...) go off through this instead of exploding. */
  onDetonate: ((kind: string, at: Vector3, team: Team, owner: string) => void) | null = null;

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
    private explosions: Explosions,
  ) {}

  /** `dir` is a unit direction (thrown at the standard speed), or with `isVelocity` the exact launch velocity. */
  throw(from: Vector3, dir: Vector3, team: Team, owner: string, carryVel?: Vector3, isVelocity = false, kind = 'frag', color = '#3d4a2c', fuse: number = GRENADE.fuse): void {
    if (this.live.length >= 6) return;
    const node = new TransformNode('grenade', this.scene);
    node.position.copyFrom(from);
    const mesh = this.parts.instance('sphere', color, 'grenade');
    mesh.parent = node;
    mesh.scaling.setAll(0.16);
    const blink = this.parts.instance('box', '#ff3b2f', 'grenade-led');
    blink.parent = node;
    blink.scaling.setAll(0.05);
    blink.position.y = 0.08;
    // voxels (3.0): the body (the LED blinks, so it stays a part)
    voxeliseParts(this.scene, node, [mesh], 'grenade');
    const shape = new PhysicsShapeSphere(Vector3.Zero(), 0.08, this.scene);
    shape.filterMembershipMask = G.PROJECTILE;
    shape.filterCollideMask = G.STATIC | G.PROP;
    shape.material = { friction: 0.6, restitution: 0.35 };
    const body = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, this.scene);
    body.shape = shape;
    body.setMassProperties({ mass: 0.4 });
    body.setAngularDamping(1.5);
    const v = isVelocity ? dir.clone() : dir.scale(GRENADE.throwSpeed).addInPlace(new Vector3(0, GRENADE.upBias, 0));
    if (carryVel) v.addInPlace(carryVel.scale(0.5));
    body.setLinearVelocity(v);
    this.live.push({ node, body, shape, mesh, blink, fuse, team, owner, kind });
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const g = this.live[i]!;
      g.fuse -= dt;
      g.blink.isVisible = Math.floor(g.fuse * (g.fuse < 0.8 ? 12 : 4)) % 2 === 0;
      if (g.fuse > 0) continue;
      if (g.kind === 'frag' || !this.onDetonate) this.explosions.explode(g.node.position.clone(), GRENADE.radius, GRENADE.damage, GRENADE.force, g.team, g.owner);
      else this.onDetonate(g.kind, g.node.position.clone(), g.team, g.owner);
      this.remove(g);
      this.live.splice(i, 1);
    }
  }

  /** Grenade positions for HUD warning indicators. */
  positions(): Vector3[] {
    return this.live.map((g) => g.node.position);
  }

  private remove(g: Live): void {
    g.body.dispose();
    g.shape.dispose();
    g.mesh.dispose();
    g.blink.dispose();
    g.node.dispose();
  }

  dispose(): void {
    for (const g of this.live) this.remove(g);
    this.live.length = 0;
  }
}
