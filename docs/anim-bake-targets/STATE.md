# anim-bake-targets - state

## Now
PR open, its full e2e on the laptop. Every Body slider (but the shared stride length) and the gun tuck bake; the
2026-10-22 export re-baked (13 baked, 0 manual, 61 already baked); Reset baked tracks each bake by its own id and
matches a clamped value too. Checks: `npm run check` (2568 tests), e2e-anim / e2e-studio / e2e-weapons-carry on the
desktop; checker FAIL -> fix round -> checker FAIL (the clamp hole) -> fixed by the job lead with a literal-save test.

## Next
1. The PR green (laptop full e2e, CI); the orchestrator merges.
2. anim-bake-all (queued by the orchestrator, after anim-goggle): strideMul per state and the 20 remaining manual
   rules (backlog item 29) get real code targets.

## Open
- The root offsets (bodyFwdAdd, bodyUpAdd, guardGapAdd, guardSideAdd) and wallGapAdd bake and reach the local player;
  the partner's and the puppets' roots are placed in `src/net` and the studio, so they do not read them yet.
- A version 1 export copies `aim` rows to `aimStill`: an aim strideMul also shows an `aimStill` "skipped: no bake
  rule" row (report noise only).
- The two crouch pops (stand -> crouch -> stand 9.6 cm, running crouch -> stand 8.3 cm) are side effects of trackMul
  0.05; easing the stance width over the crouch transition would remove them (for Michael, PR body).

## Done
- 2026-10-22 08:00: the clamp hole fixed (a baked value past the slider's normal range also matches its clamped value;
  4.46.x re-saved trackMul 0.05 as 0.3); check passes.
- 2026-10-22 07:50: fix round (bd59f197): Reset baked ids `hash@at`, the strideMul exception documented and tested,
  backlog item 29, the CHANGELOG reworded.
- 2026-10-22 07:20: e2e extension, limits widened (marked), master 4.47.0 merged (1738ba3c).
- 2026-10-22 03:30: the body key, the tuck split, the pole, the re-bake, unit tests (30eb1e19).
- 2026-10-22 02:50: branch from feature/anim-bake-1022 7655fbcf; BRIEF, STATE.

## 2026-10-22 ~13:15 (account switch)
- Fix round (job lead, ec7b5301): e2e-clip drainpipe (2.4 cm) and landing roll (2.1 cm) came from Michael's idle
  trackMul 0.05: an airborne pose off a traversal has no Body group now (`selectBodyGroup`, unit cases), and e2e-clip's
  traversal feet count from the second frame after a teleport. Master 4.51.0 merged: the skeleton identity fixture
  re-captured (25 keyed entries move: tuner v3 #97 lets Body rows reach keyed clips). Master 4.51.1 merged (769fc26e).
- Desktop full e2e (JOBS=2, ec7b5301, 3594 s under overlap): check 2634 pass; 28 ok; 7 FAIL (5 killed at 600 s, a
  page-load timeout, e2e-mouse). Solo reruns on 769fc26e (logs /c/NightShift/abt-solo-*.log): e2e-mouse ok 80 s,
  e2e-ctcourse:3 ok 348 s, e2e-menus ok 281 s, e2e-coop ok 298 s, e2e-netmove ok 277 s, e2e-ctcourse:1 FAIL 371 s
  ("station 3: stale far-lobby positions reached the host (0 reports, 0 frames there)": the marlow-jammer send-back
  test's setup, likely timing; rerun it solo, then compare on master), e2e-ctcourse:2 ok 416 s.
- Next: the ctcourse:1 verdict (a solo rerun; if it fails on master too it is not #103's), then
  tell the orchestrator: #103 merges alone; then #110.
