/**
 * Guard look variation (pure; no Babylon, no DOM, no src/net import).
 *
 * `guardVariant(seed, kind, mapId, out)` turns the per-guard 7-bit look seed (guard-models M3) into a stable look:
 * base, head variant, skin tone, hair cap and colour, headwear, eyewear, small kit, outfit and colour jitter. Every
 * pool comes from the kit data (`scripts/operators/data/guards.json`, docs/guard-models/SPEC.md section 3), read once
 * at module load, so a look can never hold an id the kind's kit lists do not. `applyGear` then folds the gameplay gear
 * (helmet, armour, plated) over it into the visible piece set (BRIEF A5, A6, A14).
 *
 * Deterministic integer hashing only (FNV-1a over the strings once, cached; murmur-style finalizer per decision), so
 * both co-op screens and a section restart give the same look. Neither function allocates after the first call for a
 * (kind, mapId) pair: all pools are built at module load, the caller owns `out`.
 */
import kitJson from '../../../scripts/operators/data/guards.json';

export type GuardBase = 'average' | 'lean' | 'broad';
export type HeadVariant =
  | 'average-1' | 'average-2' | 'average-3' | 'average-4'
  | 'lean-1' | 'lean-2' | 'lean-3' | 'lean-4'
  | 'broad-1';
export type HairCap = 'buzz' | 'crop' | 'sidepart' | 'receding' | 'fade' | 'bald';
export type HairColour = 'black' | 'darkbrown' | 'brown' | 'grey';
export type Outfit = 'uniform' | 'uniform_rolled' | 'work' | 'uniform_jacket';
export type Headwear = 'cap' | 'cap_officer' | 'beanie' | 'balaclava' | 'headset' | 'boonie';
export type Eyewear = 'glasses_clear' | 'glasses_dark';
export type GearPiece = 'helmet_std' | 'helmet_heavy' | 'vest_soft' | 'plate_heavy' | 'shield_riot';
export type KitPiece = 'radio' | 'pouch_belt' | 'holster_thigh' | 'flashlight_mount';

export const BASES: readonly GuardBase[] = ['average', 'lean', 'broad'];
export const HAIR_CAPS: readonly HairCap[] = ['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'];
export const HAIR_COLOURS: readonly HairColour[] = ['black', 'darkbrown', 'brown', 'grey'];
export const OUTFITS: readonly Outfit[] = ['uniform', 'uniform_rolled', 'work', 'uniform_jacket'];
export const HEADWEARS: readonly Headwear[] = ['cap', 'cap_officer', 'beanie', 'balaclava', 'headset', 'boonie'];
export const EYEWEARS: readonly Eyewear[] = ['glasses_clear', 'glasses_dark'];
export const GEAR_PIECES: readonly GearPiece[] = ['helmet_std', 'helmet_heavy', 'vest_soft', 'plate_heavy', 'shield_riot'];
export const KIT_PIECES: readonly KitPiece[] = ['radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount'];
export const SKIN_TONES = 4;

/* ------------------------------------------------------------------------------------------------ kit data */

interface KitPieceDef { id: string; kind: string; hidesHair?: boolean; underHelmet?: boolean }
interface KitKindDef {
  id: string; base: string; heads: string[]; hairCaps: string[]; outfit: string; headwear: string[];
  headwearOptional: boolean; headwear2: string[]; eyewear: string[]; fixedGear: string[]; gameplayGear: string[];
  helmetPiece: string | null; armourPiece: string | null; kitPool: string[];
}
interface KitData { heads: { id: string; base: string }[]; pieces: KitPieceDef[]; kinds: KitKindDef[] }

const KIT = kitJson as unknown as KitData;
const PIECE_KIND = new Map<string, string>();
const HIDES_HAIR = new Set<string>();
const UNDER_HELMET = new Set<string>();
for (const p of KIT.pieces) {
  PIECE_KIND.set(p.id, p.kind);
  if (p.hidesHair === true) HIDES_HAIR.add(p.id);
  if (p.underHelmet === true) UNDER_HELMET.add(p.id);
}

/** Head variants per base, from the kit: the open-face bases have four, the balaclava base one. */
export const HEADS: Readonly<Record<GuardBase, readonly HeadVariant[]>> = {
  average: KIT.heads.filter((h) => h.base === 'average').map((h) => h.id as HeadVariant),
  lean: KIT.heads.filter((h) => h.base === 'lean').map((h) => h.id as HeadVariant),
  broad: KIT.heads.filter((h) => h.base === 'broad').map((h) => h.id as HeadVariant),
};
export const HEAD_VARIANTS: readonly HeadVariant[] = [...HEADS.average, ...HEADS.lean, ...HEADS.broad];

