import { hyp2, hyp3 } from '../core/mathx';

/**
 * (piano-escape S2) The piano escape's intro as data and pure maths: the shot list (PLAN section 2), the diagonal camera
 * path in the start bay, the fade, the skip, the EMP prompt and its beat, the four intro actors closing in at 0.3x, their
 * shots (tracers and impacts), and the two framed reveals in play. No Babylon, no allocation per call: every function
 * writes into an object the caller keeps. The view (`pianoIntroView.ts`) draws it; the scene (`pianoScene.ts`) runs the
 * EMP beat on the sim side.
 *
 * Coordinates are the PLAN's (x east, z north, y up, origin the hall's south-west corner), also on the S1 stub map,
 * which has no geometry yet. The intro never writes `loop.timeScale`: slow motion is the actors' and tracers' own rate.
 */

/** Shot boundaries on the intro clock (s; the intro clock is the track time until the EMP). */
export const SHOT_T = { black: 3, fadeIn: 9, hold: 16, pullBack: 30, reveal: 38 } as const;
/** The EMP prompt from here; the shot holds and the actors idle until it is pressed (no timer). */
export const PROMPT_AT = SHOT_T.reveal;
/** Hold Back / Esc this long (s) to skip to the prompt. */
export const SKIP_HOLD_S = 1;
/** Press + this (s): every lamp is out (the mains cut's ripple, `mainsOff(.., 0.8)`). */
export const EMP_OUT_S = 0.8;
/** Press + this (s): the cut to play (input on, the radio line, the objective). */
export const EMP_CUT_S = 2.5;
/** The music's place at a skip and at the press (S3's `seek`; at the press the loop and the lightning start together). */
export const SKIP_SEEK = 38;
export const EMP_SEEK = 41;
/** The intro holds at 0 s until the music begins, at most this long (no audio: it runs on). */
export const MUSIC_WAIT_S = 4;
/** The intro actors' and tracers' playback rate (slow motion). */
export const ACTOR_RATE = 0.3;
/** The prompt's label (interact: pad A / keyboard E). */
export const EMP_LABEL = 'Set off the EMP';
/** The radio line at the cut (G82: voiceable). */
export const RADIO_LINE = "Lights are dead. They'll come with torches.";
/** The objective line at the cut (G343). */
export const OBJECTIVE_LINE = 'Take down every guard. The hoist door, top floor, west end.';
/** About 14 s: one dry trigger click (no ammo). */
export const DRY_CLICK_AT = 14;

/** The start bay (x, z box) and the roof ridge (m): the intro camera stays inside. */
export const START_BAY = { x0: 0, x1: 9.4, z0: 0, z1: 10.4, ridge: 12 } as const;
/** The operators' spots behind W1, backs to the bins, facing west (slot 0, slot 1). */
export const OPERATOR_SPOTS: readonly (readonly [number, number])[] = [
  [4.0, 4.6],
  [4.0, 6.0],
];
/** The close-up: this far west of the chest (m), at this height, about 22 deg vertical field. */
const CLOSE_OFF = 0.6;
const CLOSE_Y = 1.4;
const CHEST_Y = 1.35;
const CLOSE_FOV = 22;
/** The pull-back ends here (x, z) about 5 m up at 30 s; the reveal keeps rising to 7.5 m by 38 s. */
const PULL_X = 0.8;
const PULL_Z = 1.2;
const PULL_Y = 5;
const REVEAL_Y = 7.5;
const PULL_FOV = 50;
const REVEAL_FOV = 55;
/** The wide reveal looks north-east over the 2.8 m bins at the four closing in. */
const REVEAL_LOOK_X = 8.0;
const REVEAL_LOOK_Y = 1.0;
const REVEAL_LOOK_Z = 5.6;
/** The height's speed through 30 s (m/s): the rise never stops between the pull-back and the reveal. */
const RISE_V = (REVEAL_Y - CLOSE_Y) / (SHOT_T.reveal - SHOT_T.hold);
const DEG = Math.PI / 180;

export type IntroShot = 'black' | 'fadeIn' | 'hold' | 'pullBack' | 'reveal' | 'prompt' | 'emp' | 'blackout' | 'play';

