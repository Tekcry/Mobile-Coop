// Kestrel rules checker. Nobody can claim a plan passes when it does not.
//   node scripts/kestrel/check.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--register docs/kestrel/04-plans.md]
// One result line per check (PASS, WARN, FAIL, SKIP or INFO) with ids and coordinates; violations follow as indented lines.
// Ends with counts and exits 1 if any check FAILs. Every rule number is read from facts.json (a missing fact prints SKIP).
// Tool assumptions (documented in docs/kestrel/schema.md): walls run along the X or Z axis; a stair is one straight run
// with `flights` flights (default ceil(risers / max per flight)); an opening of type fire-door is exit-only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clearRect, findLevel, loadFacts, near, readJson, rectD, rectW, wallLength, wallPoint } from './lib.mjs';

const EPS = 1e-6;
const f2 = (n) => +Number(n).toFixed(2);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isPt = (v, n = 2) => Array.isArray(v) && v.length >= n && v.slice(0, n).every(isNum);
const isRect = (v) => Array.isArray(v) && v.length === 4 && v.every(isNum);
const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isMult = (v, g) => g > 0 && Math.abs(v / g - Math.round(v / g)) < EPS;
const ov1 = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
const rectsOverlapArea = (a, b) => {
  const x = ov1(a[0], a[2], b[0], b[2]);
  const z = ov1(a[1], a[3], b[1], b[3]);
  return x > EPS && z > EPS ? x * z : 0;
};
const inRectXZ = (r, x, z) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
const ptSeg = (p, a, b) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
};
const ptRectDist = (p, r) => Math.hypot(Math.max(r[0] - p[0], 0, p[0] - r[2]), Math.max(r[1] - p[1], 0, p[1] - r[3]));

const DOOR_TYPES = new Set(['door', 'double', 'fire-door']);
const PASS_TYPES = new Set(['door', 'double', 'fire-door', 'arch', 'roller', 'gate']);
const VOID_KINDS = new Set(['stairwell', 'liftshaft', 'riser', 'hatch', 'rooflight']);
const RING_ORDER = [1, 2, 3, '3+', 4, 5];
const EDGES = 'WSEN';
const OPTIONAL_TABLES = ['stairs', 'ladders', 'voids', 'objects', 'exterior', 'services'];

const axisWall = (w) => {
  if (near(w.a[0], w.b[0]) && !near(w.a[1], w.b[1])) return { horiz: false, c: w.a[0], lo: Math.min(w.a[1], w.b[1]), hi: Math.max(w.a[1], w.b[1]) };
  if (near(w.a[1], w.b[1]) && !near(w.a[0], w.b[0])) return { horiz: true, c: w.a[1], lo: Math.min(w.a[0], w.b[0]), hi: Math.max(w.a[0], w.b[0]) };
  return null;
};
/** Full footprint of a wall as a rect (centreline +/- half thickness). */
const wallRect = (w) => {
  const a = axisWall(w);
  if (!a) return null;
  const h = w.t / 2;
  return a.horiz ? [a.lo - h, a.c - h, a.hi + h, a.c + h] : [a.c - h, a.lo - h, a.c + h, a.hi + h];
};

// ---------- the check table ----------
/** Each check: { id, title, sev ('FAIL' | 'WARN' | 'INFO'), needs: [fact paths], run(c) }. run pushes details with c.add(msg), or returns { skip } or { info: [lines] }. */
const CHECKS = [];
const check = (id, title, sev, needs, run) => CHECKS.push({ id, title, sev, needs, run });

function context(arch, play, security, registerText, facts) {
  const arr = (k) => (Array.isArray(arch?.[k]) ? arch[k] : []);
  const c = {
    arch, play, security, registerText,
    F: facts.fact,
    meta: arch?.meta ?? {},
    levels: arr('levels'), rooms: arr('rooms'), walls: arr('walls'), openings: arr('openings'),
    stairs: arr('stairs'), ladders: arr('ladders'), voids: arr('voids'), objects: arr('objects'),
    exterior: arr('exterior'), services: arr('services'),
  };
  // A missing or bad grid is NaN: A01 reports it and the grid loops below simply do not run.
  c.grid = isNum(c.meta.grid) && c.meta.grid > 0 ? c.meta.grid : NaN;
  c.objectGrid = isNum(c.meta.objectGrid) && c.meta.objectGrid > 0 ? c.meta.objectGrid : NaN;
  c.wallById = new Map(c.walls.map((w) => [w.id, w]));
  c.roomById = new Map(c.rooms.map((r) => [r.id, r]));
  c.levelById = new Map(c.levels.map((l) => [l.id, l]));
  c.openingById = new Map(c.openings.map((o) => [o.id, o]));
  /** World centre of an opening, or null when its wall is missing or not axis aligned. */
  c.openingPoint = (o) => {
    const w = c.wallById.get(o.wall);
    if (!w || !isPt(w.a) || !isPt(w.b) || !isNum(o.at) || !axisWall(w)) return null;
    return wallPoint(w, o.at).p;
  };
  c.onLevel = (list, id) => list.filter((x) => x.level === id);
  return c;
}

