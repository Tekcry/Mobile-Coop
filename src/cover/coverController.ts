import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { MOVEMENT } from '../config/movement';
import type { Player } from '../player/player';
import type { InputState } from '../input/inputState';
import type { Settings } from '../core/settings';
import { COVER_STANDOFF } from '../world/levelBuilder';
import { awayAmount, clampAlong, coverPose, EDGE_MARGIN, findSnap, locate, nearestEdge, projectOnTangent, type CoverSegment } from './coverData';
import { CORNER_TIME, CoverStateMachine, emptyCoverInput, VAULT_TIME, type CoverStateName } from './coverState';
import { hyp2 } from '../core/mathx';

const Q = { membership: G.PLAYER, collideWith: G.STATIC };
const ease = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Turn-and-swap when reversing direction along cover (s). */
export const SWAP_TIME = 0.3;
/** SWAT turn speed (m/s): low and quick across a gap to the next collinear cover. */
export const SWAT_SPEED = 2.8;

export interface CoverTarget {
  seg: CoverSegment;
  s: number;
  kind: 'dash' | 'swat';
  x: number;
  z: number;
  /** Waypoint round a corner when the straight line is blocked (null = straight). */
  via: { x: number; z: number } | null;
}

/** Snap reach (m) and the glide time range (s) by distance. */
export const SNAP_REACH = 3;
export const GLIDE_MIN = 0.25;
export const GLIDE_MAX = 0.42;

