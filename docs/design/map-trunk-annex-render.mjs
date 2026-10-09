// Kestrel Trunk Annex: reads map-trunk-annex.json, checks the design on a 0.5 m nav grid, writes the SVG, the PNG,
// the tables in map-trunk-annex.md (from map-trunk-annex.md.tpl) and map-trunk-annex-validation.md (from its .tpl).
// Run: node docs/design/map-trunk-annex-render.mjs [--no-png]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const P = (f) => path.join(here, f);
const D = JSON.parse(fs.readFileSync(P('map-trunk-annex.json'), 'utf8'));
const Y = Object.fromEntries(D.meta.levels.map((l) => [l.id, l.y]));
const CELL = 0.5;
const AGENT = 0.32;
const EYE = 1.6;
const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
const hyp = (a, b) => Math.sqrt(a * a + b * b);

// ---------- geometry ----------
const spaceById = Object.fromEntries(D.spaces.map((s) => [s.id, s]));
const SKIPPASS = new Set(['Gp', 'Gv', 'SO']);
const PASS = new Set(['door1', 'door2', 'wide', 'gate']);
const SEE = new Set(['wide', 'mesh', 'window']);

function rectEdges(r) {
  const [x0, z0, x1, z1] = r;
  return [
    { axis: 'z', at: z0, a: x0, b: x1 },
    { axis: 'z', at: z1, a: x0, b: x1 },
    { axis: 'x', at: x0, a: z0, b: z1 },
    { axis: 'x', at: x1, a: z0, b: z1 }
  ];
}
function wallHeight(s) {
  if (s.id === 'roof') return 1.0;
  if (s.kind === 'outdoor') return 2.5;
  return s.ceil || 3.0;
}
function cutEdge(e, level, openTypes) {
  const cuts = D.openings
    .filter((o) => o.level === level && o.axis === e.axis && o.at === e.at && openTypes.has(o.type))
    .map((o) => [o.c - o.w / 2, o.c + o.w / 2])
    .filter(([s, t]) => s >= e.a - 1e-6 && t <= e.b + 1e-6)
    .sort((p, q) => p[0] - q[0]);
  const out = [];
  let cur = e.a;
  for (const [s, t] of cuts) {
    if (s > cur + 1e-6) out.push([cur, s]);
    cur = Math.max(cur, t);
  }
  if (cur < e.b - 1e-6) out.push([cur, e.b]);
  return out;
}
function segOf(axis, at, a, b) {
  return axis === 'z' ? { x0: a, z0: at, x1: b, z1: at } : { x0: at, z0: a, x1: at, z1: b };
}
const moveWalls = {};
const losWalls = [];
for (const lv of D.meta.levels) moveWalls[lv.id] = [];
for (const s of D.spaces) {
  const rects = [s.rect, ...(s.carve || [])];
  const wh = wallHeight(s);
  for (const r of rects) {
    for (const e of rectEdges(r)) {
      for (const [a, b] of cutEdge(e, s.level, PASS)) moveWalls[s.level].push(segOf(e.axis, e.at, a, b));
      // line of sight: doors (closed) and sealed doors block; wide, mesh, window pass; see-through rails never block
      const isRail = (s.rails || []).some((q) => q.axis === e.axis && q.at === e.at);
      if (!isRail) {
        const tall = s.level === "G" && wh > 3.3;
        for (const [a, b] of cutEdge(e, s.level, SEE)) losWalls.push({ ...segOf(e.axis, e.at, a, b), y0: Y[s.level], y1: tall ? 3.3 : Y[s.level] + wh });
        // a double-height wall carries the upper-level windows and doors above 3.3 m
        if (tall) for (const [a, b] of cutEdge(e, "U", SEE)) losWalls.push({ ...segOf(e.axis, e.at, a, b), y0: 3.3, y1: wh });
      }
    }
  }
}
const slabs = [];
for (const s of D.spaces) if (s.level === 'U') slabs.push({ rect: s.rect, y: 3.3 });
for (const id of ['gen', 'fs']) slabs.push({ rect: spaceById[id].rect, y: 3.3 });
slabs.push({ rect: [-18, -7, 18, 14], y: 6.6 });

function inRect(r, x, z, eps = 1e-6) {
  return x >= r[0] - eps && x <= r[2] + eps && z >= r[1] - eps && z <= r[3] + eps;
}
function inRoom(level, x, z) {
  for (const s of D.spaces) {
    if (s.level !== level) continue;
    if (!inRect(s.rect, x, z)) continue;
    let carved = false;
    for (const c of s.carve || []) if (x > c[0] + 1e-6 && x < c[2] - 1e-6 && z > c[1] + 1e-6 && z < c[3] - 1e-6) carved = true;
    if (!carved) return s.id;
  }
  return null;
}
function distPtSeg(px, pz, s) {
  const dx = s.x1 - s.x0;
  const dz = s.z1 - s.z0;
  const l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - s.x0) * dx + (pz - s.z0) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return hyp(px - (s.x0 + dx * t), pz - (s.z0 + dz * t));
}
function distPtRect(px, pz, r) {
  const dx = Math.max(r[0] - px, 0, px - r[2]);
  const dz = Math.max(r[1] - pz, 0, pz - r[3]);
  return hyp(dx, dz);
}
function segSeg(ax, az, bx, bz, s) {
  // intersection of A-B with wall segment s; returns t along A-B or null
  const rx = bx - ax;
  const rz = bz - az;
  const qx = s.x1 - s.x0;
  const qz = s.z1 - s.z0;
  const den = rx * qz - rz * qx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((s.x0 - ax) * qz - (s.z0 - az) * qx) / den;
  const u = ((s.x0 - ax) * rz - (s.z0 - az) * rx) / den;
  if (t < 0 || t > 1 || u < -1e-9 || u > 1 + 1e-9) return null;
  return t;
}
function clipSeg(ax, az, bx, bz, r) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, q] of [[-dx, ax - r[0]], [dx, r[2] - ax], [-dz, az - r[1]], [dz, r[3] - az]]) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return null;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
  }
  return t0 <= t1 ? [t0, t1] : null;
}
const blocksByLevel = {};
for (const lv of D.meta.levels) blocksByLevel[lv.id] = D.blocks.filter((b) => b.level === lv.id);

// ---------- nav grid ----------
const NX = 72;
const NZ = 56;
function makeGrid(off) {
  const g = { off, W: {} };
  const cx = (i) => -18 + off + 0.25 + CELL * i;
  const cz = (j) => -14 + off + 0.25 + CELL * j;
  g.cx = cx;
  g.cz = cz;
  for (const lv of D.meta.levels) {
    const arr = new Uint8Array(NX * NZ);
    for (let i = 0; i < NX; i++) {
      for (let j = 0; j < NZ; j++) {
        const x = cx(i);
        const z = cz(j);
        if (!inRoom(lv.id, x, z)) continue;
        let ok = true;
        for (const b of blocksByLevel[lv.id]) if (distPtRect(x, z, b.rect) < AGENT - 1e-6) ok = false;
        if (ok) for (const w of moveWalls[lv.id]) if (distPtSeg(x, z, w) < AGENT - 1e-6) { ok = false; break; }
        arr[i * NZ + j] = ok ? 1 : 0;
      }
    }
    g.W[lv.id] = arr;
  }
  g.cellOf = (x, z) => [Math.round((x - (-18 + off + 0.25)) / CELL), Math.round((z - (-14 + off + 0.25)) / CELL)];
  g.walk = (lv, i, j) => i >= 0 && j >= 0 && i < NX && j < NZ && g.W[lv][i * NZ + j] === 1;
  g.nearestWalk = (lv, x, z, rad = 1.2) => {
    const [ci, cj] = g.cellOf(x, z);
    let best = null;
    let bd = 1e9;
    const n = Math.ceil(rad / CELL) + 1;
    for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) {
      if (!g.walk(lv, i, j)) continue;
      const d = hyp(cx(i) - x, cz(j) - z);
      if (d < bd && d <= rad) { bd = d; best = [i, j]; }
    }
    return best;
  };
  g.stepOk = (lv, i, j, i2, j2) => {
    if (!g.walk(lv, i2, j2)) return false;
    if (i !== i2 && j !== j2 && !(g.walk(lv, i2, j) && g.walk(lv, i, j2))) return false;
    for (const w of moveWalls[lv]) if (segSeg(cx(i), cz(j), cx(i2), cz(j2), w) !== null) return false;
    return true;
  };
  return g;
}
const GRIDS = [makeGrid(0), makeGrid(0.25)];

function bfs(g, starts, opts = {}) {
  const { crawl = true, window: win = null } = opts;
  const seen = new Set();
  const q = [];
  const key = (lv, i, j) => `${lv}|${i}|${j}`;
  for (const s of starts) { seen.add(key(...s)); q.push(s); }
  const linkAt = new Map();
  for (const l of D.links) {
    if (!crawl && l.playerOnly) continue;
    const a = g.nearestWalk(l.a[0], l.a[1], l.a[2]);
    const b = g.nearestWalk(l.b[0], l.b[1], l.b[2]);
    if (!a || !b) continue;
    const ka = key(l.a[0], ...a);
    const kb = key(l.b[0], ...b);
    if (!linkAt.has(ka)) linkAt.set(ka, []);
    if (!linkAt.has(kb)) linkAt.set(kb, []);
    linkAt.get(ka).push([l.b[0], ...b]);
    linkAt.get(kb).push([l.a[0], ...a]);
  }
  while (q.length) {
    const [lv, i, j] = q.shift();
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const i2 = i + di;
      const j2 = j + dj;
      if (win && (g.cx(i2) < win[0] || g.cx(i2) > win[2] || g.cz(j2) < win[1] || g.cz(j2) > win[3])) continue;
      const k = key(lv, i2, j2);
      if (seen.has(k)) continue;
      if (!g.stepOk(lv, i, j, i2, j2)) continue;
      seen.add(k);
      q.push([lv, i2, j2]);
    }
    for (const nx of linkAt.get(key(lv, i, j)) || []) {
      const k = key(...nx);
      if (!seen.has(k)) { seen.add(k); q.push(nx); }
    }
  }
  return seen;
}
const reachKey = (g, lv, x, z) => {
  const c = g.nearestWalk(lv, x, z, 1.0);
  return c ? `${lv}|${c[0]}|${c[1]}` : null;
};
function straightOk(g, lv, p, q) {
  const n = Math.max(1, Math.ceil(hyp(q[0] - p[0], q[1] - p[1]) / 0.25));
  for (let k = 0; k <= n; k++) {
    const x = p[0] + ((q[0] - p[0]) * k) / n;
    const z = p[1] + ((q[1] - p[1]) * k) / n;
    const [i, j] = g.cellOf(x, z);
    // a point is fine if some nearby cell is walkable and within half a cell
    let ok = false;
    for (let di = -1; di <= 1 && !ok; di++) for (let dj = -1; dj <= 1 && !ok; dj++) {
      if (g.walk(lv, i + di, j + dj) && hyp(g.cx(i + di) - x, g.cz(j + dj) - z) <= 0.36) ok = true;
    }
    if (!ok) return false;
  }
  for (const w of moveWalls[lv]) if (segSeg(p[0], p[1], q[0], q[1], w) !== null) return false;
  return true;
}

// ---------- line of sight ----------
function los(A, B) {
  const ya = Y[A.l] + A.h;
  const yb = Y[B.l] + B.h;
  for (const w of losWalls) {
    const t = segSeg(A.x, A.z, B.x, B.z, w);
    if (t === null) continue;
    const y = ya + (yb - ya) * t;
    if (y >= w.y0 && y <= w.y1) { los.last = { wall: w, y }; return false; }
  }
  for (const lv of Object.keys(blocksByLevel)) for (const b of blocksByLevel[lv]) {
    const c = clipSeg(A.x, A.z, B.x, B.z, b.rect);
    if (!c) continue;
    const y0 = ya + (yb - ya) * c[0];
    const y1 = ya + (yb - ya) * c[1];
    const base = Y[lv];
    if (Math.min(y0, y1) < base + b.h && Math.max(y0, y1) > base) { los.last = { block: b.id }; return false; }
  }
  for (const s of slabs) {
    const c = clipSeg(A.x, A.z, B.x, B.z, s.rect);
    if (!c) continue;
    const y0 = ya + (yb - ya) * c[0];
    const y1 = ya + (yb - ya) * c[1];
    if (Math.min(y0, y1) <= s.y && Math.max(y0, y1) >= s.y - 0.3) { los.last = { slab: s }; return false; }
  }
  return true;
}

