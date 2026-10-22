# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~00:00 (#138 merged; #159 open, merging 4.61.0) by the CT Core session. Every branch
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
| mocap-trial (TOP PRIORITY) | `feature/mocap-trial`, `C:/NightShift/Mobile-Coop-mocap-trial` | 089259be | PR #159 open (train 12 per the orchestrator; CHECK-2 FIX residuals accepted as not broken). #159 CONFLICTS with master 4.61.0 (N1 + N2): merge IN PROGRESS in the worktree, Opus agent resolving (13 hunks animGraph / footPlanner / characterRig; OFF byte-identical to af56ab43 via the dump repro; N2 layers gated on the mocap set). | Agent lost: redo the merge (prompt: CHECK-2 / FIX-1 / N2 REPORT-4 intent). Then commit + push, GPU six suites (mt-e2e.sh detached), update #159 body, orchestrator. Then feature/mocap-trial-2 (worktree C:/NightShift/Mobile-Coop-mocap-trial-2, npm ci done, at 089259be: fast-forward to the merged head first): CHECK-2 required 1-3 + mocapSwitch turn-offset sweep; walk-turn slot arms on the polish list. Then the gap takes. |
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
