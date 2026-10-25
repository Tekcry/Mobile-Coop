// anim-skeleton S1 (docs/archive/anim-skeleton/PLAN.md): gives the shipped Wren GLBs a real clavicle and finger joints, and the
// LOD0 / LOD1 glove fingers knuckle loops so they bend smoothly, without a full operator rebuild (the garment blends are
// not on this machine; bake_lods.py makes the same thing on the next full bake through py/skeleton.py).
//
//   node scripts/anim-skeleton/skin.mjs [--check] [--dump <dir>]
//   --check  report only, write nothing
//   --dump   also write the right hand of LOD0 without and with the knuckle loops (JSON, for py/hand_sheet.py)
//
// Per file (src/operators/assets/wren/wren-{hero,lod0,lod1,lod2}.glb, rewritten in place; constants in skeleton.json):
// - every file (job lead, gear offsets): `goggleStow` / `goggleUse` skin joints under the head (the head's rotation,
//   pivots in skeleton.json); the goggle parts that are fully on head move wholly onto them (by `_GOGGLE` when a
//   primitive has it; the shipped files do not: the lens and the rigid head-kit pieces inside the goggle box, in use).
// - every file: `clavL` / `clavR` skin joints, parent chest, at the sternoclavicular point with the chest's rotation;
//   shL / shR become their children with their world rest unchanged. Weights: the chest's share near each shoulder
//   moves to the clavicle by the P0 falloff (smoothstep across |x| and up y). Rigid parts (`_RIGID` > 0) keep theirs (D28).
// - LOD0 / LOD1: the hero's 30 finger joints (same names, local rests copied from the hero, under the wrists, inverse
//   binds from the hero). Each wrist-weighted vertex takes the finger share of its 4 nearest hero hand vertices (P0).
//   The glove fingers get knuckle loops first: planes across each finger at MCP / PIP / DIP (and offsets) cut every
//   glove edge they cross near that joint; new vertices sit on the old edges, their attributes interpolated (normal and
//   tangent renormalised, weights blended), so the surface at rest is unchanged.
// - max 4 influences, renormalised; only vertices whose weights change are rewritten.
// New joints go at the END of the skin, so every existing JOINTS_0 index stays valid. Textures, images, materials and
// anchors are copied byte for byte; only the skin, the nodes and the changed primitives' accessors change. A file that
// already has `clavL` is left alone (re-running is a no-op). Deterministic; no network.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { accessorView, readGlb } from '../operators/toe-skin.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CFG = JSON.parse(readFileSync(path.join(ROOT, 'scripts', 'anim-skeleton', 'skeleton.json'), 'utf8'));
export const FINGER_LODS = new Set(CFG.fingers.lods);
const SIDES = ['L', 'R'];

// ---------------------------------------------------------------- 4x4 matrices (column-major, glTF)
function compose(t = [0, 0, 0], r = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = r;
  const m = new Float64Array(16);
  m[0] = (1 - 2 * (y * y + z * z)) * s[0]; m[1] = 2 * (x * y + z * w) * s[0]; m[2] = 2 * (x * z - y * w) * s[0];
  m[4] = 2 * (x * y - z * w) * s[1]; m[5] = (1 - 2 * (x * x + z * z)) * s[1]; m[6] = 2 * (y * z + x * w) * s[1];
  m[8] = 2 * (x * z + y * w) * s[2]; m[9] = 2 * (y * z - x * w) * s[2]; m[10] = (1 - 2 * (x * x + y * y)) * s[2];
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
  return m;
}
function mul(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function invert(m) {
  const inv = new Float64Array(16);
  const a = m;
  inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
  inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
  inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
  inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
  inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
  inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
  inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
  inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
  inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
  inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
  inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
  inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
  inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
  inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
  inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
  inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
  const det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12];
  for (let i = 0; i < 16; i++) inv[i] /= det;
  return inv;
}
const apply = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
const len3 = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm3 = (a) => { const l = len3(a); return [a[0] / l, a[1] / l, a[2] / l]; };
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** World matrix of every node (scene roots at identity). */
export function worldMatrices(json) {
  const parent = json.nodes.map(() => -1);
  json.nodes.forEach((n, i) => n.children?.forEach((c) => { parent[c] = i; }));
  const out = new Array(json.nodes.length);
  const get = (i) => {
    if (out[i]) return out[i];
    const n = json.nodes[i];
    const l = n.matrix ? Float64Array.from(n.matrix) : compose(n.translation, n.rotation, n.scale);
    out[i] = parent[i] >= 0 ? mul(get(parent[i]), l) : l;
    return out[i];
  };
  json.nodes.forEach((_, i) => get(i));
  return { world: out, parent };
}

// ---------------------------------------------------------------- primitives
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

/** Every skinned primitive: its attribute arrays (copies) and indices. */
function readPrims(json, bin) {
  const out = [];
  json.meshes.forEach((m, mi) => m.primitives.forEach((p, pi) => {
    const a = p.attributes;
    if (a.JOINTS_0 === undefined || a.WEIGHTS_0 === undefined) return;
    const attrs = {};
    for (const [k, i] of Object.entries(a)) {
      const v = accessorView(json, bin, i);
      attrs[k] = { data: v.slice(), comp: COMP[json.accessors[i].type], acc: i };
    }
    const iv = accessorView(json, bin, p.indices);
    out.push({ mesh: mi, prim: pi, p, attrs, idx: Uint32Array.from(iv), idxAcc: p.indices, n: json.accessors[a.POSITION].count });
  }));
  return out;
}

