// level-graph-lib: the graph helpers shared by scripts/level-validate.mjs, its check modules
// (scripts/level-checks/*.mjs), scripts/mission-validate.mjs and the route-run harness (J13): the kind sets, the mode
// profiles, the metrics collector, the lookups, arcs / adjacency / reach, edge-disjoint routes, link times and the
// per-section file merge. Pure: no file or process access. `level-validate.mjs` re-exports the names it exported
// before the split (`SPACE_TYPES`, `LINK_KINDS`, `COOP_KINDS`, `isOneWay`, `edgeDisjointPaths`, `mergeGraphs`), so
// either import path works.

export const SPACE_TYPES = new Set(['encounter', 'connector', 'hub', 'safe_room', 'objective', 'reward', 'exterior',
  'utility', 'stair_core', 'duct']);
/** The co-op kit moves Michael added on 2026-10-25 ~18:05 (ROADMAP Decided: "Deadweight,Drop Catch,Chimney Pair,Swing
 *  Pass"; Plank Bridge "Add it"). Their size bands come with each move's coop-kit PR (BRIEF A25): until then the
 *  dimension check prints one INFO per kind used and checks nothing more. */
export const UNBANDED_KINDS = new Set(['plank_bridge', 'deadweight', 'chimney_pair', 'swing_pass', 'drop_catch']);
export const LINK_KINDS = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair',
  'open_stair', 'ladder', 'duct', 'tunnel', 'window', 'hatch', 'ledge', 'pipe', 'drop', 'wall_jump', 'split_jump',
  'coop_boost', 'human_ladder', 'pair_gate', 'team_rope', 'rappel', 'team_throw', 'team_hang', 'team_pull', 'shutter',
  'vent_unlock', ...UNBANDED_KINDS]);
/** Kinds that need two players (graph-schema "Link kinds" + lead decisions 1-2; the kit moves team_throw, team_hang,
 *  team_pull, shutter: G293, mission-framework A17; vent_unlock (Q25) and the five moves of A25). */
export const COOP_KINDS = new Set(['coop_boost', 'human_ladder', 'pair_gate', 'team_rope', 'team_throw', 'team_hang',
  'team_pull', 'shutter', 'vent_unlock', ...UNBANDED_KINDS]);
/** Co-op kinds a pair moves through both ways and that stay open once passed (a team door, a held shutter, a laid plank,
 *  a propped deadweight door, an unlocked vent door): their own way back for gate reach; judged both ways for a solo
 *  twin, except a `vent_unlock` (one player opens it from its `to` side: that way is solo, see `soloArcsOf`). */
export const TWO_WAY_GATES = new Set(['pair_gate', 'shutter', 'plank_bridge', 'deadweight', 'vent_unlock']);
/** Co-op kinds one player opens alone from their `to` end, like a `bolted` door: a `vent_unlock` is the door the
 *  crawler opens from the far side after the vent (its own `duct` link), A25. */
export const BOLTED_KINDS = new Set(['vent_unlock']);
/** One way unless the link sets `one_way: false`. */
export const ONE_WAY_KINDS = new Set(['drop', 'rappel', 'drop_catch']);
/** Kinds walked at the metrics speeds; every other kind (climb, crawl, shimmy, co-op move) needs `time_s` on a timed
 *  path (lead decision 5). `plank_bridge` and `vent_unlock` are walked as their stand-ins `pair_gate` and `door` (A25). */
export const WALK_KINDS = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair',
  'open_stair', 'tunnel', 'pair_gate', 'plank_bridge', 'vent_unlock']);
/** Kinds whose `width` / `height` are required (graph-schema: openings, passages, stairs, ducts). A25's kinds take the
 *  fields of their stand-ins: plank_bridge as pair_gate, deadweight as shutter, swing_pass as team_throw, vent_unlock as
 *  door; chimney_pair (team_rope) and drop_catch (drop) carry a level change. */
