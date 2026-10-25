/**
 * (mixamo-kit) The Mixamo clips on the co-op kit moves (docs/mixamo-kit/PLAN.md): the pull-up's holder (catch, haul) and
 * partner (scramble), the shutter's holder (lift, hold) and the crawl under it. Pure data, set-up code and pure clock maps
 * (no per-frame allocation): `TeamPoser` (clips/team.ts) picks this frame's clip and clip time per rig and writes them into
 * the rig graph's `kit` (`KitShotIn`); the graph (`animGraph.ts` `kitShot`, Wren rigs only) samples it.
 *
 * - The clip follows the ACTING player's animation source (G400): `KIT_TABLES[0]` (not Mixamo: every pose id null, today's
 *   pose) and `KIT_TABLES[1]` (Mixamo: a pose id's clip when its `MIXAMO_ON` row is on, whatever this machine's source,
 *   since a remote player may be on Mixamo while this viewer is not), picked per rig per frame by `kitSourceOf(rig)`.
 * - Both tables are rebuilt once per change by `resolveKit` (registered with `addMixamoResolver`), never per frame.
 * - Every number is `KIT_SHOT` (read by reference every frame; Michael tunes it; slice 2 puts it in the tuner bag).
 * - The clip time on both screens comes only from data both pages have: the shutter gap (wire `s`), the scramble's `ph`,
 *   the distance along the crawl, and the linked local clock otherwise (PLAN 2).
 */
import type { KeyedClip } from './keyed';
import { MIXAMO, MIXAMO_ON } from './mixamo';
import { LEAP, TEAM } from '../config/movement';
import { MOCAP_KNEELING_PULL_UP } from './clips/mixamo/kneeling_pull_up';
import { MOCAP_PULLING_UP_TO_A_LEDGE } from './clips/mixamo/pulling_up_to_a_ledge';
import { MOCAP_LIFTING_HEAVY_OBJECT } from './clips/mixamo/lifting_heavy_object';
import { MOCAP_CRAWLING_PRONE } from './clips/mixamo/crawling_prone';
import type { KitPoseId, KitPoseMove, TeamPoseRole, TeamRigIn } from './clips/team';

/**
 * The kit clips' numbers (PLAN 2 "Slice design"; clip seconds from the modules' headers, segment boundaries from the
 * takes' pelvis and arm keys, confirmed by the frame dump in tests/kitMixamo.test.ts (b)):
 * - `*Sec`: each take's length (s): kneeling_pull_up 4.483, pulling_up_to_a_ledge 3.817, lifting_heavy_object 9.617,
 *   crawling_prone 2.333 (a cycle).
 * - the pull holder (kneeling_pull_up): `offerAt` the held frame of the optional offer; the catch plays
 *   `catch0`..`catch1`, the haul `catch1`..`haul1` over `PULL.haul`, its tail `haul1`..the end over the scramble.
 * - the pull partner (pulling_up_to_a_ledge): the optional hang `0`..`scram0`, the scramble `scram0`..the end.
 * - the shutter holder (lifting_heavy_object): the optional offer `offer0`..`lift0` over `offerSec`, the lift
 *   `lift0`..`lift1` by the gap, the hold `lift1`..`hold1` ping-pong, the optional drop `hold1`..`drop1`.
 * - `holdGap` / `crawlGap`: copies of `SHUTTER.holdGap` / `.crawlGap` (game/kit/shutter.ts, not imported: it registers a
 *   kit move at load and closes an import cycle back here; the test asserts them equal), `holdSpot` of `SHUTTER.holdSpot`.
 * - `gapEps`: a gap under this is shut (the offer). `crawlCycle`: the crawl take's travel a cycle (m at 1.75 m);
 *   `crawlStretch`: the take played over that much more ground (~2x its speed at the 0.85 m/s kinematic crawl).
 * - `flip`: the graph's own weight ease (s) at a start, an end, a jump in clip time or a source flip; `jump`: a step in
 *   the shot's progress (or loop phase) over this in a frame is a jump (a phase change, a relink): cross-faded over `flip`;
 *   `tail`: the scramble's take fades out over its last this-many s (the body lands: no longer free, the rig drops it).
 * - `barHandW` / `haulHandW`: the IK weight of the palms on the shutter's bar / on the partner's wrists; `wristUp` the
 *   partner's wrists over its root while hauled (m at 1.75 m).
 */
