// level-checks/perfect: perfect-run and marker checks (BRIEF A10, A11; VISION 4 rules 3-5; G127, G146, G290, G339):
// the ghost path (no `loud` link, no `requires_kill` link), the no-kill path (no `requires_kill` link), `requires_kill`
// and `mark` fields, with severities from the mode profile (`PROFILES[mode].ghostPath`, `.marks`). `perfectPaths` is
// the path helper this check and the mission checks (S8) share; its signature and result are fixed by S0.
//   checkPerfect(graph, metrics, opts) -> { errors, warns, infos }
//   perfectPaths(graph, { start, targets, exfil, keep }) -> { unreached, stranded }
//
// The paths run from the `start` space to every space tagged `objective` and on to the run's end: the `exfil` spaces on
// a map that needs one (campaign), else the last section's `exit` (Sector Ops ends there, so does Marlow Yard). Both
// players, every link kind (co-op moves included). A11: G146's "no alarms" has no graph field; a `loud` link (force,
// level-design 3.2) is the nearest fact, so the ghost path is the path with no `loud` link.
//   - no-kill path (no `requires_kill: true` link): ERR when missing, every mode, `training` included (VISION 4 rule 4,
//     G127);
//   - ghost path (no `loud` link either): `PROFILES[mode].ghostPath` when missing (ERR on campaign and Sector Ops, INFO
//     on training: Q5, Q29, Q24); a target with no no-kill path is reported once, by the no-kill line;
//   - `requires_kill` on a link: true or false (ERR otherwise);
//   - `mark` on a space or link (any value): `PROFILES[mode].marks` per marked item (ERR on campaign and Sector Ops: no
//     markers, G290, G339); on training one INFO count (Marlow Yard keeps its guidance marks, G292).
import { adjacency, collector, hasTag, index, linkName, profileOf, reachable } from '../level-graph-lib.mjs';

/** A link a perfect run cannot pass without a kill (A10). */
const needsKill = (l) => l.requires_kill === true;
/** No-kill path: every link but a `requires_kill` one. */
const noKill = (l) => !needsKill(l);
/** Ghost path: no kill and no alarm (A11: no `loud` link). */
const ghost = (l) => !needsKill(l) && l.route !== 'loud';
/** The `told` key of the run's end (not a space id). */
const END = '\u0000end';

/** Perfect-run checks over one merged graph. */
export function checkPerfect(graph, metrics, opts = {}) {
  const c = collector(null);
  const { meta, spaces, links, sections, start, exfils } = index(graph);
  const profile = profileOf(meta);
  if (!profile) return c.r;

  for (const l of links) {
    if (l.requires_kill !== undefined && typeof l.requires_kill !== 'boolean') {
      c.err(`${linkName(l)}: requires_kill must be true or false`);
    }
  }

  const marked = [
    ...spaces.filter((s) => s.mark !== undefined).map((s) => s.id),
    ...links.filter((l) => l.mark !== undefined).map(linkName),
  ];
  if (marked.length && profile.marks === 'info') {
    c.info(`marks: ${marked.length} guidance mark(s) on spaces and links (Marlow Yard keeps its guidance marks, G292)`);
  } else {
    for (const name of marked) {
      c[profile.marks](`${name}: mark (no markers in the campaign or Sector Ops, VISION 4 rule 5, G290, G339)`);
    }
  }

  if (start === undefined) return c.r;
  const last = sections[sections.length - 1];
  const ends = profile.needsExfil ? exfils : spaces.filter((s) => s.section === last && hasTag(s, 'exit')).map((s) => s.id);
  const endName = `${profile.needsExfil ? 'exfil' : "the last section's exit"} '${ends.join("' / '")}'`;
  const objectives = spaces.filter((s) => hasTag(s, 'objective')).map((s) => s.id);
  const runs = [
    { keep: noKill, say: c.err, why: 'needs a requires_kill link (no mission forces a kill, VISION 4 rule 4, G127)' },
    { keep: ghost, say: c[profile.ghostPath],
      why: 'needs a loud or requires_kill link (no ghost path: a perfect run is always possible, VISION 4 rule 3, G146)' },
  ];
  const told = new Set();
  for (const { keep, say, why } of runs) {
    const { unreached, stranded, endReached } = runPaths(graph, start, objectives, ends, keep);
    for (const o of unreached) {
      if (told.has(o)) continue;
      told.add(o);
      say(`${o}: every way from start '${start}' to this objective ${why}`);
    }
    for (const o of stranded) {
      if (told.has(o)) continue;
      told.add(o);
      say(`${o}: every way on from this objective to ${endName} ${why}`);
    }
    if (ends.length && !endReached && !told.has(END)) {
      told.add(END);
      say(`${endName}: every way from start '${start}' ${why}`);
    }
  }
  return c.r;
}

/** `perfectPaths` once per end (any end will do): the objectives not reached from `start`, the reached ones with no
 *  way on to any end, and whether some end is reached from `start`. With no end, only the objectives' reach. */
function runPaths(graph, start, objectives, ends, keep) {
  if (!ends.length) {
    const { unreached } = perfectPaths(graph, { start, targets: objectives, keep });
    return { unreached, stranded: [], endReached: false };
  }
  const per = ends.map((e) => perfectPaths(graph, { start, targets: [...objectives, e], exfil: e, keep }));
  const unreached = per[0].unreached.filter((t) => objectives.includes(t));
  const stranded = objectives.filter((o) => !unreached.includes(o) && per.every((p) => p.stranded.includes(o)));
  const endReached = ends.some((e, i) => !per[i].unreached.includes(e));
  return { unreached, stranded, endReached };
}

/** Paths a perfect run takes, two players (every link kind, co-op moves included), over only the links `keep` accepts
 *  (default all): `unreached` = the `targets` (space ids, in their order) not reachable from `start`; `stranded` = the
 *  reached targets with no way on to `exfil` (empty when `exfil` is null or undefined; a target that is the exfil is
 *  never stranded). */
export function perfectPaths(graph, { start, targets = [], exfil = null, keep = () => true }) {
  const adj = adjacency(graph.links, keep);
  const from = reachable(adj, start);
  const unreached = targets.filter((t) => !from.has(t));
  const stranded = exfil == null ? [] : targets.filter((t) => from.has(t) && t !== exfil && !reachable(adj, t).has(exfil));
  return { unreached, stranded };
}
