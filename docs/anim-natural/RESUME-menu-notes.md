# Night Shift | Menu Notes Build - resume (updated 2026-10-22 ~13:05 for the account handoff)

Every open job this session leads, with branches, heads, next steps and rules. Read CLAUDE.md and docs/ROADMAP.md
first, then this file. Message "Night Shift | Orchestrator" at each slice and PR.

## Rules in force (orchestrator, 2026-10-21 / 22)
- Usage (Michael ~12:50: "Hard stop at 99% to allow saving work"): check the 5-hour meter
  (`mcp__ccd_session_mgmt__get_usage`) before every agent; at 97% start no new agent; at 98% commit, push, update this
  file / WIP.md and tell the orchestrator; be stopped by 99%. One agent per session (orchestrator).
- heavy.lock (desktop): take it only atomically, `( set -o noclobber; echo "Night Shift | Menu Notes Build | <job> |
  $(date -Iseconds)" > C:/NightShift/heavy.lock )`, retry if it fails, never overwrite; release only if it still names
  you: `grep -q "Menu Notes Build | <job>" C:/NightShift/heavy.lock && rm C:/NightShift/heavy.lock`. Each e2e on its own
  E2E_PORT (4191 / 4193 / 4195 / 4197 / 4199; GPU 4189 under the lock).
- Full test runs are heavy (orchestrator 2026-10-22): a full `npm run check` / full `vitest run` on the desktop takes
  heavy.lock like e2e; single test files, lint and `tsc --noEmit` stay free. Lock held: use the laptop (Character
  Build) or wait.
- Merge trains (Michael): a PR needs CI + its area suites, not a full e2e; the orchestrator runs one full run for 2+
  ready PRs together. Blender and GPU looks on the desktop only.
- Subagents can't write report files: the job lead writes reports from their final message.
- vitest rewrites `tests/__snapshots__/visionIsolation.test.ts.snap` line endings: `git checkout --` it before commits.
- Allocation tests: never `+=` into a captured `let` (it boxes 16 B per iteration on CI); use a Float64Array slot.

## 1. anim-natural (TOP PRIORITY) - docs branch `feature/anim-natural` (C:/NightShift/Mobile-Coop-anim-natural)
Brief: docs/anim-natural/BRIEF.md. Menu Notes owns N0 and N3. CT Core owns N1 (feet) and N2 (body motion); the
orchestrator routes AUDIT.md findings 1, 3-7 and 9 to CT Core.
- **N3 weapons** (draw, holster, swap, low ready -> aim): branch `feature/anim-n3`, worktree
  C:/NightShift/Mobile-Coop-anim-n3 (a worktree of the C:/NightShift/Mobile-Coop clone), head 5348f9be. State and next
  steps: docs/anim-natural/n3/WIP.md there (the "Paused" section is the to-do list); researched times with sources:
  docs/anim-natural/n3/DRAW-TIMES.md (rifle draw 1.1 s, pistol 0.75 s, holsters 1.0 / 0.9 s; Michael 2026-10-22
  "Research what is believable and realistic"; the bible G103 line and table row are already updated on the branch).
  Done: cause confirmed and fixed (the draw's travel ended at SWAP_HOLD 0.8 while the swap clip's pocket keys held the
  gun), one continuous draw / holster / swap for rifle and pistol, the 28 / 11 / 7 cm jumps, 24 rig tests; master
  4.52.0 merged; fresh checker PASS WITH FIXES; CT Core: no clash with N1 / N2. Fix round stopped at 95% (account handoff): must-fixes 1-2 built but UNVERIFIED (fix 1 has no test; fix 2 fails 5 of its 8 new mid-draw scenarios); state and suspects in WIP.md "Fix round, stopped at 95%".
  **Next:** (1) finish the fix round: must-fix 1 (RT pressed during the holster is dropped: arm it while HOLSTERING,
  holster at HOLSTER_TIME_MOVE, strike at phase 0) and must-fix 2 (a holster / traversal mid-draw snaps the gun to its
  slot: reverse from where it is), then should-fixes 3-4 if the meter allows; (2) merge master once #109 clip-speed
  lands (4.53.0, train/2) and split its holster row per gun as agreed with Course Ready (WIP.md "Then"); (3) the area
  e2e under heavy.lock (e2e-anim, e2e-weapons-carry, e2e-studio, plus combat / takedown / stealth for the longer draw;
  E2E_PORT 4199, E2E_JOBS=1) and the full vitest (lock or laptop); (4) GPU before / after sheets (port 4189 under the
  lock); (5) PR to master (minor; CHANGELOG, TESTING, systems docs; old -> new times in the body; the animGraph /
  tuneBakeTable lines and the `swapRel` carriage change; the slower strike / reload / gadget windows); message the
  orchestrator.