// ===== A01 required fields, unique ids =====
check('A01', 'Required fields present, ids unique', 'FAIL', [], (c) => {
  const { arch } = c;
  if (!arch || typeof arch !== 'object') return c.add('arch file is not an object');
  const need = (obj, keys, label, ok = {}) => {
    for (const k of keys) {
      const v = obj?.[k];
      const test = ok[k] ?? ((x) => x !== undefined && x !== null && x !== '');
      if (!test(v)) c.add(`${label}: missing or bad field ${k}`);
    }
  };
  if (!arch.meta || typeof arch.meta !== 'object') c.add('meta missing');
  else {
    need(arch.meta, ['id', 'grid', 'objectGrid', 'entry', 'bay', 'site', 'footprint'], 'meta', {
      grid: (v) => isNum(v) && v > 0, objectGrid: (v) => isNum(v) && v > 0, entry: (v) => isPt(v), bay: (v) => isPt(v), site: isRect, footprint: isRect,
    });
  }
  for (const k of ['levels', 'rooms', 'walls', 'openings']) if (!Array.isArray(arch[k])) c.add(`table ${k} missing`);
  for (const k of OPTIONAL_TABLES) if (arch[k] !== undefined && !Array.isArray(arch[k])) c.add(`table ${k} is not a list`);
  const spec = {
    levels: [['id', 'name', 'floor', 'height'], { floor: isNum, height: (v) => isNum(v) && v > 0 }],
    rooms: [['id', 'level', 'name', 'kind', 'rect', 'ceiling', 'minShort', 'open'], { rect: isRect, ceiling: isNum, minShort: isNum, open: Array.isArray }],
    walls: [['id', 'level', 'a', 'b', 't', 'h', 'kind'], { a: isPt, b: isPt, t: isNum, h: isNum }],
    openings: [['id', 'wall', 'at', 'w', 'h', 'sill', 'type', 'between'], { at: isNum, w: isNum, h: isNum, sill: isNum, between: (v) => Array.isArray(v) && v.length === 2 }],
    stairs: [['id', 'kind', 'from', 'to', 'rect', 'up', 'width', 'risers'], { rect: isRect, width: isNum, risers: isNum }],
    ladders: [['id', 'room', 'at', 'from', 'to', 'facing'], { at: isPt }],
    voids: [['id', 'level', 'rect', 'kind'], { rect: isRect }],
    objects: [['id', 'level', 'rect', 'h', 'y'], { rect: isRect, h: isNum, y: isNum }],
    exterior: [['id', 'kind', 'a', 'b', 'y0', 'y1', 'climbable'], { a: isPt, b: isPt, y0: isNum, y1: isNum, climbable: (v) => typeof v === 'boolean' }],
    services: [['id', 'kind', 'path'], { path: (v) => Array.isArray(v) && v.length > 0 && v.every((p) => isPt(p, 3)) }],
  };
  const seen = new Map();
  for (const [table, [keys, ok]] of Object.entries(spec)) {
    const list = c[table];
    for (const [i, e] of list.entries()) {
      const label = `${table}[${i}] ${e?.id ?? '?'}`;
      const rule = {};
      for (const k of keys) rule[k] = ok[k] ?? (k === 'name' ? (x) => typeof x === 'string' : isText);
      need(e, keys, label, rule);
      if (typeof e?.id === 'string' && e.id) {
        if (seen.has(e.id)) c.add(`duplicate id ${e.id} (${seen.get(e.id)} and ${table})`);
        else seen.set(e.id, table);
      }
    }
  }
  for (const l of c.levels) if (l.footprint !== undefined && !isRect(l.footprint)) c.add(`level ${l.id}: footprint is not [x0, z0, x1, z1]`);
  const lvl = (id, label) => { if (!c.levelById.has(id)) c.add(`${label}: unknown level ${id}`); };
  for (const r of c.rooms) lvl(r.level, `room ${r.id}`);
  for (const w of c.walls) {
    lvl(w.level, `wall ${w.id}`);
    if (isPt(w.a) && isPt(w.b) && !axisWall(w)) c.add(`wall ${w.id}: not along the X or Z axis (the tools assume orthogonal walls)`);
  }
  for (const v of c.voids) lvl(v.level, `void ${v.id}`);
  for (const o of c.objects) lvl(o.level, `object ${o.id}`);
  for (const s of c.stairs) { lvl(s.from, `stair ${s.id} from`); lvl(s.to, `stair ${s.id} to`); }
  for (const l of c.ladders) {
    lvl(l.from, `ladder ${l.id} from`); lvl(l.to, `ladder ${l.id} to`);
    if (!c.roomById.has(l.room)) c.add(`ladder ${l.id}: unknown room ${l.room}`);
  }
  for (const o of c.openings) {
    if (!c.wallById.has(o.wall)) c.add(`opening ${o.id}: unknown wall ${o.wall}`);
    for (const rid of o.between ?? []) if (rid !== '' && !c.roomById.has(rid)) c.add(`opening ${o.id}: unknown room ${rid}`);
  }
});

// ===== A02 grid =====
check('A02', 'Every coordinate except object edges is a multiple of meta.grid', 'FAIL', [], (c) => {
  const g = c.grid;
  const test = (v, label) => { if (isNum(v) && !isMult(v, g)) c.add(`${label} = ${f2(v)}`); };
  const rect = (r, label) => { if (isRect(r)) r.forEach((v, i) => test(v, `${label}[${i}]`)); };
  const pt = (p, label) => { if (isPt(p)) { test(p[0], `${label} x`); test(p[1], `${label} z`); } };
  for (const k of ['site', 'footprint']) rect(c.meta[k], `meta.${k}`);
  pt(c.meta.entry, 'meta.entry');
  for (const l of c.levels) rect(l.footprint, `level ${l.id} footprint`);
  for (const r of c.rooms) rect(r.rect, `room ${r.id}`);
  for (const s of c.stairs) rect(s.rect, `stair ${s.id}`);
  for (const v of c.voids) rect(v.rect, `void ${v.id}`);
  for (const w of c.walls) { pt(w.a, `wall ${w.id} a`); pt(w.b, `wall ${w.id} b`); }
  for (const o of c.openings) test(o.at, `opening ${o.id} at`);
  for (const l of c.ladders) pt(l.at, `ladder ${l.id}`);
  for (const e of c.exterior) { pt(e.a, `exterior ${e.id} a`); pt(e.b, `exterior ${e.id} b`); }
  for (const s of c.services) for (const [i, p] of (s.path ?? []).entries()) if (isPt(p, 3)) { test(p[0], `service ${s.id} point ${i} x`); test(p[2], `service ${s.id} point ${i} z`); }
});

// ===== A03 rect order =====
check('A03', 'Rects ordered (x0 < x1, z0 < z1)', 'FAIL', [], (c) => {
  const test = (r, label) => { if (isRect(r) && !(r[0] < r[2] && r[1] < r[3])) c.add(`${label} [${r.join(', ')}]`); };
  test(c.meta.site, 'meta.site');
  test(c.meta.footprint, 'meta.footprint');
  for (const l of c.levels) test(l.footprint, `level ${l.id} footprint`);
  for (const r of c.rooms) test(r.rect, `room ${r.id}`);
  for (const s of c.stairs) test(s.rect, `stair ${s.id}`);
  for (const v of c.voids) test(v.rect, `void ${v.id}`);
  for (const o of c.objects) test(o.rect, `object ${o.id}`);
});

