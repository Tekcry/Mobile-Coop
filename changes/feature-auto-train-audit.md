# Auto-train audit fixes
kind: patch
- Auto-train queues one laptop rerun of the failed suites when the desktop worker fails a train
  (`laptop-e2e` "desktop: ...; FAIL: a,b"): `request.mjs --train-rerun`, set `train<n>-rerun`, state `laptop-rerun`,
  one request per train head (recorded in the status JSON); a pass of the rerun (`laptop-e2e/train<n>-rerun` success
  with CI green) releases through the normal release path, also on master's request.mjs; no verdict 60 min after the
  request (`AUTO_TRAIN_RERUN_STALE_MIN`) is state `rerun-stale`, and 6 failed requests per head `rerun-request-failed`
  (audit 2026-10-24, checker FIX).
- Auto-train writes the build marker `C:/NightShift/scratch/auto-train-building.json` (`{ train, version, pid, at }`)
  just before `merge-train build` and deletes it when the build ends, errors included (audit 2026-10-24).
- A train member left out on a conflict loses its `train-ready` label (no more repeat empty builds); the comment tells
  the lead to re-add the label after fixing the conflict (audit 2026-10-24).
- Auto-train holds a build up to 3 min (`AUTO_TRAIN_CHECK_WAIT_MIN`, per head, state `holding`) while a `train-ready`
  PR's `check` is still running, and re-reads the candidates right before `merge-train build` (audit 2: PR #299 missed
  train 47 by 43 s).
