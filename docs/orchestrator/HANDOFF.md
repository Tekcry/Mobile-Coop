# Account handoff

Michael (2026-10-22 ~19:15, old account's 5-hour window at 98%, reset 21:10): "Now, swap back once the next 5h limit
is reached on the other account". So: work moves to the other account now; when that account's 5-hour window reaches
~98%, everything saves and moves back here (this account's window is fresh after 21:10). Repeat as long as it pays.
Earlier handoffs (2026-10-21, 2026-10-22 13:10) are in git history.

## State at the switch (2026-10-22 ~19:25)
Master v4.57.0 (train 6 #133 = #122 + #123 + #127 + #128 + #129 + #131 + orchestrator docs, merge 703b5063; tag v4.57.0;
/preview/ = dev = 703b5063). Member PRs whose heads moved after train/6 may still show open: close each with a comment
naming #133 if its head is not in master (`gh pr view <n> --json state`).

Train 7 = train/7 9ff4542d (#132 N0 leftovers, #134 studio-pairs), pushed 19:25: the laptop's unattended chain picks it
up and runs its full e2e first (results in C:/NightShift/scratch/runs/<label>). On a pass, from C:/NightShift/Mobile-Coop-phone-native:
`node C:/NightShift/Mobile-Coop-merge-tools/scripts/merge-train.mjs release 7 4.58.0 "Anim Studio co-op pairs, animation audit scripts"`
(--dry-run first). #119 N4b was LEFT OUT: src conflicts with 4.57.0 in src/anim/animGraph.ts and src/player/player.ts;
Course Ready merges master into feature/anim-n4b, then train 8 with N1, N2, sector-fixes R and P.

Open work (each job's own resume file has the detail):
- CT Core: N1 (feature/anim-natural-n1 1135bc41, fresh checker was running, no laptop pre-run needed: PR -> train 7 or 8);
  N2 step 3 arms (feature/anim-natural-n2-s3 4e974ea1) being merged into N2 with master 4.56.0; then fix the run arm
  22 cm one-frame pop inside N2. Resume: docs/orchestrator/resume-ct-core.md on feature/menu.
- Course Ready: sector-fixes R (feature/sector-fixes-r e0e50027; uncommitted e2e WIP in C:/NightShift/Mobile-Coop-sector-fixes-r);
  next: commit the e2e, checker, laptop area suites (coop, netmove, sectorops), PR -> train 8. Resume: docs/marlow-bays/RESUME-trackA.md on feature/marlow-bays.
- Menu Notes: sector-fixes P (feature/sector-fixes-p db839845, PROTOCOL_VERSION 29, laptop suites running on 4191);
  next: checker, PR -> train 8. Resume: docs/anim-natural/RESUME-menu-notes.md on feature/anim-natural.
- Character Build: unattended chain (train 7 full, GPU full-run experiment, anim-natural GPU audit, test-speed-2), P singles.
  Resume: docs/flake-fix/STATE.md on feature/flake-fix.

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
Night Shift | Orchestrator (account swap). Resume from docs/orchestrator/HANDOFF.md and docs/orchestrator/STATE.md on feature/menu in C:/NightShift/Mobile-Coop-menu (git fetch; git pull; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. First: HANDOFF "State at the switch" (finish the train 6 release, build and push train 7). Then give Michael each session's prompt from HANDOFF "In the new account", one at a time, with session title, model and effort, as the last thing in the message. Recreate the usage and bottleneck cron (17, 37, 57 past) with the prompt in STATE "Cron prompt" and check get_usage now. Swap back to the other account when this account's 5-hour window reaches ~98% (HANDOFF top). Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. CT Core Build
```
Night Shift | CT Core Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Scripts from the old session may have died: a C:/NightShift/heavy.lock naming CT Core Build with no node process running is stale; delete it. You are the overflow session (STATE "Pacing"). Message "Night Shift | Orchestrator" at each slice and PR.
```

### 3. Menu Notes Build
```
Night Shift | Menu Notes Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch feature/anim-natural; git pull first). Current job: sector-fixes P in C:/NightShift/Mobile-Coop-sector-fixes-p (docs/sector-fixes/STATE.md there): fresh checker, then the PR. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 4. Course Ready Build
```
Night Shift | Course Ready Build (account swap). Read CLAUDE.md and docs/ROADMAP.md, then follow the resume prompt in the last fenced block of docs/marlow-bays/RESUME-trackA.md on origin/feature/marlow-bays (git fetch; git show origin/feature/marlow-bays:docs/marlow-bays/RESUME-trackA.md). Current job: sector-fixes R (C:/NightShift/Mobile-Coop-sector-fixes-r, uncommitted e2e WIP there). A C:/NightShift/heavy.lock naming Course Ready with no node process running is stale; delete it. Message "Night Shift | Orchestrator" at each slice and PR.
```

### 5. Character Build (laptop)
```
Night Shift | Character Build (account swap, laptop, the test runner). Read CLAUDE.md "Sessions" ("Main test machine: the laptop"), then follow the resume prompt in the last fenced block of docs/flake-fix/STATE.md on origin/feature/flake-fix (git fetch; git show origin/feature/flake-fix:docs/flake-fix/STATE.md). Your unattended chain (C:/NightShift/scratch/chain-1022n.ps1) may still be running: check its results in C:/NightShift/scratch/runs before starting anything. Take run requests from the orchestrator and job leads; at most one full run at a time. Message "Night Shift | Orchestrator" with each verdict.
```
