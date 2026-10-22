# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~10:30 by the CT Core session, for the ~10:45 account swap (window 98%). Branches are pushed at each
agent milestone. Agents running at a cut-off are lost: their last pushed commit is the resume point (table below).

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
- Heavy-usage throughput (Michael ~09:50, CLAUDE.md on feature/menu): CPU < ~80%, at most 3 tsc / vitest agents; heavy.lock
  lane single GPU suites when CPU < 80%; PRs outside src/net / protocol / save -> train on CI + at most two area suites.

- Token rules (Michael ~10:05, CLAUDE.md "Token rules"): message the orchestrator only at PR open / train-ready / blocked /
  Michael needed (progress lives here); clear at ~25-30% context at a clean point; spare jobs ride ONE batch PR per train
  (branch `feature/ctcore-batch-<train>`, one checker, one CI): traverse-fix-2 + strike-pops (+ next spares) merge into
  it at hand-back; #194 stays its own PR; mocap-strafe keeps its own PR (mocap job). Merge master only on train entry.
  Save at 98%, swap at 99%.


## Open jobs (save ~10:30; heads as pushed at the save, agents may push later: use origin/feature/<slug>)
Master 4.68.0 (3950f3f8). Train 20 = #185 + #186 + #188 (releases on its lightbake verdict). Train 21: #189, #190, #194.
Agents running at the save (lost at the swap; restart from origin): hang-down fix round, mocap-strafe fix round,
traverse-fix-2 finish, stealth-spares planner. Desktop lane script for strike-pops was waiting on heavy.lock (Menu Notes).

