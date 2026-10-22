# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~13:20 by the CT Core session for the account switch (orchestrator's handoff). Every branch below is
committed and pushed; no agent is running. Each job's own `docs/<job>/STATE.md` has the detail; this is the index.

## Rules carried
- Agents: one at a time. `mcp__ccd_session_mgmt__get_usage` before every agent: at 97% (5-hour) start no new agent; at
  98% commit, push and update STATE; be stopped by 99% (Michael, ~12:50). Resume after a pause only when the
  orchestrator messages. Weekly at 98%: the orchestrator runs `docs/orchestrator/HANDOFF.md`.
- Desktop heavy lock `C:/NightShift/heavy.lock` (a full `npm run check`, a full `vitest run` and every e2e): create it
  ATOMICALLY and wait while it exists:
  `until ( set -o noclobber; echo "<session> | <job> | $(date '+%H:%M')" > /c/NightShift/heavy.lock ) 2>/dev/null; do sleep 20; done`;
  delete it only if it still names you (`grep -q "<job>" "$L" && rm -f "$L"`). Port 4191 only while you hold it.
  Single test files (`npx vitest run tests/x.test.ts`) need no lock.
- Merge trains (Michael): a PR needs CI + its area suites (check + the suites its folders touch); no per-PR full e2e;
  the orchestrator runs one full e2e per train. Versions are set by the orchestrator at merge (G183): a PR's CHANGELOG
  entry is "## Unreleased - <job>".
- Every slider the tuner shows must bake. A widened test limit from Michael's tune is marked
  `(<job>) Michael's 2026-10-22 tune: was <old>` and listed in the PR. Never loosen a metric to pass.
- Subagents: Opus, from `docs/systems/agent-preamble.md`; implementer + fresh checker, one fix round; they return their
  report as text and the job lead writes REPORT / CHECK files and commits. Tell them: no full vitest / check / e2e.
- Line endings: vitest rewrites `tests/__snapshots__/visionIsolation.test.ts.snap` (CRLF -> LF only): `git checkout --`
  it before every commit. Bash `node -e '...'` breaks on apostrophes: use the Edit tool for doc edits.

