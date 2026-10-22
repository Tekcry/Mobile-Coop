# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~09:45 by the CT Core session, for the ~09:50 account swap (window 91%). Every branch below is committed and
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
- Heavy-usage throughput (Michael ~09:50, CLAUDE.md on feature/menu): CPU < ~80%, at most 3 tsc / vitest agents; heavy.lock
  lane single GPU suites when CPU < 80%; PRs outside src/net / protocol / save -> train on CI + at most two area suites.

- Token rules (Michael ~10:05, CLAUDE.md "Token rules"): message the orchestrator only at PR open / train-ready / blocked /
  Michael needed (progress lives here); clear at ~25-30% context at a clean point; spare jobs ride ONE batch PR per train
  (branch `feature/ctcore-batch-<train>`, one checker, one CI): traverse-fix-2 + strike-pops (+ next spares) merge into
  it at hand-back; #194 stays its own PR; mocap-strafe keeps its own PR (mocap job). Merge master only on train entry.
  Save at 98%, swap at 99%.

## Resumed ~10:00 (new account)
hostage-gait: checker PASS (docs/hostage-gait/CHECK.md), PR #194 head 6cf3ec97; waits for laptop coop + netmove on c581a9c4.
hang-down 0578d554: desktop GPU e2e-takedown ok 22 s, e2e-anim ok 47 s; fresh checker running (-> scratch/hdc-CHECK.md).
Running: mocap-strafe finish, traverse-fix-2 finish (Opus). Queued: strike-pops finish. Character Build has (4189, after
Guard AI S7): hang-down coop / ctcourse / netmove, then hostage-gait coop / netmove; verdicts come to CT Core.
This file is pushed without a worktree: scratch/ctcore/push-resume.sh <file> <msg>.

## Open jobs (save ~09:45, before the account swap; every branch committed + pushed)
Master 4.68.0 (3950f3f8). Train 20 = #185 + #186 + #188. Protocol registry: 31 master, 32 guard-ai, 33 marlow-final, 34 hang-down.
Agents running at the save are lost: their last state is the WIP commit below. Untracked zz probes stay in the worktrees (not pushed).

| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-on #188 | `feature/mocap-on` | ab1cb6c6 | PR, CHECK-7 PASS, six GPU suites green on 1673e924 (head docs only). Train 20. | Nothing unless the train fails. |
| throw-ko #186 | `feature/throw-ko` | 4ff5f19e | e2e-ctcourse GREEN on the head. Train 20. | Nothing unless the train fails. |
| traverse-fix #189 | `feature/traverse-fix` | 6ca9ef6c | PR, fresh check PASS, e2e-traverse + clip GPU ok. Train 21. | Nothing. |
| partner-seed #190 | `feature/partner-seed` | f27268c4 | PR, fresh check PASS, coop + netmove GPU ok. Train-ready. | Nothing. |
| spare #10 hostage-gait | `feature/hostage-gait`, `C:/NightShift/Mobile-Coop-hostage-gait` | c581a9c4 | DONE (src/net/holdFeed.ts; 30 fps jitter gait spread 0.146 -> 0.004, mean 1.12 -> 1.40 m/s; report docs/hostage-gait/REPORT.md). Fresh checker was running at the save (writes C:/NightShift/scratch/hgc-CHECK.md; if missing, rerun it: Opus, read-only scratch copy, scope = the src/net diff). Laptop queued e2e-coop + netmove on c581a9c4 (Character Build reports to CT Core + orchestrator). | Check + suites -> copy CHECK into docs/hostage-gait, PR (patch). |
| mocap-strafe | `feature/mocap-strafe`, `C:/NightShift/Mobile-Coop-mocap-strafe` | 46333339 | WIP: mocap-on merged (9467c5c3), side-step only on carriers (6f10866a), stop pelvis <= 1.89 cm, swing foot jumps 24-29 -> <= 11 cm (c11e5455). Not yet: tests/mocapStrafe final, OFF dump vs mocap-on, MT2-STRAFE.md, A10, fragment. Probes tests/zz* untracked in the worktree. | New Opus agent finishes it (C:/NightShift/scratch/mt2/COMMON.md; brief = this row), then fresh checker, laptop GPU suites (e2e-anim, clip, move, studio, coop, netmove), PR. Then back-to-wall; then spare #7 crouch pops (orchestrator: after strafe lands). |
| traverse-fix-2 (climb-up hands) | `feature/traverse-fix-2`, `C:/NightShift/Mobile-Coop-traverse-fix-2` | 6de30920 | WIP: CLIMB_UP trunk pitch so the palms stay on the lip until the right foot is on top (k ~0.52); tests/climbHands; edit only src/anim/clips/traverse.ts CLIMB_UP(_TEAM). Diagnosis: origin/feature/traverse-fix docs/traverse-fix/REPORT.md item 2. | Opus agent finishes, checker, laptop e2e-traverse / anim / clip, PR. |
| spare #2 hang-down | `feature/hang-down`, `C:/NightShift/Mobile-Coop-hang-down` | 0578d554 | CODE DONE (agent hand-back ~09:50): sidearm (LT pistol inverted, RT fire, RB jammer), grab via hold-A (KO by default on pull-up / let go), neck-snap (RT tap choke / hold kill); joiner as hanger (src/net/hangHold.ts, checkShot 2.2 m origin); no wire change (31). Unit: hangDown 8, hangDownTakedown 7, hangDownNet 6 + 14 area files pass; tsc / eslint clean. Behaviour change: the settled hang hack goes through the hold-A menu. Laptop asked (~09:52) for e2e-coop (new hang-down section, never run), ctcourse, netmove, takedown, anim on 0578d554. Polish: no inverted grab / choke / snap clips (graph files owned elsewhere), host shows no limp lowering for a client hang KO. Docs: docs/hang-down/BRIEF.md (A1-A8), REPORT.md. | Fresh checker (Opus, read-only), laptop verdict (e2e-coop hang-down section may need one fix round), PR (minor). |
| spare #5 strike-pops | `feature/strike-pops`, `C:/NightShift/Mobile-Coop-strike-pops` | 563b87f7 | WIP: n4c 1 dip reversal, n4c 9 wrist 31 cm step (spread over 2-3 frames, hit stays 80 ms), n4d 1 follow-through after a bay restart (courseMode.ts:641 / sectorMode.ts:173), n4c 7 if cheap. | Opus agent finishes, checker, laptop e2e-anim / clip / ctcourse / coop, PR. |

Character Build (guard-render): S1 characterRig hook 3, 1231-1315; S5 L2 approved gated on !carrier; L3 footPlanner loops only. No clash with mocap-on / strafe.
Scratch: C:/NightShift/scratch/mt2/COMMON.md, COMMON-SPARE.md; checks CHECK-7.md, tfc-CHECK.md, psc-CHECK.md; OFF dump scratch/mt-check/repro/dump.test.ts (compare against master's own dump).

## Resume prompt
```
Night Shift | CT Core Build: RESUME after the ~09:50 account swap. Model Opus, effort high. Read CLAUDE.md (on
origin/feature/menu) and docs/ROADMAP.md (top "Decided"), then docs/orchestrator/resume-ct-core.md on origin/feature/menu
(git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried" and the
orchestrator's pacing. A heavy.lock / heavy2.lock naming CT Core Build with no node / bash process of ours is stale: tell
the orchestrator. Message "Night Shift | Orchestrator" that you resumed. Then work "Open jobs" top down: hostage-gait
(checker result or rerun, laptop result, PR); restart one agent per WIP row from its last commit (strafe, traverse-fix-2,
hang-down, strike-pops: Opus for anim / co-op code and every fresh checker, Sonnet 5.5 only from strict briefs, Haiku
chores). e2e goes to Character Build on the laptop (ListAgents name with its [ref]); desktop lanes single GPU suites
only when CPU allows; always E2E_GPU=1. Push WIP and refresh this file after every hand-back. Michael: M1 "Mocap, as
captured", M4 "On by default". Message the orchestrator at slice ends, PRs and blockers.
```
