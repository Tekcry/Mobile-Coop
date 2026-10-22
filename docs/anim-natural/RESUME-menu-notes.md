# Night Shift | Menu Notes Build - resume (updated 2026-10-22 ~14:55)

Every open job this session leads, with branches, heads, next steps and rules. Read CLAUDE.md and docs/ROADMAP.md
first, then this file. Message "Night Shift | Orchestrator" at each slice and PR.

## Rules in force (orchestrator, 2026-10-22)
- FULL BURN (Michael 13:30: "use all available weekly tokens before the reset. make sure each 5 hour token window hits
  99%"): parallel agents allowed wherever the work splits. Usage: check `mcp__ccd_session_mgmt__get_usage` before every
  agent; at 97% (5-hour) start no new agent; at 98% commit, push, update this file and tell the orchestrator; stopped
  by 99%. After each 5-hour reset the orchestrator messages to resume.
- heavy.lock (desktop): take it only atomically, `( set -o noclobber; echo "Night Shift | Menu Notes Build | <job> |
  $(date -Iseconds)" > C:/NightShift/heavy.lock )`, retry if it fails, never overwrite; release only if it still names
  you: `grep -q "Menu Notes Build | <job>" C:/NightShift/heavy.lock && rm C:/NightShift/heavy.lock`. CT Core has first
  claim; the orchestrator sets the queue (after CT Core's three runs from ~14:16, then us). Each e2e on its own E2E_PORT
  (4191 / 4193 / 4195 / 4197 / 4199; GPU 4189 under the lock).
- Full test runs (`npm run check`, full vitest) are heavy like e2e. Lock held: send the run to the laptop runner
  "Night Shift | Character Build" (bridge, see ListAgents) with branch, commit, suites; it replies with the verdict.
- Merge trains: a PR needs CI + its area suites; the orchestrator runs one full e2e for 2+ ready PRs.
- Subagents can't write report files: the job lead writes reports from their final message.
- vitest rewrites `tests/__snapshots__/visionIsolation.test.ts.snap` line endings: `git checkout --` it before commits.
- Allocation tests: never `+=` into a captured `let`; use a Float64Array slot.

## 1. anim-natural (TOP PRIORITY) - docs branch `feature/anim-natural` (C:/NightShift/Mobile-Coop-anim-natural)
Brief: docs/anim-natural/BRIEF.md. Menu Notes owns N0, N3 and N3b. CT Core owns N1 / N2 (+ hitReact); Course Ready owns
N4 rows (co-op role B, mantle / drop, roll, guard-hold trunk).
- **N3 weapons:** `feature/anim-n3`, worktree C:/NightShift/Mobile-Coop-anim-n3, head b2e2689f (master 4.54.0 merged).
  Fix round done (96134b16), fresh checker PASS WITH FIXES (no must-fix; should-fix / polish list in
  docs/anim-natural/n3/WIP.md, "Fresh checker"). Clip speed is the only draw / holster time control; holster split per
  gun; an old single `holster` value maps to both (tuneRows.ts ID_ALIASES). CHANGELOG / TESTING / combat.md done.
  Side branch feature/anim-n3-merge (worktree C:/NightShift/Mobile-Coop-anim-n3-merge) is merged in; removable.
  **Waiting:** Character Build runs `npm run check` + e2e-anim, e2e-weapons-carry, e2e-studio, e2e-combat, e2e-takedown,
  e2e-stealth, e2e-netmove on 9de88a66 (docs-only commits after it).
  **Next:** (1) on a pass: GPU before / after sheets under the lock (`E2E_GPU=1 node scripts/anim-natural/audit.mjs
  proving --only=draw-lowready-rifle,draw-lowready-pistol,draw-rifle,draw-pistol,swap-drawn,holster-rifle,holster-pistol,ready-to-aim`
  from the N3 worktree after `npm run build`, port 4189; "before" = the pass 1 sheets on feature/anim-natural);
  (2) open the PR to master (minor; body: old -> new times, the animGraph / tuneBakeTable lines, the `swapRel` carriage
  change, the slower strike / reload / gadget windows, assumed decisions A1-A4 in WIP.md, the checker's should-fix list);
  message the orchestrator. Merge master again if it moved.
- **N3b** (routed pass 2 rows): `feature/anim-n3b`, worktree C:/NightShift/Mobile-Coop-anim-n3b (from master 5220f79c;
  merge master 4.54.0 before its PR). Implementer running / or done: delete the slide (pose.slide) and doorway sweep
  (pose.check) animations (Michael: "Delete them"), body recoil when firing (row 25), the wall-block rifle swing + 0.42 s
  stall (row 24). State in docs/anim-natural/n3b/STATE.md there. Then a fresh checker, area suites, its own PR.
- **N0 audit:** pass 1 + pass 2 done (feature/anim-natural 905e115f): AUDIT.md, PASS2.md, fixes 23-36, sheets.
  Not captured: 29 / 39 (aiming at the wall end steps her off the wall; needs anim-audit's wall driver), 49 elbow strike
  (no strike starts with a calm guard in reach; find what blocks it), 31 launcher (not in game), 80 (covered by revive B).

## 2. sector-fixes (after the N3 PR) - take L and C only (W is Character Build's)
- **L lights:** `feature/sector-fixes` c436f677 (C:/NightShift/Mobile-Coop-sector-fixes; docs/sector-fixes/l/WIP.md):
  finish the S1 light test, rebake, check, the warehouse / light suites, after shots, checker.
- **C cameras and lasers:** `feature/sector-fixes-c` abc24880 (C:/NightShift/Mobile-Coop-sector-fixes-c;
  docs/sector-fixes/c/WIP.md): check and the camera / laser suites after the master merge, checker; protocol 27 if the
  wire changed (J is 26).

## 3. anim-skeleton (T3) - DONE apart from follow-ups held by Course Ready (docs/anim-skeleton/STATE.md).

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME (new session or account). Read CLAUDE.md and docs/ROADMAP.md (latest on
origin/feature/menu), then C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch
feature/anim-natural; git pull first) and follow it. Order: (1) anim-natural N3 on feature/anim-n3 (worktree
C:/NightShift/Mobile-Coop-anim-n3): check the laptop runner's verdict on 9de88a66 (ask "Night Shift | Character
Build" if none arrived); on a pass take the desktop heavy.lock when the orchestrator's queue allows, build, take the
GPU after sheets (audit.mjs proving --only=draw/holster/swap rows, port 4189), release, then open the PR to master
(minor; body per the resume file) and message the orchestrator. (2) N3b on feature/anim-n3b (worktree
C:/NightShift/Mobile-Coop-anim-n3b): read docs/anim-natural/n3b/STATE.md; if the implementer's work is uncommitted,
review and commit it, run a fresh checker, merge master, area suites (laptop or lock), PR. (3) Then sector-fixes L and
C. Parallel agents allowed (full burn). Branch guard before every write; the atomic heavy.lock rule; check the 5-hour
meter before each agent (97% no new agent, 98% commit / push / update the resume file, stopped by 99%). Message
"Night Shift | Orchestrator" at each slice and PR.
```
