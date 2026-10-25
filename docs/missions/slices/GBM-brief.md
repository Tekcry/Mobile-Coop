# GBM - Tallow Wharf measured pass (greybox exit, M4)

Planner: Opus, 2026-10-25. Builder: Sonnet 5.5 from this brief only. Checker: one fresh Sonnet checker (the numbers,
PLAN 6). The builder reads `docs/systems/agent-preamble.md` (master copy) first. Code facts: `feature/level-validator-v6`
at 2ab1fe186 (V6c `scripts/level-measure.mjs`, `--require-measured` in `scripts/level-validate.mjs:12`, `:984`, `:1009`),
`feature/mission-validator` at 0c62a921f (VAL + VAL-DIMS, cut from V6 220596bc), `feature/mission-engine` at 533c02a66
(GB0-GB5 + fix round; `tallowWharf` in `MAPS`).

## 0. Gates (the lead checks all four before starting the builder)
1. The V6 fix round is done: `git show origin/cloud-queue:briefs/level-validator-V6-fix.md | head -1` reads
   `status: done feature/level-validator-v6 <sha>` and the lead has reviewed it. The measured numbers depend on it
   (target ERRs on encounter spaces only, partner reach on `path_m / reachSpeed`, drops and ladders with no nav link
   untimed). Never measure on a V6 head without the fix.
2. The greybox is final: the GB0-GB5 Sonnet checker PASS is on the engine head used (a geometry change after GBM makes
   the measured values stale: rerun GBM).
3. `heavy.lock` is free or the run waits for it (`--wait 30`, section 3).
4. Desktop CPU under ~80 % (the bake is CPU heavy; GB-briefs 0.4 CPU rule).

## 1. The merge worktree (the lead runs it; agents never merge; never pushed)
```
cd /c/NightShift/Mobile-Coop-mission-engine && git fetch origin feature/mission-engine feature/mission-framework feature/mission-validator feature/level-validator-v6 \
 && git worktree add --detach C:/NightShift/Mobile-Coop-mission-gbm origin/feature/mission-engine \
 && cd /c/NightShift/Mobile-Coop-mission-gbm && git switch -c local/mission-gbm \
 && git merge --no-ff --no-edit origin/feature/level-validator-v6 \
 && git merge --no-ff --no-edit origin/feature/mission-validator \
 && git merge --no-ff --no-edit origin/feature/mission-framework \
 && test -f scripts/level-measure.mjs && grep -q "require-measured" scripts/level-validate.mjs && test -f scripts/mission-validate.mjs
```
- Order: V6 first (the measure CLI and the fixed checks), then the validator (stacked on an older V6), then the framework
  (its `graph.json` is newer than the engine's copy: `fca713181`, the shutters' `gap 0.9`). A dry `git merge-tree` of
  the three on 2026-10-25 was clean. Any conflict: `git merge --abort`, remove the worktree, report to the lead. Nobody
  resolves validator conflicts by hand here.
- Branch `local/mission-gbm` has no upstream and is never pushed. Then the lead's usual `node_modules` junction (V6
  changes `package.json` scripts only, no dependency).
- Guard line for the builder: `cd /c/NightShift/Mobile-Coop-mission-gbm && test "$(git rev-parse --abbrev-ref HEAD)" = local/mission-gbm && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-gbm"`

## 2. Files
- Written: `docs/missions/prototypes/campaign-map/graph.json`, `measured` members only (on spaces and links) and
  `meta.measured`. Nothing else changes in the worktree; nothing else is committed anywhere.
- Never: geometry (`src/world/maps/tallowWharf*.ts`), lights, guard data, graph targets or `area` boxes, `docs/design/metrics.json`,
  the validator or the measure CLI, and never a hand-typed `measured` value.

## 3. Measure (one bake, under the heavy lock, in the background)
- Baseline first (no bake, quick): `timeout 300 node scripts/level-validate.mjs docs/missions/prototypes/campaign-map/graph.json > C:/NightShift/scratch/gbm-validate-before.log 2>&1; echo "exit $?" >> C:/NightShift/scratch/gbm-validate-before.log`.
  Expected 0 ERR (SPEC "Validator, graph edits and WARNs": 0 / 6) with an INFO "pending V6" per encounter space.
- Copy the input for the check in 4: `cp docs/missions/prototypes/campaign-map/graph.json C:/NightShift/scratch/gbm-graph-before.json`.
- The bake (run with `run_in_background`; one Bash call; take, run and release in the same shell; the label is exact):
```
cd /c/NightShift/Mobile-Coop-mission-gbm && test "$(git rev-parse --abbrev-ref HEAD)" = local/mission-gbm \
 && node scripts/heavy-lock.mjs take C:/NightShift/heavy.lock "Night Shift | Marlow Build | GBM" --pid "$(cat /proc/$$/winpid)" --wait 30 \
 && { timeout 3600 node scripts/level-measure.mjs docs/missions/prototypes/campaign-map/graph.json --write > C:/NightShift/scratch/gbm-measure.log 2>&1; echo "exit $?" >> C:/NightShift/scratch/gbm-measure.log; \
      node scripts/heavy-lock.mjs release C:/NightShift/heavy.lock "Night Shift | Marlow Build | GBM"; }
```
- Expect several minutes (campus: 110-180 s per section; Tallow Wharf has four sections and one map build). Wait for the
  notification; never poll with a foreground sleep. After it: `node scripts/heavy-lock.mjs check C:/NightShift/heavy.lock`
  must not name GBM (if it does, release it with the same label).
