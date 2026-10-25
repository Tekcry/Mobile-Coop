// route-run plan (J13 R1, docs/route-runs/PLAN.md "R1 Route planner"): which runs the robot pair walks on a map.
// Pure and Babylon-free: graph files + a points table in, `runs[]` out. No browser, no file access.
//
// Input
//   graphs: one map's graph objects (docs/level-validator/graph-schema.md), merged with `mergeGraphs` in the order given
//           (the validator's file order: meta from the first, spaces and links concatenated). Links are named by their
//           index in the merged list.
//   points: J12's `resolvePoints` table (route-runs PLAN Dependencies row 1, validator-port PLAN section 8):
//           `{ geom, spaces: [{ id, section, storey, floorY, boxes, centre, cells }] (or an object keyed by id),
//              links: [{ from, to, kind, route, at, atFrom, gaps, measured }] (array, merged index) }`.
//           null: declared link `at` and the centre of a box-list `area` stand in (R6 owns the real table).
//   opts:   `{ metrics }` (docs/design/metrics.json; `rules.split_speed_mps` is the pace for links with a length and
//           no `time_s`) or `{ speed }`.
//
// Output `{ map, mode, sections, notes, pairs, kinds, runs, candidates }`; each run
//   `{ id, section, kind, covers: [[space, kind]], unplannable: null | reason, cost, steps, parts? }`, steps:
//   `{ type: 'walk', to: [x, y, z], space, link: index | null }`
//   `{ type: 'link', index, kind, route, from, to, reverse, at, action, limit_s, hold_s, holdFrom }` (action `door`,
//      `walk`, `ladder`, `drop`, `window`, `hatch`, `duct`, `rappel`, a rare solo kind's own name, or `stub` for a
//      co-op kind; `from` / `to` in walking order, `reverse` when that is against the link's declared direction)
//   `{ type: 'objective', space }`
//   `{ type: 'split', id, fork, a: steps, b: steps, rejoin }` (leader leg a, follower leg b, both wait at `rejoin`).
//
// Rules (route-runs BRIEF "Which routes", A7, A8; J12 BRIEF A9, A23, A26):
//   Campaign / Sector Ops, per section: for each encounter space and each of `shadow`, `high`, `loud` it declares (an
//   approach link of that route kind, read as checkEncounters reads approaches), the cheapest path entry -> in through
//   such an approach -> the section's objectives -> exit (the approach may come before or after the objectives,
//   whichever is cheaper). Cost: `time_s`, else `length` / split speed; links of another route kind x3, `spine` x1;
//   one-way and drop links only forward, a co-op move only forward (a team door or shutter both ways, as the validator's
//   gate reach reads them); two players, so co-op and `bolted` links are normal ways. A greedy set cover
//   keeps the fewest such runs that cover every pair, then a run is added for any route kind the section's links declare
//   that no kept run walks (a kind ending at a connector). Identical step lists merge.
//   Training (`meta.mode: training`): one run start -> objectives -> exfil (steps cut per section in `parts`), plus the
//   campaign coverage above on each section after `meta.taught_by` that keeps a side route (2+ routes counted as J12
//   A26 says). No `taught_by`: the one run and the note "side routes not run".
//   A run that passes a space with no `area`, or a link with no point, is `unplannable` with the reason (BRIEF A8).

// The graph helpers, imported in this one place: from `scripts/level-graph-lib.mjs` once J12 S0 is on master; until
// then through `scripts/level-validate.mjs`'s re-exports.
import { mergeGraphs, COOP_KINDS, isOneWay } from '../level-validate.mjs';

export const ROUTE_KINDS = ['shadow', 'high', 'loud'];
/** Cost factor for a link of another route kind than the run's (PLAN R1); `spine` links are always x1. */
export const OTHER_KIND_FACTOR = 3;
/** Seconds charged to a link with no `time_s`, no `length` and no points to measure: keeps it usable but unattractive. */
export const UNTIMED_LINK_S = 10;
/** Hold for a stubbed link with no measured or declared time: the scale sheet has no kit-move times yet, so the
 *  graph-schema estimate for a co-op boost ("about 4-6 s") is used, marked `holdFrom: "fallback"`. */