export const NEEDS_WIDTH = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'fire_stair',
  'open_stair', 'duct', 'tunnel', 'pair_gate', 'split_jump', 'shutter', 'team_throw', 'plank_bridge', 'deadweight',
  'swing_pass', 'vent_unlock']);
export const NEEDS_HEIGHT = new Set(['door', 'double_door', 'opening', 'roller_door', 'corridor', 'duct', 'tunnel',
  'pair_gate', 'split_jump', 'plank_bridge', 'vent_unlock']);
/** Climbs and drops carry the height they cover. */
export const NEEDS_LEVEL = new Set(['ladder', 'drop', 'wall_jump', 'coop_boost', 'human_ladder', 'team_rope', 'rappel',
  'team_hang', 'team_pull', 'chimney_pair', 'drop_catch']);
/** Widths on the 0.5 m grid: room-scale passages. Door, stair and duct widths are sheet sizes (1.2, 1.3, 2.4), not
 *  grid steps, so they are checked by their kind rule only. */
export const GRID_WIDTH_KINDS = new Set(['corridor', 'opening', 'roller_door']);
export const ROUTES = new Set(['shadow', 'high', 'loud', 'secret', 'spine']);
/** The approach kinds every encounter space needs (level-design 3.2). */
export const NEEDED_ROUTES = ['shadow', 'high', 'loud'];

/** Mode profiles (level-design "Modes and tags"; BRIEF A3): one row per `meta.mode`, read by the checks in place of
 *  mode tests. Severities name the collector method ('err', 'warn', 'info').
 *  - twoPlayers / maxPlayers: `meta.players` is [2] (G2, G50, G308) / at most this many (Sector Ops 1-4, G308).
 *  - needsExfil: a space tagged `exfil` is required (Sector Ops ends at its last section's exit).
 *  - routeRules: rule of three, routes cross, two routes per section, a secret approach in half the guarded spaces
 *    (level-design 3.2, 3.3); training is one guided route (G292, Q24).
 *  - guardBand: below the guard band (training: a set may hold no guard, Q11).
 *  - coverage: co-op links reach half the encounter spaces and a space in every section (level-design 11.9); training
 *    does not need the same checks (Q29, A7).
 *  - soloTwin: a co-op move one player makes alone (campaign two players only, G2; Sector Ops solo completes, G185, team
 *    doors stay two-player, G280; training Q29, A7).
 *  - forcedGate: every section forces a co-op move, so entry = exit is an ERR (level-design 11.10, G292).
 *  - gateReach: every co-op move has a solo way back within the revive reach (11.6, 11.10).
 *  - noSoftlock: no space reached only through co-op links (11.6).
 *  - aliveCeiling: guards spawn under the Sector Ops alive ceiling (G187, G332; the campaign runs on `SectorMode`, G359).
 *  - needsUnavoidable: some section has a guard the players cannot avoid (4.12, G303).
 *  - drills: timed drills (`drill_s`) allowed (6.3; soft windows only elsewhere, G334).
 *  - marks: a `mark` on a space or link (G290, G339; Marlow keeps its guidance marks: INFO count). perfect.mjs.
 *  - ghostPath: no path from start to every objective and exfil without a `loud` link (A10, A11; training INFO: Q5,
 *    Q29, Q24). perfect.mjs. */
export const PROFILES = Object.freeze({
  campaign: Object.freeze({ twoPlayers: true, maxPlayers: 2, needsExfil: true, routeRules: true, guardBand: 'warn',
    coverage: true, soloTwin: 'err', forcedGate: true, gateReach: true, noSoftlock: false, aliveCeiling: true,
    needsUnavoidable: false, drills: false, marks: 'err', ghostPath: 'err' }),
  sector: Object.freeze({ twoPlayers: false, maxPlayers: 4, needsExfil: false, routeRules: true, guardBand: 'warn',
    coverage: true, soloTwin: 'warn', forcedGate: false, gateReach: false, noSoftlock: true, aliveCeiling: true,
    needsUnavoidable: true, drills: false, marks: 'err', ghostPath: 'err' }),
  training: Object.freeze({ twoPlayers: true, maxPlayers: 2, needsExfil: false, routeRules: false, guardBand: 'info',
    coverage: false, soloTwin: 'info', forcedGate: false, gateReach: false, noSoftlock: false, aliveCeiling: false,
    needsUnavoidable: false, drills: true, marks: 'info', ghostPath: 'info' }),
});
export const MODES = new Set(Object.keys(PROFILES));
/** The profile of a graph's `meta.mode` (undefined for an unknown mode: `checkStructure` reports it). */
export const profileOf = (meta) => (Object.hasOwn(PROFILES, meta?.mode) ? PROFILES[meta.mode] : undefined);

