/**
 * (guard-models G7) A small guard base GLB for the integration tests: the operator fixture skeleton (game joints) and
 * one primitive of small triangles, each on one joint with its own `_PIECE` and `_TINT` (written as glTF attributes,
 * so the reader's `_PIECE` / `_TINT` path is exercised too).
 */
import { operatorNodes } from './operatorFixture';

export interface GuardTri {
  piece: number;
  tint: number;
  joint: string;
  at: [number, number, number];
}

export function guardGlb(tris: readonly GuardTri[]): ArrayBuffer {
  const { nodes, joints } = operatorNodes();
  const children = nodes.map(() => [] as number[]);
  nodes.forEach((n, i) => { if (n.parent >= 0) children[n.parent]!.push(i); });
  const slotOf = (name: string): number => {
    const s = joints.indexOf(nodes.findIndex((n) => n.name === name));
    if (s < 0) throw new Error(`no joint ${name}`);
    return s;
  };
  const nv = tris.length * 3;
  const pos = new Float32Array(nv * 3);
  const nrm = new Float32Array(nv * 3);
  const uv = new Float32Array(nv * 2);
  const jn = new Uint8Array(nv * 4);
  const wt = new Float32Array(nv * 4);
  const pc = new Uint8Array(nv);
  const tc = new Uint8Array(nv);
  const idx = new Uint16Array(nv);
  tris.forEach((t, k) => {
    const [x, y, z] = t.at;
    const corners = [[x, y, z], [x + 0.05, y, z], [x, y + 0.05, z]];
    const s = slotOf(t.joint);
    for (let c = 0; c < 3; c++) {
      const v = k * 3 + c;
      // glTF frame: x mirrored (the reader mirrors it back)
      pos[v * 3] = -corners[c]![0]!;
      pos[v * 3 + 1] = corners[c]![1]!;
      pos[v * 3 + 2] = corners[c]![2]!;
      nrm[v * 3 + 2] = 1;
      jn[v * 4] = s;
      wt[v * 4] = 1;
      pc[v] = t.piece;
      tc[v] = t.tint;
      idx[v] = v;
    }
  });
  const parts: ArrayBufferView[] = [pos, nrm, uv, jn, wt, pc, tc, idx];
  const bytes = parts.map((a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  const pad = (n: number): number => (n + 3) & ~3;
  let off = 0;
  const views = bytes.map((p) => {
    const v = { buffer: 0, byteOffset: off, byteLength: p.length };
    off += pad(p.length);
    return v;
  });
  const bin = new Uint8Array(off);
  bytes.forEach((p, i) => bin.set(p, views[i]!.byteOffset));
  const acc = (bv: number, componentType: number, count: number, type: string) => ({ bufferView: bv, componentType, count, type });
  const json = {
    asset: { version: '2.0' },
    nodes: [
      ...nodes.map((n, i) => ({
        name: n.name, children: children[i]!.length ? children[i] : undefined,
        translation: [-n.t[0], n.t[1], n.t[2]], rotation: [n.r[0], -n.r[1], -n.r[2], n.r[3]],
      })),
      { name: 'guard-test', mesh: 0, skin: 0 },
    ],
    skins: [{ joints }],
    materials: [{ name: 'guard-test-atlas', pbrMetallicRoughness: { baseColorFactor: [0.5, 0.5, 0.5, 1], roughnessFactor: 0.8, metallicFactor: 0 } }],
    meshes: [{ name: 'guard-test', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, JOINTS_0: 3, WEIGHTS_0: 4, _PIECE: 5, _TINT: 6 }, indices: 7, material: 0 }] }],
    accessors: [
      acc(0, 5126, nv, 'VEC3'), acc(1, 5126, nv, 'VEC3'), acc(2, 5126, nv, 'VEC2'), acc(3, 5121, nv, 'VEC4'), acc(4, 5126, nv, 'VEC4'),
      acc(5, 5121, nv, 'SCALAR'), acc(6, 5121, nv, 'SCALAR'), acc(7, 5123, nv, 'SCALAR'),
    ],
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
  let js = new TextEncoder().encode(JSON.stringify(json));
  const jl = pad(js.length);
  const padded = new Uint8Array(jl).fill(0x20);
  padded.set(js);
  js = padded;
  const out = new Uint8Array(12 + 8 + jl + 8 + bin.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, out.length, true);
  dv.setUint32(12, jl, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.set(js, 20);
  dv.setUint32(20 + jl, bin.length, true);
  dv.setUint32(24 + jl, 0x004e4942, true);
  out.set(bin, 28 + jl);
  return out.buffer;
}
