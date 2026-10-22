# anim-bake-all - state

## Now (2026-10-22 ~14:50 save point)
#103 merged in (86694475: master 4.53.0 via #103; guard tuning and clip speed: the guard sections and clip are refused
by the generic table, `GENERIC_REFUSED`; tsc + 12 unit files green; identity bake dry-run no diff). #103 is now on master
(4.54.0, #114).

## Next
1. Merge master 4.54.0 (origin/master 99f3e488), tsc + the bake test files; then npm run check + the area suites
   (smoke e2e-move e2e-traverse e2e-anchors e2e-stealth e2e-weapons-carry e2e-anim e2e-clip e2e-wall e2e-coop e2e-ct
   e2e-studio anim-audit) under the lock or on the laptop runner; PR (minor) naming the gameplay values (Speed
   glideFwdMul, Weight startMul / stopMul / turnMul / turnRunMul, stopSettle).
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
