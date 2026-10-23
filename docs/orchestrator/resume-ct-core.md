# Resume - Night Shift | Player Build (saved 2026-10-23 ~21:15; jobs: #247 train 34, guard-models P1-P3 running)

Rules: CLAUDE.md on origin/master "Session titles", "Heavy-usage throughput", "Token rules", "Account swap". No mid-window clears.
Opus plans / checks / anim + net code; Sonnet builds from strict briefs; Haiku chores; desktop CPU < 80%. e2e always
E2E_GPU=1: laptop (Test Runner) for coop / netmove / ctcourse and batches, one verdict per batch; desktop heavy.lock (4191)
/ heavy2.lock (4192) for single suites. Agent rules: scratch/ctcore/COMMON-27.md. Push this file with
scratch/ctcore/push-resume.sh <abs file> <msg>. Message the orchestrator only at PR open / train-ready / blocked / Michael.

Orchestrator 19:15 ("Pipeline speed-ups"): NO e2e on the desktop (heavy.lock = build / check only); every suite to the
laptop queue; fresh checker + laptop request on the same commit in parallel; fix round reruns only what failed;
train-ready = message + `gh pr edit <n> --add-label train-ready` (auto mode denied the label 19:2x: Michael adds it or
allows it); use `node scripts/run-e2e.mjs --affected origin/master --list` once it lands. Prompts are stateless from the
next swap: this block carries all state.
Orchestrator 19:25 ("Tokens for progress"): lead at high effort (set in the app; a session cannot raise its own);
an Opus agent keeps briefs for the next 2-3 slices ready (scratch/ctcore/briefs/); 2 independent checkers on AI /
src/net changes; Opus triage agent at once on every laptop failure; a checker FAIL gets an Opus fix round and Opus
siblings; questions to Michael carry a decision pack (prototype / shots / GPU sheets). Desktop CPU < ~80%.
Cloud builder ("Night Shift | Cloud Builder 1", one-way): briefs as briefs/<job>-<slice>.md on orphan branch
`cloud-queue`, line 1 `status: open` (format: README.md there); at each check `done <branch> <sha>` -> fetch, review,
check; `blocked <reason>` -> answer in the file, set open. Use it first for CPU-heavy builder slices.
Laptop queue: self-service from feature/laptop-queue (docs/systems/testing-tools.md "Laptop queue"; results as GitHub statuses laptop-e2e/<set>); until it merges, ask Test Runner.
Released: #227 (4.76.0), #207 batch 22 (4.77.0), #214 -> #223 -> #231 stack (4.79.0, train 30, PROTOCOL 40).

## Open (master bbd49206 = 4.81.0; train 33 db14a418 4.82.0 building with #249 stealth-pays, NOT #247)
| Job | Branch (folder C:/NightShift/Mobile-Coop-<x>) | Head | Next |
| --- | --- | --- | --- |
| #247 anim-fix-pass | feature/anim-fix-pass (anim-fix-pass) | e70951e3 (master 4.81.0 merged, docs/anim-fix-pass/TRAIN-ENTRY-REPORT.md; checker PASS) | Laptop request 20261023T093904-...-e70951e3 (coop netmove anim clip menus), status laptop-e2e* on e70951e3. On pass: gh pr edit 247 --add-label train-ready + message orchestrator (train 34). On fail: Opus triage at once. |
| guard-models (lead since ~20:45, from Marlow) | feature/guard-models (guard-models) | fe81480f (G0 + GB + G6 merged) | docs/guard-models/STATE.md "Now" is the live state: P1 checker on a63e82ca; G6n f9ce1015 checker A PASS, B running -> merge gm-g6n on both PASS; G5 (gm-g5), G1 (gm-g1), G1h (gm-g1h), G3 (gm-g3) Opus builders running in their worktrees (commit WIP there at the save). L0 probe: status laptop-e2e/alone-guard-bake-probe on bbd49206. Rules: briefs/gm-common.md, gm-blender.md. |
| cloud-queue | orphan cloud-queue | briefs afp-next-AF0b, player-stealth-pays-client-intel, player-rig-pose-audit | Review each on done. |

## Next
1. #247 laptop verdict -> train-ready (train 34).
2. guard-models: merge G6n after checker B; P1 checker verdict (fix round if FAIL); as G5 / G1 / G1h / G3 land: one Opus checker per group, book each full stage as a laptop alone request (node C:/NightShift/scratch/ctcore/lq/request.mjs --alone --step "node scripts/operators/guard-bake.mjs --stage <s> --push"), then G2 garments, G4 bake + sheet (to Michael, no stop), G7, G8, G9 per PLAN section 7.
3. AF7-AF9 (briefs/afp-next-pass.md) wait for Michael's walk of AF0-AF6 (orchestrator ~20:20: hold).

## Resume prompt
```
Night Shift | Player Build: RESUME after the account swap. Model Opus, effort medium. set_session_title "self" ->
"Night Shift | Player Build". Read CLAUDE.md (origin/master "Sessions"), then docs/orchestrator/resume-ct-core.md on
origin/feature/menu (git fetch; git show origin/feature/menu:docs/orchestrator/resume-ct-core.md). Copy it to
C:/NightShift/scratch/ctcore/resume-ct-core.md and push updates with scratch/ctcore/push-resume.sh. A heavy.lock /
heavy2.lock naming Player Build with no node / bash process of ours is stale: delete it. Turn off unused connectors.
Message "Night Shift | Orchestrator" only at PR open / train-ready / blocked / Michael needed. Work "Next" top down.
e2e always E2E_GPU=1.
```

## History
- 2026-10-23 16:05-18:30: stack #214 -> #223 -> #231 released in train 30 (4.79.0); #207 in 4.77.0; #227 4.76.0; #239 opened;
  AF1, AF4a, AF6, AF3 built, checked, merged into anim-fix-pass; AF4b started.
- 2026-10-23 12:20-14:05: restarted r3 / team-climb / sd-rounds, spare 9, ipad-fit, spare 6; opened #214, #221, #223.
