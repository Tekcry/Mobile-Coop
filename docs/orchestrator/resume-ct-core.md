# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~14:55 at the 5-hour pause; updated ~16:03 by the resumed CT Core session (overflow session). Every branch
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
| idle-shins (#120) | `feature/idle-shins`, `C:/NightShift/Mobile-Coop-idle-shins` | 555e7884 | PR #120 open (patch), master 4.54.1 merged. check 2684 ok; e2e-netmove / move / anim / clip ok; anim-audit frame-0 shins gone (659 / 80). Orchestrator: train 5. | Nothing unless train 5 fails. |
| anim-natural N1 (feet) | `feature/anim-natural-n1`, `C:/NightShift/Mobile-Coop-anim-natural-n1` | edb9bc23 | Decision 5 green (e2e-move 0.00 cm at the contact). e2e-clip FAILS crouched holstered -3.2 (right wrist / right thigh, crouched still t 5-16; master -2.7; N1 feet 1.1 cm wider). An agent (16:02) traces the cause headless and may commit a fix. | Agent result -> e2e-clip on the fix (desktop after Menu Notes and Course Ready, or laptop); laptop: e2e-move e2e-anim e2e-clip + the 14 area suites; master 4.54.1 merge; GPU sheets; PR (minor). Then STATE item 5. |
| anim-natural N2 (body motion) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | e00fb62c | Step 2 (additive body layer, Wren only) built, checker FAIL, fix round done (A11 facing-frame crab reads, sway 0.7x). A1 (run key pop, Michael: "Only fix it if it will result in a more believable, realistic, less rigid run") KEPT and merged; run elbow key fixed (keyedWalk green). No desktop e2e on it yet. | STATE "Next": check + e2e-anim (new body motion block) + e2e-studio + e2e-netmove + e2e-clip; master merge (rebake run after #110 merges); steps 3-5 (arms + PASS2 items 7 / 9 + AUDIT fix 35, stills + PASS2 item 1 hit flinch, tuner section + bake). |
| anim-bake-all | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | ae0777ff | Master 4.54.1 merged; cq refused like clip (accepted). Laptop: check + 12 suites on a850e103 queued after train 4. Desktop anim-audit: /c/NightShift/ctb7.sh (16:00, frees the lock; ctb7.out, ctb7-audit.log). | Laptop verdict + ctb7 audit vs master; PR (minor, name the gameplay values). |
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
overflow session: works to 100%, WIP pushed after each agent hand-back; the atomic heavy.lock and the
orchestrator's lock queue; the laptop runner "Night Shift | Character Build" when the lock is held; merge trains,
versions at merge). Work the "Open jobs" table top to bottom, each from its own docs/<job>/STATE.md:
1. idle-shins: PR #120 open, in train 5. Nothing to do.
2. N1: the crouched-arm e2e-clip fail (STATE "~16:00"; agent result or redo), then laptop reruns, master merge, GPU
   sheets, PR.
3. N2: step 2 desktop verification, then steps 3-5.
4. anim-bake-all: the laptop verdict on a850e103 + /c/NightShift/ctb7-audit.log, then PR.
Desktop lock order (orchestrator 16:02): Menu Notes, then Course Ready, then CT Core.
Message "Night Shift | Orchestrator" at each slice, verdict and PR.
```
