// Kestrel plan renderer: one SVG (and PNG) per level from kestrel.arch.json, with optional play and security overlays.
//   node scripts/kestrel/plans.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--out docs/kestrel/plans] [--level <id>] [--svg-only]
// --level draws one level; --svg-only skips the PNGs (the level editor's live plan view, docs/kestrel/editor.md).
// Writes <level>.svg, <level>-play.svg (with --play), <level>-security.svg (with --security) and a PNG beside each.
// Every drawing number comes from facts.json ("render" group and the rule groups); see lib.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { launchOptions } from '../e2e-lib.mjs';
// ON10: the roof geometry is the game's own (one copy; Node strips the types)
import { roofPlan } from '../../src/world/maps/kestrelRoofs.ts';
import { clearRect, findLevel, inRect, loadFacts, readJson, rectCentre, wallLength, wallPoint } from './lib.mjs';

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const archFile = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
if (!archFile) {
  console.error('usage: node scripts/kestrel/plans.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--out dir]');
  process.exit(2);
}
const outDir = path.resolve(flag('--out') ?? 'docs/kestrel/plans');
const arch = readJson(archFile);
const play = flag('--play') ? readJson(flag('--play')) : null;
const security = flag('--security') ? readJson(flag('--security')) : null;
const onlyLevel = flag('--level');
const svgOnly = argv.includes('--svg-only');
const facts = loadFacts();
const R = (k) => facts.need(`render.${k}`);
const FACT = (k) => facts.need(k);

const walls = arch.walls ?? [];
const levels = arch.levels ?? [];
const openingsByWall = new Map();
for (const o of arch.openings ?? []) {
  if (!openingsByWall.has(o.wall)) openingsByWall.set(o.wall, []);
  openingsByWall.get(o.wall).push(o);
}
const wallById = new Map(walls.map((w) => [w.id, w]));
const roomById = new Map((arch.rooms ?? []).map((r) => [r.id, r]));

// ---------- colours (names, not measurements) ----------
const RING_TINT = { 0: '#d6ebc9', 1: '#e6efc2', 2: '#fbeab9', 3: '#fbd9a8', 4: '#f6c3a8', 5: '#efb0c0' }; // access levels 0-5 (2g-1); legend words are 2g-2
const OUTSIDE_TINT = '#e9f4e1'; // kind lane: Outside, the Perimeter tint lightened
const WALL_FILL = { exterior: '#1c1c1c', interior: '#4a4a4a', boundary: '#6b4f3a', parapet: '#7b7b7b', balustrade: '#9a9a9a' };
const ROUTE_COLOUR = { shadow: '#1f5fd1', high: '#1c9c3f', loud: '#d32f2f', secret: '#8e24aa', coop: '#f57c00', critical: '#000000', exfil: '#00897b' };
const INK = '#222';
const PAPER = '#ffffff';
const GRID = '#cfd8e3';
const HALO = () => `paint-order="stroke" stroke="#fff" stroke-width="${R('haloStroke')}"`;
const DIRS = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] };

// ---------- bounds and transform ----------
function bounds() {
  const s = arch.meta?.site;
  if (s && s[2] > s[0] && s[3] > s[1]) return s;
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const add = (x, z) => { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); };
  for (const r of arch.rooms ?? []) { add(r.rect[0], r.rect[1]); add(r.rect[2], r.rect[3]); }
  for (const w of walls) { add(...w.a); add(...w.b); }
  return Number.isFinite(x0) ? [x0, z0, x1, z1] : [0, 0, 1, 1];
}
const B = bounds();
const S = R('pxPerM');
const M = R('margin');
const TOP = M + R('titleBand');
const SITE_W = (B[2] - B[0]) * S + 2 * M;
const FOOT_Y = TOP + (B[3] - B[1]) * S + M;
const X = (x) => +(M + (x - B[0]) * S).toFixed(2);
const Y = (z) => +(TOP + (B[3] - z) * S).toFixed(2);
const P = (pt) => `${X(pt[0])},${Y(pt[1])}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => (Math.round(n * 100) / 100).toString();

// ---------- SVG helpers (coordinates in metres unless a name says px) ----------
const rectEl = (r, attrs) => `<rect x="${X(r[0])}" y="${Y(r[3])}" width="${+((r[2] - r[0]) * S).toFixed(2)}" height="${+((r[3] - r[1]) * S).toFixed(2)}" ${attrs}/>`;
const lineEl = (a, b, attrs) => `<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" ${attrs}/>`;
const polyEl = (pts, attrs) => `<polyline points="${pts.map(P).join(' ')}" fill="none" ${attrs}/>`;
const dotEl = (pt, rPx, attrs) => `<circle cx="${X(pt[0])}" cy="${Y(pt[1])}" r="${rPx}" ${attrs}/>`;
const polyPx = (pts, attrs) => `<polygon points="${pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ')}" ${attrs}/>`;
const textPx = (x, y, str, size, attrs = '') => `<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" font-size="${size}" font-family="Arial, sans-serif" ${attrs}>${esc(str)}</text>`;
const textAt = (pt, dxPx, dyPx, str, size, attrs = '') => textPx(X(pt[0]) + dxPx, Y(pt[1]) + dyPx, str, size, attrs);
function labelLines(c, lines, size, attrs = '') {
  const lh = size * R('lineHeight');
  const y0 = Y(c[1]) - ((lines.length - 1) * lh) / 2;
  return lines.map((l, i) => textPx(X(c[0]), y0 + i * lh + size * (1 - R('lineHeight') + 0.55), l, size, `text-anchor="middle" ${attrs}`)).join('');
}
const triPx = (pt, t, fill) => polyPx([[X(pt[0]), Y(pt[1]) - t], [X(pt[0]) - t * R('triBack'), Y(pt[1]) + t * R('triBack') * R('triBack')], [X(pt[0]) + t * R('triBack'), Y(pt[1]) + t * R('triBack') * R('triBack')]], `fill="${fill}" stroke="#111" stroke-width="${R('markStroke')}"`);
const squarePx = (pt, q, attrs) => `<rect x="${+(X(pt[0]) - q / 2).toFixed(2)}" y="${+(Y(pt[1]) - q / 2).toFixed(2)}" width="${q}" height="${q}" ${attrs}/>`;
function starPx(pt, r, attrs) {
  const n = 10;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const rr = i % 2 ? r * R('starInner') : r;
    const a = (Math.PI * 2 * i) / n;
    pts.push([X(pt[0]) + Math.sin(a) * rr, Y(pt[1]) - Math.cos(a) * rr]);
  }
  return polyPx(pts, attrs);
}

/** Filled rectangle of a wall piece from distance s0 to s1 along wall w (full thickness). */
function wallPiece(w, s0, s1, fill) {
  const L = wallLength(w);
  const d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  const n = [-d[1], d[0]];
  const e = w.t * R('wallExtend');
  const a0 = s0 <= 0 ? s0 - e : s0;
  const a1 = s1 >= L ? s1 + e : s1;
  const pa = [w.a[0] + d[0] * a0, w.a[1] + d[1] * a0];
  const pb = [w.a[0] + d[0] * a1, w.a[1] + d[1] * a1];
  const h = w.t / 2;
  const pts = [[pa[0] + n[0] * h, pa[1] + n[1] * h], [pb[0] + n[0] * h, pb[1] + n[1] * h], [pb[0] - n[0] * h, pb[1] - n[1] * h], [pa[0] - n[0] * h, pa[1] - n[1] * h]];
  return `<polygon points="${pts.map(P).join(' ')}" fill="${fill}"/>`;
}

// ---------- architecture layers ----------
function drawWall(w) {
  const L = wallLength(w);
  const fill = WALL_FILL[w.kind] ?? WALL_FILL.interior;
  const ops = (openingsByWall.get(w.id) ?? []).slice().sort((p, q) => p.at - q.at);
  let out = '';
  let cur = 0;
  const piece = (s0, s1) => (w.kind === 'glass' ? glassPiece(w, s0, s1, w.glass?.kind === 'frosted') : wallPiece(w, s0, s1, fill));
  for (const o of ops) {
    const s0 = Math.max(0, o.at - o.w / 2);
    const s1 = Math.min(L, o.at + o.w / 2);
    if (s0 > cur) out += piece(cur, s0);
    cur = Math.max(cur, s1);
  }
  if (cur < L) out += piece(cur, L);
  return out;
}