/** Joint -> weight map of vertex v. */
function inflOf(pr, v) {
  const J = pr.attrs.JOINTS_0.data, W = pr.attrs.WEIGHTS_0.data;
  const m = new Map();
  for (let k = 0; k < 4; k++) {
    const w = W[v * 4 + k];
    if (w > 0) m.set(J[v * 4 + k], (m.get(J[v * 4 + k]) ?? 0) + w);
  }
  return m;
}

/** Writes the top 4 influences of `m` (ties by joint index), renormalised; empty slots joint 0 weight 0. */
function setInfl(pr, v, m) {
  const J = pr.attrs.JOINTS_0.data, W = pr.attrs.WEIGHTS_0.data;
  const e = [...m.entries()].filter(([, w]) => w > 1e-6).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 4);
  const s = e.reduce((t, [, w]) => t + w, 0) || 1;
  for (let k = 0; k < 4; k++) {
    J[v * 4 + k] = e[k] ? e[k][0] : 0;
    W[v * 4 + k] = e[k] ? e[k][1] / s : 0;
  }
}

// ---------------------------------------------------------------- joints
/** Skin joint names (skin order). */
const jointNames = (json) => json.skins[0].joints.map((j) => json.nodes[j].name ?? '');

/** Hero finger joints: per name, local TRS, parent name, world matrix and inverse bind. */
export function heroFingers(json, bin) {
  const { world, parent } = worldMatrices(json);
  const names = jointNames(json);
  const ibm = accessorView(json, bin, json.skins[0].inverseBindMatrices);
  const out = [];
  json.skins[0].joints.forEach((ni, s) => {
    const n = json.nodes[ni];
    if (!/^finger[LR]_\d_\d$/.test(n.name)) return;
    out.push({
      name: n.name, translation: n.translation, rotation: n.rotation, scale: n.scale, parent: json.nodes[parent[ni]].name,
      world: world[ni], ibm: Float32Array.from(ibm.subarray(s * 16, s * 16 + 16)),
    });
  });
  if (out.length !== 30) throw new Error(`hero: ${out.length} finger joints, not 30`);
  if (names.indexOf('wrL') < 0) throw new Error('hero: no wrL');
  return out;
}

/** The sternoclavicular point per side (glTF frame) from the neck and chest joints' world rest. */
export function scPoints(json, world) {
  const at = (nm) => world[json.nodes.findIndex((n) => n.name === nm)];
  const neck = at('neck'), chest = at('chest');
  const c = CFG.clavicle;
  return {
    L: [c.lateral, neck[13] - c.belowNeck, chest[14] + c.forward],
    R: [-c.lateral, neck[13] - c.belowNeck, chest[14] + c.forward],
  };
}

/**
 * Adds clavL / clavR (and the hero's fingers when `fingers`) to the node tree and skin, in place. Returns the new
 * inverse bind matrices (old ones first) and the new joints' skin slots.
 */
function addJoints(json, bin, fingers) {
  const { world } = worldMatrices(json);
  const idx = (nm) => json.nodes.findIndex((n) => n.name === nm);
  const skin = json.skins[0];
  const oldIbm = accessorView(json, bin, skin.inverseBindMatrices);
  const ibms = [oldIbm.slice()];
  const sc = scPoints(json, world);
  const chest = idx('chest');
  const chestInv = invert(world[chest]);
  const added = {};
  const push = (node, ibm) => {
    json.nodes.push(node);
    const ni = json.nodes.length - 1;
    skin.joints.push(ni);
    ibms.push(ibm);
    added[node.name] = skin.joints.length - 1;
    return ni;
  };
  for (const s of SIDES) {
    const sh = idx(`sh${s}`);
    const t = apply(chestInv, ...sc[s]);
    const clavWorld = mul(world[chest], compose(t));
    const ni = push({ name: `clav${s}`, translation: t, children: [sh] }, Float32Array.from(invert(clavWorld)));
    const ch = json.nodes[chest].children;
    ch[ch.indexOf(sh)] = ni;
    // shoulder: local = inverse(clav local) * old local; the clavicle has no rotation or scale, so only T moves
    const st = json.nodes[sh].translation ?? [0, 0, 0];
    json.nodes[sh].translation = [st[0] - t[0], st[1] - t[1], st[2] - t[2]];
  }
  // (job lead, gear offsets) the goggle's own joints under the head, the head's rotation, at their pivots
  const head = idx('head');
  const headInv = invert(world[head]);
  for (const [name, at] of [['goggleStow', CFG.goggle.stow ?? CFG.goggle.use], ['goggleUse', CFG.goggle.use]]) {
    const t = apply(headInv, ...at);
    const ni = push({ name, translation: t }, Float32Array.from(invert(mul(world[head], compose(t)))));
    (json.nodes[head].children ??= []).push(ni);
  }
  if (fingers) {
    const nodeOf = {};
    for (const f of fingers) {
      const node = { name: f.name, translation: f.translation, rotation: f.rotation };
      if (f.scale) node.scale = f.scale;
      nodeOf[f.name] = push(node, f.ibm);
    }
    for (const f of fingers) {
      const p = nodeOf[f.parent] ?? idx(f.parent);
      if (p < 0) throw new Error(`no parent ${f.parent} for ${f.name}`);
      const pn = json.nodes[p];
      (pn.children ??= []).push(nodeOf[f.name]);
    }
    // the hero's finger rests must land where the hero has them (same wrists)
    const w2 = worldMatrices(json).world;
    let err = 0;
    for (const f of fingers) for (let k = 0; k < 16; k++) err = Math.max(err, Math.abs(w2[nodeOf[f.name]][k] - f.world[k]));
    if (err > 1e-5) throw new Error(`finger rests differ from the hero's by ${err}`);
  }
  const all = new Float32Array(skin.joints.length * 16);
  let o = 0;
  for (const m of ibms) { all.set(m, o); o += m.length; }
  return { ibm: all, added };
}

