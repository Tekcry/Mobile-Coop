/**
 * (guard-ai piano GA4) A guard rig with no brain: the piano scene's intro actors (G1-G4 closing in at 0.3x, rifles up
 * and firing, then idling aimed on their stop spots until the EMP press). Render only.
 *
 * - The look is a real guard's: `buildEnemyRig` (rig, gun, guard figure, the same shadow caster registration), a
 *   `MotionDriver` stepped as `Enemy.move` steps it for an aimed advance (`aiming`, `ENEMY_MOTION`) and the rig posed as
 *   `Enemy.frame` poses it (raised weapon, kick after a shot, gait clock and motion state from the driver).
 * - Its own clock: `step(dt)` takes real seconds and advances `dt * rate` of the actor's time (walk, gait, poses, the
 *   recoil, the fire re-arm), so `setRate(0.3)` is slow motion and `setRate(1)` normal.
 * - The walk follows a flat (x, z) polyline (`guardActorPath.ts`): the distance along it advances by the driver's speed,
 *   the pace eases down over the last ~0.4 m (`STOP_DECEL`) so the driver's weighted stop lands on the end point; then
 *   he idles aimed (`done`).
 * - Height: a fixed ground y (`opts.y`, default 0), or `opts.nav.heightAt` followed as a guard follows it.
 * - Not a guard: never in the enemy manager's lists; no perception, hearing, occupancy, hit volumes, nav cells, wire
 *   snapshots, score, barks or alarms. Each machine builds its own (nothing on the wire).
 * - `step`, `fire` and `muzzle` allocate nothing.
 */
import { Vector3, type Scene } from '../core/babylon';
import type { CharacterRig, RigPose } from '../player/characterRig';
import type { WeaponModel } from '../weapons/weaponModel';
import type { World } from '../world/world';
import type { Vfx } from '../vfx/vfx';
import type { NavGrid } from './navGrid';
import type { EnemyDef } from './enemyDefs';
import type { GuardBody } from './guardBody';
import { buildEnemyRig } from './enemyRig';
import { GUARD_AIM } from './guardStance';
import { EYE_STAND } from './perception';
import { emptyMotionInput, MotionDriver } from '../anim/motion';
import { ENEMY_MOTION } from '../config/movement';
import { hyp2 } from '../core/mathx';
import { actorPath, emptyPathSample, sample, type ActorPath, type PathSample } from './guardActorPath';

/** The pace eases down as sqrt(2 a d) over the last metres (a, m/s^2: half the driver's braking cap), so he stops on the end point. */
const STOP_DECEL = ENEMY_MOTION.decelMax * 0.5;
/** Within this of the end the pace is zero: the driver's own stop finishes it (the distance is clamped at the end). */
const ARRIVE = 0.03;
/** Pose frames run at build so he starts with the rifle raised (0.5 s at 60 Hz). */
const SETTLE_FRAMES = 30;
/** The kick after a shot falls at this per second of the actor's time (as `Enemy.frame`). */
const KICK_DECAY = 8;
/** The muzzle flash's life at rate 1 (s, `Vfx.muzzleFlash`'s default). */
const FLASH_LIFE = 0.05;
/** The lowest rate the flash life is scaled by (a paused actor's flash would never end). */
const FLASH_RATE_MIN = 0.05;

export interface GuardActorOpts {
  /** Walk speed (m/s); default the def's `walkSpeed`. */
  speed?: number;
  /** Playback rate (0.3: the intro's slow motion); default 1. */
  rate?: number;
  /** Start facing (rad, 0 = +Z); default the first leg's heading. */
  yaw?: number;
  /** Fixed ground height (m) when no `nav`; default 0. With `nav`: the start hint for its `heightAt`. */
  y?: number;
  /** Follow the nav surface's height as a guard does (null: the fixed `y`). */
  nav?: Pick<NavGrid, 'heightAt'> | null;
  /** The muzzle flash on `fire` (null: none, e.g. tests). */
  vfx?: Pick<Vfx, 'muzzleFlash'> | null;
  /** The guard figure's 7-bit look seed (`GuardBody.setLook`); default 0. */
  look?: number;
  /** Mesh name prefix; default `actor-<n>`. */
  name?: string;
}

let SEQ = 0;

