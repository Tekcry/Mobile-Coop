# Account handoff

Michael (2026-10-22 ~19:15): "Now, swap back once the next 5h limit is reached on the other account". Second swap
(~22:05, this account's 5-hour window at 98%): work moves back to the first account (its window reset at 21:10).
Repeat as long as it pays. Earlier handoffs (2026-10-21, 2026-10-22 13:10, 19:25) are in git history.

## State at the switch (2026-10-22 ~22:00)
Master v4.58.2 (#143 GPU test waits 2, ee51908f; v4.58.1 #140; v4.58.0 train 7 #137 = #132 + #134). /preview/ = dev = ee51908f.
Ready for trains: #119 N4b e957db2f (studio reset fixed), #142 n4d, #144 R (all suites GPU green). Train 9's e2e-menus
touch pause ("a tap on the pause button pauses ((none))") passes on P and n4c alone: T1 #141 or an interaction
(Menu Notes / CT Core narrowing; laptop scheduled task ns-chain-1022w also narrowing). Train 10 = #142 + #144 after
trains 8 and 9 merge.

New rules today (CLAUDE.md on feature/menu, "GPU for logic e2e"): every e2e run is `E2E_GPU=1` on both machines
(laptop full run 14 min vs 34 in software); a GPU failure counts. Desktop: `heavy.lock` (check, software) plus a
second GPU-only lane `heavy2.lock` on 4192 when CPU < 50%. Laptop: one slot, full runs at E2E_JOBS=2. A PR enters a
train only when every suite it touches ran to completion and passed on the GPU (STATE "Known"). A "stopped" background
runner can survive on Windows: taskkill /T /F and confirm.

Train 9 = train/9 b0cb16b6 (#136 P d98262dc, #139 N4c 5f6a0d9d, #141 T1 vent-kick), laptop GPU full run from ~21:27
with a CPU / GPU / RAM sampler (scratch/runs/load-train9.csv; Michael asked for the load numbers). On a pass, from
C:/NightShift/Mobile-Coop-train: `node scripts/merge-train.mjs release 9 4.59.0 "<title>" --dry-run`, then for real.
On a failure: narrow per member head on the laptop GPU, the member's lead fixes.

Train 8 (#119 N4b + #138 N2, which contains #135 N1) was RED on 4cc73665: e2e-studio :468 reset pose (role B on "hold
at 0", bones 120-130 deg) = #119's (Course Ready fixing); e2e-anim "run 90: the feet never cross (-17.4 cm)" and e2e-clip
"crouched holstered ... min -3.2 cm" = N1's own (CT Core fixing on feature/anim-natural-n2). When both fix shas land,
rebuild: `node scripts/merge-train.mjs build 8 feature/anim-n4b feature/anim-natural-n2` (after train 9 merges, so
master moves first; resolve only CHANGELOG / package), laptop GPU full run, release 4.60.0. #135 shows merged then.

Open work (each job's resume file has the detail):
- CT Core (top): mocap-trial (feature/mocap-trial; docs/mocap-trial/: CMU only, "Mocap locomotion" toggle off by
  default, clip-feet mode, side-by-side GPU sheets for Michael next; more CMU takes approved); #138 N2 fix round
  (the two N1 failures). Resume: docs/orchestrator/resume-ct-core.md on feature/menu.
- Menu Notes: n4d (feature/anim-n4d on n4c; takedown / grab-kill contact on the gameplay moment, M1 "Faster arm";
  checker PASS, suites running) -> PR -> train 10. Resume: docs/anim-natural/RESUME-menu-notes.md on feature/anim-natural.
- Course Ready: sector-fixes R fix round (S1 monorail, S3 climbs under the 1.63 m roof, plus Michael's "Add another"
  S2 co-op route with >= 0.5 m solo margin) -> PR -> train 10; #119 studio reset fix -> train 8. Resume:
  docs/marlow-bays/RESUME-trackA.md on feature/marlow-bays.
- Character Build: train 9 verdict + load numbers, then train 8 rebuild; test-speed-2 levers held (GPU made them minor);
  d7571102 proof after train 8. Resume: docs/flake-fix/STATE.md on feature/flake-fix.
Michael's answers today are in ROADMAP "Decided" (GPU tests, mocap, warehouse L1-L15 approved and restart after
Marlow Yard, R second S2 route, vent pad = keyboard, strike "Faster arm", CMU downloads).

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
Night Shift | Orchestrator (account swap). Resume from docs/orchestrator/HANDOFF.md and docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. First: HANDOFF "State at the switch" (release train 9 if the laptop passed it, rebuild train 8 when its fixes land; check C:/NightShift/heavy.lock and heavy2.lock: a lock with no live node process is stale, ask Michael to delete it, since sessions' permission checks block that delete). Then give Michael each session's prompt from HANDOFF "In the new account", one at a time, with session title, model and effort, as the last thing in the message. Recreate the usage and bottleneck cron (17, 37, 57 past) with the prompt in STATE "Cron prompt" and check get_usage now. Swap back to the other account when this account's 5-hour window reaches ~98% (HANDOFF top). Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. CT Core Build
```
Night Shift | CT Core Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Current jobs: mocap-trial (top priority, feature/mocap-trial, docs/mocap-trial/) and the #138 N2 fix round (N1's run 90 feet crossing and crouched-holstered clip). Scripts from the old session may have died: a C:/NightShift/heavy.lock or heavy2.lock naming CT Core Build with no node process running is stale; tell the orchestrator. Every e2e run is E2E_GPU=1. You are the overflow session (STATE "Pacing"). Message "Night Shift | Orchestrator" at each slice and PR.
```

### 3. Menu Notes Build
```
Night Shift | Menu Notes Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch feature/anim-natural; git pull first). Current job: anim-n4d in C:/NightShift/Mobile-Coop-anim-n4d (feature/anim-n4d, docs/anim-natural/n4d/): its GPU suites, then the PR (stacked on #139). Every e2e run is E2E_GPU=1. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 4. Course Ready Build
```
Night Shift | Course Ready Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (git fetch; git show origin/feature/marlow-bays:docs/marlow-bays/RESUME-trackA.md). Current jobs: the sector-fixes R fix round (C:/NightShift/Mobile-Coop-sector-fixes-r: S1 / S3 route fixes plus a second S2 co-op route) and the #119 N4b studio reset fix (feature/anim-n4b). Every e2e run is E2E_GPU=1. A C:/NightShift/heavy.lock or heavy2.lock naming Course Ready with no node process running is stale; tell the orchestrator. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 5. Character Build (laptop)
```
Night Shift | Character Build (account swap, laptop, the test runner). Read CLAUDE.md "Sessions" ("Main test machine: the laptop"), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). Your last chain (C:/NightShift/scratch/chain-1022*.ps1, newest) may still be running: check its results in C:/NightShift/scratch/runs before starting anything. Take run requests from the orchestrator and job leads; at most one full run at a time. Message "Night Shift | Orchestrator" with each verdict.
```