// ---------------------------------------------------------------- rest deformation (linear blend skinning)
function skinMats(json, ibm) {
  const { world } = worldMatrices(json);
  return json.skins[0].joints.map((ni, s) => mul(world[ni], Float64Array.from(ibm.subarray(s * 16, s * 16 + 16))));
}
function restOf(pr, mats, v) {
  const P = pr.attrs.POSITION.data, J = pr.attrs.JOINTS_0.data, W = pr.attrs.WEIGHTS_0.data;
  const o = [0, 0, 0];
  let ws = 0;
  for (let k = 0; k < 4; k++) {
    const w = W[v * 4 + k];
    if (!(w > 0)) continue;
    const q = apply(mats[J[v * 4 + k]], P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
    o[0] += w * q[0]; o[1] += w * q[1]; o[2] += w * q[2];
    ws += w;
  }
  return ws > 0 ? [o[0] / ws, o[1] / ws, o[2] / ws] : [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]];
}

// ---------------------------------------------------------------- nearest-neighbour grid
function grid(pts, cell) {
  const cells = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  const n = pts.length / 3;
  for (let i = 0; i < n; i++) {
    const k = key(Math.floor(pts[i * 3] / cell), Math.floor(pts[i * 3 + 1] / cell), Math.floor(pts[i * 3 + 2] / cell));
    let c = cells.get(k);
    if (!c) cells.set(k, (c = []));
    c.push(i);
  }
  return {
    /** The k nearest points within maxD: [[index, distance], ...] nearest first. */
    knn(x, y, z, k, maxD) {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      const best = [];
      const rings = Math.ceil(maxD / cell) + 1;
      for (let r = 0; r <= rings; r++) {
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
          const c = cells.get(key(cx + dx, cy + dy, cz + dz));
          if (!c) continue;
          for (const i of c) {
            const d = Math.sqrt((pts[i * 3] - x) ** 2 + (pts[i * 3 + 1] - y) ** 2 + (pts[i * 3 + 2] - z) ** 2);
            if (d > maxD) continue;
            if (best.length === k && d >= best[k - 1][1]) continue;
            best.push([i, d]);
            best.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
            if (best.length > k) best.pop();
          }
        }
        if (best.length === k && best[k - 1][1] <= r * cell) break;
      }
      return best;
    },
  };
}

// ---------------------------------------------------------------- the hand: finger chains and cut planes
/** Per side: the 5 finger chains (joint positions + a tip) and the cut planes at each joint. */
export function handPlanes(fingers, offsets) {
  const W = Object.fromEntries(fingers.map((f) => [f.name, f.world]));
  const pos = (nm) => [W[nm][12], W[nm][13], W[nm][14]];
  const yAxis = (nm) => norm3([W[nm][4], W[nm][5], W[nm][6]]);
  const chains = {};
  const planes = [];
  for (const s of SIDES) {
    chains[s] = [];
    for (let k = 1; k <= 5; k++) {
      const j = [1, 2, 3].map((i) => pos(`finger${s}_${k}_${i}`));
      const seg = [len3(sub3(j[1], j[0])), len3(sub3(j[2], j[1]))];
      const d3 = yAxis(`finger${s}_${k}_3`);
      const tipLen = seg[1] * 0.9;
      const tip = [j[2][0] + d3[0] * tipLen, j[2][1] + d3[1] * tipLen, j[2][2] + d3[2] * tipLen];
      chains[s].push([...j, tip]);
      // the shorter segment either side of each joint (MCP: the proximal one only; the metacarpal is long)
      const span = [seg[0], Math.min(seg[0], seg[1]), Math.min(seg[1], tipLen)];
      for (let i = 0; i < 3; i++) {
        const n = yAxis(`finger${s}_${k}_${i + 1}`);
        for (const f of offsets) {
          const o = j[i];
          const d = f * span[i];
          planes.push({ side: s, finger: k, joint: i + 1, offset: f, o: [o[0] + n[0] * d, o[1] + n[1] * d, o[2] + n[2] * d], n,
            radius: k === 1 ? CFG.knuckles.thumbRadius : CFG.knuckles.radius });
        }
      }
    }
  }
  return { chains, planes };
}

/** Distance from p to a polyline. */
function polyDist(p, pts) {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const ab = sub3(b, a);
    const t = Math.max(0, Math.min(1, dot3(sub3(p, a), ab) / dot3(ab, ab)));
    best = Math.min(best, len3([a[0] + ab[0] * t - p[0], a[1] + ab[1] * t - p[1], a[2] + ab[2] * t - p[2]]));
  }
  return best;
}
function nearestFinger(p, chains) {
  let bk = 0, bd = Infinity;
  chains.forEach((c, i) => { const d = polyDist(p, c); if (d < bd) { bd = d; bk = i + 1; } });
  return bk;
}

/**
 * Knuckle loops (in place on `pr`): each plane in turn cuts every glove edge crossing it near its joint. `hand(v, s)`
 * says whether vertex v is glove on side s. `src` tracks each vertex as a blend of the original vertices (rest check).
 * Returns the number of new vertices.
 */
