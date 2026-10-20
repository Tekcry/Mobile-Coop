/**
 * (CT prototype G7, AUDIT-WALLS rows 5-8, 11, 19, 20, "Missing entirely": interrogate) Close quarters, pure and
 * Babylon-free: the grab's stages, the hold's idle sway and the guard's flail, the knockout from the hold, the
 * interrogation, the body lift / carry / drop timelines, the hero's bend for each, and the held guard's scripted
 * upper-body pose (`GuardCq`, the same code on the solo / host `Enemy` and a client's `EnemyPuppet`). The controllers
 * (`takedownController`, `stealthSystems`) read the numbers; the rigs take the poses. Every number is a starting value
 * read from the CT frames the audit cites (pc/ct-work/frames/walls).
 */
import { proportions } from '../player/proportions';

export const CQ = {
  /** (row 19) Holding a guard: the hero's spine forward (rad) over him, chest against his back. */
  holdBend: 0.08,
  /** (row 19) The pair's idle sway while still: Hz and the side-to-side amplitude (m). */
  swayHz: 0.5,
  swayAmp: 0.02,
  /** (row 19) The guard's struggle overlay: seconds a flail lasts, and the gap before the next (s, range). */
  flail: 0.4,
  flailGapMin: 2,
  flailGapMax: 4,
  /** (row 20, 110936 @ 37.0-38.2) Knockout from the hold: the whole move (s); the guard goes limp over this share
   *  (from, to) and is lowered in front over this share; the hero bends over him (rad) with the pelvis down (m). */
  koTime: 0.85,
  koLimp: [0.15, 0.5] as const,
  koLower: [0.4, 1] as const,
  koBend: 0.5,
  koDrop: 0.1,
  /** ("Missing entirely", 052607 @ 7-8) Interrogate: the hero's free hand at the guard's jaw this long (s); the
   *  guard's head turned (rad, ~20 deg). */
  interrogate: 1.5,
  interrogateYaw: 0.35,
  /** (row 6, 110936 @ 39.5-42.6) Body pick-up (s): crouched at the body until `liftReach`, the hoist to the shoulder
   *  until `liftRise`, settled at `lift`. The bend over the body (rad). */
  lift: 2.0,
  liftReach: 0.8,
  liftRise: 1.6,
  liftBend: 0.55,
  /** The crouch is held this long into the lift (s; the stand up then takes the controller's standTime). */
  liftCrouch: 0.9,
  /** The hero steps in to kneel this far from the body's chest (m), at most this far from where he stood (m). */
  liftSide: 0.5,
  liftStepMax: 1.0,
  /** (row 7, 110936 @ 42.6-45.6, 052704 @ 2-24) Carrying: the forward bend under the weight (rad), pelvis down (m). */
  carryBend: 0.38,
  carryDrop: 0.04,
  /** (row 8, 110936 @ 45.8-46.6) Put down (s): the ragdoll takes the body at `dropHand`; the shoulder dip (m) and
   *  the bend (rad) at its deepest. (Render check: the hand-over at 0.4 s, the fall from the shoulder takes the rest.) */
  drop: 0.8,
  dropHand: 0.4,
  dropDip: 0.2,
  dropBend: 0.35,
  /** The hand-over ragdoll's impulse (per unit: sideways, down, forward), against the old (25, -8, 25) throw. */
  dropImpulse: 3,
  dropImpulseDown: -2,
} as const;

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Smoothstep of x clamped to 0..1. */
export function ease(x: number): number {
  const e = clamp01(x);
  return e * e * (3 - 2 * e);
}

/** The grab's stage at `t` s after the press: 0 stepping in (`approach` s), 1 the pull-in (`pull` s), 2 holding. */
export function grabStage(t: number, approach: number, pull: number): 0 | 1 | 2 {
  return t < approach ? 0 : t < approach + pull ? 1 : 2;
}

/** (row 19) The hold's side-to-side sway (m) at `t` s held, faded in over the first second (none while walking: `still`
 *  0..1). */
export function holdSway(t: number, still: number): number {
  return Math.sin(2 * Math.PI * CQ.swayHz * t) * CQ.swayAmp * clamp01(t) * clamp01(still);
}

/** (row 20) The knockout from the hold at `k` = t / koTime (0..1). */
export interface KoState {
  /** The guard limp 0..1 (arms drop, head falls forward). */
  limp: number;
  /** The guard lowered 0..1 (his crouch). */
  lower: number;
  /** The hero's bend 0..1 (of `CQ.koBend` / `CQ.koDrop`). */
  bend: number;
}

