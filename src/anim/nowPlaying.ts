/**
 * (tuner-clarity S1, BRIEF A3) What the local player's body is playing now, read live from the animation graph: the
 * motion-capture, hand-keyed and graph-code shares of the body, the move the capture plays and the Anim Studio's clip.
 * The graph writes its own `AnimGraph.playing` at the end of each `update`; `tuneEnd` (the local player's tuning window)
 * copies it into `NOW_PLAYING`, which the tuner panel and the Anim Studio read (display only: nothing in the game reads
 * it back). The plain words live here (A2's one table, with `src/ui/tunerReach.ts`'s): "motion capture", "hand-made".
 * Pure and Babylon-free; the per-frame parts (`copyPlaying`, `nowPlayingKey`) allocate nothing.
 */
import type { Clip } from './clip';
import type { KeyedClip } from './keyed';
import type { LocoClipSet } from './mocap';
import type { BodyGroup } from './tune';
import { mocapSourceTag, mocapSourceTagWord } from './mocapSources';

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
 * loop clip while its drive plays one (else null). (mixamo-retarget M5) `trav` the traversal channel clip the graph
 * plays (`TRAVERSE_CLIP`: a hand-made clip, or with I2 a Mixamo capture; null when no traversal plays): part of the graph
 * code's share; a capture's line names it by its source row (`mocapSources.ts`).
 */
export interface GraphPlaying {
  mocap: number;
  keyed: number;
  code: number;
  move: number;
  clip: KeyedClip | null;
  trav: Clip | null;
}

/** A fresh state (all graph code: nothing keyed yet). The shares start as doubles so their fields never change shape. */
export function newGraphPlaying(): GraphPlaying {
  return { mocap: 0.5, keyed: 0.5, code: 0.5, move: MOVE_IDS.walk, clip: null, trav: null };
}

/** Reset to all graph code (the shape kept). */
function clearPlaying(p: GraphPlaying): GraphPlaying {
  p.mocap = 0;
  p.keyed = 0;
  p.code = 1;
  p.move = MOVE_IDS.walk;
  p.clip = null;
  p.trav = null;
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
  dst.trav = src.trav;
}

/**
 * (mixamo-retarget M5) The source of the capture each move plays (`mocapSourceTag`: 0 none, 1 CMU, 2 Mixamo), by move id,
 * from the locomotion set played (`LOCO.set`): noted once per switch change by `setMocapLocomotion` (mocap.ts). The line
 * reads it only for a capture share over 0, which only the mocap set plays.
 */
const MOVE_SRC = new Uint8Array(16);

/** A clip's source tag (0 for no clip or a hand-made one). No allocation. */
function tagOf(c: { readonly name: string } | null): number {
  return c === null ? 0 : mocapSourceTag(c.name);
}

/** Note the source of each move's capture from the locomotion set now played (once per change; not per frame). */
export function noteMoveSources(S: LocoClipSet): void {
  MOVE_SRC.fill(0);
  MOVE_SRC[MOVE_IDS.walk] = tagOf(S.walk);
  MOVE_SRC[MOVE_IDS.jog] = tagOf(S.jog);
  MOVE_SRC[MOVE_IDS.run] = tagOf(S.run);
  MOVE_SRC[MOVE_IDS.sprint] = tagOf(S.sprint);
  MOVE_SRC[MOVE_IDS.start] = tagOf(S.start);
  MOVE_SRC[MOVE_IDS.stop] = tagOf(S.stop);
  MOVE_SRC[MOVE_IDS.turnSpot] = tagOf(S.turnInPlace);
  MOVE_SRC[MOVE_IDS.turnMove] = tagOf(S.turnMoveL ?? S.turnMoveR);
  MOVE_SRC[MOVE_IDS.sneak] = tagOf(S.crouchWalk);
  MOVE_SRC[MOVE_IDS.strafe] = tagOf(S.strafeL ?? S.strafeR);
}

/** The source tag of a move's capture (0 none). No allocation. */
export function moveSourceTag(move: number): number {
  return move < 0 ? 0 : (MOVE_SRC[move & 15] ?? 0);
}

/** The motion-capture share in 10 % steps (0..10). */
function tenths(x: number): number {
  const t = Math.round(x * 10);
  return t < 0 ? 0 : t > 10 ? 10 : t;
}

/** A small id of a clip by its name (0..1023; 0 none). No allocation. */
function clipTag(c: { readonly name: string } | null): number {
  if (c === null) return 0;
  const s = c.name;
  let h = 7;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) & 1023;
  return h === 0 ? 1 : h;
}

