# Night Shift | Menu Notes Build - resume (updated 2026-10-22 ~16:55)

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
- **N3: PR #118** (feature/anim-n3 7c7c5884, master 4.55.1 merged) in merge train 5. Nothing to do unless asked.
- **N3b: PR #122** (feature/anim-n3b b5de90f8): feature/anim-n3 merged in (train 6, orchestrator); full vitest 2747 pass;
  Michael answered A2 "Muzzle down" (in STATE and the PR; DECISIONS at the merge). Laptop queued: e2e-anim, e2e-stealth-ai,
  e2e-coop, e2e-wall on b5de90f8. Next: on green tell the orchestrator; after train 5 lands merge master if it moved.
- **#125 fix/local-transport-closed** (worktree C:/NightShift/Mobile-Coop-local-transport, c19b28fe): closed guard in
  localTransport.post (the e2e-coop teardown pageerror). Laptop queued: e2e-coop, e2e-netmove. Land before #127.
- **N0 audit:** pass 1 + pass 2 done (feature/anim-natural 905e115f): AUDIT.md, PASS2.md, fixes 23-36, sheets.
  Not captured: 29 / 39 (aiming at the wall end steps her off the wall; needs anim-audit's wall driver), 49 elbow strike
  (no strike starts with a calm guard in reach; find what blocks it), 31 launcher (not in game), 80 (covered by revive B).

## 2. sector-fixes (after the N3 PR) - take L and C only (W is Character Build's)
- **L lights:** `feature/sector-fixes` 511d589a (master 4.54.0 merged; an implementer was finishing it uncommitted in the
  worktree at ~16:55 - read its git diff and docs/sector-fixes/l/WIP.md; then merge master 4.55.1, checker, suites, shots) (C:/NightShift/Mobile-Coop-sector-fixes; docs/sector-fixes/l/WIP.md):
  finish the S1 light test, rebake, check, the warehouse / light suites, after shots, checker.
- **C cameras and lasers: PR #127** (feature/sector-fixes-c 705786d6, master 4.55.1 merged). Checker PASS, check PASS,
  sectorops / security ok, laptop solo ctcourse / netmove PASS, coop only the pageerror #125 fixes. Waits for a train.

## 3. anim-skeleton (T3) - DONE apart from follow-ups held by Course Ready (docs/anim-skeleton/STATE.md).

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME (new session or account). Read CLAUDE.md and docs/ROADMAP.md (latest on
origin/feature/menu), then C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch
feature/anim-natural; git pull first) and follow it. Message "Night Shift | Orchestrator" that you resumed.
Order: (1) PRs #118 (train 5), #122 (train 6), #125, #127: act on laptop verdicts / orchestrator asks; merge master
when it moves. (2) sector-fixes L (feature/sector-fixes): finish per docs/sector-fixes/l/WIP.md, merge master,
checker, suites, shots, PR. (3) N0 pass 2 leftovers only if spare. Parallel agents allowed (full burn). Branch guard before every write; atomic heavy.lock; check
the 5-hour meter before each agent (97% no new agent, 98% commit / push / update this file, stopped by 99%).
Message the orchestrator at each slice and PR.
```