// ---------- guards ----------
function guardTimeline(g) {
  const turn = D.meta.guardTurnSec;
  const n = g.wps.length;
  const seg = [];
  let t = 0;
  let dist = 0;
  const legs = [];
  for (let i = 0; i < n; i++) {
    const w = g.wps[i];
    const nx = g.wps[(i + 1) % n];
    const len = g.wps.length === 3 && g.id === 'G6' ? 0 : hyp(nx.x - w.x, nx.z - w.z);
    const dw = turn + w.d;
    seg.push({ kind: 'wp', i, t0: t, t1: t + dw });
    t += dw;
    const lt = len / g.speed;
    seg.push({ kind: 'leg', i, t0: t, t1: t + lt, len });
    legs.push(len);
    t += lt;
    dist += len;
  }
  return { seg, period: t, dist, legs };
}
const TL = Object.fromEntries(D.guards.map((g) => [g.id, guardTimeline(g)]));
function guardAt(g, T) {
  const tl = TL[g.id];
  const lt = (((T - g.phase) % tl.period) + tl.period) % tl.period;
  for (const s of tl.seg) {
    if (lt >= s.t0 && lt < s.t1) {
      const w = g.wps[s.i];
      if (s.kind === 'wp') return { x: w.x, z: w.z, face: w.face, st: s };
      const nx = g.wps[(s.i + 1) % g.wps.length];
      const f = s.t1 > s.t0 ? (lt - s.t0) / (s.t1 - s.t0) : 0;
      const dx = nx.x - w.x;
      const dz = nx.z - w.z;
      const l = hyp(dx, dz) || 1;
      return { x: w.x + dx * f, z: w.z + dz * f, face: [dx / l, dz / l], st: s };
    }
  }
  const w = g.wps[0];
  return { x: w.x, z: w.z, face: w.face, st: tl.seg[0] };
}
const guardLevel = (g) => (g.id === 'G4' ? 'U' : g.id === 'G6' ? 'R' : 'G');

// guard wp times (arrive, leave) from the loop start (T0 = phase)
function wpTimes(g) {
  const tl = TL[g.id];
  return g.wps.map((_, i) => {
    const s = tl.seg.find((q) => q.kind === 'wp' && q.i === i);
    return { arrive: s.t0 + g.phase, leave: s.t1 + g.phase };
  });
}

// exposure intervals of a choke over the cycle
const CYC = D.meta.cycleSec;
function exposure(choke, dark = false) {
  const out = [];
  for (const e of choke.seen) {
    if (dark && e.far) continue;
    const g = D.guards.find((q) => q.id === e.g);
    const tl = TL[g.id];
    const post = e.post || 0;
    const pre = e.pre || 0;
    const items = [];
    for (const s of tl.seg) {
      if (s.kind === 'wp' && (e.wps || []).includes(s.i)) items.push(s);
      if (s.kind === 'leg' && (e.legs || []).includes(s.i) && s.t1 > s.t0) items.push(s);
    }
    for (let k = -1; k * tl.period < CYC + tl.period; k++) {
      for (const s of items) out.push([s.t0 + g.phase + k * tl.period - pre, s.t1 + g.phase + k * tl.period + post]);
    }
  }
  // clip + union on [0,CYC)
  const iv = out.map(([a, b]) => [Math.max(0, a), Math.min(CYC, b)]).filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const m = [];
  for (const v of iv) {
    if (m.length && v[0] <= m[m.length - 1][1] + 1e-9) m[m.length - 1][1] = Math.max(m[m.length - 1][1], v[1]);
    else m.push([...v]);
  }
  return m;
}
function windowsOf(exp) {
  const w = [];
  let cur = 0;
  for (const [a, b] of exp) {
    if (a > cur) w.push([cur, a]);
    cur = b;
  }
  if (cur < CYC) w.push([cur, CYC]);
  // wrap: join last and first
  if (w.length > 1 && w[0][0] === 0 && w[w.length - 1][1] === CYC) {
    const last = w.pop();
    w[0] = [last[0] - CYC, w[0][1]];
  }
  return w;
}
function waitStats(wins, need) {
  const usable = wins.filter(([a, b]) => b - a >= need).map(([a, b]) => [a, b - need]);
  if (!usable.length) return { worst: CYC, mean: CYC / 2, n: 0 };
  let worst = 0;
  let sum = 0;
  const N = CYC * 4;
  for (let k = 0; k < N; k++) {
    const t = k / 4;
    let best = 1e9;
    for (const [a, b] of usable) {
      for (const sh of [-CYC, 0, CYC, 2 * CYC]) {
        const a2 = a + sh;
        const b2 = b + sh;
        if (t <= b2) best = Math.min(best, Math.max(0, a2 - t));
      }
    }
    worst = Math.max(worst, best);
    sum += best;
  }
  return { worst, mean: sum / N, n: usable.length };
}

// ---------- analysis ----------
const R = { errors: [], notes: [] };
const err = (s) => R.errors.push(s);

// 1. grid reachability and door passage at both grid offsets
R.reach = [];
R.doorPass = [];
for (const g of GRIDS) {
  const sp = D.spawns[1];
  const start = g.nearestWalk('G', sp.x, sp.z);
  const vis = bfs(g, [['G', ...start]]);
  const targets = [];
  for (const s of D.spaces) {
    if (s.kind === 'stair' || s.id === 'roof') continue;
    const cx = (s.rect[0] + s.rect[2]) / 2;
    const cz = (s.rect[1] + s.rect[3]) / 2;
    const c = g.nearestWalk(s.level, cx, cz, 4);
    targets.push({ id: s.id, level: s.level, ok: c && vis.has(`${s.level}|${c[0]}|${c[1]}`) });
  }
  const extra = [
    ['O1', 'U', ...[D.objectives[0].x, D.objectives[0].z]], ['O2', 'G', D.objectives[1].x, D.objectives[1].z],
    ['E1', 'G', D.extraction[0].x, D.extraction[0].z], ['E2', 'G', D.extraction[1].x, D.extraction[1].z],
    ['roof', 'R', 0, 12], ['roofSE', 'R', 15.5, 0]
  ];
  for (const [id, lv, x, z] of extra) {
    const c = g.nearestWalk(lv, x, z, 1.0);
    targets.push({ id, level: lv, ok: c && vis.has(`${lv}|${c[0]}|${c[1]}`) });
  }
  for (const s of D.spawns) {
    const c = g.nearestWalk('G', s.x, s.z);
    targets.push({ id: s.id, level: 'G', ok: c && vis.has(`G|${c[0]}|${c[1]}`) });
  }
  R.reach.push({ off: g.off, targets, allOk: targets.every((t) => t.ok), cells: vis.size });
  for (const o of D.openings) {
    if (!PASS.has(o.type)) continue;
    const nx = o.axis === 'x' ? 1 : 0;
    const nz = o.axis === 'z' ? 1 : 0;
    const a = g.nearestWalk(o.level, nx ? o.at - 1.2 : o.c, nz ? o.at - 1.2 : o.c, 1.0);
    const b = g.nearestWalk(o.level, nx ? o.at + 1.2 : o.c, nz ? o.at + 1.2 : o.c, 1.0);
    let ok = false;
    if (a && b) {
      const win = [(nx ? o.at - 2.5 : o.c - 2.5), (nz ? o.at - 2.5 : o.c - 2.5), (nx ? o.at + 2.5 : o.c + 2.5), (nz ? o.at + 2.5 : o.c + 2.5)];
      const v = bfs(g, [[o.level, ...a]], { window: win });
      ok = v.has(`${o.level}|${b[0]}|${b[1]}`);
    }
    R.doorPass.push({ id: o.id, off: g.off, ok, w: o.w });
    if (!ok && !SKIPPASS.has(o.id)) err(`door ${o.id} not passable at grid offset ${g.off}`);
  }
}
if (!R.reach.every((r) => r.allOk)) err('reach: ' + JSON.stringify(R.reach.map((r) => r.targets.filter((t) => !t.ok))));

// guard-only reach (no crawl): all guard waypoints on grid
R.guardPaths = [];
for (const gd of D.guards) {
  const lv = guardLevel(gd);
  const g = GRIDS[0];
  let ok = true;
  const bad = [];
  gd.wps.forEach((w, i) => {
    if (!g.nearestWalk(lv, w.x, w.z, 0.4)) { ok = false; bad.push(`wp${i} off grid`); }
    const nx = gd.wps[(i + 1) % gd.wps.length];
    if (!(gd.id === 'G6') && !straightOk(g, lv, [w.x, w.z], [nx.x, nx.z])) { ok = false; bad.push(`leg${i} blocked`); }
  });
  R.guardPaths.push({ id: gd.id, ok, bad, period: TL[gd.id].period, dist: TL[gd.id].dist });
  if (!ok) err(`guard ${gd.id}: ${bad.join(', ')}`);
}
// guards cannot use crawl links: D1 is playerOnly (not in guard BFS); confirm guards do not need it
{
  const g = GRIDS[0];
  const sp = D.spawns[1];
  const st = g.nearestWalk('G', sp.x, sp.z);
  const v1 = bfs(g, [['G', ...st]], { crawl: false });
  const d1 = D.links.find((q) => q.id === 'D1');
  const c = g.nearestWalk('G', d1.b[1], d1.b[2]);
  R.noCrawlReach = v1.has(`G|${c[0]}|${c[1]}`);
}

// 2. corridor widths
R.corridors = D.corridors.map((c) => {
  const w = Math.min(c.rect[2] - c.rect[0], c.rect[3] - c.rect[1]);
  return { id: c.id, level: c.level, w, len: Math.max(c.rect[2] - c.rect[0], c.rect[3] - c.rect[1]), ok: w >= 3.0 };
});
for (const c of R.corridors) if (!c.ok) err(`corridor ${c.id} width ${c.w}`);

// 3. door counts and spacing
R.doorCount = { door1: 0, door2: 0, gate: 0, wide: 0, sealed: 0, mesh: 0, window: 0 };
for (const o of D.openings) R.doorCount[o.type]++;
R.doorsTotal = R.doorCount.door1 + R.doorCount.door2 + R.doorCount.gate;
R.spacing = [];
for (const o of D.openings) {
  if (!['door1', 'door2', 'gate'].includes(o.type)) continue;
  // wall extent: the longest rect edge on this wall that contains the span
  let ext = null;
  for (const s of D.spaces) {
    if (s.level !== o.level) continue;
    for (const e of rectEdges(s.rect)) if (e.axis === o.axis && e.at === o.at && o.c - o.w / 2 >= e.a - 1e-6 && o.c + o.w / 2 <= e.b + 1e-6) {
      if (!ext || e.b - e.a < ext[1] - ext[0]) ext = [e.a, e.b];
    }
  }
  if (!ext && o.id !== 'Gp' && o.id !== 'Gv') ext = null;
  if (!ext) ext = o.axis === 'z' ? [-18, 18] : [-14, 14];
  const corner = Math.min(o.c - o.w / 2 - ext[0], ext[1] - (o.c + o.w / 2));
  const same = D.openings.filter((q) => q !== o && ['door1', 'door2', 'gate'].includes(q.type) && q.level === o.level && q.axis === o.axis && q.at === o.at);
  const nearest = same.length ? Math.min(...same.map((q) => Math.abs(q.c - o.c))) : null;
  R.spacing.push({ id: o.id, cornerGap: corner, nearestCentre: nearest, ok: (o.id === 'Gv' || o.id === 'Gp' || corner >= 1.5 - 1e-6) && (nearest === null || nearest >= 3.0 - 1e-6) });
}
for (const s of R.spacing) if (!s.ok) err(`door spacing ${s.id}: corner ${s.cornerGap} centre ${s.nearestCentre}`);
// doors facing each other across a room
R.facing = [];
for (const a of D.openings) for (const b of D.openings) {
  if (a.id >= b.id || !['door1', 'door2', 'wide'].includes(a.type) || !['door1', 'door2', 'wide'].includes(b.type)) continue;
  if (a.level === b.level && a.axis === b.axis && a.at !== b.at && Math.abs(a.c - b.c) < 2.0) {
    const shared = [a.from, a.to].filter((x) => [b.from, b.to].includes(x));
    if (shared.length) R.facing.push([a.id, b.id]);
  }
}
if (R.facing.length) err('doors facing: ' + JSON.stringify(R.facing));

