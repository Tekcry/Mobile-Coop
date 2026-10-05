import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import type { Player } from '../player/player';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import { COVER_STANDOFF } from '../world/levelBuilder';
import { awayAmount, clampAlong, coverPose, EDGE_MARGIN, findSnap, locate, nearestEdge, projectOnTangent, type CoverSegment } from './coverData';
import { CORNER_TIME, CoverStateMachine, emptyCoverInput, VAULT_TIME, type CoverStateName } from './coverState';

const Q = { membership: G.PLAYER, collideWith: G.STATIC };
const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * Player cover: finds cover faces near the player, snaps into them with an eased move, strafes
 * along them, peeks/blind-fires, pivots round outside corners, vaults low cover and (optionally)
 * dashes to the next cover. Drives the character controller through `controller.override` and the
 * animation through `player.coverPose`. All checks against the world are raycasts, so destroyed or
 * moved geometry simply makes the cover invalid and the player steps out.
 */
export class CoverController {
  readonly sm = new CoverStateMachine();
  seg: CoverSegment | null = null;
  s = 0;
  /** Best cover in reach (for the prompt / touch button), or null. */
  candidate: { seg: CoverSegment; s: number } | null = null;
  /** Live low/high class from probing (stacked crates, slopes). */
  low = true;
  private eng: PhysicsEngine;
  private rr = new PhysicsRaycastResult();
  private from = new Vector3();
  private to = new Vector3();
  private tmp = new Vector3();
  private kin = new Vector3();
  private vel = { x: 0, z: 0 };
  private enterFrom = new Vector3();
  private peekReturn = -1;
  private peekSide = 0;
  private savedShoulder: 1 | -1 | null = null;
  private corner: { cx: number; cz: number; from: Vector3; next: CoverSegment; nextS: number } | null = null;
  private vault: { from: Vector3; to: Vector3; top: number } | null = null;
  private dashTo: { seg: CoverSegment; s: number } | null = null;
  private recheckT = 0;
  /** Spread multiplier requested for blind fire. */
  spreadMul = 1;

  constructor(
    scene: Scene,
    private player: Player,
    private segments: readonly CoverSegment[],
    private settings: () => Settings,
  ) {
    this.eng = scene.getPhysicsEngine() as PhysicsEngine;
  }

  get state(): CoverStateName {
    return this.sm.state;
  }

  get inCover(): boolean {
    return this.sm.inCover;
  }

  private ray(from: Vector3, to: Vector3): boolean {
    this.rr.reset();
    this.eng.raycastToRef(from, to, this.rr, Q);
    return this.rr.hasHit;
  }

  /** Probe the real cover height in front of a feet position facing -n: 'low', 'high' or null (no cover). */
  private probeHeight(x: number, y: number, z: number, seg: CoverSegment): 'low' | 'high' | null {
    const reach = COVER_STANDOFF + 0.45;
    const at = (h: number): boolean => this.ray(this.from.set(x, y + h, z), this.to.set(x - seg.nx * reach, y + h, z - seg.nz * reach));
    if (!at(0.6)) return null;
    return at(1.55) ? 'high' : 'low';
  }

  /** Snap point usable: reachable in a straight line, floor under it, nothing in the way. */
  private snapClear(seg: CoverSegment, s: number): boolean {
    const p = coverPose(seg, s, COVER_STANDOFF);
    const feet = this.player.position;
    const chest = 0.9;
    if (this.ray(this.from.set(feet.x, feet.y + chest, feet.z), this.to.set(p.x, feet.y + chest, p.z))) return false;
    // floor within a step of the player's level
    if (!this.ray(this.from.set(p.x, feet.y + 0.5, p.z), this.to.set(p.x, feet.y - 0.6, p.z))) return false;
    return this.probeHeight(p.x, feet.y, p.z, seg) !== null;
  }