export const KIT_SHOT = {
  pullSec: 4.483, ledgeSec: 3.817, liftSec: 9.617, crawlSec: 2.333,
  offerAt: 0.45, catch0: 0.45, catch1: 1.2, haul1: 3.6,
  scram0: 1.6,
  offer0: 1.5, offerSec: 0.4, lift0: 2.3, lift1: 4.8, hold1: 6.6, drop1: 7.6,
  holdGap: 0.9, crawlGap: 0.85, holdSpot: 0.45, gapEps: 0.001, crawlCycle: 0.54, crawlStretch: 1.85,
  flip: 0.1, jump: 0.05, tail: 0.15, barHandW: 1, haulHandW: 0.8, wristUp: 1.5,
} as const;

/**
 * The pull-up's clock numbers, copies of `PULL.catchClose` / `.landT` / `.haul` / `.scramble` (game/kit/pullUp.ts, not
 * imported for the same reason as the shutter's; built from the same constants: the jump's apex `LEAP.vy / 18`, the catch
 * band 0.15 m; the test asserts them equal).
 */
const KIT_GRAV = 18;
const KIT_APEX = LEAP.vy / KIT_GRAV;
export const KIT_PULL = {
  catchClose: KIT_APEX + Math.sqrt((2 * 0.15) / KIT_GRAV),
  landT: 2 * KIT_APEX,
  haul: TEAM.hangPull,
  scramble: TEAM.ropeTop,
} as const;

/** One source's clips: a kit pose id's clip, or null (today's pose). `any`: some id has one. */
export type KitTable = { any: boolean } & Record<KitPoseId, KeyedClip | null>;

const emptyTable = (): KitTable => ({ any: false, pullOffer: null, pullCatch: null, pullHaul: null, pullJump: null, pullHang: null, pullScramble: null, shutterOffer: null, shutterLift: null, shutterHold: null, shutterDrop: null, crawlUnder: null });

/** [0] not Mixamo (always empty), [1] Mixamo (the rows on). The same objects always: fields rewritten by `resolveKit`. */
export const KIT_TABLES: readonly [KitTable, KitTable] = [emptyTable(), emptyTable()];

/** Each kit pose id's take (`MIXAMO_ON` slug) and its optional phase row ('' none), or null (no clip: the jump). */
const KIT_ROWS: Readonly<Record<KitPoseId, { readonly slug: string; readonly key: string } | null>> = {
  pullOffer: { slug: 'kneeling_pull_up', key: 'kit_pull_offer' },
  pullCatch: { slug: 'kneeling_pull_up', key: '' },
  pullHaul: { slug: 'kneeling_pull_up', key: '' },
  pullJump: null,
  pullHang: { slug: 'pulling_up_to_a_ledge', key: 'kit_pull_hang' },
  pullScramble: { slug: 'pulling_up_to_a_ledge', key: '' },
  shutterOffer: { slug: 'lifting_heavy_object', key: 'kit_shutter_offer' },
  shutterLift: { slug: 'lifting_heavy_object', key: '' },
  shutterHold: { slug: 'lifting_heavy_object', key: '' },
  shutterDrop: { slug: 'lifting_heavy_object', key: 'kit_shutter_drop' },
  crawlUnder: { slug: 'crawling_prone', key: '' },
};

const KIT_CLIPS: Readonly<Record<string, KeyedClip | null>> = {
  kneeling_pull_up: MOCAP_KNEELING_PULL_UP,
  pulling_up_to_a_ledge: MOCAP_PULLING_UP_TO_A_LEDGE,
  lifting_heavy_object: MOCAP_LIFTING_HEAVY_OBJECT,
  crawling_prone: MOCAP_CRAWLING_PRONE,
};

const KIT_IDS = Object.keys(KIT_ROWS) as KitPoseId[];

