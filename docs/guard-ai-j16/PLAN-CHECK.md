# guard-ai-j16: plan check 1
Checker: Opus 5.5, 2026-10-27 04:37, PLAN at 14b5e11e8.
Verdict: PASS (with a fold-in list for the builder; nothing blocks the build)

Read: origin/master CLAUDE.md, RULES "Intake" and "Walk pacing", session-method "Intake detail" gate 3,
templates/plan-check.md; BRIEF and PLAN on the branch; char-shadow-meter PLAN sections 2 and 6 and briefs/S3b.md
(master); G352, G379 (DECISIONS.md:1993, :2126). Code spot-checked on 14b5e11e8 (master 1b20393c7 base).

## Intent
- Quotes are verbatim with times and match DECISIONS: G352 "Meter and guards read them", G379 / Q14 "A faint cue"
  (BRIEF:9-18). The picked option's text ("a moving shadow in his focus cone raises suspicion only, never detection")
  is kept apart from Michael's words. ok.
- The cue rule stays inside "suspicion only, never a sighting": meter floor 0.35 (above `suspicious` 0.3,
  perception.ts:45; below `HEARING.turnMax` 0.45 and `investigate` 0.6); no `heard`, `lastKnown`, `sawOnce`, target
  or board report (BRIEF A5, PLAN:109-118). Checked in code: the rise's cause is RISE_NONE (no `seen`, no `heard`,
  enemy.ts:2335-2337), so the sweep-mate follow and the lookout spot call (both RISE_SIGHT only,
  enemyManager.ts:2378-2386, :2770-2782) do not fire. ok.
- Focus cone only (A3) matches the option text "in his focus cone"; G379's "in a guard's view" is not read wider. ok.
- One inaccuracy (fold-in 2): A5 says "no bark", but unaware -> suspicious always barks 'suspicious' (onLevel,
  enemy.ts:2342-2343), as hearing's `hearTurn` does today. That is suspicion-level feedback, not off-intent.
- Carried bodies (A8) depart from the hand-off's "a carried body at its carrier" (char-shadow-meter PLAN :268) and pass
  it to Player's `fillOperator`. Reasoned and undoable; Player has not been told (fold-in 5).

## Gates
- Hard rules: pure new modules (no Babylon, rig, preset, governor or shadow map; `hitVolumes` / `proportions` are in
  src/player/proportions.ts, Babylon-free); hot path through module typed-array scratch with `allocPerCall` 0 per
  slice (PLAN:120-124), matching the S3b boxing lesson; strict TS; dark behind `charShadowLight`. ok.
- Co-op: host and solo only. `EnemyManager` is built only when not a puppet (gameState.ts:741-749); S3b-2 builds
  `shadowCues` only when `!this.puppet` (S3b.md:53-56); no wire or save change (claims `protocol: none`, `save: none`).
  Player owner keys line up: `fillPlayers` keys `occKey(player, s)` in `playerRefsInto` order
  (charOccluderFill.ts:118) and the manager's `players()` is the same `playerRefsInto` (gameState.ts:749). ok.
- Flag-off parity: `totalAt` / `bodyLevel` default `chars = null, skip = -1` (lightField.ts:301, :466), so passing a
  null contract and a key is today's arithmetic; `charOccluders` is null with the flag off (gameState.ts:385), so G4a's
  `enemyMgr.chars = this.charOccluders` stays null. ok.
- Linger arithmetic checked against alertState.ts: `turning` (enemy.ts:2907 `turnT > 0`) blocks the linger rule
  (alertState.ts:170) while cues repeat; after the last cue 0.35 -> 0.15 takes 2.22 s at the half drain 0.09/s
  (perception.ts:212) or 1.11 s at the full 0.18/s, inside `hearLook` 2.4 s, so :173 calms him. 0.15 + 0.09 x 2.4 =
  0.366 is the break point the PLAN names. ok. Edge (fold-in 4): with a real glimpse of the target under `hold` 1.2 s
  (perception.ts:213) the meter holds before draining and can outlast the look; that escalation comes from sight, not
  the shadow alone, so intent holds.
- Walk pacing: built dark; switch-on waits for Michael's walk (BRIEF:34-35). /preview/ default-on is the orchestrator's
  prototype-mode call (2026-10-27 ~04:15). ok.
- No map or look: no sign-off needed. ok.

