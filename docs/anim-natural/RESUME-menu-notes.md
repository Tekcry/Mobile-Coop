# Night Shift | Menu Notes Build - resume (updated 2026-10-22 ~18:20, before a clear)

Every open job this session leads, with branches, heads, next steps and rules. Read CLAUDE.md and docs/ROADMAP.md
first, then this file. Message "Night Shift | Orchestrator" at each slice and PR.

## Update 2026-10-22 ~19:10 (after the clear)
- N0 leftovers committed: feature/anim-natural 81102f93 (rows 29 / 39 / 49 script problems, no game bug; logic check passed; stage-light !ms.sourceMesh fix in). GPU sheets requested from Character Build (5 rows, docs/anim-natural/audit/).
- #122 / #127 / #129 are in train/6 (6551afe9): no master merges unless train 6 sends one back.
- sector-fixes P: feature/sector-fixes-p in C:/NightShift/Mobile-Coop-sector-fixes-p, from master 4.56.0 with feature/sector-fixes-c merged in (58950220). Implementer running (uncommitted work there: check git status / diff on resume; WIP docs/sector-fixes/p/WIP.md). A1: the panel is the lasers' jam point. Next: laptop suites, fresh checker, PR (write changes/feature-sector-fixes-p.md instead of CHANGELOG once #131 lands).

## Rules in force (orchestrator, 2026-10-22)
- (Michael 17:50, CLAUDE.md on origin/feature/menu "Machines") The LAPTOP (Character Build) is the main test machine, GPU
  included: full runs, co-op suites (e2e-coop / netmove / ctcourse) and GPU work (anim-audit, sheets, shots) go there with
  branch, commit, suites and output paths. The desktop runs quick single suites at E2E_JOBS=1 only.
- A PR whose fresh checker passed joins the next merge train on CI check only (PRs touching src/net, PROTOCOL_VERSION or
  the save shape pass their area suites first). A test result stands for a later commit that only changes docs /
  CHANGELOG / test scripts. Changelog fragments are coming (format from the orchestrator).
- Never edit a shell script while a copy of it runs (bash reads it lazily): write a new file.
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
- **N3: PR #118** (feature/anim-n3 4d90926e) in train 5, releasing as 4.56.0 (#130) if CI passes. Nothing to do.
  (The real LT-mid-holster clip is on the PR body / WIP polish list.)
- **N3b: PR #122** (feature/anim-n3b b5de90f8, N3 merged in) for train 6: area suites ok on b5de90f8. After 4.56.0
  lands: merge master in (expect CHANGELOG conflicts; N3 is already in), tsc + the anim / tuner unit tests, push.
- **#125 fix/local-transport-closed** (c19b28fe): coop + netmove PASS (laptop and desktop solo); in train 5.
- **N0 audit:** pass 1 + pass 2 done (feature/anim-natural 905e115f): AUDIT.md, PASS2.md, fixes 23-36, sheets.
  Not captured: 29 / 39 (aiming at the wall end steps her off the wall; needs anim-audit's wall driver), 49 elbow strike
  (no strike starts with a calm guard in reach; find what blocks it), 31 launcher (not in game), 80 (covered by revive B).

## 2. sector-fixes (after the N3 PR) - take L and C only (W is Character Build's)
- **L lights: PR #129** (feature/sector-fixes f21cc2b1) for train 6 once the GPU after-shots are back: requested from
  Character Build (sector-lights-shots.mjs after + --sheet, e2e-darkness; it pushes them to feature/sector-fixes or
  says where they are). After 4.56.0 lands: merge master in.
- **C cameras and lasers: PR #127** (feature/sector-fixes-c 705786d6) for train 6 (checker PASS; coop pageerror fixed by
  #125 in train 5). After 4.56.0 lands: merge master in.
- **N0 pass 2 leftovers** (rows 29 / 39 wall-end aim, 49 elbow strike): an implementer agent was running at the clear,
  editing feature/anim-natural UNCOMMITTED (scripts/anim-natural/audit.mjs, docs/anim-natural/PASS2.md / AUDIT.md).
  On resume: `git -C C:/NightShift/Mobile-Coop-anim-natural status` / `diff`; if its work is there and coherent, commit
  it; if row 49 turned out to be a game bug, report it to the orchestrator (no src change on this branch). GPU sheets for
  the rows go to the laptop.
- **Next job: sector-fixes P (laser panels, BRIEF item 6)**, unblocked by C: each laser group gets a power panel nearby,
  out of plain sight and hard to reach, the jammer interrupts it, electro vision highlights panels (BRIEF lines 35-37 on
  feature/sector-fixes). Branch it from master after 4.56.0 (feature/sector-fixes-p, worktree
  C:/NightShift/Mobile-Coop-sector-fixes-p); a wire change takes the next PROTOCOL_VERSION (master is 28).

## 3. anim-skeleton (T3) - DONE apart from follow-ups held by Course Ready (docs/anim-skeleton/STATE.md).

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME (new session or after a clear). Read CLAUDE.md and docs/ROADMAP.md (latest on
origin/feature/menu, including the new "Machines" rules: the laptop is the main test machine, GPU included), then
C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch feature/anim-natural; git pull
first) and follow it. Message "Night Shift | Orchestrator" that you resumed.
Order: (1) Check the N0 leftovers agent's uncommitted work in C:/NightShift/Mobile-Coop-anim-natural (git status / diff):
commit if coherent, report any game bug it found (row 49 elbow strike) to the orchestrator. (2) When 4.56.0 (#130, train
5 with #118 and #125) has landed: merge master into feature/anim-n3b (#122), feature/sector-fixes-c (#127) and
feature/sector-fixes (#129); tsc + the related unit tests; push; tell the orchestrator (train 6). (3) #129 waits for
Character Build's GPU after-shots (docs/sector-fixes/l/); ask if none arrived. (4) Start sector-fixes P (laser panels,
BRIEF item 6 in docs/sector-fixes/BRIEF.md): branch feature/sector-fixes-p from master in
C:/NightShift/Mobile-Coop-sector-fixes-p, write its WIP / plan, implementer, fresh checker, PR. Full burn: parallel
agents allowed; check the 5-hour meter before each agent (97% none, 98% save, 99% stop). Full runs, co-op suites and GPU
work go to Character Build; the desktop runs quick single suites at E2E_JOBS=1 under the atomic heavy.lock. Branch guard
before every write. Message the orchestrator at each slice and PR.
```