/** Rebuild both tables from `MIXAMO_ON` (once per change; not per frame). */
export function resolveKit(): void {
  const T = KIT_TABLES[1];
  let any = false;
  for (const id of KIT_IDS) {
    const r = KIT_ROWS[id];
    const c = r !== null && MIXAMO_ON[r.slug] === true && (r.key === '' || MIXAMO_ON[r.key] === true) ? (KIT_CLIPS[r.slug] ?? null) : null;
    T[id] = c;
    if (c !== null) any = true;
  }
  T.any = any;
}

const addMixamoResolver = (fn: () => void): void => fn(); // STUB (mixamo-kit): swap for the mixamo.ts export
addMixamoResolver(resolveKit);

export let kitSourceOf = (_rig: TeamRigIn): 0 | 1 => (MIXAMO.on ? 1 : 0); // STUB (mixamo-kit): rig.graph.animSource
const KIT_SOURCE_STUB = kitSourceOf;

/** Tests only, at set-up (never per frame): give rigs their own source; null puts the stub back. */
export function setKitSourceOf(fn: ((rig: TeamRigIn) => 0 | 1) | null): void {
  kitSourceOf = fn ?? KIT_SOURCE_STUB;
}

/** What one rig's kit shot is this frame (TeamPoser writes it before `rig.animate`; the graph's `kitShot` reads it). */
export interface KitShotIn {
  /** The take, or null (no shot). */
  clip: KeyedClip | null;
  /** 'shot': `time` is the progress 0..1 over the take (1 its last frame); 'loop': `time` is the cycle's phase. */
  time: number;
  /** The shot's target weight 0..1 (TeamPoser's eased team pose weight; 0 = nothing sampled or written). */
  weight: number;
  mode: 'shot' | 'loop';
  /** This rig's acting player is on the Mixamo source (it picked `KIT_TABLES[1]`); it only picks the table. */
  mx: boolean;
  /** The kit move and role this rig plays ('' none; written whenever `KIT_TABLES[1].any`): the hang skip reads them. */
  move: KitPoseMove | '';
  role: TeamPoseRole | '';
}

export function newKitShotIn(): KitShotIn {
  return { clip: null, time: 0, weight: 0, mode: 'shot', mx: false, move: '', role: '' };
}

/** A shot cleared: weight 0, no source, no move (every `TeamPoser.begin` path and `end`, PLAN 2 "Clear rule"). */
export function clearKitShot(s: KitShotIn): void {
  s.weight = 0;
  s.mx = false;
  s.move = '';
  s.role = '';
}

const clamp01 = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v);

/**
 * A kit shot's clock (TeamPoser owns one): it writes `kt` (and `gap`), the into-functions write the results into the
 * fields, so no double crosses a call per frame (a call the engine does not inline boxes each double: 16 B).
 * - `kt` the phase's clock (`kitTimeInto`); `sec` the clip time (s into the take); `time` the shot's progress 0..1 (the
 *   crawl: its cycle phase);
 * - `gap` the shutter gap this frame, `last` the last one seen, `trend` its trend (`kitGapInto`).
 */
export interface KitClock {
  kt: number;
  sec: number;
  time: number;
  gap: number;
  last: number;
  trend: number;
}

export function newKitClock(): KitClock {
  return { kt: 0, sec: 0, time: 0, gap: 0, last: 0, trend: 0 };
}

/**
 * A kit pose id's clip time at its clock `c.kt` (PLAN 2 table) into `c.sec`, and the shot's progress into `c.time`:
 * - pullCatch: tau, s since the host's start; pullHaul: tau, s since the haul began (haul then the scramble);
 * - pullHang / pullScramble: the partner's k (traverseT);
 * - shutterOffer / shutterHold: s since the phase began (TeamPoser's clock); shutterLift / shutterDrop: g, the gap over
 *   `holdGap`; crawlUnder: the distance crawled over the body scale (m at 1.75 m); pullOffer: none (held).
 * No allocation.
 */