/** A camera: where it is, what it looks at, the vertical field (rad). */
export interface IntroCam {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
}

export function introCam(): IntroCam {
  return { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 1, fov: 1 };
}

const clamp01 = (u: number): number => (u < 0 ? 0 : u > 1 ? 1 : u);
const smooth = (u: number): number => {
  const k = clamp01(u);
  return k * k * (3 - 2 * k);
};
const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

/** Cubic Hermite from (p0, v0) to (p1, v1) over `d` s, `u` 0..1 through it. */
function hermite(p0: number, v0: number, p1: number, v1: number, d: number, u: number): number {
  const k = clamp01(u);
  const k2 = k * k;
  const k3 = k2 * k;
  return (2 * k3 - 3 * k2 + 1) * p0 + (k3 - 2 * k2 + k) * v0 * d + (-2 * k3 + 3 * k2) * p1 + (k3 - k2) * v1 * d;
}

/**
 * The intro camera at intro time `t` framing operator `slot` (each page frames its own; the partner is revealed by the
 * pull-back). 0-16 s: the close-up on the chest; 16-30 s: the diagonal pull-back to the south-west and up; 30-38 s: the
 * wide reveal rising to 7.5 m; then it holds. Continuous in position, target and field. No allocation.
 */
export function introCamera(t: number, slot: number, out: IntroCam): IntroCam {
  const op = OPERATOR_SPOTS[slot] ?? OPERATOR_SPOTS[0]!;
  const ax = op[0];
  const az = op[1];
  const x0 = ax - CLOSE_OFF;
  if (t <= SHOT_T.hold) {
    out.x = x0;
    out.y = CLOSE_Y;
    out.z = az;
    out.tx = ax;
    out.ty = CHEST_Y;
    out.tz = az;
    out.fov = CLOSE_FOV * DEG;
    return out;
  }
  if (t <= SHOT_T.pullBack) {
    const d = SHOT_T.pullBack - SHOT_T.hold;
    const u = (t - SHOT_T.hold) / d;
    const s = smooth(u);
    out.x = lerp(x0, PULL_X, s);
    out.z = lerp(az, PULL_Z, s);
    out.y = hermite(CLOSE_Y, 0, PULL_Y, RISE_V, d, u);
    const l = smooth(u * 1.15);
    out.tx = lerp(ax, REVEAL_LOOK_X, l);
    out.ty = lerp(CHEST_Y, REVEAL_LOOK_Y, l);
    out.tz = lerp(az, REVEAL_LOOK_Z, l);
    out.fov = lerp(CLOSE_FOV, PULL_FOV, s) * DEG;
    return out;
  }
  const d = SHOT_T.reveal - SHOT_T.pullBack;
  const u = Math.min(1, (t - SHOT_T.pullBack) / d);
  out.x = PULL_X;
  out.z = PULL_Z;
  out.y = hermite(PULL_Y, RISE_V, REVEAL_Y, 0, d, u);
  out.tx = REVEAL_LOOK_X;
  out.ty = REVEAL_LOOK_Y;
  out.tz = REVEAL_LOOK_Z;
  out.fov = lerp(PULL_FOV, REVEAL_FOV, smooth(u)) * DEG;
  return out;
}

/** The black layer's alpha at intro time `t` (before the EMP): black to 3 s, the 6 s fade in, then clear. */
export function introFade(t: number): number {
  if (t < SHOT_T.black) return 1;
  if (t < SHOT_T.fadeIn) return 1 - (t - SHOT_T.black) / (SHOT_T.fadeIn - SHOT_T.black);
  return 0;
}

// ------------------------------------------------------------------ the clock

/**
 * The intro's clock and beat (one per scene, never made again on a restart). `step` runs on rendered frames (real
 * seconds; the view calls it), `press` on the sim side (the EMP item or the local button). Allocation-free.
 */
export class PianoIntro {
  /** The intro clock (s): the track time until the EMP, then it runs on. */
  t = 0;
  /** The intro clock at the EMP press (-1: not yet). */
  pressT = -1;
  /** The skip was used. */
  skipped = false;
  private musicIn = false;
  private waitT = 0;

  /** `slot`: the operator this page frames (0 the host / solo, 1 the partner). */
  constructor(readonly slot = 0) {}