- `exit 0` with a table per space, split and link. `exit 2` (usage, unknown map, unreadable file): report, stop.
- Only `--write` from the default doors (open). `--doors shut` is a diagnosis for the lead, never written by GBM.

## 4. Check that only `measured` changed
```
node -e "const a=require('C:/NightShift/scratch/gbm-graph-before.json'),b=require('./docs/missions/prototypes/campaign-map/graph.json');const s=(g)=>{g=JSON.parse(JSON.stringify(g));delete g.meta.measured;for(const k of ['spaces','links'])for(const x of g[k]||[])delete x.measured;return JSON.stringify(g)};if(s(a)!==s(b)){console.error('NON-MEASURED CHANGE');process.exit(1)}const n=(g,k)=>(g[k]||[]).filter(x=>x.measured).length;console.log('ok: spaces measured',n(b,'spaces'),'/',b.spaces.length,'links measured',n(b,'links'),'/',b.links.length)"
```
- Also `git status --short` lists only that file. A non-measured change: restore the file from the copy, report, stop.

## 5. Validate (0 ERR each)
- `timeout 300 node scripts/level-validate.mjs docs/missions/prototypes/campaign-map/graph.json --require-measured`
- `timeout 300 node scripts/level-validate.mjs docs/missions/prototypes/campaign-map/graph.json docs/missions/prototypes/three-grey-coats/graph.json --require-measured`
- `timeout 300 node scripts/level-validate.mjs docs/missions/prototypes/campaign-map/graph.json docs/missions/prototypes/two-key-ledger/graph.json --require-measured`
- Each to its own `C:/NightShift/scratch/gbm-validate-<map|tgc|tkl>.log` with `exit $?`. Done when all three print
  `0 error(s)`. Record the WARN counts and lines (the SPEC's 6 known WARNs; any new WARN is listed with its line).

## 6. A real ERR (report, never fix)
An ERR in 3 (a measure-step ERR line) or 5 goes to the lead, with no geometry, light, target or tool change and no rerun
with other options. Write the table in the report: space or link id, kind (encounter / connector / duct ...), the
measured value, the target and its source (`metrics.json` rule), and the likely cause from this list:
- **Too few floor cells** (`MIN_CELLS` 20, level-measure.mjs:36): small spaces such as the 1.2 m ducts (GB-briefs 0.5)
  or the chute; the `area` box may not match the built floor.
- **Shadow band** (0.4-0.6, encounters only after the V6 fix): greybox lamps (lit by default, LR1 / G279). Lighting on
  every map is Sector Ops Build's area: the lead decides whether a lamp or switch change goes to them or to an Opus
  greybox fix round.
- **Vantage / LOS-break / partner reach**: name the two spaces and the path the measure took (from the log).
- **Encounter with no `measured`** under `--require-measured`: the measure skipped it (its table line says why).
The lead's message to the orchestrator (blocked) carries the table. The greybox exit waits for a fix and a rerun of GBM.

## 7. Hand the result to the lead (the lead commits; the builder never commits)
- On 0 ERR in all three: the lead copies the measured file into the engine worktree and commits it there (the PR that
  carries the wharf e2e, PRC-split.md C9):
```
cd /c/NightShift/Mobile-Coop-mission-engine && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-engine && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-engine" \
 && git pull --ff-only && cp C:/NightShift/Mobile-Coop-mission-gbm/docs/missions/prototypes/campaign-map/graph.json docs/missions/prototypes/campaign-map/graph.json \
 && git add docs/missions/prototypes/campaign-map/graph.json \
 && git commit -m "mission-framework GBM: Tallow Wharf measured pass (level-measure --write, --require-measured 0 ERR)" -m "<counts: spaces / links measured, WARNs, the three validate results>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" \
 && git push origin feature/mission-engine
```
  (the diff against the engine's copy is the `measured` members plus the framework's two `gap 0.9` lines, fca713181).
- Then the lead removes the merge worktree: `git -C /c/NightShift/Mobile-Coop-mission-engine worktree remove C:/NightShift/Mobile-Coop-mission-gbm`
  and deletes the local branch `local/mission-gbm` (never pushed, so nothing on origin).
- Report: `C:/NightShift/scratch/mission-gbm-report.md`: gates seen, merge shas, bake time, the measured counts, the
  three validate results with WARN lines, ERR table (6) if any. Final message short: PASS / blocked, counts, ERRs.
