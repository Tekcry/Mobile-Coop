/**
 * Step 11b (D28) `rigidKit` checks (pure, no Babylon): every rigid item on an operator keeps its true straight shape and
 * true size, sits on (not in, not off) what carries it, and is skinned so animation never bends it.
 *
 * The garment builders register each rigid part (scripts/operators/py/garments/kit_common.py `Parts.part`, armour.py
 * `tag_rigid`, head_kit.py) with its declared bone(s) and role ('hard': the item itself; 'mount': a moulded seat;
 * 'carrier': a soft carrier skinned with its item), tag its vertices with the '_rigid' point attribute and store its
 * design coordinates. check_garment.py writes the raw data (sampled design / built point pairs, depth into the suit,
 * small hardware's gap to its host, design extents); this module judges it, and reads the '_RIGID' attribute and the
 * skin weights straight from each LOD's GLB.
 */

export interface RigidPart {
  id: number;
  name: string;
  bones: Record<string, number>;
  role?: 'hard' | 'mount' | 'carrier';
  item?: string;
  size?: string;
  extentMm?: number[] | null;
  design?: number[][];
  world?: number[][];
  depthIntoSuitMm?: number;
  hostGapMm?: number;
  seatGapMm?: number;
  mount?: string | null;
  gapMm?: number;
  builtVerts?: number;
  /** 'asBuilt': the design is the as-built shape (the armour plates, body-shaped by design, A81): shape not judged. */
  shapeRef?: 'asBuilt';
}

export interface RigidCheck {
  name: string;
  pass: boolean;
  value: unknown;
  limit: string;
  detail: string;
}

/** The limits (step 11b "Checks"; DECISIONS D28). */
export const RIGID_LIMITS = { shapeMm: 1.0, spread: 0.001, weight: 0.01, depthMm: 0.5, seatMm: 3.0, sizeMm: 2.0, hostGapMm: 0.5 } as const;

/**
 * A82: hard parts below 5 cm (RIGID_DIAG) that a LOD's voxel shell absorbs - no vertex of the file carries their id
 * (no shell vertex lies within RIGID_ADOPT of them), so the shell there keeps its nearest-body weights. Any other hard
 * part missing from a LOD fails `rigidSkin:<lod>`.
 */
export const LOD_ABSORBED: Record<string, readonly string[]> = {
  lod1: ['browRivetL', 'browRivetR'],
  lod2: ['gadgetTab', 'camTab', 'slingSocket', 'rappelRing', 'browRivetL', 'browRivetR'],
};

/**
 * A82's procedure, measured per part and LOD (step 10 retry): a named part passes its absence only when its hero size
 * (bounding-box diagonal of its `_RIGID` vertices) is under `maxMm` (RIGID_DIAG's lower end: larger hard parts stay
 * separate) and the LOD's vertices within `nearM` of its hero vertices (the shell that took its place) carry at least
 * `share` of their weight on the part's declared bones. No shell vertex that near: nothing of the part is drawn there.
 */
export const ABSORB_LIMITS = { maxMm: 50, nearM: 0.01, share: 0.75 } as const;

/** Skinned vertices of a GLB: position, rigid id (0 = none) and the normalised joint weights by joint name. */
export interface SkinVerts { pos: number[][]; rid: number[]; w: Record<string, number>[] }

/** The skinned vertices of a GLB (`keep`: only the vertices whose rigid id passes, e.g. the hero's absorbed parts). */
export function glbSkinVerts(buf: Uint8Array, keep?: (rid: number) => boolean): SkinVerts {
  const g = readGlb(buf);
  const out: SkinVerts = { pos: [], rid: [], w: [] };
  for (const node of g.json.nodes) {
    if (node.mesh === undefined || node.skin === undefined) continue;
    const joints = g.json.skins![node.skin]!.joints.map((j) => g.json.nodes[j]!.name ?? `${j}`);
    for (const prim of g.json.meshes[node.mesh]!.primitives) {
      const a = prim.attributes;
      if (a.POSITION === undefined || a.JOINTS_0 === undefined || a.WEIGHTS_0 === undefined) continue;
      const key = Object.keys(a).find((k) => k.toUpperCase() === '_RIGID');
      const ids = key !== undefined ? readAccessor(g, a[key]!) : null;
      if (keep && !ids) continue;
      const P = readAccessor(g, a.POSITION);
      const J = readAccessor(g, a.JOINTS_0);
      const W = readAccessor(g, a.WEIGHTS_0);
      for (let i = 0; i < P.length; i++) {
        const rid = ids ? Math.round(ids[i]![0]!) : 0;
        if (keep && !keep(rid)) continue;
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += W[i]![k]!;
        const w: Record<string, number> = {};
        for (let k = 0; k < 4; k++) {
          const v = W[i]![k]! / (sum || 1);
          if (v <= 0) continue;
          const n = joints[J[i]![k]!] ?? `${J[i]![k]}`;
          w[n] = (w[n] ?? 0) + v;
        }
        out.pos.push(P[i]!);
        out.rid.push(rid);
        out.w.push(w);
      }
    }
  }
  return out;
}

