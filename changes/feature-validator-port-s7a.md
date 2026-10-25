# Validator port S7a: scale sheet rows and strict metrics-gen
kind: patch
- `scripts/metrics-gen.mjs` prints its usage and exits 2 on any argument but `--check` (`--help` included), writing
  nothing.
- Scale sheet section 3: the Relay lip row states the physical lip ceiling, `TEAM.relayMax` 4.6 + `HANG.drop` 1.9 =
  6.5 m, and keeps the 4.3 - 4.6 m band (Michael picked "Keep 4.6 m"); a new "Long throw (named spots only)" row (gap at
  most 4.9 m at two named Tallow Wharf spots) is read into `sizes.throw_long`.
- Scale sheet section 8: `nav_floor_depth_m` 1.5 and the mission-validator rows (`mission_steps`, `mission_step_min`,
  `mission_total_min`, `mission_rules_max`, `sector_parallel_min`, `sector_syncs_min`); `metrics.json` regenerated.
