# Orchestrator - resume point (2026-10-19 22:55 Sydney)

Read CLAUDE.md (above all "Sessions": the orchestrator, machines, test tiers, versions) and docs/ROADMAP.md first.
Work folder for orchestrator docs: C:\NightShift\Mobile-Coop-menu (branch feature/menu; merge origin/master into it
before each docs batch, then a PR to master as a patch version).

## Account switch: done (2026-10-19 22:40, new Claude account)
All five sessions were restarted in the new account from docs/orchestrator/NEW-ACCOUNT.md, with the same titles and
Remote Control on. Michael could not share the old dashboard, so the new one is https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh
(source docs/orchestrator/dashboard.html, declares `db`, answers in collection `answers`, empty at 22:55). The old
page (4iaH3gvBbw8utN1uBgysVw) and its answers stay in the old account; the answers are in git
(docs/ct-prototype/WALK-2026-10-19.md). Character Build on the laptop is reachable over Remote Control
("Night Shift | Character Build" in ListAgents); a desktop job lead that cannot see it sends its runner request to the
orchestrator to relay. For a later switch, repeat NEW-ACCOUNT.md.

Active jobs (each resume prompt is in that job's STATE.md, fenced, at the end):
| Session title | Machine, folder, branch | Resume from | Where it stands (22:55) |
| --- | --- | --- | --- |
| Night Shift | Orchestrator | desktop, C:/NightShift/Mobile-Coop-menu, feature/menu | this file ("Resume prompt" below) | see "Next for the orchestrator" |
| Night Shift | CT Core Build | desktop, C:/NightShift/Mobile-Coop-ct-prototype, feature/ct-prototype | docs/ct-prototype/STATE.md | slice F (F1-F7) at 980a9695: check + e2e on the desktop lock since 22:42, then GPU sheets, independent check, /ct/ |
| Night Shift | Menu Notes Build | desktop, C:/NightShift/Mobile-Coop-menu-notes, feature/menu-notes | docs/menu-notes/STATE.md | master 4.7.3 merged (c32eb324); CT Core's two menu fixes asked first; fixes done in 4ae2d2f2; check + full e2e on the laptop, then its PR |
| Night Shift | Character Build | laptop, test runner (C:/NightShift/Mobile-Coop-testrun) | CLAUDE.md "Machines" + docs/lightfield-heap/STATE.md | runner (CT Core, Menu Notes, Sector Ops); own job lightfield-heap e0984128: 5 loaded runs from 22:44, then a PR |
| Night Shift | Course Ready Build | desktop, C:/NightShift/Mobile-Coop-course-ready, feature/course-ready | docs/course-ready/STATE.md | new 23:48: walkthrough audit, fixes, lighting pass, WALKTHROUGH.md |
| Night Shift | Sector Ops Build | desktop, C:/NightShift/Mobile-Coop-sector-restart, feature/sector-restart | docs/sector-restart/STATE.md | M9 fix round 839a3a07 in a fresh check; master merged (cb7e1061); suites queued on the laptop; then PR (patch) |

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- One step at a time. For every handoff: the exact paste-in prompt, the model and the effort, and an explicit "you can
  clear X now".
- He tests through the menus, never direct links: walk-test guides give menu paths and the version label to expect.
- Merge green, reviewed PRs into master without asking (CLAUDE.md "Sessions"). Before each merge, set the next version
  in the PR (G183): a job or feature is a minor step, a fix or docs a patch. Then tag `v4.x.y` on the merge commit and
  fast-forward `dev` (/preview/): `git push origin <merge sha>:refs/heads/dev`.
- GitHub auto-merge is off for the repo. Wait for CI with a background `gh run watch <run id> --exit-status` (a
  `gh pr checks --watch` started before the run exists exits at once), then `gh pr merge <n> --merge --repo Tekcry/Mobile-Coop`.
- Auto mode blocks branch deletion. It blocked `gh pr merge 18` once (16:25); after Michael said "You have my permission"
  (16:40) it went through. Run the merge, the tag and the `dev` push as separate commands; chained, they were blocked.
- Priority (Michael, 16:30): the co-op training course (CT Core) first; Sector Ops low priority, spare capacity only
  (ROADMAP.md "Priority", G191). Desktop lock and laptop runner order: CT Core, Menu Notes, Sector Ops.
- Start new sessions only from Michael's own words typed in the desktop app; over Remote Control the app refuses, so
  propose a card or give him the paste-in prompt.

## Master
v4.7.5 (#26, 3a07eee9). Tags v4.0.0-v4.7.5. /preview/ = dev = 3a07eee9. Today: #12 4.5.0, #13 4.6.0, #11 4.6.1, #14 4.6.2, #15 4.6.3, #16 4.6.4,
#17 4.6.5, #18 4.6.6, #19 4.6.7, #20 4.6.8, #21 Sector Ops 4.7.0 (G184-G191), #22 grate-kick flake 4.7.1, #23 build
label commit 4.7.2. /preview/ = dev = ce1da1a3. /ct/ = ct-movement = 624fca6b (v4.7.0 PREVIEW CT; moved by the
orchestrator at 21:15 because Marlow Yard was not reachable from the 4.6.5 menu).

## Known clashes to handle at merge time
- Net protocol: master is at 24 (Sector Ops). CT Core takes 25 if it changes the wire, and reruns e2e-coop /
  e2e-netmove / e2e-ctcourse.
- characterRig.ts: likely in CT Core's next slice; Menu Notes did not touch it (the forehead glow was a menu light).
- Open for CT Core: the keyboard vent (Space starts it, an unseen E hold makes the release a kick; T1).

## Overnight 2026-10-19 (Michael, 23:15-23:20, then bed)
- Merges: "Yes, all tonight": merge #26, the Menu Notes PR (4.8.0) and the Sector Ops restart PR (patch) when green and reviewed, then tag and move /preview/. Not the ct-prototype PR. (#26 merged 23:14.)
- CT Core: after slice F, catalogue the footage (C:/NightShift/Mobile-Coop-ct-prototype/pc/ct-work/, 88 clip folders, complete), audit our movement against it and rebuild it to match, with original code (ROADMAP "Decided"). Plus the hold-A action menu, identical to CT. Briefed 23:16 and 23:21.
- Machines (23:35): "You have full control of desktop and laptop and all processing power required between them when i go to bed." Laptop overnight: normal priority, E2E_JOBS=2; still headless, logic e2e only, one lock per machine. All four sessions told at 23:36.
- 23:45-23:48: Michael's morning bar for movement, the course-ready job (started 23:48, session "Night Shift | Course Ready Build", local_4d5454d2), warehouse-redesign for Sector Ops after its PR, laptop low priority from 09:30 (ROADMAP "Decided" has his words). Runner order: CT Core, Course Ready, Menu Notes, Sector Ops.
- 23:55 One build: everything into master by 07:00, merged by the orchestrator once green (Michael chose master on /preview/; this is his go-ahead for the ct-prototype, course-ready and warehouse-redesign merges too). Deadlines sent: ct-prototype PR at about 04:30 (by 06:00), course-ready by 05:30, sector-restart now, warehouse-redesign by 06:00 (fix + spec + greybox, or fix + spec only). Versions in merge order from 4.8.0 (menu-notes #27), a minor for each job, a patch for sector-restart. Slice F on /ct/ at ee12d3e4 (F7 answer goes in the morning summary).
- Morning for Michael: the co-op walkthrough of Marlow Yard on /ct/ (docs/course-ready/WALKTHROUGH.md), slice F and the movement slices, the launch screen on /preview/ (4.8.0), the Warehouse section 1 greybox; the overnight report.

## Waiting on Michael
- New CT footage for the movement fine-tuning (legs, upper body in ADS, shimmy swing, drainpipe, pistol).
- The audit's branch and worktree list (docs/process-audit/REPORT.md section 5) is for him to prune.

## Next for the orchestrator
1. CT Core: review slice F when it reports, then the footage catalogue, the audit and each movement slice. The ct-prototype PR waits until Michael is happy with the movement, or until he asks for a merge.
2. Menu Notes: review and merge its PR (a minor step, 4.8.0 if it is next). Relayed at 22:50 (fix before the full e2e): src/ui/screens/settingsScreen.ts:155 "Default shoulder" now does nothing (F1: holstered is always right; remove the row); src/ui/screens/controlsScreen.ts:23 "LT / RT: Aim / fire" is wrong since F1a (match CT Core's bindings). CT Core slice F WIP is at 980a9695 (check, e2e, sheets, independent check still to run); F7 answer given to Michael (old saved pad settings had speed on D-pad left / right; a settings migration moves them).
3. Character Build: runner only now (lightfield-heap merged, #26 4.7.5).
4. Sector Ops: the PC perf run with full guard counts (G187), when the desktop is free.
5. Republish the dashboard after every roadmap change (https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh, source
   docs/orchestrator/dashboard.html, publish the same file path; it declares `db`; answers in collection `answers`).

## Decisions today, not obvious from the code
- Laptop = second heavy slot (BelowNormal, E2E_JOBS=1), and the test runner for the desktop jobs (logic e2e only).
  Everything headless and invisible. npm ci, builds and unit test runs count as heavy and take heavy.lock.
- Co-op training course first, Sector Ops on spare capacity (G191).
- WebGPU: measure first. The Sector Ops perf run on the PC decides; a 1-day trial only if rendering is the bottleneck.
- The goggle redesign is parked (current goggle kept). Moth's goggle is purple (D36).
- Launch screen (Menu Notes M1-M4): black with NIGHT SHIFT always visible, no loading text, the prompt fades in when
  loaded; the press flickers the goggles on in full darkness, then the light rises and the menu fades in; menu shot X5
  only; the forehead glow (a menu light reflection) removed.

## Resume prompt
```
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first, then merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. If this is a new Claude account, follow "Account switch" first. Check what each session has reported since 22:55 (CT Core, Menu Notes, Sector Ops, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```