  /** The music has begun: the clock leaves 0 s. */
  musicStarted(): void {
    this.musicIn = true;
  }

  /** Advance by `dt` real seconds (0 while paused). At 0 s it waits for the music, at most `MUSIC_WAIT_S`. */
  step(dt: number): void {
    if (!(dt > 0)) return;
    if (this.t === 0 && !this.musicIn && this.waitT < MUSIC_WAIT_S) {
      this.waitT += dt;
      return;
    }
    this.t += dt;
  }

  /** The prompt is up: 38 s reached and not pressed yet. */
  get promptOn(): boolean {
    return this.pressT < 0 && this.t >= PROMPT_AT;
  }

  /** Seconds since the press (-1: not pressed). */
  get sinceEmp(): number {
    return this.pressT < 0 ? -1 : this.t - this.pressT;
  }

  /** The cut to play has come (press + 2.5 s). */
  get done(): boolean {
    return this.pressT >= 0 && this.t - this.pressT >= EMP_CUT_S;
  }

  get shot(): IntroShot {
    const t = this.t;
    if (this.pressT >= 0) {
      const e = t - this.pressT;
      return e < EMP_OUT_S ? 'emp' : e < EMP_CUT_S ? 'blackout' : 'play';
    }
    if (t < SHOT_T.black) return 'black';
    if (t < SHOT_T.fadeIn) return 'fadeIn';
    if (t < SHOT_T.hold) return 'hold';
    if (t < SHOT_T.pullBack) return 'pullBack';
    if (t < SHOT_T.reveal) return 'reveal';
    return 'prompt';
  }

  /** The skip (hold Back / Esc 1 s): jump to the prompt. False once there (or pressed). The caller seeks the music to 38 s. */
  skip(): boolean {
    if (this.pressT >= 0 || this.t >= PROMPT_AT) return false;
    this.t = PROMPT_AT;
    this.musicIn = true;
    this.skipped = true;
    return true;
  }

  /** The EMP press: only while the prompt is up. True when it took. */
  press(): boolean {
    if (!this.promptOn) return false;
    this.pressT = this.t;
    return true;
  }

  /** The black layer's alpha now (the blackout beat is the lamps' own dark, not a black layer). */
  fade(): number {
    return this.pressT >= 0 ? 0 : introFade(this.t);
  }

  /** The intro camera now (holds at the reveal's end from 38 s on). */
  camera(out: IntroCam): IntroCam {
    return introCamera(this.pressT >= 0 ? Math.min(this.t, PROMPT_AT) : this.t, this.slot, out);
  }
}

// ------------------------------------------------------------------ the actors and their shots

/** A point on an actor's way in (x, y, z). */
type P3 = readonly [number, number, number];

/**
 * The four intro actors (the opening four: guard-list slots 0-3): two down the main stair from the north-east (G1, G2),
 * two along the south aisle from the east (G3, G4). Each walks at 0.3x and stops on his stop spot (the guard's start at
 * the EMP) by 37 s, 4-6 m from the players, and idles aimed until the press. Guard AI's GuardActor (#611) drives the
 * same paths (flat x, z: `actorPath`) at the same speed and rate.
 */
export const INTRO_ACTORS: readonly { readonly name: string; readonly pts: readonly P3[] }[] = [
  { name: 'G1', pts: [[8.6, 3.0, 13.8], [8.6, 0, 10.6], [8.6, 0, 9.6], [7.5, 0, 8.7]] },
  { name: 'G2', pts: [[9.0, 3.6, 14.6], [9.0, 0, 10.8], [9.0, 0, 9.4], [8.3, 0, 8.0]] },
  { name: 'G3', pts: [[17.0, 0, 2.0], [9.0, 0, 2.0]] },
  { name: 'G4', pts: [[18.0, 0, 3.4], [10.0, 0, 3.4]] },
];
/** Their walk (m/s, a grunt's `walkSpeed`, GuardActor's `speed`), played at 0.3x: `ACTOR_SPEED` on screen. */
export const ACTOR_WALK = 0.9;
export const ACTOR_SPEED = ACTOR_WALK * ACTOR_RATE;
/** Where they aim (`aimAt`): the operators behind W1, at the chest. */
export const AIM_X = 4.0;
export const AIM_Y = 1.3;
export const AIM_Z = 5.3;
/** They arrive this long (s) before the prompt (GuardActor eases into its stop), then idle aimed. */
const ARRIVE_EARLY = 1;

