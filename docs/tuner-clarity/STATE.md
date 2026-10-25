# tuner-clarity STATE

## Resume block
- Job: make the tuner and Anim Studio say plainly whether each setting changes the motion-capture or the hand-made
  moves, show what is playing now, warn on edits that change nothing, and give the Keys tab a Legs part with ankle /
  shin twist (BRIEF.md goal 1-5, A1-A7). ROADMAP Now row 0c; runs during the docs-first hold by Michael's instruction.
- Branch feature/tuner-clarity, worktree C:/NightShift/Mobile-Coop-tuner-clarity, from origin/master f24ebbf6a.
- Step: BRIEF (A1-A12) and Opus PLAN.md (S1-S5) done at 33850e2b. A fresh Opus plan checker was running at the 15:40
  save (report to the lead only, no status). node_modules installed in this worktree (npm ci); slice worktrees
  junction to it (`cmd //c mklink /J <wt>\node_modules C:\NightShift\Mobile-Coop-tuner-clarity\node_modules`).
- Fix: BRIEF A12 label must match PLAN 2(e) ("Motion capture (walk, jog, run, sneak, aimed strafe)").
- Gates: plan checker PASS before build; Opus builds src/anim; checker per batch; laptop queue e2e-studio and
  e2e-tuner-phone (`node C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full> --pr <n> --suites "e2e-studio
  e2e-tuner-phone" --set tuner-clarity --requester "Night Shift | Player Build"`).
- Message the orchestrator at PR open / train-ready / blocked.

Next: if the plan checker's verdict is not in docs/tuner-clarity/ or the lead's notes, rerun a fresh Opus plan checker
on PLAN.md; on PASS fold its polish into the slice briefs and start S1, S2, S3 in parallel (Opus, worktrees
feature/tuner-clarity-s1 / -s2 / -s3, PLAN section 3 claims), then S4 (Sonnet, strict Opus brief) + S5 (Haiku).

## Done
- 2026-10-25 ~15:35 BRIEF.md. ~15:50 PLAN.md (Opus planner), BRIEF A8-A12.
