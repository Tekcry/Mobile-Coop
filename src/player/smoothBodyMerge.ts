/**
 * (guard-render S1) The pure half of `SmoothBody`: a rig's smooth parts - each an instance of a unit part-library
 * shape on a joint - merged into one rigidly skinned mesh's vertex data. Positions and normals go into the joint's
 * space (bind = identity: the bone matrix is the joint's transform relative to the root); colour, pattern and
 * `color2` per vertex as the instances had them; `ppos` / `pnrm` are what the pattern and surface plugins saw on the
 * instance (the unit position scaled by the instance's world scale, the raw unit normal), so the merged body shades
 * the same pixels. Babylon-free (Vitest); matrices are Babylon's row-vector layout (translation in 12..14).
 */

/** One part: its unit mesh, where it sits on its joint and its instance values. */
export interface MergePart {
  pos: ArrayLike<number>;
  nrm: ArrayLike<number>;
  idx: ArrayLike<number>;
  /** Part -> joint (16 floats, `Matrix.Compose(scaling, rotation, position)` of the instance). */
  m: ArrayLike<number>;
  /** The joint's bone. */
  bone: number;
  /** Instance `color` (rgba), `pattern` (xyzw: id, scale, surface, heat) and `color2` (rgba). */
  color: ArrayLike<number>;
  pattern: ArrayLike<number>;
  color2: ArrayLike<number>;
  /** The instance world matrix's row lengths (its world scale: the pattern / surface space). */
  patScale: ArrayLike<number>;
}

export interface MergedBody {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** 4 per vertex each. */
  colors: Float32Array;
  pattern: Float32Array;
  color2: Float32Array;
  matricesIndices: Float32Array;
  matricesWeights: Float32Array;
  /** 3 per vertex: the instance's pattern / surface position and normal (`SmoothBodyPlugin`). */
  ppos: Float32Array;
  pnrm: Float32Array;
  /** Per part: its first vertex and vertex count (2 per part). */
  ranges: Uint32Array;
}

/** Merge the parts (empty meshes keep an empty range). */
export function mergeParts(parts: readonly MergePart[]): MergedBody {
  let nv = 0;
  let ni = 0;
  for (const p of parts) {
    nv += p.pos.length / 3;
    ni += p.idx.length;
  }
  const out: MergedBody = {
    positions: new Float32Array(nv * 3),
    normals: new Float32Array(nv * 3),
    indices: new Uint32Array(ni),
    colors: new Float32Array(nv * 4),
    pattern: new Float32Array(nv * 4),
    color2: new Float32Array(nv * 4),
    matricesIndices: new Float32Array(nv * 4),
    matricesWeights: new Float32Array(nv * 4),
    ppos: new Float32Array(nv * 3),
    pnrm: new Float32Array(nv * 3),
    ranges: new Uint32Array(parts.length * 2),
  };
  let v0 = 0;
  let i0 = 0;
  for (let pi = 0; pi < parts.length; pi++) {
    const p = parts[pi]!;
    const m = p.m;
    const n = p.pos.length / 3;
    out.ranges[pi * 2] = v0;
    out.ranges[pi * 2 + 1] = n;
    for (let k = 0; k < n; k++) {
      const x = p.pos[k * 3]!;
      const y = p.pos[k * 3 + 1]!;
      const z = p.pos[k * 3 + 2]!;
      const o3 = (v0 + k) * 3;
      out.positions[o3] = x * m[0]! + y * m[4]! + z * m[8]! + m[12]!;
      out.positions[o3 + 1] = x * m[1]! + y * m[5]! + z * m[9]! + m[13]!;
      out.positions[o3 + 2] = x * m[2]! + y * m[6]! + z * m[10]! + m[14]!;
      // (the plain linear part, normalised: instances draw without NONUNIFORMSCALING, so this is what they shade)
      const a = p.nrm[k * 3]!;
      const b = p.nrm[k * 3 + 1]!;
      const c = p.nrm[k * 3 + 2]!;
      const nx = a * m[0]! + b * m[4]! + c * m[8]!;
      const ny = a * m[1]! + b * m[5]! + c * m[9]!;
      const nz = a * m[2]! + b * m[6]! + c * m[10]!;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      out.normals[o3] = nx / l;
      out.normals[o3 + 1] = ny / l;
      out.normals[o3 + 2] = nz / l;
      out.ppos[o3] = x * p.patScale[0]!;
      out.ppos[o3 + 1] = y * p.patScale[1]!;
      out.ppos[o3 + 2] = z * p.patScale[2]!;
      out.pnrm[o3] = a;
      out.pnrm[o3 + 1] = b;
      out.pnrm[o3 + 2] = c;
      const o4 = (v0 + k) * 4;
      for (let j = 0; j < 4; j++) {
        out.colors[o4 + j] = p.color[j]!;
        out.pattern[o4 + j] = p.pattern[j]!;
        out.color2[o4 + j] = p.color2[j]!;
      }
      out.matricesIndices[o4] = p.bone;
      out.matricesWeights[o4] = 1;
    }
    for (let k = 0; k < p.idx.length; k++) out.indices[i0 + k] = v0 + p.idx[k]!;
    v0 += n;
    i0 += p.idx.length;
  }
  return out;
}

