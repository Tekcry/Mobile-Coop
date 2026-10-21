# anim-bake-all - state

## Now
Checker PASS (09:35, read-only: composition once per consumer, untuned eff == values, the every-slider bake test real). PR waits on #103 (cut from it): merge master after #103 lands, laptop full e2e, PR.

## Next
1. Checker, one fix round; merge master once #103 lands; laptop full e2e; PR (name the Speed glideFwdMul gameplay change).

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
