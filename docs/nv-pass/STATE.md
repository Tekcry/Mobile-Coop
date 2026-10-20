# Night vision pass - state

## Now (2026-10-20 17:40, PAUSED by the orchestrator: usage 93%; resume only on its message after the reset)
Slices 1-2 (75c37d42) checked: **FIX** (docs/nv-pass/CHECK-S12.md, fresh Opus checker). Met: bodies not bright, green
tube, frame (89% clear), light parity (`visionIsolation` unchanged and passing). Not met: readable at night at both
extremes (yard-look under NV a flat murk, mean 14/255; Epic wh-yard moonlit wall clipped, 67% > 224) and `?gfx=min`
(NV darker than off in yard-s1-bay and yard-s5-backroom).
**The "before" sheets are NOT master**: the before and s12 shots are identical (a build of this tree answered on port
4189 during the before run). Do not send them to Michael; re-shoot (fix 1).
Checks at 75c37d42 (desktop, software GL, 4191): `npm run check` PASS (1972 tests); smoke, e2e-mouse, e2e-stealth-ai
PASS; e2e-desktop PASS solo with `E2E_SUITE_TIMEOUT=900` (663 s; one solo rerun failed on "the result is saved as a
performance note without a tap", a benchmark-save flake, not in this diff: backlog flaky list).
e2e-darkness decision: the target is stale, not the cap (the grey card is a non-voxel surface, now under the body-fill
cap; 13.5% matches the readable sheets). The "neutral rgb 121,127,125" was the vision-off probe; the tint lands.
17:00: two orphaned scripts from before the context clear (scratch nv-before.sh, nv-gpu.sh s1) were killed after the s1
one took the desktop lock at 16:58; partial s1 shots deleted. No agents running, no lock held.

## Next
1. One fix round (Opus implementer), the checker's list in CHECK-S12.md:
   1. Shot script proves what it serves (`scripts/nv-shots.mjs`, `nv-gpu.sh`): exit if the port is taken or the
      server exits; compare the served `index-*.js` with the local `dist/index.html`; fail on the build's exit status.
   2. Frame-level NV auto-gain in the tube: GPU-only 1x1 scene mean, eased about 0.5 s, input x
      clamp(target / mean, 0.6, 2.5). Done: wh-yard not clipped, yard-look mean >= 30/255, lit rooms within 15%.
   3. e2e-darkness NV level 0.12 min 0.2 -> 0.10 (`e2e-darkness.mjs`, `darkCurve.ts`), `darkCurve.test.ts` 5x -> 2.5x,
      print the NV rgb; after fix 2 re-set min to measured - 0.03 (never below 0.10).
   4. `?gfx=min`: `NV_TONE.postLift` 2 -> 3 if fix 2 does not cover it (NV >= off in all 9 min views).
2. Then the GPU window: re-shoot master before shots (delete sheet-before-*.png so `nv-gpu.sh` redoes them) and after
   shots `s12b`, e2e-darkness; then a fresh checker on the fix round.
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
