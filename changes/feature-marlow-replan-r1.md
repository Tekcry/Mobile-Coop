# Marlow Yard re-plan: station retries (dark)
kind: minor
- Marlow Yard re-plan, dark behind `?marlowreplan=1` (J14 R1): the re-planned yard's numbered stations run a retry
  instead of a set restart. Seen by a guard or a camera in a teaching set, or caught for 2 s in the Strongroom, puts both
  players back on that station's start marks with only its guards, gates and flags reset; earlier stations stay done. A
  set's drill window or beam can call the same retry. Downed still restarts the set from its holding room. A host with
  the flag opens its room on the re-planned yard; the built yard is unchanged.
- Route-run hooks: `window.__course.restarts`, `lastRetry` and (host) `retryOff(n)`; `?course=station:<n>` starts at a
  station. The `course` message carries the live station and the last retry (wire change).