// ===== A04 room overlap =====
check('A04', 'No two rooms on one level overlap', 'FAIL', [], (c) => {
  for (let i = 0; i < c.rooms.length; i++) {
    for (let j = i + 1; j < c.rooms.length; j++) {
      const a = c.rooms[i];
      const b = c.rooms[j];
      if (a.level !== b.level || !isRect(a.rect) || !isRect(b.rect)) continue;
      const area = rectsOverlapArea(a.rect, b.rect);
      if (area) c.add(`${a.id} and ${b.id} overlap by ${f2(area)} m2 on ${a.level}`);
    }
  }
});

// ===== A05 room sizes =====
check('A05', 'Clear short side >= room minShort; corridors >= scale sheet minimum', 'FAIL', ['corridor.min'], (c) => {
  for (const r of c.rooms) {
    if (!isRect(r.rect)) continue;
    const cl = clearRect(r, c.walls);
    const w = cl[2] - cl[0];
    const d = cl[3] - cl[1];
    const short = Math.min(w, d);
    if (isNum(r.minShort) && short < r.minShort - EPS) c.add(`${r.id} clear ${f2(w)} x ${f2(d)}, short side under minShort ${r.minShort}`);
    if (r.kind === 'corridor' && short < c.F('corridor.min') - EPS) c.add(`${r.id} corridor clear ${f2(w)} x ${f2(d)}, under ${c.F('corridor.min')}`);
  }
});

// ===== A06 edges covered =====
check('A06', "Every room edge is covered by walls or listed in the room's open array", 'FAIL', [], (c) => {
  for (const r of c.rooms) {
    if (!isRect(r.rect)) continue;
    for (const l of r.open ?? []) if (!EDGES.includes(l) || l.length !== 1) c.add(`${r.id}: open edge "${l}" is not W, S, E or N`);
    for (let e = 0; e < 4; e++) {
      if ((r.open ?? []).includes(EDGES[e])) continue;
      const vertical = e === 0 || e === 2;
      const line = vertical ? (e === 0 ? r.rect[0] : r.rect[2]) : e === 1 ? r.rect[1] : r.rect[3];
      const lo = vertical ? r.rect[1] : r.rect[0];
      const hi = vertical ? r.rect[3] : r.rect[2];
      const spans = [];
      for (const w of c.walls) {
        if (w.level !== r.level) continue;
        const a = axisWall(w);
        if (!a || a.horiz === vertical || !near(a.c, line)) continue;
        spans.push([Math.max(a.lo, lo), Math.min(a.hi, hi)]);
      }
      spans.sort((p, q) => p[0] - q[0]);
      let at = lo;
      for (const [s0, s1] of spans) {
        if (s0 > at + EPS) c.add(`${r.id} edge ${EDGES[e]} (${vertical ? 'x' : 'z'}=${f2(line)}): no wall from ${vertical ? 'z' : 'x'}=${f2(at)} to ${f2(s0)}`);
        at = Math.max(at, s1);
      }
      if (at < hi - EPS) c.add(`${r.id} edge ${EDGES[e]} (${vertical ? 'x' : 'z'}=${f2(line)}): no wall from ${vertical ? 'z' : 'x'}=${f2(at)} to ${f2(hi)}`);
    }
  }
});

// ===== A07 openings in walls =====
check('A07', 'Openings inside their wall and clear of its ends; door height in range', 'FAIL', ['door.endClear', 'door.heightMin', 'door.heightMax'], (c) => {
  for (const o of c.openings) {
    const w = c.wallById.get(o.wall);
    if (!w || !isPt(w.a) || !isPt(w.b) || !isNum(o.at) || !isNum(o.w)) continue;
    const L = wallLength(w);
    const e1 = o.at - o.w / 2;
    const e2 = L - o.at - o.w / 2;
    const p = wallPoint(w, Math.min(Math.max(o.at, 0), L)).p;
    const where = `(${f2(p[0])}, ${f2(p[1])})`;
    if (e1 < -EPS || e2 < -EPS) c.add(`${o.id} on ${w.id} ${where}: sticks out of the wall (at ${o.at}, w ${o.w}, wall length ${f2(L)})`);
    else if (Math.min(e1, e2) < c.F('door.endClear') - EPS) c.add(`${o.id} on ${w.id} ${where}: ${f2(Math.min(e1, e2))} m from a wall end, need ${c.F('door.endClear')}`);
    if (DOOR_TYPES.has(o.type) && isNum(o.h) && (o.h < c.F('door.heightMin') - EPS || o.h > c.F('door.heightMax') + EPS)) c.add(`${o.id} ${where}: door height ${o.h}, allowed ${c.F('door.heightMin')}-${c.F('door.heightMax')}`);
  }
});

// ===== A08 door spacing =====
check('A08', 'Door centres on one wall far enough apart', 'FAIL', ['door.centreSpacing'], (c) => {
  const byWall = new Map();
  for (const o of c.openings) if (DOOR_TYPES.has(o.type) && isNum(o.at)) byWall.set(o.wall, [...(byWall.get(o.wall) ?? []), o]);
  for (const [wid, list] of byWall) {
    list.sort((a, b) => a.at - b.at);
    for (let i = 1; i < list.length; i++) {
      const gap = list[i].at - list[i - 1].at;
      if (gap < c.F('door.centreSpacing') - EPS) {
        const p = c.openingPoint(list[i]);
        c.add(`${list[i - 1].id} and ${list[i].id} on ${wid} are ${f2(gap)} m apart${p ? ` near (${f2(p[0])}, ${f2(p[1])})` : ''}`);
      }
    }
  }
});

