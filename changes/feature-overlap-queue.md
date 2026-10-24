# Laptop queue: overlapping trains, alone preemption
kind: patch
- Test tooling (laptop queue, overlap plan slice 3): pending trains run lowest number first, and a lower train's rerun
  goes before a higher pending train; the desktop takes a second, different train while the laptop runs one; auto-train's
  build marker holds back only trains at or above the one being built; a running train whose head is no longer an open
  train PR head (closed, voided or rebuilt; two checks a minute apart) is killed, posts laptop-e2e error "train closed"
  and releases its claim. Inert while no stacked trains exist.
- A pending train now cuts an alone run whose steps started under 10 min ago; it is queued again at the head of the
  alone queue (train 64 went to the desktop behind a 4-min-old guard-cap run).
- Audit fixes (train 64 went to the desktop behind a 30-min alone run): the laptop pushes a heartbeat claim refresh
  every 5 min while it runs anything; a pr run past 80% of its expected wall is never preempted; no new alone claim
  while a green train-ready PR waits and no train PR is open (aged alone requests still start); an alone run yields
  between steps to a pending train and resumes after its finished steps. install-task.ps1 takes -DesktopCpu (80) and
  -DesktopBacklog (0) for the desktop worker, so a re-register keeps them.