/** ON9: glass (a glass partition piece, a glass leaf or a pane) between s0 and s1: its two faces and diagonal hatching (denser when frosted). */
function glassPiece(w, s0, s1, frosted, half = w.t / 2) {
  const thin = `stroke="${INK}" stroke-width="${R('thinStroke')}" fill="none"`;
  const at = (s, k) => { const q = wallPoint(w, s); return [q.p[0] + q.n[0] * k, q.p[1] + q.n[1] * k]; };
  let out = lineEl(at(s0, half), at(s1, half), thin) + lineEl(at(s0, -half), at(s1, -half), thin);
  const step = R('tickM') * (frosted ? 0.5 : 1);
  for (let s = s0 + step / 2; s + half * 2 <= s1 + 1e-9; s += step) out += lineEl(at(s, -half), at(s + half * 2, half), `stroke="#5b8fb9" stroke-width="${R('markStroke')}"`);
  return out;
}

const DR_SLIDE = new Set(['slide-auto', 'slide-card', 'slide', 'slide-gate']);
const GLASS_LEAF = new Set(['glass-door', 'slide-auto', 'slide-card']);
const WINDOWS = new Set(['window', 'window-open', 'window-frosted', 'louvre', 'rooflight']);
/** ON9: the end a leaf hangs from (or a slider stacks at): absent = the a end; left / right seen from the side it opens away from. */
function hangsAtA(o, w, C, key) {
  const v = o.door?.[key];
  if (v !== 'left' && v !== 'right') return true;
  const leftIsA = swingSide(o, w, C.p, C.n) === 1;
  return (v === 'left') === leftIsA;
}

/** +1 or -1: which side of the wall (along its left normal) the leaf swings toward: the room in between[1]. */
function swingSide(o, w, pt, n) {
  // ON9: the room in door.swing wins; outside swings away from the room on the other side
  const id = typeof o.door?.swing === 'string' ? o.door.swing : o.between?.[1];
  const probe = (sgn) => [pt[0] + n[0] * sgn * w.t, pt[1] + n[1] * sgn * w.t];
  const side = (rid) => {
    const room = roomById.get(rid);
    if (room) {
      if (inRect(room.rect, ...probe(1))) return 1;
      if (inRect(room.rect, ...probe(-1))) return -1;
    }
    return 0;
  };
  const s = id ? side(id) : 0;
  if (s) return s;
  const other = o.between?.[0] === id ? o.between?.[1] : o.between?.[0];
  return (other ? -side(other) : 0) || 1;
}

function drawOpening(o) {
  const w = wallById.get(o.wall);
  if (!w) return '';
  const L = wallLength(w);
  const lo = Math.max(0, o.at - o.w / 2);
  const hi = Math.min(L, o.at + o.w / 2);
  const A = wallPoint(w, lo);
  const Bp = wallPoint(w, hi);
  const C = wallPoint(w, o.at);
  const h = w.t / 2;
  const edge = (pt, sgn) => [pt.p[0] + pt.n[0] * sgn * h, pt.p[1] + pt.n[1] * sgn * h];
  const thin = `stroke="${INK}" stroke-width="${R('thinStroke')}" fill="none"`;
  const leafAttrs = `stroke="${INK}" stroke-width="${R('leafStroke')}" fill="none"`;
  const t = o.type;
  let out = lineEl(edge(A, -1), edge(A, 1), thin) + lineEl(edge(Bp, -1), edge(Bp, 1), thin);
  if (WINDOWS.has(t)) {
    // ON9: a pane with glass hatching (denser when frosted)
    return out + glassPiece(w, lo, hi, t === 'window-frosted' || o.glass?.kind === 'frosted', R('windowGap'));
  }
  if (DR_SLIDE.has(t)) {
    // ON9: a sliding leaf drawn beside the opening, half over the stack side, and an arrow toward the stack
    const atA = hangsAtA(o, w, C, 'stack');
    const off = h + R('windowGap');
    const sgn = -swingSide(o, w, C.p, C.n);
    const at = (sv, k) => { const q = wallPoint(w, sv); return [q.p[0] + q.n[0] * k, q.p[1] + q.n[1] * k]; };
    const span = hi - lo;
    const l0 = atA ? lo - span * 0.5 : lo + span * 0.5;
    out += GLASS_LEAF.has(t) ? glassPiece(w, l0, l0 + span, false, R('windowGap') / 2) : '';
    out += lineEl(at(l0, sgn * off), at(l0 + span, sgn * off), leafAttrs);
    const tip = atA ? lo : hi;
    const tail = atA ? hi : lo;
    const back = (atA ? 1 : -1) * Math.min(0.3, span / 4);
    out += lineEl(at(tail, sgn * off * 2), at(tip, sgn * off * 2), thin) + lineEl(at(tip, sgn * off * 2), at(tip + back, sgn * off * 2.8), thin) + lineEl(at(tip, sgn * off * 2), at(tip + back, sgn * off * 1.2), thin);
    return out;
  }
  if (t === 'door' || t === 'fire-door' || t === 'double' || t === 'glass-door') {
    const sgn = swingSide(o, w, C.p, C.n);
    const leaf = (hinge, closed, len) => {
      const open = [hinge.p[0] + C.n[0] * sgn * len, hinge.p[1] + C.n[1] * sgn * len];
      const v1 = [X(closed[0]) - X(hinge.p[0]), Y(closed[1]) - Y(hinge.p[1])];
      const v2 = [X(open[0]) - X(hinge.p[0]), Y(open[1]) - Y(hinge.p[1])];
      const sweep = v1[0] * v2[1] - v1[1] * v2[0] > 0 ? 1 : 0;
      const r = +(len * S).toFixed(2);
      return lineEl(hinge.p, open, leafAttrs) + `<path d="M ${X(closed[0])} ${Y(closed[1])} A ${r} ${r} 0 0 ${sweep} ${X(open[0])} ${Y(open[1])}" ${thin} stroke-dasharray="${R('dashFine')}"/>`;
    };
    if (t === 'double') {
      const half = (hi - lo) / 2;
      const mid = wallPoint(w, lo + half).p;
      out += leaf(A, mid, half) + leaf(Bp, mid, half);
    } else if (hangsAtA(o, w, C, 'hinge')) {
      out += leaf(A, Bp.p, hi - lo);
    } else {
      out += leaf(Bp, A.p, hi - lo);
    }
    if (t === 'glass-door') out += glassPiece(w, lo, hi, o.glass?.kind === 'frosted', R('windowGap') / 2);
    if (t === 'fire-door') out += lineEl(A.p, Bp.p, `stroke="#d32f2f" stroke-width="${R('thinStroke')}" stroke-dasharray="${R('dashShort')}"`);
  } else if (t === 'roller') {
    out += lineEl(A.p, Bp.p, `stroke="${INK}" stroke-width="${R('leafStroke')}" stroke-dasharray="${R('dashRoller')}"`);
  } else if (t === 'gate') {
    out += lineEl(A.p, Bp.p, `stroke="#6b4f3a" stroke-width="${R('leafStroke')}" stroke-dasharray="${R('dashGate')}"`);
  } else if (t === 'grille') {
    const n = Math.max(2, Math.round((hi - lo) / R('tickM')));
    for (let i = 1; i < n; i++) {
      const q = wallPoint(w, lo + ((hi - lo) * i) / n);
      out += lineEl(edge(q, -1), edge(q, 1), thin);
    }
  } else if (t === 'hatch') {
    out += lineEl(edge(A, -1), edge(Bp, 1), thin) + lineEl(edge(A, 1), edge(Bp, -1), thin);
  }
  return out; // arch: gap and end ticks only
}

// 2f decisions 7, 8: a name counts only when it is not empty, not the id and does not start with the id (older files)
const plainName = (o) => !!o.name && o.name !== o.id && !o.name.startsWith(o.id);

