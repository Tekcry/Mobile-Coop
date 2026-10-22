# Resume - Night Shift | CT Core Build (track B, animation; overflow session)

Saved 2026-10-23 ~08:15 (5-hour ~80%, before the account swap) by the CT Core session (new account, after the ~00:55 swap). Every branch below is committed and
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

## Open jobs (save ~08:15, 5-hour ~80%, before Michael's account swap)
Released: mocap batch 1 = #182 (default OFF) in 4.67.0 (train 18, master 6c9b28d4).

| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| mocap-on (round F + the ON default) | `feature/mocap-on`, `C:/NightShift/Mobile-Coop-mocap-on` | 55414af3 | Round F (clip plants hold their contact; e2e turn feet now 0.0 cm / 14.3 deg) + the ON flip (d60f374f). ON suites on d60f374f: coop 108 s, netmove 180, studio 79, move 37, clip 20 PASS; e2e-anim FAIL at an M1 shape limit ("walk: knees over the toes 3.8 cm", limit 3.5). An Opus agent was making e2e-anim report M1 shape limits as notes when mocap is ON (asserts unchanged OFF; hook `__mocapOn`, env E2E_MOCAP) and running e2e-anim ON and OFF on heavy.lock: WIP 7144a03c; its report docs/mocap-trial/MT2-E2EANIM.md may be missing. CHECK-6 = FIX (copy C:/NightShift/scratch/mt2/CHECK-6.keep.md into docs/mocap-trial/CHECK-6.md): guards run the mocap set when ON. | 1. Merge `feature/mt2-guardgate` (below). 2. e2e-anim round DONE (55414af3, MT2-E2EANIM.md): e2e-anim passes on the desktop GPU ON (64 s, 317 asserts, 97 M1 notes, 20 past the old limit) and OFF (59 s, 414 asserts = the old script); shape(), __mocapOn hook, E2E_MOCAP; no slide / crossing / pop / timing assert touched. The re-check must judge the converted list (it includes body-mechanics rotation / sway / head yaw rows, not only knee-out). 3. Merge origin/master (4.67.0+). 4. Narrow fresh re-check (guards + e2e-anim notes). 5. Six suites ON (/c/NightShift/mon-e2e.sh on the desktop, or Character Build). 6. PR (minor): body = CHECK-6, round F, the measure change, A8 + the G toggle jog row (kneeL-ankleL 25.0 deg, CHECK-6 note), M4 flip + mocapV migration. Character Build agreed: their guard-render S1 characterRig hook is its own method outside ~1850-2010 / ~2600-2700; first ready merges first. |
| mt2-guardgate | `feature/mt2-guardgate`, `C:/NightShift/Mobile-Coop-mt2-guardgate` | a2ac66b7 (WIP, agent may still be running) | Gate the mocap set on CharacterRig.carrier (player + remote partner only): guards bit-identical to OFF; test tests/mocapGuards.test.ts (64 / 64 guard identity ON). Report docs/mocap-trial/MT2-GUARDS.md. | If the report is in: merge into mocap-on; else finish it (brief in this row). |
| mocap batch 2: strafe | `feature/mocap-strafe`, `C:/NightShift/Mobile-Coop-mocap-strafe` (from d60f374f) | not pushed at the save (work local in the worktree) | Opus agent: a sideways cycle in the clip format, CMU 69_59 / 69_56 strafe L / R behind the switch, tests/mocapStrafe, A10, report MT2-STRAFE.md. | Check the worktree (`git status`); commit + push its WIP; finish or redo. Then back-to-wall (139_14 / 139_15 crouched, 69_56 / 69_59 standing side-steps, 139_01 / 139_04 peek stand-ins) on the same format. |
| spare #3 throw-ko | `feature/throw-ko` | 4ff5f19e | DONE: PR #186 open (master merged; unit 13 + teamMoves pass; e2e-coop 82 s, e2e-netmove 179 s on ad7956f8). e2e-ctcourse not run (the slice tier names it). | Nothing unless the orchestrator wants e2e-ctcourse first. |
| spare #16 partner-seed | `feature/partner-seed` | f289fd29 | Code done (remote avatar seeds its speed / heading from the first MoveState and after a teleport; unit 8 / 8). e2e-coop / e2e-netmove NOT run (heavy2 held by Course Ready). | Merge master, run e2e-coop + e2e-netmove (desktop heavy2 lane or Character Build), PR. |
| spare #8 traverse-fix | `feature/traverse-fix`, `C:/NightShift/Mobile-Coop-traverse-fix` | not pushed at the save | Opus agent: ledge-end hand fall-through, climb-up hands let go early, rifle draw -1.5 vs -2 cm; report docs/traverse-fix/REPORT.md. | Check the worktree; commit + push WIP; finish (e2e-traverse + e2e-clip one at a time), PR. |
| vent-kick T1 #141 | `feature/vent-kick` | ebce0da7 | PR open, suites pass. | Nothing unless its train fails. |

Scratch: agent rules C:/NightShift/scratch/mt2/COMMON.md (mocap) and COMMON-SPARE.md (spare jobs); checker probes
C:/NightShift/scratch/mt2/c3out/repro/ (zzplayer, zzalloc2, ...); OFF dump C:/NightShift/scratch/mt-check/repro/dump.test.ts
(md5 9ce3f3d1c70c299dca072d3a4f15f9ea, 31,065,812 B); desktop e2e scripts /c/NightShift/mt2-e2e.sh, mon-e2e.sh.

## Resume prompt
```
Night Shift | CT Core Build: RESUME (after the ~08:20 account swap). Model Opus, effort high. Read CLAUDE.md (on
origin/feature/menu) and docs/ROADMAP.md (top "Decided"), then docs/orchestrator/resume-ct-core.md on origin/feature/menu
(git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried" and the
pacing the orchestrator gives. A C:/NightShift/heavy.lock or heavy2.lock naming CT Core Build with no node / bash process
of ours running is stale: tell the orchestrator. Work the "Open jobs" rows in order: mocap-on (merge mt2-guardgate,
finish the e2e-anim M1-notes round, re-check, six suites ON, PR), then the strafe / traverse-fix worktrees (commit their
WIP first), then partner-seed's e2e and PR. Michael's decisions: M1 "Mocap, as captured", M4 "On by default" (after the
re-check and the six suites). Message "Night Shift | Orchestrator" at slice ends, PRs and blockers only.
```
