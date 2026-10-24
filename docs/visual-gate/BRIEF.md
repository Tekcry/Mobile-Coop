# visual-gate - brief

Job lead: Sector Ops Build (ROADMAP on feature/menu :63). Branch `feature/visual-gate`, worktree
`C:/NightShift/Mobile-Coop-visual-gate`, cut from master bd54dfcd (master is now 4.97.0, 7ae1eda1).

## The ask (orchestrator, 2026-10-24 ~21:35, verbatim)
After a process audit found ~8 of Michael's ~30 walk finds were visual / GPU problems that passed every test
(`docs/orchestrator/PROCESS-AUDIT-2026-10-24.md` on feature/menu, :23 and :31-36):

"An automated picture check that catches what Michael found by eye. Fixed viewpoints per map (Marlow Yard, campus S1-S5,
sectorops, warehouse) x preset (Low, Epic), E2E_GPU=1 via the laptop queue. Per shot: luma histogram, % near-black
pixels, haze level, wall-noise / blotch metric. A baseline per release is stored, and any big change against the last
release is flagged in the train. Extend e2e-darkness's 4-point Warehouse probe to a grid per map (bible L5) so the
light-parity check covers Marlow and campus: meter / guard light field vs pixel luma at the same points. Targets that
should go red: 'Marlow seems dark', Low-preset blotchy walls, campus fog beams, torches through walls, hard light arcs.
Keep the runtime under ~3 min per train. Plan, then one checker, then slices in parallel."

## Goal
One GPU suite, `e2e-visual`, run on the laptop after every train's e2e, that:
1. shoots fixed viewpoints on 4 maps at Low and Epic and measures each shot (histogram, near-black share, haze, blotch,
   hard arcs, torch leak);
2. checks absolute rules per viewpoint (set so each walk find F1-F8 below is red on its bad build and green on its fix);
3. compares every shot with the last accepted release baseline and flags big changes;
4. runs the bible L5 parity grid (grey cards at field points vs display band) on every map, plus meter = field;
5. posts a `visual-gate` commit status and a PR comment on the train, in under ~3 min.

## Targets (walk finds that passed every test; research 2026-10-24, detail in PLAN.md "Targets")
| # | Find | Map / where | Bad build | Fixed build |
| --- | --- | --- | --- | --- |
| F1 | Strip-light fog cones | Sector Ops S1 goods-in / girder, Epic | v4.60.1 | v4.61.0 (PR #156) |
| F2 | Bay floor near black between pools | Sector Ops S1 goods-in | v4.72.0 | v4.88.0 |
| F4 | Hard light arcs on walls | Sector Ops S1 workshop | v4.78.0 + `?falloff=photo` | v4.88.0 (LR16b) |
| F5 | Guard torches through walls / doors | any dark map; Low worst | v4.82.0 | v4.88.0 (LR16t) |
| F5b | Torch haze wedge round corners | Medium+ (volumetrics) | master 7ae1eda1 | UNFIXED (lr16-8-triage.md:65-87) |
| F6 | "Marlow seems dark" | Marlow Yard stations | v4.82.0 + `?falloff=photo` | v4.88.0 (LR16g, LR16-M) |
| F7 | Blotchy Low walls | Marlow A3 lobby corridor, Low | v4.82.0 + `?falloff=photo&gfx=low` | v4.88.0 (LR16-L) |
| F8 | Campus fog beams | Saltmarsh Park S2 atrium, S3 hall, Epic | v4.96.0 (4c864861) | v4.97.0 (4813dbf2, train 65) |
F3 (Marlow S2 door lamp lit nothing, v4.72.0) is on the pre-redesign Marlow layout: covered by F6's metrics, no own view.

## Limits
- This is a test, not a look change. The no-refining rule holds: no src change alters a pixel. The one src change
  allowed is a test-only pin hook (`GameState.shotPin`, PLAN VG2), inert unless a script calls it.
- No large binaries in master: baselines live on the data branch `visual-baselines` (metrics JSON; small webp thumbs
  of flagged shots only).
- Laptop GPU only (port 4189, `E2E_GPU=1`). Baselines are keyed by the GPU renderer string; the desktop overflow lane
  never runs the gate. Apple-only faults (lowp depth samplers on iPad, part of F7) cannot be caught here.
- Runtime: target <= 180 s wall per train, hard cap 300 s.
- Docs-only planning step: no e2e, build or GPU work in this step.

## Michael's answers
None yet. Open questions: PLAN.md "Questions for Michael" (asked later, native multiple choice).

## Assumed decisions (A-list; each with how to undo)
- A1 Flag, do not block: `visual-gate` is its own status context; auto-train does not wait on it; a flag shows as a
  failed status plus a PR comment. Undo: add `visual-gate` to auto-train's release conditions (`scripts/auto-train.mjs`,
  one condition) after ~10 clean trains.
