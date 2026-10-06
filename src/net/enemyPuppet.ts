import { Vector3, type Scene } from '../core/babylon';
import type { CharacterRig } from '../player/characterRig';
import { buildEnemyRig } from '../ai/enemyRig';
import { Hitboxes } from '../ai/hitboxes';
import { DogModel } from '../ai/dogModel';
import { ENEMIES, type EnemyDef } from '../ai/enemyDefs';
import type { AlertLevel } from '../ai/alertState';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { TakedownVictim } from '../game/takedownController';
import type { World } from '../world/world';
import { SnapshotBuffer } from './interp';
import type { EnemyState } from './protocol';
import { hyp2 } from '../core/mathx';

/** Wire alert level (`EnemyState.al & 3`) -> the local level a takedown reads. */
const LEVELS: AlertLevel[] = ['unaware', 'investigating', 'searching', 'alert'];

/**
 * Client-side stand-in for a host-simulated enemy: interpolated rig (the dog: its own body) + local hit volumes so
 * the client's own shots resolve instantly. Damage is only predicted (flash, hit marker); the hit is sent to the
 * host, which decides. Explosions are ignored (the host applies them). A takedown seizes it locally (held where the
 * attacker puts it) and asks the host to seize the real enemy; finishing it sends the outcome.
 */
