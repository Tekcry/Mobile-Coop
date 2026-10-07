import { Vector3, type Scene } from '../core/babylon';
import { CharacterRig, type RigPose } from '../player/characterRig';
import { defaultLook } from '../cosmetics/avatarLook';
import { emptyMotionInput, MotionDriver } from '../anim/motion';
import { ENEMY_MOTION } from '../config/movement';
import { hyp2 } from '../core/mathx';
import type { NavGrid, P2 } from '../ai/navGrid';
import type { World } from '../world/world';

/** Follow distance behind the operator (m), walk / run speeds (m/s). */
const FOLLOW = 1.6;
const WALK = 1.5;
const RUN = 3.6;

/**
 * The rescue target: kneels with hands on his head until freed, then follows the operator (an A* path round
 * walls, keeping a step behind, crouching with them). Enemies leave him alone.
 */
export class Vip {
  readonly rig: CharacterRig;
  readonly pos: Vector3;
  yaw: number;
  free = false;
  private prevPos = new Vector3();
  private prevYaw = 0;
  private motion: MotionDriver;
  private mi = emptyMotionInput();
  private vel = new Vector3();
  private crouch = 0;
  private path: P2[] = [];
  private pathT = 0;
  private rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };

  constructor(scene: Scene, world: World, private nav: NavGrid | null, x: number, y: number, z: number, yaw: number) {
    const look = defaultLook();
    look.torso = 'jacket';
    look.helmet = 'none';
    look.hair = 'swept';
    look.colors.torso = '#2b2f3a';
    look.colors.legs = '#24272e';
    look.colors.accent = '#d9d4c7';
    this.rig = new CharacterRig(scene, (shape, hex) => world.parts.instance(shape, hex, 'vip-part'), look, 1.76, 'vip', { build: 'average' });
    for (const m of this.rig.renderMeshes) world.addShadowCaster(m);
    this.pos = new Vector3(x, y, z);
    this.yaw = yaw;
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = yaw;
    this.motion = new MotionDriver(yaw);
    // captive: kneeling, hands on the head
    this.rig.emote = () => ({
      pelvisLift: -0.48,
      hipL: [-1.45, 0, -0.12],
      hipR: [-0.2, 0, 0.12],
      kneeL: [1.6, 0, 0],
      kneeR: [1.9, 0, 0],
      shoulderL: [-2.4, 0, -0.9],
      shoulderR: [-2.4, 0, 0.9],
      elbowL: [0, 0, -2.2],
      elbowR: [0, 0, 2.2],
      neck: [0.25, 0, 0],
    });
    this.rig.emoteTime = 0;
    this.frame(0, 1);
  }

  /** Cut loose: stands up and follows. */
  release(): void {
    this.free = true;
    this.rig.emote = null;
  }

  /** Fixed step: follow the operator at `to` (crouched like them). */
  update(dt: number, to: Vector3, crouched: boolean): void {
    this.prevPos.copyFrom(this.pos);
    this.prevYaw = this.yaw;
    if (!this.free) return;
    const dx = to.x - this.pos.x;
    const dz = to.z - this.pos.z;
    const d = hyp2(dx, dz);
    let gx = 0;
    let gz = 0;
    if (d > FOLLOW) {
      // straight when the line is clear, else along a path (replanned every second)
      let tx = to.x;
      let tz = to.z;
      const nav = this.nav;
      if (nav && !nav.lineClear([this.pos.x, this.pos.z], [to.x, to.z], this.pos.y, to.y)) {
        this.pathT -= dt;
        if (this.pathT <= 0 || !this.path.length) {
          this.pathT = 1;
          this.path = nav.findPath([this.pos.x, this.pos.z], [to.x, to.z], 8000, this.pos.y, to.y) ?? [];
        }
        const wp = this.path[0];
        if (wp) {
          if (hyp2(wp[0] - this.pos.x, wp[1] - this.pos.z) < 0.4) this.path.shift();
          tx = (this.path[0] ?? wp)[0];
          tz = (this.path[0] ?? wp)[1];
        }
      } else this.path.length = 0;
      const lx = tx - this.pos.x;
      const lz = tz - this.pos.z;
      const l = hyp2(lx, lz) || 1;
      const sp = Math.min(d > 5 ? RUN : WALK, (d - FOLLOW) * 3) * (crouched ? 0.6 : 1);
      gx = (lx / l) * sp;
      gz = (lz / l) * sp;
    }
    const mi = this.mi;
    mi.vx = gx;
    mi.vz = gz;
    mi.yaw = hyp2(gx, gz) > 0.3 ? Math.atan2(gx, gz) : this.motion.yaw;
    mi.aiming = false;
    mi.sprinting = hyp2(gx, gz) > WALK * 1.2;
    this.motion.step(dt, mi, ENEMY_MOTION);
    this.vel.set(this.motion.outX, 0, this.motion.outZ);
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    const nav = this.nav;
    if (!nav || nav.isWalkable(nav.cellOf(nx, nz, this.pos.y))) {
      this.pos.x = nx;
      this.pos.z = nz;
    }
    if (nav) this.pos.y += (nav.heightAt(this.pos.x, this.pos.z, this.pos.y) - this.pos.y) * Math.min(1, dt * 10);
    this.yaw = this.motion.yaw;
    this.crouch += ((crouched ? 1 : 0) - this.crouch) * Math.min(1, dt * 6);
  }

  /** Render frame. */
  frame(dt: number, alpha: number): void {
    const r = this.rig.root;
    Vector3.LerpToRef(this.prevPos, this.pos, alpha, r.position);
    r.rotation.y = this.prevYaw + (this.yaw - this.prevYaw) * alpha;
    const sp = hyp2(this.vel.x, this.vel.z);
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const inv = sp > 0.01 ? 1 / sp : 0;
    const rp = this.rp;
    const m = this.motion;
    rp.speed = sp;
    rp.localX = (this.vel.x * c - this.vel.z * s) * inv;
    rp.localZ = (this.vel.x * s + this.vel.z * c) * inv;
    rp.crouch = this.crouch;
    rp.phase = m.phase;
    rp.motion = m.state;
    rp.motionT = m.stateT;
    rp.velX = this.vel.x;
    rp.velZ = this.vel.z;
    rp.goalYaw = m.goalYaw;
    this.rig.animate(dt, rp);
  }

  dispose(): void {
    this.rig.dispose();
  }
}