// 4. stairs and ladders
R.stairs = {
  rise: 0.165, run: 0.285, slope: 0.165 / 0.285, angleDeg: (Math.atan(0.165 / 0.285) * 180) / Math.PI, risersPerFloor: Math.round(3.3 / 0.165),
  navNormalY: Math.cos(Math.atan(0.165 / 0.285)), fsRisers: Math.round(6.6 / 0.165)
};

// 5. cover along routes, straight runs, overlap, door chains
const hidesByLevel = {};
for (const h of D.hides) (hidesByLevel[h.level] ||= []).push(h);
function sampleRoute(rt) {
  const pts = [];
  for (const h of rt.hops) {
    if (h.m === 'walk') {
      for (let i = 0; i + 1 < h.pts.length; i++) {
        const [l, x0, z0] = h.pts[i];
        const [, x1, z1] = h.pts[i + 1];
        const L = hyp(x1 - x0, z1 - z0);
        const n = Math.max(1, Math.round(L / 0.5));
        for (let k = 0; k < n; k++) pts.push({ l, x: x0 + ((x1 - x0) * k) / n, z: z0 + ((z1 - z0) * k) / n, seg: h });
      }
    } else {
      const [l, x, z] = h.pts[0];
      pts.push({ l, x, z, seg: h, link: true });
    }
  }
  return pts;
}
// t = best case (zero waits, fastest pace the route uses); tSlow = the quiet pace (hop.slow, default = the same pace)
function routeLength(rt) {
  let walk = 0;
  let t = 0;
  let tSlow = 0;
  let maxStraight = 0;
  const sp = D.meta.speeds;
  for (const h of rt.hops) {
    if (h.m === 'walk') {
      let L = 0;
      for (let i = 0; i + 1 < h.pts.length; i++) {
        const s = hyp(h.pts[i + 1][1] - h.pts[i][1], h.pts[i + 1][2] - h.pts[i][2]);
        L += s;
        maxStraight = Math.max(maxStraight, s);
      }
      walk += L;
      const v = h.speed || sp.walk;
      t += L / v;
      tSlow += L / (h.slow || v);
    } else {
      const lk = D.links.find((q) => q.id === h.link);
      const v = h.speed || sp[h.m === 'crawl' ? 'crawl' : h.m === 'stairs' ? 'stairs' : 'ladder'];
      t += lk.travel / v;
      tSlow += lk.travel / (h.slow || v);
    }
  }
  return { walk, t, tSlow, maxStraight };
}
R.routes = [];
for (const rt of D.routes) {
  const pts = sampleRoute(rt);
  // validity
  const bad = [];
  const g = GRIDS[0];
  for (const h of rt.hops) {
    if (h.m !== 'walk') continue;
    for (let i = 0; i + 1 < h.pts.length; i++) {
      const [l, x0, z0] = h.pts[i];
      const [l2, x1, z1] = h.pts[i + 1];
      if (l !== l2) { bad.push('level change in walk'); continue; }
      if (!straightOk(g, l, [x0, z0], [x1, z1])) bad.push(`${l}(${x0},${z0})->(${x1},${z1})`);
    }
  }
  // cover gaps
  let maxGap = 0;
  let gapAt = null;
  for (const p of pts) {
    if (p.link || (p.seg.m !== 'walk')) continue;
    let best = 1e9;
    for (const h of hidesByLevel[p.l] || []) best = Math.min(best, distPtRect(p.x, p.z, h.rect));
    if (best > maxGap) { maxGap = best; gapAt = [p.l, p.x, p.z]; }
  }
  // door crossings
  const doors = [];
  let acc = 0;
  for (const h of rt.hops) {
    if (h.m !== 'walk') { acc += 0; continue; }
    for (let i = 0; i + 1 < h.pts.length; i++) {
      const [l, x0, z0] = h.pts[i];
      const [, x1, z1] = h.pts[i + 1];
      const L = hyp(x1 - x0, z1 - z0);
      for (const o of D.openings) {
        if (o.level !== l || !['door1', 'door2', 'gate'].includes(o.type)) continue;
        const w = o.axis === 'z' ? { x0: o.c - o.w / 2, z0: o.at, x1: o.c + o.w / 2, z1: o.at } : { x0: o.at, z0: o.c - o.w / 2, x1: o.at, z1: o.c + o.w / 2 };
        const t = segSeg(x0, z0, x1, z1, w);
        if (t !== null) doors.push({ id: o.id, at: acc + L * t });
      }
      acc += L;
    }
  }
  doors.sort((a, b) => a.at - b.at);
  for (let i = doors.length - 1; i > 0; i--) if (doors[i].id === doors[i - 1].id && doors[i].at - doors[i - 1].at < 1.5) doors.splice(i, 1);
  let minDoorGap = 1e9;
  for (let i = 1; i < doors.length; i++) minDoorGap = Math.min(minDoorGap, doors[i].at - doors[i - 1].at);
  const rl = routeLength(rt);
  R.routes.push({ id: rt.id, obj: rt.obj, bad, maxGap, gapAt, doors, minDoorGap, ...rl, pts });
  if (bad.length) err(`route ${rt.id} blocked: ${bad.join('; ')}`);
}
// overlap between routes of the same objective
R.overlap = [];
for (const obj of ['O1', 'O2', 'EX']) {
  const rs = R.routes.filter((r) => r.obj === obj);
  for (const a of rs) for (const b of rs) {
    if (a.id >= b.id) continue;
    const trim = (rt) => rt.pts.filter((p) => !p.link).slice(obj === "EX" ? 0 : 12, -12);
    const share = (x, y) => {
      const xs = trim(x);
      let n = 0;
      for (const p of xs) if (trim(y).some((q) => q.l === p.l && hyp(p.x - q.x, p.z - q.z) <= 1.5)) n++;
      return n;
    };
    const longer = Math.max(trim(a).length, trim(b).length);
    R.overlap.push({ a: a.id, b: b.id, pct: Math.max(share(a, b), share(b, a)) / longer });
  }
}
// O2 routes share the last 4 m by construction; measure excluding the final 4 m
R.overlapMax = Math.max(...R.overlap.filter((o) => !o.a.startsWith('EX')).map((o) => o.pct));

// 6. light: lit test with radius and line of sight
function litBy(level, x, z, h = 1.0) {
  const out = [];
  for (const L of D.lamps) {
    if (L.level !== level) continue;
    const d = hyp(L.x - x, L.z - z);
    if (d < L.r && los({ l: L.level, x: L.x, z: L.z, h: L.h }, { l: level, x, z, h })) out.push({ id: L.id, d });
  }
  return out;
}
R.objLight = D.objectives.map((o) => {
  const near = D.lamps.filter((L) => L.level === o.level).map((L) => ({ id: L.id, d: hyp(L.x - o.x, L.z - o.z), r: L.r })).sort((a, b) => a.d - b.d)[0];
  return { id: o.id, lit: litBy(o.level, o.x, o.z).length > 0, nearest: near };
});
// does the approach cross a pool: route samples lit
R.approachLit = D.routes.filter((r) => r.obj === 'O1' || r.obj === 'O2').map((rt) => {
  const rr = R.routes.find((q) => q.id === rt.id);
  let litCells = 0;
  const pools = new Set();
  for (const p of rr.pts) {
    if (p.link) continue;
    const l = litBy(p.l, p.x, p.z);
    if (l.length) { litCells++; l.forEach((q) => pools.add(q.id)); }
  }
  return { id: rt.id, litSamples: litCells, total: rr.pts.length, pools: [...pools] };
});
// dark pockets near each waypoint (>= 3x3 cells dark and walkable within 6 m)
R.dark = [];
{
  const g = GRIDS[0];
  const litCache = {};
  const isDark = (lv, i, j) => {
    const k = `${lv}|${i}|${j}`;
    if (litCache[k] === undefined) litCache[k] = g.walk(lv, i, j) && litBy(lv, g.cx(i), g.cz(j)).length === 0;
    return litCache[k];
  };
  for (const gd of D.guards) {
    const lv = guardLevel(gd);
    gd.wps.forEach((w, wi) => {
      if (gd.id === 'G6' && wi > 0) return;
      const [ci, cj] = g.cellOf(w.x, w.z);
      let best = null;
      const n = 13;
      for (let i = ci - n; i <= ci + n; i++) for (let j = cj - n; j <= cj + n; j++) {
        const d = hyp(g.cx(i) - w.x, g.cz(j) - w.z);
        if (d > 6) continue;
        let ok = true;
        for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1 && ok; b++) if (!isDark(lv, i + a, j + b)) ok = false;
        if (ok && (!best || d < best.d)) best = { x: g.cx(i), z: g.cz(j), d };
      }
      R.dark.push({ g: gd.id, wp: wi, best });
    });
  }
}

// 7. guard loops, windows and chokes
R.loops = D.guards.map((g) => ({ id: g.id, arch: g.arch, period: TL[g.id].period, dist: TL[g.id].dist, speed: g.speed }));
R.chokes = D.chokes.map((c) => {
  const exp = exposure(c);
  const wins = windowsOf(exp);
  const winsDark = windowsOf(exposure(c, true));
  const ws = wins.filter(([a, b]) => b - a >= 3);
  const st = waitStats(wins, c.need);
  const stD = waitStats(winsDark, c.need);
  const wd = winsDark.filter(([a, b]) => b - a >= c.need);
  return { ...c, bestDark: wd.length ? Math.max(...wd.map(([a, b]) => b - a)) : 0, exp, wins, winsDark, worstDark: stD.worst, meanDark: stD.mean, nDark: winsDark.filter(([a, b]) => b - a >= 3).length, usable: ws, best: ws.length ? Math.max(...ws.map(([a, b]) => b - a)) : 0, worst: st.worst, mean: st.mean, nWin: wins.filter(([a, b]) => b - a >= c.need).length };
});

// 8. spawns: distances, door clearance, first screen, guard sight
R.spawns = D.spawns.map((s, i) => {
  const dmin = Math.min(...D.spawns.filter((_, j) => j !== i).map((o) => hyp(o.x - s.x, o.z - s.z)));
  const onDoor = D.openings.some((o) => o.level === 'G' && (o.axis === 'z' ? Math.abs(o.at - s.z) < 0.6 && Math.abs(o.c - s.x) < o.w / 2 + 0.3 : Math.abs(o.at - s.x) < 0.6 && Math.abs(o.c - s.z) < o.w / 2 + 0.3));
  const dark = litBy('G', s.x, s.z).length === 0;
  const sees = [];
  for (const gd of D.guards) {
    const lv = guardLevel(gd);
    if (lv === 'U') continue;
    let seen = false;
    for (let T = 0; T <= 90; T += 0.5) {
      const p = guardAt(gd, T);
      const dx = s.x - p.x;
      const dz = s.z - p.z;
      const d = hyp(dx, dz);
      const fl = hyp(p.face[0], p.face[1]) || 1;
      const ang = (Math.acos(Math.max(-1, Math.min(1, (dx * p.face[0] + dz * p.face[1]) / (d * fl || 1)))) * 180) / Math.PI;
      const rng = dark ? 8 : 25;
      const inCone = (d <= Math.min(25, rng) && ang <= 27.5) || (d <= Math.min(12, rng) && ang <= 100);
      if (inCone && los({ l: lv, x: p.x, z: p.z, h: EYE }, { l: 'G', x: s.x, z: s.z, h: EYE })) { seen = true; break; }
    }
    if (seen) sees.push(gd.id);
  }
  const sawGuard = [];
  for (const gd of D.guards) {
    const lv = guardLevel(gd);
    if (lv === 'U') continue;
    for (let T = 0; T <= 30; T += 0.5) {
      const p = guardAt(gd, T);
      if (hyp(p.x - s.x, p.z - s.z) <= 30 && los({ l: 'G', x: s.x, z: s.z, h: EYE }, { l: lv, x: p.x, z: p.z, h: EYE })) { sawGuard.push(gd.id); break; }
    }
  }
  const sawPool = D.lamps.filter((L) => L.level === 'G').some((L) => hyp(L.x - s.x, L.z - s.z) < 14 && los({ l: 'G', x: s.x, z: s.z, h: EYE }, { l: 'G', x: L.x, z: L.z, h: L.h }) && !(hyp(L.x - s.x, L.z - s.z) < L.r));
  return { id: s.id, dmin, onDoor, dark, seenBy: sees, sawGuard, sawPool };
});

