# Orchestrator - resume point (2026-10-19 15:30 Sydney)

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
- GitHub auto-merge is off for the repo. Wait for CI with a background `gh pr checks <n> --watch`, then
  `gh pr merge <n> --merge`.
- Auto mode blocks branch deletion. Michael runs those himself.

## Master
v4.6.4 (59f7a0da). Tags v4.0.0-v4.6.4. Done today: #12 anim-cleanup 4.5.0, #13 phone launch 4.6.0, #11 docs 4.6.1,
#14 versions 4.6.2, #15 process audit 4.6.3, #16 laptop slot rule 4.6.4.

## Sessions (all report to "Night Shift | Orchestrator")
| Session | Where | Address | Job | Clean point |
| --- | --- | --- | --- | --- |
| CT Core Build | desktop, C:\NightShift\Mobile-Coop-ct-prototype, feature/ct-prototype | `Night Shift | CT Core Build` (local) | Slices B + C (Sonnet implementer); scanner rule committed locally (fd963a1c), pushed with B + C; /ct/ = 1cb88756 (slice A) | B + C on /ct/ |
| Sector Ops Build | desktop, C:\NightShift\Mobile-Coop-sector-ops, feature/sector-ops | `Night Shift | Sector Ops Build` (local) | Slice 1 menus; RESEARCH.md + full PLAN.md for Michael's approval before slice 2 (M1-M6 in BRIEF.md) | Slice 1 committed + plan sent |
| Character Build | laptop (second heavy slot), C:/NightShift/Mobile-Coop-coop-tests, feature/coop-tests | bridge `session_01BohEsHtBRedHLw6s8tvqwm` (delivery not confirmed) | Co-op test fix: solo 3/3 and laptop full run 1 all pass (23 min); full run 2, then step 6 (KNOWN_FLAKY), then the PR | PR open |

Each session was asked (15:30) to message "<name>: clean point" with its STATE path and resume prompt. Michael clears
each one when it reports in.

## Waiting on Michael
- Approve Sector Ops' RESEARCH.md + PLAN.md (when sent).
- Delete the merged branch feature/ct-research (`git -C C:/NightShift/Mobile-Coop-menu push origin --delete feature/ct-research`).
- The audit's branch and worktree list (docs/process-audit/REPORT.md section 5) is for him to prune.

## Next for the orchestrator
1. The coop-tests PR: the PR-tier full e2e on the desktop (or accept the laptop's 2 full runs as that tier, since both
   ran the PR head), then the version (a patch, 4.6.5: tests only), merge, tag, /preview/.
2. CT Core's B + C, then the PR to master when Michael has walked the slices.
3. Sector Ops: relay the plan to Michael, then slices 2-3, then its PR (a minor step).
4. Republish the dashboard after every roadmap change: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw (source
   docs/orchestrator/dashboard.html; publish with `url`; it declares `db`; answers in collection `answers`).

## Decisions today, not obvious from the code
- Laptop = second heavy slot (BelowNormal, E2E_JOBS=1). Everything headless and invisible. npm ci, builds and unit test
  runs count as heavy and take heavy.lock.
- WebGPU: measure first. The Sector Ops perf run on the PC decides; a 1-day trial only if rendering is the bottleneck.
- Sector Ops guards: 20-25 per section, a per-mode cap above MAX_ALIVE 12, measured on the PC.
- The goggle redesign is parked (current goggle kept). Moth's goggle is purple (D36).

## Resume prompt
```
Orchestrator: resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Check what each session has reported since 15:30 (CT Core, Sector Ops, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```
