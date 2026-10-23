/**
 * Guard kit data types and validator (guard-models G0, docs/guard-models/SPEC.md). Pure, no Babylon.
 *
 * The data lives in `scripts/operators/data/guards.json` (read by the bake scripts and by the runtime). The ids are
 * the shared id contract (SPEC section 2); `validateGuardKit` checks the contract, every reference, the budgets of
 * PLAN section 5 and the face rules, and returns readable problems (empty = valid).
 */

export const GUARD_KINDS = ['grunt', 'runner', 'heavy', 'sniper', 'enforcer', 'droneOp', 'officer'] as const;
export type GuardKind = (typeof GUARD_KINDS)[number];
export const GUARD_BASES = ['average', 'lean', 'broad'] as const;
export type GuardBaseId = (typeof GUARD_BASES)[number];

/** Triangles per LOD: [LOD0, LOD1, LOD2]. */
export type Tris = [number, number, number];
/** Texel rectangle [w, h] in the LOD0 atlas (LOD1 half, LOD2 quarter). */
export type Texels = [number, number];
export type Vec3 = [number, number, number];

export type TintSlot = 'uniform' | 'kit' | 'headwear' | 'hair' | 'skin' | 'none';
export type PieceKind = 'headwear' | 'eyewear' | 'gear' | 'kit' | 'outfit' | 'shield';
export type PieceFit = 'cloth' | 'membrane' | 'headEnvelope' | 'face' | 'torsoShell' | 'rigid' | 'held';
export type FacialHair = 'clean' | 'stubble' | 'beard';

export interface GuardBase {
  id: string;
  refHeight: number;
  build: string;
  /** MakeHuman macro sliders as `py/mh.py` `macro()` takes them (gender 1 = male). */
  macro: { gender: number; muscle: number; weight: number; proportions: number };
  kinds: string[];
  bodyTris: Tris;
  bodyTexels: Texels;
  /** The four 1024 face tiles of this base's atlas: head ids, or piece ids drawn there (broad). */
  faceTiles: string[];
  /** Per-base anchor offsets (m) for the carry slots; 0 until G7 measures the carry poses. */
  mounts: Record<string, Vec3>;
}

export interface GuardHead {
  id: string;
  base: string;
  tris: Tris;
  iris: string;
  facialHair: FacialHair;
  look: string;
  /** MakeHuman face targets (paths under MPFB2 data/) and weights in (0, 1]. */
  targets: Record<string, number>;
}

export interface HairCap {
  id: string;
  tris: Tris;
  texels: Texels;
  /** Shell offset over the scalp (m). */
  offset: number;
  look: string;
}

export interface ColourDef {
  id: string | number;
  rgb: Vec3;
}

export interface GuardPiece {
  id: string;
  kind: PieceKind;
  tris: Tris;
  texels: Texels;
  tint: TintSlot;
  /** Declared bones (rigid kit); empty for cloth (skinned like the body). */
  bones: string[];
  fit: PieceFit;
  look: string;
  /** Headwear: the hair cap is hidden while this is worn. */
  hidesHair?: boolean;
  /** Headwear: stays shown under a helmet. */
  underHelmet?: boolean;
  /** Its own GLB (the riot shield), outside the base's buffer. */
  ownGlb?: boolean;
}

export interface GuardKindDef {
  id: string;
  base: string;
  /** The kind's height in `src/config/enemies.json` (the figure scales from the base's reference height). */
  height: number;
  heads: string[];
  hairCaps: string[];
  outfit: string;
  /** 'faction': the uniform slot takes the faction palette (A7); 'kind': the kind's own colour (runner A11, officer). */
  uniformTint: 'faction' | 'kind';
  headwear: string[];
  headwearOptional: boolean;
  /** A second headwear layer picked on top (droneOp: cap over the headset), always optional. */
  headwear2: string[];
  eyewear: string[];
  fixedGear: string[];
  gameplayGear: string[];
  /** The piece the helmet / armour gameplay state shows (A5). */
  helmetPiece: string | null;
  armourPiece: string | null;
  kitPool: string[];
  faceCovered: boolean;
}

