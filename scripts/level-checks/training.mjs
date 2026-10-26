// level-checks/training: the training profile's own checks (BRIEF A8, A9, A23, A26; Q24, Q29, G292, G363), slice S4
// (docs/validator-port/PLAN.md):
//   - `meta.taught_by`: the section in which the last co-op kit move is taught on its own. ERR missing or not in
//     `meta.sections` on a `training` map; ERR present on another mode.
//   - `teach`: a link field `teach: "<move>"` or a space tag `teach:<move>` (free text from the map's teach list, so
//     moves with no link kind count).
//   - In every section up to and including `taught_by`: ERR 2+ routes (a side route), ERR a `split:` tag, ERR no
//     `teach` element, ERR a `teach` element some entry-to-exit path avoids (remove it and the exit is still reached).
//   - After `taught_by`: a section with 2+ routes needs a guarded encounter space (a side route only when training
//     against enemies), else ERR; with one, the campaign route rules run on the section as ERR (A9). Splits are allowed.
// Routes are counted on the section's interior as A26 says (`sectionRoutes`, exported for J13's route-run harness: keep
// its name and its `{ count, paths }` shape). The campaign route rules are the core `checkEncounters`, run on a
// one-section subgraph with `mode: "campaign"`, keeping only its route-rule lines (the approach count, the approach
// kinds, "no <kind> approach", "routes never cross"); the "two routes" rule is `sectionRoutes` >= 2 (A9), not
// `checkRedundancy`. Importing `checkEncounters` from level-validate.mjs (which imports this file) is a function
// import cycle, safe in ESM: neither module calls the other at load.
//   checkTraining(graph, metrics, opts) -> { errors, warns, infos }
//   sectionRoutes(graph, section) -> { count, paths }
import { SPLIT_TAG, TEACH_TAG, adjacency, collector, hasTag, isOneWay, reachable } from '../level-graph-lib.mjs';
import { checkEncounters } from '../level-validate.mjs';

/** The count stops here ("10+", A26). */
export const MAX_ROUTES = 10;

/** The split id of a space tagged `split:<id>:a|b`, else null. */
function splitOf(s) {
  for (const t of Array.isArray(s.tags) ? s.tags : []) {
    const m = typeof t === 'string' ? SPLIT_TAG.exec(t) : null;
    if (m) return m[1];
  }
  return null;
}

/** A section's spaces and its interior links: both ends in the section, no `spine` link (A26 step 1). */
function interior(graph, section) {
  const spaces = graph.spaces.filter((s) => s.section === section);
  const ids = new Set(spaces.map((s) => s.id));
  const links = graph.links.filter((l) => l.route !== 'spine' && ids.has(l.from) && ids.has(l.to));
  return { spaces, links };
}

/**
 * A26's route count for one section of a (merged) graph: the distinct paths from the section's `entry` space to its
 * `exit` space that never enter a node twice, over the interior steps (a link is a step `from` -> `to`, and back unless
 * one-way; steps between the same two nodes in the same direction count once), with each split's leg spaces merged into
 * one node (A23; named `split:<id>` in `paths`; a step inside it is dropped). `count` stops at `MAX_ROUTES`; `paths` are
 * node-id lists (space ids, `split:<id>` for a merged split). No single `entry` or `exit` in the section: 0 routes.
 */
export function sectionRoutes(graph, section) {
  const { spaces, links } = interior(graph, section);
  const entries = spaces.filter((s) => hasTag(s, 'entry'));
  const exits = spaces.filter((s) => hasTag(s, 'exit'));
  if (entries.length !== 1 || exits.length !== 1) return { count: 0, paths: [] };
  const node = new Map();
  for (const s of spaces) {
    const split = splitOf(s);
    node.set(s.id, split === null ? s.id : `split:${split}`);
  }
  const next = new Map();
  const step = (a, b) => {
    if (a === b) return;
    let out = next.get(a);
    if (!out) next.set(a, (out = []));
    if (!out.includes(b)) out.push(b);
  };
  for (const l of links) {
    const a = node.get(l.from);
    const b = node.get(l.to);
    step(a, b);
    if (!isOneWay(l)) step(b, a);
  }
  const from = node.get(entries[0].id);
  const to = node.get(exits[0].id);
  const paths = [];
  const path = [from];
  const on = new Set([from]);
  const walk = (n) => {
    if (n === to) {
      paths.push(path.slice());
      return;
    }
    for (const m of next.get(n) ?? []) {
      if (paths.length >= MAX_ROUTES) return;
      if (on.has(m)) continue;
      on.add(m);
      path.push(m);
      walk(m);
      path.pop();
      on.delete(m);
    }
  };
  walk(from);
  return { count: paths.length, paths };
}

const fmtRoutes = (r) => `${r.count >= MAX_ROUTES ? `${MAX_ROUTES}+` : r.count} routes (${r.paths.map((p) => p.join(' > ')).join(' | ')})`;

