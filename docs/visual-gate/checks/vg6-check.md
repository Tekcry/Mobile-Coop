# VG6 check - train wiring (fresh Opus checker, 2026-10-25)
Branch `feature/visual-gate-train` @ 58f2ac6f (5 commits on origin/master bd8920c2), worktree
`C:/NightShift/Mobile-Coop-visual-gate-train`. Spec: origin/feature/visual-gate `docs/visual-gate/briefs/VG6.md`,
BRIEF A1, A17-A23, PLAN section 6 (:145-162). Builder report `docs/visual-gate/checks/vg6-build.md`.

Verdict: PASS

## Must-fix
None.

## What was checked
1. service.mjs diff (+41/-3, 5 hunks: header + import share one) is exactly the 6 brief changes, nothing else moved:
   header :64-67 after the "Orchestrator audit 2026-10-24" paragraph; import :73; `e2e` options parameter :585-588 (env
   spread last, `timeoutMs` passed only when given, `sh` default 3600 s kept; `rerunFlakes`, `runTrain` and
   `runRequest` calls unchanged); `runTrain` :766-767 (`saveState()` + try / catch `runVisual`, inside the `try`,
   after `state.trains[...]`, before `} finally {`); `runVisual` :778-806 right after `runTrain`; `planTrain` :999 one
   `log` line. D2 (read only this run's part of visual.log) is a safe, justified extra.
2. Inert / kill switch: `visualPlan` returns `{ run: false, status: null }` for `!enabled` (`LQ_VISUAL !== '0'`),
   `!hasScript` (existsSync of `scripts/e2e-visual.mjs` in `SLOTS[ports[0]].dir`, which `prepare` left at the train sha)
   and `!trainOk`, in the brief's order; runVisual then returns before any release, status, run or comment. Only side
   effect left when inert: one extra `saveState()` (the `finally` saves again anyway).
3. Blocking / deadlock / locks / sha:
   - the `laptop-e2e` verdict, `state.trains` and the void-watch clear all happen before `runVisual`; auto-train reads
     no `visual-gate` (A1); the current head has a laptop-e2e success, so `pendingTrains`, the alone hold and the
     desktop gate no longer count it while the step runs.
   - released ports: `releaseLock` (own line only) + `freePort` + `locks[p] = null` (so the `finally` skips them) +
     `busy[p] = null`; the pass loop's cleanup is `if (busy[x] === run)`, so a PR request dispatched on 4192 meanwhile
     keeps its `busy` entry; `pick` needs both slots idle for a train, so no second train starts on a half-free laptop.
   - the visual run waits on no lock; `sh` is capped at 360 s with taskkill (124), run-e2e kills the suite at 300 s;
     any throw is caught and posts `visual-gate` error "service error, see log"; the `finally` still releases 4189,
     saves state and pushes the done claim. Worst-case delay: 4189 and the train's done claim ~6 min (brief allows).
   - `ctl` is `ctls[ports[0]]`, whose `why` can no longer be set (watch cleared after the last `voided` check).
   - every status / comment uses `train.sha` / the train PR; no status at all in `planTrain` (log line only).
4. visual.mjs: pure (imports only `capTail` from `./lib.mjs`); contract typedefs verbatim; all rules match the brief.
   run-e2e at jobs 1 streams the suite's stdout into the log (`stdio: 'inherit'`), and its kill line is
   `KILLED: e2e-visual ran past 300s` (run-e2e exits 1, not 124, so the line match is the real detector: covered).
   Mutation run: (a) dropped `!trainOk` from visualPlan's no-run guard -> "disabled, no script or a failed train"
   failed; (b) disabled the "clean block with a non-zero exit" rule -> its test failed. 2 failed / 28 passed; restored
   with `git checkout -- scripts/laptop-queue/visual.mjs` (status clean after).
5. `git diff bd8920c2 HEAD --stat -- src` empty. 7 files, all on the brief's list. Fragment
   `changes/feature-visual-gate-train.md` present (title, `kind: patch`, 2 bullets).
6. Dry run NOT run: not provably side-effect free. `--dry-run` still calls `listRequests` -> `git fetch -q origin` and
   `pendingTrains` -> `git fetch ... refs/heads/train/*`, which write remote-tracking refs (and take git ref locks) in
   the repo shared by every worktree. Instead the exact `planTrain` log expression was evaluated against visual.mjs in
   a scratch script:
   `dry-run: then e2e-visual on 4189 when laptop-e2e passes and the head has scripts/e2e-visual.mjs (env {"E2E_SUITE_TIMEOUT":"300","VG_RECORD":"1","VG_TRAIN":"<n>","VG_SHA":"<train sha>","VG_BRANCH":"train/<n>"}), status visual-gate`
   and the desktop variant `dry-run: visual-gate would post error "skipped: desktop lane (laptop GPU only)"`.
7. Tests (desktop CPU <= 90 % before each run): `tests/laptopQueueVisual.test.ts` 30/30; `tests/laptop-queue.test.ts`
   94/94; `tests/changesFragments.test.ts` 1/1; `npx tsc --noEmit -p .` exit 0; `npx eslint
   tests/laptopQueueVisual.test.ts` exit 0; `node --check` service.mjs and visual.mjs ok. No e2e, no GPU, no service.

## Polish (optional)
1. A service restart or crash during the ~3-6 min step leaves `visual-gate` `pending` on the head for good (the train
   is not rerun: laptop-e2e is already success) and the train claim open. Harmless to auto-train; worth one line in
   `docs/laptop-queue/visual-gate.md` ("a stuck pending = the service restarted mid-run, see visual.log") so the
   orchestrator's cron does not wait on it.
2. `visual.mjs` visualVerdict: a `flagged` summary with `flags + parity === 0` reads "0 flags"; could fall back to
   `top.length` or "flagged". VG5's contract should never emit it.
3. `service.mjs:999` `planTrain` prints the visual-gate line even with `LQ_VISUAL=0`; could append "(off: LQ_VISUAL=0)".
4. `docs/systems/auto-train.md:155` the new bullet is one long line (~150 chars); the file wraps at ~120.
