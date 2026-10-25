// (anim-rig, docs/archive/anim-rework/RIG.md) Skins the toe box of the game LODs to the toe joints `toeL` / `toeR` (the ball of
// the foot), so a planted foot rolling onto its ball bends at the toes instead of pivoting rigidly.
//
//   node scripts/operators/toe-skin.mjs [--check] [hero.glb lod.glb ...]
//   (default: src/operators/assets/wren/wren-hero.glb and wren-lod0/1/2.glb, rewritten in place)
//
// The game LODs already carry the toe joints (skin joints, children of the ankles at the ball), but bake_lods.py folded
// the hero's toe weights into the ankle. bake_lods.py now skins them to toeL / toeR (GAME_JOINTS); this script gives the
// shipped files the same weights without a full operator rebuild (the garment blends are not on this machine): each
// LOD vertex weighted to an ankle takes the toe share of its nearest hero vertex on that foot (the hero keeps the
// MakeHuman CC0 toe weights on its per-toe bones under toeL / toeR, the same nearest-body rule as the bake), and that
// share of its ankle weight moves to the toe joint. Rigid parts (`_RIGID` > 0) keep their weights (D28).
// Only the JOINTS_0 / WEIGHTS_0 bytes change: file sizes, geometry, textures and anchors stay as they were.
// A file whose ankles already share with a toe joint (a fresh bake) is left alone. Deterministic; no network.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');

/** Parses a GLB into its JSON and binary chunk (a view into `buf`). */
export function readGlb(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binHead = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binHead);
  return { json, bin: buf.subarray(binHead + 8, binHead + 8 + binLen) };
}

const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPED = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

/** A typed array over an accessor's bytes (shared with the file: writes go into it). Tightly packed only. */
export function accessorView(json, bin, i) {
  const a = json.accessors[i];
  const bv = json.bufferViews[a.bufferView];
  const C = TYPED[a.componentType];
  const n = COMP[a.type];
  if (!C || !n) throw new Error(`accessor ${i}: unsupported type`);
  if (bv.byteStride && bv.byteStride !== n * C.BYTES_PER_ELEMENT) throw new Error(`accessor ${i}: interleaved`);
  const off = bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  if (off % C.BYTES_PER_ELEMENT) throw new Error(`accessor ${i}: misaligned`);
  return new C(bin.buffer, off, a.count * n);
}

/** Skin joint names (skin order) and, per side, the skin slots of the ankle, the toe joint and the hero toe bones. */
function skinInfo(json) {
  const names = json.skins[0].joints.map((n) => json.nodes[n].name ?? '');
  const side = (s) => ({
    an: names.indexOf(`an${s}`),
    toe: names.indexOf(`toe${s}`),
    toes: names.flatMap((n, i) => (n.startsWith(`toes${s}_`) ? [i] : [])),
  });
  return { names, L: side('L'), R: side('R') };
}

/** Every skinned primitive's position, joints, weights and rigid ids. */
function prims(json, bin) {
  const out = [];
  for (const m of json.meshes) {
    for (const p of m.primitives) {
      const a = p.attributes;
      if (a.JOINTS_0 === undefined || a.WEIGHTS_0 === undefined) continue;
      out.push({
        P: accessorView(json, bin, a.POSITION),
        J: accessorView(json, bin, a.JOINTS_0),
        W: accessorView(json, bin, a.WEIGHTS_0),
        R: a._RIGID !== undefined ? accessorView(json, bin, a._RIGID) : null,
      });
    }
  }
  return out;
}

/** The mesh nodes' frames must match (identity under the same rig node) for positions to compare across files. */
function meshFrame(json) {
  const n = json.nodes.find((x) => x.mesh !== undefined);
  return JSON.stringify([n?.translation ?? [0, 0, 0], n?.rotation ?? [0, 0, 0, 1], n?.scale ?? [1, 1, 1]]);
}

/** Hero foot samples per side: positions and toe share (toe bones / (toe bones + ankle)), on a uniform grid. */
export function heroFeet(json, bin) {
  const info = skinInfo(json);
  const feet = {};
  for (const s of ['L', 'R']) {
    const si = info[s];
    if (si.an < 0 || si.toe < 0) throw new Error(`hero: no an${s} / toe${s} joint`);
    const toeSet = new Set([si.toe, ...si.toes]);
    const pts = [];
    const share = [];
    for (const { P, J, W } of prims(json, bin)) {
      for (let v = 0; v < J.length / 4; v++) {
        let an = 0, toe = 0;
        for (let k = 0; k < 4; k++) {
          const w = W[v * 4 + k];
          if (!(w > 0)) continue;
          const j = J[v * 4 + k];
          if (j === si.an) an += w;
          else if (toeSet.has(j)) toe += w;
        }
        if (an + toe <= 0) continue;
        pts.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
        share.push(toe / (an + toe));
      }
    }
    feet[s] = grid(Float64Array.from(pts), Float64Array.from(share), 0.01);
  }
  return feet;
}

