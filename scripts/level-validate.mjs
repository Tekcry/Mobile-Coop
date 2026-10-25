#!/usr/bin/env node
// level-validate: checks a map's connectivity graph (docs/level-validator/graph-schema.md) against the level standard
// (docs/level-design.md, its rule index and mode profiles) before any geometry is built. `meta.mode` picks the profile:
// `campaign` (two players, a forced co-op gate per section, gate reach, the alive ceiling), `sector` (Sector Ops: 1-4
// players, no softlock, the alive ceiling, an unavoidable guard) or `training` (Marlow Yard: one guided route, no
// route-count, gate or softlock checks; timed drills allowed). A port of the reference
// skill's validate_level.py (docs/level-validator/source/, algorithms only: reach, edge-disjoint routes); our rules win.
// Every size and time comes from the metrics JSON generated from docs/design/scale-sheet.md (M2): this file holds no
// size or time constant. A metrics key the check needs but the sheet lacks prints one WARN and the check is skipped;
// with no metrics file at all, one WARN and every size / time check is skipped. Rule structure (3 approaches, 2 kinds,
// 2 routes, half the encounters, the 1-5 tension scale) is the standard's wording and lives here.
//
//   node scripts/level-validate.mjs <graph.json> [more.json ...] [--metrics <file>]
//   --metrics: default docs/design/metrics.json (repo root). Several files are one map, one file per section (merged).
//   Prints ERROR: / WARN: / INFO: lines, then "N error(s), M warning(s)."
//   Exit: 0 no error, 1 any error, 2 bad usage (no file, unreadable or invalid JSON, unknown flag).
//
// Pure parts (`mergeGraphs`, `validate`, the `check*` functions, `edgeDisjointPaths`) are exported for
// tests/levelValidate.test.ts. Each check takes (graph, metrics) and returns { errors, warns, infos }; every check but
// `checkStructure` expects a graph that passes `checkStructure` (`validate` stops there on a structure error).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_METRICS = 'docs/design/metrics.json';

export const SPACE_TYPES = new Set(['encounter', 'connector', 'hub', 'safe_room', 'objective', 'reward', 'exterior',
  'utility', 'stair_core', 'duct']);
export const LINK_KINDS = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair',
  'open_stair', 'ladder', 'duct', 'tunnel', 'window', 'hatch', 'ledge', 'pipe', 'drop', 'wall_jump', 'split_jump',
  'coop_boost', 'human_ladder', 'pair_gate', 'team_rope', 'rappel', 'team_throw', 'team_hang', 'team_pull', 'shutter']);
/** Kinds that need two players (graph-schema "Link kinds" + lead decisions 1-2; the kit moves team_throw, team_hang,
 *  team_pull, shutter: G293, mission-framework A17). */
export const COOP_KINDS = new Set(['coop_boost', 'human_ladder', 'pair_gate', 'team_rope', 'team_throw', 'team_hang',
  'team_pull', 'shutter']);
/** Co-op kinds a pair moves through both ways and that stay open once passed (a team door, a held shutter): judged both
 *  ways for a solo twin; their own way back for gate reach. */
const TWO_WAY_GATES = new Set(['pair_gate', 'shutter']);
/** One way unless the link sets `one_way: false`. */
const ONE_WAY_KINDS = new Set(['drop', 'rappel']);
/** Kinds walked at the metrics speeds; every other kind (climb, crawl, shimmy, co-op move) needs `time_s` on a timed
 *  path (lead decision 5). */
const WALK_KINDS = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair', 'open_stair',
  'tunnel', 'pair_gate']);
/** Kinds whose `width` / `height` are required (graph-schema: openings, passages, stairs, ducts). */
const NEEDS_WIDTH = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair', 'open_stair',
  'duct', 'tunnel', 'pair_gate', 'split_jump', 'shutter', 'team_throw']);
const NEEDS_HEIGHT = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'duct', 'tunnel',
  'pair_gate', 'split_jump']);
/** Climbs and drops carry the height they cover. */
const NEEDS_LEVEL = new Set(['ladder', 'drop', 'wall_jump', 'coop_boost', 'human_ladder', 'team_rope', 'rappel',
  'team_hang', 'team_pull']);
/** Widths on the 0.5 m grid: room-scale passages. Door, stair and duct widths are sheet sizes (1.2, 1.3, 2.4), not
 *  grid steps, so they are checked by their kind rule only. */
const GRID_WIDTH_KINDS = new Set(['corridor', 'opening', 'roller_door']);
const ROUTES = new Set(['shadow', 'high', 'loud', 'secret', 'spine']);
/** The approach kinds every encounter space needs (level-design 3.2). */
const NEEDED_ROUTES = ['shadow', 'high', 'loud'];
const MODES = new Set(['campaign', 'sector', 'training']);
/** The training profile (Marlow Yard) is one guided route: no route-count checks (level-design 3.2, 3.3, 11.2; G292). */
const routeRules = (meta) => meta.mode !== 'training';
const PLAIN_TAGS = new Set(['start', 'exfil', 'objective', 'checkpoint', 'reward', 'entry', 'exit', 'sync_pair',
  'unavoidable']);
/** Modes whose guards spawn on the Sector Ops runtime under its alive ceiling: Sector Ops and the campaign (campaign
 *  missions run on `SectorMode`, mission-framework A6; Michael 2026-10-25 ~11:35: "32 alive"). */
const ALIVE_CEILING_MODES = new Set(['sector', 'campaign']);
const SPLIT_TAG = /^split:(.+):(a|b)$/;
const OVERWATCH_TAG = /^overwatch:(.+)$/;
/** Beat chart (level-design 6.2): 4-5 is a high beat, 1-2 a release; a `spine` link counts as a release (decision 3). */
const HIGH_BEAT = 4;
const RELEASE_BEAT = 2;
const EPS = 1e-9;

// ---------------------------------------------------------------------------------------------------------------
// Report and metrics access

/** A report plus `need`: the metrics value at a dotted path, or undefined after one WARN (INFO for INFO-only checks)
 *  naming the missing key. With `metrics` null nothing is printed here (`validate` prints the one WARN). */
function collector(metrics) {
  const r = { errors: [], warns: [], infos: [] };
  const asked = new Set();
  const lookup = (key) => {
    let v = metrics;
    for (const k of key.split('.')) v = v != null && typeof v === 'object' ? v[k] : undefined;
    return v;
  };
  const miss = (key, what, level, why) => {
    if (asked.has(key)) return;
    asked.add(key);
    (level === 'info' ? r.infos : r.warns).push(`metrics: ${key} ${why}; ${what} skipped`);
  };
  return {
    r,
    err: (m) => r.errors.push(m),
    warn: (m) => r.warns.push(m),
    info: (m) => r.infos.push(m),
    /** A number at `key`. */
    num(key, what, level = 'warn') {
      if (!metrics) return undefined;
      const v = lookup(key);
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      miss(key, what, level, v === undefined ? 'is missing from the metrics' : 'is not a number');
      return undefined;
    },
    /** A [min, max] pair at `key`. */
    range(key, what, level = 'warn') {
      if (!metrics) return undefined;
      const v = lookup(key);
      if (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number')) return v;
      miss(key, what, level, v === undefined ? 'is missing from the metrics' : 'is not a [min, max] pair');
      return undefined;
    },
    /** The room table (any object). */
    obj(key, what) {
      if (!metrics) return undefined;
      const v = lookup(key);
      if (v && typeof v === 'object' && !Array.isArray(v)) return v;
      miss(key, what, 'warn', v === undefined ? 'is missing from the metrics' : 'is not an object');
      return undefined;
    },
  };
}

/** Short number text: 2.9, 23.1, 30. */
const fmt = (n) => String(Math.round(n * 100) / 100);
const fmtS = (n) => n.toFixed(1);
const onGrid = (v, grid) => Math.abs(v / grid - Math.round(v / grid)) < 1e-6;
const linkName = (l) => `link ${l.from} -> ${l.to} (${l.kind})`;
const hasTag = (s, t) => Array.isArray(s.tags) && s.tags.includes(t);

// ---------------------------------------------------------------------------------------------------------------
// Graph helpers

export const isOneWay = (l) => (typeof l.one_way === 'boolean' ? l.one_way : ONE_WAY_KINDS.has(l.kind));

/** Directed arcs { from, to, link } of the links `keep` accepts (two arcs for a two-way link). */
function arcsOf(links, keep = () => true) {
  const arcs = [];
  for (const l of links) {
    if (!keep(l)) continue;
    arcs.push({ from: l.from, to: l.to, link: l });
    if (!isOneWay(l)) arcs.push({ from: l.to, to: l.from, link: l });
  }
  return arcs;
}

/** Map<space id, arcs out of it>. */
function adjacency(links, keep) {
  const adj = new Map();
  for (const a of arcsOf(links, keep)) {
    let list = adj.get(a.from);
    if (!list) adj.set(a.from, (list = []));
    list.push(a);
  }
  return adj;
}

/** Ids reachable from `start` over `adj`, never entering `blocked`. */
function reachable(adj, start, blocked = null) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift();
    for (const a of adj.get(n) ?? []) {
      if (seen.has(a.to) || blocked?.has(a.to)) continue;
      seen.add(a.to);
      queue.push(a.to);
    }
  }
  return seen;
}