- **N0 audit:** pass 1 done: docs/anim-natural/AUDIT.md (summary, 22 ranked fixes tagged by slice, per-row 1-5 scores,
  per-slice before / after metrics), 69 sheets in docs/anim-natural/audit/ + metrics.json, helper
  scripts/anim-natural/audit.mjs (`E2E_GPU=1`, `studio|proving [--only=...]`, port 4189). **Next (after N3): pass 2**
  for the rows not covered: 10, 12, 16, 24, 25, 29-32, 39, 40, 43, 46, 47, 49, 58, 61-67, 70, 72, 80; co-op moves
  73-78 (the studio pairs put the puppets out of the camera: fix the framing); hit flinch 79 (the helper called the
  wrong method; fixed for pass 2). Proving sheets are back-lit: use the studio stage light where possible. Re-run
  e2e-anim / anim-audit for the metrics.
- **Decisions with Michael:** answered 2026-10-22 ~10:40 (ROADMAP Decided): SWAY_MAX lifted to ~5 cm (CT Core N2);
  draw times researched (above); Course Ready built the per-clip speed slider (#109).

## 2. sector-fixes (spare capacity, parked) - `feature/sector-fixes` (C:/NightShift/Mobile-Coop-sector-fixes, 15b6b6b4)
Brief and state: docs/sector-fixes/BRIEF.md, STATE.md. Each slice its own PR. All three are unverified WIP; each has a
WIP.md with the resume step.
- **L lights:** on `feature/sector-fixes` c436f677 (docs/sector-fixes/l/WIP.md): per-room lamp layout
  (src/world/maps/lampRooms.ts), LED fittings, before shots; next: finish the S1 light test, rebake, check, the
  warehouse / light suites, after shots, checker.
- **C cameras and lasers:** `feature/sector-fixes-c` abc24880 (worktree C:/NightShift/Mobile-Coop-sector-fixes-c;
  docs/sector-fixes/c/WIP.md): master 4.48.0 merged with slice J (5 conflicts resolved), after shots taken; next:
  check and the camera / laser suites after the merge, checker; protocol 27 if the wire changed (J is 26).
- **W wheel:** `feature/sector-fixes-w` 3f048e43 (worktree C:/NightShift/Mobile-Coop-sector-fixes-w, from master;
  docs/sector-fixes/w/WIP.md): next: fix its own test (gamepad axis index 0 -> 2), check, e2e-gadgets.
- Then P (laser panels; unblocked, J merged), S, R.

## 3. anim-skeleton (T3) - DONE apart from follow-ups
PRs merged: #88 (S1+S2, 4.42.0), #98 (S3+S4, 4.47.0), #100 (keyCurve evaluator, 4.47.1). Course Ready's #106 (item 30)
landed as 4.51.0 (d52d37a5): tuneKeys.ts previews keys on Blender's curve, so BRIEF item 30(e) is done. Merge master
before touching tuneKeys.
Follow-ups held by Course Ready (after S4 on master): hide `legX_w` except on `legs` clips; a "Collarbone" part label in
tunerTarget.ts; the studio foot-slide line (reads `rig.footSlide`). Polish list in docs/anim-skeleton/STATE.md and the
s1-s4b reports. The helper worktree C:/NightShift/Mobile-Coop-anim-skeleton-s3 (branch feature/anim-skeleton-s4b, merged)
can be removed with `git worktree remove` when convenient; deleting branches is Michael's call.

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME (new session or account). Read CLAUDE.md and docs/ROADMAP.md (latest on
origin/feature/menu), then C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch
feature/anim-natural) and follow it. Order: (1) anim-natural N3 on feature/anim-n3 (worktree
C:/NightShift/Mobile-Coop-anim-n3, head 5348f9be): read docs/anim-natural/n3/WIP.md, "Paused" section; finish the fix
round (must-fixes 1-2 first: RT pressed during the holster is dropped; a holster / traversal mid-draw snaps the gun),
then merge master once #109 clip-speed lands as 4.53.0 and split its holster row per gun (WIP.md "Then"), run the area
e2e (e2e-anim, e2e-weapons-carry, e2e-studio, combat / takedown / stealth) and the full vitest under heavy.lock, take
GPU before / after sheets, open the PR to master and message the orchestrator; (2) then N0 pass 2 (rows listed under
"N0 audit"). sector-fixes stays parked unless the orchestrator says otherwise. One agent at a time: implementer, fresh
checker, one fix round. Branch guard before every write; the atomic heavy.lock rule; check the 5-hour meter before
each agent (97% no new agent, 98% commit / push / update this file, stopped by 99%). Message "Night Shift |
Orchestrator" at each slice and PR.
```
