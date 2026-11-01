/**
 * (piano-knife S1) The paired knife kills: the rows and their clips. Pure (no Babylon import); nothing allocates after
 * the clips load.
 *
 * (knife-kills, owner decision; first built for the piano scene) On every map the lethal takedown on a guard on two legs
 * from a kind with a row is the knife kill (`TakedownController.start`); the grab, the knockout and the throw knockout
 * are unchanged. The clips load at match start (`loadKnifeClips` from `GameState`).
 *
 * A row (BRIEF A14, A15): one two-body move on one clock. The attacker's clip plays on his graph (`killDrive.ts`), the
 * victim's on the guard's, the guard's root is driven from the attacker's frame every step and frame (`knifePair.ts`),
 * hand IK puts the grip hand, the knife tip and the guard's hands on their marks. Phases are shares of `seconds`:
 * `contact` the stab lands, `limp` the guard dies (the ragdoll takes him).
 *
 * (piano-knife S2) The clips are Michael's Mixamo downloads (CLIP-LIST), emitted into `src/anim/clips/mixamo/knife/` (the
 * piano scene's own lazy clips; the S1 stand-ins are gone): attacker `Stabbing` (behind, behindLow, front) and
 * `Standing Melee Attack Downward` (corner); victim `Falling Forward Death` (behind), `Dying` (behindLow, front) and
 * `Falling Back Death` (corner). The attacker clips are 2.1-2.6 s long and the move 1.0-1.5 s (A15): the move plays the
 * clip's window around the stab (`attackerFrom` .. `attackerTo`) at its own speed, not the whole clip sped up.
 * `contact`, `limp`, the windows, `victimTo`, `standoff` and `side` are measured by `tests/knifePairFit.test.ts`
 * (KP_FIT=1) on 2026-10-26 (one run).
 *
 * (Michael ~20:05) "no slashing, only animations with the guard": no knife slash row (the plan's `KNIFE_SLASH` is
 * dropped).
 */
import type { KeyedClip } from '../anim/keyed';
import { GRAB_KINDS, type TakedownKind } from './takedown';

/**
 * Timings (s), angles (rad), distances (m). `noise` the kill's radius (A5: the choke's, not the lethal strike's 3 m);
 * `blendIn` / `blendOut` the attacker's drive weight; `gripIn` the grab: the last share of the approach the guard is
 * pulled to the row's spot over; `handsIn` the attacker's hands reach in over this first share of the approach (an arm
 * takes ~6 frames to arrive, so they are on him when the grab ends); `stabIn` the knife hand's drive from the wind-up to
 * the target, ending `lead` s before contact (the arm settles on it by then); `victimHandsIn` his hands to the forearm,
 * on `lead` s before contact; `release` the hands off after `limp`;
 * the buckle (`buckleAt`): `bucklePitch` the fold (0.18, half the plan's 0.35: the full fold took his mouth 9 cm out of
 * the grip from behind), in over `buckleRise`, out over `buckleDecay`; `contactTol` the rule (3 cm; the measured misses
 * over it are `tests/knifePair.test.ts` KNOWN_MISS, accepted until Michael plays: BRIEF A16).
 */
export const KNIFE = {
  noise: 1.2,
  blendIn: 0.12,
  blendOut: 0.15,
  gripIn: 0.45,
  handsIn: 0.5,
  lead: 0.06,
  stabIn: 0.12,
  victimHandsIn: 0.1,
  release: 0.15,
  bucklePitch: 0.18,
  buckleRise: 0.06,
  buckleDecay: 0.4,
  contactTol: 0.03,
} as const;

/** The rows' ids in wire-stable order (S3 sends the index in 3 bits: at most 8). */
export const KNIFE_KILL_IDS = ['behind', 'behindLow', 'corner', 'front'] as const;
export type KnifeKillId = (typeof KNIFE_KILL_IDS)[number];

/** One paired kill. Clip ids are `mocapSources` keys. */
export interface KnifeKillRow {
  id: KnifeKillId;
  attacker: string;
  victim: string;
  /** The move's length (s): the attacker's clip window runs over it (the bible's 1.0-1.5 s takedown). */
  seconds: number;
  /** (piano-knife S2) The attacker clip's window (shares of his clip) the move plays over `seconds`: its length x the
   *  clip's own seconds = `seconds` (the clip at its own speed); after `seconds` it runs on at that speed through the
   *  blend-out (`attackerPhase`). */
  attackerFrom: number;
  attackerTo: number;
  /** The stab lands at this share of `seconds`; the guard dies (limp, the ragdoll) at `limp`. */
  contact: number;
  /** The victim's clip from `victimFrom` at the move's start to `victimTo` at its end (shares of his clip). */
  victimFrom: number;
  victimTo: number;
  limp: number;
  /** The guard's root from the attacker's: `standoff` forward, `side` right (m), facing his yaw + `yawOff`. */
  standoff: number;
  side: number;
  yawOff: number;
  /** The grip hand: over his mouth (from behind) or on his shoulder. */
  grip: 'mouth' | 'shoulder';
  /** Where the knife goes in. */
  target: 'kidney' | 'neck' | 'chest';
}

