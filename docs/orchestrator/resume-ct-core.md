# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~04:05 (trim: 1 agent; 5-hour 51%; running: qstop) by the CT Core session (new account, after the ~00:55 swap). Every branch below is committed and
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

## Open jobs
| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-trial #159 | merged in train 15 | f4b5b7c1 | Train 15 PASSED, releasing as 4.64.0 (orchestrator ~01:30). | Nothing. |
| mocap-trial-2 | `feature/mocap-trial-2`, `C:/NightShift/Mobile-Coop-mocap-trial-2` | a7147e26 | sprint MERGED (20384dd6: 127_07 run -> sprint 4.2-5.0 m/s, A6; ON <= OFF everywhere). Running (1 agent, Opus): feature/mt2-qstop (C:/NightShift/Mobile-Coop-mt2-qstop, from a7147e26): one-frame stop pelvis 8.7 cm ON vs 2.5 OFF + braked jog-band 3.2 cm (mocapSprint allows 3.5: tighten), report MT2-QSTOP.md; must land before the default flips. Then strafe / wall, then the fresh checker. Before: crouchpop MERGED (2c3d028f: crouch / stand / draw while walking ankle-toe 57 -> 17, OFF 16.5; tests/mocapCrouchShift). Running (1 agent, Sonnet): feature/mt2-sprint (C:/NightShift/Mobile-Coop-mt2-sprint, from 0cdeb22f): 127_07 sprint loop, run -> sprint stage in speedSet, A6, report MT2-SPRINT.md. Then strafe / wall (lateral cycle format: Opus design, Sonnet build), then the fresh checker. Before: alloc MERGED (crouch allocation 0 B over the sneak). Running (1 agent): Opus feature/mt2-crouchpop (C:/NightShift/Mobile-Coop-mt2-crouchpop, from 2bce4d96): crouch / stand while walking ankle-toe 37.6 vs 15.4 OFF, must land before the default flips (orchestrator); report MT2-CROUCHPOP.md. Then sprint (Sonnet). Message the orchestrator only at slice ends / PRs / blockers. Before: crouch MERGED (91cb0ee1: 136_09 crouched sneak body over planner feet, A5; open ON-only: crouch / stand while walking 0.8 ankle-toe 37.6 vs 15.4 OFF (base ON 35.2, clip-feet hand-off), 0.5 x 3 crouched turn slide 2.88 vs 2.24 OFF, one-frame 0.8 -> 2.6 pace jump slide 6.1 cm, keyMocap rig rules not on the crouch capture; mocapCrouch allocation case flaky at its limit). Running (trim, 1 agent, Sonnet): feature/mt2-alloc (C:/NightShift/Mobile-Coop-mt2-alloc) on that allocation. Then: an Opus fix round for the crouch-while-walking pop before the checker; sprint (Sonnet, strict brief on crouch's pattern); strafe / wall. Before: fix2 MERGED (beb41748: allocation back to #159's, review 3/4/5/8 gaps fixed, OFF dump md5 9ce3f3d1) + integ MERGED (c68c6bf3: pop1's flight opening waits START_TOE_OFF 1.2 s): ALL 8 mocap / identity test files pass on adfa4f00. Still running: crouch. Next: crouch merge, then sprint (Sonnet from a strict brief on crouch's pattern), strafe / wall (Opus: lateral cycle format), trim mode (orchestrator ~02:30: at most 2 agents). Before: runturn MERGED (ced6cc32 -> c543c093) + pop3 MERGED (a560f5a0 -> 9b1879d5); the combined tree fails mocapSwitch 'no pops' starts / stops jerk 0.146 vs 0.095 (each branch alone passes): Opus agent feature/mt2-integ (C:/NightShift/Mobile-Coop-mt2-integ, from 9b1879d5) fixing it, report MT2-INTEG.md. Still running: fix2, crouch. mt2-pop1 MERGED (9901bfca: trailing clip-planted foot steps off when the other swing is past 0.75 and the rig drops the pelvis > 1 cm, PlannerInput.reachNeedL/R; rig keeps the planner foot yaw / pitch on rate-limited leg frames; walk-turn pelvis max 2.25 -> 1.75 cm; run 4.0 x 4 ankle-toe 81 -> 28.8 as a side effect; mocapSwitch +17 turn plans). mt2-pop2 MERGED (dc2d7535: stop pitch / height / place ease, tests/mocapStopPitch; open: 1.0 m/s post-stop pelvis 1.81 cm in 1 of 10 phases, uncross vs aim idle step). Fragment changes/feature-mocap-trial-2.md started. Master 4.64.0 merged (aff84c5a, mocap tests pass); BRIEF M4 (Michael ~01:25: mocap ON by default after the fresh checker passes: flip the Settings default + its settings / e2e asserts + label as the LAST step, say it in the PR body). Before: M3 downloads done + #159 merged (36df9644) + orchestrator merge review applied (20515978). Six agents started ~01:20 on 20515978: `feature/mt2-pop1` (CHECK-2 req 1 walk-turn sink + turn-offset sweep in mocapSwitch), `mt2-pop2` (req 2 stop pitch snap, tests/mocapStopPitch), `mt2-pop3` (req 3 short-stand start, tests/mocapShortStart), `mt2-runturn` (run 4.0 x 4 ankle-toe 81 ON vs 58 OFF after 4.61.0, tests/mocapRunTurn), `mt2-fix2` (review items 3/4/5/8 check; the WIP's allocation regression: mocapSwitch alloc 2525 vs <= 2500 B, passes on f4b5b7c1; OFF dump proof vs f4b5b7c1), `mt2-crouch` (136_09 crouch walk clip behind the switch, A5, tests/mocapCrouch). | On each hand-back: read MT2-<SLUG>.md, merge the branch into mocap-trial-2 (order: fix2, pop2, pop3, pop1, runturn, crouch; footPlanner conflicts by hand), run the mocap tests, push, update this file. Free slots: sprint (127_07 + 127_03 start), strafe (69_59 / 69_56; the clip format needs a lateral cycle), wall (139_14/15 crouched, 69_56/59 standing side-steps, 139_01/04 peek stand-ins; after strafe's format). Merge origin/master once 4.64.0 lands. Then fresh checker (CHECK3-BRIEF), six GPU suites via Character Build, PR into a train, orchestrator. |
| vent-kick T1 #141 | `feature/vent-kick` | ebce0da7 | PR open, suites pass. | Nothing unless its train fails. |