/** Maximum number of link-disjoint paths src -> dst (unit-capacity max flow; port of validate_level.py
 *  `edge_disjoint_paths`). One-way links carry flow one way only. */
export function edgeDisjointPaths(links, src, dst) {
  const key = (a, b) => `${a}\u0000${b}`;
  const cap = new Map();
  const adj = new Map();
  const near = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  for (const l of links) {
    cap.set(key(l.from, l.to), (cap.get(key(l.from, l.to)) ?? 0) + 1);
    if (!isOneWay(l)) cap.set(key(l.to, l.from), (cap.get(key(l.to, l.from)) ?? 0) + 1);
    near(l.from, l.to);
    near(l.to, l.from);
  }
  let flow = 0;
  for (;;) {
    const parent = new Map([[src, null]]);
    const queue = [src];
    while (queue.length && !parent.has(dst)) {
      const u = queue.shift();
      for (const v of adj.get(u) ?? []) {
        if (!parent.has(v) && (cap.get(key(u, v)) ?? 0) > 0) {
          parent.set(v, u);
          queue.push(v);
        }
      }
    }
    if (!parent.has(dst)) return flow;
    for (let v = dst; parent.get(v) !== null; v = parent.get(v)) {
      const u = parent.get(v);
      cap.set(key(u, v), cap.get(key(u, v)) - 1);
      cap.set(key(v, u), (cap.get(key(v, u)) ?? 0) + 1);
    }
    flow += 1;
  }
}

/** Shared lookups for the checks. */
function index(graph) {
  const meta = graph.meta;
  const spaces = graph.spaces;
  const links = graph.links;
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const sections = meta.sections;
  const secIndex = new Map(sections.map((s, i) => [s, i]));
  const start = spaces.find((s) => hasTag(s, 'start'))?.id;
  const exfils = spaces.filter((s) => hasTag(s, 'exfil')).map((s) => s.id);
  return { meta, spaces, links, byId, sections, secIndex, start, exfils };
}

/** Solo arcs: no co-op kind, and a `bolted` link only from its `to` end (one player at its near side cannot open it). */
const soloArcsOf = (links, keep = () => true) => arcsOf(links, (l) => !COOP_KINDS.has(l.kind) && keep(l))
  .filter((a) => !(a.link.bolted === true && a.from === a.link.from));
/** Map<space id, arcs> from a list of arcs. */
function adjOf(arcs) {
  const adj = new Map();
  for (const a of arcs) {
    if (!adj.has(a.from)) adj.set(a.from, []);
    adj.get(a.from).push(a);
  }
  return adj;
}

/** Seconds for one link: `time_s`, else `length` / speed for a walked kind; untimed otherwise (lead decision 5). */
function linkTime(l, speed) {
  if (typeof l.time_s === 'number') return { t: l.time_s, untimed: false };
  if (WALK_KINDS.has(l.kind) && typeof l.length === 'number') return { t: l.length / speed, untimed: false };
  return { t: 0, untimed: true };
}

/** Can `l` be walked into space `id`? (Either end of a two-way link; only the `to` end of a one-way link.) */
const enters = (l, id) => l.to === id || (l.from === id && !isOneWay(l));
/** Can `l` be walked out of space `id`? */
const leaves = (l, id) => l.from === id || (l.to === id && !isOneWay(l));
/** The other end of `l` from `id`. */
const otherEnd = (l, id) => (l.from === id ? l.to : l.from);

// ---------------------------------------------------------------------------------------------------------------
// Merge

/** One map from several files (one per section): `meta` from the first, `spaces` and `links` concatenated in file
 *  order, `meta.sections` unioned in file order. */
export function mergeGraphs(graphs) {
  if (!Array.isArray(graphs) || graphs.length === 0) throw new Error('mergeGraphs: no graph given');
  const first = graphs[0] ?? {};
  const meta = { ...(first.meta ?? {}) };
  const sections = [];
  const spaces = [];
  const links = [];
  for (const g of graphs) {
    for (const s of g?.meta?.sections ?? []) if (!sections.includes(s)) sections.push(s);
    if (Array.isArray(g?.spaces)) spaces.push(...g.spaces);
    if (Array.isArray(g?.links)) links.push(...g.links);
  }
  meta.sections = sections;
  return { meta, spaces, links };
}

// ---------------------------------------------------------------------------------------------------------------
// Checks

/** Required fields, enums, unique ids, known references, one start, an exfil (campaign). */
export function checkStructure(graph) {
  const c = collector(null);
  const meta = graph?.meta;
  if (!meta || typeof meta !== 'object') {
    c.err('meta: missing');
  } else {
    for (const k of ['map', 'name', 'mode']) {
      if (typeof meta[k] !== 'string' || !meta[k].trim()) c.err(`meta.${k}: missing`);
    }
    if (typeof meta.mode === 'string' && meta.mode && !MODES.has(meta.mode)) {
      c.err(`meta.mode: '${meta.mode}' is not campaign, sector or training (arena is parked)`);
    }
    if (!Array.isArray(meta.players) || !meta.players.length || !meta.players.every((p) => Number.isInteger(p) && p > 0)) {
      c.err('meta.players: needs the player counts, e.g. [2]');
    } else if ((meta.mode === 'campaign' || meta.mode === 'training') && (meta.players.length !== 1 || meta.players[0] !== 2)) {
      c.err(`meta.players: a ${meta.mode} map is two players, [2] (G2, G50, G308), not [${meta.players.join(', ')}]`);
    } else if (meta.mode === 'sector' && meta.players.some((p) => p > 4)) {
      c.err(`meta.players: Sector Ops is 1-4 players (G308), not [${meta.players.join(', ')}]`);
    }
    if (!Array.isArray(meta.sections) || !meta.sections.length || !meta.sections.every((s) => typeof s === 'string' && s)) {
      c.err('meta.sections: needs the section ids in spine order');
    } else if (new Set(meta.sections).size !== meta.sections.length) {
      c.err('meta.sections: duplicate section id');
    }
  }
  const spaces = Array.isArray(graph?.spaces) ? graph.spaces : null;
  const links = Array.isArray(graph?.links) ? graph.links : null;
  if (!spaces) c.err('spaces: missing (an array)');
  if (!links) c.err('links: missing (an array)');
  if (!spaces || !links) return c.r;

  const sections = new Set(Array.isArray(meta?.sections) ? meta.sections : []);
  const ids = new Set();
  spaces.forEach((s, i) => {
    const id = typeof s?.id === 'string' && s.id ? s.id : null;
    const name = id ?? `spaces[${i}]`;
    if (!id) c.err(`${name}: id missing`);
    else if (ids.has(id)) c.err(`${id}: duplicate space id`);
    else ids.add(id);
    if (typeof s?.section !== 'string' || !s.section) c.err(`${name}: section missing (M3)`);
    else if (!sections.has(s.section)) c.err(`${name}: section '${s.section}' is not in meta.sections`);
    if (!SPACE_TYPES.has(s?.type)) c.err(`${name}: type '${s?.type}' unknown`);
    if (typeof s?.room_class !== 'string' || !s.room_class) c.err(`${name}: room_class missing`);
    if (typeof s?.function !== 'string' || !s.function.trim()) c.err(`${name}: function missing (level-design 16.0 reason test)`);
    if (typeof s?.storey !== 'number' || !Number.isFinite(s.storey)) c.err(`${name}: storey missing (floor height in m)`);
    if (!Array.isArray(s?.size) || s.size.length !== 3 || !s.size.every((v) => typeof v === 'number' && v > 0)) {
      c.err(`${name}: size must be [w, l, h] in metres`);
    }
    if (!Number.isInteger(s?.tension) || s.tension < 1 || s.tension > 5) c.err(`${name}: tension must be 1-5`);
    // Timed drills (level-design 6.3): Marlow Yard only; the campaign and Sector Ops have soft windows only (G334).
    if (s?.drill_s !== undefined) {
      if (meta?.mode !== 'training') c.err(`${name}: drill_s on a ${meta?.mode} map (timed drills are Marlow Yard only; soft windows only, level-design 6.3)`);
      else if (typeof s.drill_s !== 'number' || !Number.isFinite(s.drill_s) || s.drill_s <= 0) c.err(`${name}: drill_s must be seconds > 0`);
    }
    if (!Array.isArray(s?.tags)) {
      c.err(`${name}: tags missing (may be empty)`);
    } else {
      for (const t of s.tags) {
        if (typeof t !== 'string' || !(PLAIN_TAGS.has(t) || SPLIT_TAG.test(t) || OVERWATCH_TAG.test(t))) {
          c.warn(`${name}: unknown tag '${t}'`);
        }
      }
    }
  });
  links.forEach((l, i) => {
    const name = `links[${i}] ${l?.from} -> ${l?.to}`;
    for (const end of ['from', 'to']) if (!ids.has(l?.[end])) c.err(`${name}: unknown space '${l?.[end]}'`);
    if (!LINK_KINDS.has(l?.kind)) c.err(`${name}: kind '${l?.kind}' unknown`);
    if (!ROUTES.has(l?.route)) c.err(`${name}: route '${l?.route}' unknown`);
    for (const k of ['width', 'height', 'length', 'time_s', 'level_change']) {
      if (l?.[k] !== undefined && (typeof l[k] !== 'number' || !Number.isFinite(l[k]) || l[k] < 0)) {
        c.err(`${name}: ${k} must be a number >= 0`);
      }
    }
    if (l?.bolted !== undefined && typeof l.bolted !== 'boolean') c.err(`${name}: bolted must be true or false`);
  });
  const starts = spaces.filter((s) => hasTag(s, 'start'));
  if (starts.length !== 1) c.err(`start: needs exactly one space tagged 'start' (has ${starts.length})`);
  if (meta?.mode === 'campaign' && !spaces.some((s) => hasTag(s, 'exfil'))) c.err("exfil: no space tagged 'exfil'");
  return c.r;
}