function knuckleLoops(pr, planes, chains, hand) {
  const n0 = pr.n;
  const src = pr.src;
  let added = 0;
  const snap = CFG.knuckles.snap;
  for (const pl of planes) {
    const P = pr.attrs.POSITION.data;
    const R = pr.attrs._RIGID?.data;
    const tri = pr.idx;
    const made = new Map();
    const newAttr = Object.fromEntries(Object.keys(pr.attrs).map((k) => [k, []]));
    const newSrc = [];
    const d = (v) => (P[v * 3] - pl.o[0]) * pl.n[0] + (P[v * 3 + 1] - pl.o[1]) * pl.n[1] + (P[v * 3 + 2] - pl.o[2]) * pl.n[2];
    const lexLess = (a, b) => {
      for (let k = 0; k < 3; k++) if (P[a * 3 + k] !== P[b * 3 + k]) return P[a * 3 + k] < P[b * 3 + k];
      return a < b;
    };
    /** The new vertex on edge (a, b), or -1 when the plane does not cut it here. */
    const split = (ia, ib) => {
      const key = ia < ib ? ia * 4194304 + ib : ib * 4194304 + ia;
      const hit = made.get(key);
      if (hit !== undefined) return hit;
      // canonical order by position, so both copies of a seam edge get the same point
      const [a, b] = lexLess(ia, ib) ? [ia, ib] : [ib, ia];
      let out = -1;
      const da = d(a), db = d(b);
      const t = da * db < 0 ? da / (da - db) : -1;
      const x = t > 0 ? [0, 1, 2].map((k) => P[a * 3 + k] + (P[b * 3 + k] - P[a * 3 + k]) * t) : null;
      const el = x ? len3(sub3([P[a * 3], P[a * 3 + 1], P[a * 3 + 2]], [P[b * 3], P[b * 3 + 1], P[b * 3 + 2]])) : 0;
      if (x && len3(sub3(x, pl.o)) < pl.radius && t * el > snap && (1 - t) * el > snap && !(R && (R[a] > 0 || R[b] > 0))
        && hand(a, pl.side) && hand(b, pl.side) && nearestFinger(x, chains[pl.side]) === pl.finger) {
        out = pr.n + newSrc.length;
        for (const [k, at] of Object.entries(pr.attrs)) {
          const c = at.comp, D = at.data, o = newAttr[k];
          if (k === 'JOINTS_0' || k === 'WEIGHTS_0') continue;
          if (k === 'POSITION') { o.push(...x); continue; }
          if (k === '_RIGID' || k === '_GOGGLE') { o.push(0); continue; }
          const v = [];
          for (let q = 0; q < c; q++) v.push(D[a * c + q] + (D[b * c + q] - D[a * c + q]) * t);
          if (k === 'NORMAL') { o.push(...norm3(v)); continue; }
          if (k === 'TANGENT') { o.push(...norm3(v.slice(0, 3)), t < 0.5 ? D[a * 4 + 3] : D[b * 4 + 3]); continue; }
          if (!k.startsWith('TEXCOORD_')) throw new Error(`knuckle loops: no rule for attribute ${k}`);
          o.push(...v);
        }
        const m = new Map();
        for (const [j, w] of inflOf(pr, a)) m.set(j, (m.get(j) ?? 0) + w * (1 - t));
        for (const [j, w] of inflOf(pr, b)) m.set(j, (m.get(j) ?? 0) + w * t);
        newAttr.JOINTS_0.push(m);
        const s = new Map();
        for (const [v, w] of src.get(a) ?? [[a, 1]]) s.set(v, (s.get(v) ?? 0) + w * (1 - t));
        for (const [v, w] of src.get(b) ?? [[b, 1]]) s.set(v, (s.get(v) ?? 0) + w * t);
        newSrc.push([...s.entries()]);
      }
      made.set(key, out);
      return out;
    };
    const out = [];
    for (let f = 0; f < tri.length; f += 3) {
      const v = [tri[f], tri[f + 1], tri[f + 2]];
      const m = [split(v[0], v[1]), split(v[1], v[2]), split(v[2], v[0])];
      const cuts = m.filter((x) => x >= 0).length;
      if (cuts === 0) { out.push(...v); continue; }
      if (cuts === 1) {
        const e = m.findIndex((x) => x >= 0);
        const a = v[e], b = v[(e + 1) % 3], c = v[(e + 2) % 3];
        out.push(a, m[e], c, m[e], b, c);
        continue;
      }
      // two cuts: the lone vertex is shared by both cut edges
      const lone = m[0] >= 0 && m[2] >= 0 ? 0 : m[0] >= 0 && m[1] >= 0 ? 1 : 2;
      const a = v[lone], b = v[(lone + 1) % 3], c = v[(lone + 2) % 3];
      const m1 = m[lone], m2 = m[(lone + 2) % 3];
      out.push(a, m1, m2);
      // the quad m1 b c m2, split along its shorter diagonal
      const at = (i) => (i < pr.n ? [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]] : newAttr.POSITION.slice((i - pr.n) * 3, (i - pr.n) * 3 + 3));
      if (len3(sub3(at(m1), at(c))) <= len3(sub3(at(b), at(m2)))) out.push(m1, b, c, m1, c, m2);
      else out.push(m1, b, m2, b, c, m2);
    }
    const k = newSrc.length;
    pl.verts = (pl.verts ?? 0) + k;
    pl.tris = (pl.tris ?? 0) + out.length / 3 - tri.length / 3;
    if (!k) continue;
    // grow the attribute arrays
    for (const [name, at] of Object.entries(pr.attrs)) {
      const C = at.data.constructor;
      const grown = new C((pr.n + k) * at.comp);
      grown.set(at.data);
      if (name !== 'JOINTS_0' && name !== 'WEIGHTS_0') grown.set(newAttr[name], pr.n * at.comp);
      at.data = grown;
    }
    newAttr.JOINTS_0.forEach((m, i) => setInfl(pr, pr.n + i, m));
    newSrc.forEach((s, i) => src.set(pr.n + i, s));
    pr.n += k;
    pr.idx = Uint32Array.from(out);
    added += k;
  }
  pr.changedGeom = pr.n !== n0;
  return added;
}

