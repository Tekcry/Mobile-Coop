/**
 * Hand and foot contacts on an anchor (pure: no Babylon). The attached player's grips step hand over hand
 * (`GripStepper`, every planted contact locked) from the body's parameter along the anchor; the same code poses a
 * co-op / PvP remote from its networked move state (3.2.0 phase 1), so a remote's hands land where the player's do.
 */
import { hyp2 } from '../core/mathx';
import { ductPoint, HANG, type Anchor, type Ledge } from '../world/anchors';
import { attachPose, PIPE_HIPS, type AttachPose } from './attach';
import { GripStepper, type GripLimb } from './gripStepper';
import type { PipeMode } from './splitJump';
import { RAPPEL } from '../config/movement';

const RAPPEL_STANDOFF = RAPPEL.standoff;

/** Hand / foot swing times (s). */
export const HAND_SWING = 0.2;
export const FOOT_SWING = 0.24;
/** Dropping through a ceiling vent: the share of the exit spent lowering on the hands. */
export const VENT_LOWER_K = 0.4;

/** A world target on the rig (palm / sole point and its weight). */
export interface GripTarget {
  x: number;
  y: number;
  z: number;
  w: number;
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

export class AttachGrips {
  readonly hands = new GripStepper({ offL: -0.2, offR: 0.2, slack: 0.14, swingTime: HAND_SWING, lead: 0.8, grid: 0, gridOrigin: 0, min: 0, max: 1 });
  readonly feet = new GripStepper({ offL: 0, offR: 0.3, slack: 0.3, swingTime: FOOT_SWING, lead: 1, grid: 0.3, gridOrigin: 0, min: 0, max: 1, overlap: false });
  /** Foot plants fade out over 0.2 s when the anchor has none (a drainpipe onto a lip): no snapping legs. */
  private plantFade = 0;
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
  private tA = { x: 0, y: 0, z: 0, w: 0 };
  private tB = { x: 0, y: 0, z: 0, w: 0 };
  private tC = { x: 0, y: 0, z: 0, w: 0 };
  private tD = { x: 0, y: 0, z: 0, w: 0 };

  /** Body parameter on the grip axis: along the lip / pipe (s), or the feet height for climbs. */
  body(a: Anchor, s: number): number {
    return a.kind === 'ladder' || a.kind === 'pipeV' ? a.base.y + s : s;
  }

  /** Configure the steppers for an anchor: hands along the lip / pipe, or up the rungs / pipe; feet on rungs. */
  setup(a: Anchor, s: number, face: number, height: number): void {
    const k = height / 1.75;
    const h = this.hands.cfg;
    const f = this.feet.cfg;
    switch (a.kind) {
      case 'ledge':
      case 'pipeH': {
        // which way along the axis is the body's right (the right hand grips on that side)
        const p = attachPose(a, s, face, height, this.ap);
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
  }

  /**
   * Per render frame: step the contacts to the body parameter `s` moving at `v` (along the anchor, signed) and write
   * the rig's world targets at blend weight `w`. `vent` while lowering through a ceiling vent.
   */
  update(dt: number, a: Anchor, s: number, v: number, face: number, w: number, rig: GripRig, vent: VentExit | null = null, decide = true): void {
    const body = this.body(a, s);
    if (a.kind === 'ladder' || a.kind === 'pipeV') {
      // quicker reaches the quicker the climb (a sprint up a ladder)
      const sp = Math.max(0.9, Math.abs(v));
      this.hands.cfg.swingTime = Math.min(HAND_SWING, 0.18 * (0.9 / sp));
      this.feet.cfg.swingTime = Math.min(FOOT_SWING, 0.22 * (0.9 / sp));
    }
    this.hands.update(dt, body, a.kind === 'duct' ? v * face : v, decide);
    if (a.kind === 'ladder' || a.kind === 'pipeV' || (a.kind === 'pipeH' && this.pipeTo === 'legsUp')) this.feet.update(dt, body, v, decide);
    this.apply(a, s, face, w, dt, rig, vent);
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

  /** Climb cycle phase 0..1 from the hand steps: 0..0.5 the right hand reaches, 0.5..1 the left. */
  cadence(): number {
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

  /** Let go: every target weight to 0. */
  release(rig: GripRig): void {
    rig.reachL.w = rig.reachR.w = rig.plantL.w = rig.plantR.w = 0;
    this.plantFade = 0;
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
        const lerp = (o: GripTarget, t: GripTarget): void => {
          o.x += (t.x - o.x) * k;
          o.y += (t.y - o.y) * k;
          o.z += (t.z - o.z) * k;
        };
        lerp(L, this.tA);
        lerp(R, this.tB);
        lerp(fl, this.tC);
        lerp(fr, this.tD);
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
        const fy = a.a.y + 1.9 * (rig.height / 1.75);
        fl.w = fr.w = w;
        this.plantFade = w;
        fl.x = cx - wx * sd * half + fx * 0.04;
        fl.z = cz - wz * sd * half + fz * 0.04;
        fl.y = fy;
        fr.x = cx + wx * sd * half - fx * 0.04;
        fr.z = cz + wz * sd * half - fz * 0.04;
        fr.y = fy;
        const hy = fy + 1.02 * (rig.height / 1.75);
        L.x = cx - wx * sd * (half + 0.02) + fx * 0.12;
        L.z = cz - wz * sd * (half + 0.02) + fz * 0.12;
        L.y = hy;
        R.x = cx + wx * sd * (half + 0.02) + fx * 0.12;
        R.z = cz + wz * sd * (half + 0.02) + fz * 0.12;
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
        // feet: on the rungs (ladder) or pressed to the wall beside the pipe
        fl.w = fr.w = w;
        this.plantFade = w;
        const fSpan = a.kind === 'ladder' ? 0.15 : 0.16;
        const back = a.kind === 'ladder' ? 0.13 : 0.02;
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
    for (let i = 0; i < 2; i++) {
      const g = i === 0 ? hL : hR;
      const t = i === 0 ? L : R;
      const q = this.hands.pos(g);
      const lift = this.hands.lift(g);
      t.x = a.a.x + (ax / len) * q - fx * lift * 0.05;
      t.z = a.a.z + (az / len) * q - fz * lift * 0.05;
      t.y = a.hangHeight + lift * 0.05;
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
    // inverted: knees over the pipe, shins hooked behind it (the side the back of the legs faces: the chest faces
    // across the pipe the hanging way, the feet tuck back the other way)
    const cx = a.a.x + tx * s;
    const cz = a.a.z + tz * s;
    const back = 0.16 * k;
    // the hanging facing (across the pipe) is the facing the body had by the hands
    const hy = Math.atan2(tz * face, -tx * face);
    const bx = -Math.sin(hy);
    const bz = -Math.cos(hy);
    FL.x = cx - tx * 0.12 + bx * back;
    FL.z = cz - tz * 0.12 + bz * back;
    FR.x = cx + tx * 0.12 + bx * back;
    FR.z = cz + tz * 0.12 + bz * back;
    FL.y = FR.y = y + 0.1;
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
    // the hands sit on the lip, a few cm in from the edge
    t.x = l.a.x + l.tx * q - l.nx * (0.04 - lift * 0.06);
    t.z = l.a.z + l.tz * q - l.nz * (0.04 - lift * 0.06);
    t.y = l.top + lift * 0.05;
  }
}