export const KIT_HOLD_FALLBACK_S = 6;
/** A26's route count stops at 10 ("10+"). */
const ROUTE_COUNT_CAP = 10;

/** Link-step time limits, BRIEF A4. A mirror of the named constants R3 puts in `scripts/route-run/progress.mjs`; the
 *  planner switches to importing them once R3 is on master. A kind with no entry gets `limit_s: null` (the 8 s stuck
 *  watch applies). */
export const LINK_LIMITS = {
  door_s: 5,
  ladder_s: 15,
  ladder_per_m_s: 1,
  drop_s: 5,
  window_s: 8,
  duct_per_m_s: 2,
};

const ACTIONS = {
  door: 'door', double_door: 'door', roller_door: 'door',
  opening: 'walk', corridor: 'walk', tunnel: 'walk', fire_stair: 'walk', open_stair: 'walk',
  ladder: 'ladder', drop: 'drop', window: 'window', hatch: 'hatch', duct: 'duct', rappel: 'rappel',
};
const SPLIT_TAG = /^split:(.+):(a|b)$/;
const hasTag = (s, t) => Array.isArray(s?.tags) && s.tags.includes(t);
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// ---------------------------------------------------------------------------------------------------------------
// Context: lookups shared by every step of the planner

function context(graphs, points, opts) {
  const graph = mergeGraphs(Array.isArray(graphs) ? graphs : [graphs]);
  const speed = opts.speed ?? opts.metrics?.rules?.split_speed_mps;
  if (!num(speed) || speed <= 0) throw new Error('route-run plan: no split speed (metrics rules.split_speed_mps)');
  const spaces = graph.spaces;
  const byId = new Map(spaces.map((s) => [s.id, s]));
  const order = new Map(spaces.map((s, i) => [s.id, i]));
  const links = graph.links.map((l, index) => ({ ...l, index }));
  const sections = graph.meta.sections ?? [];
  const secIndex = new Map(sections.map((s, i) => [s, i]));

  let pointSpaces = new Map();
  if (points?.spaces) {
    const list = Array.isArray(points.spaces) ? points.spaces : Object.entries(points.spaces).map(([id, p]) => ({ id, ...p }));
    pointSpaces = new Map(list.map((p) => [p.id, p]));
  }
  const pointLinks = Array.isArray(points?.links) ? points.links : null;

  /** The link's opening point: the points table's entry at its merged index, else (no table) its declared `at`. */
  const linkAt = (l) => {
    if (pointLinks) return Array.isArray(pointLinks[l.index]?.at) ? pointLinks[l.index].at : null;
    return Array.isArray(l.at) ? l.at : null;
  };
  /** A space's centre: the table's, else (no table) the middle of a box-list `area` at the storey. */
  const centre = (id) => {
    const p = pointSpaces.get(id);
    if (Array.isArray(p?.centre)) return p.centre;
    if (points) return null;
    const s = byId.get(id);
    if (!Array.isArray(s?.area) || !s.area.length) return null;
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [a, b, c, d] of s.area) {
      x0 = Math.min(x0, a); z0 = Math.min(z0, b); x1 = Math.max(x1, c); z1 = Math.max(z1, d);
    }
    return [(x0 + x1) / 2, s.storey ?? 0, (z0 + z1) / 2];
  };
  const dist = (p, q) => Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);

  /** Seconds to pass a link at the run's pace: `time_s`, else `length` / speed, else measured through the points. */
  const baseTime = (l) => {
    if (num(l.time_s)) return l.time_s;
    if (num(l.length)) return l.length / speed;
    const a = centre(l.from), b = centre(l.to), at = linkAt(l);
    if (a && b) return (at ? dist(a, at) + dist(at, b) : dist(a, b)) / speed;
    return UNTIMED_LINK_S;
  };

  const splits = new Map();
  const legOf = new Map();
  for (const s of spaces) {
    for (const t of s.tags ?? []) {
      const m = SPLIT_TAG.exec(t);
      if (!m) continue;
      if (!splits.has(m[1])) splits.set(m[1], { a: [], b: [] });
      splits.get(m[1])[m[2]].push(s.id);
      legOf.set(s.id, { id: m[1], side: m[2] });
    }
  }

  return { graph, meta: graph.meta, spaces, byId, order, links, sections, secIndex, speed, linkAt, centre, baseTime,
    splits, legOf, hasPoints: !!points };
}

