# anim-rig - state

## Now
Rebake done and shipped (LOD0-2), PR to feature/ct-prototype open; e2e-anim / e2e-clip on the PR head requested from
the laptop test runner (desktop lock held by nv-pass).

## Next
1. Runner result for e2e-anim and e2e-clip on the PR head; CI `check` on the PR. A failure: fix on this branch.
2. The orchestrator merges into feature/ct-prototype.

## Open
- GPU look on the PC: toe bend, toe box in a deep crouch, sling socket positions, the re-baked textures (bake noise only).
- The wrist frame applies inside `keyedArm`, which is off while the knee hand is active (characterRig.ts:2053).
- `operators:check wren` not run after the rebake (Blender per item; the lock passed on). Run it with the next operator build.
- The hero GLB lacks the `slingBack` anchor (A8); nothing reads it.

## Done
- 2026-10-20: toes, wrist frame, sling sockets (PR #39, merged into feature/ct-prototype); Michael approved the MPFB2
  download in chat ("Yes, download it", about 14:45); downloaded add-on-mpfb-v2.0.18.zip into
  `C:/NightShift/downloads/mpfb2-2.0.18/` (own folder, nothing run from it); `fetch-base-body.mjs` MPFB2_ZIP route and the
  `bake_lods.py` back sling anchor.
- 2026-10-20 18:35-18:50: merged origin/feature/ct-prototype; operators:build wren --from waist_belt + operators:lods wren
  under the lock; compared (REPORT.md "Rebake"): only toe weights on 71 / 49 / 2 vertices, the slingBack anchor and the
  textures differ; LOD0-2 copied into `src/operators/assets/wren/`; animRig + operatorsRuntime tests pass (29);
  docs: `docs/operators/MPFB2.md`, `docs/art-credits.md`, `docs/anim-rework/RIG.md`, REPORT A7 / A8.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-rig (the MPFB2 rebake). Folder
C:/NightShift/Mobile-Coop-anim-rig, branch feature/anim-rig (PR base feature/ct-prototype). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-rig && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-rig && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-rig"
Read CLAUDE.md, docs/anim-rig/BRIEF.md and this STATE.md; carry on from "Next". Report results to "Night Shift |
Orchestrator", then STOP.
```
