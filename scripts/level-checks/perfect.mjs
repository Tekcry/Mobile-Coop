// level-checks/perfect: perfect-run and marker checks (BRIEF A10, A11; VISION 4 rules 3-5; G127, G146, G290, G339):
// the ghost path (no `loud` link), the no-kill path (no `requires_kill` link), `requires_kill` and `mark` fields, with
// severities from the mode profile (`PROFILES[mode].ghostPath`, `.marks`). `checkPerfect` is a stub until slice S6
// (docs/validator-port/PLAN.md): it returns an empty report. `perfectPaths` is the path helper S6 and the mission
// checks (S8) share; its signature and result are fixed here.
//   checkPerfect(graph, metrics, opts) -> { errors, warns, infos }
//   perfectPaths(graph, { start, targets, exfil, keep }) -> { unreached, stranded }
import { adjacency, reachable } from '../level-graph-lib.mjs';

/** Perfect-run checks over one merged graph (stub: empty report). */
export function checkPerfect(graph, metrics, opts = {}) {
  return { errors: [], warns: [], infos: [] };
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