function stairSym(s, onFrom) {
  const r = s.rect;
  const dir = DIRS[s.up] ?? DIRS.N;
  const vertical = dir[0] === 0;
  const len = vertical ? r[3] - r[1] : r[2] - r[0];
  const n = Math.max(2, s.risers ?? Math.round(len / FACT_GOING));
  const stroke = `stroke="#555" stroke-width="${R('gridStroke')}"`;
  let out = rectEl(r, `fill="${onFrom ? '#e8e8e8' : 'none'}" stroke="#555" stroke-width="${R('thinStroke')}"${onFrom ? '' : ` stroke-dasharray="${R('dashMid')}"`}`);
  if (onFrom) {
    for (let i = 1; i < n; i++) {
      const f = len * (i / n);
      out += vertical ? lineEl([r[0], r[1] + f], [r[2], r[1] + f], stroke) : lineEl([r[0] + f, r[1]], [r[0] + f, r[3]], stroke);
    }
  }
  const c = rectCentre(r);
  const sgn = onFrom ? 1 : -1;
  const half = len / 2 - R('tickM');
  const tail = [c[0] - dir[0] * half * sgn, c[1] - dir[1] * half * sgn];
  const head = [c[0] + dir[0] * half * sgn, c[1] + dir[1] * half * sgn];
  const ink = `stroke="#111" stroke-width="${R('leafStroke')}"`;
  out += lineEl(tail, head, ink);
  const ah = R('arrowHead') / S;
  const side = [-dir[1], dir[0]];
  const back = [head[0] - dir[0] * sgn * ah, head[1] - dir[1] * sgn * ah];
  out += polyEl([[back[0] + side[0] * ah, back[1] + side[1] * ah], head, [back[0] - side[0] * ah, back[1] - side[1] * ah]], ink);
  return out; // the label is placed by allLabels
}
const FACT_GOING = FACT('stair.going');

function ladderSym(l) {
  const dir = DIRS[l.facing] ?? DIRS.N;
  const side = [-dir[1], dir[0]];
  const hw = FACT('ladder.width') / 2;
  const depth = R('ladderDepth');
  const p = (u, v) => [l.at[0] + side[0] * u + dir[0] * v, l.at[1] + side[1] * u + dir[1] * v];
  const ink = `stroke="#111" stroke-width="${R('leafStroke')}"`;
  let out = lineEl(p(-hw, 0), p(-hw, depth), ink) + lineEl(p(hw, 0), p(hw, depth), ink);
  const rungs = Math.max(2, Math.round(depth / FACT('ladder.rungSpacing') * S));
  for (let i = 0; i <= rungs; i++) out += lineEl(p(-hw, (depth * i) / rungs), p(hw, (depth * i) / rungs), `stroke="#111" stroke-width="${R('thinStroke')}"`);
  return out;
}

function voidSym(v) {
  const r = v.rect;
  const ink = `stroke="#333" stroke-width="${R('thinStroke')}"`;
  return rectEl(r, `fill="none" ${ink} stroke-dasharray="${R('dashMid')}"`)
    + lineEl([r[0], r[1]], [r[2], r[3]], ink) + lineEl([r[0], r[3]], [r[2], r[1]], ink);
}

// ON10: a roof on the plan of the level it was drawn on: the overhang dashed, the wall line thin, ridge and hip lines,
// arrows down the slope (the fall on a flat roof) and the ridge and eaves heights
function roofSym(rf) {
  const pl = roofPlan(rf);
  const ink = `stroke="#7a4b2a" stroke-width="${R('leafStroke')}"`;
  let out = rectEl(pl.outer, `fill="none" ${ink} stroke-dasharray="${R('dashMid')}"`) + rectEl(pl.wall, `fill="none" stroke="#7a4b2a" stroke-width="${R('thinStroke')}"`);
  for (const [a, b] of [...pl.ridges, ...pl.hips]) out += lineEl(a, b, ink);
  for (const ar of pl.arrows) {
    out += lineEl(ar.at, ar.to, ink);
    const dx = X(ar.to[0]) - X(ar.at[0]);
    const dy = Y(ar.to[1]) - Y(ar.at[1]);
    const L = Math.sqrt(dx * dx + dy * dy) || 1;
    const t = R('dotR') * 2;
    const [ux, uy] = [dx / L, dy / L];
    const tip = [X(ar.to[0]), Y(ar.to[1])];
    out += polyPx([tip, [tip[0] - ux * t - uy * t / 2, tip[1] - uy * t + ux * t / 2], [tip[0] - ux * t + uy * t / 2, tip[1] - uy * t - ux * t / 2]], 'fill="#7a4b2a"');
  }
  for (const lb of pl.labels) out += textAt(lb.at, 2, -2, lb.text, R('fontSmall'), `fill="#7a4b2a" ${HALO()}`);
  return `<g data-id="roofs:${esc(rf.id)}">${out}</g>`;
}

const levelSpan = (l) => [l.floor, l.floor + l.height];

const overlap1 = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

/** A footprint as a list of rects: one rect or a list of rects ([] when it is neither). */
const rectsOf = (v) => {
  const rect = (r) => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite);
  return rect(v) ? [v] : Array.isArray(v) && v.length > 0 && v.every(rect) ? v : [];
};
/** Building footprints with their ids: meta.buildings, else the one meta.footprint. */
const BUILDINGS = (arch.meta?.buildings ?? []).filter((b) => rectsOf(b?.footprint).length).map((b) => ({ id: b.id, name: b.name, rect: b.footprint }));
const FOOTPRINTS = BUILDINGS.length ? BUILDINGS : rectsOf(arch.meta?.footprint).map((rect) => ({ rect }));

/**
 * Levels may overlap in height when their footprints do not (a single-storey hall block beside a two-storey strip). On a level with its own
 * footprint whose height span overlaps another level's, an exterior element or service is drawn only where it touches that footprint
 * (grown by twice the exterior wall thickness). Any other level draws every element in its height span, as before.
 */
function touchesLevel(level, pts) {
  const own = rectsOf(level.footprint);
  const [lo, hi] = levelSpan(level);
  if (!own.length || !levels.some((o) => o !== level && overlap1(lo, hi, ...levelSpan(o)) > 1e-6)) return true;
  const g = FACT('rules.wallExterior') * 2; // an exterior element stands on the facade, a little outside the wall centreline
  const bx = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
  const bz = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
  return own.some((r) => bx[1] >= r[0] - g && bx[0] <= r[2] + g && bz[1] >= r[1] - g && bz[0] <= r[3] + g);
}

// ---------- labels (2g-2) ----------
// Every label kind (room, stair, ladder, void, building) goes through one obstacle test: the box must sit clear of the boxes already
// drawn (stairs, voids, ladders, objects, exterior element labels), the walls and the labels placed before it. A label that fails goes
// to a callout column: west for pieces whose centre is west of the middle of the gap between the buildings, east otherwise.
const GREY = '#888';
const ID_SCALE = 0.6; // the id and the level tag are 60% of the name's font size
let callouts = [];
let calloutCol = 0; // width of the east column
let calloutLeft = 0; // width of the west column
let calloutBottom = 0;
let labelBoxes = []; // px boxes of every label drawn on this level, for the overlap count
let labelStats = { boxes: 0, overlaps: 0, crossings: 0 };
let leaders = []; // leader lines: { segs: [[p1, p2] px], own: index of the leader's own box in labelBoxes }
let drawnBuildings = []; // footprints (m) of the buildings that have rooms on the level being drawn
const SHORT_REACH = 8; // m: a callout that does not fit inside its room first looks for a free spot this near its anchor

const boxOf = (lines) => ({ w: Math.max(...lines.map((l) => l.t.length * l.size * R('charWidth'))), h: lines.reduce((s, l) => s + l.size * R('lineHeight'), 0) });
const inter = (a, b) => overlap1(a[0], a[2], b[0], b[2]) * overlap1(a[1], a[3], b[1], b[3]);
const hyp = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
const rectOfPx = (rc) => [X(rc[0]), Y(rc[3]), X(rc[2]), Y(rc[1])];
/** Lines with their own sizes, centred on a point in metres. */
function drawLines(c, lines) {
  let y = Y(c[1]) - boxOf(lines).h / 2;
  return lines.map((l) => {
    const lh = l.size * R('lineHeight');
    const out = textPx(X(c[0]), y + lh * 0.8, l.t, l.size, `text-anchor="middle" fill="${l.grey ? GREY : INK}" ${l.bold ? 'font-weight="bold" ' : ''}${HALO()}`);
    y += lh;
    return out;
  }).join('');
}
/** Name over a small grey id and tag, in three shapes: the name on one line, the name wrapped, the wrapped name in the small font. */
function labelVariants(name, small, size, tag, dims) {
  const sub = (t, sz) => ({ t, size: Math.max(1, sz * ID_SCALE), grey: true });
  const words = name.split(' ');
  let wrapped = [name], gap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (Math.abs(a.length - b.length) < gap) { gap = Math.abs(a.length - b.length); wrapped = [a, b]; }
  }
  const full = [{ t: name, size }, sub(small, size), ...(tag ? [sub(dims ? `${tag} - ${dims}` : tag, size)] : [])];
  const narrow = (sz) => [...wrapped.map((t) => ({ t, size: sz })), sub(small, sz), ...(tag ? [sub(tag, sz)] : [])];
  return [full, narrow(size), narrow(Math.min(size, R('fontSmall')))];
}

