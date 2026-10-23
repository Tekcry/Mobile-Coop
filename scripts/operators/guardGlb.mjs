// Pure GLB helpers for the guard LOD bake and check (guard-models G4). No fs: bytes in, bytes / numbers out.
//  - readGlb / writeGlb: the two-chunk container.
//  - fixGuardGlb: `_PIECE` / `_TINT` become UNSIGNED_BYTE scalars (G5: uint8 piece index and tint slot; Blender's glTF
//    exporter writes custom attributes as floats) and the file carries its piece list in `extras.guard` (mesh and asset).
//  - glbStats: what the budget check measures from the file itself: triangles (all, and per `_PIECE` by each
//    triangle's first vertex, as G5's groupByPiece does), primitives, skin joint names, influences, attributes, the
//    material's textures with their KTX2 pixel sizes.

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
export const KTX2_ID = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPES = {
  5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4],
};
const NORM = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 };

const u8 = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b));

export function readGlb(buf) {
  const b = u8(buf);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== GLB_MAGIC) throw new Error('not a GLB');
  const jl = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== JSON_CHUNK) throw new Error('GLB: first chunk is not JSON');
  const json = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + jl)));
  let bin = new Uint8Array(0);
  if (20 + jl + 8 <= b.byteLength) {
    const bl = dv.getUint32(20 + jl, true);
    if (dv.getUint32(24 + jl, true) === BIN_CHUNK) bin = b.subarray(28 + jl, 28 + jl + bl);
  }
  return { json, bin };
}

export function writeGlb(json, bin) {
  const raw = new TextEncoder().encode(JSON.stringify(json));
  const jl = (raw.length + 3) & ~3;
  const bl = (bin.length + 3) & ~3;
  const out = new Uint8Array(28 + jl + bl);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, GLB_MAGIC, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true);
  dv.setUint32(16, JSON_CHUNK, true);
  out.fill(0x20, 20, 20 + jl);
  out.set(raw, 20);
  dv.setUint32(20 + jl, bl, true);
  dv.setUint32(24 + jl, BIN_CHUNK, true);
  out.set(bin, 28 + jl);
  return out;
}

/** An accessor's values as a flat Float64Array (normalised integers divided out) and its component count. */
export function readAccessor(json, bin, index) {
  const a = json.accessors[index];
  if (!a) throw new Error(`accessor ${index} missing`);
  const n = COMPONENTS[a.type];
  const [T, size] = TYPES[a.componentType] ?? [];
  if (!T || !n) throw new Error(`accessor ${index}: type ${a.type} / ${a.componentType}`);
  const out = new Float64Array(a.count * n);
  if (a.bufferView === undefined) return { values: out, n };
  const bv = json.bufferViews[a.bufferView];
  const stride = bv.byteStride ?? n * size;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const get = {
    5120: (o) => dv.getInt8(o), 5121: (o) => dv.getUint8(o), 5122: (o) => dv.getInt16(o, true), 5123: (o) => dv.getUint16(o, true),
    5125: (o) => dv.getUint32(o, true), 5126: (o) => dv.getFloat32(o, true),
  }[a.componentType];
  const k = a.normalized ? NORM[a.componentType] : 1;
  for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) out[i * n + c] = get(base + i * stride + c * size) / k;
  return { values: out, n };
}

/** Appends bytes as a new buffer view (8-byte aligned); returns [view index, new bin]. */
function appendView(json, bin, bytes) {
  const off = (bin.length + 7) & ~7;
  const next = new Uint8Array(off + bytes.length);
  next.set(bin, 0);
  next.set(bytes, off);
  json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: bytes.length });
  json.buffers = [{ byteLength: next.length }];
  return [json.bufferViews.length - 1, next];
}

/** Rounds a float attribute to uint8 values; refuses anything outside 0..255 or not whole. */
function toUint8(values, what) {
  const out = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = Math.round(values[i]);
    if (Math.abs(values[i] - v) > 1e-3 || v < 0 || v > 255) throw new Error(`${what}: value ${values[i]} at ${i} is not a uint8`);
    out[i] = v;
  }
  return out;
}

/**
 * The guard file as the runtime takes it: every primitive's `_PIECE` and `_TINT` as UNSIGNED_BYTE SCALAR accessors
 * (G5 GuardGlbMesh), and `extras.guard` = `info` on each mesh and on the asset ({ base | piece, lod, pieces, tintSlots }).
 * Unused old accessors stay (harmless); the data is compacted by the KTX2 repack that follows.
 */
export function fixGuardGlb(buf, info) {
  const { json, bin: bin0 } = readGlb(buf);
  let bin = new Uint8Array(bin0);
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives) {
      for (const name of ['_PIECE', '_TINT']) {
        const idx = p.attributes[name];
        if (idx === undefined) throw new Error(`primitive of ${m.name ?? 'mesh'} has no ${name}`);
        if (json.accessors[idx].componentType === 5121 && !json.accessors[idx].normalized) continue;
        const { values, n } = readAccessor(json, bin, idx);
        if (n !== 1) throw new Error(`${name} is ${json.accessors[idx].type}, not SCALAR`);
        const bytes = toUint8(values, name);
        let view;
        [view, bin] = appendView(json, bin, bytes);
        json.accessors.push({ bufferView: view, componentType: 5121, count: bytes.length, type: 'SCALAR' });
        p.attributes[name] = json.accessors.length - 1;
      }
    }
    m.extras = { ...(m.extras ?? {}), guard: info };
  }
  json.asset = { ...json.asset, extras: { ...(json.asset?.extras ?? {}), guard: info } };
  return writeGlb(json, bin);
}

