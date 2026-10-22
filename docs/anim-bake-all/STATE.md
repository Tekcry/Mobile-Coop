# anim-bake-all - state

## Now (2026-10-22 ~17:00): train 6
- Laptop on cba9e371: all 12 suites PASS (16:28; in the PR body). CI check green on 6f87bf8d.
- Out of train 5 (orchestrator 16:50): #118 (anim-n3) conflicts in src/anim/tuneRegistry.ts. Trial merge of
  origin/feature/anim-n3 (7c7c5884): the only src conflict is the tuneRows import line (keep `ANIM_BASE` and N3's
  `aliasTuneChanged, aliasTuneValues, ...` list); N3's alias calls in tuneLoad / tuneImport sit inside the blocks that
  already end in `effAll(sec)`, so eff follows. CHANGELOG: keep both Unreleased headings.
- Next: after train 5 lands, merge master, resolve as above, run tuneRegistry / tuneBake / tuneBakeTable / tuneRows /
  the coverage test files + tsc, then its area suites (e2e-anim, e2e-studio) on the new head; train 6.

## Before (2026-10-22 ~15:20)
Merged master 4.54.1 (origin/master 6c2d50a4: 4.54.0 train 3 #103 + #113, and the #117 flake fix) at df512ab5.
Conflicts: CHANGELOG (Unreleased - anim-bake-all kept on top, #103's entries now under 4.54.0) and
`scripts/anim-tune-bake.mjs` (kept the catalogue-derived section list; cq arrives via cqGait.ts). `cq` (holds and
carries, CQ_GAIT code rules, `cqRows` reads the tuner values) added to `GENERIC_REFUSED` with the coverage test. tsc,
lint (0 errors) and 9 unit files (the bake files, cqGait, the two skeleton identity files) green.

## Next
0c. (16:40) PR #123 open; master 4.55.0 merged (cba9e371). Laptop check on a850e103 failed animSkeletonRows.test.ts:127
   (alloc): not a regression, sampleKeyed allocates ~49 B / call under vitest on master and branch alike (forced GC +
   new-space reads); a GC-timing flake, reported to the orchestrator. Laptop asked for the e2e suites on cba9e371.
0b. (16:05) Desktop anim-audit on a850e103 (/c/NightShift/ctb7-audit.log): local 703 / remote 85; every local metric identical
   to #103's audit (abt-aa.log, 703 / 108), remote within run noise (footSink 22 -> 0, others +-1). Waits on the laptop verdict.
0. (15:55) Job lead accepted the cq refusal (GENERIC_REFUSED) and documented it in BAKE.md (a850e103). Laptop asked to run
   check + the 11 logic suites on a850e103; anim-audit on the desktop after CT Core's current batch.
1. npm run check + the area suites (smoke e2e-move e2e-traverse e2e-anchors e2e-stealth e2e-weapons-carry e2e-anim
   e2e-clip e2e-wall e2e-coop e2e-ct e2e-studio anim-audit) under the lock or on the laptop runner; then the PR (minor)
   naming the gameplay values (Speed glideFwdMul, Weight startMul / stopMul / turnMul / turnRunMul, stopSettle).
2. After N1's PR: route the Stepping code rules step.idle lift -> PLANNER.idleLift and lock -> TURN_FOLLOW to Wren's
   generic sections.step (since item 24 the tuner applies them to Wren only, but a bake moves guards too; N1 STATE item 5).

## Open
- The partner does not read the move sections (needs the role on the wire); the Body root offsets do not reach the partner / puppets; the generic table applies only where each slider applies today.
- A composed add value can pass its slider's own range (consumer clamps still apply).
- The bypass now shows the code defaults including the generic table; a shared target with differing groups bakes per state.

## Done
- 2026-10-22 09:35: checker PASS.
- 2026-10-22 09:15: implementer (every slider bakes).
- 2026-10-22 08:25: branch from feature/anim-bake-targets a134f47e; BRIEF, STATE.

## Polish (from the check, non-blocking; do in the PR body or a small follow-up)
- Name every gameplay value in the PR: Speed glideFwdMul, and the Weight momentum sliders startMul / stopMul / turnMul /
  turnRunMul (their rules move CT.startTime etc., marked gameplay; when groups differ they now bake per state into
  sections.weight) and stopSettle; the CHANGELOG line to match.
- Stale comments `src/anim/tune.ts:560`, `:916` ("the bypass held: identity": it now reads the base).
- `tuneRegistry.ts` baseFill accepts hand-written rows the bake refuses (a `sections.joint...` row, a
  `sections.body.<g>.<Body base field>` row that would double with the `body` key): skip and name them with
  `sectionTarget`'s checks.
- `moveTune.ts:51` panel note: a baked move offset applies to each player's own role on their own screen, never the
  remote rig.
- From #103: `studioStage.ts:514` reads `TUNE_BODY.hold` (tuner values), so a baked guardGapAdd / guardSideAdd does not
  move the studio guard.
- The old all-equal strideMul bake moved MOVEMENT (every rig); per state is local only, matching the tuner: say so in
  the PR. e2e-menus (tuner camera set) is covered by the laptop full e2e.