/** True when the segment (px) runs through the interior of the box [x0, y0, x1, y1] (px). */
function segHitsBox(p1, p2, r) {
  const [x1, y1] = p1, [x2, y2] = p2;
  let t0 = 0, t1 = 1;
  const clip = (p, q) => { if (p === 0) return q >= 0; const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
  return clip(-(x2 - x1), x1 - r[0]) && clip(x2 - x1, r[2] - x1) && clip(-(y2 - y1), y1 - r[1]) && clip(y2 - y1, r[3] - y1) && t1 - t0 > 1e-6;
}
const hitsLabel = (p1, p2) => labelBoxes.some((b) => segHitsBox(p1, p2, b));

/** The footprint of a building that the segment (px) from an anchor outside it crosses, or null. */
function blockingBuilding(anchor, p1, p2) {
  const [x1, y1] = p1, [x2, y2] = p2;
  for (const b of BUILDINGS) {
    if (inRect(b.rect, anchor[0], anchor[1])) continue;
    const r = rectOfPx(b.rect);
    let t0 = 0, t1 = 1;
    const clip = (p, q) => { if (p === 0) return q >= 0; const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
    if (clip(-(x2 - x1), x1 - r[0]) && clip(x2 - x1, r[2] - x1) && clip(-(y2 - y1), y1 - r[1]) && clip(y2 - y1, r[3] - y1) && t1 - t0 > 1e-6) return b;
  }
  return null;
}
// the middle of the gap between the buildings (03B section 1: x 46); the middle of the site when there are not two buildings
const MID_X = BUILDINGS.length === 2 ? (Math.max(...BUILDINGS.map((b) => b.rect[0])) + Math.min(...BUILDINGS.map((b) => b.rect[2]))) / 2 : (B[0] + B[2]) / 2;

/**
 * Places one label. item: { name, small (id line), tag, dims, size, bold, anchor (metres), region (px box the label must stay in, or null),
 * spots (candidate centres in metres, best first), dotSpots (where a callout dot may go) }. Returns the SVG, or queues a callout and returns ''.
 */
function placeLabel(item, obstacles) {
  const variants = labelVariants(item.name, item.small, item.size, item.tag, item.dims).map((v) => v.map((l, i) => (i === 0 && item.bold ? { ...l, bold: true } : l)));
  const cost = (p, bw, bh, free = false) => {
    const box = [X(p[0]) - bw / 2, Y(p[1]) - bh / 2, X(p[0]) + bw / 2, Y(p[1]) + bh / 2];
    let sum = 0;
    for (const o of obstacles) sum += inter(box, o);
    for (const o of labelBoxes) sum += inter(box, o);
    for (const l of leaders) for (const sg of l.segs) if (segHitsBox(sg[0], sg[1], box)) sum += 1e6; // a leader line is an obstacle too
    if (item.region && !free) sum += (bw - overlap1(box[0], box[2], item.region[0], item.region[2])) * bh + (bh - overlap1(box[1], box[3], item.region[1], item.region[3])) * bw;
    return sum;
  };
  for (const v of variants) {
    const { w, h } = boxOf(v);
    const fit = item.spots.find((p) => Math.round(cost(p, w, h)) === 0); // whole px2 only: float noise is not an overlap
    if (fit) {
      labelBoxes.push([X(fit[0]) - w / 2, Y(fit[1]) - h / 2, X(fit[0]) + w / 2, Y(fit[1]) + h / 2]);
      return drawLines(fit, v);
    }
  }
  const dotBox = R('dotR') * 2;
  const dots = item.dotSpots.map((p, i) => ({ p, i, c: cost(p, dotBox, dotBox) })).sort((a, b) => a.c - b.c || a.i - b.i).slice(0, 60).map((d) => d.p); // best first
  const dot = dots[0];
  // one callout size: the plan's small label size
  const calloutLines = labelVariants(item.name, item.small, R('fontSmall'), item.tag, item.dims)[0].map((l, i) => (i === 0 && item.bold ? { ...l, bold: true } : l));
  const cb = boxOf(calloutLines);
  const ap = [X(dot[0]), Y(dot[1])];
  const site = [X(B[0]), Y(B[3]), X(B[2]), Y(B[1])];
  for (let r = 1; r <= SHORT_REACH; r += 0.5) for (let k = 0; k < 24; k++) {
    const a = k * Math.PI / 12, p = [dot[0] + Math.cos(a) * r, dot[1] + Math.sin(a) * r];
    const box = [X(p[0]) - cb.w / 2, Y(p[1]) - cb.h / 2, X(p[0]) + cb.w / 2, Y(p[1]) + cb.h / 2];
    if (box[0] < site[0] || box[1] < site[1] || box[2] > site[2] || box[3] > site[3]) continue;
    if (drawnBuildings.some((b) => Math.round(inter(box, rectOfPx(b))) > 0)) continue;
    if (Math.round(cost(p, cb.w, cb.h, true)) !== 0) continue;
    const end = [Math.min(Math.max(ap[0], box[0]), box[2]), Math.min(Math.max(ap[1], box[1]), box[3])];
    if (end[0] === ap[0] && end[1] === ap[1]) continue;
    if (hitsLabel(ap, end) || blockingBuilding(dot, ap, end)) continue;
    labelBoxes.push(box);
    leaders.push({ segs: [[ap, end]], own: labelBoxes.length - 1 });
    return `<line x1="${ap[0]}" y1="${ap[1]}" x2="${+end[0].toFixed(2)}" y2="${+end[1].toFixed(2)}" stroke="${INK}" stroke-width="${R('markStroke')}"/><circle cx="${ap[0]}" cy="${ap[1]}" r="${R('dotR') / 2}" fill="${INK}"/>${drawLines(p, calloutLines)}`;
  }
  callouts.push({ lines: calloutLines, anchor: dot, dots, west: dot[0] < MID_X });
  return '';
}

/** Draws the queued callouts in a west and an east column, stacked top down; a leader line that would cross another building bends round it. */
function calloutLayer() {
  if (!callouts.length) return '';
  const reach = (arch.exterior ?? []).map((e) => Math.max(X(e.a[0]), X(e.b[0])) + R('dotR') * 1.5 + `${e.id} ${e.kind}`.length * R('fontSmall') * R('charWidth'));
  const colE = Math.max(X(B[2]), ...reach) + R('legendGap');
  const colW = X(B[0]) - R('legendGap');
  let out = '';
  for (const west of [true, false]) {
    const items = callouts.filter((k) => k.west === west).map((k) => ({ ...k, ...boxOf(k.lines), y: Y(k.anchor[1]) })).sort((a, b) => a.y - b.y);
    const taken = []; // [top, bottom] of the slots already used in this column
    for (const k of items) {
      const pad = R('calloutPad');
      const edge = west ? colW + R('calloutGap') : colE - R('calloutGap');
      const x = west ? colW : colE;
      const stroke = `stroke="${INK}" stroke-width="${R('markStroke')}" fill="none"`;
      // slots nearest the anchor first: level with it, then alternately below and above in half-box steps
      const topAt = (shift) => k.y - k.h / 2 + (shift % 2 ? 1 : -1) * Math.ceil(shift / 2) * (k.h + pad) / 2;
      const free = (t) => t >= TOP && taken.every((q) => t + k.h + pad <= q[0] || t >= q[1] + pad);
      let top = topAt(0), route = null, ax = X(k.anchor[0]), ay = Y(k.anchor[1]);
      for (const anc of k.dots) { // the best anchor spot first; another spot when no leader from it is clear
        const px = X(anc[0]), py = Y(anc[1]);
        const clear = (pts) => pts.every((p, i) => i === 0 || (!hitsLabel(pts[i - 1], p) && !blockingBuilding(anc, pts[i - 1], p)));
        const bends = (mid) => {
          const list = [[[px, py], [px, mid], [edge, mid]], [[px, py], [edge, py], [edge, mid]]];
          const hit = blockingBuilding(anc, [px, py], [edge, mid]);
          if (hit) {
            const north = anc[1] >= (hit.rect[1] + hit.rect[3]) / 2;
            const yv = north ? Y(hit.rect[3]) - R('legendGap') : Y(hit.rect[1]) + R('legendGap');
            list.push([[px, py], [px, yv], [edge, yv], [edge, mid]]);
          }
          return list;
        };
        for (let shift = 0; shift < 60 && !route; shift++) { // a straight leader, then the next free slots down; every fourth slot also tries the single-bend routes
          const t = topAt(shift), pts = [[px, py], [edge, t + k.h / 2]];
          if (!free(t)) continue;
          if (clear(pts)) { top = t; route = pts; } else if (shift % 4 === 3) { const found = bends(t + k.h / 2).find(clear); if (found) { top = t; route = found; } }
        }
        if (route) { ax = px; ay = py; break; }
      }
      if (!route) { for (let shift = 0; shift < 200; shift++) if (free(topAt(shift))) { top = topAt(shift); break; } route = [[ax, ay], [edge, top + k.h / 2]]; }
      taken.push([top, top + k.h]);
      out += route.length === 2
        ? `<line x1="${ax}" y1="${ay}" x2="${+route[1][0].toFixed(2)}" y2="${+route[1][1].toFixed(2)}" ${stroke}/>`
        : `<polyline points="${route.map((p) => `${+p[0].toFixed(2)},${+p[1].toFixed(2)}`).join(' ')}" ${stroke}/>`;
      out += `<circle cx="${ax}" cy="${ay}" r="${R('dotR') / 2}" fill="${INK}"/>`;
      let y = top;
      for (const l of k.lines) {
        const lh = l.size * R('lineHeight');
        out += textPx(x, y + lh * 0.8, l.t, l.size, `text-anchor="${west ? 'end' : 'start'}" fill="${l.grey ? GREY : INK}"${l.bold ? ' font-weight="bold"' : ''}`);
        y += lh;
      }
      labelBoxes.push(west ? [x - k.w, top, x, top + k.h] : [x, top, x + k.w, top + k.h]);
      leaders.push({ segs: route.slice(1).map((p, i) => [route[i], p]), own: labelBoxes.length - 1 });
      if (west) calloutLeft = Math.max(calloutLeft, k.w + R('legendGap') * 2 - M);
      else calloutCol = Math.max(calloutCol, colE - X(B[2]) + k.w + R('legendGap'));
    }
    calloutBottom = Math.max(calloutBottom, ...taken.map((q) => q[1]));
  }
  return out;
}

/** Candidate centres (metres) over a rect, nearest the anchor first. */
function gridSpots(c, anchor, n, spread) {
  const w = c[2] - c[0], d = c[3] - c[1];
  const spots = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const fx = (n > 1 ? i / (n - 1) - 0.5 : 0) * spread, fz = (n > 1 ? j / (n - 1) - 0.5 : 0) * spread;
    spots.push([(c[0] + c[2]) / 2 + fx * w, (c[1] + c[3]) / 2 + fz * d]);
  }
  return spots.sort((a, b) => hyp(a, anchor) - hyp(b, anchor));
}

/** Builds and places every label of a level: rooms first, then buildings, stairs, ladders and voids. */
function allLabels(level) {
  labelBoxes = [];
  leaders = [];
  drawnBuildings = BUILDINGS.filter((b) => (arch.rooms ?? []).some((r) => r.level === level.id && inRect(b.rect, (r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2))).map((b) => b.rect);
  const here = (o) => o.level === level.id;
  const [lo, hi] = levelSpan(level);
  const obstacles = [
    ...(arch.stairs ?? []).filter((s) => s.from === level.id || s.to === level.id).map((s) => rectOfPx(s.rect)),
    ...(arch.voids ?? []).filter(here).map((v) => rectOfPx(v.rect)),
    ...(arch.objects ?? []).filter(here).map((o) => rectOfPx(o.rect)),
    ...(arch.ladders ?? []).filter((l) => l.from === level.id || l.to === level.id).map((l) => {
      const dir = DIRS[l.facing] ?? DIRS.N, side = [-dir[1], dir[0]], hw = FACT('ladder.width') / 2, dp = R('ladderDepth');
      const pts = [[-hw, 0], [hw, dp]].map(([u, v]) => [l.at[0] + side[0] * u + dir[0] * v, l.at[1] + side[1] * u + dir[1] * v]);
      return rectOfPx([Math.min(pts[0][0], pts[1][0]), Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][0], pts[1][0]), Math.max(pts[0][1], pts[1][1])]);
    }),
    ...walls.filter(here).map((w) => { const h = w.t / 2; return rectOfPx([Math.min(w.a[0], w.b[0]) - h, Math.min(w.a[1], w.b[1]) - h, Math.max(w.a[0], w.b[0]) + h, Math.max(w.a[1], w.b[1]) + h]); }),
  ];
  for (const e of arch.exterior ?? []) { // the text drawn by baseLayers beside each exterior element
    if (e.y1 < lo || e.y0 > hi || !touchesLevel(level, [e.a, e.b])) continue;
    const size = R('fontSmall'), x = X(e.a[0]) + R('dotR') * 1.5, y = Y(e.a[1]) - R('dotR');
    const b = [x, y - size, x + `${e.id} ${e.kind}`.length * size * R('charWidth'), y];
    obstacles.push(b);
    labelBoxes.push(b);
  }
  const rooms = (arch.rooms ?? []).filter(here);
  const area = (r) => (r.rect[2] - r.rect[0]) * (r.rect[3] - r.rect[1]);
  const roomAt = (p) => rooms.filter((r) => inRect(r.rect, p[0], p[1])).sort((a, b) => area(a) - area(b))[0];
  const tagOf = (r) => (r.kind === 'lane' ? 'Outside' : r.ring === 0 ? 'Perimeter' : `Level ${r.ring ?? '?'}`);
  let out = '';
  for (const r of rooms) {
    const c = clearRect(r, walls);
    const size = Math.min(c[2] - c[0], c[3] - c[1]) * S < R('labelSmallBelow') ? R('fontSmall') : R('fontRoom');
    const spots = gridSpots(c, rectCentre(r.rect), R('labelSteps'), R('labelSpread'));
    out += placeLabel({ name: plainName(r) ? r.name : r.id, small: r.id, tag: tagOf(r), dims: `${fmt(c[2] - c[0])} x ${fmt(c[3] - c[1])} clear`, size, anchor: rectCentre(r.rect), dotSpots: spots, spots, region: rectOfPx(c) }, obstacles);
  }
  for (const b of BUILDINGS) { // just outside the top edge, else just outside the bottom edge
    const size = R('fontLegend'), pad = R('legendGap') / 2;
    const nm = b.name && !b.name.startsWith('Building') ? b.name : `Building ${b.id}`;
    const probe = boxOf([{ t: nm, size }, { t: `Building ${b.id}`, size: size * ID_SCALE }]);
    const spots = [];
    for (const f of [0.5, 0.3, 0.7, 0.15, 0.85]) for (const top of [true, false]) {
      spots.push([b.rect[0] + (b.rect[2] - b.rect[0]) * f, top ? b.rect[3] + (probe.h / 2 + pad) / S : b.rect[1] - (probe.h / 2 + pad) / S]);
    }
    out += placeLabel({ name: nm, small: `Building ${b.id}`, size, bold: true, anchor: rectCentre(b.rect), spots, dotSpots: [[b.rect[0], b.rect[3]]], region: null }, obstacles);
  }
  const near = (p) => {
    const rm = roomAt(p);
    const c = rm ? clearRect(rm, walls) : [p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3];
    return { region: rectOfPx(c), spots: gridSpots(c, p, 13, 0.9) };
  };
  for (const s of arch.stairs ?? []) {
    const onFrom = s.from === level.id;
    if (!onFrom && s.to !== level.id) continue;
    const c = rectCentre(s.rect);
    out += placeLabel({ name: plainName(s) ? s.name : s.id, small: s.id, tag: onFrom ? 'Up' : 'Down', size: R('fontSmall'), anchor: c, dotSpots: [c], ...near(c) }, obstacles);
  }
  for (const l of arch.ladders ?? []) {
    if (l.from !== level.id && l.to !== level.id) continue;
    out += placeLabel({ name: plainName(l) ? l.name : l.id, small: l.id, tag: `${l.from} to ${l.to}`, size: R('fontSmall'), anchor: l.at, dotSpots: [l.at], ...near(l.at) }, obstacles);
  }
  for (const v of (arch.voids ?? []).filter(here)) {
    const c = rectCentre(v.rect);
    out += placeLabel({ name: plainName(v) ? v.name : v.kind, small: v.id, size: R('fontSmall'), anchor: c, dotSpots: [c], ...near(c) }, obstacles);
  }
  return out;
}