/** Kit slots a variant can carry: the most fixed kit plus kit pool any kind of the kit holds (at least 4). */
export const KIT_CAPACITY = KIT.kinds.reduce((m, k) => {
  const kit = new Set([...k.fixedGear.filter((id) => PIECE_KIND.get(id) === 'kit'), ...k.kitPool]);
  return Math.max(m, kit.size);
}, 4);
/** Pieces `applyGear` can list at most (head, hair, 2 headwear, eyewear, kit, outfit, helmet, armour, fixed gear). */
export const PIECE_CAPACITY = 16;
/** Colour jitter bound (value scale, BRIEF A7). */
export const JITTER_MAX = 0.06;

export interface GuardVariant {
  base: GuardBase;
  head: HeadVariant;
  skinTone: number;
  /** 'bald' (no cap mesh) for a kind whose kit lists no hair caps (the balaclava kinds). */
  hairCap: HairCap;
  hairColour: HairColour;
  /** Main headwear from the kind's `headwear` pool, or null (hair only) when `headwearOptional`. */
  headwear: Headwear | null;
  /** Second headwear layer from the kind's `headwear2` pool (droneOp: a cap over the headset) or null. */
  headwear2: Headwear | null;
  eyewear: Eyewear | null;
  /** Fixed capacity; only the first `kitCount` entries are valid (the rest hold a filler). */
  kit: KitPiece[];
  kitCount: number;
  outfit: Outfit;
  /** Value-scale colour jitter, -JITTER_MAX..JITTER_MAX. */
  jitter: number;
}

/** The visible piece list `applyGear` fills: fixed capacity, first `count` ids valid. */
export interface GuardPieces {
  ids: string[];
  count: number;
}

export function createVariant(): GuardVariant {
  const kit: KitPiece[] = [];
  for (let i = 0; i < KIT_CAPACITY; i++) kit.push('radio');
  return {
    base: 'average',
    head: 'average-1',
    skinTone: 0,
    hairCap: 'bald',
    hairColour: 'black',
    headwear: null,
    headwear2: null,
    eyewear: null,
    kit,
    kitCount: 0,
    outfit: 'uniform',
    jitter: 0,
  };
}

export function createPieces(): GuardPieces {
  const ids: string[] = [];
  for (let i = 0; i < PIECE_CAPACITY; i++) ids.push('');
  return { ids, count: 0 };
}

export function hasPiece(p: GuardPieces, id: string): boolean {
  for (let i = 0; i < p.count; i++) if (p.ids[i] === id) return true;
  return false;
}

/* ------------------------------------------------------------------------------------------ archetype matrix */

/*
 * Only the look weights live here: they weight ids the kit lists and never add one.
 */

/** Headwear pick weights by id (a pool entry not listed weighs 4); "none" (headwearOptional) weighs NONE_W. */
const HEADWEAR_W: Readonly<Record<string, number>> = { cap: 4, cap_officer: 4, beanie: 3, balaclava: 4, headset: 4, boonie: 6 };
const NONE_W = 4;
/** Chance (percent) of the optional second headwear layer (droneOp's cap over the headset). */
const HEADWEAR2_PCT = 40;
/** Chance (percent) of eyewear from the kind's `eyewear` pool (fixed eyewear, the sniper's dark glasses, is always worn). */
const EYEWEAR_PCT = 8;
/** Chance (percent) of each kit-pool piece. */
const KIT_PCT: Readonly<Record<string, number>> = { radio: 40, pouch_belt: 40, holster_thigh: 35, flashlight_mount: 40 };
/** Hair cap weights by id: bald is allowed but rare. */
const HAIR_CAP_W: Readonly<Record<string, number>> = { buzz: 3, crop: 3, sidepart: 3, receding: 2, fade: 3, bald: 1 };
/** Hair colour weights (black, darkbrown, brown, grey). */
const HAIR_COLOUR_W: readonly number[] = [4, 4, 3, 1];
const HAIR_COLOUR_W_TOTAL = 12;

