# anim-rig - state

## Now
PAUSED (account usage, orchestrator 17:30). MPFB2 rebake of Wren's LODs with real toe weights: half done.

## Next (the MPFB2 rebake, on this branch)
1. `git merge --ff-only origin/feature/ct-prototype` (this branch is behind it: #39 and #41 merged there; it last
   fast-forwarded to 088849a5).
2. Under `C:/NightShift/heavy.lock` (CT Core first): `MPFB2_ZIP=C:/NightShift/downloads/mpfb2-2.0.18/add-on-mpfb-v2.0.18.zip`
   then the operator build (`npm run operators:build`, see `scripts/operators/README.md`): it takes the CC0 data files
   from the zip (`fetch-base-body.mjs`, MPFB2_ZIP route) and rebakes Wren's LODs through `bake_lods.py` with the toe
   joints and the back sling anchor (`slingBack`). Blender `-b` only. The build was killed mid-way at 17:30 in
   `build_fitted.py` (garment waist_belt): restart from the top.
3. Compare to the current assets (joints, counts, sizes, toe weights only on the toe box); if the rebake changes
   anything beyond the toes and the sling anchor in a way that breaks the game or the look, keep the current assets
   (toe-skin.mjs stand-in) and report the differences.
4. `npm run check`, build, e2e-anim and e2e-clip (port 4191); docs: `docs/operators/` MPFB2 note (version 2.0.18,
   source extensions.blender.org add-on-mpfb-v2.0.18.zip as linked from makehumancommunity.org, licences: GPL add-on,
   CC0 body assets, offline only, nothing bundled) and `docs/anim-rework/RIG.md` (rebake replaced the stand-in, or why
   not); then a PR to feature/ct-prototype.

## Open
- GPU look on the PC: toe bend, toe box in a deep crouch, sling socket positions.
- The wrist frame applies inside `keyedArm`, which is off while the knee hand is active (characterRig.ts:2053).

## Done
- 2026-10-20: toes, wrist frame, sling sockets (PR #39, merged into feature/ct-prototype); Michael approved the MPFB2
  download in chat ("Yes, download it", about 14:45); downloaded add-on-mpfb-v2.0.18.zip into
  `C:/NightShift/downloads/mpfb2-2.0.18/` (own folder, nothing run from it); `fetch-base-body.mjs` MPFB2_ZIP route and the
  `bake_lods.py` back sling anchor (committed, not yet run to the end).

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-rig (the MPFB2 rebake). Folder
C:/NightShift/Mobile-Coop-anim-rig, branch feature/anim-rig (PR base feature/ct-prototype). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-rig && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-rig && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-rig"
Read CLAUDE.md, docs/anim-rig/BRIEF.md and this STATE.md; carry on from "Next". Blender -b only, under
C:/NightShift/heavy.lock (CT Core first); never leave a Blender or server process running when you stop. Opus for checks,
Sonnet for chores. Then PR to feature/ct-prototype, message "Night Shift | Orchestrator", STOP.
```
