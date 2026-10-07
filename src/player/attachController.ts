import type { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import type { TraverseKind } from '../anim/animGraph';
import type { AttachCamera } from '../config/camera';
import {
  anchorsNear,
  closestOn,
  findJumpTarget,
  HANG,
  ledgeContinuation,
  nearestInReach,
  type Anchor,
  type AttachEntry,
  type Duct,
  type JumpTarget,
  type Ledge,
  type P3,
  type ReachResult,
  type TraversalAnchors,
} from '../world/anchors';
import { AttachMachine, attachPose, axisInput, LADDER_SLIDE, LADDER_SPRINT_RATE, PIPE_SLIDE, PIPE_SPRINT, PIPE_TUMBLE, type AttachPose, type ExitReason } from './attach';
import { AttachGrips, VENT_LOWER_K } from './attachGrips';
import { PipeHang, SPLIT, splitReach, WALL_JUMP, wallJumpReach, type PipeMode } from './splitJump';
import type { Player } from './player';
import type { Breakables } from '../world/breakables';

/** Player input for attached states (set by GameState before each fixed step). */
export interface AttachInput {
  moveX: number;
  moveY: number;
  camYaw: number;
  dropPressed: boolean;
  dropHeld: boolean;
  /** Seconds drop has been held. */
  dropHeldT: number;
  /** The use control (Y / E) is down, and for how long (hold to unscrew a grate). */
  useHeld: boolean;
  useHeldT: number;
  /** Sprint held: climb ladders / drainpipes faster. */
  sprintHeld: boolean;
}

/** Anchors offered from the ground (the traverse button attaches). */
const GROUND_KINDS = ['ladder', 'pipeV', 'pipeH', 'ledge', 'zipline', 'duct'] as const;
const LOWER_KINDS = ['ledge'] as const;
/** Placed anchors that win over a step / vault / mantle the geometry offers at the same spot (a ladder or a duct
 *  is what the player is facing on purpose); lips and pipes give way to them. */
export function anchorFirst(r: ReachResult | null): boolean {
  const k = r?.anchor.kind;
  return k === 'ladder' || k === 'pipeV' || k === 'duct' || k === 'zipline';
}
const isAbove = (r: ReachResult): boolean => r.entry === 'above';
const notAbove = (r: ReachResult): boolean => r.entry !== 'above';
/** Unscrewing a grate (s, after the hold delay) and the press length under which a press is a kick. */
export const UNSCREW_TIME = 1.2;
const KICK_TAP = 0.3;
/** Hold drop this long at a hangable edge to lower into a hang (s). */
export const LOWER_HOLD = 0.3;
/** Lowering in from the top (turn round, step out, drop to the hands) and stepping onto a ladder from its top (s). */
const LOWER_TIME = 0.7;
const LADDER_TOP_TIME = 0.6;
/** Dropping through a ceiling vent: lower this far on the hands first (m), over this share of the exit. */
const VENT_LOWER = 1.5;
/** Pulling up onto a lip from a hang (s). */
export const CLIMB_UP_TIME = 0.85;

/** World prompt labels for what traverse / drop would do. */
export const ATTACH_LABEL: Record<string, string> = {
  ladder: 'Climb',
  pipeV: 'Climb',
  pipeH: 'Grab',
  ledgeBelow: 'Grab',
  ventClosed: 'Kick vent',
  ventOpen: 'Crawl in',
  unscrew: 'Unscrewing',
  ledgeAbove: 'Hang',
  zipline: 'Zipline',
  climbUp: 'Climb up',
  jump: 'Jump',
  drop: 'Drop',
  split: 'Split jump',
  wallJump: 'Wall jump',
  legsUp: 'Legs up',
  invert: 'Invert',
  curlUp: 'Curl up',
};

const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const angleTo = (a: number, b: number): number => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * Attached traversal at run time: entry from the ground (the traverse button with an anchor in reach, or
 * holding drop at a hangable edge), moving along the anchor, corner transfers along ledges, jumps to another
 * anchor within reach, climbing up, stepping off ladders, dropping. Drives the controller through
 * `override.kinematic` and the rig's world hand / foot targets, which step hand over hand (`GripStepper`) so
 * every planted contact stays locked. Owned by `TraversalController`.
 */
export class AttachController {
  readonly m = new AttachMachine();
  readonly input: AttachInput = { moveX: 0, moveY: 0, camYaw: 0, dropPressed: false, dropHeld: false, dropHeldT: 0, useHeld: false, useHeldT: 0, sprintHeld: false };
  /** Window glass and duct grates (set by the traversal controller's owner). */
  breakables: Breakables | null = null;
  /** Opening a duct grate: the duct, seconds since the press, and the unscrew progress 0..1 (prompt ring). */
  vent: { duct: Duct; t: number; progress: number } | null = null;
  /** What traverse would attach to from the ground (prompt), refreshed with the traversal probe. */
  hint: ReachResult | null = null;
  /** A lip to lower into a hang from (the drop control held, or its prompt), refreshed with the probe. */
  lower: ReachResult | null = null;
  /** While attached: the anchor a traverse press would jump to (stick pointing at it), or null. */
  jump: JumpTarget | null = null;
  /** Lower into the hang at the edge on the next step (the touch prompt). */
  lowerRequest = false;
  /** While hanging: climbing up is possible here. */
  canClimb = false;
  /** Where the attach blend starts, where the exit blend ends. */
  private from: P3 = { x: 0, y: 0, z: 0 };
  private end: P3 = { x: 0, y: 0, z: 0 };
  private fromYaw = 0;
  /** Jump arc height for the current enter blend (m; 0 = no arc). */
  private arc = 0;
  /** Swinging round an outside corner: the enter blend curves through this point (else straight). */
  private via: P3 | null = null;
  private viaPt: P3 = { x: 0, y: 0, z: 0 };
  private ap: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };
  private kin: Vector3;
  /** Body parameter last fixed step and this one (render interpolation of the grips). */
  private sPrev = 0;
  /** Hand / foot contacts on the anchor (shared with co-op remotes, `AttachGrips`). */
  readonly grips = new AttachGrips();
  private get hands() {
    return this.grips.hands;
  }
  private get feet() {
    return this.grips.feet;
  }
  private jumpT = 0;
  /** Height of the vent drop under way (m; 0 = none). */
  private ventDrop = 0;
  /** Ladder: a drop press slides to the bottom (pushing up stops it). */
  private sliding = false;
  private wish = { x: 0, z: 0 };
  onDetach: ((reason: ExitReason | null) => void) | null = null;

  constructor(
    private player: Player,
    public anchors: TraversalAnchors,
    kin: Vector3,
    /** Is a standing body's worth of space free above (x, y, z)? (raycasts, owned by TraversalController) */
    private roomAt: (x: number, y: number, z: number) => boolean,
    /** Floor height under (x, z) from `yFrom` down, or null. */
    private floorAt: (x: number, z: number, yFrom: number) => number | null,
    /** Nothing solid on the straight line between two points. */
    private lineClear: (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean,
  ) {
    this.kin = kin;
  }

  get active(): boolean {
    return this.m.active;
  }

  get camera(): AttachCamera | null {
    return this.m.spec?.camera ?? null;
  }

  /** Anchor the traverse button attaches to from the feet along `dir` (or null); also refreshes `lower`. */
  probe(feet: Vector3, dx: number, dz: number): ReachResult | null {
    // lowering into a hang is the drop control's: a separate hint, never in the way of a climb / grab
    const low = nearestInReach(this.anchors, feet.x, feet.y, feet.z, dx, dz, LOWER_KINDS, isAbove);
    this.lower = null;
    if (low) {
      // the hang spot below the lip must be clear of the floor and walls
      const p = attachPose(low.anchor, low.s, 1, this.player.rig.height, this.ap);
      if (this.roomAt(p.x, p.y + 0.3, p.z)) this.lower = low;
    }
    const r = nearestInReach(this.anchors, feet.x, feet.y, feet.z, dx, dz, GROUND_KINDS, notAbove);
    if (r) return r;
    // (3.2.0) between two tall walls facing along them: a split jump; facing a wall under a high lip: a wall jump
    return this.splitProbe(feet, dx, dz) ?? this.wallJumpProbe(feet, dx, dz);
  }

  private splitProbe(feet: Vector3, dx: number, dz: number): ReachResult | null {
    let best: ReachResult | null = null;
    for (const g of this.anchors.splits) {
      const q = splitReach(g, feet.x, feet.y, feet.z, dx, dz);
      if (!q || (best && q.dist >= best.dist)) continue;
      // room above the feet line between the walls (nothing overhead)
      const k = this.player.rig.height / 1.75;
      const p = attachPose(g, q.s, q.face, this.player.rig.height, this.ap);
      if (!this.lineClear(p.x, feet.y + 1.0, p.z, p.x, p.y + 1.5 * k, p.z)) continue;
      best = { anchor: g, entry: 'below', s: q.s, dist: q.dist, face: q.face };
    }
    return best;
  }

  /** Where a wall jump kicks off the wall (set with the hint, used by the entry path). */
  private kickPt: P3 = { x: 0, y: 0, z: 0 };
  private kickHint: P3 = { x: 0, y: 0, z: 0 };

  private wallJumpProbe(feet: Vector3, dx: number, dz: number): ReachResult | null {
    const near = anchorsNear(this.anchors, feet.x, feet.y, feet.z, WALL_JUMP.cornerReach + 0.3, ['ledge']);
    for (const n of near) {
      const l = n.anchor as Ledge;
      const q = wallJumpReach(l, feet.x, feet.y, feet.z, dx, dz);
      if (!q) continue;
      // a wall right in front to kick off (the lip's own, or the adjoining one at an inside corner)
      const reach = WALL_JUMP.wallReach + 0.3;
      if (this.lineClear(feet.x, feet.y + 1.0, feet.z, feet.x + dx * reach, feet.y + 1.0, feet.z + dz * reach)) continue;
      // and the flight up to the hang is free
      const p = attachPose(l, q.s, 1, this.player.rig.height, this.ap);
      if (!this.lineClear(feet.x, feet.y + 1.4, feet.z, p.x, p.y + 1.4, p.z)) continue;
      // kick off a stride short of the wall, at knee height
      let d = 0.25;
      while (d < reach && this.lineClear(feet.x, feet.y + 1.0, feet.z, feet.x + dx * (d + 0.3), feet.y + 1.0, feet.z + dz * (d + 0.3))) d += 0.1;
      this.kickHint.x = feet.x + dx * Math.max(0, d - 0.15);
      this.kickHint.z = feet.z + dz * Math.max(0, d - 0.15);
      this.kickHint.y = feet.y + 0.85;
      return { anchor: l, entry: 'wall', s: q.s, dist: q.dist };
    }
    return null;
  }

  /**
   * Falling past a lip (or a pipe): it is in the hands' path when it sits 1.5-2.35 m above the falling feet, within
   * reach of the body on its outer side. Returns it as a 'below' entry (the traverse button grabs it).
   */
  fallProbe(feet: Vector3): ReachResult | null {
    const near = anchorsNear(this.anchors, feet.x, feet.y, feet.z, 0.7, ['ledge', 'pipeH']);
    for (const n of near) {
      const a = n.anchor;
      const top = a.kind === 'ledge' ? a.top : a.kind === 'pipeH' ? a.hangHeight : 0;
      const up = top - feet.y;
      if (up < 1.5 || up > 2.35) continue;
      if (a.kind === 'ledge') {
        if (!a.canHang) continue;
        const q = closestOn(a, feet.x, feet.y, feet.z);
        if ((feet.x - q.x) * a.nx + (feet.z - q.z) * a.nz < -0.05) continue;
        return { anchor: a, entry: 'below', s: q.s, dist: n.dist };
      }
      const q = closestOn(a, feet.x, feet.y, feet.z);
      return { anchor: a, entry: 'below', s: q.s, dist: n.dist };
    }
    return null;
  }

  /** Label for the ground prompt. */
  hintLabel(r: ReachResult): string {
    if (r.entry === 'wall') return ATTACH_LABEL.wallJump!;
    if (r.anchor.kind === 'split') return ATTACH_LABEL.split!;
    if (r.anchor.kind === 'ledge') return r.entry === 'above' ? ATTACH_LABEL.ledgeAbove! : ATTACH_LABEL.ledgeBelow!;
    if (r.anchor.kind === 'duct') return this.breakables?.isOpen(`grate:${r.anchor.id}:entry`) === false ? ATTACH_LABEL.ventClosed! : ATTACH_LABEL.ventOpen!;
    return ATTACH_LABEL[r.anchor.kind] ?? '';
  }

  /** Attach from the ground. */
  attachFrom(r: ReachResult, enterTime?: number): boolean {
    const a = r.anchor;
    if (a.kind === 'duct') {
      // a closed grate is opened first: a tap kicks it in, a hold unscrews it
      if (this.breakables?.isOpen(`grate:${a.id}:entry`) === false) {
        this.vent = { duct: a, t: 0, progress: 0 };
        return true;
      }
      return this.attachTo(a, 0, 'side', 1, 0.55);
    }
    if (a.kind === 'split') return this.attachTo(a, r.s, 'below', r.face ?? 1, SPLIT.jumpTime, 0.25);
    if (r.entry === 'wall') {
      this.kickPt.x = this.kickHint.x;
      this.kickPt.y = this.kickHint.y;
      this.kickPt.z = this.kickHint.z;
      return this.attachTo(a, r.s, 'wall', 1, WALL_JUMP.time);
    }
    let face = 1;
    if (a.kind === 'pipeH') {
      // hang facing across the pipe on the side the camera looks along
      const ax = a.b.x - a.a.x;
      const az = a.b.z - a.a.z;
      const cx = Math.sin(this.input.camYaw);
      const cz = Math.cos(this.input.camYaw);
      face = az * cx - ax * cz >= 0 ? 1 : -1;
    }
    const t = enterTime ?? (r.entry === 'above' ? LOWER_TIME : r.entry === 'top' && a.kind === 'ladder' ? LADDER_TOP_TIME : undefined);
    return this.attachTo(a, r.s, r.entry, face, t);
  }

  /** Attach now (from the ground, a transfer, a jump or tests): blends from the current feet onto it. */
  attachTo(a: Anchor, s: number, entry: AttachEntry = 'side', face = 1, enterTime?: number, arc = 0): boolean {
    const c = this.player.controller;
    if (!this.m.enter(a, s, entry, face, this.player.rig.height, c.speed, enterTime)) return false;
    this.from.x = c.pos.x;
    this.from.y = c.pos.y;
    this.from.z = c.pos.z;
    this.fromYaw = c.yaw;
    this.arc = arc;
    this.via = null;
    this.sPrev = this.m.s;
    this.jump = null;
    this.hint = null;
    this.sliding = false;
    c.clearCrouchToggle();
    this.pipe.reset();
    this.flipping = false;
    this.grips.setPipe(a, this.m.s, this.m.face, 'hands', 'hands', this.player.rig.height);
    this.grips.setup(a, this.m.s, this.m.face, this.player.rig.height);
    return true;
  }

  /** (3.2.0) The horizontal pipe's sub-state (hands / legs up / inverted). */
  readonly pipe = new PipeHang();
  /** Dropping out of an inverted hang: flipping over to land on the feet. */
  private flipping = false;

  /** The pipe sub-state the pose is in now (the target past half way through a transition). */
  get pipeMode(): PipeMode {
    const p = this.pipe;
    return p.to && p.progress > 0.5 ? p.to : p.mode;
  }

  /** Hit while attached: a pipe transition falls back to hanging by the hands. */
  onHit(): void {
    const a = this.m.anchor;
    if (!a || a.kind !== 'pipeH' || !this.pipe.busy) return;
    this.pipe.damage();
    this.grips.setPipe(a, this.m.s, this.m.face, 'hands', 'hands', this.player.rig.height);
  }

  private startPipe(a: Anchor, to: 'up' | 'down'): void {
    const p = this.pipe;
    const from = p.mode;
    if (!(to === 'up' ? p.up() : p.down())) return;
    this.grips.setPipe(a, this.m.s, this.m.face, from, p.to!, this.player.rig.height);
  }

  /** Inverted, B: let go with the legs and flip over to land on the feet below. */
  private flipDrop(a: Anchor): void {
    const c = this.player.controller;
    const fy = this.floorAt(c.pos.x, c.pos.z, c.pos.y + 0.6);
    this.end.x = c.pos.x;
    this.end.z = c.pos.z;
    this.end.y = fy !== null && c.pos.y - fy < 2.6 ? fy : c.pos.y - 0.5;
    this.ventDrop = 0;
    this.flipping = true;
    this.flipFall = fy !== null ? Math.max(0, c.pos.y + 1.4 - fy) : 0;
    void a;
    this.m.beginExit('drop', 0.42);
  }
  private flipFall = 0;

  /** Flipping out of an inverted hang (the exit under way). */
  get isFlipping(): boolean {
    return this.flipping;
  }

  /** Let go / step off ('drop', 'damage', 'gone' release at once and gravity takes over). */
  detach(reason: ExitReason): void {
    if (!this.m.active) return;
    const a = this.m.anchor!;
    const c = this.player.controller;
    if (reason === 'drop' || reason === 'damage' || reason === 'gone') {
      this.finish(reason);
      return;
    }
    this.end.x = c.pos.x;
    this.end.y = c.pos.y;
    this.end.z = c.pos.z;
    if (reason === 'bottom' && (a.kind === 'ladder' || a.kind === 'pipeV')) {
      // step back off the bottom: clear of the wall, room to draw the weapon
      const yaw = a.kind === 'ladder' ? a.facing : a.side;
      this.end.x = a.base.x - Math.sin(yaw) * 0.7;
      this.end.y = a.base.y;
      this.end.z = a.base.z - Math.cos(yaw) * 0.7;
    } else if (reason === 'top' && a.kind === 'ladder') {
      this.end.x = a.top.x + Math.sin(a.facing) * 0.2;
      this.end.y = a.top.y;
      this.end.z = a.top.z + Math.cos(a.facing) * 0.2;
    } else if (reason === 'climb' && a.kind === 'ledge') {
      const p = attachPose(a, this.m.s, 1, this.player.rig.height, this.ap);
      this.end.x = p.x - a.nx * (HANG.out + 0.45);
      this.end.y = a.top;
      this.end.z = p.z - a.nz * (HANG.out + 0.45);
    } else if (reason === 'climb' && a.kind === 'pipeV') {
      // straight up off the top of the drainpipe onto what it runs up to
      const l = this.pipeLip(a, true);
      if (l) {
        this.end.x = a.base.x - l.nx * 0.55;
        this.end.y = l.top;
        this.end.z = a.base.z - l.nz * 0.55;
        this.climbNx = l.nx;
        this.climbNz = l.nz;
      }
    }
    // climbing up off a lip is a full pull-up (longer than the spec's blend)
    this.m.beginExit(reason, reason === 'climb' ? CLIMB_UP_TIME : undefined);
  }

  private finish(reason: ExitReason | null): void {
    const c = this.player.controller;
    const a = this.m.anchor;
    const v = this.m.v;
    const r = this.m.finish() ?? reason;
    c.override = null;
    if (this.ventDrop > 0) {
      c.registerLanding(this.ventDrop, 0, 0);
      this.ventDrop = 0;
    }
    // off a zipline (let go or at its end): fly on along the cable with its speed
    if (a && a.kind === 'zipline' && (r === 'drop' || r === 'end')) {
      const dx = a.b.x - a.a.x;
      const dy = a.b.y - a.a.y;
      const dz = a.b.z - a.a.z;
      const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      c.launch((dx / l) * v, (dy / l) * v * 0.5, (dz / l) * v);
    }
    if (this.flipping) {
      // (the flip lands on the feet: a landing from the hanging hips' height)
      c.registerLanding(this.flipFall, 0, 0);
      this.flipping = false;
    }
    const pose = this.player.coverPose;
    pose.traverse = 'none';
    pose.traverseT = 0;
    pose.tumble = 0;
    this.pipe.reset();
    this.grips.aimFree = 0;
    this.grips.release(this.player.rig);
    this.jump = null;
    this.canClimb = false;
    this.onDetach?.(r);
  }

  /**
   * Opening a duct grate (before attaching): standing at it facing in; a short press kicks it (loud, quick), a
   * hold unscrews it over `UNSCREW_TIME` (quiet); letting go mid-unscrew stops. Returns true while it owns the body.
   */
  updateVent(dt: number): boolean {
    const v = this.vent;
    if (!v) return false;
    const c = this.player.controller;
    const g = v.duct.entry;
    v.t += dt;
    const inp = this.input;
    const key = `grate:${v.duct.id}:entry`;
    c.override = { velocity: { x: 0, z: 0 }, yaw: Math.atan2(-g.nx, -g.nz), turnRate: 10 };
    if (!this.player.alive || hyp2(inp.moveX, inp.moveY) > 0.6) {
      this.vent = null;
      c.override = null;
      return false;
    }
    let opened = false;
    if (!inp.useHeld && v.t > 0.02) {
      if (v.progress <= 0 && v.t < KICK_TAP + 0.1) {
        this.breakables?.open(key, 'kick');
        opened = true;
      } else {
        // let go mid-unscrew: stop (the progress is lost)
        this.vent = null;
        c.override = null;
        return false;
      }
    } else if (inp.useHeldT >= KICK_TAP) {
      v.progress = Math.min(1, (inp.useHeldT - KICK_TAP) / UNSCREW_TIME);
      if (v.progress >= 1) {
        this.breakables?.open(key, 'unscrew');
        opened = true;
      }
    }
    if (!opened) return true;
    this.vent = null;
    c.override = null;
    this.attachTo(v.duct, 0, 'side', 1, 0.55);
    return true;
  }

  /** The end of a duct: out through the exit grate (crawl out of a wall vent, drop through a ceiling vent), or
   *  back out of the entry. */
  private ductEnd(d: Duct, edge: 'min' | 'max'): void {
    const g = edge === 'max' ? d.exit : d.entry;
    if (edge === 'max') this.breakables?.open(`grate:${d.id}:exit`, 'unscrew');
    if (g.where !== 'wall') {
      // ceiling vent (a grate in the duct floor): a committed drop through it to the floor below (the capsule
      // would snag in the hole), landing like any fall (a roll from 2.5 m)
      const fy = this.floorAt(g.pos.x, g.pos.z, g.pos.y - 0.2);
      const p = attachPose(d, this.m.s, this.m.face, this.player.rig.height, this.ap);
      this.end.x = p.x;
      this.end.z = p.z;
      this.end.y = fy ?? p.y - 3;
      this.ventDrop = Math.max(0, p.y - this.end.y);
      const fall = Math.sqrt((2 * Math.max(0.1, this.ventDrop - VENT_LOWER)) / 9.81);
      this.m.beginExit('end', fall / (1 - VENT_LOWER_K));
      return;
    }
    const ex = g.pos.x + g.nx * 0.75;
    const ez = g.pos.z + g.nz * 0.75;
    const fy = this.floorAt(ex, ez, g.pos.y + 0.5);
    this.end.x = ex;
    this.end.z = ez;
    this.end.y = fy ?? g.pos.y - 0.35;
    this.m.beginExit('end');
  }

  /** Fixed step while attached: input along the anchor, transfers, jumps, exits, root path. */
  fixedUpdate(dt: number, jumpPressed: boolean): void {
    const m = this.m;
    const p = this.player;
    if (!p.alive) {
      this.detach('damage');
      return;
    }
    const a = m.anchor!;
    const sp = m.spec!;
    const inp = this.input;
    this.sPrev = m.s;
    let rate: number | undefined;
    let axis = axisInput(a, sp, inp.moveX, inp.moveY, inp.camYaw, m.s);
    if (a.kind === 'ladder' && inp.dropPressed) this.sliding = true;
    if (inp.moveY > 0.5) this.sliding = false;
    if (a.kind === 'ladder' && (inp.dropHeld || this.sliding) && m.phase === 'on') {
      axis = -1;
      rate = LADDER_SLIDE;
    } else if (a.kind === 'pipeV' && inp.moveY < -0.5 && jumpPressed && m.phase === 'on') {
      axis = -1;
      rate = PIPE_SLIDE;
      jumpPressed = false;
    } else if (inp.sprintHeld && (a.kind === 'ladder' || a.kind === 'pipeV')) {
      // sprint held: a quick climb
      rate = a.kind === 'ladder' ? LADDER_SPRINT_RATE * a.rung : PIPE_SPRINT;
    }
    if (a.kind === 'pipeH') {
      this.pipe.update(dt);
      if (!this.pipe.busy && this.grips.pipeFrom !== this.grips.pipeTo) this.grips.setPipe(a, m.s, m.face, this.pipe.mode, this.pipe.mode, this.player.rig.height);
      if (this.pipe.mode !== 'hands' || this.pipe.busy) rate = this.pipe.speed(sp.speed);
    }
    // climbing: the stick's sideways push (for stepping off onto a lip beside the climb)
    const side = a.kind === 'ladder' || a.kind === 'pipeV' ? this.sidePush(a) : 0;
    if (side !== 0) axis = 0;
    const edge = m.update(dt, axis, rate);
    this.transferT -= dt;
    // what traverse would do from here (prompts): jump where the stick points, else climb up
    this.jumpT -= dt;
    if (m.phase === 'on' && (this.jumpT <= 0 || jumpPressed)) {
      this.jumpT = 0.2;
      this.jump = this.findJump(a);
      this.canClimb = a.kind === 'ledge' ? a.canClimbUp && this.climbRoom(a) : a.kind === 'pipeV' && m.s >= m.limits.max - 0.03 && !!this.pipeLip(a, true);
    }
    const pipeSub = a.kind === 'pipeH' && (this.pipe.mode !== 'hands' || this.pipe.busy);
    if (m.phase === 'on' && pipeSub) {
      // legs up / inverted: Y up a state, B down (inverted: drop and flip to the feet)
      if (this.pipe.busy) {
        // (committed: only damage interrupts)
      } else if (jumpPressed) this.startPipe(a, 'up');
      else if (inp.dropPressed && this.pipe.mode === 'legsUp') this.startPipe(a, 'down');
      else if (inp.dropPressed && this.pipe.mode === 'inverted') this.flipDrop(a);
    } else if (m.phase === 'on') {
      if (inp.dropPressed && sp.allow.drop && a.kind !== 'ladder') this.detach('drop');
      else if (jumpPressed && this.jump) this.jumpTo(this.jump);
      // a horizontal pipe with nothing to jump to: Y pulls the legs up over it
      else if (jumpPressed && a.kind === 'pipeH') this.startPipe(a, 'up');
      else if (jumpPressed && this.canClimb) this.detach('climb');
      else if (side !== 0 && this.transferT <= 0) this.stepOffSideways(a, side);
      else if (a.kind === 'ledge' && Math.abs(axis) > 0.25 && this.transferT <= 0 && this.passClimber(a, axis > 0 ? 1 : -1)) {
        // (swung onto a ladder / drainpipe crossing the lip)
      } else if (a.kind === 'ledge' && edge !== 'none' && !this.jump) this.cornerTransfer(a, edge === 'min' ? -1 : 1);
      else if (edge === 'max' && a.kind === 'ladder') this.detach('top');
      else if (edge === 'min' && (a.kind === 'ladder' || a.kind === 'pipeV')) this.detach('bottom');
      else if (edge !== 'none' && a.kind === 'zipline') this.finish('end');
      else if (edge !== 'none' && a.kind === 'duct') this.ductEnd(a, edge);
      if (!m.active) return;
    }
    this.path();
    if (m.phase === 'exit' && m.progress >= 1) this.finish(null);
  }

  /** Root path for this step: blend on (with a jump arc), along the anchor, blend off. */
  private path(): void {
    const m = this.m;
    const a = m.anchor!;
    const c = this.player.controller;
    const h = this.player.rig.height;
    const pp = this.pipe;
    const p = attachPose(a, m.s, m.face, h, this.ap, a.kind === 'pipeH' ? (pp.to ? pp.from : pp.mode) : 'hands');
    let tumble = a.kind === 'pipeH' ? PIPE_TUMBLE[pp.mode] : 0;
    if (a.kind === 'pipeH' && pp.to) {
      // a pipe sub-state change: the root and facing move to the next state's, the body tumbles over with it
      const q = attachPose(a, m.s, m.face, h, this.ap2, pp.to);
      const t = smooth(pp.progress);
      p.x += (q.x - p.x) * t;
      p.y += (q.y - p.y) * t;
      p.z += (q.z - p.z) * t;
      p.yaw += angleTo(p.yaw, q.yaw) * t;
      tumble = PIPE_TUMBLE[pp.from] + (PIPE_TUMBLE[pp.to] - PIPE_TUMBLE[pp.from]) * t;
    } else if (a.kind === 'pipeH' && pp.mode !== 'hands') attachPose(a, m.s, m.face, h, p, pp.mode);
    const k = m.progress;
    const e = smooth(k);
    const f = this.from;
    let yaw = p.yaw;
    if (m.phase === 'enter' && m.entry === 'wall') {
      // wall jump: in to the wall and up it with a kick (first 45%), then up to the hands on the lip
      const kp = this.kickPt;
      if (k < 0.45) {
        const t = smooth(k / 0.45);
        this.kin.set(f.x + (kp.x - f.x) * t, f.y + (kp.y - f.y) * t, f.z + (kp.z - f.z) * t);
      } else {
        const t = smooth((k - 0.45) / 0.55);
        this.kin.set(kp.x + (p.x - kp.x) * t, kp.y + (p.y - kp.y) * t + Math.sin(Math.PI * t) * 0.2, kp.z + (p.z - kp.z) * t);
      }
      yaw = this.fromYaw + angleTo(this.fromYaw, p.yaw) * smooth((k - 0.3) / 0.6);
    } else if (m.phase === 'exit' && this.flipping) {
      // inverted drop: the legs let go, the body flips over forward and lands on the feet
      const t = k * k;
      this.kin.set(p.x, p.y + (this.end.y - p.y) * t, p.z);
      tumble = PIPE_TUMBLE.inverted + Math.PI * smooth(k);
    } else if (m.phase === 'enter') {
      if (m.entry === 'above' || (m.entry === 'top' && a.kind === 'ladder')) {
        // turn round and step out over the lip / onto the ladder, then down to the hands
        const out = smooth(k / 0.55);
        const down = smooth((k - 0.3) / 0.7);
        this.kin.set(f.x + (p.x - f.x) * out, f.y + (p.y - f.y) * down, f.z + (p.z - f.z) * out);
      } else if (this.via) {
        // round an outside corner: a quadratic curve through the point outside it
        const v = this.via;
        const u = 1 - e;
        this.kin.set(u * u * f.x + 2 * u * e * v.x + e * e * p.x, u * u * f.y + 2 * u * e * v.y + e * e * p.y, u * u * f.z + 2 * u * e * v.z + e * e * p.z);
      } else {
        const arc = this.arc * Math.sin(Math.PI * k);
        this.kin.set(f.x + (p.x - f.x) * e, f.y + (p.y - f.y) * e + arc, f.z + (p.z - f.z) * e);
      }
      yaw = this.fromYaw + angleTo(this.fromYaw, p.yaw) * smooth(k / 0.7);
    } else if (m.phase === 'exit' && this.ventDrop > 0) {
      // through a ceiling vent: lower down through the hole on the hands, then let go and fall
      const low = Math.min(VENT_LOWER, this.ventDrop);
      // (ease-out: the hips drop through the hole at once while the chest comes upright)
      const t = Math.min(1, k / VENT_LOWER_K);
      const y = k < VENT_LOWER_K ? p.y - low * (1 - (1 - t) * (1 - t)) : p.y - low - (this.ventDrop - low) * ((k - VENT_LOWER_K) / (1 - VENT_LOWER_K)) ** 2;
      this.kin.set(p.x, y, p.z);
    } else if (m.phase === 'exit') {
      // climbing up rises first, then steps in (like the mantle)
      const climb = m.exitReason === 'climb' || m.exitReason === 'top';
      const up = climb ? smooth(k / 0.6) : e;
      const fwd = climb ? smooth((k - 0.45) / 0.55) : e;
      const t = this.end;
      // pulling up from a hang the body eases out from the face (knees and elbows clear the wall), then in over
      // the top
      const out = m.exitReason === 'climb' && (a.kind === 'ledge' || a.kind === 'pipeV') ? Math.sin(Math.PI * Math.min(1, k / 0.62)) * 0.12 : 0;
      const ox = (a.kind === 'ledge' ? a.nx : this.climbNx) * out;
      const oz = (a.kind === 'ledge' ? a.nz : this.climbNz) * out;
      this.kin.set(p.x + (t.x - p.x) * fwd + ox, p.y + (t.y - p.y) * up, p.z + (t.z - p.z) * fwd + oz);
    } else this.kin.set(p.x, p.y, p.z);
    c.override = { kinematic: this.kin, yaw, turnRate: 30, crouch: a.kind === 'duct' };
    // pose family and cadence (the climb clips follow the hand steps)
    const pose = this.player.coverPose;
    pose.tumble = tumble;
    const pm = this.pipeMode;
    const fam: TraverseKind =
      a.kind === 'ladder' || a.kind === 'pipeV'
        ? 'climb'
        : a.kind === 'duct'
          ? 'crawl'
          : a.kind === 'split'
            ? 'split'
            : m.phase === 'enter' && m.entry === 'wall'
              ? 'wallKick'
              : a.kind === 'pipeH' && pm === 'legsUp'
                ? 'pipeLegs'
                : a.kind === 'pipeH' && pm === 'inverted' && !this.flipping
                  ? 'pipeInv'
                  : 'hang';
    const climbOut = m.phase === 'exit' && (m.exitReason === 'climb' || m.exitReason === 'top');
    pose.traverse = climbOut ? (m.exitReason === 'climb' ? 'climbUp' : 'mantle') : this.ventDrop > 0 && m.phase === 'exit' ? (k < VENT_LOWER_K ? 'ventDrop' : 'drop') : fam;
    pose.traverseT = climbOut ? k : this.ventDrop > 0 && m.phase === 'exit' ? Math.min(1, k / VENT_LOWER_K) : fam === 'wallKick' ? k : fam === 'hang' || fam === 'split' || fam === 'pipeLegs' || fam === 'pipeInv' ? 0 : this.cadence();
  }
  private ap2: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };

  /** Climb cycle phase 0..1 from the hand steps: 0..0.5 the right hand reaches, 0.5..1 the left. */
  private cadence(): number {
    return this.grips.cadence();
  }

  /** Room to stand on top of a lip (just inside it). */
  private climbRoom(l: Ledge): boolean {
    const p = attachPose(l, this.m.s, 1, this.player.rig.height, this.ap);
    return this.roomAt(p.x - l.nx * (HANG.out + 0.45), l.top + 0.05, p.z - l.nz * (HANG.out + 0.45));
  }

  /** At a lip's end with the stick pushing on: continue round the corner (or onto the next lip). */
  private cornerTransfer(l: Ledge, side: -1 | 1): void {
    const n = ledgeContinuation(this.anchors, l, side);
    if (!n) return;
    const nl = n.ledge;
    // outside corner (the faces turn away from each other): swing round it on a curve outside both faces
    const cross = l.nx * nl.nz - l.nz * nl.nx;
    const outside = side > 0 ? cross > 0.3 : cross < -0.3;
    if (!this.attachTo(nl, n.s, 'side', 1, outside ? 0.5 : 0.35)) return;
    if (outside) {
      const cx = side < 0 ? l.a.x : l.b.x;
      const cz = side < 0 ? l.a.z : l.b.z;
      const k = (HANG.out + 0.25) * (this.player.rig.height / 1.75);
      this.viaPt.x = cx + (l.nx + nl.nx) * k;
      this.viaPt.z = cz + (l.nz + nl.nz) * k;
      this.viaPt.y = this.player.controller.pos.y;
      this.via = this.viaPt;
    }
  }

  /** Outward normal of the lip a drainpipe climb-up goes over. */
  private climbNx = 0;
  private climbNz = 0;
  /** Seconds before another lip / climber transfer may start (no ping-pong between them). */
  private transferT = 0;

  /** The lip at the top of a drainpipe (to climb up onto): one beside / behind the pipe at about its top. */
  private pipeLip(a: Anchor, needRoom: boolean): Ledge | null {
    if (a.kind !== 'pipeV') return null;
    const near = anchorsNear(this.anchors, a.top.x, a.top.y, a.top.z, 1.0, ['ledge']);
    for (const n of near) {
      const l = n.anchor as Ledge;
      if (!l.canHang || Math.abs(l.top - a.top.y) > 0.8) continue;
      if (needRoom && !(l.canClimbUp && this.roomAt(a.base.x - l.nx * 0.6, l.top + 0.05, a.base.z - l.nz * 0.6))) continue;
      return l;
    }
    return null;
  }

  /**
   * The stick's push across a climb (ladder / drainpipe), camera relative: -1 left / 1 right of the climber, or 0.
   * Only a clear sideways push counts (up / down is the climb).
   */
  private sidePush(a: Anchor): number {
    const inp = this.input;
    if (Math.abs(inp.moveX) < 0.55 || Math.abs(inp.moveX) < Math.abs(inp.moveY)) return 0;
    const yaw = a.kind === 'ladder' ? a.facing : a.kind === 'pipeV' ? a.side : 0;
    const cy = Math.cos(inp.camYaw);
    const sy = Math.sin(inp.camYaw);
    const wx = inp.moveX * cy + inp.moveY * sy;
    const wz = -inp.moveX * sy + inp.moveY * cy;
    const r = wx * Math.cos(yaw) - wz * Math.sin(yaw);
    return r > 0.4 ? 1 : r < -0.4 ? -1 : 0;
  }

  /** Off a ladder / drainpipe sideways onto a lip at the hands' height on that side (passing by, or at the top). */
  private stepOffSideways(a: Anchor, side: number): boolean {
    if (a.kind !== 'ladder' && a.kind !== 'pipeV') return false;
    const yaw = a.kind === 'ladder' ? a.facing : a.side;
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const k = this.player.rig.height / 1.75;
    const handY = this.player.controller.pos.y + HANG.drop * k;
    const tx = a.base.x + rx * side * 0.5;
    const tz = a.base.z + rz * side * 0.5;
    const near = anchorsNear(this.anchors, tx, handY, tz, 0.6, ['ledge']);
    for (const n of near) {
      const l = n.anchor as Ledge;
      if (!l.canHang || Math.abs(l.top - handY) > 0.45) continue;
      // the lip faces the same way the climber's back does (it is on this wall)
      if (l.nx * Math.sin(yaw) + l.nz * Math.cos(yaw) > -0.5) continue;
      const s = Math.max(0.3, Math.min(l.len - 0.3, (tx - l.a.x) * l.tx + (tz - l.a.z) * l.tz));
      if (!this.attachTo(l, s, 'side', 1, 0.4)) return false;
      this.transferT = 0.5;
      return true;
    }
    return false;
  }

  /** Shimmying along a lip past a ladder / drainpipe that crosses it: swing onto the climb. */
  private passClimber(l: Ledge, dir: 1 | -1): boolean {
    const m = this.m;
    const ax = l.a.x + l.tx * (m.s + dir * 0.35);
    const az = l.a.z + l.tz * (m.s + dir * 0.35);
    const k = this.player.rig.height / 1.75;
    const feet = l.top - HANG.drop * k;
    const near = anchorsNear(this.anchors, ax, l.top, az, 0.45, ['ladder', 'pipeV']);
    for (const n of near) {
      const c = n.anchor;
      if (c.kind !== 'ladder' && c.kind !== 'pipeV') continue;
      // on this wall, and the climb runs past the hands
      const yaw = c.kind === 'ladder' ? c.facing : c.side;
      if (l.nx * Math.sin(yaw) + l.nz * Math.cos(yaw) > -0.5) continue;
      if (c.base.y > feet + 0.1 || c.top.y < l.top - 0.2) continue;
      const lim = { min: 0, max: Math.max(0, c.top.y - c.base.y - (c.kind === 'ladder' ? 0.55 : 1.05) * this.player.rig.height) };
      const sv = Math.max(lim.min, Math.min(lim.max, feet - c.base.y));
      if (!this.attachTo(c, sv, 'side', 1, 0.35)) return false;
      this.transferT = 0.5;
      return true;
    }
    return false;
  }

  /** The anchor the stick points at from the current grip (camera relative; into the wall = up). */
  private findJump(a: Anchor): JumpTarget | null {
    const inp = this.input;
    const mag = hyp2(inp.moveX, inp.moveY);
    if (a.kind === 'split') {
      // straight up out of the split to whatever is over it (reach measured from the feet on the walls)
      const g = this.gripCentre(a);
      return findJumpTarget(this.anchors, g, a.id, Math.sin(this.player.controller.yaw), Math.cos(this.player.controller.yaw), 1, 2.5, 0.6, 0, 0, this.jumpClear);
    }
    if (mag < 0.5 || a.kind === 'zipline' || a.kind === 'duct') return null;
    if (a.kind === 'pipeH' && this.pipe.mode !== 'hands') return null;
    const cy = Math.cos(inp.camYaw);
    const sy = Math.sin(inp.camYaw);
    let wx = (inp.moveX * cy + inp.moveY * sy) / mag;
    let wz = (-inp.moveX * sy + inp.moveY * cy) / mag;
    let up = 0;
    const g = this.gripCentre(a);
    if (a.kind === 'ledge') {
      // pushing into the wall: up; along the lip: sideways; away from it: back
      const into = -(wx * a.nx + wz * a.nz);
      if (into > 0.7) {
        up = 1;
        wx = -a.nx;
        wz = -a.nz;
      }
    } else if (a.kind === 'ladder' || a.kind === 'pipeV') {
      // climbing anchors: sideways / back only (up and down is the climb)
      const fx = Math.sin(a.kind === 'ladder' ? a.facing : a.side);
      const fz = Math.cos(a.kind === 'ladder' ? a.facing : a.side);
      if (wx * fx + wz * fz > 0.5) return null;
    }
    this.wish.x = wx;
    this.wish.z = wz;
    return findJumpTarget(this.anchors, g, a.id, wx, wz, up, 2.5, 0.6, a.kind === 'ledge' ? a.nx : 0, a.kind === 'ledge' ? a.nz : 0, this.jumpClear);
  }

  private jp: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };
  /** A jump's flight is clear: chest height from here to where the body hangs on the target. */
  private readonly jumpClear = (t: JumpTarget): boolean => {
    const h = this.player.rig.height;
    const c = this.player.controller.pos;
    const q = attachPose(t.anchor, t.s, this.m.face, h, this.jp);
    return this.lineClear(c.x, c.y + h * 0.75, c.z, q.x, q.y + h * 0.75, q.z);
  };

  private gc: P3 = { x: 0, y: 0, z: 0 };
  /** Midpoint of the hands' grips. */
  private gripCentre(a: Anchor): P3 {
    const o = this.gc;
    const p = attachPose(a, this.m.s, this.m.face, this.player.rig.height, this.ap);
    o.x = p.x;
    o.z = p.z;
    o.y = a.kind === 'ledge' ? a.top : a.kind === 'pipeH' ? a.hangHeight : p.y + 1.75;
    return o;
  }

  /** Jump to another anchor: a short arc from the current grip onto it. */
  private jumpTo(t: JumpTarget): void {
    const d = t.dist;
    this.attachTo(t.anchor, t.s, 'side', this.m.face, 0.3 + d * 0.16, 0.25 + d * 0.08);
  }

  // --- grips (render rate)

  /** Per render frame: hand / foot contacts from the interpolated body parameter. */
  frameUpdate(dt: number, alpha: number): void {
    const m = this.m;
    if (!m.active) return;
    const a = m.anchor!;
    const s = this.sPrev + (m.s - this.sPrev) * alpha;
    const k = m.progress;
    const w = m.phase === 'exit' ? 1 - smooth(k / 0.7) : m.phase === 'enter' ? smooth((k - 0.25) / 0.75) : 1;
    const vent = m.phase === 'exit' && this.ventDrop > 0 ? this.ventInfo : null;
    if (vent) {
      vent.drop = this.ventDrop;
      vent.progress = k;
      vent.kinY = this.kin.y;
    }
    this.grips.pipeK = this.pipe.progress;
    const aimFrom = a.kind === 'split' || (a.kind === 'pipeH' && this.pipe.mode === 'inverted' && !this.pipe.busy);
    this.grips.aimFree = aimFrom ? this.player.carry.raise : 0;
    this.grips.update(dt, a, s, m.v, m.face, w, this.player.rig, vent);
  }

  /** (3.2.0) Aiming a sidearm is allowed here: braced in a split, or hanging inverted (settled). */
  get sidearmAim(): boolean {
    const m = this.m;
    const a = m.anchor;
    if (!a || m.phase !== 'on') return false;
    return a.kind === 'split' || (a.kind === 'pipeH' && this.pipe.mode === 'inverted' && !this.pipe.busy);
  }

  private ventInfo = { drop: 0, progress: 0, kinY: 0 };

  /** Hand contact error for tests: how far each planted hand is from its grip (m). */
  contacts(): { handL: P3; handR: P3; plantedL: boolean; plantedR: boolean; footL: P3; footR: P3; feetPlantedL: boolean; feetPlantedR: boolean } {
    const r = this.player.rig;
    return {
      handL: { x: r.reachL.x, y: r.reachL.y, z: r.reachL.z },
      handR: { x: r.reachR.x, y: r.reachR.y, z: r.reachR.z },
      plantedL: this.hands.L.swing < 0,
      plantedR: this.hands.R.swing < 0,
      footL: { x: r.plantL.x, y: r.plantL.y, z: r.plantL.z },
      footR: { x: r.plantR.x, y: r.plantR.y, z: r.plantR.z },
      feetPlantedL: this.feet.L.swing < 0,
      feetPlantedR: this.feet.R.swing < 0,
    };
  }

  reset(): void {
    if (this.m.active) this.finish('gone');
    this.hint = null;
    this.lower = null;
    this.vent = null;
  }
}
