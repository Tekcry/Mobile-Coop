# Night vision pass - state

## Now (2026-10-20 19:45)
Slice 3, the vision carousel, PASS (CHECK-S3.md, fresh Opus checker; SLICE3.md), 3fa8d372: on the wheel's vision slot
pad A (`interact`) / keyboard E steps night -> thermal -> electro -> night, the press is consumed, release selects, the
wheel opens on the selected mode; `VISION_STEPS` length pick removed. tsc, lint, vitest pass; `npm run check` + smoke,
e2e-pad, e2e-gadgets, e2e-mouse requested from the laptop runner at 3fa8d372 (desktop lock is CT Core's; Michael via the
orchestrator: movement work takes priority, release the lock at the next step boundary when CT Core needs it).
Slices 1-2 PASS after one fix round (CHECK-FIX1.md): auto-gain, shot guards, min postLift 3; code 4a6cd99f; GPU sheets
sheet-s12b-* vs master sheet-before-* (65bfe6f2), Epic pair sent to Michael. e2e-darkness NV min 0.2 -> 0.1 (BRIEF A2,
49eeee88), not re-run since. Master 89f061e7 merged (ddd5ca9f).

## Next
1. Laptop results for 3fa8d372 (Character Build replies); a failure -> one fix round.
2. End: CHANGELOG "Unreleased - nv-pass", TESTING.md lines, docs/systems/lighting.md and graphics-quality.md (stale NV
   numbers, SURVEY "Stale docs"), perf budgets (render work), `npm run check`, e2e-darkness re-run on the GPU, full
   `E2E_SUITE_TIMEOUT=900 npm run e2e` on the PR head (desktop or the laptop runner), PR to master; the orchestrator
   sets the version. Scratch worktree removal (Open).

## Open
- Light parity: the body-fill fix stays in the render path (`LampPlugin`), never the ambient grid or light field.
- e2e-darkness NV deep-fill target (above).
- Slice 1 notes: grain 0.06 (G101 "grain as in CT", about 1% then); the fill cap also dims props; NV_BULB 2.5 -> 8.
- Slice 2 notes: the settings vignette stacks on the frame (corners about 0.2 with it on); tests/goggleFrame.test.ts
  reads the shader line `goggleShade(ge)` as text.
- Scratch: C:/NightShift/Mobile-Coop-nv-pass-before (detached master 65bfe6f2; its untracked scripts/nv-shots.mjs checks the served build, node_modules junction) for before shots;
  remove at the job end (`cmd //c rmdir` the junction first, then `git worktree remove --force`). `.nv-ready` at the
  worktree root is a local flag (excluded from git).

## Polish list (non-blocking)
- Slice 3 (CHECK-S3.md): e2e-gadgets opens the wheel a step before the Tab press is seen (possible unchecked weapon
  swap); A off the vision slot on the exact LB-release step is not consumed; no e2e assert that A on the slot never
  interacts or reloads.
- Fix-round polish (CHECK-FIX1.md): raise the auto-gain `hdr.lo` or max for yard-look (centre 13-19/255) and the deep
  fill; min postLift 3 turns floor texture into a white checker; the min measure has no ease (may flicker); nv-shots
  could print the off -> NV means.
- Grain 0.06 -> 0.05 if Michael finds it dirty (now about 1.7% at black, 0.7% lit; G101 about 1%).
- The settings vignette stacks on the frame (corners about 0.2).
- No thermal or electro rows on the sheets; photo-mode letterbox bars in some wh-* rows.
- `BODY_FILL.nv` 0.35 -> 0.45 if guards should stand out more.
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows modified after every test run (line endings only).
- e2e-desktop "saved as a performance note without a tap" flake: add to `docs/backlog.md` flaky list at the job end.

## Done
- 2026-10-20: slice 3, the vision carousel, PASS (CHECK-S3.md), 3fa8d372; laptop suites pending.
- 2026-10-20: fix round (4a6cd99f) PASS (CHECK-FIX1.md); GPU s12b sheets; e2e-darkness NV target A2; master 89f061e7 merged.
- 2026-10-20: master before sheets re-shot at 65bfe6f2 (653fdad8).
- 2026-10-20: checker on slices 1-2: FIX (CHECK-S12.md); check + smoke, e2e-mouse, e2e-stealth-ai, e2e-desktop pass.
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
(next: the laptop results for slice 3, then the job end in STATE "Next"). Slices 1-3 have
passed their checkers. Report to "Night Shift | Orchestrator".
Opus, high effort.
```