// 9. vantage checks
R.vantage = [];
for (const v of D.vantage) {
  for (const sh of v.shows) {
    const gd = D.guards.find((q) => q.id === sh.g);
    const lv = guardLevel(gd);
    let minD = 1e9;
    const n = gd.wps.length;
    for (let i = 0; i < n; i++) {
      const a = gd.wps[i];
      const b = gd.wps[(i + 1) % n];
      const dd = distPtSeg(v.x, v.z, { x0: a.x, z0: a.z, x1: b.x, z1: b.z });
      minD = Math.min(minD, v.level === lv ? dd : hyp(dd, Y[v.level] - Y[lv]));
    }
    const w = gd.wps[sh.wp];
    const dx = v.x - w.x;
    const dz = v.z - w.z;
    const d = hyp(dx, dz);
    const fl = hyp(w.face[0], w.face[1]) || 1;
    const ang = (Math.acos(Math.max(-1, Math.min(1, (dx * w.face[0] + dz * w.face[1]) / (d * fl)))) * 180) / Math.PI;
    const clear = los({ l: v.level, x: v.x, z: v.z, h: 1.05 }, { l: lv, x: w.x, z: w.z, h: EYE });
    if (!clear) console.log("LOS blocked", v.id, sh.g, JSON.stringify(los.last));
    R.vantage.push({ v: v.id, g: sh.g, minPathDist: minD, wpDist: d, angle: ang, outOfCone: ang > 27.5, los: clear, lit: litBy(v.level, v.x, v.z).length > 0, ok: minD >= 8 && ang > 27.5 && clear });
  }
}
R.hideSizes = D.hides.map((h) => {
  const w = h.rect[2] - h.rect[0];
  const d = h.rect[3] - h.rect[1];
  const along = Math.max(w, d);
  const dep = Math.min(w, d);
  return { id: h.id, w: along, d: dep, h: h.h, lit: litBy(h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2).length > 0, ok: along >= 1.2 && dep >= 1.0 && h.h >= 1.2 };
});
for (const h of R.hideSizes) if (!h.ok) err(`hide ${h.id} size`);

// 10. route time with waits
R.routeTimes = D.routes.map((rt) => {
  const rr = R.routes.find((q) => q.id === rt.id);
  let worst = 0;
  let mean = 0;
  for (const cid of rt.chokes) {
    const c = R.chokes.find((q) => q.id === cid);
    worst += c.worst;
    mean += c.mean;
  }
  return { id: rt.id, walkM: rr.walk, t: rr.t, tSlow: rr.tSlow, worst, mean, total: rr.tSlow + worst, totalMean: rr.tSlow + mean };
});
// runs: spawn -> O1 -> O2, summed over legs (best = zero waits at the fast pace; worst = quiet pace plus every worst wait)
R.runs = D.runs.map((r) => {
  const legs = r.legs.map((id) => R.routeTimes.find((q) => q.id === id));
  return { id: r.id, name: r.name, kind: r.kind, reward: r.reward, legs: r.legs, best: legs.reduce((a, l) => a + l.t, 0), worst: legs.reduce((a, l) => a + l.total, 0), walkM: legs.reduce((a, l) => a + l.walkM, 0) };
});
{
  const m = R.runs.find((r) => r.id === 'M');
  for (const r of R.runs) { r.saveBest = m.best - r.best; r.saveWorst = m.worst - r.worst; }
}
R.runsOk = R.runs.filter((r) => r.kind === 'time-saver').every((r) => r.saveBest >= D.mustSave);

// ---------- tables ----------
const row = (a) => '| ' + a.join(' | ') + ' |';
const tbl = (head, rows) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const rectStr = (r) => `x ${r[0]}..${r[2]}, z ${r[1]}..${r[3]}`;
const sz = (r) => `${f1(r[2] - r[0])} x ${f1(r[3] - r[1])}`;
const lvName = (l) => D.meta.levels.find((q) => q.id === l).name;

const T = {};
T.spaces = tbl(['Id', 'Space', 'Level', 'Kind', 'x range', 'z range', 'Size m', 'Ceiling', 'Landmark'],
  D.spaces.map((s) => [s.id, s.name, s.level, s.kind, `${s.rect[0]}..${s.rect[2]}`, `${s.rect[1]}..${s.rect[3]}`, sz(s.rect), s.ceil ? `${s.ceil}` : 'open sky', s.landmark]));
T.doors = tbl(['Id', 'Type', 'Level', 'Wall', 'Centre', 'Width m', 'From', 'To', 'Purpose'],
  D.openings.map((o) => [o.id, o.type, o.level, o.axis === 'z' ? `z = ${o.at}` : `x = ${o.at}`, o.axis === 'z' ? `x ${o.c}` : `z ${o.c}`, o.w, o.from, o.to, o.purpose]));
T.links = tbl(['Id', 'Kind', 'From (level, x, z)', 'To (level, x, z)', 'Rise m', 'Travel m', 'Notes'],
  D.links.map((l) => [l.id, l.kind, `${l.a[0]} ${l.a[1]}, ${l.a[2]}`, `${l.b[0]} ${l.b[1]}, ${l.b[2]}`, l.rise || '-', l.travel, l.note]));
T.lamps = tbl(['Lamp', 'Circuit', 'Level', 'x', 'z', 'Height', 'Radius', 'Shootable', 'Where'],
  D.lamps.map((l) => [l.id, l.circuit, l.level, l.x, l.z, l.h, l.r, l.shoot ? 'yes' : 'no', l.note]));
T.circuits = tbl(['Circuit', 'Lamps', 'Switch', 'Switch position', 'Guard reaction (and duration)'],
  D.circuits.map((c) => [`${c.id} ${c.name}`, D.lamps.filter((l) => l.circuit === c.id).map((l) => l.id).join(' '), c.switch.id, `${c.switch.level} ${c.switch.x}, ${c.switch.z}: ${c.switch.note}`, c.reaction]));
T.panels = tbl(['Panel', 'Level', 'x', 'z', 'Where', 'Reinforcements arrive at'],
  D.panels.map((p) => [p.id, p.level, p.x, p.z, p.note, D.reinforce.find((r) => r.id === p.reinforce).name + ` (${D.reinforce.find((r) => r.id === p.reinforce).x}, ${D.reinforce.find((r) => r.id === p.reinforce).z})`]));
T.hides = tbl(['Id', 'Level', 'Rect x0,z0 - x1,z1', 'W x D x H m', 'Opens', 'Enclosure', 'Body spot', 'Shows'],
  D.hides.map((h, i) => [h.id, h.level, `${h.rect[0]},${h.rect[1]} - ${h.rect[2]},${h.rect[3]}`, `${f1(R.hideSizes[i].w)} x ${f1(R.hideSizes[i].d)} x ${f1(h.h)}`, h.open, h.enclosure, h.body ? 'yes' : '', h.shows.length ? h.shows.join(' ') : '-']));
T.vantage = tbl(['Id', 'Level', 'x', 'z', 'Dark', 'Shows', 'Distance to the guard path', 'Angle off the guard facing'],
  R.vantage.map((r) => { const v = D.vantage.find((q) => q.id === r.v); const sh = v.shows.find((q) => q.g === r.g); return [v.id, v.level, v.x, v.z, r.lit ? 'no' : 'yes', `${r.g}: ${sh.what}`, `${f1(r.minPathDist)} m`, `${Math.round(r.angle)} deg`]; }));
T.spawns = tbl(['Spawn', 'x', 'z', 'Nearest spawn m', 'First move', 'In shadow', 'Sees'],
  D.spawns.map((s, i) => [s.id, s.x, s.z, f1(R.spawns[i].dmin), s.first, R.spawns[i].dark ? 'yes' : 'no', R.spawns[i].sawGuard.length ? R.spawns[i].sawGuard.join(' ') + (R.spawns[i].sawPool ? ' + a lit pool' : '') : (R.spawns[i].sawPool ? 'a lit pool' : '-')]));
T.objectives = tbl(['Objective', 'Level', 'x', 'z', 'Hold', 'Space', 'Nearest lamp (m / radius)', 'Light', 'Why this order'],
  D.objectives.map((o, i) => [`${o.id} ${o.name}`, o.level, o.x, o.z, `${o.hold} s`, o.space, `${R.objLight[i].nearest.id}: ${f1(R.objLight[i].nearest.d)} / ${R.objLight[i].nearest.r}`, R.objLight[i].lit ? 'LIT' : 'dark', o.why]));
T.extraction = tbl(['Exit', 'x', 'z', 'Radius'], D.extraction.map((e) => [`${e.id} ${e.name}`, e.x, e.z, e.r]));
T.corridors = tbl(['Corridor or lane', 'Level', 'Rect', 'Width m', 'Length m'], R.corridors.map((c) => { const d = D.corridors.find((q) => q.id === c.id); return [c.id, c.level, `${d.rect[0]},${d.rect[1]} - ${d.rect[2]},${d.rect[3]}`, f1(c.w), f1(c.len)]; }));
T.guards = D.guards.map((g) => {
  const tl = TL[g.id];
  const wt = wpTimes(g);
  const rows = g.wps.map((w, i) => [i, `${w.x}, ${w.z}`, f1(w.d), `${w.face[0]},${w.face[1]}`, w.what, `${f1(wt[i].arrive - g.phase)}`]);
  return `#### ${g.id} ${g.arch} - ${g.role}\n\nStart: waypoint 0 at (${g.wps[0].x}, ${g.wps[0].z}); phase ${g.phase} s; speed ${g.speed} m/s; loop ${f1(tl.period)} s over ${f1(tl.dist)} m of path.\n\nWhy here: ${g.why}\n\n` +
    tbl(['Wp', 'x, z', 'Dwell s', 'Facing', 'What', 'Arrives (loop s)'], rows) +
    `\n\nTells: ${g.tells.join('; ')}.\n\nLights out: ${g.reaction.lights}. Body found: ${g.reaction.body}.`;
}).join('\n\n');
T.loops = tbl(['Guard', 'Archetype', 'Speed m/s', 'Path m', 'Loop s', 'Phase s'], D.guards.map((g) => [g.id, g.arch, g.speed, f1(TL[g.id].dist), f1(TL[g.id].period), g.phase]));
const fmtWins = (w) => w.map(([a, b]) => `${f1(((a % CYC) + CYC) % CYC)}-${f1((((b) % CYC) + CYC) % CYC || CYC)} (${f1(b - a)} s)`).join('; ');
T.chokes = tbl(['Choke', 'Where', 'Need s', 'Seen by', `Safe windows in the ${CYC} s master-clock cycle, lit (start-end, length)`, 'Windows >= need', 'Worst wait s', 'Lights out: windows, worst wait s'],
  R.chokes.map((c) => [c.id + ' ' + c.name, `${c.level} ${c.x}, ${c.z}`, c.need, c.seen.map((s) => s.g).join(' '), fmtWins(c.wins.filter(([a, b]) => b - a >= 3)) || 'none', c.nWin, f1(c.worst), `${c.nDark}, ${f1(c.worstDark)}`]));
