// Pure layout half of the guard LOD bake (guard-models G4; docs/guard-models/PLAN.md section 3 G4, SPEC sections 4, 5,
// 7 "Atlas and face tiles", 8). No fs, no Blender: from the kit data alone it gives a base's
//  - piece order (`_PIECE` value i = pieces[i], the runtime manifest's `pieces`, GuardManifest in gearMask.ts),
//  - garment parts per outfit with their triangle budgets (an outfit is several cloth parts, G2; a part two outfits of
//    a base share, like lean's boots, is baked once and copied once per outfit piece),
//  - the atlas: LOD0 4096 x 2048, left 2048 square skyline-packed (body, garment parts, hair caps, eye block and every
//    gear / headwear / eyewear / kit piece the base uses), right 2048 square the four 1024 face tiles in the base's
//    `faceTiles` order; LOD1 the same layout at 1/2, LOD2 at 1/8 (512 x 256); normal and ORM at half the albedo size.
// bake_lods.py guard mode (bake_guard.py) reads the layout JSON guard-lods.mjs writes from this.
import { normalizeKit } from './guardBakePlan.mjs';

export const LAYOUT_VERSION = 1;
/** Albedo atlas per LOD [w, h] (PLAN section 5); normal / ORM are half of each side. */
export const ATLAS = [[4096, 2048], [2048, 1024], [512, 256]];
/** LOD1 / LOD2 layout scale against LOD0 (the atlas width ratio). */
export const LOD_SCALE = [1, 0.5, 0.125];
/** Left half (square) and face tiles at LOD0. */
export const LEFT = 2048;
export const TILE = 1024;
/** Face tile i at LOD0, pixels from the image's left and bottom edge (Blender image order: row 0 at v = 0). */
export const TILE_ORIGIN = [[2048, 0], [3072, 0], [2048, 1024], [3072, 1024]];
/** Empty pixels round every left-half rect at LOD0 (1 px at LOD2): bake margins never bleed into a neighbour. */
export const GUTTER = 8;
/** Rect sides are multiples of this at LOD0, so LOD2 (1/8) stays on whole pixels. */
export const QUANTUM = 16;

/**
 * Share of an outfit's triangles and texels per garment part (the parts' rough surface areas; normalised per outfit).
 * A part shared by two outfits of a base takes the smaller triangle budget and the larger texel area of the two.
 */
export const PART_SHARE = {
  shirt: 0.40, shirt_rolled: 0.34, trousers: 0.36, work_trousers: 0.36, boots: 0.14, gloves: 0.10, work_gloves: 0.10,
  jacket: 0.44, work_jacket: 0.44,
};
const DEFAULT_SHARE = 0.25;

const byId = (list, id) => list.find((x) => x.id === id);
const q = (n) => Math.max(QUANTUM, Math.round(n / QUANTUM) * QUANTUM);

/** The kit pieces (not outfits, not own-GLB) a base's kinds can show, in kit order. */
export function basePieceIds(kit, baseId) {
  const kinds = kit.kinds.filter((k) => k.base === baseId);
  const used = new Set();
  for (const k of kinds) for (const id of [k.outfit, ...k.headwear, ...k.headwear2, ...k.eyewear, ...k.fixedGear, ...k.gameplayGear, ...k.kitPool]) used.add(id);
  return kit.pieces.filter((p) => used.has(p.id) && !p.ownGlb).map((p) => p.id);
}

/** Hair caps with a mesh that a base's kinds wear, in kit order. */
export function baseCapIds(kit, baseId) {
  const worn = new Set(kit.kinds.filter((k) => k.base === baseId).flatMap((k) => k.hairCaps));
  return kit.hairCaps.filter((c) => worn.has(c.id) && c.tris[0] > 0).map((c) => c.id);
}

/**
 * `_PIECE` order of a base file: the body (base id), its head variants, hair caps, outfits, then every other piece in
 * kit order. Eyes are part of their head piece (G5); `bald` and the shield have no piece.
 */