interface Profile {
  base: GuardBase;
  heads: readonly HeadVariant[];
  /** Hair cap pool and weights; empty for a face-covered kind (then 'bald': no cap mesh on that base). */
  hairCaps: readonly HairCap[];
  hairCapW: readonly number[];
  hairCapWTotal: number;
  /** Headwear pool and weights (a null entry is hair only, present when `headwearOptional`). */
  headwear: readonly (Headwear | null)[];
  headwearW: readonly number[];
  headwearWTotal: number;
  headwear2: readonly Headwear[];
  /** Eyewear in the kind's fixed gear (always worn), else a pick from `eyewear` at EYEWEAR_PCT. */
  eyewearFixed: Eyewear | null;
  eyewear: readonly Eyewear[];
  kitFixed: readonly KitPiece[];
  kitOpt: readonly KitPiece[];
  kitOptPct: readonly number[];
  outfit: Outfit;
  /** The pieces the gameplay helmet / armour bits show (kit `helmetPiece` / `armourPiece`). */
  helmetPiece: GearPiece | null;
  armourPiece: GearPiece | null;
  /** Fixed gear drawn always (plate, shield): the fixed pieces that are gear or a shield. */
  fixedShown: readonly string[];
}

function sum(w: readonly number[]): number {
  let t = 0;
  for (let i = 0; i < w.length; i++) t += w[i] as number;
  return t;
}

function profileOf(k: KitKindDef): Profile {
  const ofKind = (ids: readonly string[], kind: string) => ids.filter((id) => PIECE_KIND.get(id) === kind);
  const headwear: (Headwear | null)[] = [...(k.headwear as Headwear[])];
  const headwearW = headwear.map((id) => HEADWEAR_W[id as string] ?? 4);
  if (k.headwearOptional || headwear.length === 0) {
    headwear.push(null);
    headwearW.push(NONE_W);
  }
  const hairCaps = k.hairCaps as HairCap[];
  const hairCapW = hairCaps.map((id) => HAIR_CAP_W[id] ?? 2);
  const kitFixed = ofKind(k.fixedGear, 'kit');
  const kitOpt = k.kitPool.filter((id) => !kitFixed.includes(id));
  return {
    base: k.base as GuardBase,
    heads: k.heads as HeadVariant[],
    hairCaps,
    hairCapW,
    hairCapWTotal: sum(hairCapW),
    headwear,
    headwearW,
    headwearWTotal: sum(headwearW),
    headwear2: k.headwear2 as Headwear[],
    eyewearFixed: (ofKind(k.fixedGear, 'eyewear')[0] as Eyewear | undefined) ?? null,
    eyewear: k.eyewear as Eyewear[],
    kitFixed: kitFixed as KitPiece[],
    kitOpt: kitOpt as KitPiece[],
    kitOptPct: kitOpt.map((id) => KIT_PCT[id] ?? 40),
    outfit: k.outfit as Outfit,
    helmetPiece: k.helmetPiece as GearPiece | null,
    armourPiece: k.armourPiece as GearPiece | null,
    fixedShown: k.fixedGear.filter((id) => id !== k.helmetPiece && (PIECE_KIND.get(id) === 'gear' || PIECE_KIND.get(id) === 'shield')),
  };
}

const PROFILES = new Map<string, Profile>();
for (const k of KIT.kinds) PROFILES.set(k.id, profileOf(k));

/** Kinds without a profile (the dog, unknown strings) fall back to the grunt look; callers do not draw the dog here. */
const FALLBACK = PROFILES.get('grunt') as Profile;

/* ------------------------------------------------------------------------------------------------- hashing */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

const hashCache = new Map<string, number>();
function stringHash(s: string): number {
  let h = hashCache.get(s);
  if (h === undefined) {
    h = fnv1a(s);
    hashCache.set(s, h);
  }
  return h;
}

