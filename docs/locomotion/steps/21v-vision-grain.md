# Step 21v - vision sensor grain (Michael's play check, M14 N7)

Model: implementer opus (budget ~40); checker opus. Depends on: 21w. Commit: "locomotion 21v: sensor grain on goggle modes".

## Read
- DECISIONS.md M14 (5), A26, A53; bible 5.5; step 14 (steps/14-vision.md); the cinematic / post pass where the `vk` vision branches live (grep -rn "vk" src/vfx src/voxel | head), docs/systems/graphics-quality.md vision section; tests/visionIsolation.test.ts.

## Task
1. Thermal, electro and night vision get a visible animated sensor grain (per-pixel noise changing every frame or every second frame, luminance-weighted, moderate: readable, not a wash) and a slight blur / softening, inside the existing pass (no new render target; phone cost within the item-7 budget; grain resolution-independent).
2. Render only: perception, the light meter and anything on the wire unchanged (visionIsolation test stays green).
3. A setting is not required; keep the grain strength a constant in config with a comment.

## Checks
- `npm run check` (visionIsolation), e2e-darkness and e2e-desktop (port 4191). Checker: shots of thermal / electro / night on desktop Epic and phone look (E2E_GPU=1, port 4189) read by eye: grain visible, bodies still the brightest in thermal, devices still readable in electro; perf-trend.
- PC-PASS: phone frame cost per mode (target laptop pass, section 0).
