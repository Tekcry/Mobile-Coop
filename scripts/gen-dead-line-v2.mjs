// Dead Line v2 G1 (Area 1): generates the greybox geometry from the map design JSON (docs/design/map-dead-line-v2.json).
// The JSON is the only source: nothing here places a block, slab, pipe, ladder, door, marker or teleport by hand. Output:
// src/world/maps/deadLineV2.geo.json, an ordered op list that `src/world/maps/deadLineV2.ts` replays into the LevelBuilder, plus the
// rooms, the flat debug markers, the floor surfaces and the teleport points.
//
//   node scripts/gen-dead-line-v2.mjs           write the geometry
//   node scripts/gen-dead-line-v2.mjs --check   fail if the committed geometry is not what the JSON generates (CI / tests)
//
// v2 is an outdoor map: the walls are the JSON `blocks` (viaduct, pub, works, houses), the rooms with `wallH` (the substation rooms and the
// gatehouse) get walls on their rect edges, the tunnel (level B) gets floor, walls and a roof slab, and `meta.slabs` are real slabs. A slab's
// `y` is its underside (a ceiling plane, the eave, the bridge soffit); a space's floor top is its level `y`.
//
// Conventions: units metres, x east, z north. An opening `axis: 'z'` is the line z = at running along x; `axis: 'x'` is the line x = at
// running along z (the design's own naming). Wall thickness 0.2 centred between two rooms, 0.3 outside a room (interiors keep their size).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '../docs/design/map-dead-line-v2.json');
export const OUT = path.resolve(here, '../src/world/maps/deadLineV2.geo.json');

const SLAB = 0.3;
const T_IN = 0.2;
const T_EX = 0.3;
const DOOR_H = 2.1;
const SILL = 0.9;
const WIN_TOP = 2.1;
const PALISADE_PITCH = 0.2;
const SPIKE_PITCH = 0.3;
const COLOR = {
  ground: '#6a6f72',
  tunnel: '#6d7782',
  tunnelFloor: '#4a535c',
  brick: '#8b8579',
  lean: '#9a8f7e',
  roof: '#7d7a72',
  vehicle: '#4b6a8a',
  cover: '#7d8a7a',
  steel: '#55606a',
  glass: '#7fb6c9',
  ductbank: '#9b8f80',
  cover: '#2e3236',
  plate: '#444b52',
  room: '#a9a496',
  pipe: '#6d7378',
};
const MARK = {
  hide: '#2f6df0',
  vantage: '#f2d21b',
  checkpoint: '#a3e635',
  hold: '#f59e0b',
  spawn: '#f8fafc',
  encounter: '#fb923c',
  extract: '#e11d9c',
};

