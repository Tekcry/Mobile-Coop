# Level standard re-audit fixes
kind: patch
- Level standard (`docs/level-design.md`): campaign missions run on the Sector Ops runtime with a 32 alive ceiling;
  engine facts rewritten from the code (five speeds, no sprint, silent bands, guard sight above, doors, camera); one
  checkpoint rule and a downed rule per mode; Marlow Yard's training rules (timed drills, strict rules taught late,
  campaign downed rule, 15-20 min); security devices with a security register; unavoidable guards in Sector Ops;
  helmets and dogs per the 2026-10-25 answers; killing a civilian restarts the section; history cut, profiles point
  to the rules.
- Level validator: the alive ceiling also checks campaign maps; co-op kit size bands (pull-up, relay, rope, throw,
  shutter) from new scale-sheet rows; no softlock reads bolted doors one way; `drill_s` (training only) and the
  `unavoidable` tag. The scale sheet gets the current camera, silent speeds, an interim light rule and patrol timing.
- The level-validator job's STATE / BRIEF / PLAN / V1-check / V6-PLAN moved to `docs/archive/level-validator/`.