/** Each actor's path length over the ground (m; GuardActor's paths are flat x, z: the stair's height is the nav's). */
export const ACTOR_LEN: readonly number[] = INTRO_ACTORS.map((a) => {
  let s = 0;
  for (let i = 1; i < a.pts.length; i++) {
    const p = a.pts[i - 1]!;
    const q = a.pts[i]!;
    s += hyp2(q[0] - p[0], q[2] - p[2]);
  }
  return s;
});

/** Intro time (s) actor `i` starts walking (rate 0 until then, `ACTOR_RATE` after): on his spot 1 s before the prompt. */
export const ACTOR_START: readonly number[] = ACTOR_LEN.map((l) => PROMPT_AT - ARRIVE_EARLY - l / ACTOR_SPEED);

/** Actor `i`'s path as GuardActor takes it: flat [x0, z0, x1, z1, ...] (new array: build time only). */
export function actorPath(i: number): number[] {
  const out: number[] = [];
  for (const p of INTRO_ACTORS[i]!.pts) out.push(p[0], p[2]);
  return out;
}

export interface ActorPose {
  x: number;
  y: number;
  z: number;
  /** Facing (rad, Babylon yaw: 0 = +z): towards the operators. */
  yaw: number;
}

export function actorPose(): ActorPose {
  return { x: 0, y: 0, z: 0, yaw: 0 };
}

/** Actor `i` `s` m along his path (clamped; the stair's height interpolated), facing the operators. No allocation. */
export function actorAtDist(i: number, s: number, out: ActorPose): ActorPose {
  const pts = INTRO_ACTORS[i]!.pts;
  let d = s < 0 ? 0 : s;
  for (let k = 1; k < pts.length; k++) {
    const p = pts[k - 1]!;
    const q = pts[k]!;
    const seg = hyp2(q[0] - p[0], q[2] - p[2]);
    if (d <= seg || k === pts.length - 1) {
      const u = seg > 0 ? Math.min(1, d / seg) : 1;
      out.x = lerp(p[0], q[0], u);
      out.y = lerp(p[1], q[1], u);
      out.z = lerp(p[2], q[2], u);
      break;
    }
    d -= seg;
  }
  out.yaw = Math.atan2(AIM_X - out.x, AIM_Z - out.z);
  return out;
}

/** Actor `i` at intro time `t`: still until `ACTOR_START[i]`, then on his way at `ACTOR_SPEED`; on his spot by 37 s. */
export function actorAt(i: number, t: number, out: ActorPose): ActorPose {
  return actorAtDist(i, Math.max(0, t - ACTOR_START[i]!) * ACTOR_SPEED, out);
}

/** Shots: from 9 s (the hold) to the prompt, each actor every `SHOT_PERIOD[i]` s from `SHOT_OFFSET[i]`. */
export const SHOT_FROM = SHOT_T.fadeIn;
export const SHOT_PERIOD: readonly number[] = [1.7, 2.1, 1.9, 2.3];
export const SHOT_OFFSET: readonly number[] = [0, 0.6, 0.3, 1.1];
/** A tracer's flight in the intro (m/s): a 40 m/s streak played at 0.3x, so the rounds are seen crossing. */
export const TRACER_SPEED = 40 * ACTOR_RATE;
/** The muzzle flash's flicker (s). */
const FLASH_S = 0.08;
/** The muzzle: this high and this far ahead of the actor's feet. */
const MUZZLE_Y = 1.45;
const MUZZLE_FWD = 0.55;

export interface ShotLine {
  /** Muzzle and impact. */
  fx: number;
  fy: number;
  fz: number;
  tx: number;
  ty: number;
  tz: number;
  /** Seconds the round has flown (0..flight). */
  age: number;
  /** Its whole flight (s). */
  flight: number;
  /** Shot number (each shot's impact point and sparks follow from it). */
  n: number;
}

export function shotLine(): ShotLine {
  return { fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0, age: 0, flight: 0, n: -1 };
}