const r4 = (n) => Math.round(n * 1e4) / 1e4;
const eq = (a, b) => Math.abs(a - b) < 1e-6;
const inRect = (r, x, z, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;

export function generate(D) {
  const Y = Object.fromEntries(D.meta.levels.map((l) => [l.id, l.y]));
  const fp = D.meta.footprint;
  const spaceById = Object.fromEntries(D.spaces.map((s) => [s.id, s]));
  const ops = [];
  const notes = [];
  const note = (s) => notes.push(s);
  const stats = { boxes: 0 };

  const box = (cx, cy, cz, sx, sy, sz, color, o = {}) => {
    if (sx < 1e-6 || sy < 1e-6 || sz < 1e-6) return;
    const op = { t: 'box', c: [r4(cx), r4(cy), r4(cz)], s: [r4(sx), r4(sy), r4(sz)], k: color };
    if (o.collide === false) op.collide = false;
    if (o.tag) op.tag = o.tag;
    if (o.f) op.f = o.f;
    ops.push(op);
    stats.boxes++;
  };
  /** Solid box over a plan rectangle [x0, z0, x1, z1] from y0 to y1. */
  const solid = (x0, z0, x1, z1, y0, y1, color, o = {}) => box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, o);

  // ---- slab tiling with holes ----------------------------------------------------------------------------------------------------
  const slabTiles = (r, hs) => {
    const xs = new Set([r[0], r[2]]);
    const zs = new Set([r[1], r[3]]);
    for (const h of hs) {
      for (const x of [h[0], h[2]]) if (x > r[0] + 1e-6 && x < r[2] - 1e-6) xs.add(x);
      for (const z of [h[1], h[3]]) if (z > r[1] + 1e-6 && z < r[3] - 1e-6) zs.add(z);
    }
    const X = [...xs].sort((p, q) => p - q);
    const Z = [...zs].sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i + 1 < X.length; i++) {
      for (let j = 0; j + 1 < Z.length; j++) {
        const mx = (X[i] + X[i + 1]) / 2;
        const mz = (Z[j] + Z[j + 1]) / 2;
        if (hs.some((h) => mx > h[0] && mx < h[2] && mz > h[1] && mz < h[3])) continue;
        out.push([X[i], Z[j], X[i + 1], Z[j + 1]]);
      }
    }
    return out;
  };
  const mergeTiles = (tiles) => {
    const rows = new Map();
    for (const t of tiles) {
      const k = `${t[1]}|${t[3]}`;
      if (!rows.has(k)) rows.set(k, []);
      rows.get(k).push(t);
    }
    const out = [];
    for (const row of rows.values()) {
      row.sort((a, b) => a[0] - b[0]);
      let cur = row[0].slice();
      for (let i = 1; i < row.length; i++) {
        if (eq(row[i][0], cur[2])) cur[2] = row[i][2];
        else {
          out.push(cur);
          cur = row[i].slice();
        }
      }
      out.push(cur);
    }
    return out;
  };
  /** A slab over rect `r`, `y0` to `y1`, with rectangular holes. */
  const slab = (r, y0, y1, hs, color, tag) => {
    for (const t of mergeTiles(slabTiles(r, hs))) solid(t[0], t[1], t[2], t[3], y0, y1, color, { tag });
  };

  // ---- 1. holes from the links and the acoustic path -------------------------------------------------------------------------------
  // manholes: a ladder link between G and B has a shaft (size from its note) centred on the link point
  const shafts = [];
  for (const l of D.links.filter((q) => q.kind === 'ladder')) {
    const [hi, lo] = Y[l.a[0]] >= Y[l.b[0]] ? [l.a, l.b] : [l.b, l.a];
    const m = /shaft (\d+(?:\.\d+)?) x (\d+(?:\.\d+)?)/.exec(l.note ?? '');
    const w = m ? +m[1] : 1.2;
    const d = m ? +m[2] : 1.2;
    shafts.push({ id: l.id, hi, lo, rect: [hi[1] - w / 2, hi[2] - d / 2, hi[1] + w / 2, hi[2] + d / 2] });
  }
  // the vent grating: size from the note "(1.0 x 0.6)", centred on the emit point; the vent run goes to the tunnel crown at the acoustic rect
  const vgs = [];
  for (const a of D.acoustic ?? []) {
    const m = /\((\d+(?:\.\d+)?) x (\d+(?:\.\d+)?)\)/.exec(a.note ?? '');
    const gw = m ? +m[1] : 1.0;
    const gd = m ? +m[2] : 0.6;
    const [, ex, ez] = a.emit;
    const rect = [ex - gw / 2, ez - gd / 2, ex + gw / 2, ez + gd / 2];
    const tun = D.spaces.find((s) => s.level === a.level && inRect(s.rect, ex, a.rect[3], 0.01));
    // the crown opening: the grating's width over the tunnel's north strip next to its north wall
    const crown = [rect[0], Math.max(a.rect[1], a.rect[3] - 0.6), rect[2], a.rect[3]];
    vgs.push({ id: a.id, rect, crown, tun, y: Y[a.emit[0]] });
  }

  // ---- 2. ground slab ------------------------------------------------------------------------------------------------------------------
  const groundSlab = D.meta.slabs.find((s) => s.id === 'GROUND');
  const groundRect = [fp.x[0], fp.z[0], fp.x[1], fp.z[1]];
  slab(groundRect, Y.G - SLAB, Y.G, [...shafts.map((s) => s.rect), ...vgs.map((v) => v.rect)], COLOR.ground, 'floor:ground');
  note(`ground: one ${SLAB} m slab over the whole footprint (${groundSlab ? 'GROUND ' : ''}road, lane, bay, turning head and the rest), holes for ${shafts.map((s) => s.id).join(', ')} and the vent grating`);

  // ---- 3. the tunnel (level B): floor, walls, roof slab, shafts, ladders, vent run, duct bank ------------------------------------------
  const bSpaces = D.spaces.filter((s) => s.level === 'B');
  const bTop = (s) => Y.B + s.wallH;
  const ductBankX = Math.max(...bSpaces.map((s) => s.rect[2]));
  for (const s of bSpaces) {
    const [x0, z0, x1, z1] = s.rect;
    const e = T_EX;
    solid(x0 - e, z0 - e, x1 + e, z1 + e, Y.B - SLAB, Y.B, COLOR.tunnelFloor, { tag: `floor:${s.id}` });
    // roof slab: its underside is the soffit; holes for the manhole shafts and the vent crown
    const roofHoles = [...shafts.map((q) => q.rect), ...vgs.filter((v) => v.tun === s).map((v) => v.crown)];
    slab([x0 - e, z0 - e, x1 + e, z1 + e], bTop(s), bTop(s) + SLAB, roofHoles, COLOR.tunnel, `roof:${s.id}`);
  }
  // walls: along every B rect edge, outside the rect, cut by the openings (the jointing chamber into the tunnel and the tunnel into the joint bay)
  {
    const lines = new Map();
    for (const s of bSpaces) {
      const [x0, z0, x1, z1] = s.rect;
      for (const e of [
        { axis: 'z', at: z0, a: x0, b: x1, out: -1 },
        { axis: 'z', at: z1, a: x0, b: x1, out: 1 },
        { axis: 'x', at: x0, a: z0, b: z1, out: -1 },
        { axis: 'x', at: x1, a: z0, b: z1, out: 1 },
      ]) {
        const k = `${e.axis}|${e.at}`;
        if (!lines.has(k)) lines.set(k, []);
        lines.get(k).push({ ...e, s });
      }
    }
    const insideB = (x, z) => bSpaces.some((s) => inRect(s.rect, x, z, 1e-6));
    for (const [k, edges] of lines) {
      const [axis, atS] = k.split('|');
      const at = +atS;
      const pts = [...new Set(edges.flatMap((e) => [e.a, e.b]))].sort((p, q) => p - q);
      const cuts = D.openings.filter((o) => o.level === 'B' && o.axis === axis && eq(o.at, at)).map((o) => [o.c - o.w / 2, o.c + o.w / 2]);
      for (let i = 0; i + 1 < pts.length; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        const mm = (p + q) / 2;
        const owners = edges.filter((e) => e.a <= p + 1e-6 && e.b >= q - 1e-6);
        if (!owners.length) continue;
        // pieces of [p, q] outside the openings
        let spans = [[p, q]];
        for (const [c0, c1] of cuts) spans = spans.flatMap(([a, b]) => (c1 <= a || c0 >= b ? [[a, b]] : [[a, Math.min(b, c0)], [Math.max(a, c1), b]].filter(([u, v]) => v > u + 1e-6)));
        for (const [a, b] of spans) {
          const m2 = (a + b) / 2;
          // a wall piece sits on the outside of the owning rect, unless that point is inside another B rect (then it is a shared line: centred)
          const bothSides = axis === 'z' ? insideB(m2, at + 0.15) && insideB(m2, at - 0.15) : insideB(at + 0.15, m2) && insideB(at - 0.15, m2);
          const out = owners[0].out;
          const isBank = axis === 'x' && eq(at, ductBankX);
          const t = bothSides ? T_IN : T_EX;
          const off = bothSides ? 0 : (out * t) / 2;
          const ext = isBank ? 0 : t / 2; // pieces meet at the corners
          const col = isBank ? COLOR.ductbank : COLOR.tunnel;
          const tag = isBank ? 'ductbank' : `wall:B:${axis}:${at}`;
          void mm;
          if (axis === 'z') solid(a - ext, at + off - t / 2, b + ext, at + off + t / 2, Y.B, bTop(owners[0].s), col, { tag });
          else solid(at + off - t / 2, a - ext, at + off + t / 2, b + ext, Y.B, bTop(owners[0].s), col, { tag });
        }
      }
    }
    note('duct bank: the joint bay JC2 ends at the 1962 duct bank (the tunnel is filled beyond it): its east wall, tagged ductbank and coloured apart');
  }
  // manhole shafts: a liner from the soffit up to the street (outside the hole), a ladder against the north side, climbing from the chamber floor
  const ladderOps = [];
  for (const sh of shafts) {
    const [x0, z0, x1, z1] = sh.rect;
    const t = 0.1;
    const yb = Y[sh.lo[0]] + (D.spaces.find((s) => s.level === sh.lo[0] && inRect(s.rect, sh.lo[1], sh.lo[2], 0.5))?.wallH ?? 2.4); // the soffit
    const yt = Y[sh.hi[0]];
    solid(x0 - t, z0 - t, x1 + t, z0, yb, yt, COLOR.plate, { tag: `shaft:${sh.id}` });
    solid(x0 - t, z1, x1 + t, z1 + t, yb, yt, COLOR.plate, { tag: `shaft:${sh.id}` });
    solid(x0 - t, z0, x0, z1, yb, yt, COLOR.plate, { tag: `shaft:${sh.id}` });
    solid(x1, z0, x1 + t, z1, yb, yt, COLOR.plate, { tag: `shaft:${sh.id}` });
    // the cast-iron cover: closed, a plate flush with the street (walkable). Lifting it is the hold on the link (mission logic, later): G1 keeps it closed
    solid(x0, z0, x1, z1, yt - 0.1, yt, COLOR.cover, { tag: `cover:${sh.id}` });
    // the ladder faces north (+z): the climber stands 0.25 m off the north side, the top exit lands on the street 0.2 m beyond the hole
    const lx = (x0 + x1) / 2;
    const lz = z1 - 0.25;
    ladderOps.push({ t: 'ladder', x: r4(lx), z: r4(lz), y0: Y[sh.lo[0]], y1: Y[sh.hi[0]], facing: 0, id: sh.id });
    // a visual backing plate down the chamber (no collision)
    box(lx, (Y[sh.lo[0]] + yb) / 2, z1 + 0.04, 0.7, yb - Y[sh.lo[0]], 0.04, COLOR.plate, { collide: false, tag: `ladder:${sh.id}` });
  }
  ops.push(...ladderOps);
  // the vent grating VG: a walkable grating plate flush with the street over its shaft, the shaft down to the vent run, the run to the crown
  const surfaces = [];
  for (const vg of vgs) {
    const [x0, z0, x1, z1] = vg.rect;
    const t = 0.08;
    const runTop = bTop(vg.tun) + SLAB + 0.6; // the vent run sits on the tunnel roof slab, 0.6 m high
    solid(x0, z0, x1, z1, vg.y - 0.1, vg.y, COLOR.plate, { tag: `grating:${vg.id}` });
    surfaces.push({ kind: 'grate', minX: r4(x0), maxX: r4(x1), minZ: r4(z0), maxZ: r4(z1), top: vg.y });
    const cz = vg.crown[3];
    // shaft liner (street to the run) and the run's walls (from the crown to the shaft)
    solid(x0 - t, z0 - t, x1 + t, z0, runTop - 0.6, vg.y - 0.1, COLOR.plate, { tag: `vent:${vg.id}` });
    solid(x0 - t, z1, x1 + t, z1 + t, runTop - 0.6, vg.y - 0.1, COLOR.plate, { tag: `vent:${vg.id}` });
    solid(x0 - t, z0, x0, z1, runTop - 0.6, vg.y - 0.1, COLOR.plate, { tag: `vent:${vg.id}` });
    solid(x1, z0, x1 + t, z1, runTop - 0.6, vg.y - 0.1, COLOR.plate, { tag: `vent:${vg.id}` });
    const zs = vg.crown[1];
    solid(x0 - t, zs, x0, z0, runTop - 0.6, runTop, COLOR.plate, { tag: `vent:${vg.id}` });
    solid(x1, zs, x1 + t, z0, runTop - 0.6, runTop, COLOR.plate, { tag: `vent:${vg.id}` });
    solid(x0 - t, zs, x1 + t, z0, runTop, runTop + t, COLOR.plate, { tag: `vent:${vg.id}` });
    void cz;
  }

  // ---- 4. blocks (carved by the doors that pass through them) ---------------------------------------------------------------------------
  const through = D.openings.filter((o) => (o.type === 'door1' || o.type === 'door2' || o.type === 'wide') && !D.spaces.some((s) => s.kind === 'main' && s.level === o.level && false));
  const carveBlock = (bk) => {
    const y0 = Y[bk.level];
    for (const o of through) {
      if (o.level !== bk.level) continue;
      const g0 = o.c - o.w / 2;
      const g1 = o.c + o.w / 2;
      const [a0, a1, n0, n1] = o.axis === 'x' ? [bk.rect[1], bk.rect[3], bk.rect[0], bk.rect[2]] : [bk.rect[0], bk.rect[2], bk.rect[1], bk.rect[3]];
      // the opening line is a face of the block and the doorway lies within its length
      if (!(eq(o.at, n0) || eq(o.at, n1)) || g0 < a0 - 1e-6 || g1 > a1 + 1e-6) continue;
      const piece = (s0, s1, ya, yb) => {
        if (s1 - s0 < 1e-6 || yb - ya < 1e-6) return;
        if (o.axis === 'x') solid(bk.rect[0], s0, bk.rect[2], s1, ya, yb, brickOr(bk), { tag: `block:${bk.id}` });
        else solid(s0, bk.rect[1], s1, bk.rect[3], ya, yb, brickOr(bk), { tag: `block:${bk.id}` });
      };
      piece(a0, g0, y0, y0 + bk.h);
      piece(g1, a1, y0, y0 + bk.h);
      if (bk.h > DOOR_H + 0.05) piece(g0, g1, y0 + DOOR_H, y0 + bk.h);
      note(`${bk.id}: doorway ${o.id} cut through the block (${o.w} m, lintel at ${DOOR_H} m)`);
      return true;
    }
    return false;
  };
  const kindOfBlock = (bk) => {
    const id = bk.id;
    if (/^(CAR|P\d|A6C[AB]|VAN|SKIP)$/.test(id)) return COLOR.vehicle;
    if (/^LT\d/.test(id)) return COLOR.lean;
    if (/^(SB-|PAL|DOCK|FP1)/.test(id)) return COLOR.cover;
    if (/^(BRG)/.test(id)) return COLOR.steel;
    if (/^RL\d/.test(id)) return COLOR.glass;
    return COLOR.brick;
  };
  const brickOr = (bk) => kindOfBlock(bk);
  const palisadeBlocks = D.blocks.filter((bk) => /palisade/i.test(bk.label));
  const spikeBlocks = D.blocks.filter((bk) => /spike/i.test(bk.label));
  for (const bk of D.blocks) {
    if (palisadeBlocks.includes(bk) || spikeBlocks.includes(bk)) continue;
    if (carveBlock(bk)) continue;
    solid(bk.rect[0], bk.rect[1], bk.rect[2], bk.rect[3], Y[bk.level], Y[bk.level] + bk.h, kindOfBlock(bk), { tag: `block:${bk.id}` });
  }
  // glazed cabin over the car body ("the glazed cabin above it is see-through"): visual only, never collides
  for (const bk of D.blocks.filter((q) => /glazed cabin/i.test(q.label))) {
    const [x0, z0, x1, z1] = bk.rect;
    const dz = z1 - z0;
    solid(x0 + 0.1, z0 + dz * 0.2, x1 - 0.1, z1 - dz * 0.25, Y[bk.level] + bk.h, Y[bk.level] + bk.h + 0.5, COLOR.glass, { collide: false, tag: `cabin:${bk.id}` });
  }

  // ---- 5. rooms with walls (the substation rooms, the gatehouse) --------------------------------------------------------------------------
  const walled = D.spaces.filter((s) => s.kind === 'main' && s.level === 'G');
  const blockAt = (lv, x, z) => D.blocks.some((bk) => bk.level === lv && !palisadeBlocks.includes(bk) && inRect(bk.rect, x, z, -1e-6));
  const roomWalls = [];
  {
    const lines = new Map();
    for (const s of walled) {
      const [x0, z0, x1, z1] = s.rect;
      for (const e of [
        { axis: 'z', at: z0, a: x0, b: x1 },
        { axis: 'z', at: z1, a: x0, b: x1 },
        { axis: 'x', at: x0, a: z0, b: z1 },
        { axis: 'x', at: x1, a: z0, b: z1 },
      ]) {
        const k = `${e.axis}|${e.at}`;
        if (!lines.has(k)) lines.set(k, []);
        lines.get(k).push({ ...e, s });
      }
    }
    const inRoom = (x, z) => walled.find((s) => inRect(s.rect, x, z, 1e-6));
    for (const [k, edges] of lines) {
      const [axis, atS] = k.split('|');
      const at = +atS;
      const pts = [...new Set(edges.flatMap((e) => [e.a, e.b]))].sort((p, q) => p - q);
      for (let i = 0; i + 1 < pts.length; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        const cov = edges.filter((e) => e.a <= p + 1e-6 && e.b >= q - 1e-6);
        if (!cov.length) continue;
        const mm = (p + q) / 2;
        const probe = (d) => (axis === 'z' ? [mm, at + d] : [at + d, mm]);
        const sP = inRoom(...probe(0.15));
        const sN = inRoom(...probe(-0.15));
        let t;
        let off;
        if (sP && sN) {
          t = T_IN;
          off = 0;
        } else {
          const outsideD = sP ? -0.15 : 0.15;
          // the outside is solid block already (a pier): no wall
          if (blockAt('G', ...probe(outsideD))) continue;
          t = T_EX;
          off = sP ? -t / 2 : t / 2;
        }
        const h = Math.max(...cov.map((e) => e.s.wallH));
        roomWalls.push({ axis, at, p, q, t, off, h });
      }
    }
  }
  const cutsOn = (axis, at) => D.openings.filter((o) => o.level === 'G' && o.axis === axis && eq(o.at, at) && ['door1', 'door2', 'window'].includes(o.type) && roomWalls.some((w) => w.axis === axis && eq(w.at, at) && o.c >= w.p - 1e-6 && o.c <= w.q + 1e-6));
  for (const w of roomWalls) {
    const cuts = cutsOn(w.axis, w.at)
      .map((o) => ({ o, g0: Math.max(w.p, o.c - o.w / 2), g1: Math.min(w.q, o.c + o.w / 2) }))
      .filter((g) => g.g1 > g.g0 + 1e-6)
      .sort((a, b) => a.g0 - b.g0);
    const y0 = Y.G;
    const put = (a, b, ya, yb) => {
      if (b - a < 1e-6 || yb - ya < 1e-6) return;
      if (w.axis === 'z') solid(a, w.at + w.off - w.t / 2, b, w.at + w.off + w.t / 2, ya, yb, COLOR.room, { tag: `wall:G:z:${w.at}` });
      else solid(w.at + w.off - w.t / 2, a, w.at + w.off + w.t / 2, b, ya, yb, COLOR.room, { tag: `wall:G:x:${w.at}` });
    };
    let cur = w.p;
    for (const g of cuts) {
      put(cur, g.g0, y0, y0 + w.h);
      if (g.o.type === 'window') {
        put(g.g0, g.g1, y0, y0 + SILL);
        put(g.g0, g.g1, y0 + WIN_TOP, y0 + w.h);
      } else put(g.g0, g.g1, y0 + DOOR_H, y0 + w.h);
      cur = g.g1;
    }
    put(cur, w.q, y0, y0 + w.h);
  }
  // door and window anchors, once per opening
  const offFor = (o) => roomWalls.find((w) => w.axis === o.axis && eq(w.at, o.at) && o.c >= w.p - 1e-6 && o.c <= w.q + 1e-6)?.off ?? 0;
  for (const o of D.openings) {
    const y0 = Y[o.level];
    if (o.type === 'door1' || o.type === 'door2' || o.type === 'gate') {
      const g0 = o.c - o.w / 2;
      let off = offFor(o);
      let at = o.at;
      // a doorway cut through a block (the pier door): the leaf stands at the middle of the block
      const bk = D.blocks.find((q) => q.level === o.level && ((o.axis === 'x' && (eq(q.rect[0], o.at) || eq(q.rect[2], o.at))) || (o.axis === 'z' && (eq(q.rect[1], o.at) || eq(q.rect[3], o.at)))) && o.c >= (o.axis === 'x' ? q.rect[1] : q.rect[0]) && o.c <= (o.axis === 'x' ? q.rect[3] : q.rect[2]));
      if (bk && o.type !== 'gate') {
        const [n0, n1] = o.axis === 'x' ? [bk.rect[0], bk.rect[2]] : [bk.rect[1], bk.rect[3]];
        at = (n0 + n1) / 2;
        off = 0;
      }
      const h = o.type === 'gate' ? 2.4 : DOOR_H;
      if (o.axis === 'z') ops.push({ t: 'door', x: r4(g0), y: y0, z: r4(at + off), w: o.w, h, yaw: r4(Math.PI / 2), id: o.id });
      else ops.push({ t: 'door', x: r4(at + off), y: y0, z: r4(g0), w: o.w, h, yaw: 0, id: o.id });
    } else if (o.type === 'window' && roomWalls.some((w) => w.axis === o.axis && eq(w.at, o.at))) {
      const off = offFor(o);
      const panes = Math.max(1, Math.ceil(o.w / 3));
      const pw = o.w / panes;
      for (let i = 0; i < panes; i++) {
        const c = o.c - o.w / 2 + pw * (i + 0.5);
        const cy = y0 + (SILL + WIN_TOP) / 2;
        if (o.axis === 'z') ops.push({ t: 'window', c: [r4(c), r4(cy), r4(o.at + off)], w: r4(pw), h: WIN_TOP - SILL, yaw: 0, sill: SILL, id: o.id });
        else ops.push({ t: 'window', c: [r4(o.at + off), r4(cy), r4(c)], w: r4(pw), h: WIN_TOP - SILL, yaw: r4(Math.PI / 2), sill: SILL, id: o.id });
      }
    }
  }

  // ---- 6. slabs from the design (bridge, ceilings, eaves) and the roof decks ---------------------------------------------------------------
  for (const s of D.meta.slabs) {
    if (s.id === 'GROUND') continue;
    const thick = s.id === 'BRIDGE' ? 1.0 : SLAB; // the bridge deck is a girder deck: its top meets the viaduct top
    slab(s.rect, s.y, s.y + thick, [], s.id === 'BRIDGE' ? COLOR.steel : s.id.startsWith('EAV') ? COLOR.lean : COLOR.room, `slab:${s.id}`);
  }
  for (const s of D.spaces.filter((q) => q.level === 'U' && q.kind === 'roof')) {
    slab(s.rect, Y.U - SLAB, Y.U, [], COLOR.roof, `deck:${s.id}`);
    surfaces.push({ kind: s.floor === 'metal' ? 'metal' : s.floor === 'wood' ? 'wood' : 'concrete', minX: s.rect[0], maxX: s.rect[2], minZ: s.rect[1], maxZ: s.rect[3], top: Y.U });
  }
  // the A block roof (context): the block is solid to its roof level; its parapet stands on the rect edge
  for (const s of D.spaces.filter((q) => q.level === 'R')) {
    const [x0, z0, x1, z1] = s.rect;
    const t = 0.2;
    const y0 = Y.R;
    const y1 = Y.R + s.wallH;
    solid(x0, z0, x1, z0 + t, y0, y1, COLOR.brick, { tag: `parapet:${s.id}` });
    solid(x0, z1 - t, x1, z1, y0, y1, COLOR.brick, { tag: `parapet:${s.id}` });
    solid(x0, z0 + t, x0 + t, z1 - t, y0, y1, COLOR.brick, { tag: `parapet:${s.id}` });
    solid(x1 - t, z0 + t, x1, z1 - t, y0, y1, COLOR.brick, { tag: `parapet:${s.id}` });
    surfaces.push({ kind: s.floor === 'gravel' ? 'gravel' : 'concrete', minX: x0, maxX: x1, minZ: z0, maxZ: z1, top: Y.R });
  }

  // ---- 7. downpipes ---------------------------------------------------------------------------------------------------------------------
  // the downpipe hangs off the gutter at the eave front (the eave slab over the pipe's x), climbs to the roof walk
  for (const l of D.links.filter((q) => q.kind === 'pipe')) {
    const [lo, hi] = Y[l.a[0]] <= Y[l.b[0]] ? [l.a, l.b] : [l.b, l.a];
    const eave = D.meta.slabs.find((s) => s.id.startsWith('EAV') && lo[1] >= s.rect[0] && lo[1] <= s.rect[2] && lo[2] >= s.rect[1] - 0.2 && lo[2] <= s.rect[3]);
    const z = eave ? eave.rect[1] - 0.08 : lo[2];
    ops.push({ t: 'pipeV', x: r4(lo[1]), z: r4(z), y0: Y[lo[0]], y1: Y[hi[0]], side: 0, id: l.id });
    const clash = D.blocks.find((bk) => bk.level === lo[0] && !palisadeBlocks.includes(bk) && inRect(bk.rect, lo[1], lo[2]));
    if (clash) note(`${l.id}: its foot (${lo[1]}, ${lo[2]}) is inside block ${clash.id} (${clash.label}): the JSON puts the pipe under the ${clash.id} footprint, so ${l.id} cannot be climbed from the ground`);
  }

  // ---- 8. palisades (see-through steel: upright bars, not a wall; never climbable) and the anti-climb spikes ------------------------------
  const bars = (axis, at, a, b, h, y0, tag) => {
    const n = Math.max(1, Math.floor((b - a) / PALISADE_PITCH));
    const pitch = (b - a) / n;
    for (let i = 0; i <= n; i++) {
      const c = a + i * pitch;
      if (axis === 'z') box(c, y0 + h / 2, at, 0.04, h, 0.04, COLOR.steel, { tag, f: 'noLedge' });
      else box(at, y0 + h / 2, c, 0.04, h, 0.04, COLOR.steel, { tag, f: 'noLedge' });
    }
    // two rails tie the bars: top and a third of the way up
    for (const ry of [h - 0.05, h * 0.35]) {
      if (axis === 'z') box((a + b) / 2, y0 + ry, at, b - a, 0.05, 0.05, COLOR.steel, { tag, f: 'noLedge' });
      else box(at, y0 + ry, (a + b) / 2, 0.05, 0.05, b - a, COLOR.steel, { tag, f: 'noLedge' });
    }
  };
  /** Palisade along the open edges of rect `r` (the edge pieces whose outside is not solid), gaps `gaps[axis|at]` left clear. */
  const palisade = (r, h, y0, tag, gaps = {}) => {
    const edges = [
      { axis: 'z', at: r[1], a: r[0], b: r[2], probe: (m) => [m, r[1] - 0.2] },
      { axis: 'z', at: r[3], a: r[0], b: r[2], probe: (m) => [m, r[3] + 0.2] },
      { axis: 'x', at: r[0], a: r[1], b: r[3], probe: (m) => [r[0] - 0.2, m] },
      { axis: 'x', at: r[2], a: r[1], b: r[3], probe: (m) => [r[2] + 0.2, m] },
    ];
    for (const e of edges) {
      // run along the edge in 0.1 m steps; open where the outside is free of blocks and rooms
      const open = [];
      for (let m = e.a + 0.05; m < e.b; m += 0.1) {
        const [px, pz] = e.probe(m);
        const solidOut = blockAt('G', px, pz) || walled.some((s) => inRect(s.rect, px, pz));
        open.push(!solidOut);
      }
      let i = 0;
      while (i < open.length) {
        if (!open[i]) {
          i++;
          continue;
        }
        let j = i;
        while (j < open.length && open[j]) j++;
        let spans = [[e.a + i * 0.1, Math.min(e.b, e.a + j * 0.1 + 0.1)]];
        for (const g of gaps[`${e.axis}|${e.at}`] ?? []) spans = spans.flatMap(([s0, s1]) => (g[1] <= s0 || g[0] >= s1 ? [[s0, s1]] : [[s0, Math.min(s1, g[0])], [Math.max(s0, g[1]), s1]].filter(([u, v]) => v > u + 1e-6)));
        for (const [s0, s1] of spans) bars(e.axis, e.at, s0, s1, h, y0, tag);
        i = j;
      }
    }
  };
  for (const bk of palisadeBlocks) {
    const hm = /(\d+(?:\.\d+)?) m palisade/i.exec(bk.label);
    palisade(bk.rect, hm ? +hm[1] : 2.4, Y[bk.level], `palisade:${bk.id}`);
    note(`${bk.id}: the JSON block is a thin pad (h ${bk.h}); built as a ${hm ? hm[1] : 2.4} m palisade of upright bars on its open edges (a see-through steel fence, not climbable)`);
  }
  for (const g of D.openings.filter((o) => o.type === 'gate')) {
    const to = spaceById[g.to];
    if (!to) continue;
    const gaps = { [`${g.axis}|${g.at}`]: [[g.c - g.w / 2, g.c + g.w / 2]] };
    palisade(to.rect, 2.4, Y[to.level], `palisade:${to.id}`, gaps);
    note(`${g.id}: ${to.id} is fenced as HV equipment must be: a 2.4 m palisade on its open edges, the gate ${g.id} (${g.w} m) in the ${g.axis}=${g.at} line`);
  }
  for (const bk of spikeBlocks) {
    const [x0, z0, x1, z1] = bk.rect;
    const y0 = Y[bk.level];
    const nx = Math.max(1, Math.floor((x1 - x0) / SPIKE_PITCH));
    const nz = Math.max(1, Math.floor((z1 - z0) / SPIKE_PITCH));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) box(x0 + ((i + 0.5) * (x1 - x0)) / nx, y0 + bk.h / 2, z0 + ((j + 0.5) * (z1 - z0)) / nz, 0.05, bk.h, 0.05, COLOR.steel, { tag: `spikes:${bk.id}`, f: 'noLedge' });
    note(`${bk.id}: spikes are ${nx * nz} thin upright pins on a ${SPIKE_PITCH} m grid (a solid ${bk.h} m slab could be stepped on)`);
  }
  note('roof lights (RL*): built as the JSON block, a solid 0.3 m glazed upstand. The controller steps onto 0.3 m, so "not walkable" is not enforced in G1 (the engine has no fall-through glass)');

  // ---- 9. rooms, markers, surfaces, teleports ------------------------------------------------------------------------------------------------
  const bandOf = (lv) => (lv === 'B' ? [Y.B - 0.2, Y.G - 0.3] : lv === 'G' ? [Y.G - 0.2, Y.G + 3.2] : lv === 'U' ? [Y.U - 0.05, Y.U + 8] : [Y.R - 0.05, Y.R + 8]);
  const rooms = D.spaces.map((s) => {
    const [minY, maxY] = bandOf(s.level);
    return { id: s.id, name: s.name, minX: s.rect[0], maxX: s.rect[2], minZ: s.rect[1], maxZ: s.rect[3], minY: r4(minY), maxY: r4(maxY), level: s.level };
  });
  const markers = [];
  const mk = (kind, id, lv, x, z, w, d, label) => markers.push({ kind, id, level: lv, x: r4(x), z: r4(z), w: r4(w), d: r4(d), y: Y[lv], color: MARK[kind], label });
  for (const h of D.hides) mk('hide', h.id, h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2, h.rect[2] - h.rect[0], h.rect[3] - h.rect[1], h.id);
  for (const v of D.vantage) mk('vantage', v.id, v.level, v.x, v.z, 0.6, 0.6, v.id);
  for (const c of D.checkpoints) mk('checkpoint', c.id, c.level, c.x, c.z, 0.9, 0.9, c.id);
  for (const e of D.encounters) mk('encounter', e.id, e.level, e.x, e.z, 0.7, 0.7, e.id);
  for (const s of D.spawns) mk('spawn', s.id, 'G', s.x, s.z, 0.6, 0.6, s.id);
  for (const x of D.extraction) mk('extract', x.id, x.level, x.x, x.z, x.r * 2, x.r * 2, x.id);
  // hold points: every distinct route point that has a hold (the padlock, the doors, the manholes, the fuse pillar)
  const seenHold = new Set();
  for (const r of D.routes) {
    for (const p of r.pts) {
      if (!p.hold) continue;
      const k = `${p.lv}|${p.x}|${p.z}`;
      if (seenHold.has(k)) continue;
      seenHold.add(k);
      mk('hold', `H:${p.label}`, p.lv, p.x, p.z, 0.5, 0.5, p.label);
    }
  }
  const debug = [];
  for (const e of D.encounters) debug.push({ group: 'Encounter', id: e.id, label: `${e.id} ${e.name}`, level: e.level, x: e.x, z: e.z, y: Y[e.level] });
  for (const c of D.checkpoints) debug.push({ group: 'Checkpoint', id: c.id, label: `${c.id} ${c.note}`, level: c.level, x: c.x, z: c.z, y: Y[c.level] });
  for (const s of D.spawns) debug.push({ group: 'Spawn', id: s.id, label: s.id, level: 'G', x: s.x, z: s.z, y: Y.G });

  return { version: 1, source: 'docs/design/map-dead-line-v2.json', bounds: { minX: fp.x[0], maxX: fp.x[1], minZ: fp.z[0], maxZ: fp.z[1] }, levels: Y, stats, notes, ops, rooms, markers, surfaces, debug };
}

function main() {
  const D = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const geo = generate(D);
  const text = JSON.stringify(geo) + '\n';
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur.replaceAll(String.fromCharCode(13), '') !== text) {
      console.error('deadLineV2.geo.json is stale: run node scripts/gen-dead-line-v2.mjs');
      process.exit(1);
    }
    console.log('deadLineV2.geo.json is current');
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${geo.stats.boxes} boxes, ${geo.ops.length} ops, ${geo.rooms.length} rooms, ${geo.markers.length} markers`);
  for (const n of geo.notes) console.log('note:', n);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
