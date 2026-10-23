// Pure budget maths of the guard LOD bake (guard-models G4): turns what the LOD files hold (guardGlb.mjs glbStats per
// LOD) into the bake report shape G4b's check reads (src/operators/guards/guardBudget.ts, docs/guard-models/reports/
// G4b-REPORT.md "Report JSON shape"). Everything is measured from the files, so the check (guard-check.mjs) can rebuild
// the same report from the GLBs and never trusts numbers the bake wrote.
//  - per piece: triangles grouped by each triangle's first vertex's `_PIECE` (the runtime's grouping);
//  - eyes: the `none`-tint triangles of a head piece at LOD0 (G1h: eyes are separate pieces of the head there, merged
//    into the head's own budget below LOD0);
//  - shown per kind (worst case): body + largest head + eyes + largest cap + each pool's largest pick + every fixed,
//    gameplay and kit-pool piece (the enforcer's shield from its own file), the same rule as guardKit.ts shownTris.

/** guardBudget.ts GUARD_REPORT_VERSION (a test keeps the two equal; this module stays plain JS for the driver). */
export const REPORT_VERSION = 1;
export const lodFile = (id, lod) => `lods/guard-${id}-lod${lod}.glb`;
/** The runtime's per-base data file beside the LOD GLBs (G7 guardAssets.ts `GuardFileData`). */
export const fileDataFile = (base) => `lods/guard-${base}.json`;

/**
 * `guard-<base>.json`, the shape G7's loader reads (src/operators/guards/guardAssets.ts `GuardFileData`): the piece list
 * in `_PIECE` order, the tint slot COUNT and the bind height. The same values as the report's `manifest` and the GLBs'
 * `extras.guard`, all from the layout.
 */
export function guardFileData(layout) {
  return { pieces: [...layout.pieces], tintSlots: layout.tintSlots.length, refHeight: layout.refHeight };
}

const max = (list, f) => list.reduce((m, x) => Math.max(m, f(x)), 0);

/** Per-piece-id triangle table of one LOD from glbStats (index -> id through the layout's piece order). */
export function pieceTable(layout, stats) {
  const out = {};
  layout.pieces.forEach((id, i) => { out[id] = stats.pieceTris[i] ?? 0; });
  return out;
}

/** A head piece's eye triangles at a LOD (its triangles in the `none` tint slot; 0 below LOD0, merged). */
export function eyeTrisOf(layout, stats, headId, lod) {
  if (lod !== 0) return 0;
  const i = layout.pieces.indexOf(headId);
  const none = layout.tintSlots.indexOf('none');
  return stats.pieceTintTris?.[`${i}:${none}`] ?? 0;
}

/** The worst-case shown triangles of one kind at a LOD from measured tables (guardKit shownTris with real counts). */
export function shownOfKind(kind, t, extra = {}) {
  const tri = (id) => t.pieces[id] ?? extra[id] ?? 0;
  let n = t.body + max(kind.heads, (h) => t.heads[h] ?? 0) + t.eyes;
  n += max(kind.hairCaps, (c) => t.caps[c] ?? 0);
  n += tri(kind.outfit);
  n += max(kind.headwear, tri) + max(kind.headwear2, tri) + max(kind.eyewear, tri);
  for (const id of new Set([...kind.fixedGear, ...kind.gameplayGear, ...kind.kitPool])) n += tri(id);
  return n;
}

function lodEntry(id, lod, stats) {
  return {
    lod,
    file: lodFile(id, lod),
    bufferTris: stats.tris,
    draws: stats.draws,
    bones: stats.bones,
    influences: stats.influences,
    attributes: stats.attributes,
    textures: stats.textures.map(({ role, width, height, format }) => ({ role, width, height, format })),
    vertices: stats.vertices,
    mixedTris: stats.mixedTris,
    pieceAttrUint8: stats.pieceAttrUint8,
  };
}

/**
 * The base report. `statsByLod`: glbStats of LOD0..2; `ownTris`: { pieceId: [l0, l1, l2] } measured from the own-GLB
 * pieces (the shield), else the kit's numbers count. `notes`: free text kept in the report (missing garments etc.).
 */
export function baseReport(kit, layout, statsByLod, ownTris = {}, notes = []) {
  const kinds = kit.kinds.filter((k) => k.base === layout.base);
  const headIds = layout.heads.map((h) => h.id);
  const capIds = layout.caps.map((c) => c.id);
  const outfitAndOther = layout.pieces.filter((id) => id !== layout.base && !headIds.includes(id) && !capIds.includes(id));
  const lods = statsByLod.map((stats, lod) => {
    const table = pieceTable(layout, stats);
    const eyes = Object.fromEntries(headIds.map((h) => [h, eyeTrisOf(layout, stats, h, lod)]));
    const heads = Object.fromEntries(headIds.map((h) => [h, table[h] - eyes[h]]));
    const caps = Object.fromEntries(capIds.map((c) => [c, table[c]]));
    const pieces = Object.fromEntries(outfitAndOther.map((p) => [p, table[p]]));
    const eyeTris = max(headIds, (h) => eyes[h]);
    const own = Object.fromEntries(kit.pieces.filter((p) => p.ownGlb).map((p) => [p.id, ownTris[p.id]?.[lod] ?? p.tris[lod]]));
    const t = { body: table[layout.base], heads, caps, pieces, eyes: eyeTris };
    return {
      ...lodEntry(layout.base, lod, stats),
      shownTris: Object.fromEntries(kinds.map((k) => [k.id, shownOfKind(k, t, own)])),
      bodyTris: table[layout.base],
      headTris: heads,
      eyeTris,
      hairCapTris: caps,
      pieceTris: pieces,
    };
  });
  return {
    version: REPORT_VERSION,
    base: layout.base,
    lods,
    manifest: { id: `guard-${layout.base}`, base: layout.base, ...guardFileData(layout), tintSlotNames: layout.tintSlots },
    notes,
  };
}

/** The own-GLB piece report (the riot shield). */
export function pieceReport(layout, statsByLod, notes = []) {
  return {
    version: REPORT_VERSION,
    piece: layout.piece,
    lods: statsByLod.map((stats, lod) => lodEntry(layout.piece, lod, stats)),
    notes,
  };
}

/**
 * Differences between the bake's report and one rebuilt from the files (the check's first rule: the report must say
 * what the files hold). Compares every number the budget check reads.
 */
export function reportDrift(written, measured) {
  const out = [];
  const keys = ['bufferTris', 'draws', 'influences', 'bodyTris', 'eyeTris'];
  const tables = ['shownTris', 'headTris', 'hairCapTris', 'pieceTris'];
  for (const m of measured.lods) {
    const w = written.lods?.find((x) => x.lod === m.lod);
    if (!w) { out.push(`LOD${m.lod}: missing from the bake report`); continue; }
    for (const k of keys) if (m[k] !== undefined && w[k] !== m[k]) out.push(`LOD${m.lod}: ${k} reported ${w[k]}, file has ${m[k]}`);
    for (const k of tables) {
      for (const [id, v] of Object.entries(m[k] ?? {})) if (w[k]?.[id] !== v) out.push(`LOD${m.lod}: ${k}.${id} reported ${w[k]?.[id]}, file has ${v}`);
    }
    if (JSON.stringify(w.bones) !== JSON.stringify(m.bones)) out.push(`LOD${m.lod}: bones differ from the file's skin`);
  }
  return out;
}
