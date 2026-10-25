// level-checks/training: the training profile's own checks (BRIEF A8, A9, A23, A26; Q24, Q29, G292, G363):
// `meta.taught_by`, `teach` elements, one route per section up to `taught_by`, late side routes under the campaign
// route rules. Stub until slice S4 (docs/validator-port/PLAN.md): returns an empty report.
//   checkTraining(graph, metrics, opts) -> { errors, warns, infos }

/** Training checks over one merged graph (stub: empty report). */
export function checkTraining(graph, metrics, opts = {}) {
  return { errors: [], warns: [], infos: [] };
}
