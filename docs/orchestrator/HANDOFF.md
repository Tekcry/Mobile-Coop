# Account handoff

Michael (2026-10-22 ~19:15): "Now, swap back once the next 5h limit is reached on the other account". 22:15: "dont try
save tokens, i will reset usage as soon as you hit 100%": sessions run to 100% (no early stops); at 100% Michael resets
(the swap back to the first account) and pastes the orchestrator prompt below.
Repeat as long as it pays. Earlier handoffs (2026-10-21, 2026-10-22 13:10, 19:25) are in git history.

## State at the switch (2026-10-22 ~22:29, 99% save point; Michael: "make 99% a save point and we can run a clear on all sessions again")
Update 23:45: master v4.61.0 (train 8 #157, af56ab43, dev moved); STATE "Now" top entry has the live state.
Master v4.58.3 (#146 decisions G229-G269, cb198a91; 4.58.2 #143, 4.58.1 #140, 4.58.0 train 7). /preview/ = dev = cb198a91.

Rules today (CLAUDE.md on feature/menu "GPU for logic e2e"; STATE "Known"): every e2e run E2E_GPU=1, a GPU failure counts;
desktop heavy.lock (check / software) + heavy2.lock GPU lane on 4192 when CPU < 50%; laptop trial (Michael ~21:50): full
runs JOBS=3 + a second single-suite slot on 4192, kept only if times within ~15%, no new load failures, CPU < ~90%.
A PR enters a train only when every suite it touches ran to completion on the GPU. Stop runners with taskkill /T /F.
Long runs go detached (scheduled tasks) so a session end does not kill them.

Train 9 = train/9 765162a6 (#136 P, #139 N4c, #141 T1, #148, #147): GREEN on its code (34/35 at JOBS=3; e2e-netmove's
10 cm ankle compare read 10.7 cm under load, and it passed solo twice). Release 4.59.0 started ~22:30 as a detached process
(log C:/NightShift/scratch/runs/release-train9.log): check it merged (gh pr list --head train/9 --state all), the
v4.59.0 tag and dev; if it died, rerun merge-train.mjs release 9 4.59.0 "Sector Ops laser panels, hand swap and elbow
strike, vent kick, touch and GPU test fixes" from C:/NightShift/Mobile-Coop-train. Then add the ROADMAP Done row.
Laptop JOBS=3 trial: wall 443 s vs 740 s (-40%), times within 15%, CPU avg 40%, but a NEW load failure (the netmove
compare). Michael (~22:32): "Keep 3, fix the test": laptop stays at JOBS=3 plus the second slot; Course Ready fixes the
netmove compare on sim time (feature/netmove-compare). Mocap checker (Course Ready) at 06e773e1: FIX (walk-turn hand-off
pelvis pops 5.8 cm/frame, start toe pop 26 deg/frame; switch off bit-identical, no slide): CT Core's fix round.

Train 8 next: #119 N4b e957db2f (ready) + #138 N2 (contains N1): fix round 2 running (run 180 planted contact 14 cm; then
merge master 4.58.3, rerun its six GPU suites, send the sha). Build after train 9 merges, from C:/NightShift/Mobile-Coop-train:
merge-train.mjs build 8 feature/anim-n4b feature/anim-natural-n2, laptop full run, release 4.60.0.
4.59.0 MERGED (#151, 2f1961ad, ~22:32; /preview/ = dev = 2f1961ad): add its ROADMAP Done row if missing.
Train 10 = train/10 0c6bf0bd (#142 n4d, #145 lamp-plugin-gap), laptop full run (JOBS=3) started ~22:35. Left out on
conflicts with 4.59.0: #144 R (warehouseOps / warehouseSectors vs P), #150 gpu-waits-sweep (e2e-menus), and #149
touch-fling-note (backlog.md). Owners merge master (Course Ready: R, #150; Character Build: #149), then train 11 with
them; train 8 (#119 + #138) builds as soon as #138's six GPU suites pass (detached run /c/NightShift/n138-e2e.out).

Open work (each job's resume file has the detail):
- CT Core: mocap-trial first cut feature/mocap-trial 06e773e1 (clips a05bdde7; ?mocap=1 or Settings > Gameplay > "Mocap
  locomotion", off by default; 15 gap takes downloaded); its GPU suites queued (/c/NightShift/mt-e2e.out); N2 round 2.
  Resume: docs/orchestrator/resume-ct-core.md on feature/menu.
- Course Ready: fresh checker on mocap-trial 06e773e1 (C:/NightShift/Mobile-Coop-mocap-check; old-limit numbers are notes
  for Michael, BRIEF A4). Resume: docs/marlow-bays/RESUME-trackA.md on feature/marlow-bays.
- Menu Notes: the mocap side-by-side GPU sheets (feature/mocap-sheets, current vs mocap) and a Sector Ops strip-light look
  (Waiting item 5). Resume: docs/anim-natural/RESUME-menu-notes.md on feature/anim-natural.
- Character Build: train 9 verdict + trial numbers, then the train 8 rebuild; second slot for single suites.
  Resume: docs/flake-fix/STATE.md on feature/flake-fix.
Michael's answers today: ROADMAP "Decided" and DECISIONS G229-G269.

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
Night Shift | Orchestrator (account swap). Resume from docs/orchestrator/HANDOFF.md and docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. First: HANDOFF "State at the switch" (release train 9 if the laptop passed it, rebuild train 8 when its fixes land; check C:/NightShift/heavy.lock and heavy2.lock: a lock with no live node process is stale, ask Michael to delete it, since sessions' permission checks block that delete). Then give Michael each session's prompt from HANDOFF "In the new account", one at a time, with session title, model and effort, as the last thing in the message. Recreate the usage and bottleneck cron (17, 37, 57 past) with the prompt in STATE "Cron prompt" and check get_usage now. At 99% of the 5-hour window every session saves and is cleared (STATE "Pacing", Michael 22:20). Short replies, native multiple choice only, hyphens not em dashes.
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
