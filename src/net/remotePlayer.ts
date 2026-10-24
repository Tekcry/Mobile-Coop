import { Vector3, type Scene } from '../core/babylon';
import { dropBadDoorMove, dropBadWallMove } from '../player/moveState';
import { attachLiftOf, crouchBlendOf, crouchStep, emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody, PLAYER_OPERATOR_HEIGHT, wireBodyIn, wireKneel, wireTense } from '../player/playerVolumes';
import { PlayerHitVolumes, playerPartMult } from '../game/playerHitVolumes';
import { WALL, WALL_SUB, wallPeekOffset } from '../player/wallController';
import { Health } from '../game/health';
import { HALL_BACK_HOLD } from '../game/jammer';
import type { DamageRegistry, Damageable, DamageResult, HitInfo } from '../game/damage';
import type { PlayerRef } from '../ai/enemy';
import type { WeaponId } from '../weapons/weaponDefs';
import { WEAPONS } from '../weapons/weaponDefs';
import { attachedClamp, hostDrawPhase, hostWeapon, MAX_FREE_SPEED, moveSpeedCap, shotLimiter, type RateLimiter } from './validate';
import type { TraversalAnchors } from '../world/anchors';
import { PF, type PlayerState } from './protocol';
import type { RemoteAvatar } from './remoteAvatar';
import type { PartnerBlocker } from './partnerBlocker';
import { hyp2 } from '../core/mathx';
import type { CoverSegment } from '../cover/coverData';
import type { CoverSpot } from '../game/tactics';


/** Max plausible horizontal speed (top run + roll burst + slack), m/s (free movement: the speed gear's, `moveSpeedCap`). */
const MAX_SPEED = MAX_FREE_SPEED;

/**
 * Host-side model of a client: authoritative health, split hit volumes enemies can shoot, the
 * latest validated position (for AI, pickups and shot checks) and per-weapon fire budgets.
 * (rig-pose-fix S1, G3 / G4) The volumes, the perception points and the wall head sample come from the sim body model
 * (`playerBody`) fed from the client's latest accepted `PlayerState` / `MoveState` at the host's sim time, as the
 * client's own `PlayerTarget` builds them: never from the host's drawn copy (0.1 s behind, the host's mocap set, anim
 * LOD and frame rate).
 */