export function koCurve(k: number, out: KoState): KoState {
  out.limp = ease((k - CQ.koLimp[0]) / (CQ.koLimp[1] - CQ.koLimp[0]));
  out.lower = ease((k - CQ.koLower[0]) / (CQ.koLower[1] - CQ.koLower[0]));
  // he bends as he lowers the guard (and straightens after the hold ends: the anim graph eases the bend back)
  out.bend = ease((k - 0.3) / 0.5);
  return out;
}

/** (row 6) The body lift at `t` s. */
export interface LiftState {
  /** Still at the body on the floor (before the hoist): the hands go to its shoulders. */
  atBody: boolean;
  /** The hoist 0 (lying on the floor) .. 1 (on the shoulder), eased. */
  hoist: number;
  /** Hero spine bend (rad) and pelvis drop (m). */
  bend: number;
  drop: number;
  /** Crouched (the override's crouch). */
  crouch: boolean;
  /** The hands' weight on the body (0..1). */
  hands: number;
  /** The step-in to the body 0..1 (eased, over the crouch). */
  step: number;
}

export function liftCurve(t: number, out: LiftState): LiftState {
  out.atBody = t < CQ.liftReach;
  out.hoist = ease((t - CQ.liftReach) / (CQ.liftRise - CQ.liftReach));
  out.step = ease(t / (CQ.liftReach * 0.7));
  const down = ease(t / 0.45);
  // bent over the body, then the carry's bend as he rises under it
  // (he straightens over the first third of the hoist, before the body comes in over the shoulder: a bent trunk met
  // the rising body half way)
  const up = ease(out.hoist / 0.35);
  out.bend = CQ.liftBend * down * (1 - up) + CQ.carryBend * up;
  out.drop = CQ.carryDrop * out.hoist;
  out.crouch = t < CQ.liftCrouch;
  out.hands = ease(t / 0.5);
  return out;
}

/** (row 8) The put down at `t` s. */
export interface DropState {
  /** The body sliding off the shoulder 0..1 (to the hand-over). */
  slide: number;
  /** Hero spine bend (rad) and the shoulder dip (pelvis drop, m). */
  bend: number;
  drop: number;
  /** The hands' weight on the body. */
  hands: number;
}

export function dropCurve(t: number, out: DropState): DropState {
  const k = clamp01(t / CQ.drop);
  out.slide = ease(t / CQ.dropHand);
  const dip = Math.sin(Math.PI * k);
  out.bend = CQ.carryBend * (1 - ease(t / CQ.drop)) + CQ.dropBend * dip * 0.6;
  out.drop = CQ.dropDip * dip;
  out.hands = 1 - ease((t - CQ.dropHand) / (CQ.drop - CQ.dropHand));
  return out;
}

/** (row 19) The struggle envelope 0..1 at `t` s held (a 0.4 s flail every 2-4 s; `seed` spreads the guards). The gaps
 *  come from a hash of the flail count, the same on every machine. */
export function flailAt(t: number, seed: number): number {
  let at = 0.6 + frac(seed * 0.618) * 0.6;
  for (let n = 0; n < 64; n++) {
    if (t < at) return 0;
    if (t < at + CQ.flail) return Math.sin((Math.PI * (t - at)) / CQ.flail);
    at += CQ.flail + CQ.flailGapMin + (CQ.flailGapMax - CQ.flailGapMin) * frac(Math.sin((n + 1) * 12.9898 + seed * 78.233) * 43758.5453);
  }
  return 0;
}

function frac(x: number): number {
  return x - Math.floor(x);
}

/** A string id to a seed 0..1 (the flail timing per guard). */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10007) / 10007;
}

type E3 = [number, number, number];

/** The held guard's scripted upper-body joints (Euler x, y, z; the rig's FkPose shape): always the same keys, so a
 *  change of mode never drops a joint back to the procedural pose in one frame. The legs stay the rig's own (he walks
 *  with the hero; the knockout lowers him through his crouch, never a pelvis offset that sinks the feet). */
export interface GuardUpperFk {
  neck: E3;
  chest: E3;
  shoulderL: E3;
  shoulderR: E3;
  elbowL: E3;
  elbowR: E3;
}

function newUpper(): GuardUpperFk {
  return { neck: [0, 0, 0], chest: [0, 0, 0], shoulderL: [0, 0, 0], shoulderR: [0, 0, 0], elbowL: [0, 0, 0], elbowR: [0, 0, 0] };
}

