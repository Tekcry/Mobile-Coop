# New-account start prompts (2026-10-19 22:10 Sydney)

Start each session in the Claude desktop app (Code tab), give it the exact title (the title is how sessions message
each other), pick the model and effort, paste the prompt, then turn Remote Control on. Start the orchestrator first.
Every job keeps its own resume prompt at the end of its STATE.md; these are copies.

| # | Title | Machine | Open in folder | Model, effort |
| --- | --- | --- | --- | --- |
| 1 | Night Shift \| Orchestrator | desktop | C:\NightShift\Mobile-Coop-menu | Opus, high |
| 2 | Night Shift \| CT Core Build | desktop | C:\NightShift\Mobile-Coop-ct-prototype | Opus, high |
| 3 | Night Shift \| Menu Notes Build | desktop | C:\NightShift\Mobile-Coop-menu-notes | Opus, high |
| 4 | Night Shift \| Sector Ops Build | desktop | C:\NightShift\Mobile-Coop-sector-restart | Opus, high |
| 5 | Night Shift \| Character Build | laptop | C:\NightShift\Mobile-Coop-testrun | Opus, medium |

## 1. Orchestrator
```
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first, then merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. This is a new Claude account: follow "Account switch" first. Check what each session has reported since 22:10 (CT Core, Menu Notes, Sector Ops, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```

## 2. CT Core Build
```
CT Core Build: RESUME. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, docs/ct-prototype/RULES.md and docs/ct-prototype/STATE.md, then carry on from STATE "Next" (slice F, docs/ct-prototype/F-BRIEF.md). CT Core has first claim on the desktop lock; when the desktop is busy, push and send named logic suites with the exact commit to "Night Shift | Character Build" (laptop). Before any heavy run check C:/NightShift/heavy.lock, write your line while you run, delete it after. Report to "Night Shift | Orchestrator". No em dashes.
```

## 3. Menu Notes Build
```
Night Shift | Menu Notes Build: RESUME. Folder C:/NightShift/Mobile-Coop-menu-notes, branch feature/menu-notes (git pull --ff-only; branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/menu-notes/BRIEF.md, PLAN.md and STATE.md, and continue from "Now" with the loop in docs/systems/session-method.md (full e2e with E2E_SUITE_TIMEOUT=900, then the PR). Report to "Night Shift | Orchestrator".
```

## 4. Sector Ops Build (job: sector-restart)
```
Night Shift | Sector Restart. You are the job lead for the sector-restart job (Sector Ops checkpoint restart, M9; low priority, after CT Core and Menu Notes). Work only in C:\NightShift\Mobile-Coop-sector-restart on branch feature/sector-restart (git pull --ff-only first). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, then docs/sector-restart/STATE.md and BRIEF.md, and docs/sector-ops/STATE.md for the Sector Ops background. Carry on from STATE "Now / Next" with an implementer and a fresh checker (docs/systems/session-method.md). Heavy runs only under C:/NightShift/heavy.lock when CT Core and Menu Notes are not waiting; otherwise light commands only and send suites to "Night Shift | Character Build" (branch, commit, suites). One PR to master (a patch). Report to "Night Shift | Orchestrator" when the PR is open.
```

## 5. Character Build (laptop)
```
Night Shift | Character Build: RESUME on the laptop (the second heavy slot). Read CLAUDE.md "Sessions" (above all "Machines" and "The laptop is the test runner") and docs/ROADMAP.md. You are the laptop test runner: when CT Core, Menu Notes or Sector Ops message you a branch, an exact commit and named suites, run them in C:/NightShift/Mobile-Coop-testrun detached at that commit (npm ci only when package-lock.json changed; npm run build; node scripts/run-e2e.mjs <suites>), E2E_PORT=4191, E2E_JOBS=1, BelowNormal, the laptop heavy.lock, one at a time in the order CT Core, Menu Notes, Sector Ops. Reply to the job lead with pass / fail per suite, the failing assert, the run time and the commit, and copy "Night Shift | Orchestrator". Between requests, your own job: lightfield-heap (git fetch; branch feature/lightfield-heap, folder C:/NightShift/Mobile-Coop-lightfield-heap, docs/lightfield-heap/STATE.md): finish the 5 loaded check runs, then one PR to master (the orchestrator sets the version). Headless only, never GPU or visual checks. No em dashes.
```
