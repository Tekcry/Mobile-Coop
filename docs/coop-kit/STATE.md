# coop-kit STATE
Owner: Night Shift | Player Build. Status: current (job doc).

## Resume block
- Job: FOLDED-PLAN J24 co-op kit (R32 shoulder stand, R34 rope descent) plus the five moves Michael added at ~18:05
  (Deadweight, Drop Catch, Chimney Pair, Swing Pass, Plank Bridge). BRIEF `docs/coop-kit/BRIEF.md` (M1-M2, A1-A20; one
  day question: the part 2 bands, A12, its text in "Questions for Michael"), PLAN `docs/coop-kit/PLAN.md` (part 1: A1,
  A2, B1, B2, A3 parked; "Part 2 (detailed)": K0, K5a, K5b, K1, K3, K4, K2, KD, KA1-KA5), `docs/coop-kit/CLIP-LIST.md`.
- Location: worktree C:/NightShift/Mobile-Coop-coop-kit, branch feature/coop-kit. Pointers: part 1 origin/master
  65411ea65; part 2 #578 a8bac697b, #581 752e106be, #574 61fa85fc8; each slice brief re-takes them at cut. Guard:
  `test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-kit`.
- History: 2026-10-25 ~18:40 BRIEF + PLAN; 2026-10-26 plan checks 1-3 FIX applied (last 628e83bc); A1 building in
  C:/NightShift/Mobile-Coop-coop-kit-a1 (feature/coop-kit-a1 on top of #578; A15, A16 below).
- A-log (orchestrator ~19:05, prototype mode): (A15) A1 starts on the plan check 3 fix without a fourth plan check;
  undo: plan check 4 on 628e83bc before A1's PR. (A16) A1 is cut on top of origin/feature/mission-b-sector (#578, open)
  and retargeted to master when #578 lands; undo: rebase A1 onto master after #578.
- 2026-10-26 ~18:45 part 2 detailed (Opus planner): Marlow's ruling (~18:20, A18) folded in: no Player edit of
  `courseState.ts` or re-plan set files; each K slice sends Marlow the id, the spot (`addKitSpot`) and the done call
  (`GameMode.onKitDone(kind, spot, a, b)`, A19). K0 (Opus, src/net, two checkers) makes the kit generic (kinds, sub
  bits 64-1024, wire claim point and spot index, generic kitNet pair rule, per-id gate, placeholders); K slices touch
  their own files plus one `KIT_BUILT` line. Mechanics first with placeholder poses, KA animation slices after
  Michael's playthrough (A20). A12 question written; slices start dark on the starting bands meanwhile (A17).
  Claims-check: 58 overlaps, nine plans, all in the Shared list (+ feature/marlow-play).
- Order: #578 -> A1 -> (A2 || B1) -> B2 (A2 / B2 after #498). Part 2: K0 (after #578, #581, A1) -> K5a -> K5b -> K1
  -> K3 / K4 -> K2 (parallel under full burn); KD when A12 is answered; KA1-KA5 after the playthrough.
- Owed elsewhere (not this job): Marlow's pull-up and shutter poses (shared `src/anim/clips/team.ts`); mission-engine
  PLAN row 106 (orchestrator, BRIEF A1); Marlow's station wiring per K slice.
- Next: part 2 plan check (fresh Opus checker on the "Part 2 (detailed)" section, BRIEF A12 / A17-A20); orchestrator
  asks Michael the A12 question by day; A1 continues in its worktree.

## Done
- 2026-10-25: BRIEF, PLAN, STATE (planner).
- 2026-10-26: plan check 1 fixes; plan check 2 fixes; plan check 3 fix; part 2 detailed.
