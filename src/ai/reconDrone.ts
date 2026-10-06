import { PhysicsBody, PhysicsMotionType, PhysicsShapeSphere, TransformNode, Vector3, type InstancedMesh, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { hyp2, hyp3 } from '../core/mathx';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { Ballistics } from '../weapons/ballistics';
import type { Vfx } from '../vfx/vfx';
import type { PartLibrary } from '../world/partLibrary';
import { ARCHETYPE } from './archetypes';
import type { Enemy, PlayerRef } from './enemy';

let nextId = 1;

/**
 * The drone operator's recon drone: orbits its operator, its camera sweeps the floor below (no light needed),
 * and what it spots goes to the operator (suspicion, then an alert and the squad's radio). It can be shot down,
 * an EMP drops it, and it falls when its operator goes down.
 */
export class ReconDrone implements Damageable {
  readonly id = `rd${nextId++}`;
  readonly team = 'enemy' as const;
  hp: number = ARCHETYPE.drone.hp;
  readonly pos = new Vector3();
  yaw = 0;
  /** Spotting meter towards the target 0..1. */
  meter = 0;
  /** Spotted the target at least once (tests). */
  spotted = false;
  private node: TransformNode;
  private parts: InstancedMesh[] = [];
  private rotors: InstancedMesh[] = [];
  private led: InstancedMesh;
  private body: PhysicsBody;
  private shape: PhysicsShapeSphere;
  private angle = Math.random() * Math.PI * 2;
  private thinkT = 0;
  private spin = 0;
  private falling = false;
  private vy = 0;
  private stunT = 0;
  private gone = false;
  private eye = new Vector3();
  private to = new Vector3();

  constructor(
    scene: Scene,
    lib: PartLibrary,
    private registry: DamageRegistry,
    private ballistics: Ballistics,
    private vfx: Vfx,
    readonly operator: Enemy,
  ) {
    this.node = new TransformNode('recon-drone', scene);
    const add = (shape: Parameters<PartLibrary['instance']>[0], hex: string, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0): InstancedMesh => {
      const m = lib.instance(shape, hex, 'recon-part');
      m.parent = this.node;
      m.scaling.set(sx, sy, sz);
      m.position.set(x, y, z);
      this.parts.push(m);
      return m;
    };
    add('pill', '#3a2a2a', 0.3, 0.1, 0.3);
    add('sphere', '#1a1a1a', 0.1, 0.1, 0.1, 0, -0.06, 0.1);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      add('capsule', '#2a2a2a', 0.04, 0.22, 0.04, Math.sin(a) * 0.14, 0.02, Math.cos(a) * 0.14).rotation.set(Math.PI / 2, a, 0);
      this.rotors.push(add('torus', '#8a8f96', 0.16, 0.02, 0.16, Math.sin(a) * 0.26, 0.05, Math.cos(a) * 0.26));
    }
    this.led = add('sphere', '#ff2a1a', 0.05, 0.05, 0.05, 0, 0.06, -0.12);
    this.shape = new PhysicsShapeSphere(Vector3.Zero(), 0.28, scene);
    this.shape.filterMembershipMask = G.ENEMY_HITBOX;
    this.shape.filterCollideMask = G.PROJECTILE;
    this.body = new PhysicsBody(this.node, PhysicsMotionType.ANIMATED, false, scene);
    this.body.shape = this.shape;
    this.body.disablePreStep = false;
    registry.register(this.body, this, 'body');
    const o = operator.pos;
    this.pos.set(o.x + Math.sin(this.angle) * ARCHETYPE.drone.orbit, o.y + ARCHETYPE.drone.height, o.z + Math.cos(this.angle) * ARCHETYPE.drone.orbit);
    this.node.position.copyFrom(this.pos);
  }

  get alive(): boolean {
    return this.hp > 0 && !this.gone;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.pos);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.pos);
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || h.attackerTeam === 'enemy') return { dealt: 0, killed: false };
    const dealt = Math.min(this.hp, h.amount);
    this.hp -= dealt;
    this.vfx.sparks(this.pos, h.dir.scale(-1), 6, '#ffb347');
    if (this.hp <= 0) this.down();
    return { dealt, killed: this.hp <= 0 };
  }

  /** EMP: knocked out of the air. */
  emp(): void {
    if (!this.alive) return;
    this.stunT = 99;
    this.down();
  }

  private down(): void {
    if (this.falling) return;
    this.falling = true;
    this.hp = 0;
    this.registry.unregisterBody(this.body);
    this.registry.removeTarget(this);
    this.vfx.sparks(this.pos, Vector3.UpReadOnly as Vector3, 14, '#9aa3ad');
  }

  /** Fixed step. `players` from the manager; `perception` = the difficulty's meter scale. Returns false once gone. */
  update(dt: number, players: readonly PlayerRef[], perception: number, floorY: number, onSpot: (d: ReconDrone, p: PlayerRef, full: boolean) => void): boolean {
    if (this.gone) return false;
    const D = ARCHETYPE.drone;
    if (this.falling) {
      this.vy -= 9.81 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= floorY + 0.1) {
        this.pos.y = floorY + 0.1;
        this.gone = true;
        this.vfx.sparks(this.pos, Vector3.UpReadOnly as Vector3, 10, '#ffb347');
      }
      this.node.position.copyFrom(this.pos);
      return !this.gone;
    }
    const op = this.operator;
    if (!op.alive) {
      this.down();
      return true;
    }
    this.stunT = Math.max(0, this.stunT - dt);
    // orbit the operator (or circle over what it spotted while the squad hunts)
    const cx = op.pos.x;
    const cz = op.pos.z;
    const r = D.orbit;
    this.angle += (D.speed / r) * dt;
    const tx = cx + Math.sin(this.angle) * r;
    const tz = cz + Math.cos(this.angle) * r;
    const ty = op.pos.y + D.height;
    const k = Math.min(1, dt * 1.5);
    this.pos.x += (tx - this.pos.x) * k;
    this.pos.z += (tz - this.pos.z) * k;
    this.pos.y += (ty - this.pos.y) * k;
    // heading: along the orbit, camera tilted down
    this.yaw = this.angle + Math.PI / 2;
    this.node.position.copyFrom(this.pos);
    this.node.rotation.y = this.yaw;
    // spotting a few times a second (one ray)
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.25;
      let best: PlayerRef | null = null;
      let bd: number = D.range;
      for (const p of players) {
        if (!p.target.alive) continue;
        const d = hyp3(p.feet.x - this.pos.x, p.feet.y - this.pos.y, p.feet.z - this.pos.z);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      let rate = 0;
      if (best) {
        const dx = best.feet.x - this.pos.x;
        const dz = best.feet.z - this.pos.z;
        const ang = Math.abs(wrap(Math.atan2(dx, dz) - this.yaw));
        // the camera looks down and ahead: a wide cone, and straight below
        const below = hyp2(dx, dz) < 3;
        if (ang < D.half || below) {
          this.eye.set(this.pos.x, this.pos.y - 0.12, this.pos.z);
          best.target.aimPoint(this.to);
          const h = this.ballistics.ray(this.eye, this.to, G.STATIC);
          if (!h.hit || h.distance > Vector3.Distance(this.eye, this.to) - 0.3) {
            rate = D.rate * (1 - bd / D.range) * (best.crouched ? 0.7 : 1) * perception * 2;
          }
        }
      }
      this.meter = rate > 0 ? Math.min(1, this.meter + rate * 0.25) : Math.max(0, this.meter - 0.25 * 0.15);
      if (best && rate > 0) {
        const full = this.meter >= 1;
        if (full) this.spotted = true;
        onSpot(this, best, full);
      }
    }
    return true;
  }

  /** Render frame: rotors, LED blink (faster while it has something). */
  frame(dt: number): void {
    if (this.gone) return;
    this.spin += dt * (this.falling ? 6 : 45);
    for (let i = 0; i < this.rotors.length; i++) this.rotors[i]!.rotation.y = this.spin + i;
    this.led.isVisible = Math.floor(this.spin * (this.meter > 0.2 ? 0.4 : 0.1)) % 2 === 0;
  }

  dispose(): void {
    if (!this.falling) {
      this.registry.unregisterBody(this.body);
      this.registry.removeTarget(this);
    }
    this.gone = true;
    this.body.dispose();
    this.shape.dispose();
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    this.node.dispose();
  }
}

function wrap(a: number): number {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