/**
 * The rows (index = `KNIFE_KILL_IDS` order; the real pairs, see the header). The fit's winners, but two from one focused
 * try after it on the rows over 10 cm (lead, S2 part B): behindLow `standoff` 0.2 (below the fit's 0.25-0.60 grid) with
 * `victimTo` 0.5, front `standoff` 0.45 with `victimTo` 0.25 (the guard's clip stops well before he drops). The corner
 * row stays over (S2 report).
 */
export const KNIFE_KILLS: readonly KnifeKillRow[] = [
  { id: 'behind', attacker: 'mocap_stabbing', victim: 'mocap_falling_forward_death', seconds: 1.5, attackerFrom: 0.258, attackerTo: 0.828, contact: 0.55, victimFrom: 0, victimTo: 0.286, limp: 0.9, standoff: 0.25, side: -0.15, yawOff: 0, grip: 'mouth', target: 'kidney' },
  { id: 'behindLow', attacker: 'mocap_stabbing', victim: 'mocap_dying', seconds: 1.5, attackerFrom: 0.258, attackerTo: 0.828, contact: 0.55, victimFrom: 0, victimTo: 0.5, limp: 0.9, standoff: 0.2, side: -0.15, yawOff: 0, grip: 'mouth', target: 'kidney' },
  { id: 'corner', attacker: 'mocap_standing_melee_attack_downward', victim: 'mocap_falling_back_death', seconds: 1.5, attackerFrom: 0.025, attackerTo: 0.728, contact: 0.55, victimFrom: 0, victimTo: 0.299, limp: 0.9, standoff: 0.5, side: -0.15, yawOff: 0, grip: 'shoulder', target: 'neck' },
  { id: 'front', attacker: 'mocap_stabbing', victim: 'mocap_dying', seconds: 1.5, attackerFrom: 0.258, attackerTo: 0.828, contact: 0.55, victimFrom: 0, victimTo: 0.25, limp: 0.9, standoff: 0.45, side: -0.05, yawOff: Math.PI, grip: 'shoulder', target: 'chest' },
];

/** The row for a takedown kind (`crouched`: the attacker crouched; from behind he rises into the kill), -1 none: the
 *  other kinds keep the classic lethal move. */
export function pickKnifeKill(kind: TakedownKind, crouched: boolean): number {
  switch (kind) {
    case 'behind':
      return crouched ? 1 : 0;
    case 'corner':
    case 'overCover':
      return 2;
    case 'front':
    case 'side':
      return 3;
    default:
      return -1;
  }
}

/** (A2) The menu's takedown row for an offer: the grab (`'grab'`) on a guard on two legs from behind, else the
 *  takedown (`'ko'`, `TD_LABEL`). */
export function takedownRow(kind: TakedownKind, quadruped: boolean): 'grab' | 'ko' {
  return GRAB_KINDS.includes(kind) && !quadruped ? 'grab' : 'ko';
}

/** The grab's share (eased 0..1) `t` s into an approach of `approach` s: the grip hand reaches in, and the guard is
 *  pulled to the row's spot, over its last `KNIFE.gripIn` share. */
export function grabAt(t: number, approach: number): number {
  if (approach <= 0) return 1;
  const u = (t / approach - (1 - KNIFE.gripIn)) / KNIFE.gripIn;
  const e = u <= 0 ? 0 : u >= 1 ? 1 : u;
  return e * e * (3 - 2 * e);
}

/** The attacker's hands' weight `t` s into an approach of `approach` s (in over its first `KNIFE.handsIn` share). */
export function handsAt(t: number, approach: number): number {
  if (approach <= 0) return 1;
  const u = t / (approach * KNIFE.handsIn);
  const e = u <= 0 ? 0 : u >= 1 ? 1 : u;
  return e * e * (3 - 2 * e);
}