/** Co-op kinds a pair passes both ways (a team door, a held shutter), as the validator's gate reach reads them. Every
 *  other co-op move (a boost, a throw) goes `from` -> `to` only unless the link sets `one_way: false`. */
const TWO_WAY_COOP = new Set(['pair_gate', 'shutter']);
const forwardOnly = (l) => isOneWay(l)
  || (COOP_KINDS.has(l.kind) && !TWO_WAY_COOP.has(l.kind) && l.one_way !== false);

/** Directed arcs { from, to, link } of `links` (two for a two-way link), only between spaces `keep` accepts. */
function arcsOf(links, keep) {
  const arcs = [];
  for (const l of links) {
    if (!keep(l.from) || !keep(l.to)) continue;
    arcs.push({ from: l.from, to: l.to, link: l });
    if (!forwardOnly(l)) arcs.push({ from: l.to, to: l.from, link: l });
  }
  return arcs;
}

/** Arc cost for a run of route kind `kind` (null: no preference). */
function arcCost(ctx, arc, kind) {
  const l = arc.link;
  const f = l.route === 'spine' || !kind || l.route === kind ? 1 : OTHER_KIND_FACTOR;
  return ctx.baseTime(l) * f;
}

/** Dijkstra from `src` over `arcs`: { dist: Map, prev: Map<id, arc> }. Ties keep the first arc in link order. */
function dijkstra(ctx, arcs, src, kind) {
  const out = new Map();
  for (const a of arcs) {
    if (!out.has(a.from)) out.set(a.from, []);
    out.get(a.from).push(a);
  }
  const dist = new Map([[src, 0]]);
  const prev = new Map();
  const done = new Set();
  for (;;) {
    let u = null;
    let best = Infinity;
    for (const [id, d] of dist) if (!done.has(id) && d < best) { best = d; u = id; }
    if (u === null) break;
    done.add(u);
    for (const a of out.get(u) ?? []) {
      const d = best + arcCost(ctx, a, kind);
      if (d < (dist.get(a.to) ?? Infinity) - 1e-9) {
        dist.set(a.to, d);
        prev.set(a.to, a);
      }
    }
  }
  return { dist, prev };
}

/** Arcs src -> dst from a Dijkstra result, or null. */
function pathTo(sp, src, dst) {
  if (!sp.dist.has(dst)) return null;
  const arcs = [];
  for (let n = dst; n !== src; n = sp.prev.get(n).from) arcs.unshift(sp.prev.get(n));
  return arcs;
}

// ---------------------------------------------------------------------------------------------------------------
// Pairs, kinds, routes

/** Approach links of encounter space `id` (checkEncounters' reading): non-spine links that can enter it, from a space
 *  a player can reach without coming through `id`. */
function approaches(ctx, links, id) {
  const enters = (l, x) => l.to === x || (l.from === x && !isOneWay(l));
  const other = (l, x) => (l.from === x ? l.to : l.from);
  return links.filter((l) => {
    if (l.route === 'spine' || !enters(l, id)) return false;
    const far = other(l, id);
    return links.some((m) => enters(m, far) && other(m, far) !== id);
  });
}

/** The (encounter space, kind) pairs a section declares, in space order then kind order, with their approach links. */
function sectionPairs(ctx, section) {
  const pairs = [];
  for (const s of ctx.spaces) {
    if (s.section !== section || s.type !== 'encounter') continue;
    const app = approaches(ctx, ctx.links, s.id);
    for (const k of ROUTE_KINDS) {
      const ls = app.filter((l) => l.route === k);
      if (ls.length) pairs.push({ space: s.id, kind: k, links: ls });
    }
  }
  return pairs;
}

