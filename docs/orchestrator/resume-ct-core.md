# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~09:55 by the CT Core session before a context clear (Michael approved clearing at clean points).
Every branch below is pushed. Each job's own `docs/<job>/STATE.md` has the detail; this is the index.

## Rules carried (from the orchestrator and Michael, tonight)
- Agents: at most what the orchestrator last said (now: ONE agent at a time; it lifts to two when there is headroom).
  Check `mcp__ccd_session_mgmt__get_usage` before every agent; at a 5-hour meter of 97% or more pause at a clean commit,
  push, update STATE and tell the orchestrator. No new agent after five minutes before a reset. Weekly at 98%: the
  orchestrator runs `docs/orchestrator/HANDOFF.md` (account swap).
- Desktop heavy lock `C:/NightShift/heavy.lock`: create ATOMICALLY and wait while it exists:
  `until ( set -o noclobber; echo "<session> | <job> | $(date '+%H:%M')" > /c/NightShift/heavy.lock ) 2>/dev/null; do sleep 20; done`;
  delete it ONLY if it still names you (`grep -q "<job>" "$L" && rm -f "$L"`). Free port 4191 only while you hold it.
  Desktop: `npm run check` and one to three named suites at `E2E_JOBS=1` (software GL is slow: 1-4 fps; at JOBS=1 a
  suite killed at 600 s prints no KILLED line). Full `npm run e2e`: the laptop first (Character Build,
  `E2E_JOBS=2`, a pushed commit); ask by message with the branch, the commit and the suites.
- Every slider the tuner shows must bake (orchestrator rule). Wren's rows never touch guards. Michael chose "bake all,
  widen limit": a widened test limit is marked `(<job>) Michael's 2026-10-22 tune: was <old>` and listed in the PR.
- Outside the track's file area: ask the orchestrator first; name every outside edit in the PR body.
- Subagents: Opus, from `docs/systems/agent-preamble.md`; implementer + fresh checker, one fix round; they return their
  report as text (the harness refuses their doc writes): the job lead writes REPORT / CHECK files.
- Line endings: vitest rewrites `tests/__snapshots__/visionIsolation.test.ts.snap` (CRLF -> LF, no content):
  `git checkout --` it before every commit.

