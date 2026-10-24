// Graph -> one-page plan SVG (mission-framework GSVG). Draws a level-validator graph (docs/level-validator/graph-schema.md)
// to scale from the `area` boxes of its spaces, with links, vantage points and the mission nodes.
//
// Usage: node scripts/graph-svg.mjs <graph.json...> [--out <file.svg>] [--base <plan.svg>] [--title <t>]
//                                   [--rooms <rooms.json>] [--base-bounds minX,minZ,maxX,maxZ]
//        node scripts/graph-svg.mjs --dump-rooms <mapId>      (writes a rooms JSON to stdout; loads the map through Vite SSR)
//
// Several graph files are merged as the level validator does (meta from the first, spaces / links / objectives / syncs /
// rules concatenated). Output goes to --out, else stdout. Same input -> byte-identical SVG (no dates, no randomness).
//
// Drawing: 1 m = 10 px, +x to the right, +z UP the page (north up, the same as scripts/plan-svg.mjs), grid every 10 m
// labelled in world metres, scale bar 10 m. Each space's `area` boxes are filled by role: encounter (also objective type),
// transit (everything else), rest (safe_room, reward), split leg A / B (tags `split:<id>:a` / `:b`, which win over the type).
// Spaces on an upper storey are drawn later (on top) with a dashed edge and "@<storey>" in the label. A space's centre (link
// ends, label, pins) is the centre of its largest box. Links run centre -> `at` (x, z; y ignored) -> centre, tagged with
// the kind; co-op kinds are magenta and bold; one-way links carry an arrow; several links between one pair are bent apart.
// `vantage.at` is an eye mark with a dashed line to the observed space and its sees_pct. Mission nodes (top level
// `objectives[]`, `syncs[]`, and the `lead` of each) are numbered pins (circle objective, diamond sync, square lead) with a
// legend table below the plan.
//
// `area` is a list of boxes `[minX, minZ, maxX, maxZ]` (works with no TS loading), or a RoomDef id looked up in --rooms
// (JSON: { "<id>": [minX,minZ,maxX,maxZ] } | { "<id>": {minX,maxX,minZ,maxZ} } | [{id,minX,maxX,minZ,maxZ}...]; make one with
// --dump-rooms). A space with no usable area is skipped (listed in the footer and on stderr); links and pins that need it are
// skipped too.
//
// --base <svg>: embedded underneath (50% opacity). Assumptions: if the base root carries `data-bounds="minX minZ maxX maxZ"`
// (metres, z up) or --base-bounds is given, it is stretched to exactly those world bounds. Otherwise it is placed at its own
// size (viewBox, else width / height, taken as pixels at 10 px per m, which is what scripts/plan-svg.mjs writes) with its
// top-left corner at the plan's top-left corner; align it by giving bounds. The plan extent grows to include the base.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const S = 10; // px per metre
export const GRID = 10; // metres
const PAD = 5; // metres around the drawing
const MARGIN = 20; // px around the plan
const HEAD = 72; // px of title block above the plan
const MIN_W = 700; // px, minimum page width (the legend table needs it)

export const COOP_KINDS = new Set(['coop_boost', 'human_ladder', 'pair_gate', 'team_rope', 'team_throw', 'team_hang', 'team_pull', 'shutter']);
const KIND_TAG = {
  coop_boost: 'boost', human_ladder: 'h-ladder', pair_gate: 'pair-gate', team_rope: 't-rope', team_throw: 't-throw', team_hang: 't-hang',
  team_pull: 't-pull', fire_stair: 'f-stair', open_stair: 'stair', double_door: 'dbl-door', roller_door: 'roller', split_jump: 's-jump', wall_jump: 'w-jump',
};
export const ROLE_FILL = { encounter: '#e8806a', transit: '#9fb4c7', rest: '#86c486', splitA: '#5b9bea', splitB: '#e6a93c' };
const ROLE_NAME = { encounter: 'encounter', transit: 'transit', rest: 'rest', splitA: 'split leg A', splitB: 'split leg B' };
const COOP_COLOR = '#d0198c';
const PIN_COLOR = { objective: '#1f4e9c', sync: '#7a3fa0', lead: '#0b7a75' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const f = (v) => String(Math.round(v * 10) / 10);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '~' : s);