/**
 * Player cover: finds cover faces up to 3 m away, snaps into them with a 0.25-0.45 s glide (a slide
 * when sprinting in), holds a side-on stance with the shoulder to the surface (reversing direction
 * plays a turn-and-swap; crouch toggles standing / crouched at high cover), strafes along the face,
 * peeks over low cover or round an edge (standing or crouched, leaning in place), blind-fires, swings
 * round outside corners, turns onto the adjoining face at inside corners, vaults low cover and moves
 * cover-to-cover (bounding run, routed round a corner when needed, or a low SWAT turn across a gap)
 * to the marked target; pushing back cancels the move. Drives the controller through `controller.override` and the animation
 * through `player.coverPose`. All checks against the world are raycasts, so destroyed or moved
 * geometry simply makes the cover invalid and the player steps out.
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
  private dashTo: CoverTarget | null = null;
  private recheckT = 0;
  /** Facing along the tangent (+1 / -1) while side-on, and the turn-and-swap timer (< 0 = none). */
  faceDir: 1 | -1 = 1;
  swapT = -1;
  /** Turn-and-swaps so far (debug overlay / tests). */
  swaps = 0;
  /** Marked cover-to-cover target (shown on the HUD), refreshed a few times a second. */
  target: CoverTarget | null = null;
  private targetT = 0;
  private insideT = 0;
  private slide = false;
  /** Direction to probe for a mantle after jumping out of cover (consumed by traversal). */
  exitDir: { x: number; z: number } | null = null;
  /** Spread multiplier requested for blind fire. */
  spreadMul = 1;
  /** Crouched behind high cover (crouch toggles it; low cover is always crouched). */
  highCrouch = false;
  /** Peek kind for the current peek: over low cover, or round an edge. */
  peekKind: 'over' | 'edge' | 'none' = 'none';
  private glideV0 = { x: 0, z: 0 };

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
    const mag = Math.min(1, hyp2(mx, my));
    if (mag < 0.15) return { x: 0, z: 0, mag: 0 };
    return { x: (fz * mx + fx * my) / mag, z: (-fx * mx + fz * my) / mag, mag };
  }

  private findCandidate(w: { x: number; z: number; mag: number }): void {
    const p = this.player;
    const c = p.controller;
    this.candidate = null;
    if (!p.alive || !c.grounded) return;
    // facing: move direction if moving, else where the body faces
    const dir = w.mag > 0 ? w : { x: Math.sin(c.yaw), z: Math.cos(c.yaw) };
    const hit = findSnap(this.segments, { x: p.position.x, y: p.position.y, z: p.position.z, dirX: dir.x, dirZ: dir.z, reach: SNAP_REACH });
    if (hit && this.snapClear(hit.seg, hit.s)) this.candidate = hit;
  }

  private findDash(w: { x: number; z: number; mag: number }): CoverTarget | null {
    if (!this.settings().gameplay.coverDash || w.mag === 0 || !this.seg) return null;
    const feet = this.player.position;
    let best: CoverTarget | null = null;
    let bd = Infinity;
    for (const seg of this.segments) {
      if (seg.piece === this.seg.piece || Math.abs(seg.y - feet.y) > 0.6) continue;
      const loc = locate(seg, feet.x, feet.z);
      const s = clampAlong(seg, loc.s).s;
      const p = coverPose(seg, s, COVER_STANDOFF);
      const dx = p.x - feet.x;
      const dz = p.z - feet.z;
      const d = hyp2(dx, dz);
      if (d < 1.5 || d > 8 || (dx * w.x + dz * w.z) / d < 0.8) continue;
      // must approach the face from its front
      if (loc.dist < 0.2) continue;
      if (d >= bd) continue;
      const y = feet.y + 0.9;
      if (!this.ray(this.from.set(feet.x, y, feet.z), this.to.set(p.x, y, p.z))) {
        bd = d;
        best = { seg, s, kind: 'dash', x: p.x, z: p.z, via: null };
        continue;
      }
      // blocked: route round one end of the current cover (out past its corner, then on)
      const via = this.routeVia(p.x, p.z, y);
      if (via) {
        bd = d;
        best = { seg, s, kind: 'dash', x: p.x, z: p.z, via };
      }
    }
    return best;
  }

  /** A waypoint just past an end of the current face from which both legs of the move are clear. */
  private routeVia(tx: number, tz: number, y: number): { x: number; z: number } | null {
    const seg = this.seg!;
    const feet = this.player.position;
    let best: { x: number; z: number } | null = null;
    let bl = Infinity;
    for (const side of [-1, 1] as const) {
      const ex = side < 0 ? seg.ax : seg.bx;
      const ez = side < 0 ? seg.az : seg.bz;
      const wx = ex + seg.tx * side * 0.55 + seg.nx * 0.55;
      const wz = ez + seg.tz * side * 0.55 + seg.nz * 0.55;
      const len = hyp2(wx - feet.x, wz - feet.z) + hyp2(tx - wx, tz - wz);
      if (len >= bl) continue;
      if (this.ray(this.from.set(feet.x, y, feet.z), this.to.set(wx, y, wz))) continue;
      if (this.ray(this.from.set(wx, y, wz), this.to.set(tx, y, tz))) continue;
      bl = len;
      best = { x: wx, z: wz };
    }
    return best;
  }

  /**
   * SWAT turn: at an edge, pushing past it, with another face continuing in line beyond a gap
   * (0.4-3.5 m): cross low and quick to it.
   */
  private findSwat(along: number): CoverTarget | null {
    const seg = this.seg;
    if (!seg || Math.abs(along) < 0.4) return null;
    const side = along > 0 ? 1 : -1;
    const e = nearestEdge(seg, this.s);
    if (e.side !== side || e.dist > EDGE_MARGIN + 0.35) return null;
    const ex = side > 0 ? seg.bx : seg.ax;
    const ez = side > 0 ? seg.bz : seg.az;
    let best: CoverTarget | null = null;
    let bd = Infinity;
    for (const o of this.segments) {
      if (o.piece === seg.piece || o.len < 0.8) continue;
      if (o.nx * seg.nx + o.nz * seg.nz < 0.9) continue;
      // in line with this face
      if (Math.abs((o.ax - seg.ax) * seg.nx + (o.az - seg.az) * seg.nz) > 0.35) continue;
      const da = ((o.ax - ex) * seg.tx + (o.az - ez) * seg.tz) * side;
      const db = ((o.bx - ex) * seg.tx + (o.bz - ez) * seg.tz) * side;
      const gap = Math.min(da, db);
      if (gap < 0.4 || gap > 3.5 || gap >= bd) continue;
      // land just inside the near end of the next face
      const nearA = da <= db;
      const s = nearA ? EDGE_MARGIN + 0.1 : o.len - EDGE_MARGIN - 0.1;
      const p = coverPose(o, s, COVER_STANDOFF);
      const y = this.player.position.y + 0.6;
      const f = this.player.position;
      if (this.ray(this.from.set(f.x, y, f.z), this.to.set(p.x, y, p.z))) continue;
      bd = gap;
      best = { seg: o, s, kind: 'swat', x: p.x, z: p.z, via: null };
    }
    return best;
  }

  /** Adjoining face at an inside corner, ahead along the tangent in `dir`. */
  private insideNext(dir: number): { seg: CoverSegment; s: number } | null {
    const seg = this.seg!;
    const f = this.player.position;
    const dx = seg.tx * dir;
    const dz = seg.tz * dir;
    let best: { seg: CoverSegment; s: number } | null = null;
    let bd = Infinity;
    for (const o of this.segments) {
      if (o === seg || o.nx * dx + o.nz * dz > -0.7) continue;
      const loc = locate(o, f.x, f.z);
      if (loc.dist < -0.2 || loc.dist > 1.4) continue;
      if (loc.s < -0.3 || loc.s > o.len + 0.3) continue;
      if (loc.dist < bd) {
        bd = loc.dist;
        // step off the corner along the new face, away from the old wall
        const away = (o.tx * seg.nx + o.tz * seg.nz) >= 0 ? 1 : -1;
        best = { seg: o, s: clampAlong(o, loc.s + away * 0.35).s };
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

  private enter(seg: CoverSegment, s: number, face?: 1 | -1): void {
    const c = this.player.controller;
    this.seg = seg;
    this.s = s;
    this.enterFrom.copyFrom(this.player.position);
    const cls = this.probeHeight(this.player.position.x, this.player.position.y, this.player.position.z, seg);
    this.low = cls ? cls === 'low' : seg.low;
    c.clearCrouchToggle();
    this.highCrouch = false;
    // side-on: face along the face towards where the camera looks
    const yaw = this.player.cam.yaw;
    this.faceDir = face ?? (Math.sin(yaw) * seg.tx + Math.cos(yaw) * seg.tz >= 0 ? 1 : -1);
    this.swapT = -1;
    this.insideT = 0;
    // arriving at speed (sprint, bounding run) slides in
    this.slide = c.dashing || c.speed > 3;
    if (c.dashing) c.sprint.stop();
    // entry: a glide to the snap point, 0.25 s close in up to 0.45 s from 3 m, eased into the wall and
    // carrying the current velocity into its start (Hermite path)
    const to = coverPose(seg, clampAlong(seg, s).s, COVER_STANDOFF);
    const d = hyp2(to.x - this.enterFrom.x, to.z - this.enterFrom.z);
    this.sm.enterTime = Math.max(GLIDE_MIN, Math.min(GLIDE_MAX, GLIDE_MIN + d * ((GLIDE_MAX - GLIDE_MIN) / SNAP_REACH)));
    // only the part of the current velocity heading for the snap point carries in
    const ux = d > 1e-3 ? (to.x - this.enterFrom.x) / d : 0;
    const uz = d > 1e-3 ? (to.z - this.enterFrom.z) / d : 0;
    const along = Math.max(0, Math.min(c.vel.x * ux + c.vel.z * uz, (1.5 * d) / this.sm.enterTime));
    this.glideV0.x = ux * along;
    this.glideV0.z = uz * along;
    this.sm.snap();
  }

  /** Stepping back off the wall after leaving cover (s left). */
  private exitStepT = 0;
  private exitNx = 0;
  private exitNz = 0;

  private faceYaw(seg: CoverSegment, dir: number): number {
    return Math.atan2(seg.tx * dir, seg.tz * dir);
  }

  /** Wall side in the character's frame when facing along the tangent (-1 left, 1 right). */
  private wallSide(seg: CoverSegment, dir: number): number {
    const fx = seg.tx * dir;
    const fz = seg.tz * dir;
    // right of facing f = (f.z, -f.x); the wall is towards -n
    return -(seg.nx * fz - seg.nz * fx) >= 0 ? 1 : -1;
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

  /** Swipe on the touch cover button -> camera-relative world direction (consumed). */
  private takeSwipe(inp: InputState): { x: number; z: number; mag: number } | null {
    const sw = inp.coverSwipe;
    if (sw.x === 0 && sw.y === 0) return null;
    const yaw = this.player.cam.yaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const out = { x: fz * sw.x + fx * sw.y, z: -fx * sw.x + fz * sw.y, mag: 1 };
    sw.x = sw.y = 0;
    return out;
  }

  /** Run before the player's own fixed step. */
  fixedUpdate(dt: number, inp: InputState): void {
    const p = this.player;
    const c = p.controller;
    const swipe = this.takeSwipe(inp);
    const w = swipe ?? this.wish(inp);
    this.exitDir = null;
    const wasIn = this.sm.inCover || this.sm.state === 'vault' || this.sm.state === 'dash';
    if (!this.sm.inCover && this.sm.state !== 'vault' && this.sm.state !== 'dash') this.findCandidate(w);
    else this.candidate = null;

    // --- state machine inputs
    const seg = this.seg;
    const ci = emptyCoverInput();
    ci.alive = p.alive;
    ci.coverPressed = inp.pressed('cover') || (!!swipe && !this.sm.inCover);
    ci.crouchPressed = inp.pressed('crouch');
    ci.jumpPressed = inp.pressed('jump');
    ci.dashPressed = inp.pressed('dash') || (!!swipe && this.sm.inCover);
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
      // cover-to-cover target: SWAT turn past the edge we push towards, else cover in the push/look direction
      this.targetT -= dt;
      if (this.sm.state === 'in' && (this.targetT <= 0 || ci.dashPressed || ci.coverPressed)) {
        this.targetT = 0.2;
        const yaw = p.cam.yaw;
        const look = { x: Math.sin(yaw), z: Math.cos(yaw), mag: 1 };
        const dir = w.mag > 0.3 && (ci.away > 0.3 || swipe) ? w : look;
        this.target = this.findSwat(along) ?? this.findDash(dir);
      } else if (this.sm.state !== 'in') this.target = null;
      const t = this.target;
      ci.canDash = !!t && (t.kind === 'swat' || c.sprint.canStart);
      if (ci.canDash && (ci.dashPressed || ci.coverPressed)) this.dashTo = t;
      // dash with nowhere to go: break out of cover and dash in the stick direction
      ci.sprint = ci.dashPressed && !ci.canDash && w.mag > 0.5;
    } else this.target = null;
    if (this.sm.state === 'dash' && this.dashTo) {
      const t = this.dashTo;
      ci.arrived = hyp2(t.x - p.position.x, t.z - p.position.z) < 0.5;
      // pushing back against the move (towards where we came from) cancels it
      const gx = (t.via ? t.via.x : t.x) - p.position.x;
      const gz = (t.via ? t.via.z : t.z) - p.position.z;
      const gd = hyp2(gx, gz) || 1;
      ci.against = Math.max(0, -(w.x * gx + w.z * gz) / gd) * w.mag;
    }
    // crouch in cover: stand / crouch behind high cover (low cover is always crouched)
    if (ci.crouchPressed && (this.sm.state === 'in' || this.sm.state === 'peek' || this.sm.state === 'blind') && !this.low) {
      this.highCrouch = !this.highCrouch;
    }
    const prev = this.sm.state;
    const st = this.sm.step(dt, ci);
    if (st !== prev) this.onTransition(prev, st);
    if (prev !== 'none' && st === 'none' && this.sm.reason === 'jump' && seg) this.exitDir = { x: -seg.nx, z: -seg.nz };

    // --- entering from outside: press (or swipe), auto-cover, or dashing straight into a face
    if (st === 'none' && !wasIn && this.candidate) {
      const cand = this.candidate;
      const into = -(w.x * cand.seg.nx + w.z * cand.seg.nz);
      const dist = locate(cand.seg, p.position.x, p.position.z).dist;
      const auto = this.settings().gameplay.autoCover && c.speed > 0.7 && w.mag > 0.5 && into > 0.8 && dist < COVER_STANDOFF + 0.45;
      const dashIn = c.dashing && into > 0.7 && dist < COVER_STANDOFF + 0.9;
      if (ci.coverPressed || auto || dashIn) this.enter(cand.seg, cand.s);
    }
    if (st !== prev && prev !== 'none' && this.sm.state === 'none' && (ci.crouchPressed || ci.coverPressed)) c.swallowCrouch = true;
    this.act(dt, inp, w);
  }

  private onTransition(prev: CoverStateName, st: CoverStateName): void {
    const p = this.player;
    if (st === 'peek' && this.seg) {
      this.peekReturn = this.s;
      this.peekSide = 0;
      this.peekKind = this.low ? 'over' : 'none';
      const e = nearestEdge(this.seg, this.s);
      const yaw = p.cam.yaw;
      // low cover: at an edge, looking past it, lean round it crouched instead of popping up
      const pastEdge = (Math.sin(yaw) * this.seg.tx + Math.cos(yaw) * this.seg.tz) * e.side > 0.25;
      if ((!this.low && e.dist < 1.6) || (this.low && e.dist < 0.7 && pastEdge)) {
        this.peekSide = e.side;
        this.peekKind = 'edge';
        // camera to the shoulder on the open side (seen from behind the player, facing the cover)
        const rx = Math.cos(yaw);
        const rz = -Math.sin(yaw);
        const dot = (this.seg.tx * rx + this.seg.tz * rz) * e.side;
        this.setShoulder(dot >= 0 ? 1 : -1);
      }
    }
    if (st !== 'peek') this.peekKind = 'none';
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
    if (st === 'dash') {
      this.seg = null;
      this.target = null;
    }
    if (st === 'enter' && prev === 'dash' && this.dashTo) {
      const swat = this.dashTo.kind === 'swat';
      const dir = this.faceDir;
      this.enter(this.dashTo.seg, this.dashTo.s, swat ? dir : undefined);
      this.slide = !swat;
    }
    if (st === 'none') {
      // a deliberate release steps back off the wall
      if (this.seg && (this.sm.reason === 'released' || this.sm.reason === 'backed-off')) {
        this.exitStepT = 0.45;
        this.exitNx = this.seg.nx;
        this.exitNz = this.seg.nz;
      }
      this.slide = false;
      this.swapT = -1;
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
    pose.lean = 0;
    pose.peekOver = 0;
    pose.slide = -1;
    pose.wallSide = 0;
    if (pose.traverse === 'vault') pose.traverse = 'none';
    const st = this.sm.state;
    if (st === 'none') {
      p.rig.leftHanded = false;
      pose.cover = 'none';
      if (this.exitStepT > 0) {
        // step back off the wall (eased), weapon coming off the compressed carry
        this.exitStepT = Math.max(0, this.exitStepT - dt);
        const v = 0.55 * Math.sin(Math.PI * (1 - this.exitStepT / 0.45));
        this.vel.x = this.exitNx * v;
        this.vel.z = this.exitNz * v;
        c.override = w.mag > 0.3 ? null : { velocity: this.vel };
        if (w.mag > 0.3) this.exitStepT = 0;
        return;
      }
      c.override = null;
      return;
    }
    if (st === 'dash' && this.dashTo) {
      const t = this.dashTo;
      const swat = t.kind === 'swat';
      // round the corner first, then on to the cover
      if (t.via && hyp2(t.via.x - p.position.x, t.via.z - p.position.z) < 0.45) t.via = null;
      const gx = t.via ? t.via.x : t.x;
      const gz = t.via ? t.via.z : t.z;
      const dx = gx - p.position.x;
      const dz = gz - p.position.z;
      const d = hyp2(dx, dz) || 1;
      // ease off over the last metre so the arrival blends into the snap
      const v = (swat ? SWAT_SPEED : MOVEMENT.coverRunSpeed) * (t.via ? 1 : Math.min(1, 0.45 + d * 0.55));
      this.vel.x = (dx / d) * v;
      this.vel.z = (dz / d) * v;
      c.override = { velocity: this.vel, yaw: Math.atan2(dx, dz), crouch: swat, turnRate: swat ? 12 : 9, run: true };
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
      pose.traverse = 'vault';
      pose.traverseT = Math.min(1, this.sm.t / VAULT_TIME);
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
      const r0 = hyp2(cr.from.x - cr.cx, cr.from.z - cr.cz);
      const r1 = hyp2(to.x - cr.cx, to.z - cr.cz);
      const a = a0 + (a1 - a0) * k;
      const r = r0 + (r1 - r0) * k;
      this.kin.set(cr.cx + Math.cos(a) * r, p.position.y, cr.cz + Math.sin(a) * r);
      // side-on all the way round: facing along the face, then along the next face
      const yaw0 = this.faceYaw(seg, this.faceDir);
      let yaw1 = this.faceYaw(cr.next, this.faceDir);
      while (yaw1 - yaw0 > Math.PI) yaw1 -= Math.PI * 2;
      while (yaw1 - yaw0 < -Math.PI) yaw1 += Math.PI * 2;
      c.override = { kinematic: this.kin, yaw: yaw0 + (yaw1 - yaw0) * k, crouch: this.low, turnRate: 14 };
      pose.cover = this.low ? 'low' : 'high';
      pose.wallSide = this.wallSide(seg, this.faceDir);
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
    let yaw: number | undefined = this.faceYaw(seg, this.faceDir);
    let turn = Math.PI / SWAP_TIME;
    const standoff = COVER_STANDOFF;
    const edge = nearestEdge(seg, loc.s);
    p.context.coverEdge = edge.dist < 0.5;
    p.context.doorway = false;
    if (this.swapT >= 0) {
      this.swapT += dt;
      if (this.swapT >= SWAP_TIME) this.swapT = -1;
    }
    if (st === 'enter') {
      // glide: Hermite path from where we were (with our velocity) to the snap point, at rest on arrival
      const T = this.sm.enterTime;
      const u = Math.min(1, (this.sm.t + dt) / T);
      const to = coverPose(seg, clampAlong(seg, this.s).s, standoff);
      const a = this.enterFrom;
      const u2 = u * u;
      const u3 = u2 * u;
      const h01 = 3 * u2 - 2 * u3;
      const h10 = u3 - 2 * u2 + u;
      const d01 = (6 * u - 6 * u2) / T;
      const d10 = (3 * u2 - 4 * u + 1) / T;
      const px = a.x + (to.x - a.x) * h01 + this.glideV0.x * T * h10;
      const pz = a.z + (to.z - a.z) * h01 + this.glideV0.z * T * h10;
      this.vel.x = (to.x - a.x) * d01 + this.glideV0.x * T * d10 + (px - p.position.x) * 12;
      this.vel.z = (to.z - a.z) * d01 + this.glideV0.z * T * d10 + (pz - p.position.z) * 12;
      if (this.slide) pose.slide = u;
      c.override = { velocity: this.vel, yaw, crouch: this.low, turnRate: Math.PI / Math.max(0.2, T * 0.8), glide: true };
      pose.cover = this.low ? 'low' : 'high';
      pose.wallSide = this.wallSide(seg, this.faceDir);
      p.rig.leftHanded = !this.low && pose.wallSide > 0;
      this.autoShoulder(seg, st);
      return;
    } else if (st === 'in') {
      const along = projectOnTangent(seg, w.x, w.z) * w.mag;
      // reversing direction: turn-and-swap (shoulder stays to the wall, the weapon changes hands)
      if (Math.abs(along) > 0.3 && Math.sign(along) !== this.faceDir) {
        this.faceDir = along > 0 ? 1 : -1;
        this.swapT = 0;
        this.swaps++;
        yaw = this.faceYaw(seg, this.faceDir);
      }
      crouch = this.low || this.highCrouch;
      speedAlong = along * (crouch ? MOVEMENT.coverCrouchSpeed : MOVEMENT.coverSpeed) * (this.swapT >= 0 ? 0.25 : 1);
      // brake early enough that the eased stop lands on the edge, not past it
      const cur = c.vel.x * seg.tx + c.vel.z * seg.tz;
      const stopDist = (cur * cur) / (2 * 3) + Math.abs(cur) * 0.12;
      const lo = EDGE_MARGIN;
      const hi = seg.len - EDGE_MARGIN;
      if (speedAlong > 0 && loc.s + stopDist >= hi) speedAlong = 0;
      if (speedAlong < 0 && loc.s - stopDist <= lo) speedAlong = 0;
      if (loc.s > hi + 0.02) speedAlong = (hi - loc.s) / 0.15;
      if (loc.s < lo - 0.02) speedAlong = (lo - loc.s) / 0.15;
      // inside corner: a wall right along the tangent; keep pushing to turn onto it
      const dir = Math.sign(along);
      if (dir !== 0 && Math.abs(along) > 0.5 && this.blockedAlong(dir)) {
        speedAlong = 0;
        this.insideT += dt;
        if (this.insideT > 0.25) {
          this.insideT = 0;
          const next = this.insideNext(dir);
          if (next) {
            const face: 1 | -1 = next.seg.tx * seg.nx + next.seg.tz * seg.nz >= 0 ? 1 : -1;
            this.enter(next.seg, next.s, face);
            this.slide = false;
          }
        }
      } else this.insideT = 0;
      // re-probe the height as we move (stacked crates, broken runs)
      this.recheckT -= dt;
      if (this.recheckT <= 0) {
        this.recheckT = 0.25;
        const cls = this.probeHeight(p.position.x, p.position.y, p.position.z, seg);
        if (cls) this.low = cls === 'low';
      }
    } else if (st === 'peek') {
      yaw = undefined; // body turns to the aim
      turn = 9;
      crouch = this.low || this.highCrouch;
      if (this.peekKind === 'over') {
        crouch = false;
        pose.peekOver = 1;
      } else if (this.peekSide !== 0) {
        // lean out in place at the edge: the capsule stays in cover, the upper body leans past it
        targetS = this.peekSide < 0 ? EDGE_MARGIN : seg.len - EDGE_MARGIN;
        pose.lean = this.leanSide(seg, this.peekSide);
      }
    } else if (st === 'blind') {
      yaw = undefined;
      turn = 9;
      this.spreadMul = 3;
      pose.blind = true;
      crouch = this.low || this.highCrouch;
      if (!this.low && edge.dist < 0.6) pose.lean = this.leanSide(seg, edge.side);
    }
    if (st === 'in' && this.peekReturn >= 0) {
      // returning from a peek: slide back to where we were
      targetS = this.peekReturn;
      if (Math.abs(loc.s - this.peekReturn) < 0.05 || w.mag > 0.2) this.peekReturn = -1;
    }
    if (yaw !== undefined) pose.wallSide = this.wallSide(seg, this.faceDir);
    // weapon in the outside hand (away from the wall / towards the side being leaned out of)
    p.rig.leftHanded = pose.lean !== 0 ? pose.lean < 0 : yaw !== undefined && !this.low ? pose.wallSide > 0 : false;
    this.autoShoulder(seg, st);
    // velocity: along the face (input or towards a target point) + hold the standoff from the surface
    // seek target points gently (the root motion has weight; a hard P-gain would overshoot)
    const k = 0.25;
    const cap = 0.9;
    if (speedAlong === 0 && Math.abs(targetS - loc.s) > 0.02) speedAlong = Math.max(-cap, Math.min(cap, (targetS - loc.s) / k));
    const toward = Math.max(-3.5, Math.min(3.5, (standoff - loc.dist) / 0.1));
    this.vel.x = seg.tx * speedAlong + seg.nx * toward;
    this.vel.z = seg.tz * speedAlong + seg.nz * toward;
    c.override = { velocity: this.vel, yaw, crouch, turnRate: turn };
    pose.cover = this.low ? 'low' : 'high';
    void inp;
  }

  /** Camera on the shoulder of the side being faced (hysteresis so small look changes do not flip it). */
  private autoShoulder(seg: CoverSegment, st: CoverStateName): void {
    if ((st !== 'in' && st !== 'enter') || this.sm.t <= 0.05) return;
    const cy = this.player.cam.yaw;
    const dot = (seg.tx * Math.cos(cy) - seg.tz * Math.sin(cy)) * this.faceDir;
    if (Math.abs(dot) > 0.35) this.setShoulder(dot > 0 ? 1 : -1);
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
    this.target = null;
    this.dashTo = null;
    this.slide = false;
    this.setShoulder(null);
    this.seg = null;
    this.corner = null;
    this.vault = null;
    this.player.controller.override = null;
    this.player.coverPose.cover = 'none';
  }
}