/** What took an absorbed part's place in a LOD (A82). */
export interface AbsorbedMeasure { diagMm: number; near: number; declaredShare: number | null; weights: Record<string, number> }

/** The hero size of part `rid` and the mean weights of the LOD's vertices within ABSORB_LIMITS.nearM of it. */
export function absorbedMeasure(hero: SkinVerts, lod: SkinVerts, rid: number, declared: Record<string, number>): AbsorbedMeasure {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const pts: number[][] = [];
  for (let i = 0; i < hero.rid.length; i++) {
    if (hero.rid[i] !== rid) continue;
    const p = hero.pos[i]!;
    pts.push(p);
    for (let c = 0; c < 3; c++) {
      lo[c] = Math.min(lo[c]!, p[c]!);
      hi[c] = Math.max(hi[c]!, p[c]!);
    }
  }
  if (!pts.length) return { diagMm: NaN, near: 0, declaredShare: null, weights: {} };
  const diagMm = Math.round(Math.sqrt((hi[0]! - lo[0]!) ** 2 + (hi[1]! - lo[1]!) ** 2 + (hi[2]! - lo[2]!) ** 2) * 1e4) / 10;
  const r = ABSORB_LIMITS.nearM;
  const sum: Record<string, number> = {};
  let near = 0;
  for (let i = 0; i < lod.pos.length; i++) {
    const q = lod.pos[i]!;
    let out = false;
    for (let c = 0; c < 3; c++) if (q[c]! < lo[c]! - r || q[c]! > hi[c]! + r) out = true;
    if (out) continue;
    let hit = false;
    for (const p of pts) {
      if ((p[0]! - q[0]!) ** 2 + (p[1]! - q[1]!) ** 2 + (p[2]! - q[2]!) ** 2 < r * r) {
        hit = true;
        break;
      }
    }
    if (!hit) continue;
    near++;
    for (const [n, v] of Object.entries(lod.w[i]!)) sum[n] = (sum[n] ?? 0) + v;
  }
  const weights: Record<string, number> = {};
  for (const [n, v] of Object.entries(sum)) weights[n] = Math.round((v / near) * 100) / 100;
  let share: number | null = null;
  if (near) {
    let t = 0;
    for (const [n, v] of Object.entries(sum)) if ((declared[n] ?? 0) > 0) t += v / near;
    share = Math.round(t * 100) / 100;
  }
  return { diagMm, near, declaredShare: share, weights };
}

/**
 * True sizes (mm) as the part's design extents sorted largest first; null = not judged. Rifle magazine: 5.56 x 45
 * 30-round, 178 overall, 24 thick (its width runs 62-70 plus its curve); 9 mm pistol magazine 128 x 34 x 24; knife 190
 * overall; throwable canister 90 long, 25 x 18 oval (the caps' ridges 26-27 mm, so 26 judged); drone pod 84 x 80 x 19.
 */
export const RIGID_SIZES: Record<string, (number | null)[]> = {
  rifleMag: [178, null, 24],
  pistolMag: [128, 34, 24],
  knife: [190, null, null],
  canister: [90, 26, 18],
  dronePod: [84, 80, 19],
};

