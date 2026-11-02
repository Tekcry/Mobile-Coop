/**
 * (mixamo-chars, N53: "replace the animation system", characters play Mixamo moves directly) The locomotion blend: which
 * Mixamo moves play and how strongly, from the body's speed, its travel direction (body space) and the crouch. Pure: no
 * Babylon, no allocation (the caller owns the output arrays and reads them every frame).
 *
 * Slice (a) set: standing idle / walk / run / sprint forward, walk backwards, walk strafes; crouch idle and crouch walk
 * (every crouched direction plays the forward crouch walk until crouched strafes are downloaded). Every clip is "In
 * Place": the controller moves the body, the clip only animates it. The clips' own ground speeds below are provisional
 * (RULES 5): read off the Mixamo previews, tuned when Michael plays it.
 */
import { MOVEMENT } from '../config/movement';

/** The moves this blend drives, in output order (each is a glTF animation of the same name in every packed model). */
export const LOCO_CLIPS = ['idle', 'walk', 'run', 'sprint', 'walk_back', 'strafe_walk_l', 'strafe_walk_r', 'crouch_idle', 'crouch_walk'] as const;
export type LocoClip = (typeof LOCO_CLIPS)[number];
export const LOCO_N = LOCO_CLIPS.length;

const IDLE = 0, WALK = 1, RUN = 2, SPRINT = 3, BACK = 4, LEFT = 5, RIGHT = 6, C_IDLE = 7, C_WALK = 8;

/** Each clip's ground speed at speed ratio 1 (m/s, provisional); idles 0. */
export const LOCO_CLIP_SPEED: Readonly<Record<LocoClip, number>> = {
  idle: 0, walk: 1.4, run: 3.4, sprint: 5.6, walk_back: 1.2, strafe_walk_l: 1.3, strafe_walk_r: 1.3, crouch_idle: 0, crouch_walk: 1.1,
};
const CLIP_SPEED = Float64Array.from(LOCO_CLIPS, (c) => LOCO_CLIP_SPEED[c]);

/** Below this speed (m/s) the body stands (all idle); the move fades in over the next `MOVE_FADE`. */
const STAND = 0.05;
const MOVE_FADE = 0.35;
/** Speed ratio limits: past them a clip looks wrong (feet skate or flail), so the blend moves on instead. */
const RATIO_MIN = 0.6;
const RATIO_MAX = 1.5;

export interface LocoIn {
  /** Ground speed (m/s). */
  speed: number;
  /** Travel direction in body space (x right, z forward); any length, zero when standing. */
  localX: number;
  localZ: number;
  /** 0 standing .. 1 fully crouched. */
  crouch: number;
}

/** `w[k] += v` (strict index access). */
function add(w: Float64Array, k: number, v: number): void {
  w[k] = (w[k] as number) + v;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** The forward gait at speed `s`: walk -> run -> sprint shares written into `w` (scaled by `k`). */
function forwardGait(s: number, k: number, w: Float64Array): void {
  const M = MOVEMENT;
  if (s <= M.walkSpeed) {
    add(w, WALK, k);
  } else if (s <= M.jogSpeed) {
    const t = (s - M.walkSpeed) / (M.jogSpeed - M.walkSpeed);
    add(w, WALK, k * (1 - t));
    add(w, RUN, k * t);
  } else {
    const t = clamp01((s - M.jogSpeed) / (M.sprintSpeed - M.jogSpeed));
    add(w, RUN, k * (1 - t));
    add(w, SPRINT, k * t);
  }
}

/**
 * Writes each clip's weight (`w`, sum 1) and speed ratio (`ratio`, 1 for a clip at weight 0) for one frame. Both arrays
 * are `LOCO_N` long, indexed as `LOCO_CLIPS`.
 */
export function locoBlend(i: LocoIn, w: Float64Array, ratio: Float64Array): void {
  w.fill(0);
  ratio.fill(1);
  const s = i.speed > 0 ? i.speed : 0;
  const c = clamp01(i.crouch);
  const move = s <= STAND ? 0 : clamp01((s - STAND) / MOVE_FADE);
  const len = Math.abs(i.localX) + Math.abs(i.localZ);
  // direction shares (sum 1): forward, back, left, right; standing still counts as forward
  let fw = 1, bk = 0, lf = 0, rt = 0;
  if (len > 1e-6) {
    fw = (i.localZ > 0 ? i.localZ : 0) / len;
    bk = (i.localZ < 0 ? -i.localZ : 0) / len;
    lf = (i.localX < 0 ? -i.localX : 0) / len;
    rt = (i.localX > 0 ? i.localX : 0) / len;
  }
  const up = 1 - c;
  // standing
  add(w, IDLE, up * (1 - move));
  forwardGait(s, up * move * fw, w);
  add(w, BACK, up * move * bk);
  add(w, LEFT, up * move * lf);
  add(w, RIGHT, up * move * rt);
  // crouched
  add(w, C_IDLE, c * (1 - move));
  add(w, C_WALK, c * move);
  // speed ratios: each moving clip matches the body's speed, within its limits
  for (let k = 0; k < LOCO_N; k++) {
    const cs = CLIP_SPEED[k] as number;
    if (cs <= 0 || (w[k] as number) <= 0) continue;
    const r = s / cs;
    ratio[k] = r < RATIO_MIN ? RATIO_MIN : r > RATIO_MAX ? RATIO_MAX : r;
  }
}
