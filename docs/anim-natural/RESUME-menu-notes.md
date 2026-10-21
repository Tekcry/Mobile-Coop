# Night Shift | Menu Notes Build - resume (written 2026-10-22 ~10:00, before a context clear)

Every open job this session leads, with branches, heads, next steps and rules. Read CLAUDE.md and docs/ROADMAP.md
first, then this file. Message "Night Shift | Orchestrator" at each slice and PR.

## Rules in force (orchestrator, 2026-10-21 / 22)
- Usage: check the 5-hour meter (`mcp__ccd_session_mgmt__get_usage`) before every agent; at 97% or more pause at a clean
  commit, push, update the job's STATE and tell the orchestrator. The orchestrator sets how many agents run at once
  (last: one at a time).
- heavy.lock (desktop): take it only atomically, `( set -o noclobber; echo "Night Shift | Menu Notes Build | <job> |
  $(date -Iseconds)" > C:/NightShift/heavy.lock )`, retry if it fails, never overwrite; release only if it still names
  you: `grep -q "Menu Notes Build | <job>" C:/NightShift/heavy.lock && rm C:/NightShift/heavy.lock`. Each e2e on its own
  E2E_PORT (4191 / 4193 / 4195 / 4197 / 4199 used tonight; GPU 4189 under the lock).
- Tests: full e2e on the laptop (Character Build) first; the desktop runs ≤2 named suites at E2E_JOBS=1. Blender and GPU
  looks on the desktop only.
- Subagents can't write report files: the job lead writes REPORT.md from their final message.
- vitest rewrites `tests/__snapshots__/visionIsolation.test.ts.snap` line endings: `git checkout --` it before commits.
- Allocation tests: never `+=` into a captured `let` (it boxes 16 B per iteration on CI); use a Float64Array slot.
- Michael overnight: "Proceed, review AM": build on best judgement, log assumed decisions with their undo.

## 1. anim-natural (TOP PRIORITY) - docs branch `feature/anim-natural` (C:/NightShift/Mobile-Coop-anim-natural, 720b1088)
Brief: docs/anim-natural/BRIEF.md. Menu Notes owns N0 and N3. CT Core owns N1 (feet) and N2 (body motion); the
orchestrator routes AUDIT.md findings 1, 3-7 and 9 to CT Core.
- **N0 audit:** pass 1 done: docs/anim-natural/AUDIT.md (summary, 22 ranked fixes tagged by slice, per-row 1-5 scores,
  per-slice before / after metrics), 69 sheets in docs/anim-natural/audit/ + metrics.json, helper
  scripts/anim-natural/audit.mjs (`E2E_GPU=1`, `studio|proving [--only=...]`, port 4189). Summary sent to the
  orchestrator. **Next: pass 2** for the rows not covered: 10, 12, 16, 24, 25, 29-32, 39, 40, 43, 46, 47, 49, 58,
  61-67, 70, 72, 80; co-op moves 73-78 (the studio pairs put the puppets out of the camera: fix the framing); hit
  flinch 79 (the helper called the wrong method; fixed for pass 2). Proving sheets are back-lit: use the studio stage
  light where possible. Re-run e2e-anim / anim-audit for the metrics.
- **N3 weapons** (draw, holster, swap, low ready -> aim): branch `feature/anim-n3`, worktree
  C:/NightShift/Mobile-Coop-anim-n3 (a worktree of the C:/NightShift/Mobile-Coop clone), head c4487232, UNVERIFIED WIP;
  read docs/anim-natural/n3/WIP.md there. Built: src/anim/drawMotion.ts, src/weapons/drawTune.ts, edits in
  src/weapons/{drawState, playerWeapons, weaponModel, backDiag}.ts, src/player/{characterRig, weaponStance}.ts, and
  (approved, minimal and additive) src/anim/animGraph.ts (the draw hand-off) and src/anim/tuneBakeTable.ts (the draw
  sliders' bake rows); tests/helpers/draw{Harness, Scenarios}.ts, tests/n3*.test.ts (n3Dbg / n3Trace / n3Capture are
  probably scaffolds: delete before the PR). **The stop's cause (N0, AUDIT ranks 2-3):** the X draw flicks the rifle off
  the back (muzzle -52 -> +87 -> 0 deg in 3 frames, 10-11 m/s), holds it level at the shoulder ~0.15 s, then drops to
  low ready (pistol ~0.18 s): the swap clip's pocket keys hold before low ready takes over (`travelKeys` backPocket
  0.65-1.0; pistol 0.8-1.0). Also rank 10: a 12 cm one-frame jump at the swap hand-off; draw-to-aim stops dead.
  **Next:** confirm with the trace, fix all three as one continuous motion (reach, grip, lift / clear, present, settle;
  rifle and pistol), draw timings as sliders that bake (keep today's durations), a test that hand / weapon speed never
  drops near zero mid-draw and end poses are unchanged, check, e2e-anim + the weapons suite (port 4199), GPU before /
  after sheets; then a fresh checker; send the animGraph / tuneBakeTable lines to CT Core before the PR; PR to master.
- **Decisions with Michael** (in the AUDIT summary): (a) lift SWAY_MAX (side sway capped at ~1.7 cm; a walk is 4-5 cm)?
  (b) draw times (rifle 0.3 s, pistol 0.5 s, G2) vs the bible's 0.75 / 0.6 s raise minimums.

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
PRs merged: #88 (S1+S2, 4.42.0), #98 (S3+S4, 4.47.0), #100 (keyCurve evaluator, 4.47.1). Course Ready's #106 (item 30,
OPEN at 0d25265c) wires keyCurve into tuneKeys.ts (the exact preview, 30(e)); Course Ready was told #100 merged (10:30); nothing more
is owed to it.
Follow-ups held by Course Ready (after S4 on master): hide `legX_w` except on `legs` clips; a "Collarbone" part label in
tunerTarget.ts; the studio foot-slide line (reads `rig.footSlide`). Polish list in docs/anim-skeleton/STATE.md and the
s1-s4b reports. The helper worktree C:/NightShift/Mobile-Coop-anim-skeleton-s3 (branch feature/anim-skeleton-s4b, merged)
can be removed with `git worktree remove` when convenient; deleting branches is Michael's call.

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME after a context clear. Read CLAUDE.md, docs/ROADMAP.md, then
C:/NightShift/Mobile-Coop-anim-natural/docs/anim-natural/RESUME-menu-notes.md (branch feature/anim-natural) and follow
it: anim-natural N3 first (resume from its WIP.md), then N0 pass 2; sector-fixes stays parked unless the orchestrator
says otherwise. Implementer + fresh checker per slice, one fix round; branch guard before every write; the atomic
heavy.lock rule; check the 5-hour meter before each agent. Message "Night Shift | Orchestrator" at each slice and PR.
```