export function kitTimeInto(id: KitPoseId, c: KitClock): void {
  const S = KIT_SHOT;
  const kt = c.kt;
  let s = 0;
  let len: number = S.pullSec;
  switch (id) {
    case 'pullOffer':
      s = S.offerAt;
      break;
    case 'pullCatch':
      s = S.catch0 + (S.catch1 - S.catch0) * clamp01(kt / KIT_PULL.catchClose);
      break;
    case 'pullHaul':
      s = kt <= KIT_PULL.haul ? S.catch1 + (S.haul1 - S.catch1) * clamp01(kt / KIT_PULL.haul) : S.haul1 + (S.pullSec - S.haul1) * clamp01((kt - KIT_PULL.haul) / KIT_PULL.scramble);
      break;
    case 'pullJump':
      break;
    case 'pullHang':
      s = S.scram0 * clamp01(kt);
      len = S.ledgeSec;
      break;
    case 'pullScramble':
      s = S.scram0 + (S.ledgeSec - S.scram0) * clamp01(kt);
      len = S.ledgeSec;
      break;
    case 'shutterOffer':
      s = S.offer0 + (S.lift0 - S.offer0) * clamp01(kt / S.offerSec);
      len = S.liftSec;
      break;
    case 'shutterLift':
      s = S.lift0 + (S.lift1 - S.lift0) * clamp01(kt);
      len = S.liftSec;
      break;
    case 'shutterHold': {
      // ping-pong (mirrored) over lift1..hold1
      const span = S.hold1 - S.lift1;
      const u = (kt > 0 ? kt : 0) / span;
      const m = u - 2 * Math.floor(u / 2);
      s = S.lift1 + span * (m <= 1 ? m : 2 - m);
      len = S.liftSec;
      break;
    }
    case 'shutterDrop':
      s = S.hold1 + (S.drop1 - S.hold1) * clamp01(1 - kt);
      len = S.liftSec;
      break;
    case 'crawlUnder': {
      const u = kt / (S.crawlCycle * S.crawlStretch);
      s = S.crawlSec * (u - Math.floor(u));
      len = S.crawlSec;
      break;
    }
  }
  c.sec = s;
  c.time = id === 'crawlUnder' ? s / len : clamp01(s / len);
}

/**
 * The shutter holder's phase from `c.gap` (PLAN 2 "Shutter phase"), the same on both pages: the trend +1 rising, -1
 * falling, kept when the gap is unchanged (the wire `s` is stepwise and the fixed step is not the render frame), an
 * unknown gap (NaN) shut; then shut -> the offer, open to the crawl gap and not falling -> the hold, rising -> the lift,
 * falling -> the drop. Writes `c.trend` / `c.last`. No allocation.
 */
export function kitGapInto(c: KitClock): KitPoseId {
  const g = c.gap > 0 ? c.gap : 0;
  const l = c.last > 0 ? c.last : 0;
  const trend = g > l ? 1 : g < l ? -1 : c.trend;
  c.trend = trend;
  c.last = g;
  if (g <= KIT_SHOT.gapEps) return 'shutterOffer';
  if (g >= KIT_SHOT.crawlGap && trend >= 0) return 'shutterHold';
  return trend < 0 ? 'shutterDrop' : 'shutterLift';
}

// the same rules as plain functions (tests, tools; not per frame)
const KC = newKitClock();

/** A kit pose id's clip time (s into its take) at its clock `kt`. */
export function kitClipTime(id: KitPoseId, kt: number): number {
  KC.kt = kt;
  kitTimeInto(id, KC);
  return KC.sec;
}

/** The shot's `time` for a kit pose id at its clock: the progress over the take (the crawl: its cycle phase). */
export function kitShotTime(id: KitPoseId, kt: number): number {
  KC.kt = kt;
  kitTimeInto(id, KC);
  return KC.time;
}

/** The gap's trend from the last gap and trend (`kitGapInto`'s rule). */
export function kitGapTrend(gap: number, last: number, trend: number): number {
  KC.gap = gap;
  KC.last = last;
  KC.trend = trend;
  kitGapInto(KC);
  return KC.trend;
}

/** The holder's phase at a gap and a trend (`kitGapInto`'s rule with the gap unchanged). */
export function kitShutterPhase(gap: number, trend: number): KitPoseId {
  KC.gap = gap;
  KC.last = gap;
  KC.trend = trend;
  return kitGapInto(KC);
}
