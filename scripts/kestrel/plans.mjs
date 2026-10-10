// Kestrel plan renderer: one SVG (and PNG) per level from kestrel.arch.json, with optional play and security overlays.
//   node scripts/kestrel/plans.mjs <arch.json> [--play <play.json>] [--security <security.json>] [--out docs/kestrel/plans]
// Writes <level>.svg, <level>-play.svg (with --play), <level>-security.svg (with --security) and a PNG beside each.
// Every drawing number comes from facts.json ("render" group and the rule groups); see lib.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { launchOptions } from '../e2e-lib.mjs';
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
const RING_TINT = { 1: '#d6ebc9', 2: '#e6efc2', 3: '#fbeab9', '3+': '#fbd9a8', 4: '#f6c3a8', 5: '#efb0c0' };
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
  for (const o of ops) {
    const s0 = Math.max(0, o.at - o.w / 2);
    const s1 = Math.min(L, o.at + o.w / 2);
    if (s0 > cur) out += wallPiece(w, cur, s0, fill);
    cur = Math.max(cur, s1);
  }
  if (cur < L) out += wallPiece(w, cur, L, fill);
  return out;
}

/** +1 or -1: which side of the wall (along its left normal) the leaf swings toward: the room in between[1]. */
function swingSide(o, w, pt, n) {
  const room = roomById.get(o.between?.[1]);
  const probe = (sgn) => [pt[0] + n[0] * sgn * w.t, pt[1] + n[1] * sgn * w.t];
  if (room) {
    if (inRect(room.rect, ...probe(1))) return 1;
    if (inRect(room.rect, ...probe(-1))) return -1;
  }
  return 1;
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
  if (t === 'window') {
    const g = R('windowGap');
    for (const sgn of [-1, 1]) out += lineEl([A.p[0] + A.n[0] * sgn * g, A.p[1] + A.n[1] * sgn * g], [Bp.p[0] + Bp.n[0] * sgn * g, Bp.p[1] + Bp.n[1] * sgn * g], thin);
    return out;
  }
  if (t === 'door' || t === 'fire-door' || t === 'double') {
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
    } else {
      out += leaf(A, Bp.p, hi - lo);
    }
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
  const at = [tail[0] + dir[0] * sgn * ((R('arrowHead') * 2) / S), tail[1] + dir[1] * sgn * ((R('arrowHead') * 2) / S)];
  out += labelLines(at, [`${onFrom ? 'UP' : 'DN'} ${s.id}`], R('fontSmall'), `fill="#111" ${HALO()}`);
  return out;
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
  return out + textAt(l.at, hw * S + R('dotR'), -R('dotR'), `${l.id} ${l.from}-${l.to}`, R('fontSmall'), 'fill="#111"');
}