/**
 * One integer for what the line shows: the capture share in 10 % steps, the move, the body state (`bodyIdx`, a
 * `BODY_GROUPS` index; -1 none), the switch (More > Panel "Mocap locomotion"), the clip (the studio clip, else
 * (mixamo-retarget M5) the traversal clip, with a bit saying which: the line reads the traversal clip only without a
 * studio clip) and the source of the capture the line names (`mocapSources.ts`: CMU or Mixamo). Under 2^28: a small
 * integer, never a boxed double. Equal keys give equal `nowPlayingText`; the panel rebuilds its text only when the key
 * changes. No allocation.
 */
export function nowPlayingKey(np: Readonly<GraphPlaying>, bodyIdx: number, switchOn: boolean): number {
  const b = bodyIdx < 0 ? 0 : (bodyIdx + 1) & 63;
  const mv = np.move < 0 ? 0 : np.move & 15;
  const trav = np.clip === null && np.trav !== null ? 1 : 0;
  const tag = trav === 1 ? clipTag(np.trav) : clipTag(np.clip);
  return tenths(np.mocap) | (mv << 4) | (b << 8) | ((switchOn ? 1 : 0) << 14) | (tag << 15) | (trav << 25) | (shownSourceTag(np) << 26);
}

/** The source tag of the capture the line names: the studio clip's, else a traversal capture's, else the move's. */
function shownSourceTag(np: Readonly<GraphPlaying>): number {
  if (np.clip !== null) return tagOf(np.clip);
  const t = tagOf(np.trav);
  return t !== 0 ? t : moveSourceTag(np.move);
}

/** "motion-capture (CMU)" for a source tag; plain "motion-capture" for none. */
function captureWords(tag: number): string {
  const w = mocapSourceTagWord(tag);
  return w ? `${MOCAP_WORD} (${w})` : MOCAP_WORD;
}

/** A clip's plain name: "walk" for `walk`, "crouch walk" for `crouch_walk`, the `mocap_` prefix dropped. */
function clipWords(c: { readonly name: string }): string {
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
 * The Now playing line (PLAN 2(b)), from the graph's state, the body state (`TUNE_STATE.body`) and the switch; a capture
 * names its source (mixamo-retarget M5, `mocapSources.ts`):
 * - all capture: "Now playing: motion-capture (CMU) walk";
 * - no capture: "Now playing: hand-made crouch walk" (the body state's word), "... (motion capture off)" with the switch
 *   off;
 * - a mix: "Now playing: mix, 70% motion-capture (CMU) walk, 30% hand-made";
 * - the Anim Studio's clip: "Now playing: hand-made walk clip", "Now playing: motion-capture (CMU) walk clip";
 * - a traversal capture (I2): "Now playing: motion-capture (Mixamo) hang" (the body state's word, else the clip's); a
 *   hand-made traversal clip reads as before (the hand-made line).
 * Built only on a key change (`nowPlayingKey`).
 */
export function nowPlayingText(np: Readonly<GraphPlaying>, body: BodyGroup | '', switchOn: boolean): string {
  const off = switchOn ? '' : OFF_NOTE;
  if (np.clip !== null) {
    const tag = tagOf(np.clip);
    const src = tag !== 0 ? captureWords(tag) : np.clip.name.startsWith('mocap_') ? MOCAP_WORD : KEYED_WORD;
    return `Now playing: ${src} ${clipWords(np.clip)} clip`;
  }
  const tt = tagOf(np.trav);
  if (np.trav !== null && tt !== 0) return `Now playing: ${captureWords(tt)} ${bodyWord(body) || clipWords(np.trav)}`;
  const t = tenths(np.mocap);
  const mv = moveWord(np.move);
  const cap = captureWords(moveSourceTag(np.move));
  if (t >= 10) return `Now playing: ${cap} ${mv}`;
  if (t <= 0) return `Now playing: ${KEYED_WORD} ${bodyWord(body) || mv}${off}`;
  return `Now playing: mix, ${t * 10}% ${cap} ${mv}, ${100 - t * 10}% ${KEYED_WORD}`;
}

/** The guard variant (Who: Guard in the tuner; guards never play the capture): "Now playing (guard): hand-made <loop>". */
export function nowPlayingGuardText(loop: string): string {
  return `Now playing (guard): ${KEYED_WORD} ${loop}`;
}
