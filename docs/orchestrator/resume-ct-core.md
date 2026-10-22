# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~14:55 by the CT Core session at the 5-hour pause (the session is cleared during it). Every branch
below is committed and pushed. Each job's own `docs/<job>/STATE.md` has the detail; this is the index.

## Rules carried
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
| idle-shins | `feature/idle-shins`, `C:/NightShift/Mobile-Coop-idle-shins` | 9257c788 | Michael: "Widen just enough. They didn't clip when I viewed it though". body.idle.trackMul 0.05 -> 0.3; the mesh never clipped (audit capsules only). anim-audit on the desktop at the pause (`/c/NightShift/ctb5.out`, `ish-audit.log`). | Check selfShanks < 2.0 in ish-audit.log; PR (patch) for train 4, body says the mesh never clipped. |
| anim-natural N1 (feet) | `feature/anim-natural-n1`, `C:/NightShift/Mobile-Coop-anim-natural-n1` | 55c50319 | Fix round done (REPORT-C), re-check PASS (CHECK-2). Laptop solo on 79be5623: e2e-anim's footSlide TypeError (79be5623) and snap metric (fc15381f) were test bugs, fixed. e2e-move stop 3.93 cm: diagnosed (STATE "14:55"): N1 holds the contact point, the ankle moves with the heel roll; assumed decision 5 = e2e-move's stop metric reads the contact point (contactSlide, 2 cm kept; stricter), not built yet. e2e-clip crouched arms -3.2 cm: not N1's planner headless (-2.8 for N1 and master's planner alike); in-game cause unknown. Desktop anim-audit 79be5623: local 646 / remote 60 vs master 645 / 89. | Build decision 5 in scripts/e2e-move.mjs; e2e-clip `--log` on N1 vs master 5220f79c; laptop: e2e-move e2e-anim e2e-clip then the 14 area suites; master 4.54.0 merge; GPU sheets (REPORT-B rows); PR (minor). Then: route step.idle lift / lock Stepping rules to Wren's generic table (STATE item 5). |
| anim-natural N2 (body motion) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | e00fb62c | Step 2 (additive body layer, Wren only) built, checker FAIL, fix round done (A11 facing-frame crab reads, sway 0.7x). A1 (run key pop, Michael: "Only fix it if it will result in a more believable, realistic, less rigid run") KEPT and merged; run elbow key fixed (keyedWalk green). No desktop e2e on it yet. | STATE "Next": check + e2e-anim (new body motion block) + e2e-studio + e2e-netmove + e2e-clip; master merge (rebake run after #110 merges); steps 3-5 (arms + PASS2 items 7 / 9 + AUDIT fix 35, stills + PASS2 item 1 hit flinch, tuner section + bake). |
| anim-bake-all | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | 28b4274e | #103's head merged in (guard / clip sections refused by the generic table). #103 is on master 4.54.0. | Merge master 4.54.0; check + area suites; PR (name the gameplay values). |
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
Night Shift | CT Core Build: RESUME after the 5-hour pause. Model Opus, effort high. Read CLAUDE.md, docs/ROADMAP.md,
then docs/orchestrator/resume-ct-core.md on origin/feature/menu (git fetch; git show
origin/feature/menu:docs/orchestrator/resume-ct-core.md) and follow its rules (full burn with parallel agents,
get_usage before each agent: no new agent at 97%, save at 98%, stopped by 99%; the atomic heavy.lock and the
orchestrator's lock queue; the laptop runner "Night Shift | Character Build" when the lock is held; merge trains,
versions at merge). Work the "Open jobs" table top to bottom, each from its own docs/<job>/STATE.md:
1. idle-shins: read /c/NightShift/ish-audit.log (selfShanks < 2.0), PR (patch) for train 4.
2. N1: build assumed decision 5 (e2e-move's stop metric at the contact point), e2e-clip --log on N1 vs master to find
   the crouched-arm cause, laptop reruns, master merge, GPU sheets, PR.
3. N2: step 2 desktop verification, then steps 3-5.
4. anim-bake-all: master merge, suites, PR.
Message "Night Shift | Orchestrator" at each slice, verdict and PR.
```
