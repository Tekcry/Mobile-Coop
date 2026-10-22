# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~09:25 by the CT Core session (account after the ~08:20 swap). Every branch below is committed and
pushed at each agent hand-back. Agents running at a cut-off are lost: the resume prompt says what to redo.

## Rules carried
- Pacing after the reset (Michael 01:45, ROADMAP Decided "Lean windows", CLAUDE.md "A job"): every 5-hour window to
  99%, lean, no quality loss. No new agent at 97%, save at 98% (WIP pushed, this file current), stop by 99%; the
  orchestrator's cron resumes us after each reset. Max 3 agents (desktop CPU). Models: Opus plans, writes strict slice
  briefs (exact files, line ranges, acceptance numbers, tests), reviews and runs every fresh checker; most mocap code
  (footPlanner, animGraph, rig, mocap.ts) stays Opus; Sonnet 5.5 builds data / test sweeps / e2e asserts / clip
  conversion runs / SOURCES rows from those briefs; Haiku 5.5 for chores. A failed Sonnet slice gets its fix round
  from Opus. Lean prompts: exact files and line ranges, never whole large docs.
- Until the reset: FULL BURN to 100% of the 5-hour window (Michael ~01:05 via the orchestrator: "push as hard as possible"; replaces the
  97% stop). Up to 6 parallel Opus agents. Cutoff-proof: agents push their own branch at milestones; the lead commits +
  pushes and refreshes this file after every hand-back. If cut off: do nothing; resume when the orchestrator messages.