/** D28's skinning rule by part name (the builders' declarations are checked against it). */
export const BONE_RULE: [RegExp, Record<string, number>][] = [
  [/^rib2$/, { chest: 0.5, spine: 0.5 }],
  [/^rib3$/, { spine: 1 }],
  [/^(rifleMag|gadget|ptt|radio|chestPlate|rib1|backPlate)/, { chest: 1 }],
  [/^(pistolMag|camMine|camTab|slingSocket|dronePod|medPouch|rappelRing|beltBuckle|hangerBuckle)/, { pelvis: 1 }],
  [/^(knife|sleeve|canister|legBandBuckleL)/, { hipL: 1 }],
  [/^(holster|legBandBuckleR)/, { hipR: 1 }],
  [/^(headKit|browRivet)/, { head: 1 }],
];

type V3 = [number, number, number];

/** Eigen-decomposition of a symmetric 4x4 matrix (cyclic Jacobi): the eigenvector of the largest eigenvalue. */
function topEigen4(A: number[][]): number[] {
  const a = A.map((r) => r.slice());
  const v: number[][] = [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j): number => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 4; p++) for (let q = p + 1; q < 4; q++) off += a[p]![q]! ** 2;
    if (off < 1e-24) break;
    for (let p = 0; p < 4; p++) {
      for (let q = p + 1; q < 4; q++) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-30) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 4; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        for (let k = 0; k < 4; k++) {
          const apk = a[p]![k]!;
          const aqk = a[q]![k]!;
          a[p]![k] = c * apk - s * aqk;
          a[q]![k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 4; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  let best = 0;
  for (let i = 1; i < 4; i++) if (a[i]![i]! > a[best]![best]!) best = i;
  return [0, 1, 2, 3].map((k) => v[k]![best]!);
}

/**
 * Best-fit rigid alignment (Horn's quaternion method, rotation and translation, no scale) of `design` onto `world`
 * (paired points); returns the largest remaining distance (same units as the input).
 */
export function rigidResidual(design: number[][], world: number[][]): number {
  const n = Math.min(design.length, world.length);
  if (n === 0) return 0;
  const cd = [0, 0, 0];
  const cw = [0, 0, 0];
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) {
    cd[k] = cd[k]! + design[i]![k]! / n;
    cw[k] = cw[k]! + world[i]![k]! / n;
  }
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) S[a]![b]! += (design[i]![a]! - cd[a]!) * (world[i]![b]! - cw[b]!);
  }
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S as [V3, V3, V3];
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ];
  const [w, x, y, z] = topEigen4(N) as [number, number, number, number];
  const R = [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z],
  ];
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const d = [0, 1, 2].map((k) => design[i]![k]! - cd[k]!);
    let e2 = 0;
    for (let a = 0; a < 3; a++) {
      const r = R[a]![0]! * d[0]! + R[a]![1]! * d[1]! + R[a]![2]! * d[2]! + cw[a]! - world[i]![a]!;
      e2 += r * r;
    }
    worst = Math.max(worst, Math.sqrt(e2));
  }
  return worst;
}

/** The rule's bones for a part name, or undefined when no rule names it. */
export function ruleBones(name: string): Record<string, number> | undefined {
  return BONE_RULE.find(([re]) => re.test(name))?.[1];
}

