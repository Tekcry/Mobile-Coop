# laptop-queue-9: plan
Owner: Test Runner. Status: current.

Lead: Night Shift | Test Runner. Planner: Opus 5.5, master 99fbd37fd. Brief: `docs/laptop-queue-9/BRIEF.md`.
All file:line pointers are origin/master 99fbd37fd. #507 has since reached master (b80d00d8d, train 121): its hunks
(watchdog :226-227 and :600 in place, auto-train.md +4 after :176, autoTrain.test +10 at the end, RULES "Machines")
shift none of the code pointers below. S1 starts with `git merge origin/master`. Docs are pointed at by section name.

## Claims
```claims
files:
  - scripts/auto-train.mjs
  - scripts/train-ready.mjs
  - scripts/merge-train.mjs
  - scripts/watchdog.mjs
  - tests/autoTrain.test.ts
  - tests/trainReady.test.ts
  - tests/mergeTrain.test.ts
  - tests/watchdog.test.ts
  - docs/systems/auto-train.md
  - docs/systems/watchdog.md
  - docs/RULES.md
  - docs/laptop-queue-9/*
  - changes/feature-laptop-queue-9.md
maps: none
protocol: none
save: none
```

## Merging with #507 (on master), #552 (laptop-queue-8b) and laptop-queue-10
claims-check (plan check, 2026-10-26): one overlap, `docs/RULES.md` with feature/laptop-queue-10; #552 also edits
RULES "Machines" (:169-186). Both stay in "Machines"; ours is :134-135 only: no shared hunk. Neither touches any other
file claimed here. The table below is #507's hunks, now on master (keep at least 8 untouched lines from them):
| File | laptop-queue-8 / #507 hunks | This job's hunks (only here) |
| --- | --- | --- |
| `scripts/watchdog.mjs` | :226-227 (`docsOnlyFiles` = `lq.docsOnlyFiles`), :600 (`--no-renames`) | :18 (new import line), :192-203 (`normalizePr` statuses), :236-253 (`labelReady`), :428-457 (`laptopAlerts`), :618-631 (gather lq block, after `logText`). Never edit :219-235 or :590-610 |
| `tests/autoTrain.test.ts` | appends one `it` at the end (:806-816) | one new line inside the import list (after :9) and new describes inserted before `describe('auto-train: decision'` (:231). Never append at the end of the file |
| `docs/systems/auto-train.md` | 4 lines after :176 ("What the laptop queue service provides") | the sections named in S4 only. Never edit "What the laptop queue service provides" (master :167-190) |
| `docs/RULES.md` | :164-185 ("Machines") | :134-135 only ("Getting to master", Auto-train bullet), line-neutral (the 318-line budget is full) |
Not shared: `scripts/laptop-queue/**`, `tests/laptop-queue.test.ts`, `docs/systems/testing-tools.md`, `scripts/run-e2e.mjs`
(theirs); `scripts/auto-train.mjs`, `scripts/merge-train.mjs`, `scripts/train-ready.mjs`, the other tests and
`docs/systems/watchdog.md` (ours). At 14:40 #507 rides open train 119 (#536), which carries the same watchdog,
autoTrain.test, auto-train.md (+4 after :176) and RULES "Machines" hunks: once it releases, every pointer in this PLAN
still holds (no shift above those lines). Other branches touching these files (feature/doc-polish*,
feature/player-batch-25*) have no open PR and are 26-30 h old: not live. The lead runs `git merge-tree --write-tree origin/feature/laptop-queue-8 HEAD` before
the PR opens; it must print no conflict.

## Env knobs (all in `scripts/auto-train.mjs`, read with `envMin` :803)
| Knob | Default | Off / old behaviour | Fix |
| --- | --- | --- | --- |
| `AUTO_TRAIN_GH_RETRY_S` | 5 | 0 = no retry | F12 |
| `AUTO_TRAIN_UNLABELLED` | 1 | 0 = labelled PRs only (today) | F16 |
| `AUTO_TRAIN_DEPLOY_WAIT_MIN` | 0 (passed as `MERGE_TRAIN_DEPLOY_WAIT_MIN`) | 20 = the old blocking wait | F18 |
| `AUTO_TRAIN_DEPLOY_REPAIR_MIN` | 20 | 0 = never repair (watch only) | F18 |
| `AUTO_TRAIN_REREAD` | 1 | 0 = one read before the build (today) | F23 |
| `--min-interval` (task `-TickArgs`) | 60 | 0 = pacing off | F19 |