export class GuardActor {
  readonly def: EnemyDef;
  private readonly rig: CharacterRig;
  private readonly gun: WeaponModel | null;
  private readonly figure: GuardBody | null;
  private readonly path: ActorPath;
  private readonly speed: number;
  private rate: number;
  private readonly nav: Pick<NavGrid, 'heightAt'> | null;
  private readonly vfx: Pick<Vfx, 'muzzleFlash'> | null;
  private readonly motion: MotionDriver;
  private readonly mi = emptyMotionInput();
  private readonly rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
  private readonly at: PathSample = emptyPathSample();
  private readonly p = new Vector3();
  private readonly aim = new Vector3();
  private aimSet = false;
  /** Distance along the path (m). */
  private s = 0;
  private vx = 0;
  private vz = 0;
  private aimPitch = 0;
  private kick = 0;
  /** Actor-time seconds until the next shot may fire. */
  private fireT = 0;
  private disposed = false;
  private arrived = false;

  constructor(scene: Scene, world: World, def: EnemyDef, path: readonly number[], opts: GuardActorOpts = {}) {
    if (def.quadruped) throw new Error('GuardActor: a human guard kind only (the dog has its own body)');
    this.def = def;
    this.path = actorPath(path);
    this.speed = opts.speed ?? def.walkSpeed;
    this.rate = Math.max(0, opts.rate ?? 1);
    this.nav = opts.nav ?? null;
    this.vfx = opts.vfx ?? null;
    sample(this.path, 0, this.at);
    const yaw = opts.yaw ?? this.at.heading;
    this.motion = new MotionDriver(yaw);
    this.mi.yaw = yaw;
    const y0 = opts.y ?? 0;
    this.p.set(this.at.x, this.nav ? this.nav.heightAt(this.at.x, this.at.z, opts.y ?? Number.NaN) : y0, this.at.z);
    const built = buildEnemyRig(scene, world, def, opts.name ?? `actor-${SEQ++}`);
    this.rig = built.rig;
    this.gun = built.gun;
    this.figure = built.figure;
    this.figure?.setLook(opts.look ?? 0);
    this.arrived = this.path.length <= ARRIVE;
    // the rifle up from the first frame drawn: the raise settles here (build time), not over his first half second
    for (let i = 0; i < SETTLE_FRAMES; i++) this.pose(1 / 60);
  }

  /** Reached the end of the path and stopped (idling aimed). */
  get done(): boolean {
    return this.arrived;
  }

  /** Where he stands (feet, world). Read only. */
  get pos(): Readonly<Vector3> {
    return this.p;
  }

  /** Facing (rad, 0 = +Z). */
  get yaw(): number {
    return this.motion.yaw;
  }

  /** Distance walked along the path (m). */
  get travelled(): number {
    return this.s;
  }

  /** The path's length (m). */
  get length(): number {
    return this.path.length;
  }

  /** The playback rate now. */
  get playRate(): number {
    return this.rate;
  }

  /** Playback rate: 0.3 in the intro, 1 after (0 holds the pose). */
  setRate(r: number): void {
    this.rate = r > 0 ? r : 0;
  }

  /** Where the rifle points (the players): held while walking and standing. */
  aimAt(x: number, y: number, z: number): void {
    this.aim.set(x, y, z);
    this.aimSet = true;
  }

  /** Advance `dt` real seconds (`dt * rate` of his own time): the walk, the gait, the poses. No allocation. */
  step(dt: number): void {
    if (this.disposed) return;
    const t = dt * this.rate;
    if (!(t > 0)) return;
    const path = this.path;
    const m = this.motion;
    const mi = this.mi;
    const rem = path.length - this.s;
    // the pace along the path, eased down to the end point (zero inside ARRIVE: the driver's weighted stop)
    let want = 0;
    if (!this.arrived && rem > ARRIVE) {
      want = Math.sqrt(2 * STOP_DECEL * rem);
      if (want > this.speed) want = this.speed;
    }
    sample(path, this.s, this.at);
    const h = this.at.heading;
    mi.vx = Math.sin(h) * want;
    mi.vz = Math.cos(h) * want;
    // aimed: strafe-locked to the aim point at the aim turn rate (as `Enemy.move` with a face yaw); no aim point yet:
    // the travel heading, held when still
    if (this.aimSet) mi.yaw = Math.atan2(this.aim.x - this.p.x, this.aim.z - this.p.z);
    else if (want > 0) mi.yaw = h;
    mi.aiming = true;
    mi.sprinting = false;
    m.step(t, mi, ENEMY_MOTION);
    // along the line by the driver's root speed (its weighted start / stop and stride swell), clamped at the end
    const v = hyp2(m.outX, m.outZ);
    let s = this.s + v * t;
    if (s > path.length) s = path.length;
    this.s = s;
    sample(path, s, this.at);
    this.vx = Math.sin(this.at.heading) * v;
    this.vz = Math.cos(this.at.heading) * v;
    this.p.x = this.at.x;
    this.p.z = this.at.z;
    if (this.nav) {
      const gh = this.nav.heightAt(this.p.x, this.p.z, this.p.y);
      this.p.y += (gh - this.p.y) * Math.min(1, t * 12);
    }
    if (!this.arrived && path.length - s <= ARRIVE && m.speed < 0.02) {
      this.arrived = true;
      this.vx = this.vz = 0;
    }
    if (this.aimSet) {
      const dy = this.aim.y - (this.p.y + 1.4 * this.def.scale);
      this.aimPitch = Math.atan2(dy, Math.max(0.5, hyp2(this.aim.x - this.p.x, this.aim.z - this.p.z)));
    }
    this.fireT = this.fireT > t ? this.fireT - t : 0;
    this.kick = this.kick > t * KICK_DECAY ? this.kick - t * KICK_DECAY : 0;
    this.pose(t);
  }