const inSection = (ctx, section) => (id) => ctx.byId.get(id)?.section === section;
const interiorLinks = (ctx, section) => ctx.links.filter((l) => inSection(ctx, section)(l.from) && inSection(ctx, section)(l.to));

/** Route kinds a section's interior links declare. */
function sectionKinds(ctx, section) {
  const ks = new Set(interiorLinks(ctx, section).map((l) => l.route));
  return ROUTE_KINDS.filter((k) => ks.has(k));
}

/** J12 BRIEF A26: routes from the section's entry to its exit that never enter a space twice, over the section's
 *  interior steps, each split's legs merged into one node (A23), steps between the same two nodes counted once. Capped
 *  at 10. A stand-in for J12 S4's `sectionRoutes` (scripts/level-checks/training.mjs), which the planner imports once
 *  it is on master. */
export function sectionRouteCount(graphs, section) {
  const g = mergeGraphs(Array.isArray(graphs) ? graphs : [graphs]);
  const sp = g.spaces.filter((s) => s.section === section);
  const ids = new Set(sp.map((s) => s.id));
  const node = new Map();
  for (const s of sp) {
    const leg = (s.tags ?? []).map((t) => SPLIT_TAG.exec(t)).find(Boolean);
    node.set(s.id, leg ? `split:${leg[1]}` : s.id);
  }
  const entry = sp.find((s) => hasTag(s, 'entry'));
  const exit = sp.find((s) => hasTag(s, 'exit'));
  if (!entry || !exit) return 0;
  const next = new Map();
  const add = (a, b) => {
    const x = node.get(a), y = node.get(b);
    if (x === y) return;
    if (!next.has(x)) next.set(x, new Set());
    next.get(x).add(y);
  };
  for (const l of g.links) {
    if (l.route === 'spine' || !ids.has(l.from) || !ids.has(l.to)) continue;
    add(l.from, l.to);
    if (!forwardOnly(l)) add(l.to, l.from);
  }
  const goal = node.get(exit.id);
  let count = 0;
  const seen = new Set();
  const walk = (n) => {
    if (count >= ROUTE_COUNT_CAP) return;
    if (n === goal) { count += 1; return; }
    seen.add(n);
    for (const m of next.get(n) ?? []) if (!seen.has(m)) walk(m);
    seen.delete(n);
  };
  walk(node.get(entry.id));
  return count;
}

// ---------------------------------------------------------------------------------------------------------------
// Paths

/** The cheapest walk through waypoints `wps` (ids, in order) that also passes one arc of `through` (an approach, or a
 *  link of a kind) between some two consecutive waypoints. Returns { items, cost } (items: arcs and { objective }), or
 *  null when no such walk exists. `through` null: the plain waypoint walk. */