## Slices
Order: S1 and S3 in parallel (different files), then S2 on S1's branch (both edit `scripts/auto-train.mjs`), then S4.
Worktrees: S1, S2 on `feature/laptop-queue-9`; S3 on `feature/laptop-queue-9-f20` (C:/NightShift/Mobile-Coop-laptop-queue-9-f20,
merged by the lead before S2 starts, since S2 also edits `scripts/watchdog.mjs`). One PR to master at the end.

**S1 auto-train tick fixes: F12, F18, F19 (Opus).**
F12 retry:
- New pure exports in `scripts/auto-train.mjs` (next to `laptopMissing`, after :306): `ghRetryable(r, ms)` (BRIEF A3)
  -> false when `r.status === 0`, on a timeout (`r.error?.code === 'ETIMEDOUT'` or `r.signal`: `exec` :822 waits
  120 s), when the first try took `ms` > 30 000, and for `/HTTP 4\d\d/` unless `HTTP 499`; true for `HTTP 5\d\d`,
  `HTTP 499` and any other non-zero exit. `exec` keeps `error` / `signal` on its result for this.
  `withRetry(once, { waitMs, wait, now, budget, log })` -> runs `once()`, timing it; if `ghRetryable` and `waitMs > 0`
  and `budget.left > 0` (one per tick, reset in `step`), decrements it, logs "retrying in 5 s" and runs it once more.
- I/O: `execRetry(cmd)` = `withRetry(() => exec(cmd), { waitMs: GH_RETRY_S * 1000, wait: sleepSync, budget })`
  (sleepSync as in `scripts/fetch-retry.mjs` :24, Atomics.wait). `read()` :859 uses `execRetry`; `act()` :867 calls a new `readOnce()`
  (exec without retry); `api()` :891, `apiRaw()` :896, `laptopQueue()` :1042 use `execRetry`.
F12 nothing new:
- `scripts/merge-train.mjs` `build` :1196, the `make()` catch :1268-1272 (the throw is `versionCommit` :875): it returns
  `buildStopCode(e.message)`, new pure export: 6 when `/nothing new to release/` matches, else 1. The dry-run STOP :870
  stays exit 1. Header exit list :61-67 gains "6 build: nothing new to release
  (nothing pushed)".
- `scripts/auto-train.mjs` `build` :1161: `r.code === 6 && rebuildOf` -> `state: 'failed'` (reason "nothing new to
  release"), so the rebuild path :1276 records it through `failed()` :1274 / `rebuildFailed` (BRIEF A1; an `idle`
  there would drop the open train). `r.code === 6`, new train -> `{ ...base, state: 'idle', reason: 'train <n>: nothing new
  to release (every member fragment is already in CHANGELOG.md): <branches>', nothingNew: { heads, master } }`
  (`heads` = sorted `<branch>@<head>` of the members, `master` = `git ls-remote` sha), no left-out comments. New pure
  export `nothingNewSkip(prev, cands, master)` -> true when `prev.nothingNew` has the same heads and master; `noTrain`
  :1196 checks it after the re-read and returns `idle` with the old reason (no build); `safeStep` :1356 carries
  `nothingNew` on error ticks like `checkWait`.
F18 deploy:
- `step` :1258: `mergeTrain(releaseArgs(t), { MERGE_TRAIN_DEPLOY_WAIT_MIN: String(DEPLOY_WAIT) })`. On exit 0 the
  returned status gets `deployWatch: { version: t.version, at: <ISO>, repaired: null }`.