/** After calloutLayer: counts the label boxes and the pairs that intersect. */
function countOverlaps() {
  let k = 0;
  for (let i = 0; i < labelBoxes.length; i++) for (let j = i + 1; j < labelBoxes.length; j++) if (Math.round(inter(labelBoxes[i], labelBoxes[j])) > 0) k++;
  let c = 0;
  for (const l of leaders) for (const sg of l.segs) labelBoxes.forEach((b, i) => { if (i !== l.own && segHitsBox(sg[0], sg[1], b)) c++; });
  labelStats = { boxes: labelBoxes.length, overlaps: k, crossings: c };
}

function baseLayers(level) {
  callouts = [];
  const here = (o) => o.level === level.id;
  let out = '';
  for (const r of (arch.rooms ?? []).filter(here)) out += rectEl(r.rect, `data-id="rooms:${esc(r.id)}" fill="${(r.kind === 'lane' ? OUTSIDE_TINT : RING_TINT[r.ring]) ?? '#eeeeee'}" fill-opacity="${R('tintOpacity')}" stroke="none"`);
  // structural bay grid. One building (or none): lines across the site, anchored on the footprint corner. Several buildings: each building's
  // own lines, anchored on its own corner and drawn inside its footprint.
  const bay = arch.meta?.bay;
  if (bay && bay[0] > 0 && bay[1] > 0) {
    const gridStroke = `stroke="${GRID}" stroke-width="${R('gridStroke')}"`;
    if (BUILDINGS.length > 1) {
      for (const b of BUILDINGS) {
        const [x0, z0, x1, z1] = b.rect;
        for (let x = x0; x <= x1 + 1e-6; x += bay[0]) out += lineEl([x, z0], [x, z1], gridStroke);
        for (let z = z0; z <= z1 + 1e-6; z += bay[1]) out += lineEl([x0, z], [x1, z], gridStroke);
      }
    } else {
      const f = FOOTPRINTS[0]?.rect;
      const ox = f && f[2] > f[0] ? f[0] : B[0];
      const oz = f && f[3] > f[1] ? f[1] : B[1];
      for (let x = ox - Math.floor((ox - B[0]) / bay[0]) * bay[0]; x <= B[2] + 1e-6; x += bay[0]) out += lineEl([x, B[1]], [x, B[3]], gridStroke);
      for (let z = oz - Math.floor((oz - B[1]) / bay[1]) * bay[1]; z <= B[3] + 1e-6; z += bay[1]) out += lineEl([B[0], z], [B[2], z], gridStroke);
    }
  }
  // each building's footprint outline, labelled with its id (campus files only)
  for (const b of BUILDINGS) {
    out += rectEl(b.rect, `fill="none" stroke="#555" stroke-width="${R('outlineStroke')}" stroke-dasharray="${R('dashMid')}"`);
  }
  out += rectEl(B, `fill="none" stroke="#999" stroke-width="${R('siteStroke')}" stroke-dasharray="${R('dashLong')}"`);
  for (const o of (arch.objects ?? []).filter(here)) {
    out += rectEl(o.rect, `fill="#b9b9b9" stroke="#666" stroke-width="${R('objectStroke')}"`);
    // an id that does not fit inside its object (a row of racks) is left off; the id stays in the arch file
    const fits = (o.rect[2] - o.rect[0]) * S >= o.id.length * R('fontSmall') * R('charWidth') && (o.rect[3] - o.rect[1]) * S >= R('fontSmall') * R('lineHeight');
    if (fits) out += labelLines(rectCentre(o.rect), [o.id], R('fontSmall'), 'fill="#222"');
  }
  for (const w of walls.filter(here)) out += `<g data-id="walls:${esc(w.id)}">${drawWall(w)}</g>`;
  for (const o of arch.openings ?? []) if (wallById.get(o.wall)?.level === level.id) out += `<g data-id="openings:${esc(o.id)}">${drawOpening(o)}</g>`;
  for (const s of arch.stairs ?? []) {
    if (s.from === level.id) out += stairSym(s, true);
    else if (s.to === level.id) out += stairSym(s, false);
  }
  for (const l of arch.ladders ?? []) if (l.from === level.id || l.to === level.id) out += ladderSym(l);
  for (const v of (arch.voids ?? []).filter(here)) out += voidSym(v);
  for (const rf of (arch.roofs ?? []).filter(here)) out += roofSym(rf);
  const [lo, hi] = levelSpan(level);
  for (const e of arch.exterior ?? []) {
    if (e.y1 < lo || e.y0 > hi || !touchesLevel(level, [e.a, e.b])) continue;
    const col = e.climbable ? '#1c9c3f' : '#777';
    out += e.a[0] === e.b[0] && e.a[1] === e.b[1]
      ? dotEl(e.a, R('dotR'), `fill="${col}" stroke="#222" stroke-width="${R('thinStroke')}"`)
      : lineEl(e.a, e.b, `stroke="${col}" stroke-width="${R('outlineStroke')}" stroke-dasharray="${R('dashLong')}"`);
    out += textAt(e.a, R('dotR') + R('dotR') / 2, -R('dotR'), `${e.id} ${e.kind}`, R('fontSmall'), `fill="${col}"`);
  }
  for (const sv of arch.services ?? []) {
    const ys = sv.path.map((p) => p[1]);
    if (Math.max(...ys) < lo || Math.min(...ys) > hi || !touchesLevel(level, sv.path.map((p) => [p[0], p[2]]))) continue;
    out += polyEl(sv.path.map((p) => [p[0], p[2]]), `stroke="#00838f" stroke-width="${R('thinStroke')}" stroke-dasharray="${R('dashDot')}"`);
  }
  out += allLabels(level);
  out += calloutLayer();
  countOverlaps();
  return out;
}