/** Room classes, camera floors, ceilings, the 0.5 m grid, opening / passage sizes per kind, the step band. */
export function checkDimensions(graph, metrics) {
  const c = collector(metrics);
  const { spaces, links } = index(graph);
  if (!metrics) return c.r;
  const grid = c.num('rules.grid_m', 'the grid check');
  const rooms = c.obj('rooms', 'the room-class check');

  for (const s of spaces) {
    const [a, b, h] = s.size;
    const w = Math.min(a, b);
    const l = Math.max(a, b);
    if (grid !== undefined) {
      for (const v of [a, b]) if (!onGrid(v, grid)) c.warn(`${s.id}: size ${fmt(v)} is off the ${fmt(grid)} m grid`);
    }
    const cls = s.room_class === 'custom' ? null : rooms?.[s.room_class];
    if (s.room_class === 'custom') {
      c.warn(`${s.id}: room_class custom (justify the size in the design doc)`);
    } else if (rooms && !cls) {
      c.err(`${s.id}: room_class '${s.room_class}' is not in the room table (scale-sheet section 7) or 'custom'`);
    }
    if (cls) {
      if (w < cls.minW - EPS || l < cls.minL - EPS) {
        c.err(`${s.id}: ${fmt(w)} x ${fmt(l)} m below ${s.room_class} minimum ${fmt(cls.minW)} x ${fmt(cls.minL)}`);
      }
      if (w > cls.maxW + EPS || l > cls.maxL + EPS) {
        c.warn(`${s.id}: ${fmt(w)} x ${fmt(l)} m above ${s.room_class} maximum ${fmt(cls.maxW)} x ${fmt(cls.maxL)}`);
      }
    }
    if (s.type === 'encounter') {
      if (cls?.encounter === 'no') c.err(`${s.id}: an encounter space cannot be a ${s.room_class} (no play space)`);
      const floor = c.num('sizes.play_space_min_short', 'the encounter camera floor');
      if (floor !== undefined && w < floor - EPS) {
        c.err(`${s.id}: encounter space ${fmt(w)} m on its short side, under the ${fmt(floor)} m camera floor`);
      }
    }
    // Ceilings: none for exterior spaces, ducts and open classes (lead decision 6).
    const open = cls && (cls.ceilMin === 'open' || cls.ceilMax === 'open');
    if (s.type === 'exterior' || s.type === 'duct' || open) continue;
    const ceilMin = c.num('sizes.ceiling_min', 'the absolute ceiling minimum');
    if (ceilMin !== undefined && h < ceilMin - EPS) c.err(`${s.id}: ceiling ${fmt(h)} m below ${fmt(ceilMin)} m`);
    if (cls && typeof cls.ceilMin === 'number' && typeof cls.ceilMax === 'number') {
      if (h < cls.ceilMin - EPS || h > cls.ceilMax + EPS) {
        c.warn(`${s.id}: ceiling ${fmt(h)} m outside ${s.room_class} ${fmt(cls.ceilMin)}-${fmt(cls.ceilMax)} m`);
      }
    } else if (!cls) {
      const room = c.num('sizes.ceiling_room', 'the room ceiling check');
      if (room !== undefined && h < room - EPS) c.warn(`${s.id}: ceiling ${fmt(h)} m below the ${fmt(room)} m room ceiling`);
    }
  }

  const bandMin = c.num('rules.step_band_min_m', 'the step band check');
  const bandMax = c.num('rules.step_band_max_m', 'the step band check');
  for (const l of links) {
    const name = linkName(l);
    const { width, height, level_change: lc } = l;
    if (NEEDS_WIDTH.has(l.kind) && width === undefined) c.err(`${name}: width missing`);
    if (NEEDS_HEIGHT.has(l.kind) && height === undefined) c.err(`${name}: height missing`);
    if (NEEDS_LEVEL.has(l.kind) && lc === undefined) c.warn(`${name}: level_change missing`);
    if (grid !== undefined) {
      if (l.length !== undefined && !onGrid(l.length, grid)) c.warn(`${name}: length ${fmt(l.length)} is off the ${fmt(grid)} m grid`);
      if (GRID_WIDTH_KINDS.has(l.kind) && width !== undefined && !onGrid(width, grid)) {
        c.warn(`${name}: width ${fmt(width)} is off the ${fmt(grid)} m grid`);
      }
    }
    // The band is above its lower edge up to its upper edge: the sheet allows curbs up to 0.40 (section 3).
    if (lc !== undefined && bandMin !== undefined && bandMax !== undefined && lc > bandMin + EPS && lc <= bandMax + EPS) {
      c.err(`${name}: level change ${fmt(lc)} m in the forbidden step band, over ${fmt(bandMin)} up to ${fmt(bandMax)} m (player and nav disagree)`);
    }
    const below = (v, key, what, sev = 'err') => {
      const min = c.num(key, `the ${l.kind} ${what} check`);
      if (v === undefined || min === undefined || v >= min - EPS) return;
      c[sev](`${name}: ${what} ${fmt(v)} m below ${fmt(min)} m`);
    };
    const outside = (v, key, what, sev) => {
      const r = c.range(key, `the ${l.kind} ${what} check`);
      if (v === undefined || r === undefined || (v >= r[0] - EPS && v <= r[1] + EPS)) return;
      c[sev](`${name}: ${what} ${fmt(v)} m outside ${fmt(r[0])}-${fmt(r[1])} m`);
    };
    switch (l.kind) {
      case 'door':
      case 'pair_gate': {
        const min = c.num('sizes.door_min_w', 'the door width check');
        const target = c.num('sizes.door_w', 'the door width target');
        if (width !== undefined && min !== undefined && width < min - EPS) {
          c.err(`${name}: width ${fmt(width)} m below ${fmt(min)} m`);
        } else if (width !== undefined && target !== undefined && width < target - EPS) {
          c.warn(`${name}: width ${fmt(width)} m under the ${fmt(target)} m target (nav passes only on a half-metre centre)`);
        }
        const hMin = c.num('sizes.door_h_min', 'the door height check');
        const hMax = c.num('sizes.door_h_max', 'the door height check');
        if (height !== undefined && hMin !== undefined && height < hMin - EPS) c.err(`${name}: height ${fmt(height)} m below ${fmt(hMin)} m`);
        if (height !== undefined && hMax !== undefined && height > hMax + EPS) c.err(`${name}: height ${fmt(height)} m above ${fmt(hMax)} m`);
        break;
      }
      case 'shutter':
        below(width, 'sizes.door_min_w', 'width');
        below(height, 'sizes.shutter_gap_h', 'held gap');
        break;
      // The co-op kit's bands (scale-sheet section 3): a lip past the code's reach fails the move (ERR); a lip under the
      // co-op band's low end is one a player may reach alone (WARN, as the boost).
      case 'team_pull':
      case 'team_hang': {
        const key = l.kind === 'team_pull' ? 'sizes.pull_lip' : 'sizes.hang_lip';
        const r = c.range(key, `the ${l.kind} lip check`);
        if (lc === undefined || !r) break;
        if (lc > r[1] + EPS) c.err(`${name}: lip ${fmt(lc)} m above the ${fmt(r[1])} m ${l.kind === 'team_pull' ? 'pull-up' : 'relay'} reach`);
        else if (lc < r[0] - EPS) c.warn(`${name}: lip ${fmt(lc)} m under the ${fmt(r[0])}-${fmt(r[1])} m co-op band`);
        break;
      }
      case 'team_rope':
        outside(lc, 'sizes.rope_span', 'rope climb', 'err');
        break;
      case 'team_throw': {
        const max = c.num('sizes.throw_gap_max', 'the throw gap check');
        if (width !== undefined && max !== undefined && width > max + EPS) c.err(`${name}: gap ${fmt(width)} m above the ${fmt(max)} m throw`);
        break;
      }
      case 'double_door': {
        const r = c.range('sizes.door_double_w', 'the double door width check');
        if (width !== undefined && r && width < r[0] - EPS) c.err(`${name}: width ${fmt(width)} m below ${fmt(r[0])} m`);
        break;
      }
      case 'opening':
        outside(width, 'sizes.opening_w', 'width', 'warn');
        break;
      case 'roller_door':
        below(width, 'sizes.roller_door_w', 'width');
        break;
      case 'corridor': {
        const min = c.num('sizes.corridor_min_w', 'the corridor width check');
        const r = c.range('sizes.corridor_w', 'the corridor width target');
        if (width === undefined) break;
        if (min !== undefined && width < min - EPS) c.err(`${name}: corridor width ${fmt(width)} m below ${fmt(min)} m`);
        else if (r && (width < r[0] - EPS || width > r[1] + EPS)) {
          c.warn(`${name}: corridor width ${fmt(width)} m outside the ${fmt(r[0])}-${fmt(r[1])} m target`);
        }
        break;
      }
      case 'fire_stair':
        below(width, 'sizes.fire_stair_w', 'width');
        break;
      case 'open_stair':
        below(width, 'sizes.open_stair_w', 'width', 'warn');
        break;
      case 'duct':
        below(width, 'sizes.duct_w', 'width');
        below(height, 'sizes.duct_h', 'height');
        break;
      case 'tunnel':
        below(height, 'sizes.tunnel_h', 'height');
        break;
      case 'wall_jump': {
        const max = c.num('sizes.wall_jump_max_up', 'the wall-jump reach check');
        if (lc !== undefined && max !== undefined && lc > max + EPS) c.err(`${name}: level change ${fmt(lc)} m above the ${fmt(max)} m solo reach`);
        break;
      }
      case 'coop_boost':
      case 'human_ladder': {
        const r = c.range('sizes.coop_lip', 'the co-op lip check');
        if (lc === undefined || !r) break;
        if (lc > r[1] + EPS) c.err(`${name}: lip ${fmt(lc)} m above the ${fmt(r[1])} m co-op reach`);
        else if (lc < r[0] - EPS) c.warn(`${name}: lip ${fmt(lc)} m under the ${fmt(r[0])}-${fmt(r[1])} m co-op band`);
        break;
      }
      case 'split_jump':
        outside(width, 'sizes.split_jump_w', 'gap', 'err');
        below(height, 'sizes.split_jump_h', 'face height');
        break;
      case 'drop': {
        // src/ has landing bands (`LANDING`, src/player/movement.ts:168: a heavy landing with a recovery above 4.5 m) but
        // no fall damage, so a drop above the sheet's safe height (`safe_drop_m` = LANDING.heavy) is a WARN, not an ERR.
        const max = c.num('rules.safe_drop_m', 'the safe drop check');
        if (lc !== undefined && max !== undefined && lc > max + EPS) c.warn(`${name}: drop ${fmt(lc)} m above the ${fmt(max)} m safe drop`);
        break;
      }
      default:
        break;
    }
  }
  return c.r;
}

