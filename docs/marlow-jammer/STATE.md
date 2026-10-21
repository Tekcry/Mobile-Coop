# marlow-jammer - state (resume point)

**Now:** merged 2026-10-22 as 4.48.0 (PR #101, f1c4a6c6), PROTOCOL_VERSION 26. Job done.
**Next:** nothing in this job. Polish for later (orchestrator's bay 3 GPU look on dca117dd, which passed all five items):
- The camera end of the hallway and the far lobby are very dark; the camera is barely readable from the entry.
- The orange-red cell band (#b54a2e) at waist height on the south wall can read as a laser / sweep line next to the
  camera's red grid.
Other follow-ups: the camera IR is not shown visually (night vision); a sent-back partner waits up to 3 s before
counting again; the Kestrel security tool still tints cones by light (paused, G53); `docs/kestrel/S0-security-spec.md`
quotes the old light-dependent camera line.
**Open:** PROTOCOL_VERSION vs the cloud B + M PR (whichever merges second takes the next number); item 6 overlap on the
bay 3 floor lines (BRIEF "Limits").

## Done
- 2026-10-21: job docs (BRIEF, STATE).
- 2026-10-21: implementer (items 5, 7, 8, floor lines removed, protocol 26), 11cb81f5; REPORT.md.
- 2026-10-21: checker 1 FIX (bay 3 passable unjammed); fix round 1 d796a488 (J2 send-back, host LOS, client cue
  assert, forward-only mirror, allocations).
- 2026-10-22: checker 2 FIX (stale-position gate hole); fix round 2 + master 4.44.0 merge (J4 lamp).
- 2026-10-22: Michael M1-M3 (J2, J3 approved; J4 rejected); IR cameras fc980dd4; final checker PASS; master 4.47.1
  merged b8a68b27; PR #101; full e2e green on dca117dd; bay 3 GPU look passed (desktop); merged as 4.48.0.

## Resume prompt
```
Night Shift | Character Build (laptop). Resume job marlow-jammer (marlow-bays slice J) in C:/NightShift/Mobile-Coop-marlow-jammer, branch feature/marlow-jammer (branch guard before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/marlow-jammer/BRIEF.md and STATE.md. Test requests from job leads come first (laptop: one at a time, heavy.lock, port 4191). Continue from STATE "Next": implementer, fresh checker, one fix round, full e2e, PR, then message "Night Shift | Orchestrator".
```