export class EnemyPuppet implements Damageable, TakedownVictim {
  readonly team = 'enemy' as const;
  readonly def: EnemyDef;
  readonly buf = new SnapshotBuffer<EnemyState>(30, 0.25);
  readonly pos = new Vector3();
  yaw = 0;
  rig: CharacterRig | null;
  private dog: DogModel | null = null;
  private hitboxes: Hitboxes | null;
  private crouch = 0;
  private aim = 0;
  private kick = 0;
  private flash = 0;
  private prev = new Vector3();
  private speed = 0;
  private head = new Vector3();
  private placed = false;
  private al = 0;
  dead = false;
  /** Seized by the local player's takedown (position from `holdAt`, not the host). */
  taken = false;
  /** A takedown started on the host and not yet finished / aborted (the controller clears `taken` first). */
  private seized = false;
  /** Seconds since the host last mentioned this enemy. */
  stale = 0;
  onShot: ((h: HitInfo) => void) | null = null;
  /** Takedown messages for the host. */
  onTakedown: ((phase: 'start' | 'done' | 'abort', lethal: boolean) => void) | null = null;

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
    if (this.def.quadruped) {
      this.dog = new DogModel(scene, world.parts, this.def.look.colors.torso, this.def.look.colors.accent);
      this.dog.setVisible(false);
    }
    this.hitboxes = new Hitboxes(scene, registry, this, this.def.scale, this.def.build);
  }

  get alive(): boolean {
    return !this.dead;
  }

  get alerted(): boolean {
    return (this.al & 3) === 3;
  }

  get level(): AlertLevel {
    return LEVELS[this.al & 3]!;
  }

  get bodyRig(): CharacterRig {
    return this.rig!;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.7 : 1.0) * this.def.scale, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.pos).addInPlaceFromFloats(0, (this.crouch > 0.5 ? 0.85 : 1.25) * this.def.scale, 0);
  }

  applyDamage(h: HitInfo): DamageResult {
    if (this.dead || h.attackerTeam !== 'player' || h.attackerId !== 'local') return { dealt: 0, killed: false };
    // the local takedown's lethal strike
    if (h.kind === 'melee') {
      if (this.seized) this.onTakedown?.('done', true);
      this.seized = this.taken = false;
      return { dealt: h.amount, killed: false };
    }
    if (h.kind !== 'bullet') return { dealt: 0, killed: false };
    this.flash = 1;
    this.onShot?.(h);
    return { dealt: h.amount * (h.part === 'head' ? this.def.headMult : this.def.armor), killed: false };
  }

  // --- takedown (local player) ---

  beginTakedown(choke: boolean): void {
    if (!this.seized) this.onTakedown?.('start', !choke);
    this.seized = this.taken = true;
    const rig = this.rig;
    if (!rig) return;
    rig.emote = (_r, t) => {
      const k = Math.min(1, t * 5);
      const w = Math.sin(t * 17) * 0.12 * k;
      return choke
        ? { neck: [-0.55 * k, 0, 0], shoulderL: [-1.9 * k, 0, -0.4 * k + w], shoulderR: [-1.9 * k, 0, 0.4 * k - w], elbowL: [0, 0, -1.7 * k], elbowR: [0, 0, 1.7 * k], pelvisLift: -0.08 * k }
        : { neck: [0.35 * k, 0, 0], chest: [0.25 * k, 0, 0], shoulderL: [-0.8 * k, 0, -0.6 * k + w], shoulderR: [-0.8 * k, 0, 0.6 * k - w] };
    };
    rig.emoteTime = 0;
  }

  holdAt(x: number, y: number, z: number, yaw: number): void {
    this.pos.set(x, y, z);
    this.yaw = yaw;
  }

  releaseTakedown(): void {
    if (!this.seized) return;
    this.seized = this.taken = false;
    if (this.rig) this.rig.emote = null;
    this.onTakedown?.('abort', false);
  }

  knockOut(h: HitInfo): void {
    void h;
    if (this.seized) this.onTakedown?.('done', false);
    this.seized = this.taken = false;
  }

  /** The host refused (or the enemy broke free there): let go locally. */
  deny(): void {
    this.seized = this.taken = false;
    if (this.rig) this.rig.emote = null;
  }

  /** The host decides about glints (a mark through one is refused there). */
  glintFor(x: number, y: number, z: number): number {
    void x;
    void y;
    void z;
    return 0;
  }

  /** Muzzle flash pose for a shot the host reported. */
  fired(): void {
    this.kick = 1;
  }

  update(dt: number, renderTime: number): void {
    if (!this.rig || this.dead) return;
    if (!this.taken) {
      const s = this.buf.sample(renderTime);
      if (!s) return;
      this.pos.set(s.x, s.y, s.z);
      this.yaw = s.yaw;
      this.al = s.state.al;
      const st = s.state.st;
      this.crouch += ((st === 2 ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
      this.aim += ((st === 1 || st === 2 ? 1 : 0.2) - this.aim) * Math.min(1, dt * 8);
    }
    if (!this.placed) {
      this.placed = true;
      this.prev.copyFrom(this.pos);
      if (this.dog) this.dog.setVisible(true);
      else this.rig.setEnabled(true);
    }
    const lx = this.pos.x - this.prev.x;
    const lz = this.pos.z - this.prev.z;
    const moved = hyp2(lx, lz);
    this.speed += (Math.min(dt > 0 ? moved / dt : 0, 10) - this.speed) * Math.min(1, dt * 10);
    this.prev.copyFrom(this.pos);
    this.kick = Math.max(0, this.kick - dt * 8);
    this.flash = Math.max(0, this.flash - dt * 9);
    if (this.dog) {
      this.dog.update(dt, this.pos.x, this.pos.y, this.pos.z, this.yaw, this.speed, this.alerted ? 1 : 0, this.kick);
      this.hitboxes?.sync(this.pos, this.dog.head);
      return;
    }
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
      aim: this.def.melee || this.taken ? 0 : this.aim,
      kick: this.def.melee ? 0 : this.kick,
      melee: this.def.melee && this.kick > 0 ? 1 - this.kick : -1,
    });
    this.rig.headNode.computeWorldMatrix(true);
    this.head.copyFrom(this.rig.headNode.getAbsolutePosition());
    this.hitboxes?.sync(this.pos, this.head);
  }

  /** Host confirmed the kill: drop hit volumes and hand the rig to a ragdoll (or remove it; a dog lies down). */
  die(): CharacterRig | null {
    if (this.dead) return null;
    this.dead = true;
    this.taken = false;
    this.hitboxes?.dispose();
    this.hitboxes = null;
    this.registry.removeTarget(this);
    const rig = this.rig;
    this.rig = null;
    if (this.dog) {
      this.dog.layDown();
      rig?.dispose();
      return null;
    }
    if (rig) {
      rig.heldWeapon = null;
      rig.emote = null;
    }
    return rig;
  }

  /** Per frame after death: the dog settles onto its side. */
  settle(dt: number): void {
    if (this.dead && this.dog) this.dog.update(dt, this.pos.x, this.pos.y, this.pos.z, this.yaw, 0, 0, 0);
  }

  dispose(): void {
    this.hitboxes?.dispose();
    this.hitboxes = null;
    this.registry.removeTarget(this);
    this.rig?.dispose();
    this.rig = null;
    this.dog?.dispose();
    this.dog = null;
  }
}
