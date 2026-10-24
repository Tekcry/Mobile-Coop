status: open

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