## Open jobs (branch, folder, head, next step)
| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| anim-bake-targets | `feature/anim-bake-targets`, `C:/NightShift/Mobile-Coop-anim-bake-targets` | 41becc22 | PR [#103](https://github.com/Tekcry/Mobile-Coop/pull/103). Fix round done (airborne pose has no Body group; e2e-clip feet from the 2nd frame after a teleport); masters 4.51.0 / 4.51.1 merged; fixture re-captured. Desktop full e2e: 28 ok, 7 fails all load; solo reruns (logs `/c/NightShift/abt-solo-*.log`): mouse, ctcourse:3, menus, coop, netmove ok; ctcourse:1 FAIL "station 3: stale far-lobby positions reached the host (0 reports)" (marlow-jammer send-back setup); ctcourse:2 was running at the switch. | Read `/c/NightShift/abt-solo-e2e-ctcourse_2.log`; rerun `e2e-ctcourse:1` solo (under the lock, `E2E_PORT=4191 E2E_JOBS=1 node scripts/run-e2e.mjs e2e-ctcourse:1` after `npm run build`); if it fails, run it on master to see if it is #103's. Send the orchestrator the verdict: #103 merges alone. |
| anim-run-half | `feature/anim-run-half`, `C:/NightShift/Mobile-Coop-anim-run-half` | e633d856 | PR [#110](https://github.com/Tekcry/Mobile-Coop/pull/110) (patch; run half -0.020 -> 0.050). Checker PASS; check + e2e-anim + e2e-studio green before the 4.51.1 merge. | After #103 merges: merge master, re-capture the skeleton identity fixture (`ANIM_SKELETON_CAPTURE=1 npx vitest run tests/animSkeletonIdentity.test.ts tests/animSkeletonGuardIdentity.test.ts`; both PRs change it), then under the lock check + e2e-anim + e2e-studio (`/c/NightShift/arh-run.sh` does this), tell the orchestrator: #110 joins the next train. |
| anim-natural N1 (feet) | `feature/anim-natural-n1`, `C:/NightShift/Mobile-Coop-anim-natural-n1` | bccc42e8 | Built (REPORT-A diagnosis + harness, REPORT-B build: turn step on the clock strike, ball pivot, no band scrub, aimed spot turn, 5 Stepping sliders that bake, contact metrics). Checker FAIL (CHECK.md): blocker = a heel scrub in the heel-first roll at 60 Hz that the new contact metrics cannot see; 6 should-fix, 2 nits. Assumed decisions 1-4 in STATE (orchestrator OK). Course Ready's N4 inputs in STATE step 4. A check + e2e run on ccc1a14d was queued under the lock at the switch (`/c/NightShift/ann1-run.sh`; logs `/c/NightShift/ann1-check.log`, `ann1-e2e.log`, if it ran; it may have died with the old session). | The ONE fix round: one implementer with CHECK.md findings 1-9; then re-check finding 1 (heel travel while the heel is down in the 60 Hz held spins), check + e2e-anim / e2e-clip / e2e-studio / e2e-netmove under the lock, the guard rows, GPU sheets before / after (E2E_GPU=1), PR (minor) listing every switched metric with old -> new. |
| anim-bake-all | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | d278c4e7 | Built, checker PASS. Cut from #103's branch. | After #103 merges: merge master, check + area suites, PR (name the gameplay values: Speed glideFwdMul, Weight startMul / stopMul / turnMul / turnRunMul / stopSettle). |
| anim-natural N2 (body motion) | not started | - | Brief `docs/anim-natural/BRIEF.md` on `origin/feature/anim-natural`; audit `docs/anim-natural/AUDIT.md` there. Scope (orchestrator): trunk counter-rotation (pelvis / shoulders 3 / 3 deg walk, 5 / 7 jog-run; target ~8-12 / 7-10), head stabilised (0 deg now), arm swing scaling with speed (~21 cm always), wrist whip (13-22 m/s in turns / strafes), sway (Michael approved SWAY_MAX to ~5 cm), drawn stills (low ready, aim, crouch aim are statues), the run pelvis lag (keyed trunk, audit 50 deg). Holds / carries (audit item 9) are Course Ready's N4. | After N1's PR: branch from master, BRIEF / PLAN / STATE in `docs/anim-natural-n2/`, implementer + checker. Menu Notes' N3 (draws, `feature/anim-n3`) touches animGraph's swap / draw overlay: no clash. |

## Test logs on the desktop (detached scripts may not survive the old session)
`/c/NightShift/abt-solo-*.log` (#103 solo reruns), `/c/NightShift/abt-full.log` (#103 full), `/c/NightShift/ann1-*.log`
(N1 check + area e2e), `/c/NightShift/arh-*.log` (#110). If `C:/NightShift/heavy.lock` names "CT Core Build" and no
node / bash process of ours runs (`Get-CimInstance Win32_Process -Filter "Name='node.exe'"`), the lock is stale: delete it.

## Done today (merged)
#102 anim-goggle (4.49.1), #107 e2e-coop-takedown (4.51.1).

## Resume prompt
```
Night Shift | CT Core Build: RESUME on the new account (no history). Model Opus, effort high. Read CLAUDE.md,
docs/ROADMAP.md, then docs/orchestrator/resume-ct-core.md on origin/feature/menu
(git show origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its rules (one agent at a time,
get_usage before each agent: no new agent at 97%, save at 98%, stopped by 99%; the atomic heavy.lock for full
check / vitest / e2e; merge trains, versions at merge). Work the "Open jobs" table top to bottom:
1. #103 (feature/anim-bake-targets, C:/NightShift/Mobile-Coop-anim-bake-targets): read the ctcourse:2 solo log, rerun
   e2e-ctcourse:1 solo, send the orchestrator the verdict.
2. #110 (feature/anim-run-half) after #103 merges: master merge, fixture re-capture, check + e2e-anim + e2e-studio, tell
   the orchestrator.
3. N1 (feature/anim-natural-n1, C:/NightShift/Mobile-Coop-anim-natural-n1): the one fix round from
   docs/anim-natural-n1/CHECK.md (findings 1-9), re-check, check + area suites, GPU sheets, PR.
4. anim-bake-all after #103; then N2.
Each job's docs/<job>/STATE.md has the detail. Message "Night Shift | Orchestrator" at each PR and verdict.
```