/** Reach from `start` of every space, exfil from every objective; then per mode (level-design 11.6): `sector`, no
 *  softlock (every space a co-op link reaches is also reachable without co-op links from the spaces already reached, so
 *  a mandatory pair_gate earlier on the route flags its own target, not the co-op moves behind it); `campaign`, gate
 *  reach (every co-op link has a solo way back, an opened pair_gate included, within the revive reach); `training`,
 *  neither. Solo completability is not checked (A1; G2, G50). */
export function checkReach(graph, metrics = null) {
  const c = collector(metrics);
  const { meta, spaces, links, start, exfils } = index(graph);
  const all = adjacency(links);
  const seen = reachable(all, start);
  const lost = spaces.filter((s) => !seen.has(s.id)).map((s) => s.id);
  if (lost.length) c.err(`unreachable from start '${start}': ${lost.join(', ')}`);
  if (exfils.length) {
    for (const s of spaces) {
      if (!hasTag(s, 'objective') || !seen.has(s.id)) continue;
      const on = reachable(all, s.id);
      if (!exfils.some((e) => on.has(e))) c.err(`${s.id}: no way from this objective to exfil`);
    }
  }
  if (meta.mode === 'campaign') gateReach(c, links);
  if (meta.mode !== 'sector') return c.r;
  // Grow the solo region: start, then whatever a co-op move opens. A co-op link out of the region into a space the
  // region does not reach solo is the only way there (a softlock if that partner goes down); the space and what is
  // solo-reachable from it join the region, so the co-op moves behind it are judged from there, in file order. Solo
  // arcs: a `bolted` door opens for one player only from its `to` side.
  const soloAdj = adjOf(soloArcsOf(links));
  const coopArcs = arcsOf(links, (l) => COOP_KINDS.has(l.kind));
  const region = reachable(soloAdj, start);
  for (let grown = true; grown;) {
    grown = false;
    for (const a of coopArcs) {
      if (!region.has(a.from) || region.has(a.to)) continue;
      c.err(`${a.to}: reached only through co-op links (${a.link.kind}); add a route without one (no softlock)`);
      for (const id of reachable(soloAdj, a.to)) region.add(id);
      grown = true;
    }
  }
  return c.r;
}

/** Campaign gate reach (level-design 11.6, 11.10): every co-op move `from` -> `to` has a way back `to` -> `from`
 *  over solo links (an unbolted door, a passed `pair_gate` or `shutter` stay open, so a gate door is its own way back) within
 *  `reach_max_s` at `reach_speed_mps`: a partner downed on either side of the gate is reached. Links with no time are
 *  left out first; when only they make the reach, that is a WARN (add time_s). With no metrics only the way back is
 *  checked. */