const KEYS = ['neck', 'chest', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'] as const;

export type GuardCqMode = 'seized' | 'seizedLethal' | 'hostage' | 'ko' | 'interrogate';

/** Mode change blend (s). */
const MODE_BLEND = 0.25;

/**
 * The held guard's pose, by mode (`set`), timed by the rig's emote clock: seized (the struggle once the attacker
 * reaches him, `delay` s after the press), the hostage hold with its flails, the knockout's limp (`k` the share), the
 * interrogation (`k` its progress). No allocation per frame: `pose` writes `out`.
 */
export class GuardCq {
  mode: GuardCqMode = 'seized';
  private prev: GuardCqMode = 'seized';
  private start = 0;
  private now = 0;
  /** The struggle starts this long after the seize (the attacker's approach). */
  delay = 0;
  /** The knockout's limp / the interrogation's progress (0..1). */
  k = 0;
  seed = 0;
  readonly out = newUpper();
  private a = newUpper();
  private b = newUpper();

  /** Seized (`delay` s before contact). */
  seize(lethal: boolean, delay: number): void {
    this.mode = this.prev = lethal ? 'seizedLethal' : 'seized';
    this.start = this.now = 0;
    this.delay = delay;
    this.k = 0;
  }

  set(mode: GuardCqMode): void {
    if (mode === this.mode) return;
    this.prev = this.mode;
    this.mode = mode;
    this.start = this.now;
  }

  /** The pose at emote time `t` (s since the seize), or null before contact. */
  pose(t: number): GuardUpperFk | null {
    this.now = t;
    if (t < this.delay && (this.mode === 'seized' || this.mode === 'seizedLethal')) return null;
    const mt = t - this.start;
    this.write(this.mode, t, this.a);
    const w = ease(mt / MODE_BLEND);
    if (w >= 1 || this.prev === this.mode) {
      copy(this.a, this.out);
      return this.out;
    }
    this.write(this.prev, t, this.b);
    for (let i = 0; i < KEYS.length; i++) {
      const key = KEYS[i]!;
      const o = this.out[key];
      const x = this.a[key];
      const y = this.b[key];
      o[0] = y[0] + (x[0] - y[0]) * w;
      o[1] = y[1] + (x[1] - y[1]) * w;
      o[2] = y[2] + (x[2] - y[2]) * w;
    }
    return this.out;
  }

  private write(mode: GuardCqMode, t: number, o: GuardUpperFk): void {
    const st = t - this.delay;
    const k = clamp01(st * 5);
    switch (mode) {
      case 'seized': {
        // (row 5, 110936 @ 6.4-7.0) pulled back against the chest: head back, arms up flailing at the arm
        const w = Math.sin(st * 17) * 0.12 * k;
        set3(o.neck, -0.5 * k, 0, 0);
        set3(o.chest, -0.15 * k, 0, 0);
        // (FK on this rig, NullEngine probe: shoulder x < 0 flexes forward, z out for L < 0 / R > 0, y twists; the elbow
        // flexes on x < 0. The 3.2.0 poses bent the elbows on z, which swung the forearms out sideways)
        set3(o.shoulderL, -1.0 * k + w, 0.4 * k, -0.25 * k);
        set3(o.shoulderR, -1.0 * k - w, -0.4 * k, 0.25 * k);
        set3(o.elbowL, -1.9 * k, 0, 0);
        set3(o.elbowR, -1.9 * k, 0, 0);
        return;
      }
      case 'seizedLethal': {
        const w = Math.sin(st * 17) * 0.12 * k;
        set3(o.neck, 0.35 * k, 0, 0);
        set3(o.chest, 0.25 * k, 0, 0);
        set3(o.shoulderL, -0.6 * k + w, 0, -0.45 * k);
        set3(o.shoulderR, -0.6 * k - w, 0, 0.45 * k);
        set3(o.elbowL, -0.7 * k, 0, 0);
        set3(o.elbowR, -0.7 * k, 0, 0);
        return;
      }
      default:
        this.hostage(t, o);
        if (mode === 'ko') {
          // (row 20) limp: the arms drop to hang, the head falls forward, the chest slumps over the lowered hips
          const L = this.k;
          const M = 1 - L;
          o.neck[0] = o.neck[0] * M + 0.55 * L;
          o.neck[1] = o.neck[1] * M + 0.25 * L;
          o.chest[0] = o.chest[0] * M + 0.4 * L;
          set3(o.shoulderL, o.shoulderL[0] * M - 0.12 * L, o.shoulderL[1] * M, o.shoulderL[2] * M - 0.08 * L);
          set3(o.shoulderR, o.shoulderR[0] * M - 0.12 * L, o.shoulderR[1] * M, o.shoulderR[2] * M + 0.08 * L);
          o.elbowL[0] = o.elbowL[0] * M - 0.25 * L;
          o.elbowR[0] = o.elbowR[0] * M - 0.25 * L;
        } else if (mode === 'interrogate') {
          // the hero's hand at the jaw: chin pushed up, head turned toward the hero's mouth (~20 deg)
          const e = ease(this.k / 0.12) * (1 - ease((this.k - 0.85) / 0.15));
          o.neck[0] -= 0.15 * e;
          o.neck[1] = o.neck[1] * (1 - e) + CQ.interrogateYaw * e;
        }
    }
  }

  /** (row 19) Held as a hostage: upright against the chest, head back, both hands up at the forearm across his throat;
   *  a flail now and then. */
  private hostage(t: number, o: GuardUpperFk): void {
    const f = flailAt(t, this.seed);
    const w = Math.sin(t * 11) * 0.05;
    const s = Math.sin(t * 14) * 0.45 * f;
    set3(o.neck, -0.3, w * 0.5 + Math.sin(t * 9) * 0.25 * f, 0);
    set3(o.chest, -0.12, 0, 0);
    // both hands up at the forearm across his throat (wrists ~0.2 m in front of the neck, chin height)
    set3(o.shoulderL, -0.6 + s, 0.5, -0.2 + w);
    set3(o.shoulderR, -0.6 - s, -0.5, 0.2 - w);
    set3(o.elbowL, -2.2 + 0.5 * f, 0, 0);
    set3(o.elbowR, -2.2 + 0.5 * f, 0, 0);
  }
}

function set3(o: E3, x: number, y: number, z: number): void {
  o[0] = x;
  o[1] = y;
  o[2] = z;
}

function copy(a: GuardUpperFk, o: GuardUpperFk): void {
  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[i]!;
    const x = a[key];
    const y = o[key];
    y[0] = x[0];
    y[1] = x[1];
    y[2] = x[2];
  }
}

