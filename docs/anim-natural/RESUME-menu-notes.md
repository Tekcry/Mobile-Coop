# Night Shift | Menu Notes Build - resume (updated 2026-10-22 ~15:20)

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
- **N3 weapons: PR OPEN** https://github.com/Tekcry/Mobile-Coop/pull/118 (feature/anim-n3 head 9c31355c, master 4.54.0).
  Orchestrator reviewed it; it leads merge train 5. e2e-weapons-carry ok, e2e-anim ok on 9c31355c (scripts wait out the
  1.0 s holster); GPU after-sheets in docs/anim-natural/n3/after/ (audit.mjs `--dtmul=2.5`). Nothing to do unless master
  moves under it (then merge master, rerun e2e-anim + e2e-weapons-carry).
- **N3b**: `feature/anim-n3b` head 48cb9280 (master 4.54.0 merged at 40bf9c3d). Fresh checker PASS (no must-fix; notes and
  polish in docs/anim-natural/n3b/STATE.md). A2 (wall block muzzle DOWN vs CT muzzle up) waits on Michael: ask in the PR.
  Queued desktop run (C:/NightShift/mn-queue.sh, logs n3b-*.log): npm run check, e2e-anim / stealth-ai / coop / wall,
  GPU sheets wall-block / fire-rifle / fire-pistol (copy them from docs/anim-natural/audit/ in the N3b worktree to
  docs/anim-natural/n3b/after/). **Next:** on green, commit the sheets, open the PR (minor; A1-A3, the A2 question,
  checker polish), message the orchestrator (train 5).
- **N0 audit:** pass 1 + pass 2 done (feature/anim-natural 905e115f): AUDIT.md, PASS2.md, fixes 23-36, sheets.
  Not captured: 29 / 39 (aiming at the wall end steps her off the wall; needs anim-audit's wall driver), 49 elbow strike
  (no strike starts with a calm guard in reach; find what blocks it), 31 launcher (not in game), 80 (covered by revive B).

## 2. sector-fixes (after the N3 PR) - take L and C only (W is Character Build's)
- **L lights:** `feature/sector-fixes` 511d589a (master 4.54.0 merged, tsc clean) (C:/NightShift/Mobile-Coop-sector-fixes; docs/sector-fixes/l/WIP.md):
  finish the S1 light test, rebake, check, the warehouse / light suites, after shots, checker.
- **C cameras and lasers:** `feature/sector-fixes-c` 85b66ffb (master 4.54.0 merged; slice finished by the implementer,
  docs/sector-fixes/c/WIP.md; no wire change, master protocol is 28). Fresh checker running; queued after N3b in
  mn-queue.sh: npm run check, e2e-ctcourse / sectorops / security / coop / netmove, after shots + sheet (logs sfc-*.log).
  Next: the checker verdict (one fix round at most), commit the shots, PR or hand to the orchestrator.

## 3. anim-skeleton (T3) - DONE apart from follow-ups held by Course Ready (docs/anim-skeleton/STATE.md).

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME (new session or account). Read CLAUDE.md and docs/ROADMAP.md (latest on
origin/feature/menu), then C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch
feature/anim-natural; git pull first) and follow it. Message "Night Shift | Orchestrator" that you resumed.
Order: (1) N3 PR #118 is open and in merge train 5: act only if the orchestrator asks or master moves under it.
(2) N3b (feature/anim-n3b, checker PASS): read the results of C:/NightShift/mn-queue.sh (C:/NightShift/n3b-*.log,
mn-queue.out); if the run did not finish, take C:/NightShift/heavy.lock atomically and rerun the N3b half. On green:
commit the GPU sheets to docs/anim-natural/n3b/after/, open the PR (minor; ask Michael about A2 in the body), message the
orchestrator. (3) sector-fixes C (feature/sector-fixes-c 85b66ffb): the fresh checker verdict (rerun a checker if it was
lost), at most one fix round, the queued check / suites / shots (sfc-*.log), then PR. (4) sector-fixes L
(feature/sector-fixes 511d589a): implementer per docs/sector-fixes/l/WIP.md, checker, suites, shots. (5) N0 pass 2
leftovers only if spare. Parallel agents allowed (full burn). Branch guard before every write; atomic heavy.lock; check
the 5-hour meter before each agent (97% no new agent, 98% commit / push / update this file, stopped by 99%).
Message the orchestrator at each slice and PR.
```