Spare jobs (orchestrator, docs/orchestrator/spare-jobs.md on feature/menu), only when no mocap work is left for a slot:
#8 traversal (feature/traverse-fix), #5 strike / swap pops, #2 hang-down sidearm / grab / neck-snap (runHang
teamController.ts:497), #3 throw onto a guard KO (no wire change, else protocol 31; merge master before the PR). Keep out of src/ai (Guard AI Build). Never
anything touching animGraph, footPlanner, characterRig, keyed, tune while mocap-trial-2 is open.

## Resume prompt
```
Night Shift | CT Core Build: RESUME. Model Opus, effort high. Read CLAUDE.md (on origin/feature/menu) and
docs/ROADMAP.md, then docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried" (full burn to 100%). A
C:/NightShift/heavy.lock or heavy2.lock naming CT Core Build with no node / bash process of ours running is stale: tell
the orchestrator. mocap-trial-2 (C:/NightShift/Mobile-Coop-mocap-trial-2): for each agent branch feature/mt2-<slug> in
the "Open jobs" row: if it has a docs/mocap-trial/MT2-<SLUG>.md report committed, merge it (order in the row); if not,
redo that agent from its WIP (brief: C:/NightShift/scratch/mt2/COMMON.md + the row's one-line task). Then the remaining
clips, the fresh checker, GPU suites via Character Build, PR. Michael is asleep: log assumptions, no question dialogs.
Message "Night Shift | Orchestrator" at each slice and PR.
```
