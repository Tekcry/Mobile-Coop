# Orchestrator - resume point (2026-10-19 16:30 Sydney)

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
- Auto mode blocks branch deletion, and (16:25) blocked `gh pr merge 18` as "merge without review". When it blocks,
  give Michael the one-line merge command; after he merges, tag and move `dev` yourself.
- Priority (Michael, 16:30): the co-op training course (CT Core) first; Sector Ops low priority, spare capacity only
  (ROADMAP.md "Priority").

## Master
v4.6.5 (7c950acc). Tags v4.0.0-v4.6.5. Done today: #12 anim-cleanup 4.5.0, #13 phone launch 4.6.0, #11 docs 4.6.1,
#14 versions 4.6.2, #15 process audit 4.6.3, #16 laptop slot rule 4.6.4, #17 co-op test fix 4.6.5 (KNOWN_FLAKY is
e2e-pad only now).
Pending merge: #18 e2e-menus slider fix, set to 4.6.6 (21dda3e0), CI green; Michael merges (auto mode blocked it).
Full e2e skipped on #18: only scripts/e2e-menus.mjs changed and it passed 6 runs on the laptop.

## Sessions (all report to "Night Shift | Orchestrator"; every session was cleared once at 16:00)
| Session | Where | Address | Job now |
| --- | --- | --- | --- |
| CT Core Build | desktop, C:/NightShift/Mobile-Coop-ct-prototype, feature/ct-prototype | `Night Shift | CT Core Build` (local) | First priority. Master 4.6.5 merged and pushed (82c8c6cb); slices D + E running (docs/ct-prototype/DE-BRIEF.md: holster hand, shimmy hands, drainpipe knee flip, ledge climb-up via a knee plant). /ct/ stays on 87514ed1 (B + C, label v4.0.0) until D + E (Michael, 16:05). It owns the e2e-ctcourse station 2 ledge-hang failure (under 4-at-a-time load; solo rerun in the D + E run). |
| Sector Ops Build | desktop, C:/NightShift/Mobile-Coop-sector-ops, feature/sector-ops | `Night Shift | Sector Ops Build` (local) | Low priority, spare capacity only (16:30). Slice 2 for 3 sections (M7): step 1 pushed (ca7fcfd2), step 2 (geometry, connectors, checkpoint) building. A11 (stars in kv `sector:ops`) and A12 (re-cut: service entrance / racking / factory floor + mezzanine + offices) kept by Michael, plus M8 (relayed 16:20): multiple routes to each objective and through each section, guards spread so one can be taken out silently away from the others; room to manoeuvre beats guard count. Check M8 when reviewing slice 2. |
| Character Build | laptop (second heavy slot) | bridge `session_015wU8VbanFb8zVwRuSMa9x7` (delivery confirmed 16:00) | The laptop test runner (CLAUDE.md "Machines", Michael 16:30): runs CT Core's, then Sector Ops', logic e2e on pushed commits in C:/NightShift/Mobile-Coop-testrun. Between requests: the unit tests that time out under load get their own timeouts (a small fix PR). #18 done, waiting for the merge. |

Known clashes to handle at merge time:
- Sector Ops' lobby hides Infiltration, which e2e-coop's match (A1, coop-tests) uses. When Sector Ops merges, e2e-coop
  moves to Sector Ops or Course.
- Sector Ops also edits scripts/e2e-menus.mjs: after #18 merges, it merges master and keeps #18's condition wait.

## Waiting on Michael
- Merge #18: `gh pr merge 18 --merge --repo Tekcry/Mobile-Coop` (then tag v4.6.6 and move dev).
- Delete the merged branch feature/ct-research (`git -C C:/NightShift/Mobile-Coop-menu push origin --delete feature/ct-research`).
- The audit's branch and worktree list (docs/process-audit/REPORT.md section 5) is for him to prune.

## Next for the orchestrator
1. After #18 merges: tag v4.6.6, move dev, merge master into feature/menu, then the test-runner rule PR (4.6.7).
2. CT Core's D + E (first priority), then the ct-prototype PR to master once Michael has walked the slices (a minor step).
3. Sector Ops (spare capacity): slice 2 for 3 sections, then its PR (a minor step; fix e2e-coop's match at that merge).
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
Orchestrator: resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Check what each session has reported since 16:30 (CT Core, Sector Ops, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```
