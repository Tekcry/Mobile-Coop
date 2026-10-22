# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-22 ~22:50 (99% save point) by the CT Core session (second account of the day) ahead of the 5-hour cut-off. Every branch
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
| mocap-trial (TOP PRIORITY) | `feature/mocap-trial`, `C:/NightShift/Mobile-Coop-mocap-trial` | f873a6d5 | Real CMU clips in (a05bdde7). Fresh checker (Course Ready) FIX: docs/mocap-trial/CHECK.md (required 1 / 1b pelvis-drop pops at clip/planner hand-offs, 2 toe pop on the first clip swing; decide 3 start-slot arms). GPU suites (switch off) on a05bdde7: coop, move, netmove, clip, anim PASS; studio FAIL = master timing assert (needs master 4.58.3). Menu Notes runs the side-by-side on a05bdde7 (feature/mocap-sheets). Gap takes downloaded (SOURCES.md). | Merge origin/master 4.58.3; one Opus fix round on CHECK.md (required 1, 1b, 2; 3: cap start-slot arm weight 0.5; note 5); bash /c/NightShift/mt-e2e.sh detached (six suites GPU); REPORT.md; PR (minor; suites + sheets); orchestrator. Then the gap takes. |
| anim-natural N2 #138 (contains N1) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | 362359a4 | Fix round 1 (f2f8e396: run 90 crossing, crouch entry) + fix round 2 (5e996cc1: KEY_PEL_RATE, run 180 planted contact 16.45 -> 0.01 cm) + master 4.58.3 merged (362359a4; studio timing fix). Six suites RUNNING on the desktop GPU since 22:31 (detached, heavy.lock): /c/NightShift/n138-e2e.out + n138-e2e.log. | All six pass: list them in #138 body (gh pr edit 138 --body-file), send the orchestrator 362359a4 (+ any docs commit). A fail: crouch 90 first swing (10.7 m/s headless, known) or crouched holstered (the pelvis rate) are the watch items: one more round. |
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
1. mocap-trial (top priority; C:/NightShift/Mobile-Coop-mocap-trial, feature/mocap-trial, head f873a6d5): read
   docs/mocap-trial/STATE.md and CHECK.md. Merge origin/master 4.58.3. One Opus implementer (fix round) on CHECK.md:
   required 1 (clear FootState.clipOwn in beginSwing / land), 1b (ease a planner-planted foot's pitch into the clip's over
   ~0.15 s at the hand-back, or rate-limit pelvisDrop ~1 cm / frame when ON), 2 (fade fromPitch into the clip pitch over
   the first ~0.3 of the first clip swing, or pitchRate ~12), 3 (cap the start slot's arm weight at 0.5), note 5 (gate the
   updateIdle pitch < 0 branch on clip feet); done = walk 1.4 / 2.0 x turn 1-4 rad/s pelvis beyond speed x dt <= 2 cm,
   bone steps < 25 deg ON, a pelvis-step assert in mocapSwitch; switch off bit-identical. Course Ready's repro scripts:
   path in CHECK.md. Then bash /c/NightShift/mt-e2e.sh detached (powershell Start-Process -WindowStyle Hidden), all six
   pass: REPORT.md, PR (minor; suites listed; Menu Notes' sheets from feature/mocap-sheets linked; A4 notes for Michael),
   message the orchestrator. Then the gap takes (SOURCES.md "Downloaded ... not yet used") through scripts/mocap.
2. N2 #138 (C:/NightShift/Mobile-Coop-anim-natural-n2, head 362359a4): read /c/NightShift/n138-e2e.out and n138-e2e.log
   (six suites on the GPU, started 22:31). All pass: list them in #138's body, send the orchestrator the sha. A fail: one
   round (watch: crouch 90 first swing, crouched holstered).
3. T1 #141: nothing unless its train fails.
Message "Night Shift | Orchestrator" at each slice and PR.
```