/** Hit flash: every vertex colour towards warm white by k (0..1), as `CharacterRig.setFlash` tints the instances. */
export function flashColors(base: Float32Array, k: number, out: Float32Array): void {
  for (let i = 0; i < base.length; i += 4) {
    out[i] = base[i]! + (1 - base[i]!) * k;
    out[i + 1] = base[i + 1]! + (0.92 - base[i + 1]!) * k;
    out[i + 2] = base[i + 2]! + (0.85 - base[i + 2]!) * k;
    out[i + 3] = 1;
  }
}

/** Thermal warmth (render-only `pattern.w`) on every vertex. */
export function heatPattern(pattern: Float32Array, k: number): void {
  for (let i = 3; i < pattern.length; i += 4) pattern[i] = k;
}

/** Recolour one part's vertices (lens glow); false when the part has none. */
export function paintPart(colors: Float32Array, ranges: Uint32Array, part: number, r: number, g: number, b: number): boolean {
  const n = ranges[part * 2 + 1] ?? 0;
  if (!n) return false;
  const v0 = ranges[part * 2]!;
  for (let v = v0; v < v0 + n; v++) {
    colors[v * 4] = r;
    colors[v * 4 + 1] = g;
    colors[v * 4 + 2] = b;
  }
  return true;
}

/**
 * The root-local box of the merged body at rest (each vertex through its bone's rest matrix, 16 per bone), grown by
 * `pad` (min x, y, z then max x, y, z, metres: stand / crouch / lean / reach margins). [min xyz, max xyz].
 */
export function restBox(positions: Float32Array, matricesIndices: Float32Array, bones: Float32Array, pad: readonly number[]): Float32Array {
  const b = new Float32Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
  const n = positions.length / 3;
  for (let v = 0; v < n; v++) {
    const o = matricesIndices[v * 4]! * 16;
    const x = positions[v * 3]!;
    const y = positions[v * 3 + 1]!;
    const z = positions[v * 3 + 2]!;
    for (let a = 0; a < 3; a++) {
      const w = x * bones[o + a]! + y * bones[o + 4 + a]! + z * bones[o + 8 + a]! + bones[o + 12 + a]!;
      if (w < b[a]!) b[a] = w;
      if (w > b[a + 3]!) b[a + 3] = w;
    }
  }
  if (!n) b.fill(0);
  for (let a = 0; a < 3; a++) {
    b[a] = b[a]! - (pad[a] ?? 0);
    b[a + 3] = b[a + 3]! + (pad[a + 3] ?? 0);
  }
  return b;
}