/** Merge graphs like the level validator: meta from the first, arrays concatenated, sections unioned. */
export function mergeGraphs(graphs) {
  const out = { meta: {}, spaces: [], links: [], objectives: [], syncs: [], rules: [], mission: null };
  graphs.forEach((g, i) => {
    if (i === 0) out.meta = { ...(g.meta ?? {}) };
    for (const k of ['spaces', 'links', 'objectives', 'syncs', 'rules']) if (Array.isArray(g[k])) out[k].push(...g[k]);
    if (!out.mission && g.mission && typeof g.mission === 'object') out.mission = g.mission;
    if (i > 0 && Array.isArray(g.meta?.sections)) {
      const have = new Set(out.meta.sections ?? []);
      out.meta.sections = [...(out.meta.sections ?? []), ...g.meta.sections.filter((s) => !have.has(s))];
    }
  });
  return out;
}

const normBox = (b) => [Math.min(b[0], b[2]), Math.min(b[1], b[3]), Math.max(b[0], b[2]), Math.max(b[1], b[3])];

/** A rooms dump in any of the three accepted shapes -> Map(id -> [minX, minZ, maxX, maxZ]). */
export function normaliseRooms(rooms) {
  const m = new Map();
  const put = (id, r) => {
    if (Array.isArray(r) && r.length === 4 && r.every(isNum)) m.set(String(id), normBox(r));
    else if (r && typeof r === 'object' && [r.minX, r.maxX, r.minZ, r.maxZ].every(isNum)) m.set(String(id), normBox([r.minX, r.minZ, r.maxX, r.maxZ]));
  };
  if (Array.isArray(rooms)) {
    for (const r of rooms) if (r && r.id !== undefined) put(r.id, r);
  } else if (rooms && typeof rooms === 'object') {
    for (const [id, r] of Object.entries(rooms)) put(id, r);
  }
  return m;
}

/** A space's `area` -> boxes, or null when it cannot be placed. */
export function areaBoxes(area, rooms) {
  if (typeof area === 'string') {
    const r = rooms.get(area);
    return r ? [r] : null;
  }
  if (Array.isArray(area) && area.length > 0 && area.every((b) => Array.isArray(b) && b.length === 4 && b.every(isNum))) return area.map(normBox);
  return null;
}

const roleOf = (sp) => {
  const tags = Array.isArray(sp.tags) ? sp.tags : [];
  if (tags.some((t) => /^split:.+:a$/.test(t))) return 'splitA';
  if (tags.some((t) => /^split:.+:b$/.test(t))) return 'splitB';
  if (sp.type === 'encounter' || sp.type === 'objective') return 'encounter';
  if (sp.type === 'safe_room' || sp.type === 'reward') return 'rest';
  return 'transit';
};

const centreOf = (boxes) => {
  let best = boxes[0];
  let ba = -1;
  for (const b of boxes) {
    const a = (b[2] - b[0]) * (b[3] - b[1]);
    if (a > ba) { ba = a; best = b; }
  }
  return [(best[0] + best[2]) / 2, (best[1] + best[3]) / 2];
};

const attrsOf = (tag) => {
  const o = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) o[m[1]] = m[3] ?? m[4];
  return o;
};
const px = (v) => parseFloat(String(v));

/** Parse a base SVG: its drawing content, its own size and (if any) its world bounds in metres. */
function parseBase(svgText, boundsOpt) {
  const m = /<svg\b([^>]*)>/i.exec(svgText);
  if (!m) throw new Error('--base: no <svg> root found');
  const a = attrsOf(m[1]);
  const end = svgText.lastIndexOf('</svg>');
  const inner = svgText.slice(m.index + m[0].length, end < 0 ? undefined : end).replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!DOCTYPE[^>]*>/gi, '');
  let vb = null;
  if (a.viewBox) {
    const p = a.viewBox.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every(Number.isFinite)) vb = p;
  }
  if (!vb) {
    const w = px(a.width);
    const h = px(a.height);
    vb = Number.isFinite(w) && Number.isFinite(h) ? [0, 0, w, h] : [0, 0, 1000, 1000];
  }
  let bounds = null;
  const raw = boundsOpt ?? a['data-bounds'];
  if (raw) {
    const p = String(raw).trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every(Number.isFinite)) bounds = normBox(p);
  }
  return { inner, vb, bounds };
}