function sameBones(a: Record<string, number>, b: Record<string, number>): boolean {
  const k = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...k].every((n) => Math.abs((a[n] ?? 0) - (b[n] ?? 0)) <= 1e-6);
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** The per-item rigidKit checks from check_garment.py's `rigid` list. No parts: one passing "none" line. */
export function rigidItemChecks(parts: RigidPart[]): RigidCheck[] {
  if (!parts.length) return [];
  const hard = parts.filter((p) => (p.role ?? 'hard') === 'hard');
  const judged = hard.filter((p) => p.shapeRef !== 'asBuilt');
  const shape = judged.filter((p) => p.design?.length).map((p) => ({ name: p.name, mm: r2(rigidResidual(p.design!, p.world!) * 1000) }));
  const noDesign = judged.filter((p) => (p.builtVerts ?? 0) > 0 && !p.design?.length).map((p) => `${p.name}: no design record`);
  const asBuilt = hard.length - judged.length;
  const badShape = shape.filter((s) => s.mm > RIGID_LIMITS.shapeMm);
  const depth = hard.filter((p) => p.depthIntoSuitMm !== undefined);
  const badDepth = depth.filter((p) => p.depthIntoSuitMm! > RIGID_LIMITS.depthMm).map((p) => `${p.name} ${p.depthIntoSuitMm} mm`);
  const seats = hard.filter((p) => p.seatGapMm !== undefined);
  const badSeat = seats.filter((p) => p.seatGapMm! > RIGID_LIMITS.seatMm && !(p.mount && parts.some((q) => q.name === p.mount && q.role === 'mount'))).map((p) => `${p.name} ${p.seatGapMm} mm, no mount`);
  const host = hard.filter((p) => p.hostGapMm !== undefined);
  const badHost = host.filter((p) => p.hostGapMm! > RIGID_LIMITS.hostGapMm).map((p) => `${p.name} ${p.hostGapMm} mm`);
  const sized = hard.filter((p) => p.size);
  const badSize: string[] = [];
  for (const p of sized) {
    const want = RIGID_SIZES[p.size!];
    const got = [...(p.extentMm ?? [])].sort((a, b) => b - a);
    if (!want || got.length !== 3) {
      badSize.push(`${p.name}: no size data`);
      continue;
    }
    want.forEach((w, i) => {
      if (w !== null && Math.abs(got[i]! - w) > RIGID_LIMITS.sizeMm) badSize.push(`${p.name} ${got[i]} mm vs ${w}`);
    });
  }
  const badBones = parts.filter((p) => {
    const want = ruleBones(p.name);
    return !want || !sameBones(want, p.bones);
  }).map((p) => `${p.name}: ${JSON.stringify(p.bones)} vs rule ${JSON.stringify(ruleBones(p.name) ?? 'none')}`);
  const worst = shape.reduce((m, s) => Math.max(m, s.mm), 0);
  return [
    { name: 'rigidKit:shape', pass: badShape.length === 0 && noDesign.length === 0, value: { parts: shape.length, worstMm: worst, ...(asBuilt ? { asBuilt } : {}) }, limit: `every hard part within ${RIGID_LIMITS.shapeMm} mm of its design (map-space) shape after best-fit rigid alignment`, detail: [...badShape.map((s) => `${s.name} ${s.mm} mm`), ...noDesign].join('; ') },
    { name: 'rigidKit:depth', pass: badDepth.length === 0, value: { parts: depth.length, worstMm: depth.reduce((m, p) => Math.max(m, p.depthIntoSuitMm!), 0) }, limit: `no hard vertex more than ${RIGID_LIMITS.depthMm} mm into the body (the suit)`, detail: badDepth.join('; ') },
    { name: 'rigidKit:seat', pass: badSeat.length === 0, value: seats.map((p) => `${p.name} ${p.seatGapMm} mm${p.mount ? ` on ${p.mount}` : ''}`), limit: `a seat gap over ${RIGID_LIMITS.seatMm} mm has a mount`, detail: badSeat.join('; ') },
    { name: 'rigidKit:hostGap', pass: badHost.length === 0, value: { parts: host.length, worstMm: host.reduce((m, p) => Math.max(m, p.hostGapMm!), 0) }, limit: `small hardware within ${RIGID_LIMITS.hostGapMm} mm of its host surface (none floating)`, detail: badHost.join('; ') },
    { name: 'rigidKit:size', pass: badSize.length === 0, value: sized.map((p) => `${p.name} ${[...(p.extentMm ?? [])].sort((a, b) => b - a).join(' x ')}`), limit: `true dimensions within ${RIGID_LIMITS.sizeMm} mm of RIGID_SIZES`, detail: badSize.join('; ') },
    { name: 'rigidKit:bones', pass: badBones.length === 0, value: parts.length, limit: "every part's declared bone(s) as D28's rule (BONE_RULE)", detail: badBones.join('; ') },
  ];
}

// ------------------------------------------------------------------------------------------------- GLB skin check
interface Accessor { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string; normalized?: boolean }
interface GlbFull {
  json: {
    accessors: Accessor[];
    bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
    meshes: { primitives: { attributes: Record<string, number> }[] }[];
    nodes: { name?: string; mesh?: number; skin?: number }[];
    skins?: { joints: number[] }[];
  };
  bin: Uint8Array;
}

/** A GLB's JSON and binary chunk. */
export function readGlb(buf: Uint8Array): GlbFull {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(buf.subarray(20, 20 + jl))) as GlbFull['json'];
  const bo = 20 + jl;
  const bl = bo + 8 <= buf.byteLength ? dv.getUint32(bo, true) : 0;
  return { json, bin: buf.subarray(bo + 8, bo + 8 + bl) };
}

