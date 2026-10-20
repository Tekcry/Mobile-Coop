# stealth-peek-wait - state

Small test-only job (Michael approved, 2026-10-21 ~09:30, relayed by the orchestrator). Branch
`feature/stealth-peek-wait` from master f7e89679 (4.30.0), folder `C:/NightShift/Mobile-Coop-stealth-peek-wait`.
Job lead: Character Build (the laptop runner).

**Ask:** e2e-stealth-ai's "wall peek exposes the head" block failed in full runs under load (#65 no assert; #71 "the
guard there sees the peeking head only", los true, head false) and passed solo. Add a settle wait. Test only.

**Cause (read, not proven):** the suite runs `loop.manual = true`, so real frames only render. The head and chest
points follow the rig's posed bones (`playerTarget.sync` reads `getAbsolutePosition`), whose world matrices a render
refreshes; the block ran in one synchronous evaluate, so a read could see an older pose.

**Fix (2bf39545):** the block's evaluate is async; before each pose read two real frames render and 0.1 s of sim runs.

**Now:** tests queued on the laptop after camera-cue #63: e2e-stealth-ai solo x3, then once with e2e-ctcourse at
E2E_JOBS=2. **Next:** PR to master (patch), send the orchestrator the head.

**Open:** #67 (S2b) fails this block solo too ("edge peek ... null"): that is a game change there, not this flake.

## Resume prompt
```
Night Shift | Character Build: RESUME stealth-peek-wait (test only) in C:/NightShift/Mobile-Coop-stealth-peek-wait
(branch feature/stealth-peek-wait). Read docs/stealth-peek-wait/STATE.md. If the laptop runs on 2bf39545
(C:/NightShift/scratch/runs/peekwait-2bf39545/summary.txt) are all ok, open the PR to master (patch) and send the
head to "Night Shift | Orchestrator"; if one fails, read its suite log under suites/ and fix the wait. No em dashes.
```
