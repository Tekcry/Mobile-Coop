# anim-rig - state

## Now
Done; PR to feature/ct-prototype open. Next piece (the orchestrator): the guard's hold clips.

## Open
- GPU look on the PC: toe bend, toe box in a deep crouch, sling socket positions.
- Full Blender LOD rebuild needs the MPFB2 download (Michael's call); toes are skinned by `toe-skin.mjs` meanwhile.
- The wrist frame applies inside `keyedArm`, which is off while the knee hand is active (characterRig.ts:2053): CT Core's
  knee-hand clip needs its own path to use it. The toe pitch is written only in `applyTargets`.
- `docs/systems/world-and-characters.md`, CHANGELOG, TESTING: for CT Core at its merge (hands off for this job).

## Done
- 2026-10-20: worktree from feature/ct-prototype 65c5ffcd; toes, wrist frame, sling sockets (bf6086fe, REPORT.md,
  RIG.md); npm run check, e2e-anim, e2e-clip pass; checker PASS (CHECK.md).

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-rig. Folder C:/NightShift/Mobile-Coop-anim-rig, branch
feature/anim-rig (base feature/ct-prototype). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-rig && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-rig && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-rig"
Read CLAUDE.md, docs/anim-rig/BRIEF.md and this STATE.md; carry on from "Now".
```