// ---------------------------------------------------------------- weights
/** Hero hand samples per side: positions and the finger shares (finger weight / (wrist + fingers)), 15 per sample. */
export function heroHands(json, bin) {
  const names = jointNames(json);
  const prims = readPrims(json, bin);
  const out = {};
  for (const s of SIDES) {
    const wr = names.indexOf(`wr${s}`);
    const fing = names.map((n, i) => (n.startsWith(`finger${s}_`) ? i : -1)).filter((i) => i >= 0);
    const col = new Map(fing.map((j, c) => [j, c]));
    const pts = [], share = [];
    for (const pr of prims) {
      const P = pr.attrs.POSITION.data, J = pr.attrs.JOINTS_0.data, W = pr.attrs.WEIGHTS_0.data;
      for (let v = 0; v < pr.n; v++) {
        let tot = 0;
        const f = new Float64Array(fing.length);
        for (let k = 0; k < 4; k++) {
          const j = J[v * 4 + k], w = W[v * 4 + k];
          if (!(w > 0)) continue;
          if (j === wr) tot += w;
          else if (col.has(j)) { tot += w; f[col.get(j)] += w; }
        }
        if (tot <= 0.01) continue;
        pts.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
        for (let c = 0; c < f.length; c++) share.push(f[c] / tot);
      }
    }
    out[s] = { names: fing.map((j) => names[j]), pts: Float64Array.from(pts), share: Float64Array.from(share), grid: grid(pts, 0.01) };
  }
  return out;
}

function fingerWeights(pr, slot, hands) {
  const P = pr.attrs.POSITION.data, R = pr.attrs._RIGID?.data;
  const rep = {};
  for (const s of SIDES) {
    const wr = slot[`wr${s}`];
    const h = hands[s];
    const cols = h.names.map((n) => slot[n]);
    let sel = 0, moved = 0, far = 0;
    for (let v = 0; v < pr.n; v++) {
      if (R && R[v] > 0) continue;
      const m = inflOf(pr, v);
      const w = m.get(wr);
      if (!(w > 0)) continue;
      sel++;
      const hits = h.grid.knn(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], CFG.fingers.k, CFG.fingers.maxDist);
      if (!hits.length) { far++; continue; }
      const f = new Float64Array(cols.length);
      let ws = 0;
      for (const [i, d] of hits) {
        const iw = 1 / Math.max(d, 1e-4);
        ws += iw;
        for (let c = 0; c < cols.length; c++) f[c] += h.share[i * cols.length + c] * iw;
      }
      let fs = 0;
      for (let c = 0; c < cols.length; c++) { f[c] /= ws; fs += f[c]; }
      if (fs < 1e-4) continue;
      m.set(wr, w * (1 - fs));
      for (let c = 0; c < cols.length; c++) if (f[c] > 0) m.set(cols[c], (m.get(cols[c]) ?? 0) + w * f[c]);
      setInfl(pr, v, m);
      pr.changed.add(v);
      moved++;
    }
    rep[s] = { wristVerts: sel, fingerWeighted: moved, farFromHero: far };
  }
  return rep;
}

const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function clavicleWeights(pr, slot) {
  const P = pr.attrs.POSITION.data, R = pr.attrs._RIGID?.data;
  const c = CFG.clavicle;
  const chest = slot.chest;
  const rep = { L: 0, R: 0 };
  for (let v = 0; v < pr.n; v++) {
    if (R && R[v] > 0) continue;
    const m = inflOf(pr, v);
    const w = m.get(chest);
    if (!(w > 0)) continue;
    const x = P[v * 3], y = P[v * 3 + 1];
    const share = smooth(c.x[0], c.x[1], Math.abs(x)) * smooth(c.y[0], c.y[1], y) * c.max;
    if (share <= 1e-4 || x === 0) continue;
    const s = x > 0 ? 'L' : 'R';
    m.set(chest, w * (1 - share));
    m.set(slot[`clav${s}`], (m.get(slot[`clav${s}`]) ?? 0) + w * share);
    setInfl(pr, v, m);
    pr.changed.add(v);
    rep[s]++;
  }
  return rep;
}

/**
 * The goggle parts onto goggleUse / goggleStow (wholly), only vertices fully on head: by _GOGGLE when the primitive
 * has it, else the lens primitive (`lens`) and every connected rigid piece inside the goggle box. Returns the counts.
 */
