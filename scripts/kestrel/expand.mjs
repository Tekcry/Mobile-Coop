// Module kit expander: turns docs/kestrel/kestrel.layout.json (placements of pre-checked rooms) into rooms, walls,
// openings, objects, stairs, ladders and voids in docs/kestrel/kestrel.arch.json.
//   node scripts/kestrel/expand.mjs [--layout docs/kestrel/kestrel.layout.json] [--arch <existing arch>] [--out docs/kestrel/kestrel.arch.json]
//                                   [--modules scripts/kestrel/modules.json] [--list] [--dry]
// Items this tool wrote carry "gen": "<placement id>" and are rewritten on every run. Items marked "manual": true, and items
// with no "gen" tag, are kept untouched. Every rule number is read from facts.json; "@a.b" values in modules.json are facts.
// Format and rules: docs/kestrel/schema.md section 7.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERE, clearRect, loadFacts, readJson } from './lib.mjs';

const EPS = 1e-6;
const ROTS = [0, 90, 180, 270];
const CW = ['N', 'E', 'S', 'W'];
const TABLES = ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'objects'];
const KEY_ORDER = ['meta', 'levels', 'rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'objects', 'exterior', 'services'];

const clean = (v) => +v.toFixed(6);
const snap = (v, g) => clean(Math.round(v / g) * g);
const ceilTo = (v, g) => clean(Math.ceil(v / g - EPS) * g);
const floorTo = (v, g) => clean(Math.floor(v / g + EPS) * g);
const isMult = (v, g) => Math.abs(v / g - Math.round(v / g)) < EPS;
const rotSide = (side, rot) => CW[(CW.indexOf(side) + ROTS.indexOf(rot)) % CW.length];
const sideAxis = (side) => (side === 'S' || side === 'N' ? 'h' : 'v');

/** Local (module frame, south-west corner 0,0) to world offset from the placed rect's south-west corner, and back. rw, rd = local rect size. */
function frame(rot, rw, rd) {
  const fwd = (x, z) => (rot === 0 ? [x, z] : rot === 90 ? [z, rw - x] : rot === 180 ? [rw - x, rd - z] : [rd - z, x]);
  const inv = (X, Z) => (rot === 0 ? [X, Z] : rot === 90 ? [rw - Z, X] : rot === 180 ? [rw - X, rd - Z] : [Z, rd - X]);
  return { fwd, inv };
}

export function loadModules(file = path.join(HERE, 'modules.json')) {
  const raw = readJson(file);
  return new Map((raw.modules ?? []).map((m) => [m.id, m]));
}

/** Wall-centreline rect size for a nominal clear size: clear plus the thickest wall, rounded up to the grid. */
export function rectSizeFor(clear, g, wallExt) {
  return [ceilTo(clear[0] + wallExt, g), ceilTo(clear[1] + wallExt, g)];
}

/**
 * Expand a layout. Returns { arch, warnings, outside, errors }. `base` is the existing arch (or null); its manual items are kept.
 * Pure: no files are read or written here.
 */
export function expandLayout({ layout, base = null, modules, facts = loadFacts() }) {
  const errors = [];
  const warnings = [];
  const outside = [];
  const fail = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const F = facts.fact;

  const arch = base ? JSON.parse(JSON.stringify(base)) : { meta: {}, levels: [] };
  if (layout.meta) arch.meta = { ...(arch.meta ?? {}), ...layout.meta };
  if (layout.levels) arch.levels = layout.levels;
  for (const t of TABLES) arch[t] = (arch[t] ?? []).filter((x) => !(x.gen !== undefined && !x.manual));
  for (const t of ['exterior', 'services']) arch[t] ??= [];
  const g = arch.meta?.grid;
  const og = arch.meta?.objectGrid;
  if (!(g > 0) || !(og > 0)) { fail('meta.grid and meta.objectGrid are needed (in the arch file or in the layout meta)'); return { arch, warnings, outside, errors }; }
  const levels = [...(arch.levels ?? [])].sort((a, b) => a.floor - b.floor);
  const levelIdx = new Map(levels.map((l, i) => [l.id, i]));
  /** A level's footprint as a list of rects (one rect or a list), or null when it has none (it then covers everything). */
  const footprintOf = (l) => {
    const rect = (r) => Array.isArray(r) && r.length === 4 && r.every(Number.isFinite);
    return rect(l.footprint) ? [l.footprint] : Array.isArray(l.footprint) && l.footprint.length && l.footprint.every(rect) ? l.footprint : null;
  };
  /**
   * The levels a placement stands on, bottom to top: its base level, then every higher level whose footprint covers the placement's centre
   * (a level with no footprint covers everything). Levels may overlap in height when their footprints do not (a hall block's low roof level
   * H beside a two-storey strip), so the next level up in the sorted list is not always the next level of this stack.
   */
  const stackAt = (i0, rect) => {
    const cx = (rect[0] + rect[2]) / 2;
    const cz = (rect[1] + rect[3]) / 2;
    return levels.filter((l, i) => i === i0 || (i > i0 && ((fp) => !fp || fp.some((r) => cx >= r[0] && cx <= r[2] && cz >= r[1] && cz <= r[3]))(footprintOf(l))));
  };
  const wallExt = F('rules.wallExterior');
  const wallInt = F('rules.wallInterior');
  if (wallExt === undefined || wallInt === undefined) { fail('facts.json: rules.wallExterior and rules.wallInterior are needed'); return { arch, warnings, outside, errors }; }

  /** A number, or "@a.b" read from facts.json. */
  const val = (v, label) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.startsWith('@')) {
      const x = F(v.slice(1));
      if (x === undefined) { fail(`${label}: fact ${v.slice(1)} is not in facts.json`); return 0; }
      return x;
    }
    fail(`${label}: "${v}" is not a number or @fact`);
    return 0;
  };

  // ---------- placements to cells (one cell per placement per level) ----------
  const cells = [];
  const seenIds = new Set();
  for (const p of [...(layout.placements ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const label = `placement ${p.id}`;
    const m = modules.get(p.module);
    if (!m) { fail(`${label}: unknown module "${p.module}"`); continue; }
    if (seenIds.has(p.id)) { fail(`${label}: duplicate placement id`); continue; }
    seenIds.add(p.id);
    const rot = p.rot ?? ROTS[0];
    if (!ROTS.includes(rot)) { fail(`${label}: rot ${rot} is not one of ${ROTS.join(', ')}`); continue; }
    const i0 = levelIdx.get(p.level);
    if (i0 === undefined) { fail(`${label}: unknown level ${p.level}`); continue; }
    if (!Array.isArray(p.at) || p.at.length !== 2 || !p.at.every((v) => typeof v === 'number' && isMult(v, g))) { fail(`${label}: at must be [x, z] on the ${g} m grid`); continue; }
    const clear = p.size ?? m.sizes[0];
    const offered = m.sizes.some((s) => s[0] === clear[0] && s[1] === clear[1]);
    if (!offered) {
      const mn = m.sizeMin ?? [Math.min(...m.sizes.map((s) => s[0])), Math.min(...m.sizes.map((s) => s[1]))];
      if (!m.free || !clear.every((v) => isMult(v, g)) || clear[0] < mn[0] || clear[1] < mn[1]) {
        fail(`${label}: size [${clear.join(', ')}] is not offered by ${m.id} (offered ${m.sizes.map((s) => `[${s.join(', ')}]`).join(' ')}${m.free ? `, or any size on the grid from [${mn.join(', ')}]` : ''})`);
        continue;
      }
    }
    const [rw, rd] = rectSizeFor(clear, g, wallExt);
    const swap = rot === ROTS[1] || rot === ROTS[3];
    const W = swap ? rd : rw;
    const D = swap ? rw : rd;
    const rect = [p.at[0], p.at[1], clean(p.at[0] + W), clean(p.at[1] + D)];
    const stack = stackAt(i0, rect);
    const stackIdx = (id) => { const i = stack.findIndex((l) => l.id === id); return i < 0 ? NaN : i; };
    let span = m.stair ? m.stair.span ?? 1 : 0;
    if (p.to !== undefined) span = stackIdx(p.to);
    else if (span === 'roof') span = stackIdx('R');
    if (!(span >= 0) || span >= stack.length) { fail(`${label}: the stack of levels above ${p.level} does not exist`); continue; }
    for (let k = 0; k <= span; k++) {
      const lvl = stack[k];
      const top = k === span && span > 0 && m.stair?.roofCeiling !== undefined && lvl.id === 'R';
      cells.push({
        id: k === 0 ? p.id : p.ids?.[lvl.id] ?? `${p.id}.${lvl.id}`,
        level: lvl.id, k, span, stack, p, m, rot, clear, rw, rd, rect,
        ceiling: top ? val(m.stair.roofCeiling, `${m.id}.roofCeiling`) : val(m.ceiling, `${m.id}.ceiling`),
        boundary: m.wallKind === 'boundary',
        open: new Set(p.open ?? []),
        origin: [rect[0], rect[1]],
        ...frame(rot, rw, rd),
      });
    }
  }
  if (errors.length) return { arch, warnings, outside, errors };

  // ---------- rooms ----------
  const newRooms = cells.map((c) => ({
    id: c.id, level: c.level, name: c.p.label ?? c.m.name, kind: c.m.kind, rect: [...c.rect], ceiling: c.ceiling, finish: c.m.finish,
    minShort: Math.min(c.clear[0], c.clear[1]), open: [...c.open], ring: c.p.ring ?? c.m.ring, module: c.m.id, zone: c.p.zone ?? c.m.zone, ...(c.m.service ? { service: true } : {}), gen: c.p.id,
  }));

  // ---------- walls: shared walls merge into one, collinear touching walls of one kind join ----------
  const newWalls = [];
  const lineMap = new Map(); // `${level}|${axis}|${c}` -> { axis, c, level, segs }
  for (const c of cells) {
    const [x0, z0, x1, z1] = c.rect;
    for (const [axis, line, lo, hi, side] of [['h', z0, x0, x1, 'S'], ['h', z1, x0, x1, 'N'], ['v', x0, z0, z1, 'W'], ['v', x1, z0, z1, 'E']]) {
      const key = `${c.level}|${axis}|${line}`;
      if (!lineMap.has(key)) lineMap.set(key, { axis, c: line, level: c.level, segs: [] });
      lineMap.get(key).segs.push({ lo, hi, cell: c, side });
    }
  }
  const lines = [...lineMap.values()].sort((a, b) => a.level.localeCompare(b.level) || a.axis.localeCompare(b.axis) || a.c - b.c);
  const wallCount = new Map();
  for (const ln of lines) {
    const pts = [...new Set(ln.segs.flatMap((s) => [s.lo, s.hi]))].sort((a, b) => a - b);
    const spans = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const [p, q] = [pts[i], pts[i + 1]];
      const cov = ln.segs.filter((s) => s.lo <= p + EPS && s.hi >= q - EPS);
      if (!cov.length || !cov.some((s) => !s.cell.open.has(s.side))) continue;
      const owners = [...new Set(cov.map((s) => s.cell))].sort((a, b) => a.id.localeCompare(b.id));
      const boundary = owners.every((o) => o.boundary);
      const kind = boundary ? 'boundary' : owners.length > 1 ? 'interior' : 'exterior';
      const t = kind === 'interior' ? wallInt : wallExt;
      const h = Math.max(...owners.map((o) => o.ceiling));
      const last = spans[spans.length - 1];
      if (last && Math.abs(last.q - p) < EPS && last.kind === kind && last.t === t && last.h === h) last.q = q;
      else spans.push({ p, q, kind, t, h, owner: owners[0] });
    }
    for (const s of spans) {
      const n = (wallCount.get(s.owner.id) ?? 0) + 1;
      wallCount.set(s.owner.id, n);
      newWalls.push({
        id: `${s.owner.id}-W${n}`, level: ln.level,
        a: ln.axis === 'h' ? [s.p, ln.c] : [ln.c, s.p], b: ln.axis === 'h' ? [s.q, ln.c] : [ln.c, s.q],
        t: s.t, h: s.h, kind: s.kind, gen: s.owner.p.id,
      });
    }
  }
  const allWalls = [...arch.walls, ...newWalls];
  const wallsOn = (level) => allWalls.filter((w) => w.level === level);
  const findWall = (level, axis, line, pos) => newWalls.find((w) => w.level === level && (axis === 'h' ? w.a[1] === line && w.b[1] === line : w.a[0] === line && w.b[0] === line)
    && pos >= Math.min(axis === 'h' ? w.a[0] : w.a[1], axis === 'h' ? w.b[0] : w.b[1]) - EPS && pos <= Math.max(axis === 'h' ? w.a[0] : w.a[1], axis === 'h' ? w.b[0] : w.b[1]) + EPS);

  // ---------- openings ----------
  const newOpenings = [];
  for (const c of cells) {
    const specs = (c.p.doors ?? c.m.doors ?? []).filter((d) => !(c.p.skipDoors ?? []).includes(d.key));
    for (const d of specs) {
      const label = `${c.id} door ${d.key}`;
      const rule = d.levels ?? 'all';
      if ((rule === 'base' && c.k !== 0) || (rule === 'upper' && c.k === 0)) continue;
      if (!['S', 'E', 'N', 'W'].includes(d.side)) { fail(`${label}: side "${d.side}" is not S, E, N or W`); continue; }
      const along = d.side === 'S' || d.side === 'N' ? c.rw : c.rd;
      let at = d.at === 'centre' ? snap(along / 2, g) : val(d.at, `${label} at`);
      if (d.from === 'end') at = along - at;
      const local = d.side === 'S' ? [at, 0] : d.side === 'N' ? [at, c.rd] : d.side === 'W' ? [0, at] : [c.rw, at];
      const off = c.fwd(local[0], local[1]);
      const world = [clean(c.origin[0] + off[0]), clean(c.origin[1] + off[1])];
      const axis = sideAxis(rotSide(d.side, c.rot));
      const line = axis === 'h' ? world[1] : world[0];
      const pos = axis === 'h' ? world[0] : world[1];
      const w = val(d.w, `${label} w`);
      const wall = findWall(c.level, axis, line, pos);
      if (!wall) { warn(`${label}: no wall at (${world.join(', ')}) (the edge is open or has no wall), door not made`); continue; }
      const lo = axis === 'h' ? Math.min(wall.a[0], wall.b[0]) : Math.min(wall.a[1], wall.b[1]);
      const hi = axis === 'h' ? Math.max(wall.a[0], wall.b[0]) : Math.max(wall.a[1], wall.b[1]);
      if (pos - w / 2 < lo - EPS || pos + w / 2 > hi + EPS) { warn(`${label}: sticks out of wall ${wall.id}, door not made`); continue; }
      const other = lineMap.get(`${c.level}|${axis}|${line}`).segs.find((s) => s.cell !== c && s.lo <= pos + EPS && s.hi >= pos - EPS);
      const rec = {
        id: `${c.id}-D${d.key}`, wall: wall.id, at: clean(pos - lo), w, h: val(d.h, `${label} h`), sill: d.sill === undefined ? 0 : val(d.sill, `${label} sill`),
        type: d.type ?? 'door', between: [c.id, other ? other.cell.id : ''], locked: d.locked ?? false, key: d.keyName ?? '', reason: d.reason ?? '', gen: c.p.id,
      };
      const clash = newOpenings.find((o) => o.wall === rec.wall && Math.abs(o.at - rec.at) < (o.w + rec.w) / 2 - EPS);
      if (clash) { warn(`${rec.id} (${c.id}) overlaps ${clash.id} on ${rec.wall}; ${clash.id} is kept`); continue; }
      newOpenings.push(rec);
      if (rec.between[1] === '' && rec.type !== 'window') outside.push(`${rec.id} (${rec.type}) on ${rec.wall} at (${world.join(', ')}) opens to the outside`);
    }
  }

  // ---------- objects ----------
  const newObjects = [];
  /** Anchored start of an object along one local axis, and the direction repeats run in. */
  const anchorAxis = (spec, size, lo, hi, label) => {
    const [anchor, gapRaw] = spec;
    const gap = val(gapRaw ?? 0, `${label} gap`);
    if (anchor === 'W' || anchor === 'S') return { start: lo + gap, dir: 1 };
    if (anchor === 'E' || anchor === 'N') return { start: hi - gap - size, dir: -1 };
    return { start: (lo + hi) / 2 - size / 2 + gap, dir: 1 };
  };
  for (const c of cells) {
    if (c.k !== 0 || !(c.m.objects ?? []).length) continue;
    const wc = clearRect({ level: c.level, rect: c.rect }, wallsOn(c.level));
    const wr = [ceilTo(wc[0], og), ceilTo(wc[1], og), floorTo(wc[2], og), floorTo(wc[3], og)];
    const a = c.inv(wr[0] - c.origin[0], wr[1] - c.origin[1]);
    const b = c.inv(wr[2] - c.origin[0], wr[3] - c.origin[1]);
    const LC = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
    let n = 0;
    for (const spec of c.m.objects) {
      const label = `${c.id} object "${spec.name}"`;
      const [sw, sd] = spec.size.map((v) => val(v, `${label} size`));
      const y = spec.y ?? 0;
      const h = val(spec.h, `${label} h`);
      const noLedge = spec.noLedge ?? (F('lip.autoHeight') !== undefined && y + h >= F('lip.autoHeight') - EPS);
      const size = { x: sw, z: sd };
      const ax = { x: anchorAxis(spec.x, sw, LC[0], LC[2], label), z: anchorAxis(spec.z, sd, LC[1], LC[3], label) };
      const lim = { x: [LC[0], LC[2]], z: [LC[1], LC[3]] };
      const pos = { x: [ax.x.start], z: [ax.z.start] };
      for (const r of spec.repeat ?? []) {
        const axis = r.axis;
        const pitch = typeof r.pitch === 'string' && r.pitch.startsWith('size+') ? size[axis] + val(r.pitch.slice(5), `${label} pitch`) : val(r.pitch, `${label} pitch`);
        const endGap = val(r.endGap ?? 0, `${label} endGap`);
        const { start, dir } = ax[axis];
        const [lo, hi] = lim[axis];
        const fit = dir > 0 ? Math.floor((hi - endGap - start - size[axis]) / pitch + EPS) + 1 : Math.floor((start - lo - endGap) / pitch + EPS) + 1;
        const count = r.count === 'fit' ? fit : r.count;
        pos[axis] = Array.from({ length: Math.max(0, count) }, (_, i) => start + dir * i * pitch);
      }
      for (const px of pos.x) {
        for (const pz of pos.z) {
          const l = [snap(px, og), snap(pz, og), snap(px + sw, og), snap(pz + sd, og)];
          if (l[0] < LC[0] - EPS || l[1] < LC[1] - EPS || l[2] > LC[2] + EPS || l[3] > LC[3] + EPS) { warn(`${label} does not fit the clear room of ${c.id}, skipped`); continue; }
          const p0 = c.fwd(l[0], l[1]);
          const p1 = c.fwd(l[2], l[3]);
          const wx = [c.origin[0] + p0[0], c.origin[0] + p1[0]];
          const wz = [c.origin[1] + p0[1], c.origin[1] + p1[1]];
          n += 1;
          newObjects.push({
            id: `${c.id}-O${n}`, level: c.level, name: spec.name, rect: [snap(Math.min(...wx), og), snap(Math.min(...wz), og), snap(Math.max(...wx), og), snap(Math.max(...wz), og)],
            h, y, noLedge, reason: spec.reason ?? '', gen: c.p.id,
          });
        }
      }
    }
  }

  // ---------- stairs, ladders, voids ----------
  const newStairs = [];
  const newLadders = [];
  const newVoids = [];
  const gridInward = (wc) => [ceilTo(wc[0], g), ceilTo(wc[1], g), floorTo(wc[2], g), floorTo(wc[3], g)];
  const risePerStep = F('stair.riserHeight');
  for (const c of cells) {
    const i0 = c.k;
    const label = `${c.id}`;
    const cellRect = () => gridInward(clearRect({ level: c.level, rect: c.rect }, wallsOn(c.level)));
    if (c.m.stair && c.k < c.span) {
      const from = c.stack[i0];
      const to = c.stack[i0 + 1];
      if (risePerStep === undefined) { fail('facts.json: stair.riserHeight is needed'); continue; }
      const dogleg = c.m.stair.layout === 'dogleg';
      // a dog-leg fills its room (two flights side by side), so its rect is the room rect; a straight run is the clear room rounded inward
      const rect = dogleg ? [...c.rect] : cellRect();
      newStairs.push({
        id: `${c.p.id}-S${from.id}${to.id}`, kind: c.m.stair.kind, ...(dogleg ? { layout: 'dogleg' } : {}), from: from.id, to: to.id, rect, up: rotSide(c.m.stair.up, c.rot),
        width: val(c.m.stair.width, `${label} stair width`), risers: Math.round((to.floor - from.floor) / risePerStep), gen: c.p.id,
      });
      newVoids.push({ id: `${c.p.id}-V${to.id}`, level: to.id, rect, kind: 'stairwell', reason: c.m.stair.reason ?? 'Stair well over the stair.', gen: c.p.id });
    }
    if (c.k !== 0) continue;
    if (c.m.ladder) {
      const lad = c.m.ladder;
      const up = c.stack[i0 + 1];
      if (!up) { fail(`${label}: a ladder needs a level above ${c.level}`); continue; }
      const gap = snap(val(lad.zFromFar, `${label} ladder gap`), g);
      const across = lad.x === 'centre' ? snap((lad.facing === 'N' || lad.facing === 'S' ? c.rw : c.rd) / 2, g) : val(lad.x, `${label} ladder x`);
      const local = lad.facing === 'N' ? [across, c.rd - gap] : lad.facing === 'S' ? [across, gap] : lad.facing === 'E' ? [c.rw - gap, across] : [gap, across];
      const off = c.fwd(local[0], local[1]);
      newLadders.push({ id: `${c.p.id}-L`, room: c.id, at: [clean(c.origin[0] + off[0]), clean(c.origin[1] + off[1])], from: c.level, to: up.id, facing: rotSide(lad.facing, c.rot), reason: lad.reason ?? '', gen: c.p.id });
    }
    if (c.m.voidAbove) {
      const up = c.stack[i0 + 1];
      if (!up) { fail(`${label}: a shaft needs a level above ${c.level}`); continue; }
      newVoids.push({ id: `${c.p.id}-V`, level: up.id, rect: cellRect(), kind: c.m.voidAbove.kind, reason: c.m.voidAbove.reason ?? '', gen: c.p.id });
    }
  }

  // ---------- assemble ----------
  const add = (table, list) => {
    const have = new Set((arch[table] ?? []).map((x) => x.id));
    for (const x of list) {
      if (have.has(x.id)) fail(`${table}: generated id ${x.id} is already used by a kept item`);
      have.add(x.id);
    }
    arch[table] = [...(arch[table] ?? []), ...list];
  };
  add('rooms', newRooms);
  add('walls', newWalls);
  add('openings', newOpenings);
  add('stairs', newStairs);
  add('ladders', newLadders);
  add('voids', newVoids);
  add('objects', newObjects);
  return { arch, warnings, outside, errors };
}