// ===== A09 door near stair end =====
check('A09', 'No door near a stair end', 'FAIL', ['door.stairEndClear'], (c) => {
  for (const o of c.openings) {
    if (!DOOR_TYPES.has(o.type)) continue;
    const w = c.wallById.get(o.wall);
    const p = c.openingPoint(o);
    if (!w || !p) continue;
    for (const s of c.stairs) {
      if (!isRect(s.rect) || (s.from !== w.level && s.to !== w.level)) continue;
      const r = s.rect;
      const ends = s.up === 'N' || s.up === 'S' ? [[[r[0], r[1]], [r[2], r[1]]], [[r[0], r[3]], [r[2], r[3]]]] : [[[r[0], r[1]], [r[0], r[3]]], [[r[2], r[1]], [r[2], r[3]]]];
      const d = Math.min(...ends.map(([a, b]) => ptSeg(p, a, b)));
      const inside = inRectXZ(r, p[0], p[1]);
      if (inside || d < c.F('door.stairEndClear') - EPS) c.add(`${o.id} (${f2(p[0])}, ${f2(p[1])}) is ${inside ? 'inside' : `${f2(d)} m from an end of`} stair ${s.id}`);
    }
  }
});

// ===== A10 doors facing across a corridor =====
check('A10', 'Doors facing across a corridor are offset', 'WARN', ['door.facingOffset'], (c) => {
  for (const r of c.rooms) {
    if (r.kind !== 'corridor' || !isRect(r.rect)) continue;
    const doors = c.openings.filter((o) => DOOR_TYPES.has(o.type) && c.wallById.get(o.wall)?.level === r.level).map((o) => ({ o, p: c.openingPoint(o) })).filter((d) => d.p);
    const on = (axis, line, lo, hi) => doors.filter(({ p }) => near(p[axis], line) && p[1 - axis] > lo - EPS && p[1 - axis] < hi + EPS);
    const pairs = [
      [on(0, r.rect[0], r.rect[1], r.rect[3]), on(0, r.rect[2], r.rect[1], r.rect[3]), 1],
      [on(1, r.rect[1], r.rect[0], r.rect[2]), on(1, r.rect[3], r.rect[0], r.rect[2]), 0],
    ];
    for (const [A, B, along] of pairs) {
      for (const a of A) for (const b of B) {
        const off = Math.abs(a.p[along] - b.p[along]);
        if (off < c.F('door.facingOffset') - EPS) c.add(`${a.o.id} and ${b.o.id} face each other across ${r.id}, offset ${f2(off)} m near (${f2(a.p[0])}, ${f2(a.p[1])})`);
      }
    }
  }
});

// ===== A11 stairs =====
check('A11', 'Stairs: riser count, risers per flight, rect long enough for the run', 'FAIL', ['stair.riserHeight', 'stair.maxRisersPerFlight', 'stair.going', 'stair.midLanding'], (c) => {
  const max = c.F('stair.maxRisersPerFlight');
  for (const s of c.stairs) {
    const from = c.levelById.get(s.from);
    const to = c.levelById.get(s.to);
    if (!from || !to || !isNum(s.risers) || !isRect(s.rect)) continue;
    const h = to.floor - from.floor;
    if (h <= 0) { c.add(`${s.id}: level ${s.to} is not above ${s.from}`); continue; }
    const expect = Math.round(h / c.F('stair.riserHeight'));
    if (s.risers !== expect) c.add(`${s.id}: ${s.risers} risers, floor-to-floor ${f2(h)} m needs ${expect}`);
    const flights = isNum(s.flights) && s.flights >= 1 ? s.flights : Math.ceil(s.risers / max);
    const per = Math.ceil(s.risers / flights);
    if (per > max) c.add(`${s.id}: ${per} risers per flight over ${flights} flight(s), max ${max}`);
    const run = (s.risers - flights) * c.F('stair.going') + (flights - 1) * c.F('stair.midLanding');
    const len = s.up === 'N' || s.up === 'S' ? rectD(s.rect) : rectW(s.rect);
    if (len < run - EPS) c.add(`${s.id}: rect is ${f2(len)} m long along ${s.up}, the run needs ${f2(run)} m`);
  }
});

// ===== A12 ladder rooms =====
check('A12', 'A ladder sits only in a room of kind plant or shaft', 'FAIL', [], (c) => {
  for (const l of c.ladders) {
    const r = c.roomById.get(l.room);
    if (!r || (r.kind !== 'plant' && r.kind !== 'shaft')) c.add(`${l.id} at (${l.at?.join(', ')}) is in ${l.room} (kind ${r?.kind ?? 'unknown'})`);
  }
});

// ===== A13 ladder next to a stair =====
check('A13', 'No ladder joins the same two levels as a stair within 15 m', 'FAIL', ['ladder.stairSeparation'], (c) => {
  for (const l of c.ladders) {
    if (!isPt(l.at)) continue;
    for (const s of c.stairs) {
      if (!isRect(s.rect) || !((s.from === l.from && s.to === l.to) || (s.from === l.to && s.to === l.from))) continue;
      const d = ptRectDist(l.at, s.rect);
      if (d < c.F('ladder.stairSeparation') - EPS) c.add(`${l.id} (${l.at.join(', ')}) is ${f2(d)} m from stair ${s.id} and joins the same levels ${l.from}-${l.to}`);
    }
  }
});

