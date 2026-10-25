# Validator port B2: measure CLI, scale sheet rows and strict metrics-gen
kind: patch
- `scripts/level-measure.mjs` (run as `node scripts/level-measure.mjs <graph.json> ...`): measures a map's greybox
  (floor shadow, vantage, LOS break, split legs and partner reach, link times) and writes it back as `measured`. The
  files of one map are merged, measured once, and each file gets only its own spaces and links, so cross-file links get
  times and a second `--write` of the same values changes no byte; a campaign graph also gets `meta.measured.ways_back`.
  `--check` exits 1 on a target miss or a drift; `--points <out.json>` writes the resolved points for one map per call
  (with `--check`, not `--write`); `--flags <key>=<value>[,<value>]` sets a `flags` key by its current type (a text key
  such as `mode` is not checked against its allowed values; an unknown key exits 2). Documented in
  `docs/systems/testing-tools.md` "Measure CLI".
- `scripts/metrics-gen.mjs` prints its usage and exits 2 on any argument but `--check` (`--help` included), writing
  nothing.
- Scale sheet section 3: the Relay lip row states the physical lip ceiling, `TEAM.relayMax` 4.6 + `HANG.drop` 1.9 =
  6.5 m, and keeps the 4.3 - 4.6 m band (Michael picked "Keep 4.6 m"); a new "Long throw (named spots only)" row (gap at
  most 4.9 m at two named Tallow Wharf spots) is read into `sizes.throw_long`.
- Scale sheet section 8: `nav_floor_depth_m` 1.5 and the mission-validator rows (`mission_steps`, `mission_step_min`,
  `mission_total_min`, `mission_rules_max`, `sector_parallel_min`, `sector_syncs_min`); `metrics.json` regenerated.
