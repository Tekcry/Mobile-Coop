# anim-fix-pass - BRIEF

Lead: Night Shift | Player Build. Branch `feature/anim-fix-pass`, folder `Mobile-Coop-anim-fix-pass`, cut from
`feature/mocap-strafe` 191c3565 (#221). Planner: Opus, 2026-10-23.

## The ask (Michael's walk on 4.72 / 4.73, 2026-10-23 ~13:55, verbatim; scratch/ctcore/walk472.md lines 5-10)
- P1 Mocap locomotion: "turning when walking is ok legs wise but anything faster is bad, legs sticking and overlapping eachother, hands randomly moving around when running, weird pose when running."
- P2 Crouch: "crouched idle looks ok, leaning a bit too far forward seems hard to balance in real life, the crouch walk is still awkard."
- P3 Mocap off: "has old animations which are also still as bad as they originally were."
- P4 Crouch cover strafe: "with rifle clips and moves around constantly, pistol shifts between knees."
- P5 Co-op partner: "animations are bad, doesnt match existing animations, seem more jumpy."

Direction (ROADMAP Decided 13:55): "We need to fix all animations anyway, even the normal ones arent good"; a full
animation fix pass planned from P1-P5 with measured before / after sheets; top priority (Michael 2026-10-20 "movement
and animations are the top priority").

## Goal
Every state Michael named reads as natural at a glance and passes the measured bars in PLAN.md: no crossed or stuck
feet at jog / run / sprint and in fast turns, steady hands and a CT run carriage, a balanced crouch and a consistent
crouch walk, a crouched aimed strafe and wall slide whose gun never clips and whose pistol stays on one side, and a
co-op partner that plays the same animation as its owner without pops.

## Limits
- Current goal (CLAUDE.md): no refining before Michael's playtest, but this pass fixes broken / awkward animation he
  reported (P1-P5). Nothing outside P1-P5 is touched; other "old" states (drawn low-ready, aimed glide fwd / back,
  standing idle) go on the polish list, not into slices. At most 1 fix round per slice unless still broken.
- Authority: CT footage (G1). Numbers from docs/ct-prototype/audit/AUDIT-LOCOMOTION.md (rows 27-28: sneak back
  35-45 deg rounded, crouch walk torso 30-45 deg, head level, hip-width stance; bible ~38 deg crouch) and the bible's
  animation realism standard.
- COMMON-27 rules: worktree only, no npm ci, hot paths never allocate, hyp2 / hyp3, strict TS, single Vitest files,
  e2e one suite at a time under a desktop lane lock with `E2E_GPU=1`; never e2e-coop / e2e-netmove / e2e-ctcourse on
  the desktop (laptop, through the lead).
- No downloads: only the CMU takes already in the repo (a new take needs Michael's OK first).
- Overlaps:
  - feature/crouch-pops (another agent, stand <-> crouch transition pops). At 191c3565 it has no tracked edits; its
    probes target `src/anim/animBase.ts` Body rows (trackMul, elbowOutAdd), `src/anim/tune.ts` bodyBase and the
    characterRig crouch blend. This pass does not edit animBase.ts or tune.ts, and the characterRig slices stay out of
    the crouch-blend code (the stance weight / crouch entry blocks). Re-check its diff before AF2 / AF4a start.
  - #221 mocap-strafe (MT2-STRAFE.md "Recheck after round 3" polish 1-7). Items 1-6 sit behind `keyStrafe`, which is
    0 crouched (animGraph.ts:2302 `(1 - kCk)`), so none of them can cause P4; they stay #221's polish list. Item 7
    (run `expectClean` on new plans; crouched / wall entries) is folded into AF0's harness.

## Michael's answers
(none yet)

## Assumed decisions (logged; the job carries on; each with how to undo)
- A1 (P3, the decision): mocap-off is fixed by making mocap the only player path, not by re-keying the old clips.
  Evidence: mocap is already the default (settings.ts:125 `MOCAP_V`, :157 `mocapLoco: true`, :371 migration); the
  switch only swaps the holstered standing walk / jog / run / sprint, the walk start / stop / turn slots, the holstered
  crouched sneak band and the standing aimed strafe (mocap.ts:176-183, animGraph.ts:1033-1036); every other state
  (crouch walk / run bands, drawn low-ready, aimed glide, crouched aimed strafe, wall, idle) is the same in both modes,
  so re-keying the OFF walk / jog / run fixes only a path no player reaches by default and redoes the work mocap
  replaced. The OFF-only code is the KEYED_WALK / JOG / RUN branch plus its test twins; all other keyed assets stay in
  use. So AF5 hides the Settings row (settingsScreen.ts:156 and its reset at :212) and makes a stored OFF save not
  stick (app.ts:137 / :141); `?mocap=0` and the tuner box stay as the developer rollback, so M4's "the hand-keyed set
  stays behind the switch" still holds. Undo: restore the settingsScreen row and reset line, revert app.ts. This narrows
  M4 for players: flagged to Michael at the PR.
- A2 (P1 pose): "as captured" (mocap M1) yields to "weird pose when running": the run / sprint get a pelvis-height
  correction, the procedural run lean and the turn bank over the captured trunk (AF2). Undo: zero the new MOCAP_LAYERS
  entries (one line each in mocap.ts).
- A3 (P2): the crouch idle is kept (Michael: "looks ok"). The crouch walk / sneak trunk target is 30-38 deg (CT rows
  27-28), hips back over the feet; the gear-1 / 2 capture gets a lean and hips-back correction rather than being
  dropped (AF3 drops it only if the corrected capture still misses the bars, and logs that as A3b). Undo:
  MOCAP_CROUCH_POSE back to `{ lean: 0, drop: 0 }` (animGraph.ts:2823), CROUCH_STEP back to `{ k: 0.2, max: 0.95 }`.
- A4 (P4 scope): "crouch cover strafe" is read as both the free crouched aimed strafe (rifle, pistol) and the drawn
  crouched back-to-wall slide; both are in AF4a / AF4b. Undo: none needed (scope only).
- A5 (P5): fixes stay on the receiving side first (interpolated speed, sender-time stamps, buffer depth, the post-wall
  yaw limit). The gait phase / stop-hold on the wire only if AF6's measurement still fails `gaitPhase`; that is a
  wire change and bumps PROTOCOL_VERSION and its tests. Undo: revert the src/net commits.
- A6 (testing): e2e-coop / e2e-netmove / e2e-ctcourse go to the laptop through the lead; on the desktop the
  `anim-audit --remote` run (GPU, port 4189, `E2E_NETSIM=typical`) stands in for P5's measurement.
- A7 (tools): two measurement-tool edits on this branch, no src: `scripts/anim-sheet.mjs` gains `aimcrouchstrafep`
  (the pistol crouched aimed strafe), and AF0 fixes the stale crouch gear caps in `scripts/anim-audit.mjs:478`
  (0.42..2.3 vs the live GEARS.crouch 0.85 / 1.3 / 1.7 / 2.15 / 2.6). Undo: revert those lines.
