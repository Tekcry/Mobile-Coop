# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~14:55 at the 5-hour pause; saved ~20:20 for the account swap by the CT Core session (overflow session). Every
branch below is committed and pushed; no agent is running (the three running at the save are lost: the resume prompt redoes them).

## Rules carried
- (Michael 15:25, via the orchestrator) CT Core is the overflow session: it ignores the 97 / 98 / 99% stops and works and
  starts agents up to 100%. Cutoff-proof: commit + push a WIP after every agent hand-back, keep this file current at each
  step, long runs as detached scripts that release their own lock. If cut off: do nothing; resume when the orchestrator
  messages after the reset.
- Full burn (Michael, 13:30): parallel agents where the work splits. `mcp__ccd_session_mgmt__get_usage` before every
  agent: at 97% (5-hour) start no new agent; at 98% commit, push and update STATE; stopped by 99%. Resume after a pause
  only when the orchestrator messages. Weekly at 98%: the orchestrator runs `docs/orchestrator/HANDOFF.md`.
- Desktop heavy lock `C:/NightShift/heavy.lock` (a full `npm run check`, a full `vitest run`, every e2e, anim-audit,
  Blender, GPU sheets): create it ATOMICALLY and wait while it exists:
  `until ( set -o noclobber; echo "CT Core Build | <job> | $(date '+%H:%M')" > /c/NightShift/heavy.lock ) 2>/dev/null; do sleep 20; done`;
  delete it only if it still names you (`grep -q "<job>" "$L" && rm -f "$L"`). Port 4191 (logic), 4189 (GPU). Follow
  the orchestrator's lock queue; when you free the lock, tell whoever is next. When it is held, send logic suites to
  the laptop runner "Night Shift | Character Build" (branch, commit, named suites). Single test files need no lock.
- Main test machine = the laptop (Michael ~17:50, CLAUDE.md "Main test machine"): full runs, npm run check, co-op suites
  and ALL GPU work (anim-audit, anim-sheet, shots, E2E_GPU=1) go to Character Build (bridge:session_01HVFKDvRCTbTDNhJKQP1oaa)
  with branch, commit, suites and where outputs go. The desktop runs only quick single suites at E2E_JOBS=1 under its lock.
- Rule changes (Michael via the orchestrator, ~18:35; CLAUDE.md on feature/menu): a PR whose fresh checker passed goes
  straight into the next merge train with CI check only (the train full run covers its suites); PRs touching src/net,
  PROTOCOL_VERSION or the save shape still pass their area suites first. A test result stands for a later commit that only
  changes docs / CHANGELOG / test scripts. The laptop runs two queues (ports 4191, 4192). Changelog fragments: format to come.
- Laptop requests (orchestrator 19:45): only the suites a job touches (e2e-anim, e2e-move, + e2e-coop / e2e-netmove when
  src/player or src/net changed); the full run happens once per train. Open each PR as soon as its checker passes (train 7).
- Merge trains: a PR needs CI + its area suites; the orchestrator runs one full e2e per train and sets versions at merge
  (G183). CHANGELOG entries are "## Unreleased - <job>".
- Every tuner slider bakes. Never loosen a metric to pass; a widened limit from Michael's tune is marked
  `(<job>) Michael's 2026-10-22 tune: was <old>`.
- Subagents: Opus, from `docs/systems/agent-preamble.md`; implementer + fresh checker, one fix round; they return text,
  the job lead writes REPORT / CHECK files and commits. Tell them: no full vitest / check / e2e.
- `git checkout -- tests/__snapshots__/visionIsolation.test.ts.snap` before every commit (vitest rewrites it). In bash
  scripts, write PowerShell's `$_` as `\$_` inside double quotes; a port-free command can return non-zero: never chain
  the next step with `&&` after it.