function goggleWeights(pr, slot, lens) {
  const P = pr.attrs.POSITION.data, R = pr.attrs._RIGID?.data, G = pr.attrs._GOGGLE?.data;
  const head = slot.head;
  const onHead = (v) => (inflOf(pr, v).get(head) ?? 0) >= 0.999;
  const cls = new Uint8Array(pr.n);
  if (G) {
    for (let v = 0; v < pr.n; v++) { const g = Math.round(G[v]); if ((g === 1 || g === 2) && onHead(v)) cls[v] = g; }
  } else if (lens) {
    for (let v = 0; v < pr.n; v++) if (onHead(v)) cls[v] = 1;
  } else if (R) {
    // connected rigid pieces (triangles among rigid vertices, welded by position)
    const par = Int32Array.from({ length: pr.n }, (_, i) => i);
    const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
    const I = pr.idx;
    for (let t = 0; t < I.length; t += 3) if (R[I[t]] > 0 && R[I[t + 1]] > 0 && R[I[t + 2]] > 0) { join(I[t], I[t + 1]); join(I[t + 1], I[t + 2]); }
    const at = new Map();
    for (let v = 0; v < pr.n; v++) {
      if (!(R[v] > 0)) continue;
      const k = `${P[v * 3]},${P[v * 3 + 1]},${P[v * 3 + 2]}`;
      if (at.has(k)) join(v, at.get(k)); else at.set(k, v);
    }
    const b = CFG.goggle.box;
    const inBox = (v) => P[v * 3] >= b.x[0] && P[v * 3] <= b.x[1] && P[v * 3 + 1] >= b.y[0] && P[v * 3 + 1] <= b.y[1] && P[v * 3 + 2] >= b.z[0] && P[v * 3 + 2] <= b.z[1];
    const ok = new Map();
    for (let v = 0; v < pr.n; v++) {
      if (!(R[v] > 0)) continue;
      const r = find(v);
      ok.set(r, (ok.get(r) ?? true) && inBox(v) && onHead(v));
    }
    for (let v = 0; v < pr.n; v++) if (R[v] > 0 && ok.get(find(v))) cls[v] = 1;
  }
  const out = { use: 0, stow: 0 };
  for (let v = 0; v < pr.n; v++) {
    if (!cls[v]) continue;
    setInfl(pr, v, new Map([[cls[v] === 1 ? slot.goggleUse : slot.goggleStow, 1]]));
    pr.changed.add(v);
    out[cls[v] === 1 ? 'use' : 'stow']++;
  }
  return out;
}