/** A uniform hash grid over points for nearest-neighbour queries. */
function grid(pts, share, cell) {
  const cells = new Map();
  const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < pts.length / 3; i++) {
    const k = key(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
    let c = cells.get(k);
    if (!c) cells.set(k, (c = []));
    c.push(i);
  }
  return {
    count: share.length,
    /** The nearest sample's toe share (searching rings out to 6 cells), or -1 if none is near. */
    nearest(x, y, z) {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      let best = Infinity, bi = -1;
      for (let r = 0; r <= 6; r++) {
        for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
          const c = cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!c) continue;
          for (const i of c) {
            const ex = pts[i * 3] - x, ey = pts[i * 3 + 1] - y, ez = pts[i * 3 + 2] - z;
            const d = ex * ex + ey * ey + ez * ez;
            if (d < best) { best = d; bi = i; }
          }
        }
        // a hit within this ring's radius cannot be beaten further out
        if (bi >= 0 && Math.sqrt(best) <= r * cell) break;
      }
      return bi < 0 ? -1 : share[bi];
    },
  };
}

/**
 * Moves each ankle-weighted vertex's toe share of the ankle weight to the toe joint (in place). Returns the counts per
 * side, or null when the file already skins its toes.
 */
export function skinToes(json, bin, feet) {
  const info = skinInfo(json);
  const ps = prims(json, bin);
  for (const s of ['L', 'R']) if (info[s].an < 0 || info[s].toe < 0) throw new Error(`no an${s} / toe${s} joint`);
  // already skinned (a fresh bake): any weight on a toe joint
  for (const { J, W } of ps) for (let k = 0; k < J.length; k++) if (W[k] > 0 && (J[k] === info.L.toe || J[k] === info.R.toe)) return null;
  const counts = { L: { full: 0, part: 0, ankle: 0 }, R: { full: 0, part: 0, ankle: 0 } };
  for (const { P, J, W, R } of ps) {
    for (let v = 0; v < J.length / 4; v++) {
      if (R && R[v] > 0) continue;
      for (const s of ['L', 'R']) {
        const si = info[s];
        let k = -1;
        for (let c = 0; c < 4; c++) if (J[v * 4 + c] === si.an && W[v * 4 + c] > 0) k = c;
        if (k < 0) continue;
        counts[s].ankle++;
        const t = feet[s].nearest(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
        if (!(t > 0.002)) continue;
        const w = W[v * 4 + k];
        if (t >= 0.998) {
          J[v * 4 + k] = si.toe;
          counts[s].full++;
          continue;
        }
        // a slot for the toe: a free one, else the smallest other influence (renormalised below)
        let f = -1;
        for (let c = 0; c < 4; c++) if (c !== k && !(W[v * 4 + c] > 0)) { f = c; break; }
        if (f < 0) {
          let m = Infinity;
          for (let c = 0; c < 4; c++) if (c !== k && W[v * 4 + c] < m) { m = W[v * 4 + c]; f = c; }
        }
        W[v * 4 + k] = w * (1 - t);
        J[v * 4 + f] = si.toe;
        W[v * 4 + f] = w * t;
        let sum = 0;
        for (let c = 0; c < 4; c++) sum += W[v * 4 + c];
        for (let c = 0; c < 4; c++) W[v * 4 + c] /= sum;
        counts[s].part++;
      }
    }
  }
  return counts;
}

/** Skins the toes of `lods` (paths, rewritten in place) from the hero file. `check`: report only, write nothing. */
export function toeSkin(heroPath, lods, { check = false } = {}) {
  const hero = readGlb(readFileSync(heroPath));
  const feet = heroFeet(hero.json, hero.bin);
  const frame = meshFrame(hero.json);
  const report = {};
  for (const f of lods) {
    const buf = readFileSync(f);
    const { json, bin } = readGlb(buf);
    if (meshFrame(json) !== frame) throw new Error(`${f}: mesh frame differs from the hero's`);
    const c = skinToes(json, bin, feet);
    report[path.basename(f)] = c ?? 'already skinned';
    if (c && !check) writeFileSync(f, buf);
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const files = argv.filter((a) => !a.startsWith('--'));
  const dir = path.join(ROOT, 'src', 'operators', 'assets', 'wren');
  const [hero, ...lods] = files.length ? files : ['hero', 'lod0', 'lod1', 'lod2'].map((l) => path.join(dir, `wren-${l}.glb`));
  console.log(JSON.stringify(toeSkin(hero, lods, { check }), null, 1));
}