- Agents: one worktree each, `C:/NightShift/Mobile-Coop-mt2-<slug>`, branch `feature/mt2-<slug>` (node_modules a
  junction to Mobile-Coop-mocap-trial-2's), common rules `C:/NightShift/scratch/mt2/COMMON.md`. They return a report
  (`docs/mocap-trial/MT2-<SLUG>.md` on their branch); the lead merges the branches into feature/mocap-trial-2 in order and
  writes the changelog fragment `changes/feature-mocap-trial-2.md`. No full vitest / check / e2e inside agents.
  `git checkout -- tests/__snapshots__/visionIsolation.test.ts.snap` before every commit.
- e2e: ALWAYS `E2E_GPU=1`; full runs and GPU suites go to Character Build on the laptop. Desktop lanes (`heavy.lock` 4191,
  `heavy2.lock` 4192 GPU only, `E2E_JOBS=1`, CPU < 50%) only for single quick suites. Atomic create:
  `until ( set -o noclobber; echo "CT Core Build | <job> | $(date '+%H:%M')" > <lock> ) 2>/dev/null; do sleep 20; done`.
- A PR enters a train only when every suite it touches passed on the GPU: e2e-anim, e2e-move, e2e-clip, e2e-studio
  (+ e2e-coop / e2e-netmove for src/player, src/game, src/net). List them with results in the PR body.
- Windows: TaskStop does not kill bash children; `taskkill //PID <pid> //T //F`, free the port, check the lock file.
- Changelog: one fragment per branch, never CHANGELOG.md. Never loosen a metric to pass.
- CMU mocap: mocap.cs.cmu.edu only, raw files in `.mocap-cache/` (gitignored, local to Mobile-Coop-mocap-trial-2; agent
  worktrees junction it), every take in docs/mocap-trial/SOURCES.md, credited in docs/art-credits.md. M3 approval (Michael
  00:15-00:20 "Yes, download them"): crouch walk, sprint, strafe, back-to-wall. All 21 M3 takes are already downloaded.
- Michael M1 "Mocap, as captured" (old limits are notes; pops / slides fail); M2 no sheets, fresh checker, GPU suites,
  PR into a train.
- Fresh checker: CT Core runs it itself (Course Ready moved to Sector Ops, orchestrator ~01:40): a NEW Opus agent with
  `C:/NightShift/scratch/mt-check/CHECK3-BRIEF.md`.

## Open jobs (save ~09:25; 5-hour ~65%, full burn per Michael 09:00, refresh after every hand-back)
Master 4.68.0 (3950f3f8). Train 20 = #185 + #186 + #188. Protocol registry: 31 master, 32 guard-ai, 33 marlow-final, 34 hang-down.

| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-on #188 | `feature/mocap-on` | ab1cb6c6 | PR open, CHECK-7 PASS, all six GPU suites green on 1673e924 (head docs only). In train 20. | Nothing unless the train fails. |
| throw-ko #186 | `feature/throw-ko` | 4ff5f19e | e2e-ctcourse GREEN on the head (laptop). In train 20. | Nothing unless the train fails. |
| traverse-fix #189 | `feature/traverse-fix` | 6ca9ef6c | PR open, fresh check PASS, e2e-traverse + e2e-clip GPU ok. Train 21. | Nothing. |
| partner-seed #190 | `feature/partner-seed` | f27268c4 | PR open, fresh check PASS, coop + netmove GPU ok. Train-ready. | Nothing. |
| mocap-strafe | `feature/mocap-strafe`, `C:/NightShift/Mobile-Coop-mocap-strafe` | 8498843d+ | Opus agent: merge mocap-on, fix start / stop pelvis PEL rows, tests/mocapStrafe, MT2-STRAFE.md, A10. | Fresh checker, GPU suites (laptop), PR. Then back-to-wall; then spare #7 crouch pops (held until strafe lands). |
| traverse-fix-2 (climb-up hands) | `feature/traverse-fix-2`, `C:/NightShift/Mobile-Coop-traverse-fix-2` | from 3950f3f8 | Opus agent: CLIMB_UP trunk pitch so palms stay on the lip; tests/climbHands. | Checker, laptop e2e-traverse / anim / clip, PR. |
| spare #2 hang-down | `feature/hang-down`, `C:/NightShift/Mobile-Coop-hang-down` | from 3950f3f8 | Opus agent: sidearm, grab, neck-snap for the hanging player; protocol 34 if a wire change. | Checker, laptop e2e-coop / netmove / anim, PR. |
| spare #5 strike-pops | `feature/strike-pops`, `C:/NightShift/Mobile-Coop-strike-pops` | from 3950f3f8 | Opus agent: n4c 1 dip reversal, n4c 9 wrist 31 cm step, n4d 1 follow-through after bay restart (+ n4c 7 if cheap). | Checker, laptop suites, PR. |
| spare #10 hostage-gait | `feature/hostage-gait`, `C:/NightShift/Mobile-Coop-hostage-gait` | from 3950f3f8 | Opus agent: coopHost seized loop feeds holdAt a per-step pose (src/net only). | Checker, laptop e2e-coop / netmove, PR. |

Agents: no desktop e2e while desktop CPU is high (orchestrator 09:20); e2e goes to Character Build [06fe56]. Guard-render (Character Build) edits characterRig outside 1845-2015 / 2595-2710 (S1 3, 1231-1315; S5 L2 approved gated on !carrier).
Scratch: C:/NightShift/scratch/mt2/COMMON.md, COMMON-SPARE.md; checks CHECK-7.md, tfc-CHECK.md, psc-CHECK.md; OFF dump scratch/mt-check/repro/dump.test.ts (compare against master's own dump).

## Resume prompt
```
Night Shift | CT Core Build: RESUME. Model Opus, effort high. Read CLAUDE.md (on origin/feature/menu) and
docs/ROADMAP.md (top "Decided"), then docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried". A heavy.lock / heavy2.lock naming
CT Core Build with no node / bash process of ours running is stale: tell the orchestrator. Agents running at a cut-off are
lost: for each "Open jobs" row with an agent, check the worktree, commit + push its WIP, then redo the step (Opus for anim
/ checkers, Sonnet 5.5 from strict briefs, Haiku chores). e2e goes to Character Build on the laptop; always E2E_GPU=1.
Michael: M1 "Mocap, as captured", M4 "On by default". Message "Night Shift | Orchestrator" at slice ends, PRs and blockers.
```