// ---------------------------------------------------------------- GLB writing
/** Rebuilds the GLB: bufferViews in order (4-byte aligned), `repl` (bufferView -> bytes) replacing their contents. */
export function writeGlb(json, bin, repl) {
  const parts = [];
  let off = 0;
  json.bufferViews.forEach((bv, i) => {
    const data = repl.get(i) ?? bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
    const pad = (4 - (off % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
    bv.byteOffset = off;
    bv.byteLength = data.byteLength;
    parts.push(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    off += data.byteLength;
  });
  const binPad = (4 - (off % 4)) % 4;
  if (binPad) parts.push(Buffer.alloc(binPad));
  json.buffers[0].byteLength = off;
  let js = Buffer.from(JSON.stringify(json), 'utf8');
  const jsPad = (4 - (js.length % 4)) % 4;
  if (jsPad) js = Buffer.concat([js, Buffer.alloc(jsPad, 0x20)]);
  const binLen = off + binPad;
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + js.length + 8 + binLen, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(js.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(binLen, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, jh, js, bh, ...parts]);
}

/** The accessor's bufferView, checked to be its own (not shared) and offset 0. */
function ownView(json, ai) {
  const a = json.accessors[ai];
  const users = json.accessors.filter((x) => x.bufferView === a.bufferView).length;
  if (users !== 1 || (a.byteOffset ?? 0) !== 0) throw new Error(`accessor ${ai}: shared or offset bufferView`);
  return a.bufferView;
}

// ---------------------------------------------------------------- one file
/**
 * Patches one GLB buffer. `lod`: hero / lod0 / lod1 / lod2. Returns { buf, report } (buf null when already patched).
 * `keepLoops: false` skips the knuckle loops (the "before" variant for the hand sheet).
 */
export function patchGlb(buf, lod, heroFing, hands, { loops = true } = {}) {
  const { json, bin } = readGlb(buf);
  const names0 = jointNames(json);
  if (names0.includes('clavL')) return { buf: null, report: 'already patched' };
  const fingers = FINGER_LODS.has(lod);
  if (fingers && names0.some((n) => n.startsWith('finger'))) throw new Error(`${lod}: has finger joints but no clavicle`);
  const prims = readPrims(json, bin);
  const before = skinMats(json, accessorView(json, bin, json.skins[0].inverseBindMatrices));
  const restBefore = prims.map((pr) => { const o = new Float64Array(pr.n * 3); for (let v = 0; v < pr.n; v++) o.set(restOf(pr, before, v), v * 3); return o; });
  const tris0 = prims.reduce((s, pr) => s + pr.idx.length / 3, 0);
  const { ibm, added } = addJoints(json, bin, fingers ? heroFing : null);
  const slot = Object.fromEntries(jointNames(json).map((n, i) => [n, i]));
  const report = { joints: [names0.length, jointNames(json).length], tris: [tris0, tris0], loops: {}, fingers: null, clavicle: { L: 0, R: 0 } };
  for (const pr of prims) { pr.changed = new Set(); pr.src = new Map(); }
  if (fingers && loops) {
    const off = CFG.knuckles[lod];
    const { chains, planes } = handPlanes(heroFing, off);
    for (const pr of prims) {
      const handJ = { L: new Set([slot.wrL, ...Object.keys(slot).filter((n) => n.startsWith('fingerL_')).map((n) => slot[n])]),
        R: new Set([slot.wrR, ...Object.keys(slot).filter((n) => n.startsWith('fingerR_')).map((n) => slot[n])]) };
      const hand = (v, s) => { for (const [j, w] of inflOf(pr, v)) if (w > 0 && handJ[s].has(j)) return true; return false; };
      const t0 = pr.idx.length / 3;
      const nv = knuckleLoops(pr, planes, chains, hand);
      if (nv) report.loops[`${pr.mesh}.${pr.prim}`] = { verts: nv, tris: pr.idx.length / 3 - t0 };
    }
    // new triangles per finger joint (thumb = finger 1) and offset, both hands
    const by = {};
    for (const pl of planes) {
      const k = `${pl.finger === 1 ? 'thumb' : 'finger'} j${pl.joint} ${pl.offset}`;
      by[k] = (by[k] ?? 0) + (pl.tris ?? 0);
    }
    report.loops.byJoint = by;
  }
  if (fingers) {
    report.fingers = { L: { wristVerts: 0, fingerWeighted: 0, farFromHero: 0 }, R: { wristVerts: 0, fingerWeighted: 0, farFromHero: 0 } };
    for (const pr of prims) {
      const r = fingerWeights(pr, slot, hands);
      for (const s of SIDES) for (const k of Object.keys(r[s])) report.fingers[s][k] += r[s][k];
    }
  }
  for (const pr of prims) {
    const r = clavicleWeights(pr, slot);
    report.clavicle.L += r.L;
    report.clavicle.R += r.R;
  }
  report.goggle = { use: 0, stow: 0, byGoggleAttr: prims.some((pr) => pr.attrs._GOGGLE) };
  for (const pr of prims) {
    const lens = json.materials[pr.p.material]?.name?.endsWith('-glow') ?? false;
    const r = goggleWeights(pr, slot, lens);
    report.goggle.use += r.use;
    report.goggle.stow += r.stow;
  }
  report.tris[1] = prims.reduce((s, pr) => s + pr.idx.length / 3, 0);
  // rest check: old vertices against their own rest, new ones against the old surface (their blend of old vertices)
  const after = skinMats(json, ibm);
  let oldErr = 0, newErr = 0, newCount = 0, infl = 0;
  prims.forEach((pr, pi) => {
    const rb = restBefore[pi];
    for (let v = 0; v < pr.n; v++) {
      const q = restOf(pr, after, v);
      let r;
      if (v < rb.length / 3) r = [rb[v * 3], rb[v * 3 + 1], rb[v * 3 + 2]];
      else {
        r = [0, 0, 0];
        for (const [o, w] of pr.src.get(v)) for (let k = 0; k < 3; k++) r[k] += rb[o * 3 + k] * w;
        newCount++;
      }
      const e = len3(sub3(q, r));
      if (v < rb.length / 3) oldErr = Math.max(oldErr, e);
      else newErr = Math.max(newErr, e);
      let c = 0;
      for (let k = 0; k < 4; k++) if (pr.attrs.WEIGHTS_0.data[v * 4 + k] > 0) c++;
      infl = Math.max(infl, c);
    }
  });
  report.rest = { oldMaxM: oldErr, newMaxM: newErr, newVerts: newCount, maxInfluences: infl };
  if (oldErr > 1e-5) throw new Error(`${lod}: rest check failed, ${oldErr} m`);
  report.weighted = Object.fromEntries(Object.entries(added).map(([n, s]) => [n, prims.reduce((t, pr) => {
    let c = 0;
    const J = pr.attrs.JOINTS_0.data, W = pr.attrs.WEIGHTS_0.data;
    for (let i = 0; i < J.length; i++) if (J[i] === s && W[i] > 0) c++;
    return t + c;
  }, 0)]));
  // write: the IBM accessor, and per changed primitive its weights (and all attributes + indices when cut)
  const repl = new Map();
  const ibmAcc = json.skins[0].inverseBindMatrices;
  json.accessors[ibmAcc].count = ibm.length / 16;
  repl.set(ownView(json, ibmAcc), new Uint8Array(ibm.buffer));
  for (const pr of prims) {
    if (!pr.changed.size && !pr.changedGeom) continue;
    const names = pr.changedGeom ? Object.keys(pr.attrs) : ['JOINTS_0', 'WEIGHTS_0'];
    for (const k of names) {
      const at = pr.attrs[k];
      const acc = json.accessors[at.acc];
      acc.count = pr.n;
      if (k === 'POSITION') {
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (let v = 0; v < pr.n; v++) for (let c = 0; c < 3; c++) { const x = at.data[v * 3 + c]; mn[c] = Math.min(mn[c], x); mx[c] = Math.max(mx[c], x); }
        acc.min = mn;
        acc.max = mx;
      }
      repl.set(ownView(json, at.acc), new Uint8Array(at.data.buffer, at.data.byteOffset, at.data.byteLength));
    }
    if (pr.changedGeom) {
      const acc = json.accessors[pr.idxAcc];
      const big = pr.n > 65535;
      const I = big ? Uint32Array.from(pr.idx) : Uint16Array.from(pr.idx);
      acc.count = I.length;
      acc.componentType = big ? 5125 : 5123;
      if (acc.max) acc.max = [Math.max(...pr.idx)];
      if (acc.min) acc.min = [Math.min(...pr.idx)];
      repl.set(ownView(json, pr.idxAcc), new Uint8Array(I.buffer, 0, I.byteLength));
    }
  }
  const out = writeGlb(json, bin, repl);
  return { buf: out, report, prims, json, slot };
}

/** The right hand of a patched LOD (vertices of triangles touching a right-hand joint), for py/hand_sheet.py. */
function handDump(res) {
  const { prims, json, slot } = res;
  const handJ = new Set([slot.wrR, ...Object.keys(slot).filter((n) => n.startsWith('fingerR_')).map((n) => slot[n])]);
  const { world, parent } = worldMatrices(json);
  const joints = json.skins[0].joints.map((ni) => ({ name: json.nodes[ni].name, parent: json.nodes[parent[ni]]?.name ?? null, world: [...world[ni]] }));
  const P = [], N = [], I = [], J = [], W = [];
  for (const pr of prims) {
    const map = new Map();
    const pos = pr.attrs.POSITION.data, nor = pr.attrs.NORMAL.data, jj = pr.attrs.JOINTS_0.data, ww = pr.attrs.WEIGHTS_0.data;
    const id = (v) => {
      let o = map.get(v);
      if (o === undefined) {
        o = P.length / 3;
        map.set(v, o);
        P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        N.push(nor[v * 3], nor[v * 3 + 1], nor[v * 3 + 2]);
        for (let k = 0; k < 4; k++) { J.push(jj[v * 4 + k]); W.push(ww[v * 4 + k]); }
      }
      return o;
    };
    for (let f = 0; f < pr.idx.length; f += 3) {
      const t = [pr.idx[f], pr.idx[f + 1], pr.idx[f + 2]];
      if (!t.some((v) => { for (let k = 0; k < 4; k++) if (ww[v * 4 + k] > 0.05 && handJ.has(jj[v * 4 + k])) return true; return false; })) continue;
      I.push(id(t[0]), id(t[1]), id(t[2]));
    }
  }
  return { joints, P, N, I, J, W, tris: I.length / 3 };
}

/**
 * What must not change between the original and the patched file: images (bytes), materials, textures, samplers, the
 * anchors' and every other non-joint node's TRS, the existing joints' rotations. Returns the differences (empty = ok).
 */
export function unchanged(origBuf, newBuf) {
  const a = readGlb(origBuf), b = readGlb(newBuf);
  const bad = [];
  for (const k of ['images', 'materials', 'textures', 'samplers', 'extensionsUsed', 'extensionsRequired', 'scenes']) {
    if (JSON.stringify(a.json[k]) !== JSON.stringify(b.json[k])) bad.push(k);
  }
  (a.json.images ?? []).forEach((im, i) => {
    const va = a.json.bufferViews[im.bufferView], vb = b.json.bufferViews[b.json.images[i].bufferView];
    const ba = a.bin.subarray(va.byteOffset ?? 0, (va.byteOffset ?? 0) + va.byteLength);
    const bb = b.bin.subarray(vb.byteOffset ?? 0, (vb.byteOffset ?? 0) + vb.byteLength);
    if (!ba.equals(bb)) bad.push(`image ${im.name ?? i} bytes`);
  });
  a.json.nodes.forEach((n, i) => {
    const m = b.json.nodes[i];
    if (m?.name !== n.name) { bad.push(`node ${i} renamed`); return; }
    const same = (x, y) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null);
    // the shoulders' translation moves under the clavicle (their world rest is checked by the rest check)
    if (!/^sh[LR]$/.test(n.name) && !same(n.translation, m.translation)) bad.push(`${n.name} translation`);
    if (!same(n.rotation, m.rotation) || !same(n.scale, m.scale)) bad.push(`${n.name} rotation / scale`);
  });
  return bad;
}

/** Patches the four shipped files. */
export function skinAll({ check = false, dump = null, dir = path.join(ROOT, 'src', 'operators', 'assets', 'wren') } = {}) {
  const file = (l) => path.join(dir, `wren-${l}.glb`);
  const heroBuf = readFileSync(file('hero'));
  const hero = readGlb(heroBuf);
  const report = {};
  // the hero's finger rests and hand weights are read before the hero itself is patched (clavicles only)
  const heroFing = heroFingers(hero.json, hero.bin);
  const hands = heroHands(hero.json, hero.bin);
  for (const lod of ['hero', 'lod0', 'lod1', 'lod2']) {
    const f = file(lod);
    const buf = readFileSync(f);
    const size0 = statSync(f).size;
    if (dump && lod === 'lod0' && !jointNames(readGlb(buf).json).includes('clavL')) {
      mkdirSync(dump, { recursive: true });
      for (const [tag, loops] of [['before', false], ['after', true]]) {
        const r = patchGlb(buf, lod, heroFing, hands, { loops });
        writeFileSync(path.join(dump, `lod0-hand-${tag}.json`), JSON.stringify(handDump(r)));
      }
    }
    const r = patchGlb(buf, lod, heroFing, hands);
    if (!r.buf) { report[lod] = r.report; continue; }
    const diff = unchanged(buf, r.buf);
    if (diff.length) throw new Error(`${lod}: changed what must not change: ${diff.join(', ')}`);
    report[lod] = { ...r.report, bytes: [size0, r.buf.length] };
    if (!check) writeFileSync(f, r.buf);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const di = argv.indexOf('--dump');
  const rep = skinAll({ check: argv.includes('--check'), dump: di >= 0 ? path.resolve(argv[di + 1]) : null });
  console.log(JSON.stringify(rep, null, 1));
}
