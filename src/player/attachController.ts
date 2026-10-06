import type { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import type { TraverseKind } from '../anim/animGraph';
import type { AttachCamera } from '../config/camera';
import {
  anchorsNear,
  closestOn,
  ductPoint,
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
import { AttachMachine, attachPose, axisInput, LADDER_SLIDE, PIPE_SLIDE, type AttachPose, type ExitReason } from './attach';
import { GripStepper, type GripLimb } from './gripStepper';
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
const VENT_LOWER_K = 0.4;
/** Pulling up onto a lip from a hang (s). */
export const CLIMB_UP_TIME = 0.85;
/** Hand / foot swing times (s). */
const HAND_SWING = 0.2;
const FOOT_SWING = 0.24;

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
  readonly input: AttachInput = { moveX: 0, moveY: 0, camYaw: 0, dropPressed: false, dropHeld: false, dropHeldT: 0, useHeld: false, useHeldT: 0 };
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
  private hands = new GripStepper({ offL: -0.2, offR: 0.2, slack: 0.14, swingTime: HAND_SWING, lead: 0.8, grid: 0, gridOrigin: 0, min: 0, max: 1 });
  private feet = new GripStepper({ offL: 0, offR: 0.3, slack: 0.3, swingTime: FOOT_SWING, lead: 1, grid: 0.3, gridOrigin: 0, min: 0, max: 1 });
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
    return nearestInReach(this.anchors, feet.x, feet.y, feet.z, dx, dz, GROUND_KINDS, notAbove);
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
    this.setupGrips(a);
    return true;
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
    }
    // climbing up off a lip is a full pull-up (longer than the spec's blend)
    this.m.beginExit(reason, reason === 'climb' && a.kind === 'ledge' ? CLIMB_UP_TIME : undefined);
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
    const pose = this.player.coverPose;
    pose.traverse = 'none';
    pose.traverseT = 0;
    const rig = this.player.rig;
    rig.reachL.w = rig.reachR.w = rig.plantL.w = rig.plantR.w = 0;
    this.jump = null;
    this.canClimb = false;
    this.onDetach?.(r);
  }

  /** Configure the steppers for an anchor: hands along the lip / pipe, or up the rungs / pipe; feet on rungs. */
  private setupGrips(a: Anchor): void {
    const k = this.player.rig.height / 1.75;
    const h = this.hands.cfg;
    const f = this.feet.cfg;
    switch (a.kind) {
      case 'ledge':
      case 'pipeH': {
        // which way along the axis is the body's right (the right hand grips on that side)
        const p = attachPose(a, this.m.s, this.m.face, this.player.rig.height, this.ap);
        const tx = a.kind === 'ledge' ? a.tx : a.b.x - a.a.x;
        const tz = a.kind === 'ledge' ? a.tz : a.b.z - a.a.z;
        const sgn = tx * Math.cos(p.yaw) - tz * Math.sin(p.yaw) >= 0 ? 1 : -1;
        h.offL = -0.22 * k * sgn;
        h.offR = 0.22 * k * sgn;
        h.slack = 0.12;
        h.swingTime = 0.13;
        h.grid = 0;
        h.min = a.kind === 'ledge' ? 0.08 : 0.2;
        h.max = (a.kind === 'ledge' ? a.len : hyp2(a.b.x - a.a.x, a.b.z - a.a.z)) - (a.kind === 'ledge' ? 0.08 : 0.2);
        h.lead = 1;
        break;
      }
      case 'ladder':
        // hands stagger a rung apart at head height; feet a rung apart under the body
        h.offL = 1.3 * k;
        h.offR = 1.3 * k + a.rung;
        h.slack = a.rung * 1.05;
        h.lead = 0.5;
        h.swingTime = HAND_SWING;
        h.grid = a.rung;
        h.gridOrigin = a.base.y;
        h.min = a.base.y + a.rung;
        h.max = a.top.y + 0.9;
        f.offL = 0.05;
        f.offR = 0.05 + a.rung;
        f.slack = a.rung * 1.05;
        f.grid = a.rung;
        f.gridOrigin = a.base.y;
        f.min = a.base.y + a.rung;
        f.max = a.top.y;
        break;
      case 'pipeV':
        h.offL = 1.35 * k;
        h.offR = 1.6 * k;
        h.slack = 0.16;
        h.lead = 0.8;
        h.swingTime = HAND_SWING;
        h.grid = 0;
        h.min = a.base.y + 0.3;
        h.max = a.top.y;
        f.offL = 0.12;
        f.offR = 0.38;
        f.slack = 0.2;
        f.grid = 0;
        f.min = a.base.y;
        f.max = a.top.y - 1;
        break;
      case 'duct':
        // crawling: hands planted on the duct floor ahead of the shoulders, staggered
        h.offL = 0.38 * k;
        h.offR = 0.58 * k;
        h.slack = 0.2;
        h.lead = 1;
        h.swingTime = 0.22;
        h.grid = 0;
        h.min = 0;
        h.max = 1e6;
        break;
      default:
        break;
    }
    const body = this.gripBody(a, this.m.s);
    this.hands.reset(body);
    this.feet.reset(body);
  }

  /** Body parameter on the grip axis: along the lip / pipe (s), or the feet height for climbs. */
  private gripBody(a: Anchor, s: number): number {
    return a.kind === 'ladder' || a.kind === 'pipeV' ? a.base.y + s : s;
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
    }
    const edge = m.update(dt, axis, rate);
    // what traverse would do from here (prompts): jump where the stick points, else climb up
    this.jumpT -= dt;
    if (m.phase === 'on' && (this.jumpT <= 0 || jumpPressed)) {
      this.jumpT = 0.2;
      this.jump = this.findJump(a);
      this.canClimb = a.kind === 'ledge' && a.canClimbUp && this.climbRoom(a);
    }
    if (m.phase === 'on') {
      if (inp.dropPressed && sp.allow.drop && a.kind !== 'ladder') this.detach('drop');
      else if (jumpPressed && this.jump) this.jumpTo(this.jump);
      else if (jumpPressed && this.canClimb) this.detach('climb');
      else if (a.kind === 'ledge' && edge !== 'none' && !this.jump) this.cornerTransfer(a, edge === 'min' ? -1 : 1);
      else if (a.kind === 'pipeV' && (edge === 'max' || (jumpPressed && m.s >= m.limits.max - 0.05))) this.pipeTop(a);
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
    const p = attachPose(a, m.s, m.face, this.player.rig.height, this.ap);
    const k = m.progress;
    const e = smooth(k);
    const f = this.from;
    let yaw = p.yaw;
    if (m.phase === 'enter') {
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
      const out = m.exitReason === 'climb' && a.kind === 'ledge' ? Math.sin(Math.PI * Math.min(1, k / 0.62)) * 0.12 : 0;
      const ox = a.kind === 'ledge' ? a.nx * out : 0;
      const oz = a.kind === 'ledge' ? a.nz * out : 0;
      this.kin.set(p.x + (t.x - p.x) * fwd + ox, p.y + (t.y - p.y) * up, p.z + (t.z - p.z) * fwd + oz);
    } else this.kin.set(p.x, p.y, p.z);
    c.override = { kinematic: this.kin, yaw, turnRate: 30, crouch: a.kind === 'duct' };
    // pose family and cadence (the climb clips follow the hand steps)
    const pose = this.player.coverPose;
    const fam: TraverseKind = a.kind === 'ladder' || a.kind === 'pipeV' ? 'climb' : a.kind === 'duct' ? 'crawl' : 'hang';
    const climbOut = m.phase === 'exit' && (m.exitReason === 'climb' || m.exitReason === 'top');
    pose.traverse = climbOut ? (a.kind === 'ledge' ? 'climbUp' : 'mantle') : this.ventDrop > 0 && m.phase === 'exit' ? (k < VENT_LOWER_K ? 'ventDrop' : 'drop') : fam;
    pose.traverseT = climbOut ? k : this.ventDrop > 0 && m.phase === 'exit' ? Math.min(1, k / VENT_LOWER_K) : fam === 'hang' ? 0 : this.cadence();
  }

  /** Climb cycle phase 0..1 from the hand steps: 0..0.5 the right hand reaches, 0.5..1 the left. */
  private cadence(): number {
    const L = this.hands.L;
    const R = this.hands.R;
    if (R.swing >= 0) return R.swing * 0.5;
    if (L.swing >= 0) return 0.5 + L.swing * 0.5;
    return this.hands.steps % 2 === 0 ? 0 : 0.5;
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

  /** Top of a drainpipe: onto a lip near its top (hang), else stay. */
  private pipeTop(a: Anchor): void {
    if (a.kind !== 'pipeV') return;
    const near = anchorsNear(this.anchors, a.top.x, a.top.y, a.top.z, 1.0, ['ledge']);
    for (const n of near) {
      const l = n.anchor as Ledge;
      if (!l.canHang || Math.abs(l.top - a.top.y) > 0.8) continue;
      const dx = a.top.x - l.a.x;
      const dz = a.top.z - l.a.z;
      const s = Math.max(0.3, Math.min(l.len - 0.3, dx * l.tx + dz * l.tz));
      const c = this.player.controller.pos;
      const fx = c.x;
      const fz = c.z;
      if (!this.attachTo(l, s, 'side', 1, 0.5)) return;
      // up the last of the pipe first, then in under the lip (the bent knees never meet the wall)
      const q = attachPose(l, s, 1, this.player.rig.height, this.jp);
      this.viaPt.x = fx;
      this.viaPt.z = fz;
      this.viaPt.y = q.y;
      this.via = this.viaPt;
      return;
    }
  }

  /** The anchor the stick points at from the current grip (camera relative; into the wall = up). */
  private findJump(a: Anchor): JumpTarget | null {
    const inp = this.input;
    const mag = hyp2(inp.moveX, inp.moveY);
    if (mag < 0.5 || a.kind === 'zipline' || a.kind === 'duct') return null;
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
    const body = this.gripBody(a, s);
    this.hands.update(dt, body, m.kind === 'duct' ? m.v * m.face : m.v);
    if (a.kind === 'ladder' || a.kind === 'pipeV') this.feet.update(dt, body, m.v);
    const k = m.progress;
    const w = m.phase === 'exit' ? 1 - smooth(k / 0.7) : m.phase === 'enter' ? smooth((k - 0.25) / 0.75) : 1;
    this.applyGrips(a, s, w, dt);
  }

  /** Foot plants fade out over 0.2 s when the anchor has none (a drainpipe onto a lip): no snapping legs. */
  private plantFade = 0;

  private applyGrips(a: Anchor, s: number, w: number, dt: number): void {
    const rig = this.player.rig;
    const L = rig.reachL;
    const R = rig.reachR;
    const fl = rig.plantL;
    const fr = rig.plantR;
    L.w = R.w = w;
    // anchors without foot plants fade the last ones out (the positions stay where they were)
    this.plantFade = Math.max(0, this.plantFade - dt / 0.2);
    fl.w = fr.w = this.plantFade;
    const p = attachPose(a, s, this.m.face, rig.height, this.ap);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    const fx = Math.sin(p.yaw);
    const fz = Math.cos(p.yaw);
    const hL = this.hands.L;
    const hR = this.hands.R;
    switch (a.kind) {
      case 'ledge':
        this.alongLip(a, hL, L);
        this.alongLip(a, hR, R);
        return;
      case 'pipeH': {
        const ax = a.b.x - a.a.x;
        const az = a.b.z - a.a.z;
        const len = hyp2(ax, az) || 1;
        for (let i = 0; i < 2; i++) {
          const g = i === 0 ? hL : hR;
          const t = i === 0 ? L : R;
          const q = this.hands.pos(g);
          const lift = this.hands.lift(g);
          t.x = a.a.x + (ax / len) * q - fx * lift * 0.05;
          t.z = a.a.z + (az / len) * q - fz * lift * 0.05;
          t.y = a.hangHeight + lift * 0.05;
        }
        return;
      }
      case 'zipline': {
        const y = p.y + HANG.drop * (rig.height / 1.75);
        L.x = p.x - fx * 0.03;
        L.z = p.z - fz * 0.03;
        R.x = p.x + fx * 0.03;
        R.z = p.z + fz * 0.03;
        L.y = R.y = y;
        return;
      }
      case 'ladder':
      case 'pipeV': {
        const lx = a.base.x - fx * 0.04;
        const lz = a.base.z - fz * 0.04;
        const span = a.kind === 'ladder' ? a.width * 0.36 : 0.02;
        for (let i = 0; i < 2; i++) {
          const g = i === 0 ? hL : hR;
          const t = i === 0 ? L : R;
          const sd = i === 0 ? -1 : 1;
          const lift = this.hands.lift(g);
          t.x = lx + rx * span * sd - fx * lift * 0.08;
          t.z = lz + rz * span * sd - fz * lift * 0.08;
          t.y = this.hands.pos(g);
        }
        // feet: on the rungs (ladder) or pressed to the wall beside the pipe
        fl.w = fr.w = w;
        this.plantFade = w;
        const fSpan = a.kind === 'ladder' ? 0.12 : 0.16;
        const back = a.kind === 'ladder' ? 0.1 : 0.02;
        for (let i = 0; i < 2; i++) {
          const g = i === 0 ? this.feet.L : this.feet.R;
          const t = i === 0 ? fl : fr;
          const sd = i === 0 ? -1 : 1;
          const lift = this.feet.lift(g);
          t.x = a.base.x + rx * fSpan * sd - fx * (back + lift * 0.1);
          t.z = a.base.z + rz * fSpan * sd - fz * (back + lift * 0.1);
          t.y = this.feet.pos(g);
        }
        return;
      }
      case 'duct': {
        if (this.m.phase === 'exit' && this.ventDrop > 0) {
          // lowering through the vent: hands on the two edges of the hole
          const g = a.exit;
          // the hands take the edges once the shoulders are below them (before that they are tucked in, so the
          // elbows never spread into the hole's sides), and let go for the fall
          const shoulder = this.kin.y + 1.43 * (rig.height / 1.75);
          const below = Math.max(0, Math.min(1, (g.pos.y - shoulder) / 0.3));
          L.w = R.w = this.m.progress < VENT_LOWER_K ? below * below * (3 - 2 * below) : 0;
          L.x = g.pos.x - rx * 0.18;
          L.z = g.pos.z - rz * 0.18;
          R.x = g.pos.x + rx * 0.18;
          R.z = g.pos.z + rz * 0.18;
          L.y = R.y = g.pos.y + 0.1;
          return;
        }
        // hands on the duct floor beside the path ahead, lifted mid-swing
        for (let i = 0; i < 2; i++) {
          const g = i === 0 ? hL : hR;
          const t = i === 0 ? L : R;
          const sd = i === 0 ? -1 : 1;
          const q = ductPoint(a, this.hands.pos(g), this.dp);
          t.x = q.x + rx * 0.17 * sd;
          t.z = q.z + rz * 0.17 * sd;
          t.y = q.y + 0.05 + this.hands.lift(g) * 0.07;
        }
        return;
      }
      default:
        L.w = R.w = 0;
    }
  }

  private dp = { x: 0, y: 0, z: 0, dx: 0, dz: 1 };

  /** A hand on a ledge lip at its stepper parameter (lifted and pulled back a little mid-swing). */
  private alongLip(l: Ledge, g: GripLimb, t: { x: number; y: number; z: number }): void {
    const q = this.hands.pos(g);
    const lift = this.hands.lift(g);
    // the hands sit on the lip, a few cm in from the edge
    t.x = l.a.x + l.tx * q - l.nx * (0.04 - lift * 0.06);
    t.z = l.a.z + l.tz * q - l.nz * (0.04 - lift * 0.06);
    t.y = l.top + lift * 0.05;
  }

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
