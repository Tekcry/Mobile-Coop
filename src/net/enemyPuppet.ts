import { Vector3, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import { buildEnemyRig } from '../ai/enemyRig';
import { Hitboxes } from '../ai/hitboxes';
import { ENEMIES, type EnemyDef } from '../ai/enemyDefs';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { World } from '../world/world';
import { SnapshotBuffer } from './interp';
import type { EnemyState } from './protocol';
import { hyp2 } from '../core/mathx';

/**
 * Client-side stand-in for a host-simulated enemy: interpolated rig + local hit volumes so the
 * client's own shots resolve instantly. Damage is only predicted (flash, hit marker); the hit is
 * sent to the host, which decides. Explosions are ignored (the host applies them).
 */
export class EnemyPuppet implements Damageable {
  readonly team = 'enemy' as const;
  readonly def: EnemyDef;
  readonly buf = new SnapshotBuffer<EnemyState>(30, 0.25);
  readonly pos = new Vector3();
  yaw = 0;
  rig: CharacterRig | null;
  private hitboxes: Hitboxes | null;
  private crouch = 0;
  private aim = 0;
  private kick = 0;
  private flash = 0;
  private prev = new Vector3();
  private speed = 0;
  private head = new Vector3();
  private placed = false;
  dead = false;
  /** Seconds since the host last mentioned this enemy. */
  stale = 0;
  onShot: ((h: HitInfo) => void) | null = null;

  constructor(
    scene: Scene,
    world: World,
    private registry: DamageRegistry,
    readonly id: string,
    kind: EnemyState['k'],
  ) {
    this.def = ENEMIES[kind];
    this.rig = buildEnemyRig(scene, world, this.def, `p${id}`).rig;
    this.rig.setEnabled(false);
    this.hitboxes = new Hitboxes(scene, registry, this, this.def.scale, this.def.build);
  }

  get alive(): boolean {
    return !this.dead;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.7 : 1.0) * this.def.scale, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.85 : 1.25) * this.def.scale, 0);
  }

  applyDamage(h: HitInfo): DamageResult {
    if (this.dead || h.attackerTeam !== 'player' || h.attackerId !== 'local' || h.kind !== 'bullet') return { dealt: 0, killed: false };
    this.flash = 1;
    this.onShot?.(h);
    return { dealt: h.amount * (h.part === 'head' ? this.def.headMult : this.def.armor), killed: false };
  }

  /** Muzzle flash pose for a shot the host reported. */
  fired(): void {
    this.kick = 1;
  }

  update(dt: number, renderTime: number): void {
    if (!this.rig || this.dead) return;
    const s = this.buf.sample(renderTime);
    if (!s) return;
    this.pos.set(s.x, s.y, s.z);
    this.yaw = s.yaw;
    if (!this.placed) {
      this.placed = true;
      this.prev.copyFrom(this.pos);
      this.rig.setEnabled(true);
    }
    const lx = this.pos.x - this.prev.x;
    const lz = this.pos.z - this.prev.z;
    const moved = hyp2(lx, lz);
    this.speed += (Math.min(dt > 0 ? moved / dt : 0, 10) - this.speed) * Math.min(1, dt * 10);
    this.prev.copyFrom(this.pos);
    const st = s.state.st;
    this.crouch += ((st === 2 ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    this.aim += ((st === 1 || st === 2 ? 1 : 0.2) - this.aim) * Math.min(1, dt * 8);
    this.kick = Math.max(0, this.kick - dt * 8);
    this.flash = Math.max(0, this.flash - dt * 9);
    const r = this.rig.root;
    r.position.copyFrom(this.pos);
    r.rotation.y = this.yaw;
    this.rig.setFlash(this.flash * 0.75);
    const sy = Math.sin(this.yaw);
    const cy = Math.cos(this.yaw);
    const inv = moved > 1e-4 ? 1 / moved : 0;
    this.rig.animate(dt, {
      speed: this.speed,
      localX: (lx * cy - lz * sy) * inv,
      localZ: (lx * sy + lz * cy) * inv,
      grounded: true,
      crouch: this.crouch,
      aimPitch: 0,
      aim: this.def.melee ? 0 : this.aim,
      kick: this.def.melee ? 0 : this.kick,
      melee: this.def.melee && this.kick > 0 ? 1 - this.kick : -1,
    });
    this.rig.headNode.computeWorldMatrix(true);
    this.head.copyFrom(this.rig.headNode.getAbsolutePosition());
    this.hitboxes?.sync(this.pos, this.head);
  }

  /** Host confirmed the kill: drop hit volumes and hand the rig to a ragdoll (or remove it). */
  die(): CharacterRig | null {
    if (this.dead) return null;
    this.dead = true;
    this.hitboxes?.dispose();
    this.hitboxes = null;
    this.registry.removeTarget(this);
    const rig = this.rig;
    if (rig) rig.heldWeapon = null;
    this.rig = null;
    return rig;
  }

  dispose(): void {
    this.hitboxes?.dispose();
    this.hitboxes = null;
    this.registry.removeTarget(this);
    this.rig?.dispose();
    this.rig = null;
  }
}
