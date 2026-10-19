# Orchestrator - resume point (2026-10-19 16:15 Sydney)

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
v4.6.5 (7c950acc). Tags v4.0.0-v4.6.5. Done today: #12 anim-cleanup 4.5.0, #13 phone launch 4.6.0, #11 docs 4.6.1,
#14 versions 4.6.2, #15 process audit 4.6.3, #16 laptop slot rule 4.6.4, #17 co-op test fix 4.6.5 (KNOWN_FLAKY is
e2e-pad only now).

## Sessions (all report to "Night Shift | Orchestrator"; every session was cleared once at 16:00)
| Session | Where | Address | Job now |
| --- | --- | --- | --- |
| CT Core Build | desktop, C:NightShiftMobile-Coop-ct-prototype, feature/ct-prototype | `Night Shift | CT Core Build` (local) | Master 4.6.4 merged (2b8179af); check + quick + ctcourse, then slices D + E (holstering, hanging shimmy, pipe climb, ledge climb-up). /ct/ = 87514ed1 (B + C). The scanner rule (fd963a1c) goes out with its next push. |
| Sector Ops Build | desktop, C:NightShiftMobile-Coop-sector-ops, feature/sector-ops | `Night Shift | Sector Ops Build` (local) | Slice 2 for 3 sections (M7), PLAN.md section 5 build order; slices 1 (menus) and 3 (lobby) done on the branch |
| Character Build | laptop (second heavy slot), C:/NightShift/Mobile-Coop-coop-tests | bridge `session_015wU8VbanFb8zVwRuSMa9x7` (new after the clear; delivery not confirmed) | Idle: co-op test fix merged (#17). Free for the next laptop job. |

Known clashes to handle at merge time:
- Sector Ops' lobby hides Infiltration, which e2e-coop's match (A1, coop-tests) uses. When Sector Ops merges, e2e-coop
  moves to Sector Ops or Course.
- e2e-menus' slider hold-repeat check fails under load (2 of 3 on the desktop; it passes alone). It's a candidate for
  KNOWN_FLAKY or a sim-time wait.

## Waiting on Michael
- Approve Sector Ops' RESEARCH.md + PLAN.md (when sent).
- Delete the merged branch feature/ct-research (`git -C C:/NightShift/Mobile-Coop-menu push origin --delete feature/ct-research`).
- The audit's branch and worktree list (docs/process-audit/REPORT.md section 5) is for him to prune.

## Next for the orchestrator
1. A next job for the laptop slot (Character Build is idle): options are the e2e-menus slider wait, the cleanup job
   (waits for the playtest), or support for Sector Ops tests. Ask Michael if unclear.
2. CT Core's D + E, then the ct-prototype PR to master once Michael has walked the slices (a minor step).
3. Sector Ops: slice 2 for 3 sections, then its PR (a minor step; fix e2e-coop's match at that merge).
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
Orchestrator: resume from docs/orchestrator/STATE.md on feature/menu in C:\NightShift\Mobile-Coop-menu (git pull origin master first). Read CLAUDE.md "Sessions" and docs/ROADMAP.md. Check what each session has reported since 16:15 (CT Core, Sector Ops, Character Build), then carry on with "Next for the orchestrator". Give me one step at a time.
```
