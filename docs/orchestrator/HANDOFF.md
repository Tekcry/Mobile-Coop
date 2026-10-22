# Account handoff

Michael (2026-10-22 ~19:15): "Now, swap back once the next 5h limit is reached on the other account". 22:15: "dont try
save tokens, i will reset usage as soon as you hit 100%": sessions run to 100% (no early stops); at 100% Michael resets
(the swap back to the first account) and pastes the orchestrator prompt below.
Repeat as long as it pays. Earlier handoffs (2026-10-21, 2026-10-22 13:10, 19:25) are in git history.

## State at the switch (2026-10-23 ~00:40, 97% save point; Michael: "I'd suggest stopping around 97% to allow sufficient usage to stop and save all sessions")
Master v4.63.0 (train 13 #164 = #144 + #161 + #162, 102e6f41; /preview/ = dev = 102e6f41). 4.62.0 = train 12 #160 (#119 N4b + #158). Tonight: 4.60.0 #153 (train 10),
4.60.1 #155 (train 11), 4.61.0 #157 (train 8: #138 N2 + #135 N1 + #156 strip-light fix), 4.62.0 #160 (train 12).

Rules (CLAUDE.md on feature/menu; STATE "Merge procedure" / "Known"): every e2e E2E_GPU=1; laptop full runs and trains
at JOBS=5 (Michael 00:10 "Yes, if clean"; back to 3 on the first JOBS=5 failure) + a second single-suite slot on 4192;
desktop e2e only when CPU < ~60% at the start, else the laptop (Michael 00:25: "push as hard as possible without causing
failures"). Before a train build: `gh pr checks <n>` green for every member. Docs-only conflicts are resolved in the train
by the orchestrator. A load-only failure that passes solo on the same commit counts as known. Trains: merge-train.mjs from
C:/NightShift/Mobile-Coop-train. CLAUDE.md now allows CMU mocap takes (credited in docs/art-credits.md).

Train 13 RELEASED as 4.63.0 (#164). Train 14 (#163 lightfield-heap + #165 e2e-start-order, tests only) releasing as 4.63.1 at the save (log C:/NightShift/scratch/runs/release-train14.log; check it merged). Train 15 = #159 mocap-trial f4b5b7c1 (CI green, six GPU suites pass, review fixes 1 / 2 / 6 in): build it on master after 4.63.1 (`merge-train.mjs build 15 feature/mocap-trial`); the laptop task ns-chain-1022ap starts its full run as soon as origin/train/15 appears; verdict in C:/NightShift/scratch/runs/train15-<sha>/ on the laptop (Character Build reports it). Release 4.64.0 on a pass. An orchestrator review of the merge (d10d68f2) was still running at the save; rerun it if no report. load-audit (Character Build): review found 2 blockers (e2e-move sidePace can hang: no wall cap; e2e-ctcourse station 3 / 4 windows shrink up to 4x) + 2 fixes (coop allowTeleport per frame, desktop crash null unchecked); stress pass 1 green.
requested (JOBS=5). On a pass: `node scripts/merge-train.mjs release 13 4.63.0 "Sector Ops co-op routes and team doors, fence
rattle test, decisions G270-G275"` from C:/NightShift/Mobile-Coop-train. If e2e-desktop:1 or e2e-move fail, they are the
known load-audit pair (solo rerun). Pending review of #144 / #161 (orchestrator agent) - read its findings if it reported.

Open work (each job's resume file has the detail):
- CT Core: #159 mocap-trial (089259be) conflicts with 4.61.0; Opus merge agent running. Fix WITH the merge (orchestrator
  review): N2 bodyMotion / scaleKeyedArms gated by mocapLayerK; N1 turn rules clipFeet-gated; characterRig.ts:1910 pitch
  limit per rig, not global; art-credits CMU entry. Then six GPU suites -> train 14. Then feature/mocap-trial-2: residual
  pops 1-3 (Course Ready CHECK-2), review 3 / 4 / 5 / 8, turn-offset test sweep. Then more clips: crouch walk, sprint,
  strafe, back-to-wall (Michael 00:15 "Yes, download them": named CMU takes, one at a time, SOURCES.md). No sheets.
  Resume: docs/orchestrator/resume-ct-core.md on feature/menu.
- Menu Notes: marlow-final lead (feature/marlow-final, C:/NightShift/Mobile-Coop-marlow-final; BRIEF M1-M5). Step 1
  parallel agents (audit, exercises, route, constraints) -> SPEC.md + PLAN.md, then greybox slices, then dressing straight
  after each slice (luxury training facility, instructor gallery behind glass, LED strips, sliding doors; lighting
  sufficient; rule loosenings proposed, not applied; no explainer pads, objective list guides). Resume:
  docs/anim-natural/RESUME-menu-notes.md on feature/anim-natural.
- Course Ready: feature/sector-fixes-r2 from 4.63.0 (Michael ~00:45 "true 2-player pathways that cannot be used solo, but doesnt break solo play"; plus bolted-door nav blockers, unbolt side cap, solo-jump probe) as four agent branches r2-nav / r2-bolt / r2-jump / r2-paths, then one GPU run, checker, PR; then marlow-final second builder; mocap-trial-2 checker. Resume: docs/marlow-bays/RESUME-trackA.md.
  Menu Notes), then second builder on marlow-final slices; checker for mocap-trial-2. Resume: docs/marlow-bays/RESUME-trackA.md.
- Character Build: train 13 run; load-audit (feature/load-audit: e2e-desktop:1 crash-page hang fix 7d4dbc5f, e2e-move
  game-time windows; PR when proven under load); guard-cap measure (report only, docs/guard-cap/REPORT.md).
  Resume: docs/flake-fix/STATE.md on feature/flake-fix.
Michael's answers tonight: ROADMAP "Decided" (top entries) and DECISIONS G270-G275 (#162, in train 13).

## In the new account
Michael signs in to the other account in the desktop app (and on the laptop for Character Build), then pastes the
orchestrator prompt into a new session. The new orchestrator gives each next prompt with its session title, model and
effort, one per message, as the last thing in that message. Sessions are new: each prompt stands alone. Swapping back
uses the same table and prompts.

| Order | Session title | Model | Effort | Where |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | desktop |
| 2 | Night Shift \| CT Core Build | Opus 5.5 | high | desktop |
| 3 | Night Shift \| Menu Notes Build | Opus 5.5 | high | desktop |
| 4 | Night Shift \| Course Ready Build | Opus 5.5 | medium | desktop |
| 5 | Night Shift \| Character Build | Opus 5.5 | medium | laptop (Remote Control) |

### 1. Orchestrator
```
Night Shift | Orchestrator (account swap). Resume from docs/orchestrator/HANDOFF.md "State at the switch" and docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md (top "Decided" entries are tonight's answers). First: train 13 verdict and release 4.63.0; check C:/NightShift/heavy.lock and heavy2.lock (a lock with no live node process is stale; ask Michael to delete it). Then give Michael each session's prompt from HANDOFF "In the new account", one at a time, with session title, model and effort, as the last thing in the message. Recreate the usage and bottleneck cron (17, 37, 57 past) with the prompt in STATE "Cron prompt" and check get_usage now. Overnight: Michael is asleep, no question dialogs; marlow-final (Menu Notes lead, Course Ready builder), mocap #159 then mocap-trial-2 and new clips (CT Core), train 14, guard-cap and load-audit (Character Build). Stop and save at 97% of the 5-hour window (STATE "Pacing", Michael 00:35). Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. CT Core Build
```
Night Shift | CT Core Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Current jobs: mocap-trial (top priority, feature/mocap-trial, docs/mocap-trial/) and the #138 N2 fix round (N1's run 90 feet crossing and crouched-holstered clip). Scripts from the old session may have died: a C:/NightShift/heavy.lock or heavy2.lock naming CT Core Build with no node process running is stale; tell the orchestrator. Every e2e run is E2E_GPU=1. You are the overflow session (STATE "Pacing"). Message "Night Shift | Orchestrator" at each slice and PR.
```

### 3. Menu Notes Build
```
Night Shift | Menu Notes Build (account swap). Read CLAUDE.md and docs/ROADMAP.md (top "Decided" entries: Michael's marlow-final words M1-M6), then follow the resume prompt in the last fenced block of docs/marlow-final/STATE.md on origin/feature/marlow-final (git fetch; worktree C:/NightShift/Mobile-Coop-marlow-final). Current job: marlow-final lead (Marlow Yard redesign: SPEC.md and LIGHTING-PLAN partial, art kit WIP unchecked; then greybox slices, then dressing straight after each slice; Course Ready is the second builder). Michael is asleep: log assumptions, no question dialogs. Every e2e run is E2E_GPU=1 via Character Build when desktop CPU is over ~60%. Message "Night Shift | Orchestrator" at the spec and each slice.
```

### 4. Course Ready Build
```
Night Shift | Course Ready Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (git fetch; git show origin/feature/marlow-bays:docs/marlow-bays/RESUME-trackA.md). Current jobs: feature/sector-fixes-r2 (four agent branches r2-nav / r2-bolt / r2-jump / r2-paths; Michael: true 2-player team-door pathways), then marlow-final second builder (Menu Notes' PLAN), then the mocap-trial-2 checker. Every e2e run is E2E_GPU=1. A C:/NightShift/heavy.lock or heavy2.lock naming Course Ready with no node process running is stale; tell the orchestrator. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 5. Character Build (laptop)
```
Night Shift | Character Build (account swap, laptop, the test runner). Read CLAUDE.md "Sessions" ("Main test machine: the laptop"), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). Your last chain (C:/NightShift/scratch/chain-1022*.ps1, newest) may still be running: check its results in C:/NightShift/scratch/runs before starting anything. Take run requests from the orchestrator and job leads; at most one full run at a time. Message "Night Shift | Orchestrator" with each verdict.
```