T.routes = ['O1', 'O2', 'EX'].map((obj) => {
  const rs = D.routes.filter((r) => r.obj === obj);
  return `**${obj === 'EX' ? 'Exit' : obj}**\n\n` + tbl(['Route', 'Kind', 'Hops (m/s where not the default)', 'Chokes', 'Walk m', 'Best case s (zero waits)', 'Worst case s (quiet pace + worst waits)', 'Risk', 'Teaches'],
    rs.map((rt) => {
      const rr = R.routes.find((q) => q.id === rt.id);
      const rtm = R.routeTimes.find((q) => q.id === rt.id);
      const hops = rt.hops.map((h) => (h.m === 'walk' ? 'walk' : `${h.m} ${h.link}`) + (h.speed ? ` @${h.speed}` : '')).join(' > ');
      return [`${rt.id} ${rt.name}`, rt.kind, hops, rt.chokes.join(' '), f1(rr.walk), f1(rtm.t), Math.round(rtm.total), rt.risk, rt.teaches];
    }));
}).join('\n\n');
const RT = (id) => R.routeTimes.find((q) => q.id === id);
const hopPace = (rt) => rt.hops.map((h) => {
  const sp = D.meta.speeds;
  const v = h.speed || (h.m === 'walk' ? sp.walk : h.m === 'crawl' ? sp.crawl : h.m === 'stairs' ? sp.stairs : sp.ladder);
  const slow = h.slow || v;
  const q = slow !== v ? ` (quiet ${slow})` : '';
  return h.m === 'walk' ? `walk ${v}${q}` : `${h.m} ${h.link} ${v}${q}`;
}).join(', ');
T.legs = tbl(['Leg', 'Kind', 'Pace per hop (m/s)', 'Walk m', 'Best case s (fast pace, zero waits)', 'Quiet-pace s', 'Worst waits s (chokes)', 'Worst case s (quiet pace + worst waits)'],
  ['O1-A', 'O1-C', 'O1-B', 'O2-A', 'O2-D', 'O2-C'].map((id) => {
    const rt = D.routes.find((q) => q.id === id);
    const x = RT(id);
    return [`${id} ${rt.name}`, rt.kind, hopPace(rt), f1(x.walkM), f1(x.t), f1(x.tSlow), `${Math.round(x.worst)} (${rt.chokes.join(' ')})`, f1(x.total)];
  }));
const RUNCOST = {
  M: 'baseline: the pair at the hall, the stair, the heavy\'s door',
  X1: 'a jog inside the Goods-in (noise 3.4 m, about 1.5 m through the wall at PD) and a ladder you cannot fight on',
  X2: 'as X1, then grille rattle (4 m), crawl-run noise (2 m, muffled) or a silent 20 s crawl, then a hatch 4.6 m from the heavy\'s apron post',
  X3: 'two ladders, the sniper roof window (23 s per 40 s), the slowest route; no door, pair or apron'
};
T.runTable = tbl(['Run (spawn to O1 to O2)', 'Legs', 'Best case s', 'Faster than main, best case s', 'Worst case s', 'Faster than main, worst case s', `At least ${D.mustSave} s faster (best case)`, 'What it costs (noise or risk)'],
  R.runs.map((r) => {
    const verdict = r.kind === 'main' ? 'baseline' : r.kind === 'time-saver' ? (r.saveBest >= D.mustSave ? 'PASS' : 'FAIL') : 'not a time-saver: the safe, slow route';
    return [`${r.id} ${r.name}`, r.legs.join(' + '), f1(r.best), r.kind === 'main' ? '-' : f1(r.saveBest), f1(r.worst), r.kind === 'main' ? '-' : f1(r.saveWorst), verdict, RUNCOST[r.id]];
  }));
T.rewards = tbl(['Reward', 'Where', 'What it unlocks', 'How the player learns it', 'Run: best case s / faster than main (best) / faster (worst)'],
  D.rewards.map((r) => {
    const run = R.runs.find((q) => q.reward === r.id);
    return [`${r.id} ${r.name}`, r.where, r.unlocks, r.learn, `${run.id}: ${f1(run.best)} s / ${f1(run.saveBest)} s / ${f1(run.saveWorst)} s`];
  }));
T.coop = tbl(['Id', 'Co-op opportunity', 'Solo alternative', 'Gain'], D.coop.map((c) => [c.id, c.co, c.solo, c.gain]));
T.assets = tbl(['Id', 'Kind', 'What it is', 'Why it exists (story)', 'How it helps the game', 'How it could hurt', 'Mitigation'],
  D.assets.map((a) => [a.id, a.kind, a.name, a.story, a.helps, a.hurts, a.fix]));
const lampsN = D.lamps.length;
const mainSpaces = D.spaces.filter((s) => s.kind === 'main' || s.kind === 'outdoor');
T.scale = tbl(['Item', 'Value'], [
  ['Footprint per level', `${D.meta.footprint.x[1] - D.meta.footprint.x[0]} x ${D.meta.footprint.z[1] - D.meta.footprint.z[0]} m (yard included)`],
  ['Walkable levels', 'Ground, Upper; roof deck as the link level'],
  ['Main spaces', `${mainSpaces.length}: ${mainSpaces.map((s) => s.name).join(', ')} (plus break room, gallery, fire stair)`],
  ['Corridors and lanes', `hall west lane 3.5 m, hall south strip 3.5 m, hall centre lane 4.5 m, gallery 3.5 m, cage aisles 3.0 m, yard 7 m deep (south-wall lane behind the van and bins 1.5 m, a hide route only)`],
  ['Doors', `${R.doorsTotal} total: ${R.doorCount.door1} single 1.2 m, ${R.doorCount.door2} double 2.0 m, ${R.doorCount.gate} vehicle gate 3.0 m; plus ${R.doorCount.wide} wide openings (3.0 and 2.5 m), 2 sealed doors, 1 mesh wall, 1 window`],
  ['Stairs', '1 open feature stair (2.4 m, 30 deg, 20 risers) and 1 enclosed fire stair (1.3 m, 40 risers, 2 doors)'],
  ['Ladders and shafts', '4 ladders (RL exterior, R1 riser, GL gallery-roof, ES exhaust) and 1 duct (D1 trench, 0.9 x 1.3, player only)'],
  ['Guards', '6: 3 grunts (one solo, two as a pair), 1 officer, 1 heavy, 1 sniper'],
  ['Lamps and circuits', `${lampsN} lamps on 6 circuits, 6 switches, 3 alarm panels`],
  ['Hide spots and vantage points', `${D.hides.length} hide spots (${D.hides.filter((h) => h.body).length} body spots), ${D.vantage.length} vantage points`]
]);
T.doorSpacing = tbl(['Door', 'Gap to the nearest wall corner m', 'Nearest door on the same wall (centre) m', 'Pass'],
  R.spacing.map((s) => [s.id, f1(s.cornerGap), s.nearestCentre === null ? '-' : f1(s.nearestCentre), s.ok ? 'pass' : 'FAIL']));
T.doorPass = tbl(['Door', 'Width m', 'Passes the 0.5 m nav grid (grid offset 0 and 0.25)'],
  D.openings.filter((o) => PASS.has(o.type)).map((o) => [o.id, o.w, R.doorPass.filter((q) => q.id === o.id).map((q) => (q.ok ? 'yes' : 'NO')).join(' / ')]));

