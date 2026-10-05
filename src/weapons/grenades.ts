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
}

/** Thrown physics grenades with a fuse. Capped at 6 live. */
export class Grenades {
  private live: Live[] = [];

  constructor(
    private scene: Scene,
    private parts: PartLibrary,
    private explosions: Explosions,
  ) {}

  throw(from: Vector3, dir: Vector3, team: Team, owner: string, carryVel?: Vector3): void {
    if (this.live.length >= 6) return;
    const node = new TransformNode('grenade', this.scene);
    node.position.copyFrom(from);
    const mesh = this.parts.instance('sphere', '#3d4a2c', 'grenade');
    mesh.parent = node;
    mesh.scaling.setAll(0.16);
    const blink = this.parts.instance('box', '#ff3b2f', 'grenade-led');
    blink.parent = node;
    blink.scaling.setAll(0.05);
    blink.position.y = 0.08;
    const shape = new PhysicsShapeSphere(Vector3.Zero(), 0.08, this.scene);
    shape.filterMembershipMask = G.PROJECTILE;
    shape.filterCollideMask = G.STATIC | G.PROP;
    shape.material = { friction: 0.6, restitution: 0.35 };
    const body = new PhysicsBody(node, PhysicsMotionType.DYNAMIC, false, this.scene);
    body.shape = shape;
    body.setMassProperties({ mass: 0.4 });
    body.setAngularDamping(1.5);
    const v = dir.scale(GRENADE.throwSpeed).addInPlace(new Vector3(0, GRENADE.upBias, 0));
    if (carryVel) v.addInPlace(carryVel.scale(0.5));
    body.setLinearVelocity(v);
    this.live.push({ node, body, shape, mesh, blink, fuse: GRENADE.fuse, team, owner });
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const g = this.live[i]!;
      g.fuse -= dt;
      g.blink.isVisible = Math.floor(g.fuse * (g.fuse < 0.8 ? 12 : 4)) % 2 === 0;
      if (g.fuse > 0) continue;
      this.explosions.explode(g.node.position.clone(), GRENADE.radius, GRENADE.damage, GRENADE.force, g.team, g.owner);
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
