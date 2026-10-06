import type { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import type { TraverseKind } from '../anim/animGraph';
import type { AttachCamera } from '../config/camera';
import {
  anchorsNear,
  findJumpTarget,
  HANG,
  ledgeContinuation,
  nearestInReach,
  type Anchor,
  type AttachEntry,
  type JumpTarget,
  type Ledge,
  type P3,
  type ReachResult,
  type TraversalAnchors,
} from '../world/anchors';
import { AttachMachine, attachPose, axisInput, LADDER_SLIDE, PIPE_SLIDE, type AttachPose, type ExitReason } from './attach';
import { GripStepper, type GripLimb } from './gripStepper';
import type { Player } from './player';

/** Player input for attached states (set by GameState before each fixed step). */
export interface AttachInput {
  moveX: number;
  moveY: number;
  camYaw: number;
  dropPressed: boolean;
  dropHeld: boolean;
  /** Seconds drop has been held. */
  dropHeldT: number;
}

/** Anchors offered from the ground (the traverse button attaches). */
const GROUND_KINDS = ['ladder', 'pipeV', 'pipeH', 'ledge', 'zipline'] as const;
/** Hold drop this long at a hangable edge to lower into a hang (s). */
export const LOWER_HOLD = 0.3;
/** Lowering in from the top (turn round, step out, drop to the hands) and stepping onto a ladder from its top (s). */
const LOWER_TIME = 0.7;
const LADDER_TOP_TIME = 0.6;
/** Hand / foot swing times (s). */
const HAND_SWING = 0.2;
const FOOT_SWING = 0.24;

/** World prompt labels for what traverse / drop would do. */
export const ATTACH_LABEL: Record<string, string> = {
  ladder: 'Climb',
  pipeV: 'Climb',
  pipeH: 'Grab',
  ledgeBelow: 'Grab',
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
  readonly input: AttachInput = { moveX: 0, moveY: 0, camYaw: 0, dropPressed: false, dropHeld: false, dropHeldT: 0 };
  /** What traverse would attach to from the ground (prompt), refreshed with the traversal probe. */
  hint: ReachResult | null = null;
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
  private ap: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };
  private kin: Vector3;
  /** Body parameter last fixed step and this one (render interpolation of the grips). */
  private sPrev = 0;
  private hands = new GripStepper({ offL: -0.2, offR: 0.2, slack: 0.14, swingTime: HAND_SWING, lead: 0.8, grid: 0, gridOrigin: 0, min: 0, max: 1 });
  private feet = new GripStepper({ offL: 0, offR: 0.3, slack: 0.3, swingTime: FOOT_SWING, lead: 1, grid: 0.3, gridOrigin: 0, min: 0, max: 1 });
  private jumpT = 0;
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
  ) {
    this.kin = kin;
  }

  get active(): boolean {
    return this.m.active;
  }

  get camera(): AttachCamera | null {
    return this.m.spec?.camera ?? null;
  }

  /** Anchor to attach to from the feet along `dir` (or null). */
  probe(feet: Vector3, dx: number, dz: number): ReachResult | null {
    const r = nearestInReach(this.anchors, feet.x, feet.y, feet.z, dx, dz, GROUND_KINDS);
    if (!r) return null;
    // climbing onto a lip from below / lowering from above needs the hang spot clear of the floor and walls
    if (r.anchor.kind === 'ledge' && r.entry === 'above') {
      const p = attachPose(r.anchor, r.s, 1, this.player.rig.height, this.ap);
      if (!this.roomAt(p.x, p.y + 0.3, p.z)) return null;
    }
    return r;
  }

  /** Label for the ground prompt. */
  hintLabel(r: ReachResult): string {
    if (r.anchor.kind === 'ledge') return r.entry === 'above' ? ATTACH_LABEL.ledgeAbove! : ATTACH_LABEL.ledgeBelow!;
    return ATTACH_LABEL[r.anchor.kind] ?? '';
  }

  /** Attach from the ground. */
  attachFrom(r: ReachResult): boolean {
    const a = r.anchor;
    let face = 1;
    if (a.kind === 'pipeH') {
      // hang facing across the pipe on the side the camera looks along
      const ax = a.b.x - a.a.x;
      const az = a.b.z - a.a.z;
      const cx = Math.sin(this.input.camYaw);
      const cz = Math.cos(this.input.camYaw);
      face = az * cx - ax * cz >= 0 ? 1 : -1;
    }
    const t = r.entry === 'above' ? LOWER_TIME : r.entry === 'top' && a.kind === 'ladder' ? LADDER_TOP_TIME : undefined;
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
    if (reason === 'top' && a.kind === 'ladder') {
      this.end.x = a.top.x + Math.sin(a.facing) * 0.2;
      this.end.y = a.top.y;
      this.end.z = a.top.z + Math.cos(a.facing) * 0.2;
    } else if (reason === 'climb' && a.kind === 'ledge') {
      const p = attachPose(a, this.m.s, 1, this.player.rig.height, this.ap);
      this.end.x = p.x - a.nx * (HANG.out + 0.45);
      this.end.y = a.top;
      this.end.z = p.z - a.nz * (HANG.out + 0.45);
    }
    this.m.beginExit(reason);
  }

  private finish(reason: ExitReason | null): void {
    const c = this.player.controller;
    const r = this.m.finish() ?? reason;
    c.override = null;
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
        h.min = 0.08;
        h.max = (a.kind === 'ledge' ? a.len : hyp2(a.b.x - a.a.x, a.b.z - a.a.z)) - 0.08;
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
      else if (edge !== 'none' && (a.kind === 'duct' || a.kind === 'zipline')) this.detach('end');
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
      } else {
        const arc = this.arc * Math.sin(Math.PI * k);
        this.kin.set(f.x + (p.x - f.x) * e, f.y + (p.y - f.y) * e + arc, f.z + (p.z - f.z) * e);
      }
      yaw = this.fromYaw + angleTo(this.fromYaw, p.yaw) * smooth(k / 0.7);
    } else if (m.phase === 'exit') {
      // climbing up rises first, then steps in (like the mantle)
      const climb = m.exitReason === 'climb' || m.exitReason === 'top';
      const up = climb ? smooth(k / 0.6) : e;
      const fwd = climb ? smooth((k - 0.35) / 0.65) : e;
      const t = this.end;
      this.kin.set(p.x + (t.x - p.x) * fwd, p.y + (t.y - p.y) * up, p.z + (t.z - p.z) * fwd);
    } else this.kin.set(p.x, p.y, p.z);
    c.override = { kinematic: this.kin, yaw, turnRate: 30, crouch: a.kind === 'duct' };
    // pose family and cadence (the climb clips follow the hand steps)
    const pose = this.player.coverPose;
    const fam: TraverseKind = a.kind === 'ladder' || a.kind === 'pipeV' ? 'climb' : a.kind === 'duct' ? 'crawl' : 'hang';
    const climbOut = m.phase === 'exit' && (m.exitReason === 'climb' || m.exitReason === 'top');
    pose.traverse = climbOut ? 'mantle' : fam;
    pose.traverseT = climbOut ? k : fam === 'hang' ? 0 : this.cadence();
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
    this.attachTo(n.ledge, n.s, 'side', 1, 0.35);
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
      this.attachTo(l, s, 'side', 1, 0.45, 0.15);
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
    return findJumpTarget(this.anchors, g, a.id, wx, wz, up, 2.5, 0.6, a.kind === 'ledge' ? a.nx : 0, a.kind === 'ledge' ? a.nz : 0);
  }

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
    this.hands.update(dt, body, m.v);
    if (a.kind === 'ladder' || a.kind === 'pipeV') this.feet.update(dt, body, m.v);
    const k = m.progress;
    const w = m.phase === 'exit' ? 1 - smooth(k / 0.7) : m.phase === 'enter' ? smooth((k - 0.25) / 0.75) : 1;
    this.applyGrips(a, s, w);
  }

  private applyGrips(a: Anchor, s: number, w: number): void {
    const rig = this.player.rig;
    const L = rig.reachL;
    const R = rig.reachR;
    const fl = rig.plantL;
    const fr = rig.plantR;
    L.w = R.w = w;
    fl.w = fr.w = 0;
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
      default:
        L.w = R.w = 0;
    }
  }

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
  }
}
