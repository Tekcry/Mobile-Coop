/**
 * Hand and foot contacts on an anchor (pure: no Babylon). The attached player's grips step hand over hand
 * (`GripStepper`, every planted contact locked) from the body's parameter along the anchor; the same code poses a
 * co-op remote from its networked move state (3.2.0 phase 1), so a remote's hands land where the player's do.
 */
import { hyp2 } from '../core/mathx';
import { ductPoint, HANG, type Anchor, type Ledge } from '../world/anchors';
import { ATTACH, attachLift, attachPose, PIPE_HIPS, type AttachKind, type AttachPose } from './attach';
import { GripStepper, type GripLimb } from './gripStepper';
import type { PipeMode } from './splitJump';
import { RAPPEL, SPLIT } from '../config/movement';
import { proportions } from './proportions';
import { SPLIT_HANDS } from '../anim/clips/traverse'; // (anim-n4b) the split brace's palms

const RAPPEL_STANDOFF = RAPPEL.standoff;

/** Hand / foot swing times (s). */
export const HAND_SWING = 0.2;
export const FOOT_SWING = 0.24;
/**
 * (ct-prototype G4) Ladder / drainpipe reaches at the climb's own pace (s): CT 054411 3.4-5.7 (drainpipe) and 112102
 * 9.19-10.66 (ladder) swing a hand in about 0.3 s (was 0.18 s scaled by the speed). Quicker climbs (a slide, the old
 * sprint) scale it down, never below the arm's sweep (`minReachSwing`).
 */
export const CLIMB_HAND_SWING = 0.3;
export const CLIMB_FOOT_SWING = 0.3;
/**
 * (G4, AUDIT-TRAVERSAL #2, CT 054411) Drainpipe feet: one pair, both on the wall either side of the pipe, stepping
 * together right after a hand lands (an inchworm, no alternating feet). `off`: their spot over the root (the feet line,
 * m); `ahead`: a step lands this far above it (knees drawn up to hip height), so a step is about 0.45 m, one per hand
 * reach; `trail`: the feet step anyway past this far below it (a reach that never comes, at the top of the pipe). `swing`
 * is the quick draw-up (s): at 0.9 m/s a hand lands every ~0.5 s, so the feet push for the other ~0.32 s (the surge),
 * the legs straightening to `low` (m over the spot) before the next draw-up.
 */
export const PIPE_FEET = { off: 0.28, ahead: 0.22, low: -0.08, slack: 0.1, trail: 0.42, swing: 0.18 } as const;
/**
 * (G4, AUDIT-TRAVERSAL #5 / AUDIT-EXTRA-NEW #8) The hang pendulum: the body hangs from the hands and its lower half
 * swings sideways along the lip (never towards the wall). Shimmying, the hips trail the hands' midpoint (CT 110522
 * 66.0-68.9: legs trail the travel by about 16 deg as the lead hand reaches, through vertical as the trailing hand
 * closes, one swing a hand cycle); still, a slow sway (CT 110522 44-51: about +-6 deg every 1.5-1.8 s, settling after
 * 3 s). `gain` rad per metre of the hands' midpoint off the body; a spring (`period`, `zeta`) gives the lag and the one
 * overshoot on a stop. Rad, s. Starting values.
 */
export const HANG_SWING = { gain: 1.4, max: 0.3, period: 0.7, zeta: 0.4, idle: 0.1, idleLate: 0.06, idlePeriod: 1.7, idleSettle: 3 } as const;
/** (traverse-fix) The closest a ledge hand re-grips to the other hand's grip (m): a palm's width (~9 cm) and a little room. */
export const LEDGE_HAND_GAP = 0.12;
/** (G4) `traverseT` of the hang (a looping HANG clip): the swing angle over this is a quarter turn of the clip. */
export const HANG_SWING_CLIP = 0.25;
/** Dropping through a ceiling vent: the share of the exit spent lowering on the hands. */
export const VENT_LOWER_K = 0.4;
/**
 * (operators step 11e, A103) Peak arm sweep rate (rad/s) a climbing reach is planned for: half the rig's shoulder joint
 * limit (characterRig JOINT_RATE shL / shR 22 rad/s), as the torso dips with the feet at the same time. A smoothstep
 * swing of angle theta peaks at 1.5 theta / T, so a reach of `travel` m on an arm of `arm` m takes at least
 * 1.5 * (travel / arm) / ARM_SWEEP_RATE s. Wren's shorter arm (1.68 m rig) and G72's lower shoulder made the sprint's
 * 0.11 s reach outrun the joint limit (e2e-traverse ladder sprint 19.5 cm off the grip).
 */
export const ARM_SWEEP_RATE = 11;

/** The shortest hand swing (s) for a climb reach of `travel` m on a rig `height` m tall (its arm from proportions). */
export function minReachSwing(travel: number, height: number): number {
  const p = proportions('average', height);
  return (1.5 * travel) / (p.upperArm.len + p.forearm.len) / ARM_SWEEP_RATE;
}

/** A world target on the rig (palm / sole point and its weight). */
export interface GripTarget {
  x: number;
  y: number;
  z: number;
  w: number;
  /**
   * (anim-cleanup) Hands: the grip's axis (a rung, a pipe, a lip, a line; unit, world; 0 0 0 = none), its radius (m)
   * and `hook` 1 for a lip the hand hooks over palm down. A body with its own hands closes them round it (rig.setHands).
   */
  ax?: number;
  ay?: number;
  az?: number;
  rad?: number;
  hook?: number;
  /** (anim-cleanup, check fix r1) The point of the real grip geometry under this hand (on the axis / the lip edge). */
  cx?: number;
  cy?: number;
  cz?: number;
}