## Claims
- Claims block present (PLAN:19-36) and covers every file the slices name.
- claims-check (2026-10-27, `--name feature/guard-ai-j16`): 72 overlaps, as the PLAN's own note (PLAN:41-44) says:
  - src/ai/enemy.ts, src/ai/enemyManager.ts, scripts/e2e-stealth-ai.mjs: guard-ai-mission-hooks (+ -s1a1, -s1a2,
    -s1b, -s2, -s3a, -s3b, -s4; -s4 is 46 commits ahead, +184 enemy.ts, +642 enemyManager.ts, +730 e2e, not merged);
    marlow-kit-wire and piano-escape-s6 (guard-rules PLAN claims; piano-escape-s6 also docs/systems/ai.md).
  - src/game/gameState.ts: ~60 branches (coop-kit, map-ready, mission-rules / -r1..-r8 / tallow-*, mission-engine,
    mission-d-wharf, look-video-tallow, mixamo-kit, piano-escape / -s1..-s9, piano-lights-so2 / -so4 / -so5b,
    player-batch-j19, marlow-kit-wire's char-shadow-meter claims).
  - docs/systems/ai.md: marlow-kit-wire (sector-batch, guard-rules), piano-escape-s6.
- Settled by the orchestrator's decisions: G3 lands after the piano escape; S3b-2 is sequenced by the orchestrator;
  G4b waits only on S3b-2 (PLAN:93). The job's new lines are a new method, a block and one call each; overlaps are
  rebase work, not shared lines. One live interaction to watch: fold-in 3 (mission-hooks' `orderSlot`).

## Slices
- G1 ~340 lines (~140 code), ~2 h: ok. Files, checks and done line present.
- G2 ~310 lines (~110 code), ~2 h: ok.
- G3 ~355 lines (~135 code), ~3-4 h: ok; see fold-ins 1, 2, 6.
- G4a ~15 lines: ok. G4b ~3 lines, after S3b-2 on master: ok; its done check needs fold-in 1.
- G5 ~160 lines (Sonnet, strict Opus brief), after G4b: ok; see fold-in 7.
- G6 ~25 lines docs (ai.md:59-62 is the right anchor today): ok.
- PR 1 ~1.0k (G1-G3, dark by null fields), PR 2 ~0.2k: inside the ~1.5k cap; two Opus checkers each (RULES "A job").
- Flag: `charShadowLight`, owner Sector Ops Build, switch-on after J10, S4, S5 and PR 2 on Michael's walk yes. ok.

## Walk pacing
- Guard AI 5 unwalked (over the cap), Lighting 3, Sector Ops 3 (BRIEF:34-35): every slice builds dark; nothing
  switches on live. ok.

## Fold-in list (builder; not blocking)
1. G3 / G4b: `AiContext` must read `chars` and `cues` through the manager, e.g. `chars: () => this.chars` as the
   context does for `stealth`, `coordinated`, `sceneDark` (enemyManager.ts:697-699). A plain `chars: this.chars` in the
   literal (built once, :634) freezes null, and G4b's set after construction would never reach a guard. Done looks
   like: G4b's probe also asserts a guard's view (e.g. `__game.enemyMgr.enemies[0]` ctx reads the same `ShadowCues`),
   and a unit test sets `mgr.cues` after construction and sees the cue fire.
2. A5 / PLAN section 1: say that the cue's unaware -> suspicious step barks 'suspicious' (onLevel, enemy.ts:2343) as a
   heard sound does, or hush it on purpose; the G3 test asserts whichever is chosen. Done looks like: A5 and the walk
   item describe the actual feedback (white arc plus the suspicious line, or arc only).
3. After guard-ai-mission-hooks lands, a guard on a mission order (`orderSlot >= 0`) goes suspicious from a cue but
   keeps walking (its calmDecide branch runs before the `turnT` look and in 'suspicious' while `rate <= 0`). Either add
   `orderSlot` to the A6 gate list or accept it as for lure / breaker walks, and say which in A6. Done looks like: one
   line in A6 and a test case when G3 rebases onto mission-hooks.
4. PLAN section 1's margin sentence: add that the drain starts at once only when the target was not seen in the last
   `hold` 1.2 s; inside it the hold comes from a real glimpse (RISE_SIGHT), not the shadow. Done looks like: the
   sentence, and the 30 s test also covers a cue right after a glimpse that drains (it may investigate; it is sight).
5. A8: send the carried-body capsule hand-off to the orchestrator for Player's `fillOperator` brief (and note it in
   char-shadow-meter section 6's Guard AI item 1). Done looks like: the line in the job STATE and the message sent.
6. G3 placement: run `shadowLook()` after `perceive`'s tail (enemy.ts:2840-2845 writes `stimulus` from the target's
   feet when `rate > 0`), so a cue's stimulus is not overwritten by a sub-leak glimpse of another player, and `cueX` /
   `cueZ` equal the stimulus the guard turns to. The 3+ player ray: skip the cue when `used + 1 > PERCEIVE.maxRays`.
   Done looks like: both stated in the G3 brief and covered by `shadowNoticePerceive` cases.
7. G5 brief: keep the walking player beyond `closeRange` 1.8 m (perception.ts:32, notices a moving body at any angle)
   and quiet enough not to be heard (crouch-walk or out of earshot); a heard step calls `hearTurn` and turns him to the
   player, confounding "faces the point". Done looks like: the brief names the spacing and gait, and the scenario
   asserts `heard` / hearing turns stayed 0 during the run.