/**
 * Build the plan.
 * @param {{graphs: object[], names?: string[], rooms?: Map<string,number[]>|object, title?: string, base?: string, baseBounds?: string}} opt
 * @returns {{svg: string, skippedSpaces: string[], skippedLinks: number, skippedPins: number}}
 */
export function buildSvg(opt) {
  const g = mergeGraphs(opt.graphs);
  const names = opt.names ?? [];
  const rooms = opt.rooms instanceof Map ? opt.rooms : normaliseRooms(opt.rooms ?? {});
  const title = opt.title ?? g.meta.name ?? g.meta.map ?? names[0] ?? 'graph';

  // ---- place spaces
  const placed = new Map(); // id -> { sp, boxes, c, role }
  const skippedSpaces = [];
  for (const sp of g.spaces) {
    if (!sp || typeof sp.id !== 'string') continue;
    const boxes = areaBoxes(sp.area, rooms);
    if (!boxes) { skippedSpaces.push(sp.id); continue; }
    placed.set(sp.id, { sp, boxes, c: centreOf(boxes), role: roleOf(sp) });
  }

  // ---- extent (metres)
  const pts = [];
  for (const p of placed.values()) for (const b of p.boxes) pts.push([b[0], b[1]], [b[2], b[3]]);
  for (const l of g.links) if (Array.isArray(l.at) && isNum(l.at[0]) && isNum(l.at[2])) pts.push([l.at[0], l.at[2]]);
  for (const p of placed.values()) { const v = p.sp.vantage?.at; if (Array.isArray(v) && isNum(v[0]) && isNum(v[2])) pts.push([v[0], v[2]]); }
  let base = null;
  if (opt.base) base = parseBase(opt.base, opt.baseBounds);
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  if (!pts.length) { minX = 0; maxX = 40; minZ = 0; maxZ = 30; } else { minX -= PAD; maxX += PAD; minZ -= PAD; maxZ += PAD; }
  if (base?.bounds) {
    minX = Math.min(minX, base.bounds[0]); minZ = Math.min(minZ, base.bounds[1]); maxX = Math.max(maxX, base.bounds[2]); maxZ = Math.max(maxZ, base.bounds[3]);
  } else if (base) {
    maxX = Math.max(maxX, minX + base.vb[2] / S);
    minZ = Math.min(minZ, maxZ - base.vb[3] / S);
  }
  minX = Math.floor(minX / GRID) * GRID; minZ = Math.floor(minZ / GRID) * GRID;
  maxX = Math.ceil(maxX / GRID) * GRID; maxZ = Math.ceil(maxZ / GRID) * GRID;
  const W = (maxX - minX) * S;
  const H = (maxZ - minZ) * S;
  const X = (x) => f((x - minX) * S);
  const Y = (z) => f((maxZ - z) * S);

  // ---- mission pins
  const pins = []; // { n, kind, id, space, detail }
  const placedPins = [];
  let n = 0;
  const objs = g.objectives.filter((o) => o && typeof o === 'object');
  const syncs = g.syncs.filter((o) => o && typeof o === 'object');
  const objNo = new Map();
  for (const o of objs) {
    n++;
    objNo.set(o.id, n);
    pins.push({ n, kind: 'objective', id: o.id ?? '-', space: o.space, detail: [o.kind, o.team ? `team ${o.team}` : '', o.section, o.after ? `after ${o.after}` : '', o.optional ? 'optional' : '', o.twist ? 'twist' : ''].filter(Boolean).join(', ') });
  }
  for (const s of syncs) {
    n++;
    pins.push({ n, kind: 'sync', id: s.id ?? '-', space: s.space, detail: [s.kind, s.src ? `src ${s.src}` : '', s.solo !== undefined ? `solo ${typeof s.solo === 'object' ? JSON.stringify(s.solo) : s.solo}` : ''].filter(Boolean).join(', ') });
  }
  const leadSpace = (x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? x.space : undefined);
  for (const o of objs) {
    const sp = leadSpace(o.lead);
    if (sp === undefined) continue;
    n++;
    pins.push({ n, kind: 'lead', id: `lead:${o.id ?? '-'}`, space: sp, detail: `lead for objective ${objNo.get(o.id)} (${o.id ?? '-'})` });
  }
  for (const s of syncs) {
    const sp = leadSpace(s.lead);
    if (sp === undefined) continue;
    n++;
    pins.push({ n, kind: 'lead', id: `lead:${s.id ?? '-'}`, space: sp, detail: `lead for sync ${s.id ?? '-'}` });
  }

  // ---- svg parts
  const o = [];
  const head = [];
  const body = [];
  const names2 = names.map((x) => basename(x)).join(', ');
  head.push(`<text x="${MARGIN}" y="24" font-size="16" font-weight="bold">${esc(title)}</text>`);
  head.push(`<text x="${MARGIN}" y="40" font-size="10" fill="#444">graph: ${esc(names2 || '(none)')}   |   ${g.spaces.length} spaces, ${g.links.length} links${g.meta.mode ? `, mode ${esc(g.meta.mode)}` : ''}${Array.isArray(g.meta.sections) ? `, sections ${esc(g.meta.sections.join(' '))}` : ''}</text>`);
  head.push(`<text x="${MARGIN}" y="54" font-size="10" fill="#444">scale 1 m = 10 px | north up: +z up the page, +x to the right | grid every 10 m, labels in world metres (x along the top, z down the left)</text>`);
  if (g.mission) {
    const m = g.mission;
    head.push(`<text x="${MARGIN}" y="68" font-size="10" fill="#1f4e9c">mission ${esc(m.id ?? '-')}${m.mode ? ` | ${esc(m.mode)}` : ''}${m.players ? ` | players ${esc(JSON.stringify(m.players))}` : ''}${m.start ? ` | start ${esc(m.start)}` : ''}${m.budget ? ` | budget ${esc(typeof m.budget === 'object' ? JSON.stringify(m.budget) : m.budget)}` : ''}</text>`);
  }

  // plan group (origin = plan top-left)
  const plan = [];
  plan.push(`<rect width="${W}" height="${H}" fill="#fbfaf6" stroke="#999"/>`);
  if (base) {
    const bx = base.bounds ? (base.bounds[0] - minX) * S : 0;
    const by = base.bounds ? (maxZ - base.bounds[3]) * S : 0;
    const bw = base.bounds ? (base.bounds[2] - base.bounds[0]) * S : base.vb[2];
    const bh = base.bounds ? (base.bounds[3] - base.bounds[1]) * S : base.vb[3];
    plan.push(`<g opacity="0.5"><svg x="${f(bx)}" y="${f(by)}" width="${f(bw)}" height="${f(bh)}" viewBox="${base.vb.map(f).join(' ')}" preserveAspectRatio="none">${base.inner}</svg></g>`);
  }
  for (let x = minX; x <= maxX; x += GRID) plan.push(`<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${f(H)}" stroke="#d6d2c4" stroke-width="${x % 50 === 0 ? 1 : 0.5}"/><text x="${f((x - minX) * S + 2)}" y="9" font-size="7" fill="#9a9482">${x}</text>`);
  for (let z = minZ; z <= maxZ; z += GRID) plan.push(`<line x1="0" y1="${Y(z)}" x2="${f(W)}" y2="${Y(z)}" stroke="#d6d2c4" stroke-width="${z % 50 === 0 ? 1 : 0.5}"/><text x="2" y="${f((maxZ - z) * S - 2)}" font-size="7" fill="#9a9482">${z}</text>`);

  // spaces: lower storeys first so upper ones sit on top
  const order = [...placed.values()].map((p, i) => ({ p, i })).sort((a, b) => (a.p.sp.storey ?? 0) - (b.p.sp.storey ?? 0) || a.i - b.i);
  for (const { p } of order) {
    const upper = (p.sp.storey ?? 0) > 0.5;
    for (const b of p.boxes) {
      plan.push(`<rect x="${X(b[0])}" y="${Y(b[3])}" width="${f((b[2] - b[0]) * S)}" height="${f((b[3] - b[1]) * S)}" fill="${ROLE_FILL[p.role]}" fill-opacity="${upper ? 0.5 : 0.6}" stroke="#333" stroke-width="${upper ? 1 : 1.2}"${upper ? ' stroke-dasharray="4 2"' : ''} data-space="${esc(p.sp.id)}"/>`);
    }
  }

  // links
  const pairCount = new Map();
  const linkLines = [];
  const linkTags = [];
  let skippedLinks = 0;
  for (const l of g.links) {
    const a = placed.get(l.from);
    const b = placed.get(l.to);
    if (!a || !b) { skippedLinks++; continue; }
    const key = [l.from, l.to].sort().join('|');
    const k = pairCount.get(key) ?? 0;
    pairCount.set(key, k + 1);
    const coop = COOP_KINDS.has(l.kind);
    let mid;
    if (Array.isArray(l.at) && isNum(l.at[0]) && isNum(l.at[2])) mid = [l.at[0], l.at[2]];
    else mid = [(a.c[0] + b.c[0]) / 2, (a.c[1] + b.c[1]) / 2];
    if (k > 0) { // bend repeated links apart, perpendicular to the centre-to-centre line
      const dx = b.c[0] - a.c[0];
      const dz = b.c[1] - a.c[1];
      const len = Math.hypot(dx, dz) || 1;
      const off = Math.ceil(k / 2) * (k % 2 ? 1 : -1) * 1.2;
      mid = [mid[0] + (-dz / len) * off, mid[1] + (dx / len) * off];
    }
    const color = coop ? COOP_COLOR : l.route === 'spine' ? '#111' : '#444';
    const width = coop ? 2.2 : l.route === 'spine' ? 2 : 1.1;
    const pts2 = `${X(a.c[0])},${Y(a.c[1])} ${X(mid[0])},${Y(mid[1])} ${X(b.c[0])},${Y(b.c[1])}`;
    const oneWay = l.one_way === true || l.kind === 'drop';
    linkLines.push(`<polyline points="${pts2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-opacity="0.85"${oneWay ? ` marker-end="url(#${coop ? 'arrowC' : 'arrow'})"` : ''}/><circle cx="${X(mid[0])}" cy="${Y(mid[1])}" r="${coop ? 2.6 : 1.8}" fill="${color}"/>`);
    const tag = KIND_TAG[l.kind] ?? String(l.kind ?? '?');
    const tw = tag.length * 4 + 4;
    const tx = (mid[0] - minX) * S;
    const ty = (maxZ - mid[1]) * S - 4;
    linkTags.push(`<rect x="${f(tx - tw / 2)}" y="${f(ty - 7)}" width="${f(tw)}" height="9" rx="2" fill="${coop ? '#fde1f1' : '#ffffff'}" fill-opacity="0.85" stroke="${coop ? COOP_COLOR : 'none'}" stroke-width="0.6"/><text x="${f(tx)}" y="${f(ty)}" text-anchor="middle" font-size="7"${coop ? ` font-weight="bold" fill="${COOP_COLOR}"` : ' fill="#333"'}>${esc(tag)}</text>`);
  }
  plan.push(...linkLines, ...linkTags);

  // vantage eyes
  for (const p of placed.values()) {
    const v = p.sp.vantage?.at;
    if (!Array.isArray(v) || !isNum(v[0]) || !isNum(v[2])) continue;
    const ex = (v[0] - minX) * S;
    const ey = (maxZ - v[2]) * S;
    plan.push(`<line x1="${f(ex)}" y1="${f(ey)}" x2="${X(p.c[0])}" y2="${Y(p.c[1])}" stroke="#222" stroke-width="0.8" stroke-dasharray="2 2"/>`);
    plan.push(`<g><ellipse cx="${f(ex)}" cy="${f(ey)}" rx="7" ry="4" fill="#fff" stroke="#222" stroke-width="1"/><circle cx="${f(ex)}" cy="${f(ey)}" r="2" fill="#222"/>${isNum(p.sp.vantage.sees_pct) ? `<text x="${f(ex + 9)}" y="${f(ey + 3)}" font-size="7" fill="#222">${Math.round(p.sp.vantage.sees_pct * 100)}%</text>` : ''}</g>`);
  }

  // labels (halo text); nudge down when two collide
  const labelAt = [];
  for (const { p } of order) {
    let lx = (p.c[0] - minX) * S;
    let ly = (maxZ - p.c[1]) * S + 3;
    const upper = (p.sp.storey ?? 0) > 0.5;
    const text = p.sp.id + (upper ? ` @${f(p.sp.storey)}` : '');
    for (let i = 0; i < 10 && labelAt.some((q) => Math.abs(q[0] - lx) < (q[2] + text.length * 4.4) / 2 && Math.abs(q[1] - ly) < 9); i++) ly += 9;
    labelAt.push([lx, ly, text.length * 4.4]);
    plan.push(`<text x="${f(lx)}" y="${f(ly)}" text-anchor="middle" font-size="8" font-weight="bold" fill="#111" stroke="#fff" stroke-width="2.5" paint-order="stroke">${esc(text)}</text>`);
    const tags = Array.isArray(p.sp.tags) ? p.sp.tags : [];
    const marks = ['start', 'exfil'].filter((t) => tags.includes(t)).map((t) => t.toUpperCase());
    if (marks.length) plan.push(`<text x="${f(lx)}" y="${f(ly + 8)}" text-anchor="middle" font-size="7" font-weight="bold" fill="#0a6a2a" stroke="#fff" stroke-width="2" paint-order="stroke">${marks.join(' ')}</text>`);
  }

  // pins: stacked in a row above the label centre of their space
  const perSpace = new Map();
  let unplacedPins = 0;
  for (const pin of pins) {
    const p = placed.get(pin.space);
    if (!p) { unplacedPins++; pin.skipped = true; continue; }
    const idx = perSpace.get(pin.space) ?? 0;
    perSpace.set(pin.space, idx + 1);
    pin.idx = idx;
    pin.p = p;
  }
  for (const pin of pins) {
    if (pin.skipped) continue;
    const cnt = perSpace.get(pin.space);
    const cx = (pin.p.c[0] - minX) * S + (pin.idx - (cnt - 1) / 2) * 17;
    const cy = (maxZ - pin.p.c[1]) * S - 13;
    const col = PIN_COLOR[pin.kind];
    let shape;
    if (pin.kind === 'objective') shape = `<circle cx="${f(cx)}" cy="${f(cy)}" r="7" fill="${col}" stroke="#fff" stroke-width="1.2"/>`;
    else if (pin.kind === 'sync') shape = `<polygon points="${f(cx)},${f(cy - 8)} ${f(cx + 8)},${f(cy)} ${f(cx)},${f(cy + 8)} ${f(cx - 8)},${f(cy)}" fill="${col}" stroke="#fff" stroke-width="1.2"/>`;
    else shape = `<rect x="${f(cx - 6.5)}" y="${f(cy - 6.5)}" width="13" height="13" fill="${col}" stroke="#fff" stroke-width="1.2"/>`;
    plan.push(`${shape}<text x="${f(cx)}" y="${f(cy + 3)}" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">${pin.n}</text>`);
    placedPins.push(pin.n);
  }

  // scale bar 10 m (bottom left, on a pale backing)
  plan.push(`<rect x="4" y="${f(H - 26)}" width="118" height="22" fill="#fff" fill-opacity="0.85" stroke="#999" stroke-width="0.5"/><line x1="10" y1="${f(H - 12)}" x2="${10 + 10 * S}" y2="${f(H - 12)}" stroke="#111" stroke-width="2"/><line x1="10" y1="${f(H - 16)}" x2="10" y2="${f(H - 8)}" stroke="#111" stroke-width="1.5"/><line x1="${10 + 10 * S}" y1="${f(H - 16)}" x2="${10 + 10 * S}" y2="${f(H - 8)}" stroke="#111" stroke-width="1.5"/><text x="${10 + 5 * S}" y="${f(H - 16)}" text-anchor="middle" font-size="8" fill="#111">10 m</text>`);
  // north arrow
  plan.push(`<g transform="translate(${f(W - 16)},${f(24)})"><polygon points="0,-12 5,4 0,1 -5,4" fill="#111"/><text y="16" text-anchor="middle" font-size="8" fill="#111">N</text></g>`);

  // ---- legend under the plan
  const legend = [];
  let ly = 0;
  let lx = 0;
  const sw = (fill, text, extra = '') => {
    legend.push(`<rect x="${lx}" y="${ly}" width="14" height="10" fill="${fill}" fill-opacity="0.7" stroke="#333"${extra}/><text x="${lx + 19}" y="${ly + 9}" font-size="9">${esc(text)}</text>`);
    lx += 19 + text.length * 5 + 14;
  };
  for (const r of ['encounter', 'transit', 'rest', 'splitA', 'splitB']) sw(ROLE_FILL[r], ROLE_NAME[r]);
  sw('#ffffff', 'upper storey (dashed, drawn on top)', ' stroke-dasharray="4 2"');
  ly += 18; lx = 0;
  legend.push(`<line x1="0" y1="${ly + 5}" x2="22" y2="${ly + 5}" stroke="#444" stroke-width="1.1"/><text x="27" y="${ly + 9}" font-size="9">link (tag = kind)</text>`);
  legend.push(`<line x1="130" y1="${ly + 5}" x2="152" y2="${ly + 5}" stroke="#111" stroke-width="2"/><text x="157" y="${ly + 9}" font-size="9">spine link</text>`);
  legend.push(`<line x1="225" y1="${ly + 5}" x2="247" y2="${ly + 5}" stroke="${COOP_COLOR}" stroke-width="2.2"/><text x="252" y="${ly + 9}" font-size="9" font-weight="bold" fill="${COOP_COLOR}">co-op link (${[...COOP_KINDS].join(', ')})</text>`);
  legend.push(`<line x1="560" y1="${ly + 5}" x2="582" y2="${ly + 5}" stroke="#444" stroke-width="1.1" marker-end="url(#arrow)"/><text x="590" y="${ly + 9}" font-size="9">one way / drop</text>`);
  ly += 18;
  legend.push(`<ellipse cx="8" cy="${ly + 5}" rx="7" ry="4" fill="#fff" stroke="#222"/><circle cx="8" cy="${ly + 5}" r="2" fill="#222"/><text x="22" y="${ly + 9}" font-size="9">vantage.at (dashed line to the observed space, sees %)</text>`);
  legend.push(`<circle cx="330" cy="${ly + 5}" r="6" fill="${PIN_COLOR.objective}"/><text x="342" y="${ly + 9}" font-size="9">objective</text><polygon points="400,${ly - 2} 408,${ly + 5} 400,${ly + 12} 392,${ly + 5}" fill="${PIN_COLOR.sync}"/><text x="414" y="${ly + 9}" font-size="9">sync</text><rect x="452" y="${ly - 1}" width="12" height="12" fill="${PIN_COLOR.lead}"/><text x="470" y="${ly + 9}" font-size="9">lead</text>`);
  ly += 22;
  if (pins.length) {
    legend.push(`<text x="0" y="${ly + 9}" font-size="9" font-weight="bold">#</text><text x="26" y="${ly + 9}" font-size="9" font-weight="bold">node</text><text x="86" y="${ly + 9}" font-size="9" font-weight="bold">id</text><text x="250" y="${ly + 9}" font-size="9" font-weight="bold">space</text><text x="400" y="${ly + 9}" font-size="9" font-weight="bold">detail</text><line x1="0" y1="${ly + 13}" x2="${MIN_W - 2 * MARGIN}" y2="${ly + 13}" stroke="#999" stroke-width="0.5"/>`);
    ly += 14;
    for (const pin of pins) {
      legend.push(`<text x="0" y="${ly + 9}" font-size="9" fill="${PIN_COLOR[pin.kind]}" font-weight="bold">${pin.n}</text><text x="26" y="${ly + 9}" font-size="9">${pin.kind}</text><text x="86" y="${ly + 9}" font-size="9">${esc(clip(String(pin.id), 30))}</text><text x="250" y="${ly + 9}" font-size="9"${pin.skipped ? ' fill="#b00020"' : ''}>${esc(clip(String(pin.space ?? '-'), 26))}${pin.skipped ? ' (not drawn)' : ''}</text><text x="400" y="${ly + 9}" font-size="9" fill="#333">${esc(clip(pin.detail, 62))}</text>`);
      ly += 13;
    }
    ly += 6;
  }
  if (g.rules.length) {
    legend.push(`<text x="0" y="${ly + 9}" font-size="9" fill="#333">rules: ${esc(clip(g.rules.map((r) => `${r.kind ?? '?'}${r.scope ? ` (${r.scope})` : ''}`).join('; '), 120))}</text>`);
    ly += 14;
  }
  if (skippedSpaces.length || skippedLinks) {
    legend.push(`<text x="0" y="${ly + 9}" font-size="9" fill="#b00020">not drawn (no usable area): ${esc(clip(skippedSpaces.join(', ') || '-', 140))}${skippedLinks ? ` | ${skippedLinks} link(s) skipped (an end has no area)` : ''}</text>`);
    ly += 14;
  }
  const legendH = ly + 4;

  const pageW = Math.max(W + 2 * MARGIN, MIN_W);
  const pageH = HEAD + H + 26 + legendH + MARGIN;
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pageW}" height="${pageH}" viewBox="0 0 ${pageW} ${pageH}" font-family="monospace" font-size="9">`);
  o.push(`<title>${esc(title)}</title>`);
  o.push(`<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#444"/></marker><marker id="arrowC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="${COOP_COLOR}"/></marker></defs>`);
  o.push(`<rect width="${pageW}" height="${pageH}" fill="#ffffff"/>`);
  o.push(...head);
  o.push(`<g id="plan" transform="translate(${MARGIN},${HEAD})">`, ...plan, '</g>');
  o.push(`<g id="legend" transform="translate(${MARGIN},${HEAD + H + 18})">`, ...legend, '</g>');
  o.push('</svg>', '');
  return { svg: o.join('\n'), skippedSpaces, skippedLinks, skippedPins: unplacedPins };
}