export interface GuardKit {
  version: number;
  lod: { near: number; far: number; hysteresis: number };
  atlas: { lod0: [number, number]; left: number; faceTile: Tris; faceTiles: number };
  bones: { rig: string[]; fingers: string[]; fingerParent: Record<string, string>; influences: Tris };
  tintSlots: string[];
  tintNeutral: { fabric: number; skin: number; hair: number };
  tintJitter: number;
  face: {
    neckSeam: { joint: string; at: number; blendLoops: number };
    envelopeOffset: number;
    eyes: { tris: Tris; texels: Texels };
    irises: string[];
    facialHair: string[];
  };
  bases: GuardBase[];
  heads: GuardHead[];
  hairCaps: HairCap[];
  hairColours: ColourDef[];
  skinTones: ColourDef[];
  pieces: GuardPiece[];
  kinds: GuardKindDef[];
}

/** The shared id contract (guard-models gm-common): the data must hold exactly these ids. */
export const GUARD_CONTRACT = {
  hairCaps: ['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'],
  hairColours: ['black', 'darkbrown', 'brown', 'grey'],
  skinTones: [0, 1, 2, 3],
  outfit: ['uniform', 'uniform_rolled', 'work', 'uniform_jacket'],
  headwear: ['cap', 'cap_officer', 'beanie', 'balaclava', 'headset', 'boonie'],
  eyewear: ['glasses_clear', 'glasses_dark'],
  gear: ['helmet_std', 'helmet_heavy', 'vest_soft', 'plate_heavy'],
  shield: ['shield_riot'],
  kit: ['radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount'],
} as const;

export const HEADS_PER_BASE: Readonly<Record<GuardBaseId, number>> = { average: 4, lean: 4, broad: 1 };

/** PLAN section 5 limits. */
export const GUARD_LIMITS = {
  shown: [20000, 7000, 2800] as Tris,
  buffer: [45000, 14000, 5000] as Tris,
  head: [4000, 1200, 400] as Tris,
  eyesLod0: 500,
  hairCapLod0: 1000,
  hairCapLod1: 300,
  rigBones: 23,
  fingerBones: 10,
  /** Max LOD0 triangles per piece id class. */
  pieceLod0: { headwear: 600, helmet: 1200, vest_soft: 1800, plate_heavy: 2600, shield: 800 },
  /** Height scale from the base's reference height (A2). */
  heightTolerance: 0.02,
} as const;

/** Face targets: face regions only, so every head of a base shares the cranium (one hair cap mesh and one envelope). */
const FACE_TARGET = /^targets\/(cheek|chin|ears|eyebrows|eyes|forehead|mouth|nose)\/[a-z0-9-]+\.target\.gz$/;

const isPow2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
const inUnit = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1;

function pieceLimit(p: GuardPiece): number | null {
  const L = GUARD_LIMITS.pieceLod0;
  if (p.kind === 'headwear') return L.headwear;
  if (p.kind === 'shield') return L.shield;
  if (p.id.startsWith('helmet_')) return L.helmet;
  if (p.id === 'vest_soft') return L.vest_soft;
  if (p.id === 'plate_heavy') return L.plate_heavy;
  return null;
}

