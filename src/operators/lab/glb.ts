/**
 * Minimal GLB reader for the Operator Lab (pure, no Babylon, no dependency). Reads what `py/export_gltf.py` writes: a
 * node tree with one skin, skinned triangle meshes (POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0, indices) and
 * metallic-roughness factors, and (step 10's baked LODs) the embedded images of the base colour, packed occlusion /
 * roughness / metal and normal textures. Everything comes out in the game frame (+X right, +Y up, +Z forward, left-handed): the
 * glTF model faces +Z with its right on -X, so x is negated. The index order is kept (A80): the mirror turns glTF's
 * counter-clockwise front faces into the clockwise ones Babylon's default side orientation treats as front. (Flipping
 * it as well, as before A80, made every visible face a back face, and two-sided lighting then lit it from inside.)
 */

export type V3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface GlbNode {
  name: string;
  parent: number;
  /** Local translation (game frame) and rotation quaternion (x, y, z, w). */
  t: V3;
  r: Quat;
}

/** One image embedded in the GLB's binary chunk (PNG, JPEG, WebP or, from step 11, KTX2 through KHR_texture_basisu). */
export interface GlbImage {
  mime: string;
  /** The glTF image name (the baked set's file stem, e.g. wren-lod0-cloth-albedo). */
  name: string;
  data: Uint8Array;
}

export interface GlbMaterial {
  name: string;
  /** Linear base colour factor. */
  base: V3;
  roughness: number;
  metallic: number;
  emissive: V3;
  /** Baked maps (step 10): base colour (sRGB), packed occlusion R / roughness G / metal B, tangent normal. */
  baseTex?: GlbImage;
  ormTex?: GlbImage;
  normalTex?: GlbImage;
}

export interface GlbMesh {
  name: string;
  material: number;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  /** MikkTSpace tangents (x, y, z, w) in the reader's mirrored frame, when the file has them (step 10 baked LODs). */
  tangents?: Float32Array;
  /**
   * Goggle state class per vertex (step 11d proposal, `_GOGGLE`: 0 body, 1 shown in use, 2 shown stowed), when the file
   * has it. Absent in the step 11 assets: the goggle is then always in its in-use position.
   */
  goggle?: Uint8Array;
  /** (guard-models G7) A guard base file's static piece index (`_PIECE`, into its manifest's `pieces`) and tint slot
   *  (`_TINT`) per vertex (G4's bake; `guardFigure.ts` reads them), when the file has them. */
  piece?: Uint8Array;
  tint?: Uint8Array;
  /**
   * (feature/weapons) Morph targets: per-vertex position and normal deltas (game frame), e.g. the finger grips
   * (`gripR`, `gripL`, scripts/operators/py/grip_morphs.py). Absent in files without targets.
   */
  targets?: GlbTarget[];
  /** Skin joint slots (4 per vertex) and weights. */
  joints: Uint16Array;
  weights: Float32Array;
  indices: Uint32Array;
}

export interface GlbTarget {
  name: string;
  positions: Float32Array;
  normals: Float32Array | null;
}

export interface GlbModel {
  nodes: GlbNode[];
  /** Node index of each skin joint, in skin order. */
  joints: number[];
  materials: GlbMaterial[];
  meshes: GlbMesh[];
}

interface Json {
  nodes: { name?: string; children?: number[]; translation?: number[]; rotation?: number[] }[];
  skins?: { joints: number[] }[];
  materials?: {
    name?: string;
    pbrMetallicRoughness?: { baseColorFactor?: number[]; roughnessFactor?: number; metallicFactor?: number; baseColorTexture?: { index: number }; metallicRoughnessTexture?: { index: number } };
    normalTexture?: { index: number };
    emissiveFactor?: number[];
  }[];
  images?: { bufferView?: number; mimeType?: string; name?: string }[];
  textures?: { source?: number; extensions?: { EXT_texture_webp?: { source: number }; KHR_texture_basisu?: { source: number } } }[];
  meshes: { name?: string; extras?: { targetNames?: string[] }; primitives: { attributes: Record<string, number>; indices?: number; material?: number; targets?: Record<string, number>[] }[] }[];
  accessors: {
    bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string;
    sparse?: { count: number; indices: { bufferView: number; byteOffset?: number; componentType: number }; values: { bufferView: number; byteOffset?: number } };
  }[];
  bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
}

const COMPONENTS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const SIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