function gateReach(c, links) {
  // Once both have crossed, an unbolted door and a passed team door or shutter stay open both ways.
  const back = adjacency(links, (l) => !COOP_KINDS.has(l.kind) || TWO_WAY_GATES.has(l.kind));
  const speed = c.num('rules.reach_speed_mps', 'the gate reach check');
  const max = c.num('rules.reach_max_s', 'the gate reach check');
  for (const l of links) {
    if (!COOP_KINDS.has(l.kind) || TWO_WAY_GATES.has(l.kind)) continue;
    const name = linkName(l);
    if (!reachable(back, l.to).has(l.from)) {
      c.err(`${name}: no solo way back from ${l.to} to ${l.from}; a partner downed below the gate cannot be reached (add a drop, a ladder kicked down or a door that stays open)`);
      continue;
    }
    if (speed === undefined || max === undefined) continue;
    const target = new Set([l.from]);
    const timed = nearest(back, l.to, target, (x) => linkTime(x, speed), true);
    if (timed <= max + EPS) continue;
    const loose = nearest(back, l.to, target, (x) => linkTime(x, speed), false);
    if (loose <= max + EPS) {
      c.warn(`${name}: the way back from ${l.to} is ${Number.isFinite(timed) ? `${fmtS(timed)} s` : 'untimed'} on timed links; only links with no time_s bring it under ${fmt(max)} s (add time_s)`);
    } else {
      c.err(`${name}: the way back from ${l.to} to ${l.from} takes ${fmtS(loose)} s, over the ${fmt(max)} s revive reach`);
    }
  }
}

/** Linear spine of sections: spine links join consecutive sections, exit -> entry; no other link crosses sections; no
 *  route from start to exfil skips a section. */
export function checkSpine(graph) {
  const c = collector(null);
  const { spaces, links, byId, sections, secIndex, start, exfils } = index(graph);
  const secOf = (id) => byId.get(id).section;
  const joined = new Set();
  for (const l of links) {
    const sa = secOf(l.from);
    const sb = secOf(l.to);
    if (l.route !== 'spine') {
      if (sa !== sb) c.err(`${linkName(l)} crosses ${sa} -> ${sb} but its route is not 'spine'`);
      continue;
    }
    const ia = secIndex.get(sa);
    const ib = secIndex.get(sb);
    if (Math.abs(ia - ib) !== 1) {
      c.err(`spine ${linkName(l)} joins ${sa} and ${sb}, not consecutive sections`);
      continue;
    }
    joined.add(Math.min(ia, ib));
    const [lo, hi] = ia < ib ? [l.from, l.to] : [l.to, l.from];
    if (!hasTag(byId.get(lo), 'exit') || !hasTag(byId.get(hi), 'entry')) {
      c.err(`spine ${linkName(l)} must join ${sections[Math.min(ia, ib)]}'s exit to ${sections[Math.max(ia, ib)]}'s entry`);
    }
  }
  for (let i = 0; i + 1 < sections.length; i++) {
    if (!joined.has(i)) c.err(`no spine link between ${sections[i]} and ${sections[i + 1]}`);
  }
  for (const sec of sections) if (!spaces.some((s) => s.section === sec)) c.err(`section ${sec} has no spaces`);
  if (secOf(start) !== sections[0]) c.warn(`start '${start}' is not in the first section ${sections[0]}`);
  for (const e of exfils) {
    if (secOf(e) !== sections[sections.length - 1]) c.warn(`exfil '${e}' is not in the last section ${sections[sections.length - 1]}`);
  }
  if (!exfils.length) return c.r;
  const adj = adjacency(links);
  for (const sec of sections) {
    const inside = new Set(spaces.filter((s) => s.section === sec).map((s) => s.id));
    if (!inside.size || inside.has(start) || exfils.some((e) => inside.has(e))) continue;
    const on = reachable(adj, start, inside);
    if (exfils.some((e) => on.has(e))) c.err(`a route from start to exfil skips section ${sec}`);
  }
  return c.r;
}

/** Encounter spaces: rule of three, the declared targets (M4: missing or outside = ERR), guards (bands INFO only);
 *  secret routes in half the guarded spaces; dead ends; routes cross in each section. */
