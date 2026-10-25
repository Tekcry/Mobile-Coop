# Laptop queue: dead-pid slot locks, watchdog allowlist, affected-e2e never stuck
kind: patch
- Slot locks: `scripts/heavy-lock.mjs` `parseLock` reads the laptop queue service's own line
  (`laptop-queue | <label> <sha> pid <n> | <iso>`, no host: this machine) as well as the heavy-lock line, so a slot lock
  left by a killed service is broken at the desktop gate (and by `heavy-lock.mjs take` / `check`) once its pid is dead.
  A lock with no pid is still never broken automatically (2026-10-25: pid 4484 held heavy.lock / heavy2.lock 10+ min).
- Task guard: "NightShift watchdog" is on the allowlist (`TASK_ALLOW` in `scripts/laptop-queue/lib.mjs`); its .vbs in
  `C:\NightShift\scratch` no longer gets it disabled.
- affected-e2e: a duplicate affected request hands affected-e2e over to the surviving affected request (pending "handed
  over to <id>") or posts success when it repeats a recent pass, and is never retired against another requester's run;
  a supersede on the same sha hands over instead of posting error; an affected request or laptop rerun withdrawn before
  it ran posts error "withdrawn by the requester (not run)"; a head whose affected-e2e is pending with no open, claimed
  or running affected request is requested again.
