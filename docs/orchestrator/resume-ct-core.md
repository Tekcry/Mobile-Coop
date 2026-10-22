# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~01:45 by the CT Core session (new account, after the ~00:55 swap). Every branch below is committed and
pushed at each agent hand-back. Agents running at a cut-off are lost: the resume prompt says what to redo.

## Rules carried
- FULL BURN to 100% of the 5-hour window (Michael ~01:05 via the orchestrator: "push as hard as possible"; replaces the
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
| mocap-trial-2 | `feature/mocap-trial-2`, `C:/NightShift/Mobile-Coop-mocap-trial-2` | 20515978 | M3 downloads done + #159 merged (36df9644) + orchestrator merge review applied (20515978). Six agents started ~01:20 on 20515978: `feature/mt2-pop1` (CHECK-2 req 1 walk-turn sink + turn-offset sweep in mocapSwitch), `mt2-pop2` (req 2 stop pitch snap, tests/mocapStopPitch), `mt2-pop3` (req 3 short-stand start, tests/mocapShortStart), `mt2-runturn` (run 4.0 x 4 ankle-toe 81 ON vs 58 OFF after 4.61.0, tests/mocapRunTurn), `mt2-fix2` (review items 3/4/5/8 check; the WIP's allocation regression: mocapSwitch alloc 2525 vs <= 2500 B, passes on f4b5b7c1; OFF dump proof vs f4b5b7c1), `mt2-crouch` (136_09 crouch walk clip behind the switch, A5, tests/mocapCrouch). | On each hand-back: read MT2-<SLUG>.md, merge the branch into mocap-trial-2 (order: fix2, pop2, pop3, pop1, runturn, crouch; footPlanner conflicts by hand), run the mocap tests, push, update this file. Free slots: sprint (127_07 + 127_03 start), strafe (69_59 / 69_56; the clip format needs a lateral cycle), wall (139_14/15 crouched, 69_56/59 standing side-steps, 139_01/04 peek stand-ins; after strafe's format). Merge origin/master once 4.64.0 lands. Then fresh checker (CHECK3-BRIEF), six GPU suites via Character Build, PR into a train, orchestrator. |
| vent-kick T1 #141 | `feature/vent-kick` | ebce0da7 | PR open, suites pass. | Nothing unless its train fails. |

Spare jobs (orchestrator, docs/orchestrator/spare-jobs.md on feature/menu), only when no mocap work is left for a slot:
#8 traversal (feature/traverse-fix), #5 strike / swap pops, #2 hang-down sidearm / grab / neck-snap (runHang
teamController.ts:497), #3 throw onto a guard KO (no wire change, else protocol 31; merge master before the PR). Never
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