export function checkEncounters(graph, metrics) {
  const c = collector(metrics);
  const { spaces, links, byId, sections, secIndex, meta } = index(graph);
  const players = meta.players;
  const routes = routeRules(meta);
  let guarded = 0;
  let guardedSecret = 0;
  for (const s of spaces) {
    if (s.type !== 'encounter') continue;
    // Approaches: links that can enter the space (a one-way link only at its `to` end), from a space a player can be
    // in without having come through this one (a side room entered only from here is no approach).
    const approaches = links.filter((l) => {
      if (l.route === 'spine' || !enters(l, s.id)) return false;
      const far = otherEnd(l, s.id);
      return links.some((m) => enters(m, far) && otherEnd(m, far) !== s.id);
    });
    const kinds = new Set(approaches.map((l) => l.route));
    if (routes) {
      if (approaches.length < 3) c.err(`${s.id}: ${approaches.length} approaches (need 3+)`);
      if (kinds.size < 2) c.err(`${s.id}: approaches use ${kinds.size} route kind(s) (need 2+)`);
      for (const r of NEEDED_ROUTES) if (!kinds.has(r)) c.err(`${s.id}: no ${r} approach`);
    }

    // Declared targets (M4): V6 measures them in greybox later. Shadow share is optional and INFO only: the real-world
    // light band per space type is the light target (G329, level-design 5.5).
    if (typeof s.shadow_pct === 'number') {
      const lo = c.num('rules.shadow_min_frac', 'the shadow share report', 'info');
      const hi = c.num('rules.shadow_max_frac', 'the shadow share report', 'info');
      if (lo !== undefined && hi !== undefined && (s.shadow_pct < lo - EPS || s.shadow_pct > hi + EPS)) {
        c.info(`${s.id}: shadow_pct ${fmt(s.shadow_pct)} outside ${fmt(lo)}-${fmt(hi)} (information; the light band is the target)`);
      }
    }
    if (typeof s.los_break_s !== 'number') {
      c.err(`${s.id}: los_break_s missing (declared target)`);
    } else {
      const max = c.num('rules.los_break_max_s', 'the line-of-sight target check');
      if (max !== undefined && s.los_break_s > max + EPS) c.err(`${s.id}: los_break_s ${fmt(s.los_break_s)} above ${fmt(max)} s`);
    }
    const v = s.vantage;
    if (!v || typeof v !== 'object') {
      c.err(`${s.id}: vantage missing (declared target)`);
    } else {
      if (!byId.has(v.from)) c.err(`${s.id}: vantage.from '${v.from}' is not a space`);
      if (typeof v.sees_pct !== 'number') {
        c.err(`${s.id}: vantage.sees_pct missing (declared target)`);
      } else {
        const min = c.num('rules.vantage_min_frac', 'the vantage target check');
        if (min !== undefined && v.sees_pct < min - EPS) c.err(`${s.id}: vantage sees_pct ${fmt(v.sees_pct)} below ${fmt(min)}`);
      }
    }

    // Guards: per player count.
    const g = s.guards;
    if (!g || typeof g !== 'object' || Array.isArray(g) || !Object.keys(g).length) {
      c.err(`${s.id}: guards missing ({ "<players>": n })`);
      continue;
    }
    const counts = [];
    for (const [k, n] of Object.entries(g)) {
      const p = Number(k);
      if (!Number.isInteger(p) || !Number.isInteger(n) || n < 0) {
        c.err(`${s.id}: guards entry "${k}": ${n} is not a player count and a whole number`);
        continue;
      }
      if (!players.includes(p)) c.warn(`${s.id}: guards key "${k}" is not in meta.players`);
      counts.push([p, n]);
    }
    counts.sort((x, y) => x[0] - y[0]);
    if (counts.some(([, n]) => n > 0)) {
      guarded += 1;
      if (kinds.has('secret')) guardedSecret += 1;
    }
    for (let i = 1; i < counts.length; i++) {
      const [p0, n0] = counts[i - 1];
      const [p1, n1] = counts[i];
      if (n1 < n0) c.err(`${s.id}: ${n1} guards at ${p1} players, fewer than ${n0} at ${p0}`);
    }
    if (s.phase !== undefined && s.phase !== 'early' && s.phase !== 'late') c.err(`${s.id}: phase '${s.phase}' is not early or late`);
    const early = s.phase ? s.phase === 'early' : secIndex.get(s.section) < sections.length / 2;
    // Michael 2026-10-24 ~22:00: "as many guards as realistically possible": no upper limit (the guard-cap perf floor
    // and passable routes bound it); WARN only below the band's low end (training: INFO, a set holds at most 3).
    const band = c.range(early ? 'rules.guards_early' : 'rules.guards_late', 'the guard band check');
    for (const [p, n] of counts) {
      if (band && n < band[0]) {
        (routes ? c.warn : c.info)(`${s.id}: ${n} guards (${p} players) below the ${early ? 'early' : 'late'} band ${fmt(band[0])}-${fmt(band[1])}`);
      }
    }
  }
  // Alive ceiling (G187, G332; the campaign runs on the same runtime, Michael 2026-10-25 ~11:35 "32 alive"): per
  // section and player count, the encounter spaces' counts (each at the largest key not above that count) sum to at
  // most `sector_alive_max`.
  if (ALIVE_CEILING_MODES.has(meta.mode)) {
    const ceiling = c.num('rules.sector_alive_max', 'the Sector Ops alive ceiling');
    for (const sec of ceiling === undefined ? [] : sections) {
      for (const p of players) {
        let sum = 0;
        for (const s of spaces) {
          if (s.section !== sec || !s.guards || typeof s.guards !== 'object') continue;
          let best = -1;
          for (const [k, n] of Object.entries(s.guards)) {
            const kp = Number(k);
            if (Number.isInteger(kp) && kp <= p && kp > best && Number.isInteger(n)) best = kp;
          }
          if (best >= 0) sum += s.guards[String(best)];
        }
        if (sum > ceiling) c.err(`section ${sec}: ${sum} guards at ${p} players, over the ${fmt(ceiling)} alive ceiling (sector_alive_max)`);
      }
    }
  }
  if (routes && guarded && guardedSecret * 2 < guarded) {
    c.warn(`secret approach in ${guardedSecret} of ${guarded} guarded encounter spaces (aim for half)`);
  }

  // Dead ends (level-design 3.4, 16.6.3): at most one link out of the space (links, not neighbours: two ladders to
  // one hall are a loop; a one-way link counts only at its `from` end), not start / exfil; allowed only for a reward
  // or objective space no longer than the dead-end limit.
  for (const s of spaces) {
    if (links.filter((l) => leaves(l, s.id)).length > 1 || hasTag(s, 'start') || hasTag(s, 'exfil')) continue;
    if (!links.some((l) => l.from === s.id || l.to === s.id)) continue; // no link at all: checkReach reports it
    const allowed = hasTag(s, 'reward') || hasTag(s, 'objective') || s.type === 'reward' || s.type === 'objective';
    if (!allowed) {
      c.err(`${s.id}: dead end (one way out) not tagged reward or objective`);
      continue;
    }
    const max = c.num('rules.dead_end_max_m', 'the dead-end depth check');
    const l = Math.max(s.size[0], s.size[1]);
    if (max !== undefined && l > max + EPS) c.err(`${s.id}: dead end ${fmt(l)} m deep, over ${fmt(max)} m`);
  }

  // Unavoidable guards (level-design 4.12, G303): a space tagged `unavoidable` stands on every way (two players, every
  // link) from its section's entry to the section's exit or to one of its objectives. Sector Ops needs at least one.
  const allAdj = adjacency(links);
  let unavoidable = 0;
  for (const s of spaces) {
    if (!hasTag(s, 'unavoidable')) continue;
    unavoidable += 1;
    if (s.type !== 'encounter' || !s.guards || !Object.values(s.guards).some((n) => n > 0)) {
      c.warn(`${s.id}: tagged unavoidable but is not a guarded encounter space`);
    }
    const inSec = spaces.filter((x) => x.section === s.section);
    const entry = inSec.find((x) => hasTag(x, 'entry'));
    const targets = inSec.filter((x) => hasTag(x, 'exit') || hasTag(x, 'objective')).map((x) => x.id);
    if (!entry || entry.id === s.id || targets.includes(s.id) || !targets.length) continue;
    const around = reachable(allAdj, entry.id, new Set([s.id]));
    if (targets.every((t) => around.has(t))) {
      c.warn(`${s.id}: tagged unavoidable, but section ${s.section}'s exit and objectives are reached around it`);
    }
  }
  if (meta.mode === 'sector' && !unavoidable) {
    c.warn('no space tagged unavoidable: some sections need a guard the players cannot avoid (level-design 4.12, G303)');
  }

  // Routes cross (level-design 3.3): inside each section, between its entry and exit (every route starts and ends
  // there, so those two do not count), the route kinds used meet at shared spaces so that every route can be switched
  // to every other (the kinds form one connected group through the spaces they share).
  for (const sec of routes ? sections : []) {
    const touched = new Map();
    for (const l of links) {
      if (l.route === 'spine' || byId.get(l.from).section !== sec || byId.get(l.to).section !== sec) continue;
      if (!touched.has(l.route)) touched.set(l.route, new Set());
      for (const id of [l.from, l.to]) {
        const s = byId.get(id);
        if (!hasTag(s, 'entry') && !hasTag(s, 'exit')) touched.get(l.route).add(id);
      }
    }
    const kinds = [...touched.keys()];
    if (kinds.length < 2) continue;
    const group = new Set([kinds[0]]);
    for (let grown = true; grown;) {
      grown = false;
      for (const k of kinds) {
        if (group.has(k)) continue;
        if ([...group].some((g) => [...touched.get(k)].some((id) => touched.get(g).has(id)))) {
          group.add(k);
          grown = true;
        }
      }
    }
    if (group.size < kinds.length) {
      const apart = kinds.filter((k) => !group.has(k));
      c.err(`section ${sec}: routes never cross (${[...group].join(' / ')} and ${apart.join(' / ')} share no space)`);
    }
  }
  return c.r;
}

/** Per section (M3): 2+ edge-disjoint routes from the section's entry to its exit, inside the section. */
export function checkRedundancy(graph) {
  const c = collector(null);
  const { meta, spaces, links, byId, sections } = index(graph);
  const routes = routeRules(meta);
  for (const sec of sections) {
    const inSec = spaces.filter((s) => s.section === sec);
    const entries = inSec.filter((s) => hasTag(s, 'entry'));
    const exits = inSec.filter((s) => hasTag(s, 'exit'));
    if (entries.length !== 1) c.err(`section ${sec}: needs exactly one space tagged 'entry' (has ${entries.length})`);
    if (exits.length !== 1) c.err(`section ${sec}: needs exactly one space tagged 'exit' (has ${exits.length})`);
    if (entries.length !== 1 || exits.length !== 1) continue;
    const entry = entries[0].id;
    const exit = exits[0].id;
    if (entry === exit) {
      if (meta.mode === 'campaign') {
        c.err(`section ${sec}: entry and exit are the same space '${entry}', so no forced co-op gate stands between them (campaign: a forced co-op gate per section, level-design 11.10)`);
      } else {
        c.warn(`section ${sec}: entry and exit are the same space '${entry}'; route redundancy not checked`);
      }
      continue;
    }
    const inner = links.filter((l) => l.route !== 'spine' && byId.get(l.from).section === sec && byId.get(l.to).section === sec);
    // Campaign (level-design 11.10, G292): every section forces a co-op traversal move; solo links alone never join its
    // entry to its exit.
    if (meta.mode === 'campaign' && reachable(adjOf(soloArcsOf(inner)), entry).has(exit)) {
      c.err(`section ${sec}: exit '${exit}' is reached from entry '${entry}' by solo links alone (campaign: a forced co-op gate per section, level-design 11.10)`);
    }
    if (!routes) continue;
    const n = edgeDisjointPaths(inner, entry, exit);
    if (n < 2) c.err(`section ${sec}: ${n} independent route(s) from entry '${entry}' to exit '${exit}' (need 2 edge-disjoint)`);
  }
  return c.r;
}