## Open jobs (branch, folder, head, next step)
| Job | Branch / folder | Head | State | Next step |
| --- | --- | --- | --- | --- |
| anim-goggle (item 22's goggles) | `feature/anim-goggle`, `C:/NightShift/Mobile-Coop-anim-goggle` | 3f775f64 (master 4.48.0 merged; the merge commit may still be local: push it) | PR [#102](https://github.com/Tekcry/Mobile-Coop/pull/102) green on 76aa8069 (laptop full e2e + solo e2e-coop); the merge's `npm run check` + `e2e-studio` were running at 09:41 (script `/c/NightShift/agg-run3.sh`, logs `/c/NightShift/agg-check3.log`, `agg-e2e3.log`) | Read the logs; on pass push 3f775f64 and tell the orchestrator (it merges on that + CI) |
| anim-bake-targets (the last 13 of Michael's values) | `feature/anim-bake-targets`, `C:/NightShift/Mobile-Coop-anim-bake-targets` | a134f47e | PR [#103](https://github.com/Tekcry/Mobile-Coop/pull/103). Laptop full e2e on a134f47e: 32 ok, 2 FAIL, pose-related: e2e-stealth-ai "the guard there sees the peeking head only" (head false: guard perception reads the rig's head, backlog item 28, so a baked Body value may move the peek head), e2e-clip "drainpipe + lip: the feet never cross through each other (min 2.4 cm)" (trackMul 0.05 reaching the climb?). Solo reruns queued on the laptop. | If the solo reruns fail too: a fix round (one implementer): find which body row reaches the wall peek / the drainpipe (likely the Body base row of a state that is not idle / walk / jog / run, or the ease carrying idle's trackMul into a climb), keep Michael's values where he set them, then the laptop full e2e again |
| anim-bake-all (every remaining slider bakes) | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | d278c4e7 | Built, checker PASS (STATE polish list). Cut from #103's branch. | After #103 merges: merge master, the laptop full e2e, PR (name the gameplay values: Speed glideFwdMul, Weight startMul / stopMul / turnMul / turnRunMul / stopSettle) |
| anim-run-half (master's run feet cross) | `feature/anim-run-half`, `C:/NightShift/Mobile-Coop-anim-run-half` | 05203c19 (WIP) | Priority (master's run feet cross). Fix built (un-yaw by the full pelvis yaw): run half -0.020 -> 0.051, but constant-yaw stances moved too and trip "rifle low ready idle: feet within 10.5 cm" (ready_stance 0.079 -> 0.094). `docs/anim-run-half/STATE.md`. | Option (c) (job lead's choice; tell the orchestrator): un-yaw by (pelvis yaw minus the clip's MEAN pelvis yaw) in `scripts/anim-keys/py/key_clip.py` (Course Ready knows; approved edit), rebake every clip, recheck the halves (gaits as now, ready_stance back to master's), the walk test pin 0.05 -> 0.053 only with the orchestrator's OK, check + e2e-anim + e2e-studio, laptop full e2e, PR |
| e2e-coop-takedown (master-wide flake) | `feature/e2e-coop-takedown`, `C:/NightShift/Mobile-Coop-e2e-coop-takedown` | 7f81df07 | Test-only fix built (the client-takedown step calms the host and holds the guard as a statue, as the grab step does; a failure dump). Approved as its own patch PR. Runs NOT done. | Under the lock: `npm run build`, `e2e-coop` solo, then `e2e-coop e2e-ctcourse` at `E2E_JOBS=2` (script `/c/NightShift/ect-run.sh` does exactly this), then the PR |
| anim-natural N1 feet, then N2 body motion | not started | - | Brief: `docs/anim-natural/BRIEF.md` on `origin/feature/anim-natural` (e3a37ed5). Michael's new top priority (animation naturalness). N1: turn-step rule (yaw rate / twist trigger a step), the planted foot pivots on the ball, no wind-up / late snap / slide, worst at jog / run turns; Stepping sliders that bake. N2: a phase-locked body motion layer (counter-rotation, chest twist, sway, head steadied, arm balance), per-state sliders that bake. Menu Notes does N0 (audit) and N3 (weapons); its AUDIT.md may add rows. | N1 starts after the clear (orchestrator): branch from master, BRIEF / PLAN / STATE in `docs/anim-natural-n1/`, implementer + checker, GPU sheets before / after on the desktop |

## Done tonight (merged)
J1 #84 (4.37.0), J2 #90 (4.44.0), havok-stall #94 (4.43.2), anim-gear #95 (4.45.0), anim-bake-1022 #96 (4.46.0).

## Test requests in flight (laptop, Character Build)
- #103 solo reruns of e2e-stealth-ai and e2e-clip on a134f47e (behind #92's full run, queued ~09:40).

## Worktrees of this session (safe to remove after their PRs merge; branch deletion is Michael's call)
`C:/NightShift/Mobile-Coop-anim-joints` (J2, merged), `-anim-joints-j1` (J1 / diag/studio-probe), `-havok-stall`,
`-anim-gear`, `-anim-bake-1022`, `-anim-goggle`, `-anim-bake-targets`, `-anim-bake-all`, `-anim-run-half`,
`-e2e-coop-takedown`.

## Resume prompt
```
Night Shift | CT Core Build: RESUME after a clear. Read CLAUDE.md, docs/ROADMAP.md, then
docs/orchestrator/resume-ct-core.md on origin/feature/menu (git show origin/feature/menu:docs/orchestrator/resume-ct-core.md).
Follow its rules (agents per the orchestrator's last word, get_usage before each agent, pause at 97%, the atomic
heavy.lock, full e2e on the laptop). Work the "Open jobs" table top to bottom: each row's Next step; each job's
docs/<job>/STATE.md has the detail. Message "Night Shift | Orchestrator" at each PR. Model Opus, effort high.
```
