/**
 * (piano-knife S1) The piano scene's paired knife kills: the gate, the rows and their clips. Pure (no Babylon import);
 * nothing allocates after the clips load.
 *
 * The gate (BRIEF A1): knife kills exist only with Campaign's `pianoEscape` flag on, the running map the piano scene's
 * (`MapDef.scene === 'piano'`) and Campaign's scene switch live. `knifeSceneOn` decides it; Campaign's `pianoScene.ts` is
 * its only caller (`takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` at play start,
 * `setKnifeScene(false)` at the scene's end). Every other map and mode keeps today's takedowns.
 *
 * A row (BRIEF A14, A15): one two-body move on one clock. The attacker's clip plays on his graph (`killDrive.ts`), the
 * victim's on the guard's, the guard's root is driven from the attacker's frame every step and frame (`knifePair.ts`),
 * hand IK puts the grip hand, the knife tip and the guard's hands on their marks. Phases are shares of `seconds`:
 * `contact` the stab lands, `limp` the guard dies (the ragdoll takes him). Starting values (prototype); S2 swaps the
 * stand-in clips (A8) for the CLIP-LIST pairs and measures `standoff` / `contact` / `victimFrom`.
 *
 * (Michael ~20:05) "Palm strike knockout disabled, only knife kills, and no slashing, only animations with the guard":
 * no knife slash row (the plan's `KNIFE_SLASH` is dropped); the RT strike is off while the switch is on (`gameState`).
 */
import type { KeyedClip } from '../anim/keyed';
import type { TakedownKind } from './takedown';

/** The piano scene's `MapDef.scene` and Campaign's map id (tests, docs). */
export const PIANO_SCENE = 'piano';
export const PIANO_MAP_ID = 'thornbeckMill';

/** The gate: Campaign's flag, the running map's `scene` and Campaign's live scene switch. */
export function knifeSceneOn(flagOn: boolean, scene: string | undefined, live: boolean): boolean {
  return flagOn && live && scene === PIANO_SCENE;
}

/**
 * Timings (s), angles (rad), distances (m). `noise` the kill's radius (A5: the choke's, not the lethal strike's 3 m);
 * `blendIn` / `blendOut` the attacker's drive weight; `gripIn` the grab: the last share of the approach the grip hand
 * reaches in over (and the guard is pulled to the row's spot); `stabIn` the knife hand's drive from the wind-up to the
 * target before contact; `victimHandsIn` his hands to the forearm before contact; `release` the hands off after `limp`;
 * the buckle (`buckleAt`): `bucklePitch` the fold, in over `buckleRise`, out over `buckleDecay`; `contactTol` the rule.
 */
export const KNIFE = {
  noise: 1.2,
  blendIn: 0.12,
  blendOut: 0.15,
  gripIn: 0.45,
  stabIn: 0.12,
  victimHandsIn: 0.1,
  release: 0.15,
  bucklePitch: 0.35,
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
  /** The move's length (s): the attacker's clip runs over it (the bible's 1.0-1.5 s takedown). */
  seconds: number;
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
 * The rows (index = `KNIFE_KILL_IDS` order). S1 stand-ins (A8): attacker `mocap_cross_punch` (`mocap_crouch_to_stand`
 * crouched: he rises into the kill), victim the Pro Rifle Pack deaths.
 * Deviations from the S1 brief's table (contact rule, bible 5.12.2, measured by `tests/knifePair.test.ts`): the stand-in
 * deaths drop the pelvis 0.3-0.7 m from 45% of the clip on, so his clip runs only to `victimTo` 0.4 while the attacker
 * holds him (the collapse is the ragdoll's after `limp`); `standoff` 0.4 (0.55 put his mouth past her arm's reach).
 */
export const KNIFE_KILLS: readonly KnifeKillRow[] = [
  { id: 'behind', attacker: 'mocap_cross_punch', victim: 'mocap_rifle_death_from_the_back', seconds: 1.3, contact: 0.45, victimFrom: 0, victimTo: 0.4, limp: 0.8, standoff: 0.4, side: 0, yawOff: 0, grip: 'mouth', target: 'kidney' },
  { id: 'behindLow', attacker: 'mocap_crouch_to_stand', victim: 'mocap_rifle_death_from_the_back', seconds: 1.3, contact: 0.45, victimFrom: 0, victimTo: 0.4, limp: 0.8, standoff: 0.4, side: 0, yawOff: 0, grip: 'mouth', target: 'kidney' },
  { id: 'corner', attacker: 'mocap_cross_punch', victim: 'mocap_rifle_death_from_right', seconds: 1.3, contact: 0.45, victimFrom: 0, victimTo: 0.4, limp: 0.8, standoff: 0.4, side: 0, yawOff: 0, grip: 'shoulder', target: 'neck' },
  { id: 'front', attacker: 'mocap_cross_punch', victim: 'mocap_rifle_death_from_the_front', seconds: 1.3, contact: 0.45, victimFrom: 0, victimTo: 0.4, limp: 0.8, standoff: 0.4, side: 0, yawOff: Math.PI, grip: 'shoulder', target: 'chest' },
];

/** The row for a takedown kind (`crouched`: the attacker crouched; from behind he rises into the kill), -1 none: the
 *  kinds the piano map has no use for keep today's lethal move with the knife shown (A3). */
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

/** The victim clip's phase at the move's phase `ph` (0..1). */
export function victimPhase(row: KnifeKillRow, ph: number): number {
  const p = ph < 0 ? 0 : ph > 1 ? 1 : ph;
  return row.victimFrom + p * (row.victimTo - row.victimFrom);
}

// ---- the clips (loaded once, by dynamic import, from `setKnifeScene(true)`: other modes never load them) ----

const ATT: (KeyedClip | null)[] = [null, null, null, null];
const VIC: (KeyedClip | null)[] = [null, null, null, null];
let loading: Promise<void> | null = null;
let ready = false;

/** The clip modules by clip name (each a separate chunk; the rifle deaths are the Studio's own captures). */
function loadClip(name: string): Promise<KeyedClip | null> {
  switch (name) {
    case 'mocap_cross_punch':
      return import('../anim/clips/mixamo/cross_punch').then((m) => m.MOCAP_CROSS_PUNCH);
    case 'mocap_crouch_to_stand':
      return import('../anim/clips/mixamo/crouch_to_stand').then((m) => m.MOCAP_CROUCH_TO_STAND);
    case 'mocap_rifle_death_from_the_back':
      return import('../anim/clips/mixamo/studio/rifle_death_from_the_back').then((m) => m.MOCAP_RIFLE_DEATH_FROM_THE_BACK);
    case 'mocap_rifle_death_from_right':
      return import('../anim/clips/mixamo/studio/rifle_death_from_right').then((m) => m.MOCAP_RIFLE_DEATH_FROM_RIGHT);
    case 'mocap_rifle_death_from_the_front':
      return import('../anim/clips/mixamo/studio/rifle_death_from_the_front').then((m) => m.MOCAP_RIFLE_DEATH_FROM_THE_FRONT);
    default:
      return Promise.resolve(null);
  }
}

/** Load every row's clips into the module table (once; a second call returns the same promise). A failed load leaves
 *  the clips unready: every kill then plays the -1 path (today's lethal move, knife shown). */
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