// ===== A14 upper levels covered =====
check('A14', 'Every upper level is fully covered by rooms or voids over its footprint; voids are an allowed kind with a reason', 'FAIL', [], (c) => {
  for (const v of c.voids) {
    if (!VOID_KINDS.has(v.kind)) c.add(`void ${v.id}: kind "${v.kind}" is not one of ${[...VOID_KINDS].join(', ')}`);
    if (!isText(v.reason)) c.add(`void ${v.id}: no reason`);
  }
  const set = (r) => isRect(r) && r[2] > r[0] && r[3] > r[1];
  if (!set(c.meta.footprint) && !c.levels.some((l) => l.floor > 0 && set(l.footprint))) return { skip: 'meta.footprint is not set' };
  const g = c.grid;
  for (const lv of c.levels) {
    if (!(lv.floor > 0)) continue;
    // a level's own footprint (levels[].footprint) wins over the building footprint
    const fp = set(lv.footprint) ? lv.footprint : c.meta.footprint;
    if (!set(fp)) continue;
    const rects = [...c.onLevel(c.rooms, lv.id), ...c.onLevel(c.voids, lv.id)].map((x) => x.rect).filter(isRect);
    const miss = [];
    for (let x = fp[0] + g / 2; x < fp[2]; x += g) for (let z = fp[1] + g / 2; z < fp[3]; z += g) if (!rects.some((r) => inRectXZ(r, x, z))) miss.push([x, z]);
    if (miss.length) {
      const xs = miss.map((m) => m[0]);
      const zs = miss.map((m) => m[1]);
      c.add(`level ${lv.id}: ${f2(miss.length * g * g)} m2 of the footprint has no room or void, within x ${f2(Math.min(...xs) - g / 2)}-${f2(Math.max(...xs) + g / 2)}, z ${f2(Math.min(...zs) - g / 2)}-${f2(Math.max(...zs) + g / 2)}`);
    }
  }
});

// ===== A15 reasons =====
check('A15', 'Every object, exterior element and void has a name or kind and a reason', 'FAIL', [], (c) => {
  for (const o of c.objects) { if (!isText(o.name)) c.add(`object ${o.id}: no name`); if (!isText(o.reason)) c.add(`object ${o.id}: no reason`); }
  for (const e of c.exterior) { if (!isText(e.kind)) c.add(`exterior ${e.id}: no kind`); if (!isText(e.reason)) c.add(`exterior ${e.id}: no reason`); }
  for (const v of c.voids) { if (!isText(v.kind)) c.add(`void ${v.id}: no kind`); if (!isText(v.reason)) c.add(`void ${v.id}: no reason`); }
});

// ===== A16 auto-lip objects =====
check('A16', 'An object whose top reaches the auto-lip height is noLedge', 'WARN', ['lip.autoHeight'], (c) => {
  for (const o of c.objects) {
    if (!isNum(o.h) || !isNum(o.y)) continue;
    if (o.y + o.h >= c.F('lip.autoHeight') - EPS && !o.noLedge) c.add(`${o.id} ${o.name ?? ''} top ${f2(o.y + o.h)} m on ${o.level} at [${o.rect?.join(', ')}] becomes a hangable lip (noLedge is false)`);
  }
});

// ===== A17 clear in front of openings =====
check('A17', 'No object in front of a door or opening', 'FAIL', ['door.objectFrontClear'], (c) => {
  const front = c.F('door.objectFrontClear');
  for (const o of c.openings) {
    const w = c.wallById.get(o.wall);
    const p = c.openingPoint(o);
    if (!w || !p || (o.sill ?? 0) !== 0 || !isNum(o.w)) continue;
    const a = axisWall(w);
    const hs = o.w / 2;
    const reach = w.t / 2 + front;
    const zone = a.horiz ? [p[0] - hs, a.c - reach, p[0] + hs, a.c + reach] : [a.c - reach, p[1] - hs, a.c + reach, p[1] + hs];
    for (const ob of c.onLevel(c.objects, w.level)) {
      if (!isRect(ob.rect) || (isNum(ob.y) && isNum(o.h) && ob.y >= o.h)) continue;
      if (rectsOverlapArea(zone, ob.rect)) c.add(`${ob.id} ${ob.name ?? ''} is in front of ${o.id} (${f2(p[0])}, ${f2(p[1])}) on ${w.id}`);
    }
  }
});

// ===== A18 split-jump gaps =====
/** Vertical faces of walls and floor-standing objects on a level: { axis (0 = plane x = pos, 1 = plane z = pos), pos, n (+1 or -1 outward normal), s0, s1 (span on the other axis), h, id }. */
function faces(c, level) {
  const out = [];
  for (const w of c.onLevel(c.walls, level)) {
    const a = axisWall(w);
    if (!a || !isNum(w.h)) continue;
    const axis = a.horiz ? 1 : 0;
    out.push({ axis, pos: a.c - w.t / 2, n: -1, s0: a.lo, s1: a.hi, h: w.h, id: w.id }, { axis, pos: a.c + w.t / 2, n: 1, s0: a.lo, s1: a.hi, h: w.h, id: w.id });
  }
  for (const o of c.onLevel(c.objects, level)) {
    if (!isRect(o.rect) || !isNum(o.h) || (o.y ?? 0) !== 0) continue;
    const r = o.rect;
    out.push({ axis: 0, pos: r[0], n: -1, s0: r[1], s1: r[3], h: o.h, id: o.id }, { axis: 0, pos: r[2], n: 1, s0: r[1], s1: r[3], h: o.h, id: o.id },
      { axis: 1, pos: r[1], n: -1, s0: r[0], s1: r[2], h: o.h, id: o.id }, { axis: 1, pos: r[3], n: 1, s0: r[0], s1: r[2], h: o.h, id: o.id });
  }
  return out;
}
check('A18', 'Split gaps: facing faces tall enough, gap in the split range, enough overlap', 'WARN', ['split.minWidth', 'split.maxWidth', 'split.minHeight', 'split.minOverlap'], (c) => {
  const [wMin, wMax, hMin, oMin] = ['split.minWidth', 'split.maxWidth', 'split.minHeight', 'split.minOverlap'].map(c.F);
  for (const lv of c.levels) {
    const fs_ = faces(c, lv.id).filter((f) => f.h >= hMin - EPS);
    for (const a of fs_) for (const b of fs_) {
      if (a.axis !== b.axis || a.n !== 1 || b.n !== -1 || b.pos <= a.pos || a.id === b.id) continue;
      const gap = b.pos - a.pos;
      const ov = ov1(a.s0, a.s1, b.s0, b.s1);
      if (gap >= wMin - EPS && gap <= wMax + EPS && ov >= oMin - EPS) {
        const here = a.axis === 0 ? `x ${f2(a.pos)}-${f2(b.pos)}, z ${f2(Math.max(a.s0, b.s0))}-${f2(Math.min(a.s1, b.s1))}` : `z ${f2(a.pos)}-${f2(b.pos)}, x ${f2(Math.max(a.s0, b.s0))}-${f2(Math.min(a.s1, b.s1))}`;
        c.add(`${a.id} and ${b.id} on ${lv.id}: gap ${f2(gap)} m, overlap ${f2(ov)} m (${here}) is a split-jump gap`);
      }
    }
  }
});