// ---- CLI
function parseArgs(argv) {
  const a = { files: [], out: null, base: null, title: null, rooms: null, baseBounds: null, dumpRooms: null };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const val = () => {
      if (i + 1 >= argv.length) throw new Error(`${t} needs a value`);
      return argv[++i];
    };
    if (t === '--out') a.out = val();
    else if (t === '--base') a.base = val();
    else if (t === '--title') a.title = val();
    else if (t === '--rooms') a.rooms = val();
    else if (t === '--base-bounds') a.baseBounds = val();
    else if (t === '--dump-rooms') a.dumpRooms = val();
    else if (t.startsWith('--')) throw new Error(`unknown option ${t}`);
    else a.files.push(t);
  }
  return a;
}

async function dumpRooms(mapId) {
  const { createServer } = await import('vite'); // only this mode needs Vite
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { LevelBuilder } = await server.ssrLoadModule('/src/world/levelBuilder.ts');
    const { getMap } = await server.ssrLoadModule('/src/world/maps/index.ts');
    const def = getMap(mapId);
    if (!def || def.id !== mapId) throw new Error(`no map '${mapId}'`);
    const lay = def.build(new LevelBuilder(), 0); // the rooms come with the built layout (as scripts/plan-svg.mjs builds a map)
    const out = {};
    for (const r of lay.rooms ?? def.rooms ?? []) out[r.id] = [r.minX, r.minZ, r.maxX, r.maxZ];
    return out;
  } finally {
    await server.close();
  }
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.dumpRooms) {
    process.stdout.write(JSON.stringify(await dumpRooms(a.dumpRooms), null, 1) + '\n');
    return;
  }
  if (!a.files.length) {
    process.stderr.write('usage: node scripts/graph-svg.mjs <graph.json...> [--out <file.svg>] [--base <plan.svg>] [--title <t>] [--rooms <rooms.json>] [--base-bounds minX,minZ,maxX,maxZ]\n       node scripts/graph-svg.mjs --dump-rooms <mapId>\n');
    process.exit(2);
  }
  const graphs = a.files.map((p) => JSON.parse(readFileSync(p, 'utf8')));
  const rooms = a.rooms ? JSON.parse(readFileSync(a.rooms, 'utf8')) : {};
  const base = a.base ? readFileSync(a.base, 'utf8') : undefined;
  const r = buildSvg({ graphs, names: a.files, rooms, title: a.title ?? undefined, base, baseBounds: a.baseBounds ?? undefined });
  if (r.skippedSpaces.length) process.stderr.write(`graph-svg: ${r.skippedSpaces.length} space(s) not drawn (no usable area${a.rooms ? '' : '; RoomDef ids need --rooms'}): ${r.skippedSpaces.join(', ')}\n`);
  if (r.skippedLinks) process.stderr.write(`graph-svg: ${r.skippedLinks} link(s) skipped (an end has no area)\n`);
  if (a.out) writeFileSync(a.out, r.svg);
  else process.stdout.write(r.svg);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    process.stderr.write(`graph-svg: ${e.message}\n`);
    process.exit(1);
  });
}
