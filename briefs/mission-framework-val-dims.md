status: done feature/mission-validator-dims 0c62a921

# mission-framework VAL-DIMS: validator checks co-op kit link dimensions against engine limits (unit tests only)
Lead: Night Shift | Marlow Build.

- Base: origin/feature/mission-validator @ 4ea5d26bf. New branch: `feature/mission-validator-dims`.
- npm ci once. Unit tests only.

## Why
The Tallow Wharf graph (docs/missions/prototypes/campaign-map/graph.json on origin/feature/mission-framework) first asked kit moves to do more than the code allows, and the validator did not catch it:
- rope descents of 8.4 m;
- throws over 3.5-4 m gaps;
- a human-ladder lip of 4.5 m;
- a pull-up lip of 4.2 m.
The validator must ERR on those.

## Only these files
- scripts/level-validate.mjs (the co-op link checks; grep `checkCoop` and the kit kinds `team_throw`, `team_hang`, `team_pull`, `shutter`)
- docs/level-validator/graph-schema.md
- docs/design/metrics.json (add a `kit` block; read how the validator loads metrics.json)
- tests/levelValidate.test.ts

## Build
1. A `kit` block in metrics.json. Each number cites its code source in a sibling `_src` string:
   - `boostMax` 4.5 (src/config/movement.ts TEAM.boostMax).
   - `ladderGrab` 4.1 (movement.ts TEAM / ladderGrab).
   - `ropeMin` 2.2 and `ropeMax` 6.0, up only (movement.ts ~:513-514; teamMoves.ts:68-72: the climber is below the holder).
   - `throwDist` 3.2 (src/game/teamMoves.ts:174-190).
   - `pullMin` 4.3 and `pullMax` 4.5 (src/game/kit/pullUp.ts PULL, ~:51-53 on origin/feature/mission-kit-pull).
   - `shutterGap` 0.9 (src/game/kit/shutter.ts on origin/feature/mission-kit-shut).
   Read the real values from those files with `git show origin/<branch>:<path>`. If one differs from this brief, use the code value and note it in the report.
2. level-validate.mjs, per link kind, reading the link's height / gap fields as graph-schema.md defines them (read the doc; if a kind has no field yet, add one in the doc, e.g. `height` for vertical moves and `gap` for throws):
   - `coop_boost` height > boostMax -> ERR.
   - `human_ladder` height > ladderGrab -> ERR.
   - `team_rope`: height outside ropeMin..ropeMax -> ERR; a rope whose `to` is lower than its `from` (a descent, if the graph says direction) -> ERR "rope climbs up only".
   - `team_throw` gap > throwDist - 0.5 -> ERR (landing margin; document the margin).
   - `team_pull` height outside pullMin..pullMax -> ERR; below pullMin also gets the hint "a solo climb exists".
   - `shutter` gap must equal shutterGap ± 0.05 -> WARN.
   - A missing height or gap on these kinds -> WARN "dimension missing".
3. graph-schema.md: document the fields and the limits table, pointing to metrics.json.
4. Tests in levelValidate.test.ts: one passing and one failing fixture per kind, plus the missing-dimension WARN.
5. Regression:
   - Run the CLI on the five campus plan graphs: `git show origin/feature/sector-redesign-signoff:docs/sector-redesign/graph/plan/campusOps-S<N>.json`, N = 1..5. Expected: 0 ERR.
   - Run it on origin/feature/mission-framework:docs/missions/prototypes/campaign-map/graph.json. Expected: 0 ERR, since it was fitted by hand.
   - Report any new ERR / WARN with the link ids. Do not edit those graphs.

## Run
- `npx vitest run tests/levelValidate.test.ts tests/missionValidate.test.ts --maxWorkers=2`

## Done when
- Tests green.
- The regression counts are in the report.
- Branch pushed.
- `status: done feature/mission-validator-dims <sha>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-24)
- `feature/mission-validator-dims` @ 0c62a921 (base 4ea5d26b). 7 files, +272 -33.
- Code values all match the brief: TEAM.boostMax 4.5 (movement.ts:459), ladderGrab 4.1 (:464), ropeMin 2.2 / ropeMax 6.0 (:513-514), throwDist 3.2 (:483); PULL.min = WALL_JUMP.maxUp 3.8 + 0.5 = 4.3, PULL.max 4.5 (pullUp.ts:52-53 on kit-pull); SHUTTER.holdGap 0.9 (shutter.ts:37 on kit-shut).
- metrics.json: hand-kept `kit` block with `_src` per number (+ `throwMargin` 0.5, `shutterTol` 0.05 so the validator holds no constant). New `checkKit`: ERR past the limit for coop_boost (4.5), human_ladder (4.1), team_rope (2.2-6.0, plus "rope climbs up only" by storey), team_throw (`width` up to 3.2 - 0.5 = 2.7), team_pull (4.3-4.5, "a solo climb exists" below); WARN on a shutter `gap` off 0.9 +- 0.05 and on any missing dimension. graph-schema.md: new `gap` field (shutter only) and a "Kit limits" table. Field names: vertical moves use `level_change` (schema `height` is the clear opening), throws use `width` (already the throw gap).
- Changed existing checks (no double messages): the upper co-op lip ERR moved into checkKit ("leg-up reach (kit.boostMax)"); human_ladder lost its 4.3-4.5 band check (every legal 4.1 ladder would WARN); kit kinds print "dimension missing" instead of "level_change missing" / "width missing".
- OFF-LIST EDITS (needed to keep existing tests green): `scripts/metrics-gen.mjs` + `tests/metricsGen.test.ts` (metricsGen asserts metrics.json == a fresh generation, and regeneration would wipe the hand block: a `withKit` helper carries `kit` over, 1 new test); `docs/level-validator/example.mission.json` shutter `"gap": 0.9` (else the new missing-dimension WARN breaks 3 missionValidate 0-warning tests).
- Tests: levelValidate + missionValidate + metricsGen 157/157 (rerun by the builder session: 157/157); typecheck:fast clean; eslint clean on the test files (.mjs scripts are eslint-ignored).
- Regression: campus S1-S5 merged 1 ERR / 119 WARN (baseline 0 / 119): new ERR `s5-arch -> s5-well (team_rope): rope climbs up only` (storey 4.2 down to 0; CR7 says the holder "lowers the climber 4.2 m", which the code cannot do). Per file 1/2/2/2/1 ERR, same as baseline (structure stops first). Tallow Wharf 0 ERR / 8 WARN (baseline 6): "dimension missing (gap)" on `w1-fish-hall -> w1-service-passage` and `w4-back-lane -> w4-shed-two` shutters.
- Open: G57 says the human ladder reaches 4.5 but `TEAM.ladderGrab` is 4.1 (raise `kit.ladderGrab` when code ships G57); S5 CR7 needs a Sector Ops redesign (rope from the well up, or rappel / drop); Tallow's two shutters need `"gap": 0.9`; no changelog fragment (not on the file list).
