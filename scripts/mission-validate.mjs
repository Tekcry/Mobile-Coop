// mission-validate: the mission checks over a map's merged `mission`, `objectives`, `rules` and `syncs` nodes (BRIEF
// A19, A20; the mission-validator re-cut, jointly with Campaign Build). Stub until slice S8
// (docs/validator-port/PLAN.md): returns an empty report.
//   checkMission(graph, metrics, opts) -> { errors, warns, infos }

/** Mission checks over one merged graph (stub: empty report). */
export function checkMission(graph, metrics, opts = {}) {
  return { errors: [], warns: [], infos: [] };
}