// ===== A19 lip table =====
check('A19', 'Lip list: wall tops, parapets and object tops classed by reach', 'INFO', ['reach.grabMax', 'reach.jumpGrab', 'reach.wallJumpMaxUp', 'reach.boostMax'], (c) => {
  const cls = (h) => (h <= c.F('reach.grabMax') + EPS ? 'hand' : h <= c.F('reach.jumpGrab') + EPS ? 'jump' : h <= c.F('reach.wallJumpMaxUp') + EPS ? 'wall jump' : h <= c.F('reach.boostMax') + EPS ? 'co-op' : 'out of reach');
  const groups = new Map();
  const put = (id, label, h, level) => { const k = cls(h); groups.set(k, [...(groups.get(k) ?? []), `${id}${label ? ` ${label}` : ''} ${f2(h)} m (${level})`]); };
  for (const w of c.walls) if (isNum(w.h)) put(w.id, w.kind === 'parapet' ? 'parapet' : '', w.h, w.level);
  for (const o of c.objects) if (isNum(o.h)) put(o.id, `${o.name ?? ''}${o.noLedge ? ' noLedge' : ''}`.trim(), (o.y ?? 0) + o.h, o.level);
  const lines = [];
  for (const k of ['hand', 'jump', 'wall jump', 'co-op', 'out of reach']) lines.push(`${k} (${(groups.get(k) ?? []).length}): ${(groups.get(k) ?? []).join('; ') || '-'}`);
  return { info: lines };
});

// ===== A20 stacked surfaces =====
check('A20', 'Walkable surfaces over any cell stay within the limit', 'FAIL', ['rules.walkableSurfacesMax', 'lip.autoHeight'], (c) => {
  const max = c.F('rules.walkableSurfacesMax');
  const site = isRect(c.meta.site) && c.meta.site[2] > c.meta.site[0] ? c.meta.site : null;
  if (!site) return { skip: 'meta.site is not set' };
  const cell = c.grid;
  const perLevel = c.levels.map((lv) => ({
    id: lv.id,
    rooms: c.onLevel(c.rooms, lv.id).map((r) => r.rect).filter(isRect),
    voids: c.onLevel(c.voids, lv.id).map((v) => v.rect).filter(isRect),
    tops: c.onLevel(c.objects, lv.id).filter((o) => isRect(o.rect) && isNum(o.h) && !o.noLedge && (o.y ?? 0) + o.h >= c.F('lip.autoHeight') - EPS),
  }));
  const bad = [];
  for (let x = site[0] + cell / 2; x < site[2]; x += cell) {
    for (let z = site[1] + cell / 2; z < site[3]; z += cell) {
      const names = [];
      for (const L of perLevel) {
        if (L.rooms.some((r) => inRectXZ(r, x, z)) && !L.voids.some((r) => inRectXZ(r, x, z))) names.push(`${L.id} floor`);
        for (const o of L.tops) if (inRectXZ(o.rect, x, z)) names.push(o.id);
      }
      if (names.length > max) bad.push({ x, z, names });
    }
  }
  if (bad.length) {
    for (const b of bad.slice(0, 5)) c.add(`cell (${f2(b.x)}, ${f2(b.z)}): ${b.names.length} surfaces (${b.names.join(', ')})`);
    if (bad.length > 5) c.add(`... ${bad.length - 5} more cells`);
  }
});

// ===== A21 site and footprint =====
check('A21', 'Site and footprint inside the RULES section 2 limits', 'FAIL', ['rules.siteMaxX', 'rules.siteMaxZ', 'rules.footprintMaxX', 'rules.footprintMaxZ'], (c) => {
  const test = (r, label, mx, mz) => {
    if (!isRect(r) || !(r[2] > r[0] && r[3] > r[1])) { c.add(`${label} is not set`); return; }
    const sides = [rectW(r), rectD(r)].sort((a, b) => b - a);
    const lim = [mx, mz].sort((a, b) => b - a);
    if (sides[0] > lim[0] + EPS || sides[1] > lim[1] + EPS) c.add(`${label} is ${f2(rectW(r))} x ${f2(rectD(r))} m, limit ${mx} x ${mz}`);
  };
  test(c.meta.site, 'site', c.F('rules.siteMaxX'), c.F('rules.siteMaxZ'));
  test(c.meta.footprint, 'footprint', c.F('rules.footprintMaxX'), c.F('rules.footprintMaxZ'));
  const s = c.meta.site;
  const f = c.meta.footprint;
  for (const l of c.levels) {
    const lf = l.footprint;
    if (isRect(lf) && isRect(f) && (lf[0] < f[0] - EPS || lf[1] < f[1] - EPS || lf[2] > f[2] + EPS || lf[3] > f[3] + EPS)) c.add(`level ${l.id} footprint [${lf.join(', ')}] is not inside the building footprint [${f.join(', ')}]`);
  }
  if (isRect(s) && isRect(f) && f[2] > f[0] && (f[0] < s[0] - EPS || f[1] < s[1] - EPS || f[2] > s[2] + EPS || f[3] > s[3] + EPS)) c.add(`footprint [${f.join(', ')}] is not inside site [${s.join(', ')}]`);
});

// ===== A22 wall thickness =====
check('A22', 'Wall thickness: exterior and interior values', 'FAIL', ['rules.wallExterior', 'rules.wallInterior'], (c) => {
  for (const w of c.walls) {
    const want = w.kind === 'exterior' ? c.F('rules.wallExterior') : w.kind === 'interior' ? c.F('rules.wallInterior') : null;
    if (want !== null && isNum(w.t) && Math.abs(w.t - want) > EPS) c.add(`${w.id} (${w.kind}, ${w.level}) is ${w.t} m thick, needs ${want}`);
  }
});