- A2 L5 parity mismatches flag the same way (not blocking), although the bible says "any mismatch fails". Undo: as A1,
  or make parity rows fail `laptop-e2e` by moving the parity grid into a REQUIRED suite.
- A3 A sibling suite `e2e-visual`, not an edit of `e2e-darkness` (that suite keeps its Warehouse targets, night vision
  and thermal checks). Shared probe code moves to `scripts/visual-gate/probe.mjs` only if both need it. Undo: fold the
  grid into e2e-darkness.
- A4 Viewpoints are literal coordinates in `scripts/visual-gate/viewpoints.mjs` (copied from SHOT_VANTAGES,
  campus-art-shots, sector-lights-shots, lamps-shots), not read from the maps, so baseline keys stay stable; a map edit
  that moves a view re-baselines that view. Undo: read SHOT_VANTAGES through the SSR loader as shots-ctcourse.mjs does.
- A5 Regions are world-space quads projected in the page, not hand-drawn pixel masks. Undo: allow `rect` in screen
  fractions per region (the metrics take a mask either way).
- A6 960 x 540, device scale 1, `?gfx=low` / `?gfx=epic` (pins the governor off and the render scale: Low 0.67 TAAU,
  Epic native), `weather=clear`, night vision off, characters hidden, guards frozen out of view, flicker off, sim
  paused by `shotPin`. Undo: per-map overrides in viewpoints.mjs.
- A7 Low and Epic run in two browsers at once (one per preset), one fresh boot per map and preset; M0 (VG2) measures it.
  If over budget: switch the preset in one page with `QualityManager.setOverride` (the benchmark's path), checked
  equal to a fresh `?gfx=` boot on 3 views first. Undo: sequential single browser.
- A8 The baseline for a train is, per shot key `<view>@<preset>`, the newest of: an accepted record, or a green
  recorded run whose sha is an ancestor of origin/master (a released train). A flagged release never becomes the
  baseline unless accepted, so a drift keeps flagging until it is fixed or accepted. Undo: baseline = last release
  whatever its verdict (`storeLib.pickBaseline`).
- A9 Accepting a look change: `node scripts/visual-gate/baseline.mjs accept --sha <run> --by <name> --why <text>
  [--only ids]`. Approver: Michael, or the orchestrator citing Michael's words, a G number or the job BRIEF that names
  the look change as its aim. Logged on the data branch and in the train PR comment. Undo: Michael only.
- A10 Known-open faults (F5b) are listed per view (`known`): their rule failures print KNOWN, not flagged; when one
  passes, the report says so and the fixing job removes `known`. Undo: drop `known`, the view flags at once.
- A11 Thumbnails: all shots stay in laptop scratch `C:/NightShift/scratch/visual-gate/<sha>/` (kept 60 days); only
  flagged shots and their baseline shots go to the data branch (320 px webp). Undo: push every thumb.
- A12 The train post-step runs after the e2e shards on slot 4189 (adds ~3 min wall). Undo: run it as a third shard in
  parallel (needs a free port or the shard balancer to place it).
- A13 Tolerances = max(spec floor in PLAN, 4 x the run-to-run spread measured by VG7 on one build). Undo: floors only.
- A14 Old builds for the red proofs run the gate script from this branch against their own dist; every hook is read
  with `?.` and falls back to the in-page pinning e2e-darkness uses (no `shotPin`, no flicker before v4.88.0).
