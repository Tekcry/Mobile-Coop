# Night Shift | Menu Notes Build - resume (updated 2026-10-22 ~18:20, before a clear)

Every open job this session leads, with branches, heads, next steps and rules. Read CLAUDE.md and docs/ROADMAP.md
first, then this file. Message "Night Shift | Orchestrator" at each slice and PR.

## LIVE 2026-10-22 ~23:00 (after the clear) - check these first
- vol-cone-fix: worktree C:/NightShift/Mobile-Coop-vol-cone-fix, feature/vol-cone-fix from master 2f1961ad: BEFORE
  533a1f30 (shot script, 14 views; Marlow has no spot or flood = no-change control), AFTER db0ffadf (src/vfx/volLights.ts
  general variant: only kind 'flashlight' beams; tests/volLights.test.ts; changes/feature-vol-cone-fix.md; NOTE.md table
  pending). Laptop main slot (Character Build, 4189) shoots both + --sheet + e2e smoke e2e-darkness e2e-desktop:3 on
  db0ffadf, pushes the shots on top. Fresh checker agent running (read-only). Next: review the pairs (LED-only fallback
  if Marlow / floods change: volBeam one-liner in volLights.ts), fill NOTE.md, PR, message the orchestrator. Master is
  now 4.60.0 (d01300d3); keep the shots on the 2f1961ad base, merge master only before the PR if needed.
- mocap-sheets: real-clip rerun sent to Character Build (laptop slot 2, 4192 GPU) on feature/mocap-sheets-real 8cb4d26c
  (79005dfd + mocap-trial 82f43716, CT Core's ok; worktree C:/NightShift/Mobile-Coop-mocap-sheets-real); it pushes the
  regenerated docs/mocap-trial/sheets/ to that branch. Send the orchestrator the sheet paths at once (Michael waits).
  Start / stop cause: agent running in C:/NightShift/Mobile-Coop-mocap-sheets (may commit there: script fix, merge of
  82f43716, start / stop rerun). CT Core's fix sha comes later: rerun turn + start rows on it if cheap.

## FIRST NEXT STEP after the ~22:30 save (orchestrator ~22:35)
**vol-cone-fix** (patch, render only, its own PR): branch feature/vol-cone-fix from master in
C:/NightShift/Mobile-Coop-vol-cone-fix. The general fix from docs/sector-fixes/l/look-4.58/NOTE.md (PR #152): only
flashlights get the volumetric shaft (src/vfx/postStack.ts:475 `const lamp = l.kind !== 'flashlight';`) plus the cone
floor `Math.max(l.cone.cosOuter, 0.88)` for lamps (~:485). GPU before / after shots (scripts/sector-lights-shots.mjs has
GFX / VOL / SUFFIX / PROBE / VOLFIX switches; extend or add views): Sector Ops S1-S3, Marlow Yard (a spot-lit station), the
base Warehouse floods, and the workshop crane-girder parity spot (x 16, warehouseS1.ts:334). If Marlow or the floods
change visibly beyond a faint haze, fall back to NOTE.md's narrow LED-only variant. Implementer, fresh checker, PR with
the shots, message the orchestrator. GPU lanes: heavy.lock / 4189 or heavy2.lock / 4192 (CPU < 50%).

## Update 2026-10-22 ~21:45 (save before the account swap) - START HERE
Rules added tonight (orchestrator; CLAUDE.md on feature/menu): e2e ALWAYS on the GPU (`E2E_GPU=1`), a GPU failure
counts; desktop lanes: heavy.lock (checks + e2e, port 4191, E2E_JOBS=2, CPU < 60%) and the GPU-only heavy2.lock (port
4192, E2E_JOBS=1, CPU < 50%), both atomic noclobber; a PR enters a train only when every suite it touches ran to
completion and passed on the GPU (a train's full run counts for its members); a stopped background runner on Windows
can survive: kill its process tree (taskkill /T /F) and confirm.
- **sector-fixes P: PR #136, head d98262dc, in train 9** (train/9 b0cb16b6). Nothing to do unless train 9 sends it
  back. S is DONE by #115 (recorded in sector-fixes STATE). R is Course Ready's.
- **anim-n4c: PR #139, in train 9 at 5f6a0d9d**; branch head 304450f7 = + master 4.58.1 merge only. Hand swap low
  across the chest, elbow strike from the hips, M1 "Faster arm" (Michael). Nothing to do unless train 9 sends it back.
- **anim-n4d: PR #142** (feature/anim-n4d 663a7016, C:/NightShift/Mobile-Coop-anim-n4d; code 74cb0634, later commits
  docs + the 4.58.1 merge). Takedown blow and grab kill land on the kill (M1 principle, A1-A5), strike accept never
  steps back. Fresh checker PASS; desktop GPU run on 74cb0634 complete and green (check 233 s; takedown, anim, coop,
  netmove, ctcourse). Stacked on #139: once #139 merges (train 9), merge origin/master into feature/anim-n4d, push, tell
  the orchestrator. Next state: docs/anim-natural/n4d/STATE.md.
- **menus-tap-wait: PR #147** (feature/menus-tap-wait 99a6330f, C:/NightShift/Mobile-Coop-menus-tap-wait): e2e-menus touch
  pause / Resume taps wait for the screen (test only; the train 9 laptop failure). e2e-menus GPU PASS. The orchestrator adds
  it to train 9. Nothing to do unless it comes back.
- **mocap-sheets (for CT Core): SECOND next step.** feature/mocap-sheets 79005dfd (pushed; worktree
  C:/NightShift/Mobile-Coop-mocap-sheets; from origin/feature/mocap-trial e90ddad3; scripts + docs only, CT Core merges
  it). scripts/mocap-sheets.mjs works; the placeholder proof ran on e90ddad3 (docs/mocap-trial/sheets/, index.md; the
  capture-vs-limit notes are in). Proof result: walk / jog / run / turns near identical (<= 5 px over 8), but start (330
  px) and stop (1718 px) differ between mocap=0 and mocap=1 on placeholders: find why first (non-determinism in the
  event rows, or the placeholder slots were not identical). Then merge origin/feature/mocap-trial (CT Core's real CMU
  clips: a05bdde7 or newer; ask CT Core for its current head), rerun all rows on GPU lane 2 (heavy2.lock, 4192,
  CPU < 50%), commit, push, message CT Core the sha and the sheet paths. No detached runs: the agent was stopped at the
  save, its processes killed, heavy2.lock released.
- **sector-look: PR #152** (feature/sector-look e02e5edb, docs + script switch): the strip-light fog cones are a
  render-only bug (src/vfx/postStack.ts:475 `lamp = !l.cone`); fix proposed in docs/sector-fixes/l/look-4.58/NOTE.md, not
  applied. Asked the orchestrator whether to build the fix as its own PR (render only, GPU before / after).
- After n4d: ask the orchestrator for the next N4 rows (the n4c / n4d polish lists are in their STATE files).

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
Night Shift | Menu Notes Build: RESUME (new session or after a clear). START at "FIRST NEXT STEP", then the "~21:45" update. Read CLAUDE.md and docs/ROADMAP.md (latest on
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