/** The core route-rule lines (`checkEncounters` on a campaign subgraph) A9 keeps; every other line it prints (targets,
 *  guards, dead ends) is not a route rule and is dropped. */
const ROUTE_RULE = [
  /: \d+ approaches \(need 3\+\)$/,
  /: approaches use \d+ route kind\(s\) \(need 2\+\)$/,
  /: no \S+ approach$/,
  /^section .+: routes never cross /,
];

/** The campaign route rules on one section (A9): `checkEncounters` on the section as a one-section campaign graph (its
 *  spaces and interior links), its route-rule lines only. */
export function campaignRouteRules(graph, section) {
  const { spaces, links } = interior(graph, section);
  const sub = { meta: { ...graph.meta, mode: 'campaign', players: [2], sections: [section] }, spaces, links };
  return checkEncounters(sub, null).errors.filter((e) => ROUTE_RULE.some((re) => re.test(e)));
}

/** A guarded encounter space: guards at some player count. */
const guarded = (s) => s.type === 'encounter' && !!s.guards && typeof s.guards === 'object'
  && Object.values(s.guards).some((n) => typeof n === 'number' && n > 0);

/** The teach elements of a section: `teach:<move>` space tags and `teach` link fields. */
function teachOf(spaces, links) {
  const out = [];
  for (const s of spaces) {
    for (const t of Array.isArray(s.tags) ? s.tags : []) {
      const m = typeof t === 'string' ? TEACH_TAG.exec(t) : null;
      if (m) out.push({ move: m[1], at: s.id, space: s.id, link: null });
    }
  }
  for (const l of links) {
    if (typeof l.teach === 'string' && l.teach.trim()) out.push({ move: l.teach, at: `link ${l.from} -> ${l.to} (${l.kind})`, space: null, link: l });
  }
  return out;
}

/** Training checks over one merged graph. */
export function checkTraining(graph, metrics, opts = {}) {
  const c = collector(metrics);
  const meta = graph.meta;
  const sections = meta.sections;
  const taught = meta.taught_by;
  if (meta.mode !== 'training') {
    if (taught !== undefined) c.err(`meta.taught_by: only a training map has a taught_by section (this is a ${meta.mode} map)`);
    return c.r;
  }
  for (const l of graph.links) {
    if (l.teach !== undefined && (typeof l.teach !== 'string' || !l.teach.trim())) {
      c.err(`link ${l.from} -> ${l.to} (${l.kind}): teach must name the move (text)`);
    }
  }
  if (taught === undefined) {
    c.err('meta.taught_by: missing (the section where the last co-op kit move is taught on its own, BRIEF A8)');
    return c.r;
  }
  const last = sections.indexOf(taught);
  if (last < 0) {
    c.err(`meta.taught_by: '${taught}' is not in meta.sections`);
    return c.r;
  }
  sections.forEach((sec, k) => {
    const routes = sectionRoutes(graph, sec);
    const { spaces, links } = interior(graph, sec);
    if (k <= last) {
      // Up to and including taught_by: one guided route, no split, a teach element on it that no path avoids (A8).
      if (routes.count >= 2) c.err(`section ${sec}: ${fmtRoutes(routes)} up to taught_by ${taught} (a side route; one guided route per section, A8)`);
      for (const id of new Set(spaces.map(splitOf).filter((x) => x !== null))) {
        c.err(`section ${sec}: split '${id}' up to taught_by ${taught} (no split until the last kit move is taught, A8)`);
      }
      const teach = teachOf(spaces, links);
      if (!teach.length) {
        c.err(`section ${sec}: no teach element (a link 'teach' field or a 'teach:<move>' space tag) up to taught_by ${taught} (A8)`);
        return;
      }
      // The choke test: every entry-to-exit path passes the element (remove it and the exit is unreachable).
      const entry = spaces.filter((s) => hasTag(s, 'entry'));
      const exit = spaces.filter((s) => hasTag(s, 'exit'));
      if (entry.length !== 1 || exit.length !== 1) return; // checkRedundancy reports it
      const [a, b] = [entry[0].id, exit[0].id];
      for (const t of teach) {
        if (t.space === a || t.space === b) continue;
        const seen = reachable(adjacency(links, (l) => l !== t.link), a, t.space === null ? null : new Set([t.space]));
        if (seen.has(b)) c.err(`section ${sec}: teach '${t.move}' at ${t.at} is avoided by an entry-to-exit path (without it ${b} is still reached; the section does not force it, A8)`);
      }
      return;
    }
    // After taught_by: a side route only when training against enemies, under the campaign route rules (A9, A23).
    if (routes.count < 2) return;
    if (!spaces.some(guarded)) {
      c.err(`section ${sec}: ${fmtRoutes(routes)} after taught_by ${taught} but no guarded encounter space (a side route only when training against enemies, A9)`);
      return;
    }
    for (const e of campaignRouteRules(graph, sec)) c.err(`section ${sec} (side routes after taught_by: campaign route rules, A9): ${e}`);
  });
  return c.r;
}