function bestWalk(ctx, arcs, wps, kind, through, objectives) {
  const memo = new Map();
  const sp = (src) => {
    if (!memo.has(src)) memo.set(src, dijkstra(ctx, arcs, src, kind));
    return memo.get(src);
  };
  const leg = (a, b) => (a === b ? { arcs: [], cost: 0 } : (() => {
    const r = sp(a);
    const p = pathTo(r, a, b);
    return p ? { arcs: p, cost: r.dist.get(b) } : null;
  })());
  const mark = (id) => (objectives.has(id) ? [{ objective: id }] : []);
  const plain = [];
  for (let i = 0; i + 1 < wps.length; i++) {
    const l = leg(wps[i], wps[i + 1]);
    if (!l) return null;
    plain.push(l);
  }
  const join = (i0, i1) => {
    // items for waypoints i0 .. i1 walked plainly (objective marks on arrival at each waypoint after i0)
    const items = [];
    let cost = 0;
    for (let i = i0; i < i1; i++) {
      items.push(...plain[i].arcs, ...mark(wps[i + 1]));
      cost += plain[i].cost;
    }
    return { items, cost };
  };
  if (!through) {
    const all = join(0, wps.length - 1);
    return { items: [...mark(wps[0]), ...all.items], cost: all.cost };
  }
  let best = null;
  for (let i = 0; i + 1 < wps.length; i++) {
    for (const a of through) {
      const l1 = leg(wps[i], a.from);
      const l2 = leg(a.to, wps[i + 1]);
      if (!l1 || !l2) continue;
      const head = join(0, i);
      const tail = join(i + 1, wps.length - 1);
      const cost = head.cost + l1.cost + arcCost(ctx, a, kind) + l2.cost + tail.cost;
      if (best && cost >= best.cost - 1e-9) continue;
      best = {
        cost,
        items: [...mark(wps[0]), ...head.items, ...l1.arcs, a, ...l2.arcs, ...mark(wps[i + 1]), ...tail.items],
      };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------
// Steps

function linkStep(ctx, arc) {
  const l = arc.link;
  const coop = COOP_KINDS.has(l.kind);
  const action = coop ? 'stub' : ACTIONS[l.kind] ?? l.kind;
  let limit = null;
  if (action === 'door') limit = LINK_LIMITS.door_s;
  else if (action === 'ladder') limit = LINK_LIMITS.ladder_s + LINK_LIMITS.ladder_per_m_s * (num(l.level_change) ? l.level_change : 0);
  else if (action === 'drop') limit = LINK_LIMITS.drop_s;
  else if (action === 'window' || action === 'hatch') limit = LINK_LIMITS.window_s;
  else if (action === 'duct' && num(l.length)) limit = LINK_LIMITS.duct_per_m_s * l.length;
  let hold = KIT_HOLD_FALLBACK_S;
  let holdFrom = 'fallback';
  if (num(l.measured?.time_s)) { hold = l.measured.time_s; holdFrom = 'measured'; }
  else if (num(l.time_s)) { hold = l.time_s; holdFrom = 'declared'; }
  else if (!coop && num(l.length)) { hold = l.length / ctx.speed; holdFrom = 'length'; }
  return {
    type: 'link', index: l.index, kind: l.kind, route: l.route, from: arc.from, to: arc.to, reverse: arc.from !== l.from,
    at: ctx.linkAt(l), action, limit_s: limit, hold_s: hold, holdFrom,
  };
}

/** Steps for a list of path items (arcs, { objective }); split legs folded into split steps. Returns { steps, arcs,
 *  problems } (arcs: every arc walked, legs included). */
function buildSteps(ctx, items, end, soloArcs) {
  const steps = [];
  const walked = [];
  const problems = [];
  const pushArc = (list, a) => {
    list.push({ type: 'walk', to: ctx.linkAt(a.link), space: a.from, link: a.link.index }, linkStep(ctx, a));
    walked.push(a);
  };
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.objective) {
      steps.push({ type: 'walk', to: ctx.centre(it.objective), space: it.objective, link: null },
        { type: 'objective', space: it.objective });
      continue;
    }
    const leg = ctx.legOf.get(it.to);
    if (!leg || ctx.legOf.get(it.from)?.id === leg.id) {
      pushArc(steps, it);
      continue;
    }
    // Entering split `leg.id` from its fork: skip the path's own leg arcs up to the rejoin, then walk both legs as
    // declared (spaces in file order, the fastest solo link between each pair), as J12 counts the legs.
    const fork = it.from;
    let j = i;
    while (j < items.length && (items[j].objective || ctx.legOf.get(items[j].to)?.id === leg.id)) j++;
    if (j >= items.length) {
      problems.push(`split ${leg.id}: the path ends inside the split`);
      pushArc(steps, it);
      continue;
    }
    const rejoin = items[j].to;
    const legs = ctx.splits.get(leg.id);
    const block = { type: 'split', id: leg.id, fork, a: [], b: [], rejoin };
    for (const side of ['a', 'b']) {
      const seq = [fork, ...legs[side], rejoin];
      for (let k = 0; k + 1 < seq.length; k++) {
        let best = null;
        for (const a of soloArcs) {
          if (a.from !== seq[k] || a.to !== seq[k + 1]) continue;
          if (!best || ctx.baseTime(a.link) < ctx.baseTime(best.link) - 1e-9) best = a;
        }
        if (!best) {
          problems.push(`split ${leg.id} leg ${side}: no solo link from ${seq[k]} to ${seq[k + 1]}`);
          break;
        }
        pushArc(block[side], best);
      }
    }
    steps.push(block);
    // objectives met inside the skipped leg arcs are not dropped
    for (let k = i; k <= j; k++) if (items[k].objective) steps.push({ type: 'walk', to: ctx.centre(items[k].objective), space: items[k].objective, link: null }, { type: 'objective', space: items[k].objective });
    i = j;
  }
  steps.push({ type: 'walk', to: ctx.centre(end), space: end, link: null });
  return { steps, arcs: walked, problems };
}

/** Every walk / link / objective step, split legs included. */
function* flat(steps) {
  for (const s of steps) {
    if (s.type === 'split') {
      yield* flat(s.a);
      yield* flat(s.b);
    } else yield s;
  }
}

/** Why a run cannot be planned (BRIEF A8), or null. */
function unplannableWhy(ctx, steps, problems) {
  const why = [...problems];
  const seen = new Set();
  const space = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    const s = ctx.byId.get(id);
    if (!s) why.push(`space ${id} is not in the graph`);
    else if (s.area === undefined || s.area === null || (Array.isArray(s.area) && !s.area.length)) why.push(`space ${id} has no area`);
  };
  for (const s of flat(steps)) {
    if (s.type === 'link') {
      space(s.from);
      space(s.to);
      if (!s.at) why.push(`link ${s.index} (${s.from} -> ${s.to}, ${s.kind}) has no point`);
    } else if (s.type === 'walk' || s.type === 'objective') {
      space(s.space);
      if (s.type === 'walk' && s.link === null && !s.to) why.push(`space ${s.space} has no centre in the points table`);
    }
  }
  return why.length ? [...new Set(why)].join('; ') : null;
}