export function pieceOrder(kit, baseId) {
  const heads = kit.heads.filter((h) => h.base === baseId).map((h) => h.id);
  const ids = basePieceIds(kit, baseId);
  const outfits = ids.filter((id) => byId(kit.pieces, id)?.kind === 'outfit');
  return [baseId, ...heads, ...baseCapIds(kit, baseId), ...outfits, ...ids.filter((id) => !outfits.includes(id))];
}

/**
 * Garment parts of a base: [{ part, script, variant, outfits, tint, tris: [l0, l1, l2], texels: area }]. Parts come from
 * guardBakePlan's normalizeKit (the same split the garments jobs use); per outfit the shares are normalised to 1, so an
 * outfit's parts never sum past its kit budget.
 */
export function garmentParts(kit, baseId) {
  const nk = normalizeKit(kit);
  const parts = nk.garments.filter((g) => !g.bases || g.bases.includes(baseId));
  const outfitsOf = (g) => (g.outfits ?? []).filter((o) => g.outfitBases?.[o.id]?.includes(baseId)).map((o) => o.id);
  const share = (id) => PART_SHARE[id] ?? DEFAULT_SHARE;
  const outfitParts = new Map();
  for (const g of parts) for (const o of outfitsOf(g)) outfitParts.set(o, [...(outfitParts.get(o) ?? []), g.id]);
  return parts.map((g) => {
    const outs = outfitsOf(g);
    const tris = [0, 1, 2].map((l) => {
      const per = outs.map((o) => {
        const p = byId(kit.pieces, o);
        const sum = outfitParts.get(o).reduce((s, id) => s + share(id), 0);
        return Math.floor((p.tris[l] * share(g.id)) / sum);
      });
      return per.length ? Math.min(...per) : 0;
    });
    const texels = Math.max(0, ...outs.map((o) => {
      const p = byId(kit.pieces, o);
      const sum = outfitParts.get(o).reduce((s, id) => s + share(id), 0);
      return (p.texels[0] * p.texels[1] * share(g.id)) / sum;
    }));
    return { part: g.id, script: g.script, variant: g.variant ?? null, outfits: outs, tint: outfitTint(kit, outs), tris, texels };
  }).filter((g) => g.outfits.length);
}

/** A garment part's tint slot: boots and gloves are baked colour (SPEC 8 `none`), the rest take their outfit's slot. */
function outfitTint(kit, outfits) {
  return byId(kit.pieces, outfits[0])?.tint ?? 'uniform';
}
const UNTINTED_PARTS = new Set(['boots', 'gloves', 'work_gloves']);
export const partTint = (part, outfitSlot) => (UNTINTED_PARTS.has(part) ? 'none' : outfitSlot);

/**
 * Skyline bottom-left packing of `items` ({ id, w, h }) into a `size` square, each padded by `gutter` on every side.
 * Returns { rects: { id: [x, y, w, h] }, fits } (x, y of the unpadded rect). Deterministic: tallest first, then widest,
 * then id.
 */
