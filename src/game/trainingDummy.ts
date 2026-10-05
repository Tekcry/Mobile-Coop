import { Vector3, type Scene } from '../core/babylon';
import { CharacterRig } from '../player/characterRig';
import { Hitboxes } from '../ai/hitboxes';
import { Health } from './health';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from './damage';
import type { World } from '../world/world';
import { defaultLook } from '../cosmetics/avatarLook';

let nextId = 1;

/** Sandbox target: takes damage, falls over, respawns. Optionally strafes. */
export class TrainingDummy implements Damageable {
  readonly id = `dummy-${nextId++}`;
  readonly team = 'enemy' as const;
  readonly health = new Health(100);
  private rig: CharacterRig;
  private hitboxes: Hitboxes;
  private deadT = 0;
  private t = Math.random() * 6;
  private pos: Vector3;
  private head = new Vector3();
  onKilled: ((h: HitInfo) => void) | null = null;

  constructor(
    scene: Scene,
    world: World,
    registry: DamageRegistry,
    private home: Vector3,
    private yaw: number,
    private strafe = 0,
  ) {
    const look = defaultLook();
    look.torso = 'armor';
    look.helmet = 'visor';
    look.backpack = 'none';
    look.colors.torso = '#c9b37a';
    look.colors.accent = '#d9493b';
    look.colors.legs = '#6b6252';
    look.colors.helmet = '#8f8a7a';
    this.rig = new CharacterRig(scene, (shape, hex) => world.parts.instance(shape, hex, 'dummy-part'), look, 1.8, this.id);
    for (const m of this.rig.parts) world.addShadowCaster(m);
    this.pos = home.clone();
    this.hitboxes = new Hitboxes(scene, registry, this);
    this.update(0);
  }

  get alive(): boolean {
    return this.health.alive;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, 1.0, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, 1.25, 0);
  }

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive) return { dealt: 0, killed: false };
    const dealt = this.health.damage(h.amount);
    const killed = !this.health.alive;
    if (killed) {
      this.deadT = 0;
      this.hitboxes.setEnabled(false);
      this.onKilled?.(h);
    }
    return { dealt, killed };
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.alive) {
      this.deadT += dt;
      this.rig.root.rotation.x = Math.max(-Math.PI / 2, -this.deadT * 6);
      if (this.deadT > 3) {
        this.health.reset();
        this.rig.root.rotation.x = 0;
        this.hitboxes.setEnabled(true);
      }
      this.rig.animate(dt, { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, roll: -1, aimPitch: 0, aim: 0, kick: 0 });
      return;
    }
    const prevX = this.pos.x;
    if (this.strafe > 0) {
      const ox = Math.sin(this.t * 0.9) * this.strafe;
      this.pos.set(this.home.x + Math.cos(this.yaw) * ox, this.home.y, this.home.z - Math.sin(this.yaw) * ox);
    }
    const speed = dt > 0 ? Math.abs(this.pos.x - prevX) / dt : 0;
    this.rig.root.position.copyFrom(this.pos);
    this.rig.root.rotation.y = this.yaw;
    this.rig.animate(dt, { speed, localX: 1, localZ: 0, grounded: true, crouch: 0, roll: -1, aimPitch: 0, aim: 0.3, kick: 0 });
    this.rig.headNode.computeWorldMatrix(true);
    this.head.copyFrom(this.rig.headNode.getAbsolutePosition());
    this.hitboxes.sync(this.pos, this.head);
  }

  dispose(): void {
    this.hitboxes.dispose();
    this.rig.dispose();
  }
}
