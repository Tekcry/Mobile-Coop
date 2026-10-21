# Account handoff (weekly limit)

Michael (2026-10-21 ~07:00): "use the remaining weekly usage as normal. Make more progress and we'll move all jobs to
another account when you hit the limit. Set 98% weekly usage to pause everything, save, and set up orchestrator to
deliver steps, prompts, models one at a time in the new account to resume everything". Moved to 99% (~09:45: "Run to
99% capacity then do handoff prompts"). Triggered by Michael at ~11:40 (weekly 97%): "its time to swap to another
account".

## State at the switch (2026-10-21 ~11:40)
Master v4.32.3 (15f487b9), /preview/ = dev = master. Every session was told to pause, commit, push and save its STATE.
In flight when paused (both test runs are detached scripts that finish on their own and delete their machine's
heavy.lock in a finally block; still check the lock is gone, and that no node process from that folder runs, before a
heavy run):
- PR #80 tuner-ui (feature/tuner-ui @ 8ce854e7, minor): checker PASS, check green. Laptop full e2e (E2E_JOBS=1):
  C:/NightShift/scratch/runs/tunerui-pr80-8ce854e7/summary.txt on the LAPTOP ("DONE" on its last line when finished).
  Pass -> merge as 4.33.0 (STATE.md "Merge procedure").
- PR #79 gl-warning-fix (feature/gl-warning-fix @ 005a4cfa, patch): src/core/babylon.ts defers deleting a
  still-linking parallel-compile program; E2E_GPU e2e-desktop PASS on 09520e9e; checker FIX, both items done in
  005a4cfa (a Babylon 9.29.0 upgrade-guard test, an isProgram guard on context restore); branch head 1c479d32 adds STATE
  only. Still owed: the GPU e2e-desktop rerun on 005a4cfa (Menu Notes, E2E_GPU=1, port 4189). Desktop full e2e (E2E_JOBS=2, started 11:33, 40-60 min): C:/NightShift/scratch/runs/desktop-pr79-005a4cfa/
  summary.txt on the DESKTOP; heavy.lock line "CT Core Build | test runner pr79-005a4cfa | 11:33". Pass -> merge as a
  patch.
- coop-torches (feature/coop-torches, Course Ready): PROTOCOL_VERSION 25, the torch bit in the enemy snapshot, the client
  TorchMirror, the e2e-coop torch block; left: tests/coopTorches.test.ts, docs, check, PR, full e2e.
  Resume: docs/coop-torches/STATE.md on that branch.
- CT Core's resume point: docs/anim-rework/STATE.md "## Pause" on feature/ct-prototype (ce331245; docs PR later).
Parked, waiting on Michael: #67 S2b walk (step length vs the wall peek; S2B-REPORT "## #67 parked" on feature/anim-s2b),
campaign-spec (two rule questions, ROADMAP "Waiting on Michael").

## In the new account
Michael signs in to the other account in the desktop app (and on the laptop for Character Build), then pastes the
orchestrator prompt (below) into a new session. The new orchestrator gives each next prompt with its session title,
model and effort, one per message, as the last thing in that message, only when that work is next. Sessions are new
(history stays with the old account): each prompt stands alone; the repo docs carry everything.

| Order | Session title | Model | Effort | Where |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | Opus 5.5 | high | desktop |
| 2 | Night Shift \| Character Build | Opus 5.5 | medium | laptop (Remote Control) |
| 3 | Night Shift \| Course Ready Build | Opus 5.5 | medium | desktop |
| 4 | Night Shift \| CT Core Build | Opus 5.5 | high | desktop: desktop test runner, #67 when Michael answers |
| 5 | Night Shift \| Menu Notes Build | Opus 5.5 | high | desktop: only for a #79 fix round or new UI work |

### 1. Orchestrator
```
Night Shift | Orchestrator (new account). Resume from docs/orchestrator/STATE.md and docs/orchestrator/HANDOFF.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git fetch; merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Sessions from the old account are gone: start each job's session by giving Michael its prompt from HANDOFF.md "In the new account", one at a time, with session title, model and effort, as the last thing in the message. First: read the desktop's #79 result (C:/NightShift/scratch/runs/desktop-pr79-005a4cfa/summary.txt) and get the laptop's #80 result through Character Build; merge what passed using STATE.md "Merge procedure". Check get_usage on each wake. Short replies, native multiple choice only, hyphens not em dashes.
```

### 2. Character Build (laptop)
```
Night Shift | Character Build (new account, laptop, the test runner). Read CLAUDE.md "Sessions" ("The laptop is the test runner") and docs/orchestrator/HANDOFF.md. Check C:/NightShift/heavy.lock on this laptop (remove it only if no e2e / node process from C:/NightShift/Mobile-Coop-testrun is running). Report to "Night Shift | Orchestrator" the result in C:/NightShift/scratch/runs/tunerui-pr80-8ce854e7/summary.txt (PR #80 tuner-ui @ 8ce854e7). If it has no "DONE" line and nothing is running, rerun npm run check + the full e2e on 8ce854e7 (worktree C:/NightShift/Mobile-Coop-testrun, E2E_PORT=4191, E2E_JOBS=1, BelowNormal). Then take run requests from the orchestrator and job leads, one at a time, replying with pass / fail per suite.
```

### 3. Course Ready Build
```
Night Shift | Course Ready Build (new account). Read CLAUDE.md, docs/ROADMAP.md, then docs/coop-torches/BRIEF.md and STATE.md on feature/coop-torches. Resume job coop-torches in C:/NightShift/Mobile-Coop-coop-torches (git pull; merge origin/master): finish tests/coopTorches.test.ts, the docs, npm run check, e2e-coop + e2e-netmove, then a PR and ask "Night Shift | Character Build" for the full e2e, copying "Night Shift | Orchestrator". One checker, one fix round.
```

### 4. CT Core Build
```
Night Shift | CT Core Build (new account). Read CLAUDE.md, docs/ROADMAP.md, then docs/anim-rework/STATE.md "## Pause" on feature/ct-prototype. Check C:/NightShift/heavy.lock on the desktop: if it holds the pr79-005a4cfa line and no node process from C:/NightShift/Mobile-Coop-testrun-desktop runs, delete the line. Report the #79 result (C:/NightShift/scratch/runs/desktop-pr79-005a4cfa/summary.txt) to "Night Shift | Orchestrator". Then act as the desktop test runner when asked. #67 (S2b walk) stays parked until Michael picks step length vs the wall peek.
```

### 5. Menu Notes Build (only when needed)
```
Night Shift | Menu Notes Build (new account). Read CLAUDE.md, docs/ROADMAP.md, then docs/gl-warning-fix/STATE.md and CHECK.md on feature/gl-warning-fix (C:/NightShift/Mobile-Coop-gl-warning-fix). PR #79 defers deleting a still-linking parallel-compile program in src/core/babylon.ts. Do what the orchestrator asks: a fix round from the checker or the full e2e result, push, and tell "Night Shift | Orchestrator" the head.
```
