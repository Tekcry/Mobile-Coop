import { PhysicsBody, PhysicsMotionType, PhysicsShapeCapsule, Quaternion, TransformNode, Vector3, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { hitVolumes, proportions } from '../player/proportions';
import { Health } from '../game/health';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { PlayerRef } from '../ai/enemy';
import type { WeaponId } from '../weapons/weaponDefs';
import { WEAPONS } from '../weapons/weaponDefs';
import { attachedClamp, MAX_FREE_SPEED, moveSpeedCap, shotLimiter, type RateLimiter } from './validate';
import type { TraversalAnchors } from '../world/anchors';
import { PF, type PlayerState } from './protocol';
import type { RemoteAvatar } from './remoteAvatar';
import { hyp2 } from '../core/mathx';

/** Hip joint height (m) of the average build the capsule is fitted to. */
const HIP_Y = proportions('average').y.hip;

/** Max plausible horizontal speed (sprint + roll burst + slack), m/s (free movement: the speed gear's, `moveSpeedCap`). */
const MAX_SPEED = MAX_FREE_SPEED;

/**
 * Host-side model of a client: authoritative health, a hit capsule enemies can shoot, the
 * latest validated position (for AI, pickups and shot checks) and per-weapon fire budgets.
 */
export class RemotePlayer implements Damageable {
  readonly team = 'player' as const;
  readonly health = new Health(100, 50, 4, 30);
  readonly feet = new Vector3();
  readonly ref: PlayerRef;
  state: PlayerState | null = null;
  damageMul = 1;
  private lastT = -1;
  /** Seconds during which a large position jump is accepted (after a host-driven respawn). */
  private teleportGrace = 0;
  private node: TransformNode;
  private body: PhysicsBody;
  private shape: PhysicsShapeCapsule;
  private limiters = new Map<WeaponId, RateLimiter>();
  private blastT = -Infinity;
  violations = 0;
  /** Mark & Execute: charges earned by this player's takedowns, and an open execute (until, shots left). */
  execCharges = 0;
  execUntil = -1;
  execLeft = 0;
  onDamaged: ((h: HitInfo, dealt: number) => void) | null = null;
  onDeath: (() => void) | null = null;

  constructor(
    scene: Scene,
    private registry: DamageRegistry,
    readonly id: string,
    readonly avatar: RemoteAvatar,
    spawn: Vector3,
  ) {
    this.feet.copyFrom(spawn);
    this.node = new TransformNode(`remote-hitbox-${id}`, scene);
    const hv = hitVolumes(proportions('average'));
    this.shape = new PhysicsShapeCapsule(new Vector3(0, hv.bodyY0, 0), new Vector3(0, hv.headY - hv.bodyR * 0.5, 0), hv.bodyR, scene);
    this.shape.filterMembershipMask = G.PLAYER_HITBOX;
    this.shape.filterCollideMask = G.PROJECTILE;
    this.body = new PhysicsBody(this.node, PhysicsMotionType.ANIMATED, false, scene);
    this.body.shape = this.shape;
    this.body.disablePreStep = false;
    registry.register(this.body, this, 'body');
    this.ref = { id, target: this, feet: this.feet, speed: 0, crouched: false };
    this.sync();
  }

  get alive(): boolean {
    return this.health.alive;
  }

  get crouched(): boolean {
    return ((this.state?.f ?? 0) & PF.crouch) !== 0;
  }

  center(out: Vector3): Vector3 {
    return out.copyFrom(this.feet).addInPlaceFromFloats(0, this.crouched ? 0.7 : 1.0, 0);
  }

  aimPoint(out: Vector3): Vector3 {
    return out.copyFrom(this.feet).addInPlaceFromFloats(0, this.crouched ? 0.85 : 1.3, 0);
  }

  /**
   * Accept a client state. Positions that move faster than humanly possible are clamped
   * towards the claim (the client snaps back on its next correction) and counted.
   */
  accept(s: PlayerState, now: number, anchors: TraversalAnchors | null = null): void {
    const dt = this.lastT < 0 ? 1 : Math.min(1, now - this.lastT);
    this.lastT = now;
    const dx = s.x - this.feet.x;
    const dz = s.z - this.feet.z;
    const d = hyp2(dx, dz);
    // (3.2.0) free movement within the speed gear's pace; cover / traversal / the air keep the general cap
    const cap = moveSpeedCap(s.mv, (s.f & PF.crouch) !== 0, (s.f & PF.sprint) !== 0, (s.f & PF.driven) !== 0, (s.f & PF.grounded) !== 0);
    const max = Math.min(MAX_SPEED, cap) * dt + 0.75;
    if (d > max && this.teleportGrace <= 0 && this.state) {
      const k = max / d;
      s = { ...s, x: this.feet.x + dx * k, z: this.feet.z + dz * k };
      this.violations++;
    }
    // attached: on the anchor it claims (within half a metre), else pulled onto it (clamped, not kicked)
    const on = anchors ? attachedClamp(s.mv, anchors, s) : null;
    if (on && this.teleportGrace <= 0) {
      s = { ...s, x: on.x, y: on.y, z: on.z };
      this.violations++;
    }
    this.feet.set(s.x, s.y, s.z);
    this.ref.speed = Math.min(MAX_SPEED, d / Math.max(dt, 1 / 60));
    this.ref.crouched = (s.f & PF.crouch) !== 0;
    this.state = s;
    this.sync();
  }

  allowTeleport(seconds = 1.5): void {
    this.teleportGrace = seconds;
  }

  private protectT = 0;

  update(dt: number): void {
    this.teleportGrace = Math.max(0, this.teleportGrace - dt);
    if (this.protectT > 0) {
      this.protectT -= dt;
      if (this.protectT <= 0) this.damageMul = 1;
    }
    this.health.update(dt);
  }

  private sync(): void {
    const n = this.node;
    if (this.posed) {
      // (3.2.0) along the posed hips -> head line (hanging, crawling, leaning), set by `followPose`
      const h = this.poseHips;
      const u = this.poseUp;
      n.position.set(h.x - u.x * HIP_Y, h.y - u.y * HIP_Y, h.z - u.z * HIP_Y);
    } else {
      n.position.copyFrom(this.feet);
      if (this.crouched) n.position.y -= 0.5;
    }
    if (!this.alive) n.position.y = -500;
  }

  private posed = false;
  private poseHips = new Vector3();
  private poseUp = new Vector3(0, 1, 0);

  /** Per render frame (host), after the avatar is posed: the hit capsule follows the rig's hips -> head line. */
  followPose(hips: Vector3, head: Vector3): void {
    const u = this.poseUp.copyFrom(head).subtractInPlace(hips);
    const len = u.length();
    if (len < 0.2) return;
    u.scaleInPlace(1 / len);
    this.poseHips.copyFrom(hips);
    const q = (this.node.rotationQuaternion ??= new Quaternion());
    if (1 + u.y < 1e-4) q.set(1, 0, 0, 0);
    else q.set(u.z, 0, -u.x, 1 + u.y).normalize();
    this.posed = true;
    this.sync();
  }

  /** Per-weapon hit budget. */
  takeShot(w: WeaponId, now: number): boolean {
    let l = this.limiters.get(w);
    if (!l) {
      l = shotLimiter(WEAPONS[w]);
      this.limiters.set(w, l);
    }
    return l.take(now);
  }

  takeBlast(now: number): boolean {
    if (now - this.blastT < 1.2) return false;
    this.blastT = now;
    return true;
  }

  /** Hits that do not hurt (team-mates); PvP replaces it with the match's rules. */
  friendly: (h: HitInfo) => boolean = (h) => h.attackerTeam === 'player';
  /** The last hit taken (PvP credit). */
  lastHit: HitInfo | null = null;
  /** Feet / posed head and hips / mode history for lag-compensated PvP shots. */
  readonly history: { t: number; x: number; y: number; z: number; c: number; hx: number; hy: number; hz: number; bx: number; by: number; bz: number; m: string }[] = [];

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || this.friendly(h)) return { dealt: 0, killed: false };
    this.lastHit = h;
    const rolling = ((this.state?.f ?? 0) & PF.roll) !== 0;
    const dealt = this.health.damage(h.amount * this.damageMul * (rolling ? 0.5 : 1));
    if (dealt > 0) this.onDamaged?.(h, dealt);
    const killed = !this.health.alive;
    if (killed) {
      this.sync();
      this.onDeath?.();
    }
    return { dealt, killed };
  }

  revive(at: Vector3, protect = 2): void {
    this.lastHit = null;
    this.health.reset();
    this.feet.copyFrom(at);
    this.allowTeleport();
    this.damageMul = 0;
    this.protectT = protect;
    this.sync();
  }

  dispose(): void {
    this.registry.removeTarget(this);
    this.body.dispose();
    this.shape.dispose();
    this.node.dispose();
    this.avatar.dispose();
  }
}
