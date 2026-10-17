// Dead Line G1: generates the greybox geometry for Mission 1 from the map design JSON (docs/design/map-dead-line.json).
// The JSON is the only source: nothing here places a wall, door, block or marker by hand. Output: src/world/maps/deadLine.geo.json,
// an ordered op list that `src/world/maps/deadLine.ts` replays into the LevelBuilder (boxes, stairs, ladders, doors, windows,
// ducts) plus the rooms, debug markers and teleport points.
//
//   node scripts/gen-dead-line.mjs           write the geometry
//   node scripts/gen-dead-line.mjs --check   fail if the committed geometry is not what the JSON generates (CI / tests)
//
// Conventions: units metres, x east, z north. A design `axis: 'z'` wall is the line z = at running along x; `axis: 'x'` is the
// line x = at running along z (the design's own naming, kept here). Wall thickness 0.2 centred where a space lies on both sides of
// the line, 0.3 on the outside where only one does (so interiors keep their design size). Slabs are 0.3 thick with the top at the
// level height. The slab / floor / holes follow `docs/design/scale-sheet.md` (stair rise 0.165, headroom 1.7, ladder 0.5 wide).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(here, '../docs/design/map-dead-line.json');
export const OUT = path.resolve(here, '../src/world/maps/deadLine.geo.json');

const SLAB = 0.3;
const T_IN = 0.1;
const T_EX = 0.3;
const DOOR_H = 2.1;
const SILL = 0.9;
const WIN_TOP = 2.1;
const RAIL = 1.0;
const DUCT_H = 1.3;
const GROUND_CAP = 3.3;
const COL = {
  B: { floor: '#46505a', wall: '#7b8794' },
  T: { floor: '#3f484f', wall: '#6d7782' },
  G: { floor: '#6f7477', wall: '#a9a496' },
  U: { floor: '#7d7a72', wall: '#b8b2a3' },
  R: { floor: '#8a8f94', wall: '#9aa0a5' },
};
const BLOCK = '#8a8478';
const RAILC = '#4d5560';
const STEEL = '#55606a';
const STAIR = '#9a948a';
const PLATE = '#444b52';
const MARK = {
  hide: '#2f6df0',
  vantage: '#f2d21b',
  objective: '#22c55e',
  panel: '#ef4444',
  switch: '#f59e0b',
  regroup: '#22d3ee',
  spawn: '#f8fafc',
  extract: '#e11d9c',
};

const r4 = (n) => Math.round(n * 1e4) / 1e4;
const eq = (a, b) => Math.abs(a - b) < 1e-6;
const inRect = (r, x, z, m = 0) => x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m;
const rectsOverlap = (a, b) => a[0] < b[2] - 1e-6 && a[2] > b[0] + 1e-6 && a[1] < b[3] - 1e-6 && a[3] > b[1] + 1e-6;

