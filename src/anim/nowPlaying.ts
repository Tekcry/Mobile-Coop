/**
 * (tuner-clarity S1, BRIEF A3) What the local player's body is playing now, read live from the animation graph: the
 * motion-capture, hand-keyed and graph-code shares of the body, the move the capture plays and the Anim Studio's clip.
 * The graph writes its own `AnimGraph.playing` at the end of each `update`; `tuneEnd` (the local player's tuning window)
 * copies it into `NOW_PLAYING`, which the tuner panel and the Anim Studio read (display only: nothing in the game reads
 * it back). The plain words live here (A2's one table, with `src/ui/tunerReach.ts`'s): "motion capture", "hand-made".
 * Pure and Babylon-free; the per-frame parts (`copyPlaying`, `nowPlayingKey`) allocate nothing.
 */
import type { KeyedClip } from './keyed';
import type { BodyGroup } from './tune';

/** The move ids `GraphPlaying.move` holds (small ints): the speed set's clips, the one-shot slots, the crouched sneak
 *  capture, the aimed strafe capture and the studio's clip. */
export const MOVE_IDS = {
  walk: 0,
  jog: 1,
  run: 2,
  sprint: 3,
  start: 4,
  stop: 5,
  turnSpot: 6,
  turnMove: 7,
  sneak: 8,
  strafe: 9,
  clip: 10,
} as const;
export type MoveId = (typeof MOVE_IDS)[keyof typeof MOVE_IDS];

/** The plain word of each move, by its id. */
const MOVE_WORDS: Record<MoveId, string> = {
  0: 'walk',
  1: 'jog',
  2: 'run',
  3: 'sprint',
  4: 'start',
  5: 'stop',
  6: 'turn on the spot',
  7: 'turn while walking',
  8: 'sneak',
  9: 'aimed strafe',
  10: 'clip',
};

/** The plain word of each body state (the tuner's Body groups; a new group fails tsc here). */
const BODY_WORDS: Record<BodyGroup, string> = {
  idle: 'idle',
  walk: 'walk',
  jog: 'jog',
  run: 'run',
  crouchIdle: 'crouch idle',
  sneak: 'sneak',
  crouchWalk: 'crouch walk',
  lowReady: 'gun-ready stand',
  aim: 'aimed walk',
  aimCrouch: 'crouched aim',
  wallIdle: 'back to the wall',
  wallSlide: 'wall slide',
  wallPeek: 'wall peek',
  ladder: 'ladder climb',
  pipe: 'pipe climb',
  ledge: 'ledge hang',
  vent: 'vent',
  crawl: 'crawl',
  hang: 'hang',
  hold: 'hold',
  crouchRun: 'crouch run',
  aimStill: 'aim',
  aimCrouchMove: 'crouched aimed walk',
  wallCrouchIdle: 'crouched at the wall',
  wallCrouchSlide: 'crouched wall slide',
  wallCrouchPeek: 'crouched wall peek',
  carry: 'carry',
};

/** The source words (A2). */
const MOCAP_WORD = 'motion-capture';
const KEYED_WORD = 'hand-made';
const OFF_NOTE = ' (motion capture off)';

/**
 * One graph's playing state, written once a frame (numbers and one reference): `mocap` the motion-capture share of the
 * body (the standing holstered gait and slots, the crouched sneak capture, the aimed strafe capture), `keyed` the
 * hand-keyed clips' share, `code` the graph code's (procedural) share; the three sum to 1. `move` the move the capture
 * plays (a `MOVE_IDS` value; with no capture share the holstered speed set's nearer clip), `clip` the Anim Studio's
 * loop clip while its drive plays one (else null).
 */
export interface GraphPlaying {
  mocap: number;
  keyed: number;
  code: number;
  move: number;
  clip: KeyedClip | null;
}

/** A fresh state (all graph code: nothing keyed yet). The shares start as doubles so their fields never change shape. */
export function newGraphPlaying(): GraphPlaying {
  return { mocap: 0.5, keyed: 0.5, code: 0.5, move: MOVE_IDS.walk, clip: null };
}