// ===== A23 climbable by kind =====
check('A23', 'Elements of one exterior kind share the same climbable value', 'FAIL', [], (c) => {
  const byKind = new Map();
  for (const e of c.exterior) byKind.set(e.kind, [...(byKind.get(e.kind) ?? []), e]);
  for (const [kind, list] of byKind) {
    if (new Set(list.map((e) => e.climbable)).size > 1) c.add(`${kind}: climbable true on ${list.filter((e) => e.climbable).map((e) => e.id).join(', ')}, false on ${list.filter((e) => !e.climbable).map((e) => e.id).join(', ')}`);
  }
});

// ===== A24 register =====
check('A24', 'Every id in the JSON appears in the register table', 'FAIL', [], (c) => {
  if (c.registerText === undefined) return { skip: 'no --register given' };
  const tokens = new Set();
  for (const line of c.registerText.split(/\r?\n/)) if (line.trim().startsWith('|')) for (const t of line.match(/[A-Za-z0-9_.-]+/g) ?? []) tokens.add(t);
  const ids = [];
  for (const k of ['levels', 'rooms', 'walls', 'openings', ...OPTIONAL_TABLES]) for (const e of c[k]) if (isText(e?.id)) ids.push([k, e.id]);
  for (const [k, id] of ids) if (!tokens.has(id)) c.add(`${k} id ${id} is not in the register`);
});

// ===== A25 object grid =====
check('A25', 'Object edges are multiples of meta.objectGrid', 'FAIL', [], (c) => {
  for (const o of c.objects) if (isRect(o.rect)) o.rect.forEach((v, i) => { if (!isMult(v, c.objectGrid)) c.add(`${o.id} rect[${i}] = ${v}`); });
});

// ===== A26 aisles =====
check('A26', 'Gaps beside tall objects are a real aisle or closed', 'FAIL', ['rules.aisleMin', 'rules.aisleTallObject', 'rules.aisleMaxGap'], (c) => {
  const [aisle, tall, maxGap] = ['rules.aisleMin', 'rules.aisleTallObject', 'rules.aisleMaxGap'].map(c.F);
  /** Facing gap of two rects: the separation on one axis when they overlap on the other; null when diagonal or overlapping. */
  const gapOf = (a, b) => {
    const dx = Math.max(a[0] - b[2], b[0] - a[2]);
    const dz = Math.max(a[1] - b[3], b[1] - a[3]);
    if (dx > EPS && ov1(a[1], a[3], b[1], b[3]) > EPS) return dx;
    if (dz > EPS && ov1(a[0], a[2], b[0], b[2]) > EPS) return dz;
    return null;
  };
  const bad = (g) => g > maxGap + EPS && g < aisle - EPS;
  for (const lv of c.levels) {
    const tallObjs = c.onLevel(c.objects, lv.id).filter((o) => isRect(o.rect) && isNum(o.h) && o.h > tall && (o.y ?? 0) === 0);
    const wallList = c.onLevel(c.walls, lv.id).map((w) => ({ w, r: wallRect(w) })).filter((x) => x.r);
    for (let i = 0; i < tallObjs.length; i++) {
      const a = tallObjs[i];
      for (let j = i + 1; j < tallObjs.length; j++) {
        const g = gapOf(a.rect, tallObjs[j].rect);
        if (g !== null && bad(g)) c.add(`${a.id} and ${tallObjs[j].id} on ${lv.id}: clear gap ${f2(g)} m`);
      }
      for (const { w, r } of wallList) {
        const g = gapOf(a.rect, r);
        if (g !== null && bad(g)) c.add(`${a.id} and wall ${w.id} on ${lv.id}: clear gap ${f2(g)} m`);
      }
    }
  }
});

// ===== A27 rack rows =====
check('A27', 'Rack rows have noLedge true unless the play file plans a traversal on them', 'WARN', [], (c) => {
  const planned = new Set((c.play?.traversal ?? []).map((t) => t.element));
  for (const o of c.objects) if (/\brack/i.test(o.name ?? '') && !o.noLedge && !planned.has(o.id)) c.add(`${o.id} ${o.name} on ${o.level} at [${o.rect?.join(', ')}] has noLedge false and no planned traversal`);
});

// ===== security checks (--security) =====
const SC = (id, title, needs, run) => check(id, title, 'FAIL', needs, (c) => (c.security ? run(c) : { skip: 'no --security given' }));
const devices = (c) => (Array.isArray(c.security?.devices) ? c.security.devices : []);

SC('SC01', 'Every id the security file references exists', [], (c) => {
  const devIds = new Set(devices(c).map((d) => d.id));
  const seen = new Set();
  for (const d of devices(c)) {
    if (seen.has(d.id)) c.add(`device id ${d.id} is duplicated`);
    seen.add(d.id);
    if (!isText(d.room) || !c.roomById.has(d.room)) c.add(`${d.id}: room "${d.room ?? ''}" is not a room id`);
    if (d.level !== undefined && !findLevel(c.levels, d.level)) c.add(`${d.id}: unknown level ${d.level}`);
    for (const k of ['door', 'door2']) if (d[k] !== undefined && d[k] !== '' && !c.openingById.has(d[k])) c.add(`${d.id}: ${k} ${d[k]} is not an opening id`);
    for (const k of ['feeds', 'controls']) for (const id of d[k] ?? []) if (!devIds.has(id)) c.add(`${d.id}: ${k} ${id} is not a device id`);
  }
  for (const z of c.security.zones ?? []) for (const r of z.rooms ?? []) if (!c.roomById.has(r)) c.add(`zone ${z.id}: room ${r} is not a room id`);
  for (const k of c.security.cards ?? []) for (const id of k.opens ?? []) if (!devIds.has(id)) c.add(`card ${k.id}: opens ${id}, not a device id`);
});

