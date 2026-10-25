// level-checks/measured: greybox measurements (V6 `checkMeasured`, BRIEF A4, A5): measured vantage, line-of-sight
// break, split legs and reach against the metrics, shadow share as INFO (G329), and the presence gate under
// `--require-measured`. Stub until slice S3 (docs/validator-port/PLAN.md): returns an empty report.
//   checkMeasured(graph, metrics, { requireMeasured }) -> { errors, warns, infos }

/** Measured checks over one merged graph (stub: empty report). */
export function checkMeasured(graph, metrics, opts = {}) {
  return { errors: [], warns: [], infos: [] };
}
