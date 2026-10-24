# Laptop queue: release hold, desktop failures rechecked on the laptop, faster release poll
kind: patch

### Changed
- Laptop queue: for up to 10 min after an open train's laptop-e2e success (while train-ready PRs not in it have a green or running check) no new request is claimed, aged alone requests included, so the next train is not preempting a fresh alone run; train reruns still start (`LQ_RELEASE_HOLD_MIN`).
- Laptop queue: a desktop PR run whose suites fail posts pending "desktop FAIL <suites> (cpu N%), laptop rerun queued" (plus "; desktop cpu>90%" when its median CPU was over 90) and queues a laptop-only rerun of the failed suites; the laptop's verdict is final.
- Auto train: the fast poll runs every 30 s (was 60) once the train's laptop-e2e pending status is older than its expected wall (the laptop's "expect ~N s", else 10 min), so a release follows the laptop verdict within a minute.
- Laptop queue: the desktop CPU gates leave out processes at BelowNormal or Idle priority (a background Blender bake no longer holds the desktop slots); the wait reason shows the gated and the total load.
- Laptop queue: a superseded laptop rerun closes the desktop's "desktop FAIL ..., laptop rerun queued" pending status.
- Merge train: `git fetch` takes only the branches each step reads and retries up to 5 times when another worktree's fetch holds a ref lock (also auto-train's self-update).
