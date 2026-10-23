/**
 * (guard-models G5) The guard figure's piece mask, pure (no Babylon). A guard base's LOD file is ONE skinned mesh with
 * ONE material (PLAN section 2, A3); every vertex carries a static piece index (`_PIECE`, uint8, into the manifest's
 * `pieces`) and a tint slot (`_TINT`, uint8). Per guard the runtime keeps one RGBA8 normalised vertex buffer `gvis`
 * per LOD: rgb = the tint of the vertex's slot (sRGB bytes; the plugin multiplies the albedo by it where the atlas tint
 * mask is set), a = piece visible (0 = hidden) with the hit flash folded in (255 = no flash, 1 = full flash; never 0
 * while visible). Hidden pieces also leave the guard's index buffer (`visibleIndices`), so no pass draws them (the
 * shadow maps and the G-buffer do not run material plugins; G5-REPORT).
 *
 * Ids follow the guard-models shared id contract (gm-common.md); G0's kit data (`guardKit.ts`) is the source of truth
 * for which pieces a base's file holds, in `_PIECE` order (the manifest written by G4's bake).
 */

/** Body bases (A2). The base's own id is also the body piece (skin, hands, neck) in its file. */
export const GUARD_BASES = ['average', 'lean', 'broad'] as const;
export type GuardBase = (typeof GUARD_BASES)[number];

/** Head variants per base (M1; `broad-1` is the balaclava eye region). */
export const HEAD_VARIANTS = ['average-1', 'average-2', 'average-3', 'average-4', 'lean-1', 'lean-2', 'lean-3', 'lean-4', 'broad-1'] as const;
/** Hair caps with a mesh (`bald` has none: the scalp is in the face tile). */
export const HAIR_CAPS = ['buzz', 'crop', 'sidepart', 'receding', 'fade'] as const;
export const HAIR_STYLES = [...HAIR_CAPS, 'bald'] as const;
export const HAIR_COLOURS = ['black', 'darkbrown', 'brown', 'grey'] as const;
export const OUTFITS = ['uniform', 'uniform_rolled', 'work', 'uniform_jacket'] as const;
export const HEADWEAR = ['cap', 'cap_officer', 'beanie', 'balaclava', 'headset', 'boonie'] as const;
export const EYEWEAR = ['glasses_clear', 'glasses_dark'] as const;
/** Gameplay gear baked into the body file (A5); the riot shield is its own GLB (`SHIELD_ID`), not a piece. */
export const GAMEPLAY_GEAR = ['helmet_std', 'helmet_heavy', 'vest_soft', 'plate_heavy'] as const;
export const SHIELD_ID = 'shield_riot';
export const SMALL_KIT = ['radio', 'pouch_belt', 'holster_thigh', 'flashlight_mount'] as const;

const PIECE_IDS: ReadonlySet<string> = new Set<string>([
  ...GUARD_BASES, ...HEAD_VARIANTS, ...HAIR_CAPS, ...OUTFITS, ...HEADWEAR, ...EYEWEAR, ...GAMEPLAY_GEAR, ...SMALL_KIT,
]);

/** Is `id` a piece a guard body file may hold (contract ids only)? */
export function isGuardPieceId(id: string): boolean {
  return PIECE_IDS.has(id);
}

/** `_PIECE` is uint8. */
export const MAX_PIECES = 256;
/** `_TINT` is uint8. */
export const MAX_TINT_SLOTS = 256;

/**
 * One guard base's files and piece list (G4 writes it beside the LODs; the stand-in builds one from Wren's files).
 * URLs are indexed like the operator manifest (`LOD_HERO`..`LOD_2`); guards have no hero, so `urls[0]` is ''.
 */
export interface GuardManifest {
  /** File stem, `guard-<base>` (the stand-in: `guard-standin-<base>`). Keys the per-scene shared buffers. */
  id: string;
  base: GuardBase;
  urls: readonly [string, string, string, string];
  /** `_PIECE` value i is `pieces[i]` (same list in every LOD of the base). */
  pieces: readonly string[];
  /** Tint slots: `_TINT` values run 0..tintSlots-1; the per-guard tint table holds rgb bytes per slot. */
  tintSlots: number;
  /** The base's bind height (m): a guard's figure scales uniformly to its def height (A2). */
  refHeight: number;
}

/** Problems that stop a guard manifest from being used (empty = usable). */
export function validateGuardManifest(m: GuardManifest): string[] {
  const out: string[] = [];
  if (m.urls[0]) out.push(`${m.id}: guards have no hero LOD`);
  for (let i = 1; i <= 3; i++) if (!m.urls[i]) out.push(`${m.id}: lod${i - 1} missing`);
  if (!m.pieces.length) out.push(`${m.id}: no pieces`);
  if (m.pieces.length > MAX_PIECES) out.push(`${m.id}: ${m.pieces.length} pieces (max ${MAX_PIECES})`);
  const seen = new Set<string>();
  for (const p of m.pieces) {
    if (!isGuardPieceId(p)) out.push(`${m.id}: piece ${p} is not a contract id`);
    if (seen.has(p)) out.push(`${m.id}: piece ${p} twice`);
    seen.add(p);
  }
  if (m.tintSlots < 1 || m.tintSlots > MAX_TINT_SLOTS) out.push(`${m.id}: ${m.tintSlots} tint slots`);
  if (!(m.refHeight > 0)) out.push(`${m.id}: no reference height`);
  return out;
}

/** Wren's height (G74): the stand-in's reference height. */
const WREN_HEIGHT = 1.68;

