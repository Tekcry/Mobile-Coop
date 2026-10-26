# laptop-queue-8 - plan
Owner: Test Runner. Status: current.

Problem, sources and assumptions: `BRIEF.md`. One PR (feature/laptop-queue-8), six slices. Line pointers are
origin/feature/laptop-queue-7 at 3791f2f1c (PR #507, open), not master.

## Start (the lead, before slice A)
- `git fetch -q origin`. If PR #507 has merged: `git rebase origin/master` (the branch holds only docs commits; the
  work sits on master). If not: `git merge --no-edit origin/feature/laptop-queue-7` (subject "Merge
  origin/feature/laptop-queue-7 into feature/laptop-queue-8"); merge it again before each slice if #507 got new commits.
  The PR stays draft (no `train-ready`) until #507 is on master; then `git rebase origin/master` (#507's commits drop
  out) and force-push the branch once. Line pointers shift by #507's fix rounds: builders find each function by name.
- `gh label list -R Tekcry/Mobile-Coop --search fix`; missing: `gh label create fix -R Tekcry/Mobile-Coop --color d73a4a
  --description "Fix: tested before new features (laptop queue)"` (A13).

## Claims (origin/feature/laptop-queue-7 3791f2f1c)
| File | Lines | Change | Slice |
| --- | --- | --- | --- |
| scripts/laptop-queue/lib.mjs | :234-240 `isFront`, beside it | new `isFix(r, board)`, `placeKey(r)` | A |
| scripts/laptop-queue/lib.mjs | :256-328 `pick` doc + `pickFrom` order block, :330-340 `arrivalNext` | fix tier, `placeKey` sort, desktop smallest order | A, D |
| scripts/laptop-queue/lib.mjs | :405-446 `superseded` | unchanged; new `placeFor(sup, requests)` and `supersededRunning(...)` after it | A, B |
| scripts/laptop-queue/lib.mjs | :687-716 `cutShort` | `superseded` option, reason 'superseded' | B |
| scripts/laptop-queue/lib.mjs | :738-762 `parseRun`, after it | new `finishedSuites(text)`, `keptPlan(r, sha)` | C |
| scripts/laptop-queue/lib.mjs | :135-145 `desktopGate`, :227-232 `gatedCpu`, after it | new `gateCpu(c, mode)`, `desktopTooLong(r, times, maxS)` | D |
| scripts/laptop-queue/lib.mjs | :872-893 `prBoard` | `fix` from `labels` | A |
| scripts/laptop-queue/service.mjs | :95-103 header (laptop-queue-7 block), after it | 4 header lines (fix tier, place, stop, desktop, carry) | E |
| scripts/laptop-queue/service.mjs | :149-158 env block, after :158 | `LQ_FIX_FIRST`, `LQ_STOP_SUPERSEDED`, `LQ_KEEP_FINISHED`, `LQ_DESKTOP_MAX_MIN`, `LQ_DESKTOP_CPU_MODE`, `LQ_PR_CARRY` | A-E |
| scripts/laptop-queue/service.mjs | :600-606 `prBoardNow` | `labels` in `--json` | A |
| scripts/laptop-queue/service.mjs | :453-500 `affectedPass` (inside the `needs` loop, after the age check :465-468) | PR carry call | E |
| scripts/laptop-queue/service.mjs | after `affectedPass` (:500), before `spareIdleSince` (:503) | new `prCarry(n, reqs)` | E |
| scripts/laptop-queue/service.mjs | :1324-1337 runRequest watch, :1355-1369 `cutEnd`, :1456-1462 list / jobs / bins, :1497-1506 `finish` call | stop on supersede; kept suites | B, C |
| scripts/laptop-queue/service.mjs | :1099-1118 `finish` | kept passes in `result`, "; K kept" | C |
| scripts/laptop-queue/service.mjs | :1615-1639 `applySupersedes` | survivor `place` push | A |
| scripts/laptop-queue/service.mjs | :1742-1756 `pass` top, :1776-1818 desktop block, :1841-1850 order block | running stop map, desktop filter + CPU mode, fix tier | A, B, D |
| scripts/laptop-queue/request.mjs | :12 header comment (one line after it), :27 flag list, :96 (one line after) | `--fix` -> `"fix": true` | A |
| scripts/laptop-queue/install-task.ps1 | :5, :8-12, :21 | `-DesktopCpuMode normal|total` -> `LQ_DESKTOP_CPU_MODE` | D |
| scripts/run-e2e.mjs | :229-231 (after `results.push`, streamed branch) | one result line per streamed suite | C |
| scripts/laptop-queue/service.mjs | :111 lib import line | add `isFix`, `placeKey`, `placeFor`, `supersededRunning`, `finishedSuites`, `keptPlan`, `gateCpu`, `desktopTooLong`, `prChain` | A-E |
| scripts/laptop-queue/service.mjs | :363-385 `pushFile` | `mustExist` option | A |
| tests/laptop-queue.test.ts | :3 lib import line | the same new names | A-E |
| tests/laptop-queue.test.ts | new describes (below) beside :58, :222, :464, :531, :1118, :1410 | tests | A-E |
| docs/RULES.md | :166-171 "Machines" pick order, :176-185 desktop bullet | rewritten in place, same line count | F |
| docs/systems/testing-tools.md | :568-573 Order, :592-597 Yield, :614-630 Affected, :631-643 Desktop, :653-661 Scheduled tasks | net zero | F |
| changes/feature-laptop-queue-8.md | new | `kind: patch` | F |
| docs/laptop-queue/STATE.md, docs/laptop-queue-8/** | | job docs | F |

Overlap with affected-cap (feature/affected-cap, docs/affected-cap/PLAN.md), unavoidable, different hunks:
- request.mjs: affected-cap edits :3-6 (header usage) and :55-64 (`prSuites`, its stderr line), plus the :41 usage
  string; this job edits :12-13, :27, :96-97 only (the `--fix` flag is not added to the :41 usage string).
- run-e2e.mjs: affected-cap edits :3-12, :21, :131-144; this job only the streamed result line, :229-231 on
  laptop-queue-7, ~:240-242 on master 29f03b6c (master's run-e2e grew 11 lines; no hunk conflict).
- lib.mjs / service.mjs / tests: affected-cap edits lib `affectedSuites` (:1175-1195) and a new function after
  `affectedRequest`; service: an import line, `refileOverCap` before "task guard", `main`, `selfUpdate`; tests
  :1135-1180 area of "affected e2e on every PR head". This job never edits those lines; its PR carry goes after
  `affectedPass`, its tests in new describes. `refileOverCap` rewrites request files with `{ ...r, suites }`, so
  `place`, `fix` and `kept` survive a re-file; a re-filed request runs its new suites minus the kept ones that are
  still in its suites (keptPlan intersects; a kept pass is still a pass of that suite on that sha).
- RULES.md: affected-cap edits :152 ("Test tiers"); this job :166-185. testing-tools.md: affected-cap :86-112; this
  job :560-661. Whichever merges second rebases; no line is shared.
Not touched: auto-train.mjs, merge-train.mjs, watchdog.mjs, e2e-affected.mjs, lib `affectedSuites` / `affectedNeeds` /
`affectedRequest` / `superseded` body.

## Slice A (Opus) - fixes first and a new head keeps its place (BRIEF 1, 2; A1-A5)
- lib `prBoard`: each row gains `fix: (p.labels ?? []).some((l) => l?.name === 'fix')`.
- lib `isFix(r, board)`: `r.fix === true` or `board?.get(r.pr)?.fix === true`; never for alone, spare, train or laptop
  reruns (those sit above or apart).
- lib `placeKey(r)`: `typeof r.place === 'string' && r.place < r.id ? r.place : r.id`. `pickFrom` and `arrivalNext`
  sort by `placeKey` instead of `sortById` for non-alone requests; the starvation check uses `idTime(placeKey(oldest))`;
  green ties by `placeKey`. Trains, reruns, alone rules untouched.
- lib `pickFrom` order block (:304-326): new tier 0 before front: `order.fix` (Set of ids) -> the request with the
  smallest `placeKey` among them, no wait bound. Then front, green, arrival as today over the rest.
- lib `placeFor(sup, requests)`: Map survivorId -> place for each supersede pair whose min(placeKey(old),
  placeKey(survivor)) is below placeKey(survivor) (chains: old's own place counts). Pure.
- service: env `FIX_FIRST = process.env.LQ_FIX_FIRST !== '0'`. `prBoardNow` `--json` adds `labels`. Order block
  (:1841): build `queue.order` when `GREEN_FIRST || FIX_FIRST`; `order.fix` = ids with `isFix(r, board)` when
  FIX_FIRST, else empty; `green` empty when not GREEN_FIRST. Log key adds "fix <k>".
- service `applySupersedes` (:1619): after the done push, for each `placeFor` entry `pushFile('requests/<id>.json',
  JSON of { ...survivor, place }, 'place <id>', { mustExist: true })` (DRY: log only); log "<id>: keeps the place of
  <old>". A lost push logs and is not retried (the request just queues by its id).
- service `pushFile` (:363-385): option `{ mustExist = false }`; when true, after reading the fresh parent, skip the
  write (return false, log "<rel> gone, not rewritten") when `git cat-file -e <parent>:<rel>` fails, so a rewrite never
  recreates a request withdrawn meanwhile. Used by every request rewrite in this job (place, kept); affected-cap's
  calls keep the default.
- request.mjs: `fix` in the boolean flag list; `if (opts.fix) req.fix = true;`; one header line "--fix: "fix": true,
  tested before new-feature requests (the PR's `fix` label does the same)".
- Tests (new describe "pick: fixes first, keep place" beside :58): prBoard reads the label; isFix via flag, via board,
  not for alone / train rerun; fix beats a front (`feature/mixamo-x`) and a green request; two fixes: smaller place
  first; trains, train reruns, aged alone still first; FIX_FIRST off (no `order.fix`) = laptop-queue-7 results;
  `place` makes a newer request win arrival over an older other requester; a `place` above its own id is ignored;
  starvation uses the place time; placeFor over a chain R1 -> R2 -> R3 gives R3 R1's id.
- Size ~45 lib, ~30 service, ~3 request, ~110 tests.

## Slice B (Opus) - stop a running request when its PR gets a new head (BRIEF 3; A6, A7)
- lib `supersededRunning(running, candidates, isAncestor, progressOf)`: Map runningId -> newer id. Exactly lib
  `superseded`'s pairing (lib :417-440): same `queueRequester`, same kind (pr only here), same `trainRerun` (false),
  compatible set (two different non-empty sets never pair), R not pinned, R's requester not empty / 'unknown', N not a
  laptop rerun, N newer (a later id). Only three differences: "covers" is relaxed to "suite bases
  overlap"; `isAncestor(r.sha, n.sha)` with r.sha !== n.sha is always required (also for affected requests, which
  `superseded` pairs without it); and `!(progressOf(r.id) >= PREEMPT_MAX_PROGRESS)`. Pure.
- Candidates for N (checker FIX 2): `queue.requests` (open) + `otherActive` (claimed or running on the other worker,
  listRequests :283-292) + `activeReqs` (running here), minus R itself. So R also stops when N is already claimed or
  running. The place push (A4) applies only when N is still open (in `queue.requests`); a claimed or running N needs
  no place.
- lib `cutShort`: option `superseded = ''`; returns 'superseded' right after 'withdrawn' (any stage: lock wait,
  prepare and suites).
- service: module `runningSup = new Map()`; `pass()` after the supersede line (:1756), when `LQ_STOP_SUPERSEDED` on:
  `runningSup = supersededRunning([...activeReqs.values()], [...queue.requests, ...otherActive,
  ...activeReqs.values()], isAncestor, (id) => progressById.get(id))` (runRequest keeps `progressById.set(r.id,
  progress())` in its watch; the lib skips N === R). Same pass: place push onto N only when N is in `queue.requests`
  (reuse A's push helper). The watch (:1335) passes `superseded: runningSup.get(r.id) ?? ''`.
- service `cutEnd` (:1355): `ctl.why === 'superseded'`: log "<id>: stopped, new head <sha8> queued (<by>)"; error
  on every verdict context (affected-e2e too), result `superseded-run` with `by`; same tail as withdrawn.
- Tests (extend "superseded" :222 and "cutShort" :1118): running pr on A, open newer on B containing A, overlap ->
  stopped; rebased (not ancestor) -> not; no overlap -> not; pinned / train rerun / full / alone -> not; at 0.85
  progress -> not; another branch -> not; a laptop rerun as the newer request -> not; an affected N on the same branch
  does not stop a lead's set run (different requester); a lead's `unknown` requester run -> not; two different sets ->
  not; N present only as active (claimed / running, not in the open list) -> R stopped, and no place push for N;
  cutShort 'superseded' before start and after start, 'withdrawn' wins.
- Size ~30 lib, ~35 service, ~70 tests.

## Slice C (Opus) - keep finished suites when a train preempts (BRIEF 4c; A10)
- run-e2e.mjs (:229-231): in `runOne`, when `streamed`, after `results.push` print
  `` `\n=== ${s} (${report(s) ? `REPORT ONLY, exit ${code}` : code === 0 ? 'ok' : 'FAIL'}, ${sec.toFixed(0)}s) ===` ``
  (the non-streamed header's format; the times table is untouched).
- lib `finishedSuites(text)`: suites with a result line `=== <s> (ok|FAIL|REPORT ONLY, exit n, <N>s) ===` ->
  [{ s, ok, sec }]; a start-only header (`=== s ===`) is not a result. lib `keptPlan(r, sha)`: { kept: [...], rest:
  suites } from `r.kept` when `r.kept.sha === sha`, else { kept: [], rest: r.suites } (parts match by exact name, a
  base name keeps only when every one of its parts is kept). Kept rows are intersected with the current `r.suites`
  first: after an affected-cap re-file drops a suite, its kept row no longer counts in the verdict.
- service `cutEnd` train branch (:1363) for a pr request with `LQ_KEEP_FINISHED` on: passes = `finishedSuites` over
  the run's slot log(s), ok only, plus the old `r.kept` ones; non-empty -> `pushFile` the request with `kept: { sha,
  suites }` (`mustExist`) before the claim release; log "<id>: keeps K finished suite(s)".
- service runRequest (:1456-1462): `const { kept, rest } = keptPlan(r, r.sha)`; run `rest` (empty: no e2e call, the
  verdict from kept); `result.suites` = kept as ok rows + the run's; `progress` and `bins` over `rest`;
  `runComplete` against `rest.length`. `finish` description adds "; K kept" (lib `describe` unchanged; appended in
  finish when `result.kept > 0`, cut to 140).
- Tests (new describe "kept suites after a train preempt" beside :1118): finishedSuites reads streamed and parallel
  lines, ignores start headers and the times table; keptPlan: same sha -> rest without kept, other sha -> all, a
  base with one part kept reruns; a request with every suite kept -> rest empty; a kept suite no longer in
  `r.suites` (re-filed) is dropped from kept and the verdict.
- Size ~3 run-e2e, ~35 lib, ~45 service, ~60 tests.

## Slice D (Sonnet from this brief) - desktop worker order, long-run skip, CPU mode (BRIEF 4a, 4b, 6; A8, A9, A11)
- lib `gateCpu(c, mode)`: mode 'total' -> `c.total`, else `c.gated`. lib `desktopTooLong(r, times, maxS)`: maxS > 0
  and `expectedWallS(r.suites, times, 1) > maxS` (NaN -> false).
- lib `pickFrom`: `order.smallest` (true from the desktop) replaces front / green / arrival after the fix tier:
  smallest `order.wallS[id]` first, unknown last, ties by `placeKey`.
- service: env `DESKTOP_MAX_S = Number(process.env.LQ_DESKTOP_MAX_MIN ?? 15) * 60`, `CPU_MODE =
  process.env.LQ_DESKTOP_CPU_MODE === 'total' ? 'total' : 'normal'`. Desktop block (:1786, after the pr filter):
  drop `desktopTooLong` requests (log once per id "<id>: ~N min on the desktop, left to the laptop"); both
  `desktopSlotGate` calls (:1797, :1810) pass `cpu: gateCpu(cpu(), CPU_MODE)` and the reason names the mode. Order
  block: on the desktop `wallS` for every request (jobs 1) and `order.smallest = true`.
- install-task.ps1: `[ValidateSet('normal', 'total')][string]$DesktopCpuMode = 'normal'`, added to `$desktopEnv` and
  the usage comment.
- Tests (extend "claims and the desktop lane" :464 and "gate cpu" :531): gateCpu both modes; desktopTooLong over / under
  / NaN / maxS 0; desktop pick: smallest first, fix ahead of a smaller non-fix, unknown wall last.
- Size ~20 lib, ~20 service, ~4 ps1, ~50 tests.

## Slice E (Opus) - docs-only carry for PR heads (BRIEF 5; A12) and service header
- service `prCarry(n, reqs)` (new, after `affectedPass`): chain = `git log --first-parent -n LQ_TRAIN_CARRY_DEPTH
  --format=%H <n.sha>` minus H, stopped at the merge-base with origin/master; per commit the `affected-e2e` state from
  `gh api repos/<repo>/commits/<sha>/status` (memo `prCarryChecked` per H); `live(P)` = some request in `reqs` with
  sha P and requester `affected-e2e`. lib `carryFrom(chain, (c) => carryFiles input from git diff --name-only c H,
  live)`: { from } -> `postStatus(H, 'success', AFFECTED_CTX, carryDesc(from))`, `affectedSeen.add`, log "affected:
  #n <H8>: carried from <C8>"; { wait } -> skip H this pass, drop the memo; null -> as today. A gh error -> as today.
- affectedPass (:468, after the age check): `if (PR_CARRY && prCarry(n, reqs)) continue;`.
- service header: four lines after :103 (fix tier and place, running stop, desktop order / skip / CPU mode, PR carry).
- Tests (new describe "docs-only carry for PR heads"): a pure helper `prChain(lines, mergeBase)` (lib) cuts the chain
  at the merge-base; carryFrom cases for a PR chain (docs-only after a success -> carried; a .ts commit -> null; a
  pending older head with a live affected request -> wait); the existing train-carry tests stay green.
- Size ~15 lib, ~45 service, ~40 tests.

## Slice F (Sonnet; parallel with E: docs files only) - docs and fragment
- RULES "Machines" (:166-171), same line count, pick order line rewritten in place: "... then PR requests (one slot,
  `E2E_JOBS=2`; full runs 3): fixes first (PR label `fix` or `request.mjs --fix`), then front branches
  (`LQ_FRONT_BRANCHES`), then green PRs smallest first, then arrival order; a new head of the same PR keeps its
  request's place and stops its running one; then ...". The aged alone clause before it stays: an alone request
  waiting over 30 min still goes ahead of PR work, fixes included (lib pick order: trains, reruns, aged alone, then
  the fix tier). Desktop bullet (:176-185): "takes pr requests ... fixes first, then smallest first, none estimated
  over 15 min (`LQ_DESKTOP_MAX_MIN`) ... CPU of Normal or higher priority processes (`LQ_DESKTOP_CPU_MODE=total`
  counts the whole machine)". RULES is 318/318: the added words are paid for by trimming the build-marker sentence in
  the desktop bullet ("nothing new while auto-train's build marker exists (written during `merge-train build`, deleted
  once the version commit is pushed; a marker over 30 min old is ignored)") to "nothing new while auto-train builds
  (testing-tools "Laptop queue")"; testing-tools' desktop bullet already holds the marker detail. `wc -l` stays 318.
- testing-tools.md (720 budget, net <= 0, `wc -l` checked): Order bullet + fix tier and place; Yield bullet + the
  running stop and kept suites; Affected bullet + the PR carry; Desktop bullet + smallest, 15 min, CPU mode; lines
  freed by shortening the "Scheduled tasks" history parenthetical (:653-654) and any further rewording in place.
- `changes/feature-laptop-queue-8.md`: `# Laptop queue: fixes first, a new head keeps its place`, `kind: patch`,
  bullets: fixes tested before new features (`fix` label or `--fix`); a new head keeps its place and stops the old run;
  the desktop takes the smallest request and skips long ones, with a CPU mode knob; a train preempt keeps finished
  suites; a docs-only PR commit carries the affected-e2e verdict.
- docs/laptop-queue/STATE.md one dated entry; docs/laptop-queue-8/STATE.md per slice. PR body `Job-done:
  laptop-queue-8`.

## Order and builders
A -> B -> C -> D -> E in order on the branch (all share lib.mjs, service.mjs and the test file, so never in parallel);
F in its own worktree (feature/laptop-queue-8-docs) alongside E, merged by the lead. Opus builds A, B, C, E; Sonnet
builds D and F. One Opus checker for the PR (queue code), started on the head when E and F are in.

## Env knobs (service env block)
| Knob | Default | Off / undo |
| --- | --- | --- |
| `LQ_FIX_FIRST` | 1 | 0 = no fix tier (A3) |
| `LQ_STOP_SUPERSEDED` | 1 | 0 = runs on old heads finish (A6) |
| `LQ_KEEP_FINISHED` | 1 | 0 = a preempted run reruns all (A10) |
| `LQ_DESKTOP_MAX_MIN` | 15 | 0 = no limit (A9) |
| `LQ_DESKTOP_CPU_MODE` | normal | total = whole machine (A11) |
| `LQ_PR_CARRY` | 1 | 0 = every PR head runs (A12) |

## Tests and verify (per slice)
- `npm run typecheck:fast`; `npx vitest run tests/laptop-queue.test.ts tests/autoTrain.test.ts` (Babylon-free);
  slice F: `node scripts/doc-lint.mjs`.
- Dry run in the worktree: `node scripts/laptop-queue/service.mjs --once --dry-run`: the "order: fix <k>, ..." line;
  `LQ_WORKER=desktop` dry run shows the 15 min skip lines and the CPU mode in the gate reason.
- Tier: queue scripts = CI `check` (`affected-e2e` passes at once as docs / unit only; run-e2e.mjs is CORE, so this PR's
  own affected run picks the CORE suites: let it run). Live after release: the next `fix` PR request goes first
  ("order:" line); a push to a PR with a running request logs "stopped, new head"; the next train preempt logs "keeps
  K finished suite(s)".

## Size and PRs
~150 lib, ~175 service, ~3 request, ~3 run-e2e, ~4 ps1, ~330 tests, ~40 docs = ~705 changed lines, plus ~250 lines of
job docs: about 950, one PR. If the build passes ~1.5k, split at the slice line (Michael's choice goes first): PR 1 =
A + B (fixes first, keep place, stop the old run), PR 2 = C + D + E.

## Risks
- The fix tier has no wait bound: a flood of `fix` PRs could hold features back; leads label only real fixes (A13).
- A `place` push or `kept` push that loses its race leaves the request as it was (arrival by id, a full rerun).
- Stopping a run on an old head loses its result; the new head reruns the overlapping suites anyway.
- Kept suites at `E2E_JOBS=1` only work for heads that carry the new run-e2e line (A10).
- PR carry adds at most 20 gh status reads per new PR head with a docs-only tail, once per head per process.
