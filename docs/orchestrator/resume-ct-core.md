# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~00:30 (97% save before the account swap) by the CT Core session. Every branch
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
| mocap-trial (TOP PRIORITY) | `feature/mocap-trial`, `C:/NightShift/Mobile-Coop-mocap-trial` | c10284e7 | PR #159 open, for train 13. Master 4.61.0 MERGED (d10d68f2) + tests (c10284e7): mocapSwitch 13 / 13 (hand-off plant slide at N1 contact points, limit kept; spot-turn bone step no worse than master N1 29.6 deg); OFF byte-identical to af56ab43; FIX-1 merge section. Six GPU suites RUNNING on the desktop (mt-e2e.sh 00:41, /c/NightShift/mt-e2e.out). Next: all pass -> #159 body (merge, review fixes, suites, docs/art-credits.md CMU entry) -> orchestrator (train 13). Resolved 13 hunks (animGraph / footPlanner / characterRig) + the orchestrator review fixes (1) N2 bodyMotion / scaleKeyedArms scaled by mocapLayerK(MOCAP_LAYERS.bodyMotion, keyMocap) (declared, never read: mocap.ts ~57-67), N1 turn-step / ball-pivot rules gated on clipFeet like holdOrStep, N1 FootState fields cleared in beginSwing / land; (2) characterRig ~1910 pitch rate limit gated on the rig's keyMocap > 0 or clipOwn / clipPlant (not global LOCO.mocap). OFF must be byte-identical to af56ab43 (dump repro + identity fixtures). | If the merge is not committed: check `git status` in the worktree; finish or redo it (git merge origin/master again if aborted), commit, push. Then six GPU suites: desktop only if CPU < 60% at start, else Character Build (laptop 4192). Update #159 body (merge, review fixes, suites, docs/art-credits.md CMU acknowledgement entry: review item 6). Orchestrator. |
| mocap-trial-2 | `feature/mocap-trial-2`, `C:/NightShift/Mobile-Coop-mocap-trial-2` (npm ci done) | 9156c0e0 | Branched at 089259be + BRIEF M2 (no sheets; overnight: more clips behind the toggle, each batch OFF identical + fresh checker + GPU suites + PR) and M3 (Michael ~00:20 in this session: "Yes, download them": named CMU takes for crouch walk / sneak, sprint, strafe, back-to-wall, one at a time, SOURCES.md). Agents running (~00:35): (a) CMU downloads + SOURCES.md + TAKES.md (no src); (b) review items 3 / 4 / 5 / 8 in the worktree (mocap.ts, animGraph, tiny footPlanner for 8, tests, changes/feature-mocap-trial-2.md); (c) CHECK-2 residuals 1-3 prototyped in a scratch export of 089259be, hands back a diff + how it maps onto N1's planner (apply after the #159 merge). Lost agents: redo from this row. | After #159's merge commit: merge feature/mocap-trial into it. Fix round (parallel Opus agents ok): CHECK-2 required 1 (fast walk-turn pelvis when the turn slot fades), 2 (stop swing pitch snap), 3 (start after a 0.3-0.5 s stand), mocapSwitch turn-offset sweep (0.37 / 0.71, a 2.0 x 4 plan); orchestrator review (3) spurious start one-shot when enabled mid-walk / partner first seen walking (mocap.ts ~222-247: seed `still` from speed), (4) spin on the spot pulses every 90 deg (envelope at the turnT wrap, mocap.ts ~285), (5) clip duty overrides the [0.4, 0.75] clamp when CF.on is false (animGraph ~2221), (8) clear clipPlant when the switch goes off. Walk-turn slot arms: polish list. Repros C:/NightShift/scratch/mt-check/repro2/. Then the new clips (crouch walk, sprint, strafe, wall moves) + the 15 gap takes, per-clip agents, fresh checker per batch, PR per batch. No sheets. |
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