export function skylinePack(items, size, gutter = GUTTER) {
  const order = [...items].sort((a, b) => b.h - a.h || b.w - a.w || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let sky = [{ x: 0, y: 0, w: size }];
  const rects = {};
  let fits = true;
  for (const it of order) {
    const W = it.w + 2 * gutter;
    const H = it.h + 2 * gutter;
    let best = null;
    for (let i = 0; i < sky.length; i++) {
      const x = sky[i].x;
      if (x + W > size) break;
      let y = 0;
      let need = W;
      for (let j = i; j < sky.length && need > 0; j++) {
        y = Math.max(y, sky[j].y);
        need -= sky[j].w;
      }
      if (need > 0 || y + H > size) continue;
      if (!best || y < best.y || (y === best.y && x < best.x)) best = { x, y };
    }
    if (!best) { fits = false; continue; }
    rects[it.id] = [best.x + gutter, best.y + gutter, it.w, it.h];
    // raise the skyline under the new rect
    const next = [];
    for (const s of sky) {
      const a = s.x, b = s.x + s.w;
      if (b <= best.x || a >= best.x + W) { next.push(s); continue; }
      if (a < best.x) next.push({ x: a, y: s.y, w: best.x - a });
      if (b > best.x + W) next.push({ x: best.x + W, y: s.y, w: b - best.x - W });
    }
    next.push({ x: best.x, y: best.y + H, w: W });
    next.sort((u, v) => u.x - v.x);
    sky = [];
    for (const s of next) {
      const last = sky[sky.length - 1];
      if (last && last.y === s.y && last.x + last.w === s.x) last.w += s.w;
      else sky.push({ ...s });
    }
  }
  return { rects, fits };
}

/** Rect [x, y, w, h] at LOD0 to a LOD's pixels (whole pixels; LOD0 rects are on the QUANTUM grid). */
export function rectAt(rect, lod) {
  const k = LOD_SCALE[lod];
  return rect.map((v) => Math.round(v * k));
}

/** A rect's UV transform at a LOD: local [0, 1] UV -> atlas UV = offset + uv * scale. */
export function rectUv(rect, lod) {
  const [W, H] = ATLAS[lod];
  const [x, y, w, h] = rectAt(rect, lod);
  return { offset: [x / W, y / H], scale: [w / W, h / H], px: [x, y, w, h] };
}

/**
 * The whole layout of one base (what bake_guard.py reads). Throws on a kit the bake cannot lay out (too many face
 * tiles, a piece that fits nowhere).
 */
export function guardLayout(kit, baseId) {
  const base = byId(kit.bases, baseId);
  if (!base) throw new Error(`base ${baseId} is not in the kit`);
  const pieces = pieceOrder(kit, baseId);
  if (pieces.length > 256) throw new Error(`${baseId}: ${pieces.length} pieces (_PIECE is uint8)`);
  const tiles = base.faceTiles ?? [];
  if (tiles.length > TILE_ORIGIN.length) throw new Error(`${baseId}: ${tiles.length} face tiles, the atlas holds ${TILE_ORIGIN.length}`);
  const heads = kit.heads.filter((h) => h.base === baseId);
  const caps = baseCapIds(kit, baseId);
  const garments = garmentParts(kit, baseId);
  const other = pieces.filter((id) => byId(kit.pieces, id) && byId(kit.pieces, id).kind !== 'outfit');

  const regions = {};
  const tileOf = (id) => tiles.indexOf(id);
  for (const h of heads) {
    const t = tileOf(h.id);
    if (t < 0) throw new Error(`${baseId}: head ${h.id} has no face tile (faceTiles ${tiles.join(', ')})`);
    regions[`head:${h.id}`] = { kind: 'head', id: h.id, tile: t, rect: [...TILE_ORIGIN[t], TILE, TILE] };
  }
  const left = [];
  left.push({ id: 'body', kind: 'body', w: q(base.bodyTexels[0]), h: q(base.bodyTexels[1]) });
  for (const g of garments) {
    const side = q(Math.sqrt(g.texels));
    left.push({ id: `garment:${g.part}`, kind: 'garment', part: g.part, w: side, h: side });
  }
  for (const c of caps) {
    const cap = byId(kit.hairCaps, c);
    left.push({ id: `cap:${c}`, kind: 'cap', cap: c, w: q(cap.texels[0]), h: q(cap.texels[1]) });
  }
  left.push({ id: 'eyes', kind: 'eyes', w: q(kit.face.eyes.texels[0]), h: q(kit.face.eyes.texels[1]) });
  for (const id of other) {
    const p = byId(kit.pieces, id);
    const t = tileOf(id);
    if (t >= 0) regions[`piece:${id}`] = { kind: 'piece', id, tile: t, rect: [...TILE_ORIGIN[t], TILE, TILE] };
    else left.push({ id: `piece:${id}`, kind: 'piece', piece: id, w: q(p.texels[0]), h: q(p.texels[1]) });
  }
  // shrink the left items uniformly until they fit (reported: leftScale < 1 means less texel density than the kit asks)
  let scale = 1;
  let packed = skylinePack(left, LEFT);
  while (!packed.fits) {
    scale *= 0.9;
    if (scale < 0.2) throw new Error(`${baseId}: the left atlas half cannot hold ${left.length} items`);
    packed = skylinePack(left.map((it) => ({ ...it, w: q(it.w * scale), h: q(it.h * scale) })), LEFT);
  }
  for (const it of left) {
    const { w: _w, h: _h, ...rest } = it;
    regions[it.id] = { ...rest, rect: packed.rects[it.id] };
  }
  const piece = (id) => byId(kit.pieces, id);
  const cap = (l, id) => Math.min(...[piece(id).tris[l], l === 0 ? lod0Cap(kit, piece(id)) : Infinity]);
  return {
    version: LAYOUT_VERSION,
    base: baseId,
    refHeight: base.refHeight,
    pieces,
    tintSlots: kit.tintSlots,
    atlas: ATLAS.map((a) => [...a]),
    normal: ATLAS.map(([w, h]) => [w / 2, h / 2]),
    lodScale: [...LOD_SCALE],
    leftScale: Math.round(scale * 1000) / 1000,
    faceTiles: tiles,
    regions,
    heads: heads.map((h) => ({ id: h.id, tris: h.tris, tile: tileOf(h.id) })),
    caps: caps.map((c) => ({ id: c, tris: byId(kit.hairCaps, c).tris })),
    eyes: { tris: kit.face.eyes.tris },
    body: { tris: base.bodyTris },
    garments: garments.map((g) => ({ ...g, partTint: partTint(g.part, g.tint) })),
    gear: other.map((id) => ({ id, kind: piece(id).kind, tint: piece(id).tint, bones: piece(id).bones, tris: [0, 1, 2].map((l) => cap(l, id)), region: `piece:${id}` })),
    outfits: pieces.filter((id) => piece(id)?.kind === 'outfit').map((id) => ({ id, tint: piece(id).tint, tris: piece(id).tris, parts: garments.filter((g) => g.outfits.includes(id)).map((g) => g.part) })),
    influences: kit.bones.influences,
  };
}

/** PLAN section 5 LOD0 caps (guardKit GUARD_LIMITS.pieceLod0, repeated here so this module stays plain JS). */
const PIECE_LOD0 = { headwear: 600, helmet: 1200, vest_soft: 1800, plate_heavy: 2600, shield: 800 };
function lod0Cap(_kit, p) {
  if (p.kind === 'headwear') return PIECE_LOD0.headwear;
  if (p.kind === 'shield') return PIECE_LOD0.shield;
  if (p.id.startsWith('helmet_')) return PIECE_LOD0.helmet;
  if (p.id in PIECE_LOD0) return PIECE_LOD0[p.id];
  return Infinity;
}

/** The layout of an own-GLB piece (the riot shield): one material, the piece's texels at LOD0, half / quarter below. */
export function pieceLayout(kit, pieceId) {
  const p = byId(kit.pieces, pieceId);
  if (!p || !p.ownGlb) throw new Error(`${pieceId} is not a piece with its own GLB`);
  const atlas = [0, 1, 2].map((l) => [p.texels[0] >> l, p.texels[1] >> l]);
  return {
    version: LAYOUT_VERSION,
    piece: pieceId,
    pieces: [pieceId],
    tintSlots: kit.tintSlots,
    tint: p.tint,
    bones: p.bones,
    atlas,
    normal: atlas.map(([w, h]) => [w >> 1, h >> 1]),
    tris: [0, 1, 2].map((l) => Math.min(p.tris[l], l === 0 ? lod0Cap(kit, p) : Infinity)),
    regions: { [`piece:${pieceId}`]: { kind: 'piece', id: pieceId, rect: [GUTTER, GUTTER, atlas[0][0] - 2 * GUTTER, atlas[0][1] - 2 * GUTTER], own: true } },
  };
}

/** Every rect of a layout at a LOD in pixels (for overlap checks and the bake): { regionId: [x, y, w, h] }. */
export function rectsAt(layout, lod) {
  return Object.fromEntries(Object.entries(layout.regions).map(([id, r]) => [id, layout.piece ? r.rect.map((v) => v >> lod) : rectAt(r.rect, lod)]));
}