// ---------- play overlay ----------
const onLevel = (pt, level) => Array.isArray(pt) && pt[2] === level.id;
function playLayers(level) {
  let out = '';
  const dot = R('dotR');
  const small = R('fontSmall');
  for (const rt of play.routes ?? []) {
    const col = ROUTE_COLOUR[rt.kind] ?? '#555';
    const dash = rt.kind === 'critical' ? ` stroke-dasharray="${R('dashRoute')}"` : '';
    let run = [];
    const flush = () => {
      if (run.length > 1) out += polyEl(run, `stroke="${col}" stroke-width="${R('routeStroke')}" stroke-linejoin="round"${dash}`);
      run = [];
    };
    for (const pt of rt.points ?? []) {
      if (onLevel(pt, level)) run.push(pt); else flush();
    }
    flush();
  }
  for (const g of play.guards ?? []) {
    const here = (g.loop ?? []).filter((s) => onLevel(s.at, level));
    if (here.length > 1) out += polyEl(here.length === (g.loop ?? []).length ? [...here.map((s) => s.at), here[0].at] : here.map((s) => s.at), `stroke="#333" stroke-width="${R('loopStroke')}"`);
    for (const s of here) {
      out += dotEl(s.at, dot, 'fill="#333"');
      const rad = ((s.face ?? 0) * Math.PI) / 180;
      out += lineEl(s.at, [s.at[0] + Math.sin(rad) * R('faceTick'), s.at[1] + Math.cos(rad) * R('faceTick')], `stroke="#333" stroke-width="${R('leafStroke')}"`);
      out += textAt(s.at, dot + 1, -dot, `${s.wait ?? 0}s`, small, 'fill="#333"');
    }
    if (here[0]) out += textAt(here[0].at, -dot, small + dot, g.id, small, 'fill="#333" font-weight="bold"');
  }
  for (const lu of play.lures ?? []) {
    const from = (play.guards ?? []).find((x) => x.id === lu.guard)?.loop?.[0]?.at;
    if (from && onLevel(from, level) && onLevel(lu.sendsTo, level)) out += lineEl(from, lu.sendsTo, `stroke="#8d6e00" stroke-width="${R('thinStroke')}" stroke-dasharray="${R('dashShort')}"`);
    if (onLevel(lu.sendsTo, level)) out += textAt(lu.sendsTo, dot, small, lu.id, small, 'fill="#8d6e00"');
  }
  for (const lp of play.lamps ?? []) {
    if (findLevel(levels, roomById.get(lp.room)?.level)?.id !== level.id) continue;
    out += dotEl([lp.at[0], lp.at[2]], R('lampR'), `fill="#ffd400" stroke="#8d6e00" stroke-width="${R('lampStroke')}"`);
  }
  for (const v of play.vantages ?? []) {
    if (!onLevel(v.at, level)) continue;
    out += starPx(v.at, R('starR'), `fill="#ffb300" stroke="#222" stroke-width="${R('markStroke')}"`) + textAt(v.at, R('starR'), -R('starR'), v.id, small, 'fill="#222"');
  }
  for (const h of play.hides ?? []) {
    if (!onLevel(h.at, level)) continue;
    out += squarePx(h.at, R('squareSize'), `fill="#5c6bc0" stroke="#222" stroke-width="${R('markStroke')}"`) + textAt(h.at, R('squareSize') / 2 + 1, R('squareSize') / 2, h.id, small, 'fill="#222"');
  }
  for (const o of play.objectives ?? []) {
    if (!onLevel(o.at, level)) continue;
    const x = X(o.at[0]);
    const y = Y(o.at[1]);
    const fh = R('flagH');
    out += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - fh}" stroke="#222" stroke-width="${R('outlineStroke')}"/>`;
    out += polyPx([[x, y - fh], [x + fh * R('flagFrac'), y - fh + fh / 4], [x, y - fh / 2]], `fill="${o.optional ? '#90a4ae' : '#d32f2f'}" stroke="#222" stroke-width="${R('markStroke')}"`);
    out += textPx(x + dot / 2, y + small, `${o.id}${o.order ? ' #' + o.order : ''}`, small, 'fill="#222"');
  }
  for (const sp of play.spawns ?? []) if (onLevel(sp, level)) out += triPx(sp, R('triSize'), '#2e7d32');
  for (const c of play.checkpoints ?? []) {
    if (!onLevel(c.at, level)) continue;
    const t = R('squareSize') / 2;
    const x = X(c.at[0]);
    const y = Y(c.at[1]);
    out += polyPx([[x, y - t], [x + t, y], [x, y + t], [x - t, y]], `fill="#fff" stroke="#222" stroke-width="${R('outlineStroke')}"`) + textPx(x + t + 1, y - t, c.id, small, 'fill="#222"');
  }
  for (const t of play.traversal ?? []) if (onLevel(t.approach, level)) out += textAt(t.approach, 0, 0, `${t.id} ${t.kind}`, small, `fill="#b71c1c" ${HALO()}`);
  for (const c of play.coop ?? []) {
    if (!onLevel(c.at, level)) continue;
    out += dotEl(c.at, dot * 2, `fill="#f57c00" stroke="#222" stroke-width="${R('markStroke')}"`) + textAt(c.at, dot * 3, 0, `${c.id} ${c.kind}`, small, 'fill="#e65100"');
  }
  if (play.extraction?.level === level.id && play.extraction.rect) {
    const r = play.extraction.rect;
    out += rectEl(r, `fill="#00897b" fill-opacity="${R('fillExtract')}" stroke="#00897b" stroke-width="${R('leafStroke')}" stroke-dasharray="${R('dashLong')}"`);
    out += textPx(X(r[0]) + dot / 2, Y(r[3]) + small + dot / 2, 'EXTRACT', small, 'fill="#00695c"');
  }
  return out;
}