function sameSet(a: readonly (string | number)[], b: readonly (string | number)[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return s.size === a.length && b.every((x) => s.has(x));
}

/** Worst-case shown triangles for a kind at a LOD: the largest pick from every pool, every fixed, gameplay and kit piece. */
export function shownTris(kit: GuardKit, kind: GuardKindDef, lod: 0 | 1 | 2): number {
  const piece = new Map(kit.pieces.map((p) => [p.id, p]));
  const cap = new Map(kit.hairCaps.map((c) => [c.id, c]));
  const head = new Map(kit.heads.map((h) => [h.id, h]));
  const base = kit.bases.find((b) => b.id === kind.base);
  const t = (id: string) => piece.get(id)?.tris[lod] ?? 0;
  const max = (ids: string[], f: (id: string) => number) => ids.reduce((m, id) => Math.max(m, f(id)), 0);
  let n = (base?.bodyTris[lod] ?? 0) + t(kind.outfit);
  n += max(kind.heads, (id) => head.get(id)?.tris[lod] ?? 0) + kit.face.eyes.tris[lod];
  n += max(kind.hairCaps, (id) => cap.get(id)?.tris[lod] ?? 0);
  n += max(kind.headwear, t) + max(kind.headwear2, t) + max(kind.eyewear, t);
  for (const id of new Set([...kind.fixedGear, ...kind.gameplayGear, ...kind.kitPool])) n += t(id);
  return n;
}

/** Triangles in a base's buffer at a LOD: body, every head (+ eyes), every cap and every piece its kinds can show. */
export function bufferTris(kit: GuardKit, baseId: string, lod: 0 | 1 | 2): number {
  const base = kit.bases.find((b) => b.id === baseId);
  if (!base) return 0;
  const kinds = kit.kinds.filter((k) => k.base === baseId);
  const caps = new Set<string>();
  const pieces = new Set<string>();
  for (const k of kinds) {
    for (const c of k.hairCaps) caps.add(c);
    for (const id of [k.outfit, ...k.headwear, ...k.headwear2, ...k.eyewear, ...k.fixedGear, ...k.gameplayGear, ...k.kitPool]) pieces.add(id);
  }
  let n = base.bodyTris[lod];
  for (const h of kit.heads) if (h.base === baseId) n += h.tris[lod] + kit.face.eyes.tris[lod];
  for (const c of kit.hairCaps) if (caps.has(c.id)) n += c.tris[lod];
  for (const p of kit.pieces) if (pieces.has(p.id) && !p.ownGlb) n += p.tris[lod];
  return n;
}

/** Every problem in the kit, as readable lines. Empty means the kit is valid. */
export function validateGuardKit(kit: GuardKit): string[] {
  const err: string[] = [];
  const LODS = [0, 1, 2] as const;

  // Unique ids (string ids share one namespace: bases, heads, caps, colours, pieces, kinds may not collide).
  const seen = new Set<string>();
  const uniq = (list: { id: string | number }[], what: string) => {
    for (const x of list) {
      const key = `${typeof x.id === 'number' ? 'tone:' : ''}${x.id}`;
      if (seen.has(key)) err.push(`${what} ${x.id}: duplicate id`);
      seen.add(key);
    }
  };
  uniq(kit.bases, 'base');
  uniq(kit.heads, 'head');
  uniq(kit.hairCaps, 'hairCap');
  uniq(kit.hairColours.map((c) => ({ id: `colour:${c.id}` })), 'hairColour');
  uniq(kit.skinTones, 'skinTone');
  uniq(kit.pieces, 'piece');
  uniq(kit.kinds.map((k) => ({ id: `kind:${k.id}` })), 'kind');

  // Contract ids.
  const C = GUARD_CONTRACT;
  const ids = (list: { id: string | number }[]) => list.map((x) => x.id);
  if (!sameSet(ids(kit.bases), GUARD_BASES)) err.push(`bases: ids must be ${GUARD_BASES.join(', ')}`);
  if (!sameSet(ids(kit.hairCaps), C.hairCaps)) err.push(`hairCaps: ids must be ${C.hairCaps.join(', ')}`);
  if (!sameSet(ids(kit.hairColours), C.hairColours)) err.push(`hairColours: ids must be ${C.hairColours.join(', ')}`);
  if (!sameSet(ids(kit.skinTones), C.skinTones)) err.push(`skinTones: ids must be 0-3`);
  for (const pk of ['outfit', 'headwear', 'eyewear', 'gear', 'shield', 'kit'] as const) {
    const got = kit.pieces.filter((p) => p.kind === pk).map((p) => p.id);
    if (!sameSet(got, C[pk])) err.push(`pieces (${pk}): ids must be ${C[pk].join(', ')}, got ${got.join(', ')}`);
  }
  const kindIds = kit.kinds.map((k) => k.id);
  for (const k of GUARD_KINDS) if (!kindIds.includes(k)) err.push(`kind ${k}: missing`);
  for (const k of kindIds) if (!(GUARD_KINDS as readonly string[]).includes(k)) err.push(`kind ${k}: not a guard kind (the dog keeps its model)`);

  // Bones.
  const bones = new Set([...kit.bones.rig, ...kit.bones.fingers]);
  if (kit.bones.rig.length !== GUARD_LIMITS.rigBones) err.push(`bones: ${kit.bones.rig.length} rig joints, need ${GUARD_LIMITS.rigBones}`);
  if (kit.bones.fingers.length !== GUARD_LIMITS.fingerBones) err.push(`bones: ${kit.bones.fingers.length} finger bones, need ${GUARD_LIMITS.fingerBones}`);
  if (bones.size !== kit.bones.rig.length + kit.bones.fingers.length) err.push('bones: duplicate bone name');
  for (const [prefix, parent] of Object.entries(kit.bones.fingerParent)) {
    if (!kit.bones.rig.includes(parent)) err.push(`bones: finger parent ${parent} of ${prefix} is not a rig joint`);
  }

  // Colours.
  const colour = (c: ColourDef, what: string) => {
    if (c.rgb.length !== 3 || !c.rgb.every(inUnit)) err.push(`${what} ${c.id}: rgb must be 3 linear values in [0, 1]`);
  };
  for (const c of kit.hairColours) colour(c, 'hairColour');
  for (const c of kit.skinTones) colour(c, 'skinTone');
  const slots = new Set(kit.tintSlots);

  // Bases.
  const baseById = new Map(kit.bases.map((b) => [b.id, b]));
  const headById = new Map(kit.heads.map((h) => [h.id, h]));
  const capById = new Map(kit.hairCaps.map((c) => [c.id, c]));
  const pieceById = new Map(kit.pieces.map((p) => [p.id, p]));
  const kindById = new Map(kit.kinds.map((k) => [k.id, k]));
  for (const b of kit.bases) {
    const m = b.macro;
    if (m.gender !== 1) err.push(`base ${b.id}: macro gender must be 1 (all guards male)`);
    for (const key of ['muscle', 'weight', 'proportions'] as const) if (!inUnit(m[key])) err.push(`base ${b.id}: macro ${key} out of [0, 1]`);
    for (const k of b.kinds) if (kindById.get(k)?.base !== b.id) err.push(`base ${b.id}: kind ${k} does not use this base`);
    const heads = kit.heads.filter((h) => h.base === b.id);
    const want = HEADS_PER_BASE[b.id as GuardBaseId];
    if (want !== undefined && heads.length !== want) err.push(`base ${b.id}: ${heads.length} head variants, need ${want}`);
    if (b.faceTiles.length > kit.atlas.faceTiles) err.push(`base ${b.id}: ${b.faceTiles.length} face tiles, max ${kit.atlas.faceTiles}`);
    for (const h of heads) if (!b.faceTiles.includes(h.id)) err.push(`base ${b.id}: head ${h.id} has no face tile`);
    for (const t of b.faceTiles) {
      const h = headById.get(t);
      if (h ? h.base !== b.id : !pieceById.has(t)) err.push(`base ${b.id}: face tile ${t} is not a head of this base or a piece`);
    }
  }

  // Heads.
  const irises = new Set(kit.face.irises);
  const hair = new Set(kit.face.facialHair);
  for (const h of kit.heads) {
    if (!baseById.has(h.base)) err.push(`head ${h.id}: unknown base ${h.base}`);
    if (!irises.has(h.iris)) err.push(`head ${h.id}: unknown iris ${h.iris}`);
    if (!hair.has(h.facialHair)) err.push(`head ${h.id}: unknown facial hair ${h.facialHair}`);
    LODS.forEach((l) => {
      if (h.tris[l] > GUARD_LIMITS.head[l]) err.push(`head ${h.id}: LOD${l} ${h.tris[l]} tris over ${GUARD_LIMITS.head[l]}`);
    });
    const targets = Object.entries(h.targets);
    if (targets.length < 4) err.push(`head ${h.id}: needs at least 4 face targets`);
    for (const [path, w] of targets) {
      if (!FACE_TARGET.test(path)) err.push(`head ${h.id}: target ${path} is not a face-region target (no head/ shape targets: the cranium is shared)`);
      if (!(w > 0 && w <= 1)) err.push(`head ${h.id}: target ${path} weight ${w} out of (0, 1]`);
    }
  }
  if (kit.face.eyes.tris[0] > GUARD_LIMITS.eyesLod0) err.push(`eyes: LOD0 ${kit.face.eyes.tris[0]} tris over ${GUARD_LIMITS.eyesLod0}`);

  // Hair caps.
  for (const c of kit.hairCaps) {
    if (c.tris[0] > GUARD_LIMITS.hairCapLod0) err.push(`hairCap ${c.id}: LOD0 ${c.tris[0]} tris over ${GUARD_LIMITS.hairCapLod0}`);
    if (c.tris[1] > GUARD_LIMITS.hairCapLod1) err.push(`hairCap ${c.id}: LOD1 ${c.tris[1]} tris over ${GUARD_LIMITS.hairCapLod1}`);
    if (c.tris[2] !== 0) err.push(`hairCap ${c.id}: LOD2 must be 0 (hair in the albedo)`);
    if (c.offset > kit.face.envelopeOffset) err.push(`hairCap ${c.id}: offset ${c.offset} m outside the head envelope ${kit.face.envelopeOffset} m`);
    if (c.id === 'bald' ? c.tris[0] !== 0 : c.tris[0] <= 0) err.push(`hairCap ${c.id}: ${c.id === 'bald' ? 'bald has no mesh' : 'no triangles'}`);
  }

  // Pieces.
  for (const p of kit.pieces) {
    if (!slots.has(p.tint)) err.push(`piece ${p.id}: unknown tint slot ${p.tint}`);
    if (!p.look.trim()) err.push(`piece ${p.id}: no design line`);
    if (p.fit === 'cloth' ? p.bones.length !== 0 : p.bones.length === 0) err.push(`piece ${p.id}: ${p.fit === 'cloth' ? 'cloth is skinned like the body (no declared bones)' : 'declares no bones'}`);
    for (const bn of p.bones) if (!bones.has(bn)) err.push(`piece ${p.id}: unknown bone ${bn}`);
    if (!(p.tris[0] >= p.tris[1] && p.tris[1] >= p.tris[2] && p.tris[2] >= 0)) err.push(`piece ${p.id}: LOD tris must not grow`);
    const lim = pieceLimit(p);
    if (lim !== null && p.tris[0] > lim) err.push(`piece ${p.id}: LOD0 ${p.tris[0]} tris over ${lim}`);
    if (!p.texels.every((v) => isPow2(v) && v <= kit.atlas.left)) err.push(`piece ${p.id}: texels must be powers of two <= ${kit.atlas.left}`);
    if (p.kind === 'headwear' && (p.hidesHair === undefined || p.underHelmet === undefined)) err.push(`piece ${p.id}: headwear needs hidesHair and underHelmet`);
  }

  // Kinds.
  const ofKind = (id: string, kinds: PieceKind[]) => {
    const p = pieceById.get(id);
    return p !== undefined && kinds.includes(p.kind);
  };
  for (const k of kit.kinds) {
    const tag = `kind ${k.id}`;
    const base = baseById.get(k.base);
    if (!base) err.push(`${tag}: unknown base ${k.base}`);
    else {
      if (!base.kinds.includes(k.id)) err.push(`${tag}: base ${k.base} does not list it`);
      if (Math.abs(k.height / base.refHeight - 1) > GUARD_LIMITS.heightTolerance) err.push(`${tag}: height ${k.height} more than 2% from base ${k.base} (${base.refHeight})`);
    }
    if (k.heads.length === 0) err.push(`${tag}: no heads`);
    for (const h of k.heads) {
      const head = headById.get(h);
      if (!head) err.push(`${tag}: unknown head ${h}`);
      else if (head.base !== k.base) err.push(`${tag}: head ${h} belongs to base ${head.base}`);
    }
    for (const c of k.hairCaps) if (!capById.has(c)) err.push(`${tag}: unknown hair cap ${c}`);
    if (!ofKind(k.outfit, ['outfit'])) err.push(`${tag}: unknown outfit ${k.outfit}`);
    for (const id of [...k.headwear, ...k.headwear2]) if (!ofKind(id, ['headwear'])) err.push(`${tag}: unknown headwear ${id}`);
    for (const id of k.eyewear) if (!ofKind(id, ['eyewear'])) err.push(`${tag}: unknown eyewear ${id}`);
    for (const id of k.fixedGear) if (!pieceById.has(id) || ofKind(id, ['outfit'])) err.push(`${tag}: unknown fixed gear ${id}`);
    for (const id of k.gameplayGear) if (!ofKind(id, ['gear'])) err.push(`${tag}: unknown gameplay gear ${id}`);
    for (const id of k.kitPool) if (!ofKind(id, ['kit'])) err.push(`${tag}: unknown kit ${id}`);
    const worn = new Set([...k.fixedGear, ...k.gameplayGear]);
    for (const id of [k.helmetPiece, k.armourPiece]) if (id !== null && !worn.has(id)) err.push(`${tag}: gameplay piece ${id} is not in its fixed or gameplay gear`);
    if (k.faceCovered !== (k.headwear.length > 0 && !k.headwearOptional && k.headwear.every((h) => h === 'balaclava'))) {
      err.push(`${tag}: faceCovered must match an always-worn balaclava`);
    }
    LODS.forEach((l) => {
      const n = shownTris(kit, k, l);
      if (n > GUARD_LIMITS.shown[l]) err.push(`${tag}: LOD${l} shown ${n} tris over ${GUARD_LIMITS.shown[l]}`);
    });
  }

  // Per-base buffer and atlas.
  for (const b of kit.bases) {
    LODS.forEach((l) => {
      const n = bufferTris(kit, b.id, l);
      if (n > GUARD_LIMITS.buffer[l]) err.push(`base ${b.id}: LOD${l} buffer ${n} tris over ${GUARD_LIMITS.buffer[l]}`);
    });
    const used = new Set<string>();
    for (const k of kit.kinds) {
      if (k.base !== b.id) continue;
      for (const id of [k.outfit, ...k.headwear, ...k.headwear2, ...k.eyewear, ...k.fixedGear, ...k.gameplayGear, ...k.kitPool, ...k.hairCaps]) used.add(id);
    }
    let area = b.bodyTexels[0] * b.bodyTexels[1] + kit.face.eyes.texels[0] * kit.face.eyes.texels[1];
    for (const p of kit.pieces) if (used.has(p.id) && !p.ownGlb && !b.faceTiles.includes(p.id)) area += p.texels[0] * p.texels[1];
    for (const c of kit.hairCaps) if (used.has(c.id)) area += c.texels[0] * c.texels[1];
    if (area > kit.atlas.left * kit.atlas.left) err.push(`base ${b.id}: left atlas needs ${area} texels, has ${kit.atlas.left * kit.atlas.left}`);
  }
  return err;
}
