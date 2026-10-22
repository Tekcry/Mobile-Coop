# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~08:45 by the CT Core session (account after the ~08:20 swap). Every branch below is committed and
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

## Open jobs (save ~08:45, after the swap; Character Build live on the laptop [06fe56])
Released: mocap batch 1 = #182 (default OFF) in 4.67.0. Master 4.68.0 (3950f3f8).

| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-on | `feature/mocap-on`, `C:/NightShift/Mobile-Coop-mocap-on` | 1673e924 | master 4.68.0 merged (d8830ba2; fragment now changes/feature-mocap-on.md), CHECK-6 in docs, guardgate + e2e-anim notes in. Orchestrator 08:30: Studio / menu Wren stay hand-keyed (assumed decision in the PR body, undo carrier=true on the Studio stage). Running: fresh re-check agent (CHECK-7, scratch/mt2/CHECK-7.md: guards, OFF dump vs master, e2e-anim notes, tsc); desktop heavy.lock e2e-anim / clip / move / studio ON (/c/NightShift/mon-e2e.sh, out mon-e2e.out); laptop asked for e2e-coop + e2e-netmove on 1673e924. | Verdict + suites -> copy CHECK-7 into docs/mocap-trial, PR (minor). |
| spare #3 throw-ko | `feature/throw-ko` | 4ff5f19e | PR #186; laptop asked for e2e-ctcourse (08:32). | Result -> orchestrator for train 20. |
| mocap batch 2: strafe | `feature/mocap-strafe`, `C:/NightShift/Mobile-Coop-mocap-strafe` | 8498843d | WIP pushed. Opus agent (08:40): merge mocap-on, fix start / stop pelvis PEL rows, tests/mocapStrafe, MT2-STRAFE.md, A10. | Then a fresh checker, GPU suites, PR. Back-to-wall after. |
| spare #8 traverse-fix | `feature/traverse-fix`, `C:/NightShift/Mobile-Coop-traverse-fix` | 3add258d | Items 1 (lip-end hands) and 3 (sling draw waypoint) in; Opus agent (08:40): merge master, item 2 climb-up hands, e2e-traverse + e2e-clip on heavy2, REPORT.md. | PR. |
| spare #16 partner-seed | `feature/partner-seed` | 5fa702d2 | master merged, unit 8 / 8, tsc clean; laptop asked for e2e-coop + e2e-netmove. | Result -> PR. |
| vent-kick T1 #141 | `feature/vent-kick` | ebce0da7 | PR open, suites pass. | Nothing unless its train fails. |

Scratch: agent rules C:/NightShift/scratch/mt2/COMMON.md (mocap) and COMMON-SPARE.md (spare jobs); checker probes
C:/NightShift/scratch/mt2/c3out/repro/, c6out/; OFF dump C:/NightShift/scratch/mt-check/repro/dump.test.ts (compare
against master's own dump since 4.68.0, not the old md5).

## Resume prompt
```
Night Shift | CT Core Build: RESUME. Model Opus, effort high. Read CLAUDE.md (on origin/feature/menu) and
docs/ROADMAP.md (top "Decided"), then docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried". A heavy.lock / heavy2.lock naming
CT Core Build with no node / bash process of ours running is stale: tell the orchestrator. Work the "Open jobs" rows in
order: mocap-on (CHECK-7 verdict + the six suites ON -> PR), throw-ko ctcourse result, strafe and traverse-fix (agents may
be lost at a cut-off: check the worktree, commit WIP, redo the step), partner-seed PR. e2e-coop / netmove / ctcourse go to
Character Build on the laptop; desktop lanes single suites only; always E2E_GPU=1. Michael: M1 "Mocap, as captured", M4
"On by default". Message "Night Shift | Orchestrator" at slice ends, PRs and blockers only.
```
