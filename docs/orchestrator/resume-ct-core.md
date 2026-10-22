# Resume - Night Shift | CT Core Build (track B, animation)

Written 2026-10-22 ~14:55 at the 5-hour pause; updated ~15:58 by the resumed CT Core session (overflow session). Every branch
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
| idle-shins | `feature/idle-shins`, `C:/NightShift/Mobile-Coop-idle-shins` | ef7246ea | Idle trackMul 0.05 kept (0.3 reverted, Michael). Cause: FootPlanner.reset (teleport) skipped the stance band, the feet crossed in-game until the first step. Fix: reset lifts each foot to the band floor (3 cm), widen only, Wren rigs only (4b2fe50f). Desktop anim-audit: frame-0 selfShanks rows gone (local 38 -> 8, remote 8 -> 3), fails 659 / 80 (#103 703 / 108); trade raise 60 selfThighs 2.52 at frame 0. /c/NightShift/ctb6.sh (a) runs check + e2e-anim e2e-move e2e-clip e2e-netmove (ctb6.out, ctb6-a*.log). | If ctb6 (a) green: PR (patch, train 4) with STATE's audit numbers; message the orchestrator. |
| anim-natural N1 (feet) | `feature/anim-natural-n1`, `C:/NightShift/Mobile-Coop-anim-natural-n1` | 2ea66da8 | Decision 5 built (e2e-move stop reads contactSlide, 2 cm kept, ankle printed). ctb6.sh (b) builds N1 and runs e2e-move, then e2e-clip --log (ctb6-clip-n1.log); (c) master origin/master e2e-clip --log in Mobile-Coop-master-audit (ctb6-clip-master.log). e2e-clip crouched arms -3.2 cm cause still open. | Read ctb6 (b)/(c): compare the LIMB frames N1 vs master; laptop: e2e-move e2e-anim e2e-clip then the 14 area suites; master 4.54.1 merge; GPU sheets (REPORT-B rows); PR (minor). Then STATE item 5. |
| anim-natural N2 (body motion) | `feature/anim-natural-n2`, `C:/NightShift/Mobile-Coop-anim-natural-n2` | e00fb62c | Step 2 (additive body layer, Wren only) built, checker FAIL, fix round done (A11 facing-frame crab reads, sway 0.7x). A1 (run key pop, Michael: "Only fix it if it will result in a more believable, realistic, less rigid run") KEPT and merged; run elbow key fixed (keyedWalk green). No desktop e2e on it yet. | STATE "Next": check + e2e-anim (new body motion block) + e2e-studio + e2e-netmove + e2e-clip; master merge (rebake run after #110 merges); steps 3-5 (arms + PASS2 items 7 / 9 + AUDIT fix 35, stills + PASS2 item 1 hit flinch, tuner section + bake). |
| anim-bake-all | `feature/anim-bake-all`, `C:/NightShift/Mobile-Coop-anim-bake-all` | ae0777ff | Master 4.54.1 merged (df512ab5); `cq` added to GENERIC_REFUSED (as clip; accepted, BAKE.md a850e103); tsc / lint / 9 test files ok. Laptop asked (15:55) for check + 11 logic suites on a850e103. | Laptop reply; desktop anim-audit; PR (minor, name the gameplay values). |
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
1. idle-shins: read /c/NightShift/ctb6.out; if (a) is green, PR (patch) for train 4.
2. N1: ctb6 (b)/(c) results (e2e-move with decision 5, e2e-clip --log N1 vs master: the crouched-arm cause), laptop
   reruns, master merge, GPU sheets, PR.
3. N2: step 2 desktop verification, then steps 3-5.
4. anim-bake-all: the laptop reply (check + 11 suites on a850e103), desktop anim-audit, PR.
Message "Night Shift | Orchestrator" at each slice, verdict and PR.
```