/** Co-op coverage, solo twins, splits (leg time, parity, overwatch, assist, partner reach), shared widths. */
export function checkCoop(graph, metrics) {
  const c = collector(metrics);
  const { meta, spaces, links, byId, sections } = index(graph);

  // Coverage: a co-op link touches half of the encounter spaces and a space in every section.
  const coopTouched = new Set();
  for (const l of links) {
    if (!COOP_KINDS.has(l.kind)) continue;
    coopTouched.add(l.from);
    coopTouched.add(l.to);
  }
  const enc = spaces.filter((s) => s.type === 'encounter');
  const covered = enc.filter((s) => coopTouched.has(s.id));
  if (enc.length && covered.length * 2 < enc.length) {
    c.err(`co-op links reach ${covered.length} of ${enc.length} encounter spaces (need at least half)`);
  }
  for (const sec of sections) {
    if (!spaces.some((s) => s.section === sec && coopTouched.has(s.id))) c.err(`section ${sec} has no co-op link`);
  }

  // Solo twins (campus run V5f, CR7): a co-op move that one player can make anyway: a solo link from the same space to
  // the same target, or a solo path that does not pass the target, on the co-op link's own `route` and no longer than
  // it. A longer solo route, or one on another route kind (G280's solo bypass past a guard), is the no-softlock
  // alternative, not a twin. Lengths prove the detour: a direct solo link with no `length` (or beside a co-op link
  // with none) is a twin; a multi-link path uses only links with `length`. The co-op move runs from -> to (a climb's
  // foot to its top); a two-way pair_gate or shutter is judged both ways; a bolted link twins only from its `to` end. ERR on a campaign map (two players only, G2); WARN on
  // Sector Ops, where solo play completes (G185) but team doors stay two-player (G280), and on training.
  const twinAdj = new Map();
  const soloOn = (route) => {
    if (!twinAdj.has(route)) twinAdj.set(route, adjOf(soloArcsOf(links, (l) => l.route === route)));
    return twinAdj.get(route);
  };
  const sayTwin = meta.mode === 'campaign' ? c.err : c.warn;
  for (const l of links) {
    if (!COOP_KINDS.has(l.kind)) continue;
    const adj = soloOn(l.route);
    const coopLen = typeof l.length === 'number' ? l.length : undefined;
    const moves = [[l.from, l.to]];
    if (TWO_WAY_GATES.has(l.kind) && !isOneWay(l)) moves.push([l.to, l.from]);
    for (const [x, y] of moves) {
      const direct = (adj.get(x) ?? []).find((a) => a.to === y
        && (coopLen === undefined || typeof a.link.length !== 'number' || a.link.length <= coopLen + EPS));
      const path = direct ? [direct.link] : coopLen !== undefined ? shortestByLength(adj, x, y, coopLen) : null;
      if (!path) continue;
      const way = x === l.from ? '' : ` (${x} -> ${y})`;
      sayTwin(`${linkName(l)}${way} has a solo twin: ${path.map(linkName).join(', then ')}; one player makes this move alone (make the co-op move the only way at this spot, or remove the solo link)`);
    }
  }

  // Shared routes: both partners move through together.
  for (const l of links) {
    if (!l.shared) continue;
    const min = c.num('rules.shared_min_w_m', 'the shared width check');
    if (l.width === undefined) c.err(`shared ${linkName(l)}: width missing`);
    else if (min !== undefined && l.width < min - EPS) c.err(`shared ${linkName(l)}: width ${fmt(l.width)} m below ${fmt(min)} m`);
  }

  // Splits.
  const splits = new Map();
  for (const s of spaces) {
    for (const t of s.tags) {
      const m = SPLIT_TAG.exec(t);
      if (!m) continue;
      if (!splits.has(m[1])) splits.set(m[1], { a: [], b: [] });
      splits.get(m[1])[m[2]].push(s.id);
    }
  }
  for (const l of links) {
    if (l.assist !== undefined && !splits.has(l.assist)) c.err(`${linkName(l)}: assist '${l.assist}' names no split`);
  }
  for (const s of spaces) {
    for (const t of s.tags) {
      const m = OVERWATCH_TAG.exec(t);
      if (m && !splits.has(m[1])) c.err(`${s.id}: overwatch:${m[1]} names no split`);
    }
  }
  const solo = (l) => !COOP_KINDS.has(l.kind);
  const soloArcs = arcsOf(links, solo);
  const soloAdj = adjacency(links, solo);
  const splitSpeed = splits.size ? c.num('rules.split_speed_mps', 'split leg times') : undefined;
  const splitMax = splits.size ? c.num('rules.split_max_s', 'the split leg limit') : undefined;
  const parityPct = splits.size ? c.num('rules.split_parity_pct', 'the split parity check') : undefined;
  const reachSpeed = splits.size ? c.num('rules.reach_speed_mps', 'partner reach times') : undefined;
  const reachMax = splits.size ? c.num('rules.reach_max_s', 'the partner reach limit') : undefined;
  const timeOf = linkTime;
  /** The fastest solo arc x -> y, timed ones first. */
  const fastest = (x, y, speed) => {
    let best = null;
    for (const a of soloArcs) {
      if (a.from !== x || a.to !== y) continue;
      const t = timeOf(a.link, speed);
      if (!best || (best.untimed && !t.untimed) || (best.untimed === t.untimed && t.t < best.t)) best = { ...t, link: a.link };
    }
    return best;
  };
  const order = new Map(spaces.map((s, i) => [s.id, i]));

  for (const [id, legs] of splits) {
    if (!legs.a.length || !legs.b.length) {
      c.err(`split ${id}: needs spaces tagged split:${id}:a and split:${id}:b`);
      continue;
    }
    if (!spaces.some((s) => hasTag(s, `overwatch:${id}`))) c.err(`split ${id}: no space tagged overwatch:${id}`);
    if (!links.some((l) => l.assist === id)) c.err(`split ${id}: no link carries assist "${id}" (partners act for each other)`);
    if (splitSpeed === undefined || reachSpeed === undefined) continue;

    // Leg times (graph-schema "How the checks read the graph"): the link into the first leg space (from the fork, the
    // space that leads into both legs), the links between leg spaces, the fastest link out of the last leg space to
    // the rejoin space (the first space, in file order, both last leg spaces lead to). Solo links only: a leg is walked
    // alone.
    const inLegs = new Set([...legs.a, ...legs.b]);
    const intoA = new Set(soloArcs.filter((a) => a.to === legs.a[0] && !inLegs.has(a.from)).map((a) => a.from));
    const intoB = new Set(soloArcs.filter((a) => a.to === legs.b[0] && !inLegs.has(a.from)).map((a) => a.from));
    const fork = [...intoA].filter((x) => intoB.has(x)).sort((x, y) => order.get(x) - order.get(y))[0];
    const lastA = legs.a[legs.a.length - 1];
    const lastB = legs.b[legs.b.length - 1];
    const outOf = (x) => new Set(soloArcs.filter((a) => a.from === x && !inLegs.has(a.to) && a.to !== fork).map((a) => a.to));
    const outA = outOf(lastA);
    const outB = outOf(lastB);
    const rejoin = [...outA].filter((x) => outB.has(x)).sort((x, y) => order.get(x) - order.get(y))[0];
    if (rejoin === undefined) {
      c.err(`split ${id}: legs never rejoin (no space both ${lastA} and ${lastB} lead to)`);
      continue;
    }
    const times = {};
    let broken = false;
    let untimedLeg = false;
    for (const side of ['a', 'b']) {
      const leg = legs[side];
      const from = fork ?? [...(side === 'a' ? intoA : intoB)].sort((x, y) => order.get(x) - order.get(y))[0];
      if (from === undefined) {
        c.err(`split ${id} leg ${side}: no solo link leads into ${leg[0]}`);
        broken = true;
        continue;
      }
      const hops = [[from, leg[0]], ...leg.slice(1).map((x, i) => [leg[i], x]), [leg[leg.length - 1], rejoin]];
      let total = 0;
      for (const [x, y] of hops) {
        const arc = fastest(x, y, splitSpeed);
        if (!arc) {
          c.err(`split ${id} leg ${side}: no solo link from ${x} to ${y}`);
          broken = true;
          break;
        }
        if (arc.untimed) {
          untimedLeg = true;
          c.warn(`split ${id} leg ${side}: ${linkName(arc.link)} has no time_s and no walking speed; counted as 0 s`);
        }
        total += arc.t;
      }
      times[side] = total;
    }
    if (broken) continue;
    for (const side of ['a', 'b']) {
      if (splitMax !== undefined && times[side] > splitMax + EPS) {
        c.err(`split ${id} leg ${side}: ${fmtS(times[side])} s over the ${fmt(splitMax)} s limit`);
      }
    }
    const longer = Math.max(times.a, times.b);
    if (parityPct !== undefined && !untimedLeg && longer > 0) {
      const diff = (Math.abs(times.a - times.b) / longer) * 100;
      if (diff > parityPct + EPS) {
        c.err(`split ${id}: legs ${fmtS(times.a)} s vs ${fmtS(times.b)} s differ by ${Math.round(diff)}% (max ${fmt(parityPct)}%)`);
      }
    }

    // Partner reach: from every space of one leg, the quickest solo path to the nearest space of the other leg. Links
    // with no time are left out (a 0 s guess would make them shortcuts); when only they would bring the reach under
    // the limit, that is a WARN (add time_s), not an ERR.
    if (reachMax === undefined) continue;
    const worstOf = (skipUntimed) => {
      let w = { t: -1, from: '' };
      for (const [mine, other] of [[legs.a, new Set(legs.b)], [legs.b, new Set(legs.a)]]) {
        for (const src of mine) {
          const t = nearest(soloAdj, src, other, (l) => timeOf(l, reachSpeed), skipUntimed);
          if (t > w.t) w = { t, from: src };
        }
      }
      return w;
    };
    const timed = worstOf(true);
    if (timed.t <= reachMax + EPS) continue;
    const loose = worstOf(false);
    if (loose.t <= reachMax + EPS) {
      c.warn(`split ${id}: partner reach from ${timed.from} is ${fmtS(timed.t)} s on timed links; only links with no time_s bring it under ${fmt(reachMax)} s (add time_s)`);
      continue;
    }
    const w = Number.isFinite(timed.t) ? timed : loose;
    if (!Number.isFinite(w.t)) c.err(`split ${id}: a downed partner at ${w.from} cannot be reached from the other leg`);
    else c.err(`split ${id}: a downed partner is ${fmtS(w.t)} s away (from ${w.from} to the other leg; max ${fmt(reachMax)} s)`);
  }
  return c.r;
}