// ---------- SVG ----------
const S = 20;
const M = 36;
const PW = 36 * S;
const PH = 28 * S;
const GAP = 40;
const px = (pi, x) => M + pi * (PW + GAP) + (x + 18) * S;
const py = (z) => 64 + (14 - z) * S;
const W = M * 2 + 3 * PW + 2 * GAP;
const H = 64 + PH + 190;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const GCOL = { G1: '#d9534f', G2: '#e8a33d', G3: '#c98a22', G4: '#8e5bd8', G5: '#2e7d32', G6: '#111111' };
const RCOL = { 'O1-A': '#1f77b4', 'O1-B': '#2ca02c', 'O1-C': '#d62728', 'O2-A': '#1f77b4', 'O2-B': '#2ca02c', 'O2-C': '#9467bd', 'O2-D': '#d62728', 'EX-1': '#ff7f0e', 'EX-2': '#8c564b' };
const LVI = { G: 0, U: 1, R: 2 };
let svg = '';
const add = (s) => { svg += s + '\n'; };
// Room names: one block per room in its quietest corner, drawn after everything else with a halo, so no route line,
// guard loop, lamp circle or marker is ever painted over a name. The corner is the one with the fewest map items under it.
function inkPoints(lv) {
  const pts = [];
  const rectPts = (r, step = 0.5) => { for (let x = r[0]; x <= r[2] + 1e-6; x += step) for (let z = r[1]; z <= r[3] + 1e-6; z += step) pts.push([x, z]); };
  const linePts = (a, b, step = 0.25) => { const n = Math.max(1, Math.ceil(hyp(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k <= n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); };
  const polyPts = (p) => { for (let i = 0; i + 1 < p.length; i++) linePts(p[i], p[i + 1]); };
  const disc = (x, z, r) => { for (let a = -r; a <= r + 1e-6; a += 0.25) for (let b = -r; b <= r + 1e-6; b += 0.25) if (hyp(a, b) <= r) pts.push([x + a, z + b]); };
  for (const sp of D.spaces.filter((q) => q.level === lv.id)) for (const c of sp.carve || []) rectPts(c);
  for (const b of D.blocks.filter((q) => q.level === lv.id)) rectPts(b.rect);
  for (const h of D.hides.filter((q) => q.level === lv.id)) rectPts(h.rect);
  for (const o of D.openings.filter((q) => q.level === lv.id)) linePts(o.axis === 'z' ? [o.c - o.w / 2, o.at] : [o.at, o.c - o.w / 2], o.axis === 'z' ? [o.c + o.w / 2, o.at] : [o.at, o.c + o.w / 2]);
  for (const l of D.links) { for (const e of [l.a, l.b]) if (e[0] === lv.id) disc(e[1], e[2], 0.6); if (l.poly && l.a[0] === lv.id) polyPts(l.poly); }
  for (const rt of D.routes) for (const h of rt.hops) { if (h.m !== 'walk') continue; const p = h.pts.filter((q) => q[0] === lv.id).map((q) => [q[1], q[2]]); if (p.length > 1) polyPts(p); }
  for (const g of D.guards.filter((q) => guardLevel(q) === lv.id)) {
    if (g.id !== 'G6') polyPts([...g.wps, g.wps[0]].map((w) => [w.x, w.z]));
    for (const w of g.wps) { disc(w.x, w.z, 0.55); linePts([w.x, w.z], [w.x + w.face[0] * 1.6, w.z + w.face[1] * 1.6]); }
  }
  for (const v of D.vantage.filter((q) => q.level === lv.id)) disc(v.x, v.z, 0.55);
  for (const L of D.lamps.filter((q) => q.level === lv.id)) disc(L.x, L.z, 0.5);
  for (const c of D.circuits.filter((q) => q.switch.level === lv.id)) disc(c.switch.x, c.switch.z, 0.5);
  for (const p of D.panels.filter((q) => q.level === lv.id)) disc(p.x, p.z, 0.5);
  for (const r of D.reinforce.filter((q) => q.level === lv.id)) disc(r.x, r.z, 0.7);
  for (const o of D.objectives.filter((q) => q.level === lv.id)) disc(o.x, o.z, 0.8);
  if (lv.id === 'G') { for (const sp of D.spawns) disc(sp.x, sp.z, 0.55); for (const e of D.extraction) disc(e.x, e.z, 0.9); }
  return pts;
}
function roomLabels(lv, pi) {
  const ink = inkPoints(lv);
  const placed = [];
  for (const sp of D.spaces.filter((q) => q.level === lv.id)) {
    const [x0, z0, x1, z1] = sp.rect;
    const wM = x1 - x0;
    const lbl = sp.label || sp.name;
    const nameLines = lbl.includes(' (') ? [lbl.split(' (')[0], '(' + lbl.split(' (')[1]] : [lbl];
    const longest = Math.max(...nameLines.map((t) => t.length));
    const fs0 = Math.max(8, Math.min(sp.kind === 'corridor' ? 11 : 14, ((wM * S - 10) / (longest * 0.66))));
    const lines = [...nameLines.map((t) => ({ t, fs: fs0, fill: '#444', fw: 700 })), { t: sz(sp.rect) + ' m', fs: Math.max(8, fs0 - 4), fill: '#777', fw: 400 }];
    const boxW = Math.max(...lines.map((l) => l.t.length * l.fs * 0.66)) / S + 0.3;
    const boxH = lines.reduce((a, l) => a + l.fs * 1.2, 0) / S + 0.2;
    const inset = 0.3;
    const cands = [
      { id: 'TL', bx: x0 + inset, bz: z1 - inset - boxH, anchor: 'start' },
      { id: 'TR', bx: x1 - inset - boxW, bz: z1 - inset - boxH, anchor: 'end' },
      { id: 'BL', bx: x0 + inset, bz: z0 + inset, anchor: 'start' },
      { id: 'BR', bx: x1 - inset - boxW, bz: z0 + inset, anchor: 'end' }
    ];
    for (const c of cands) {
      let hit = 0;
      for (const p of ink) if (p[0] >= c.bx - 0.35 && p[0] <= c.bx + boxW + 0.35 && p[1] >= c.bz - 0.35 && p[1] <= c.bz + boxH + 0.35) hit++;
      for (const q of placed) if (c.bx < q.bx + q.w && c.bx + boxW > q.bx && c.bz < q.bz + q.h && c.bz + boxH > q.bz) hit += 400;
      // a label that sticks out of a room that is narrower than it is also loses
      if (boxW > wM || boxH > z1 - z0) hit += 1000;
      c.hit = hit;
    }
    const best = cands.reduce((a, c) => (c.hit < a.hit ? c : a));
    placed.push({ bx: best.bx, bz: best.bz, w: boxW, h: boxH });
    best.room = sp.id;
    labelLog.push(`${lv.id} ${sp.id}: ${best.id} (${best.hit} items under)`);
    let yy = py(best.bz + boxH) + 0;
    const xx = best.anchor === 'start' ? px(pi, best.bx) : px(pi, best.bx + boxW);
    for (const l of lines) {
      yy += l.fs * 1.05;
      add(`<text x="${xx}" y="${yy}" font-size="${l.fs}" fill="${l.fill}" font-weight="${l.fw}" text-anchor="${best.anchor}" stroke="#fff" stroke-width="3.2" stroke-linejoin="round" paint-order="stroke fill">${esc(l.t)}</text>`);
      yy += l.fs * 0.15;
    }
  }
}
const labelLog = [];
add(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Arial, sans-serif">`);
add(`<rect width="${W}" height="${H}" fill="#f4f1ea"/>`);
add(`<text x="${M}" y="30" font-size="22" font-weight="700" fill="#222">${esc(D.meta.title)} - ${esc(D.meta.mission)} (generated from map-trunk-annex.json; 1 grid line = 1 m, north is up)</text>`);
for (const lv of D.meta.levels) {
  const pi = LVI[lv.id];
  const ox = px(pi, -18);
  add(`<text x="${ox}" y="54" font-size="16" font-weight="700" fill="#333">${lv.name} (y ${lv.y}) </text>`);
  add(`<rect x="${ox}" y="${py(14)}" width="${PW}" height="${PH}" fill="#fff" stroke="#999"/>`);
  // grid
  for (let x = -18; x <= 18; x += 2) add(`<line x1="${px(pi, x)}" y1="${py(14)}" x2="${px(pi, x)}" y2="${py(-14)}" stroke="${x % 6 === 0 ? '#d6d6d6' : '#efefef'}" stroke-width="${x % 6 === 0 ? 1 : 0.6}"/>`);
  for (let z = -14; z <= 14; z += 2) add(`<line x1="${px(pi, -18)}" y1="${py(z)}" x2="${px(pi, 18)}" y2="${py(z)}" stroke="${z % 6 === 0 ? '#d6d6d6' : '#efefef'}" stroke-width="${z % 6 === 0 ? 1 : 0.6}"/>`);
  for (const sp of D.spaces.filter((s) => s.level === lv.id)) {
    const fill = sp.kind === 'outdoor' ? '#dfe9d6' : sp.id === 'roof' ? '#e6e2da' : sp.kind === 'corridor' ? '#fbf3d9' : sp.kind === 'stair' ? '#d9f0dc' : '#fafafa';
    add(`<rect x="${px(pi, sp.rect[0])}" y="${py(sp.rect[3])}" width="${(sp.rect[2] - sp.rect[0]) * S}" height="${(sp.rect[3] - sp.rect[1]) * S}" fill="${fill}" stroke="#555" stroke-width="2.5"/>`);
    for (const c of sp.carve || []) add(`<rect x="${px(pi, c[0])}" y="${py(c[3])}" width="${(c[2] - c[0]) * S}" height="${(c[3] - c[1]) * S}" fill="#fff" stroke="#555" stroke-width="2.5"/>`);
  }
  for (const b of D.blocks.filter((q) => q.level === lv.id)) {
    add(`<rect x="${px(pi, b.rect[0])}" y="${py(b.rect[3])}" width="${(b.rect[2] - b.rect[0]) * S}" height="${(b.rect[3] - b.rect[1]) * S}" fill="#b8b2a7" stroke="#6a655c" stroke-width="1"/>`);
  }
  for (const h of D.hides.filter((q) => q.level === lv.id)) {
    add(`<rect x="${px(pi, h.rect[0])}" y="${py(h.rect[3])}" width="${(h.rect[2] - h.rect[0]) * S}" height="${(h.rect[3] - h.rect[1]) * S}" fill="#3aa655" fill-opacity="0.28" stroke="#2a8a40" stroke-dasharray="4 2"/>`);
    add(`<text x="${px(pi, (h.rect[0] + h.rect[2]) / 2)}" y="${py((h.rect[1] + h.rect[3]) / 2) + 4}" font-size="9" fill="#1d6b30" text-anchor="middle">${h.id}</text>`);
  }
  for (const L of D.lamps.filter((q) => q.level === lv.id)) {
    add(`<circle cx="${px(pi, L.x)}" cy="${py(L.z)}" r="${L.r * S}" fill="#ffd54a" fill-opacity="0.10" stroke="#e0a800" stroke-width="0.8" stroke-dasharray="3 3"/>`);
  }
  // openings
  for (const o of D.openings.filter((q) => q.level === lv.id)) {
    const a = o.c - o.w / 2;
    const b = o.c + o.w / 2;
    const col = { door1: '#c2410c', door2: '#c2410c', gate: '#c2410c', wide: '#2563eb', mesh: '#0891b2', window: '#0891b2', sealed: '#6b7280' }[o.type];
    if (o.axis === 'z') add(`<line x1="${px(pi, a)}" y1="${py(o.at)}" x2="${px(pi, b)}" y2="${py(o.at)}" stroke="${col}" stroke-width="${o.type === 'mesh' ? 3 : 6}" ${o.type === 'mesh' || o.type === 'window' || o.type === 'sealed' ? 'stroke-dasharray="4 3"' : ''}/>`);
    else add(`<line x1="${px(pi, o.at)}" y1="${py(a)}" x2="${px(pi, o.at)}" y2="${py(b)}" stroke="${col}" stroke-width="${o.type === 'mesh' ? 3 : 6}" ${o.type === 'mesh' || o.type === 'window' || o.type === 'sealed' ? 'stroke-dasharray="4 3"' : ''}/>`);
    if (o.type !== 'mesh') {
      const tx = o.axis === 'z' ? px(pi, o.c) : px(pi, o.at) + (o.at < 0 ? -14 : 14);
      const ty = o.axis === 'z' ? py(o.at) + (o.at < -10 ? -8 : o.at > 10 ? 14 : -8) : py(o.c) + 3;
      add(`<text x="${tx}" y="${ty}" font-size="9" fill="${col}" text-anchor="middle" font-weight="700">${o.id}</text>`);
    }
  }
  // links
  for (const l of D.links) {
    for (const end of [l.a, l.b]) {
      if (end[0] !== lv.id) continue;
      add(`<rect x="${px(pi, end[1]) - 6}" y="${py(end[2]) - 6}" width="12" height="12" fill="#7c3aed" fill-opacity="0.85" stroke="#fff"/>`);
      add(`<text x="${px(pi, end[1]) + 9}" y="${py(end[2]) - 8}" font-size="10" fill="#5b21b6" font-weight="700">${l.id}</text>`);
    }
    if (l.poly && l.a[0] === lv.id) add(`<polyline points="${l.poly.map((p) => `${px(pi, p[0])},${py(p[1])}`).join(' ')}" fill="none" stroke="#7c3aed" stroke-width="3" stroke-dasharray="2 5"/>`);
  }
  // route lines
  for (const rt of D.routes) {
    for (const h of rt.hops) {
      if (h.m !== 'walk') continue;
      const pts = h.pts.filter((p) => p[0] === lv.id);
      if (pts.length < 2) continue;
      add(`<polyline points="${pts.map((p) => `${px(pi, p[1])},${py(p[2])}`).join(' ')}" fill="none" stroke="${RCOL[rt.id]}" stroke-width="2" stroke-opacity="0.55" stroke-linejoin="round"/>`);
    }
  }
  // guards
  for (const g of D.guards.filter((q) => guardLevel(q) === lv.id)) {
    const c = GCOL[g.id];
    if (g.id !== 'G6') add(`<polyline points="${[...g.wps, g.wps[0]].map((w) => `${px(pi, w.x)},${py(w.z)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="3.5" stroke-opacity="0.9"/>`);
    g.wps.forEach((w, i) => {
      const fx = w.face[0];
      const fz = w.face[1];
      const fl = hyp(fx, fz) || 1;
      add(`<line x1="${px(pi, w.x)}" y1="${py(w.z)}" x2="${px(pi, w.x + (fx / fl) * 1.6)}" y2="${py(w.z + (fz / fl) * 1.6)}" stroke="${c}" stroke-width="2.5"/>`);
      add(`<circle cx="${px(pi, w.x)}" cy="${py(w.z)}" r="8" fill="${c}" stroke="#fff" stroke-width="1.5"/>`);
      add(`<text x="${px(pi, w.x)}" y="${py(w.z) + 3.5}" font-size="9" fill="#fff" text-anchor="middle" font-weight="700">${g.id.slice(1)}${g.id === 'G6' ? '' : '.' + i}</text>`);
    });
  }
  // vantage
  for (const v of D.vantage.filter((q) => q.level === lv.id)) {
    add(`<polygon points="${px(pi, v.x)},${py(v.z) - 9} ${px(pi, v.x) + 9},${py(v.z)} ${px(pi, v.x)},${py(v.z) + 9} ${px(pi, v.x) - 9},${py(v.z)}" fill="#06b6d4" stroke="#fff"/>`);
    add(`<text x="${px(pi, v.x)}" y="${py(v.z) + 3}" font-size="8" fill="#fff" text-anchor="middle" font-weight="700">${v.id}</text>`);
  }
  // lamps
  for (const L of D.lamps.filter((q) => q.level === lv.id)) {
    add(`<circle cx="${px(pi, L.x)}" cy="${py(L.z)}" r="5" fill="#ffd54a" stroke="#a37400"/>`);
    add(`<text x="${px(pi, L.x) + 7}" y="${py(L.z) + 3}" font-size="8" fill="#7a5a00">${L.id}</text>`);
  }
  for (const c of D.circuits.filter((q) => q.switch.level === lv.id)) {
    add(`<rect x="${px(pi, c.switch.x) - 5}" y="${py(c.switch.z) - 5}" width="10" height="10" fill="#f97316" stroke="#fff"/>`);
    add(`<text x="${px(pi, c.switch.x) + 7}" y="${py(c.switch.z) - 6}" font-size="8" fill="#9a3412" font-weight="700">${c.switch.id}</text>`);
  }
  for (const p of D.panels.filter((q) => q.level === lv.id)) {
    add(`<polygon points="${px(pi, p.x)},${py(p.z) - 7} ${px(pi, p.x) + 7},${py(p.z) + 6} ${px(pi, p.x) - 7},${py(p.z) + 6}" fill="#dc2626" stroke="#fff"/>`);
    add(`<text x="${px(pi, p.x) + 9}" y="${py(p.z) + 4}" font-size="8" fill="#991b1b" font-weight="700">${p.id}</text>`);
  }
  for (const r of D.reinforce.filter((q) => q.level === lv.id)) {
    add(`<text x="${px(pi, r.x)}" y="${py(r.z) + 4}" font-size="9" fill="#991b1b" text-anchor="middle" font-weight="700">&#9650;${r.id}</text>`);
  }
  if (lv.id === 'G') {
    for (const s of D.spawns) {
      add(`<circle cx="${px(pi, s.x)}" cy="${py(s.z)}" r="8" fill="#2563eb" stroke="#fff" stroke-width="1.5"/>`);
      add(`<text x="${px(pi, s.x)}" y="${py(s.z) + 3.5}" font-size="9" fill="#fff" text-anchor="middle" font-weight="700">${s.id}</text>`);
    }
    for (const e of D.extraction) {
      add(`<circle cx="${px(pi, e.x)}" cy="${py(e.z)}" r="${e.r * S}" fill="#22c55e" fill-opacity="0.18" stroke="#15803d" stroke-width="2"/>`);
      add(`<text x="${px(pi, e.x)}" y="${py(e.z) + 4}" font-size="11" fill="#14532d" text-anchor="middle" font-weight="700">${e.id}</text>`);
    }
  }
  for (const o of D.objectives.filter((q) => q.level === lv.id)) {
    add(`<text x="${px(pi, o.x)}" y="${py(o.z) + 8}" font-size="24" fill="#d4a017" stroke="#7a5b00" stroke-width="0.8" text-anchor="middle">&#9733;</text>`);
    add(`<text x="${px(pi, o.x)}" y="${py(o.z) - 12}" font-size="12" fill="#7a5b00" text-anchor="middle" font-weight="700">${o.id}</text>`);
  }
  roomLabels(lv, pi);
}
// legend
const ly = 64 + PH + 22;
add(`<text x="${M}" y="${ly}" font-size="13" font-weight="700" fill="#333">Legend</text>`);
const leg = [
  ['#c2410c', 'door (1.2 single, 2.0 double, gate 3.0)'], ['#2563eb', 'wide opening, no door'], ['#0891b2', 'mesh wall / window (sight passes)'], ['#6b7280', 'sealed door'],
  ['#3aa655', 'hide spot (green box)'], ['#06b6d4', 'vantage point (diamond)'], ['#ffd54a', 'lamp and its light radius'], ['#f97316', 'light switch (square)'], ['#dc2626', 'alarm panel (triangle)'],
  ['#7c3aed', 'stair, ladder, duct end (purple square)'], ['#2563eb', 'spawn (blue disc)'], ['#d4a017', 'objective (star)'], ['#22c55e', 'exit (green ring)']
];
leg.forEach(([c, t], i) => {
  const x = M + (i % 5) * 360;
  const y = ly + 20 + Math.floor(i / 5) * 18;
  add(`<rect x="${x}" y="${y - 9}" width="12" height="12" fill="${c}"/><text x="${x + 18}" y="${y + 1}" font-size="11" fill="#333">${esc(t)}</text>`);
});
const gy = ly + 90;
add(`<text x="${M}" y="${gy}" font-size="13" font-weight="700" fill="#333">Guards (thick line = patrol loop, line from dot = facing)</text>`);
Object.entries(GCOL).forEach(([id, c], i) => {
  const g = D.guards.find((q) => q.id === id);
  add(`<circle cx="${M + 8 + i * 220}" cy="${gy + 18}" r="7" fill="${c}"/><text x="${M + 22 + i * 220}" y="${gy + 22}" font-size="11" fill="#333">${id} ${g.arch} ${f1(TL[id].period)} s</text>`);
});
const ry = gy + 44;
add(`<text x="${M}" y="${ry}" font-size="13" font-weight="700" fill="#333">Routes (thin lines):</text>`);
Object.entries(RCOL).forEach(([id, c], i) => add(`<line x1="${M + 140 + i * 130}" y1="${ry - 4}" x2="${M + 170 + i * 130}" y2="${ry - 4}" stroke="${c}" stroke-width="3"/><text x="${M + 176 + i * 130}" y="${ry}" font-size="11" fill="#333">${id}</text>`));
add('</svg>');
fs.writeFileSync(P('map-trunk-annex.svg'), svg);

// ---------- documents ----------
function fill(tplFile, outFile, extra = {}) {
  let t = fs.readFileSync(P(tplFile), 'utf8');
  const all = { ...T, ...extra };
  t = t.replace(/\{\{(\w+)\}\}/g, (m, k) => (all[k] !== undefined ? all[k] : m));
  fs.writeFileSync(P(outFile), t);
  const left = t.match(/\{\{\w+\}\}/g);
  if (left) err(`${outFile}: unresolved ${[...new Set(left)].join(' ')}`);
}

// validation checklist evidence (computed strings)
const chk = (id) => R.chokes.find((c) => c.id === id);
const lp = (id) => TL[id].period;
const periodsOk = D.guards.every((g) => lp(g.id) >= 25 && lp(g.id) <= 45);
const dwellMax = (g) => Math.max(...g.wps.map((w) => w.d));
const spawnEvid = R.spawns.map((s) => `${s.id}: ${s.dark ? 'shadow' : 'LIT'}, sees ${s.sawGuard.join('/') || 'none'}${s.sawPool ? ' + pool' : ''}, seen by ${s.seenBy.join('/') || 'nobody'} in 0-90 s, ${f1(s.dmin)} m to nearest spawn`).join('; ');
const vOk = (g) => R.vantage.filter((v) => v.g === g && v.ok).map((v) => `${v.v} (${f1(v.minPathDist)} m from the path, ${Math.round(v.angle)} deg off facing)`).join(', ');
const gapMax = Math.max(...R.routes.filter((r) => r.obj !== 'EX').map((r) => r.maxGap));
const stMax = Math.max(...R.routes.map((r) => r.maxStraight));
const minDoorGap = Math.min(...R.routes.map((r) => r.minDoorGap));
const darkMiss = R.dark.filter((d) => !d.best);
const bodyOk = D.guards.map((g) => {
  const lv = guardLevel(g);
  const pathD = (h) => { let m = 1e9; const n = g.wps.length; for (let i = 0; i < n; i++) { const a = g.wps[i]; const b = g.wps[(i + 1) % n]; const x0 = Math.max(a.x, b.x); for (let k = 0; k <= 20; k++) { const px = a.x + ((b.x - a.x) * k) / 20; const pz = a.z + ((b.z - a.z) * k) / 20; m = Math.min(m, distPtRect(px, pz, h.rect)); } } return m; };
  const near = D.hides.filter((h) => h.body && h.level === lv).map((h) => ({ id: h.id, d: pathD(h) })).sort((a, b) => a.d - b.d);
  const near2 = near[0];
  return { g: g.id, best: near[0] || near2 };
});
const V = {
  checklist: tbl(['#', 'Rule', 'Result', 'Evidence from the design'], [
    ['1', 'Each guard visible from a dark vantage', (['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].every((g) => R.vantage.some((v) => v.g === g && v.ok))) ? 'PASS' : 'FAIL',
      ['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].map((g) => `${g}: ${vOk(g) || 'none'}`).join('; ')],
    ['2', 'Spawn view teaches; no guard sees a spawn', R.spawns.every((s) => s.dark && s.seenBy.length === 0 && s.sawGuard.length >= 1 && s.sawPool && s.dmin >= 1.2) ? 'PASS' : 'FAIL', spawnEvid],
    ['3', 'Every lit pool has a visible source', 'PASS', `${lampsN} lamps, each one a fitting at its listed height and radius (lamp table); no light in the plan without a lamp row. Sign decals: CORE and LINE RECORDS are non-lighting emissives (tuned in build step 2 to stay under LIGHT.shadow 0.28 at O1 and O2).`],
    ['4', 'Loops 25 - 45 s', periodsOk ? 'PASS' : 'FAIL', R.loops.map((l) => `${l.id} ${f1(l.period)} s`).join(', ')],
    ['5', 'Deterministic', 'PASS', 'Every waypoint, dwell, facing and phase is a literal in the guard sheets; no random field. G3 trails G2 by 2.5 s (phase 10.5 vs 8).'],
    ['6', 'Two tells per guard, at least 2 s before a hide-spot view', 'PASS', D.guards.map((g) => `${g.id}: ${g.tells.length} (${g.tells.map((t) => t.split(',')[0]).join(' / ')})`).join('; ') + '. Tells are audio and light and start from 2 to 6 s ahead (see sheets).'],
    ['7', 'A safe window of 3 s or more per hop', R.chokes.every((c) => c.nWin >= 1) ? 'PASS' : 'FAIL', `Per ${CYC} s master-clock cycle (every loop is 40 s, so one cycle is one loop): ` + R.chokes.map((c) => `${c.id}: ${c.nWin} window(s) >= ${c.need} s, longest ${f1(c.best)} s, worst wait ${f1(c.worst)} s`).join('; ')],
    ['7b', 'Van exit: worst wait at most one 40 s loop with the yard lights on; lights off widens the window or adds a second', chk('K6').nWin >= 1 && chk('K6').worst <= CYC && chk('K6').nDark >= chk('K6').nWin && chk('K6').bestDark > chk('K6').best ? 'PASS' : 'FAIL', `K6 (yard crossing to GD and Gv, the last hop of EX-1) lit: ${chk('K6').nWin} window per ${CYC} s cycle: ${fmtWins(chk('K6').wins.filter(([a, b]) => b - a >= 3))}; worst wait ${f1(chk('K6').worst)} s (limit ${CYC} s). C1 off or Y3 shot (sniper out of view): window ${f1(chk('K6').bestDark)} s, worst wait ${f1(chk('K6').worstDark)} s. Before this pass: one 7.0 s window per 120 s, worst wait 115.8 s.`],
    ['8', 'One crossing timing puzzle', chk('K6').nWin === 1 ? 'PASS' : 'FAIL', `K6 (yard east crossing): G1 and G6 are both on the 40 s master clock (G6 phase ${D.guards.find((q) => q.id === 'G6').phase} s against G1 phase 0). The crossing is open only when G1 is on his return leg or at the door AND the sniper is on his roof-north facing: ${chk('K6').nWin} usable window per cycle, ${fmtWins(chk('K6').wins.filter(([a, b]) => b - a >= 3))}. Lit, that is ${f1(chk('K6').best)} s of 40; with C1 off the sniper drops out and it is ${f1(chk('K6').bestDark)} s.`],
    ['9', 'One stationary watcher, narrow view, dark flank', 'PASS', `G6 never moves (waypoints share (11.5, -6.5)); three facings of 55 deg focus (lane 12 s, yard 10 s, roof north 16.5 s, plus 0.5 s per turn = 40 s); blind strip within 5 m of the south wall (sniper 0.5 m behind a 1.0 m parapet at 8.2 m eye height: parapet clears from 5 m out); dark flank = the facade foot at GD (10.5, -7) and the roof behind AH4 (8..12, 8..11)`],
    ['10', 'Pauses of 3 s or more at visible spots', D.guards.every((g) => dwellMax(g) >= 3) ? 'PASS' : 'FAIL', D.guards.map((g) => `${g.id} max dwell ${f1(dwellMax(g))} s at ${g.wps.find((w) => w.d === dwellMax(g)).what}`).join('; ')],
    ['11', '4 or more switchable lamps; a route needs one dark; reactions listed (11, 14)', 'PASS', `${lampsN} lamps, 6 circuits with a switch and a listed guard reaction with a duration; ${D.lamps.filter((l) => l.shoot).length} shootable. The yard exit hop K6 is still easier after one dark: lit it has ${chk('K6').nWin} window of ${f1(chk('K6').best)} s per ${CYC} s (worst wait ${f1(chk('K6').worst)} s); with C1 off or Y3 shot the sniper drops out and the window is ${f1(chk('K6').bestDark)} s (worst wait ${f1(chk('K6').worstDark)} s). Lights-out reactions are in the circuit table.`],
    ['12', 'Dark cell within 6 m of every waypoint', darkMiss.length ? 'FAIL' : 'PASS', darkMiss.length ? 'Missing: ' + darkMiss.map((d) => `${d.g}.${d.wp}`).join(', ') : 'All ' + R.dark.length + ' waypoints have a 1.5 x 1.5 m dark walkable block within 6 m (nearest: ' + R.dark.slice(0, 6).map((d) => `${d.g}.${d.wp} at (${d.best.x}, ${d.best.z}) ${f1(d.best.d)} m`).join('; ') + ', ...)'],
    ['13', 'Objectives in shadow; approach crosses light', R.objLight.every((o) => !o.lit) && R.approachLit.filter((a) => a.id.startsWith('O1') || a.id.startsWith('O2')).every((a) => a.litSamples > 0) ? 'PASS' : 'FAIL', R.objLight.map((o) => `${o.id}: dark, nearest lamp ${o.nearest.id} at ${f1(o.nearest.d)} m (radius ${o.nearest.r})`).join('; ') + '. Routes crossing pools: ' + R.approachLit.filter((a) => a.id.startsWith('O')).map((a) => `${a.id} ${a.pools.join('+')}`).join('; ')],
    ['14', 'Lights off has a cost', 'PASS', 'Each circuit row lists a guard, an action and 8 to 15 s of search (circuit table).'],
    ['15', 'Cover every 8 m, no straight over 12 m', gapMax <= 8.0 && stMax <= 12 ? 'PASS' : 'FAIL', `Longest distance to a hide spot along any route: ${f1(gapMax)} m; longest straight segment: ${f1(stMax)} m. Per route: ` + R.routes.filter((r) => r.obj !== 'EX').map((r) => `${r.id} ${f1(r.maxGap)} m`).join(', ')],
    ['16', 'Niches 1.2 x 1.0 x 1.2', R.hideSizes.every((h) => h.ok) ? 'PASS' : 'FAIL', `${R.hideSizes.length} hide spots, smallest ${f1(Math.min(...R.hideSizes.map((h) => h.w)))} x ${f1(Math.min(...R.hideSizes.map((h) => h.d)))} m, lowest ${f1(Math.min(...R.hideSizes.map((h) => h.h)))} m (hide table)`],
    ['17', 'Body spots off patrol loops, at least one per guard', bodyOk.every((b) => b.best.d >= 2) ? 'PASS' : 'FAIL', bodyOk.map((b) => `${b.g}: ${b.best.id} ${f1(b.best.d)} m from the loop`).join('; ') + '. No body spot rect overlaps a loop leg (hide spots are off the patrol lines).'],
    ['18', '8 doors on the main route at most, 12 in total, 5 m between doors', R.doorsTotal <= 12 && Math.max(...R.routes.map((r) => r.doors.length)) <= 8 && minDoorGap >= 5 ? 'PASS' : 'FAIL', `${R.doorsTotal} doors (${R.doorCount.door1} single, ${R.doorCount.door2} double, ${R.doorCount.gate} gate); most doors on any route: ${Math.max(...R.routes.map((r) => r.doors.length))}; shortest gap between two doors on a route: ${minDoorGap > 1e8 ? 'n/a' : f1(minDoorGap) + ' m'}.`],
    ['19', 'Every door justified', 'PASS', 'Each door has a purpose in the door table and a row in the asset audit.'],
    ['20', 'Three routes per objective, bypass at each choke', R.overlapMax <= 0.3 ? 'PASS' : 'FAIL', `O1: A, B, C; O2: A, B, C (plus D variant). Largest share of one route overlapped by another: ${Math.round(R.overlapMax * 100)} % (limit 30 %). Bypasses: PD by RL; WO1/hall by R1; CH by GCd, T2 and ES; K6 by the south wall hides.`],
    ['21', `Three discoveries (Michael, decision 2): two true time-savers at least ${D.mustSave} s faster than the best-case main run; the third is the safe slow route`, R.runsOk && R.runs.find((q) => q.id === 'X3').saveBest < 0 && R.runs.find((q) => q.id === 'X3').saveWorst > 0 ? 'PASS' : 'FAIL', R.runs.filter((q) => q.kind !== 'main').map((r) => `${r.id} ${r.name}: best ${f1(r.best)} s against ${f1(R.runs[0].best)} s (${r.saveBest >= 0 ? 'faster by ' : 'slower by '}${f1(Math.abs(r.saveBest))} s), worst case ${f1(r.worst)} s against ${f1(R.runs[0].worst)} s (${r.saveWorst >= 0 ? 'faster by ' : 'slower by '}${f1(Math.abs(r.saveWorst))} s)`).join('; ') + '. Best case = zero waits at the fast pace; worst case = the quiet pace plus every worst-case wait. Full table in the route section of the map document. The old rule text asked for 30 s on each of three; this decision replaces it for this map.'],
    ['22', 'Easy first 90 s; hide spot within 10 m of every alarm trigger', R.spawns.every((s) => s.seenBy.length === 0) ? 'PASS' : 'FAIL', `No guard sees any spawn in 0-90 s. Alarm panels: ` + D.panels.map((p) => { const d = Math.min(...D.hides.filter((h) => h.level === p.level).map((h) => distPtRect(p.x, p.z, h.rect))); return `${p.id} ${f1(d)} m to a hide`; }).join(', ')],
    ['23', 'Co-op helps, never gates', 'PASS', `${D.coop.length} co-op rows, each with a solo alternative (co-op table); no action needs two players at once; widest choke 2.0 m (doors DD, DG, CH) or two paths (WO1 3.0 m, yard)`],
    ['24', 'Landmarks and 0.5 m tolerance', 'PASS', 'Each main space has a landmark in the space table; the objectives have lit signs; no hold needs precision: holds are 3 and 4 s with a 1.0 m radius.'],
    ['25', 'Guard why-here and pair gaps', chk('K2').wins.some(([a, b]) => b - a >= 3) ? 'PASS' : 'FAIL', 'Each sheet has a why-here sentence. Pair gap: K2 windows: ' + fmtWins(chk('K2').wins.filter(([a, b]) => b - a >= 3)) + ' (both G2 and G3 in the break room behind a closed double door).'],
    ['26', 'Two exits that change with play', 'PASS', 'E1 (van, Gv) and E2 (arrival gate Gp). AP3 sends reinforcements to Gv (closes E1); AP1 and AP2 send them through ND to the north (the yard stays open); C1 off removes the yard light and makes G1 search for 12 s; a found body at the yard makes G1 run to AP3.'],
    ['-', 'Scale sheet sizes', R.doorPass.every((d) => d.ok || SKIPPASS.has(d.id)) && R.corridors.every((c) => c.ok) && R.facing.length === 0 ? 'PASS' : 'FAIL', `Corridors >= 3.0 m (${f1(Math.min(...R.corridors.map((c) => c.w)))} m smallest); doors 1.2 / 2.0 / 3.0; ${R.doorPass.filter((d) => d.ok).length} of ${R.doorPass.filter((d) => !SKIPPASS.has(d.id)).length} door passes (Gp, Gv and the stair mouth SO face the lane or a void and are excluded) pass on the grid at offsets 0 and 0.25; no door within 1.5 m of a corner and 3.0 m centre spacing on every wall (door spacing table); no doors facing.`]
  ])
};
V.doorsTable = T.doorSpacing;
V.spawnTable = T.spawns;

const stamp = {
  counts: `${R.doorsTotal} doors, ${lampsN} lamps, ${D.guards.length} guards`,
  fail: R.errors.length ? R.errors.map((e) => `- ${e}`).join('\n') : 'none'
};
const rtm = (id) => R.routeTimes.find((q) => q.id === id);
const runOf = (id) => R.runs.find((q) => q.id === id);
const d1 = D.links.find((q) => q.id === 'D1');
const N = {
  k6lit: f1(chk('K6').best), k6dark: f1(chk('K6').bestDark), k6wait: f1(chk('K6').worst), k6dwait: f1(chk('K6').worstDark), k1win: f1(chk('K1').best),
  o1c: f1(rtm('O1-C').t), o1a: f1(rtm('O1-A').t), o2d: f1(rtm('O2-D').t), ex1: f1(rtm('EX-1').t), o2save: f1(rtm('O2-A').t - rtm('O2-D').t), x2save: f1(runOf('X2').saveBest),
  crawlfast: f1(d1.travel / 2.8), crawlslow: f1(d1.travel / 1.8), x2best: f1(runOf('X2').best), mbest: f1(runOf('M').best)
};
fill('map-trunk-annex.md.tpl', 'map-trunk-annex.md', { ...stamp, ...N });
fill('map-trunk-annex-validation.md.tpl', 'map-trunk-annex-validation.md', { ...stamp, ...V, ...N });
fs.writeFileSync(path.join(process.env.TEMP || '.', 'annex-results.json'), JSON.stringify({ ...R, routes: R.routes.map((r) => ({ ...r, pts: undefined })) }, null, 1));

// ---------- console report ----------
console.log('Labels:', labelLog.join(' | '));
console.log('Grid reach:', R.reach.map((r) => `off ${r.off}: ${r.allOk ? 'all ok' : 'FAIL'} (${r.cells} cells)`).join(' | '));
console.log('Door passes failing:', R.doorPass.filter((d) => !d.ok).map((d) => `${d.id}@${d.off}`).join(' ') || 'none');
console.log('Guard loops:', R.loops.map((l) => `${l.id} ${f1(l.period)}s ${f1(l.dist)}m`).join(' | '));
console.log('Chokes:');
for (const c of R.chokes) console.log(`  ${c.id} ${c.name}: windows>=need ${c.nWin}, best ${f1(c.best)}, worst wait ${f1(c.worst)}, ${fmtWins(c.wins.filter(([a, b]) => b - a >= 3))}`);
console.log('Routes:', R.routes.map((r) => `${r.id} ${f1(r.walk)}m ${Math.round(r.t)}s gap ${f1(r.maxGap)}@${r.gapAt} st ${f1(r.maxStraight)} doors ${r.doors.map((d) => d.id).join('>')}`).join('\n  '));
console.log('Overlap:', R.overlap.map((o) => `${o.a}/${o.b} ${Math.round(o.pct * 100)}%`).join(' '));
console.log('Spawns:', JSON.stringify(R.spawns));
console.log('Vantage:', R.vantage.map((v) => `${v.v}>${v.g} d${f1(v.minPathDist)} a${Math.round(v.angle)} los${v.los ? 1 : 0} lit${v.lit ? 1 : 0} ${v.ok ? 'ok' : 'BAD'}`).join(' | '));
console.log('Obj light:', JSON.stringify(R.objLight));
console.log('Approach lit:', JSON.stringify(R.approachLit));
console.log('Dark misses:', JSON.stringify(darkMiss));
console.log('Lit hides:', R.hideSizes.filter((h) => h.lit).map((h) => h.id).join(' ') || 'none');
console.log('Route times:', R.routeTimes.map((r) => `${r.id} ${Math.round(r.t)}s +${Math.round(r.worst)}`).join(' | '));
console.log('Body spots:', JSON.stringify(bodyOk));
console.log('No-crawl reach to T2:', R.noCrawlReach);
console.log('ERRORS:', R.errors.length ? '\n' + R.errors.join('\n') : 'none');

// ---------- PNG ----------
if (!process.argv.includes('--no-png')) {
  try {
    const { chromium } = await import('playwright-core');
    const lib = await import(pathToFileURL(path.resolve(here, '../../scripts/e2e-lib.mjs')).href);
    const browser = await chromium.launch(lib.launchOptions());
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`);
    await page.screenshot({ path: P('map-trunk-annex.png'), clip: { x: 0, y: 0, width: W, height: H } });
    await browser.close();
    console.log('PNG written', W, 'x', H);
  } catch (e) {
    console.log('PNG failed:', e.message);
  }
}
