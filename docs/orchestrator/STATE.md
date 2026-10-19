# Orchestrator - resume point (2026-10-19 20:45 Sydney)

Read CLAUDE.md (above all "Sessions": the orchestrator, machines, test tiers, versions) and docs/ROADMAP.md first.
Work folder for orchestrator docs: C:\NightShift\Mobile-Coop-menu (branch feature/menu; merge origin/master into it
before each docs batch, then a PR to master as a patch version).

## How Michael works with the orchestrator
- Short, plain replies. Native multiple-choice questions only. Hyphens, not em dashes.
- One step at a time. For every handoff: the exact paste-in prompt, the model and the effort, and an explicit "you can
  clear X now".
- Merge green, reviewed PRs into master without asking (CLAUDE.md "Sessions"). Before each merge, set the next version
  in the PR (G183): a job or feature is a minor step, a fix or docs a patch. Then tag `v4.x.y` on the merge commit and
  fast-forward `dev` (/preview/): `git push origin origin/master:refs/heads/dev`.
- GitHub auto-merge is off for the repo. Wait for CI with a background `gh run watch <run id> --exit-status` (a
  `gh pr checks --watch` started before the run exists exits at once), then `gh pr merge <n> --merge`.
- Auto mode blocks branch deletion. It blocked `gh pr merge 18` once (16:25); after Michael said "You have my permission"
  (16:40) it went through. Run the merge, the tag and the `dev` push as separate commands; chained, they were blocked.
- Priority (Michael, 16:30): the co-op training course (CT Core) first; Sector Ops low priority, spare capacity only
  (ROADMAP.md "Priority").

## Master
v4.7.0 (#21, fca0e267). Tags v4.0.0-v4.7.0. Done today: #12 anim-cleanup 4.5.0, #13 phone launch 4.6.0, #11 docs 4.6.1,
#14 versions 4.6.2, #15 process audit 4.6.3, #16 laptop slot rule 4.6.4, #17 co-op test fix 4.6.5 (KNOWN_FLAKY is
e2e-pad only now), #18 e2e-menus slider fix 4.6.6 (30eda5e6), #19 test runner rule 4.6.7, #20 unit timeouts 4.6.8 (global 120 s testTimeout), #21 Sector Ops 4.7.0 (G184-G191; e2e-traverse grate tap is a master flake, 1 in 3).

## Sessions (all report to "Night Shift | Orchestrator"; every session was cleared once at 16:00)
| Session | Where | Address | Job now |
| --- | --- | --- | --- |
| CT Core Build | desktop, C:/NightShift/Mobile-Coop-ct-prototype, feature/ct-prototype | `Night Shift | CT Core Build` (local) | First priority. D + E on /ct/ (0f91b0f0, 18:45). D2b running: shimmy 0.7 m/s with slower, wider hands (Michael 18:50) and the e2e-traverse shimmy reach (3.3 cm vs 3 cm). /ct/ moves only for D2b alone, else after Michael's B-E notes. |
| Sector Ops Build | desktop, C:/NightShift/Mobile-Coop-sector-ops, feature/sector-ops | `Night Shift | Sector Ops Build` (local) | Done: #21 merged as 4.7.0 (20:40), on /preview/. Idle until the PC perf run with full guard counts (G187). |
| Character Build | laptop (second heavy slot) | bridge `session_015wU8VbanFb8zVwRuSMa9x7` (delivery confirmed 16:00) | The laptop test runner (CLAUDE.md "Machines", Michael 16:30): runs CT Core's, then Sector Ops', logic e2e on pushed commits in C:/NightShift/Mobile-Coop-testrun. #18 and #20 merged; idle between requests. |
| Menu Notes Build | desktop, C:/NightShift/Mobile-Coop-menu-notes, feature/menu-notes | `Night Shift | Menu Notes Build` (local_52bd477a, Remote Control on) | Michael's 7 walk-test menu notes (docs/menu-notes/START.md, started 18:55 from master 4.6.8). Lock order: CT Core, Menu Notes, Sector Ops. PR to master (minor). |

Known clashes to handle at merge time:
- Closed: e2e-coop starts its matches through the session API, not the lobby, so Sector Ops hiding Infiltration does
  not affect it (passed on feature/sector-ops e20c3f30 with protocol 24). No edit.
- Sector Ops merged 4.6.8 (e20c3f30, #18's e2e-menus wait kept).
- Net protocol: master is at 24 (Sector Ops, 4.7.0) (syringes, client live section); CT Core also edits src/net (remoteAvatar.ts).
  CT Core takes 25 if it changes the wire; it merges master 4.7.0 first, and and reruns e2e-coop / e2e-netmove / e2e-ctcourse.

## Waiting on Michael
- Delete the merged branch feature/ct-research (`git -C C:/NightShift/Mobile-Coop-menu push origin --delete feature/ct-research`).
- The audit's branch and worktree list (docs/process-audit/REPORT.md section 5) is for him to prune.

## Next for the orchestrator
1. Laptop runner: Character Build serves CT Core first. Open from #20: lightField's heap check fails under load (ROADMAP "Later").
2. CT Core's D + E (first priority), then the ct-prototype PR to master once Michael has walked the slices (a minor step).
3. Sector Ops: merged (4.7.0). Next for it: the PC perf run with full guard counts (G187), when the desktop is free.
4. Republish the dashboard after every roadmap change: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw (source
   docs/orchestrator/dashboard.html; publish with `url`; it declares `db`; answers in collection `answers`).

## Decisions today, not obvious from the code
- Laptop = second heavy slot (BelowNormal, E2E_JOBS=1). Everything headless and invisible. npm ci, builds and unit test
  runs count as heavy and take heavy.lock. From 16:30 it is also the test runner for the desktop jobs (logic e2e only).
- Co-op training course first, Sector Ops on spare capacity (Michael, 16:30).
- WebGPU: measure first. The Sector Ops perf run on the PC decides; a 1-day trial only if rendering is the bottleneck.
- Sector Ops guards: 20-25 per section, a per-mode cap above MAX_ALIVE 12, measured on the PC.
- The goggle redesign is parked (current goggle kept). Moth's goggle is purple (D36).

## Resume prompt
```
Orchestrator: resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Check what each session has reported since 20:45 (CT Core, Sector Ops, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```