/** Dijkstra from `src` to the nearest id in `targets`: seconds (Infinity when none is reached). `skipUntimed` leaves
 *  out links `timeOf` cannot time; otherwise they count 0 s. */
function nearest(adj, src, targets, timeOf, skipUntimed) {
  const dist = new Map([[src, 0]]);
  const done = new Set();
  for (;;) {
    let u = null;
    for (const [id, d] of dist) if (!done.has(id) && (u === null || d < dist.get(u))) u = id;
    if (u === null) return Infinity;
    if (targets.has(u)) return dist.get(u);
    done.add(u);
    for (const a of adj.get(u) ?? []) {
      const step = timeOf(a.link);
      if (skipUntimed && step.untimed) continue;
      const d = dist.get(u) + step.t;
      if (!dist.has(a.to) || d < dist.get(a.to)) dist.set(a.to, d);
    }
  }
}

/** Dijkstra by `length` from `src` to `dst` over arcs whose link has a `length`, at most `max` metres: the links of the
 *  shortest path, or null. */
function shortestByLength(adj, src, dst, max) {
  const dist = new Map([[src, 0]]);
  const via = new Map();
  const done = new Set();
  for (;;) {
    let u = null;
    for (const [id, d] of dist) if (!done.has(id) && (u === null || d < dist.get(u))) u = id;
    if (u === null || dist.get(u) > max + EPS) return null;
    if (u === dst) break;
    done.add(u);
    for (const a of adj.get(u) ?? []) {
      if (typeof a.link.length !== 'number') continue;
      const d = dist.get(u) + a.link.length;
      if (!dist.has(a.to) || d < dist.get(a.to)) {
        dist.set(a.to, d);
        via.set(a.to, a);
      }
    }
  }
  const path = [];
  for (let id = dst; id !== src; id = via.get(id).from) path.unshift(via.get(id).link);
  return path;
}

/** Beat chart over the spine order (sections in order, spaces in file order, each spine link a release): ERR three
 *  high beats in a row; WARN the map opens above a release; WARN a peak with no release after it. */
export function checkPacing(graph) {
  const c = collector(null);
  const { spaces, links, byId, sections, secIndex } = index(graph);
  const beats = [];
  sections.forEach((sec, i) => {
    for (const s of spaces) if (s.section === sec) beats.push({ name: s.id, t: s.tension });
    for (const l of links) {
      if (l.route !== 'spine') continue;
      const ia = secIndex.get(byId.get(l.from).section);
      const ib = secIndex.get(byId.get(l.to).section);
      if (Math.min(ia, ib) === i && Math.abs(ia - ib) === 1) beats.push({ name: `spine ${l.from} -> ${l.to}`, t: 1 });
    }
  });
  if (!beats.length) return c.r;
  if (beats[0].t > RELEASE_BEAT) c.warn(`pacing: the map opens at tension ${beats[0].t} (open at 1-${RELEASE_BEAT})`);
  let run = [];
  let peakEnd = null;
  for (const b of beats) {
    if (b.t >= HIGH_BEAT) {
      if (peakEnd) {
        c.warn(`pacing: no release (1-${RELEASE_BEAT}) after the peak at ${peakEnd} before ${b.name}`);
        peakEnd = null;
      }
      run.push(b.name);
      if (run.length === 3) c.err(`pacing: three high beats (${HIGH_BEAT}+) in a row: ${run.join(', ')}`);
      continue;
    }
    if (run.length) peakEnd = run[run.length - 1];
    run = [];
    if (b.t <= RELEASE_BEAT) peakEnd = null;
  }
  if (run.length) peakEnd = run[run.length - 1];
  if (peakEnd) c.warn(`pacing: no release (1-${RELEASE_BEAT}) after the peak at ${peakEnd}`);
  return c.r;
}

/** Every check over one (merged) graph. `metrics` null: one WARN, every size and time check skipped. Duplicate lines
 *  (a missing metrics key asked by two checks) print once. */
export function validate(graph, { metrics = null, metricsPath = null } = {}) {
  const structure = checkStructure(graph);
  const out = { errors: [...structure.errors], warns: [], infos: [] };
  if (!metrics) {
    out.warns.push(`no metrics${metricsPath ? ` (${metricsPath} not found)` : ''}: size and time checks skipped`);
  }
  out.warns.push(...structure.warns);
  if (structure.errors.length) return out;
  const reports = [
    checkDimensions(graph, metrics), checkReach(graph, metrics), checkSpine(graph), checkEncounters(graph, metrics),
    checkRedundancy(graph), checkCoop(graph, metrics), checkPacing(graph),
  ];
  for (const r of reports) {
    out.errors.push(...r.errors);
    out.warns.push(...r.warns);
    out.infos.push(...r.infos);
  }
  out.errors = [...new Set(out.errors)];
  out.warns = [...new Set(out.warns)];
  out.infos = [...new Set(out.infos)];
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// CLI

const USAGE = 'usage: node scripts/level-validate.mjs <graph.json> [more.json ...] [--metrics <file>]';

/** { files, metrics } or { error }. */
export function parseArgs(argv) {
  const files = [];
  let metrics = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--metrics') {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) return { error: '--metrics needs a file' };
      metrics = v;
      i += 1;
    } else if (a.startsWith('--metrics=')) {
      metrics = a.slice('--metrics='.length);
      if (!metrics) return { error: '--metrics needs a file' };
    } else if (a.startsWith('-')) {
      return { error: `unknown flag ${a}` };
    } else {
      files.push(a);
    }
  }
  if (!files.length) return { error: 'no graph file given' };
  return { files, metrics };
}

/** The CLI: prints the report through `log`, returns the exit code (0 clean, 1 errors, 2 bad usage). */
export function run(argv, { log = console.log, root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') } = {}) {
  const args = parseArgs(argv);
  if (args.error) {
    log(`level-validate: ${args.error}\n${USAGE}`);
    return 2;
  }
  const graphs = [];
  for (const f of args.files) {
    try {
      graphs.push(JSON.parse(fs.readFileSync(f, 'utf8')));
    } catch (e) {
      log(`level-validate: cannot read ${f}: ${e.message}`);
      return 2;
    }
  }
  const metricsPath = args.metrics ?? path.join(root, DEFAULT_METRICS);
  let metrics = null;
  if (fs.existsSync(metricsPath)) {
    try {
      metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch (e) {
      log(`level-validate: cannot read metrics ${metricsPath}: ${e.message}`);
      return 2;
    }
  }
  const report = validate(mergeGraphs(graphs), { metrics, metricsPath: args.metrics ?? DEFAULT_METRICS });
  for (const e of report.errors) log(`ERROR: ${e}`);
  for (const w of report.warns) log(`WARN:  ${w}`);
  for (const i of report.infos) log(`INFO:  ${i}`);
  log(`\n${report.errors.length} error(s), ${report.warns.length} warning(s).`);
  return report.errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)));
}