SC('SC02', 'Every opening into a higher zone has a reader or is an exit-only door', [], (c) => {
  const gated = new Set();
  for (const d of devices(c)) if (['reader', 'mantrap', 'iris'].includes(d.kind)) for (const k of ['door', 'door2']) if (d[k]) gated.add(d[k]);
  const rank = (id) => RING_ORDER.indexOf(c.roomById.get(id)?.ring);
  for (const o of c.openings) {
    if (!PASS_TYPES.has(o.type) || !Array.isArray(o.between)) continue;
    const [ra, rb] = o.between.map(rank);
    if (ra < 0 || rb < 0 || ra === rb) continue;
    if (!gated.has(o.id) && o.type !== 'fire-door') {
      const p = c.openingPoint(o);
      c.add(`${o.id} (${o.type}${p ? ` at ${f2(p[0])}, ${f2(p[1])}` : ''}) joins ${o.between.join(' and ')} (zone ${c.roomById.get(o.between[0]).ring} and ${c.roomById.get(o.between[1]).ring}) with no reader and is not exit-only`);
    }
  }
});

SC('SC03', 'Camera mount heights inside the S0 range; device counts at most the S0 maximum', ['security.cameraMountMin', 'security.cameraMountMax'], (c) => {
  for (const d of devices(c)) {
    if (d.kind === 'camera' && isNum(d.y) && (d.y < c.F('security.cameraMountMin') - EPS || d.y > c.F('security.cameraMountMax') + EPS)) c.add(`${d.id} mount ${d.y} m, allowed ${c.F('security.cameraMountMin')}-${c.F('security.cameraMountMax')}`);
  }
  const cap = { camera: 'maxCameras', desk: 'maxDesks', panel: 'maxPanels', reader: 'maxReaders', iris: 'maxIris', mantrap: 'maxMantraps', beam: 'maxBeams', pir: 'maxPir', fault: 'maxFaults' };
  for (const [kind, key] of Object.entries(cap)) {
    const max = c.F(`security.${key}`);
    const n = devices(c).filter((d) => d.kind === kind).length;
    if (max !== undefined && n > max) c.add(`${n} ${kind} devices, maximum ${max}`);
  }
});

SC('SC04', 'Beam heights in the allowed set', ['security.beamHighMin', 'security.beamHighMax', 'security.beamLowMin', 'security.beamLowMax'], (c) => {
  const inBand = (y) => (y >= c.F('security.beamHighMin') - EPS && y <= c.F('security.beamHighMax') + EPS) || (y >= c.F('security.beamLowMin') - EPS && y <= c.F('security.beamLowMax') + EPS);
  for (const d of devices(c)) {
    if (d.kind !== 'beam') continue;
    for (const k of ['a', 'b']) {
      if (!isPt(d[k], 3)) c.add(`${d.id}: end ${k} is not [x, y, z]`);
      else if (!inBand(d[k][1])) c.add(`${d.id} end ${k} (${d[k][0]}, ${d[k][2]}) height ${d[k][1]} m is outside ${c.F('security.beamLowMin')}-${c.F('security.beamLowMax')} and ${c.F('security.beamHighMin')}-${c.F('security.beamHighMax')}`);
    }
  }
});

SC('SC05', 'Every device has a reason', [], (c) => {
  for (const d of devices(c)) if (!isText(d.reason)) c.add(`${d.id} (${d.kind}${isPt(d.at) ? ` at ${d.at.join(', ')}` : ''}): no reason`);
});

SC('SC06', 'Every card opens existing readers', [], (c) => {
  const readers = new Set(devices(c).filter((d) => d.kind === 'reader' || d.kind === 'mantrap').map((d) => d.id));
  for (const k of c.security.cards ?? []) {
    if (!(k.opens ?? []).length) c.add(`card ${k.id}: opens nothing`);
    for (const id of k.opens ?? []) if (!readers.has(id)) c.add(`card ${k.id}: ${id} is not a reader`);
  }
});

// GAMEPLAY CHECKS (P09)
// P09 adds the checks that need the play file (routes, guards, lamps, objectives, co-op lips) here.
// No checks yet. Each one calls check('G..', title, sev, needs, run) like the ones above.

// ---------- runner ----------
/** Runs every check. Returns [{ id, title, status, details }]. */
export function runChecks({ arch, play = null, security = null, registerText, facts = loadFacts() }) {
  const out = [];
  for (const k of CHECKS) {
    const missing = k.needs.filter((n) => facts.fact(n) === undefined);
    if (missing.length) { out.push({ id: k.id, title: k.title, status: 'SKIP', details: [`(no fact: ${missing.join(', ')})`] }); continue; }
    const c = context(arch, play, security, registerText, facts);
    const details = [];
    c.add = (m) => details.push(m);
    let status;
    try {
      const r = k.run(c);
      if (r?.skip) { out.push({ id: k.id, title: k.title, status: 'SKIP', details: [`(${r.skip})`] }); continue; }
      if (r?.info) { out.push({ id: k.id, title: k.title, status: 'INFO', details: r.info }); continue; }
      status = details.length ? k.sev : 'PASS';
    } catch (e) {
      status = 'FAIL';
      details.push(`check crashed: ${e.message} (the file is malformed; see A01)`);
    }
    out.push({ id: k.id, title: k.title, status, details });
  }
  return out;
}

export function summary(results) {
  const n = { PASS: 0, WARN: 0, FAIL: 0, SKIP: 0, INFO: 0 };
  for (const r of results) n[r.status]++;
  return n;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const archFile = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
  if (!archFile) {
    console.error('usage: node scripts/kestrel/check.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--register <register.md>]');
    process.exit(2);
  }
  const regFile = flag('--register');
  const results = runChecks({
    arch: readJson(archFile),
    play: flag('--play') ? readJson(flag('--play')) : null,
    security: flag('--security') ? readJson(flag('--security')) : null,
    registerText: regFile ? (fs.existsSync(regFile) ? fs.readFileSync(regFile, 'utf8') : '') : undefined,
  });
  for (const r of results) {
    console.log(`${r.status.padEnd(4)} ${r.id}  ${r.title}`);
    for (const d of r.details) console.log(`       ${r.status === 'PASS' ? '' : '- '}${d}`);
  }
  const n = summary(results);
  console.log(`\n${n.PASS} PASS, ${n.WARN} WARN, ${n.FAIL} FAIL, ${n.SKIP} SKIP, ${n.INFO} INFO`);
  process.exit(n.FAIL ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
