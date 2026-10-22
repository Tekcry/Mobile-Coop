# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-22 ~21:50 by the CT Core session (second account of the day) ahead of the 5-hour cut-off. Every branch
below is committed and pushed. Agents that were running at the save are lost: the resume prompt says what to redo.

## Rules carried
- CT Core is the overflow session: it works and starts agents up to 100% of the 5-hour window. Cutoff-proof: commit +
  push a WIP after every agent hand-back, keep this file and the job STATEs current. If cut off: do nothing; resume when
  the orchestrator messages after the reset.
- Up to 3 parallel Opus agents where the work splits (implementer + fresh checker, one fix round; from
  `docs/systems/agent-preamble.md`; they return text, the job lead writes REPORT / CHECK and commits; no full vitest /
  check / e2e inside them). `git checkout -- tests/__snapshots__/visionIsolation.test.ts.snap` before every commit.
- e2e: ALWAYS `E2E_GPU=1` (Michael ~21:10; a GPU failure counts; a software rerun is diagnosis only). Desktop lanes:
  `C:/NightShift/heavy.lock` (port 4191; also full checks and any software run) and `C:/NightShift/heavy2.lock` (port
  4192, GPU only, `E2E_JOBS=1`, start only while desktop CPU < 50%). Atomic create:
  `until ( set -o noclobber; echo "CT Core Build | <job> | $(date '+%H:%M')" > <lock> ) 2>/dev/null; do sleep 20; done`;
  release only if it names you. Laptop runs go through the orchestrator / Character Build.
- A PR enters a train only when EVERY suite it touches ran to completion and passed on the GPU (orchestrator, after
  N1); list them with results in the PR body. Touched suites: e2e-anim, e2e-move (+ e2e-clip, e2e-studio for anim /
  studio code), e2e-coop / e2e-netmove when src/player, src/game or src/net changed, the edited suite.
- Stopping a background script on Windows does NOT kill it (TaskStop leaves bash children alive; a stopped lock script
  took the lock 30 min later): kill the tree with `taskkill //PID <pid> //T //F`, free the port, check the lock file.
  Scripts that must outlive the session: start them detached (not as a child of the session).
- Changelog: one fragment per branch, `changes/<branch-with-dashes>.md` (`changes/README.md`); never CHANGELOG.md.
- Never loosen a metric to pass. Every tuner slider bakes.
- CMU mocap (mocap-trial): downloads from mocap.cs.cmu.edu only, raw files in `.mocap-cache/` (gitignored), every take
  in docs/mocap-trial/SOURCES.md. Standing OK for further CMU takes for the trial (Michael ~21:40 "Yes, CMU only",
  confirmed in the CT Core session ~21:45). This is the CMU-only exception to "no external art".

## Open jobs (branch, folder, head, next step)
| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-trial (TOP PRIORITY) | `feature/mocap-trial`, `C:/NightShift/Mobile-Coop-mocap-trial` | 6c0e3320 | Switch (Settings > Gameplay > "Mocap locomotion", tuner More > Panel, `?mocap=0/1`, default off; off = bit-identical) + clip-feet mode (7ac3b80e); CMU pipeline in node (`scripts/mocap/`, TAKES.md, 05c1ef15; emitted clips in `build/mocap/clips/`, gitignored: rerun with the commands at the end of TAKES.md). Integration agent was running at the save (clips into src, layer tuning, unit targets). | If its work is not committed: redo the integration (prompt below). Then GPU suites + current-vs-mocap GPU sheets, fresh checker, PR, message the orchestrator. Then the gaps (standing jog / run starts, full run turns, on-the-spot turns) with more CMU takes. |
| anim-natural N2 #138 (contains N1) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | e6274d36 | Train 8 RED on two N1-own asserts (N1 alone 08023227 fails too): e2e-anim "run 90: the feet never cross (-17.4 cm)" and e2e-clip "crouched holstered ... min -3.2 cm" (limit -3). Fix-round agent was running at the save (headless repro, narrow af4347d7 vs 08023227 vs master 4.58.0, fix planner / layer, unit pins). | Redo the fix round if not committed. Then run e2e-anim, e2e-clip, e2e-move, e2e-studio, e2e-coop, e2e-netmove fully on the desktop GPU, list them in #138's body, push, send the orchestrator the sha (train 8 = #119 + #138; #135 closed as superseded). |
| vent-kick T1 #141 | `feature/vent-kick`, `C:/NightShift/Mobile-Coop-vent-kick` | ebce0da7 | Done: PR #141 open; checker PASS + fix round (M1 pad matches keyboard); e2e-traverse, e2e-pad, e2e-mouse, e2e-netmove pass on the desktop GPU (9fd7b5b6). | Nothing unless its train fails. DECISIONS at merge: M1, A1. |

## Test logs on the desktop
`/c/NightShift/vk-e2e.log` (T1 GPU, all pass), `/c/NightShift/n2pr-e2e.log` (N2 c3a10b41 software: anim / move /
studio / clip ok, coop / netmove killed at 600 s under load), mocap sheets `build/mocap/sheets/` in the mocap folder.

## Done today (this account)
N2 pre-PR round (CHECK-4 fixes, run arm pop, CHECK-5 PASS), PR #138; N1 merged master 4.58.0 (08023227) and into N2
(fixtures re-captured with proofs, edabdc2c); T1 vent-kick PR #141; mocap-trial switch, clip feet and CMU pipeline.

## Resume prompt
```
Night Shift | CT Core Build: RESUME (after the account swap, ~21:50 save). Model Opus, effort high. Read CLAUDE.md
(on origin/feature/menu: GPU for logic e2e, the two desktop lanes, the test tiers), docs/ROADMAP.md, then
docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried". A C:/NightShift/heavy.lock or
heavy2.lock naming CT Core Build with no node / bash process of ours running is stale: delete it.
1. mocap-trial (top priority; C:/NightShift/Mobile-Coop-mocap-trial, feature/mocap-trial; docs/mocap-trial/STATE.md).
   If the integration is not committed past 6c0e3320: one Opus implementer to put build/mocap/clips into
   src/anim/clips/mocap (one performer for the speed blend, subject 16 unless 16_15's cycle is bad), reconcile duty /
   liftH / missing hand channels with the clip-feet mode, tune MOCAP_LAYERS / MOCAP_FEET (the capture's own twist, lean,
   arm swing, hip follow, load drop: near 0 on the mocap share), pin slide < 1 cm, crab limits, stride within 10%, no
   blend pops in tests/mocapSwitch.test.ts; switch off stays bit-identical. Then e2e-anim, e2e-move, e2e-clip,
   e2e-studio, e2e-coop, e2e-netmove fully on the desktop GPU (switch off: the default), GPU sheets current vs mocap
   (walk / jog / run, 90 / 180 turn, start, stop; anim-sheet or shot with ?mocap=0/1) for Michael, a fresh checker, the
   PR (minor; suites listed), message the orchestrator. Then the gaps with more CMU takes (standing OK).
2. N2 #138 fix round (C:/NightShift/Mobile-Coop-anim-natural-n2): if not committed past e6274d36, one Opus implementer:
   reproduce e2e-anim run 90 feet crossing (-17.4 cm, need >= 5) and e2e-clip crouched holstered (-3.2 cm, need > -3)
   headless; both are N1's own (fail at 08023227); compare af4347d7, 08023227, master 4.58.0; fix the planner / merge
   resolution, never the limits; unit pins. Then the six suites fully on the desktop GPU, list them in #138's body, push,
   send the sha to the orchestrator.
3. T1 #141: nothing unless its train fails.
Message "Night Shift | Orchestrator" at each slice and PR.
```
