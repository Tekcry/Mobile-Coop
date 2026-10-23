/**
 * Guard look variation (pure; no Babylon, no DOM, no src/net import).
 *
 * `guardVariant(seed, kind, mapId, out)` turns the per-guard 7-bit look seed (guard-models M3) into a stable look:
 * base, head variant, skin tone, hair cap and colour, headwear, eyewear, small kit, outfit and colour jitter, by the
 * archetype matrix (docs/guard-models/PLAN.md section 4). `applyGear` then folds the gameplay gear (helmet, armour,
 * plated) over it into the visible piece set (BRIEF A5, A6, A14).
 *
 * Deterministic integer hashing only (FNV-1a over the strings once, cached; murmur-style finalizer per decision), so
 * both co-op screens and a section restart give the same look. Neither function allocates after the first call for a
 * (kind, mapId) pair: all pools are module constants, the caller owns `out`.
 */

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
/** Head variants per base: the open-face bases have four, the balaclava base one. */
export const HEADS: Readonly<Record<GuardBase, readonly HeadVariant[]>> = {
  average: ['average-1', 'average-2', 'average-3', 'average-4'],
  lean: ['lean-1', 'lean-2', 'lean-3', 'lean-4'],
  broad: ['broad-1'],
};
export const HEAD_VARIANTS: readonly HeadVariant[] = [...HEADS.average, ...HEADS.lean, ...HEADS.broad];

/** Kit slots a variant can carry (all four pieces). */
export const KIT_CAPACITY = 4;
/** Pieces `applyGear` can list at most (head, hair, 2 headwear, eyewear, 4 kit, outfit, helmet, vest / plate, shield = 13). */
export const PIECE_CAPACITY = 16;
/** Colour jitter bound (value scale, BRIEF A7). */
export const JITTER_MAX = 0.06;