/** What the grips write: the rig's reach (hands) and plant (feet) targets, and its height. */
export interface GripRig {
  reachL: GripTarget;
  reachR: GripTarget;
  plantL: GripTarget;
  plantR: GripTarget;
  height: number;
}

/** Lowering through a ceiling vent (the duct's exit): how far, the exit progress and the body's height now. */
export interface VentExit {
  drop: number;
  progress: number;
  kinY: number;
}

/** (anim-cleanup) No grip axis on a hand target: the next reach (a door, a carried body, a choke) is not a grip. */
export function clearGripAxis(t: GripTarget): void {
  t.ax = 0; t.ay = 0; t.az = 0; t.rad = 0; t.hook = 0;
}

/** (anim-cleanup) The point of a grip line (through o along a; `flat`: at the target's height) nearest the target. */
function axisPoint(t: GripTarget, ox: number, oy: number, oz: number, ax: number, ay: number, az: number, flat: boolean): void {
  const y0 = flat ? t.y : oy;
  const k = (t.x - ox) * ax + (t.y - y0) * ay + (t.z - oz) * az;
  t.cx = ox + ax * k;
  t.cy = y0 + ay * k;
  t.cz = oz + az * k;
}

/**
 * (anim-cleanup) Moves a grip point off its line towards the climber (-f) by however much the target sits further out
 * than a planted hand (`planted`: the planted target's offset from the line along -f).
 */
function keepLift(t: GripTarget, fx: number, fz: number, planted: number): void {
  const off = (t.x - (t.cx ?? t.x)) * -fx + (t.z - (t.cz ?? t.z)) * -fz;
  const lift = Math.max(0, off - planted);
  t.cx = (t.cx ?? t.x) - fx * lift;
  t.cz = (t.cz ?? t.z) - fz * lift;
}

/** (anim-cleanup) Writes a hand target's grip axis (no allocation). */
function setAxis(t: GripTarget, ax: number, ay: number, az: number, rad: number, hook: number): void {
  t.ax = ax; t.ay = ay; t.az = az; t.rad = rad; t.hook = hook;
}

/** Moves grip target `o` the share `k` of the way to `t` (in place). */
function lerpTarget(o: GripTarget, t: GripTarget, k: number): void {
  o.x += (t.x - o.x) * k;
  o.y += (t.y - o.y) * k;
  o.z += (t.z - o.z) * k;
}