/** [width, height] from a KTX2 header, or null when the bytes are not KTX2. */
export function ktx2Size(bytes) {
  if (bytes.length < 28 || !KTX2_ID.every((b, i) => bytes[i] === b)) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, 28);
  return [dv.getUint32(20, true), dv.getUint32(24, true)];
}

/** [width, height] from a PNG header, or null. */
export function pngSize(bytes) {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, 24);
  return [dv.getUint32(16, false), dv.getUint32(20, false)];
}

function imageOf(json, bin, texIndex) {
  const t = json.textures?.[texIndex];
  if (!t) return null;
  const src = t.extensions?.KHR_texture_basisu?.source ?? t.extensions?.EXT_texture_webp?.source ?? t.source;
  const im = json.images?.[src];
  if (!im) return null;
  const bv = im.bufferView === undefined ? null : json.bufferViews[im.bufferView];
  const bytes = bv ? bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength) : new Uint8Array(0);
  const k = ktx2Size(bytes);
  const p = k ? null : pngSize(bytes);
  const size = k ?? p ?? [0, 0];
  const format = k ? 'ktx2' : p ? 'png' : (im.mimeType ?? 'unknown').replace('image/', '');
  return { name: im.name ?? '', width: size[0], height: size[1], format, basisu: Boolean(t.extensions?.KHR_texture_basisu) };
}

/**
 * Measures a guard GLB. pieceTris[i] counts the triangles whose first vertex has `_PIECE` i (the runtime's grouping);
 * pieceTintTris['<piece>:<tint>'] splits that by the first vertex's tint slot (a head's eyes are its `none` triangles);
 * mixedTris counts triangles whose three vertices are not all one piece (should be 0: pieces are split at seams).
 */
export function glbStats(buf) {
  const { json, bin } = readGlb(buf);
  const prims = (json.meshes ?? []).flatMap((m) => m.primitives);
  let tris = 0, influences = 0, mixedTris = 0, vertices = 0;
  const pieceTris = {};
  const pieceTintTris = {};
  const tintVerts = {};
  for (const p of prims) {
    if ((p.mode ?? 4) !== 4) throw new Error(`primitive mode ${p.mode}: triangles only`);
    const count = json.accessors[p.attributes.POSITION].count;
    vertices += count;
    const idx = p.indices !== undefined ? readAccessor(json, bin, p.indices).values : Float64Array.from({ length: count }, (_, i) => i);
    const t = Math.floor(idx.length / 3);
    tris += t;
    const piece = p.attributes._PIECE !== undefined ? readAccessor(json, bin, p.attributes._PIECE).values : null;
    const tint = p.attributes._TINT !== undefined ? readAccessor(json, bin, p.attributes._TINT).values : null;
    if (piece) {
      for (let i = 0; i < t; i++) {
        const v0 = idx[i * 3];
        const a = piece[v0], b = piece[idx[i * 3 + 1]], c = piece[idx[i * 3 + 2]];
        pieceTris[a] = (pieceTris[a] ?? 0) + 1;
        if (tint) {
          const k = `${a}:${tint[v0]}`;
          pieceTintTris[k] = (pieceTintTris[k] ?? 0) + 1;
        }
        if (a !== b || a !== c) mixedTris++;
      }
    }
    if (tint) for (const v of tint) tintVerts[v] = (tintVerts[v] ?? 0) + 1;
    for (const set of ['WEIGHTS_0', 'WEIGHTS_1']) {
      if (p.attributes[set] === undefined) continue;
      const { values, n } = readAccessor(json, bin, p.attributes[set]);
      for (let v = 0; v < values.length / n; v++) {
        let k = 0;
        for (let c = 0; c < n; c++) if (values[v * n + c] > 1e-6) k++;
        influences = Math.max(influences, (set === 'WEIGHTS_1' ? 4 : 0) + k);
      }
    }
  }
  const attributes = prims.length ? Object.keys(prims[0].attributes).filter((k) => prims.every((p) => k in p.attributes)) : [];
  const bones = (json.skins?.[0]?.joints ?? []).map((j) => json.nodes[j]?.name ?? '');
  const textures = [];
  for (const m of json.materials ?? []) {
    const roles = [
      ['albedo', m.pbrMetallicRoughness?.baseColorTexture?.index],
      ['normal', m.normalTexture?.index],
      ['orm', m.pbrMetallicRoughness?.metallicRoughnessTexture?.index ?? m.occlusionTexture?.index],
    ];
    for (const [role, ti] of roles) {
      if (ti === undefined) continue;
      const im = imageOf(json, bin, ti);
      if (im) textures.push({ role, width: im.width, height: im.height, format: im.format, name: im.name });
    }
  }
  const pieceAttrType = prims[0]?.attributes._PIECE !== undefined ? json.accessors[prims[0].attributes._PIECE].componentType : null;
  return {
    tris, draws: prims.length, vertices, bones, influences, attributes, textures, pieceTris, pieceTintTris, tintVerts, mixedTris,
    materials: (json.materials ?? []).length, pieceAttrUint8: pieceAttrType === 5121, extras: json.asset?.extras?.guard ?? null,
  };
}