const COMPS: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const SIZE: Record<number, number> = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };

/** An accessor as rows of numbers (normalized integers scaled to 0-1). */
export function readAccessor(g: GlbFull, i: number): number[][] {
  const a = g.json.accessors[i]!;
  const nc = COMPS[a.type]!;
  const cs = SIZE[a.componentType]!;
  const bv = g.json.bufferViews[a.bufferView ?? 0]!;
  const stride = bv.byteStride ?? nc * cs;
  const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.byteLength);
  const out: number[][] = [];
  for (let r = 0; r < a.count; r++) {
    const row: number[] = [];
    for (let c = 0; c < nc; c++) {
      const o = base + r * stride + c * cs;
      let v: number;
      switch (a.componentType) {
        case 5126: v = dv.getFloat32(o, true); break;
        case 5125: v = dv.getUint32(o, true); break;
        case 5123: v = dv.getUint16(o, true); if (a.normalized) v /= 65535; break;
        case 5122: v = dv.getInt16(o, true); if (a.normalized) v = Math.max(v / 32767, -1); break;
        case 5121: v = dv.getUint8(o); if (a.normalized) v /= 255; break;
        default: v = dv.getInt8(o); if (a.normalized) v = Math.max(v / 127, -1);
      }
      row.push(v);
    }
    out.push(row);
  }
  return out;
}

export interface RigidSkin { verts: number; spread: number; bones: string[]; weights: Record<string, number> }

/** Per rigid id in a GLB: vertex count, the largest per-joint weight spread, and the joints it uses (weight > 1e-3). */
export function glbRigidSkin(buf: Uint8Array): Record<string, RigidSkin> {
  const g = readGlb(buf);
  const out: Record<string, { verts: number; lo: Map<string, number>; hi: Map<string, number> }> = {};
  for (const node of g.json.nodes) {
    if (node.mesh === undefined) continue;
    const joints = node.skin !== undefined ? g.json.skins![node.skin]!.joints.map((j) => g.json.nodes[j]!.name ?? `${j}`) : [];
    for (const prim of g.json.meshes[node.mesh]!.primitives) {
      const key = Object.keys(prim.attributes).find((k) => k.toUpperCase() === '_RIGID');
      if (key === undefined || prim.attributes.JOINTS_0 === undefined) continue;
      const ids = readAccessor(g, prim.attributes[key]!);
      const J = readAccessor(g, prim.attributes.JOINTS_0);
      const W = readAccessor(g, prim.attributes.WEIGHTS_0!);
      for (let i = 0; i < ids.length; i++) {
        const rid = Math.round(ids[i]![0]!);
        if (!rid) continue;
        const w = new Map<string, number>();
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += W[i]![k]!;
        for (let k = 0; k < 4; k++) {
          const v = W[i]![k]! / (sum || 1);
          if (v <= 0) continue;
          const n = joints[J[i]![k]!] ?? `${J[i]![k]}`;
          w.set(n, (w.get(n) ?? 0) + v);
        }
        const e = (out[rid] ??= { verts: 0, lo: new Map(), hi: new Map() });
        for (const n of w.keys()) {
          if (!e.hi.has(n)) {
            e.hi.set(n, 0);
            e.lo.set(n, e.verts ? 0 : Infinity);
          }
        }
        for (const n of e.hi.keys()) {
          const v = w.get(n) ?? 0;
          e.lo.set(n, Math.min(e.lo.get(n)!, v));
          e.hi.set(n, Math.max(e.hi.get(n)!, v));
        }
        e.verts++;
      }
    }
  }
  const res: Record<string, RigidSkin> = {};
  for (const [rid, e] of Object.entries(out)) {
    let spread = 0;
    for (const [n, hi] of e.hi) spread = Math.max(spread, hi - (e.lo.get(n) ?? 0));
    const weights: Record<string, number> = {};
    for (const [n, hi] of e.hi) if (hi > 1e-3) weights[n] = Math.round(((hi + (e.lo.get(n) ?? 0)) / 2) * 1e4) / 1e4;
    res[rid] = { verts: e.verts, spread: Math.round(spread * 1e6) / 1e6, bones: Object.keys(weights).sort(), weights };
  }
  return res;
}

