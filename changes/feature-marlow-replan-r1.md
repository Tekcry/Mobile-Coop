# Marlow Yard re-plan: station retries (dark)
kind: minor
- Marlow Yard re-plan, dark behind `?marlowreplan=1` (J14 R1): the re-planned yard's numbered stations run a retry
  instead of a set restart. Seen by a guard or a camera in a teaching set, or caught for 2 s in the Strongroom, puts both
  players back on that station's start marks with only its guards, gates, gate doors and flags reset; a guard dealt
  with at an earlier station stays down, and earlier stations stay done. A set's drill window or beam can call the same
  retry from its own station code. A station whose new team move is not playable yet opens its stand-in gate. Downed
  still restarts the set from its holding room. A host with the flag opens its room on the re-planned yard.
- The built yard plays as before, with one fix: the pause menu's set restart holds the spotted rule at once, so a guard
  still in combat from before the restart can no longer restart the set a second time.
- Route-run hooks: `window.__course.restarts`, `lastRetry` and (host) `retryOff(n)`; `?course=station:<n>` starts at a
  station. The `course` message carries the live station and the last retry (wire change).