const scratchPose = actorPose();

/**
 * Actor `i`'s latest shot at intro time `t` (fired at or before `t`, none after the prompt). False when he has not
 * fired yet. The round hits the bins' face (W1, 2.8 m) by the operators: the east face from the aisle pair, the north
 * face from the stair pair. Deterministic, the same every run.
 */
export function shotAt(i: number, t: number, out: ShotLine): boolean {
  const period = SHOT_PERIOD[i]!;
  const first = SHOT_FROM + SHOT_OFFSET[i]!;
  const tt = Math.min(t, PROMPT_AT - 1e-6);
  if (tt < first) return false;
  const n = Math.floor((tt - first) / period);
  const at = first + n * period;
  const p = actorAt(i, at, scratchPose);
  out.fx = p.x + Math.sin(p.yaw) * MUZZLE_FWD;
  out.fy = p.y + MUZZLE_Y;
  out.fz = p.z + Math.cos(p.yaw) * MUZZLE_FWD;
  if (i < 2) {
    // the stair pair: W1's north face (z 7.5)
    out.tx = 4.7 + ((n * 1.3 + i * 0.9) % 1.7);
    out.tz = 7.5;
  } else {
    // the aisle pair: W1's east face (x 6.5)
    out.tx = 6.5;
    out.tz = 3.4 + ((n * 2.3 + i * 1.7) % 3.8);
  }
  out.ty = 0.7 + ((n * 0.7 + i * 0.5) % 1.9);
  const d = hyp3(out.tx - out.fx, out.ty - out.fy, out.tz - out.fz);
  out.flight = d / TRACER_SPEED;
  out.age = t - at;
  out.n = n;
  return true;
}

const scratchShot = shotLine();

/** The muzzle flashes' flicker 0..1 at intro time `t` (on the bins and the face, from two directions). */
export function muzzleFlicker(t: number): number {
  if (t >= PROMPT_AT) return 0;
  let f = 0;
  for (let i = 0; i < INTRO_ACTORS.length; i++) {
    if (!shotAt(i, t, scratchShot)) continue;
    const a = scratchShot.age;
    if (a >= 0 && a < FLASH_S) f = Math.max(f, 1 - a / FLASH_S);
  }
  return f;
}

// ------------------------------------------------------------------ the framed reveals in play

/** A framed reveal (render only, input held): 1.5 s, only where no guard is within 10 m. */
export const REVEAL_S = 1.5;
export const REVEAL_CLEAR_M = 10;

export interface RevealDef {
  readonly id: 'ladder' | 'hoist';
  /** The trigger spot (x, y, z) and its reach (m); the hoist reveal runs when the door unlocks. */
  readonly at: P3;
  readonly reach: number;
  readonly cam: P3;
  readonly look: P3;
  /** Vertical field (deg). */
  readonly fov: number;
}

/** The top of the ladder (the long gallery ahead) and the hoist door as it unlocks. */
export const REVEALS: readonly RevealDef[] = [
  { id: 'ladder', at: [31.2, 4.2, 15.6], reach: 1.2, cam: [31.4, 6.2, 17.2], look: [18.0, 4.9, 16.2], fov: 50 },
  { id: 'hoist', at: [0.6, 4.2, 16.6], reach: 0, cam: [5.0, 6.3, 15.4], look: [0.3, 5.3, 16.6], fov: 45 },
];
/** The reveal camera's slow push towards what it shows (m over the 1.5 s). */
const REVEAL_PUSH = 0.5;

/** Reveal `i`'s camera `u` (0..1) through it: a slow push in. */
export function revealCamera(i: number, u: number, out: IntroCam): IntroCam {
  const r = REVEALS[i]!;
  const [cx, cy, cz] = r.cam;
  const [lx, ly, lz] = r.look;
  const dx = lx - cx;
  const dy = ly - cy;
  const dz = lz - cz;
  const d = hyp3(dx, dy, dz) || 1;
  const k = (smooth(u) * REVEAL_PUSH) / d;
  out.x = cx + dx * k;
  out.y = cy + dy * k;
  out.z = cz + dz * k;
  out.tx = lx;
  out.ty = ly;
  out.tz = lz;
  out.fov = r.fov * DEG;
  return out;
}