export interface GuardVariant {
  base: GuardBase;
  head: HeadVariant;
  skinTone: number;
  hairCap: HairCap;
  hairColour: HairColour;
  /** Main headwear (cap, beanie, balaclava, headset, boonie, peaked cap) or null (hair only). */
  headwear: Headwear | null;
  /** Second headwear worn with a headset (droneOp: a cap over the headset) or null. */
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
  return {
    base: 'average',
    head: 'average-1',
    skinTone: 0,
    hairCap: 'bald',
    hairColour: 'black',
    headwear: null,
    headwear2: null,
    eyewear: null,
    kit: ['radio', 'radio', 'radio', 'radio'],
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

interface Profile {
  base: GuardBase;
  outfit: Outfit;
  /** Headwear pool and weights (a null entry is hair only). */
  headwear: readonly (Headwear | null)[];
  headwearW: readonly number[];
  headwearWTotal: number;
  /** Chance (percent) of a second headwear (cap) beside the main one. */
  headwear2Pct: number;
  /** Eyewear: fixed id, or a percent chance of clear glasses. */
  eyewearFixed: Eyewear | null;
  eyewearPct: number;
  kitFixed: readonly KitPiece[];
  kitOpt: readonly KitPiece[];
  kitOptPct: readonly number[];
}

function profile(p: Omit<Profile, 'headwearWTotal'>): Profile {
  let t = 0;
  for (let i = 0; i < p.headwearW.length; i++) t += p.headwearW[i] as number;
  return { ...p, headwearWTotal: t };
}

const PROFILES: Readonly<Record<string, Profile>> = {
  grunt: profile({
    base: 'average', outfit: 'uniform',
    headwear: ['cap', 'beanie', null], headwearW: [4, 2, 4], headwear2Pct: 0,
    eyewearFixed: null, eyewearPct: 8,
    kitFixed: ['radio', 'flashlight_mount'], kitOpt: ['pouch_belt', 'holster_thigh'], kitOptPct: [40, 30],
  }),
  runner: profile({
    base: 'lean', outfit: 'work',
    headwear: ['beanie', null], headwearW: [4, 6], headwear2Pct: 0,
    eyewearFixed: null, eyewearPct: 8,
    kitFixed: [], kitOpt: ['pouch_belt'], kitOptPct: [25],
  }),
  heavy: profile({
    base: 'broad', outfit: 'uniform',
    headwear: ['balaclava'], headwearW: [1], headwear2Pct: 0,
    eyewearFixed: null, eyewearPct: 0,
    kitFixed: [], kitOpt: ['pouch_belt', 'holster_thigh'], kitOptPct: [50, 30],
  }),
  sniper: profile({
    base: 'lean', outfit: 'uniform_rolled',
    headwear: ['boonie', 'cap'], headwearW: [6, 4], headwear2Pct: 0,
    eyewearFixed: 'glasses_dark', eyewearPct: 0,
    kitFixed: [], kitOpt: ['holster_thigh', 'pouch_belt'], kitOptPct: [40, 40],
  }),
  enforcer: profile({
    base: 'broad', outfit: 'uniform',
    headwear: ['balaclava'], headwearW: [1], headwear2Pct: 0,
    eyewearFixed: null, eyewearPct: 0,
    kitFixed: [], kitOpt: ['holster_thigh', 'radio'], kitOptPct: [50, 40],
  }),
  droneOp: profile({
    base: 'average', outfit: 'uniform',
    headwear: ['headset'], headwearW: [1], headwear2Pct: 40,
    eyewearFixed: null, eyewearPct: 8,
    kitFixed: ['pouch_belt'], kitOpt: ['radio'], kitOptPct: [30],
  }),
  officer: profile({
    base: 'average', outfit: 'uniform_jacket',
    headwear: ['cap_officer', null], headwearW: [8, 2], headwear2Pct: 0,
    eyewearFixed: null, eyewearPct: 8,
    kitFixed: ['radio'], kitOpt: ['holster_thigh'], kitOptPct: [30],
  }),
};

/** Kinds without a profile (the dog, unknown strings) fall back to the grunt look; callers do not draw the dog here. */
const FALLBACK = PROFILES['grunt'] as Profile;

/** Hair cap weights (buzz, crop, sidepart, receding, fade, bald): bald is allowed but rare. */
const HAIR_CAP_W: readonly number[] = [3, 3, 3, 2, 3, 1];
const HAIR_CAP_W_TOTAL = 15;
/** Hair colour weights (black, darkbrown, brown, grey). */
const HAIR_COLOUR_W: readonly number[] = [4, 4, 3, 1];
const HAIR_COLOUR_W_TOTAL = 12;

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
  const p = PROFILES[kind] ?? FALLBACK;
  const h = fmix32(((seed & 127) + 1) ^ Math.imul(stringHash(kind), 0x27d4eb2f) ^ Math.imul(stringHash(mapId), 0x165667b1));

  out.base = p.base;
  const heads = HEADS[p.base];
  out.head = heads[below(draw(h, 0), heads.length)] as HeadVariant;
  out.skinTone = below(draw(h, 1), SKIN_TONES);
  out.hairCap = HAIR_CAPS[weighted(draw(h, 2), HAIR_CAP_W, HAIR_CAP_W_TOTAL)] as HairCap;
  out.hairColour = HAIR_COLOURS[weighted(draw(h, 3), HAIR_COLOUR_W, HAIR_COLOUR_W_TOTAL)] as HairColour;

  out.headwear = p.headwear[weighted(draw(h, 4), p.headwearW, p.headwearWTotal)] ?? null;
  out.headwear2 = p.headwear2Pct > 0 && below(draw(h, 5), 100) < p.headwear2Pct ? 'cap' : null;

  out.eyewear = p.eyewearFixed ?? (p.eyewearPct > 0 && below(draw(h, 6), 100) < p.eyewearPct ? 'glasses_clear' : null);

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
 * The visible piece set for the variant under the guard's gameplay gear (BRIEF A5, A6, A14). Writes into `out`
 * (fixed capacity, no allocation) and returns it.
 *  - Random variation never adds a helmet or armour: helmet_std only for `helmet`, vest_soft only for `armour`.
 *  - A helmet replaces the headwear and hides the hair cap; a balaclava stays under it. With the helmet knocked off
 *    (`helmet` false) the headwear and hair come back.
 *  - plate_heavy for `plated` and always for heavy and enforcer (both `plated` in enemies.json; BRIEF A5: what stops a
 *    round is drawn); heavy and enforcer wear the balaclava always and helmet_heavy only while `helmet` is set (strict A5); the enforcer holds shield_riot.
 *    A plate carrier replaces the soft vest.
 *  - Beanie, balaclava and helmets hide the hair cap; caps, boonie and headset leave it.
 */
export function applyGear(v: GuardVariant, helmet: boolean, armour: boolean, plated: boolean, kind: string, out: GuardPieces): GuardPieces {
  const ids = out.ids;
  let n = 0;
  const heavy = kind === 'heavy';
  const enforcer = kind === 'enforcer';
  const heavyKit = heavy || enforcer;
  // strict A5 (lead, G0 open item): a helmet is drawn only while the gameplay helmet bit is set, for every kind
  const helmetOn = helmet;

  ids[n++] = v.head;

  let hw: Headwear | null = heavyKit ? 'balaclava' : v.headwear;
  let hw2: Headwear | null = v.headwear2;
  if (helmetOn) {
    if (hw !== 'balaclava') hw = null;
    hw2 = null;
  }
  const hairHidden = helmetOn || hw === 'balaclava' || hw === 'beanie';
  if (!hairHidden && v.hairCap !== 'bald') ids[n++] = v.hairCap;
  if (hw !== null) ids[n++] = hw;
  if (hw2 !== null) ids[n++] = hw2;
  if (v.eyewear !== null && hw !== 'balaclava') ids[n++] = v.eyewear;

  for (let i = 0; i < v.kitCount; i++) ids[n++] = v.kit[i] as string;
  ids[n++] = v.outfit;

  if (helmetOn) ids[n++] = heavyKit ? 'helmet_heavy' : 'helmet_std';
  if (heavyKit || plated) ids[n++] = 'plate_heavy';
  else if (armour) ids[n++] = 'vest_soft';
  if (enforcer) ids[n++] = 'shield_riot';

  out.count = n;
  return out;
}