/** World point (x, y, z) in a body frame: right `rx`, up `y`, forward `fz` from feet (`px`, `pz`) at `yaw`. */
export function bodyPoint(px: number, py: number, pz: number, yaw: number, rx: number, y: number, fz: number, out: { x: number; y: number; z: number }): void {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  out.x = px + c * rx + s * fz;
  out.y = py + y;
  out.z = pz - s * rx + c * fz;
}

/** (rows 5, 19) Where the hold forearm sits ahead of / beside the guard's neck joint, and how far below it (m). */
export const HOLD_HAND = { fwd: 0.08, right: 0.08, down: 0.06, shoulderUp: 0.04, shoulderBack: 0.02 } as const;

/**
 * (rows 5, 19) The owner's hold hands from the held guard's own joints (world): the left hand at his right collarbone in
 * front of the neck (the forearm across the throat), the right hand on top of his right shoulder. `yaw` is his facing.
 */
export function holdHandTargets(
  nx: number,
  ny: number,
  nz: number,
  sx: number,
  sy: number,
  sz: number,
  yaw: number,
  outL: { x: number; y: number; z: number },
  outR: { x: number; y: number; z: number },
): void {
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  const H = HOLD_HAND;
  // his right (c, -s), his forward (s, c)
  outL.x = nx + c * H.right + s * H.fwd;
  outL.y = ny - H.down;
  outL.z = nz - s * H.right + c * H.fwd;
  outR.x = sx - s * H.shoulderBack;
  outR.y = sy + H.shoulderUp;
  outR.z = sz - c * H.shoulderBack;
}

/** A nominal guard (1.78 m, the roster's middle) for a remote's hold hands, which has no guard rig to read. */
const NOMINAL = proportions('average', 1.78);

/**
 * (row 5 / 19) The hero's hands on a held guard in the hero's body frame (x right, y up from the feet, z forward), for a
 * remote copy that poses from MoveState alone: the left forearm across the throat (the hand at his right collarbone),
 * the right hand on his right shoulder. The owner reads the guard's own neck and shoulder (`TakedownController`); the
 * guard stands `hold` m in front, leaning back, so these sit within a few cm of the owner's.
 */
export function holdHandsLocal(hold: number, side: number, outL: { x: number; y: number; z: number }, outR: { x: number; y: number; z: number }): void {
  const p = NOMINAL;
  // his neck leans back ~0.04 m with the hostage chest pose
  outL.x = side + 0.08;
  outL.y = p.y.neck - 0.06;
  outL.z = hold - 0.04 + 0.08;
  outR.x = side + p.shoulderHalf;
  outR.y = p.y.shoulder + 0.03;
  outR.z = hold - 0.06;
}