// ---------- security overlay ----------
function securityLayers(level) {
  let out = '';
  const opening = new Map((arch.openings ?? []).map((o) => [o.id, o]));
  const doorPoint = (id, fallback) => {
    const o = opening.get(id);
    const w = o && wallById.get(o.wall);
    return w ? wallPoint(w, o.at).p : fallback;
  };
  const fov = (FACT('security.cameraHFov') * Math.PI) / 180;
  const rng = FACT('security.cameraRange');
  const rad = (deg) => (deg * Math.PI) / 180;
  const tag = (pt, str) => textAt(pt, R('readerSize'), -R('readerSize'), str, R('fontSmall'), `fill="#7f0000" ${HALO()}`);
  for (const d of (security.devices ?? []).filter((x) => findLevel(levels, x.level)?.id === level.id)) {
    const at = d.at ?? [d.a?.[0] ?? 0, d.a?.[2] ?? 0];
    switch (d.kind) {
      case 'camera': {
        const [s0, s1] = d.sweep ?? [d.facing ?? 0, d.facing ?? 0];
        const a0 = rad(Math.min(s0, s1)) - fov / 2;
        const a1 = rad(Math.max(s0, s1)) + fov / 2;
        const pt = (a) => [at[0] + Math.sin(a) * rng, at[1] + Math.cos(a) * rng];
        const arc = [];
        const steps = R('camArcSteps');
        for (let i = 0; i <= steps; i++) arc.push(pt(a0 + ((a1 - a0) * i) / steps));
        out += polyEl([at, ...arc, at], `stroke="#c62828" stroke-width="${R('gridStroke')}"`);
        out += lineEl(at, pt(rad(d.facing ?? s0)), `stroke="#c62828" stroke-width="${R('gridStroke')}" stroke-dasharray="${R('dashFine')}"`);
        out += squarePx(at, R('camMark'), `fill="#c62828" stroke="#222" stroke-width="${R('markStroke')}"`) + tag(at, d.id);
        break;
      }
      case 'reader': {
        const p = doorPoint(d.door, at);
        out += squarePx(p, R('readerSize'), `fill="#1565c0" stroke="#fff" stroke-width="${R('outlineStroke')}"`) + tag(p, d.id);
        break;
      }
      case 'mantrap':
        for (const id of [d.door, d.door2]) if (id) out += squarePx(doorPoint(id, at), R('readerSize'), `fill="#6a1b9a" stroke="#fff" stroke-width="${R('outlineStroke')}"`);
        out += tag(at, d.id);
        break;
      case 'iris':
        out += dotEl(at, R('lampR'), `fill="#fff" stroke="#6a1b9a" stroke-width="${R('outlineStroke')}"`) + dotEl(at, R('lampR') / 2, 'fill="#6a1b9a"') + tag(at, d.id);
        break;
      case 'pir':
        out += dotEl(at, FACT('security.pirRange') * S, `fill="#ffd400" fill-opacity="${R('fillFaint')}" stroke="#b8860b" stroke-width="${R('thinStroke')}" stroke-dasharray="${R('dashShort')}"`) + dotEl(at, R('dotR'), 'fill="#b8860b"') + tag(at, d.id);
        break;
      case 'desk':
        out += starPx(at, R('starR'), `fill="#c62828" stroke="#222" stroke-width="${R('markStroke')}"`) + tag(at, d.id);
        break;
      case 'panel':
        out += squarePx(at, R('readerSize'), `fill="#fff" stroke="#c62828" stroke-width="${R('outlineStroke')}"`) + tag(at, d.id);
        break;
      case 'fault':
        out += triPx(at, R('triSize'), '#ff8f00') + tag(at, d.id);
        break;
      case 'beam': {
        const a = [d.a[0], d.a[2]];
        const b = [d.b[0], d.b[2]];
        out += lineEl(a, b, `stroke="#d50000" stroke-width="${R('beamStroke')}"`) + tag(a, `${d.id} ${fmt(d.a[1])}`);
        break;
      }
      default:
        out += dotEl(at, R('dotR'), 'fill="#999"');
    }
  }
  return out;
}

// ---------- frame, legends ----------
function flow(items, startX, startY, maxX, firstRowEnd) {
  const rowH = R('fontLegend') * R('lineHeight') * 2;
  let out = '';
  let x = startX;
  let y = startY;
  let rows = 1;
  for (const [label, draw] of items) {
    const w = R('legendTextDx') + label.length * R('fontLegend') * R('charWidth') + R('legendGap');
    if (x + w > maxX && x > M) {
      x = M;
      y += rowH;
      rows++;
    }
    out += draw(x, y) + textPx(x + R('legendTextDx'), y + R('fontLegend') / 3, label, R('fontLegend'), `fill="${INK}"`);
    x += w;
  }
  return { out, rows, rowH, bottom: y + rowH / 2 + (firstRowEnd ?? 0) };
}

