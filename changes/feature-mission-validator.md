# Mission validator: mission, rule and sync nodes, training profile, co-op kit links
kind: minor
- Tooling: `scripts/mission-validate.mjs` checks the mission nodes of a level graph (`docs/level-validator/mission-schema.md`,
  example `docs/level-validator/example.mission.json`): `mission`, `objectives[]`, `rules[]` and `syncs[]` (Sector Ops
  sync contract; the key `sync` is accepted too). Checks: a lead space reachable before every objective, the goal seen
  from an earlier space, ghost and pacifist paths, campaign forced co-op per section with no solo twin, Sector Ops 2+
  parallel objectives and 2+ syncs with a solo fallback, every objective reachable by one player, the step budget
  (3-6 steps, 2-5 min each, 10-30 min, one new mechanic per step, one intel -> exploit pair, one twist, one optional,
  extraction last; per team in Sector Ops), at most 2 rules per team, a choke node per mission section (WARN).
  Tests: `tests/missionValidate.test.ts`.
- Tooling: `scripts/level-validate.mjs` merges mission files with the map graph, reads the new co-op link kinds
  `team_throw`, `team_hang`, `team_pull` and `shutter`, errors on a guidance `mark` outside training, and gains a
  `training` profile (`meta.mode: "training"`: one route per space allowed as INFO, routes-cross skipped, marks allowed).
  Tests: `tests/levelValidate.test.ts`.