/** Reset to all graph code (the shape kept). */
function clearPlaying(p: GraphPlaying): GraphPlaying {
  p.mocap = 0;
  p.keyed = 0;
  p.code = 1;
  p.move = MOVE_IDS.walk;
  p.clip = null;
  return p;
}

/** What the local player plays now: copied from its graph by `tuneEnd` only (the tuner reads it; never the game). */
export const NOW_PLAYING: GraphPlaying = clearPlaying(newGraphPlaying());

/** Copy `src` into `dst`. No allocation. */
export function copyPlaying(src: Readonly<GraphPlaying>, dst: GraphPlaying): void {
  dst.mocap = src.mocap;
  dst.keyed = src.keyed;
  dst.code = src.code;
  dst.move = src.move;
  dst.clip = src.clip;
}

/** The motion-capture share in 10 % steps (0..10). */
function tenths(x: number): number {
  const t = Math.round(x * 10);
  return t < 0 ? 0 : t > 10 ? 10 : t;
}

/** A small id of a clip by its name (0..1023; 0 none). No allocation. */
function clipTag(c: KeyedClip | null): number {
  if (c === null) return 0;
  const s = c.name;
  let h = 7;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) & 1023;
  return h === 0 ? 1 : h;
}

/**
 * One integer for what the line shows: the capture share in 10 % steps, the move, the body state (`bodyIdx`, a
 * `BODY_GROUPS` index; -1 none), the switch (More > Panel "Mocap locomotion") and the studio clip. Equal keys give equal
 * `nowPlayingText`; the panel rebuilds its text only when the key changes. No allocation.
 */
export function nowPlayingKey(np: Readonly<GraphPlaying>, bodyIdx: number, switchOn: boolean): number {
  const b = bodyIdx < 0 ? 0 : (bodyIdx + 1) & 63;
  const mv = np.move < 0 ? 0 : np.move & 15;
  return tenths(np.mocap) | (mv << 4) | (b << 8) | ((switchOn ? 1 : 0) << 14) | (clipTag(np.clip) << 15);
}

/** A clip's plain name: "walk" for `walk`, "crouch walk" for `crouch_walk`, the `mocap_` prefix dropped. */
function clipWords(c: KeyedClip): string {
  const n = c.name.startsWith('mocap_') ? c.name.slice(6) : c.name;
  return n.split('_').join(' ');
}

/** The plain word of a move id ('' for an unknown id). */
export function moveWord(move: number): string {
  return MOVE_WORDS[move as MoveId] ?? '';
}

/** The plain word of a body state ('' none). */
export function bodyWord(body: BodyGroup | ''): string {
  return body === '' ? '' : BODY_WORDS[body];
}

/**
 * The Now playing line (PLAN 2(b)), from the graph's state, the body state (`TUNE_STATE.body`) and the switch:
 * - all capture: "Now playing: motion-capture walk";
 * - no capture: "Now playing: hand-made crouch walk" (the body state's word), "... (motion capture off)" with the switch
 *   off;
 * - a mix: "Now playing: mix, 70% motion-capture walk, 30% hand-made";
 * - the Anim Studio's clip: "Now playing: hand-made walk clip".
 * Built only on a key change (`nowPlayingKey`).
 */
export function nowPlayingText(np: Readonly<GraphPlaying>, body: BodyGroup | '', switchOn: boolean): string {
  const off = switchOn ? '' : OFF_NOTE;
  if (np.clip !== null) {
    const src = np.clip.name.startsWith('mocap_') ? MOCAP_WORD : KEYED_WORD;
    return `Now playing: ${src} ${clipWords(np.clip)} clip`;
  }
  const t = tenths(np.mocap);
  const mv = moveWord(np.move);
  if (t >= 10) return `Now playing: ${MOCAP_WORD} ${mv}`;
  if (t <= 0) return `Now playing: ${KEYED_WORD} ${bodyWord(body) || mv}${off}`;
  return `Now playing: mix, ${t * 10}% ${MOCAP_WORD} ${mv}, ${100 - t * 10}% ${KEYED_WORD}`;
}

/** The guard variant (Who: Guard in the tuner; guards never play the capture): "Now playing (guard): hand-made <loop>". */
export function nowPlayingGuardText(loop: string): string {
  return `Now playing (guard): ${KEYED_WORD} ${loop}`;
}
