/**
 * (mixamo-chars, N53: "replace the animation system", characters play Mixamo moves directly) The locomotion blend: which
 * Mixamo moves play and how strongly, from the body's speed, its travel direction (body space), the crouch and the aim.
 * Pure: no Babylon, no allocation (the caller owns the output arrays and reads them every frame).
 *
 * The blend fills fixed SLOTS (idle, walk, run, ...); a move SET (unarmed, rifle, pistol) names the clip that plays each
 * slot, and a set without a clip for a slot borrows the unarmed one. Every clip is "In Place" (the packer strips any
 * ground travel): the controller moves the body, the clip only animates it. The clips' ground speeds below are
 * provisional (RULES 5): read off the Mixamo previews, tuned when Michael plays it.
 */
import { MOVEMENT } from '../config/movement';

/** The blend's slots, in output order. */
export const LOCO_SLOTS = ['idle', 'aim_idle', 'walk', 'run', 'sprint', 'back', 'left', 'right', 'c_idle', 'c_aim_idle', 'c_walk', 'c_back', 'c_left', 'c_right'] as const;
export type LocoSlot = (typeof LOCO_SLOTS)[number];
export const LOCO_N = LOCO_SLOTS.length;

const IDLE = 0, AIM_IDLE = 1, WALK = 2, RUN = 3, SPRINT = 4, BACK = 5, LEFT = 6, RIGHT = 7;
const C_IDLE = 8, C_AIM_IDLE = 9, C_WALK = 10, C_BACK = 11, C_LEFT = 12, C_RIGHT = 13;

/** Each slot's ground speed at speed ratio 1 (m/s, provisional); idles 0. */
export const LOCO_SLOT_SPEED: Readonly<Record<LocoSlot, number>> = {
  idle: 0, aim_idle: 0, walk: 1.4, run: 3.4, sprint: 5.6, back: 1.2, left: 1.3, right: 1.3,
  c_idle: 0, c_aim_idle: 0, c_walk: 1.1, c_back: 1.0, c_left: 1.0, c_right: 1.0,
};
const SLOT_SPEED = Float64Array.from(LOCO_SLOTS, (c) => LOCO_SLOT_SPEED[c]);

/** Whether a slot is a moving one (its clips share the gait's cycle clock). */
export function slotMoves(k: number): boolean {
  return (SLOT_SPEED[k] as number) > 0;
}

/** The move sets: the packed animation (glTF name) for each slot, or null to borrow the unarmed set's. */
export type LocoSet = 'unarmed' | 'rifle' | 'pistol';
export const LOCO_SETS: readonly LocoSet[] = ['unarmed', 'rifle', 'pistol'];
export const LOCO_SET_CLIPS: Readonly<Record<LocoSet, Readonly<Record<LocoSlot, string | null>>>> = {
  unarmed: {
    idle: 'idle', aim_idle: null, walk: 'walk', run: 'run', sprint: 'sprint', back: 'walk_back', left: 'strafe_walk_l', right: 'strafe_walk_r',
    c_idle: 'crouch_idle', c_aim_idle: null, c_walk: 'crouch_walk', c_back: null, c_left: 'crouch_strafe_l', c_right: 'crouch_strafe_r',
  },
  rifle: {
    idle: 'rifle_idle', aim_idle: 'rifle_aim_idle', walk: 'rifle_walk', run: 'rifle_run', sprint: 'rifle_sprint', back: 'rifle_walk_back',
    left: 'rifle_strafe_walk_l', right: 'rifle_strafe_walk_r', c_idle: 'rifle_crouch_idle', c_aim_idle: 'rifle_crouch_aim_idle',
    c_walk: 'rifle_crouch_walk', c_back: 'rifle_crouch_walk_back', c_left: 'rifle_crouch_strafe_l', c_right: 'rifle_crouch_strafe_r',
  },
  pistol: {
    idle: 'pistol_idle', aim_idle: null, walk: 'pistol_walk', run: 'pistol_run', sprint: 'pistol_run', back: 'pistol_walk_back',
    left: 'pistol_strafe_l', right: 'pistol_strafe_r', c_idle: 'pistol_crouch_idle', c_aim_idle: null, c_walk: null, c_back: null,
    c_left: null, c_right: null,
  },
};

/** The clip a set plays in slot `k` (its own, else the unarmed set's; null: none, the slot's weight is dropped). */
export function setClip(set: LocoSet, k: number): string | null {
  const slot = LOCO_SLOTS[k] as LocoSlot;
  const own = LOCO_SET_CLIPS[set][slot];
  if (own) return own;
  // an aim idle with no clip falls back to the set's plain idle, then the unarmed set's slot
  if (slot === 'aim_idle') return LOCO_SET_CLIPS[set].idle ?? LOCO_SET_CLIPS.unarmed.idle;
  if (slot === 'c_aim_idle') return LOCO_SET_CLIPS[set].c_idle ?? LOCO_SET_CLIPS.unarmed.c_idle;
  if (slot === 'c_back') return LOCO_SET_CLIPS[set].c_walk ?? LOCO_SET_CLIPS.unarmed.c_walk;
  return LOCO_SET_CLIPS.unarmed[slot];
}

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
  /** 0 .. 1 weapon raised on the aim line (the idles turn into the aimed idles). */
  aim?: number;
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
 * Writes each slot's weight (`w`, sum 1) and speed ratio (`ratio`, 1 for a slot at weight 0) for one frame. Both arrays
 * are `LOCO_N` long, indexed as `LOCO_SLOTS`.
 */
export function locoBlend(i: LocoIn, w: Float64Array, ratio: Float64Array): void {
  w.fill(0);
  ratio.fill(1);
  const s = i.speed > 0 ? i.speed : 0;
  const c = clamp01(i.crouch);
  const a = clamp01(i.aim ?? 0);
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
  const still = 1 - move;
  // standing
  add(w, IDLE, up * still * (1 - a));
  add(w, AIM_IDLE, up * still * a);
  forwardGait(s, up * move * fw, w);
  add(w, BACK, up * move * bk);
  add(w, LEFT, up * move * lf);
  add(w, RIGHT, up * move * rt);
  // crouched
  add(w, C_IDLE, c * still * (1 - a));
  add(w, C_AIM_IDLE, c * still * a);
  add(w, C_WALK, c * move * fw);
  add(w, C_BACK, c * move * bk);
  add(w, C_LEFT, c * move * lf);
  add(w, C_RIGHT, c * move * rt);
  // speed ratios: each moving slot matches the body's speed, within its limits
  for (let k = 0; k < LOCO_N; k++) {
    const cs = SLOT_SPEED[k] as number;
    if (cs <= 0 || (w[k] as number) <= 0) continue;
    const r = s / cs;
    ratio[k] = r < RATIO_MIN ? RATIO_MIN : r > RATIO_MAX ? RATIO_MAX : r;
  }
}