/** The row's buckle (rad, + forward): towards the attacker, so the grip stays in reach: from behind he arches back into
 *  the hand over his mouth, from the front he folds over the blade. */
export function bucklePitchOf(row: KnifeKillRow): number {
  return row.yawOff === 0 ? -KNIFE.bucklePitch : KNIFE.bucklePitch;
}

/** (piano-knife S2) The attacker clip's phase at the move's phase `ph` (0..1 over `seconds`; past 1, through the tail,
 *  it runs on at the same speed and the drive holds the clip's last frame). */
export function attackerPhase(row: KnifeKillRow, ph: number): number {
  return row.attackerFrom + ph * (row.attackerTo - row.attackerFrom);
}

/** The victim clip's phase at the move's phase `ph` (0..1). */
export function victimPhase(row: KnifeKillRow, ph: number): number {
  const p = ph < 0 ? 0 : ph > 1 ? 1 : ph;
  return row.victimFrom + p * (row.victimTo - row.victimFrom);
}

// ---- the clips (loaded once, by dynamic import, at match start: off the entry chunk) ----

const ATT: (KeyedClip | null)[] = [null, null, null, null];
const VIC: (KeyedClip | null)[] = [null, null, null, null];
let loading: Promise<void> | null = null;
let ready = false;

/** The clip modules by clip name (each its own chunk by a literal path: the knife clips, `clips/mixamo/knife/`,
 *  stay off the entry chunk; the Studio reaches them through its lazy set). */
function loadClip(name: string): Promise<KeyedClip | null> {
  switch (name) {
    case 'mocap_stabbing':
      return import('../anim/clips/mixamo/knife/stabbing').then((m) => m.MOCAP_STABBING);
    case 'mocap_standing_melee_attack_downward':
      return import('../anim/clips/mixamo/knife/standing_melee_attack_downward').then((m) => m.MOCAP_STANDING_MELEE_ATTACK_DOWNWARD);
    case 'mocap_falling_forward_death':
      return import('../anim/clips/mixamo/knife/falling_forward_death').then((m) => m.MOCAP_FALLING_FORWARD_DEATH);
    case 'mocap_dying':
      return import('../anim/clips/mixamo/knife/dying').then((m) => m.MOCAP_DYING);
    case 'mocap_falling_back_death':
      return import('../anim/clips/mixamo/knife/falling_back_death').then((m) => m.MOCAP_FALLING_BACK_DEATH);
    default:
      return Promise.resolve(null);
  }
}

/** Load every row's clips into the module table (once; a second call returns the same promise). A failed load leaves
 *  the clips unready: every lethal takedown then plays the classic lethal move. */
export function loadKnifeClips(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const names = new Set<string>();
    for (const r of KNIFE_KILLS) {
      names.add(r.attacker);
      names.add(r.victim);
    }
    const got = new Map<string, KeyedClip | null>();
    await Promise.all([...names].map((n) => loadClip(n).then((c) => void got.set(n, c))));
    let ok = true;
    for (let k = 0; k < KNIFE_KILLS.length; k++) {
      const r = KNIFE_KILLS[k]!;
      ATT[k] = got.get(r.attacker) ?? null;
      VIC[k] = got.get(r.victim) ?? null;
      if (!ATT[k] || !VIC[k]) ok = false;
    }
    ready = ok;
  })();
  loading.catch(() => {
    ready = false;
  });
  return loading;
}

/** Every row's clips are in. */
export function knifeClipsReady(): boolean {
  return ready;
}

/** A row's resolved clip (by index: no lookup by name on the hot path); null before the load. */
export function knifeClip(row: number, victim: boolean): KeyedClip | null {
  return (victim ? VIC : ATT)[row] ?? null;
}

/** (tests) Forget the loaded clips (the next `loadKnifeClips` loads again). */
export function resetKnifeClipsForTest(): void {
  loading = null;
  ready = false;
  for (let k = 0; k < ATT.length; k++) ATT[k] = VIC[k] = null;
}

/** The buckle's weight `sinceContact` s after the stab: 0 before it, eased to 1 over `buckleRise`, back to 0 over
 *  `buckleDecay`. */
export function buckleAt(sinceContact: number): number {
  if (!(sinceContact >= 0)) return 0;
  const K = KNIFE;
  if (sinceContact < K.buckleRise) {
    const u = sinceContact / K.buckleRise;
    return u * u * (3 - 2 * u);
  }
  const d = (sinceContact - K.buckleRise) / K.buckleDecay;
  if (d >= 1) return 0;
  const u = 1 - d;
  return u * u * (3 - 2 * u);
}
