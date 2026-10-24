# Laptop queue: the visual-gate post-step
The picture gate (visual-gate job, `docs/visual-gate/` on its branch) runs on the laptop after every green train.
Code: `scripts/laptop-queue/service.mjs` `runVisual` (I/O), `scripts/laptop-queue/visual.mjs` (pure), tests
`tests/laptopQueueVisual.test.ts`.

## What runs and when
- Laptop worker only, in `runTrain` after the train's `laptop-e2e` verdict is posted, and only when that verdict is
  success (A19: a failed head is dropped and rebuilt, so it gets no `visual-gate` status) and the train head has
  `scripts/e2e-visual.mjs` (inert until the visual-gate PR is in master).
- The desktop lane posts `visual-gate` error "skipped: desktop lane (laptop GPU only)" instead (A20: baselines are keyed
  by the laptop renderer; GitHub has no skipped state, and error never reads as success).
- Slots: every train slot but the first (4192) is released and its port freed first, so it takes queue work again at
  once; `node scripts/run-e2e.mjs e2e-visual` then runs on the first slot (4189, or the one slot a TRAIN_SOLO train
  kept) at `E2E_JOBS=1`, `E2E_GPU=1`. The train's claim stays (heartbeat) and its done claim is pushed after the step.
- Env on top of the usual run: `E2E_SUITE_TIMEOUT=300`, `VG_RECORD=1`, `VG_TRAIN=<n>`, `VG_SHA=<sha>`,
  `VG_BRANCH=train/<n>`.
- Timeouts: the gate's own deadline 285 s (stops shots, verdict error), run-e2e's suite kill 300 s (`KILLED:` line),
  the service's shell cap 360 s (suite kill plus server start and teardown; exit 124).

## Statuses (context `visual-gate`, at most 140 chars)
- pending `running on 4189`.
- success `clean: 76 shots vs 4.97.0, 152 s` (`; 1 known`, `; 2 warn` when there are any; `vs no baseline` when none).
- failure `3 flags: <top keys> vs 4.97.0` (flags + parity misses; never blocks a release).
- error `error: <reason>` (the gate's own error: "no baseline for renderer <r>", "over budget: ..."), `over 300 s
  (killed), no result`, `no result (exit <code>)`, `unreadable result block`, `exit <code> with a clean block`,
  `service error, see log`, or the desktop skip above.
- A flagged run also comments on the train PR: the description, the suite's block (last 8000 chars), thumb links
  `https://github.com/Tekcry/Mobile-Coop/blob/visual-baselines/runs/<sha>/thumbs/<key, @ as %40>.webp` (now, and
  `<key>.base` for the baseline when pushed) and the accept command. An error lives in the status only.

## Operating it
- Kill switch: `LQ_VISUAL=0` in the service's env (restart it), nothing runs and nothing is posted.
- Log: `<LQ_STATE>/runs/train-<n>-<sha8>/visual.log` (default `C:/NightShift/scratch/laptop-queue/...`); every shot
  and thumb: `C:/NightShift/scratch/visual-gate/<sha>/` (kept 60 days, A11).
- "no baseline for renderer <r>": the laptop's GPU driver or Chrome changed the renderer string. The orchestrator
  accepts the newest recorded run on the new renderer: `node scripts/visual-gate/baseline.mjs accept --sha <run> --by
  orchestrator --why "renderer change"` (A9); the next train compares against it.
- A flag: the job that owns the change fixes it, or Michael / the orchestrator accepts it (A9).
- auto-train never reads `visual-gate` (A1): a flag or error never holds a release.
- Deploy: the services fast-forward to master when idle and restart themselves when `scripts/laptop-queue` changed
  (`selfUpdate`); restart `NightShift-laptop-queue` by hand only when its `LQ_FOLLOW` is not master. `--dry-run` prints
  the step after the shard preview.