- New pure export `deployPlan(watch, { now, served, repairMin })` -> `{ action, reason }`: no watch -> `none`;
  `served === watch.version` -> `ok` (drop the watch); `served` newer (cmpVersion > 0, import from merge-train) ->
  `ok`; age < repairMin -> `wait`; not repaired and repairMin > 0 -> `repair`; repaired and now - repaired >=
  repairMin -> `give-up` (drop the watch; reason names the watchdog's `pages-behind`); else `wait`.
- New I/O `deployStep(prev)` called at the top of `step` :1226 for every tick: reads `prev.deployWatch`, fetches
  `<AUTO_TRAIN_PAGES_URL or pagesRoot('Tekcry/Mobile-Coop')>preview/version.json?t=<now>` (fetch, 15 s timeout, failure
  = served null), `parsePreviewVersion` (merge-train :520); `repair` -> `mergeTrain(['repair'], { MERGE_TRAIN_DEPLOY_WAIT_MIN: '0' })`
  under the tick lock, logged "PREVIEW STALE 20 min after <version>: merge-train repair (exit k)". Returns the watch to
  carry (`carryDeployWatch(prev, status)`, like `carryLastDrop` :670; a new release replaces it). `--dry-run` prints.
- `merge-train repair` exists (:1059): it reads master's version, finds its merge, fetches `/preview/version.json` and
  re-dispatches the deploy only when stale, plus tag / dev / member PRs. Checked: it needs no change.
F19 pacing:
- `laptopQueueState` :325 (BRIEF A8): busy only on an open (`done === false`), non-stale claim with
  `c.worker === 'laptop'` whose id does not contain `-laptop-queue-spare-`; the unclaimed-request `queued` branch is
  removed (`requestIdTime` stays for other callers). Doc comment :319-324 says so.
- `scripts/auto-train-task.ps1` :6 usage example already shows `-TickArgs "--min-interval 60"`; no code change. Ops
  step (S5) re-registers the task.
- Files: `scripts/auto-train.mjs`, `scripts/merge-train.mjs`, `tests/autoTrain.test.ts`, `tests/mergeTrain.test.ts`.
  Est. lines: code 150, tests 180.
- Checks: `npx vitest run tests/autoTrain.test.ts tests/mergeTrain.test.ts`, `npm run typecheck:fast`,
  `node scripts/auto-train.mjs tick --dry-run --once` (reads only).
- Vitest (`tests/autoTrain.test.ts`, inserted before :231):
  - describe `auto-train: gh retry (F12, HTTP 499 2026-10-26 13:50)`: `ghRetryable({status:1, err:'HTTP 499'})` true;
    `HTTP 502` true; `{status:1}` (no HTTP text) true; `{status:null, signal:'SIGTERM'}` false; `ETIMEDOUT` false;
    `HTTP 502` after 31 s false; `HTTP 404` false; `HTTP 422` false; `{status:0}` false. `withRetry`: first call
    `{status:1, err:'HTTP 499'}`, second `{status:0, out:'x'}` -> out 'x', wait called once with 5000; first `HTTP 404`
    -> one call, no wait; `waitMs: 0` -> one call; a second failing call with the budget spent -> no retry.
  - `build` exit 6: new train -> `idle` + `nothingNew`; with `rebuildOf` -> `failed` (pure helper `buildExitState`).
  - describe `auto-train: nothing new is idle (F12, train 102)`: `nothingNewSkip` true for the same heads (any order)
    and master; false when a head moved, a member was added or master moved; false with no `prev.nothingNew`.
  - describe `auto-train: release without the deploy wait (F18)`: `deployPlan` no watch -> none; served = version ->
    ok; served 4.120.0 with watch 4.119.0 -> ok; age 5 min -> wait; age 21 min, not repaired -> repair; repaired 10 min
    ago -> wait; repaired 21 min ago -> give-up; repairMin 0 at 60 min -> wait. `carryDeployWatch`: carried on a tick
    without one; replaced by a new release's watch; dropped after ok / give-up (status `deployWatch: null`).
  - describe `auto-train: pacing counts laptop claims only (F19, 2026-10-25 15:35)`: an open desktop claim ->
    `idle`; an open laptop claim -> `busy`; a done laptop claim -> `idle`; a stale open laptop claim -> `idle`; an open
    laptop claim on `20261026T140000-laptop-queue-spare-ab12cd34` -> `idle`; an unclaimed fresh request -> `idle`; the
    pacing line with only a desktop claim and the last release 10 min ago -> null (build).
- Vitest (`tests/mergeTrain.test.ts`, new describe after :343, `merge-train build ends at the version-commit push`):
  describe `merge-train build: nothing new exits 6 (F12)`: `buildStopCode('nothing new to release: every fragment
  entry is already in CHANGELOG.md')` 6; `buildStopCode('nothing to assemble: ...')` 1.
- Done looks like: an error-free dry-run tick; the log of a release tick shows `PREVIEW: UNKNOWN - deploy dispatched,
  no wait` and the next build in the same tick.

**S2 candidates: F16 + F23 (Opus, after S1 and S3 merged).**
F16 one train-ready rule:
- New `scripts/train-ready.mjs` (pure, no imports from auto-train or watchdog): `LABEL`, `CHECKER_CONTEXT`,
  `AFFECTED_CONTEXT`, `NO_AFFECTED_LABEL`, `isTrain`, `statusesFromRollup(rollup)` (newest StatusContext per context,
  error -> failure, expected -> pending; the loop now at watchdog :196-203), `trainReady(pr, { requireAffected })` (the
  body of watchdog `labelReady` :237-253, unchanged), `heldOff({ unlabeledAt, headPushedAt })` -> true when the label
  was removed at or after the head was pushed (unknown push time -> true). Header comment: "the rule's owner is
  docs/RULES.md Getting to master; watchdog and auto-train both apply it from here".
- `scripts/watchdog.mjs`: :18 `import * as tr from './train-ready.mjs'`; the constants :21-24 stay exported, now
  as `= tr.LABEL` etc. (same names, so its tests and callers do not change); `normalizePr` :196-203 uses
  `tr.statusesFromRollup`; `labelReady` :237-253 becomes `export const labelReady = tr.trainReady;`.
- `scripts/auto-train.mjs` `candidates` :995: one `gh pr list --state open --base master --limit 100 --json
  number,headRefName,headRefOid,title,isDraft,mergeable,labels,statusCheckRollup` (replaces the `--label` list).
  Labelled: as today (green `check` -> candidate, else `waiting`). Unlabelled, when `AUTO_TRAIN_UNLABELLED` is on:
  the flat PR `{ branch, draft, mergeable, labels, check: ciState(rollup), statuses: statusesFromRollup(rollup) }`;
  `trainReady(pr)` ready -> read `unlabeledAt(pr)` (issue events `unlabeled` + `train-ready`, last one, like
  `labeledAt` :1109) and `headPushedAt(head)` (min `created_at` of `commits/<head>/check-suites`); not `heldOff` ->
  re-read `checker` / `affected-e2e` from `commits/<headRefOid>/status` (BRIEF A4: the rollup reads `commits(last:1)`,
  not always the head); new pure export `headStatusAgrees(pr, combined)` -> true only when `combined.sha ===
  headRefOid` and `trainReady` still passes on those statuses; then candidate with `unlabelled: true`, logged "#n <branch>: train-ready by rule on <head8> (no label)". New pure export
  `splitCandidates(prs, { unlabelled, heldOff })` -> `{ cands, waiting, ruleReady }` so the selection is unit tested.
- `labelTaken(members)` in `build` :1161, right before `mergeTrain(['build', ...])`: `act(['gh', 'pr', 'edit', n,
  '--add-label', LABEL])` for each member with `unlabelled: true`; a member whose add fails, or under `--dry-run` is
  only printed, is dropped from `p.branches` with a log line (BRIEF A5); no member left -> idle, no build. If it dropped
  any, `plan()` runs once more on the rest, so the version and title match the members merge-train gets.
F23 re-read at build start:
- Today: `noTrain` re-reads at :1218, then `nextN()` :1223 (ls-remote + a 100-PR list) and `plan()` :1162 (fragments,
  `contains` compare calls, package.json) run before `mergeTrain` :1166: a PR that turns green in those seconds misses
  the train (#521, train 119, 27 s).
- New exported async `freshPlan({ reread, plan, passes })`: `c1 = reread(); p = plan(c1); c2 = reread();` if
  `sameMembers(c1, c2)` (pure: same branch@head set) return `{ cands: c1, p }`; else `p = plan(c2)` and return it
  (at most `passes` = 2 plans; with `AUTO_TRAIN_REREAD=0`: one plan of the given list). `build` for a new train (not
  `rebuildOf`) takes `{ reread }` and calls `freshPlan` after `nextN()`; `noTrain` :1223 becomes
  `build(nextN(), fresh, { reread: () => pick().cands })`. Logged "re-read at build start: +<branches>".
- Waiting widened: an unlabelled PR whose `trainReady` fails only on `check` with `checkWaitReason` non-null goes into
  `waiting`, so `holdForChecks` :258 holds the build up to 3 min for it like a labelled one.
- Files: `scripts/train-ready.mjs` (new), `scripts/auto-train.mjs`, `scripts/watchdog.mjs`, `tests/trainReady.test.ts`
  (new), `tests/autoTrain.test.ts`, `tests/watchdog.test.ts` (no edits expected: `labelReady` keeps its tests). Est.
  lines: code 230, tests 230.
- Checks: `npx vitest run tests/trainReady.test.ts tests/autoTrain.test.ts tests/watchdog.test.ts`,
  `npm run typecheck:fast`, `node scripts/auto-train.mjs tick --dry-run --once --preview-next` (lists the unlabelled
  candidates it would take and the `--add-label` it would run).
- Vitest:
  - `tests/trainReady.test.ts` describe `train-ready: one rule for watchdog and auto-train (F16)`: `trainReady` ready
    on check + checker + affected-e2e success; `no-affected-e2e` label with affected missing -> ready ("waived");
    affected missing without the label -> not ready, `affectedMissing`; checker failure / pending -> not ready; draft,
    CONFLICTING, `train/7` -> not ready; `watchdog.labelReady === trainReady`. `statusesFromRollup`: two `checker`
    statuses -> the newer wins; ERROR -> failure; EXPECTED -> pending; CheckRun items ignored. `heldOff`: unlabelled
    at 12:05, head pushed 12:00 -> true; pushed 12:10 -> false; never unlabelled -> false; push time unknown -> true.
  - `tests/autoTrain.test.ts` describe `auto-train: unlabelled train-ready PRs (F16, #460 missed train 103)`:
    `splitCandidates` with a labelled green PR (candidate), a labelled PR with check in progress (waiting), an
    unlabelled PR with all three green (candidate, `unlabelled: true`), the same but `heldOff` (not a candidate), an
    unlabelled PR with checker pending (nothing), an unlabelled PR with checker + affected green and check in progress
    (waiting, F23), a draft and a `train/9` PR (nothing); `unlabelled: false` -> labelled only. `headStatusAgrees`:
    combined sha = head and checker success -> true; sha differs -> false; checker pending on the head while the rollup
    says success -> false. `labelTaken` with one add failing -> that member left out; `dry: true` -> all unlabelled
    members left out.
  - `tests/autoTrain.test.ts` describe `auto-train: re-read at build start (F23, #521 missed train 119 by 27 s)`:
    `freshPlan` with a reread returning [A] then [A, B] -> plan called twice, result members [A, B]; [A] then [A] ->
    plan once; [A@1] then [A@2] (head moved) -> re-planned; `passes: 1` -> one plan of the first read; `sameMembers`
    order-insensitive.
- Done looks like: a dry-run tick with an unlabelled ready PR prints "train-ready by rule", the label add it would run
  and "left out (dry run: label not added)"; the watchdog tests pass unchanged.

**S3 watchdog request age: F20 (Sonnet, strict brief; Opus checker).**
- `laptopAlerts` :428: `q.addedAt` (`{ [id]: ms }`, optional); :450 age = `mins(q.now - (q.addedAt?.[r.id] ?? lq.idTime(r.id)))`.
- New pure export `requestAddTimes(logText)`: lines of `git log --since=7.days --diff-filter=A --no-renames
  --format=@%ct --name-only origin/laptop-queue -- requests/` -> `{ [id]: ms }`, the newest add per id (log order is
  newest first: the first seen wins).
- `gather` lq block :607-621, edits only at :618-621 (after `logText`, never :590-610): one `git log` call per run as above, `addedAt` added to
  the returned object; `checkLaptop` :714 passes it through. A failed log = `{}` (falls back to idTime).
- Files: `scripts/watchdog.mjs`, `tests/watchdog.test.ts`. Est. lines: code 30, tests 50.
- Checks: `npx vitest run tests/watchdog.test.ts`, `npm run typecheck:fast`, `node scripts/watchdog.mjs tick --dry-run
  --checks laptop`.
- Vitest (`tests/watchdog.test.ts`, inside describe `watchdog: laptop queue` :354, new `it` before its closing line):
  `it('ages a re-filed request by the commit that added it, not its id (F20)')`: request `20261024T000011-x`
  unclaimed, `addedAt` 10 min before NOW -> no `lq-request-old`; without `addedAt` -> `lq-request-old` (id reads as
  midnight). `requestAddTimes('@1729760000\nrequests/a.json\n\n@1729750000\nrequests/a.json\nrequests/b.json\n')` ->
  a = 1729760000000, b = 1729750000000.
- Done looks like: no `lq-request-old` alert for a re-filed request queued under 60 min.

**S4 docs and fragment (Sonnet).** After S2.
- `docs/systems/auto-train.md` (one home per rule; it links the train-ready rule to RULES, never restates it):
  candidates paragraph in "State machine (one tick)" (labelled PRs, or unlabelled PRs that meet `docs/RULES.md` "Getting to master" on their
  head and have not lost the label since that head; auto-train labels them when it builds; `AUTO_TRAIN_UNLABELLED`);
  the re-read at build start (`AUTO_TRAIN_REREAD`) in the "Candidates, paced to go" row; the "nothing new" row (state
  idle, `nothingNew`, merge-train exit 6); the release row (no deploy wait, `deployWatch`, repair at 20 min,
  `AUTO_TRAIN_DEPLOY_WAIT_MIN` / `AUTO_TRAIN_DEPLOY_REPAIR_MIN`); the gh retry under "Running it"
  (`AUTO_TRAIN_GH_RETRY_S`, read-only calls, no retry on a timeout); the status keys list (`nothingNew`,
  `deployWatch`); the "The pacing laptop queue" bullet (open non-spare laptop claims only; unclaimed requests no longer
  count); "Rules it keeps" (it also adds `train-ready` to an unlabelled member it builds). Never "What the laptop
  queue service provides".
- `docs/systems/watchdog.md`: "The label convention" says the code is `scripts/train-ready.mjs` (shared with
  auto-train); the laptop row's `lq-request-old` says "unclaimed 60+ min since the commit that added it".
- `docs/RULES.md` :134-135: "builds `train/<n>` from labelled PRs with a green check" -> "from train-ready PRs (labelled
  with a green check, or meeting the rule above on their head)", same line count.
- `scripts/merge-train.mjs` header (S1 does it), `scripts/auto-train.mjs` header :22-26 (S2 does it).
- `changes/feature-laptop-queue-9.md`: `kind: patch`, one entry per fix.
- Checks: `npm run lint` doc-lint part (`node scripts/doc-lint.mjs`): no new ERROR, no `owners` WARN for train-ready.
- Est. lines: docs 60 (not counted toward the cap).

**S5 ops after the release (the orchestrator, desktop).** Re-register the task with pacing back on:
`powershell -NoProfile -ExecutionPolicy Bypass -File C:\NightShift\Mobile-Coop-autotrain\scripts\auto-train-task.ps1
-RepoDir C:\NightShift\Mobile-Coop-autotrain -TickArgs "--min-interval 60"` (value: BRIEF A9), then FIXES rows F12,
F16, F18, F19, F20, F23 to done with the version. Not before the release: the old `laptopQueueState` would hold trains on
desktop claims again.

## Size
| Slice | Builder | Code | Tests | Docs |
| --- | --- | --- | --- | --- |
| S1 F12 F18 F19 | Opus | 150 | 180 | - |
| S2 F16 F23 | Opus | 230 | 230 | - |
| S3 F20 | Sonnet | 30 | 50 | - |
| S4 docs | Sonnet | - | - | 60 |
| Total | | 410 | 460 | 60 |
~870 counted lines (930 with docs): one PR, under the ~1.5k cap. Test tier: queue / train / tool scripts (CI `check`;
`affected-e2e` passes at once). Checker: one fresh Opus checker for S1 + S2, one Opus checker for S3, Sonnet for S4.

## Flags (dark until accepted)
None: tooling only; every fix has an env off switch (table above).

## Walk items
None (no player-facing change).

## Risks and open questions
- F16 re-takes a PR someone meant to hold: only when its label was never removed on this head. A lead who wants a hold
  on a fully green head removes `train-ready` (or never adds it and turns the head draft). Mitigation: `heldOff`, docs.
- F16 extra gh calls: three per unlabelled ruled-ready PR per tick (events, check-suites, head status), usually 0-2 PRs.
- F18 a repair during an open train: `repair` acts on master's newest version only, never on the open train; it runs
  under the tick lock (`AUTO_TRAIN_LOCK_TEXT`), so no hand merge-train overlaps.
- F12 retry blocks the tick up to 5 s per failed read; the lock heartbeat is a 60-s interval, far under the 30-min stale.
- F23 still has a gap: the seconds between the last re-read and merge-train's own fetch. merge-train builds the newest
  head of each named branch, so only a brand-new candidate in that window waits for the next train.
- laptop-queue-8 lands first or second: either order merges clean if the hunk table holds; the lead checks with
  `git merge-tree` before the PR and again before labelling.
