# Laptop queue: overlapping trains, alone preemption
kind: patch
- Test tooling (laptop queue, overlap plan slice 3): pending trains run lowest number first, and a lower train's rerun
  goes before a higher pending train; the desktop takes a second, different train while the laptop runs one; auto-train's
  build marker holds back only trains at or above the one being built; a running train whose head is no longer an open
  train PR head (closed, voided or rebuilt; two checks a minute apart) is killed, posts laptop-e2e error "train closed"
  and releases its claim. Inert while no stacked trains exist.
- A pending train now cuts an alone run whose steps started under 10 min ago; it is queued again at the head of the
  alone queue (train 64 went to the desktop behind a 4-min-old guard-cap run).