/**
 * The LOD skin check: every rigid part in the file has one weight vector (spread <= RIGID_LIMITS.spread) equal to its
 * declared bones' weights (normalised, within RIGID_LIMITS.weight per bone), and every registry 'hard' part is present
 * unless LOD_ABSORBED names it for this LOD (A82).
 */
export function rigidSkinCheck(
  lod: string, skin: Record<string, RigidSkin>,
  table: Record<string, { name: string; bones: Record<string, number>; role?: string }>,
  absorbed: readonly string[] = LOD_ABSORBED[lod] ?? [],
  measured?: Record<string, AbsorbedMeasure>,
): RigidCheck {
  const bad: string[] = [];
  let worst = 0;
  let worstW = 0;
  for (const [rid, s] of Object.entries(skin)) {
    const e = table[rid];
    if (!e) {
      bad.push(`id ${rid}: not in the registry`);
      continue;
    }
    worst = Math.max(worst, s.spread);
    if (s.spread > RIGID_LIMITS.spread) bad.push(`${e.name} spread ${s.spread}`);
    const sum = Object.values(e.bones).reduce((m, w) => m + Math.max(w, 0), 0) || 1;
    const names = new Set([...Object.keys(e.bones), ...Object.keys(s.weights)]);
    for (const n of names) {
      const d = Math.abs((s.weights[n] ?? 0) - Math.max(e.bones[n] ?? 0, 0) / sum);
      worstW = Math.max(worstW, d);
      if (d > RIGID_LIMITS.weight) {
        bad.push(`${e.name} weights ${JSON.stringify(s.weights)} vs declared ${JSON.stringify(e.bones)}`);
        break;
      }
    }
  }
  const missing = Object.entries(table).filter(([rid, e]) => (e.role ?? 'hard') === 'hard' && !skin[rid]).map(([, e]) => e.name);
  const absent = missing.filter((n) => absorbed.includes(n));
  for (const n of missing) if (!absorbed.includes(n)) bad.push(`${n}: hard part missing from the file (not in A82's list)`);
  // A82 measured (check.mjs passes what the hero and this LOD hold): a named absence must still meet the procedure
  const shell: string[] = [];
  if (measured) {
    for (const n of absent) {
      const m = measured[n];
      if (!m || !Number.isFinite(m.diagMm)) bad.push(`${n}: absorbed but not measured in the hero`);
      else if (m.diagMm >= ABSORB_LIMITS.maxMm) bad.push(`${n}: absorbed at ${m.diagMm} mm (A82: under ${ABSORB_LIMITS.maxMm} mm only)`);
      else if (m.near && (m.declaredShare ?? 0) < ABSORB_LIMITS.share) {
        bad.push(`${n}: the shell in its place carries ${JSON.stringify(m.weights)}, ${m.declaredShare} on its declared bones (< ${ABSORB_LIMITS.share})`);
      }
      if (m) shell.push(`${n} ${m.diagMm} mm, ${m.near} shell verts ${JSON.stringify(m.weights)}`);
    }
  }
  return {
    name: `rigidSkin:${lod}`,
    pass: bad.length === 0 && Object.keys(skin).length > 0,
    value: { parts: Object.keys(skin).length, verts: Object.values(skin).reduce((m, s) => m + s.verts, 0), worstSpread: worst, worstWeightDiff: Math.round(worstW * 1e4) / 1e4, ...(absent.length ? { shellAbsorbed: measured ? shell : absent } : {}) },
    limit: `every rigid part one weight vector (spread <= ${RIGID_LIMITS.spread}) equal to its declared weights (within ${RIGID_LIMITS.weight}); every hard part present unless A82 names it (under ${ABSORB_LIMITS.maxMm} mm; the shell within ${ABSORB_LIMITS.nearM * 1000} mm >= ${ABSORB_LIMITS.share} on its bones); at least one part tagged`,
    detail: bad.join('; '),
  };
}

/** The compact-gun sling socket's clock position on the belt (12 = front centre, 9 = the wearer's left): about 8 o'clock
 * (D28: behind the 9 o'clock pistol magazines), 7.5-8.5. */
export function slingClockCheck(clock: number | undefined): RigidCheck {
  const ok = typeof clock === 'number' && clock >= 7.5 && clock <= 8.5;
  return { name: 'anchors:slingSocket', pass: ok, value: clock ?? 'not measured', limit: "about 8 o'clock (7.5-8.5), D28", detail: '' };
}