/** Pairs a run's walked arcs cover, and the route kinds it walks. */
function coverage(ctx, arcs, pairIndex) {
  const covers = new Set();
  const kinds = new Set();
  for (const a of arcs) {
    kinds.add(a.link.route);
    const p = pairIndex.get(`${a.to}|${a.link.route}`);
    if (p && p.links.includes(a.link)) covers.add(`${a.to}|${a.link.route}`);
  }
  return { covers, kinds };
}

function makeRun(ctx, { section, kind, walk, end, soloArcs, pairIndex }) {
  const { steps, arcs, problems } = buildSteps(ctx, walk.items, end, soloArcs);
  const { covers, kinds } = coverage(ctx, arcs, pairIndex);
  return { section, kind, covers, kinds, cost: walk.cost, steps, unplannable: unplannableWhy(ctx, steps, problems) };
}

// ---------------------------------------------------------------------------------------------------------------
// Coverage per section

function sortCovers(ctx, keys) {
  return [...keys].map((k) => k.split('|')).sort((x, y) => (ctx.order.get(x[0]) - ctx.order.get(y[0]))
    || (ROUTE_KINDS.indexOf(x[1]) - ROUTE_KINDS.indexOf(y[1])));
}

/** Campaign coverage of one section: { runs, candidates, pairs, kinds }. */
function planSection(ctx, section) {
  const keep = inSection(ctx, section);
  const arcs = arcsOf(ctx.links, keep);
  const soloArcs = arcs.filter((a) => !COOP_KINDS.has(a.link.kind));
  const pairs = sectionPairs(ctx, section);
  const pairIndex = new Map(pairs.map((p) => [`${p.space}|${p.kind}`, p]));
  const kinds = sectionKinds(ctx, section);
  const own = ctx.spaces.filter((s) => s.section === section);
  const entry = own.find((s) => hasTag(s, 'entry'))?.id;
  const exit = own.find((s) => hasTag(s, 'exit'))?.id;
  const objectives = own.filter((s) => hasTag(s, 'objective')).map((s) => s.id);
  const objSet = new Set(objectives);

  if (!entry || !exit) {
    const why = `section ${section} has no ${entry ? 'exit' : 'entry'} space`;
    if (!pairs.length && !kinds.length) return { runs: [], candidates: [], pairs, kinds };
    const run = { section, kind: pairs[0]?.kind ?? kinds[0], covers: new Set(pairs.map((p) => `${p.space}|${p.kind}`)),
      kinds: new Set(), cost: 0, steps: [], unplannable: why };
    return { runs: [run], candidates: [run], pairs, kinds };
  }
  const wps = [entry, ...objectives.filter((o) => o !== entry && o !== exit), exit];

  // One candidate per pair: its cheapest walk through one of its approach arcs.
  const candidates = [];
  for (const p of pairs) {
    const through = arcs.filter((a) => a.to === p.space && p.links.includes(a.link));
    const walk = bestWalk(ctx, arcs, wps, p.kind, through, objSet);
    if (!walk) {
      candidates.push({ section, kind: p.kind, covers: new Set([`${p.space}|${p.kind}`]), kinds: new Set(), cost: Infinity,
        steps: [], unplannable: `no way from ${entry} in through a ${p.kind} approach of ${p.space} to ${exit}` });
      continue;
    }
    candidates.push(makeRun(ctx, { section, kind: p.kind, walk, end: exit, soloArcs, pairIndex }));
  }
  const unique = mergeIdentical(candidates);

  // Greedy set cover: most new pairs, then plannable, then cheaper, then first.
  const left = new Set(pairs.map((p) => `${p.space}|${p.kind}`));
  const kept = [];
  while (left.size) {
    let best = null;
    let bestNew = 0;
    for (const c of unique) {
      if (kept.includes(c)) continue;
      const n = [...c.covers].filter((k) => left.has(k)).length;
      if (!n) continue;
      const better = !best || n > bestNew
        || (n === bestNew && (!!best.unplannable > !!c.unplannable || (!!best.unplannable === !!c.unplannable && c.cost < best.cost - 1e-9)));
      if (better) { best = c; bestNew = n; }
    }
    if (!best) break;
    kept.push(best);
    for (const k of best.covers) left.delete(k);
  }

  // A run for each route kind the section's links declare that no kept run walks.
  for (const k of kinds) {
    if (kept.some((r) => r.kinds.has(k))) continue;
    const through = arcs.filter((a) => a.link.route === k);
    const walk = bestWalk(ctx, arcs, wps, k, through, objSet);
    const run = walk
      ? makeRun(ctx, { section, kind: k, walk, end: exit, soloArcs, pairIndex })
      : { section, kind: k, covers: new Set(), kinds: new Set(), cost: Infinity, steps: [],
        unplannable: `no way from ${entry} through a ${k} link to ${exit}` };
    kept.push(run);
  }
  return { runs: mergeIdentical(kept), candidates: unique, pairs, kinds };
}