/** murmur3 finalizer: a well-mixed 32-bit value from a 32-bit input. */
function fmix32(x: number): number {
  let h = x | 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** The k-th independent 32-bit draw of the guard's hash. */
function draw(h: number, k: number): number {
  return fmix32((h + Math.imul(k + 1, 0x9e3779b9)) | 0);
}

/** Uniform integer 0..n-1 from a draw. */
function below(r: number, n: number): number {
  return Math.floor((r / 4294967296) * n);
}

function weighted(r: number, w: readonly number[], total: number): number {
  let t = below(r, total);
  for (let i = 0; i < w.length; i++) {
    const wi = w[i] as number;
    if (t < wi) return i;
    t -= wi;
  }
  return w.length - 1;
}

/* ------------------------------------------------------------------------------------------------- variant */

/**
 * The guard's look. `seed` is the 7-bit look seed (0-127; other values are masked), `kind` the enemy kind string,
 * `mapId` the map. Same inputs, same look, on every machine. Writes into and returns `out`.
 */
export function guardVariant(seed: number, kind: string, mapId: string, out: GuardVariant): GuardVariant {
  const p = PROFILES.get(kind) ?? FALLBACK;
  const h = fmix32(((seed & 127) + 1) ^ Math.imul(stringHash(kind), 0x27d4eb2f) ^ Math.imul(stringHash(mapId), 0x165667b1));

  out.base = p.base;
  out.head = p.heads[below(draw(h, 0), p.heads.length)] as HeadVariant;
  out.skinTone = below(draw(h, 1), SKIN_TONES);
  out.hairCap = p.hairCaps.length > 0 ? (p.hairCaps[weighted(draw(h, 2), p.hairCapW, p.hairCapWTotal)] as HairCap) : 'bald';
  out.hairColour = HAIR_COLOURS[weighted(draw(h, 3), HAIR_COLOUR_W, HAIR_COLOUR_W_TOTAL)] as HairColour;

  out.headwear = p.headwear[weighted(draw(h, 4), p.headwearW, p.headwearWTotal)] ?? null;
  out.headwear2 = p.headwear2.length > 0 && below(draw(h, 5), 100) < HEADWEAR2_PCT
    ? (p.headwear2[below(draw(h, 12), p.headwear2.length)] as Headwear)
    : null;

  if (p.eyewearFixed !== null) out.eyewear = p.eyewearFixed;
  else if (p.eyewear.length > 0 && below(draw(h, 6), 100) < EYEWEAR_PCT) out.eyewear = p.eyewear[below(draw(h, 13), p.eyewear.length)] as Eyewear;
  else out.eyewear = null;

  let n = 0;
  for (let i = 0; i < p.kitFixed.length; i++) out.kit[n++] = p.kitFixed[i] as KitPiece;
  for (let i = 0; i < p.kitOpt.length; i++) {
    if (below(draw(h, 8 + i), 100) < (p.kitOptPct[i] as number)) out.kit[n++] = p.kitOpt[i] as KitPiece;
  }
  out.kitCount = n;
  for (let i = n; i < KIT_CAPACITY; i++) out.kit[i] = 'radio'; // unused slots hold a fixed filler (whole-object determinism)

  out.outfit = p.outfit;
  out.jitter = (below(draw(h, 7), 2001) / 1000 - 1) * JITTER_MAX;
  return out;
}

/* --------------------------------------------------------------------------------------------------- gear */

/**
 * The visible piece set for the variant under the guard's gameplay gear (BRIEF A5, A6, A14; SPEC section 3). Writes
 * into `out` (fixed capacity, no allocation) and returns it.
 *  - Random variation never adds a helmet or armour. Every helmet (helmet_heavy too) is drawn only while the gameplay
 *    `helmet` bit is set (strict A5): the kind's `helmetPiece`. `armour` or `plated` show the kind's `armourPiece`.
 *  - A helmet hides the hair cap and every headwear piece whose `underHelmet` is false (the balaclava and the headset
 *    stay). With the helmet knocked off (`helmet` false) the headwear and hair come back.
 *  - Fixed gear that is gear or a shield (plate_heavy on heavy and enforcer, shield_riot on the enforcer) is always
 *    drawn.
 *  - Headwear with `hidesHair` (beanie, balaclava) hides the hair cap; caps, boonie and headset leave it.
 */
export function applyGear(v: GuardVariant, helmet: boolean, armour: boolean, plated: boolean, kind: string, out: GuardPieces): GuardPieces {
  const p = PROFILES.get(kind) ?? FALLBACK;
  const ids = out.ids;
  let n = 0;
  const helmetOn = helmet && p.helmetPiece !== null;

  ids[n++] = v.head;

  let hw: Headwear | null = v.headwear;
  let hw2: Headwear | null = v.headwear2;
  if (helmetOn) {
    if (hw !== null && !UNDER_HELMET.has(hw)) hw = null;
    if (hw2 !== null && !UNDER_HELMET.has(hw2)) hw2 = null;
  }
  const hairHidden = helmetOn || (hw !== null && HIDES_HAIR.has(hw)) || (hw2 !== null && HIDES_HAIR.has(hw2));
  if (!hairHidden && v.hairCap !== 'bald') ids[n++] = v.hairCap;
  if (hw !== null) ids[n++] = hw;
  if (hw2 !== null) ids[n++] = hw2;
  if (v.eyewear !== null) ids[n++] = v.eyewear;

  for (let i = 0; i < v.kitCount; i++) ids[n++] = v.kit[i] as string;
  ids[n++] = v.outfit;

  if (helmetOn) ids[n++] = p.helmetPiece as string;
  const armourId = (armour || plated) ? p.armourPiece : null;
  if (armourId !== null) ids[n++] = armourId;
  for (let i = 0; i < p.fixedShown.length; i++) {
    const id = p.fixedShown[i] as string;
    if (id !== armourId) ids[n++] = id;
  }

  out.count = n;
  return out;
}
