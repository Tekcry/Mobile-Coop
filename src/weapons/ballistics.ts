import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import type { DamageRegistry, Damageable, HitPart, Team } from '../game/damage';
import type { Prop, PropSystem } from '../world/props';
import type { Vfx } from '../vfx/vfx';
import { BUDGET } from '../physics/groups';

export interface RayHit {
  hit: boolean;
  point: Vector3;
  normal: Vector3;
  distance: number;
  target?: Damageable;
  part?: HitPart;
  prop?: Prop;
}

export interface ShotOwner {
  team: Team;
  id: string;
  collideWith: number;
}

interface Projectile {
  active: boolean;
  pos: Vector3;
  vel: Vector3;
  gravity: number;
  life: number;
  owner: ShotOwner;
  onHit: (h: RayHit, dir: Vector3, travelled: number) => void;
  travelled: number;
  tracer: string;
}

/** Shared ray/projectile logic for player and enemy weapons. */
export class Ballistics {
  private res = new PhysicsRaycastResult();
  private projectiles: Projectile[] = [];
  private eng: PhysicsEngine;
  /** Impact hook (audio). */
  onImpact: ((p: Vector3, onCharacter: boolean) => void) | null = null;

  constructor(
    scene: Scene,
    private registry: DamageRegistry,
    private props: PropSystem,
    private vfx: Vfx,
  ) {
    this.eng = scene.getPhysicsEngine() as PhysicsEngine;
    for (let i = 0; i < BUDGET.maxProjectiles; i++) {
      this.projectiles.push({
        active: false,
        pos: new Vector3(),
        vel: new Vector3(),
        gravity: 0,
        life: 0,
        owner: { team: 'neutral', id: '', collideWith: 0 },
        onHit: () => {},
        travelled: 0,
        tracer: '#fff',
      });
    }
  }

  /** Raycast and resolve what was hit. Reuses an internal result object. */
  /** True when nothing in `collideWith` lies between the two points (no allocation). */
  clear(from: Vector3, to: Vector3, collideWith: number): boolean {
    this.res.reset();
    this.eng.raycastToRef(from, to, this.res, { membership: G.PROJECTILE, collideWith });
    return !this.res.hasHit;
  }

  /** Distance to the first hit in `collideWith` along the segment, or the segment's length (no allocation). */
  hitDistance(from: Vector3, to: Vector3, collideWith: number): number {
    this.res.reset();
    this.eng.raycastToRef(from, to, this.res, { membership: G.PROJECTILE, collideWith });
    return this.res.hasHit ? Vector3.Distance(from, this.res.hitPoint) : Vector3.Distance(from, to);
  }

  ray(from: Vector3, to: Vector3, collideWith: number): RayHit {
    this.res.reset();
    this.eng.raycastToRef(from, to, this.res, { membership: G.PROJECTILE, collideWith });
    const r = this.res;
    if (!r.hasHit) return { hit: false, point: to.clone(), normal: Vector3.Up(), distance: Vector3.Distance(from, to) };
    const out: RayHit = {
      hit: true,
      point: r.hitPoint.clone(),
      normal: r.hitNormal.clone(),
      distance: Vector3.Distance(from, r.hitPoint),
    };
    const reg = this.registry.lookup(r.body);
    if (reg) {
      out.target = reg.target;
      out.part = reg.part;
    } else {
      const prop = this.props.get(r.body);
      if (prop) out.prop = prop;
    }
    return out;
  }

  /** Common impact visuals for a resolved hit. */
  impactFx(h: RayHit, dir: Vector3): void {
    if (!h.hit) return;
    this.onImpact?.(h.point, !!h.target);
    if (h.target) {
      this.vfx.hit(h.point, dir, h.part === 'head' ? '#ffe066' : '#ff6b5a', h.part === 'head' ? 7 : 4);
    } else if (h.prop) {
      this.vfx.sparks(h.point, h.normal, 4);
    } else {
      this.vfx.sparks(h.point, h.normal, 3);
      this.vfx.dust(h.point, h.normal);
      this.vfx.decal(h.point, h.normal);
    }
  }

  spawnProjectile(
    from: Vector3,
    vel: Vector3,
    gravity: number,
    life: number,
    owner: ShotOwner,
    tracer: string,
    onHit: Projectile['onHit'],
  ): boolean {
    const p = this.projectiles.find((q) => !q.active);
    if (!p) return false;
    p.active = true;
    p.pos.copyFrom(from);
    p.vel.copyFrom(vel);
    p.gravity = gravity;
    p.life = life;
    p.owner = owner;
    p.onHit = onHit;
    p.travelled = 0;
    p.tracer = tracer;
    return true;
  }

  /** Swept-ray projectile step (fixed rate). */
  update(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      const next = p.pos.add(p.vel.scale(dt));
      const h = this.ray(p.pos, next, p.owner.collideWith);
      const dir = p.vel.normalizeToNew();
      if (h.hit) {
        this.vfx.tracer(p.pos, h.point, p.tracer, 0.03);
        p.onHit(h, dir, p.travelled + h.distance);
        p.active = false;
        continue;
      }
      this.vfx.tracer(p.pos, next, p.tracer, 0.03);
      p.travelled += Vector3.Distance(p.pos, next);
      p.pos.copyFrom(next);
    }
  }
}

/** Orthonormal basis helpers for spread around a direction. */
export function spreadDir(dir: Vector3, sx: number, sy: number, out: Vector3): Vector3 {
  const up = Math.abs(dir.y) > 0.98 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const right = Vector3.Cross(up, dir).normalize();
  const u = Vector3.Cross(dir, right).normalize();
  out.copyFrom(dir).addInPlace(right.scaleInPlace(sx)).addInPlace(u.scaleInPlace(sy)).normalize();
  return out;
}