export const PLAIN_TAGS = new Set(['start', 'exfil', 'objective', 'checkpoint', 'reward', 'entry', 'exit', 'sync_pair',
  'unavoidable']);
export const SPLIT_TAG = /^split:(.+):(a|b)$/;
export const OVERWATCH_TAG = /^overwatch:(.+)$/;
/** A space that teaches a move (BRIEF A8: `teach:<move>`, free text from the map's teach list; training.mjs reads it). */
export const TEACH_TAG = /^teach:(.+)$/;
/** Beat chart (level-design 6.2): 4-5 is a high beat, 1-2 a release; a `spine` link counts as a release (decision 3). */
export const HIGH_BEAT = 4;
export const RELEASE_BEAT = 2;
export const EPS = 1e-9;

// ---------------------------------------------------------------------------------------------------------------
// Report and metrics access

/** A report plus `need`: the metrics value at a dotted path, or undefined after one WARN (INFO for INFO-only checks)
 *  naming the missing key. With `metrics` null nothing is printed here (`validate` prints the one WARN). */
export function collector(metrics) {
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
export const fmt = (n) => String(Math.round(n * 100) / 100);
export const fmtS = (n) => n.toFixed(1);
export const onGrid = (v, grid) => Math.abs(v / grid - Math.round(v / grid)) < 1e-6;
export const linkName = (l) => `link ${l.from} -> ${l.to} (${l.kind})`;
export const hasTag = (s, t) => Array.isArray(s.tags) && s.tags.includes(t);

// ---------------------------------------------------------------------------------------------------------------
// Graph helpers

export const isOneWay = (l) => (typeof l.one_way === 'boolean' ? l.one_way : ONE_WAY_KINDS.has(l.kind));

/** Directed arcs { from, to, link } of the links `keep` accepts (two arcs for a two-way link). */
export function arcsOf(links, keep = () => true) {
  const arcs = [];
  for (const l of links) {
    if (!keep(l)) continue;
    arcs.push({ from: l.from, to: l.to, link: l });
    if (!isOneWay(l)) arcs.push({ from: l.to, to: l.from, link: l });
  }
  return arcs;
}

/** Map<space id, arcs out of it>. */
export function adjacency(links, keep) {
  const adj = new Map();
  for (const a of arcsOf(links, keep)) {
    let list = adj.get(a.from);
    if (!list) adj.set(a.from, (list = []));
    list.push(a);
  }
  return adj;
}

/** Ids reachable from `start` over `adj`, never entering `blocked`. */
export function reachable(adj, start, blocked = null) {
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
export function index(graph) {
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

/** Solo arcs: no co-op kind, and a `bolted` link only from its `to` end (one player at its near side cannot open it).
 *  A `BOLTED_KINDS` link (`vent_unlock`) is kept ahead of the co-op drop and gets the same bolted arc (A25). */
const soloLink = (l) => BOLTED_KINDS.has(l.kind) || !COOP_KINDS.has(l.kind);
export const soloArcsOf = (links, keep = () => true) => arcsOf(links, (l) => soloLink(l) && keep(l))
  .filter((a) => !((a.link.bolted === true || BOLTED_KINDS.has(a.link.kind)) && a.from === a.link.from));
/** Map<space id, arcs> from a list of arcs. */
export function adjOf(arcs) {
  const adj = new Map();
  for (const a of arcs) {
    if (!adj.has(a.from)) adj.set(a.from, []);
    adj.get(a.from).push(a);
  }
  return adj;
}

/** Seconds for one link at `speed`: the greybox `measured.path_m` / speed (V6, A6), else `time_s`, else `length` /
 *  speed for a walked kind; untimed otherwise (lead decision 5). A measured `path_m` of null (a move the nav grid does
 *  not model) falls through to the declared time. */
export function linkTime(l, speed) {
  if (typeof l.measured?.path_m === 'number') return { t: l.measured.path_m / speed, untimed: false };
  if (typeof l.time_s === 'number') return { t: l.time_s, untimed: false };
  if (WALK_KINDS.has(l.kind) && typeof l.length === 'number') return { t: l.length / speed, untimed: false };
  return { t: 0, untimed: true };
}

/** Can `l` be walked into space `id`? (Either end of a two-way link; only the `to` end of a one-way link.) */
export const enters = (l, id) => l.to === id || (l.from === id && !isOneWay(l));
/** Can `l` be walked out of space `id`? */
export const leaves = (l, id) => l.from === id || (l.to === id && !isOneWay(l));
/** The other end of `l` from `id`. */
export const otherEnd = (l, id) => (l.from === id ? l.to : l.from);

// ---------------------------------------------------------------------------------------------------------------
// Merge

/** One map from several files (one per section): `meta` from the first, `spaces` and `links` concatenated in file
 *  order (so a link's merged index is stable), `meta.sections` unioned in file order. Mission nodes (MV 0c62a921):
 *  `objectives`, `rules`, `syncs` concatenated (each key only when a file has it; a top-level `sync` key counts as
 *  `syncs`); `mission` is the one file's node, or the list of them when 2+ files carry one (`checkMission` reports
 *  that); `tracks` is the one file's value, or the list of the files' values. */
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
  // Greybox measurements (S2 writes each file's own splits and the way backs of the links it owns, validator-port S3):
  // one `meta.measured` when some file has one; with 2+, `tool` / `date` / `geom` from the first that has them, `splits`
  // unioned and `ways_back` joined in file order (a non-list `ways_back` is kept so checkMeasured reports it).
  const measured = graphs.map((g) => g?.meta?.measured).filter((m) => m !== null && typeof m === 'object' && !Array.isArray(m));
  if (measured.length === 1) meta.measured = measured[0];
  else if (measured.length > 1) {
    const m = Object.assign({}, ...[...measured].reverse());
    if (measured.some((x) => x.splits !== undefined)) m.splits = Object.assign({}, ...measured.map((x) => x.splits ?? {}));
    const backs = measured.filter((x) => x.ways_back !== undefined).map((x) => x.ways_back);
    if (backs.length) m.ways_back = backs.find((b) => !Array.isArray(b)) ?? backs.flat();
    meta.measured = m;
  }
  const merged = { meta, spaces, links };
  const missions = graphs.filter((g) => g?.mission !== undefined).map((g) => g.mission);
  if (missions.length) merged.mission = missions.length === 1 ? missions[0] : missions;
  for (const key of ['objectives', 'rules', 'syncs']) {
    // Sector Ops' plan graphs keep their sync nodes under `sync` (singular): both keys are read, `syncs` then `sync`
    // per file, into `merged.syncs`.
    const keys = key === 'syncs' ? ['syncs', 'sync'] : [key];
    const parts = graphs.flatMap((g) => keys.filter((k) => g?.[k] !== undefined).map((k) => g[k]));
    if (parts.length) merged[key] = parts.length === 1 ? parts[0] : parts.flatMap((v) => (Array.isArray(v) ? v : [v]));
  }
  // `tracks` (Sector Ops' track object, a mission's track list): kept per file for the mission check, which reads a
  // track's `exfil` as the extraction (mission-schema "tracks.exfil"); the map checks never read it.
  const tracks = graphs.filter((g) => g?.tracks !== undefined).map((g) => g.tracks);
  if (tracks.length) merged.tracks = tracks.length === 1 ? tracks[0] : tracks;
  return merged;
}