function voidSym(v) {
  const r = v.rect;
  const ink = `stroke="#333" stroke-width="${R('thinStroke')}"`;
  return rectEl(r, `fill="none" ${ink} stroke-dasharray="${R('dashMid')}"`)
    + lineEl([r[0], r[1]], [r[2], r[3]], ink) + lineEl([r[0], r[3]], [r[2], r[1]], ink)
    + textPx(X(r[0]), Y(r[3]) - R('dotR'), `${v.id} ${v.kind}`, R('fontSmall'), `fill="#333" ${HALO()}`);
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

/** Labels that did not fit inside their room on the level being drawn; drawn in a column right of the site with a leader line. */
let callouts = [];
let calloutCol = 0;
let calloutBottom = 0;

/**
 * Room label. Tries the full three-line label, then a four-line narrow one, then the narrow one in the small font, on a grid of spots
 * (nearest the room centre first). The first spot that stays inside the room and clear of every stair, void and object wins.
 * If none does (for example a stair core filled by its stair), the label goes to the callout column instead.
 */
function roomLabel(r, level) {
  const c = clearRect(r, walls);
  const w = c[2] - c[0];
  const d = c[3] - c[1];
  const title = `${r.id} ${r.name ?? ''}`.trim();
  const size = Math.min(w, d) * S < R('labelSmallBelow') ? R('fontSmall') : R('fontRoom');
  const size0 = size;
  const sizeSmall = Math.min(size, R('fontSmall'));
  const zone = `zone ${r.ring ?? '?'}`;
  const wide = [title, `${fmt(w)} x ${fmt(d)} clear`, zone];
  const narrow = [r.id, r.name ?? '', `${fmt(w)} x ${fmt(d)}`, `clear, ${zone}`].filter(Boolean);
  const variants = [{ lines: wide, size: size0 }, { lines: narrow, size: size0 }, { lines: narrow, size: sizeSmall }];
  const toPx = (rc) => [X(rc[0]), Y(rc[3]), X(rc[2]), Y(rc[1])];
  const obstacles = [
    ...(arch.stairs ?? []).filter((s) => s.from === level.id || s.to === level.id).map((s) => s.rect),
    ...(arch.voids ?? []).filter((v) => v.level === level.id).map((v) => v.rect),
    ...(arch.objects ?? []).filter((o) => o.level === level.id).map((o) => o.rect),
  ].map(toPx);
  const room = toPx(r.rect);
  const [cx, cz] = rectCentre(r.rect);
  const n = R('labelSteps');
  const spots = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const fx = (n > 1 ? i / (n - 1) - 0.5 : 0) * R('labelSpread');
      const fz = (n > 1 ? j / (n - 1) - 0.5 : 0) * R('labelSpread');
      spots.push({ p: [cx + fx * w, cz + fz * d], dist: Math.hypot(fx, fz) });
    }
  }
  spots.sort((a, b) => a.dist - b.dist);
  /** Pixels of a w x h box centred on p that fall on an obstacle or outside the room. */
  const cost = (p, bw, bh) => {
    const box = [X(p[0]) - bw / 2, Y(p[1]) - bh / 2, X(p[0]) + bw / 2, Y(p[1]) + bh / 2];
    let sum = 0;
    for (const o of obstacles) sum += overlap1(box[0], box[2], o[0], o[2]) * overlap1(box[1], box[3], o[1], o[3]);
    return sum + (bw - overlap1(box[0], box[2], room[0], room[2])) * bh + (bh - overlap1(box[1], box[3], room[1], room[3])) * bw;
  };
  for (const v of variants) {
    const bw = Math.max(...v.lines.map((l) => l.length)) * v.size * R('charWidth');
    const bh = v.lines.length * v.size * R('lineHeight');
    const fit = spots.find((s) => Math.round(cost(s.p, bw, bh)) === 0); // whole px2 only: float noise is not an overlap
    if (fit) return labelLines(fit.p, v.lines, v.size, `fill="${INK}" ${HALO()}`);
  }
  // Callout: the leader dot goes where a dot fits best; the text waits in the column.
  const dotBox = R('dotR') * 2;
  const dot = spots.reduce((best, s) => (best && cost(best.p, dotBox, dotBox) <= cost(s.p, dotBox, dotBox) ? best : s), null);
  callouts.push({ lines: variants[0].lines, size: variants[0].size, anchor: dot.p });
  return '';
}

/** Draws the queued callouts in a column right of the site, stacked top down, and records the column width and bottom edge. */
function calloutLayer() {
  if (!callouts.length) return '';
  // right of the site and of any exterior element label that runs past the site edge
  const reach = (arch.exterior ?? []).map((e) => Math.max(X(e.a[0]), X(e.b[0])) + R('dotR') * 1.5 + `${e.id} ${e.kind}`.length * R('fontSmall') * R('charWidth'));
  const colX = Math.max(X(B[2]), ...reach) + R('legendGap');
  const heightOf = (k) => k.lines.length * k.size * R('lineHeight');
  const items = callouts.map((k) => ({ ...k, h: heightOf(k), y: Y(k.anchor[1]) })).sort((a, b) => a.y - b.y);
  let out = '';
  let prevBottom = TOP;
  for (const k of items) {
    const top = Math.max(k.y - k.h / 2, prevBottom + R('calloutPad'));
    const mid = top + k.h / 2;
    prevBottom = top + k.h;
    out += `<line x1="${X(k.anchor[0])}" y1="${Y(k.anchor[1])}" x2="${colX - R('calloutGap')}" y2="${+mid.toFixed(2)}" stroke="${INK}" stroke-width="${R('markStroke')}"/>`;
    out += `<circle cx="${X(k.anchor[0])}" cy="${Y(k.anchor[1])}" r="${R('dotR') / 2}" fill="${INK}"/>`;
    const lh = k.size * R('lineHeight');
    k.lines.forEach((l, i) => { out += textPx(colX, mid - ((k.lines.length - 1) * lh) / 2 + i * lh + k.size * (1 - R('lineHeight') + 0.55), l, k.size, `fill="${INK}"`); });
    calloutCol = Math.max(calloutCol, colX - X(B[2]) + Math.max(...k.lines.map((l) => l.length)) * k.size * R('charWidth') + R('legendGap'));
  }
  calloutBottom = prevBottom;
  return out;
}

