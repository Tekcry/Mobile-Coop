# tuner-clarity STATE

## Resume block
- Job: make the tuner and Anim Studio say plainly whether each setting changes the motion-capture or the hand-made
  moves, show what is playing now, warn on edits that change nothing, and give the Keys tab a Legs part with ankle /
  shin twist (BRIEF.md goal 1-5, A1-A7). ROADMAP Now row 0c; runs during the docs-first hold by Michael's instruction.
- Branch feature/tuner-clarity, worktree C:/NightShift/Mobile-Coop-tuner-clarity, from origin/master f24ebbf6a.
- STOPPED at the usage limit (~16:40): S4 builder and the S1-S3 checker were stopped; S4 WIP pushed on feature/tuner-clarity-s4 (unchecked); RERUN a fresh S1-S3 checker and resume S4 from its branch head. Was running: Opus
  checker on S1-S3 (report to the lead, no status yet); S4 Sonnet builder in C:/NightShift/Mobile-Coop-tuner-clarity-s4
  (feature/tuner-clarity-s4) from the strict brief C:/NightShift/scratch/ctcore/tuner-clarity/S4-BRIEF.md (slice reports
  S1-REPORT.md / S2-REPORT.md beside it). Worktrees junction node_modules to this one; builders use plain tsc.
- Gates: plan checker PASS before build; Opus builds src/anim; checker per batch; laptop queue e2e-studio and
  e2e-tuner-phone (`node C:/NightShift/scratch/ctcore/lq/request.mjs --sha <full> --pr <n> --suites "e2e-studio
  e2e-tuner-phone" --set tuner-clarity --requester "Night Shift | Player Build"`).
- Message the orchestrator at PR open / train-ready / blocked.

Next: S1-S3 checker verdict (fix round if FIX); merge S4; S5 docs + fragment (Haiku: ui.md, world-and-characters.md:415
legd 9 a side, testing-tools.md, changes/feature-tuner-clarity.md kind minor); Opus checker on S4 + S5; build; PR;
request e2e-studio e2e-tuner-phone + e2e-coop e2e-netmove (S2 touches src/player); message the orchestrator.

## Done
- 2026-10-25 ~15:35 BRIEF.md. ~15:50 PLAN.md (Opus planner), BRIEF A8-A12.