export class AttachGrips {
  readonly hands = new GripStepper({ offL: -0.2, offR: 0.2, slack: 0.14, swingTime: HAND_SWING, lead: 0.8, grid: 0, gridOrigin: 0, min: 0, max: 1 });
  readonly feet = new GripStepper({ offL: 0, offR: 0.3, slack: 0.3, swingTime: FOOT_SWING, lead: 1, grid: 0.3, gridOrigin: 0, min: 0, max: 1, overlap: false });
  /** Foot plants fade out over 0.2 s when the anchor has none (a drainpipe onto a lip): no snapping legs. */
  private plantFade = 0;
  /** (anim-cleanup) The rappel rope this frame: a point at the harness and its unit direction up to the anchor. */
  private readonly rope = { x: 0, y: 0, z: 0, dx: 0, dy: 1, dz: 0 };
  /** (step 11e) Ladder / drainpipe: the shortest hand swing the rig's arm can follow (`minReachSwing`). */
  private handSwingMin = 0;
  private ap: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 };
  private dp = { x: 0, y: 0, z: 0, dx: 0, dz: 1 };
  /** (3.2.0) Horizontal pipe sub-state: settled mode, or a transition from -> to at progress `pipeK`. */
  pipeFrom: PipeMode = 'hands';
  pipeTo: PipeMode = 'hands';
  pipeK = 1;
  /** (3.2.0) Aiming a sidearm from a split / inverted: the right hand leaves its grip for the weapon. */
  aimFree = 0;
  /** (3.2.0 phase 3) The second axis (rope: sideways along the wall; fence: the feet's climb height) and, on a rope,
   *  how far the kick-out has swung the body off the wall (m). */
  u = 0;
  outOff = 0;
  /** (ct-prototype E2) The feet's plant weight cap (a climb-up off a drainpipe: the feet leave the pipe first). */
  footW = 1;
  /**
   * (G176) Visual only: the rig root's offset from the gameplay root this frame (`attachLift` at the rig's height,
   * weighted by the grip blend), so a body shorter than the 1.75 m gameplay height still meets its grips. The local
   * player and a remote add it to the rig root after `update`; `release` zeroes it.
   */
  readonly lift = { x: 0, y: 0, z: 0 };
  private liftB = { x: 0, y: 0, z: 0 };
  private tA = { x: 0, y: 0, z: 0, w: 0 };
  private tB = { x: 0, y: 0, z: 0, w: 0 };
  private tC = { x: 0, y: 0, z: 0, w: 0 };
  private tD = { x: 0, y: 0, z: 0, w: 0 };
  /** (G4) The anchor kind the steppers are set up for, and the body parameter last update (cadence). */
  private kind: AttachKind | null = null;
  private bodyNow = 0;
  /** (G4) Hang pendulum: the swing angle (rad, + = the hips and legs to the body's right) and its rate, the sway
   *  clock, seconds still, and which way along the lip is the body's right (+1 / -1). */
  swingA = 0;
  private swingW = 0;
  private swayT = 0;
  private stillT = 0;
  private sideSgn = 1;

  /** Body parameter on the grip axis: along the lip / pipe (s), or the feet height for climbs. */
  body(a: Anchor, s: number): number {
    return a.kind === 'ladder' || a.kind === 'pipeV' ? a.base.y + s : s;
  }

  /** Configure the steppers for an anchor: hands along the lip / pipe, or up the rungs / pipe; feet on rungs. */
  setup(a: Anchor, s: number, face: number, height: number): void {
    const k = height / 1.75;
    const h = this.hands.cfg;
    const f = this.feet.cfg;
    this.handSwingMin = 0;
    this.kind = a.kind === 'ladder' || a.kind === 'pipeV' || a.kind === 'pipeH' || a.kind === 'ledge' || a.kind === 'duct' || a.kind === 'zipline' || a.kind === 'split' || a.kind === 'rappel' || a.kind === 'fence' ? a.kind : null;
    // (ct-prototype D2b) the ledge's one-at-a-time, speed-led reach; every other anchor keeps the quick hand-over-hand
    h.overlap = true;
    h.leadTime = 0;
    h.alternate = undefined;
    h.minGap = undefined;
    f.lead = 1;
    f.leadTime = 0;
    switch (a.kind) {
      case 'pipeH': {
        // facing along the pipe: the right hand leads, the left a hand's width behind (a shuffle along it)
        const len = hyp2(a.b.x - a.a.x, a.b.z - a.a.z);
        // (ct-prototype D2) a little longer, slower shuffle (was slack 0.12, swing 0.15 s)
        h.offL = -0.1 * k * face;
        h.offR = 0.14 * k * face;
        h.slack = 0.16;
        h.swingTime = 0.2;
        h.grid = 0;
        h.min = 0.2;
        h.max = len - 0.2;
        h.lead = 1;
        break;
      }
      case 'ledge': {
        // which way along the axis is the body's right (the right hand grips on that side)
        const p = attachPose(a, s, face, height, this.ap);
        const sgn = a.tx * Math.cos(p.yaw) - a.tz * Math.sin(p.yaw) >= 0 ? 1 : -1;
        this.sideSgn = sgn;
        // (ct-prototype D2 / D2b, Michael: "hands move too quickly ... should be wider"; then the shimmy slowed to 0.7 m/s)
        // slow reaches strictly one hand at a time, back to back, each landing ahead by the speed lead (not by the slack), so
        // a reach taken as she stops lands on its spot instead of past the arm's reach; a short slack (0.08) starts the first
        // reach early so the waiting hand never drifts under the body.
        // (G4, AUDIT-TRAVERSAL #4, CT 110522 65.3-69.9: a 1.0 s hand cycle at 0.5 m/s, the lead hand out about 0.3 s, the
        // trailing one closes about 0.3 s, a short hold; hands 0.55-0.8 m apart) swing 0.28 -> 0.32 s, lead 0.42 -> 0.6 s of
        // travel, spots 0.26 -> 0.25 m either side: a reach ~0.4 m, one per hand every ~0.8 s, the lead hand at most 0.45 m out
        // and the hands up to ~0.62 m apart (0.75-0.9 s of lead put it 4 cm past Wren's reach, e2e-traverse; was ~1.8 a second)
        h.offL = -0.25 * k * sgn;
        h.offR = 0.25 * k * sgn;
        h.slack = 0.08;
        h.swingTime = 0.32;
        h.grid = 0;
        h.min = 0.08;
        h.max = a.len - 0.08;
        h.lead = 0;
        h.leadTime = 0.6;
        h.overlap = false;
        h.alternate = 0.02;
        // (traverse-fix, ct-prototype STATE "a hand clamped at the lip end falls through to the other hand") at a lip's end
        // the leading hand is clamped at `max`: the trailing hand's speed lead landed it on (or through) that hand
        h.minGap = LEDGE_HAND_GAP;
        break;
      }
      case 'ladder':
        // hands stagger a rung apart at head height; feet a rung apart under the body.
        // (G4, AUDIT-TRAVERSAL #10, CT 112102: one hand reach every 0.6 s, each hand 2 rungs a reach, the opposite knee
        // lifting with it) slack 1.05 -> 1.9 rungs with a small lead (0.5 -> 0.05): each hand and foot moves 2 rungs a reach
        // (was 1); the spots move up 0.3 m so the hands range from the chest to over the head (was 1.0 - 1.8 m, now
        // 1.0 - 1.9 m over the feet), and the feet 0.3 m so the right foot steps just after the right hand lands
        h.offL = 1.6 * k;
        h.offR = 1.6 * k + a.rung;
        h.slack = a.rung * 1.9;
        h.lead = 0.05;
        h.swingTime = CLIMB_HAND_SWING;
        h.grid = a.rung;
        h.gridOrigin = a.base.y;
        h.min = a.base.y + a.rung;
        h.max = a.top.y + 0.9;
        f.offL = 0.35;
        f.offR = 0.35 + a.rung;
        f.slack = a.rung * 1.9;
        f.lead = 0.05;
        f.grid = a.rung;
        f.gridOrigin = a.base.y;
        f.min = a.base.y + a.rung;
        f.max = a.top.y;
        // the longest reach: a slack plus its lead, rounded up to the next rung
        this.handSwingMin = minReachSwing(h.slack * (1 + h.lead) + a.rung / 2, height);
        break;
      case 'pipeV':
        // (G4, AUDIT-TRAVERSAL #1, CT 054411 3.4-5.7: one reach per hand a cycle, a cycle 1.1-1.2 s, a swing about 0.3 s;
        // Michael: "arms need to move slower") slack 0.16 -> 0.5 with the lead kept at 0.8: a hand moves ~0.9 m a reach,
        // one per hand every ~1.0 s at 0.9 m/s (was ~3 a second); the spots kept (the climb during a 0.3 s swing
        // takes back most of the lead: planted hands range 0.85 - 1.75 m over the feet). The right hand starts higher (as
        // if it had just reached) so the two alternate about half a cycle apart instead of reaching as a pair.
        h.offL = 1.35 * k;
        h.offR = 1.6 * k;
        h.slack = 0.5;
        h.lead = 0.8;
        h.swingTime = CLIMB_HAND_SWING;
        h.grid = 0;
        h.min = a.base.y + 0.3;
        h.max = a.top.y;
        // (G4, AUDIT-TRAVERSAL #2) one pair of feet, stepping together after each hand lands (`update`); was alternating
        // feet at 0.12 / 0.38 m (ct-prototype E1)
        f.offL = PIPE_FEET.off * k;
        f.offR = PIPE_FEET.off * k;
        f.slack = PIPE_FEET.slack;
        f.lead = PIPE_FEET.ahead / PIPE_FEET.slack;
        // (the climb during the draw-up: the pair lands `ahead` over its spot at the end of the swing, not its start)
        f.leadTime = PIPE_FEET.swing;
        f.swingTime = PIPE_FEET.swing;
        f.grid = 0;
        f.min = a.base.y;
        f.max = a.top.y - 1;
        this.handSwingMin = minReachSwing(h.slack * (1 + h.lead), height);
        break;
      case 'split':
        // braced: nothing steps (no travel)
        h.grid = 0;
        h.min = -1e6;
        h.max = 1e6;
        f.grid = 0;
        f.min = -1e6;
        f.max = 1e6;
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
    const body = this.body(a, s);
    this.hands.reset(body);
    this.feet.reset(body);
    this.bodyNow = body;
    if (a.kind === 'pipeV') {
      // (G4) staggered hands: the right one a reach's lead higher
      const R = this.hands.R;
      R.at = Math.min(h.max, R.at + h.slack * 0.6);
      R.from = R.at;
    }
  }

  /**
   * Per render frame: step the contacts to the body parameter `s` moving at `v` (along the anchor, signed) and write
   * the rig's world targets at blend weight `w`. `vent` while lowering through a ceiling vent.
   */
  update(dt: number, a: Anchor, s: number, v: number, face: number, w: number, rig: GripRig, vent: VentExit | null = null, decide = true): void {
    const body = this.body(a, s);
    this.bodyNow = body;
    if (a.kind === 'ladder' || a.kind === 'pipeV') {
      // (G4) the climb's own pace swings a hand in CLIMB_HAND_SWING; quicker climbs (a slide) quicker, never quicker than
      // the arm can sweep
      const base = ATTACH[a.kind].speed;
      const k = base / Math.max(base, Math.abs(v));
      this.hands.cfg.swingTime = Math.max(this.handSwingMin, CLIMB_HAND_SWING * k);
      this.feet.cfg.swingTime = (a.kind === 'ladder' ? CLIMB_FOOT_SWING : PIPE_FEET.swing) * k;
    }
    const steps = this.hands.steps;
    this.hands.update(dt, body, a.kind === 'duct' ? v * face : v, decide);
    if (a.kind === 'pipeV') {
      // (G4) the drainpipe's pair of feet: they step together once a hand has landed (or, trailing too far, anyway)
      const fL = this.feet.L;
      const trail = Math.abs(body + this.feet.cfg.offL - fL.at) > PIPE_FEET.trail;
      this.feet.update(dt, body, v, decide && (this.hands.steps !== steps || trail));
      const fR = this.feet.R;
      fR.at = fL.at;
      fR.from = fL.from;
      fR.swing = fL.swing;
    } else if (a.kind === 'ladder' || (a.kind === 'pipeH' && this.pipeTo === 'legsUp')) this.feet.update(dt, body, v, decide);
    if (a.kind === 'ledge') this.hangSwing(dt, s, v);
    this.apply(a, s, face, w, dt, rig, vent);
    this.gripAxes(a, rig);
  }

  /**
   * (G4) The hang pendulum (`HANG_SWING`): the hips trail the hands' midpoint along the lip (one swing a hand cycle while
   * shimmying) plus a slow sway at rest, through a damped spring (the lag, one overshoot on a stop). Allocation-free.
   */
  private hangSwing(dt: number, s: number, v: number): void {
    const S = HANG_SWING;
    const h = Math.min(0.05, Math.max(0, dt));
    if (h <= 0) return;
    const mid = (this.hands.pos(this.hands.L) + this.hands.pos(this.hands.R)) * 0.5;
    // the hands' midpoint off the body, along the body's right (m): the hips swing the other way
    const off = (mid - s) * this.sideSgn;
    const moving = Math.min(1, Math.abs(v) / 0.1);
    this.stillT = moving > 0.5 ? 0 : this.stillT + h;
    this.swayT = (this.swayT + h) % S.idlePeriod;
    const settle = Math.min(1, Math.max(0, (this.stillT - S.idleSettle) / 2));
    const sway = (S.idle + (S.idleLate - S.idle) * settle) * Math.sin((2 * Math.PI * this.swayT) / S.idlePeriod) * (1 - moving);
    const target = Math.max(-S.max, Math.min(S.max, -S.gain * off)) + sway;
    const w0 = (2 * Math.PI) / S.period;
    this.swingW += (w0 * w0 * (target - this.swingA) - 2 * S.zeta * w0 * this.swingW) * h;
    this.swingA += this.swingW * h;
    if (this.swingA > S.max) {
      this.swingA = S.max;
      this.swingW = Math.min(0, this.swingW);
    } else if (this.swingA < -S.max) {
      this.swingA = -S.max;
      this.swingW = Math.max(0, this.swingW);
    }
  }

  /** Planted contacts on the grip axis [hand L, hand R, foot L, foot R] (NaN = swinging) into `out`. */
  planted(out: number[]): number[] {
    const h = this.hands;
    const f = this.feet;
    out[0] = h.L.swing < 0 ? h.L.at : NaN;
    out[1] = h.R.swing < 0 ? h.R.at : NaN;
    out[2] = f.L.swing < 0 ? f.L.at : NaN;
    out[3] = f.R.swing < 0 ? f.R.at : NaN;
    return out;
  }

  /** A remote at rest: hands and feet step onto the owner's planted contacts (`planted`). */
  settleTo(gp: readonly number[]): void {
    this.hands.settleTo(gp[0]!, gp[1]!);
    this.feet.settleTo(gp[2]!, gp[3]!);
  }

  /**
   * Climb cycle phase 0..1 from the hand steps: 0..0.5 the right hand reaches, 0.5..1 the left. (G4) On a drainpipe: how
   * drawn up the feet are (0 legs long under the body, 1 the knees at hip height: the inchworm, `PIPE_CLIMB`); hanging
   * from a lip: the pendulum's swing as the looping HANG clip's time (`HANG_SWING_CLIP` a full swing to the right, minus
   * to the left). The local player and a remote read it the same way (`poseFromMoveState`).
   */
  cadence(): number {
    if (this.kind === 'pipeV') {
      const f = this.feet;
      const up = f.pos(f.L) - this.bodyNow - f.cfg.offL;
      return Math.max(0, Math.min(1, (up - PIPE_FEET.low) / (PIPE_FEET.ahead - PIPE_FEET.low)));
    }
    if (this.kind === 'ledge') return HANG_SWING_CLIP * Math.max(-1, Math.min(1, this.swingA / HANG_SWING.max));
    const L = this.hands.L;
    const R = this.hands.R;
    if (R.swing >= 0) return R.swing * 0.5;
    if (L.swing >= 0) return 0.5 + L.swing * 0.5;
    return this.hands.steps % 2 === 0 ? 0 : 0.5;
  }

  /**
   * (3.2.0) A horizontal pipe changes sub-state: hands and feet re-grip for it (legs up: hands above the head along
   * the pipe, the legs crossed over it further along; inverted: the knees hooked over it).
   */
  setPipe(a: Anchor, s: number, face: number, from: PipeMode, to: PipeMode, height: number): void {
    this.pipeFrom = from;
    this.pipeTo = to;
    this.pipeK = from === to ? 1 : 0;
    if (a.kind !== 'pipeH') return;
    const k = height / 1.75;
    const h = this.hands.cfg;
    const f = this.feet.cfg;
    const len = hyp2(a.b.x - a.a.x, a.b.z - a.a.z);
    if (to === 'legsUp') {
      // body along the pipe, head away from the facing (-face): hands past the head, the ankles crossed over the
      // pipe past the knees (+face)
      h.offL = -face * 0.82 * k;
      h.offR = -face * 0.98 * k;
      h.slack = 0.12;
      h.swingTime = 0.2;
      h.lead = 1;
      f.offL = face * 0.5 * k;
      f.offR = face * 0.58 * k;
      f.slack = 0.14;
      f.swingTime = 0.22;
      f.lead = 1;
      f.grid = 0;
      f.min = 0.1;
      f.max = len - 0.1;
      h.min = 0.1;
      h.max = len - 0.1;
      this.hands.reset(s);
      this.feet.reset(s);
    } else if (to === 'hands') this.setup(a, s, face, height);
  }

  /**
   * (anim-cleanup) Each hand's grip axis for the anchor and (check fix r1) the point of the real geometry under each hand
   * (the rung's centre line, the pipe's or the cable's axis, the lip's edge), from the anchor's own data (levelBuilder),
   * so the rig puts the palm on the surface whatever offset the target carries.
   */
  private gripAxes(a: Anchor, rig: GripRig): void {
    let ax = 0, ay = 0, az = 0, rad = 0, hook = 0;
    // a line through (ox, oy, oz) along the axis; `flat`: the line's height follows each hand (a rung, a fence)
    let ox = 0, oy = 0, oz = 0, flat = false;
    switch (a.kind) {
      case 'ladder': {
        const fx = Math.sin(a.facing), fz = Math.cos(a.facing);
        // levelBuilder: the rungs 6 cm off the wall line (base), 35 mm square
        ax = fz; az = -fx; rad = 0.0175;
        ox = a.base.x - fx * 0.06; oz = a.base.z - fz * 0.06; flat = true;
        break;
      }
      case 'pipeV':
        ay = 1; rad = a.radius;
        ox = a.base.x; oy = a.base.y; oz = a.base.z;
        break;
      case 'pipeH':
      case 'zipline': {
        const dx = a.b.x - a.a.x, dy = a.b.y - a.a.y, dz = a.b.z - a.a.z;
        const l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        ax = dx / l; ay = dy / l; az = dz / l; rad = a.kind === 'pipeH' ? a.radius : 0.0125;
        ox = a.a.x; oy = a.a.y; oz = a.a.z;
        break;
      }
      case 'ledge':
        ax = a.tx; az = a.tz; hook = 1;
        ox = a.a.x; oy = a.top; oz = a.a.z;
        break;
      case 'fence':
        ax = a.tx; az = a.tz; rad = 0.004;
        ox = a.a.x; oz = a.a.z; flat = true;
        break;
      case 'rappel': {
        // the rope from the harness up to the anchor (both hands on it: the upper hand up the rope, the brake hand at the
        // hip), a 12 mm rope
        const r = this.rope;
        ax = r.dx; ay = r.dy; az = r.dz; rad = 0.006;
        ox = r.x; oy = r.y; oz = r.z;
        break;
      }
      default:
        break;
    }
    setAxis(rig.reachL, ax, ay, az, rad, hook);
    setAxis(rig.reachR, ax, ay, az, rad, hook);
    if (ax || ay || az) {
      axisPoint(rig.reachL, ox, oy, oz, ax, ay, az, flat);
      axisPoint(rig.reachR, ox, oy, oz, ax, ay, az, flat);
      // (check fix r1) a ladder / drainpipe hand swinging to its next grip lifts off towards the climber (the target's
      // own lift, attachGrips' `lift * 0.08`): keep that, so the hand never slides through the rungs on the way
      if (a.kind === 'ladder' || a.kind === 'pipeV') {
        const f = a.kind === 'ladder' ? a.facing : a.side;
        const planted = a.kind === 'ladder' ? -0.02 : 0.04;
        keepLift(rig.reachL, Math.sin(f), Math.cos(f), planted);
        keepLift(rig.reachR, Math.sin(f), Math.cos(f), planted);
      }
    }
  }

  /** Let go: every target weight to 0. */
  release(rig: GripRig): void {
    rig.reachL.w = rig.reachR.w = rig.plantL.w = rig.plantR.w = 0;
    // (anim-cleanup, check fix r1) no grip axis left for the next reach (a door handle, a carried body, a choke)
    clearGripAxis(rig.reachL);
    clearGripAxis(rig.reachR);
    this.plantFade = 0;
    this.lift.x = this.lift.y = this.lift.z = 0;
    // (G4) a fresh hang starts plumb
    this.swingA = this.swingW = this.stillT = this.swayT = 0;
    this.kind = null;
  }

  /** (G176) `lift` for this frame: the body's offset from the gameplay root (a pipe change blends both states'). */
  private liftTo(a: Anchor, s: number, face: number, w: number, height: number): void {
    const o = this.lift;
    attachLift(a, s, face, height, o, a.kind === 'pipeH' ? this.pipeFrom : 'hands', this.u);
    if (a.kind === 'pipeH' && this.pipeTo !== this.pipeFrom) {
      const b = attachLift(a, s, face, height, this.liftB, this.pipeTo, this.u);
      const k = this.pipeK * this.pipeK * (3 - 2 * this.pipeK);
      o.x += (b.x - o.x) * k;
      o.y += (b.y - o.y) * k;
      o.z += (b.z - o.z) * k;
    }
    o.x *= w;
    o.y *= w;
    o.z *= w;
  }

  private apply(a: Anchor, s: number, face: number, w: number, dt: number, rig: GripRig, vent: VentExit | null): void {
    const L = rig.reachL;
    const R = rig.reachR;
    const fl = rig.plantL;
    const fr = rig.plantR;
    L.w = R.w = w;
    // anchors without foot plants fade the last ones out (the positions stay where they were)
    this.plantFade = Math.max(0, this.plantFade - dt / 0.2);
    fl.w = fr.w = this.plantFade;
    this.liftTo(a, s, face, w, rig.height);
    const p = attachPose(a, s, face, rig.height, this.ap);
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
        if (this.pipeFrom === 'hands' && this.pipeTo === 'hands') {
          this.pipeHands(a, hL, hR, fx, fz, L, R);
          return;
        }
        // a sub-state or a change between two: both target sets, blended by the transition's progress
        const k = this.pipeK * this.pipeK * (3 - 2 * this.pipeK);
        this.pipeSet(a, s, face, rig.height, this.pipeFrom, this.tA, this.tB, this.tC, this.tD, hL, hR, fx, fz);
        const wf = this.pipeFrom === 'hands' ? 0 : 1;
        L.x = this.tA.x;
        L.y = this.tA.y;
        L.z = this.tA.z;
        R.x = this.tB.x;
        R.y = this.tB.y;
        R.z = this.tB.z;
        fl.x = this.tC.x;
        fl.y = this.tC.y;
        fl.z = this.tC.z;
        fr.x = this.tD.x;
        fr.y = this.tD.y;
        fr.z = this.tD.z;
        const hw0 = this.tA.w;
        this.pipeSet(a, s, face, rig.height, this.pipeTo, this.tA, this.tB, this.tC, this.tD, hL, hR, fx, fz);
        // (operators step 11e) a module function, not a per-frame closure (hot path: no allocation)
        lerpTarget(L, this.tA, k);
        lerpTarget(R, this.tB, k);
        lerpTarget(fl, this.tC, k);
        lerpTarget(fr, this.tD, k);
        const wt = this.pipeTo === 'hands' ? 0 : 1;
        L.w = R.w = w * (hw0 + (this.tA.w - hw0) * k);
        R.w *= 1 - this.aimFree;
        fl.w = fr.w = w * (wf + (wt - wf) * k);
        this.plantFade = fl.w;
        return;
      }
      case 'rappel': {
        // feet on the wall (off it while swung out), one hand up the rope, the brake hand at the hip
        const k = rig.height / 1.75;
        const pr = attachPose(a, s, 1, rig.height, this.ap, 'hands', this.u);
        const tx = -a.nz;
        const tz = a.nx;
        const out = this.outOff;
        const fw = w * Math.max(0, 1 - out / 0.25) * (1 - this.aimFree);
        fl.w = fr.w = fw;
        this.plantFade = fw;
        const wx = pr.x - a.nx * (RAPPEL_STANDOFF * k - 0.02);
        const wz = pr.z - a.nz * (RAPPEL_STANDOFF * k - 0.02);
        fl.x = wx - tx * 0.14;
        fl.z = wz - tz * 0.14;
        fl.y = pr.y + 0.32 * k;
        fr.x = wx + tx * 0.14;
        fr.z = wz + tz * 0.14;
        fr.y = pr.y + 0.5 * k;
        // the rope from the anchor to the harness
        const hx = pr.x + a.nx * (out + 0.12);
        const hy = pr.y + 0.95 * k;
        const hz = pr.z + a.nz * (out + 0.12);
        let dx = a.top.x - hx;
        let dy = a.top.y + 0.1 - hy;
        let dz = a.top.z - hz;
        const dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        dx /= dl;
        dy /= dl;
        dz /= dl;
        this.rope.x = hx; this.rope.y = hy; this.rope.z = hz;
        this.rope.dx = dx; this.rope.dy = dy; this.rope.dz = dz;
        R.x = hx + dx * 0.42 * k;
        R.y = hy + dy * 0.42 * k;
        R.z = hz + dz * 0.42 * k;
        L.x = hx + dx * 0.05 + tx * 0.12;
        L.y = hy + dy * 0.05 - 0.05;
        L.z = hz + dz * 0.05 + tz * 0.12;
        R.w = w * (1 - this.aimFree);
        return;
      }
      case 'fence': {
        // toes and fingers in the mesh, the limbs trading as it climbs / shimmies (`u` the feet's height)
        const k = rig.height / 1.75;
        const cyc = ((this.u * 1.6 + s * 1.2) % 1) * Math.PI * 2;
        const off = a.nx * face * 0.06;
        const offz = a.nz * face * 0.06;
        const bx = a.a.x + a.tx * s;
        const bz = a.a.z + a.tz * s;
        const by = a.a.y + this.u;
        fl.w = fr.w = w;
        this.plantFade = w;
        fl.x = bx - a.tx * 0.13 + off;
        fl.z = bz - a.tz * 0.13 + offz;
        fl.y = by + 0.06 + Math.max(0, Math.sin(cyc)) * 0.15;
        fr.x = bx + a.tx * 0.13 + off;
        fr.z = bz + a.tz * 0.13 + offz;
        fr.y = by + 0.06 + Math.max(0, -Math.sin(cyc)) * 0.15;
        const hy = Math.min(a.a.y + a.height - 0.04, by + 1.85 * k);
        L.x = bx - a.tx * 0.24 + off;
        L.z = bz - a.tz * 0.24 + offz;
        L.y = hy - Math.max(0, -Math.sin(cyc)) * 0.18;
        R.x = bx + a.tx * 0.24 + off;
        R.z = bz + a.tz * 0.24 + offz;
        R.y = hy - Math.max(0, Math.sin(cyc)) * 0.18;
        return;
      }
      case 'split': {
        // feet on the two walls at the feet line, hands braced on them at chest height (the right hand leaves to
        // aim the sidearm)
        const wx = a.nx;
        const wz = a.nz;
        // which wall is on the body's right
        const sd = wx * rx + wz * rz >= 0 ? 1 : -1;
        const half = a.width / 2 - 0.05;
        const cx = a.a.x + a.tx * s;
        const cz = a.a.z + a.tz * s;
        const fy = a.a.y + SPLIT.feetHeight;
        fl.w = fr.w = w;
        this.plantFade = w;
        fl.x = cx - wx * sd * half + fx * 0.04;
        fl.z = cz - wz * sd * half + fz * 0.04;
        fl.y = fy;
        fr.x = cx + wx * sd * half - fx * 0.04;
        fr.z = cz + wz * sd * half - fz * 0.04;
        fr.y = fy;
        // (pressed against the walls under the shoulders: (anim-n4b, AUDIT fix 36) SPLIT_HANDS, the arms angled down onto
        // the walls, not straight out level)
        const sc = rig.height / 1.75;
        const hy = fy + SPLIT_HANDS.up * sc;
        const hf = SPLIT_HANDS.fwd * sc;
        L.x = cx - wx * sd * (half + 0.02) + fx * hf;
        L.z = cz - wz * sd * (half + 0.02) + fz * hf;
        L.y = hy;
        R.x = cx + wx * sd * (half + 0.02) + fx * hf;
        R.z = cz + wz * sd * (half + 0.02) + fz * hf;
        R.y = hy;
        R.w = w * (1 - this.aimFree);
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
        // feet: on the rungs (ladder) or pressed to the wall beside the pipe ((ct-prototype E2) a climb-up off the top
        // lets the feet go before the hands: `footW`)
        fl.w = fr.w = Math.min(w, this.footW);
        this.plantFade = fl.w;
        const fSpan = a.kind === 'ladder' ? 0.15 : 0.16;
        // (ct-prototype E1) on a drainpipe the soles sit 8 cm out from the wall (was 2): room for the knees to bend in
        const back = a.kind === 'ladder' ? 0.13 : 0.08;
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
        if (vent && vent.drop > 0) {
          // lowering through the vent: hands on the two edges of the hole
          const g = a.exit;
          // the hands take the edges once the shoulders are below them (before that they are tucked in, so the
          // elbows never spread into the hole's sides), and let go for the fall
          const shoulder = vent.kinY + 1.43 * (rig.height / 1.75);
          const below = Math.max(0, Math.min(1, (g.pos.y - shoulder) / 0.3));
          L.w = R.w = vent.progress < VENT_LOWER_K ? below * below * (3 - 2 * below) : 0;
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

  /** Hanging by the hands from a horizontal pipe: hands on the stepper's grips (lifted a little mid-swing). */
  private pipeHands(a: Anchor & { kind: 'pipeH' }, hL: GripLimb, hR: GripLimb, fx: number, fz: number, L: GripTarget, R: GripTarget): void {
    const ax = a.b.x - a.a.x;
    const az = a.b.z - a.a.z;
    const len = hyp2(ax, az) || 1;
    // facing along the pipe: the body's right is (fz, -fx); each hand just its own side of the top of the pipe, lifted
    // off it mid-swing
    for (let i = 0; i < 2; i++) {
      const g = i === 0 ? hL : hR;
      const t = i === 0 ? L : R;
      const sd = i === 0 ? -1 : 1;
      const q = this.hands.pos(g);
      const lift = this.hands.lift(g);
      t.x = a.a.x + (ax / len) * q + fz * 0.035 * sd;
      t.z = a.a.z + (az / len) * q - fx * 0.035 * sd;
      t.y = a.hangHeight + lift * 0.07;
    }
  }

  /**
   * Targets on a horizontal pipe in a sub-state (hands L / R, feet L / R; `w` on the hands' targets: 1 gripping,
   * 0 free). Hands: as `pipeHands`, no feet. Legs up: the steppers' grips along the pipe (hands behind the head, the
   * ankles crossed over it). Inverted: knees hooked over the pipe (the feet just over and behind it), hands free.
   */
  private pipeSet(a: Anchor & { kind: 'pipeH' }, s: number, face: number, height: number, mode: PipeMode, L: GripTarget, R: GripTarget, FL: GripTarget, FR: GripTarget, hL: GripLimb, hR: GripLimb, fx: number, fz: number): void {
    const ax = a.b.x - a.a.x;
    const az = a.b.z - a.a.z;
    const len = hyp2(ax, az) || 1;
    const tx = ax / len;
    const tz = az / len;
    const k = height / 1.75;
    const y = a.hangHeight;
    if (mode === 'hands') {
      this.pipeHands(a, hL, hR, fx, fz, L, R);
      L.w = R.w = 1;
      // (feet hang: the plants follow the body down)
      const p = attachPose(a, s, face, height, this.ap);
      FL.x = FR.x = p.x;
      FL.z = FR.z = p.z;
      FL.y = FR.y = p.y;
      return;
    }
    if (mode === 'legsUp') {
      for (let i = 0; i < 2; i++) {
        const g = i === 0 ? hL : hR;
        const t = i === 0 ? L : R;
        const q = this.hands.pos(g);
        const lift = this.hands.lift(g);
        t.x = a.a.x + tx * q;
        t.z = a.a.z + tz * q;
        t.y = y + lift * 0.05;
        const fg = i === 0 ? this.feet.L : this.feet.R;
        const ft = i === 0 ? FL : FR;
        const fq = this.feet.pos(fg);
        // ankles crossed over the top of the pipe
        ft.x = a.a.x + tx * fq;
        ft.z = a.a.z + tz * fq;
        ft.y = y + 0.07 + this.feet.lift(fg) * 0.06;
      }
      L.w = R.w = 1;
      return;
    }
    // inverted, along the pipe: the legs straddle it, knees either side, the shins crossed over the top and the ankles
    // locked a little behind the knees (towards the back, -face along the pipe)
    const cx = a.a.x + tx * s;
    const cz = a.a.z + tz * s;
    const nx = -tz;
    const nz = tx;
    const back = 0.14 * k * face;
    FL.x = cx - tx * back + nx * 0.05;
    FL.z = cz - tz * back + nz * 0.05;
    FR.x = cx - tx * (back + 0.06 * face) - nx * 0.05;
    FR.z = cz - tz * (back + 0.06 * face) - nz * 0.05;
    FL.y = y + 0.1;
    FR.y = y + 0.08;
    // hands hang free (or reach for the weapon): their targets stay under the pipe, unweighted
    L.x = R.x = cx;
    L.z = R.z = cz;
    L.y = R.y = y - (PIPE_HIPS.inverted + 0.9) * k;
    L.w = R.w = 0;
  }

  /** A hand on a ledge lip at its stepper parameter (lifted and pulled back a little mid-swing). */
  private alongLip(l: Ledge, g: GripLimb, t: GripTarget): void {
    const q = this.hands.pos(g);
    const lift = this.hands.lift(g);
    // the hands sit on the lip, a few cm in from the edge; (ct-prototype D2) mid-reach the hand lifts 9 cm and arcs 8 cm
    // out past the edge (was 5 / 6)
    t.x = l.a.x + l.tx * q - l.nx * (0.04 - lift * 0.08);
    t.z = l.a.z + l.tz * q - l.nz * (0.04 - lift * 0.08);
    t.y = l.top + lift * 0.09;
  }
}
