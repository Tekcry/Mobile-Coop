# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~00:55 (SAVE at 94%: account swap; #159 train 15; mocap-trial-2 WIP e0298f90) by the CT Core session. Every branch
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
| mocap-trial (TOP PRIORITY) | `feature/mocap-trial`, `C:/NightShift/Mobile-Coop-mocap-trial` | f4b5b7c1 | DONE, train-ready: PR #159 at f4b5b7c1, train 15 (orchestrator). Master 4.61.0 merged (d10d68f2) + review fixes 1 / 2 / 6; mocapSwitch 13 / 13 (c10284e7); OFF byte-identical to af56ab43; six GPU suites ALL PASS on c10284e7; #159 body updated; orchestrator told. | Nothing unless train 13 fails. |
| mocap-trial-2 | `feature/mocap-trial-2`, `C:/NightShift/Mobile-Coop-mocap-trial-2` (npm ci done) | e0298f90 | WIP pushed at the swap (~00:55), NOT checked: CMU M3 downloads under way (80 files in .mocap-cache/, gitignored, local to this worktree; SOURCES.md / TAKES.md partial; scripts/mocap/m3.mjs) and review items 3 / 4 / 5 / 8 partial (mocap.ts, animGraph, characterRig, tests/mocapFix2.test.ts). Branch is on 089259be (pre 4.61.0 merge). Agents at the save (all lost after the swap): (a) downloads, (b) review 3 / 4 / 5 / 8 in the worktree; prototypes in this session's scratchpad, diffs NOT in git: (c) CHECK-2 required 1 + turn-offset sweep, (d) required 2 stop pitch snap, (e) required 3 short-stand start, (f) run 4.0 x 4 ankle-toe 81 ON vs 58 OFF (N1 uncross + swing bow). | Resume: check e0298f90 (git diff 9156c0e0..e0298f90; finish or redo (a) and (b): SOURCES.md must list every file in .mocap-cache, one take at a time, M3 approval; (b) needs tests + OFF dump proof). Then `git merge origin/feature/mocap-trial` (f4b5b7c1). Redo (c)-(f) as separate agents on the merged tree (each a different footPlanner area; briefs: CHECK-2.md, FIX-1.md "Merge 4.61.0", repros C:/NightShift/scratch/mt-check/repro2/), mocapSwitch + OFF dump after each; fresh checker, six GPU suites (desktop only if CPU < 60%, else Character Build), PR into a train, orchestrator. Then the new clips (crouch walk, sprint, strafe, wall) + the 15 gap takes, per-clip agents, PR per batch. No sheets. |
| anim-natural N2 #138 | merged | af56ab43 | MERGED in train 8 (master 4.61.0). | Nothing. |
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
1. mocap-trial (top priority; C:/NightShift/Mobile-Coop-mocap-trial, feature/mocap-trial, head 82f43716, master 4.59.0 in): read
   docs/mocap-trial/STATE.md and CHECK.md (and FIX-1.md if the fix agent finished). One Opus implementer (fix round) on CHECK.md:
   required 1 (clear FootState.clipOwn in beginSwing / land), 1b (ease a planner-planted foot's pitch into the clip's over
   ~0.15 s at the hand-back, or rate-limit pelvisDrop ~1 cm / frame when ON), 2 (fade fromPitch into the clip pitch over
   the first ~0.3 of the first clip swing, or pitchRate ~12), 3 (cap the start slot's arm weight at 0.5), note 5 (gate the
   updateIdle pitch < 0 branch on clip feet); done = walk 1.4 / 2.0 x turn 1-4 rad/s pelvis beyond speed x dt <= 2 cm,
   bone steps < 25 deg ON, a pelvis-step assert in mocapSwitch; switch off bit-identical. Course Ready's repro scripts:
   path in CHECK.md. Then bash /c/NightShift/mt-e2e.sh detached (powershell Start-Process -WindowStyle Hidden), all six
   pass: REPORT.md, PR (minor; suites listed; Menu Notes' sheets from feature/mocap-sheets linked; A4 notes for Michael),
   message the orchestrator. Then the gap takes (SOURCES.md "Downloaded ... not yet used") through scripts/mocap.
2. N2 #138 (C:/NightShift/Mobile-Coop-anim-natural-n2, head 1c6f06a3): the 362359a4 GPU run failed e2e-anim knees-over-toes and e2e-clip crouched holstered; read docs/anim-natural-n2/REPORT-4.md (fix agent) or redo the round, then rerun n138-e2e.sh;
   (six suites on the GPU, started 22:31). All pass: list them in #138's body, send the orchestrator the sha. A fail: one
   round (watch: crouch 90 first swing, crouched holstered).
3. T1 #141: nothing unless its train fails.
Message "Night Shift | Orchestrator" at each slice and PR.
```