/**
 * The stand-in until G4's guard files exist: Wren's LOD files (no hero) drawn as a guard base whose every vertex is
 * the one body piece (piece 0 = the base id) in tint slot 0. `wrenUrls` is Wren's operator manifest's `urls`.
 */
export function guardStandInManifest(base: GuardBase, wrenUrls: readonly [string, string, string, string]): GuardManifest {
  return { id: `guard-standin-${base}`, base, urls: ['', wrenUrls[1], wrenUrls[2], wrenUrls[3]], pieces: [base], tintSlots: 1, refHeight: WREN_HEIGHT };
}

// ---- the mask (no allocation after load) ----

const VIS = new Uint8Array(MAX_PIECES);

/** out[i] = 1 when `pieces[i]` is in `visible`, else 0 (no allocation). */
export function pieceMask(pieces: readonly string[], visible: ReadonlySet<string>, out: Uint8Array): void {
  for (let i = 0; i < pieces.length; i++) out[i] = visible.has(pieces[i]!) ? 1 : 0;
}

/** The alpha byte of a visible vertex at flash `k` (0..1): 255 unflashed, 1 at the full flash (0 means hidden). */
export function visibleAlpha(k: number): number {
  const f = k > 0 ? (k < 1 ? k : 1) : 0;
  return 255 - Math.round(f * 254);
}

/**
 * Fills `out` (RGBA8 per vertex) from the per-piece visibility `vis` and the tint table `tints` (rgb bytes per slot):
 * rgb = the vertex's slot tint, a = `visibleAlpha(flash)` or 0 when its piece is hidden. Writes only bytes that change;
 * returns true when any did (false: nothing to upload). No allocation.
 */
export function fillGvis(vertexPiece: Uint8Array, vertexTint: Uint8Array, vis: Uint8Array, tints: Uint8Array, flash: number, out: Uint8Array): boolean {
  const a1 = visibleAlpha(flash);
  const slots = (tints.length / 3) | 0;
  let changed = false;
  const n = vertexPiece.length;
  for (let v = 0; v < n; v++) {
    const t = vertexTint[v]!;
    const s = (t < slots ? t : 0) * 3;
    const r = tints[s] ?? 255, g = tints[s + 1] ?? 255, b = tints[s + 2] ?? 255;
    const a = vis[vertexPiece[v]!] === 1 ? a1 : 0;
    const o = v * 4;
    if (out[o] !== r || out[o + 1] !== g || out[o + 2] !== b || out[o + 3] !== a) {
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
      changed = true;
    }
  }
  return changed;
}

/**
 * The G5 contract call: (piece ids of the mesh, per-vertex piece index, visible piece set, tint table) -> `gvis` in
 * place. `vertexTint` gives each vertex's tint slot; `flash` the hit flash 0..1. Returns true when a byte changed.
 * No allocation (a module scratch holds the per-piece mask).
 */
export function gearMask(
  pieceIds: readonly string[], vertexPiece: Uint8Array, vertexTint: Uint8Array, visible: ReadonlySet<string>, tints: Uint8Array,
  out: Uint8Array, flash = 0,
): boolean {
  pieceMask(pieceIds, visible, VIS);
  return fillGvis(vertexPiece, vertexTint, VIS, tints, flash, out);
}

// ---- hidden pieces leave the index buffer ----

/** A LOD primitive's triangles grouped by piece (load time): piece p's indices are `indices[start[p]..start[p + 1])`. */
export interface PieceGroups {
  indices: Uint16Array | Uint32Array;
  start: Int32Array;
}

/**
 * Groups `indices` by the piece of each triangle's first vertex (a piece is its own mesh island in the bake), stable
 * within a piece. Load time (allocates). 16-bit when the vertex count allows.
 */
export function groupByPiece(indices: ArrayLike<number>, vertexPiece: Uint8Array, pieceCount: number): PieceGroups {
  const tris = (indices.length / 3) | 0;
  const count = new Int32Array(pieceCount + 1);
  for (let t = 0; t < tris; t++) {
    const p = vertexPiece[indices[t * 3]!]!;
    count[(p < pieceCount ? p : 0) + 1]!++;
  }
  const start = new Int32Array(pieceCount + 1);
  for (let p = 0; p < pieceCount; p++) start[p + 1] = start[p]! + count[p + 1]! * 3;
  const out = vertexPiece.length > 65535 ? new Uint32Array(tris * 3) : new Uint16Array(tris * 3);
  const at = start.slice(0, pieceCount);
  for (let t = 0; t < tris; t++) {
    const p0 = vertexPiece[indices[t * 3]!]!;
    const p = p0 < pieceCount ? p0 : 0;
    const o = at[p]!;
    out[o] = indices[t * 3]!; out[o + 1] = indices[t * 3 + 1]!; out[o + 2] = indices[t * 3 + 2]!;
    at[p] = o + 3;
  }
  return { indices: out, start };
}

/** Writes the visible pieces' index ranges to the front of `out`; returns the index count. No allocation. */
export function visibleIndices(g: PieceGroups, vis: Uint8Array, out: Uint16Array | Uint32Array): number {
  let n = 0;
  const src = g.indices;
  const pieces = g.start.length - 1;
  for (let p = 0; p < pieces; p++) {
    if (vis[p] !== 1) continue;
    const e = g.start[p + 1]!;
    for (let i = g.start[p]!; i < e; i++) out[n++] = src[i]!;
  }
  return n;
}