/** Runs with identical step lists become one (covers and kinds united, first kind kept). */
function mergeIdentical(runs) {
  const out = [];
  const byKey = new Map();
  for (const r of runs) {
    const key = r.steps.length ? JSON.stringify(r.steps) : null;
    const twin = key && byKey.get(key);
    if (twin) {
      for (const k of r.covers) twin.covers.add(k);
      for (const k of r.kinds) twin.kinds.add(k);
      continue;
    }
    const copy = { ...r, covers: new Set(r.covers), kinds: new Set(r.kinds) };
    if (key) byKey.set(key, copy);
    out.push(copy);
  }
  return out;
}

/** Top-level steps cut by section (the laptop runs one step per section): [{ section, start, end }], end exclusive. */
function cutParts(ctx, steps) {
  const sec = (s) => {
    if (s.type === 'link') return ctx.byId.get(s.from)?.section;
    if (s.type === 'split') return ctx.byId.get(s.fork)?.section;
    return ctx.byId.get(s.space)?.section;
  };
  const parts = [];
  steps.forEach((s, i) => {
    const id = sec(s);
    const last = parts[parts.length - 1];
    if (last && last.section === id) last.end = i + 1;
    else parts.push({ section: id, start: i, end: i + 1 });
  });
  return parts;
}

