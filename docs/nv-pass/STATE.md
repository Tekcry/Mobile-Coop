# Night vision pass - state

## Now (2026-10-20 17:00, clean point for a context clear)
Slices 1 (the look) and 2 (the goggle frame) are built and committed (75c37d42 code; reports SLICE1.md, SLICE2.md), NOT
yet checked. Unit tests, tsc and lint pass for both; no `npm run check` or e2e yet. GPU window 16:34-16:58 (desktop
lock, released): contact sheets in docs/nv-pass/shots/ (committed: sheet-before-{epic,medium,min}.png = master cf73f8b5,
sheet-s12-{epic,medium,min}.png = slices 1-2; the single shots there stay local, not committed). Each sheet: 5 Marlow
Yard and 4 Warehouse section 1 views, vision off | night vision side by side.
e2e-darkness on the GPU (s12): FAIL "epic night vision: level 0.12 shows 13.5% (target 20-45%)" (deep fill probe rgb
0,1,1); level 0.7 under NV 89.4%; vision-off probes fine. The grey card is a non-voxel surface, so slice 1's body-fill
cap dims it (SLICE1.md open item 1): decide in the check whether the cap is too strong in the dark or the target moves.
No agents running, no lock held.

## Next
1. Fresh Opus CHECKER for slices 1-2 (session-method): reads BRIEF, SLICE1.md, SLICE2.md, the diff
   (`git diff cf73f8b5..HEAD -- src tests scripts`) and every sheet (before vs s12, all three presets); judges against
   Michael's words (readable at night, bodies not bright, realistic green tube, frame not claustrophobic) and light
   parity; returns PASS or a ranked fix list. Watch: the NV probe at 2-3x darker than the target in deep fill (is the
   dark still readable?), green tint vs neutral-looking probe rgb at level 0.7 (121,127,125), grain vs G101, `?gfx=min`.
2. One fix round if needed (implementer), then the GPU window again: `touch .nv-ready` then
   `bash docs/nv-pass/nv-gpu.sh s12b` (waits for the desktop heavy.lock, skips the before shots, builds this tree, shoots,
   runs e2e-darkness, releases). CT Core has first claim on the lock.
3. Send Michael the before / after epic sheets with a one-line note each; message the orchestrator.
4. Slice 3, the vision carousel (PLAN.md), only after the orchestrator says CT Core's anim-rework slice 1 PR has merged
   (it holds src/ui until then).
5. End: CHANGELOG "Unreleased - nv-pass", TESTING.md lines, docs/systems/lighting.md and graphics-quality.md (stale NV
   numbers, SURVEY "Stale docs"), perf budgets (render work), `npm run check`, full `E2E_SUITE_TIMEOUT=900 npm run e2e`
   on the PR head (desktop or the laptop runner), PR to master; the orchestrator sets the version. If slice 3 waits
   long, slices 1-2 may go as their own PR (PLAN).

## Open
- Light parity: the body-fill fix stays in the render path (`LampPlugin`), never the ambient grid or light field.
- e2e-darkness NV deep-fill target (above).
- Slice 1 notes: grain 0.06 (G101 "grain as in CT", about 1% then); the fill cap also dims props; NV_BULB 2.5 -> 8.
- Slice 2 notes: the settings vignette stacks on the frame (corners about 0.2 with it on); tests/goggleFrame.test.ts
  reads the shader line `goggleShade(ge)` as text.
- Scratch: C:/NightShift/Mobile-Coop-nv-pass-before (detached master cf73f8b5, node_modules junction) for before shots;
  remove at the job end (`cmd //c rmdir` the junction first, then `git worktree remove --force`). `.nv-ready` at the
  worktree root is a local flag (excluded from git).

## Polish list (non-blocking)

## Done
- 2026-10-20: GPU before / after sheets (s12), e2e-darkness run (1 fail, above).
- 2026-10-20: slice 1 (green phosphor, body-fill cap under NV, gain 8 -> 6 with a lifted floor, gamma 1.3, white clip
  0.85, grain stronger in the dark, NV bloom on HDR with strength 0.6, pipeline bloom off in NV, `?gfx=min` lift) and
  slice 2 (one screen-shaped goggle frame for every mode: clear area 44% -> 89% at 16:9, corners 0.06 -> 0.3, thin rim)
  built, 75c37d42.
- 2026-10-20: worktree `C:/NightShift/Mobile-Coop-nv-pass` (feature/nv-pass from cf73f8b5, 4.14.0), BRIEF / PLAN /
  SURVEY / STATE; `scripts/nv-shots.mjs`, `docs/nv-pass/nv-gpu.sh`.

## Resume prompt
```
Night Shift | nv-pass: RESUME. Folder C:/NightShift/Mobile-Coop-nv-pass, branch feature/nv-pass (git pull --ff-only;
branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/nv-pass/BRIEF.md,
PLAN.md, SURVEY.md and STATE.md, and continue from "Now" / "Next" with the loop in docs/systems/session-method.md
(next: a fresh Opus checker for slices 1-2 against the sheets in docs/nv-pass/shots/). The vision carousel (slice 3)
waits for the orchestrator's go after CT Core's anim-rework slice 1 merges. Report to "Night Shift | Orchestrator".
Opus, high effort.
```