  private wish(inp: InputState): { x: number; z: number; mag: number } {
    const yaw = this.player.cam.yaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const mx = inp.move.x;
    const my = inp.move.y;
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag < 0.15) return { x: 0, z: 0, mag: 0 };
    return { x: (fz * mx + fx * my) / mag, z: (-fx * mx + fz * my) / mag, mag };
  }

  private findCandidate(w: { x: number; z: number; mag: number }): void {
    const p = this.player;
    const c = p.controller;
    this.candidate = null;
    if (!p.alive || !c.grounded || c.isRolling) return;
    // facing: move direction if moving, else where the body faces
    const dir = w.mag > 0 ? w : { x: Math.sin(c.yaw), z: Math.cos(c.yaw) };
    const hit = findSnap(this.segments, { x: p.position.x, y: p.position.y, z: p.position.z, dirX: dir.x, dirZ: dir.z, reach: 1.6 });
    if (hit && this.snapClear(hit.seg, hit.s)) this.candidate = hit;
  }

  private findDash(w: { x: number; z: number; mag: number }): { seg: CoverSegment; s: number } | null {
    if (!this.settings().gameplay.coverDash || w.mag === 0 || !this.seg) return null;
    const feet = this.player.position;
    let best: { seg: CoverSegment; s: number } | null = null;
    let bd = Infinity;
    for (const seg of this.segments) {
      if (seg.piece === this.seg.piece || Math.abs(seg.y - feet.y) > 0.6) continue;
      const loc = locate(seg, feet.x, feet.z);
      const s = clampAlong(seg, loc.s).s;
      const p = coverPose(seg, s, COVER_STANDOFF);
      const dx = p.x - feet.x;
      const dz = p.z - feet.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.5 || d > 8 || (dx * w.x + dz * w.z) / d < 0.8) continue;
      // must approach the face from its front
      if (loc.dist < 0.2) continue;
      if (d < bd && !this.ray(this.from.set(feet.x, feet.y + 0.9, feet.z), this.to.set(p.x, feet.y + 0.9, p.z))) {
        bd = d;
        best = { seg, s };
      }
    }
    return best;
  }

  private canVault(): boolean {
    const seg = this.seg;
    if (!seg || !this.low) return false;
    const feet = this.player.position;
    const loc = locate(seg, feet.x, feet.z);
    const land = this.tmp.set(seg.ax + seg.tx * loc.s - seg.nx * (seg.depth + COVER_STANDOFF + 0.15), feet.y, seg.az + seg.tz * loc.s - seg.nz * (seg.depth + COVER_STANDOFF + 0.15));
    const top = seg.y + seg.height + 0.35;
    // clear over the top and at the landing spot, with floor under it
    if (this.ray(this.from.set(feet.x, top, feet.z), this.to.set(land.x, top, land.z))) return false;
    if (this.ray(this.from.set(land.x, top, land.z), this.to.set(land.x, feet.y + 0.3, land.z))) return false;
    if (!this.ray(this.from.set(land.x, feet.y + 0.3, land.z), this.to.set(land.x, feet.y - 0.6, land.z))) return false;
    land.y = this.rr.hitPoint.y;
    return true;
  }

  private cornerTarget(side: -1 | 1): { next: CoverSegment; nextS: number; cx: number; cz: number } | null {
    const seg = this.seg!;
    const id = side < 0 ? seg.nextA : seg.nextB;
    const next = id >= 0 ? this.segments[id] : undefined;
    if (!next || next.len < EDGE_MARGIN * 2 + 0.2) return null;
    const cx = side < 0 ? seg.ax : seg.bx;
    const cz = side < 0 ? seg.az : seg.bz;
    const nextS = side < 0 ? next.len - EDGE_MARGIN : EDGE_MARGIN;
    const p = coverPose(next, nextS, COVER_STANDOFF);
    const y = this.player.position.y + 0.9;
    // swing point diagonally off the corner; both legs of the swing must be clear
    const mx = cx + (seg.nx + next.nx) * 0.55;
    const mz = cz + (seg.nz + next.nz) * 0.55;
    const feet = this.player.position;
    if (this.ray(this.from.set(feet.x, y, feet.z), this.to.set(mx, y, mz))) return null;
    if (this.ray(this.from.set(mx, y, mz), this.to.set(p.x, y, p.z))) return null;
    return { next, nextS, cx, cz };
  }

  /** Is there a solid wall right along the tangent (inside corner / narrow gap)? */
  private blockedAlong(dir: number): boolean {
    const seg = this.seg!;
    const feet = this.player.position;
    const y = feet.y + (this.low ? 0.5 : 1.0);
    const reach = MOVEMENT.radius + 0.18;
    return this.ray(this.from.set(feet.x, y, feet.z), this.to.set(feet.x + seg.tx * dir * reach, y, feet.z + seg.tz * dir * reach));
  }

  private goneT = 0;

  /** Is the surface still there? Probed at the nearest usable point (overshooting an edge by a few cm is fine). */
  private surfacePresent(dt: number): boolean {
    const seg = this.seg;
    if (!seg) return false;
    const feet = this.player.position;
    const loc = locate(seg, feet.x, feet.z);
    const p = coverPose(seg, clampAlong(seg, loc.s).s, COVER_STANDOFF);
    const y = feet.y + 0.55;
    const reach = COVER_STANDOFF + 0.5;
    const ok = this.ray(this.from.set(p.x, y, p.z), this.to.set(p.x - seg.nx * reach, y, p.z - seg.nz * reach));
    // tolerate a single missed probe (seams between pieces)
    this.goneT = ok ? 0 : this.goneT + dt;
    return this.goneT < 0.12;
  }

  private enter(seg: CoverSegment, s: number): void {
    this.seg = seg;
    this.s = s;
    this.enterFrom.copyFrom(this.player.position);
    const cls = this.probeHeight(this.player.position.x, this.player.position.y, this.player.position.z, seg);
    this.low = cls ? cls === 'low' : seg.low;
    this.player.controller.clearCrouchToggle();
    this.sm.snap();
  }

  private setShoulder(side: 1 | -1 | null): void {
    const cam = this.player.cam;
    if (side === null) {
      if (this.savedShoulder !== null) cam.shoulder = this.savedShoulder;
      this.savedShoulder = null;
      return;
    }
    if (this.savedShoulder === null) this.savedShoulder = cam.shoulder;
    cam.shoulder = side;
  }

  /** Run before the player's own fixed step. */
  fixedUpdate(dt: number, inp: InputState): void {
    const p = this.player;
    const c = p.controller;
    const w = this.wish(inp);
    const wasIn = this.sm.inCover || this.sm.state === 'vault' || this.sm.state === 'dash';
    if (!this.sm.inCover && this.sm.state !== 'vault' && this.sm.state !== 'dash') this.findCandidate(w);
    else this.candidate = null;

    // --- state machine inputs
    const seg = this.seg;
    const ci = emptyCoverInput();
    ci.alive = p.alive;
    ci.coverPressed = inp.pressed('cover');
    ci.crouchPressed = inp.pressed('crouch');
    ci.jumpPressed = inp.pressed('jump');
    ci.sprint = inp.down('sprint') && w.mag > 0.5;
    ci.ads = p.ads || inp.down('ads');
    ci.fire = inp.down('fire');
    ci.low = this.low;
    if (seg && this.sm.inCover) {
      ci.valid = this.sm.state === 'enter' || this.sm.state === 'corner' || this.surfacePresent(dt);
      ci.away = awayAmount(seg, w.x, w.z) * w.mag;
      const loc = locate(seg, p.position.x, p.position.z);
      this.s = loc.s;
      const along = projectOnTangent(seg, w.x, w.z) * w.mag;
      const edge = clampAlong(seg, loc.s, EDGE_MARGIN + 0.04).edge;
      if (edge !== 0 && Math.sign(along) === edge && Math.abs(along) > 0.5 && this.cornerTarget(edge)) ci.cornerPush = edge;
      if (ci.jumpPressed) ci.canVault = this.canVault();
      if (ci.coverPressed) {
        const d = this.findDash(w);
        ci.canDash = !!d;
        this.dashTo = d;
      }
    }
    if (this.sm.state === 'dash' && this.dashTo) {
      const t = coverPose(this.dashTo.seg, this.dashTo.s, COVER_STANDOFF);
      ci.arrived = Math.hypot(t.x - p.position.x, t.z - p.position.z) < 0.6;
    }
    // rolling out of cover: let the press through to the controller
    const rollOut = ci.crouchPressed && w.mag > 0.5 && this.sm.inCover;
    const prev = this.sm.state;
    const st = this.sm.step(dt, ci);
    if (st !== prev) this.onTransition(prev, st);

    // --- entering from outside
    if (st === 'none' && !wasIn && this.candidate) {
      const auto = this.settings().gameplay.autoCover && c.speed > 1 && this.candidate && w.mag > 0.5 && -(w.x * this.candidate.seg.nx + w.z * this.candidate.seg.nz) > 0.8 && locate(this.candidate.seg, p.position.x, p.position.z).dist < COVER_STANDOFF + 0.45;
      if (ci.coverPressed || auto) this.enter(this.candidate.seg, this.candidate.s);
    }
    if (st !== prev && prev !== 'none' && this.sm.state === 'none' && (ci.crouchPressed || ci.coverPressed) && !rollOut) c.swallowCrouch = true;
    this.act(dt, inp, w);
  }

  private onTransition(prev: CoverStateName, st: CoverStateName): void {
    const p = this.player;
    if (st === 'peek' && this.seg) {
      this.peekReturn = this.s;
      this.peekSide = 0;
      if (!this.low) {
        const e = nearestEdge(this.seg, this.s);
        if (e.dist < 1.6) {
          this.peekSide = e.side;
          // camera to the shoulder on the open side (seen from behind the player, facing the cover)
          const yaw = p.cam.yaw;
          const rx = Math.cos(yaw);
          const rz = -Math.sin(yaw);
          const dot = (this.seg.tx * rx + this.seg.tz * rz) * e.side;
          this.setShoulder(dot >= 0 ? 1 : -1);
        }
      }
    }
    if (prev === 'peek' && st !== 'peek') this.setShoulder(null);
    if (st === 'corner' && this.seg) {
      const side = this.sm.cornerSide < 0 ? -1 : 1;
      const t = this.cornerTarget(side);
      if (t) this.corner = { ...t, from: p.position.clone() };
      else this.sm.reset();
    }
    if (st === 'vault' && this.seg) {
      const seg = this.seg;
      const feet = p.position;
      const loc = locate(seg, feet.x, feet.z);
      const d = seg.depth + COVER_STANDOFF + 0.15;
      const to = new Vector3(seg.ax + seg.tx * loc.s - seg.nx * d, feet.y, seg.az + seg.tz * loc.s - seg.nz * d);
      this.ray(this.from.set(to.x, feet.y + 0.3, to.z), this.to.set(to.x, feet.y - 0.6, to.z));
      if (this.rr.hasHit) to.y = this.rr.hitPoint.y;
      this.vault = { from: feet.clone(), to, top: seg.y + seg.height + 0.12 };
    }
    if (st === 'dash') this.seg = null;
    if (st === 'enter' && prev === 'dash' && this.dashTo) {
      this.seg = this.dashTo.seg;
      this.s = this.dashTo.s;
      const cls = this.probeHeight(p.position.x, p.position.y, p.position.z, this.seg);
      this.low = cls ? cls === 'low' : this.seg.low;
      this.enterFrom.copyFrom(p.position);
    }
    if (st === 'none') {
      this.setShoulder(null);
      if (prev === 'vault') p.controller.vel.reset();
      this.seg = null;
      this.corner = null;
      this.vault = null;
    }
  }

  private act(dt: number, inp: InputState, w: { x: number; z: number; mag: number }): void {
    const p = this.player;
    const c = p.controller;
    const seg = this.seg;
    const pose = p.coverPose;
    this.spreadMul = 1;
    pose.blind = false;
    pose.peek = 0;
    pose.vault = -1;
    const st = this.sm.state;
    if (st === 'none') {
      c.override = null;
      pose.cover = 'none';
      return;
    }
    if (st === 'dash' && this.dashTo) {
      const t = coverPose(this.dashTo.seg, this.dashTo.s, COVER_STANDOFF);
      const dx = t.x - p.position.x;
      const dz = t.z - p.position.z;
      const d = Math.hypot(dx, dz) || 1;
      const v = MOVEMENT.sprintSpeed;
      this.vel.x = (dx / d) * v;
      this.vel.z = (dz / d) * v;
      c.override = { velocity: this.vel, yaw: Math.atan2(dx, dz), crouch: false };
      pose.cover = 'none';
      return;
    }
    if (st === 'vault' && this.vault) {
      const k = ease(this.sm.t / VAULT_TIME);
      const v = this.vault;
      const lift = Math.sin(Math.PI * Math.min(1, this.sm.t / VAULT_TIME)) * (v.top - Math.min(v.from.y, v.to.y));
      Vector3.LerpToRef(v.from, v.to, k, this.kin);
      this.kin.y += lift;
      c.override = { kinematic: this.kin, yaw: Math.atan2(v.to.x - v.from.x, v.to.z - v.from.z), crouch: true };
      pose.cover = 'none';
      pose.vault = Math.min(1, this.sm.t / VAULT_TIME);
      return;
    }
    if (!seg) return;
    if (st === 'corner' && this.corner) {
      const k = ease(this.sm.t / CORNER_TIME);
      const cr = this.corner;
      const to = coverPose(cr.next, cr.nextS, COVER_STANDOFF);
      const a0 = Math.atan2(cr.from.z - cr.cz, cr.from.x - cr.cx);
      let a1 = Math.atan2(to.z - cr.cz, to.x - cr.cx);
      while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
      while (a1 - a0 < -Math.PI) a1 += Math.PI * 2;
      const r0 = Math.hypot(cr.from.x - cr.cx, cr.from.z - cr.cz);
      const r1 = Math.hypot(to.x - cr.cx, to.z - cr.cz);
      const a = a0 + (a1 - a0) * k;
      const r = r0 + (r1 - r0) * k;
      this.kin.set(cr.cx + Math.cos(a) * r, p.position.y, cr.cz + Math.sin(a) * r);
      // face the surface as it turns
      const yaw0 = Math.atan2(-seg.nx, -seg.nz);
      let yaw1 = Math.atan2(-cr.next.nx, -cr.next.nz);
      while (yaw1 - yaw0 > Math.PI) yaw1 -= Math.PI * 2;
      while (yaw1 - yaw0 < -Math.PI) yaw1 += Math.PI * 2;
      c.override = { kinematic: this.kin, yaw: yaw0 + (yaw1 - yaw0) * k, crouch: this.low };
      pose.cover = this.low ? 'low' : 'high';
      if (k >= 1 || this.sm.t + dt >= CORNER_TIME) {
        this.seg = cr.next;
        this.s = cr.nextS;
      }
      return;
    }

    // enter / in / peek / blind: drive along the face
    const loc = locate(seg, p.position.x, p.position.z);
    let targetS = loc.s;
    let speedAlong = 0;
    let crouch = this.low;
    const coverYaw = Math.atan2(-seg.nx, -seg.nz);
    let yaw: number | undefined = coverYaw;
    let standoff = COVER_STANDOFF;
    if (st === 'enter') {
      targetS = clampAlong(seg, this.s).s;
    } else if (st === 'in') {
      const along = projectOnTangent(seg, w.x, w.z) * w.mag;
      speedAlong = along * MOVEMENT.coverSpeed;
      // brake early enough that the eased stop lands on the edge, not past it
      const cur = c.vel.x * seg.tx + c.vel.z * seg.tz;
      const stopDist = Math.abs(cur) * (2 / MOVEMENT.decel);
      const lo = EDGE_MARGIN;
      const hi = seg.len - EDGE_MARGIN;
      if (speedAlong > 0 && loc.s + stopDist >= hi) speedAlong = 0;
      if (speedAlong < 0 && loc.s - stopDist <= lo) speedAlong = 0;
      if (loc.s > hi + 0.02) speedAlong = (hi - loc.s) / 0.15;
      if (loc.s < lo - 0.02) speedAlong = (lo - loc.s) / 0.15;
      if (speedAlong !== 0 && this.blockedAlong(Math.sign(speedAlong))) speedAlong = 0;
      // re-probe the height as we move (stacked crates, broken runs)
      this.recheckT -= dt;
      if (this.recheckT <= 0) {
        this.recheckT = 0.25;
        const cls = this.probeHeight(p.position.x, p.position.y, p.position.z, seg);
        if (cls) this.low = cls === 'low';
      }
    } else if (st === 'peek') {
      yaw = undefined; // body follows the aim
      if (this.low) crouch = false;
      else if (this.peekSide !== 0) {
        targetS = this.peekSide < 0 ? -0.5 : seg.len + 0.5;
        standoff = COVER_STANDOFF + 0.08;
        pose.peek = this.leanSide(seg, this.peekSide);
      }
    } else if (st === 'blind') {
      yaw = undefined;
      this.spreadMul = 3;
      pose.blind = true;
      const e = nearestEdge(seg, loc.s);
      if (!this.low && e.dist < 0.6) pose.peek = this.leanSide(seg, e.side);
    }
    if (st === 'in' && this.peekReturn >= 0) {
      // returning from a peek: slide back to where we were
      targetS = this.peekReturn;
      if (Math.abs(loc.s - this.peekReturn) < 0.05 || w.mag > 0.2) this.peekReturn = -1;
    }
    // velocity: along the face (input or towards a target point) + hold the standoff from the surface
    const k = st === 'enter' ? Math.max(0.05, 0.25 - this.sm.t) : 0.12;
    if (speedAlong === 0 && Math.abs(targetS - loc.s) > 0.02) speedAlong = Math.max(-3, Math.min(3, (targetS - loc.s) / k));
    const toward = Math.max(-3.5, Math.min(3.5, (standoff - loc.dist) / (st === 'enter' ? k : 0.1)));
    this.vel.x = seg.tx * speedAlong + seg.nx * toward;
    this.vel.z = seg.tz * speedAlong + seg.nz * toward;
    c.override = { velocity: this.vel, yaw, crouch };
    pose.cover = this.low ? 'low' : 'high';
    void inp;
  }

  /** Lean direction in the character's frame (facing -n): +1 = to its right. */
  private leanSide(seg: CoverSegment, side: number): number {
    // character right = facing rotated clockwise: facing (-nx,-nz) -> right (-nz, nx)
    const rx = -seg.nz;
    const rz = seg.nx;
    return Math.sign((seg.tx * rx + seg.tz * rz) * side) || 1;
  }

  /** Forced reset (respawn/teleport). */
  reset(): void {
    this.sm.reset();
    this.setShoulder(null);
    this.seg = null;
    this.corner = null;
    this.vault = null;
    this.player.controller.override = null;
    this.player.coverPose.cover = 'none';
  }
}