| Job | Branch / folder | Head at save | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-on #188, throw-ko #186 | | | Train 20. | Nothing unless the train fails. |
| traverse-fix #189, partner-seed #190 | | | Train 21. | Nothing. |
| hostage-gait #194 | `feature/hostage-gait` | 6cf3ec97 | TRAIN-READY: check PASS (docs/hostage-gait/CHECK.md), laptop GPU coop 58 s + netmove 158 s PASS on c581a9c4. Orchestrator told. | Nothing. |
| mocap-strafe | `feature/mocap-strafe`, `C:/NightShift/Mobile-Coop-mocap-strafe` | 48480a21 (fix round WIP) | Built 842270f0 (MT2-STRAFE.md). Desktop GPU: e2e-clip ok, e2e-anim FAIL anti-crab. Fresh check FAIL: scratch/ctcore/msc-CHECK.md (5 required fixes, probes scratch/mt-check/repro3/). Fix round brief items: 1 snap pop (footPlanner ~1667 / ~980 / ~1021), 2 reaim slides (~1020) < 0.5 cm, 3 toggle mid-strafe stale stIdle, 4 knee outside ankle <= 3 cm (animGraph ~2278-2301 / ~2778, characterRig ~2423), 5 zero new alloc (animGraph ~1084 / ~2283 / ~2315), 6 lead A11: re-base ONLY knee spread + planted track for mocap-ON strafe rows in CRAB_DRAWN_GATES to the capture (M1), 7 art-credits.md:27. OFF md5 9ce3f3d1c70c299dca072d3a4f15f9ea / 31,065,812 B must hold. FIX ROUND 1 DONE d504af7c: snap pop (17.2 deg / 8.1 cm vs OFF 17.5 / 18.6), slides 0, A11 (MOCAP_STRAFE_DRAWN in e2e-anim.mjs: kneeSep 2.4, trackHalf 0.40 m for mocap-ON strafe rows), credits fixed; NOT met: knee-out 3.3-5.0 cm (gate 3.0), +48 B/frame, toggle 18.6-19.7 deg (base 15.6-17.5, polish). FIX ROUND 2 (Opus) RUNNING ~10:45: knee-out via knee pole / swivel, zero alloc, real knee-out assert, then desktop heavy2 GPU e2e-anim + e2e-clip. | If round 2 is lost: new Opus agent with the same goals from origin. Then desktop lane e2e-anim + e2e-clip, an Opus recheck of the 5 items (fresh agent, msc-CHECK.md as scope), own PR. Then back-to-wall; then spare #7 crouch pops. |
| traverse-fix-2 | `feature/traverse-fix-2`, `C:/NightShift/Mobile-Coop-traverse-fix-2` | ebcafadc | Finish agent running at the save (climbHands asserts, moveState keep/revert decision, docs/traverse-fix-2/REPORT.md). | If REPORT.md is final: batch. Else new Opus agent finishes (same brief: palms on the lip <= ~1.5 cm until the right foot is on top, no > 3 cm hand jump at release, CLIMB_UP + _TEAM). |
| spare #5 strike-pops | `feature/strike-pops`, `C:/NightShift/Mobile-Coop-strike-pops` | c917c3d8 | DONE (docs/strike-pops/REPORT.md): wrist 31.4 -> 27.0 cm/frame, trunk reversal 12.1 -> 0.4 deg/frame, hand-swap dip fixed (handSwapPath.ts + characterRig hand-swap, not strike-gated), revive -> strike.reset() in coopClient.ts (src/net). Desktop GPU on c917c3d8: e2e-takedown ok 24 s, e2e-anim ok 59 s. | Batch. |
| spare #2 hang-down | `feature/hang-down`, `C:/NightShift/Mobile-Coop-hang-down` | 8b748164 (+ fix WIP if pushed) | Check PASS (docs/hang-down/CHECK.md). Desktop GPU takedown + anim ok on 0578d554. Laptop GPU: ctcourse:1/:3 + netmove PASS; FAIL e2e-coop hang-down "the second guard offered" (client hanging, offer null, td false, hangs 1, depth 1.2) and e2e-ctcourse:2 station 5 (test taps A to hack; hack moved into the hold-A menu). Fix round running: prefer tap-A hack in reach (A9 in BRIEF.md), fix the second-guard offer. FIX ROUND DONE 4072e2b9: coop fail was a test bug (host drops dead guards same step; e2e-coop.mjs now logs kills / KOs); station 5 fixed in game (A9: tap A uses the item in reach while hanging with no guard offered; hold A by a guard = menu; `hangDirectA` once per step; gameState.ts, teamController.ts). Unit 7 files pass; desktop GPU e2e-coop + e2e-ctcourse PASS on 4072e2b9. | Character Build asked (~10:35) for e2e-netmove + e2e-takedown on 4072e2b9; on green -> batch (the batch checker covers the fix-round game change). |
| Batch (spares) | `feature/ctcore-batch-<train>` off master | - | Not cut yet. | Merge strike-pops + traverse-fix-2 (+ hang-down when green) into it; ONE Opus checker (strike-pops' hand-swap change is not strike-gated: check it); CI + laptop coop / ctcourse (src/net in strike-pops + hang-down); ONE PR; orchestrator. |
| Stealth spares 9 / 12 / 7 | - | - | Orchestrator ~10:10 ("stealth over shooting", ROADMAP lines 41-49): 9 interrogation gives door codes / camera routes / patrol timing; 12 co-op synced takedowns rewarded; 7 limited suppressor ammo. Briefs FINAL (verified on master 8e5dbd83): scratch/ctcore/briefs/spare-7-sd-rounds.md (quiet rounds rifle 60 / pistolSd 45, then loud; HUD "SD n"; netShared.ts + coopHost.ts:1178, no bump; A1 assumes quiet rounds run out then shots are loud, undo = numbers in sdRounds.ts), spare-12-dual-reward.md (DualClock, StealthRating.duals, `dualTakedown` event for section-rating, fixes the extra KO per dual; coopHost only, no bump), spare-9-interrogation-intel.md (door codes / camera sweeps / patrol loops as feed lines; WAIT until #194 + hang-down are on master; needs a read-only `patrolRoute` getter in enemy.ts from Guard AI Build: ask it). 7 + 12 can run in parallel now. ~10:40: spare 12 Sonnet builder RUNNING in `C:/NightShift/Mobile-Coop-dual-reward` (feature/dual-reward off 8e5dbd83, node_modules junction -> Mobile-Coop-mocap-trial-2). | Sonnet 5.5 builders for 7 and 12 (worktrees `C:/NightShift/Mobile-Coop-<slug>`, COMMON-SPARE.md; its protocol note is stale: master 31, none bumps), then 9; one Opus checker for the batch. |

Character Build: guard-render S5 1b895175 reviewed OK by CT Core (rebase after train 20, rerun guard identity + footPlanner).
Scratch: C:/NightShift/scratch/mt2/COMMON.md, COMMON-SPARE.md; checks hgc / hdc / msc -CHECK.md (scratch/ and scratch/ctcore/);
lane scripts scratch/ctcore/lane-*.sh (heavy.lock, port 4191, E2E_GPU=1); this file is pushed with
scratch/ctcore/push-resume.sh <file> <msg> (no worktree on feature/menu).

## Resume prompt
```
Night Shift | CT Core Build: RESUME after the ~10:45 account swap. Model Opus, effort high. Read CLAUDE.md (on
origin/feature/menu: "Heavy-usage throughput" and "Token rules") and docs/ROADMAP.md (top "Decided", "Next: stealth over
shooting"), then docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow "Rules carried". Copy the file to
C:/NightShift/scratch/ctcore/resume-ct-core.md and push updates with scratch/ctcore/push-resume.sh. A heavy.lock /
heavy2.lock naming CT Core Build with no node / bash process of ours is stale: delete it. Message "Night Shift |
Orchestrator" only that you resumed, then only at PR open / train-ready / blocked / Michael needed. Work "Open jobs"
top down: restart one Opus agent per lost row from origin (mocap-strafe fix round, hang-down fix round, traverse-fix-2
if unfinished; planner if briefs missing), max 3 tsc / vitest agents, CPU < 80%. Then the spare batch branch and the
stealth spares (Sonnet from the briefs). e2e: E2E_GPU=1 always; Character Build on the laptop for coop / netmove /
ctcourse, desktop heavy.lock lane for single suites. Push WIP and refresh this file after every hand-back; save at 98%.
```