export function parseGlb(buf: ArrayBuffer): GlbModel {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen))) as Json;
  const binStart = 20 + jsonLen + 8;

  /** One accessor as plain numbers (no normalisation: the exporter writes floats and unsigned ints here). */
  const read = (index: number): { data: Float64Array; n: number } => {
    const a = json.accessors[index]!;
    const bv = json.bufferViews[a.bufferView!]!;
    const comps = COMPONENTS[a.type]!;
    const size = SIZE[a.componentType]!;
    const stride = bv.byteStride ?? comps * size;
    const base = binStart + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const out = new Float64Array(a.count * comps);
    for (let i = 0; i < a.count; i++) {
      for (let c = 0; c < comps; c++) {
        const o = base + i * stride + c * size;
        let v: number;
        switch (a.componentType) {
          case 5126: v = dv.getFloat32(o, true); break;
          case 5125: v = dv.getUint32(o, true); break;
          case 5123: v = dv.getUint16(o, true); break;
          case 5121: v = dv.getUint8(o); break;
          case 5122: v = dv.getInt16(o, true); break;
          default: v = dv.getInt8(o);
        }
        out[i * comps + c] = v;
      }
    }
    return { data: out, n: a.count };
  };

  /** A morph target accessor (dense, or sparse over zeros) as floats, x mirrored into the game frame. */
  const readDelta = (index: number): Float32Array => {
    const a = json.accessors[index]!;
    const out = new Float32Array(a.count * 3);
    if (a.bufferView !== undefined) out.set(read(index).data);
    const sp = a.sparse;
    if (sp) {
      const ib = json.bufferViews[sp.indices.bufferView]!;
      const vb = json.bufferViews[sp.values.bufferView]!;
      const io = binStart + (ib.byteOffset ?? 0) + (sp.indices.byteOffset ?? 0);
      const vo = binStart + (vb.byteOffset ?? 0) + (sp.values.byteOffset ?? 0);
      const isz = SIZE[sp.indices.componentType]!;
      for (let k = 0; k < sp.count; k++) {
        const o = io + k * isz;
        const i = sp.indices.componentType === 5125 ? dv.getUint32(o, true) : sp.indices.componentType === 5123 ? dv.getUint16(o, true) : dv.getUint8(o);
        for (let c = 0; c < 3; c++) out[i * 3 + c] = dv.getFloat32(vo + (k * 3 + c) * 4, true);
      }
    }
    for (let i = 0; i < a.count; i++) out[i * 3] = -out[i * 3]!;
    return out;
  };

  const parent = json.nodes.map(() => -1);
  json.nodes.forEach((n, i) => n.children?.forEach((c) => (parent[c] = i)));
  const nodes: GlbNode[] = json.nodes.map((n, i) => {
    const t = n.translation ?? [0, 0, 0];
    const r = n.rotation ?? [0, 0, 0, 1];
    return { name: n.name ?? `node${i}`, parent: parent[i]!, t: [-t[0]!, t[1]!, t[2]!], r: [r[0]!, -r[1]!, -r[2]!, r[3]!] };
  });

  const image = (tex: { index: number } | undefined): GlbImage | undefined => {
    if (!tex) return undefined;
    const t = json.textures?.[tex.index];
    const src = t?.extensions?.KHR_texture_basisu?.source ?? t?.extensions?.EXT_texture_webp?.source ?? t?.source;
    const im = src !== undefined ? json.images?.[src] : undefined;
    if (!im || im.bufferView === undefined) return undefined;
    const bv = json.bufferViews[im.bufferView]!;
    return { mime: im.mimeType ?? 'image/png', name: im.name ?? `image${src}`, data: new Uint8Array(buf, binStart + (bv.byteOffset ?? 0), bv.byteLength) };
  };
  const materials: GlbMaterial[] = (json.materials ?? []).map((m, i) => {
    const p = m.pbrMetallicRoughness ?? {};
    const b = p.baseColorFactor ?? [0.8, 0.8, 0.8, 1];
    const e = m.emissiveFactor ?? [0, 0, 0];
    return {
      name: m.name ?? `mat${i}`, base: [b[0]!, b[1]!, b[2]!], roughness: p.roughnessFactor ?? 1, metallic: p.metallicFactor ?? 1,
      emissive: [e[0]!, e[1]!, e[2]!], baseTex: image(p.baseColorTexture), ormTex: image(p.metallicRoughnessTexture), normalTex: image(m.normalTexture),
    };
  });

  const meshes: GlbMesh[] = [];
  for (const m of json.meshes) {
    for (const prim of m.primitives) {
      const at = prim.attributes;
      const pos = read(at.POSITION!);
      const nor = at.NORMAL !== undefined ? read(at.NORMAL) : null;
      const uv = at.TEXCOORD_0 !== undefined ? read(at.TEXCOORD_0) : null;
      const tan = at.TANGENT !== undefined ? read(at.TANGENT) : null;
      const jn = at.JOINTS_0 !== undefined ? read(at.JOINTS_0) : null;
      const wt = at.WEIGHTS_0 !== undefined ? read(at.WEIGHTS_0) : null;
      const gg = at._GOGGLE !== undefined ? read(at._GOGGLE) : null;
      const pc = at._PIECE !== undefined ? read(at._PIECE) : null;
      const tc = at._TINT !== undefined ? read(at._TINT) : null;
      const idx = read(prim.indices!);
      const positions = new Float32Array(pos.data.length);
      const normals = new Float32Array(pos.data.length);
      for (let i = 0; i < pos.n; i++) {
        positions[i * 3] = -pos.data[i * 3]!;
        positions[i * 3 + 1] = pos.data[i * 3 + 1]!;
        positions[i * 3 + 2] = pos.data[i * 3 + 2]!;
        if (nor) {
          normals[i * 3] = -nor.data[i * 3]!;
          normals[i * 3 + 1] = nor.data[i * 3 + 1]!;
          normals[i * 3 + 2] = nor.data[i * 3 + 2]!;
        }
      }
      const indices = new Uint32Array(idx.data.length);
      for (let i = 0; i < indices.length; i += 3) {
        indices[i] = idx.data[i]!;
        indices[i + 1] = idx.data[i + 1]!;
        indices[i + 2] = idx.data[i + 2]!;
      }
      const uvs = new Float32Array(pos.n * 2);
      if (uv) for (let i = 0; i < pos.n; i++) { uvs[i * 2] = uv.data[i * 2]!; uvs[i * 2 + 1] = 1 - uv.data[i * 2 + 1]!; }
      const joints = new Uint16Array(pos.n * 4);
      const weights = new Float32Array(pos.n * 4);
      if (jn && wt) for (let i = 0; i < pos.n * 4; i++) { joints[i] = jn.data[i]!; weights[i] = wt.data[i]!; }
      // tangents: x mirrored with the positions; the mirror flips the frame's handedness, so w flips too (the v flip
      // is undone by the texture's own flip at upload, so it changes nothing)
      let tangents: Float32Array | undefined;
      if (tan) {
        tangents = new Float32Array(pos.n * 4);
        for (let i = 0; i < pos.n; i++) {
          tangents[i * 4] = -tan.data[i * 4]!;
          tangents[i * 4 + 1] = tan.data[i * 4 + 1]!;
          tangents[i * 4 + 2] = tan.data[i * 4 + 2]!;
          tangents[i * 4 + 3] = -tan.data[i * 4 + 3]!;
        }
      }
      let goggle: Uint8Array | undefined;
      if (gg) {
        goggle = new Uint8Array(pos.n);
        for (let i = 0; i < pos.n; i++) goggle[i] = Math.round(gg.data[i]!);
      }
      const piece = pc ? Uint8Array.from(pc.data.subarray(0, pos.n), (v) => Math.round(v)) : undefined;
      const tint = tc ? Uint8Array.from(tc.data.subarray(0, pos.n), (v) => Math.round(v)) : undefined;
      const targets = prim.targets?.map((t, k) => ({
        name: m.extras?.targetNames?.[k] ?? `target${k}`,
        positions: readDelta(t.POSITION!),
        normals: t.NORMAL !== undefined ? readDelta(t.NORMAL) : null,
      }));
      meshes.push({ name: m.name ?? `mesh${meshes.length}`, material: prim.material ?? 0, positions, normals, uvs, tangents, goggle, piece, tint, targets, joints, weights, indices });
    }
  }
  return { nodes, joints: json.skins?.[0]?.joints ?? [], materials, meshes };
}

export function qmul(a: Quat, b: Quat): Quat {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

export const qinv = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];

export function rotate(q: Quat, v: V3): V3 {
  const [x, y, z, w] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}

/** World bind positions and rotations of every node (game frame), from the node tree. */
export function bindWorld(nodes: readonly GlbNode[]): { pos: V3[]; rot: Quat[] } {
  const pos: V3[] = new Array<V3>(nodes.length);
  const rot: Quat[] = new Array<Quat>(nodes.length);
  const done = new Array<boolean>(nodes.length).fill(false);
  const solve = (i: number): void => {
    if (done[i]) return;
    const n = nodes[i]!;
    if (n.parent < 0) {
      pos[i] = [...n.t];
      rot[i] = [...n.r];
    } else {
      solve(n.parent);
      const pq = rot[n.parent]!;
      const pp = pos[n.parent]!;
      const v = rotate(pq, n.t);
      pos[i] = [pp[0] + v[0], pp[1] + v[1], pp[2] + v[2]];
      rot[i] = qmul(pq, n.r);
    }
    done[i] = true;
  };
  for (let i = 0; i < nodes.length; i++) solve(i);
  return { pos, rot };
}