## Open jobs (branch, folder, head, next step)
| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| anim-run-half (#110) | `feature/anim-run-half`, `C:/NightShift/Mobile-Coop-anim-run-half` | 16b1a044 | Master 4.54.0 merged, fixture re-captured; check 2682 ok, e2e-anim ok, e2e-studio ok solo (a JOBS=2 phase-sampling flake). In train 4. | Nothing unless train 4 fails. |
| idle-shins (#120) | `feature/idle-shins`, `C:/NightShift/Mobile-Coop-idle-shins` | 741da1da | PR #120; master 4.55.1 merged. Train 5. | Nothing unless train 5 fails. |
| anim-natural N1 (feet) | `feature/anim-natural-n1`, `C:/NightShift/Mobile-Coop-anim-natural-n1` (separate clone) | 1135bc41 | Jog 180 fix (REPORT-D), rule A2 (REPORT-E), master 4.56.0 merged, CHANGELOG section. No pre-run needed (laptop run cancelled). Fresh checker was running at the save: lost, rerun. PR body drafted: C:/NightShift/n1-pr.md. | Checker -> CHECK-3; on PASS the PR (train 7 / 8). |
| anim-natural N2 (body motion) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | 849c081b | Steps 2 + 3 + master 4.56.0 (b69e1a26; STATE 20:15). Step 3 checker and the run arm pop fix agent were running at the save: lost, rerun both (no uncommitted change, no lock held). | CHECK-4; run arm pop fix; PR; steps 4-5. |
| anim-bake-all (#123) | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | ad967e39 | Master 4.56.0 merged (tuneRegistry: both imports; 146 tests + tsc green). Told the orchestrator: train 6 once CI is green. | Nothing unless train 6 fails. |
| anim-n2-runkey | `feature/anim-n2-runkey` | 038e2519 | A1 branch, merged into N2. | None (history; sheets in docs/anim-natural-n2/sheets/). |

## Test logs on the desktop
`/c/NightShift/ctb-b.log` (master 5220f79c anim-audit: 645 / 89), `abt-aa.log` (#103: 703 / 108; selfShanks 4 -> 38 =
idle-shins), `ctb3-n1audit.log` (N1), `ctb-d*.log` / `ctb3-studio.log` (#110), `ish-audit.log` (idle-shins),
`ctb-a.log` (A1 rebake + sheets). If `C:/NightShift/heavy.lock` names "CT Core Build" and no node / bash process of
ours runs, the lock is stale: delete it.

## Done today
#102 anim-goggle (4.49.1), #107 e2e-coop-takedown (4.51.1), #103 anim-bake-targets (4.54.0, train 3 with #113).

## Resume prompt
```
Night Shift | CT Core Build: RESUME (after the account swap, ~20:20 save). Model Opus, effort high. Read CLAUDE.md
(on origin/feature/menu: "Main test machine: the laptop", the test tiers), docs/ROADMAP.md, then
docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its "Rules carried" (overflow session to 100%,
WIP pushed after each agent hand-back, atomic desktop heavy.lock for Blender / quick single suites only, the laptop
"Night Shift | Character Build" for check / e2e / GPU, only touched suites, PRs straight to a train once the fresh
checker passes, no pre-run without src/net / protocol / save). Everything was committed and pushed at the save; three
agents were running and are lost (their results were not in): redo them.
1. N1 (feature/anim-natural-n1, C:/NightShift/Mobile-Coop-anim-natural-n1, a separate clone: use origin/ refs; head
   1135bc41): rerun the fresh checker (scope: REPORT-D jog 180 fix f8e98b26, REPORT-E rule A2 1b6c6d8e, the master
   4.56.0 merge; CHECK-2's open items; whole job vs master) -> CHECK-3.md, push. On PASS open the PR:
   gh pr create --base master --head feature/anim-natural-n1 --title "anim-natural N1: feet in turns (turn step, ball
   pivot, contact hold)" --body-file C:/NightShift/n1-pr.md (drafted; add the checker line); message the orchestrator
   (train 7 or 8). On FAIL: one fix round.
2. N2 (feature/anim-natural-n2, C:/NightShift/Mobile-Coop-anim-natural-n2, head 849c081b; steps 2 + 3 + master 4.56.0):
   (a) rerun the step 3 fresh checker (diff 4028d386..4e974ea1 on feature/anim-natural-n2-s3, REPORT-3) -> CHECK-4.md;
   (b) the run arm pop fix (orchestrator 19:45, a defect: the right wrist jumps 22 cm in one run clip frame at the half
   wrap, frames 16 -> 17, chest peak 17.3 m/s): an implementer retimes / smooths that run key (not the A1 trunk keys,
   legs or half), Blender -b rebake under the desktop lock (node --import ./scripts/operators/ts-resolve.mjs
   scripts/anim-keys/build.mjs run), re-captures both Wren fixtures (expect keyed:run + partner:moves), pins arm
   continuity in runKeyContinuity, appends "Run arm pop fix" to REPORT-3; then push. On CHECK-4 PASS + the pop fix:
   open the PR (minor) and message the orchestrator; steps 4-5 after (PLAN), and the #128 alloc test (STATE 17:55).
3. #123 anim-bake-all (ad967e39, master 4.56.0 merged): in train 6; nothing unless it fails.
Message "Night Shift | Orchestrator" at each verdict and PR.
```
