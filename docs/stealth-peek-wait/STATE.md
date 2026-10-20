# stealth-peek-wait - state

Small test-only job (Michael approved, 2026-10-21 ~09:30, relayed by the orchestrator). Branch
`feature/stealth-peek-wait` from master f7e89679 (4.30.0), folder `C:/NightShift/Mobile-Coop-stealth-peek-wait`.
Job lead: Character Build (the laptop runner).

**Ask:** e2e-stealth-ai's "wall peek exposes the head" block failed in full runs under load (#65 no assert; #71 "the
guard there sees the peeking head only", los true, head false) and passed solo. Add a settle wait. Test only.

**Tried (2bf39545), did not work:** before each pose read, two real frames render (the suite is `loop.manual`, so
real frames only render) and 0.1 s of sim runs. Result on the laptop: e2e-stealth-ai FAIL solo 3 of 3, the same assert
every time ("the guard there sees the peeking head only", {"los":true,"head":false,"light":1,"at":[0.25,-11.75]}),
and ok once alongside e2e-ctcourse at E2E_JOBS=2. Before the change it passed solo. So a render (or the extra sim)
between the pose and the guard's own perception read turns the guard's sight from head-only to the chest: the
outcome depends on what renders around the block, which fits the original full-run flake.

**Ruled out:** stale bone matrices. `characterRig.applyTargets` forces `body.computeWorldMatrix(true)` and refreshes
the chain top-down in the sim update, which `stepHeadless` runs (frameUpdate included).

**Diagnosis (a0ce551a, laptop, solo):** the guard's own eye is y 1.588; the test picked the spot with 1.55. From the
real eye both the chest and the head are clear at the picked spot [0.25,-11.75] (original block: FAIL, los true, head
false; frames-only settle: perception's earlier sample said head only and passed, the same rays after it see the chest).
Not a render read: Babylon's PhysicsBody places a parentless node through getAbsolutePosition(), which computes the
world matrix, so door / breakable bodies are where they should be; perception rays hit G.STATIC only and every point
is sim-side.

**Fix (this branch):** the original block, plus the spot check uses the spawned guard's own eye (`e.eye`).
**Now (2026-10-21 ~10:45):** PR #78 open (dd73e3b8). Solo 5 of 6 ok (the first run after the build failed, assert lost), ok with e2e-ctcourse at E2E_JOBS=2. The orchestrator reviews and merges.

**Open:** #67 (S2b) fails this block solo too ("edge peek ... null"): that is a game change there, not this flake.

## Resume prompt
```
Night Shift | Character Build: RESUME stealth-peek-wait (test only) in C:/NightShift/Mobile-Coop-stealth-peek-wait
(branch feature/stealth-peek-wait). Read docs/stealth-peek-wait/STATE.md. If the laptop runs on 2bf39545
(C:/NightShift/scratch/runs/peekwait-2bf39545/summary.txt) are all ok, open the PR to master (patch) and send the
head to "Night Shift | Orchestrator"; if one fails, read its suite log under suites/ and fix the wait. No em dashes.
```