function baseLayers(level) {
  callouts = [];
  const here = (o) => o.level === level.id;
  let out = '';
  for (const r of (arch.rooms ?? []).filter(here)) out += rectEl(r.rect, `fill="${RING_TINT[r.ring] ?? '#eeeeee'}" fill-opacity="${R('tintOpacity')}" stroke="none"`);
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
    out += textAt([b.rect[0], b.rect[3]], 2, -(FACT('rules.wallExterior') / 2) * S - 2, `Building ${b.id}${b.name ? ` ${b.name}` : ''}`, R('fontLegend'), `fill="#555" font-weight="bold"`);
  }
  out += rectEl(B, `fill="none" stroke="#999" stroke-width="${R('siteStroke')}" stroke-dasharray="${R('dashLong')}"`);
  for (const o of (arch.objects ?? []).filter(here)) {
    out += rectEl(o.rect, `fill="#b9b9b9" stroke="#666" stroke-width="${R('objectStroke')}"`);
    // an id that does not fit inside its object (a row of racks) is left off; the id stays in the arch file
    const fits = (o.rect[2] - o.rect[0]) * S >= o.id.length * R('fontSmall') * R('charWidth') && (o.rect[3] - o.rect[1]) * S >= R('fontSmall') * R('lineHeight');
    if (fits) out += labelLines(rectCentre(o.rect), [o.id], R('fontSmall'), 'fill="#222"');
  }
  for (const w of walls.filter(here)) out += drawWall(w);
  for (const o of arch.openings ?? []) if (wallById.get(o.wall)?.level === level.id) out += drawOpening(o);
  for (const s of arch.stairs ?? []) {
    if (s.from === level.id) out += stairSym(s, true);
    else if (s.to === level.id) out += stairSym(s, false);
  }
  for (const l of arch.ladders ?? []) if (l.from === level.id || l.to === level.id) out += ladderSym(l);
  for (const v of (arch.voids ?? []).filter(here)) out += voidSym(v);
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
  for (const r of (arch.rooms ?? []).filter(here)) out += roomLabel(r, level);
  out += calloutLayer();
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
  return [['zone 1', swatch(RING_TINT[1])], ['zone 2', swatch(RING_TINT[2])], ['zone 3', swatch(RING_TINT[3])], ['zone 3+', swatch(RING_TINT['3+'])], ['zone 4', swatch(RING_TINT[4])], ['zone 5', swatch(RING_TINT[5])]];
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
  calloutBottom = 0;
  let body = baseLayers(level);
  const Wd = Math.max(SITE_W + calloutCol, 2 * M + title.length * R('fontTitle') * R('charWidth'));
  const footY = Math.max(FOOT_Y, calloutBottom + M);
  if (withPlay) body += playLayers(level);
  if (withSec) body += securityLayers(level);
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${Ht}" viewBox="0 0 ${Wd} ${Ht}"><rect width="${Wd}" height="${Ht}" fill="${PAPER}"/>${body}${head}${north}${foot}</svg>\n`;
  return { svg, w: Math.ceil(Wd), h: Math.ceil(Ht) };
}

// ---------- output ----------
fs.mkdirSync(outDir, { recursive: true });
const jobs = [];
for (const level of levels) {
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

const browser = await openBrowser();
for (const { f, w, h } of written) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: R('pngScale') });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style>${fs.readFileSync(f, 'utf8')}`);
  await page.screenshot({ path: f.replace(/\.svg$/, '.png') });
  await page.close();
}
await browser.close();
console.log(`wrote ${written.length} SVG + PNG pairs to ${path.relative(process.cwd(), outDir) || '.'}: ${written.map((x) => path.basename(x.f)).join(', ')}`);
