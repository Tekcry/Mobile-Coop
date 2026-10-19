# Orchestrator - resume point (2026-10-19 21:50 Sydney)

Read CLAUDE.md (above all "Sessions": the orchestrator, machines, test tiers, versions) and docs/ROADMAP.md first.
Work folder for orchestrator docs: C:\NightShift\Mobile-Coop-menu (branch feature/menu; merge origin/master into it
before each docs batch, then a PR to master as a patch version).

## Account switch (start prompts for every session: docs/orchestrator/NEW-ACCOUNT.md) (Michael, 21:45: "I will be out of context soon, can I easily start these projects in another account")
Everything needed to resume is in git: this file, docs/ROADMAP.md, and each job's `docs/<job>/STATE.md` with its own
resume prompt. What does not carry over to a new Claude account:
- Sessions and their names. Claude Desktop sessions belong to the account that started them. In the new account, start
  one new session per active job (table below) with that job's resume prompt, give it the same title (the title is
  the address other sessions message), and turn Remote Control on for each.
- The dashboard artifact (https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw) and its answers database belong to the
  old account. Either share it with edit access to the new account (the page's Share menu, from the old account), or
  the new orchestrator publishes docs/orchestrator/dashboard.html as a new artifact and writes its URL here.
  Michael's answers so far are copied into git (docs/ct-prototype/WALK-2026-10-19.md; earlier ones in the roadmap).
- Account connectors (Gmail, Drive and so on) are not used by this project. GitHub works through the machine's `gh`
  login and git credentials, not the Claude account, so pushes, PRs and merges keep working.
- Memory in ~/.claude is per machine, not per account, but CLAUDE.md says to rely on git only.

Active jobs to restart in a new account (each resume prompt is in that job's STATE.md, fenced, at the end):
| Session title | Machine, folder, branch | Resume from | Where it stands (21:50) |
| --- | --- | --- | --- |
| Night Shift | Orchestrator | desktop, C:/NightShift/Mobile-Coop-menu, feature/menu | this file ("Resume prompt" below) | see "Next for the orchestrator" |
| Night Shift | CT Core Build | desktop, C:/NightShift/Mobile-Coop-ct-prototype, feature/ct-prototype | docs/ct-prototype/STATE.md | starting a slice on the clear items of Michael's walk notes; fine-tuning waits for his new CT footage |
| Night Shift | Menu Notes Build | desktop, C:/NightShift/Mobile-Coop-menu-notes, feature/menu-notes | docs/menu-notes/STATE.md | slices 1-4d done (2151cc85, 048c9d89); laptop rerun, then full e2e, then its PR |
| Night Shift | Character Build | laptop, test runner (C:/NightShift/Mobile-Coop-testrun) | CLAUDE.md "Machines" + docs/lightfield-heap/STATE.md | runner for CT Core then Menu Notes; its own job: lightfield-heap (feature/lightfield-heap 6016e700), 5 loaded check runs, then a PR |
| Night Shift | Sector Ops Build | desktop, C:/NightShift/Mobile-Coop-sector-ops (feature/sector-restart) | docs/sector-restart/STATE.md | Michael's M9 bug: checkpoint restart as a clean start; spare capacity |

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
v4.7.2 (#23, ce1da1a3). Tags v4.0.0-v4.7.2. Today: #12 4.5.0, #13 4.6.0, #11 4.6.1, #14 4.6.2, #15 4.6.3, #16 4.6.4,
#17 4.6.5, #18 4.6.6, #19 4.6.7, #20 4.6.8, #21 Sector Ops 4.7.0 (G184-G191), #22 grate-kick flake 4.7.1, #23 build
label commit 4.7.2. /preview/ = dev = ce1da1a3. /ct/ = ct-movement = 624fca6b (v4.7.0 PREVIEW CT; moved by the
orchestrator at 21:15 because Marlow Yard was not reachable from the 4.6.5 menu).

## Known clashes to handle at merge time
- Net protocol: master is at 24 (Sector Ops). CT Core takes 25 if it changes the wire, and reruns e2e-coop /
  e2e-netmove / e2e-ctcourse.
- characterRig.ts: likely in CT Core's next slice; Menu Notes did not touch it (the forehead glow was a menu light).
- Open for CT Core: the keyboard vent (Space starts it, an unseen E hold makes the release a kick; T1).

## Waiting on Michael
- New CT footage for the movement fine-tuning (legs, upper body in ADS, shimmy swing, drainpipe, pistol).
- Delete the merged branch feature/ct-research (`git -C C:/NightShift/Mobile-Coop-menu push origin --delete feature/ct-research`).
- The audit's branch and worktree list (docs/process-audit/REPORT.md section 5) is for him to prune.

## Next for the orchestrator
1. CT Core: review its clear-items slice (WALK-2026-10-19.md "Clear now"), then pass Michael's footage on when it
   arrives. The ct-prototype PR waits until Michael is happy with the movement, or until he asks for a merge.
2. Menu Notes: review and merge its PR (a minor step, 4.8.0 if it is next). Before its PR, relay two items from CT Core (22:30): src/ui/screens/settingsScreen.ts:155 "Default shoulder" now does nothing (F1: holstered is always right; remove the row); src/ui/screens/controlsScreen.ts:23 "LT / RT: Aim / fire" is wrong since F1a (match CT Core's bindings). CT Core slice F WIP is at 980a9695 (check, e2e, sheets, independent check still to run); F7 answer given to Michael (old saved pad settings had speed on D-pad left / right; a settings migration moves them).
3. Character Build: review and merge lightfield-heap (a patch).
4. Sector Ops: the PC perf run with full guard counts (G187), when the desktop is free.
5. Republish the dashboard after every roadmap change (see "Account switch" for who owns it; source
   docs/orchestrator/dashboard.html; it declares `db`; answers in collection `answers`).

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
Night Shift | Orchestrator. Resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first, then merge origin/master into feature/menu). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. If this is a new Claude account, follow "Account switch" first. Check what each session has reported since 21:50 (CT Core, Menu Notes, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```
