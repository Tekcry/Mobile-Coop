# coop-kit STATE
Owner: Night Shift | Player Build. Status: current (job doc).

## Resume block
- Job: FOLDED-PLAN J24 co-op kit (R32 shoulder stand, R34 rope descent) plus the five moves Michael added at ~18:05
  (Deadweight, Drop Catch, Chimney Pair, Swing Pass, Plank Bridge). BRIEF `docs/coop-kit/BRIEF.md` (M1-M2, A1-A14, one
  day question: the part 2 bands, A12), PLAN `docs/coop-kit/PLAN.md` (part 1 detailed: A1, A2, B1, B2; A3 parked until
  after Michael's playthrough; part 2 slice briefs: K0, K1-K4, K5a, K5b), `docs/coop-kit/CLIP-LIST.md` (for the
  orchestrator to download, pre-approved ~00:20).
- Location: worktree C:/NightShift/Mobile-Coop-coop-kit, branch feature/coop-kit. Pointers: origin/master 65411ea65;
  each slice brief re-takes them from the master it is cut from. Guard:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-kit`.
- 2026-10-25 ~18:40: BRIEF + PLAN written by the Opus planner. No code yet.
- 2026-10-26: plan check 1 FIX applied; Michael's ~00:25 toggle folded in.
- 2026-10-26 ~18:00: plan check 2 FIX (`C:/NightShift/scratch/ctcore/coop-kit-PLAN-CHECK.md`, 11 fixes) -> revised:
  `kitMoves` on in /preview/ for built ids (`KIT_BUILT`), off live; each player drawn with the owner's source (A2 / B2
  wait for #498); A1 owns the coopKit fold (after #578), B1 adds `stand` to `TEAM_KINDS`; prototype-mode tests (one
  set per PR, one fix round, one rerun); hand-made + Mixamo per role, no CMU hunt; A3 parked; K0 rewires Marlow's
  `kitMoveOn`; A12 bands a day question; Shared list complete; stale facts fixed.
- Order: #578 on master -> A1 -> (A2 || B1) -> B2 (A2 / B2 also after #498). Part 2 after #578 and part 1, with a
  detailed PART-2 section and its own plan check.
- Owed elsewhere (not this job): Marlow's pull-up and shutter poses (shared `src/anim/clips/team.ts`); mission-engine
  PLAN row 106 (orchestrator, BRIEF A1).
- 2026-10-26 ~19:00: plan check 3 FIX, one item (A1 must not remove `flags.coopKit`: #583's
  tests/missionFlags.test.ts sets and reads it) -> applied 628e83bc (coopKit stays a writable gate, A1 changes only its
  load value). Second FIX went to the orchestrator: OK to start A1, no 4th check.
- A-log (orchestrator ~19:05, prototype mode): (A15) A1 starts on the plan check 3 fix without a fourth plan check; the
  slice checker covers it. Undo: run plan check 4 on 628e83bc before A1's PR. (A16) A1 is cut on top of
  origin/feature/mission-b-sector (#578, still open: red CI test, behind #522) as feature/coop-kit-a1 in
  C:/NightShift/Mobile-Coop-coop-kit-a1 (PR base feature/mission-b-sector), retargeted to master when #578 lands.
  Undo: rebase A1 onto master after #578.
- Next: A1 (Opus builder) in C:/NightShift/Mobile-Coop-coop-kit-a1; then its checker, one test set, PR; send
  CLIP-LIST to the orchestrator.

## Done
- 2026-10-25: BRIEF, PLAN, STATE (planner).
- 2026-10-26: plan check 1 fixes; plan check 2 fixes.