  /** One shot: the kick (fire pose / recoil) and the muzzle flash, at his rate. False while not re-armed (the def's
   *  fire interval in his own time) or for a guard without a gun. No allocation. */
  fire(): boolean {
    const w = this.def.weapon;
    if (this.disposed || !this.gun || !w || this.def.melee || this.fireT > 0) return false;
    this.fireT = 60 / w.rpm;
    this.kick = 1;
    if (this.vfx) {
      this.muzzle(this.flashAt);
      this.vfx.muzzleFlash(this.flashAt, this.def.kind === 'heavy' ? 0.3 : 0.2, FLASH_LIFE / Math.max(FLASH_RATE_MIN, this.rate));
    }
    return true;
  }

  private readonly flashAt = new Vector3();

  /** The muzzle's world position (the tracer origin) into `out` (returned): the drawn gun's muzzle; without a gun, the
   *  guard's muzzle point (eye height less 0.2, forward and to the right, as `Enemy.muzzle`). No allocation. */
  muzzle(out: Vector3): Vector3 {
    if (this.gun && !this.disposed) return this.gun.muzzleWorld(out);
    const y = this.motion.yaw;
    const sc = this.def.scale;
    out.set(
      this.p.x + Math.sin(y) * 0.45 + Math.cos(y) * 0.18,
      this.p.y + EYE_STAND * sc - 0.2 * sc,
      this.p.z + Math.cos(y) * 0.45 - Math.sin(y) * 0.18,
    );
    return out;
  }

  /** The rig's root and pose for `t` actor seconds (as `Enemy.frame`, the gun drawn and raised). */
  private pose(t: number): void {
    const r = this.rig.root;
    const m = this.motion;
    const rp = this.rp;
    r.position.copyFrom(this.p);
    r.rotation.y = m.yaw;
    const sp = hyp2(this.vx, this.vz);
    const sn = Math.sin(m.yaw);
    const cs = Math.cos(m.yaw);
    const inv = sp > 0.01 ? 1 / sp : 0;
    rp.speed = sp;
    rp.localX = (this.vx * cs - this.vz * sn) * inv;
    rp.localZ = (this.vx * sn + this.vz * cs) * inv;
    rp.crouch = 0;
    rp.aimPitch = this.aimPitch;
    rp.aim = this.def.melee ? 0 : GUARD_AIM.fire;
    rp.kick = this.def.melee ? 0 : this.kick;
    rp.melee = -1;
    rp.wall = false;
    rp.wallSide = 0;
    rp.lean = 0;
    rp.dash = 0;
    rp.phase = m.phase;
    rp.motion = m.state;
    rp.motionT = m.stateT;
    rp.accelFwd = m.ax * sn + m.az * cs;
    rp.accelSide = m.ax * cs - m.az * sn;
    rp.velX = this.vx;
    rp.velZ = this.vz;
    rp.goalYaw = m.goalYaw;
    rp.stride = 'velocity';
    rp.traverse = 'none';
    rp.traverseT = 0;
    // the gun drawn (a guard's `GuardCarry` drawn: not ready, no swap clip)
    rp.ready = false;
    rp.swap = -1;
    // every frame solved (a few cinematic actors: no anim tier)
    this.rig.animate(t, rp, t);
  }

  /** Gone: the gun, the figure, the rig (their meshes leave the shadow caster lists as they are disposed). */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.gun?.dispose();
    this.figure?.dispose();
    this.rig.dispose();
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}