const swatch = (fill) => (x, y) => `<rect x="${x}" y="${y - R('swatchH') / 2}" width="${R('swatchW')}" height="${R('swatchH')}" fill="${fill}" fill-opacity="${R('tintOpacity')}" stroke="#888" stroke-width="${R('gridStroke')}"/>`;
const sample = (c, dash, w) => (x, y) => `<line x1="${x}" y1="${y}" x2="${x + R('legendSample')}" y2="${y}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
function archItems() {
  return [['Outside - the public lane', swatch(OUTSIDE_TINT)], ['Perimeter - yard inside the fence, gatehouse controlled', swatch(RING_TINT[0])], ['Level 1 - reception and goods-in', swatch(RING_TINT[1])], ['Level 2 - staff areas behind card readers', swatch(RING_TINT[2])], ['Level 3 - higher card: security suite, ops and records, Building B plant corridor', swatch(RING_TINT[3])], ['Level 4 - data hall, secure corridor, hall plant, tunnels', swatch(RING_TINT[4])], ['Level 5 - meet-me room, carrier riser; locked cages inside the hall', swatch(RING_TINT[5])]];
}
function playItems() {
  const items = Object.entries(ROUTE_COLOUR).map(([k, c]) => [`route ${k}`, sample(c, k === 'critical' ? R('dashRoute') : '', R('routeStroke'))]);
  const mid = (x, y) => [x + R('legendSample') / 2, y];
  items.push(['guard loop, stop (wait s)', (x, y) => sample('#333', '', R('loopStroke'))(x, y) + `<circle cx="${mid(x, y)[0]}" cy="${y}" r="${R('dotR')}" fill="#333"/>`]);
  items.push(['lamp', (x, y) => `<circle cx="${mid(x, y)[0]}" cy="${y}" r="${R('lampR')}" fill="#ffd400" stroke="#8d6e00"/>`]);
  items.push(['vantage', (x, y) => starPx([(mid(x, y)[0] - M) / S + B[0], B[3] - (y - TOP) / S], R('starR'), 'fill="#ffb300" stroke="#222"')]);
  items.push(['hide', (x, y) => `<rect x="${mid(x, y)[0] - R('squareSize') / 2}" y="${y - R('squareSize') / 2}" width="${R('squareSize')}" height="${R('squareSize')}" fill="#5c6bc0"/>`]);
  items.push(['objective', (x, y) => polyPx([[x + R('dotR'), y + R('dotR')], [x + R('dotR'), y - R('flagH') / 2], [x + R('flagH') / 2, y - R('flagH') / 4]], 'fill="#d32f2f" stroke="#222"')]);
  items.push(['spawn', (x, y) => triPx([(mid(x, y)[0] - M) / S + B[0], B[3] - (y - TOP) / S], R('triSize'), '#2e7d32')]);
  return items;
}

function buildSvg(level, kind) {
  const withPlay = kind === 'play' && play;
  const withSec = security && (kind === 'security' || kind === 'play');
  const suffix = kind === 'arch' ? '' : kind === 'play' ? `play${security ? ' + security' : ''}` : 'security';
  const [lo] = levelSpan(level);
  const title = `${arch.meta?.id ?? 'plan'} - level ${level.id} ${level.name} (floor ${fmt(lo)} m, floor-to-floor ${fmt(level.height)} m)${suffix ? ' - ' + suffix : ''}`;
  calloutCol = 0;
  calloutLeft = 0;
  calloutBottom = 0;
  let body = baseLayers(level);
  if (kind === 'arch') console.log(`labels ${level.id}: boxes ${labelStats.boxes}, overlaps ${labelStats.overlaps}, leader crossings ${labelStats.crossings}`);
  body = `<g transform="translate(${+calloutLeft.toFixed(2)},0)">${body}</g>`; // the west callout column hangs left of the site
  const Wd = Math.max(calloutLeft + SITE_W + calloutCol, 2 * M + title.length * R('fontTitle') * R('charWidth'));
  const footY = Math.max(FOOT_Y, calloutBottom + M);
  if (withPlay) body += `<g transform="translate(${+calloutLeft.toFixed(2)},0)">${playLayers(level)}</g>`;
  if (withSec) body += `<g transform="translate(${+calloutLeft.toFixed(2)},0)">${securityLayers(level)}</g>`;
  // foot: scale bar with the zone legend beside it, then the play legend rows
  const barY = footY + R('barTick');
  const barLen = R('scaleBarM') * S;
  let foot = `<line x1="${M}" y1="${barY}" x2="${M + barLen}" y2="${barY}" stroke="#000" stroke-width="${R('barStroke')}"/><line x1="${M}" y1="${barY - R('barTick')}" x2="${M}" y2="${barY + R('barTick')}" stroke="#000"/><line x1="${M + barLen}" y1="${barY - R('barTick')}" x2="${M + barLen}" y2="${barY + R('barTick')}" stroke="#000"/>`;
  foot += textPx(M, barY + R('fontLegend') + R('barTick'), `${R('scaleBarM')} m`, R('fontLegend'), `fill="${INK}"`);
  const a = flow(archItems(), M + barLen + R('legendGap') * 2, barY, Wd - M);
  foot += a.out;
  let bottom = Math.max(a.bottom, barY + R('fontLegend') + R('barTick') * 2);
  if (withPlay) {
    const p = flow(playItems(), M, bottom + R('legendGap'), Wd - M);
    foot += p.out;
    bottom = p.bottom;
  }
  if (withSec) {
    const secItems = [['camera + view', sample('#c62828', '', R('gridStroke'))], ['reader', swatch('#1565c0')], ['beam', sample('#d50000', '', R('beamStroke'))], ['PIR range', sample('#b8860b', R('dashShort'), R('thinStroke'))], ['desk (star)', (x, y) => starPx([(x + R('legendSample') / 2 - M) / S + B[0], B[3] - (y - TOP) / S], R('starR'), 'fill="#c62828"')]];
    const s = flow(secItems, M, bottom + R('legendGap'), Wd - M);
    foot += s.out;
    bottom = s.bottom;
  }
  const Ht = bottom + M;
  const head = textPx(M, M, title, R('fontTitle'), `fill="${INK}" font-weight="bold"`);
  const nx = Wd - M;
  const north = polyPx([[nx, M - R('northLen')], [nx - R('northHalf'), M], [nx, M - R('northNotch')], [nx + R('northHalf'), M]], 'fill="#000"') + textPx(nx - R('northNotch'), M + R('fontLegend') + 2, 'N', R('fontLegend'), `fill="${INK}" font-weight="bold"`);
  const map = `data-map="${+calloutLeft.toFixed(2)},${M},${TOP},${S},${B[0]},${B[3]}"`; // px = left + M + (x - x0) * S, py = TOP + (z1 - z) * S (the level editor)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${map} width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}"><rect width="${Wd}" height="${Ht}" fill="${PAPER}"/>${body}${head}${north}${foot}</svg>\n`;
  return { svg, w: Math.ceil(Wd), h: Math.ceil(Ht) };
}

// ---------- output ----------
fs.mkdirSync(outDir, { recursive: true });
const jobs = [];
for (const level of levels) {
  if (onlyLevel && level.id !== onlyLevel) continue;
  jobs.push([level, 'arch', level.id]);
  if (play) jobs.push([level, 'play', `${level.id}-play`]);
  if (security) jobs.push([level, 'security', `${level.id}-security`]);
}
const written = [];
for (const [level, kind, name] of jobs) {
  const f = path.join(outDir, `${name}.svg`);
  const r = buildSvg(level, kind);
  fs.writeFileSync(f, r.svg);
  written.push({ f, w: r.w, h: r.h });
}

async function openBrowser() {
  const tries = [launchOptions(), { headless: true, channel: 'chrome' }, { headless: true, channel: 'msedge' }];
  let last;
  for (const o of tries) {
    try {
      return await chromium.launch(o);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

if (svgOnly) {
  console.log(`wrote ${written.length} SVG to ${path.relative(process.cwd(), outDir) || '.'}`);
  process.exit(0);
}
const browser = await openBrowser();
for (const { f, w, h } of written) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: R('pngScale') });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style>${fs.readFileSync(f, 'utf8')}`);
  await page.screenshot({ path: f.replace(/\.svg$/, '.png') });
  await page.close();
}
await browser.close();
console.log(`wrote ${written.length} SVG + PNG pairs to ${path.relative(process.cwd(), outDir) || '.'}: ${written.map((x) => path.basename(x.f)).join(', ')}`);