export function generate(D) {
  const Y = Object.fromEntries(D.meta.levels.map((l) => [l.id, l.y]));
  const spaceById = Object.fromEntries(D.spaces.map((s) => [s.id, s]));
  const NOGRID = new Set(['duct', 'ledge', 'void']);
  const gridded = D.spaces.filter((s) => !NOGRID.has(s.kind));
  const ops = [];
  const notes = [];
  const note = (s) => notes.push(s);
  const stats = { boxes: 0 };
  const flag = (op, f) => {
    if (f) op.f = f;
    return op;
  };

  // ---- op recorders --------------------------------------------------------------------------------------------------------
  const box = (cx, cy, cz, sx, sy, sz, color, o = {}) => {
    if (sx < 1e-6 || sy < 1e-6 || sz < 1e-6) return;
    const op = { t: 'box', c: [r4(cx), r4(cy), r4(cz)], s: [r4(sx), r4(sy), r4(sz)], k: color };
    if (o.yaw) op.yaw = r4(o.yaw);
    if (o.pitch) op.pitch = r4(o.pitch);
    if (o.collide === false) op.collide = false;
    if (o.visible === false) op.visible = false;
    if (o.tag) op.tag = o.tag;
    ops.push(flag(op, o.f));
    stats.boxes++;
  };
  /** Solid box over a plan rectangle [x0, z0, x1, z1] from y0 to y1. */
  const solid = (x0, z0, x1, z1, y0, y1, color, o = {}) => box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, o);
  const op = (o) => ops.push(o);

  // ---- 1. holes in the slabs (from the links and the well blocks) ----------------------------------------------------------------
  const holes = { B: [], T: [], G: [], U: [], R: [] };
  const wells = [];
  for (const b of D.blocks) if (b.kind === 'rail' && /well/i.test(b.label)) wells.push(b);
  const link = (id) => D.links.find((l) => l.id === id);
  const blockById = (id) => D.blocks.find((b) => b.id === id);
  const lvOf = (pt) => pt[0];

  // stairs: the hole is the well block (SB: the G well, S1: the U well), both covering the full stair plan
  const stairLinks = D.links.filter((l) => l.kind === 'stairs-open');
  const stairPlans = [];
  for (const l of stairLinks) {
    const a = l.a;
    const b = l.b;
    const lower = Y[a[0]] < Y[b[0]] ? a : b;
    const upper = lower === a ? b : a;
    const rise = Y[upper[0]] - Y[lower[0]];
    const m = /(\d+) risers/.exec(l.note ?? '');
    const risers = m ? +m[1] : Math.round(rise / 0.165);
    const tm = /0\.165 x (0\.\d+)/.exec(l.note ?? '');
    const landM = /landing (\d+(\.\d+)?)/.exec(l.note ?? '');
    const landing = landM ? +landM[1] : 2.0;
    const widthM = /(\d+(\.\d+)?) wide/.exec(l.note ?? '');
    const width = widthM ? +widthM[1] : 2.4;
    const well = wells.find((w) => w.level === (l.id === 'SB' ? upper[0] : upper[0]) && inRect(w.rect, upper[1], upper[2], 8) && Math.abs(Y[w.level] - Y[upper[0]]) < 1e-6);
    // a body block named like the link (S1BODY) is the plan of the flights
    const body = D.blocks.find((bk) => bk.id === `${l.id}BODY`);
    const dx = upper[1] - lower[1];
    const dz = upper[2] - lower[2];
    const alongX = Math.abs(dx) > Math.abs(dz);
    const dirSign = Math.sign(alongX ? dx : dz) || 1;
    const perp = alongX ? lower[2] : lower[1];
    let top;
    let tread;
    if (body) {
      // top of the last flight = the body's far end; the run is the body length
      const r = body.rect;
      const lo = alongX ? r[0] : r[1];
      const hi = alongX ? r[2] : r[3];
      top = dirSign > 0 ? hi : lo;
      tread = ((hi - lo) - landing) / risers;
    } else {
      tread = tm ? +tm[1] : 0.285;
      top = alongX ? upper[1] : upper[2];
    }
    const flight = (risers / 2) * tread;
    const run = 2 * flight + landing;
    const start = top - dirSign * run;
    const sp0 = { rise, risers, flight, landing, run };
    stairPlans.push({ id: l.id, lower, upper, rise, risers, tread, landing, width, alongX, dirSign, perp, start, top, flight, run, well, body, lowerLv: lower[0], upperLv: upper[0] });
    if (well) {
      // the hole covers the full stair plan the player can stand under (scale sheet 4): the well rect, widened along the run to where the
      // treads are at least CLEAR m under the slab and to the top step
      const CLEAR = 2.0;
      const slabBottom = Y[upper[0]] - SLAB;
      const hole = well.rect.slice();
      const treadY = (s) => {
        const per = sp0.risers / 2;
        const rh = sp0.rise / sp0.risers;
        if (s <= sp0.flight) return Y[lower[0]] + (s / sp0.flight) * per * rh;
        if (s <= sp0.flight + sp0.landing) return Y[lower[0]] + per * rh;
        return Y[lower[0]] + per * rh + ((s - sp0.flight - sp0.landing) / sp0.flight) * per * rh;
      };
      let sh = 0;
      while (sh < sp0.run && treadY(sh) <= slabBottom - CLEAR) sh += 0.05;
      const holeStart = start + dirSign * sh;
      const lo = alongX ? 0 : 1;
      const hi = alongX ? 2 : 3;
      const a = Math.min(holeStart, top);
      const e = Math.max(holeStart, top);
      if (a < hole[lo] - 0.01 || e > hole[hi] + 0.01) note(`${l.id}: the hole is ${(hole[lo] - Math.min(a, hole[lo])).toFixed(2)} m wider at the low end and ${(Math.max(e, hole[hi]) - hole[hi]).toFixed(2)} m at the high end than the well block ${well.id}, so a standing player clears the slab by ${CLEAR} m on the stair`);
      hole[lo] = Math.min(hole[lo], a);
      hole[hi] = Math.max(hole[hi], e);
      holes[well.level].push({ rect: hole, tag: `well:${well.id}` });
      well.hole = hole;
    } else note(`${l.id}: no well block found for the slab hole`);
  }

  // drop links: CK (chute) a hole in the upper slab at the landing; ES the closet rect in the roof and the Test room floor
  const drops = D.links.filter((l) => l.kind === 'drop');
  const dropPlans = [];
  for (const l of drops) {
    const hollow = D.blocks.find((bk) => /hollow/i.test(bk.label) && inRect(bk.rect, l.a[1], l.a[2], 1.5));
    const upper = Y[l.a[0]] > Y[l.b[0]] ? l.a : l.b;
    const lower = upper === l.a ? l.b : l.a;
    let rect;
    if (hollow) rect = hollow.rect.slice();
    else rect = [lower[1] - 0.75, lower[2] - 0.75, lower[1] + 0.75, lower[2] + 0.75];
    dropPlans.push({ id: l.id, upper, lower, rect, hollow });
    // every slab between the upper and the lower floor gets the hole
    for (const lv of ['G', 'U', 'R']) if (Y[lv] <= Y[upper[0]] + 1e-6 && Y[lv] > Y[lower[0]] + 1e-6) holes[lv].push({ rect: rect.slice(), tag: `drop:${l.id}` });
  }

  // crawl links that run under a floor (the T level): tunnel from the T space, a pit at each end, vents and ladders
  const crawls = D.links.filter((l) => l.kind === 'crawl');

  // ---- 2. extra wall gaps derived from the links (ladder tops on a parapet, the beam, a duct through a wall) ------------------------
  const extraGaps = [];

  // ---- 3. floor slabs ------------------------------------------------------------------------------------------------------------
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
  // merge a row of tiles with the same z span into long boxes (fewer boxes)
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
  const slab = (r, top, hs, color, tag, thick = SLAB) => {
    for (const t of mergeTiles(slabTiles(r, hs))) solid(t[0], t[1], t[2], t[3], top - thick, top, color, { tag });
  };

  // the T level: tunnels under the G floor; the G slab loses the tunnel footprint (a thin grille plate closes it)
  const tunnels = [];
  for (const s of D.spaces.filter((q) => q.level === 'T')) {
    const lk = crawls.find((l) => {
      const p = l.path ?? [];
      return p.length >= 2 && p.every(([x, z]) => inRect(s.rect, x, z, 2.5));
    });
    if (!lk) {
      note(`${s.id}: no crawl link runs through this T space`);
      continue;
    }
    const p0 = lk.path[0];
    const p1 = lk.path[lk.path.length - 1];
    const alongX = Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]);
    const dir = alongX ? Math.sign(p1[0] - p0[0]) : Math.sign(p1[1] - p0[1]);
    const w = alongX ? s.rect[3] - s.rect[1] : s.rect[2] - s.rect[0];
    const mid = alongX ? (s.rect[1] + s.rect[3]) / 2 : (s.rect[0] + s.rect[2]) / 2;
    // footprint: the space rect united with the link path (the path may run past the rect: the mouths)
    const lo = Math.min(alongX ? s.rect[0] : s.rect[1], alongX ? p0[0] : p0[1], alongX ? p1[0] : p1[1]);
    const hi = Math.max(alongX ? s.rect[2] : s.rect[3], alongX ? p0[0] : p0[1], alongX ? p1[0] : p1[1]);
    const rect = alongX ? [lo, mid - w / 2, hi, mid + w / 2] : [mid - w / 2, lo, mid + w / 2, hi];
    tunnels.push({ space: s, link: lk, rect, alongX, dir, mid, w, lo, hi, p0, p1, y: Y.T, h: s.wallH });
    holes.G.push({ rect: rect.slice(), tag: `tunnel:${s.id}` });
  }

  // floors: every space except the duct / void kinds gets a slab with its holes
  for (const s of D.spaces) {
    if (s.kind === 'duct' || s.kind === 'void') continue;
    const c = COL[s.level];
    slab(s.rect, Y[s.level], holes[s.level].map((h) => h.rect), c.floor, `floor:${s.id}`);
  }
  // the lane south of the yard (gates Gp and Gv open onto it): the footprint strip between the footprint edge and the yard
  {
    const fp = D.meta.footprint;
    const yard = spaceById.yard;
    const lane = [fp.x[0], fp.z[0], fp.x[1], yard.rect[1]];
    slab(lane, Y.G, [], COL.G.floor, 'floor:lane');
    note('lane: the strip of the footprint south of the yard (the JSON names the lane in the gate openings but gives it no space); a floor so the gates open onto something');
  }
  // the T tunnels: floor, side walls, grille plate with a pit at each end
  const PIT = 1.4;
  for (const t of tunnels) {
    const [x0, z0, x1, z1] = t.rect;
    solid(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, t.y - SLAB, t.y, COL.T.floor, { tag: `floor:${t.space.id}` });
    // side walls from the floor to the grille underside, thickness outside the footprint
    if (t.alongX) {
      solid(x0 - 0.2, z0 - 0.2, x1 + 0.2, z0, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
      solid(x0 - 0.2, z1, x1 + 0.2, z1 + 0.2, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
      solid(x0 - 0.2, z0, x0, z1, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
      solid(x1, z0, x1 + 0.2, z1, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
    } else {
      solid(x0 - 0.2, z0 - 0.2, x0, z1 + 0.2, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
      solid(x1, z0 - 0.2, x1 + 0.2, z1 + 0.2, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
      solid(x0, z0 - 0.2, x1, z0, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
      solid(x0, z1, x1, z1 + 0.2, t.y, 0, COL.T.wall, { tag: `wall:T:${t.space.id}` });
    }
    // the grille plate over the footprint (walkable, 0.1 thick) minus a pit at each end of the link path
    const pitRect = (end, sgn) => {
      const a = t.alongX ? end[0] : end[1];
      const from = a;
      const to = a + sgn * PIT;
      const lo2 = Math.min(from, to);
      const hi2 = Math.max(from, to);
      return t.alongX ? [lo2, z0, hi2, z1] : [x0, lo2, x1, hi2];
    };
    t.pitA = pitRect(t.p0, t.dir);
    t.pitB = pitRect(t.p1, -t.dir);
    slab(t.rect, 0, [t.pitA, t.pitB], COL.G.floor, `plate:${t.space.id}`, 0.1);
  }

  // ceilings: spaces that have no floor above them need a roof (a ceiling slab under the wall top)
  const slot = (() => {
    const rs = D.spaces.filter((s) => s.level === 'R').sort((a, b) => a.rect[0] - b.rect[0]);
    for (let i = 0; i + 1 < rs.length; i++) {
      const a = rs[i].rect;
      const b = rs[i + 1].rect;
      if (b[0] > a[2] + 1e-6 && eq(a[1], b[1]) && eq(a[3], b[3])) return [a[2], a[1], b[0], a[3]];
    }
    return null;
  })();
  const above = { B: ['G'], G: ['U', 'R'], U: ['R'] };
  for (const s of gridded) {
    if (s.level === 'R' || s.kind === 'outdoor') continue;
    const lvAbove = above[s.level] ?? [];
    const covers = D.spaces.filter((q) => lvAbove.includes(q.level) && q.kind !== 'ledge' && q.kind !== 'duct' && q.kind !== 'void').map((q) => q.rect);
    if (s.level === 'U' && slot) covers.push(slot);
    // a tall ground space (the hall) is roofed by the roof deck over it
    const tall = s.level === 'G' && s.wallH > GROUND_CAP;
    const topY = Y[s.level] + (s.level === 'G' ? Math.min(s.wallH, GROUND_CAP) : s.wallH);
    if (s.level === 'B') {
      // the ceiling is the G slab; a space lower than the storey gets a filler under it
      const floorAbove = Y.G - SLAB;
      if (Y.B + s.wallH < floorAbove - 1e-6) {
        const hs = [...holes.G.map((h) => h.rect), ...holes.B.map((h) => h.rect)];
        for (const t of mergeTiles(slabTiles(s.rect, hs))) solid(t[0], t[1], t[2], t[3], Y.B + s.wallH, floorAbove, COL.B.floor, { tag: `ceil:${s.id}` });
      }
      continue;
    }
    if (tall) continue;
    // tiles of this space not under a floor above
    const tiles = slabTiles(s.rect, covers).filter((t) => !holes[s.level].some((h) => rectsOverlap(h.rect, t)));
    for (const t of mergeTiles(tiles)) solid(t[0], t[1], t[2], t[3], topY - SLAB, topY, COL[s.level].floor, { tag: `ceil:${s.id}` });
  }

  // ---- 4. walls ------------------------------------------------------------------------------------------------------------------
  const wallHeight = (s) => (s.kind === 'outdoor' ? 3.7 : s.level === 'G' ? Math.min(s.wallH, GROUND_CAP) : s.wallH);
  const insideAny = (lv, x, z) => D.spaces.some((s) => s.level === lv && s.kind !== 'duct' && s.kind !== 'void' && inRect(s.rect, x, z, 1e-6));
  const wallBoxes = [];
  const wallBox = (lv, axis, at, off, t, s0, s1, y0, y1, tag) => {
    if (s1 - s0 < 1e-6 || y1 - y0 < 1e-6) return;
    const color = COL[lv].wall;
    if (axis === 'z') box((s0 + s1) / 2, (y0 + y1) / 2, at + off, s1 - s0, y1 - y0, t, color, { tag });
    else box(at + off, (y0 + y1) / 2, (s0 + s1) / 2, t, y1 - y0, s1 - s0, color, { tag });
    wallBoxes.push({ lv, axis, at, off, t, s0, s1, y0, y1 });
  };
  const openingsOn = (lv, axis, at) => [
    // (a `void` opening, the skylight slot, is the gap between two roof decks: the parapets on both edges stand)
    ...D.openings.filter((o) => o.level === lv && o.axis === axis && eq(o.at, at) && o.type !== 'void'),
    ...extraGaps.filter((o) => o.level === lv && o.axis === axis && eq(o.at, at)),
  ];

  // a window that overlaps a door or an opening on the same wall gives way to it (the design's own sight / move model cuts the door range)
  const solidTypes = new Set(['door1', 'door2', 'gate', 'wide', 'open']);
  const effRange = (o) => {
    let a = o.c - o.w / 2;
    let e = o.c + o.w / 2;
    if (o.type !== 'window') return [a, e];
    for (const q of D.openings) {
      if (q === o || q.level !== o.level || q.axis !== o.axis || !eq(q.at, o.at) || !solidTypes.has(q.type)) continue;
      const qa = q.c - q.w / 2;
      const qe = q.c + q.w / 2;
      if (qa < e && qe > a) {
        if (qa <= a + 1e-6 && qe >= e - 1e-6) return null;
        if (qa > a) e = Math.min(e, qa);
        else a = Math.max(a, qe);
      }
    }
    return e > a + 1e-6 ? [a, e] : null;
  };
  const walledRuns = [];
  for (const lv of ['B', 'G', 'U', 'R']) {
    const sp = gridded.filter((s) => s.level === lv);
    const lines = new Map();
    for (const s of sp) {
      const [x0, z0, x1, z1] = s.rect;
      const h = wallHeight(s);
      const outdoor = s.kind === 'outdoor';
      for (const e of [
        { axis: 'z', at: z0, a: x0, b: x1 },
        { axis: 'z', at: z1, a: x0, b: x1 },
        { axis: 'x', at: x0, a: z0, b: z1 },
        { axis: 'x', at: x1, a: z0, b: z1 },
      ]) {
        const k = `${e.axis}|${e.at}`;
        if (!lines.has(k)) lines.set(k, []);
        lines.get(k).push({ ...e, h, outdoor });
      }
    }
    for (const [k, edges] of lines) {
      const [axis, atS] = k.split('|');
      const at = +atS;
      const pts = [...new Set(edges.flatMap((e) => [e.a, e.b]))].sort((p, q) => p - q);
      const runs = [];
      for (let i = 0; i + 1 < pts.length; i++) {
        const p = pts[i];
        const q = pts[i + 1];
        const cov = edges.filter((e) => e.a <= p + 1e-6 && e.b >= q - 1e-6);
        if (!cov.length) continue;
        const indoor = cov.filter((e) => !e.outdoor);
        const h = Math.max(...(indoor.length ? indoor : cov).map((e) => e.h));
        const mm = (p + q) / 2;
        const sideP = axis === 'z' ? insideAny(lv, mm, at + 0.15) : insideAny(lv, at + 0.15, mm);
        const sideN = axis === 'z' ? insideAny(lv, mm, at - 0.15) : insideAny(lv, at - 0.15, mm);
        let t = T_IN;
        let off = 0;
        if (sideP && sideN) {
          t = T_IN;
          off = 0;
        } else if (sideP) {
          t = T_EX;
          off = -t / 2;
        } else {
          t = T_EX;
          off = t / 2;
        }
        const last = runs[runs.length - 1];
        if (last && eq(last.q, p) && eq(last.h, h) && eq(last.t, t) && eq(last.off, off)) last.q = q;
        else runs.push({ p, q, h, t, off });
      }
      for (const r of runs) walledRuns.push({ lv, axis, at, ...r });
    }
  }

  const emitWalls = () => {
  for (const r of walledRuns) {
    const { lv, axis, at, p, q, h, t, off } = r;
    const y0 = Y[lv];
    const gaps = openingsOn(lv, axis, at)
      .map((o) => {
        const r = o.id && o.type ? effRange(o) : [o.c - o.w / 2, o.c + o.w / 2];
        return r ? { o, g0: Math.max(p, r[0]), g1: Math.min(q, r[1]) } : { o, g0: 0, g1: 0 };
      })
      .filter((g) => g.g1 > g.g0 + 1e-6)
      .sort((a, b) => a.g0 - b.g0);
    const ext = t / 2;
    let cur = p;
    const tag = `wall:${lv}:${axis}:${at}`;
    const put = (a, b, ya, yb, extA, extB) => wallBox(lv, axis, at, off, t, a - (extA ? ext : 0), b + (extB ? ext : 0), ya, yb, tag);
    let first = true;
    for (const g of gaps) {
      if (g.g0 > cur + 1e-6) put(cur, g.g0, y0, y0 + h, first, false);
      first = false;
      const type = g.o.type;
      const gw = [g.g0, g.g1];
      if (type === 'door1' || type === 'door2' || type === 'gate' || type === 'wide') {
        if (h > DOOR_H + 0.05) put(gw[0], gw[1], y0 + DOOR_H, y0 + h, false, false);
      } else if (type === 'open') {
        // an arch: nothing above
      } else if (type === 'duct') {
        if (h > DUCT_H + 0.05) put(gw[0], gw[1], y0 + DUCT_H, y0 + h, false, false);
      } else if (type === 'window') {
        put(gw[0], gw[1], y0, y0 + SILL, false, false);
        if (h > WIN_TOP + 0.05) put(gw[0], gw[1], y0 + WIN_TOP, y0 + h, false, false);
      } else if (type === 'rail') {
        put(gw[0], gw[1], y0, y0 + Math.min(RAIL, h), false, false);
      } else {
        // sealed, void: the wall stands
        put(gw[0], gw[1], y0, y0 + h, false, false);
      }
      cur = g.g1;
    }
    if (q > cur + 1e-6) put(cur, q, y0, y0 + h, first, true);
  }
  };

  // doors and windows (anchors), once per opening
  const openingLevelY = (o) => Y[o.level];
  const wallOffsetFor = (o) => {
    const run = walledRuns.find((r) => r.lv === o.level && r.axis === o.axis && eq(r.at, o.at) && r.p <= o.c + 1e-6 && r.q >= o.c - 1e-6);
    return run ? run.off : 0;
  };
  for (const o of D.openings) {
    const y0 = openingLevelY(o);
    const off = wallOffsetFor(o);
    const g0 = o.c - o.w / 2;
    if (o.type === 'door1' || o.type === 'door2' || o.type === 'gate') {
      // hinge at the gap start; G1 builds every door unlocked (no objective logic yet); the design's lock stays in the JSON
      if (o.axis === 'z') op({ t: 'door', x: r4(g0), y: y0, z: r4(o.at + off), w: o.w, yaw: r4(Math.PI / 2), id: o.id });
      else op({ t: 'door', x: r4(o.at + off), y: y0, z: r4(g0), w: o.w, yaw: 0, id: o.id });
    } else if (o.type === 'window') {
      const er = effRange(o);
      if (!er) continue;
      const ww = er[1] - er[0];
      const panes = Math.max(1, Math.ceil(ww / 3));
      const pw = ww / panes;
      for (let i = 0; i < panes; i++) {
        const c = er[0] + pw * (i + 0.5);
        const cy = y0 + (SILL + WIN_TOP) / 2;
        if (o.axis === 'z') op({ t: 'window', c: [r4(c), r4(cy), r4(o.at + off)], w: r4(pw), h: WIN_TOP - SILL, yaw: 0, sill: SILL, id: o.id });
        else op({ t: 'window', c: [r4(o.at + off), r4(cy), r4(c)], w: r4(pw), h: WIN_TOP - SILL, yaw: r4(Math.PI / 2), sill: SILL, id: o.id });
      }
    }
  }

  // ---- 5. blocks -----------------------------------------------------------------------------------------------------------------
  // fences above a window rail in a rack line (the cage windows: sight passes above 1.0 m, nothing else does)
  const windowRailAbove = (bk) => {
    const nb = D.blocks.filter((o) => o !== bk && o.level === bk.level && o.kind !== 'rail' && o.h > bk.h + 0.01 && (Math.abs(o.rect[2] - bk.rect[0]) < 0.05 || Math.abs(o.rect[0] - bk.rect[2]) < 0.05) && o.rect[1] < bk.rect[3] && o.rect[3] > bk.rect[1]);
    return nb.length ? Math.max(...nb.map((o) => o.h)) : null;
  };
  const skipBlocks = new Set();
  for (const sp of stairPlans) if (sp.body) skipBlocks.add(sp.body.id);
  for (const w of wells) skipBlocks.add(w.id);
  for (const dp of dropPlans) if (dp.hollow) skipBlocks.add(dp.hollow.id);
  for (const bk of D.blocks) {
    if (skipBlocks.has(bk.id)) continue;
    const y0 = Y[bk.level];
    solid(bk.rect[0], bk.rect[1], bk.rect[2], bk.rect[3], y0, y0 + bk.h, BLOCK, { tag: `block:${bk.id}` });
    if (bk.kind === 'rail') {
      const hi = windowRailAbove(bk);
      if (hi) {
        const alongX = bk.rect[2] - bk.rect[0] >= bk.rect[3] - bk.rect[1];
        const hgt = hi - bk.h;
        if (alongX) op({ t: 'fence', a: [r4(bk.rect[0]), r4((bk.rect[1] + bk.rect[3]) / 2)], b: [r4(bk.rect[2]), r4((bk.rect[1] + bk.rect[3]) / 2)], h: r4(hgt), y: r4(y0 + bk.h) });
        else op({ t: 'fence', a: [r4((bk.rect[0] + bk.rect[2]) / 2), r4(bk.rect[1])], b: [r4((bk.rect[0] + bk.rect[2]) / 2), r4(bk.rect[3])], h: r4(hgt), y: r4(y0 + bk.h) });
      }
    }
  }

  // the roof parapet is a wall (above); the beam gets a gap in each slot-edge parapet (derived below)

  // ---- 6. stairs and their rails -------------------------------------------------------------------------------------------------
  for (const sp of stairPlans) {
    const yLow = Y[sp.lowerLv];
    const half = sp.risers / 2;
    const sh = sp.rise / sp.risers;
    const f1 = sp.start + sp.dirSign * sp.flight / 2; // centre of flight 1 along the run
    const ld = sp.start + sp.dirSign * (sp.flight + sp.landing / 2);
    const f2 = sp.start + sp.dirSign * (sp.flight + sp.landing + sp.flight / 2);
    const yaw = sp.alongX ? (sp.dirSign > 0 ? Math.PI / 2 : -Math.PI / 2) : sp.dirSign > 0 ? 0 : Math.PI;
    const at = (c) => (sp.alongX ? [c, sp.perp] : [sp.perp, c]);
    const [x1, z1] = at(f1);
    const [xl, zl] = at(ld);
    const [x2, z2] = at(f2);
    const tagId = `stairs:${sp.id}`;
    op({ t: 'stairs', x: r4(x1), z: r4(z1), w: sp.width, len: r4(sp.flight), rise: r4(sh * half), steps: half, k: STAIR, yaw: r4(yaw), y: r4(yLow), id: tagId, f: 'noLedge' });
    // the landing: a solid block under the mid landing
    const lw = sp.alongX ? sp.landing : sp.width;
    const ld2 = sp.alongX ? sp.width : sp.landing;
    box(xl, yLow + (sh * half) / 2, zl, lw, sh * half, ld2, STAIR, { tag: tagId, f: 'noLedge' });
    op({ t: 'stairs', x: r4(x2), z: r4(z2), w: sp.width, len: r4(sp.flight), rise: r4(sh * half), steps: half, k: STAIR, yaw: r4(yaw), y: r4(yLow + sh * half), id: tagId, f: 'noLedge' });
    // rails round the well on the upper floor (the three sides that are not the exit)
    if (sp.well) {
      const r = sp.well.hole ?? sp.well.rect;
      const yU = Y[sp.well.level];
      const RT = 0.1;
      const exitEdge = sp.alongX ? (sp.dirSign > 0 ? 'x1' : 'x0') : sp.dirSign > 0 ? 'z1' : 'z0';
      const edges = {
        x0: [r[0] - RT, r[1], r[0], r[3]],
        x1: [r[2], r[1], r[2] + RT, r[3]],
        z0: [r[0], r[1] - RT, r[2], r[1]],
        z1: [r[0], r[3], r[2], r[3] + RT],
      };
      for (const [e, rr] of Object.entries(edges)) {
        if (e === exitEdge) continue;
        solid(rr[0], rr[1], rr[2], rr[3], yU, yU + RAIL, RAILC, { tag: `rail:${sp.well.id}` });
      }
    }
  }

  // ---- 7. ladders ------------------------------------------------------------------------------------------------------------------
  const wallRay = (lv, x, z, fx, fz) => {
    // first wall of the level along (fx, fz) from (x, z): distance to its near face
    let best = Infinity;
    for (const w of walledRuns) {
      if (w.lv !== lv) continue;
      const half = w.t / 2;
      const c = w.at + w.off;
      if (w.axis === 'z') {
        if (Math.abs(fz) < 1e-9) continue;
        const dd = (c - Math.sign(fz) * half - z) / fz;
        if (dd < 0) continue;
        const px = x + fx * dd;
        if (px < w.p - 0.01 || px > w.q + 0.01) continue;
        best = Math.min(best, dd);
      } else {
        if (Math.abs(fx) < 1e-9) continue;
        const dd = (c - Math.sign(fx) * half - x) / fx;
        if (dd < 0) continue;
        const pz = z + fz * dd;
        if (pz < w.p - 0.01 || pz > w.q + 0.01) continue;
        best = Math.min(best, dd);
      }
    }
    return best;
  };
  const ladderPlans = [];
  for (const l of D.links.filter((q) => q.kind === 'ladder')) {
    const lower = Y[l.a[0]] < Y[l.b[0]] ? l.a : l.b;
    const upper = lower === l.a ? l.b : l.a;
    const off = Math.hypot(upper[1] - lower[1], upper[2] - lower[2]);
    let fx;
    let fz;
    let x = lower[1];
    let z = lower[2];
    const lvLow = lower[0];
    if (off > 1.0) {
      // an offset ladder (the hatch H, the roof ladder RL): faces from the lower point towards the upper point, set against the first wall on the way
      const dx = upper[1] - lower[1];
      const dz = upper[2] - lower[2];
      if (Math.abs(dx) > Math.abs(dz)) {
        fx = Math.sign(dx);
        fz = 0;
      } else {
        fx = 0;
        fz = Math.sign(dz);
      }
      const d = wallRay(lvLow, x, z, fx, fz);
      // an exterior ladder on the roof's outside (RL): the wall is the facade of the building at the upper end
      let dist = d;
      if (!Number.isFinite(dist)) dist = Math.hypot(dx, dz);
      x += fx * (dist - 0.05);
      z += fz * (dist - 0.05);
    } else {
      // a hatch ladder: faces the nearest wall of the lower space
      const sp = D.spaces.filter((s) => s.level === lvLow && inRect(s.rect, x, z, 1e-6)).sort((a, b) => (a.rect[2] - a.rect[0]) * (a.rect[3] - a.rect[1]) - (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]))[0];
      const r = sp ? sp.rect : [x - 5, z - 5, x + 5, z + 5];
      const cand = [
        [1, 0, r[2] - x],
        [-1, 0, x - r[0]],
        [0, 1, r[3] - z],
        [0, -1, z - r[1]],
      ].sort((a, b) => a[2] - b[2]);
      // the exit (0.45 ahead) must land on the upper floor: prefer the nearest wall whose exit point is in a space of the upper level
      const upperSpaces = D.spaces.filter((s) => s.level === upper[0] && s.kind !== 'void');
      const pick = cand.find((c) => upperSpaces.some((s) => inRect(s.rect, x + c[0] * 0.45, z + c[1] * 0.45))) ?? cand[0];
      fx = pick[0];
      fz = pick[1];
    }
    const facing = Math.atan2(fx, fz);
    ladderPlans.push({ id: l.id, x, z, y0: Y[lower[0]], y1: Y[upper[0]], facing, fx, fz, lowerLv: lower[0], upperLv: upper[0] });
    op({ t: 'ladder', x: r4(x), z: r4(z), y0: Y[lower[0]], y1: Y[upper[0]], facing: r4(facing), id: l.id });
    // a backing plate behind the rungs so it reads as a ladder on a wall (visual only)
    const h = Y[upper[0]] - Y[lower[0]];
    box(x + fx * 0.12, Y[lower[0]] + h / 2, z + fz * 0.12, Math.abs(fz) > 0 ? 0.7 : 0.04, h, Math.abs(fx) > 0 ? 0.7 : 0.04, PLATE, { collide: false, tag: `ladder:${l.id}` });
    // the roof ladder arrives over a parapet: a gap in it
    if (upper[0] === 'R') {
      const lv = 'R';
      for (const r of walledRuns.filter((q) => q.lv === lv && q.h <= 1.0)) {
        const cx = x + fx * 0.3;
        const cz = z + fz * 0.3;
        const onLine = r.axis === 'z' ? Math.abs(cz - r.at) < 0.6 && cx >= r.p && cx <= r.q : Math.abs(cx - r.at) < 0.6 && cz >= r.p && cz <= r.q;
        if (onLine) extraGaps.push({ id: `gap:${l.id}`, type: 'open', level: lv, axis: r.axis, at: r.at, c: r.axis === 'z' ? cx : cz, w: 1.2 });
      }
    }
  }

  // ---- 8. the beam ------------------------------------------------------------------------------------------------------------------
  for (const l of D.links.filter((q) => q.kind === 'beam')) {
    const [lv, ax, az] = l.a;
    const bx = l.b[1];
    const bz = l.b[2];
    const w = +(/(0\.\d+) wide/.exec(l.note ?? '')?.[1] ?? 0.6);
    const yb = Y[lv];
    const along = Math.abs(bx - ax) >= Math.abs(bz - az);
    // spans the gap between the two roof decks: from one deck edge to the other (the slot), thickness under the deck surface
    const x0 = Math.min(ax, bx);
    const x1 = Math.max(ax, bx);
    if (along) solid(x0, az - w / 2, x1, az + w / 2, yb - 0.25, yb, STEEL, { tag: `beam:${l.id}` });
    else solid(ax - w / 2, Math.min(az, bz), ax + w / 2, Math.max(az, bz), yb - 0.25, yb, STEEL, { tag: `beam:${l.id}` });
    // a gap in each parapet it crosses
    for (const r of walledRuns.filter((q) => q.lv === lv && q.h <= 1.0 && q.axis === 'x')) {
      if (r.at >= x0 - 0.01 && r.at <= x1 + 0.01 && az >= r.p && az <= r.q) extraGaps.push({ id: `gap:${l.id}`, type: 'open', level: lv, axis: 'x', at: r.at, c: az, w: w + 0.8 });
    }
  }

  // ---- 9. drops: the ES closet (hollow walls round the hole) ---------------------------------------------------------------------------
  for (const dp of dropPlans) {
    if (!dp.hollow) continue;
    const r = dp.rect;
    const lvU = dp.hollow.level;
    const y0 = Y[lvU];
    const top = Y.R - SLAB;
    const t = 0.15;
    // four thin walls round the hole from the floor to the roof underside (the closet)
    solid(r[0] - t, r[1] - t, r[2] + t, r[1], y0, top, COL[lvU].wall, { tag: `closet:${dp.id}` });
    solid(r[0] - t, r[3], r[2] + t, r[3] + t, y0, top, COL[lvU].wall, { tag: `closet:${dp.id}` });
    solid(r[0] - t, r[1], r[0], r[3], y0, top, COL[lvU].wall, { tag: `closet:${dp.id}` });
    solid(r[2], r[1], r[2] + t, r[3], y0, top, COL[lvU].wall, { tag: `closet:${dp.id}` });
  }

  // ---- 10. the ledge, the vent duct, the T tunnels -------------------------------------------------------------------------------------
  for (const s of D.spaces.filter((q) => q.kind === 'ledge')) {
    // a lip along the outer edge (the design's wall height for the ledge, 1.0 m), away from the building
    const y0 = Y[s.level];
    const horiz = s.rect[2] - s.rect[0] >= s.rect[3] - s.rect[1];
    const bldg = D.spaces.find((q) => q.level === s.level && q.kind !== 'ledge' && q.kind !== 'duct' && q.kind !== 'void' && (horiz ? (eq(q.rect[3], s.rect[1]) || eq(q.rect[1], s.rect[3])) && q.rect[0] <= s.rect[0] + 1e-6 : false));
    const northSide = bldg ? eq(bldg.rect[1], s.rect[3]) : false;
    if (horiz) {
      const z = northSide ? s.rect[1] : s.rect[3];
      const dz = northSide ? -0.2 : 0.2;
      solid(s.rect[0], Math.min(z, z + dz), s.rect[2], Math.max(z, z + dz), y0, y0 + s.wallH, COL[s.level].wall, { tag: `lip:${s.id}`, f: 'noLedge' });
    }
  }
  for (const l of D.links.filter((q) => q.kind === 'crawl' && q.a[0] === q.b[0] && !tunnels.some((t) => t.link === q))) {
    // a duct on a floor (not under one): housing on the floor along the path
    const y0 = Y[l.a[0]];
    const [p0, p1] = [l.path[0], l.path[l.path.length - 1]];
    const alongX = Math.abs(p1[0] - p0[0]) >= Math.abs(p1[1] - p0[1]);
    const hw = 0.5;
    const t = 0.1;
    const a = alongX ? Math.min(p0[0], p1[0]) : Math.min(p0[1], p1[1]);
    const b = alongX ? Math.max(p0[0], p1[0]) : Math.max(p0[1], p1[1]);
    const m = alongX ? p0[1] : p0[0];
    const dir = Math.sign((alongX ? p1[0] - p0[0] : p1[1] - p0[1]) || 1);
    const from = op;
    void from;
    const start = ops.length;
    if (alongX) {
      solid(a - 0.3, m - hw - t, b + 0.3, m - hw, y0, y0 + DUCT_H, STEEL, { tag: `duct:${l.id}`, f: 'noLedge', collide: false });
      solid(a - 0.3, m + hw, b + 0.3, m + hw + t, y0, y0 + DUCT_H, STEEL, { tag: `duct:${l.id}`, f: 'noLedge', collide: false });
      solid(a - 0.3, m - hw - t, b + 0.3, m + hw + t, y0 + DUCT_H, y0 + DUCT_H + t, STEEL, { tag: `duct:${l.id}`, f: 'noLedge', collide: false });
      extraGaps.push(...ductWallGaps(l, p0, p1, 'x'));
    } else {
      solid(m - hw - t, a - 0.3, m - hw, b + 0.3, y0, y0 + DUCT_H, STEEL, { tag: `duct:${l.id}`, f: 'noLedge', collide: false });
      solid(m + hw, a - 0.3, m + hw + t, b + 0.3, y0, y0 + DUCT_H, STEEL, { tag: `duct:${l.id}`, f: 'noLedge', collide: false });
      solid(m - hw - t, a - 0.3, m + hw + t, b + 0.3, y0 + DUCT_H, y0 + DUCT_H + t, STEEL, { tag: `duct:${l.id}`, f: 'noLedge', collide: false });
      extraGaps.push(...ductWallGaps(l, p0, p1, 'z'));
    }
    void start;
    const nx = alongX ? -dir : 0;
    const nz = alongX ? 0 : -dir;
    // entry grate at the start mouth, exit grate at the end mouth (outward normals)
    op({
      t: 'duct',
      id: l.id,
      path: [
        { x: r4(p0[0] + (alongX ? dir * 0.25 : 0)), y: y0, z: r4(p0[1] + (alongX ? 0 : dir * 0.25)) },
        { x: r4(p1[0] - (alongX ? dir * 0.25 : 0)), y: y0, z: r4(p1[1] - (alongX ? 0 : dir * 0.25)) },
      ],
      entry: { pos: { x: r4(p0[0]), y: r4(y0 + 0.45), z: r4(p0[1]) }, nx, ny: 0, nz, where: 'wall' },
      exit: { pos: { x: r4(p1[0]), y: r4(y0 + 0.45), z: r4(p1[1]) }, nx: -nx, ny: 0, nz: -nz, where: 'wall' },
    });
  }
  function ductWallGaps(l, p0, p1, axisAlong) {
    // wall lines the duct crosses between its mouths (a gap 1.0 wide, 1.3 high)
    const out = [];
    const lv = l.a[0];
    for (const r of walledRuns.filter((q) => q.lv === lv)) {
      if (axisAlong === 'x' && r.axis === 'x' && r.at > Math.min(p0[0], p1[0]) + 0.01 && r.at < Math.max(p0[0], p1[0]) - 0.01 && p0[1] >= r.p && p0[1] <= r.q) out.push({ id: `gap:${l.id}`, type: 'duct', level: lv, axis: 'x', at: r.at, c: p0[1], w: 1.2 });
      if (axisAlong === 'z' && r.axis === 'z' && r.at > Math.min(p0[1], p1[1]) + 0.01 && r.at < Math.max(p0[1], p1[1]) - 0.01 && p0[0] >= r.p && p0[0] <= r.q) out.push({ id: `gap:${l.id}`, type: 'duct', level: lv, axis: 'z', at: r.at, c: p0[0], w: 1.2 });
    }
    return out;
  }
  // (the duct gaps are known only after the walls are made: rebuild the walls once with the gaps in place)

  emitWalls();

  // T tunnels: vents at the inner end of each pit, ladders up the pit walls
  for (const t of tunnels) {
    const y = t.y;
    const dirv = t.dir;
    const pit = (end, sgn) => (t.alongX ? [end[0] + sgn * PIT, end[1]] : [end[0], end[1] + sgn * PIT]);
    const ventA = pit(t.p0, dirv);
    const ventB = pit(t.p1, -dirv);
    const nA = t.alongX ? [-dirv, 0] : [0, -dirv];
    const mk = (v, n) => ({ pos: { x: r4(v[0]), y: r4(y + 0.45), z: r4(v[1]) }, nx: n[0], ny: 0, nz: n[1], where: 'wall' });
    op({
      t: 'duct',
      id: t.link.id,
      path: [
        { x: r4(ventA[0] + (t.alongX ? dirv * 0.25 : 0)), y, z: r4(ventA[1] + (t.alongX ? 0 : dirv * 0.25)) },
        { x: r4(ventB[0] - (t.alongX ? dirv * 0.25 : 0)), y, z: r4(ventB[1] - (t.alongX ? 0 : dirv * 0.25)) },
      ],
      entry: mk(ventA, nA),
      exit: mk(ventB, [-nA[0], -nA[1]]),
    });
    // a ladder up the long wall of each pit (the pit is 1.0 wide: the ladder stands against the far wall)
    for (const [end, sgn] of [
      [t.p0, dirv],
      [t.p1, -dirv],
    ]) {
      const cx = t.alongX ? end[0] + sgn * (PIT / 2) : t.mid;
      const cz = t.alongX ? t.mid : end[1] + sgn * (PIT / 2);
      // facing the wall on the +perpendicular side
      const fx = t.alongX ? 0 : 1;
      const fz = t.alongX ? 1 : 0;
      const px = cx + fx * (t.w / 2 - 0.05);
      const pz = cz + fz * (t.w / 2 - 0.05);
      op({ t: 'ladder', x: r4(px), z: r4(pz), y0: y, y1: 0, facing: r4(Math.atan2(fx, fz)), id: `${t.link.id}-pit` });
    }
    // end caps beyond the pits are the tunnel walls already built
    void y;
  }

  // ---- 11. rebuild once: the ladder / beam / duct gaps change the walls, so the wall pass runs again with them ----------------------------
  // (done by running the wall pass a second time over a clean op list: see `generateTwice`)

  // every duct is crawlable both ways: the engine enters a duct only at its entry, so each gets a twin with the ends swapped
  for (const d of ops.filter((o) => o.t === 'duct' && !String(o.id).endsWith('~r'))) {
    ops.push({ t: 'duct', id: `${d.id}~r`, path: d.path.slice().reverse(), entry: d.exit, exit: d.entry });
  }

  // ---- 12. rooms, markers, teleport points ---------------------------------------------------------------------------------------------
  const rooms = D.spaces.map((s) => {
    const y = Y[s.level];
    return { id: s.id, name: s.name, minX: s.rect[0], maxX: s.rect[2], minZ: s.rect[1], maxZ: s.rect[3], minY: r4(y - (s.level === 'T' ? 0.25 : s.level === 'U' || s.level === 'R' ? 0.05 : 0.2)), maxY: s.level === 'R' ? r4(y + 8) : s.level === 'B' ? r4(y + 1.6) : s.level === 'T' ? r4(y + 1.2) : r4(y + 3.2), level: s.level };
  });
  const markers = [];
  const mk = (kind, id, lv, x, z, w, d, label) => markers.push({ kind, id, level: lv, x: r4(x), z: r4(z), w: r4(w), d: r4(d), y: Y[lv], color: MARK[kind], label });
  for (const h of D.hides) mk('hide', h.id, h.level, (h.rect[0] + h.rect[2]) / 2, (h.rect[1] + h.rect[3]) / 2, h.rect[2] - h.rect[0], h.rect[3] - h.rect[1], h.id);
  for (const v of D.vantage) mk('vantage', v.id, v.level, v.x, v.z, 0.6, 0.6, v.id);
  for (const o of D.objectives) mk('objective', o.id, o.level, o.x, o.z, 0.9, 0.9, o.id);
  for (const p of D.panels) mk('panel', p.id, p.level, p.x, p.z, 0.4, 0.4, p.id);
  const seen = new Set();
  for (const c of D.circuits) {
    const sw = c.switch;
    if (!sw || seen.has(sw.id)) continue;
    seen.add(sw.id);
    if (D.objectives.some((o) => o.id === sw.id)) continue;
    mk('switch', sw.id, sw.level, sw.x, sw.z, 0.4, 0.4, sw.id);
  }
  for (const r of D.regroup) mk('regroup', r.id, r.level, r.x, r.z, 1.2, 1.2, r.id);
  for (const s of D.spawns) mk('spawn', s.id, 'G', s.x, s.z, 0.6, 0.6, s.id);
  for (const e of D.extraction) mk('extract', e.id, e.level, e.x, e.z, e.r * 2, e.r * 2, e.id);

  // teleport points: chapter starts (from the main route), each spawn, each objective
  const debug = [];
  const main = D.routes.find((r) => r.kind === 'main');
  const chapterNames = Object.fromEntries(D.meta.chapters.map((c) => [c.id, c.name]));
  for (const p of main.pts) if (p.chapter) debug.push({ group: 'Chapter', id: `CH${p.chapter}`, label: `Ch ${p.chapter} ${chapterNames[p.chapter] ?? ''}`.trim(), level: p.lv, x: p.x, z: p.z, y: Y[p.lv] });
  for (const s of D.spawns) debug.push({ group: 'Spawn', id: s.id, label: s.id, level: 'G', x: s.x, z: s.z, y: Y.G });
  for (const o of D.objectives) debug.push({ group: 'Objective', id: o.id, label: `${o.id} ${o.name?.replace(/^P\d /, '') ?? ''}`.trim(), level: o.level, x: o.x, z: o.z, y: Y[o.level] });

  return { version: 1, source: 'docs/design/map-dead-line.json', bounds: { minX: D.meta.footprint.x[0], maxX: D.meta.footprint.x[1], minZ: D.meta.footprint.z[0], maxZ: D.meta.footprint.z[1] }, levels: Y, stats, notes, ops, rooms, markers, debug, _extraGaps: extraGaps, _stairs: stairPlans.length };
}

/** The wall pass depends on gaps found while placing ladders, the beam and ducts: run the generator again with them. */
export function generateGeo(D) {
  return generate(D);
}

function main() {
  const D = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const geo = generateGeo(D);
  delete geo._extraGaps;
  delete geo._stairs;
  const text = JSON.stringify(geo) + '\n';
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur.replaceAll(String.fromCharCode(13), '') !== text) {
      console.error('deadLine.geo.json is stale: run node scripts/gen-dead-line.mjs');
      process.exit(1);
    }
    console.log('deadLine.geo.json is current');
    return;
  }
  fs.writeFileSync(OUT, text);
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${geo.stats.boxes} boxes, ${geo.ops.length} ops, ${geo.rooms.length} rooms, ${geo.markers.length} markers`);
  for (const n of geo.notes) console.log('note:', n);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