/** One table per line, so a diff of the arch file reads. */
export function formatArch(arch) {
  const keys = [...KEY_ORDER.filter((k) => k in arch), ...Object.keys(arch).filter((k) => !KEY_ORDER.includes(k))];
  const body = keys.map((k) => {
    const v = arch[k];
    if (Array.isArray(v)) return `  ${JSON.stringify(k)}: [${v.length ? `\n${v.map((x) => `    ${JSON.stringify(x)}`).join(',\n')}\n  ` : ''}]`;
    return `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  return `{\n${body.join(',\n')}\n}\n`;
}

function listModules(modules, facts, g) {
  const ext = facts.fact('rules.wallExterior');
  const lines = [];
  for (const m of modules.values()) {
    const sizes = m.sizes.map((s) => (g > 0 ? `${s[0]} x ${s[1]} -> rect ${rectSizeFor(s, g, ext).join(' x ')}` : `${s[0]} x ${s[1]}`)).join('; ');
    lines.push(`${m.id.padEnd(20)} ring ${String(m.ring).padEnd(2)} ${m.kind.padEnd(8)} ${sizes}${m.free ? ' (any size from the grid)' : ''}`);
  }
  return lines;
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const root = path.join(HERE, '..', '..');
  const layoutFile = flag('--layout') ?? path.join(root, 'docs', 'kestrel', 'kestrel.layout.json');
  const outFile = flag('--out') ?? path.join(root, 'docs', 'kestrel', 'kestrel.arch.json');
  const archFile = flag('--arch') ?? outFile;
  const modules = loadModules(flag('--modules'));
  const facts = loadFacts();
  if (argv.includes('--list')) {
    const grid = (fs.existsSync(layoutFile) ? readJson(layoutFile).meta?.grid : undefined) ?? (fs.existsSync(archFile) ? readJson(archFile).meta?.grid : undefined);
    for (const l of listModules(modules, facts, grid)) console.log(l);
    return;
  }
  const { arch, warnings, outside, errors } = expandLayout({
    layout: readJson(layoutFile),
    base: fs.existsSync(archFile) ? readJson(archFile) : null,
    modules,
    facts,
  });
  for (const w of warnings) console.log(`WARN  ${w}`);
  for (const o of outside) console.log(`INFO  ${o}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  if (errors.length) { console.log(`\n${errors.length} error(s); nothing written`); process.exit(1); }
  const n = (t) => (arch[t] ?? []).filter((x) => x.gen !== undefined).length;
  console.log(`\nexpanded: ${n('rooms')} rooms, ${n('walls')} walls, ${n('openings')} openings, ${n('objects')} objects, ${n('stairs')} stairs, ${n('ladders')} ladders, ${n('voids')} voids; ${warnings.length} warning(s)`);
  if (argv.includes('--dry')) return;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, formatArch(arch));
  console.log(`wrote ${path.relative(root, outFile)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
