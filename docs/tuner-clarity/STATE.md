# tuner-clarity STATE

## Resume block
- Job: make the tuner and Anim Studio say plainly whether each setting changes the motion-capture or the hand-made
  moves, show what is playing now, warn on edits that change nothing, and give the Keys tab a Legs part with ankle /
  shin twist (BRIEF.md goal 1-5, A1-A7). ROADMAP Now row 0c; runs during the docs-first hold by Michael's instruction.
- Branch feature/tuner-clarity, worktree C:/NightShift/Mobile-Coop-tuner-clarity, from origin/master f24ebbf6a.
- Step: plan checker FIX applied (f82b4570: A1 / A8 / A12 strings, S1/S3 ReachNow interface, S2 golden + twist order,
  draw rule). S1, S2, S3 building in parallel (Opus) in worktrees C:/NightShift/Mobile-Coop-tuner-clarity-s1 / -s2 / -s3,
  branches feature/tuner-clarity-s1 / -s2 / -s3 (node_modules junctions to this worktree; builders type-check with
  plain tsc, not typecheck:fast).
- Gates: plan checker PASS before build; Opus builds src/anim; checker per batch; laptop queue e2e-studio and
  e2e-tuner-phone (`node C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full> --pr <n> --suites "e2e-studio
  e2e-tuner-phone" --set tuner-clarity --requester "Night Shift | Player Build"`).
- Message the orchestrator at PR open / train-ready / blocked.

Next: read each builder's report or branch head; merge s1, s2, s3 into feature/tuner-clarity (path-disjoint); one Opus
checker for S1-S3; then S4 (Sonnet, strict Opus brief from the S1 / S3 exported APIs) + S5 (Haiku).

## Done
- 2026-10-25 ~15:35 BRIEF.md. ~15:50 PLAN.md (Opus planner), BRIEF A8-A12.
