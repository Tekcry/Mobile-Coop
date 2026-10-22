# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~14:55 at the 5-hour pause; updated ~16:48 by the resumed CT Core session (overflow session). Every branch
below is committed and pushed. Each job's own `docs/<job>/STATE.md` has the detail; this is the index.

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
| anim-natural N1 (feet) | `feature/anim-natural-n1`, `C:/NightShift/Mobile-Coop-anim-natural-n1` | c25ab4ba | Desktop on 7955f883: check ok, e2e-move ok, e2e-clip ok (crouched -2.9). e2e-anim FAIL: turn feet block "jog 180 first swing frames 5.29 m/s (<= 5)" (/c/NightShift/ctb8.log:156). An implementer agent on the planner fix (headless, footTurnHarness) started 16:45; its report -> REPORT-D.md (lost on a clear: rerun it if no REPORT-D.md and no uncommitted planner change). Still on master 4.53.0: the 4.55.1 merge conflicts in both identity fixtures + animSkeletonIdentity.test.ts. | (1) fix result -> REPORT-D, commit, push; (2) agent: master 4.55.1 merge + fixture re-capture (data-only proof); (3) desktop e2e-anim e2e-clip e2e-move; laptop area suites; GPU sheets; PR (minor). |
| anim-natural N2 (body motion) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | e7d0d7cd | Step 2 + A12 checker PASS (CHECK-3.md; should-fix: bodyMotion alloc test flaky by construction, thin knee-out margin -> one desktop e2e-anim). ctb9 (21106003): check 2696 ok; e2e-anim e2e-studio e2e-netmove e2e-clip running under the lock (read /c/NightShift/ctb9.out). Master 4.55.1 merge in a temp worktree `feature/anim-natural-n2-merge`, `C:/NightShift/Mobile-Coop-anim-natural-n2-merge` (npm ci, then a merge agent; fast-forward N2 to it after ctb9). | ctb9 result (walk / low ready walk knee-out > 3.4 in-browser -> cut walk sway, never widen); merge agent result -> ff N2, push; steps 3-5. |
| anim-bake-all (#123) | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | 6f87bf8d | PR #123; master 4.55.1 merged. Laptop on cba9e371: all 12 suites PASS (16:28), in the PR body; CI check green. | Train 5. |
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
Night Shift | CT Core Build: RESUME (after a clear or a pause). Model Opus, effort high. Read CLAUDE.md, docs/ROADMAP.md,
then docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its rules (full burn with parallel agents,
overflow session: works to 100%, WIP pushed after each agent hand-back; the atomic heavy.lock and the
orchestrator's lock queue; the laptop runner "Night Shift | Character Build" when the lock is held; merge trains,
versions at merge). Work the "Open jobs" table top to bottom, each from its own docs/<job>/STATE.md:
1. N1: REPORT-D (the jog 180 swing fix agent) or rerun it; the 4.55.1 merge + fixture re-capture (agent); desktop e2e-anim.
2. N2: /c/NightShift/ctb9.out; the 4.55.1 merge in feature/anim-natural-n2-merge (ff N2 to it); steps 3-5.
3. #120 / #123 wait for train 5.
Desktop lock: ask the orchestrator for the current order; scripts take it atomically and free it themselves.
Message "Night Shift | Orchestrator" at each slice, verdict and PR.
```
