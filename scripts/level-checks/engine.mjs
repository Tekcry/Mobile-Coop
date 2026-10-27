// level-checks/engine: engine-fact WARNs read from the scale sheet (BRIEF A12, V10), slice S7b
// (docs/validator-port/PLAN.md):
//   - the nav floor: a space deeper under storey 0 than `rules.nav_floor_depth_m` that is an encounter space or has
//     guards WARNs (off the guards' nav grid, level-design 12.1). The key is asked only when a space is below storey 0
//     and an encounter or guarded, so a map with nothing underground needs no row; a missing key: one WARN, check
//     skipped.
//   - the `exception` link field (A27): it names an approved exception on a `team_throw` only; the field on any other
//     kind is an ERR here (the `team_throw` case of `checkDimensions` in scripts/level-validate.mjs judges its value).
// No rope direction check (ropes go both ways, G293) and no human-ladder check (master's `sizes.coop_lip` band judges a
// `human_ladder` lip): A12, the seam with the coop-kit job.
//   checkEngine(graph, metrics, opts) -> { errors, warns, infos }
import { EPS, collector, fmt, index, linkName } from '../level-graph-lib.mjs';

/** A space with guards at some player count (`guards: { "<players>": n }`, any n > 0). */
const guarded = (s) => !!s.guards && typeof s.guards === 'object'
  && Object.values(s.guards).some((n) => typeof n === 'number' && n > 0);

/** Engine-fact checks over one merged graph. */
export function checkEngine(graph, metrics, opts = {}) {
  const c = collector(metrics);
  const { spaces, links } = index(graph);
  for (const l of links) {
    if (l.exception !== undefined && l.kind !== 'team_throw') {
      c.err(`${linkName(l)}: exception '${l.exception}' on a ${l.kind} (only a team_throw takes an exception, A27)`);
    }
  }
  if (!metrics) return c.r;
  for (const s of spaces) {
    if (!(s.storey < 0) || !(s.type === 'encounter' || guarded(s))) continue;
    const depth = c.num('rules.nav_floor_depth_m', 'the nav floor check');
    if (depth === undefined) break;
    if (s.storey < -depth - EPS) {
      const what = s.type === 'encounter' ? 'an encounter space' : 'a space with guards';
      c.warn(`${s.id}: ${what} at storey ${fmt(s.storey)} m, deeper than the ${fmt(depth)} m nav floor (off the guards' nav grid, level-design 12.1)`);
    }
  }
  return c.r;
}