export class RemotePlayer implements Damageable {
  readonly team = 'player' as const;
  readonly health = new Health(100);
  readonly feet = new Vector3();
  readonly ref: PlayerRef;
  state: PlayerState | null = null;
  damageMul = 1;
  private lastT = -1;
  /** Seconds during which a large position jump is accepted (after a host-driven respawn). */
  private teleportGrace = 0;
  /** (guard-ai S26 fix) The last accepted state continued the one before (no jump past the plausible-move bound) and the
   *  host has not moved this copy since: only then can its step make a noise (`clientStepNoise`). */
  stepOk = false;
  private vols: PlayerHitVolumes;
  /** (rig-pose-fix S1) The sim body's input and joint centres from the latest accepted state. */
  readonly bodyIn = emptyPlayerBodyIn();
  readonly body = emptyPlayerBodyOut();
  /** The crouch flag eased as the owner's controller eases it (`crouchStep`, linear amount) and the still-crouched time
   *  (the kneel, `wireKneel`: not in the tense sneak). */
  private crouchK = 0;
  private kneelT = 0;
  private readonly liftTmp = { x: 0, y: 0, z: 0 };
  private limiters = new Map<WeaponId, RateLimiter>();
  private blastT = -Infinity;
  violations = 0;
  private wallSpot: CoverSpot | null = null;
  /** (step 09) The validated lobby loadout (`PlayerInfo.loadout`) and the last weapon id accepted from it. */
  loadout: readonly WeaponId[] = [];
  private lastW: WeaponId | null = null;
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
    // (operators 11e) fitted to the body shown: Wren (1.68 m, G72 proportions); (rig-pose-fix S1) split like the local
    // player's (legs, torso, head: headshots count on both)
    this.bodyIn.height = PLAYER_OPERATOR_HEIGHT;
    this.vols = new PlayerHitVolumes(scene, registry, this, `remote-hit-${id}`, PLAYER_OPERATOR_HEIGHT);
    // (operators 11e r1) the partner's light is sampled at its body's height (host and client alike, nothing sent)
    this.ref = { id, target: this, feet: this.feet, speed: 0, crouched: false, height: avatar.rig.height };
    this.sync();
  }

  get alive(): boolean {
    return this.health.alive;
  }

  get crouched(): boolean {
    return ((this.state?.f ?? 0) & PF.crouch) !== 0;
  }

  /** (rig-pose-fix S1, G2) The perception points from the sim body, as the local player's (`PlayerTarget`). */
  center(out: Vector3): Vector3 {
    return this.vols.center(out);
  }

  aimPoint(out: Vector3): Vector3 {
    return this.vols.aimPoint(out);
  }

  /** Head volume centre (guard exposure sampling; on a wall `ref.head`, the light meter's head sample, is this point). */
  headPoint(out: Vector3): Vector3 {
    return this.vols.headPoint(out);
  }

  /**
   * Accept a client state. Positions that move faster than humanly possible are clamped
   * towards the claim (the client snaps back on its next correction) and counted.
   */
  accept(s: PlayerState, now: number, anchors: TraversalAnchors | null = null, segs: readonly CoverSegment[] | null = null, doorCount: number | null = null): void {
    // (step 09, D8) the weapon from the lobby loadout only; holstered while the host sees busy hands or downed
    // (step 11 r3) a wall segment outside this level: no wall pose from a stale face
    if (segs) dropBadWallMove(s, segs.length);
    // (step 13) a door peek on a door this level does not have: no door pose
    if (doorCount !== null) dropBadDoorMove(s, doorCount);
    s.w = hostWeapon(s.w, this.loadout, this.lastW);
    this.lastW = s.w;
    if (s.mv) s.mv.dw = hostDrawPhase(s.mv, !this.alive);
    const dt = this.lastT < 0 ? 1 : Math.min(1, now - this.lastT);
    this.lastT = now;
    const dx = s.x - this.feet.x;
    const dz = s.z - this.feet.z;
    const d = hyp2(dx, dz);
    // (3.2.0) free movement within the speed gear's pace; traversal / the air keep the general cap
    const cap = moveSpeedCap(s.mv, (s.f & PF.crouch) !== 0, (s.f & PF.driven) !== 0, (s.f & PF.grounded) !== 0);
    const max = Math.min(MAX_SPEED, cap) * dt + 0.75;
    // (guard-ai S26 fix) a jump (teleport, respawn, send-back, a clamped claim) is never a step
    this.stepOk = this.state !== null && d <= max;
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
    // (locomotion step 11) back to a wall: the segment's cover spot for the guards' flank / grenade tactics (D8)
    const wseg = s.mv?.m === 'wall' && segs ? segs[s.mv.a] : undefined;
    if (wseg) {
      const c = (this.wallSpot ??= { nx: 0, nz: 1, low: false, x: 0, z: 0 });
      c.nx = wseg.nx;
      c.nz = wseg.nz;
      c.low = wseg.low;
      c.x = s.x;
      c.z = s.z;
      this.ref.coverT = this.ref.cover ? (this.ref.coverT ?? 0) + dt : 0;
      this.ref.cover = c;
    } else {
      this.ref.cover = null;
      this.ref.coverT = 0;
    }
    // (step 12, light parity) peeking: the head past the edge, where the host samples its light and exposure
    // (r1) eased like the owner's 0.2 s blend from the time since the peek bit came on (no extra bandwidth)
    const peeking = !!wseg && ((s.mv?.sub ?? 0) & WALL_SUB.peek) !== 0;
    this.peekK = peeking ? Math.min(1, this.peekK + dt / WALL.peekBlend) : 0;
    wallPeekOffset(s.mv?.m ?? '', s.mv?.sub ?? 0, wseg ? wseg.tx : 0, wseg ? wseg.tz : 0, this.peekTmp, this.peekK);
    this.ref.peekX = this.peekTmp.x;
    this.ref.peekZ = this.peekTmp.z;
    this.state = s;
    // (rig-pose-fix S1) the sim body's input from the accepted state, as the owner's `PlayerTarget.sync` builds it
    const crouched = (s.f & PF.crouch) !== 0;
    this.crouchK = crouchStep(this.crouchK, crouched, dt);
    const mvm = s.mv?.m;
    this.kneelT = crouched && this.ref.speed < 0.15 && (!mvm || mvm === 'ground' || mvm === 'wall' || mvm === 'doorPeek') ? this.kneelT + dt : 0;
    // the travel's sideways share from the accepted step (the owner's local move)
    const strafe = d > 0.01 ? Math.abs(dx * Math.cos(s.yaw) - dz * Math.sin(s.yaw)) / d : 0;
    const lift = attachLiftOf(s.mv, anchors && s.mv ? anchors.all[s.mv.a] : undefined, PLAYER_OPERATOR_HEIGHT, this.liftTmp);
    // (S1 fix round, check A B1) no kneel in the tense sneak, as the owner's controller (one rule, the same guards)
    const tense = wireTense(crouched, (s.f & PF.grounded) !== 0, mvm, s.x, s.z);
    wireBodyIn(s, crouchBlendOf(this.crouchK), wireKneel(this.kneelT, tense), this.peekK, strafe, MAX_SPEED, lift, this.bodyIn);
    this.sync();
  }

  private readonly peekTmp = { x: 0, z: 0 };
  /** (step 12 r1) The peek blend amount from the time since the peek bit came on (0..1). */
  private peekK = 0;

  /** (marlow-jammer fix round 1) Moved by the host (the camera hallway's send-back): alive, health kept. */
  moveTo(x: number, y: number, z: number): void {
    this.feet.set(x, y, z);
    this.stepOk = false;
    // (fix round 2) the camera hallway holds the player "sent back" for as long as this grace (stale positions)
    this.allowTeleport(HALL_BACK_HOLD);
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
  }

  /** (rig-pose-fix S1) The sim body at the feet and the volumes on it (parked while down); on a wall its head is
   *  `ref.head`, the light meter's head sample (light parity: the client's own meter reads the same model). */
  private sync(): void {
    const bi = this.bodyIn;
    bi.x = this.feet.x;
    bi.y = this.feet.y;
    bi.z = this.feet.z;
    playerBody(bi, this.body);
    const h = this.body.head;
    this.ref.head = bi.wall && this.alive ? this.headV.set(h.x, h.y, h.z) : null;
    this.vols.setEnabled(this.alive);
    if (this.alive) this.vols.sync(this.feet, this.body);
  }

  private readonly headV = new Vector3();

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

  /** The host's own bullets may hit it (course mode friendly fire, D38); `friendly` still decides the damage. */
  shootable = false;
  /** Hits that do not hurt (team-mates); course friendly fire (D38) replaces it. */
  friendly: (h: HitInfo) => boolean = (h) => h.attackerTeam === 'player';

  /** (marlow-bays R2) Dropped mid-match and held by the host: frozen, takes no damage, until the player rejoins. */
  held = false;

  applyDamage(h: HitInfo): DamageResult {
    if (!this.alive || this.held || this.friendly(h)) return { dealt: 0, killed: false };
    const rolling = ((this.state?.f ?? 0) & PF.roll) !== 0;
    // (rig-pose-fix S1) the local player's part multipliers (head 1.3, legs 0.75) on the same split volumes
    const zone = playerPartMult(h.part === 'head', h.point.y - this.feet.y, this.bodyIn.crouch);
    const dealt = this.health.damage(h.amount * this.damageMul * (rolling ? 0.5 : 1) * zone);
    if (dealt > 0) this.onDamaged?.(h, dealt);
    const killed = !this.health.alive;
    if (killed) {
      this.sync();
      this.onDeath?.();
    }
    return { dealt, killed };
  }

  revive(at: Vector3, protect = 2): void {
    this.health.reset();
    this.feet.copyFrom(at);
    this.stepOk = false;
    this.allowTeleport();
    this.damageMul = 0;
    this.protectT = protect;
    this.sync();
  }

  /** (T5b2, D49) A co-op partner's body on the host ; synced by `CoopHost.frameUpdate`. */
  blocker: PartnerBlocker | null = null;

  dispose(): void {
    this.blocker?.dispose();
    this.registry.removeTarget(this);
    this.vols.dispose();
    this.avatar.dispose();
  }
}
