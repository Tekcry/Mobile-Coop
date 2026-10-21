# anim-bake-all - state

## Now
Implementer done (09:15): ANIM_BASE.sections for every slider without a code value (composed in the registry: values / base / eff), strideMul per state, moves and camera / weight / step / speed glide baked; BAKE_MANUAL holds only the mirror lock; a test exporting every slider bakes with 0 manual. check (2588 tests) and e2e-studio / e2e-move / e2e-anim / e2e-weapons-carry pass. Checker running.

## Next
1. Checker, one fix round; merge master once #103 lands; laptop full e2e; PR (name the Speed glideFwdMul gameplay change).

## Open
- The partner does not read the move sections (needs the role on the wire); the Body root offsets do not reach the partner / puppets; the generic table applies only where each slider applies today.
- A composed add value can pass its slider's own range (consumer clamps still apply).
- The bypass now shows the code defaults including the generic table; a shared target with differing groups bakes per state.

## Done
- 2026-10-22 09:15: implementer (every slider bakes).
- 2026-10-22 08:25: branch from feature/anim-bake-targets a134f47e; BRIEF, STATE.