// ---------------------------------------------------------------------------------------------------------------
// Entry point

/** Plan a map's runs. See the header for the input and output shapes. */
export function planRuns(graphs, points = null, opts = {}) {
  const ctx = context(graphs, points, opts);
  const { meta } = ctx;
  const notes = [];
  const runs = [];
  const pairs = [];
  const kinds = {};
  const candidates = [];
  const finish = (r, id) => ({
    id, section: r.section, kind: r.kind, covers: sortCovers(ctx, r.covers), unplannable: r.unplannable,
    cost: Number.isFinite(r.cost) ? Math.round(r.cost * 100) / 100 : null, steps: r.steps,
    ...(r.parts ? { parts: r.parts } : {}),
  });
  const addSection = (section) => {
    const res = planSection(ctx, section);
    pairs.push(...res.pairs.map((p) => [p.space, p.kind]));
    kinds[section] = res.kinds;
    candidates.push(...res.candidates.map((c) => ({ section, kind: c.kind, covers: sortCovers(ctx, c.covers), unplannable: c.unplannable })));
    const count = new Map();
    for (const r of res.runs) {
      const n = (count.get(r.kind) ?? 0) + 1;
      count.set(r.kind, n);
      runs.push(finish(r, `${section}-${r.kind}${n > 1 ? `-${n}` : ''}`));
    }
  };

  if (meta.mode === 'training') {
    const start = ctx.spaces.find((s) => hasTag(s, 'start'))?.id;
    const exfil = ctx.spaces.find((s) => hasTag(s, 'exfil'))?.id;
    const objectives = [...ctx.spaces].filter((s) => hasTag(s, 'objective') && s.id !== start && s.id !== exfil)
      .sort((x, y) => (ctx.secIndex.get(x.section) ?? 0) - (ctx.secIndex.get(y.section) ?? 0) || ctx.order.get(x.id) - ctx.order.get(y.id))
      .map((s) => s.id);
    const arcs = arcsOf(ctx.links, (id) => ctx.byId.has(id));
    const soloArcs = arcs.filter((a) => !COOP_KINDS.has(a.link.kind));
    const walk = start && exfil ? bestWalk(ctx, arcs, [start, ...objectives, exfil], null, null, new Set(objectives)) : null;
    let full;
    if (walk) {
      full = makeRun(ctx, { section: null, kind: null, walk, end: exfil, soloArcs, pairIndex: new Map() });
      full.parts = cutParts(ctx, full.steps);
    } else {
      full = { section: null, kind: null, covers: new Set(), cost: Infinity, steps: [],
        unplannable: !start || !exfil ? `no ${start ? 'exfil' : 'start'} space` : `no way from ${start} to ${exfil}` };
    }
    runs.push(finish(full, 'full'));
    const taught = meta.taught_by;
    if (typeof taught !== 'string' || !ctx.secIndex.has(taught)) {
      notes.push(typeof taught === 'string'
        ? `side routes not run: meta.taught_by "${taught}" is not a section`
        : 'side routes not run: the graph has no meta.taught_by');
    } else {
      for (const s of ctx.sections.slice(ctx.secIndex.get(taught) + 1)) {
        if (sectionRouteCount(ctx.graph, s) >= 2) addSection(s);
      }
    }
  } else {
    for (const s of ctx.sections) addSection(s);
  }
  return { map: meta.map, mode: meta.mode, sections: ctx.sections, notes, pairs, kinds, runs, candidates };
}

/** Every link step a run walks, split legs included, in step order (checks recompute coverage from these). */
export function walkedBy(run) {
  const links = [];
  for (const s of flat(run.steps)) if (s.type === 'link') links.push(s);
  return links;
}
