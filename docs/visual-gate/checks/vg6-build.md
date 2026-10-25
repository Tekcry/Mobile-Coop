# VG6 build report - train wiring (Opus builder, 2026-10-25)
Branch `feature/visual-gate-train`, cut from origin/master bd8920c2 (master had not moved at start). Brief:
`docs/visual-gate/briefs/VG6.md` on origin/feature/visual-gate @ 5c8e38c2. Done; dry run left to the lead (below).

## Built
`scripts/laptop-queue/visual.mjs` (new, pure: imports only `capTail` from `./lib.mjs`; the contract typedefs verbatim
at the top): `VISUAL_CONTEXT`, `VISUAL_SUITE`, `VISUAL_TIMEOUT_S` 300, `VISUAL_SH_TIMEOUT_MS` 360_000, `BLOCK_CAP` 8000,
`THUMB_BASE`, `visualPlan`, `visualEnv`, `extractBlock`, `parseSummary`, `visualVerdict`, `thumbUrl`, `visualComment`,
all as the brief specifies (first-match orders, exact descriptions, 140-char cut with `...` at 137).

`scripts/laptop-queue/service.mjs`, the 6 changes, final line numbers on this branch (master base bd8920c2):
1. Header :64-67, 4 comment lines right after the "Orchestrator audit 2026-10-24 (train 64 ...)" paragraph, before the
   first `import`.
2. Import :73, one line right after the `./lib.mjs` import:
   `import { visualPlan, visualEnv, visualVerdict, visualComment, VISUAL_CONTEXT, VISUAL_SUITE, VISUAL_SH_TIMEOUT_MS } from './visual.mjs';`
3. `e2e` :585-587: signature `async function e2e(port, suites, jobs, logFile, ctl, { env: extra = {}, timeoutMs } = {})`;
   env ends `E2E_SUITE_TIMEOUT: '900', ...extra }`; the `sh` options end `ctl, ...(timeoutMs ? { timeoutMs } : {}) }`.
   No call site changed.
4. `runVisual` :778-806 (doc comment + 25 lines), right after `runTrain`'s closing brace, before `runRequest`.
5. `runTrain` :766-767, right after `state.trains[train.sha] = { result: ok ? ...` and before `} finally {`:
   `saveState();` and the one-line `try { await runVisual(train, ports, locks, ctls[ports[0]], runDir, prNumber, ok); }
   catch (e) { log(...); postStatus(train.sha, 'error', VISUAL_CONTEXT, 'service error, see log'); }`.
6. `planTrain` :999, one `log` line after the two `postStatus` lines (desktop: the skipped line).
Re-apply on a moved master: the hunks are independent; anchor each on the text named above, not the numbers.

Docs: `docs/laptop-queue/visual-gate.md` (new operator note, ~40 lines), `docs/systems/auto-train.md` (one bullet at
the end of "What the laptop queue service provides"), `changes/feature-visual-gate-train.md` (kind patch, 2 bullets).

## Deviations (all small, logged here, no ask)
- D1 Commits: the brief's worktree mode says the lead commits; the lead's prompt told this builder to commit and push
  WIP per step (usage-cap resume). Followed the prompt: 4 commits on origin `feature/visual-gate-train`.
- D2 `runVisual` reads only this run's part of `visual.log` (split on `$ node scripts/run-e2e.mjs `, as `e2e` already
  does for its own parse), so a log appended by an earlier try on the same head (same `runs/train-<n>-<sha8>/`) cannot
  lend an old block or `KILLED:` line. One extra comment line in the function.
- D3 The accept line in the PR comment is wrapped in backticks with the real sha filled in
  (`` `node scripts/visual-gate/baseline.mjs accept --sha <train sha> --by <name> --why <text> [--only k,k]` (A9) ``):
  bare `<name>` / `<text>` would render as HTML tags and vanish on GitHub.
- D4 Flag count wording: `1 flag: ...` for one, `<n> flags: ...` otherwise; with an empty `top` the `: ...` part is
  omitted (`3 flags vs 4.97.0`).
- D5 `planTrain` has no train number, so its dry-run env shows `VG_TRAIN "<n>"`, `VG_BRANCH "train/<n>"` (the sha is
  the real one when a train is pending, else `<train sha>`). Keeps change 6 to one line.
- D6 auto-train.md line placed at the end of "What the laptop queue service provides" (the section that lists what
  auto-train reads from the queue), one of the two places the brief allows.
- D7 Service dry run NOT run: the lead's prompt forbids running the laptop-queue service on this machine. The lead runs
  it (below).

## Tests (desktop CPU 76-80 % during runs)
- `npx vitest run tests/laptopQueueVisual.test.ts --maxWorkers=2`: 1 file, **30 passed** (visualPlan 3, visualEnv 1,
  extractBlock / parseSummary 6, visualVerdict 13, thumbUrl 1, visualComment 4, service.mjs static guard 3; every
  case the brief lists).
- `npx vitest run tests/laptop-queue.test.ts --maxWorkers=2`: **94 passed** (unchanged file).
- `npx vitest run tests/changesFragments.test.ts --maxWorkers=2`: **1 passed** (the new fragment parses).
- `npm run typecheck:fast`: clean (exit 0). `npx eslint tests/laptopQueueVisual.test.ts`: clean.
- `node --check` on service.mjs and visual.mjs: ok.
- `git diff --stat origin/master -- src`: empty. `git diff --stat origin/master`: only the 7 files of the brief
  (changes fragment, visual-gate.md, auto-train.md, service.mjs +41/-3, visual.mjs, the test, this report).
- No e2e, no GPU, no build, no `npm run check`, no full vitest.

## For the lead
- Run the dry run where `gh` is logged in and paste the line into the checker brief:
  `LQ_STATE=<scratch dir> LQ_TASK_GUARD_MIN=0 node scripts/laptop-queue/service.mjs --dry-run` (from this worktree);
  expect after the two `dry-run: gh api .../statuses/...` lines:
  `dry-run: then e2e-visual on 4189 when laptop-e2e passes and the head has scripts/e2e-visual.mjs (env {"E2E_SUITE_TIMEOUT":"300","VG_RECORD":"1","VG_TRAIN":"<n>","VG_SHA":"<train sha>","VG_BRANCH":"train/<n>"}), status visual-gate`.
  Note `listRequests` does a `git fetch` of `origin/laptop-queue` in the worktree (read-only for the branch).
- Then: fresh Opus checker (service code), PR `feature/visual-gate-train` -> master, label `train-ready`; CI `check`
  only. Inert until a train head carries `scripts/e2e-visual.mjs`, so it merges before or after the visual-gate PR.
- Nothing to send to the laptop for this slice: the services self-update from master (`selfUpdate` restarts when
  `scripts/laptop-queue` changed). Tell Test Runner in the next message; first live run = the first green train after
  the visual-gate PR merges (check its `visual-gate` status and `visual.log`).
- Coordinate with the laptop-queue job: it edits `service.mjs` in parallel; the 6 hunks above are the re-apply list.

## Open items
- Dry run (D7). Polish only: `planTrain` could take the train number to show a real `VG_TRAIN` (D5).
