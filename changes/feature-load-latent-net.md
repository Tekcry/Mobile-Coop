# Load fixes: host-step hooks
kind: patch
- Tests: co-op waits that missed short host states under load now act on the host's own fixed sim step
  (e2e-net-lib `onHostStep` / `hostStepResult`: a hook on the loop's `fixedUpdate`, which the pump's headless steps
  also run). e2e-ctcourse snapshots station 3's camera reboot on the step its jam goes 1 -> 2; station 6's synced hack
  and station 5's roof plates have the client press its half and the host press its own on the step that first sees
  it; station 8's 2.5 s pause runs on the host clock (`waitHostSim`, host time logged); station 5 waits for the client
  upright on the roof before the same check. e2e-course's pair gate: the host presses its half on the step that first
  sees the client's stamp. No assert, limit or window changed.
